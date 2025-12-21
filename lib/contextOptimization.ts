/**
 * コンテキスト最適化
 * トークン制限内で優先情報を選択し、冗長情報を除去
 */

import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';

/**
 * コンテキスト最適化の設定
 */
export interface ContextOptimizationConfig {
  maxTokens: number; // 最大トークン数（デフォルト: 4000）
  tokenPerChar: number; // 1文字あたりのトークン数（日本語は約0.25、英語は約0.25）
  priorityWeights: {
    score: number; // スコアの重み（0-1）
    recency: number; // 新しさの重み（0-1）
    importance: number; // 重要度の重み（0-1）
    metadataRichness: number; // メタデータの豊富さの重み（0-1）
  };
  removeRedundancy: boolean; // 冗長情報の除去を有効化
  minScoreThreshold: number; // 最小スコア閾値（これ以下の結果は除外）
}

/**
 * デフォルト設定
 */
export const DEFAULT_OPTIMIZATION_CONFIG: ContextOptimizationConfig = {
  maxTokens: 4000,
  tokenPerChar: 0.25, // 日本語と英語の平均
  priorityWeights: {
    score: 0.5,
    recency: 0.2,
    importance: 0.2,
    metadataRichness: 0.1,
  },
  removeRedundancy: true,
  minScoreThreshold: 0.3,
};

/**
 * テキストのトークン数を推定
 */
export function estimateTokenCount(text: string, tokenPerChar: number = 0.25): number {
  // 簡易的なトークン数推定（実際のトークナイザーを使用する場合は改善可能）
  return Math.ceil(text.length * tokenPerChar);
}

/**
 * 結果の優先度スコアを計算
 */
function calculatePriorityScore(
  result: KnowledgeGraphSearchResult,
  config: ContextOptimizationConfig
): number {
  const weights = config.priorityWeights;
  let priority = 0;
  
  // スコア
  priority += result.score * weights.score;
  
  // 新しさ（エンティティまたはリレーションの更新日時から計算）
  if (weights.recency > 0) {
    let updatedAt: string | undefined;
    if (result.type === 'entity' && result.entity?.updatedAt) {
      updatedAt = result.entity.updatedAt;
    } else if (result.type === 'relation' && result.relation?.updatedAt) {
      updatedAt = result.relation.updatedAt;
    }
    
    if (updatedAt) {
      try {
        const daysSinceUpdate = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        let recencyScore: number;
        if (daysSinceUpdate < 30) {
          recencyScore = 1.0;
        } else if (daysSinceUpdate < 90) {
          recencyScore = 0.8;
        } else if (daysSinceUpdate < 180) {
          recencyScore = 0.6;
        } else {
          recencyScore = Math.max(0, 0.4 - (daysSinceUpdate - 180) / 365);
        }
        priority += recencyScore * weights.recency;
      } catch (error) {
        // 日付パースエラーは無視
      }
    }
  }
  
  // 重要度（リレーションの信頼度、トピックの重要度など）
  if (weights.importance > 0) {
    if (result.type === 'relation' && result.relation?.confidence !== undefined) {
      priority += result.relation.confidence * weights.importance;
    }
    // トピックの重要度は既にスコアに反映されていると仮定
  }
  
  // メタデータの豊富さ
  if (weights.metadataRichness > 0) {
    let metadataCount = 0;
    if (result.type === 'entity' && result.entity?.metadata) {
      metadataCount = Object.keys(result.entity.metadata).length;
    } else if (result.type === 'relation' && result.relation?.metadata) {
      metadataCount = Object.keys(result.relation.metadata).length;
    }
    const richnessScore = Math.min(1, metadataCount / 10);
    priority += richnessScore * weights.metadataRichness;
  }
  
  return priority;
}

/**
 * 結果のコンテキスト文字列を生成（最適化版）
 */
function generateOptimizedContextString(
  result: KnowledgeGraphSearchResult,
  maxLength: number
): string {
  const parts: string[] = [];
  
  if (result.type === 'entity' && result.entity) {
    const entity = result.entity;
    parts.push(`**${entity.name}**`);
    
    if (entity.type) {
      parts.push(`タイプ: ${entity.type}`);
    }
    
    // 重要なメタデータのみを追加（長さ制限内で）
    if (entity.metadata) {
      const importantFields = ['role', 'department', 'position', 'industry'];
      const metadataParts: string[] = [];
      for (const field of importantFields) {
        if (entity.metadata[field] && typeof entity.metadata[field] === 'string') {
          const value = entity.metadata[field] as string;
          const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
          metadataParts.push(`${field}: ${displayValue}`);
        }
      }
      if (metadataParts.length > 0) {
        parts.push(metadataParts.join(', '));
      }
    }
    
    parts.push(`関連度: ${(result.score * 100).toFixed(1)}%`);
  } else if (result.type === 'relation' && result.relation) {
    const relation = result.relation;
    parts.push(`**${relation.relationType}**`);
    
    if (relation.description) {
      const desc = relation.description.length > 150 
        ? relation.description.substring(0, 150) + '...'
        : relation.description;
      parts.push(`説明: ${desc}`);
    }
    
    if (relation.confidence !== undefined) {
      parts.push(`信頼度: ${(relation.confidence * 100).toFixed(1)}%`);
    }
    
    parts.push(`関連度: ${(result.score * 100).toFixed(1)}%`);
  } else if (result.type === 'topic') {
    parts.push(`トピックID: ${result.topicId}`);
    if (result.meetingNoteId) {
      parts.push(`議事録ID: ${result.meetingNoteId}`);
    }
    parts.push(`関連度: ${(result.score * 100).toFixed(1)}%`);
  }
  
  const contextString = parts.join(' | ');
  
  // 長さ制限を適用
  if (contextString.length > maxLength) {
    return contextString.substring(0, maxLength - 3) + '...';
  }
  
  return contextString;
}

/**
 * 冗長情報の除去
 */
function removeRedundantResults(
  results: KnowledgeGraphSearchResult[]
): KnowledgeGraphSearchResult[] {
  const seen = new Set<string>();
  const uniqueResults: KnowledgeGraphSearchResult[] = [];
  
  for (const result of results) {
    // エンティティの場合、名前で重複チェック
    if (result.type === 'entity' && result.entity) {
      const key = `entity:${result.entity.name.toLowerCase()}`;
      if (seen.has(key)) {
        continue; // 既に同じ名前のエンティティが存在する場合はスキップ
      }
      seen.add(key);
    }
    
    // リレーションの場合、IDで重複チェック
    if (result.type === 'relation' && result.relation) {
      const key = `relation:${result.relation.id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
    }
    
    // トピックの場合、IDで重複チェック
    if (result.type === 'topic') {
      const key = `topic:${result.topicId}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
    }
    
    uniqueResults.push(result);
  }
  
  return uniqueResults;
}

/**
 * コンテキストを最適化（トークン制限内で優先情報を選択）
 */
export function optimizeContext(
  results: KnowledgeGraphSearchResult[],
  config: ContextOptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG
): KnowledgeGraphSearchResult[] {
  console.log(`[optimizeContext] 🔍 コンテキスト最適化開始: 入力結果数=${results.length}, 最大トークン数=${config.maxTokens}`);
  
  // 1. 最小スコア閾値でフィルタリング
  let filteredResults = results.filter(result => result.score >= config.minScoreThreshold);
  console.log(`[optimizeContext] スコア閾値フィルタリング: ${results.length}件 → ${filteredResults.length}件`);
  
  // 2. 冗長情報の除去
  if (config.removeRedundancy) {
    filteredResults = removeRedundantResults(filteredResults);
    console.log(`[optimizeContext] 冗長情報除去: ${filteredResults.length}件`);
  }
  
  // 3. 優先度スコアを計算
  const resultsWithPriority = filteredResults.map(result => ({
    result,
    priority: calculatePriorityScore(result, config),
  }));
  
  // 優先度でソート
  resultsWithPriority.sort((a, b) => b.priority - a.priority);
  
  // 4. トークン制限内で結果を選択
  const selectedResults: KnowledgeGraphSearchResult[] = [];
  let currentTokens = 0;
  const headerTokens = estimateTokenCount('## 関連情報\n\n', config.tokenPerChar);
  currentTokens += headerTokens;
  
  for (const { result } of resultsWithPriority) {
    // 結果のコンテキスト文字列を生成してトークン数を推定
    const contextString = generateOptimizedContextString(result, 500); // 最大500文字
    const resultTokens = estimateTokenCount(contextString + '\n', config.tokenPerChar);
    
    // トークン制限を超える場合は終了
    if (currentTokens + resultTokens > config.maxTokens) {
      console.log(`[optimizeContext] トークン制限に達しました: ${currentTokens}/${config.maxTokens}トークン`);
      break;
    }
    
    selectedResults.push(result);
    currentTokens += resultTokens;
  }
  
  console.log(`[optimizeContext] ✅ 最適化完了: ${selectedResults.length}件の結果を選択（${currentTokens}/${config.maxTokens}トークン）`);
  
  return selectedResults;
}

/**
 * コンテキスト文字列を最適化（既に生成されたコンテキスト文字列を最適化）
 */
export function optimizeContextString(
  contextString: string,
  maxTokens: number = 4000,
  tokenPerChar: number = 0.25
): string {
  const currentTokens = estimateTokenCount(contextString, tokenPerChar);
  
  if (currentTokens <= maxTokens) {
    return contextString; // 既に制限内
  }
  
  console.log(`[optimizeContextString] コンテキスト文字列を最適化: ${currentTokens}トークン → ${maxTokens}トークン以下に`);
  
  // セクションごとに分割
  const sections = contextString.split(/\n## /);
  const optimizedSections: string[] = [];
  let remainingTokens = maxTokens;
  
  // ヘッダー用のトークンを確保
  remainingTokens -= estimateTokenCount('## ', tokenPerChar);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    const sectionTokens = estimateTokenCount(section, tokenPerChar);
    
    if (sectionTokens <= remainingTokens) {
      optimizedSections.push(section);
      remainingTokens -= sectionTokens;
    } else {
      // セクションが長すぎる場合は要約
      const maxChars = Math.floor(remainingTokens / tokenPerChar);
      if (maxChars > 100) {
        // 最初の部分を取得
        const truncated = section.substring(0, maxChars - 3) + '...';
        optimizedSections.push(truncated);
        remainingTokens -= estimateTokenCount(truncated, tokenPerChar);
      }
      break; // これ以上追加できない
    }
  }
  
  const optimized = '## ' + optimizedSections.join('\n## ');
  console.log(`[optimizeContextString] ✅ 最適化完了: ${estimateTokenCount(optimized, tokenPerChar)}トークン`);
  
  return optimized;
}
