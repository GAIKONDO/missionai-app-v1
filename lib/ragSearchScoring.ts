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
  similarity: 0.6,  // ベクトル類似度の重みを下げる（0.7 → 0.6）
  recency: 0.1,
  importance: 0.1,
  metadata: 0.2,  // メタデータマッチの重みを上げる（0.1 → 0.2）
};

/**
 * エンティティのスコアを計算
 */
export function calculateEntityScore(
  similarity: number,
  entity: Entity,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  // NaNチェック: similarityがNaNまたはundefinedの場合は0に設定
  const safeSimilarity = (typeof similarity === 'number' && !isNaN(similarity)) ? similarity : 0;
  let score = safeSimilarity * weights.similarity;
  
  // 新しさスコア（更新日時が新しいほど高い）
  if (entity.updatedAt) {
    try {
      const daysSinceUpdate = (Date.now() - new Date(entity.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      // より滑らかな減衰曲線（30日以内は高スコア、1年で0.5、2年で0.1）
      let recencyScore: number;
      if (daysSinceUpdate < 30) {
        recencyScore = 1.0; // 30日以内は最大スコア
      } else if (daysSinceUpdate < 90) {
        recencyScore = 0.8; // 3ヶ月以内は高スコア
      } else if (daysSinceUpdate < 180) {
        recencyScore = 0.6; // 6ヶ月以内は中スコア
      } else if (daysSinceUpdate < 365) {
        recencyScore = 0.4; // 1年以内は低スコア
      } else {
        recencyScore = Math.max(0, 0.2 - (daysSinceUpdate - 365) / 730); // 1年以降はさらに減衰
      }
      score += recencyScore * weights.recency;
    } catch (error) {
      // 日付パースエラーは無視
    }
  }
  
  // メタデータスコア（メタデータが豊富で重要なフィールドがあるほど高い）
  if (entity.metadata && Object.keys(entity.metadata).length > 0) {
    const importantFields = ['role', 'department', 'position', 'industry', 'email', 'phone', 'website'];
    const importantFieldCount = importantFields.filter(field => entity.metadata?.[field]).length;
    const totalFieldCount = Object.keys(entity.metadata).length;
    
    // 重要フィールドの存在を重視
    const importantFieldScore = Math.min(1, importantFieldCount / 5); // 5個の重要フィールドで最大
    const richnessScore = Math.min(1, totalFieldCount / 10); // 10個のフィールドで最大
    
    // 重要フィールドのスコアを70%、豊富さを30%で統合
    const metadataScore = importantFieldScore * 0.7 + richnessScore * 0.3;
    score += metadataScore * weights.metadata;
  }
  
  // エイリアススコア（エイリアスが多いほど高い、検索の柔軟性が上がる）
  if (entity.aliases && entity.aliases.length > 0) {
    const aliasesScore = Math.min(1, entity.aliases.length / 5);
    score += aliasesScore * weights.metadata * 0.6; // メタデータスコアの60%
  }
  
  // 組織IDがある場合のブースト（組織に紐づいているエンティティは重要度が高い可能性）
  if (entity.organizationId) {
    score += 0.05 * weights.importance; // 軽いブースト
  }
  
  // 検索頻度に基づくブースト（searchCountとlastSearchDateを考慮）
  // 注意: entityオブジェクトにsearchCountとlastSearchDateが含まれている場合のみ適用
  const searchCount = (entity as any).searchCount;
  const lastSearchDate = (entity as any).lastSearchDate;
  if (typeof searchCount === 'number' && searchCount > 0) {
    // 検索回数が多いほどブースト（対数スケールで減衰）
    const searchFrequencyBoost = Math.min(0.1, Math.log10(searchCount + 1) * 0.05);
    score += searchFrequencyBoost * weights.importance;
    
    // 最近検索された場合の追加ブースト
    if (lastSearchDate) {
      try {
        const daysSinceSearch = (Date.now() - new Date(lastSearchDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceSearch < 7) {
          // 7日以内に検索された場合は追加ブースト
          score += 0.05 * weights.importance;
        } else if (daysSinceSearch < 30) {
          // 30日以内に検索された場合は軽いブースト
          score += 0.02 * weights.importance;
        }
      } catch (error) {
        // 日付パースエラーは無視
      }
    }
  }
  
  // NaNチェック: 最終スコアがNaNの場合は0に設定
  const finalScore = (typeof score === 'number' && !isNaN(score)) ? Math.min(1, score) : 0;
  return finalScore;
}

/**
 * リレーションのスコアを計算
 */
export function calculateRelationScore(
  similarity: number,
  relation: Relation,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  // NaNチェック: similarityがNaNまたはundefinedの場合は0に設定
  const safeSimilarity = (typeof similarity === 'number' && !isNaN(similarity)) ? similarity : 0;
  let score = safeSimilarity * weights.similarity;
  
  // 信頼度スコア（信頼度が高いほど重要）
  if (relation.confidence !== undefined) {
    // 信頼度を非線形に変換（0.8以上は高評価、0.5以下は低評価）
    const confidenceBoost = relation.confidence >= 0.8 
      ? relation.confidence * 1.2  // 高信頼度はさらにブースト
      : relation.confidence >= 0.5
      ? relation.confidence
      : relation.confidence * 0.7; // 低信頼度は減点
    score += confidenceBoost * weights.importance;
  }
  
  // 新しさスコア（エンティティと同じロジック）
  if (relation.updatedAt) {
    try {
      const daysSinceUpdate = (Date.now() - new Date(relation.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      let recencyScore: number;
      if (daysSinceUpdate < 30) {
        recencyScore = 1.0;
      } else if (daysSinceUpdate < 90) {
        recencyScore = 0.8;
      } else if (daysSinceUpdate < 180) {
        recencyScore = 0.6;
      } else if (daysSinceUpdate < 365) {
        recencyScore = 0.4;
      } else {
        recencyScore = Math.max(0, 0.2 - (daysSinceUpdate - 365) / 730);
      }
      score += recencyScore * weights.recency;
    } catch (error) {
      // 日付パースエラーは無視
    }
  }
  
  // 説明の長さスコア（説明が長いほど詳細な情報がある）
  if (relation.description && relation.description.length > 0) {
    // 説明の長さを非線形に評価（50文字以上で有効、200文字で最大）
    const descriptionLength = relation.description.length;
    let descriptionScore: number;
    if (descriptionLength < 50) {
      descriptionScore = descriptionLength / 50 * 0.5; // 短い説明は低評価
    } else if (descriptionLength < 200) {
      descriptionScore = 0.5 + (descriptionLength - 50) / 150 * 0.5; // 50-200文字で0.5-1.0
    } else {
      descriptionScore = 1.0; // 200文字以上で最大
    }
    score += descriptionScore * weights.metadata * 0.6;
  }
  
  // メタデータスコア（金額、日付、割合などの重要な情報がある場合）
  if (relation.metadata && Object.keys(relation.metadata).length > 0) {
    const importantFields = ['date', 'amount', 'percentage', 'source'];
    const importantFieldCount = importantFields.filter(field => relation.metadata?.[field]).length;
    const metadataScore = Math.min(1, importantFieldCount / 4); // 4個の重要フィールドで最大
    score += metadataScore * weights.metadata * 0.4;
  }
  
  // 両方のエンティティが存在する場合のブースト（完全な関係性）
  if (relation.sourceEntityId && relation.targetEntityId) {
    score += 0.05 * weights.importance;
  }
  
  // 検索頻度に基づくブースト（searchCountとlastSearchDateを考慮）
  const searchCount = (relation as any).searchCount;
  const lastSearchDate = (relation as any).lastSearchDate;
  if (typeof searchCount === 'number' && searchCount > 0) {
    // 検索回数が多いほどブースト（対数スケールで減衰）
    const searchFrequencyBoost = Math.min(0.1, Math.log10(searchCount + 1) * 0.05);
    score += searchFrequencyBoost * weights.importance;
    
    // 最近検索された場合の追加ブースト
    if (lastSearchDate) {
      try {
        const daysSinceSearch = (Date.now() - new Date(lastSearchDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceSearch < 7) {
          score += 0.05 * weights.importance;
        } else if (daysSinceSearch < 30) {
          score += 0.02 * weights.importance;
        }
      } catch (error) {
        // 日付パースエラーは無視
      }
    }
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
  // NaNチェック: similarityがNaNまたはundefinedの場合は0に設定
  const safeSimilarity = (typeof similarity === 'number' && !isNaN(similarity)) ? similarity : 0;
  let score = safeSimilarity * weights.similarity;
  
  // 重要度スコア（より細かく評価）
  if (topicMetadata?.importance) {
    const importanceMap: Record<string, number> = {
      high: 1.0,
      'high-medium': 0.8,
      medium: 0.5,
      'medium-low': 0.3,
      low: 0.2,
    };
    const importanceScore = importanceMap[topicMetadata.importance.toLowerCase()] || 
                           (topicMetadata.importance.toLowerCase().includes('high') ? 0.8 :
                            topicMetadata.importance.toLowerCase().includes('low') ? 0.2 : 0.5);
    score += importanceScore * weights.importance;
  }
  
  // 新しさスコア（エンティティと同じロジック）
  if (topicMetadata?.updatedAt) {
    try {
      const daysSinceUpdate = (Date.now() - new Date(topicMetadata.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      let recencyScore: number;
      if (daysSinceUpdate < 30) {
        recencyScore = 1.0;
      } else if (daysSinceUpdate < 90) {
        recencyScore = 0.8;
      } else if (daysSinceUpdate < 180) {
        recencyScore = 0.6;
      } else if (daysSinceUpdate < 365) {
        recencyScore = 0.4;
      } else {
        recencyScore = Math.max(0, 0.2 - (daysSinceUpdate - 365) / 730);
      }
      score += recencyScore * weights.recency;
    } catch (error) {
      // 日付パースエラーは無視
    }
  }
  
  // キーワードスコア（キーワードが多いほど高い、検索の柔軟性が上がる）
  if (topicMetadata?.keywords && topicMetadata.keywords.length > 0) {
    // キーワード数を非線形に評価（3個以上で有効、10個で最大）
    const keywordCount = topicMetadata.keywords.length;
    const keywordsScore = keywordCount < 3 
      ? keywordCount / 3 * 0.5  // 3個未満は低評価
      : Math.min(1, 0.5 + (keywordCount - 3) / 7 * 0.5); // 3-10個で0.5-1.0
    score += keywordsScore * weights.metadata * 0.6;
  }
  
  // セマンティックカテゴリスコア（カテゴリがある場合は軽くブースト）
  if (topicMetadata?.semanticCategory) {
    // 重要なカテゴリはさらにブースト
    const importantCategories = ['decision', 'action', 'risk', 'opportunity', 'decision', 'action'];
    const isImportant = importantCategories.some(cat => 
      topicMetadata.semanticCategory?.toLowerCase().includes(cat)
    );
    const categoryBoost = isImportant ? 0.1 : 0.05;
    score += categoryBoost * weights.metadata;
  }
  
  // 検索頻度に基づくブースト（searchCountとlastSearchDateを考慮）
  const searchCount = (topicMetadata as any)?.searchCount;
  const lastSearchDate = (topicMetadata as any)?.lastSearchDate;
  if (typeof searchCount === 'number' && searchCount > 0) {
    // 検索回数が多いほどブースト（対数スケールで減衰）
    const searchFrequencyBoost = Math.min(0.1, Math.log10(searchCount + 1) * 0.05);
    score += searchFrequencyBoost * weights.importance;
    
    // 最近検索された場合の追加ブースト
    if (lastSearchDate) {
      try {
        const daysSinceSearch = (Date.now() - new Date(lastSearchDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceSearch < 7) {
          score += 0.05 * weights.importance;
        } else if (daysSinceSearch < 30) {
          score += 0.02 * weights.importance;
        }
      } catch (error) {
        // 日付パースエラーは無視
      }
    }
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
  // NaNチェック: similarityがNaNまたはundefinedの場合は0に設定
  const safeSimilarity = (typeof similarity === 'number' && !isNaN(similarity)) ? similarity : 0;
  let score = safeSimilarity * weights.similarity;
  
  if (metadata.recency !== undefined) {
    score += metadata.recency * weights.recency;
  }
  
  if (metadata.importance !== undefined) {
    score += metadata.importance * weights.importance;
  }
  
  if (metadata.metadataRichness !== undefined) {
    const safeMetadataRichness = (typeof metadata.metadataRichness === 'number' && !isNaN(metadata.metadataRichness)) ? metadata.metadataRichness : 0;
    score += safeMetadataRichness * weights.metadata;
  }
  
  // NaNチェック: 最終スコアがNaNの場合は0に設定
  const finalScore = (typeof score === 'number' && !isNaN(score)) ? Math.min(1, score) : 0;
  return finalScore;
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
      queryLower.includes('新しい') ||
      queryLower.includes('recent') ||
      queryLower.includes('latest') ||
      queryLower.includes('new')) {
    weights.recency = Math.min(0.35, weights.recency * 2.5);
    weights.similarity = Math.max(0.5, weights.similarity * 0.85);
  }
  
  // 「重要」「優先」「緊急」などのキーワードがある場合
  if (queryLower.includes('重要') || 
      queryLower.includes('優先') ||
      queryLower.includes('緊急') ||
      queryLower.includes('important') ||
      queryLower.includes('priority') ||
      queryLower.includes('urgent') ||
      queryLower.includes('critical')) {
    weights.importance = Math.min(0.35, weights.importance * 2.5);
    weights.similarity = Math.max(0.5, weights.similarity * 0.85);
  }
  
  // 「詳細」「詳しく」「メタデータ」などのキーワードがある場合
  if (queryLower.includes('詳細') || 
      queryLower.includes('詳しく') ||
      queryLower.includes('メタデータ') ||
      queryLower.includes('detail') ||
      queryLower.includes('metadata') ||
      queryLower.includes('information')) {
    weights.metadata = Math.min(0.25, weights.metadata * 2);
    weights.similarity = Math.max(0.55, weights.similarity * 0.9);
  }
  
  // 「関連」「関係」「つながり」などのキーワードがある場合（リレーション重視）
  if (queryLower.includes('関連') || 
      queryLower.includes('関係') ||
      queryLower.includes('つながり') ||
      queryLower.includes('related') ||
      queryLower.includes('relation') ||
      queryLower.includes('connection')) {
    // リレーション検索の場合はメタデータの重みを上げる（説明や信頼度など）
    weights.metadata = Math.min(0.2, weights.metadata * 1.5);
  }
  
  // 「会社」「企業」「組織」などのキーワードがある場合（エンティティタイプ重視）
  if (queryLower.includes('会社') || 
      queryLower.includes('企業') ||
      queryLower.includes('組織') ||
      queryLower.includes('company') ||
      queryLower.includes('organization') ||
      queryLower.includes('corporation')) {
    // メタデータ（エンティティタイプなど）の重みを上げる
    weights.metadata = Math.min(0.2, weights.metadata * 1.3);
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
