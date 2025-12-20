/**
 * エンティティ埋め込みの管理ユーティリティ
 * ナレッジグラフRAG検索用のエンティティ埋め込み機能を提供
 */

import { callTauriCommand } from './localFirebase';
import { generateEmbedding, generateMetadataEmbedding } from './embeddings';
import type { EntityEmbedding } from '@/types/entityEmbedding';
import type { Entity, EntityMetadata } from '@/types/entity';
import { getEntityById, getAllEntities, getEntitiesByIds } from './entityApi';
import { shouldUseChroma } from './chromaConfig';
import { calculateEntityScore, adjustWeightsForQuery } from './ragSearchScoring';
import { handleRAGSearchError, safeHandleRAGSearchError } from './ragSearchErrors';
import pLimit from 'p-limit';

/**
 * 現在の埋め込みバージョン
 */
export const CURRENT_EMBEDDING_VERSION = '2.0';

/**
 * 現在の埋め込みモデル
 */
export const CURRENT_EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * エンティティ埋め込みを保存
 */
export async function saveEntityEmbedding(
  entityId: string,
  organizationId: string,
  entity: Entity
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('エンティティ埋め込みの保存はクライアント側でのみ実行可能です');
  }
  
  const orgOrCompanyId = entity.companyId || organizationId || entity.organizationId || '';
  
  try {
    const now = new Date().toISOString();
    
    // 埋め込みテキストを構築
    const nameText = entity.name;
    const aliasesText = entity.aliases && entity.aliases.length > 0 
      ? entity.aliases.join(', ') 
      : '';
    
    const metadataParts: string[] = [];
    if (entity.metadata) {
      const metadata = entity.metadata as EntityMetadata;
      if (metadata.role) metadataParts.push(`役割: ${metadata.role}`);
      if (metadata.department) metadataParts.push(`部署: ${metadata.department}`);
      if (metadata.position) metadataParts.push(`役職: ${metadata.position}`);
      if (metadata.industry) metadataParts.push(`業界: ${metadata.industry}`);
      if (metadata.email) metadataParts.push(`メール: ${metadata.email}`);
      if (metadata.website) metadataParts.push(`Webサイト: ${metadata.website}`);
    }
    const metadataText = metadataParts.join(', ');
    
    // 統合埋め込みを生成
    const combinedText = aliasesText 
      ? `${nameText}\n${nameText}\n${nameText}\n\n別名: ${aliasesText}\n\n${metadataText}`
      : `${nameText}\n${nameText}\n${nameText}\n\n${metadataText}`;
    
    const combinedEmbedding = await generateEmbedding(combinedText.trim());
    
    // メタデータ埋め込み（メタデータがある場合のみ）
    let metadataEmbedding: number[] | undefined;
    if (metadataText) {
      try {
        metadataEmbedding = await generateMetadataEmbedding({
          keywords: entity.aliases || [],
          semanticCategory: entity.type,
          summary: metadataText,
        });
      } catch (error) {
        console.warn('メタデータ埋め込みの生成に失敗しました:', error);
      }
    }
    
    // ChromaDBに保存
    if (shouldUseChroma()) {
      try {
        const { saveEntityEmbeddingToChroma } = await import('./entityEmbeddingsChroma');
        await saveEntityEmbeddingToChroma(entityId, orgOrCompanyId, entity);
        
        // 同期状態を更新
        try {
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'entity',
            entityId: entityId,
            synced: true,
            error: null,
          });
        } catch (syncError: any) {
          console.warn(`同期状態の更新に失敗しました: ${entityId}`, syncError?.message);
        }
      } catch (chromaError: any) {
        // 同期状態を失敗として更新
        try {
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'entity',
            entityId: entityId,
            synced: false,
            error: chromaError?.message || String(chromaError),
          });
        } catch (syncError: any) {
          console.warn(`同期状態の更新に失敗しました: ${entityId}`, syncError?.message);
        }
        throw new Error(`エンティティ埋め込みの保存に失敗しました: ${chromaError?.message || String(chromaError)}`);
      }
    } else {
      throw new Error('エンティティ埋め込みの保存にはChromaDBが必要です');
    }
  } catch (error) {
    console.error('エンティティ埋め込みの保存エラー:', error);
    throw error;
  }
}

// 埋め込み生成中のエンティティIDを追跡
const embeddingGenerationInProgress = new Set<string>();

/**
 * エンティティ埋め込みを非同期で生成・保存
 */
export async function saveEntityEmbeddingAsync(
  entityId: string,
  organizationId: string
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (embeddingGenerationInProgress.has(entityId)) {
    return false;
  }

  embeddingGenerationInProgress.add(entityId);
  
  try {
    const entity = await getEntityById(entityId);
    if (!entity) {
      return false;
    }
    
    const orgOrCompanyId = entity.companyId || organizationId || entity.organizationId || '';
    await saveEntityEmbedding(entityId, orgOrCompanyId, entity);
    return true;
  } catch (error: any) {
    console.error(`エンティティ ${entityId} の埋め込み生成エラー:`, error?.message || error);
    return false;
  } finally {
    embeddingGenerationInProgress.delete(entityId);
  }
}

/**
 * エンティティ埋め込みを取得
 */
export async function getEntityEmbedding(
  entityId: string,
  organizationId?: string
): Promise<EntityEmbedding | null> {
  if (shouldUseChroma()) {
    try {
      let orgId = organizationId;
      if (!orgId) {
        try {
          const entity = await getEntityById(entityId);
          orgId = entity?.companyId || entity?.organizationId;
        } catch (e) {
          // エンティティ取得エラーは無視
        }
      }

      if (orgId) {
        try {
          const { getEntityEmbeddingFromChroma } = await import('./entityEmbeddingsChroma');
          const embedding = await Promise.race([
            getEntityEmbeddingFromChroma(entityId, orgId),
            new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error('タイムアウト')), 30000)
            )
          ]);
          return embedding;
        } catch (chromaError: any) {
          const errorMessage = chromaError?.message || String(chromaError);
          if (errorMessage.includes('タイムアウト') || 
              errorMessage.includes('ChromaDBサーバーの起動に失敗しました') ||
              errorMessage.includes('ChromaDBクライアントが初期化されていません')) {
            return null;
          }
        }
      }
      return null;
    } catch (chromaError: any) {
      console.error('ChromaDBからの取得に失敗しました:', chromaError?.message || chromaError);
      return null;
    }
  }

  return null;
}

/**
 * 類似エンティティを検索（ベクトル類似度検索）
 */
export async function findSimilarEntities(
  queryText: string,
  limit: number = 5,
  organizationId?: string
): Promise<Array<{ entityId: string; similarity: number }>> {
  if (shouldUseChroma()) {
    try {
      const { findSimilarEntitiesChroma } = await import('./entityEmbeddingsChroma');
      return await findSimilarEntitiesChroma(queryText, limit, organizationId);
    } catch (chromaError: any) {
      console.error('ChromaDBでの検索に失敗しました:', chromaError?.message || chromaError);
      return [];
    }
  }
  
  return [];
}

/**
 * キーワードマッチスコアを計算
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
function calculateKeywordMatchScore(
  queryText: string,
  entity: Entity
): number {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[calculateKeywordMatchScore] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return 0;
}

/**
 * SQLiteキーワード検索を実行
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
export async function searchEntitiesByKeywords(
  queryText: string,
  limit: number,
  filters?: {
    organizationId?: string;
    entityType?: string;
  }
): Promise<Array<{ entityId: string; keywordScore: number }>> {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[searchEntitiesByKeywords] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return [];
}

/**
 * ハイブリッド検索: ChromaDBベクトル検索 + SQLiteキーワード検索
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
export async function findSimilarEntitiesHybrid(
  queryText: string,
  limit: number = 20,
  filters?: {
    organizationId?: string;
    entityType?: string;
  }
): Promise<Array<{ entityId: string; similarity: number; score: number }>> {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[findSimilarEntitiesHybrid] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return [];
}

/**
 * 既存のエンティティ埋め込みを一括更新
 */
export async function batchUpdateEntityEmbeddings(
  entityIds: string[],
  organizationId: string,
  forceRegenerate: boolean = false,
  onProgress?: (current: number, total: number, entityId: string, status: 'processing' | 'skipped' | 'error' | 'success') => void,
  shouldCancel?: () => boolean
): Promise<{ success: number; skipped: number; errors: number }> {
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let processedCount = 0;

  const limit = pLimit(5);
  
  const promises = entityIds.map((entityId) => 
    limit(async () => {
      if (shouldCancel && shouldCancel()) {
        return { status: 'cancelled' as const };
      }
      
      try {
        const entity = await getEntityById(entityId);
        const orgOrCompanyId = entity?.companyId || entity?.organizationId || organizationId || '';
        
        if (!forceRegenerate) {
          try {
            const entityDoc = await callTauriCommand('doc_get', {
              collectionName: 'entities',
              docId: entityId,
            });
            
            if (entityDoc?.exists && entityDoc?.data) {
              const chromaSynced = entityDoc.data.chromaSynced;
              if (chromaSynced === 1) {
                try {
                  const existing = await getEntityEmbedding(entityId, orgOrCompanyId);
                  if (existing && existing.combinedEmbedding && Array.isArray(existing.combinedEmbedding) && existing.combinedEmbedding.length > 0) {
                    const current = ++processedCount;
                    skippedCount++;
                    onProgress?.(current, entityIds.length, entityId, 'skipped');
                    return { status: 'skipped' as const };
                  } else {
                    try {
                      await callTauriCommand('update_chroma_sync_status', {
                        entityType: 'entity',
                        entityId: entityId,
                        synced: false,
                        error: 'ChromaDBに有効な埋め込みが存在しないため再生成',
                      });
                    } catch (resetError) {
                      console.warn(`chromaSyncedフラグのリセットエラー:`, resetError);
                    }
                  }
                } catch (chromaCheckError) {
                  console.warn(`ChromaDB確認エラー（続行）: ${entityId}`, chromaCheckError);
                }
              }
            }
          } catch (sqliteError: any) {
            // SQLiteからの取得に失敗した場合は続行
          }
        }
        
        if (!forceRegenerate) {
          try {
            const existing = await getEntityEmbedding(entityId, orgOrCompanyId);
            if (existing && existing.combinedEmbedding && Array.isArray(existing.combinedEmbedding) && existing.combinedEmbedding.length > 0) {
              const current = ++processedCount;
              skippedCount++;
              onProgress?.(current, entityIds.length, entityId, 'skipped');
              return { status: 'skipped' as const };
            }
          } catch (chromaCheckError) {
            // ChromaDB確認エラーは無視して続行
          }
        }

        const result = await saveEntityEmbeddingAsync(entityId, orgOrCompanyId);
        const current = ++processedCount;
        
        if (result) {
          successCount++;
          onProgress?.(current, entityIds.length, entityId, 'success');
          return { status: 'success' as const };
        } else {
          errorCount++;
          onProgress?.(current, entityIds.length, entityId, 'error');
          return { status: 'error' as const };
        }
      } catch (error) {
        const current = ++processedCount;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`エンティティ ${entityId} の埋め込み生成エラー:`, errorMessage);
        
        try {
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'entity',
            entityId: entityId,
            synced: false,
            error: errorMessage,
          });
        } catch (syncStatusError) {
          console.warn(`エラーメッセージの保存に失敗しました: ${entityId}`, syncStatusError);
        }
        
        errorCount++;
        onProgress?.(current, entityIds.length, entityId, 'error');
        return { status: 'error' as const };
      }
    })
  );

  await Promise.allSettled(promises);

  return { success: successCount, skipped: skippedCount, errors: errorCount };
}

/**
 * バージョン不一致のエンティティ埋め込みを検出
 */
export async function findOutdatedEntityEmbeddings(
  organizationId?: string
): Promise<Array<{ entityId: string; currentVersion: string; expectedVersion: string; model: string }>> {
  // 実装が必要な場合は後で追加
  return [];
}

/**
 * バージョン不一致のエンティティ埋め込みを一括再生成
 */
export async function regenerateOutdatedEntityEmbeddings(
  organizationId?: string,
  onProgress?: (current: number, total: number, entityId: string, status: 'processing' | 'success' | 'error') => void
): Promise<{ regenerated: number; errors: number }> {
  try {
    const outdated = await findOutdatedEntityEmbeddings(organizationId);
    
    if (outdated.length === 0) {
      return { regenerated: 0, errors: 0 };
    }
    
    let regenerated = 0;
    let errors = 0;
    
    for (let i = 0; i < outdated.length; i++) {
      const { entityId } = outdated[i];
      onProgress?.(i + 1, outdated.length, entityId, 'processing');
      
      try {
        const entity = await getEntityById(entityId);
        if (!entity || !entity.organizationId) {
          errors++;
          onProgress?.(i + 1, outdated.length, entityId, 'error');
          continue;
        }
        
        await saveEntityEmbedding(entityId, entity.organizationId, entity);
        regenerated++;
        onProgress?.(i + 1, outdated.length, entityId, 'success');
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`エンティティ ${entityId} の再生成エラー:`, error);
        errors++;
        onProgress?.(i + 1, outdated.length, entityId, 'error');
      }
    }
    
    return { regenerated, errors };
  } catch (error) {
    console.error('バージョン不一致埋め込みの再生成エラー:', error);
    throw error;
  }
}
