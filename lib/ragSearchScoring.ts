/**
 * RAG検索結果のスコアリング改善
 * ベクトル類似度に加えて、メタデータ、新しさ、重要度などを考慮
 */

import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { TopicMetadata } from '@/types/topicMetadata';

export interface ScoringWeights {
  similarity: number;      // ベクトル類似度の重み（デフォルト: 0.6）
  recency: number;         // 新しさの重み（デフォルト: 0.1）
  importance: number;     // 重要度の重み（デフォルト: 0.1）
  metadata: number;        // メタデータマッチの重み（デフォルト: 0.2）
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  similarity: 0.6,
  recency: 0.1,
  importance: 0.1,
  metadata: 0.2,
};

/**
 * ChromaDBの距離または類似度を正規化
 * @param value ChromaDBから取得した距離（0.0-2.0）または類似度（0.0-1.0）
 * @returns 類似度（0.0-1.0）
 */
export function normalizeSimilarity(value: number): number {
  // 値が無効な場合の処理
  if (value === undefined || value === null || isNaN(value)) {
    console.warn('[normalizeSimilarity] 無効な値:', value);
    return 0;
  }
  
  // Rust側は既に類似度（0.0-1.0）を返している
  // similarity = (1.0 - distance).max(0.0) の形式
  // そのため、そのまま使用する（0.0-1.0の範囲に制限）
  return Math.max(0, Math.min(1, value));
}

/**
 * メタデータマッチングスコアを計算
 */
export function calculateMetadataScore(
  queryText: string,
  entity: Entity,
  filters?: {
    organizationId?: string;
    entityType?: string;
  }
): number {
  let score = 0;
  
  // エンティティタイプの一致
  if (filters?.entityType && entity.type === filters.entityType) {
    score += 0.3;
  }
  
  // 組織IDの一致
  if (filters?.organizationId && entity.organizationId === filters.organizationId) {
    score += 0.2;
  }
  
  // キーワードの一致（エンティティ名、エイリアス）
  const queryLower = queryText.toLowerCase();
  if (entity.name.toLowerCase().includes(queryLower)) {
    score += 0.3;
  }
  if (entity.aliases && entity.aliases.length > 0) {
    const matchingAliases = entity.aliases.filter(alias => 
      alias.toLowerCase().includes(queryLower)
    );
    if (matchingAliases.length > 0) {
      score += 0.2;
    }
  }
  
  return Math.min(1.0, score);
}

/**
 * 新しさスコアを計算（指数関数的減衰）
 * @param updatedAt 更新日時（ISO文字列）
 * @param decayFactor 減衰係数（デフォルト: 30日で半減）
 * @returns 新しさスコア（0.0-1.0）
 */
export function calculateRecencyScore(
  updatedAt: string | undefined | any,
  decayFactor: number = 30 // 30日で半減
): number {
  try {
    // updatedAtが無効な場合はデフォルト値を返す
    if (!updatedAt || updatedAt === 'undefined' || updatedAt === 'null') {
      return 0.5; // デフォルト値
    }
    
    let dateString: string | undefined;
    
    // Firestoreタイムスタンプ形式の処理 {nanoseconds: number, seconds: number}
    if (typeof updatedAt === 'object' && updatedAt !== null) {
      if ('seconds' in updatedAt && typeof updatedAt.seconds === 'number') {
        // Firestoreタイムスタンプをミリ秒に変換
        const milliseconds = updatedAt.seconds * 1000;
        if (updatedAt.nanoseconds && typeof updatedAt.nanoseconds === 'number') {
          dateString = new Date(milliseconds + updatedAt.nanoseconds / 1000000).toISOString();
        } else {
          dateString = new Date(milliseconds).toISOString();
        }
      } else if ('toDate' in updatedAt && typeof updatedAt.toDate === 'function') {
        // Firestore Timestampオブジェクトの場合
        dateString = updatedAt.toDate().toISOString();
      } else {
        // その他のオブジェクト形式の場合は文字列に変換を試みる
        dateString = String(updatedAt);
      }
    } else if (typeof updatedAt === 'string') {
      dateString = updatedAt;
    } else {
      console.warn('[calculateRecencyScore] updatedAtの形式が不明です:', updatedAt);
      return 0.5; // デフォルト値
    }
    
    const now = new Date();
    const updated = new Date(dateString);
    
    // 日付が無効な場合
    if (isNaN(updated.getTime())) {
      console.warn('[calculateRecencyScore] 日付の解析に失敗しました:', { updatedAt, dateString });
      return 0.5; // デフォルト値
    }
    
    const daysSinceUpdate = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
    
    // 負の値（未来の日付）の場合は1.0を返す
    if (daysSinceUpdate < 0) {
      return 1.0;
    }
    
    // 指数関数的減衰: e^(-daysSinceUpdate / decayFactor)
    // 0日: 1.0, 30日: 0.368, 60日: 0.135, 90日: 0.05
    const score = Math.exp(-daysSinceUpdate / decayFactor);
    
    // NaNチェック
    if (isNaN(score)) {
      console.warn('[calculateRecencyScore] スコアがNaNになりました:', { updatedAt, daysSinceUpdate, decayFactor });
      return 0.5; // デフォルト値
    }
    
    return score;
  } catch (error) {
    console.warn('[calculateRecencyScore] 日付の解析エラー:', error, { updatedAt });
    return 0.5; // デフォルト値
  }
}

/**
 * 重要度スコアを計算
 */
export function calculateImportanceScore(
  entity: Entity,
  searchCount?: number
): number {
  let score = 0.5; // ベーススコア
  
  // 検索頻度によるブースト
  if (searchCount !== undefined && searchCount > 0) {
    // 対数スケールで正規化（0-1）
    // log10(1) = 0, log10(10) = 1, log10(100) = 2
    score += Math.min(0.3, Math.log10(searchCount + 1) / 10);
  }
  
  // メタデータの重要度フラグ
  if (entity.metadata && typeof entity.metadata === 'object') {
    const metadata = entity.metadata as any;
    if (metadata.importance === 'high' || metadata.importance === '重要') {
      score += 0.2;
    }
  }
  
  return Math.min(1.0, score);
}

/**
 * エンティティの統合スコアを計算
 */
export function calculateEntityScore(
  similarity: number,
  entity: Entity,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  filters?: {
    organizationId?: string;
    entityType?: string;
  },
  searchCount?: number,
  queryText?: string
): number {
  // 各スコアを計算
  const metadataScore = queryText 
    ? calculateMetadataScore(queryText, entity, filters)
    : (filters?.entityType && entity.type === filters.entityType ? 0.3 : 0) +
      (filters?.organizationId && entity.organizationId === filters.organizationId ? 0.2 : 0);
  
  // updatedAtまたはcreatedAtを取得（無効な場合は現在時刻を使用）
  const dateForRecency = entity.updatedAt || entity.createdAt;
  const recencyScore = calculateRecencyScore(
    dateForRecency || new Date().toISOString()
  );
  
  const importanceScore = calculateImportanceScore(entity, searchCount);
  
  // デバッグログ
  console.log('[calculateEntityScore] スコア計算:', {
    entityId: entity.id,
    similarity,
    metadataScore,
    recencyScore,
    importanceScore,
    weights,
    similarityType: typeof similarity,
    metadataScoreType: typeof metadataScore,
    recencyScoreType: typeof recencyScore,
    importanceScoreType: typeof importanceScore,
  });
  
  // 重み付けして統合
  const finalScore = (
    similarity * weights.similarity +
    metadataScore * weights.metadata +
    recencyScore * weights.recency +
    importanceScore * weights.importance
  );
  
  console.log('[calculateEntityScore] 最終スコア:', {
    entityId: entity.id,
    finalScore,
    finalScoreType: typeof finalScore,
    isNaN: isNaN(finalScore),
  });
  
  return Math.min(1.0, Math.max(0.0, finalScore));
}

/**
 * リレーションの統合スコアを計算
 */
export function calculateRelationScore(
  similarity: number,
  relation: Relation,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  filters?: {
    organizationId?: string;
    relationType?: string;
  },
  searchCount?: number,
  queryText?: string
): number {
  let metadataScore = 0;
  
  // リレーションタイプの一致
  if (filters?.relationType && relation.type === filters.relationType) {
    metadataScore += 0.3;
  }
  
  // 組織IDの一致
  if (filters?.organizationId && relation.organizationId === filters.organizationId) {
    metadataScore += 0.2;
  }
  
  // キーワードの一致（リレーションタイプ、説明など）
  if (queryText) {
    const queryLower = queryText.toLowerCase();
    if (relation.type?.toLowerCase().includes(queryLower)) {
      metadataScore += 0.3;
    }
    if (relation.description && relation.description.toLowerCase().includes(queryLower)) {
      metadataScore += 0.2;
    }
  }
  
  metadataScore = Math.min(1.0, metadataScore);
  
  // 新しさスコア
  // updatedAtまたはcreatedAtを取得（無効な場合は現在時刻を使用）
  const dateForRecency = relation.updatedAt || relation.createdAt;
  const recencyScore = calculateRecencyScore(
    dateForRecency || new Date().toISOString()
  );
  
  // 重要度スコア（リレーションの場合は検索頻度のみ）
  let importanceScore = 0.5;
  if (searchCount !== undefined && searchCount > 0) {
    importanceScore += Math.min(0.3, Math.log10(searchCount + 1) / 10);
  }
  importanceScore = Math.min(1.0, importanceScore);
  
  // デバッグログ
  console.log('[calculateRelationScore] スコア計算:', {
    relationId: relation.id,
    similarity,
    metadataScore,
    recencyScore,
    importanceScore,
    weights,
    similarityType: typeof similarity,
    metadataScoreType: typeof metadataScore,
    recencyScoreType: typeof recencyScore,
    importanceScoreType: typeof importanceScore,
  });
  
  // 重み付けして統合
  const finalScore = (
    similarity * weights.similarity +
    metadataScore * weights.metadata +
    recencyScore * weights.recency +
    importanceScore * weights.importance
  );
  
  console.log('[calculateRelationScore] 最終スコア:', {
    relationId: relation.id,
    finalScore,
    finalScoreType: typeof finalScore,
    isNaN: isNaN(finalScore),
  });
  
  return Math.min(1.0, Math.max(0.0, finalScore));
}

/**
 * トピックの統合スコアを計算
 */
export function calculateTopicScore(
  similarity: number,
  topicMetadata?: {
    importance?: string;
    updatedAt?: string;
    keywords?: string[];
    semanticCategory?: string;
    title?: string;
  },
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  filters?: {
    organizationId?: string;
    topicSemanticCategory?: string;
  },
  searchCount?: number,
  queryText?: string
): number {
  let metadataScore = 0;
  
  // セマンティックカテゴリの一致
  if (filters?.topicSemanticCategory && topicMetadata?.semanticCategory === filters.topicSemanticCategory) {
    metadataScore += 0.3;
  }
  
  // キーワードの一致
  if (queryText && topicMetadata) {
    const queryLower = queryText.toLowerCase();
    if (topicMetadata.title && topicMetadata.title.toLowerCase().includes(queryLower)) {
      metadataScore += 0.4;
    }
    if (topicMetadata.keywords && topicMetadata.keywords.length > 0) {
      const matchingKeywords = topicMetadata.keywords.filter(kw => 
        kw.toLowerCase().includes(queryLower)
      );
      if (matchingKeywords.length > 0) {
        metadataScore += 0.3 * (matchingKeywords.length / topicMetadata.keywords.length);
      }
    }
  }
  
  metadataScore = Math.min(1.0, metadataScore);
  
  // 新しさスコア
  const recencyScore = topicMetadata?.updatedAt
    ? calculateRecencyScore(topicMetadata.updatedAt)
    : 0.5; // デフォルト値
  
  // 重要度スコア
  let importanceScore = 0.5;
  if (topicMetadata?.importance === 'high' || topicMetadata?.importance === '重要') {
    importanceScore += 0.3;
  }
  if (searchCount !== undefined && searchCount > 0) {
    importanceScore += Math.min(0.2, Math.log10(searchCount + 1) / 10);
  }
  importanceScore = Math.min(1.0, importanceScore);
  
  // 重み付けして統合
  const finalScore = (
    similarity * weights.similarity +
    metadataScore * weights.metadata +
    recencyScore * weights.recency +
    importanceScore * weights.importance
  );
  
  return Math.min(1.0, Math.max(0.0, finalScore));
}

/**
 * カスタム重みでスコアを計算
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
  const recencyScore = metadata.recency !== undefined ? metadata.recency : 0.5;
  const importanceScore = metadata.importance !== undefined ? metadata.importance : 0.5;
  const metadataScore = metadata.metadataRichness !== undefined ? metadata.metadataRichness : 0.5;
  
  // 重み付けして統合
  const finalScore = (
    similarity * weights.similarity +
    metadataScore * weights.metadata +
    recencyScore * weights.recency +
    importanceScore * weights.importance
  );
  
  return Math.min(1.0, Math.max(0.0, finalScore));
}

/**
 * クエリに基づいて重みを動的に調整
 */
export function adjustWeightsForQuery(
  queryText: string,
  baseWeights: ScoringWeights = DEFAULT_WEIGHTS
): ScoringWeights {
  const queryLower = queryText.toLowerCase();
  const adjustedWeights = { ...baseWeights };
  
  // 「最新」や「最近」などのキーワードが含まれる場合、新しさの重みを増やす
  if (queryLower.includes('最新') || queryLower.includes('最近') || 
      queryLower.includes('new') || queryLower.includes('recent')) {
    adjustedWeights.recency = Math.min(0.3, baseWeights.recency * 2);
    adjustedWeights.similarity = baseWeights.similarity * 0.9;
  }
  
  // 「重要」や「重要度」などのキーワードが含まれる場合、重要度の重みを増やす
  if (queryLower.includes('重要') || queryLower.includes('重要度') || 
      queryLower.includes('important') || queryLower.includes('priority')) {
    adjustedWeights.importance = Math.min(0.3, baseWeights.importance * 2);
    adjustedWeights.similarity = baseWeights.similarity * 0.9;
  }
  
  // 重みの合計が1.0になるように正規化（オプション）
  const total = adjustedWeights.similarity + adjustedWeights.recency + 
                adjustedWeights.importance + adjustedWeights.metadata;
  if (total > 1.0) {
    const scale = 1.0 / total;
    adjustedWeights.similarity *= scale;
    adjustedWeights.recency *= scale;
    adjustedWeights.importance *= scale;
    adjustedWeights.metadata *= scale;
  }
  
  return adjustedWeights;
}
