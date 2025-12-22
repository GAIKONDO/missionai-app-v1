/**
 * オーケストレーターキュー管理パネル
 */

'use client';

import { useState, useEffect } from 'react';
import { getAgentOrchestrator } from '@/lib/agent-system/agentOrchestrator';
import { agentRegistry } from '@/lib/agent-system/agentRegistry';
import { getAllTasks } from '@/lib/agent-system/taskManager';
import type { Task } from '@/lib/agent-system/types';
import { showToast } from '@/components/Toast';

interface QueuedTaskInfo {
  agentId: string;
  taskId: string;
  taskName: string;
  executionId: string;
  queuedAt?: number;
}

export function OrchestratorQueuePanel() {
  const [queuedTasks, setQueuedTasks] = useState<QueuedTaskInfo[]>([]);
  const [tasks, setTasks] = useState<Map<string, Task>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000); // 2秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const orchestrator = getAgentOrchestrator();
      const queued = orchestrator.getQueuedTasks();
      setQueuedTasks(queued);

      // タスク情報を取得
      const allTasks = await getAllTasks();
      const taskMap = new Map<string, Task>();
      for (const task of allTasks) {
        taskMap.set(task.id, task);
      }
      setTasks(taskMap);
    } catch (error) {
      console.error('キュー情報の取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTask = async (executionId: string) => {
    try {
      const orchestrator = getAgentOrchestrator();
      const removed = await orchestrator.removeTaskFromQueue(executionId);
      if (removed) {
        showToast('タスクをキューから削除しました', 'success');
        await loadData();
      } else {
        showToast('タスクが見つかりませんでした', 'error');
      }
    } catch (error) {
      console.error('タスク削除エラー:', error);
      showToast('タスクの削除に失敗しました', 'error');
    }
  };

  const handleClearQueue = async (agentId?: string) => {
    if (!confirm(agentId ? `このAgentのキューをクリアしますか？` : 'すべてのキューをクリアしますか？')) {
      return;
    }

    try {
      const orchestrator = getAgentOrchestrator();
      const clearedCount = await orchestrator.clearQueue(agentId);
      showToast(`${clearedCount}個のタスクをキューから削除しました`, 'success');
      await loadData();
    } catch (error) {
      console.error('キュークリアエラー:', error);
      showToast('キューのクリアに失敗しました', 'error');
    }
  };

  if (loading && queuedTasks.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (queuedTasks.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', borderRadius: '8px' }}>
        <p>キュー内のタスクはありません</p>
      </div>
    );
  }

  // Agent別にグループ化
  const tasksByAgent = new Map<string, QueuedTaskInfo[]>();
  for (const queuedTask of queuedTasks) {
    if (!tasksByAgent.has(queuedTask.agentId)) {
      tasksByAgent.set(queuedTask.agentId, []);
    }
    tasksByAgent.get(queuedTask.agentId)!.push(queuedTask);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--color-text)',
            margin: 0,
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-color)',
          }}
        >
          キュー内タスク ({queuedTasks.length}個)
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleClearQueue()}
            style={{
              padding: '6px 12px',
              background: '#F44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            全キュークリア
          </button>
          <button
            onClick={loadData}
            style={{
              padding: '6px 12px',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            更新
          </button>
        </div>
      </div>

      {Array.from(tasksByAgent.entries()).map(([agentId, agentQueuedTasks]) => {
        const agent = agentRegistry.getDefinition(agentId);
        const task = tasks.get(agentQueuedTasks[0]?.taskId);

        return (
          <div
            key={agentId}
            style={{
              padding: '20px',
              background: 'var(--color-surface)',
              borderRadius: '8px',
              border: '1px solid var(--color-border-color)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  margin: 0,
                }}
              >
                {agent?.name || agentId} ({agentQueuedTasks.length}個)
              </h4>
              <button
                onClick={() => handleClearQueue(agentId)}
                style={{
                  padding: '4px 8px',
                  background: '#F44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                このキューをクリア
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {agentQueuedTasks.map((queuedTask, index) => {
                const taskInfo = tasks.get(queuedTask.taskId);
                return (
                  <div
                    key={queuedTask.executionId}
                    style={{
                      padding: '12px',
                      background: 'var(--color-background)',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            background: 'var(--color-primary)',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 500,
                          }}
                        >
                          #{index + 1}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                          {taskInfo?.name || queuedTask.taskName || queuedTask.taskId}
                        </span>
                      </div>
                      {taskInfo?.description && (
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                          {taskInfo.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {queuedTask.queuedAt && (
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          {new Date(queuedTask.queuedAt).toLocaleTimeString()}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        実行ID: {queuedTask.executionId.slice(0, 8)}...
                      </div>
                      <button
                        onClick={() => handleRemoveTask(queuedTask.executionId)}
                        style={{
                          padding: '4px 8px',
                          background: '#F44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                        title="キューから削除"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

