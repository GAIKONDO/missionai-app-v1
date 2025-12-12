/**
 * RAG検索エラーの型定義とエラーハンドリング
 */

export enum RAGSearchErrorType {
  EMBEDDING_GENERATION_FAILED = 'EMBEDDING_GENERATION_FAILED',
  CHROMADB_CONNECTION_FAILED = 'CHROMADB_CONNECTION_FAILED',
  CHROMADB_SEARCH_FAILED = 'CHROMADB_SEARCH_FAILED',
  SQLITE_SEARCH_FAILED = 'SQLITE_SEARCH_FAILED',
  NO_DATA_FOUND = 'NO_DATA_FOUND',
  INVALID_QUERY = 'INVALID_QUERY',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class RAGSearchError extends Error {
  constructor(
    public type: RAGSearchErrorType,
    message: string,
    public originalError?: Error,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'RAGSearchError';
    
    // スタックトレースを保持
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }
  }
  
  /**
   * ユーザー向けのエラーメッセージを取得
   */
  getUserMessage(): string {
    switch (this.type) {
      case RAGSearchErrorType.EMBEDDING_GENERATION_FAILED:
        return '埋め込みベクトルの生成に失敗しました。APIキーを確認してください。';
      case RAGSearchErrorType.CHROMADB_CONNECTION_FAILED:
        return 'ChromaDBへの接続に失敗しました。SQLiteで検索を続行します。';
      case RAGSearchErrorType.CHROMADB_SEARCH_FAILED:
        return 'ChromaDBでの検索に失敗しました。SQLiteで検索を続行します。';
      case RAGSearchErrorType.SQLITE_SEARCH_FAILED:
        return 'データベース検索に失敗しました。';
      case RAGSearchErrorType.NO_DATA_FOUND:
        return '検索結果が見つかりませんでした。別のキーワードで検索してください。';
      case RAGSearchErrorType.INVALID_QUERY:
        return '検索クエリが無効です。';
      default:
        return '検索中にエラーが発生しました。';
    }
  }
  
  /**
   * エラーをログに記録
   */
  log(): void {
    console.error(`[RAGSearchError] ${this.type}:`, {
      message: this.message,
      originalError: this.originalError,
      context: this.context,
      stack: this.stack,
    });
  }
  
  /**
   * エラーをJSON形式でシリアライズ
   */
  toJSON(): {
    type: RAGSearchErrorType;
    message: string;
    userMessage: string;
    context?: Record<string, any>;
  } {
    return {
      type: this.type,
      message: this.message,
      userMessage: this.getUserMessage(),
      context: this.context,
    };
  }
}

/**
 * エラーハンドリングヘルパー関数
 * エラーをRAGSearchErrorに変換
 */
export function handleRAGSearchError(
  error: unknown,
  context?: Record<string, any>
): RAGSearchError {
  if (error instanceof RAGSearchError) {
    return error;
  }
  
  const err = error as Error;
  const errorMessage = err?.message || String(error);
  
  // エラータイプを判定
  let type = RAGSearchErrorType.UNKNOWN_ERROR;
  
  if (errorMessage.includes('APIキー') || 
      errorMessage.includes('API key') || 
      errorMessage.includes('api key') ||
      errorMessage.includes('OpenAI APIキー') ||
      errorMessage.includes('埋め込み生成')) {
    type = RAGSearchErrorType.EMBEDDING_GENERATION_FAILED;
  } else if (errorMessage.includes('ChromaDB') || 
             errorMessage.includes('chromadb') ||
             errorMessage.includes('chroma')) {
    if (errorMessage.includes('接続') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('connect')) {
      type = RAGSearchErrorType.CHROMADB_CONNECTION_FAILED;
    } else {
      type = RAGSearchErrorType.CHROMADB_SEARCH_FAILED;
    }
  } else if (errorMessage.includes('SQLite') || 
             errorMessage.includes('sqlite') ||
             errorMessage.includes('データベース') ||
             errorMessage.includes('database')) {
    type = RAGSearchErrorType.SQLITE_SEARCH_FAILED;
  } else if (errorMessage.includes('no rows') || 
             errorMessage.includes('見つかりません') ||
             errorMessage.includes('not found') ||
             errorMessage.includes('データがありません')) {
    type = RAGSearchErrorType.NO_DATA_FOUND;
  } else if (errorMessage.includes('無効') || 
             errorMessage.includes('invalid') ||
             errorMessage.includes('空です')) {
    type = RAGSearchErrorType.INVALID_QUERY;
  }
  
  return new RAGSearchError(type, errorMessage, err, context);
}

/**
 * エラーを安全に処理し、フォールバック値を返す
 */
export function safeHandleRAGSearchError<T>(
  error: unknown,
  fallbackValue: T,
  context?: Record<string, any>
): T {
  const ragError = handleRAGSearchError(error, context);
  ragError.log();
  
  // ユーザー向けメッセージをコンソールに表示（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[RAGSearchError] ${ragError.getUserMessage()}`);
  }
  
  return fallbackValue;
}
