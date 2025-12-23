/**
 * タスクチェーンのタブコンテンツ
 */

'use client';

import { useState } from 'react';
import { ChainList } from '@/components/agent-system/ChainList';
import { ChainEditor } from '@/components/agent-system/ChainEditor';
import { DeleteChainConfirmModal } from '@/components/agent-system/DeleteChainConfirmModal';
import type { TaskChain } from '@/lib/agent-system/taskChain';
import { getTaskChainManager } from '@/lib/agent-system/taskChain';
import { saveTaskChain, deleteTaskChain, getAllTaskChains } from '@/lib/agent-system/taskManager';
import { showToast } from '@/components/Toast';

export function ChainTabContent() {
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [editingChainId, setEditingChainId] = useState<string | null>(null);
  const [deleteConfirmChain, setDeleteConfirmChain] = useState<TaskChain | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [listRefreshTrigger, setListRefreshTrigger] = useState(0);

  const handleSelectChain = (chainId: string) => {
    setSelectedChainId(chainId);
    setEditingChainId(chainId);
    setViewMode('editor');
  };

  const handleEditChain = (chainId: string) => {
    setEditingChainId(chainId);
    setViewMode('editor');
  };

  const handleDeleteChain = async (chainId: string) => {
    // データベースからチェーンを取得してモーダルを表示
    try {
      const chains = await getAllTaskChains();
      const chain = chains.find(c => c.id === chainId);
      if (chain) {
        setDeleteConfirmChain(chain);
      } else {
        showToast('チェーンが見つかりません', 'warning');
      }
    } catch (error) {
      console.error('チェーン取得エラー:', error);
      showToast('チェーンの取得に失敗しました', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmChain) return;

    setIsDeleting(true);
    try {
      await deleteTaskChain(deleteConfirmChain.id);
      setDeleteConfirmChain(null);
      // リストを更新
      setListRefreshTrigger(prev => prev + 1);
      showToast('チェーンを削除しました', 'success');
    } catch (error: any) {
      console.error('チェーン削除エラー:', error);
      showToast(`チェーン削除エラー: ${error.message || error}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setDeleteConfirmChain(null);
    }
  };

  const handleExecuteChain = async (chainId: string) => {
    const manager = getTaskChainManager();
    try {
      const result = await manager.executeChain(chainId);
      showToast(`チェーン実行が完了しました: ${result.status}`, 'success');
    } catch (error: any) {
      showToast(`チェーン実行エラー: ${error.message}`, 'error');
    }
  };

  const handleCreateChain = () => {
    setEditingChainId(null);
    setViewMode('editor');
  };

  const handleSaveChain = async (chain: TaskChain) => {
    try {
      // データベースに保存
      await saveTaskChain(chain);
      // メモリにも登録（実行時に使用）
      const manager = getTaskChainManager();
      manager.registerChain(chain);
      showToast('チェーンを保存しました', 'success');
      setViewMode('list');
      setEditingChainId(null);
    } catch (error: any) {
      console.error('チェーン保存エラー:', error);
      showToast(`チェーン保存エラー: ${error.message || error}`, 'error');
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setEditingChainId(null);
    setSelectedChainId(null);
  };

  if (viewMode === 'editor') {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--color-border-color)'
        }}>
          <div>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: 600, 
              color: 'var(--color-text)',
              marginBottom: '4px',
              letterSpacing: '-0.01em'
            }}>
              {editingChainId ? 'チェーンを編集' : '新しいチェーンを作成'}
            </h2>
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--color-text-secondary)',
              marginTop: '4px'
            }}>
              {editingChainId ? 'ワークフローを編集します' : 'ドラッグ&ドロップでワークフローを構築します'}
            </p>
          </div>
          <button
            onClick={handleBackToList}
            style={{
              padding: '10px 20px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--color-text)',
              fontWeight: 500,
              fontSize: '14px',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-background)';
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-surface)';
              e.currentTarget.style.borderColor = 'var(--color-border-color)';
            }}
          >
            <span>←</span>
            一覧に戻る
          </button>
        </div>
        <div style={{ 
          height: 'calc(100vh - 280px)', 
          minHeight: '600px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--color-border-color)',
          background: 'var(--color-surface)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <ChainEditor
            chainId={editingChainId || undefined}
            onSave={handleSaveChain}
            onExecute={(chain) => handleExecuteChain(chain.id)}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <ChainList
        onSelectChain={handleSelectChain}
        onEditChain={handleEditChain}
        onDeleteChain={handleDeleteChain}
        onExecuteChain={handleExecuteChain}
        onCreateChain={handleCreateChain}
        refreshTrigger={listRefreshTrigger}
      />
      <DeleteChainConfirmModal
        isOpen={deleteConfirmChain !== null}
        chain={deleteConfirmChain}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

