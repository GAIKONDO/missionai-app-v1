/**
 * ChromaDB同期設定管理
 * 同期ポリシーを設定・管理
 */

class ChromaSyncConfigManager {
  private config!: SyncPolicy;
  
  constructor() {
    // デフォルト設定を読み込み
    this.loadConfig();
  }
  
  private loadConfig(): void {
    if (typeof window === 'undefined') {
      this.config = this.getDefaultConfig();
      return;
    }
    
    try {
      const saved = localStorage.getItem('chromaSyncPolicy');
      if (saved) {
        this.config = { ...this.getDefaultConfig(), ...JSON.parse(saved) };
      } else {
        this.config = this.getDefaultConfig();
      }
    } catch (error) {
      console.warn('ChromaDB同期設定の読み込みエラー:', error);
      this.config = this.getDefaultConfig();
    }
  }
  
  private getDefaultConfig(): SyncPolicy {
    return {
      enabled: true,
      async: true,
      retryOnFailure: true,
      maxRetries: 3,
      retryDelay: 1000, // 1秒
      batchSize: 10,
      rateLimit: 50, // 1秒あたりの最大リクエスト数
      checkConsistency: true,
      consistencyCheckInterval: 60 * 60 * 1000, // 1時間
      showNotifications: false, // デフォルトはfalse（開発環境ではtrue推奨）
    };
  }
  
  /**
   * 設定を取得
   */
  getConfig(): SyncPolicy {
    return { ...this.config };
  }
  
  /**
   * 設定を更新
   */
  setConfig(config: Partial<SyncPolicy>): void {
    this.config = { ...this.config, ...config };
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('chromaSyncPolicy', JSON.stringify(this.config));
      } catch (error) {
        console.warn('ChromaDB同期設定の保存エラー:', error);
      }
    }
  }
  
  /**
   * 同期が有効かどうか
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
  
  /**
   * 非同期処理が有効かどうか
   */
  isAsync(): boolean {
    return this.config.async;
  }
  
  /**
   * リトライが有効かどうか
   */
  shouldRetry(): boolean {
    return this.config.retryOnFailure;
  }
  
  /**
   * 通知が有効かどうか
   */
  shouldShowNotifications(): boolean {
    return this.config.showNotifications;
  }
}

/**
 * 同期ポリシーの型定義
 */
export interface SyncPolicy {
  enabled: boolean;              // 同期を有効にするか
  async: boolean;                 // 非同期で実行するか
  retryOnFailure: boolean;       // 失敗時にリトライするか
  maxRetries: number;           // 最大リトライ回数
  retryDelay: number;            // リトライ間隔（ミリ秒）
  batchSize: number;            // バッチサイズ
  rateLimit: number;             // レート制限（1秒あたりの最大リクエスト数）
  checkConsistency: boolean;    // 整合性チェックを有効にするか
  consistencyCheckInterval: number; // 整合性チェックの間隔（ミリ秒）
  showNotifications: boolean;     // エラー通知を表示するか
}

// シングルトンインスタンス
export const chromaSyncConfig = new ChromaSyncConfigManager();
