'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

/**
 * React Error Boundaryコンポーネント
 * 
 * 子コンポーネントで発生したエラーをキャッチし、
 * エラー画面を表示します。
 * 
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // エラーIDを生成（デバッグ用）
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラー情報をログに記録
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);

    // エラーを状態に保存
    this.setState({
      error,
      errorInfo,
    });

    // カスタムエラーハンドラーが指定されている場合は呼び出す
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 本番環境ではエラーログを送信（必要に応じて実装）
    if (process.env.NODE_ENV === 'production') {
      // エラーログ送信サービスに送信する処理をここに追加
      // 例: Sentry, LogRocket, カスタムAPIなど
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // resetKeysが変更された場合、エラーをリセット
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // resetOnPropsChangeがtrueの場合、propsが変更されたらリセット
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // カスタムフォールバックが指定されている場合はそれを使用
      if (fallback) {
        return fallback;
      }

      // デフォルトのエラー表示
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: 'var(--color-background, #F9FAFB)',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '32px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--color-border-color, #E5E7EB)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(220, 53, 69, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '16px',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#dc3545"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#dc3545',
                  margin: 0,
                }}
              >
                エラーが発生しました
              </h2>
            </div>

            <div
              style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: 'rgba(220, 53, 69, 0.05)',
                borderRadius: '6px',
                border: '1px solid rgba(220, 53, 69, 0.2)',
              }}
            >
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: 'var(--color-text, #111827)',
                  margin: '0 0 12px 0',
                }}
              >
                <strong>エラーメッセージ:</strong>
              </p>
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: '#dc3545',
                  margin: '0 0 16px 0',
                  fontFamily: 'monospace',
                  wordBreak: 'break-word',
                }}
              >
                {error?.message || '不明なエラーが発生しました'}
              </p>

              {errorId && (
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-light, #6B7280)',
                    margin: '8px 0 0 0',
                  }}
                >
                  エラーID: {errorId}
                </p>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && errorInfo && (
              <details
                style={{
                  marginBottom: '24px',
                  padding: '16px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border-color, #E5E7EB)',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--color-text, #111827)',
                    marginBottom: '12px',
                  }}
                >
                  詳細情報（開発環境のみ）
                </summary>
                <pre
                  style={{
                    fontSize: '12px',
                    lineHeight: '1.5',
                    color: '#666',
                    overflow: 'auto',
                    maxHeight: '300px',
                    margin: 0,
                    padding: '12px',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border-color, #E5E7EB)',
                  }}
                >
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={this.resetErrorBoundary}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#fff',
                  backgroundColor: 'var(--color-primary, #1F2933)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-secondary, #2E3440)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary, #1F2933)';
                }}
              >
                再試行
              </button>

              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-text, #111827)',
                  backgroundColor: '#fff',
                  border: '1px solid var(--color-border-color, #E5E7EB)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-background, #F9FAFB)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
              >
                ページを再読み込み
              </button>
            </div>

            <p
              style={{
                fontSize: '12px',
                color: 'var(--color-text-light, #6B7280)',
                marginTop: '20px',
                lineHeight: '1.6',
              }}
            >
              問題が続く場合は、ブラウザのコンソール（F12）を確認するか、
              開発者にお問い合わせください。
            </p>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * 関数コンポーネント用のエラーバウンダリーフック（将来の拡張用）
 * 現在はクラスコンポーネントのみサポート
 */
export default ErrorBoundary;

