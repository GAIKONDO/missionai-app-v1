/**
 * 実行監視タブコンテンツ
 */

'use client';

import { useEffect, useState } from 'react';
import type { TaskExecution } from '@/lib/agent-system/types';
import { ExecutionStatus } from '@/lib/agent-system/types';
import { getAllTaskExecutions } from '@/lib/agent-system/taskManager';
import { getAgentOrchestrator } from '@/lib/agent-system/agentOrchestrator';
import { ExecutionCard } from './ExecutionCard';
import { showToast } from '@/components/Toast';

interface ExecutionsTabContentProps {
  executions: TaskExecution[];
  onExecutionsUpdate: (executions: TaskExecution[]) => void;
}

export function ExecutionsTabContent({ executions, onExecutionsUpdate }: ExecutionsTabContentProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 実行中のタスクがある場合、定期的に更新
  useEffect(() => {
    const hasRunningTasks = executions.some(exec => exec.status === ExecutionStatus.RUNNING || exec.status === ExecutionStatus.PENDING);
    
    if (!hasRunningTasks) return;

    const interval = setInterval(async () => {
      try {
        setIsRefreshing(true);
        const updatedExecutions = await getAllTaskExecutions();
        onExecutionsUpdate(updatedExecutions);
      } catch (error) {
        console.error('実行履歴の更新に失敗:', error);
      } finally {
        setIsRefreshing(false);
      }
    }, 2000); // 2秒ごとに更新

    return () => clearInterval(interval);
  }, [executions, onExecutionsUpdate]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const updatedExecutions = await getAllTaskExecutions();
      onExecutionsUpdate(updatedExecutions);
    } catch (error) {
      console.error('実行履歴の更新に失敗:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCancelExecution = async (executionId: string) => {
    try {
      const orchestrator = getAgentOrchestrator();
      await orchestrator.cancelExecution(executionId);
      
      // 実行履歴を更新
      const updatedExecutions = await getAllTaskExecutions();
      onExecutionsUpdate(updatedExecutions);
      showToast('実行をキャンセルしました', 'info');
    } catch (error) {
      console.error('実行のキャンセルに失敗:', error);
      showToast(`実行のキャンセルに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`, 'error');
    }
  };

  const runningCount = executions.filter(exec => exec.status === ExecutionStatus.RUNNING || exec.status === ExecutionStatus.PENDING).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>
          実行履歴
          {runningCount > 0 && (
            <span style={{ marginLeft: '12px', fontSize: '14px', color: '#f57f17', fontWeight: 500 }}>
              ({runningCount}件実行中)
            </span>
          )}
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{
            padding: '8px 16px',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isRefreshing ? 0.6 : 1,
          }}
        >
          {isRefreshing ? '更新中...' : '更新'}
        </button>
      </div>

      {executions.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <p>実行履歴がありません。</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {executions.map(execution => (
            <ExecutionCard
              key={execution.id}
              execution={execution}
              onCancel={
                (execution.status === ExecutionStatus.RUNNING || execution.status === ExecutionStatus.PENDING)
                  ? () => handleCancelExecution(execution.id)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

