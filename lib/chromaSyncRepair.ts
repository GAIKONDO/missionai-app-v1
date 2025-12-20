/**
 * ChromaDB同期状態の修復ユーティリティ
 * SQLiteのchromaSyncedフラグとChromaDBの実際のデータを比較して不整合を修復
 */

import { callTauriCommand } from './localFirebase';
import { shouldUseChroma } from './chromaConfig';
import { getEntityEmbedding } from './entityEmbeddings';
import { getRelationEmbedding } from './relationEmbeddings';
import { getTopicEmbedding } from './topicEmbeddings';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';

/**
 * エンティティの同期状態を修復
 * 
 * @param organizationId 組織ID（オプション）
 * @returns 修復結果
 */
export async function repairEntitySyncStatus(
  organizationId?: string
): Promise<{
  repaired: number;
  errors: Array<{ entityId: string; error: string }>;
}> {
  console.log('🔧 [同期状態修復] エンティティの同期状態を修復開始...', { organizationId });
  
  let repaired = 0;
  const errors: Array<{ entityId: string; error: string }> = [];

  const chromaEnabled = shouldUseChroma();
  console.log('🔍 [同期状態修復] ChromaDB有効状態:', chromaEnabled);
  
  if (!chromaEnabled) {
    console.warn('⚠️ [同期状態修復] ChromaDBが無効です。修復をスキップします。');
    return { repaired: 0, errors: [] };
  }

  try {
    // 1. すべてのエンティティを取得
    const entitiesResult = await callTauriCommand('query_get', {
      collectionName: 'entities',
      conditions: organizationId ? { organizationId } : {},
    }) as Array<{ id: string; data: any }>;

    const entities = entitiesResult || [];
    console.log(`📊 [同期状態修復] エンティティ数: ${entities.length}件`);
    
    // 修復済みのエンティティIDを追跡（同じエンティティを2回修復しないようにする）
    const repairedEntityIds = new Set<string>();

    // 2. chromaSynced=1とchromaSynced=0のエンティティをカウント
    let chromaSyncedCount = 0;
    let chromaSyncedWithCompanyId = 0;
    let chromaSyncedWithOrganizationId = 0;
    let chromaUnsyncedCount = 0;
    for (const entityDoc of entities) {
      const entityData = entityDoc.data || entityDoc;
      const chromaSynced = entityData.chromaSynced === 1 || entityData.chromaSynced === true;
      if (chromaSynced) {
        chromaSyncedCount++;
        if (entityData.companyId) {
          chromaSyncedWithCompanyId++;
        }
        if (entityData.organizationId) {
          chromaSyncedWithOrganizationId++;
        }
      } else {
        chromaUnsyncedCount++;
      }
    }
    console.log(`📊 [同期状態修復] chromaSynced=1のエンティティ数: ${chromaSyncedCount}件 (companyId: ${chromaSyncedWithCompanyId}件, organizationId: ${chromaSyncedWithOrganizationId}件)`);
    console.log(`📊 [同期状態修復] chromaSynced=0のエンティティ数: ${chromaUnsyncedCount}件`);

    // 3. 各エンティティの同期状態をチェック
    let checkedCount = 0;
    let foundCount = 0;
    let notFoundCount = 0;
    let invalidCount = 0;
    let fixedCount = 0; // chromaSynced=0だがChromaDBに存在する場合の修復数
    for (const entityDoc of entities) {
      const entityId = entityDoc.id || entityDoc.data?.id;
      let entityData = entityDoc.data || entityDoc;
      
      if (!entityId) {
        continue;
      }

      // 既に修復済みのエンティティはスキップ（同じエンティティを2回修復しないようにする）
      if (repairedEntityIds.has(entityId)) {
        console.debug(`⏭️ [同期状態修復] エンティティ ${entityId} は既に修復済みのためスキップします`);
        continue;
      }

      // 修復処理の最初に取得したデータが古い可能性があるため、最新のデータを取得
      // ただし、パフォーマンスを考慮して、chromaSyncedがnullまたは0の場合のみ再取得
      // また、chromaSynced=1の場合は既に修復済みの可能性が高いため、再取得をスキップ
      const initialChromaSynced = entityData.chromaSynced;
      const initialChromaSyncedIsTrue = initialChromaSynced === 1 || initialChromaSynced === true || initialChromaSynced === '1';
      
      if (!initialChromaSyncedIsTrue) {
        try {
          // doc_getで最新のデータを取得（query_getの結果が古い可能性があるため）
          const latestDocResult = await callTauriCommand('doc_get', {
            collectionName: 'entities',
            docId: entityId,
          });
          if (latestDocResult && (latestDocResult as any)?.data) {
            const latestData = (latestDocResult as any).data;
            const latestChromaSynced = latestData.chromaSynced;
            const latestChromaSyncedIsTrue = latestChromaSynced === 1 || latestChromaSynced === true || latestChromaSynced === '1';
            
            if (latestChromaSyncedIsTrue) {
              // 既にchromaSynced=1に更新されている場合は、修復不要としてスキップ
              console.debug(`⏭️ [同期状態修復] エンティティ ${entityId} は既にchromaSynced=1に更新されているためスキップします（初期値: ${initialChromaSynced}, 最新値: ${latestChromaSynced}）`);
              continue;
            } else {
              // 最新のデータを使用（chromaSyncedフラグがまだnullまたは0の場合）
              entityData = latestData;
            }
          }
        } catch (refreshError: any) {
          // 再取得に失敗した場合は、元のデータを使用して続行
          console.debug(`⚠️ [同期状態修復] エンティティ ${entityId} の最新データ取得に失敗しました（元のデータを使用）:`, refreshError?.message || refreshError);
        }
      }

      // 最新のデータを使用してchromaSyncedを再評価（文字列の"1"も考慮）
      const chromaSynced = entityData.chromaSynced === 1 || entityData.chromaSynced === true || entityData.chromaSynced === '1';
      const orgOrCompanyId = entityData.companyId || entityData.organizationId || organizationId || '';

      // orgOrCompanyIdがない場合はスキップ
      if (!orgOrCompanyId) {
        continue;
      }
      
      if (!chromaSynced) {
        // chromaSynced=0の場合: ChromaDBに存在するかチェック
        checkedCount++;
        // 100件ごとに進捗をログ出力
        if (checkedCount % 100 === 0) {
          console.log(`📊 [同期状態修復] 進捗: ${checkedCount}件チェック完了 (見つかった: ${foundCount}件, 見つからない: ${notFoundCount}件, 無効: ${invalidCount}件, 修復: ${fixedCount}件)`);
        }

        try {
          const existing = await getEntityEmbedding(entityId, orgOrCompanyId);
          
          // ChromaDBに存在する場合、フラグを更新
          if (existing && existing.combinedEmbedding && Array.isArray(existing.combinedEmbedding) && existing.combinedEmbedding.length > 0) {
            // 修復前に現在のchromaSynced値を確認
            const currentChromaSynced = entityData.chromaSynced;
            console.warn(`✅ [同期状態修復] エンティティ ${entityId} はchromaSynced=${currentChromaSynced}ですが、ChromaDBに有効な埋め込みが存在します。フラグを更新します。`, {
              entityId,
              orgOrCompanyId,
              embeddingLength: existing.combinedEmbedding.length,
              currentChromaSynced,
              currentChromaSyncedType: typeof currentChromaSynced,
            });
            
            // フラグを更新
            try {
              await callTauriCommand('update_chroma_sync_status', {
                entityType: 'entity',
                entityId: entityId,
                synced: true,
                error: '',
              });
              
              // 書き込みキューが処理されるまで待機し、更新が反映されているか確認
              let updateConfirmed = false;
              for (let retry = 0; retry < 5; retry++) {
                await new Promise(resolve => setTimeout(resolve, 200)); // 200ms待機
                
                // エンティティを再取得して、chromaSyncedフラグが更新されているか確認
                try {
                  const { getEntityById } = await import('./entityApi');
                  const updatedEntity = await getEntityById(entityId);
                  if (updatedEntity) {
                    const updatedEntityWithSync = updatedEntity as Entity & { chromaSynced?: number | boolean | null };
                    const updatedChromaSynced = updatedEntityWithSync.chromaSynced === 1 || updatedEntityWithSync.chromaSynced === true;
                    if (updatedChromaSynced) {
                      updateConfirmed = true;
                      console.log(`✅ [同期状態修復] エンティティ ${entityId} のchromaSyncedフラグが1に更新されました（確認済み、リトライ: ${retry}回目）`);
                      break;
                    } else {
                      console.debug(`⏳ [同期状態修復] エンティティ ${entityId} のフラグ更新を確認中... (リトライ: ${retry + 1}/5, chromaSynced=${updatedEntityWithSync.chromaSynced})`);
                    }
                  }
                } catch (checkError: any) {
                  console.debug(`⏳ [同期状態修復] エンティティ ${entityId} の再取得エラー（リトライ: ${retry + 1}/5）:`, checkError?.message || checkError);
                }
              }
              
              if (!updateConfirmed) {
                console.warn(`⚠️ [同期状態修復] エンティティ ${entityId} のフラグ更新が確認できませんでした（5回リトライ後も更新されていない可能性があります）`);
              }
              
              // 修復済みとしてマーク（更新が確認できなくても、更新コマンドは送信済み）
              repairedEntityIds.add(entityId);
            } catch (updateError: any) {
              console.error(`❌ [同期状態修復] エンティティ ${entityId} のフラグ更新エラー:`, updateError?.message || updateError);
              errors.push({
                entityId,
                error: `フラグ更新エラー: ${updateError?.message || String(updateError)}`,
              });
              continue; // エラーが発生した場合はスキップ
            }
            
            fixedCount++;
            foundCount++;
          } else {
            // ChromaDBに存在しない場合は正常（chromaSynced=0が正しい）
            notFoundCount++;
          }
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          console.error(`❌ [同期状態修復] エンティティ ${entityId} のチェックエラー:`, errorMessage, {
            entityId,
            orgOrCompanyId,
            errorStack: error?.stack,
          });
          errors.push({
            entityId,
            error: errorMessage,
          });
        }
        continue;
      }
      
      // chromaSynced=1の場合: ChromaDBに存在しない場合はフラグをリセット
      checkedCount++;
      // 100件ごとに進捗をログ出力
      if (checkedCount % 100 === 0) {
        console.log(`📊 [同期状態修復] 進捗: ${checkedCount}/${chromaSyncedCount}件チェック完了 (見つかった: ${foundCount}件, 見つからない: ${notFoundCount}件, 無効: ${invalidCount}件, 修復: ${fixedCount}件)`);
      }
      
      checkedCount++;
      // 100件ごとに進捗をログ出力
      if (checkedCount % 100 === 0) {
        console.log(`📊 [同期状態修復] 進捗: ${checkedCount}/${chromaSyncedCount}件チェック完了 (見つかった: ${foundCount}件, 見つからない: ${notFoundCount}件, 無効: ${invalidCount}件)`);
      }

      try {
        // 3. ChromaDBに実際に存在するかを確認
        console.debug(`🔍 [同期状態修復] エンティティ ${entityId} をチェック中...`, {
          entityId,
          orgOrCompanyId,
          chromaSynced,
          hasCompanyId: !!entityData.companyId,
          hasOrganizationId: !!entityData.organizationId,
        });
        
        const existing = await getEntityEmbedding(entityId, orgOrCompanyId);
        
        console.debug(`🔍 [同期状態修復] エンティティ ${entityId} のチェック結果:`, {
          entityId,
          existing: existing ? '存在する' : '存在しない',
          hasCombinedEmbedding: existing?.combinedEmbedding ? 'あり' : 'なし',
          embeddingLength: existing?.combinedEmbedding?.length || 0,
        });
        
        // 埋め込みが存在しない、または無効な場合
        if (!existing || !existing.combinedEmbedding || !Array.isArray(existing.combinedEmbedding) || existing.combinedEmbedding.length === 0) {
          notFoundCount++;
          if (existing) {
            invalidCount++;
          }
          
          console.warn(`⚠️ [同期状態修復] エンティティ ${entityId} はchromaSynced=1ですが、ChromaDBに有効な埋め込みが存在しません。フラグをリセットします。`, {
            entityId,
            orgOrCompanyId,
            existing: existing ? '存在するが無効' : '存在しない',
            hasCombinedEmbedding: existing?.combinedEmbedding ? 'あり' : 'なし',
            embeddingLength: existing?.combinedEmbedding?.length || 0,
          });
          
          // フラグをリセット
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'entity',
            entityId: entityId,
            synced: false,
            error: existing ? 'ChromaDBに埋め込みが存在するが無効' : 'ChromaDBに存在しない',
          });
          
          repaired++;
        } else {
          foundCount++;
          // 最初の10件のみ詳細ログを出力
          if (foundCount <= 10) {
            console.debug(`✅ [同期状態修復] エンティティ ${entityId} は正常です。`, {
              entityId,
              orgOrCompanyId,
              embeddingLength: existing.combinedEmbedding.length,
            });
          }
        }
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        console.error(`❌ [同期状態修復] エンティティ ${entityId} のチェックエラー:`, errorMessage, {
          entityId,
          orgOrCompanyId,
          errorStack: error?.stack,
        });
        errors.push({
          entityId,
          error: errorMessage,
        });
      }
    }

    const totalRepaired = repaired + fixedCount;
    console.log(`✅ [同期状態修復] エンティティの修復完了: ${totalRepaired}件修復（chromaSynced=1→0: ${repaired}件, chromaSynced=0→1: ${fixedCount}件）、${errors.length}件エラー`);
    console.log(`📊 [同期状態修復] 詳細統計: チェック済み=${checkedCount}件, 見つかった=${foundCount}件, 見つからない=${notFoundCount}件, 無効=${invalidCount}件`);
    
    return { repaired: totalRepaired, errors };
  } catch (error: any) {
    console.error('❌ [同期状態修復] エラー:', error);
    throw error;
  }
}

/**
 * リレーションの同期状態を修復
 */
export async function repairRelationSyncStatus(
  organizationId?: string
): Promise<{
  repaired: number;
  errors: Array<{ relationId: string; error: string }>;
}> {
  console.log('🔧 [同期状態修復] リレーションの同期状態を修復開始...', { organizationId });
  
  let repaired = 0;
  const errors: Array<{ relationId: string; error: string }> = [];

  const chromaEnabled = shouldUseChroma();
  console.log('🔍 [同期状態修復] ChromaDB有効状態（リレーション）:', chromaEnabled);
  
  if (!chromaEnabled) {
    console.warn('⚠️ [同期状態修復] ChromaDBが無効です。修復をスキップします。');
    return { repaired: 0, errors: [] };
  }

  try {
    const relationsResult = await callTauriCommand('query_get', {
      collectionName: 'relations',
      conditions: organizationId ? { organizationId } : {},
    }) as Array<{ id: string; data: any }>;

    const relations = relationsResult || [];
    console.log(`📊 [同期状態修復] リレーション数: ${relations.length}件`);
    
    // 修復済みのリレーションIDを追跡（同じリレーションを2回修復しないようにする）
    const repairedRelationIds = new Set<string>();

    // chromaSynced=1とchromaSynced=0/nullのリレーションをカウント
    let chromaSyncedCount = 0;
    let chromaUnsyncedCount = 0;
    for (const relationDoc of relations) {
      const relationData = relationDoc.data || relationDoc;
      const chromaSynced = relationData.chromaSynced === 1 || relationData.chromaSynced === true;
      if (chromaSynced) {
        chromaSyncedCount++;
      } else {
        chromaUnsyncedCount++;
      }
    }
    console.log(`📊 [同期状態修復] chromaSynced=1のリレーション数: ${chromaSyncedCount}件`);
    console.log(`📊 [同期状態修復] chromaSynced=0/nullのリレーション数: ${chromaUnsyncedCount}件`);

    let checkedCount = 0;
    let foundCount = 0;
    let notFoundCount = 0;
    let invalidCount = 0;
    let fixedCount = 0; // chromaSynced=0だがChromaDBに存在する場合の修復数
    
    for (const relationDoc of relations) {
      const relationId = relationDoc.id || relationDoc.data?.id;
      let relationData = relationDoc.data || relationDoc;
      
      if (!relationId) {
        continue;
      }

      // 既に修復済みのリレーションはスキップ（同じリレーションを2回修復しないようにする）
      if (repairedRelationIds.has(relationId)) {
        console.debug(`⏭️ [同期状態修復] リレーション ${relationId} は既に修復済みのためスキップします`);
        continue;
      }

      // 修復処理の最初に取得したデータが古い可能性があるため、最新のデータを取得
      // ただし、パフォーマンスを考慮して、chromaSyncedがnullまたは0の場合のみ再取得
      // また、chromaSynced=1の場合は既に修復済みの可能性が高いため、再取得をスキップ
      const initialChromaSynced = relationData.chromaSynced;
      const initialChromaSyncedIsTrue = initialChromaSynced === 1 || initialChromaSynced === true || initialChromaSynced === '1';
      
      if (!initialChromaSyncedIsTrue) {
        try {
          // doc_getで最新のデータを取得（query_getの結果が古い可能性があるため）
          const latestDocResult = await callTauriCommand('doc_get', {
            collectionName: 'relations',
            docId: relationId,
          });
          if (latestDocResult && (latestDocResult as any)?.data) {
            const latestData = (latestDocResult as any).data;
            const latestChromaSynced = latestData.chromaSynced;
            const latestChromaSyncedIsTrue = latestChromaSynced === 1 || latestChromaSynced === true || latestChromaSynced === '1';
            
            if (latestChromaSyncedIsTrue) {
              // 既にchromaSynced=1に更新されている場合は、修復不要としてスキップ
              console.debug(`⏭️ [同期状態修復] リレーション ${relationId} は既にchromaSynced=1に更新されているためスキップします（初期値: ${initialChromaSynced}, 最新値: ${latestChromaSynced}）`);
              continue;
            } else {
              // 最新のデータを使用（chromaSyncedフラグがまだnullまたは0の場合）
              relationData = latestData;
            }
          }
        } catch (refreshError: any) {
          // 再取得に失敗した場合は、元のデータを使用して続行
          console.debug(`⚠️ [同期状態修復] リレーション ${relationId} の最新データ取得に失敗しました（元のデータを使用）:`, refreshError?.message || refreshError);
        }
      }

      // 最新のデータを使用してchromaSyncedを再評価（文字列の"1"も考慮）
      const chromaSynced = relationData.chromaSynced === 1 || relationData.chromaSynced === true || relationData.chromaSynced === '1';
      const orgOrCompanyId = relationData.companyId || relationData.organizationId || organizationId || '';

      // orgOrCompanyIdがない場合はスキップ
      if (!orgOrCompanyId) {
        continue;
      }
      
      // chromaSynced=0/nullの場合: ChromaDBに存在するかチェック
      if (!chromaSynced) {
        checkedCount++;
        // 100件ごとに進捗をログ出力
        if (checkedCount % 100 === 0) {
          console.log(`📊 [同期状態修復] リレーション進捗: ${checkedCount}件チェック完了 (見つかった: ${foundCount}件, 見つからない: ${notFoundCount}件, 無効: ${invalidCount}件, 修復: ${fixedCount}件)`);
        }

        try {
          const existing = await getRelationEmbedding(relationId, orgOrCompanyId);
          
          // ChromaDBに存在する場合、フラグを更新
          if (existing && existing.combinedEmbedding && Array.isArray(existing.combinedEmbedding) && existing.combinedEmbedding.length > 0) {
            // 修復前に現在のchromaSynced値を確認
            const currentChromaSynced = relationData.chromaSynced;
            console.warn(`✅ [同期状態修復] リレーション ${relationId} はchromaSynced=${currentChromaSynced}ですが、ChromaDBに有効な埋め込みが存在します。フラグを更新します。`, {
              relationId,
              orgOrCompanyId,
              embeddingLength: existing.combinedEmbedding.length,
              currentChromaSynced,
              currentChromaSyncedType: typeof currentChromaSynced,
            });
            
            // フラグを更新
            try {
              await callTauriCommand('update_chroma_sync_status', {
                entityType: 'relation',
                entityId: relationId,
                synced: true,
                error: '',
              });
              // 書き込みキューが処理されるまで待機し、更新が反映されているか確認
              let updateConfirmed = false;
              for (let retry = 0; retry < 5; retry++) {
                await new Promise(resolve => setTimeout(resolve, 200)); // 200ms待機
                
                // リレーションを再取得して、chromaSyncedフラグが更新されているか確認
                try {
                  const { getRelationById } = await import('./relationApi');
                  const updatedRelation = await getRelationById(relationId);
                  if (updatedRelation) {
                    const updatedRelationWithSync = updatedRelation as Relation & { chromaSynced?: number | boolean | null };
                    const updatedChromaSynced = updatedRelationWithSync.chromaSynced === 1 || updatedRelationWithSync.chromaSynced === true;
                    if (updatedChromaSynced) {
                      updateConfirmed = true;
                      console.log(`✅ [同期状態修復] リレーション ${relationId} のchromaSyncedフラグが1に更新されました（確認済み、リトライ: ${retry}回目）`);
                      break;
                    } else {
                      console.debug(`⏳ [同期状態修復] リレーション ${relationId} のフラグ更新を確認中... (リトライ: ${retry + 1}/5, chromaSynced=${updatedRelationWithSync.chromaSynced})`);
                    }
                  }
                } catch (checkError: any) {
                  console.debug(`⏳ [同期状態修復] リレーション ${relationId} の再取得エラー（リトライ: ${retry + 1}/5）:`, checkError?.message || checkError);
                }
              }
              
              if (!updateConfirmed) {
                console.warn(`⚠️ [同期状態修復] リレーション ${relationId} のフラグ更新が確認できませんでした（5回リトライ後も更新されていない可能性があります）`);
              }
              
              // 修復済みとしてマーク（更新が確認できなくても、更新コマンドは送信済み）
              repairedRelationIds.add(relationId);
            } catch (updateError: any) {
              console.error(`❌ [同期状態修復] リレーション ${relationId} のフラグ更新エラー:`, updateError?.message || updateError);
              errors.push({
                relationId,
                error: `フラグ更新エラー: ${updateError?.message || String(updateError)}`,
              });
              continue; // エラーが発生した場合はスキップ
            }
            
            fixedCount++;
            foundCount++;
          } else {
            // ChromaDBに存在しない場合は正常（chromaSynced=0が正しい）
            notFoundCount++;
          }
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          console.error(`❌ [同期状態修復] リレーション ${relationId} のチェックエラー:`, errorMessage, {
            relationId,
            orgOrCompanyId,
            errorStack: error?.stack,
          });
          errors.push({
            relationId,
            error: errorMessage,
          });
        }
        continue;
      }
      
      // chromaSynced=1の場合: ChromaDBに存在しない場合はフラグをリセット
      checkedCount++;
      // 100件ごとに進捗をログ出力
      if (checkedCount % 100 === 0) {
        console.log(`📊 [同期状態修復] リレーション進捗: ${checkedCount}件チェック完了 (見つかった: ${foundCount}件, 見つからない: ${notFoundCount}件, 無効: ${invalidCount}件, 修復: ${fixedCount}件)`);
      }

      try {
        const existing = await getRelationEmbedding(relationId, orgOrCompanyId);
        
        if (!existing || !existing.combinedEmbedding || !Array.isArray(existing.combinedEmbedding) || existing.combinedEmbedding.length === 0) {
          notFoundCount++;
          if (existing) {
            invalidCount++;
          }
          
          console.warn(`⚠️ [同期状態修復] リレーション ${relationId} はchromaSynced=1ですが、ChromaDBに有効な埋め込みが存在しません。フラグをリセットします。`, {
            relationId,
            orgOrCompanyId,
            existing: existing ? '存在するが無効' : '存在しない',
            hasCombinedEmbedding: existing?.combinedEmbedding ? 'あり' : 'なし',
            embeddingLength: existing?.combinedEmbedding?.length || 0,
          });
          
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'relation',
            entityId: relationId,
            synced: false,
            error: existing ? 'ChromaDBに埋め込みが存在するが無効' : 'ChromaDBに存在しない',
          });
          
          repaired++;
        } else {
          foundCount++;
          // 最初の10件のみ詳細ログを出力
          if (foundCount <= 10) {
            console.debug(`✅ [同期状態修復] リレーション ${relationId} は正常です。`, {
              relationId,
              orgOrCompanyId,
              embeddingLength: existing.combinedEmbedding.length,
            });
          }
        }
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        console.error(`❌ [同期状態修復] リレーション ${relationId} のチェックエラー:`, errorMessage, {
          relationId,
          orgOrCompanyId,
          errorStack: error?.stack,
        });
        errors.push({
          relationId,
          error: errorMessage,
        });
      }
    }

    const totalRepaired = repaired + fixedCount;
    console.log(`✅ [同期状態修復] リレーションの修復完了: ${totalRepaired}件修復（chromaSynced=1→0: ${repaired}件, chromaSynced=0→1: ${fixedCount}件）、${errors.length}件エラー`);
    console.log(`📊 [同期状態修復] 詳細統計: チェック済み=${checkedCount}件, 見つかった=${foundCount}件, 見つからない=${notFoundCount}件, 無効=${invalidCount}件`);
    
    return { repaired: totalRepaired, errors };
  } catch (error: any) {
    console.error('❌ [同期状態修復] エラー:', error);
    throw error;
  }
}

/**
 * トピックの同期状態を修復
 */
export async function repairTopicSyncStatus(
  organizationId?: string
): Promise<{
  repaired: number;
  errors: Array<{ topicId: string; error: string }>;
}> {
  console.log('🔧 [同期状態修復] トピックの同期状態を修復開始...', { organizationId });
  
  let repaired = 0;
  const errors: Array<{ topicId: string; error: string }> = [];

  const chromaEnabled = shouldUseChroma();
  console.log('🔍 [同期状態修復] ChromaDB有効状態（トピック）:', chromaEnabled);
  
  if (!chromaEnabled) {
    console.warn('⚠️ [同期状態修復] ChromaDBが無効です。修復をスキップします。');
    return { repaired: 0, errors: [] };
  }

  try {
    const topicsResult = await callTauriCommand('query_get', {
      collectionName: 'topics',
      conditions: organizationId ? { organizationId } : {},
    }) as Array<{ id: string; data: any }>;

    const topics = topicsResult || [];
    console.log(`📊 [同期状態修復] トピック数: ${topics.length}件`);
    
    // 修復済みのトピックIDを追跡（同じトピックを2回修復しないようにする）
    const repairedTopicIds = new Set<string>();

    // chromaSynced=1とchromaSynced=0/nullのトピックをカウント
    let chromaSyncedCount = 0;
    let chromaUnsyncedCount = 0;
    for (const topicDoc of topics) {
      const topicData = topicDoc.data || topicDoc;
      const chromaSynced = topicData.chromaSynced === 1 || topicData.chromaSynced === true;
      if (chromaSynced) {
        chromaSyncedCount++;
      } else {
        chromaUnsyncedCount++;
      }
    }
    console.log(`📊 [同期状態修復] chromaSynced=1のトピック数: ${chromaSyncedCount}件`);
    console.log(`📊 [同期状態修復] chromaSynced=0/nullのトピック数: ${chromaUnsyncedCount}件`);

    let checkedCount = 0;
    let foundCount = 0;
    let notFoundCount = 0;
    let invalidCount = 0;
    let fixedCount = 0; // chromaSynced=0だがChromaDBに存在する場合の修復数
    
    for (const topicDoc of topics) {
      // トピックIDは`${meetingNoteId}-topic-${topicId}`の形式
      const topicEmbeddingId = topicDoc.id;
      let topicData = topicDoc.data || topicDoc;
      
      // IDからtopicIdとmeetingNoteIdを抽出
      const idMatch = topicEmbeddingId.match(/^(.+)-topic-(.+)$/);
      if (!idMatch) {
        console.debug(`⚠️ [同期状態修復] トピックIDの形式が不正です: ${topicEmbeddingId}`);
        continue;
      }
      const meetingNoteId = idMatch[1];
      const topicId = idMatch[2];

      // 既に修復済みのトピックはスキップ（同じトピックを2回修復しないようにする）
      if (repairedTopicIds.has(topicEmbeddingId)) {
        console.debug(`⏭️ [同期状態修復] トピック ${topicEmbeddingId} は既に修復済みのためスキップします`);
        continue;
      }

      // 修復処理の最初に取得したデータが古い可能性があるため、最新のデータを取得
      // ただし、パフォーマンスを考慮して、chromaSyncedがnullまたは0の場合のみ再取得
      const initialChromaSynced = topicData.chromaSynced;
      const initialChromaSyncedIsTrue = initialChromaSynced === 1 || initialChromaSynced === true || initialChromaSynced === '1';
      
      if (!initialChromaSyncedIsTrue) {
        try {
          // トピックの最新データを取得（doc_getを使用）
          const latestTopicResult = await callTauriCommand('doc_get', {
            collectionName: 'topics',
            docId: topicEmbeddingId,
          }) as { exists: boolean; data?: any };
          
          if (latestTopicResult?.exists && latestTopicResult.data) {
            const latestData = latestTopicResult.data;
            const latestChromaSynced = latestData.chromaSynced;
            const latestChromaSyncedIsTrue = latestChromaSynced === 1 || latestChromaSynced === true || latestChromaSynced === '1';
            
            if (latestChromaSyncedIsTrue) {
              // 既にchromaSynced=1に更新されている場合は、修復不要としてスキップ
              console.debug(`⏭️ [同期状態修復] トピック ${topicEmbeddingId} は既にchromaSynced=1に更新されているためスキップします（初期値: ${initialChromaSynced}, 最新値: ${latestChromaSynced}）`);
              continue;
            } else {
              // 最新のデータを使用（chromaSyncedフラグがまだnullまたは0の場合）
              topicData = latestData;
            }
          }
        } catch (refreshError: any) {
          // 再取得に失敗した場合は、元のデータを使用して続行
          console.debug(`⚠️ [同期状態修復] トピック ${topicEmbeddingId} の最新データ取得に失敗しました（元のデータを使用）:`, refreshError?.message || refreshError);
        }
      }

      // 最新のデータを使用してchromaSyncedを再評価（文字列の"1"も考慮）
      const chromaSynced = topicData.chromaSynced === 1 || topicData.chromaSynced === true || topicData.chromaSynced === '1';
      const orgOrCompanyId = topicData.companyId || topicData.organizationId || organizationId || '';

      // orgOrCompanyIdがない場合はスキップ
      if (!orgOrCompanyId) {
        continue;
      }
      
      if (!chromaSynced) {
        // chromaSynced=0/nullの場合: ChromaDBに存在するかチェック
        checkedCount++;
        // 100件ごとに進捗をログ出力
        if (checkedCount % 100 === 0) {
          console.log(`📊 [同期状態修復] トピック進捗: ${checkedCount}件チェック完了 (見つかった: ${foundCount}件, 見つからない: ${notFoundCount}件, 無効: ${invalidCount}件, 修復: ${fixedCount}件)`);
        }

        try {
          // ChromaDBから直接取得
          const { getTopicEmbeddingFromChroma } = await import('./topicEmbeddingsChroma');
          const existing = await getTopicEmbeddingFromChroma(topicId, orgOrCompanyId);
          
          // ChromaDBに存在する場合、フラグを更新
          if (existing && existing.combinedEmbedding && Array.isArray(existing.combinedEmbedding) && existing.combinedEmbedding.length > 0) {
            // 修復前に現在のchromaSynced値を確認
            const currentChromaSynced = topicData.chromaSynced;
            console.warn(`✅ [同期状態修復] トピック ${topicEmbeddingId} はchromaSynced=${currentChromaSynced}ですが、ChromaDBに有効な埋め込みが存在します。フラグを更新します。`, {
              topicEmbeddingId,
              topicId,
              meetingNoteId,
              orgOrCompanyId,
              embeddingLength: existing.combinedEmbedding.length,
              currentChromaSynced,
              currentChromaSyncedType: typeof currentChromaSynced,
            });
            
            // フラグを更新
            try {
              await callTauriCommand('update_chroma_sync_status', {
                entityType: 'topic',
                entityId: topicEmbeddingId,
                synced: true,
                error: '',
              });
              
              // 書き込みキューが処理されるまで待機し、更新が反映されているか確認
              let updateConfirmed = false;
              for (let retry = 0; retry < 5; retry++) {
                await new Promise(resolve => setTimeout(resolve, 200)); // 200ms待機
                
                // トピックを再取得して、chromaSyncedフラグが更新されているか確認
                try {
                  const updatedTopicResult = await callTauriCommand('doc_get', {
                    collectionName: 'topics',
                    docId: topicEmbeddingId,
                  }) as { exists: boolean; data?: any };
                  
                  if (updatedTopicResult?.exists && updatedTopicResult.data) {
                    const updatedChromaSynced = updatedTopicResult.data.chromaSynced === 1 || updatedTopicResult.data.chromaSynced === true;
                    if (updatedChromaSynced) {
                      updateConfirmed = true;
                      console.log(`✅ [同期状態修復] トピック ${topicEmbeddingId} のchromaSyncedフラグが1に更新されました（確認済み、リトライ: ${retry}回目）`);
                      break;
                    } else {
                      console.debug(`⏳ [同期状態修復] トピック ${topicEmbeddingId} のフラグ更新を確認中... (リトライ: ${retry + 1}/5, chromaSynced=${updatedTopicResult.data.chromaSynced})`);
                    }
                  }
                } catch (checkError: any) {
                  console.debug(`⏳ [同期状態修復] トピック ${topicEmbeddingId} の再取得エラー（リトライ: ${retry + 1}/5）:`, checkError?.message || checkError);
                }
              }
              
              if (!updateConfirmed) {
                console.warn(`⚠️ [同期状態修復] トピック ${topicEmbeddingId} のフラグ更新が確認できませんでした（5回リトライ後も更新されていない可能性があります）`);
              }
              
              // 修復済みとしてマーク（更新が確認できなくても、更新コマンドは送信済み）
              repairedTopicIds.add(topicEmbeddingId);
            } catch (updateError: any) {
              console.error(`❌ [同期状態修復] トピック ${topicEmbeddingId} のフラグ更新エラー:`, updateError?.message || updateError);
              errors.push({
                topicId: topicEmbeddingId,
                error: `フラグ更新エラー: ${updateError?.message || String(updateError)}`,
              });
              continue; // エラーが発生した場合はスキップ
            }
            
            fixedCount++;
            foundCount++;
          } else {
            // ChromaDBに存在しない場合は正常（chromaSynced=0が正しい）
            notFoundCount++;
          }
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          console.error(`❌ [同期状態修復] トピック ${topicEmbeddingId} のチェックエラー:`, errorMessage, {
            topicEmbeddingId,
            topicId,
            meetingNoteId,
            orgOrCompanyId,
            errorStack: error?.stack,
          });
          errors.push({
            topicId: topicEmbeddingId,
            error: errorMessage,
          });
        }
        continue;
      }
      
      // chromaSynced=1の場合: ChromaDBに存在しない場合はフラグをリセット
      checkedCount++;
      // 100件ごとに進捗をログ出力
      if (checkedCount % 100 === 0) {
        console.log(`📊 [同期状態修復] トピック進捗: ${checkedCount}件チェック完了 (見つかった: ${foundCount}件, 見つからない: ${notFoundCount}件, 無効: ${invalidCount}件)`);
      }

      try {
        const existing = await getTopicEmbedding(topicId, meetingNoteId);
        
        if (!existing || !existing.combinedEmbedding || !Array.isArray(existing.combinedEmbedding) || existing.combinedEmbedding.length === 0) {
          notFoundCount++;
          if (existing) {
            invalidCount++;
          }
          
          console.warn(`⚠️ [同期状態修復] トピック ${topicEmbeddingId} はchromaSynced=1ですが、ChromaDBに有効な埋め込みが存在しません。フラグをリセットします。`, {
            topicEmbeddingId,
            topicId,
            meetingNoteId,
            orgOrCompanyId,
            existing: existing ? '存在するが無効' : '存在しない',
            hasCombinedEmbedding: existing?.combinedEmbedding ? 'あり' : 'なし',
            embeddingLength: existing?.combinedEmbedding?.length || 0,
          });
          
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'topic',
            entityId: topicEmbeddingId,
            synced: false,
            error: existing ? 'ChromaDBに埋め込みが存在するが無効' : 'ChromaDBに存在しない',
          });
          
          repaired++;
        } else {
          foundCount++;
          // 最初の10件のみ詳細ログを出力
          if (foundCount <= 10) {
            console.debug(`✅ [同期状態修復] トピック ${topicEmbeddingId} は正常です。`, {
              topicEmbeddingId,
              topicId,
              meetingNoteId,
              orgOrCompanyId,
              embeddingLength: existing.combinedEmbedding.length,
            });
          }
        }
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        console.error(`❌ [同期状態修復] トピック ${topicEmbeddingId} のチェックエラー:`, errorMessage, {
          topicEmbeddingId,
          topicId,
          meetingNoteId,
          orgOrCompanyId,
          errorStack: error?.stack,
        });
        errors.push({
          topicId: topicEmbeddingId,
          error: errorMessage,
        });
      }
    }

    const totalRepaired = repaired + fixedCount;
    console.log(`✅ [同期状態修復] トピックの修復完了: ${totalRepaired}件修復（chromaSynced=1→0: ${repaired}件, chromaSynced=0→1: ${fixedCount}件）、${errors.length}件エラー`);
    console.log(`📊 [同期状態修復] 詳細統計: チェック済み=${checkedCount}件, 見つかった=${foundCount}件, 見つからない=${notFoundCount}件, 無効=${invalidCount}件`);
    
    return { repaired: totalRepaired, errors };
  } catch (error: any) {
    console.error('❌ [同期状態修復] エラー:', error);
    throw error;
  }
}

/**
 * すべての同期状態を修復
 */
export async function repairAllSyncStatus(
  organizationId?: string
): Promise<{
  entities: { repaired: number; errors: Array<{ entityId: string; error: string }> };
  relations: { repaired: number; errors: Array<{ relationId: string; error: string }> };
  topics: { repaired: number; errors: Array<{ topicId: string; error: string }> };
}> {
  console.log('🔧 [同期状態修復] すべての同期状態を修復開始...', { organizationId });
  
  try {
    // 並列実行ではなく、順次実行にしてエラーハンドリングを改善
    console.log('🔧 [同期状態修復] エンティティの修復を開始...');
    const entities = await repairEntitySyncStatus(organizationId).catch((error: any) => {
      console.error('❌ [同期状態修復] エンティティの修復でエラーが発生しました:', error);
      return { repaired: 0, errors: [{ entityId: 'unknown', error: error?.message || String(error) }] };
    });
    console.log('✅ [同期状態修復] エンティティの修復が完了しました:', { repaired: entities.repaired, errors: entities.errors.length });
    
    console.log('🔧 [同期状態修復] リレーションの修復を開始...');
    const relations = await repairRelationSyncStatus(organizationId).catch((error: any) => {
      console.error('❌ [同期状態修復] リレーションの修復でエラーが発生しました:', error);
      console.error('❌ [同期状態修復] リレーションの修復エラースタック:', error?.stack);
      return { repaired: 0, errors: [{ relationId: 'unknown', error: error?.message || String(error) }] };
    });
    console.log('✅ [同期状態修復] リレーションの修復が完了しました:', { repaired: relations.repaired, errors: relations.errors.length });

    console.log('🔧 [同期状態修復] トピックの修復を開始...');
    const topics = await repairTopicSyncStatus(organizationId).catch((error: any) => {
      console.error('❌ [同期状態修復] トピックの修復でエラーが発生しました:', error);
      console.error('❌ [同期状態修復] トピックの修復エラースタック:', error?.stack);
      return { repaired: 0, errors: [{ topicId: 'unknown', error: error?.message || String(error) }] };
    });
    console.log('✅ [同期状態修復] トピックの修復が完了しました:', { repaired: topics.repaired, errors: topics.errors.length });

    console.log('✅ [同期状態修復] すべての修復が完了しました:', { 
      entities: { repaired: entities.repaired, errors: entities.errors.length },
      relations: { repaired: relations.repaired, errors: relations.errors.length },
      topics: { repaired: topics.repaired, errors: topics.errors.length }
    });
    return { entities, relations, topics };
  } catch (error: any) {
    console.error('❌ [同期状態修復] 予期しないエラーが発生しました:', error);
    throw error;
  }
}
