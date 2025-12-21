/**
 * タスクノードエディタ
 */

'use client';

import { useState, useEffect } from 'react';
import type { ChainNode } from '@/lib/agent-system/taskChain';
import type { Task } from '@/lib/agent-system/types';
import { getAllTasks } from '@/lib/agent-system/taskManager';
import { TaskType } from '@/lib/agent-system/types';
import { generateId } from '@/lib/agent-system/utils';

interface TaskNodeEditorProps {
  chainNode: ChainNode;
  onChange: (node: ChainNode) => void;
  availableTasks?: Task[];
}

export function TaskNodeEditor({ chainNode, onChange, availableTasks = [] }: TaskNodeEditorProps) {
  const [tasks, setTasks] = useState<Task[]>(availableTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    chainNode.task?.id || null
  );
  const [createNewTask, setCreateNewTask] = useState(!chainNode.task);

  useEffect(() => {
    if (availableTasks.length === 0) {
      loadTasks();
    }
  }, []);

  const loadTasks = async () => {
    try {
      const allTasks = await getAllTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error('タスク読み込みエラー:', error);
    }
  };

  const handleTaskSelect = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setSelectedTaskId(taskId);
      onChange({
        ...chainNode,
        task: { ...task },
      });
    }
  };

  const handleCreateNewTask = () => {
    const newTask: Task = {
      id: generateId(),
      name: '新しいタスク',
      description: '',
      type: TaskType.GENERAL,
      parameters: {},
      priority: 5,
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onChange({
      ...chainNode,
      task: newTask,
    });
    setCreateNewTask(true);
  };

  const handleTaskUpdate = (field: keyof Task, value: any) => {
    if (chainNode.task) {
      onChange({
        ...chainNode,
        task: {
          ...chainNode.task,
          [field]: value,
          updatedAt: Date.now(),
        },
      });
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
          タスクの選択
        </label>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <button
            onClick={() => {
              setCreateNewTask(false);
              if (tasks.length > 0) {
                handleTaskSelect(tasks[0].id);
              }
            }}
            style={{
              padding: '6px 12px',
              background: !createNewTask ? 'var(--color-primary)' : 'var(--color-surface)',
              color: !createNewTask ? 'white' : 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            既存のタスクを選択
          </button>
          <button
            onClick={handleCreateNewTask}
            style={{
              padding: '6px 12px',
              background: createNewTask ? 'var(--color-primary)' : 'var(--color-surface)',
              color: createNewTask ? 'white' : 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            新しいタスクを作成
          </button>
        </div>

        {!createNewTask && tasks.length > 0 && (
          <select
            value={selectedTaskId || ''}
            onChange={(e) => handleTaskSelect(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
            }}
          >
            <option value="">タスクを選択...</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name} ({task.type})
              </option>
            ))}
          </select>
        )}
      </div>

      {chainNode.task && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
              タスク名 *
            </label>
            <input
              type="text"
              value={chainNode.task.name}
              onChange={(e) => handleTaskUpdate('name', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
              説明
            </label>
            <textarea
              value={chainNode.task.description || ''}
              onChange={(e) => handleTaskUpdate('description', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                minHeight: '80px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
              タスクタイプ
            </label>
            <select
              value={chainNode.task.type}
              onChange={(e) => handleTaskUpdate('type', e.target.value as TaskType)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
            >
              {Object.values(TaskType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
              優先度 (1-10)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={chainNode.task.priority}
              onChange={(e) => handleTaskUpdate('priority', parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

