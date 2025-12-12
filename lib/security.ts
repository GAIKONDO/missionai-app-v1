/**
 * セキュリティ強化システム
 * APIキーの安全な管理、データアクセス制御、入力検証、監査ログ
 */

// 監査ログエントリ
export interface AuditLogEntry {
  id: string;
  action: string; // 'search' | 'ai_query' | 'data_access' | 'data_modify' | 'login' | 'logout'
  userId?: string;
  resource?: string; // アクセスされたリソース
  organizationId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

// アクセス制御設定
export interface AccessControlConfig {
  allowedOrganizations?: string[];
  allowedActions?: string[];
  requireAuthentication?: boolean;
}

// 監査ログのストレージキー
const AUDIT_LOG_KEY = 'security_audit_logs';
const MAX_AUDIT_LOGS = 10000;

/**
 * APIキーを安全に保存（暗号化は簡易版、本番環境ではより強力な暗号化を使用）
 */
export function saveAPIKey(keyName: string, apiKey: string): void {
  if (typeof window === 'undefined') return;

  try {
    // 簡易的なエンコード（本番環境では適切な暗号化を使用）
    const encoded = btoa(apiKey);
    localStorage.setItem(`api_key_${keyName}`, encoded);
    console.log('[Security] APIキーを保存:', keyName);
  } catch (error) {
    console.error('[Security] APIキーの保存エラー:', error);
  }
}

/**
 * APIキーを安全に取得
 */
export function getAPIKey(keyName: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const encoded = localStorage.getItem(`api_key_${keyName}`);
    if (!encoded) return null;
    
    // デコード
    return atob(encoded);
  } catch (error) {
    console.error('[Security] APIキーの取得エラー:', error);
    return null;
  }
}

/**
 * APIキーを削除
 */
export function deleteAPIKey(keyName: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(`api_key_${keyName}`);
    console.log('[Security] APIキーを削除:', keyName);
  } catch (error) {
    console.error('[Security] APIキーの削除エラー:', error);
  }
}

/**
 * 入力検証とサニタイゼーション
 */
export class InputValidator {
  /**
   * SQLインジェクション対策
   */
  static sanitizeSQL(input: string): string {
    // 危険な文字をエスケープ
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  /**
   * XSS対策
   */
  static sanitizeHTML(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * クエリ文字列を検証
   */
  static validateQuery(query: string): { valid: boolean; error?: string } {
    if (!query || query.trim().length === 0) {
      return { valid: false, error: 'クエリが空です' };
    }

    if (query.length > 1000) {
      return { valid: false, error: 'クエリが長すぎます（最大1000文字）' };
    }

    // 危険なパターンをチェック
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\(/i,
      /expression\(/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        return { valid: false, error: 'クエリに危険な文字列が含まれています' };
      }
    }

    return { valid: true };
  }

  /**
   * 組織IDを検証
   */
  static validateOrganizationId(orgId: string): { valid: boolean; error?: string } {
    if (!orgId || orgId.trim().length === 0) {
      return { valid: false, error: '組織IDが空です' };
    }

    // UUID形式をチェック（簡易版）
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(orgId)) {
      return { valid: false, error: '組織IDの形式が不正です' };
    }

    return { valid: true };
  }

  /**
   * ファイル名を検証
   */
  static validateFileName(fileName: string): { valid: boolean; error?: string } {
    if (!fileName || fileName.trim().length === 0) {
      return { valid: false, error: 'ファイル名が空です' };
    }

    // 危険な文字をチェック
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(fileName)) {
      return { valid: false, error: 'ファイル名に使用できない文字が含まれています' };
    }

    if (fileName.length > 255) {
      return { valid: false, error: 'ファイル名が長すぎます（最大255文字）' };
    }

    return { valid: true };
  }
}

/**
 * アクセス制御
 */
export class AccessController {
  private config: AccessControlConfig;

  constructor(config: AccessControlConfig = {}) {
    this.config = config;
  }

  /**
   * アクセスを許可するかチェック
   */
  canAccess(action: string, organizationId?: string): boolean {
    // 認証が必要な場合
    if (this.config.requireAuthentication) {
      // ここで認証チェックを実装（現在は簡易版）
      // 本番環境では適切な認証システムを使用
    }

    // 許可されたアクションをチェック
    if (this.config.allowedActions && !this.config.allowedActions.includes(action)) {
      return false;
    }

    // 許可された組織をチェック
    if (organizationId && this.config.allowedOrganizations) {
      if (!this.config.allowedOrganizations.includes(organizationId)) {
        return false;
      }
    }

    return true;
  }
}

/**
 * 監査ログを記録
 */
export function logAuditEvent(
  action: string,
  options: {
    userId?: string;
    resource?: string;
    organizationId?: string;
    details?: Record<string, any>;
    success?: boolean;
    errorMessage?: string;
  } = {}
): void {
  if (typeof window === 'undefined') return;

  try {
    const logs = getAuditLogs(MAX_AUDIT_LOGS);
    
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      userId: options.userId,
      resource: options.resource,
      organizationId: options.organizationId,
      details: options.details,
      ipAddress: getClientIP(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      timestamp: new Date(),
      success: options.success !== false,
      errorMessage: options.errorMessage,
    };

    logs.push(entry);

    // 最新MAX_AUDIT_LOGS件のみ保持
    const recentLogs = logs.slice(-MAX_AUDIT_LOGS);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(recentLogs));

    console.log('[Security] 監査ログを記録:', {
      action,
      resource: options.resource,
      success: entry.success,
    });
  } catch (error) {
    console.error('[Security] 監査ログの記録エラー:', error);
  }
}

/**
 * 監査ログを取得
 */
export function getAuditLogs(limit: number = 1000): AuditLogEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const logs = JSON.parse(
      localStorage.getItem(AUDIT_LOG_KEY) || '[]'
    ) as AuditLogEntry[];

    return logs.slice(-limit).map(log => ({
      ...log,
      timestamp: new Date(log.timestamp),
    }));
  } catch (error) {
    console.error('[Security] 監査ログの取得エラー:', error);
    return [];
  }
}

/**
 * 監査ログをフィルタリング
 */
export function filterAuditLogs(
  filters: {
    action?: string;
    userId?: string;
    organizationId?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
  }
): AuditLogEntry[] {
  const logs = getAuditLogs(MAX_AUDIT_LOGS);

  return logs.filter(log => {
    if (filters.action && log.action !== filters.action) return false;
    if (filters.userId && log.userId !== filters.userId) return false;
    if (filters.organizationId && log.organizationId !== filters.organizationId) return false;
    if (filters.success !== undefined && log.success !== filters.success) return false;
    if (filters.startDate && log.timestamp < filters.startDate) return false;
    if (filters.endDate && log.timestamp > filters.endDate) return false;
    return true;
  });
}

/**
 * クライアントIPアドレスを取得（簡易版）
 */
function getClientIP(): string {
  // ブラウザ環境では実際のIPアドレスを取得できないため、簡易的な識別子を返す
  // 本番環境ではサーバー側でIPアドレスを取得する必要がある
  return 'browser_client';
}

/**
 * セキュアな検索関数（入力検証と監査ログ付き）
 */
export function createSecureSearchFunction<T extends (...args: any[]) => Promise<any>>(
  searchFunction: T,
  options: {
    actionName?: string;
    requireAuth?: boolean;
    validateInput?: (query: string) => { valid: boolean; error?: string };
  } = {}
): T {
  return (async (...args: Parameters<T>) => {
    const query = args[0] as string;
    const actionName = options.actionName || 'search';

    // 入力検証
    const validator = options.validateInput || InputValidator.validateQuery;
    const validation = validator(query);

    if (!validation.valid) {
      logAuditEvent(actionName, {
        resource: query,
        success: false,
        errorMessage: validation.error,
      });
      throw new Error(validation.error || '入力検証に失敗しました');
    }

    // アクセス制御（必要に応じて）
    if (options.requireAuth) {
      // 認証チェックを実装
    }

    try {
      // 検索を実行
      const result = await searchFunction(...args);

      // 成功ログ
      logAuditEvent(actionName, {
        resource: query,
        success: true,
        details: {
          resultCount: Array.isArray(result) ? result.length : 1,
        },
      });

      return result;
    } catch (error) {
      // エラーログ
      logAuditEvent(actionName, {
        resource: query,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }) as T;
}

/**
 * すべての監査ログをクリア
 */
export function clearAuditLogs(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(AUDIT_LOG_KEY);
    console.log('[Security] すべての監査ログをクリアしました');
  } catch (error) {
    console.error('[Security] 監査ログのクリアエラー:', error);
  }
}
