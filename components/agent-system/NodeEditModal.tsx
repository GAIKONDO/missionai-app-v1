/**
 * ノード編集モーダル
 */

'use client';

import { useState, useEffect } from 'react';
import type { ChainNode } from '@/lib/agent-system/taskChain';
import type { Task } from '@/lib/agent-system/types';
import { TaskNodeEditor } from './TaskNodeEditor';
import { ConditionNodeEditor } from './ConditionNodeEditor';
import { LoopNodeEditor } from './LoopNodeEditor';

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
            onChange={setEditedNode}
            availableTasks={availableTasks}
          />
        );
      case 'condition':
        return (
          <ConditionNodeEditor
            chainNode={editedNode}
            onChange={setEditedNode}
          />
        );
      case 'loop':
        return (
          <LoopNodeEditor
            chainNode={editedNode}
            onChange={setEditedNode}
            availableTasks={availableTasks}
          />
        );
      case 'start':
      case 'end':
        return (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <p>{nodeType === 'start' ? '開始ノード' : '終了ノード'}には編集項目がありません。</p>
          </div>
        );
      default:
        return null;
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
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-background)',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          width: '90%',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
            ノードを編集: {getNodeTypeLabel(nodeType)}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {renderEditor()}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--color-text)',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
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

