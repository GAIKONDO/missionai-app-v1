/**
 * 多段階フィルタリング
 * ベクトル検索 → メタデータフィルタリング → 再ランキングの3段階処理
 */

import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';

/**
 * フィルタリング段階の設定
 */
export interface FilteringStage {
  name: string;
  enabled: boolean;
  weight: number; // この段階の重み（0-1）
}

/**
 * 多段階フィルタリングの設定
 */
export interface MultiStageFilterConfig {
  // 第1段階: ベクトル検索
  vectorSearch: {
    enabled: boolean;
    initialLimit: number; // 最初に取得する候補数（多めに取得）
    minSimilarity: number; // 最小類似度閾値（0-1）
  };
  
  // 第2段階: メタデータフィルタリング
  metadataFilter: {
    enabled: boolean;
    boostFields: string[]; // ブーストするメタデータフィールド
    requiredFields?: string[]; // 必須フィールド（これらがない場合は除外）
  };
  
  // 第3段階: 再ランキング
  reranking: {
    enabled: boolean;
    factors: {
      recency: number; // 新しさの重み（0-1）
      importance: number; // 重要度の重み（0-1）
      metadataRichness: number; // メタデータの豊富さの重み（0-1）
      popularity?: number; // 人気度の重み（0-1、オプション）
    };
  };
}

/**
 * デフォルト設定
 */
export const DEFAULT_FILTER_CONFIG: MultiStageFilterConfig = {
  vectorSearch: {
    enabled: true,
    initialLimit: 50, // 最初に50件取得
    minSimilarity: 0.3, // 類似度0.3以上
  },
  metadataFilter: {
    enabled: true,
    boostFields: ['role', 'department', 'position', 'industry', 'date', 'amount', 'percentage'],
    requiredFields: [],
  },
  reranking: {
    enabled: true,
    factors: {
      recency: 0.2,
      importance: 0.2,
      metadataRichness: 0.1,
    },
  },
};

/**
 * エンティティのメタデータスコアを計算
 */
function calculateEntityMetadataScore(
  entity: Entity,
  config: MultiStageFilterConfig
): number {
  let score = 0;
  
  if (!entity.metadata || Object.keys(entity.metadata).length === 0) {
    return 0;
  }
  
  const metadata = entity.metadata;
  const boostFields = config.metadataFilter.boostFields;
  
  // ブーストフィールドの存在を評価
  let boostFieldCount = 0;
  for (const field of boostFields) {
    if (metadata[field]) {
      boostFieldCount++;
      // フィールドの値の長さも考慮（詳細な情報があるほど高評価）
      const value = metadata[field];
      if (typeof value === 'string' && value.length > 10) {
        score += 0.1;
      } else {
        score += 0.05;
      }
    }
  }
  
  // ブーストフィールドの数に基づくスコア
  score += (boostFieldCount / boostFields.length) * 0.5;
  
  // メタデータの総数に基づくスコア（豊富な情報があるほど高評価）
  const totalFields = Object.keys(metadata).length;
  score += Math.min(0.3, totalFields / 10);
  
  // エイリアスの存在も評価
  if (entity.aliases && entity.aliases.length > 0) {
    score += Math.min(0.1, entity.aliases.length / 5);
  }
  
  return Math.min(1, score);
}

/**
 * リレーションのメタデータスコアを計算
 */
function calculateRelationMetadataScore(
  relation: Relation,
  config: MultiStageFilterConfig
): number {
  let score = 0;
  
  if (!relation.metadata || Object.keys(relation.metadata).length === 0) {
    return 0;
  }
  
  const metadata = relation.metadata;
  const boostFields = config.metadataFilter.boostFields;
  
  // ブーストフィールドの存在を評価
  let boostFieldCount = 0;
  for (const field of boostFields) {
    if (metadata[field]) {
      boostFieldCount++;
      // 重要なフィールド（date, amount, percentage）は高評価
      if (['date', 'amount', 'percentage'].includes(field)) {
        score += 0.15;
      } else {
        score += 0.05;
      }
    }
  }
  
  // ブーストフィールドの数に基づくスコア
  score += (boostFieldCount / boostFields.length) * 0.5;
  
  // 説明の存在と長さを評価
  if (relation.description) {
    const descLength = relation.description.length;
    if (descLength > 200) {
      score += 0.2;
    } else if (descLength > 100) {
      score += 0.1;
    } else {
      score += 0.05;
    }
  }
  
  // 信頼度を評価
  if (relation.confidence !== undefined) {
    score += relation.confidence * 0.2;
  }
  
  return Math.min(1, score);
}

/**
 * エンティティの再ランキングスコアを計算
 */
function calculateEntityRerankScore(
  entity: Entity,
  originalScore: number,
  config: MultiStageFilterConfig
): number {
  let score = originalScore;
  const factors = config.reranking.factors;
  
  // 新しさスコア
  if (entity.updatedAt && factors.recency > 0) {
    try {
      const daysSinceUpdate = (Date.now() - new Date(entity.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
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
      score += recencyScore * factors.recency;
    } catch (error) {
      // 日付パースエラーは無視
    }
  }
  
  // メタデータの豊富さスコア
  if (factors.metadataRichness > 0) {
    const metadataScore = calculateEntityMetadataScore(entity, config);
    score += metadataScore * factors.metadataRichness;
  }
  
  return Math.min(1, score);
}

/**
 * リレーションの再ランキングスコアを計算
 */
function calculateRelationRerankScore(
  relation: Relation,
  originalScore: number,
  config: MultiStageFilterConfig
): number {
  let score = originalScore;
  const factors = config.reranking.factors;
  
  // 新しさスコア
  if (relation.updatedAt && factors.recency > 0) {
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
      score += recencyScore * factors.recency;
    } catch (error) {
      // 日付パースエラーは無視
    }
  }
  
  // 重要度スコア（信頼度を使用）
  if (relation.confidence !== undefined && factors.importance > 0) {
    score += relation.confidence * factors.importance;
  }
  
  // メタデータの豊富さスコア
  if (factors.metadataRichness > 0) {
    const metadataScore = calculateRelationMetadataScore(relation, config);
    score += metadataScore * factors.metadataRichness;
  }
  
  return Math.min(1, score);
}

/**
 * 第1段階: ベクトル検索結果のフィルタリング
 */
export function filterByVectorSimilarity<T extends { similarity: number }>(
  results: T[],
  config: MultiStageFilterConfig
): T[] {
  if (!config.vectorSearch.enabled) {
    return results;
  }
  
  return results.filter(result => result.similarity >= config.vectorSearch.minSimilarity);
}

/**
 * 第2段階: メタデータフィルタリング
 */
export function filterByMetadata(
  entities: Entity[],
  relations: Relation[],
  config: MultiStageFilterConfig
): {
  filteredEntities: Entity[];
  filteredRelations: Relation[];
} {
  if (!config.metadataFilter.enabled) {
    return { filteredEntities: entities, filteredRelations: relations };
  }
  
  // 必須フィールドのチェック
  const requiredFields = config.metadataFilter.requiredFields || [];
  
  const filteredEntities = entities.filter(entity => {
    // 必須フィールドのチェック
    if (requiredFields.length > 0) {
      const hasAllRequired = requiredFields.every(field => {
        return entity.metadata && entity.metadata[field];
      });
      if (!hasAllRequired) {
        return false;
      }
    }
    return true;
  });
  
  const filteredRelations = relations.filter(relation => {
    // 必須フィールドのチェック
    if (requiredFields.length > 0) {
      const hasAllRequired = requiredFields.every(field => {
        return relation.metadata && relation.metadata[field];
      });
      if (!hasAllRequired) {
        return false;
      }
    }
    return true;
  });
  
  return { filteredEntities, filteredRelations };
}

/**
 * 第3段階: 再ランキング
 */
export function rerankResults(
  results: KnowledgeGraphSearchResult[],
  config: MultiStageFilterConfig
): KnowledgeGraphSearchResult[] {
  if (!config.reranking.enabled) {
    return results;
  }
  
  // 各結果に対して再ランキングスコアを計算
  const rerankedResults = results.map(result => {
    let newScore = result.score;
    
    if (result.type === 'entity' && result.entity) {
      newScore = calculateEntityRerankScore(result.entity, result.score, config);
    } else if (result.type === 'relation' && result.relation) {
      newScore = calculateRelationRerankScore(result.relation, result.score, config);
    }
    // トピックの場合は既存のスコアを使用（トピックの再ランキングは別途実装可能）
    
    return {
      ...result,
      score: newScore,
    };
  });
  
  // スコアでソート
  return rerankedResults.sort((a, b) => b.score - a.score);
}

/**
 * 多段階フィルタリングを統合実行
 */
export function applyMultiStageFiltering(
  results: KnowledgeGraphSearchResult[],
  config: MultiStageFilterConfig = DEFAULT_FILTER_CONFIG
): KnowledgeGraphSearchResult[] {
  console.log(`[applyMultiStageFiltering] 🔍 多段階フィルタリング開始: 入力結果数=${results.length}`);
  
  // 第1段階: ベクトル類似度フィルタリング
  let filteredResults = filterByVectorSimilarity(results, config);
  console.log(`[applyMultiStageFiltering] 第1段階（ベクトル類似度）完了: ${filteredResults.length}件`);
  
  // 第2段階: メタデータフィルタリング
  const entities = filteredResults.filter(r => r.type === 'entity' && r.entity).map(r => r.entity!);
  const relations = filteredResults.filter(r => r.type === 'relation' && r.relation).map(r => r.relation!);
  
  const { filteredEntities, filteredRelations } = filterByMetadata(entities, relations, config);
  
  // フィルタリング後のエンティティとリレーションを結果に反映
  const entityMap = new Map(filteredEntities.map(e => [e.id, e]));
  const relationMap = new Map(filteredRelations.map(r => [r.id, r]));
  
  filteredResults = filteredResults.filter(result => {
    if (result.type === 'entity' && result.entity) {
      return entityMap.has(result.entity.id);
    }
    if (result.type === 'relation' && result.relation) {
      return relationMap.has(result.relation.id);
    }
    // トピックはそのまま
    return true;
  });
  
  console.log(`[applyMultiStageFiltering] 第2段階（メタデータ）完了: ${filteredResults.length}件`);
  
  // 第3段階: 再ランキング
  const rerankedResults = rerankResults(filteredResults, config);
  console.log(`[applyMultiStageFiltering] 第3段階（再ランキング）完了: ${rerankedResults.length}件`);
  
  return rerankedResults;
}
