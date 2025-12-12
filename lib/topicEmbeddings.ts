/**
 * トピック埋め込みの管理ユーティリティ
 * Firestoreへの保存・取得・検索機能を提供
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
} from './localFirebase';
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

/**
 * トピック埋め込みを保存
 * 
 * @param topicId トピックのユニークID
 * @param meetingNoteId 親議事録ID
 * @param organizationId 組織ID
 * @param title トピックタイトル
 * @param content トピックコンテンツ
 * @param metadata トピックメタデータ（オプション、精度向上のため推奨）
 */
export async function saveTopicEmbedding(
  topicId: string,
  meetingNoteId: string,
  organizationId: string,
  title: string,
  content: string,
  metadata?: Partial<Pick<TopicMetadata, 'keywords' | 'semanticCategory' | 'tags' | 'summary' | 'importance'>>
): Promise<void> {
  // クライアント側でのみ実行（サーバーサイドレンダリングを回避）
  if (typeof window === 'undefined') {
    throw new Error('トピック埋め込みの保存はクライアント側でのみ実行可能です');
  }
  
  try {
    const now = new Date().toISOString();
    const embeddingVersion = metadata ? '2.0' : '1.0'; // メタデータがある場合はバージョン2.0
    
    // 埋め込みを生成
    let combinedEmbedding: number[] | undefined;
    let titleEmbedding: number[] | undefined;
    let contentEmbedding: number[] | undefined;
    let metadataEmbedding: number[] | undefined;

    if (metadata && (metadata.keywords || metadata.semanticCategory || metadata.tags)) {
      // メタデータがある場合: 分離埋め込み + メタデータ埋め込みを生成
      try {
        const separated = await generateSeparatedEmbeddings(title, content);
        titleEmbedding = separated.titleEmbedding;
        contentEmbedding = separated.contentEmbedding;
        
        // メタデータの埋め込みを生成
        try {
          metadataEmbedding = await generateMetadataEmbedding({
            keywords: metadata.keywords,
            semanticCategory: metadata.semanticCategory,
            tags: metadata.tags,
            summary: metadata.summary,
          });
        } catch (error) {
          console.warn('メタデータ埋め込みの生成に失敗しました（続行します）:', error);
        }
        
        // 後方互換性のため、combinedEmbeddingも生成
        combinedEmbedding = await generateEnhancedEmbedding(
          title,
          content,
          {
            keywords: metadata.keywords,
            semanticCategory: metadata.semanticCategory,
            tags: metadata.tags,
            summary: metadata.summary,
          }
        );
      } catch (error) {
        console.warn('分離埋め込みの生成に失敗しました。従来の方法を使用します:', error);
        // フォールバック: 従来の方法
        combinedEmbedding = await generateCombinedEmbedding(title, content);
      }
    } else {
      // メタデータがない場合: 従来の方法
      combinedEmbedding = await generateCombinedEmbedding(title, content);
    }
    
    // 埋め込みID（meetingNoteId-topic-topicId形式）
    const embeddingId = `${meetingNoteId}-topic-${topicId}`;
    
    // topicsテーブルに保存するためのデータ（NOT NULL制約を満たすため、titleを含める）
    const topicData: any = {
      id: embeddingId,
      topicId,
      meetingNoteId,
      organizationId,
      title: title || '', // NOT NULL制約のため必須
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
    
    // Firestoreに保存（埋め込みデータ）
    const embeddingData: TopicEmbedding = {
      id: embeddingId,
      topicId,
      meetingNoteId,
      organizationId,
      combinedEmbedding,
      embeddingModel: 'text-embedding-3-small',
      embeddingVersion,
      createdAt: now,
      updatedAt: now,
    };

    // 分離埋め込みがあれば追加
    if (titleEmbedding) {
      embeddingData.titleEmbedding = titleEmbedding;
    }
    if (contentEmbedding) {
      embeddingData.contentEmbedding = contentEmbedding;
    }
    if (metadataEmbedding) {
      embeddingData.metadataEmbedding = metadataEmbedding;
    }
    
    // メタデータフィールドを保存（検索高速化のため）
    if (metadata?.semanticCategory) {
      embeddingData.semanticCategory = metadata.semanticCategory;
    }
    if (metadata?.keywords && metadata.keywords.length > 0) {
      embeddingData.keywords = metadata.keywords;
    }
    if (metadata?.tags && metadata.tags.length > 0) {
      embeddingData.tags = metadata.tags;
    }

    // ChromaDBを使用する場合（動的インポート）
    if (shouldUseChroma()) {
      try {
        console.log(`🔄 [saveTopicEmbedding] ChromaDBに保存を開始: ${embeddingId}`);
        const { saveTopicEmbeddingToChroma } = await import('./topicEmbeddingsChroma');
        await saveTopicEmbeddingToChroma(topicId, meetingNoteId, organizationId, title, content, metadata);
        console.log(`✅ ChromaDBにトピック埋め込みを保存しました: ${embeddingId} (version: ${embeddingVersion})`);
        
        // topicsテーブルにメタデータを保存（ChromaDBは埋め込みデータ用、topicsテーブルはメタデータ用）
        try {
          console.log(`🔄 [saveTopicEmbedding] topicsテーブルにメタデータを保存開始: ${embeddingId}`);
          await setDoc(doc(null, 'topics', embeddingId), topicData);
          console.log(`✅ topicsテーブルにメタデータを保存しました: ${embeddingId}`);
        } catch (topicSaveError: any) {
          console.warn(`⚠️ topicsテーブルへの保存に失敗しました（ChromaDBには保存済み）: ${embeddingId}`, topicSaveError?.message || topicSaveError);
        }
        
        // ChromaDB同期状態を更新（topicsテーブルのchromaSyncedカラムを1に設定）
        // topicIdをtopicsテーブルのIDとして使用（topicEmbeddingsから統合済み）
        try {
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'topic',
            entityId: topicId, // topicsテーブルのIDとして使用
            synced: true,
            error: null,
          });
          console.log(`✅ トピックのChromaDB同期状態を更新しました: ${topicId}`);
        } catch (syncStatusError: any) {
          console.warn(`⚠️ ChromaDB同期状態の更新に失敗しました（ChromaDBには保存済み）: ${topicId}`, syncStatusError?.message || syncStatusError);
          // エラーが発生しても続行（ChromaDBには保存されているため）
        }
      } catch (chromaError: any) {
        console.warn('ChromaDBへの保存に失敗しました。Firestoreにフォールバックします:', chromaError?.message || chromaError);
        
        // 同期状態を失敗として更新
        try {
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'topic',
            entityId: topicId,
            synced: false,
            error: chromaError?.message || String(chromaError),
          });
        } catch (syncStatusError: any) {
          console.warn(`⚠️ ChromaDB同期状態の更新に失敗しました: ${topicId}`, syncStatusError?.message || syncStatusError);
        }
        
        // フォールバック: SQLiteに保存（ChromaDBが無効な場合のみ）
        await setDoc(doc(null, 'topics', embeddingId), topicData);
      }
    } else {
      // SQLiteに保存（ChromaDBが無効な場合）
      console.log(`🔄 [saveTopicEmbedding] SQLiteに保存開始: ${embeddingId}`);
      await setDoc(doc(null, 'topics', embeddingId), topicData);
    }
    
    console.log(`✅ トピック埋め込みを保存しました: ${embeddingId} (version: ${embeddingVersion})`);
  } catch (error) {
    console.error('トピック埋め込みの保存エラー:', error);
    // エラーが発生しても処理を続行（埋め込みはオプショナル）
    throw error;
  }
}

/**
 * トピック埋め込みを非同期で生成・保存
 * エラーが発生しても処理を続行する（オプショナルな機能のため）
 * 
 * @param topicId トピックのユニークID
 * @param meetingNoteId 親議事録ID
 * @param organizationId 組織ID
 * @param title トピックタイトル
 * @param content トピックコンテンツ
 * @param metadata トピックメタデータ（オプション）
 */
export async function saveTopicEmbeddingAsync(
  topicId: string,
  meetingNoteId: string,
  organizationId: string,
  title: string,
  content: string,
  metadata?: Partial<Pick<TopicMetadata, 'keywords' | 'semanticCategory' | 'tags' | 'summary' | 'importance'>>
): Promise<void> {
  // クライアント側でのみ実行（サーバーサイドレンダリングを回避）
  if (typeof window === 'undefined') {
    console.warn('⚠️ トピック埋め込みの保存はクライアント側でのみ実行可能です');
    return;
  }
  
  try {
    console.log(`🔄 [トピック埋め込み生成] 開始: ${title} (${topicId})`);
    await saveTopicEmbedding(topicId, meetingNoteId, organizationId, title, content, metadata);
    console.log(`✅ [トピック埋め込み生成] 完了: ${title} (${topicId})`);
  } catch (error: any) {
    // 詳細なエラー情報を記録
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || '';
    console.error(`❌ [トピック埋め込み生成] エラー: ${topicId}`, {
      error: errorMessage,
      stack: errorStack,
      title,
      meetingNoteId,
      organizationId,
      timestamp: new Date().toISOString(),
    });
    // エラーが発生しても処理を続行（埋め込みはオプショナルな機能のため）
    // ただし、エラーログは詳細に記録する
  }
}

/**
 * トピック埋め込みを取得
 * 
 * @param topicId トピックのユニークID
 * @param meetingNoteId 親議事録ID
 * @returns トピック埋め込みデータ、またはnull
 */
export async function getTopicEmbedding(
  topicId: string,
  meetingNoteId: string
): Promise<TopicEmbedding | null> {
  // ChromaDBが有効な場合、SQLiteからメタデータを取得（ChromaDBから直接取得する機能は未実装のため）
  // ChromaDBが無効な場合もSQLiteから取得
  try {
    const embeddingId = `${meetingNoteId}-topic-${topicId}`;
    
    // SQLiteから取得
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
    // エラーが発生してもnullを返す（埋め込みが存在しない場合と同様に扱う）
    return null;
  }
}

/**
 * 類似トピックを検索
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 返す結果の最大数（デフォルト: 5）
 * @param meetingNoteId 議事録IDでフィルタ（オプション）
 * @param organizationId 組織IDでフィルタ（オプション）
 * @returns 類似トピックの配列（topicIdとsimilarityを含む）
 */
export async function findSimilarTopics(
  queryText: string,
  limit: number = 5,
  meetingNoteId?: string,
  organizationId?: string
): Promise<Array<{ topicId: string; meetingNoteId: string; similarity: number }>> {
  // ChromaDBを使用する場合（動的インポート）
  // organizationIdが未指定の場合は組織横断検索を実行（Rust側で対応済み）
  if (shouldUseChroma()) {
    try {
      const { findSimilarTopicsChroma } = await import('./topicEmbeddingsChroma');
      const results = await findSimilarTopicsChroma(queryText, limit, organizationId);
      // meetingNoteIdでフィルタリング（ChromaDBのwhere句では複雑な条件が難しいため）
      let filteredResults = results;
      if (meetingNoteId) {
        filteredResults = results.filter(r => r.meetingNoteId === meetingNoteId);
      }
      console.log(`[findSimilarTopics] ChromaDB検索完了: ${filteredResults.length}件の結果を取得`);
        return filteredResults;
    } catch (chromaError: any) {
      console.error(`[findSimilarTopics] ChromaDBでの検索に失敗しました:`, chromaError?.message || chromaError);
      // ChromaDB検索が失敗した場合は空の結果を返す（Firestoreフォールバックは削除）
      return [];
    }
      } else {
    // ChromaDBが無効な場合：埋め込みベクトルはChromaDBにのみ保存されるため、検索結果は空
    console.warn(`[findSimilarTopics] ⚠️ ChromaDBが無効です。`);
    console.warn(`[findSimilarTopics] 💡 埋め込みベクトルはChromaDBにのみ保存されます。ChromaDBを有効にするには、設定ページでChromaDBを有効化するか、コンソールで以下を実行: localStorage.setItem('useChromaDB', 'true')`);
    return [];
  }
}

/**
 * ハイブリッド検索: ベクトル検索 + メタデータフィルタリング・ブースト
 * 精度向上のため、メタデータを活用して検索結果を改善
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 返す結果の最大数（デフォルト: 20）
 * @param filters フィルタリング条件（オプション）
 * @returns 類似トピックの配列（topicId, similarity, scoreを含む）
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
  try {
    // 1. ベクトル検索で候補を取得（多めに取得）
    const vectorResults = await findSimilarTopics(
      queryText,
      limit * 2, // 多めに取得してからフィルタリング
      filters?.meetingNoteId,
      filters?.organizationId
    );

    if (vectorResults.length === 0) {
      return [];
    }

    // 2. クエリに基づいて重みを調整
    const weights = adjustWeightsForQuery(queryText);

    // 3. メタデータでフィルタリング・ブースト（新しいスコアリング関数を使用）
    const enhancedResults: Array<{ topicId: string; meetingNoteId: string; similarity: number; score: number }> = [];
    
    for (const result of vectorResults) {
      try {
        // トピック埋め込みデータを取得
        const embeddingData = await getTopicEmbedding(result.topicId, result.meetingNoteId);
        if (!embeddingData) {
          continue;
        }

        // 新しいスコアリング関数を使用
        let score = calculateTopicScore(
          result.similarity,
          {
            importance: (embeddingData as any).importance,
            updatedAt: embeddingData.updatedAt,
            keywords: embeddingData.keywords,
            semanticCategory: embeddingData.semanticCategory,
          },
          weights
        );

        // セマンティックカテゴリが一致する場合は追加ブースト
        if (filters?.semanticCategory && 
            embeddingData.semanticCategory === filters.semanticCategory) {
          score = Math.min(1.0, score + 0.08);
        }

        // キーワードが一致する場合は追加ブースト
        if (filters?.keywords && embeddingData.keywords && embeddingData.keywords.length > 0) {
          const queryKeywords = filters.keywords.map(k => k.toLowerCase());
          const matchingKeywords = embeddingData.keywords.filter(k => 
            queryKeywords.some(qk => k.toLowerCase().includes(qk) || qk.includes(k.toLowerCase()))
          );
          score = Math.min(1.0, score + matchingKeywords.length * 0.03);
        }

        // メタデータ埋め込みがある場合は追加の類似度計算
        if (embeddingData.metadataEmbedding && embeddingData.metadataEmbedding.length > 0) {
          try {
            const { generateEmbedding } = await import('./embeddings');
            const queryMetadataEmbedding = await generateEmbedding(queryText);
            const metadataSimilarity = cosineSimilarity(
              queryMetadataEmbedding,
              embeddingData.metadataEmbedding
            );
            // メタデータの類似度を10%の重みで追加
            score = score * 0.9 + metadataSimilarity * 0.1;
          } catch (error) {
            console.warn(`トピック ${result.topicId} のメタデータ類似度計算でエラー:`, error);
          }
        }

        enhancedResults.push({
          topicId: result.topicId,
          meetingNoteId: result.meetingNoteId,
          similarity: result.similarity,
          score,
        });
      } catch (error) {
        // トピック取得エラーは無視して続行
        console.warn(`トピック ${result.topicId} の取得エラー:`, error);
      }
    }

    // 4. スコアでソートして上位を返す
    return enhancedResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    const ragError = handleRAGSearchError(error, {
      queryText,
      limit,
      filters,
    });
    ragError.log();
    
    // エラーが発生した場合は従来の検索にフォールバック
    try {
      const fallbackResults = await findSimilarTopics(
        queryText,
        limit,
        filters?.meetingNoteId,
        filters?.organizationId
      );
      return fallbackResults.map(r => ({ ...r, score: r.similarity }));
    } catch (fallbackError) {
      // フォールバックも失敗した場合は空配列を返す
      return safeHandleRAGSearchError(fallbackError, [], {
        queryText,
        limit,
        filters,
      });
    }
  }
}

/**
 * 特定のトピックに類似するトピックを検索
 * 
 * @param topicId 基準となるトピックID
 * @param meetingNoteId 親議事録ID
 * @param limit 返す結果の最大数（デフォルト: 5）
 * @returns 類似トピックの配列
 */
export async function findSimilarTopicsByTopicId(
  topicId: string,
  meetingNoteId: string,
  limit: number = 5
): Promise<Array<{ topicId: string; meetingNoteId: string; similarity: number }>> {
  try {
    // 基準トピックの埋め込みを取得
    const topicEmbedding = await getTopicEmbedding(topicId, meetingNoteId);
    
    if (!topicEmbedding || !topicEmbedding.combinedEmbedding) {
      return [];
    }

    // すべての埋め込みを取得
    const embeddingsSnapshot = await getDocs(collection(null, 'topics'));

    // コサイン類似度を計算
    const similarities: Array<{ topicId: string; meetingNoteId: string; similarity: number }> = [];
    
    for (const docSnap of embeddingsSnapshot.docs) {
      const embeddingData = docSnap.data() as TopicEmbedding;
      
      // 自分自身は除外
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

    // 類似度でソートして上位を返す
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
 * メタデータがない既存トピックに埋め込みを生成する際に使用
 * 
 * @param topics トピックデータの配列
 * @param meetingNoteId 親議事録ID
 * @param organizationId 組織ID
 * @param forceRegenerate 既存の埋め込みを強制的に再生成するか（デフォルト: false）
 * @param onProgress 進捗コールバック（current, total, topicId, status）
 */
export async function batchUpdateTopicEmbeddings(
  topics: Array<{ id: string; title: string; content: string; metadata?: Partial<TopicMetadata> }>,
  meetingNoteId: string,
  organizationId: string,
  forceRegenerate: boolean = false,
  onProgress?: (current: number, total: number, topicId: string, status: 'processing' | 'skipped' | 'error' | 'success') => void
): Promise<{ success: number; skipped: number; errors: number }> {
  console.log(`📊 ${topics.length}件のトピック埋め込みを一括${forceRegenerate ? '再生成' : '生成'}します...`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    try {
      // 既に埋め込みが存在するかチェック
      const existing = await getTopicEmbedding(topic.id, meetingNoteId);
      if (existing && !forceRegenerate) {
        console.log(`⏭️  トピック ${topic.id} は既に埋め込みが存在するためスキップ`);
        skippedCount++;
        onProgress?.(i + 1, topics.length, topic.id, 'skipped');
        continue;
      }

      await saveTopicEmbedding(
        topic.id,
        meetingNoteId,
        organizationId,
        topic.title,
        topic.content,
        topic.metadata
      );
      
      successCount++;
      onProgress?.(i + 1, topics.length, topic.id, 'success');
      
      // APIレート制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`トピック ${topic.id} の埋め込み生成エラー:`, error);
      errorCount++;
      onProgress?.(i + 1, topics.length, topic.id, 'error');
      // エラーが発生しても続行
    }
  }

  console.log(`✅ トピック埋め込みの一括${forceRegenerate ? '再生成' : '生成'}が完了しました (成功: ${successCount}, スキップ: ${skippedCount}, エラー: ${errorCount})`);
  
  return { success: successCount, skipped: skippedCount, errors: errorCount };
}
