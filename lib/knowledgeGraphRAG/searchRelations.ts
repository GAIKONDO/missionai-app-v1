/**
 * リレーション検索
 */

import type { Relation } from '@/types/relation';
import type { KnowledgeGraphSearchResult, SearchFilters } from './types';
import { findSimilarRelationsChroma } from '../relationEmbeddingsChroma';
import { getRelationsByIds } from '../relationApi';
import { normalizeSimilarity, calculateRelationScore, adjustWeightsForQuery, DEFAULT_WEIGHTS, type ScoringWeights } from '../ragSearchScoring';

/**
 * リレーションを検索
 */
export async function searchRelations(
  queryText: string,
  limit: number,
  filters?: SearchFilters,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): Promise<KnowledgeGraphSearchResult[]> {
  // organizationIdが未指定の場合、Rust側で全組織横断検索が実行される
  try {
    console.log('[searchRelations] 検索開始:', { queryText, limit, filters, weights });
    
    // ChromaDBで類似リレーションを検索
    const chromaResults = await findSimilarRelationsChroma(
      queryText,
      limit * 2, // フィルタリングで減る可能性があるため多めに取得
      filters?.organizationId,
      filters?.relationType
    );

    console.log('[searchRelations] ChromaDB検索結果:', chromaResults.length, '件');

    if (chromaResults.length === 0) {
      console.log('[searchRelations] ChromaDB検索結果が空のため、空の配列を返します');
      return [];
    }

    // リレーションIDを抽出
    const relationIds = chromaResults.map(r => r.relationId);

    // バッチでリレーションを取得（N+1問題を回避）
    const relations = await getRelationsByIds(relationIds);

    // リレーションIDでマップを作成
    const relationMap = new Map(relations.map(r => [r.id, r]));

    // 結果を構築
    const results: KnowledgeGraphSearchResult[] = [];

    for (const { relationId, similarity } of chromaResults) {
      const relation = relationMap.get(relationId);
      if (!relation) continue;

      // フィルタリング
      if (filters?.relationType && relation.relationType !== filters.relationType) {
        continue;
      }

      // 日付フィルタリング
      if (filters?.createdAfter && relation.createdAt && relation.createdAt < filters.createdAfter) {
        continue;
      }
      if (filters?.createdBefore && relation.createdAt && relation.createdAt > filters.createdBefore) {
        continue;
      }
      if (filters?.updatedAfter && relation.updatedAt && relation.updatedAt < filters.updatedAfter) {
        continue;
      }
      if (filters?.updatedBefore && relation.updatedAt && relation.updatedAt > filters.updatedBefore) {
        continue;
      }

      // 類似度を正規化
      const normalizedSimilarity = normalizeSimilarity(similarity);
      
      console.log('[searchRelations] 類似度処理:', {
        relationId,
        rawSimilarity: similarity,
        normalizedSimilarity,
        similarityType: typeof similarity,
      });

      // スコア計算
      const score = calculateRelationScore(
        normalizedSimilarity,
        relation,
        weights,
        filters,
        undefined, // searchCount（将来実装）
        queryText
      );

      console.log('[searchRelations] スコア計算結果:', {
        relationId,
        normalizedSimilarity,
        score,
        scoreType: typeof score,
        isNaN: isNaN(score),
        isFinite: isFinite(score),
      });

      results.push({
        type: 'relation',
        id: relationId,
        score: typeof score === 'number' && !isNaN(score) ? score : 0,
        similarity: normalizedSimilarity,
        relation,
      });
    }

    // スコアでソート
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  } catch (error) {
    console.error('[searchRelations] リレーション検索エラー:', error);
    return [];
  }
}

