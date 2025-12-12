/**
 * Cursor起動ユーティリティ
 * 
 * Webアプリからローカルブリッジサーバー経由でCursorを起動する
 */

const BRIDGE_SERVER_URL = 'http://127.0.0.1:9999';

export interface OpenCursorOptions {
  /** 開くプロジェクトのパス */
  path: string;
  /** Cursorに渡す指示（オプション） */
  instruction?: string;
  /** エラーハンドリング用のコールバック */
  onError?: (error: Error) => void;
  /** 成功時のコールバック */
  onSuccess?: () => void;
}

export interface OpenCursorResult {
  success: boolean;
  message?: string;
  error?: string;
  instructionId?: string;
  wsUrl?: string;
  instructionFile?: string;
}

/**
 * ブリッジサーバーが稼働しているか確認
 */
export async function checkBridgeServer(): Promise<boolean> {
  try {
    const response = await fetch(`${BRIDGE_SERVER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000), // 2秒でタイムアウト
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Cursorを起動する
 * 
 * @param options オプション
 * @returns 実行結果
 */
export async function openCursor(options: OpenCursorOptions): Promise<OpenCursorResult> {
  const { path, instruction, onError, onSuccess } = options;

  try {
    // ブリッジサーバーの稼働確認
    const isServerRunning = await checkBridgeServer();
    
    if (!isServerRunning) {
      const error = new Error(
        'ブリッジサーバーが起動していません。\n' +
        'ターミナルで以下のコマンドを実行してください:\n' +
        'npm run cursor-bridge'
      );
      
      if (onError) {
        onError(error);
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    // ブリッジサーバーにリクエストを送信
    const endpoint = options.instruction 
      ? '/open-in-cursor-with-instruction'
      : '/open-in-cursor';
    
    const response = await fetch(`${BRIDGE_SERVER_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        path,
        instruction: options.instruction,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const error = new Error(data.error || 'Cursorの起動に失敗しました');
      
      if (onError) {
        onError(error);
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    if (onSuccess) {
      onSuccess();
    }

    return {
      success: true,
      message: data.message,
      instructionId: data.instructionId,
      wsUrl: data.wsUrl,
      instructionFile: data.instructionFile,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    if (onError) {
      onError(err);
    }
    
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * 現在のプロジェクトパスを取得（Next.js環境）
 * 
 * 注意: クライアントサイドでは実際のファイルシステムパスは取得できません。
 * プロジェクトのルートパスを環境変数や設定から取得するか、
 * 明示的にパスを指定してください。
 */
export function getCurrentProjectPath(): string | null {
  if (typeof window === 'undefined') {
    // サーバーサイドではプロセスカレントディレクトリを使用
    return process.cwd();
  }
  
  // クライアントサイドでは、環境変数から取得を試みる
  // または、プロジェクトルートを設定ファイルから読み込む
  // デフォルトでは null を返す（明示的な指定を推奨）
  return null;
}

