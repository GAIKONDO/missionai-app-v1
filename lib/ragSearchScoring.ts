/**
 * RAG検索結果のスコアリング改善
 * ベクトル類似度に加えて、メタデータ、新しさ、重要度などを考慮
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
  similarity: 0.7,
  recency: 0.1,
  importance: 0.1,
  metadata: 0.1,
};

/**
 * エンティティのスコアを計算
 */
export function calculateEntityScore(
  similarity: number,
  entity: Entity,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  let score = similarity * weights.similarity;
  
  // 新しさスコア（更新日時が新しいほど高い）
  if (entity.updatedAt) {
    const daysSinceUpdate = (Date.now() - new Date(entity.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceUpdate / 365); // 1年で0に
    score += recencyScore * weights.recency;
  }
  
  // メタデータスコア（メタデータが豊富なほど高い）
  if (entity.metadata && Object.keys(entity.metadata).length > 0) {
    const metadataScore = Math.min(1, Object.keys(entity.metadata).length / 10);
    score += metadataScore * weights.metadata;
  }
  
  // エイリアススコア（エイリアスが多いほど高い）
  if (entity.aliases && entity.aliases.length > 0) {
    const aliasesScore = Math.min(1, entity.aliases.length / 5);
    score += aliasesScore * weights.metadata * 0.5; // メタデータスコアの半分
  }
  
  return Math.min(1, score); // 最大1.0に制限
}

/**
 * リレーションのスコアを計算
 */
export function calculateRelationScore(
  similarity: number,
  relation: Relation,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  let score = similarity * weights.similarity;
  
  // 信頼度スコア
  if (relation.confidence !== undefined) {
    score += relation.confidence * weights.importance;
  }
  
  // 新しさスコア
  if (relation.updatedAt) {
    const daysSinceUpdate = (Date.now() - new Date(relation.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceUpdate / 365);
    score += recencyScore * weights.recency;
  }
  
  // 説明の長さスコア（説明が長いほど詳細な情報がある）
  if (relation.description && relation.description.length > 0) {
    const descriptionScore = Math.min(1, relation.description.length / 200);
    score += descriptionScore * weights.metadata * 0.5;
  }
  
  return Math.min(1, score);
}

/**
 * トピックのスコアを計算
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
  let score = similarity * weights.similarity;
  
  // 重要度スコア
  if (topicMetadata?.importance) {
    const importanceMap: Record<string, number> = {
      high: 1.0,
      medium: 0.5,
      low: 0.2,
    };
    const importanceScore = importanceMap[topicMetadata.importance] || 0.5;
    score += importanceScore * weights.importance;
  }
  
  // 新しさスコア
  if (topicMetadata?.updatedAt) {
    const daysSinceUpdate = (Date.now() - new Date(topicMetadata.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceUpdate / 365);
    score += recencyScore * weights.recency;
  }
  
  // キーワードスコア（キーワードが多いほど高い）
  if (topicMetadata?.keywords && topicMetadata.keywords.length > 0) {
    const keywordsScore = Math.min(1, topicMetadata.keywords.length / 10);
    score += keywordsScore * weights.metadata * 0.5;
  }
  
  // セマンティックカテゴリスコア（カテゴリがある場合は軽くブースト）
  if (topicMetadata?.semanticCategory) {
    score += 0.05 * weights.metadata;
  }
  
  return Math.min(1, score);
}

/**
 * カスタム重みでスコアを計算
 */
export function calculateScoreWithCustomWeights(
  similarity: number,
  metadata: {
    recency?: number;      // 0-1の値（1が最新）
    importance?: number;   // 0-1の値（1が最重要）
    metadataRichness?: number; // 0-1の値（1が最も豊富）
  },
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  let score = similarity * weights.similarity;
  
  if (metadata.recency !== undefined) {
    score += metadata.recency * weights.recency;
  }
  
  if (metadata.importance !== undefined) {
    score += metadata.importance * weights.importance;
  }
  
  if (metadata.metadataRichness !== undefined) {
    score += metadata.metadataRichness * weights.metadata;
  }
  
  return Math.min(1, score);
}

/**
 * クエリに基づいて重みを動的に調整
 * 例: 「最新の」というキーワードがある場合は新しさの重みを上げる
 */
export function adjustWeightsForQuery(
  queryText: string,
  baseWeights: ScoringWeights = DEFAULT_WEIGHTS
): ScoringWeights {
  const queryLower = queryText.toLowerCase();
  const weights = { ...baseWeights };
  
  // 「最新」「最近」「新しく」などのキーワードがある場合
  if (queryLower.includes('最新') || 
      queryLower.includes('最近') || 
      queryLower.includes('新しく') ||
      queryLower.includes('recent') ||
      queryLower.includes('latest')) {
    weights.recency = Math.min(0.3, weights.recency * 2);
    weights.similarity = Math.max(0.5, weights.similarity * 0.9);
  }
  
  // 「重要」「優先」などのキーワードがある場合
  if (queryLower.includes('重要') || 
      queryLower.includes('優先') ||
      queryLower.includes('important') ||
      queryLower.includes('priority')) {
    weights.importance = Math.min(0.3, weights.importance * 2);
    weights.similarity = Math.max(0.5, weights.similarity * 0.9);
  }
  
  // 重みの合計が1になるように正規化
  const total = weights.similarity + weights.recency + weights.importance + weights.metadata;
  if (total > 1) {
    const factor = 1 / total;
    weights.similarity *= factor;
    weights.recency *= factor;
    weights.importance *= factor;
    weights.metadata *= factor;
  }
  
  return weights;
}
