/**
 * タスクカードコンポーネント
 */

'use client';

import type { Task } from '@/lib/agent-system/types';

interface TaskCardProps {
  task: Task;
  onExecute: () => void;
  onDelete: () => void;
  isExecuting?: boolean;
}

export function TaskCard({ task, onExecute, onDelete, isExecuting = false }: TaskCardProps) {
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
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
            {task.name}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            {task.description}
          </p>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <span>タイプ: {task.type}</span>
            <span>優先度: {task.priority}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={onExecute}
            disabled={isExecuting}
            style={{
              padding: '6px 12px',
              background: isExecuting ? 'var(--color-text-secondary)' : 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isExecuting ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              opacity: isExecuting ? 0.6 : 1,
            }}
          >
            {isExecuting ? '実行中...' : '実行'}
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              opacity: 0.6,
              transition: 'opacity 0.2s, color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.color = '#f44336';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.6';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
            title="削除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

