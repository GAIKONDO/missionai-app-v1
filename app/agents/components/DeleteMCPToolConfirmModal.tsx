/**
 * MCPツール削除確認モーダル
 */

'use client';

import React from 'react';
import { deleteMCPTool } from '@/lib/mcp/toolStorage';
import { showToast } from '@/components/Toast';

interface DeleteMCPToolConfirmModalProps {
  isOpen: boolean;
  toolName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteMCPToolConfirmModal({
  isOpen,
  toolName,
  onClose,
  onConfirm,
}: DeleteMCPToolConfirmModalProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteMCPTool(toolName);
      showToast(`ツール「${toolName}」を削除しました`, 'success');
      onConfirm();
    } catch (error: any) {
      console.error('ツール削除エラー:', error);
      showToast('ツールの削除に失敗しました', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

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
        zIndex: 2000,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '16px',
          }}
        >
          ツールの削除確認
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
          ツール「<strong style={{ fontFamily: 'monospace' }}>{toolName}</strong>」を削除してもよろしいですか？
          <br />
          この操作は取り消せません。
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={isDeleting}
            style={{
              padding: '8px 16px',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              padding: '8px 16px',
              background: '#F44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
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

