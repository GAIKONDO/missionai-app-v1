/**
 * タスクチェーンのタブコンテンツ
 */

'use client';

import { useState } from 'react';
import { ChainList } from '@/components/agent-system/ChainList';
import { ChainEditor } from '@/components/agent-system/ChainEditor';
import type { TaskChain } from '@/lib/agent-system/taskChain';
import { getTaskChainManager } from '@/lib/agent-system/taskChain';

export function ChainTabContent() {
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [editingChainId, setEditingChainId] = useState<string | null>(null);

  const handleSelectChain = (chainId: string) => {
    setSelectedChainId(chainId);
    setEditingChainId(chainId);
    setViewMode('editor');
  };

  const handleEditChain = (chainId: string) => {
    setEditingChainId(chainId);
    setViewMode('editor');
  };

  const handleDeleteChain = (chainId: string) => {
    if (confirm('このチェーンを削除しますか？')) {
      const manager = getTaskChainManager();
      // 将来的にSQLiteから削除
      // manager.deleteChain(chainId);
      alert('チェーンを削除しました（実装予定）');
    }
  };

  const handleExecuteChain = async (chainId: string) => {
    const manager = getTaskChainManager();
    try {
      const result = await manager.executeChain(chainId);
      alert(`チェーン実行が完了しました: ${result.status}`);
    } catch (error: any) {
      alert(`チェーン実行エラー: ${error.message}`);
    }
  };

  const handleCreateChain = () => {
    setEditingChainId(null);
    setViewMode('editor');
  };

  const handleSaveChain = (chain: TaskChain) => {
    const manager = getTaskChainManager();
    manager.registerChain(chain);
    alert('チェーンを保存しました');
    setViewMode('list');
    setEditingChainId(null);
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
      />
    </div>
  );
}

