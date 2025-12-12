/**
 * ページ埋め込みの管理ユーティリティ
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
  serverTimestamp
} from './localFirebase';

// Timestamp型の代替
type Timestamp = {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
  toMillis: () => number;
};
import { 
  generateCombinedEmbedding, 
  generateSeparatedEmbeddings,
  generateEnhancedEmbedding,
  generateMetadataEmbedding,
  cosineSimilarity 
} from './embeddings';
import { PageEmbedding, PageMetadata } from '@/types/pageMetadata';

/**
 * ページ埋め込みを保存
 * 
 * @param pageId ページID
 * @param title ページタイトル
 * @param content ページコンテンツ
 * @param planId 事業計画ID（オプション）
 * @param conceptId 構想ID（オプション）
 * @param metadata ページメタデータ（オプション、精度向上のため推奨）
 */
export async function savePageEmbedding(
  pageId: string,
  title: string,
  content: string,
  planId?: string,
  conceptId?: string,
  metadata?: Partial<Pick<PageMetadata, 'keywords' | 'semanticCategory' | 'tags' | 'summary'>>
): Promise<void> {
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
    
    // Firestoreに保存
    const embeddingData: PageEmbedding = {
      pageId,
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

    // 追加情報があれば保存
    if (planId) {
      embeddingData.planId = planId;
    }
    if (conceptId) {
      embeddingData.conceptId = conceptId;
    }
    
    // メタデータフィールドを保存（検索高速化のため）
    if (metadata?.semanticCategory) {
      embeddingData.semanticCategory = metadata.semanticCategory;
    }
    if (metadata?.keywords && metadata.keywords.length > 0) {
      embeddingData.keywords = metadata.keywords;
    }

    await setDoc(doc(null, 'pageEmbeddings', pageId), embeddingData);
    
    console.log(`✅ ページ埋め込みを保存しました: ${pageId} (version: ${embeddingVersion})`);
  } catch (error) {
    console.error('ページ埋め込みの保存エラー:', error);
    // エラーが発生しても処理を続行（埋め込みはオプショナル）
    throw error;
  }
}

/**
 * ページ埋め込みを非同期で生成・保存
 * エラーが発生しても処理を続行する（オプショナルな機能のため）
 * 
 * @param pageId ページID
 * @param title ページタイトル
 * @param content ページコンテンツ
 * @param planId 事業計画ID（オプション）
 * @param conceptId 構想ID（オプション）
 * @param metadata ページメタデータ（オプション）
 */
export async function savePageEmbeddingAsync(
  pageId: string,
  title: string,
  content: string,
  planId?: string,
  conceptId?: string,
  metadata?: Partial<Pick<PageMetadata, 'keywords' | 'semanticCategory' | 'tags' | 'summary'>>
): Promise<void> {
  // 非同期で実行（エラーは無視）
  savePageEmbedding(pageId, title, content, planId, conceptId, metadata).catch((error) => {
    console.warn('ページ埋め込みの非同期保存でエラーが発生しました（無視されます）:', error);
  });
}

/**
 * ページ埋め込みを取得
 * 
 * @param pageId ページID
 * @returns ページ埋め込みデータ、またはnull
 */
export async function getPageEmbedding(pageId: string): Promise<PageEmbedding | null> {
  try {
    const docRef = doc(null, 'pageEmbeddings', pageId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as PageEmbedding;
    }
    
    return null;
  } catch (error) {
    console.error('ページ埋め込みの取得エラー:', error);
    throw error;
  }
}

/**
 * 類似ページを検索
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 返す結果の最大数（デフォルト: 5）
 * @param planId 事業計画IDでフィルタ（オプション）
 * @param conceptId 構想IDでフィルタ（オプション）
 * @returns 類似ページの配列（pageIdとsimilarityを含む）
 */
export async function findSimilarPages(
  queryText: string,
  limit: number = 5,
  planId?: string,
  conceptId?: string
): Promise<Array<{ pageId: string; similarity: number; title?: string }>> {
  try {
    // クエリの埋め込みを生成
    const { generateEmbedding } = await import('./embeddings');
    const queryEmbedding = await generateEmbedding(queryText);

    // 埋め込みコレクションから取得
    let q = query(collection(null, 'pageEmbeddings'));
    
    // フィルタを追加
    if (planId) {
      q = query(q, where('planId', '==', planId));
    }
    if (conceptId) {
      q = query(q, where('conceptId', '==', conceptId));
    }

    const embeddingsSnapshot = await getDocs(q);

    // コサイン類似度を計算
    const similarities: Array<{ pageId: string; similarity: number; title?: string }> = [];
    
    for (const docSnap of embeddingsSnapshot.docs) {
      const embeddingData = docSnap.data() as PageEmbedding;
      
      if (!embeddingData.combinedEmbedding || embeddingData.combinedEmbedding.length === 0) {
        continue;
      }

      try {
        const similarity = cosineSimilarity(queryEmbedding, embeddingData.combinedEmbedding);
        similarities.push({
          pageId: embeddingData.pageId,
          similarity,
        });
      } catch (error) {
        console.warn(`ページ ${embeddingData.pageId} の類似度計算でエラー:`, error);
      }
    }

    // 類似度でソートして上位を返す
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (error) {
    console.error('類似ページ検索エラー:', error);
    throw error;
  }
}

/**
 * ハイブリッド検索: ベクトル検索 + メタデータフィルタリング・ブースト
 * 精度向上のため、メタデータを活用して検索結果を改善
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 返す結果の最大数（デフォルト: 20）
 * @param filters フィルタリング条件（オプション）
 * @returns 類似ページの配列（pageId, similarity, scoreを含む）
 */
export async function findSimilarPagesHybrid(
  queryText: string,
  limit: number = 20,
  filters?: {
    planId?: string;
    conceptId?: string;
    semanticCategory?: string;
    keywords?: string[];
  }
): Promise<Array<{ pageId: string; similarity: number; score: number; title?: string }>> {
  try {
    // 1. ベクトル検索で候補を取得（多めに取得）
    const vectorResults = await findSimilarPages(
      queryText,
      limit * 2, // 多めに取得してからフィルタリング
      filters?.planId,
      filters?.conceptId
    );

    if (vectorResults.length === 0) {
      return [];
    }

    // 2. メタデータでフィルタリング・ブースト
    const enhancedResults: Array<{ pageId: string; similarity: number; score: number; title?: string }> = [];
    
    for (const result of vectorResults) {
      // ページ埋め込みデータを取得
      const embeddingData = await getPageEmbedding(result.pageId);
      if (!embeddingData) {
        continue;
      }

      let score = result.similarity;

      // セマンティックカテゴリが一致する場合はブースト
      if (filters?.semanticCategory && 
          embeddingData.semanticCategory === filters.semanticCategory) {
        score += 0.1;
      }

      // キーワードが一致する場合はブースト
      if (filters?.keywords && embeddingData.keywords && embeddingData.keywords.length > 0) {
        const queryKeywords = filters.keywords.map(k => k.toLowerCase());
        const matchingKeywords = embeddingData.keywords.filter(k => 
          queryKeywords.some(qk => k.toLowerCase().includes(qk) || qk.includes(k.toLowerCase()))
        );
        score += matchingKeywords.length * 0.05;
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
          console.warn(`ページ ${result.pageId} のメタデータ類似度計算でエラー:`, error);
        }
      }

      // スコアは1.0を超えないように
      score = Math.min(score, 1.0);

      enhancedResults.push({
        pageId: result.pageId,
        similarity: result.similarity,
        score,
        title: result.title,
      });
    }

    // 3. スコアでソートして上位を返す
    return enhancedResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    console.error('ハイブリッド検索エラー:', error);
    // エラーが発生した場合は従来の検索にフォールバック
    const fallbackResults = await findSimilarPages(
      queryText,
      limit,
      filters?.planId,
      filters?.conceptId
    );
    return fallbackResults.map(r => ({ ...r, score: r.similarity }));
  }
}

/**
 * 特定のページに類似するページを検索
 * 
 * @param pageId 基準となるページID
 * @param limit 返す結果の最大数（デフォルト: 5）
 * @returns 類似ページの配列
 */
export async function findSimilarPagesByPageId(
  pageId: string,
  limit: number = 5
): Promise<Array<{ pageId: string; similarity: number }>> {
  try {
    // 基準ページの埋め込みを取得
    const pageEmbedding = await getPageEmbedding(pageId);
    
    if (!pageEmbedding || !pageEmbedding.combinedEmbedding) {
      return [];
    }

    // すべての埋め込みを取得
    const embeddingsSnapshot = await getDocs(collection(null, 'pageEmbeddings'));

    // コサイン類似度を計算
    const similarities: Array<{ pageId: string; similarity: number }> = [];
    
    for (const docSnap of embeddingsSnapshot.docs) {
      const embeddingData = docSnap.data() as PageEmbedding;
      
      // 自分自身は除外
      if (embeddingData.pageId === pageId) {
        continue;
      }

      if (!embeddingData.combinedEmbedding || embeddingData.combinedEmbedding.length === 0) {
        continue;
      }

      try {
        const similarity = cosineSimilarity(
          pageEmbedding.combinedEmbedding,
          embeddingData.combinedEmbedding
        );
        similarities.push({
          pageId: embeddingData.pageId,
          similarity,
        });
      } catch (error) {
        console.warn(`ページ ${embeddingData.pageId} の類似度計算でエラー:`, error);
      }
    }

    // 類似度でソートして上位を返す
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (error) {
    console.error('類似ページ検索エラー:', error);
    throw error;
  }
}

/**
 * 既存のページ埋め込みを一括更新
 * メタデータがない既存ページに埋め込みを生成する際に使用
 * 
 * @param pages ページデータの配列
 * @param planId 事業計画ID（オプション）
 * @param conceptId 構想ID（オプション）
 */
export async function batchUpdatePageEmbeddings(
  pages: Array<{ id: string; title: string; content: string }>,
  planId?: string,
  conceptId?: string
): Promise<void> {
  console.log(`📊 ${pages.length}件のページ埋め込みを一括生成します...`);

  for (const page of pages) {
    try {
      // 既に埋め込みが存在するかチェック
      const existing = await getPageEmbedding(page.id);
      if (existing) {
        console.log(`⏭️  ページ ${page.id} は既に埋め込みが存在するためスキップ`);
        continue;
      }

      await savePageEmbedding(page.id, page.title, page.content, planId, conceptId);
      
      // APIレート制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`ページ ${page.id} の埋め込み生成エラー:`, error);
      // エラーが発生しても続行
    }
  }

  console.log('✅ ページ埋め込みの一括生成が完了しました');
}

