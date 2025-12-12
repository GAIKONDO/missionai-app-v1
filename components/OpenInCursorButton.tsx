/**
 * Open in Cursor ボタンコンポーネント
 * 
 * プロジェクトをCursorで開くためのボタン
 */

'use client';

import React, { useState } from 'react';
import { openCursor, checkBridgeServer, type OpenCursorOptions } from '@/lib/openCursor';

export interface OpenInCursorButtonProps {
  /** 開くプロジェクトのパス（省略時は現在のプロジェクト） */
  projectPath?: string;
  /** Cursorに渡す指示（オプション） */
  instruction?: string;
  /** ボタンのラベル */
  label?: string;
  /** ボタンのスタイル */
  className?: string;
  /** インラインスタイル */
  style?: React.CSSProperties;
  /** 成功時のコールバック */
  onSuccess?: () => void;
  /** エラー時のコールバック */
  onError?: (error: Error) => void;
}

export default function OpenInCursorButton({
  projectPath,
  instruction,
  label = 'Open in Cursor',
  className,
  style,
  onSuccess,
  onError,
}: OpenInCursorButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      // プロジェクトパスの決定
      // クライアントサイドでは、プロジェクトパスを明示的に指定する必要があります
      if (!projectPath) {
        const error = new Error('プロジェクトパスを指定してください');
        setLoading(false);
        setError(error.message);
        if (onError) {
          onError(error);
        }
        return;
      }
      
      const path = projectPath;

      const options: OpenCursorOptions = {
        path,
        instruction,
        onSuccess: () => {
          setLoading(false);
          if (onSuccess) {
            onSuccess();
          }
        },
        onError: (err) => {
          setLoading(false);
          setError(err.message);
          if (onError) {
            onError(err);
          }
        },
      };

      await openCursor(options);
    } catch (err) {
      setLoading(false);
      const errorMessage = err instanceof Error ? err.message : '予期しないエラーが発生しました';
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  };

  const defaultStyle: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: '#0066CC',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    ...style,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className}
        style={defaultStyle}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = '#0052A3';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = '#0066CC';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          }
        }}
      >
        {loading ? '⏳ 起動中...' : `📝 ${label}`}
      </button>
      {error && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            borderRadius: '6px',
            fontSize: '12px',
            border: '1px solid #FCA5A5',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

