/**
 * ナレッジグラフRAG検索の型定義
 */

import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';

/**
 * 検索結果の種類
 */
export type SearchResultType = 'entity' | 'relation' | 'topic';

/**
 * トピックサマリー（RAG検索結果用）
 */
export interface TopicSummary {
  topicId: string;
  title: string;
  contentSummary?: string; // contentの要約（200文字程度）
  semanticCategory?: string;
  keywords?: string[];
  meetingNoteId?: string;
  organizationId?: string;
}

/**
 * 統合検索結果
 */
export interface KnowledgeGraphSearchResult {
  type: SearchResultType;
  id: string;
  score: number;
  similarity: number;
  // エンティティの場合
  entity?: Entity;
  // リレーションの場合
  relation?: Relation;
  // トピックの場合
  topicId?: string;
  meetingNoteId?: string;
  topic?: TopicSummary; // トピックの詳細情報（title, contentSummaryなど）
}

/**
 * 検索フィルター
 */
export interface SearchFilters {
  organizationId?: string;
  entityType?: string;
  relationType?: string;
  topicSemanticCategory?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  filterLogic?: 'AND' | 'OR';
}

/**
 * 検索結果とコンテキスト文字列のペア
 */
export interface KnowledgeGraphContextResult {
  context: string;
  results: KnowledgeGraphSearchResult[];
  sources: Array<{
    type: 'entity' | 'relation' | 'topic';
    id: string;
    name: string;
    score: number;
  }>;
}

