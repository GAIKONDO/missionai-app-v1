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
    <div style={{ width: '100%' }}>
      {/* ヘッダーセクション */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px',
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
            タスクチェーン
          </h2>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--color-text-secondary)',
            marginTop: '4px'
          }}>
            ワークフローを視覚的に作成・管理できます
          </p>
        </div>
        <button
          onClick={onCreateChain}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(31, 41, 51, 0.15)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(31, 41, 51, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(31, 41, 51, 0.15)';
          }}
        >
          <span style={{ fontSize: '18px' }}>+</span>
          新しいチェーンを作成
        </button>
      </div>

      {chains.length === 0 ? (
        <div style={{ 
          padding: '80px 40px', 
          textAlign: 'center',
          background: 'var(--color-surface)',
          borderRadius: '12px',
          border: '2px dashed var(--color-border-color)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 24px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px'
          }}>
            🔗
          </div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: 'var(--color-text)',
            marginBottom: '8px'
          }}>
            チェーンがまだありません
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--color-text-secondary)',
            marginBottom: '24px',
            maxWidth: '400px',
            margin: '0 auto 24px'
          }}>
            右上の「新しいチェーンを作成」ボタンから、最初のタスクチェーンを作成しましょう。
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '20px'
        }}>
          {chains.map(chain => {
            const nodeCount = chain.nodes.size;
            return (
              <div
                key={chain.id}
                style={{
                  padding: '20px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '12px',
                  background: 'var(--color-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(31, 41, 51, 0.12)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-color)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onClick={() => onSelectChain(chain.id)}
              >
                {/* 装飾的なグラデーション背景 */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, var(--color-primary) 0%, #2563eb 100%)',
                  opacity: 0.8
                }} />
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'start', 
                  marginBottom: '16px',
                  paddingTop: '4px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: 600, 
                      color: 'var(--color-text)',
                      marginBottom: '8px',
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {chain.name}
                    </h3>
                    {chain.description && (
                      <p style={{ 
                        fontSize: '14px', 
                        color: 'var(--color-text-secondary)',
                        lineHeight: '1.5',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        marginBottom: '12px'
                      }}>
                        {chain.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChain(chain.id);
                    }}
                    style={{
                      padding: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      fontSize: '18px',
                      borderRadius: '6px',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                      marginLeft: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fee2e2';
                      e.currentTarget.style.color = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* メタ情報 */}
                <div style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  fontSize: '13px', 
                  color: 'var(--color-text-secondary)',
                  marginBottom: '16px',
                  padding: '12px',
                  background: 'var(--color-background)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>🔗</span>
                    <span style={{ fontWeight: 500 }}>{nodeCount}</span>
                    <span>ノード</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>🕒</span>
                    <span>{new Date(chain.updatedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>

                {/* アクションボタン */}
                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--color-border-color)'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditChain(chain.id);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: 'var(--color-text)',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
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
                    <span>✏️</span>
                    編集
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExecuteChain(chain.id);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: 'linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(31, 41, 51, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(31, 41, 51, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(31, 41, 51, 0.1)';
                    }}
                  >
                    <span>▶️</span>
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

