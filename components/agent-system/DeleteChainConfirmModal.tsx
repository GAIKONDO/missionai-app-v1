/**
 * タスクチェーン削除確認モーダル
 */

'use client';

import React from 'react';
import type { TaskChain } from '@/lib/agent-system/taskChain';

interface DeleteChainConfirmModalProps {
  isOpen: boolean;
  chain: TaskChain | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteChainConfirmModal({
  isOpen,
  chain,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteChainConfirmModalProps) {
  if (!isOpen || !chain) return null;

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
            チェーンを削除
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.6',
            }}
          >
            このチェーンを削除してもよろしいですか？
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
              チェーン名:
            </span>
            <span
              style={{
                fontSize: '14px',
                color: 'var(--color-text)',
                marginLeft: '8px',
                fontWeight: 600,
              }}
            >
              {chain.name}
            </span>
          </div>
          {chain.description && (
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
                {chain.description}
              </span>
            </div>
          )}
          <div>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
              }}
            >
              ノード数:
            </span>
            <span
              style={{
                fontSize: '14px',
                color: 'var(--color-text)',
                marginLeft: '8px',
              }}
            >
              {chain.nodes.size}
            </span>
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

