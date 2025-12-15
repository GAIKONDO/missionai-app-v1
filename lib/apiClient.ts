/**
 * Rust APIサーバー用のクライアント
 * 開発環境・本番環境ともに直接Rust APIサーバーに接続
 * 注意: Next.js開発サーバーは3010、APIサーバーは3011を使用（開発環境では3010を使用する場合もある）
 */

// 開発環境では3010、本番環境では3011を使用
// 環境変数で明示的に設定されている場合はそれを使用
const API_SERVER_PORT = process.env.NEXT_PUBLIC_API_SERVER_PORT 
  ? parseInt(process.env.NEXT_PUBLIC_API_SERVER_PORT, 10)
  : (process.env.NODE_ENV === 'development' ? 3010 : 3011);

const API_BASE_URL = `http://127.0.0.1:${API_SERVER_PORT}`;

export interface ApiError {
  error: string;
}

/**
 * APIリクエストの基本関数
 */
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // エンドポイントが完全なURLでないことを確認
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  try {
    // タイムアウトを1秒に設定（Rust APIが応答しない場合はすぐにTauriコマンドにフォールバック）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || `API request failed: ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      // AbortErrorの場合はタイムアウト（ログを抑制）
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        // タイムアウトログを抑制（大量に出力されるため）
        throw new Error('API request timeout');
      }
      // CORSエラーやアクセス制御エラーの場合は、エラーログを抑制して再スロー
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('access control checks') ||
          errorMessage.includes('CORS') ||
          errorMessage.includes('Failed to fetch')) {
        // CORSエラーはフォールバック処理に進むため、エラーログを抑制
        throw error;
      }
      // ネットワークエラーの場合は詳細をログに出力
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.warn(`❌ [apiRequest] ネットワークエラー: ${url}`, error);
      }
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
}

/**
 * GETリクエスト
 */
export async function apiGet<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  let url = endpoint;
  if (params) {
    const queryString = Object.entries(params)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  return apiRequest<T>(url, {
    method: 'GET',
  });
}

/**
 * POSTリクエスト
 */
export async function apiPost<T>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUTリクエスト
 */
export async function apiPut<T>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETEリクエスト
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'DELETE',
  });
}

/**
 * ヘルスチェック
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const result = await apiGet<{ status: string }>('/health');
    return result.status === 'ok';
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

/**
 * APIサーバーが利用可能か確認（リトライ付き）
 */
export async function waitForApiServer(maxRetries: number = 10, delayMs: number = 500): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    if (await checkApiHealth()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return false;
}
