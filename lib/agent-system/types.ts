/**
 * Agentシステムの型定義
 */

/**
 * タスクタイプ
 */
export enum TaskType {
  SEARCH = 'search',              // 検索タスク
  ANALYSIS = 'analysis',          // 分析タスク
  GENERATION = 'generation',      // 生成タスク
  VALIDATION = 'validation',      // 検証タスク
  COORDINATION = 'coordination',   // 協調タスク
}

/**
 * タスク定義
 */
export interface Task {
  id: string;                    // タスクID
  name: string;                  // タスク名
  description: string;           // タスクの説明
  type: TaskType;                // タスクタイプ
  agentId?: string;              // 実行Agent（指定時）
  requiredAgents?: string[];     // 必要なAgentリスト
  dependencies?: string[];       // 依存タスクIDリスト
  parameters: Record<string, any>; // タスクパラメータ
  priority: number;              // 優先度（1-10）
  timeout?: number;              // タイムアウト（ミリ秒）
  retryCount?: number;           // リトライ回数
  createdAt: number;             // 作成日時
  updatedAt: number;             // 更新日時
}

/**
 * 実行状態
 */
export enum ExecutionStatus {
  PENDING = 'pending',           // 待機中
  RUNNING = 'running',           // 実行中
  COMPLETED = 'completed',       // 完了
  FAILED = 'failed',             // 失敗
  CANCELLED = 'cancelled',       // キャンセル
}

/**
 * 実行ログ
 */
export interface ExecutionLog {
  timestamp: number;             // ログタイムスタンプ
  level: 'info' | 'warn' | 'error'; // ログレベル
  message: string;               // ログメッセージ
  data?: any;                    // 追加データ
}

/**
 * タスク実行
 */
export interface TaskExecution {
  id: string;                    // 実行ID
  taskId: string;                 // タスクID
  agentId: string;               // 実行Agent ID
  status: ExecutionStatus;       // 実行状態
  startedAt: number;             // 開始日時
  completedAt?: number;          // 完了日時
  result?: any;                  // 実行結果
  error?: string;                // エラーメッセージ
  logs: ExecutionLog[];          // 実行ログ
}

/**
 * Agentの役割
 */
export enum AgentRole {
  SEARCHER = 'searcher',          // 検索専門
  ANALYZER = 'analyzer',          // 分析専門
  GENERATOR = 'generator',        // 生成専門
  VALIDATOR = 'validator',        // 検証専門
  COORDINATOR = 'coordinator',    // 協調専門
  GENERAL = 'general',            // 汎用
}

/**
 * リトライポリシー
 */
export interface RetryPolicy {
  maxRetries: number;             // 最大リトライ回数
  retryDelay: number;             // リトライ遅延（ミリ秒）
  backoffMultiplier: number;      // バックオフ倍率
}

/**
 * Agent設定
 */
export interface AgentConfig {
  maxConcurrentTasks: number;     // 同時実行可能タスク数
  defaultTimeout: number;         // デフォルトタイムアウト
  retryPolicy: RetryPolicy;       // リトライポリシー
}

/**
 * Agent定義
 */
export interface Agent {
  id: string;                    // Agent ID
  name: string;                  // Agent名
  description: string;           // Agentの説明
  role: AgentRole;               // Agentの役割
  capabilities: string[];        // 実行可能なタスクタイプ
  tools: string[];               // 利用可能なToolリスト
  modelType: 'gpt' | 'local' | 'cursor'; // 使用するLLM
  systemPrompt: string;           // システムプロンプト
  config: AgentConfig;           // Agent設定
  createdAt: number;             // 作成日時
  updatedAt: number;             // 更新日時
}

/**
 * A2Aメッセージタイプ
 */
export enum A2AMessageType {
  REQUEST = 'request',            // リクエスト
  RESPONSE = 'response',          // レスポンス
  NOTIFICATION = 'notification',   // 通知
  CONFIRMATION = 'confirmation',  // 確認要求
  STATUS_UPDATE = 'status_update', // 状態更新
}

/**
 * A2Aメッセージ
 */
export interface A2AMessage {
  id: string;                    // メッセージID
  from: string;                  // 送信元Agent ID
  to: string;                    // 送信先Agent ID
  type: A2AMessageType;          // メッセージタイプ
  taskId?: string;               // 関連タスクID
  payload: any;                 // メッセージペイロード
  timestamp: number;             // 送信日時
  responseTo?: string;           // 応答先メッセージID
  requiresResponse: boolean;      // 応答が必要か
}

/**
 * タスク実行コンテキスト
 */
export interface TaskExecutionContext {
  executionId: string;           // 実行ID
  a2aManager: any;                // A2AManagerインスタンス（循環参照回避のためany）
  organizationId?: string;        // 組織ID
  userId?: string;               // ユーザーID
}

/**
 * 実行計画
 */
export interface ExecutionPlan {
  taskId: string;                 // タスクID
  assignedAgentId: string;       // 割り当てられたAgent ID
  dependencies: string[];         // 依存タスクIDリスト
  estimatedDuration?: number;    // 推定実行時間（ミリ秒）
}

/**
 * 実行計画ステージ
 */
export interface ExecutionStage {
  stageNumber: number;            // ステージ番号
  tasks: Task[];                  // このステージで実行するタスク
}

/**
 * 実行計画全体
 */
export interface FullExecutionPlan {
  stages: ExecutionStage[];      // 実行ステージ（順次実行）
  totalEstimatedDuration?: number; // 合計推定実行時間
}

