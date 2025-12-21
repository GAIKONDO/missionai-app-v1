/**
 * タスク管理タブコンテンツ
 */

'use client';

import { useState } from 'react';
import type { Task, Agent, TaskExecution } from '@/lib/agent-system/types';
import { ExecutionStatus } from '@/lib/agent-system/types';
import { saveTask, deleteTask } from '@/lib/agent-system/taskManager';
import { getAgentOrchestrator } from '@/lib/agent-system/agentOrchestrator';
import { createTaskFromTemplate } from '@/lib/agent-system/taskTemplates';
import type { TaskTemplate } from '@/lib/agent-system/taskTemplates';
import { NewTaskModal } from './NewTaskModal';
import { TemplateModal } from './TemplateModal';
import { DeleteTaskConfirmModal } from './DeleteTaskConfirmModal';
import { TaskCard } from './TaskCard';
import { showToast } from '@/components/Toast';

interface TasksTabContentProps {
  tasks: Task[];
  agents: Agent[];
  templates: TaskTemplate[];
  executions: TaskExecution[];
  onTasksUpdate: (tasks: Task[]) => void;
  onExecutionsUpdate: (executions: TaskExecution[]) => void;
}

export function TasksTabContent({
  tasks,
  agents,
  templates,
  executions,
  onTasksUpdate,
  onExecutionsUpdate,
}: TasksTabContentProps) {
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [executingTaskIds, setExecutingTaskIds] = useState<Set<string>>(new Set());

  const handleSaveNewTask = async (task: Task) => {
    try {
      await saveTask(task);
      onTasksUpdate([...tasks, task]);
      setShowNewTaskModal(false);
      showToast('タスクを作成しました', 'success');
    } catch (error: any) {
      console.error('タスク保存エラー:', error);
      showToast(`タスク保存エラー: ${error.message || error}`, 'error');
    }
  };

  const handleExecuteFromTemplate = async (template: TaskTemplate, parameters: Record<string, any>) => {
    try {
      const task = createTaskFromTemplate(template, { parameters });
      const orchestrator = getAgentOrchestrator();
      
      // 実行開始
      setExecutingTaskIds(prev => new Set(prev).add(task.id));
      
      // 実行開始時に実行履歴を更新（PENDING状態で表示）
      const pendingExecution: TaskExecution = {
        id: `pending-${task.id}-${Date.now()}`,
        taskId: task.id,
        agentId: task.agentId || '',
        status: ExecutionStatus.PENDING,
        startedAt: Date.now(),
        logs: [],
      };
      onExecutionsUpdate([pendingExecution, ...executions]);
      
      // 非同期で実行（UIをブロックしない）
      orchestrator.executeTask(task).then(execution => {
        // 実行完了時に実行履歴を更新（PENDINGを実際の実行結果で置き換え）
        onExecutionsUpdate([execution, ...executions.filter(e => e.id !== pendingExecution.id)]);
        setExecutingTaskIds(prev => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
        
        if (execution.status === ExecutionStatus.COMPLETED) {
          showToast(`タスク "${task.name}" の実行が完了しました`, 'success');
        } else {
          showToast(`タスク "${task.name}" の実行が失敗しました: ${execution.error || '不明なエラー'}`, 'error');
        }
      }).catch(error => {
        setExecutingTaskIds(prev => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
        // エラー時もPENDINGを削除
        onExecutionsUpdate(executions.filter(e => e.id !== pendingExecution.id));
        showToast(`タスク実行エラー: ${error.message}`, 'error');
      });
      
      setShowTemplateModal(false);
    } catch (error: any) {
      showToast(`タスク実行エラー: ${error.message}`, 'error');
    }
  };

  const handleExecuteTask = async (task: Task) => {
    try {
      const orchestrator = getAgentOrchestrator();
      
      // 実行開始
      setExecutingTaskIds(prev => new Set(prev).add(task.id));
      
      // 実行開始時に実行履歴を更新（PENDING状態で表示）
      const pendingExecution: TaskExecution = {
        id: `pending-${task.id}-${Date.now()}`,
        taskId: task.id,
        agentId: task.agentId || '',
        status: ExecutionStatus.PENDING,
        startedAt: Date.now(),
        logs: [],
      };
      onExecutionsUpdate([pendingExecution, ...executions]);
      
      // 非同期で実行（UIをブロックしない）
      orchestrator.executeTask(task).then(execution => {
        // 実行完了時に実行履歴を更新（PENDINGを実際の実行結果で置き換え）
        onExecutionsUpdate([execution, ...executions.filter(e => e.id !== pendingExecution.id)]);
        setExecutingTaskIds(prev => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
        
        if (execution.status === ExecutionStatus.COMPLETED) {
          showToast(`タスク "${task.name}" の実行が完了しました`, 'success');
        } else {
          showToast(`タスク "${task.name}" の実行が失敗しました: ${execution.error || '不明なエラー'}`, 'error');
        }
      }).catch(error => {
        setExecutingTaskIds(prev => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
        // エラー時もPENDINGを削除
        onExecutionsUpdate(executions.filter(e => e.id !== pendingExecution.id));
        showToast(`タスク実行エラー: ${error.message}`, 'error');
      });
    } catch (error: any) {
      showToast(`タスク実行エラー: ${error.message}`, 'error');
    }
  };

  const handleDeleteTask = (task: Task) => {
    setDeleteConfirmTask(task);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTask) return;

    setIsDeleting(true);
    try {
      await deleteTask(deleteConfirmTask.id);
      onTasksUpdate(tasks.filter(t => t.id !== deleteConfirmTask.id));
      setDeleteConfirmTask(null);
      showToast('タスクを削除しました', 'success');
    } catch (error: any) {
      console.error('タスク削除エラー:', error);
      showToast(`タスク削除エラー: ${error.message || error}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setDeleteConfirmTask(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>タスク一覧</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowTemplateModal(true)}
            style={{
              padding: '8px 16px',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            テンプレートから作成
          </button>
          <button
            onClick={() => setShowNewTaskModal(true)}
            style={{
              padding: '8px 16px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            新規タスク作成
          </button>
        </div>
      </div>

      {/* 新規タスク作成モーダル */}
      {showNewTaskModal && (
        <NewTaskModal
          agents={agents}
          onClose={() => setShowNewTaskModal(false)}
          onSave={handleSaveNewTask}
        />
      )}

      {/* テンプレートモーダル */}
      {showTemplateModal && (
        <TemplateModal
          templates={templates}
          onClose={() => setShowTemplateModal(false)}
          onExecute={handleExecuteFromTemplate}
        />
      )}

      {/* 削除確認モーダル */}
      <DeleteTaskConfirmModal
        isOpen={deleteConfirmTask !== null}
        task={deleteConfirmTask}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {tasks.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <p>タスクがありません。新規タスクを作成してください。</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onExecute={() => handleExecuteTask(task)}
              onDelete={() => handleDeleteTask(task)}
              isExecuting={executingTaskIds.has(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

