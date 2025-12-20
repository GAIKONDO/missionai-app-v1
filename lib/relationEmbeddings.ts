/**
 * リレーション埋め込みの管理ユーティリティ
 * ナレッジグラフRAG検索用のリレーション埋め込み機能を提供
 */

import { callTauriCommand } from './localFirebase';
import { generateEmbedding } from './embeddings';
import type { RelationEmbedding } from '@/types/relationEmbedding';
import type { Relation } from '@/types/relation';
import { getRelationById, getAllRelations, getRelationsByIds } from './relationApi';
import { shouldUseChroma } from './chromaConfig';
import { calculateRelationScore, adjustWeightsForQuery } from './ragSearchScoring';
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

import { getEntityById } from './entityApi';

/**
 * リレーション埋め込みを保存
 */
export async function saveRelationEmbedding(
  relationId: string,
  topicId: string,
  organizationId: string,
  relation: Relation
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('リレーション埋め込みの保存はクライアント側でのみ実行可能です');
  }
  
  const orgOrCompanyId = relation.companyId || organizationId || relation.organizationId || '';
  
  try {
    // ChromaDBに保存
    if (shouldUseChroma()) {
      try {
        const { saveRelationEmbeddingToChroma } = await import('./relationEmbeddingsChroma');
        await saveRelationEmbeddingToChroma(relationId, topicId, orgOrCompanyId, relation);
        
        // 同期状態を更新
        try {
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'relation',
            entityId: relationId,
            synced: true,
            error: null,
          });
        } catch (syncError: any) {
          console.warn(`同期状態の更新に失敗しました: ${relationId}`, syncError?.message);
        }
      } catch (chromaError: any) {
        // 同期状態を失敗として更新
        try {
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'relation',
            entityId: relationId,
            synced: false,
            error: chromaError?.message || String(chromaError),
          });
        } catch (syncError: any) {
          console.warn(`同期状態の更新に失敗しました: ${relationId}`, syncError?.message);
        }
        throw new Error(`リレーション埋め込みの保存に失敗しました: ${chromaError?.message || String(chromaError)}`);
      }
    } else {
      throw new Error('リレーション埋め込みの保存にはChromaDBが必要です');
    }
  } catch (error) {
    console.error('リレーション埋め込みの保存エラー:', error);
    throw error;
  }
}

// 埋め込み生成中のリレーションIDを追跡
const relationEmbeddingGenerationInProgress = new Set<string>();

/**
 * リレーション埋め込みを非同期で生成・保存
 */
export async function saveRelationEmbeddingAsync(
  relationId: string,
  topicId: string,
  organizationId: string
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (relationEmbeddingGenerationInProgress.has(relationId)) {
    return false;
  }

  relationEmbeddingGenerationInProgress.add(relationId);
  
  try {
    const relation = await getRelationById(relationId);
    if (!relation) {
      return false;
    }
    
    const orgOrCompanyId = relation.companyId || organizationId || relation.organizationId || '';
    await saveRelationEmbedding(relationId, topicId, orgOrCompanyId, relation);
    return true;
  } catch (error: any) {
    console.error(`リレーション ${relationId} の埋め込み生成エラー:`, error?.message || error);
    return false;
  } finally {
    relationEmbeddingGenerationInProgress.delete(relationId);
  }
}

/**
 * リレーション埋め込みを取得
 */
export async function getRelationEmbedding(
  relationId: string,
  organizationId?: string
): Promise<RelationEmbedding | null> {
  if (shouldUseChroma()) {
    try {
      let orgId = organizationId;
      if (!orgId) {
        try {
          const relation = await getRelationById(relationId);
          orgId = relation?.companyId || relation?.organizationId;
        } catch (e) {
          // リレーション取得エラーは無視
        }
      }

      if (orgId) {
        try {
          const { getRelationEmbeddingFromChroma } = await import('./relationEmbeddingsChroma');
          const embedding = await getRelationEmbeddingFromChroma(relationId, orgId);
          return embedding;
        } catch (chromaError: any) {
          const errorMessage = chromaError?.message || String(chromaError);
          if (errorMessage.includes('ChromaDBサーバーの起動に失敗しました') || 
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
 * 類似リレーションを検索（ベクトル類似度検索）
 */
export async function findSimilarRelations(
  queryText: string,
  limit: number = 5,
  organizationId?: string
): Promise<Array<{ relationId: string; similarity: number }>> {
  if (shouldUseChroma()) {
    try {
      const { findSimilarRelationsChroma } = await import('./relationEmbeddingsChroma');
      return await findSimilarRelationsChroma(queryText, limit, organizationId);
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
function calculateRelationKeywordMatchScore(
  queryText: string,
  relation: Relation
): number {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[calculateRelationKeywordMatchScore] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return 0;
}

/**
 * SQLiteキーワード検索を実行
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
async function searchRelationsByKeywords(
  queryText: string,
  limit: number,
  filters?: {
    organizationId?: string;
    relationType?: string;
  }
): Promise<Array<{ relationId: string; keywordScore: number }>> {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[searchRelationsByKeywords] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return [];
}

/**
 * ハイブリッド検索: ChromaDBベクトル検索 + SQLiteキーワード検索
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
export async function findSimilarRelationsHybrid(
  queryText: string,
  limit: number = 20,
  filters?: {
    organizationId?: string;
    relationType?: string;
    topicId?: string;
  }
): Promise<Array<{ relationId: string; similarity: number; score: number }>> {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[findSimilarRelationsHybrid] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return [];
}

/**
 * 既存のリレーション埋め込みを一括更新
 */
export async function batchUpdateRelationEmbeddings(
  relationIds: string[],
  organizationId: string,
  forceRegenerate: boolean = false,
  onProgress?: (current: number, total: number, relationId: string, status: 'processing' | 'skipped' | 'error' | 'success') => void,
  shouldCancel?: () => boolean
): Promise<{ success: number; skipped: number; errors: number }> {
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let processedCount = 0;

  const limit = pLimit(5);
  
  const promises = relationIds.map((relationId) => 
    limit(async () => {
      if (shouldCancel && shouldCancel()) {
        return { status: 'cancelled' as const };
      }
      
      try {
        const relation = await getRelationById(relationId);
        if (!relation) {
          const current = ++processedCount;
          errorCount++;
          onProgress?.(current, relationIds.length, relationId, 'error');
          return { status: 'error' as const };
        }
        
        const orgOrCompanyId = relation.companyId || relation.organizationId || organizationId || '';
        
        if (!forceRegenerate) {
          try {
            const relationDoc = await callTauriCommand('doc_get', {
              collectionName: 'relations',
              docId: relationId,
            });
            
            if (relationDoc?.exists && relationDoc?.data) {
              const chromaSynced = relationDoc.data.chromaSynced;
              if (chromaSynced === 1) {
                try {
                  const existing = await getRelationEmbedding(relationId);
                  if (existing) {
                    const current = ++processedCount;
                    skippedCount++;
                    onProgress?.(current, relationIds.length, relationId, 'skipped');
                    return { status: 'skipped' as const };
                  } else {
                    try {
                      await callTauriCommand('update_chroma_sync_status', {
                        entityType: 'relation',
                        entityId: relationId,
                        synced: false,
                        error: 'ChromaDBに存在しないため再生成',
                      });
                    } catch (resetError) {
                      console.warn(`chromaSyncedフラグのリセットエラー:`, resetError);
                    }
                  }
                } catch (chromaCheckError) {
                  // ChromaDB確認エラーは無視して続行
                }
              }
            }
          } catch (sqliteError: any) {
            // SQLiteからの取得に失敗した場合は続行
          }
        }
        
        if (!forceRegenerate) {
          try {
            const existing = await getRelationEmbedding(relationId);
            if (existing) {
              const current = ++processedCount;
              skippedCount++;
              onProgress?.(current, relationIds.length, relationId, 'skipped');
              return { status: 'skipped' as const };
            }
          } catch (chromaCheckError) {
            // ChromaDB確認エラーは無視して続行
          }
        }

        const result = await saveRelationEmbeddingAsync(relationId, relation.topicId, orgOrCompanyId);
        const current = ++processedCount;
        
        if (result) {
          successCount++;
          onProgress?.(current, relationIds.length, relationId, 'success');
          return { status: 'success' as const };
        } else {
          errorCount++;
          onProgress?.(current, relationIds.length, relationId, 'error');
          return { status: 'error' as const };
        }
      } catch (error) {
        const current = ++processedCount;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`リレーション ${relationId} の埋め込み生成エラー:`, errorMessage);
        errorCount++;
        onProgress?.(current, relationIds.length, relationId, 'error');
        return { status: 'error' as const };
      }
    })
  );

  await Promise.allSettled(promises);

  return { success: successCount, skipped: skippedCount, errors: errorCount };
}

/**
 * バージョン不一致のリレーション埋め込みを検出
 */
export async function findOutdatedRelationEmbeddings(
  organizationId?: string
): Promise<Array<{ relationId: string; currentVersion: string; expectedVersion: string; model: string }>> {
  // 実装が必要な場合は後で追加
  return [];
}

/**
 * バージョン不一致のリレーション埋め込みを一括再生成
 */
export async function regenerateOutdatedRelationEmbeddings(
  organizationId?: string,
  onProgress?: (current: number, total: number, relationId: string, status: 'processing' | 'success' | 'error') => void
): Promise<{ regenerated: number; errors: number }> {
  try {
    const outdated = await findOutdatedRelationEmbeddings(organizationId);
    
    if (outdated.length === 0) {
      return { regenerated: 0, errors: 0 };
    }
    
    let regenerated = 0;
    let errors = 0;
    
    for (let i = 0; i < outdated.length; i++) {
      const { relationId } = outdated[i];
      onProgress?.(i + 1, outdated.length, relationId, 'processing');
      
      try {
        const relation = await getRelationById(relationId);
        if (!relation || !relation.organizationId) {
          errors++;
          onProgress?.(i + 1, outdated.length, relationId, 'error');
          continue;
        }
        
        await saveRelationEmbedding(relationId, relation.topicId, relation.organizationId, relation);
        regenerated++;
        onProgress?.(i + 1, outdated.length, relationId, 'success');
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`リレーション ${relationId} の再生成エラー:`, error);
        errors++;
        onProgress?.(i + 1, outdated.length, relationId, 'error');
      }
    }
    
    return { regenerated, errors };
  } catch (error) {
    console.error('バージョン不一致埋め込みの再生成エラー:', error);
    throw error;
  }
}
