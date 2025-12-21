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
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>
            {editingChainId ? 'チェーンを編集' : 'チェーンを作成'}
          </h2>
          <button
            onClick={handleBackToList}
            style={{
              padding: '8px 16px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--color-text)',
            }}
          >
            ← 一覧に戻る
          </button>
        </div>
        <div style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
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

