/**
 * エンティティ検索
 */

import type { Entity } from '@/types/entity';
import type { KnowledgeGraphSearchResult, SearchFilters } from './types';
import { findSimilarEntitiesChroma } from '../entityEmbeddingsChroma';
import { getEntitiesByIds } from '../entityApi';
import { normalizeSimilarity, calculateEntityScore, adjustWeightsForQuery, DEFAULT_WEIGHTS, type ScoringWeights } from '../ragSearchScoring';

/**
 * エンティティを検索
 */
export async function searchEntities(
  queryText: string,
  limit: number,
  filters?: SearchFilters,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): Promise<KnowledgeGraphSearchResult[]> {
  // organizationIdが未指定の場合、Rust側で全組織横断検索が実行される
  try {
    console.log('[searchEntities] 検索開始:', { queryText, limit, filters, weights });
    
    // ChromaDBで類似エンティティを検索
    const chromaResults = await findSimilarEntitiesChroma(
      queryText,
      limit * 2, // フィルタリングで減る可能性があるため多めに取得
      filters?.organizationId
    );

    console.log('[searchEntities] ChromaDB検索結果:', chromaResults.length, '件');

    if (chromaResults.length === 0) {
      console.log('[searchEntities] ChromaDB検索結果が空のため、空の配列を返します');
      return [];
    }

    // エンティティIDを抽出
    const entityIds = chromaResults.map(r => r.entityId);

    // バッチでエンティティを取得（N+1問題を回避）
    const entities = await getEntitiesByIds(entityIds);

    // エンティティIDでマップを作成
    const entityMap = new Map(entities.map(e => [e.id, e]));

    // 結果を構築
    const results: KnowledgeGraphSearchResult[] = [];

    for (const { entityId, similarity } of chromaResults) {
      const entity = entityMap.get(entityId);
      if (!entity) continue;

      // フィルタリング
      if (filters?.entityType && entity.type !== filters.entityType) {
        continue;
      }

      // 日付フィルタリング
      if (filters?.createdAfter && entity.createdAt && entity.createdAt < filters.createdAfter) {
        continue;
      }
      if (filters?.createdBefore && entity.createdAt && entity.createdAt > filters.createdBefore) {
        continue;
      }
      if (filters?.updatedAfter && entity.updatedAt && entity.updatedAt < filters.updatedAfter) {
        continue;
      }
      if (filters?.updatedBefore && entity.updatedAt && entity.updatedAt > filters.updatedBefore) {
        continue;
      }

      // 類似度を正規化
      const normalizedSimilarity = normalizeSimilarity(similarity);
      
      console.log('[searchEntities] 類似度処理:', {
        entityId,
        rawSimilarity: similarity,
        normalizedSimilarity,
        similarityType: typeof similarity,
      });

      // スコア計算
      const score = calculateEntityScore(
        normalizedSimilarity,
        entity,
        weights,
        filters,
        undefined, // searchCount（将来実装）
        queryText
      );

      console.log('[searchEntities] スコア計算結果:', {
        entityId,
        normalizedSimilarity,
        score,
        scoreType: typeof score,
        isNaN: isNaN(score),
        isFinite: isFinite(score),
      });

      results.push({
        type: 'entity',
        id: entityId,
        score: typeof score === 'number' && !isNaN(score) ? score : 0,
        similarity: normalizedSimilarity,
        entity,
      });
    }

    // スコアでソート
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  } catch (error) {
    console.error('[searchEntities] エンティティ検索エラー:', error);
    return [];
  }
}

