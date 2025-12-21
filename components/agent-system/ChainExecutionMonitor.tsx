/**
 * チェーン実行監視コンポーネント
 * 実行中のチェーンの状態をリアルタイムで監視
 */

'use client';

import { useState, useEffect } from 'react';
import type { ChainExecutionResult } from '@/lib/agent-system/taskChain';
import type { ExecutionStatus } from '@/lib/agent-system/types';
import { ExecutionStatus as ES } from '@/lib/agent-system/types';
import { ExecutionResultView } from './ExecutionResultView';

interface ChainExecutionMonitorProps {
  executionId: string;
  chainId: string;
  onClose?: () => void;
}

export function ChainExecutionMonitor({ executionId, chainId, onClose }: ChainExecutionMonitorProps) {
  const [executionResult, setExecutionResult] = useState<ChainExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);

  useEffect(() => {
    // 実行状態をポーリング（将来実装: WebSocketやイベントストリームを使用）
    const interval = setInterval(() => {
      // 将来的にAPIから実行状態を取得
      // 現時点ではモック実装
      checkExecutionStatus();
    }, 1000);

    return () => clearInterval(interval);
  }, [executionId]);

  const checkExecutionStatus = async () => {
    // 将来的にAPIから実行状態を取得
    // 現時点ではモック実装
    // const result = await getChainExecutionStatus(executionId);
    // setExecutionResult(result);
    // setIsRunning(result.status === ES.RUNNING);
    // if (result.executionPath.length > 0) {
    //   setCurrentNodeId(result.executionPath[result.executionPath.length - 1]);
    // }
  };

  if (!executionResult && isRunning) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
            チェーン実行中...
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '6px 12px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                cursor: 'pointer',
                color: 'var(--color-text)',
              }}
            >
              閉じる
            </button>
          )}
        </div>

        <div style={{ padding: '20px', background: 'var(--color-surface)', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '4px solid var(--color-primary)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto',
              }}
            />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            チェーンを実行中です...
          </p>
          {currentNodeId && (
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              現在のノード: {currentNodeId}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (executionResult) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
            実行結果
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '6px 12px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                cursor: 'pointer',
                color: 'var(--color-text)',
              }}
            >
              閉じる
            </button>
          )}
        </div>

        <ExecutionResultView executionResult={executionResult} />
      </div>
    );
  }

  return null;
}

