/**
 * タスク削除確認モーダル
 */

'use client';

import React from 'react';
import type { Task } from '@/lib/agent-system/types';

interface DeleteTaskConfirmModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteTaskConfirmModal({
  isOpen,
  task,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteTaskConfirmModalProps) {
  if (!isOpen || !task) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '20px' }}>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginBottom: '8px',
            }}
          >
            タスクを削除
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.6',
            }}
          >
            このタスクを削除してもよろしいですか？
          </p>
        </div>

        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid var(--color-border-color)',
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
              }}
            >
              タスク名:
            </span>
            <span
              style={{
                fontSize: '14px',
                color: 'var(--color-text)',
                marginLeft: '8px',
                fontWeight: 600,
              }}
            >
              {task.name}
            </span>
          </div>
          {task.description && (
            <div style={{ marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500,
                }}
              >
                説明:
              </span>
              <span
                style={{
                  fontSize: '14px',
                  color: 'var(--color-text)',
                  marginLeft: '8px',
                }}
              >
                {task.description}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <span>タイプ: {task.type}</span>
            <span>優先度: {task.priority}</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            disabled={isDeleting}
            style={{
              padding: '8px 16px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              color: 'var(--color-text)',
              fontSize: '14px',
              fontWeight: 500,
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              padding: '8px 16px',
              background: '#f44336',
              border: 'none',
              borderRadius: '6px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            {isDeleting ? '削除中...' : '削除'}
          </button>
        </div>
      </div>
    </div>
  );
}

