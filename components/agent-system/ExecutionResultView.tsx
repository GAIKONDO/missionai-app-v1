/**
 * 実行結果表示コンポーネント
 */

'use client';

import type { ChainExecutionResult } from '@/lib/agent-system/taskChain';
import type { ExecutionStatus } from '@/lib/agent-system/types';
import { ExecutionStatus as ES } from '@/lib/agent-system/types';

interface ExecutionResultViewProps {
  executionResult: ChainExecutionResult;
}

export function ExecutionResultView({ executionResult }: ExecutionResultViewProps) {
  const getStatusColor = (status: ExecutionStatus) => {
    switch (status) {
      case ES.COMPLETED:
        return '#4caf50';
      case ES.FAILED:
        return '#f44336';
      case ES.RUNNING:
        return '#ff9800';
      case ES.PENDING:
        return '#9e9e9e';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusLabel = (status: ExecutionStatus) => {
    switch (status) {
      case ES.COMPLETED:
        return '完了';
      case ES.FAILED:
        return '失敗';
      case ES.RUNNING:
        return '実行中';
      case ES.PENDING:
        return '待機中';
      case ES.CANCELLED:
        return 'キャンセル';
      default:
        return status;
    }
  };

  const executionTime = executionResult.completedAt
    ? executionResult.completedAt - executionResult.startedAt
    : Date.now() - executionResult.startedAt;

  return (
    <div>
      {/* 実行概要 */}
      <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--color-surface)', borderRadius: '6px' }}>
        <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>ステータス</span>
            <div style={{ marginTop: '4px' }}>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 500,
                  background: getStatusColor(executionResult.status) + '20',
                  color: getStatusColor(executionResult.status),
                }}
              >
                {getStatusLabel(executionResult.status)}
              </span>
            </div>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>実行時間</span>
            <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
              {executionTime}ms
            </div>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>実行ノード数</span>
            <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
              {executionResult.executionPath.length}
            </div>
          </div>
        </div>

        {executionResult.error && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#ffebee', borderRadius: '4px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#c62828', fontWeight: 500 }}>
              エラー: {executionResult.error}
            </p>
          </div>
        )}
      </div>

      {/* 実行パス */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
          実行パス
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {executionResult.executionPath.map((nodeId, index) => {
            const nodeResult = executionResult.nodeResults.get(nodeId);
            const nodeStatus = nodeResult?.status || ES.PENDING;
            return (
              <div
                key={nodeId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                  {index + 1}.
                </span>
                <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{nodeId}</span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: getStatusColor(nodeStatus) + '20',
                    color: getStatusColor(nodeStatus),
                  }}
                >
                  {getStatusLabel(nodeStatus)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ノードごとの実行結果 */}
      <div>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
          ノード実行結果
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Array.from(executionResult.nodeResults.entries()).map(([nodeId, nodeResult]) => (
            <div
              key={nodeId}
              style={{
                padding: '16px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
                    {nodeId}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Agent: {nodeResult.agentId}
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: getStatusColor(nodeResult.status) + '20',
                    color: getStatusColor(nodeResult.status),
                  }}
                >
                  {getStatusLabel(nodeResult.status)}
                </span>
              </div>

              {nodeResult.error && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#ffebee', borderRadius: '4px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#c62828' }}>
                    エラー: {nodeResult.error}
                  </p>
                </div>
              )}

              {nodeResult.result && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                    実行結果:
                  </div>
                  <pre
                    style={{
                      padding: '12px',
                      background: 'var(--color-background)',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflow: 'auto',
                      maxHeight: '200px',
                      color: 'var(--color-text)',
                    }}
                  >
                    {JSON.stringify(nodeResult.result, null, 2)}
                  </pre>
                </div>
              )}

              {nodeResult.logs && nodeResult.logs.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                    実行ログ:
                  </div>
                  <div style={{ maxHeight: '150px', overflow: 'auto' }}>
                    {nodeResult.logs.map((log, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          color: log.level === 'error' ? '#c62828' : log.level === 'warn' ? '#f57c00' : 'var(--color-text-secondary)',
                          borderBottom: '1px solid var(--color-border-color)',
                        }}
                      >
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        {' '}
                        <span style={{ fontWeight: 500 }}>[{log.level.toUpperCase()}]</span>
                        {' '}
                        {log.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

