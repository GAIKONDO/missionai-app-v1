/**
 * 実行履歴カードコンポーネント
 */

'use client';

import { useState } from 'react';
import type { TaskExecution } from '@/lib/agent-system/types';
import { ExecutionStatus } from '@/lib/agent-system/types';

interface ExecutionCardProps {
  execution: TaskExecution;
  onCancel?: () => void;
}

export function ExecutionCard({ execution, onCancel }: ExecutionCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusStyle = (status: ExecutionStatus) => {
    switch (status) {
      case ExecutionStatus.COMPLETED:
        return { background: '#e8f5e9', color: '#2e7d32' };
      case ExecutionStatus.FAILED:
        return { background: '#ffebee', color: '#c62828' };
      case ExecutionStatus.RUNNING:
        return { background: '#fff9c4', color: '#f57f17' };
      default:
        return { background: '#f5f5f5', color: '#616161' };
    }
  };

  const statusStyle = getStatusStyle(execution.status);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP');
  };

  const formatDuration = () => {
    if (!execution.startedAt) return '-';
    const endTime = execution.completedAt || Date.now();
    const duration = endTime - execution.startedAt;
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}秒`;
    return `${Math.floor(duration / 60000)}分${Math.floor((duration % 60000) / 1000)}秒`;
  };

  return (
    <div
      style={{
        padding: '16px',
        border: '1px solid var(--color-border-color)',
        borderRadius: '8px',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                background: statusStyle.background,
                color: statusStyle.color,
              }}
            >
              {execution.status}
            </span>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Agent: {execution.agentId}
            </span>
            {onCancel && (
              <button
                onClick={onCancel}
                style={{
                  padding: '4px 12px',
                  background: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                キャンセル
              </button>
            )}
            {execution.taskId && (
              <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                タスクID: {execution.taskId}
              </span>
            )}
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              実行時間: {formatDuration()}
            </span>
          </div>
          {execution.startedAt && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              開始: {formatDate(execution.startedAt)}
              {execution.completedAt && ` | 完了: ${formatDate(execution.completedAt)}`}
            </div>
          )}
          {execution.error && (
            <p style={{ fontSize: '12px', color: '#c62828', marginTop: '8px', marginBottom: '8px' }}>
              エラー: {execution.error}
            </p>
          )}
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              padding: '4px 12px',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              marginTop: '8px',
            }}
          >
            {showDetails ? '詳細を隠す' : '詳細を表示'}
          </button>
        </div>
      </div>

      {showDetails && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border-color)' }}>
          {execution.result && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
                実行結果
              </h4>
              <pre
                style={{
                  padding: '12px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '300px',
                  color: 'var(--color-text)',
                }}
              >
                {JSON.stringify(execution.result, null, 2)}
              </pre>
            </div>
          )}

          {execution.logs && execution.logs.length > 0 && (
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
                実行ログ ({execution.logs.length}件)
              </h4>
              <div
                style={{
                  padding: '12px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  maxHeight: '300px',
                  overflow: 'auto',
                }}
              >
                {execution.logs.map((log, index) => {
                  const logColor =
                    log.level === 'error'
                      ? '#c62828'
                      : log.level === 'warn'
                      ? '#f57f17'
                      : 'var(--color-text)';
                  return (
                    <div
                      key={index}
                      style={{
                        padding: '4px 0',
                        borderBottom: index < execution.logs.length - 1 ? '1px solid var(--color-border-color)' : 'none',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ color: logColor, fontWeight: 500 }}>[{log.level.toUpperCase()}]</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {log.timestamp ? formatDate(log.timestamp) : '-'}
                        </span>
                      </div>
                      <div style={{ color: 'var(--color-text)', marginLeft: '16px' }}>{log.message}</div>
                      {log.data && (
                        <pre
                          style={{
                            marginLeft: '16px',
                            marginTop: '4px',
                            fontSize: '11px',
                            color: 'var(--color-text-secondary)',
                            overflow: 'auto',
                          }}
                        >
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(!execution.result || !execution.logs || execution.logs.length === 0) && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
              詳細情報がありません
            </div>
          )}
        </div>
      )}
    </div>
  );
}

