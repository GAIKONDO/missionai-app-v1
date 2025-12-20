/**
 * RAG検索結果のスコアリング改善
 * ベクトル類似度に加えて、メタデータ、新しさ、重要度などを考慮
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */

import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { TopicMetadata } from '@/types/topicMetadata';

export interface ScoringWeights {
  similarity: number;      // ベクトル類似度の重み（デフォルト: 0.7）
  recency: number;         // 新しさの重み（デフォルト: 0.1）
  importance: number;     // 重要度の重み（デフォルト: 0.1）
  metadata: number;        // メタデータマッチの重み（デフォルト: 0.1）
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  similarity: 0.6,
  recency: 0.1,
  importance: 0.1,
  metadata: 0.2,
};

/**
 * エンティティのスコアを計算
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
export function calculateEntityScore(
  similarity: number,
  entity: Entity,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[calculateEntityScore] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return similarity || 0;
}

/**
 * リレーションのスコアを計算
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
export function calculateRelationScore(
  similarity: number,
  relation: Relation,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[calculateRelationScore] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return similarity || 0;
}

/**
 * トピックのスコアを計算
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
export function calculateTopicScore(
  similarity: number,
  topicMetadata?: {
    importance?: string;
    updatedAt?: string;
    keywords?: string[];
    semanticCategory?: string;
  },
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[calculateTopicScore] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return similarity || 0;
}

/**
 * カスタム重みでスコアを計算
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
export function calculateScoreWithCustomWeights(
  similarity: number,
  metadata: {
    recency?: number;
    importance?: number;
    metadataRichness?: number;
  },
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[calculateScoreWithCustomWeights] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return similarity || 0;
}

/**
 * クエリに基づいて重みを動的に調整
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
export function adjustWeightsForQuery(
  queryText: string,
  baseWeights: ScoringWeights = DEFAULT_WEIGHTS
): ScoringWeights {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[adjustWeightsForQuery] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return baseWeights;
}
