/**
 * リレーション埋め込み型定義
 * ナレッジグラフRAG検索用のリレーション埋め込みデータ
 */

/**
 * リレーション埋め込みデータ
 */
export interface RelationEmbedding {
  id: string;                        // リレーションIDと同じ
  relationId: string;                 // リレーションID
  topicId: string;                    // トピックID
  organizationId: string;            // 組織ID
  
  // 埋め込みベクトル
  combinedEmbedding?: number[];       // 統合埋め込み（説明+リレーションタイプ+関連エンティティ名+メタデータ）
  descriptionEmbedding?: number[];    // 説明の埋め込み
  relationTypeEmbedding?: number[];   // リレーションタイプの埋め込み
  
  // 埋め込み設定
  embeddingModel: string;             // 使用モデル（デフォルト: 'text-embedding-3-small'）
  embeddingVersion: string;           // 埋め込みバージョン（デフォルト: '1.0'）
  
  // タイムスタンプ
  createdAt: string;
  updatedAt: string;
}

/**
 * リレーション埋め込み作成用の入力型（IDとタイムスタンプを除く）
 */
export type CreateRelationEmbeddingInput = Omit<RelationEmbedding, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * リレーション埋め込み更新用の入力型（IDとタイムスタンプを除く）
 */
export type UpdateRelationEmbeddingInput = Partial<Omit<RelationEmbedding, 'id' | 'createdAt' | 'updatedAt'>>;
