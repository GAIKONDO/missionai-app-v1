/**
 * チェーン一覧コンポーネント
 */

'use client';

import { useState, useEffect } from 'react';
import type { TaskChain } from '@/lib/agent-system/taskChain';
import { getTaskChainManager } from '@/lib/agent-system/taskChain';
import { getAllTaskChains } from '@/lib/agent-system/taskManager';
import { ChainExportImport } from './ChainExportImport';

interface ChainListProps {
  onSelectChain: (chainId: string) => void;
  onEditChain: (chainId: string) => void;
  onDeleteChain: (chainId: string) => void;
  onExecuteChain: (chainId: string) => void;
  onCreateChain: () => void;
  refreshTrigger?: number; // 削除後に更新をトリガーするためのプロップ
}

export function ChainList({
  onSelectChain,
  onEditChain,
  onDeleteChain,
  onExecuteChain,
  onCreateChain,
  refreshTrigger,
}: ChainListProps) {
  const [chains, setChains] = useState<TaskChain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChains();
  }, [refreshTrigger]);

  const loadChains = async () => {
    try {
      // データベースからチェーンを読み込む
      const allChains = await getAllTaskChains();
      setChains(allChains);
      
      // メモリにも登録（実行時に使用）
      const manager = getTaskChainManager();
      allChains.forEach(chain => {
        manager.registerChain(chain);
      });
    } catch (error) {
      console.error('チェーン読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>
          タスクチェーン一覧
        </h2>
        <button
          onClick={onCreateChain}
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
          + チェーンを作成
        </button>
      </div>

      {chains.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <p>チェーンが登録されていません。</p>
          <p style={{ marginTop: '8px', fontSize: '14px' }}>
            右上の「チェーンを作成」ボタンから新しいチェーンを作成できます。
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {chains.map(chain => {
            const nodeCount = chain.nodes.size;
            return (
              <div
                key={chain.id}
                style={{
                  padding: '16px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '8px',
                  background: 'var(--color-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => onSelectChain(chain.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', flex: 1 }}>
                    {chain.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChain(chain.id);
                    }}
                    style={{
                      padding: '4px 8px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    削除
                  </button>
                </div>

                {chain.description && (
                  <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                    {chain.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                  <span>ノード数: {nodeCount}</span>
                  <span>更新: {new Date(chain.updatedAt).toLocaleDateString('ja-JP')}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditChain(chain.id);
                    }}
                    style={{
                      flex: 1,
                      minWidth: '80px',
                      padding: '6px 12px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: 'var(--color-text)',
                    }}
                  >
                    編集
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExecuteChain(chain.id);
                    }}
                    style={{
                      flex: 1,
                      minWidth: '80px',
                      padding: '6px 12px',
                      background: 'var(--color-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    実行
                  </button>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ChainExportImport chain={chain} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

