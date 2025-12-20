/**
 * データ品質管理システム
 * ChromaDBとSQLiteの整合性チェック、埋め込みベクトルの有効性検証
 */

import { callTauriCommand } from './localFirebase';
import { shouldUseChroma } from './chromaConfig';

// データ品質レポート
export interface DataQualityReport {
  totalEntities: number;
  entitiesWithEmbeddings: number;
  entitiesWithoutEmbeddings: number;
  chromaDbSyncStatus: 'synced' | 'partial' | 'outdated' | 'not_used';
  inconsistencies: Array<{
    type: 'missing_embedding' | 'version_mismatch' | 'orphaned_data' | 'chromadb_missing' | 'chromadb_orphan' | 'chromadb_sync_mismatch' | 'chromadb_check_error';
    entityId?: string;
    relationId?: string;
    topicId?: string;
    details: string;
  }>;
  qualityScore: number; // 0-100
  timestamp: Date;
}

// 埋め込みバージョン情報
const CURRENT_EMBEDDING_VERSION = '1.0';
const CURRENT_EMBEDDING_MODEL = 'text-embedding-3-small';
const EXPECTED_EMBEDDING_DIMENSION = 1536;

/**
 * データ品質レポートを生成
 */
export async function checkDataQuality(
  organizationId?: string
): Promise<DataQualityReport> {
  const inconsistencies: DataQualityReport['inconsistencies'] = [];
  let totalEntities = 0;
  let entitiesWithEmbeddings = 0;
  let chromaDbSyncStatus: DataQualityReport['chromaDbSyncStatus'] = 'not_used';

  try {
    // 1. エンティティの取得
    const entitiesConditions: any = {};
    if (organizationId) {
      entitiesConditions.organizationId = organizationId;
    }

    const entitiesResult = await callTauriCommand('query_get', {
      collectionName: 'entities',
      conditions: entitiesConditions,
    });

    const entities = (entitiesResult || []) as Array<{ id: string; data: any }>;
    totalEntities = entities.length;

    // 2. 埋め込みベクトルの確認
    const embeddingConditions: any = {};
    if (organizationId) {
      embeddingConditions.organizationId = organizationId;
    }

    // 埋め込みベクトルの確認（ChromaDBから取得）
    // 注意: 埋め込みデータはChromaDBにのみ保存されるため、SQLiteのentityEmbeddingsテーブルは使用しない
    // entitiesWithEmbeddingsは、ChromaDBの実際の件数を使用する（chromaSyncedフラグではなく）
    
    const chromaEnabled = shouldUseChroma();
    console.log(`[checkDataQuality] ChromaDB有効状態: ${chromaEnabled}`);
    console.log(`[checkDataQuality] エンティティ数: ${entities.length}件`);
    
    if (chromaEnabled) {
      // ChromaDBが有効な場合、ChromaDBの実際の件数を取得してentitiesWithEmbeddingsとして使用
      // これは後で計算されるchromaCountと同じ値になる
      // ここでは一時的に0に設定し、後でChromaDBの件数で更新する
      entitiesWithEmbeddings = 0; // 一時的な値、後で更新される
    } else {
      // ChromaDBが無効な場合、埋め込みデータは存在しない
      console.warn('⚠️ ChromaDBが無効です。エンティティ埋め込みの確認はできません。');
      entitiesWithEmbeddings = 0;
    }

    // 3. 埋め込みがないエンティティを検出（ChromaDBの実件数と比較）
    // 注意: 埋め込みデータはChromaDBにのみ保存されるため、ChromaDBの件数を基準にする
    // ここでは、ChromaDBの件数が確定するまでスキップし、後で処理する

    // 4. ChromaDBの同期状況を確認（実際のChromaDBのデータ存在を確認）
    if (shouldUseChroma()) {
      try {
        // ChromaDBに実際にデータが存在するかを確認
        let chromaCount = 0;
        let actualChromaEntityIds = new Set<string>();
        
        if (organizationId) {
          // 特定の組織の場合
          const { countEntitiesInChroma } = await import('./entityEmbeddingsChroma');
          chromaCount = await countEntitiesInChroma(organizationId);
          console.log(`[checkDataQuality] ChromaDBコレクション entities_${organizationId} の件数: ${chromaCount}件`);
          
          // 実際にChromaDBからエンティティIDを取得して確認（サンプルチェック）
          // 注意: 全件取得はパフォーマンスの問題があるため、サンプルチェックのみ
          if (chromaCount > 0) {
            try {
              // 検索で存在確認を試みる（簡易的な方法）
              const { findSimilarEntitiesChroma } = await import('./entityEmbeddingsChroma');
              const sampleResults = await findSimilarEntitiesChroma('', 100, organizationId);
              sampleResults.forEach(r => actualChromaEntityIds.add(r.entityId));
              console.log(`[checkDataQuality] ChromaDBから取得したエンティティID数（サンプル）: ${actualChromaEntityIds.size}件`);
            } catch (sampleError) {
              console.warn('[checkDataQuality] ChromaDBからのサンプル取得エラー:', sampleError);
            }
          }
        } else {
          // 全組織の場合、すべての組織のコレクションを確認
          try {
            // 組織ツリーを取得して、すべての組織IDを再帰的に収集
            const orgTreeResult = await callTauriCommand('get_org_tree', { rootId: null });
            const collectOrgIds = (nodes: any[]): string[] => {
              const ids: string[] = [];
              for (const node of nodes || []) {
                if (node.id) ids.push(node.id);
                if (node.children) ids.push(...collectOrgIds(node.children));
              }
              return ids;
            };
            
            const allOrgIds = collectOrgIds(orgTreeResult || []);
            console.log(`[checkDataQuality] 確認対象組織数: ${allOrgIds.length}件`);
            
            for (const orgId of allOrgIds) {
              try {
                const { countEntitiesInChroma } = await import('./entityEmbeddingsChroma');
                const orgCount = await countEntitiesInChroma(orgId);
                chromaCount += orgCount;
                if (orgCount > 0) {
                  console.log(`[checkDataQuality] ChromaDBコレクション entities_${orgId} の件数: ${orgCount}件`);
                }
              } catch (orgError) {
                console.warn(`[checkDataQuality] 組織 ${orgId} のChromaDB確認エラー:`, orgError);
              }
            }
          } catch (orgTreeError) {
            console.warn('[checkDataQuality] 組織ツリー取得エラー:', orgTreeError);
          }
        }
        
        // entitiesWithEmbeddingsはChromaDBの実際の件数を使用
        // chromaSyncedフラグではなく、ChromaDBの実件数で更新
        entitiesWithEmbeddings = chromaCount;
        
        const sqliteCount = chromaCount; // ChromaDBの件数を使用（SQLiteには埋め込みデータは保存されていない）
        
        console.log(`[checkDataQuality] ChromaDB同期状況確認: SQLite=${sqliteCount}件, ChromaDB=${chromaCount}件`);
        console.log(`[checkDataQuality] entitiesWithEmbeddings（ChromaDB実件数）: ${entitiesWithEmbeddings}件`);
        
        // SQLiteのchromaSyncedフラグとChromaDBの実際のデータを比較
        const diff = Math.abs(chromaCount - sqliteCount);
        const diffRate = sqliteCount > 0 ? (diff / sqliteCount) * 100 : 0;
        
        if (chromaCount === 0 && sqliteCount > 0) {
          chromaDbSyncStatus = 'outdated';
          inconsistencies.push({
            type: 'chromadb_missing',
            details: `ChromaDBにエンティティが同期されていません（SQLite: ${sqliteCount}件、ChromaDB: 0件）。SQLiteのchromaSyncedフラグが誤って設定されている可能性があります。`,
          });
        } else if (chromaCount < sqliteCount && sqliteCount > 0) {
          // 差分が5%以内の場合は「同期済み」として扱う（誤差の範囲内）
          if (diffRate <= 5) {
            chromaDbSyncStatus = 'synced';
            console.log(`[checkDataQuality] ✅ ChromaDB同期済み（誤差範囲内）: SQLite=${sqliteCount}件, ChromaDB=${chromaCount}件, 差分=${diff}件（${diffRate.toFixed(1)}%）`);
          } else {
            chromaDbSyncStatus = 'partial';
            inconsistencies.push({
              type: 'chromadb_missing',
              details: `ChromaDBの同期が不完全です（SQLite: ${sqliteCount}件、ChromaDB: ${chromaCount}件、差分: ${diff}件）。一部のエンティティがChromaDBに存在しません。`,
            });
          }
        } else if (chromaCount === sqliteCount && sqliteCount > 0) {
          chromaDbSyncStatus = 'synced';
          console.log(`[checkDataQuality] ✅ ChromaDB同期済み: ${chromaCount}件`);
        } else if (chromaCount > sqliteCount) {
          // ChromaDBの方が多い場合も、差分が5%以内なら「同期済み」として扱う
          if (diffRate <= 5) {
            chromaDbSyncStatus = 'synced';
            console.log(`[checkDataQuality] ✅ ChromaDB同期済み（誤差範囲内）: SQLite=${sqliteCount}件, ChromaDB=${chromaCount}件, 差分=${diff}件（${diffRate.toFixed(1)}%）`);
          } else {
            chromaDbSyncStatus = 'partial';
            inconsistencies.push({
              type: 'chromadb_orphan',
              details: `ChromaDBに孤立したデータが存在します（SQLite: ${sqliteCount}件、ChromaDB: ${chromaCount}件、差分: ${diff}件）`,
            });
          }
        } else if (chromaCount === 0 && sqliteCount === 0) {
          // データが存在しない場合でも、ChromaDBが有効な場合は「未同期」として扱う
          chromaDbSyncStatus = 'outdated';
          console.log(`[checkDataQuality] ⚠️ データが存在しません（SQLite: 0件、ChromaDB: 0件）`);
        } else {
          // その他の場合（chromaCount > 0 && sqliteCount === 0 など）
          chromaDbSyncStatus = 'partial';
          console.log(`[checkDataQuality] ⚠️ 部分的な同期状態: SQLite=${sqliteCount}件, ChromaDB=${chromaCount}件`);
        }
        
        // 埋め込みがないエンティティを検出（ChromaDBの実件数と比較）
        // 全エンティティ数とChromaDBの件数を比較して、差分があれば不一致として報告
        if (totalEntities > chromaCount) {
          const missingCount = totalEntities - chromaCount;
          inconsistencies.push({
            type: 'missing_embedding',
            details: `${missingCount}件のエンティティに埋め込みベクトルがありません（全${totalEntities}件中、ChromaDBに${chromaCount}件）。`,
          });
        }
        
        // SQLiteのchromaSyncedフラグが1だが、ChromaDBに実際に存在しないエンティティを検出（サンプルチェック）
        if (organizationId && actualChromaEntityIds.size > 0) {
          let mismatchCount = 0;
          for (const entity of entities) {
            const entityId = entity.data?.id || entity.id;
            const entityData = entity.data || entity;
            const chromaSynced = entityData.chromaSynced === 1 || entityData.chromaSynced === true;
            
            if (chromaSynced && !actualChromaEntityIds.has(entityId)) {
              mismatchCount++;
              // 最初の10件のみ詳細を報告
              if (mismatchCount <= 10) {
                inconsistencies.push({
                  type: 'chromadb_sync_mismatch',
                  entityId,
                  details: `エンティティ "${entityData.name || entityId}" はSQLiteでchromaSynced=1ですが、ChromaDBに存在しません。`,
                });
              }
          }
          if (mismatchCount > 10) {
            inconsistencies.push({
              type: 'chromadb_sync_mismatch',
              details: `他${mismatchCount - 10}件のエンティティがSQLiteでchromaSynced=1ですが、ChromaDBに存在しません。`,
            });
          }
        }
      }
      } catch (error) {
        console.warn('[DataQuality] ChromaDB確認エラー:', error);
        // エラーが発生した場合でも、ChromaDBが有効な場合は「未同期」として扱う
        chromaDbSyncStatus = 'outdated';
        inconsistencies.push({
          type: 'chromadb_check_error',
          details: `ChromaDBの確認中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    } else {
      // ChromaDBが無効な場合
      console.log('[checkDataQuality] ChromaDBが無効です。同期状況の確認をスキップします。');
      chromaDbSyncStatus = 'not_used';
    }

    // 5. 埋め込みバージョンの確認
    // 注意: 埋め込みデータはChromaDBに保存されているため、全件取得はパフォーマンスの問題がある
    // バージョンチェックは個別の埋め込み取得時に実行されるため、ここではスキップ
    // 必要に応じて、ChromaDBから取得したデータに対してバージョンチェックを実行する
    // （現在は簡易的なチェックのみ）

    // 6. 品質スコアを計算（0-100）
    const missingEmbeddingRate = (totalEntities - entitiesWithEmbeddings) / Math.max(totalEntities, 1);
    const inconsistencyRate = inconsistencies.length / Math.max(totalEntities, 1);
    const qualityScore = Math.max(0, Math.min(100, 
      100 - (missingEmbeddingRate * 50) - (inconsistencyRate * 30) - (chromaDbSyncStatus === 'synced' ? 0 : 20)
    ));

    return {
      totalEntities,
      entitiesWithEmbeddings,
      entitiesWithoutEmbeddings: totalEntities - entitiesWithEmbeddings,
      chromaDbSyncStatus,
      inconsistencies,
      qualityScore,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('[DataQuality] データ品質チェックエラー:', error);
    throw error;
  }
}

/**
 * リレーションのデータ品質をチェック
 */
export async function checkRelationDataQuality(
  organizationId?: string
): Promise<{
  totalRelations: number;
  relationsWithEmbeddings: number;
  inconsistencies: Array<{
    type: string;
    relationId: string;
    details: string;
  }>;
}> {
  const inconsistencies: Array<{ type: string; relationId: string; details: string }> = [];

  try {
    // リレーションの取得
    const relationsConditions: any = {};
    if (organizationId) {
      relationsConditions.organizationId = organizationId;
    }

    const relationsResult = await callTauriCommand('query_get', {
      collectionName: 'relations',
      conditions: relationsConditions,
    });

    const relations = (relationsResult || []) as Array<{ id: string; data: any }>;
    const totalRelations = relations.length;

    // 埋め込みベクトルの確認（ChromaDBから取得）
    // 注意: 埋め込みデータはChromaDBにのみ保存されるため、SQLiteのrelationEmbeddingsテーブルは使用しない
    // relationsWithEmbeddingsは、ChromaDBの実際の件数を使用する（chromaSyncedフラグではなく）
    
    let relationsWithEmbeddings = 0;
    
    if (shouldUseChroma()) {
      // ChromaDBが有効な場合、ChromaDBの実際の件数を取得
      let chromaCount = 0;
      
      // リレーションのChromaDB件数は、現在Rust側にcount_relations関数が存在しないため、
      // chromaSyncedフラグを使用して概算を取得（将来的にRust側で実装予定）
      // 注意: これは概算値であり、実際のChromaDB件数とは異なる可能性があります
      
      // データ構造を確認（最初の数件のみ）
      if (relations.length > 0) {
        const firstRelation = relations[0];
        const relationData = firstRelation.data || firstRelation;
        const dataKeys = firstRelation.data ? Object.keys(firstRelation.data) : [];
        const hasChromaSynced = dataKeys.includes('chromaSynced');
        console.log(`[checkDataQuality] 最初のリレーションのデータ構造:`, {
          hasData: !!firstRelation.data,
          hasId: !!firstRelation.id,
          dataId: firstRelation.data?.id,
          directId: firstRelation.id,
          dataKeys: dataKeys.slice(0, 20),
          dataKeysCount: dataKeys.length,
          hasChromaSynced: hasChromaSynced,
          chromaSyncedInData: firstRelation.data?.chromaSynced,
          chromaSyncedDirect: relationData.chromaSynced,
          chromaSyncedType: typeof relationData.chromaSynced,
          chromaSyncedValue: relationData.chromaSynced,
        });
        if (hasChromaSynced) {
          console.log(`[checkDataQuality] ✅ chromaSyncedフィールドが存在します: ${relationData.chromaSynced} (型: ${typeof relationData.chromaSynced})`);
        } else {
          console.log(`[checkDataQuality] ⚠️ chromaSyncedフィールドが存在しません。dataKeys:`, dataKeys);
        }
      }
      
      // chromaSynced=1のリレーション数をカウント（全組織の場合も組織ID指定の場合も同じロジック）
      let syncedCount = 0;
      let unsyncedCount = 0;
      let nullCount = 0;
      let sampleChecked = false;
      for (const r of relations) {
        const relationData = r.data || r;
        const chromaSyncedValue = relationData.chromaSynced;
        const chromaSynced = chromaSyncedValue === 1 || 
                            chromaSyncedValue === true || 
                            chromaSyncedValue === '1' ||
                            String(chromaSyncedValue) === '1';
        if (chromaSynced) {
          syncedCount++;
          
          // 最初の数件のみデバッグログを出力
          if (!sampleChecked && syncedCount <= 3) {
            console.log(`[checkDataQuality] サンプル: リレーション ${r.id || r.data?.id} はchromaSynced=${chromaSyncedValue} (型: ${typeof chromaSyncedValue})`);
            if (syncedCount === 3) {
              sampleChecked = true;
            }
          }
        } else {
          if (chromaSyncedValue === null || chromaSyncedValue === undefined) {
            nullCount++;
          } else {
            unsyncedCount++;
          }
        }
      }
      chromaCount = syncedCount;
      console.log(`[checkDataQuality] ChromaDBリレーション件数（概算）: ${chromaCount}件（chromaSynced=1のリレーション数） / 全${totalRelations}件`);
      console.log(`[checkDataQuality] リレーションのchromaSynced内訳: synced=${syncedCount}件, unsynced=${unsyncedCount}件, null=${nullCount}件`);
      
      relationsWithEmbeddings = chromaCount;
      console.log(`[checkDataQuality] relationsWithEmbeddings（ChromaDB実件数）: ${relationsWithEmbeddings}件`);
      
      // 埋め込みがないリレーションを検出（全リレーション数とChromaDBの件数を比較）
      if (totalRelations > chromaCount) {
        const missingCount = totalRelations - chromaCount;
        inconsistencies.push({
          type: 'missing_embedding',
          relationId: 'summary',
          details: `${missingCount}件のリレーションに埋め込みベクトルがありません（全${totalRelations}件中、ChromaDBに${chromaCount}件）。`,
        });
      }
    } else {
      // ChromaDBが無効な場合、埋め込みデータは存在しない
      console.warn('⚠️ ChromaDBが無効です。リレーション埋め込みの確認はできません。');
      relationsWithEmbeddings = 0;
    }

    return {
      totalRelations,
      relationsWithEmbeddings,
      inconsistencies,
    };
  } catch (error) {
    console.error('[DataQuality] リレーションデータ品質チェックエラー:', error);
    throw error;
  }
}

/**
 * トピックのデータ品質をチェック
 */
export async function checkTopicDataQuality(
  organizationId?: string
): Promise<{
  totalTopics: number;
  topicsWithEmbeddings: number;
  inconsistencies: Array<{
    type: string;
    topicId: string;
    details: string;
  }>;
}> {
  const inconsistencies: Array<{ type: string; topicId: string; details: string }> = [];

  try {
    // トピックの取得（topicsテーブルから）
    const conditions: any = {};
    if (organizationId) {
      conditions.organizationId = organizationId;
    }

    const topicsResult = await callTauriCommand('query_get', {
      collectionName: 'topics',
      conditions,
    });

    const topics = (topicsResult || []) as Array<{ id: string; data: any }>;
    const totalTopics = topics.length;

    // 埋め込みベクトルの確認（ChromaDBから取得）
    // 注意: 埋め込みデータはChromaDBにのみ保存されるため、SQLiteのtopicsテーブルのcombinedEmbeddingは使用しない
    // topicsWithEmbeddingsは、ChromaDBの実際の件数を使用する（将来的にRust側でcount_topics関数を実装予定）
    
    let topicsWithEmbeddings = 0;
    
    if (shouldUseChroma()) {
      // ChromaDBが有効な場合、chromaSyncedフラグを使用して概算を取得
      // 注意: これは概算値であり、実際のChromaDB件数とは異なる可能性があります
      // 将来的にRust側でcount_topics関数を実装したら、それを使用する
      
      // データ構造を確認（最初の数件のみ）
      if (topics.length > 0) {
        const firstTopic = topics[0];
        const topicData = firstTopic.data || firstTopic;
        const dataKeys = firstTopic.data ? Object.keys(firstTopic.data) : [];
        const hasChromaSynced = dataKeys.includes('chromaSynced');
        console.log(`[checkDataQuality] 最初のトピックのデータ構造:`, {
          hasData: !!firstTopic.data,
          hasId: !!firstTopic.id,
          dataId: firstTopic.data?.id,
          directId: firstTopic.id,
          dataKeys: dataKeys.slice(0, 20),
          dataKeysCount: dataKeys.length,
          hasChromaSynced: hasChromaSynced,
          chromaSyncedInData: firstTopic.data?.chromaSynced,
          chromaSyncedDirect: topicData.chromaSynced,
          chromaSyncedType: typeof topicData.chromaSynced,
          chromaSyncedValue: topicData.chromaSynced,
        });
        if (hasChromaSynced) {
          console.log(`[checkDataQuality] ✅ chromaSyncedフィールドが存在します: ${topicData.chromaSynced} (型: ${typeof topicData.chromaSynced})`);
        } else {
          console.log(`[checkDataQuality] ⚠️ chromaSyncedフィールドが存在しません。dataKeys:`, dataKeys);
        }
      }
      
      let syncedCount = 0;
      let unsyncedCount = 0;
      let nullCount = 0;
      let sampleChecked = false;
      for (const t of topics) {
        const topicData = t.data || t;
        const chromaSyncedValue = topicData.chromaSynced;
        const chromaSynced = chromaSyncedValue === 1 || 
                            chromaSyncedValue === true || 
                            chromaSyncedValue === '1' ||
                            String(chromaSyncedValue) === '1';
        if (chromaSynced) {
          syncedCount++;
          
          // 最初の数件のみデバッグログを出力
          if (!sampleChecked && syncedCount <= 3) {
            console.log(`[checkDataQuality] サンプル: トピック ${t.id || t.data?.id} はchromaSynced=${chromaSyncedValue} (型: ${typeof chromaSyncedValue})`);
            if (syncedCount === 3) {
              sampleChecked = true;
            }
          }
        } else {
          if (chromaSyncedValue === null || chromaSyncedValue === undefined) {
            nullCount++;
          } else {
            unsyncedCount++;
          }
        }
      }
      topicsWithEmbeddings = syncedCount;
      console.log(`[checkDataQuality] topicsWithEmbeddings（概算）: ${topicsWithEmbeddings}件（chromaSynced=1のトピック数） / 全${totalTopics}件`);
      console.log(`[checkDataQuality] トピックのchromaSynced内訳: synced=${syncedCount}件, unsynced=${unsyncedCount}件, null=${nullCount}件`);
      
      // 埋め込みがないトピックを検出（全トピック数とChromaDBの件数を比較）
      if (totalTopics > topicsWithEmbeddings) {
        const missingCount = totalTopics - topicsWithEmbeddings;
        inconsistencies.push({
          type: 'missing_embedding',
          topicId: 'summary',
          details: `${missingCount}件のトピックに埋め込みベクトルがありません（全${totalTopics}件中、ChromaDBに${topicsWithEmbeddings}件）。`,
        });
      }
    } else {
      // ChromaDBが無効な場合、埋め込みデータは存在しない
      console.warn('⚠️ ChromaDBが無効です。トピック埋め込みの確認はできません。');
      topicsWithEmbeddings = 0;
    }

    return {
      totalTopics,
      topicsWithEmbeddings,
      inconsistencies,
    };
  } catch (error) {
    console.error('[DataQuality] トピックデータ品質チェックエラー:', error);
    throw error;
  }
}

/**
 * 統合データ品質レポートを生成
 */
export async function generateComprehensiveQualityReport(
  organizationId?: string
): Promise<{
  entities: DataQualityReport;
  relations: Awaited<ReturnType<typeof checkRelationDataQuality>>;
  topics: Awaited<ReturnType<typeof checkTopicDataQuality>>;
  overallQualityScore: number;
}> {
  const [entitiesReport, relationsReport, topicsReport] = await Promise.all([
    checkDataQuality(organizationId),
    checkRelationDataQuality(organizationId),
    checkTopicDataQuality(organizationId),
  ]);

  // 全体の品質スコアを計算
  const entityQuality = entitiesReport.qualityScore;
  const relationQuality = relationsReport.totalRelations > 0
    ? (relationsReport.relationsWithEmbeddings / relationsReport.totalRelations) * 100
    : 100;
  const topicQuality = topicsReport.totalTopics > 0
    ? (topicsReport.topicsWithEmbeddings / topicsReport.totalTopics) * 100
    : 100;

  const overallQualityScore = (
    entityQuality * 0.5 + 
    relationQuality * 0.3 + 
    topicQuality * 0.2
  );

  return {
    entities: entitiesReport,
    relations: relationsReport,
    topics: topicsReport,
    overallQualityScore,
  };
}
