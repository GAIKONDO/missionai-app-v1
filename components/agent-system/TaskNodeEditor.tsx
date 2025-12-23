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
      <div style={{ marginBottom: '24px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '12px', 
          fontWeight: 600, 
          color: 'var(--color-text)',
          fontSize: '14px'
        }}>
          タスクの選択
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => {
              setCreateNewTask(false);
              if (tasks.length > 0) {
                handleTaskSelect(tasks[0].id);
              }
            }}
            style={{
              padding: '10px 16px',
              background: !createNewTask ? 'linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%)' : 'var(--color-surface)',
              color: !createNewTask ? 'white' : 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              boxShadow: !createNewTask ? '0 2px 4px rgba(31, 41, 51, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (createNewTask) {
                e.currentTarget.style.background = 'var(--color-background)';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (createNewTask) {
                e.currentTarget.style.background = 'var(--color-surface)';
                e.currentTarget.style.borderColor = 'var(--color-border-color)';
              }
            }}
          >
            既存のタスクを選択
          </button>
          <button
            onClick={handleCreateNewTask}
            style={{
              padding: '10px 16px',
              background: createNewTask ? 'linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%)' : 'var(--color-surface)',
              color: createNewTask ? 'white' : 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              boxShadow: createNewTask ? '0 2px 4px rgba(31, 41, 51, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (!createNewTask) {
                e.currentTarget.style.background = 'var(--color-background)';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!createNewTask) {
                e.currentTarget.style.background = 'var(--color-surface)';
                e.currentTarget.style.borderColor = 'var(--color-border-color)';
              }
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
              padding: '12px 16px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31, 41, 51, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-color)';
              e.currentTarget.style.boxShadow = 'none';
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
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 600, 
              color: 'var(--color-text)',
              fontSize: '14px'
            }}>
              タスク名 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={chainNode.task.name}
              onChange={(e) => handleTaskUpdate('name', e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31, 41, 51, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-color)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 600, 
              color: 'var(--color-text)',
              fontSize: '14px'
            }}>
              説明
            </label>
            <textarea
              value={chainNode.task.description || ''}
              onChange={(e) => handleTaskUpdate('description', e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                minHeight: '100px',
                resize: 'vertical',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31, 41, 51, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-color)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 600, 
                color: 'var(--color-text)',
                fontSize: '14px'
              }}>
                タスクタイプ
              </label>
              <select
                value={chainNode.task.type}
                onChange={(e) => handleTaskUpdate('type', e.target.value as TaskType)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31, 41, 51, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {Object.values(TaskType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 600, 
                color: 'var(--color-text)',
                fontSize: '14px'
              }}>
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
                  padding: '12px 16px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31, 41, 51, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

