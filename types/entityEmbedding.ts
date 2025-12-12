/**
 * エンティティ埋め込み型定義
 * ナレッジグラフRAG検索用のエンティティ埋め込みデータ
 */

/**
 * エンティティ埋め込みデータ
 */
export interface EntityEmbedding {
  id: string;                        // エンティティIDと同じ
  entityId: string;                   // エンティティID
  organizationId: string;             // 組織ID
  
  // 埋め込みベクトル
  combinedEmbedding?: number[];       // 統合埋め込み（名前+エイリアス+メタデータ）
  nameEmbedding?: number[];           // エンティティ名の埋め込み
  metadataEmbedding?: number[];       // メタデータの埋め込み
  
  // 埋め込み設定
  embeddingModel: string;             // 使用モデル（デフォルト: 'text-embedding-3-small'）
  embeddingVersion: string;           // 埋め込みバージョン（デフォルト: '1.0'）
  
  // タイムスタンプ
  createdAt: string;
  updatedAt: string;
}

/**
 * エンティティ埋め込み作成用の入力型（IDとタイムスタンプを除く）
 */
export type CreateEntityEmbeddingInput = Omit<EntityEmbedding, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * エンティティ埋め込み更新用の入力型（IDとタイムスタンプを除く）
 */
export type UpdateEntityEmbeddingInput = Partial<Omit<EntityEmbedding, 'id' | 'createdAt' | 'updatedAt'>>;
