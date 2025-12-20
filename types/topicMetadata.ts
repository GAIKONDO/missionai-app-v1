/**
 * 個別トピックのメタデータ型定義
 * AIアシスタント機能で活用するためのセマンティックレイヤー情報
 */

/**
 * トピックのセマンティックカテゴリ
 */
import type { Entity } from './entity';
import type { Relation } from './relation';

/**
 * トピックのセマンティックカテゴリ（固定値）
 */
export type TopicSemanticCategoryFixed =
  | 'action-item'           // アクションアイテム
  | 'decision'               // 決定事項
  | 'discussion'             // 議論・討議
  | 'issue'                  // 課題・問題
  | 'risk'                   // リスク
  | 'opportunity'            // 機会
  | 'question'               // 質問・疑問
  | 'summary'                // サマリー
  | 'follow-up'              // フォローアップ
  | 'reference'              // 参照情報
  | 'other';                 // その他

/**
 * トピックのセマンティックカテゴリ（固定値 + 自由入力）
 * 固定値のカテゴリに加えて、ドメイン固有のカテゴリ（財務、営業、人事など）も使用可能
 */
export type TopicSemanticCategory = TopicSemanticCategoryFixed | string;

/**
 * トピックの重要度
 */
export type TopicImportance = 'high' | 'medium' | 'low';

/**
 * トピックのステータス
 */
export type TopicStatus = 
  | 'open'                   // オープン
  | 'in-progress'            // 進行中
  | 'resolved'               // 解決済み
  | 'deferred'               // 延期
  | 'cancelled';             // キャンセル

/**
 * トピックのメタデータ
 */
export interface TopicMetadata {
  // 基本情報
  id: string;
  title: string;
  content: string;
  
  // セマンティック情報
  semanticCategory?: TopicSemanticCategory;
  importance?: TopicImportance;
  status?: TopicStatus;
  
  // タグ・キーワード
  keywords?: string[];              // AI抽出または手動設定
  tags?: string[];                  // ユーザー定義タグ
  entities?: Entity[];              // エンティティ（構造化データ）
  // 後方互換性のため、文字列配列もサポート（段階的移行用）
  entityNames?: string[];           // エンティティ名（文字列配列、後方互換性用）
  
  // 要約・サマリー
  summary?: string;                 // AI生成または手動設定
  keyPoints?: string[];             // キーポイント（箇条書き）
  
  // 関係性
  relatedTopicIds?: string[];        // 関連トピックID
  relatedPageIds?: string[];         // 関連ページID
  parentTopicId?: string;            // 親トピックID（階層構造用）
  childTopicIds?: string[];          // 子トピックID
  relations?: Relation[];            // リレーション（構造化データ）
  
  // 時系列情報
  mentionedDate?: string;            // 言及された日付
  dueDate?: string;                 // 期限日
  resolvedDate?: string;             // 解決日
  
  // 責任者・担当者
  assignees?: string[];              // 担当者IDまたは名前
  stakeholders?: string[];           // ステークホルダー
  
  // コンテキスト情報
  context?: {                        // 追加のコンテキスト情報
    location?: string;                // 場所
    participants?: string[];          // 参加者
    meetingType?: string;             // 会議タイプ
  };
  
  // AI生成情報
  aiGenerated?: {                    // AIが生成した情報
    confidence?: number;              // 信頼度（0-1）
    reasoning?: string;              // 推論理由
    suggestedActions?: string[];     // 推奨アクション
  };
  
  // タイムスタンプ
  createdAt: string;
  updatedAt: string;
}

/**
 * トピック埋め込みデータ
 */
export interface TopicEmbedding {
  id: string;                        // トピックID (例: {meetingNoteId}-topic-{topicId})
  topicId: string;                   // トピックのユニークID
  meetingNoteId: string;             // 親議事録ID
  organizationId: string;            // 組織ID
  
  // 基本情報（ChromaDBから取得時に必要）
  title?: string;                    // トピックタイトル
  content?: string;                  // トピックコンテンツ
  
  // 埋め込みベクトル
  combinedEmbedding?: number[];      // 統合埋め込み
  titleEmbedding?: number[];         // タイトル埋め込み
  contentEmbedding?: number[];       // コンテンツ埋め込み
  metadataEmbedding?: number[];      // メタデータ埋め込み
  
  // 埋め込み設定
  embeddingModel: string;
  embeddingVersion: string;
  
  // メタデータ（検索高速化のため）
  semanticCategory?: TopicSemanticCategory;
  keywords?: string[];
  tags?: string[];
  metadata?: Record<string, any>;    // 追加のメタデータ（ChromaDBから取得時に使用）
  
  // タイムスタンプ
  createdAt: string;
  updatedAt: string;
}

/**
 * 拡張されたトピック型（既存のtopics配列の要素）
 * TopicMetadataを継承
 */
export interface Topic extends TopicMetadata {
  // 既存のフィールドはTopicMetadataに含まれる
  // 必要に応じて追加のフィールドを定義可能
}
