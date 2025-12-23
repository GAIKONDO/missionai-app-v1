/**
 * ノード編集モーダル
 */

'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import type { ChainNode } from '@/lib/agent-system/taskChain';
import type { Task } from '@/lib/agent-system/types';
import { TaskNodeEditor } from './TaskNodeEditor';
import { ConditionNodeEditor } from './ConditionNodeEditor';
import { LoopNodeEditor } from './LoopNodeEditor';
import { StartNodeIcon, TaskNodeIcon, ConditionNodeIcon, LoopNodeIcon, EndNodeIcon, CloseIcon } from '@/components/Icons';

interface NodeEditModalProps {
  nodeId: string;
  nodeType: 'start' | 'task' | 'condition' | 'loop' | 'end';
  chainNode: ChainNode;
  onClose: () => void;
  onSave: (nodeId: string, chainNode: ChainNode) => void;
  availableTasks?: Task[];
}

export function NodeEditModal({
  nodeId,
  nodeType,
  chainNode,
  onClose,
  onSave,
  availableTasks = [],
}: NodeEditModalProps) {
  const [editedNode, setEditedNode] = useState<ChainNode>(chainNode);
  const prevNodeIdRef = useRef<string>(nodeId);

  // nodeIdが変更されたときのみeditedNodeを更新（useLayoutEffectで同期的に実行）
  useLayoutEffect(() => {
    if (prevNodeIdRef.current !== nodeId) {
      prevNodeIdRef.current = nodeId;
      setEditedNode(chainNode);
    }
    // chainNodeは依存配列から除外（オブジェクト参照の変更による無限ループを防ぐため）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  // ノードタイプに応じた色とアイコン
  const nodeConfig = {
    start: {
      color: '#10b981',
      icon: StartNodeIcon,
      label: '開始',
      bgColor: '#ecfdf5',
    },
    task: {
      color: '#3b82f6',
      icon: TaskNodeIcon,
      label: 'タスク',
      bgColor: '#eff6ff',
    },
    condition: {
      color: '#f59e0b',
      icon: ConditionNodeIcon,
      label: '条件分岐',
      bgColor: '#fffbeb',
    },
    loop: {
      color: '#8b5cf6',
      icon: LoopNodeIcon,
      label: 'ループ',
      bgColor: '#f5f3ff',
    },
    end: {
      color: '#ef4444',
      icon: EndNodeIcon,
      label: '終了',
      bgColor: '#fef2f2',
    },
  };

  const config = nodeConfig[nodeType] || nodeConfig.task;

  // onChangeコールバックをメモ化（無限ループを防ぐため）
  const handleNodeChange = useCallback((updatedNode: ChainNode) => {
    setEditedNode(updatedNode);
  }, []);

  const handleSave = () => {
    onSave(nodeId, editedNode);
    onClose();
  };

  const renderEditor = () => {
    switch (nodeType) {
      case 'task':
        return (
          <TaskNodeEditor
            chainNode={editedNode}
            onChange={handleNodeChange}
            availableTasks={availableTasks}
          />
        );
      case 'condition':
        return (
          <ConditionNodeEditor
            chainNode={editedNode}
            onChange={handleNodeChange}
          />
        );
      case 'loop':
        return (
          <LoopNodeEditor
            chainNode={editedNode}
            onChange={handleNodeChange}
            availableTasks={availableTasks}
          />
        );
      case 'start':
      case 'end':
        return (
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center',
            background: 'var(--color-background)',
            borderRadius: '10px',
            border: '2px dashed var(--color-border-color)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: config.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {config.icon && <config.icon size={32} color={config.color} />}
            </div>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: 'var(--color-text)',
              marginBottom: '8px'
            }}>
              {nodeType === 'start' ? '開始ノード' : '終了ノード'}
            </h4>
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--color-text-secondary)',
              lineHeight: '1.6'
            }}>
              {nodeType === 'start' 
                ? 'ワークフローの開始地点です。編集項目はありません。' 
                : 'ワークフローの終了地点です。編集項目はありません。'}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  // ResizeObserverエラーを抑制（グローバルに設定）
  useEffect(() => {
    const resizeObserverLoopErrRe = /^[^(]*ResizeObserver loop completed with undelivered notifications/;
    const originalError = window.console.error;
    window.console.error = (...args: any[]) => {
      if (resizeObserverLoopErrRe.test(args[0] as string)) {
        return;
      }
      originalError.apply(window.console, args);
    };
    return () => {
      window.console.error = originalError;
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '700px',
          maxHeight: '85vh',
          overflow: 'auto',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--color-border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: config.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {config.icon && <config.icon size={24} color={config.color} />}
            </div>
            <div>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 600, 
                color: 'var(--color-text)',
                marginBottom: '4px'
              }}>
                ノードの詳細設定
              </h3>
              <p style={{ 
                fontSize: '14px', 
                color: 'var(--color-text-secondary)'
              }}>
                {config.label} - ID: {nodeId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-background)';
              e.currentTarget.style.color = 'var(--color-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <CloseIcon size={20} color="var(--color-text-secondary)" />
          </button>
        </div>

        {/* エディタコンテンツ */}
        <div style={{ 
          marginBottom: '24px',
          padding: '20px',
          background: 'var(--color-background)',
          borderRadius: '10px',
          border: '1px solid var(--color-border-color)'
        }}>
          {renderEditor()}
        </div>

        {/* フッター */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          paddingTop: '16px',
          borderTop: '1px solid var(--color-border-color)'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--color-text)',
              fontWeight: 500,
              fontSize: '14px',
              transition: 'all 0.2s'
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
            キャンセル
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '14px',
              transition: 'all 0.2s',
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
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function getNodeTypeLabel(type: 'start' | 'task' | 'condition' | 'loop' | 'end'): string {
  const labels = {
    start: '開始',
    task: 'タスク',
    condition: '条件分岐',
    loop: 'ループ',
    end: '終了',
  };
  return labels[type];
}

