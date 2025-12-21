/**
 * ナレッジグラフ全体を検索
 * エンティティ、リレーション、トピックを統合して検索
 */

import type { KnowledgeGraphSearchResult, SearchFilters } from './types';
import { searchEntities } from './searchEntities';
import { searchRelations } from './searchRelations';
import { searchTopics } from './searchTopics';
import { adjustWeightsForQuery, DEFAULT_WEIGHTS } from '../ragSearchScoring';

/**
 * ナレッジグラフ全体を検索
 * エンティティ、リレーション、トピックを統合して検索
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 各タイプごとの最大結果数（デフォルト: 10）
 * @param filters フィルタリング条件（オプション）
 * @param useCache キャッシュを使用するか（デフォルト: true）
 * @param timeoutMs タイムアウト時間（ミリ秒、デフォルト: 10000）
 * @returns 統合検索結果の配列
 */
export async function searchKnowledgeGraph(
  queryText: string,
  limit: number = 10,
  filters?: SearchFilters,
  useCache: boolean = true,
  timeoutMs: number = 10000
): Promise<KnowledgeGraphSearchResult[]> {
  console.log('[searchKnowledgeGraph] 検索開始:', { queryText, limit, filters });
  
  if (!queryText || !queryText.trim()) {
    console.warn('[searchKnowledgeGraph] クエリテキストが空です');
    return [];
  }
  
  // クエリテキストを正規化（前後の空白を削除）
  const normalizedQuery = queryText.trim();

  try {
    // organizationIdが未指定の場合、Rust側で全組織横断検索が実行される
    // そのため、organizationIdが未指定でも検索を続行する

    // クエリに基づいて重みを調整
    const weights = adjustWeightsForQuery(normalizedQuery, DEFAULT_WEIGHTS);

    // 各タイプごとの検索数を計算（limitを3等分）
    const perTypeLimit = Math.max(1, Math.ceil(limit / 3));

    // 並列で各タイプを検索
    console.log('[searchKnowledgeGraph] 並列検索を開始:', { perTypeLimit, filters });
    
    const [entityResults, relationResults, topicResults] = await Promise.all([
      // エンティティ検索
      searchEntities(normalizedQuery, perTypeLimit, filters, weights).catch(error => {
        console.error('[searchKnowledgeGraph] エンティティ検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      }),
      
      // リレーション検索
      searchRelations(normalizedQuery, perTypeLimit, filters, weights).catch(error => {
        console.error('[searchKnowledgeGraph] リレーション検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      }),
      
      // トピック検索
      searchTopics(normalizedQuery, perTypeLimit, filters, weights).catch(error => {
        console.error('[searchKnowledgeGraph] トピック検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      })
    ]);
    
    console.log('[searchKnowledgeGraph] 並列検索完了:', {
      entityCount: entityResults.length,
      relationCount: relationResults.length,
      topicCount: topicResults.length,
    });

    // 結果を統合
    const allResults = [
      ...entityResults,
      ...relationResults,
      ...topicResults,
    ];

    console.log('[searchKnowledgeGraph] 検索結果:', {
      entityCount: entityResults.length,
      relationCount: relationResults.length,
      totalCount: allResults.length,
    });

    // スコアでソート
    allResults.sort((a, b) => b.score - a.score);

    // 上位N件を返す
    const finalResults = allResults.slice(0, limit);
    console.log('[searchKnowledgeGraph] 最終結果数:', finalResults.length);
    return finalResults;
  } catch (error) {
    console.error('[searchKnowledgeGraph] 検索エラー:', error);
    return [];
  }
}

