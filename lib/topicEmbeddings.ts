/**
 * トピック埋め込みの管理ユーティリティ
 */

import { doc, setDoc, collection, getDocs } from './localFirebase';
import { callTauriCommand } from './localFirebase';
import { 
  generateCombinedEmbedding, 
  generateSeparatedEmbeddings,
  generateEnhancedEmbedding,
  generateMetadataEmbedding,
  cosineSimilarity 
} from './embeddings';
import type { TopicEmbedding, TopicMetadata, TopicSemanticCategory } from '@/types/topicMetadata';
import { shouldUseChroma } from './chromaConfig';
import { calculateTopicScore, adjustWeightsForQuery } from './ragSearchScoring';
import { handleRAGSearchError, safeHandleRAGSearchError } from './ragSearchErrors';
import pLimit from 'p-limit';

/**
 * トピック埋め込みを保存
 */
export async function saveTopicEmbedding(
  topicId: string,
  meetingNoteId: string,
  organizationId: string,
  title: string,
  content: string,
  metadata?: Partial<Pick<TopicMetadata, 'keywords' | 'semanticCategory' | 'tags' | 'summary' | 'importance'>>
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('トピック埋め込みの保存はクライアント側でのみ実行可能です');
  }
  
  try {
    const now = new Date().toISOString();
    const embeddingVersion = metadata ? '2.0' : '1.0';
    const embeddingId = `${meetingNoteId}-topic-${topicId}`;
    
    // topicsテーブルに保存するためのデータ
    const topicData: any = {
      id: embeddingId,
      topicId,
      meetingNoteId,
      organizationId,
      title: title || '',
      content: content || null,
      createdAt: now,
      updatedAt: now,
    };

    // メタデータフィールドを追加
    if (metadata?.semanticCategory) {
      topicData.semanticCategory = metadata.semanticCategory;
    }
    if (metadata?.keywords && metadata.keywords.length > 0) {
      topicData.keywords = Array.isArray(metadata.keywords) 
        ? JSON.stringify(metadata.keywords) 
        : metadata.keywords;
    }
    if (metadata?.tags && metadata.tags.length > 0) {
      topicData.tags = Array.isArray(metadata.tags) 
        ? JSON.stringify(metadata.tags) 
        : metadata.tags;
    }
    if (metadata?.summary) {
      topicData.description = metadata.summary;
    }

    // ChromaDBに保存
    if (shouldUseChroma()) {
      try {
        const { saveTopicEmbeddingToChroma } = await import('./topicEmbeddingsChroma');
        await saveTopicEmbeddingToChroma(topicId, meetingNoteId, organizationId, title, content, metadata);
        
        // topicsテーブルにメタデータを保存
        try {
          await setDoc(doc(null, 'topics', embeddingId), topicData);
        } catch (topicSaveError: any) {
          console.warn(`topicsテーブルへの保存に失敗しました: ${embeddingId}`, topicSaveError?.message);
        }
        
        // 同期状態を更新
        try {
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'topic',
            entityId: embeddingId,
            synced: true,
            error: null,
          });
        } catch (syncStatusError: any) {
          console.warn(`同期状態の更新に失敗しました: ${embeddingId}`, syncStatusError?.message);
        }
      } catch (chromaError: any) {
        // 同期状態を失敗として更新
        try {
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'topic',
            entityId: embeddingId,
            synced: false,
            error: chromaError?.message || String(chromaError),
          });
        } catch (syncStatusError: any) {
          console.warn(`同期状態の更新に失敗しました: ${embeddingId}`, syncStatusError?.message);
        }
        
        // フォールバック: SQLiteに保存
        await setDoc(doc(null, 'topics', embeddingId), topicData);
      }
    } else {
      // SQLiteに保存
      await setDoc(doc(null, 'topics', embeddingId), topicData);
    }
  } catch (error) {
    console.error('トピック埋め込みの保存エラー:', error);
    throw error;
  }
}

/**
 * トピック埋め込みを非同期で生成・保存
 */
export async function saveTopicEmbeddingAsync(
  topicId: string,
  meetingNoteId: string,
  organizationId: string,
  title: string,
  content: string,
  metadata?: Partial<Pick<TopicMetadata, 'keywords' | 'semanticCategory' | 'tags' | 'summary' | 'importance'>>
): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    await saveTopicEmbedding(topicId, meetingNoteId, organizationId, title, content, metadata);
  } catch (error: any) {
    console.error(`トピック ${topicId} の埋め込み生成エラー:`, error?.message || error);
  }
}

/**
 * 複数のトピック埋め込みを一括取得
 */
export async function getTopicEmbeddingsByIds(
  topicIds: Array<{ topicId: string; meetingNoteId: string }>,
  concurrencyLimit: number = 5
): Promise<TopicEmbedding[]> {
  if (topicIds.length === 0) {
    return [];
  }

  const limit = pLimit(concurrencyLimit);

  try {
    const results = await Promise.allSettled(
      topicIds.map(({ topicId, meetingNoteId }) =>
        limit(() => getTopicEmbedding(topicId, meetingNoteId))
      )
    );

    const embeddings: TopicEmbedding[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        embeddings.push(result.value);
      }
    }

    return embeddings;
  } catch (error) {
    console.error('トピック埋め込み一括取得エラー:', error);
    return [];
  }
}

/**
 * トピック埋め込みを取得
 */
export async function getTopicEmbedding(
  topicId: string,
  meetingNoteId: string
): Promise<TopicEmbedding | null> {
  try {
    const embeddingId = `${meetingNoteId}-topic-${topicId}`;
    
    const result = await callTauriCommand('doc_get', {
      collectionName: 'topics',
      docId: embeddingId,
    });
    
    if (result && result.data) {
      return result.data as TopicEmbedding;
    }
    
    return null;
  } catch (error) {
    console.error('トピック埋め込みの取得エラー:', error);
    return null;
  }
}

/**
 * 類似トピックを検索
 */
export async function findSimilarTopics(
  queryText: string,
  limit: number = 5,
  meetingNoteId?: string,
  organizationId?: string
): Promise<Array<{ topicId: string; meetingNoteId: string; similarity: number; title?: string; contentSummary?: string }>> {
  if (shouldUseChroma()) {
    try {
      const { findSimilarTopicsChroma } = await import('./topicEmbeddingsChroma');
      const results = await findSimilarTopicsChroma(queryText, limit, organizationId);
      // meetingNoteIdでフィルタリング
      let filteredResults = results;
      if (meetingNoteId) {
        filteredResults = results.filter(r => r.meetingNoteId === meetingNoteId);
      }
      return filteredResults;
    } catch (chromaError: any) {
      console.error('ChromaDBでの検索に失敗しました:', chromaError?.message || chromaError);
      return [];
    }
  }
  
  return [];
}

/**
 * ハイブリッド検索: ベクトル検索 + メタデータフィルタリング・ブースト
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
export async function findSimilarTopicsHybrid(
  queryText: string,
  limit: number = 20,
  filters?: {
    meetingNoteId?: string;
    organizationId?: string;
    semanticCategory?: TopicSemanticCategory;
    keywords?: string[];
  }
): Promise<Array<{ topicId: string; meetingNoteId: string; similarity: number; score: number }>> {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[findSimilarTopicsHybrid] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return [];
}

/**
 * 特定のトピックに類似するトピックを検索
 */
export async function findSimilarTopicsByTopicId(
  topicId: string,
  meetingNoteId: string,
  limit: number = 5
): Promise<Array<{ topicId: string; meetingNoteId: string; similarity: number }>> {
  try {
    const topicEmbedding = await getTopicEmbedding(topicId, meetingNoteId);
    
    if (!topicEmbedding || !topicEmbedding.combinedEmbedding) {
      return [];
    }

    const embeddingsSnapshot = await getDocs(collection(null, 'topics'));

    const similarities: Array<{ topicId: string; meetingNoteId: string; similarity: number }> = [];
    
    for (const docSnap of embeddingsSnapshot.docs) {
      const embeddingData = docSnap.data() as TopicEmbedding;
      
      if (embeddingData.topicId === topicId && embeddingData.meetingNoteId === meetingNoteId) {
        continue;
      }

      if (!embeddingData.combinedEmbedding || embeddingData.combinedEmbedding.length === 0) {
        continue;
      }

      try {
        const similarity = cosineSimilarity(
          topicEmbedding.combinedEmbedding,
          embeddingData.combinedEmbedding
        );
        similarities.push({
          topicId: embeddingData.topicId,
          meetingNoteId: embeddingData.meetingNoteId,
          similarity,
        });
      } catch (error) {
        console.warn(`トピック ${embeddingData.topicId} の類似度計算でエラー:`, error);
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (error) {
    console.error('類似トピック検索エラー:', error);
    throw error;
  }
}

/**
 * 既存のトピック埋め込みを一括更新
 */
export async function batchUpdateTopicEmbeddings(
  topics: Array<{ id: string; title: string; content: string; metadata?: Partial<TopicMetadata> }>,
  meetingNoteId: string,
  organizationId: string,
  forceRegenerate: boolean = false,
  onProgress?: (current: number, total: number, topicId: string, status: 'processing' | 'skipped' | 'error' | 'success') => void,
  shouldCancel?: () => boolean
): Promise<{ success: number; skipped: number; errors: number }> {
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let processedCount = 0;

  const limit = pLimit(5);
  
  const promises = topics.map((topic) => 
    limit(async () => {
      if (shouldCancel && shouldCancel()) {
        return { status: 'cancelled' as const };
      }
      
      try {
        const topicEmbeddingId = `${meetingNoteId}-topic-${topic.id}`;
        
        if (!forceRegenerate) {
          try {
            const topicDoc = await callTauriCommand('doc_get', {
              collectionName: 'topics',
              docId: topicEmbeddingId,
            });
            
            if (topicDoc?.exists && topicDoc?.data) {
              const chromaSynced = topicDoc.data.chromaSynced;
              if (chromaSynced === 1 || chromaSynced === true || chromaSynced === '1') {
                try {
                  const { getTopicEmbeddingFromChroma } = await import('./topicEmbeddingsChroma');
                  const existing = await getTopicEmbeddingFromChroma(topic.id, organizationId);
                  if (existing && existing.combinedEmbedding && Array.isArray(existing.combinedEmbedding) && existing.combinedEmbedding.length > 0) {
                    const current = ++processedCount;
                    skippedCount++;
                    onProgress?.(current, topics.length, topic.id, 'skipped');
                    return { status: 'skipped' as const };
                  } else {
                    try {
                      await callTauriCommand('update_chroma_sync_status', {
                        entityType: 'topic',
                        entityId: topicEmbeddingId,
                        synced: false,
                        error: 'ChromaDBに存在しないため再生成',
                      });
                    } catch (resetError) {
                      console.warn(`chromaSyncedフラグのリセットエラー:`, resetError);
                    }
                  }
                } catch (chromaCheckError) {
                  console.warn(`ChromaDB確認エラー（続行）: ${topic.id}`, chromaCheckError);
                }
              }
            }
          } catch (sqliteError: any) {
            // SQLiteからの取得に失敗した場合は続行
          }
        }
        
        if (!forceRegenerate) {
          try {
            const { getTopicEmbeddingFromChroma } = await import('./topicEmbeddingsChroma');
            const existing = await getTopicEmbeddingFromChroma(topic.id, organizationId);
            if (existing && existing.combinedEmbedding && Array.isArray(existing.combinedEmbedding) && existing.combinedEmbedding.length > 0) {
              const current = ++processedCount;
              skippedCount++;
              onProgress?.(current, topics.length, topic.id, 'skipped');
              return { status: 'skipped' as const };
            }
          } catch (chromaCheckError) {
            // ChromaDB確認エラーは無視して続行
          }
        }

        await saveTopicEmbedding(
          topic.id,
          meetingNoteId,
          organizationId,
          topic.title,
          topic.content,
          topic.metadata
        );
        
        const current = ++processedCount;
        successCount++;
        onProgress?.(current, topics.length, topic.id, 'success');
        return { status: 'success' as const };
      } catch (error) {
        const current = ++processedCount;
        console.error(`トピック ${topic.id} の埋め込み生成エラー:`, error);
        errorCount++;
        onProgress?.(current, topics.length, topic.id, 'error');
        return { status: 'error' as const };
      }
    })
  );

  await Promise.allSettled(promises);

  return { success: successCount, skipped: skippedCount, errors: errorCount };
}
