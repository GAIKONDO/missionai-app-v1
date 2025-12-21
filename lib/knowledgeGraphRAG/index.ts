/**
 * ナレッジグラフ統合RAG検索
 * エンティティ、リレーション、トピックを統合して検索する機能を提供
 * 
 * このモジュールは分割されたファイルから全ての公開APIを再エクスポートします。
 * 既存のコードとの互換性を保つため、`@/lib/knowledgeGraphRAG`からのインポートは
 * 引き続き動作します。
 */

// 型定義をエクスポート
export type {
  SearchResultType,
  TopicSummary,
  KnowledgeGraphSearchResult,
  SearchFilters,
  KnowledgeGraphContextResult,
} from './types';

// 検索関数をエクスポート
export { searchKnowledgeGraph } from './searchKnowledgeGraph';
export { searchEntities } from './searchEntities';
export { searchRelations } from './searchRelations';
export { searchTopics } from './searchTopics';

// コンテキスト生成関数をエクスポート
export {
  getKnowledgeGraphContext,
  getKnowledgeGraphContextWithResults,
  getIntegratedRAGContext,
  findRelatedEntities,
  findRelatedRelations,
} from './contextGeneration';

// ユーティリティ関数をエクスポート
export { formatSources } from './utils';

