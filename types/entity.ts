/**
 * エンティティ型定義
 * ナレッジグラフで使用するエンティティ（登場人物・モノ）の情報
 */

/**
 * エンティティタイプ
 */
export type EntityType = 
  | 'person'        // 人（顧客、社員、担当者など）
  | 'company'       // 会社（トヨタ、CTC、OpenAIなど）
  | 'product'      // 製品（ChatGPT、GPU、ERPなど）
  | 'project'      // プロジェクト
  | 'organization' // 組織（部署、チームなど）
  | 'location'     // 場所
  | 'technology'   // 技術・ツール
  | 'other';       // その他

/**
 * エンティティのメタデータ
 */
export interface EntityMetadata {
  role?: string;           // 役割（例: "顧客", "社員", "担当者"）
  department?: string;     // 部署
  position?: string;       // 役職
  email?: string;          // メールアドレス
  phone?: string;          // 電話番号
  website?: string;        // Webサイト
  industry?: string;       // 業界
  [key: string]: any;      // その他の拡張可能なフィールド
}

/**
 * エンティティ
 */
export interface Entity {
  id: string;                    // エンティティのユニークID
  name: string;                  // エンティティ名（例: "トヨタ", "ChatGPT"）
  type: EntityType;              // エンティティタイプ
  aliases?: string[];            // 別名・表記ゆれ対応（例: ["トヨタ自動車", "Toyota"]）
  metadata?: EntityMetadata;     // 追加情報
  organizationId?: string;        // 所属組織ID（オプション）
  companyId?: string;            // 所属事業会社ID（オプション）
  createdAt: string;             // 作成日時
  updatedAt: string;             // 更新日時
}

/**
 * エンティティ作成用の入力型（IDとタイムスタンプを除く）
 */
export type CreateEntityInput = Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * エンティティ更新用の入力型（IDとタイムスタンプを除く）
 */
export type UpdateEntityInput = Partial<Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>>;
