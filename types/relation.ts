/**
 * リレーション型定義
 * ナレッジグラフで使用する意味関係（リレーション）の情報
 */

/**
 * リレーションタイプ
 */
export type RelationType =
  | 'subsidiary'        // 「AはBの子会社」
  | 'uses'             // 「CはDを導入」
  | 'invests'           // 「EはFに出資」
  | 'employs'           // 「GはHを雇用」
  | 'partners'          // 「IはJと提携」
  | 'competes'          // 「KはLと競合」
  | 'supplies'          // 「MはNに供給」
  | 'owns'              // 「OはPを所有」
  | 'located-in'        // 「QはRに所在」
  | 'works-for'         // 「SはTで働く」
  | 'manages'           // 「UはVを管理」
  | 'reports-to'        // 「WはXに報告」
  | 'related-to'        // 「YはZに関連」（汎用的な関係）
  | 'other';            // その他

/**
 * リレーションのメタデータ
 */
export interface RelationMetadata {
  date?: string;        // 関係が成立した日付
  amount?: number;      // 金額（出資額など）
  percentage?: number;  // 割合（出資比率など）
  description?: string; // 詳細説明
  source?: string;      // 情報源
  [key: string]: any;   // その他の拡張可能なフィールド
}

/**
 * リレーション
 */
export interface Relation {
  id: string;                    // リレーションのユニークID
  topicId: string;               // 関連するトピックID
  sourceEntityId?: string;       // 起点エンティティID（オプション：トピック内のリレーションの場合）
  targetEntityId?: string;       // 終点エンティティID（オプション：トピック内のリレーションの場合）
  relationType: RelationType;    // リレーションタイプ
  description?: string;          // 自然言語での説明（例: "AはBの子会社"）
  confidence?: number;           // AI抽出時の信頼度（0-1）
  metadata?: RelationMetadata;   // 追加情報
  organizationId?: string;       // 所属組織ID（オプション）
  companyId?: string;            // 所属事業会社ID（オプション）
  createdAt: string;            // 作成日時
  updatedAt: string;            // 更新日時
}

/**
 * リレーション作成用の入力型（IDとタイムスタンプを除く）
 */
export type CreateRelationInput = Omit<Relation, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * リレーション更新用の入力型（IDとタイムスタンプを除く）
 */
export type UpdateRelationInput = Partial<Omit<Relation, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * リレーション検証結果
 */
export interface RelationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
