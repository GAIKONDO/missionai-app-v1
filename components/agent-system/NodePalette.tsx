/**
 * ノードパレットコンポーネント
 */

'use client';

import { StartNodeIcon, TaskNodeIcon, ConditionNodeIcon, LoopNodeIcon, EndNodeIcon, CloseIcon } from '@/components/Icons';

interface NodePaletteProps {
  selectedNode: string | null;
  onAddNode: (type: 'start' | 'task' | 'condition' | 'loop' | 'end') => void;
  onDeleteNode: (nodeId: string) => void;
  onClearSelection: () => void;
}

export function NodePalette({
  selectedNode,
  onAddNode,
  onDeleteNode,
  onClearSelection,
}: NodePaletteProps) {
  return (
    <div style={{ 
      padding: '16px 24px', 
      borderBottom: '1px solid var(--color-border-color)', 
      background: 'var(--color-surface)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap'
    }}>
      <div style={{ 
        fontSize: '13px', 
        fontWeight: 500, 
        color: 'var(--color-text-secondary)',
        marginRight: '8px'
      }}>
        ノードを追加:
      </div>
      <button
        onClick={() => onAddNode('start')}
        style={{
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
        }}
      >
        <StartNodeIcon size={16} color="white" />
        開始
      </button>
      <button
        onClick={() => onAddNode('task')}
        style={{
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
        }}
      >
        <TaskNodeIcon size={16} color="white" />
        タスク
      </button>
      <button
        onClick={() => onAddNode('condition')}
        style={{
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(245, 158, 11, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.2)';
        }}
      >
        <ConditionNodeIcon size={16} color="white" />
        条件
      </button>
      <button
        onClick={() => onAddNode('loop')}
        style={{
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 4px rgba(139, 92, 246, 0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(139, 92, 246, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(139, 92, 246, 0.2)';
        }}
      >
        <LoopNodeIcon size={16} color="white" />
        ループ
      </button>
      <button
        onClick={() => onAddNode('end')}
        style={{
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.2)';
        }}
      >
        <EndNodeIcon size={16} color="white" />
        終了
      </button>
      {selectedNode && (
        <button
          onClick={() => {
            onDeleteNode(selectedNode);
            onClearSelection();
          }}
          style={{
            padding: '8px 16px',
            background: 'var(--color-surface)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            color: '#ef4444',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: 'auto'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fee2e2';
            e.currentTarget.style.borderColor = '#dc2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-surface)';
            e.currentTarget.style.borderColor = '#ef4444';
          }}
        >
          <CloseIcon size={16} color="#ef4444" />
          削除
        </button>
      )}
    </div>
  );
}

