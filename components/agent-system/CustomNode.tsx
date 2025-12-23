/**
 * カスタムノードコンポーネント（カード風デザイン）
 * React Flow用のカスタムノード
 */

'use client';

import { memo, useCallback } from 'react';
import { StartNodeIcon, TaskNodeIcon, ConditionNodeIcon, LoopNodeIcon, EndNodeIcon } from '@/components/Icons';

// React Flowの動的インポート
let Handle: any = null;
let Position: any = null;

try {
  const rf = require('reactflow');
  Handle = rf.Handle;
  Position = rf.Position;
} catch {
  // React Flowが利用できない場合は何もしない
}

interface CustomNodeProps {
  id: string;
  data: {
    label?: string;
    nodeType?: 'start' | 'task' | 'condition' | 'loop' | 'end';
    chainNode?: any;
    onNodeClick?: (nodeId: string, nodeData: any) => void;
    status?: 'completed' | 'failed' | 'running' | 'pending';
  };
  selected?: boolean;
}

export const CustomNode = memo(function CustomNode({ data, selected, id }: CustomNodeProps) {
  const nodeType = data.nodeType || 'task';
  const status = data.status;
  
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
      label: '条件',
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

  const config = nodeConfig[nodeType as keyof typeof nodeConfig] || nodeConfig.task;
  
  // ステータスに応じた色
  let statusColor = config.color;
  if (status === 'completed') statusColor = '#10b981';
  if (status === 'failed') statusColor = '#ef4444';
  if (status === 'running') statusColor = '#f59e0b';

  // タスク名を取得
  const taskName = data.chainNode?.task?.name || data.label || config.label;
  
  // 選択状態または実行中の場合は強調表示
  const isHighlighted = selected || status === 'running';

  // クリックイベントハンドラー
  const handleClick = useCallback((e: React.MouseEvent) => {
    // ハンドル（接続点）のクリックを除外
    if ((e.target as HTMLElement).closest('.react-flow__handle')) {
      return;
    }
    
    console.log('🟢 [CustomNode] onClick発火:', { 
      id, 
      hasOnNodeClick: !!data?.onNodeClick,
      target: (e.target as HTMLElement)?.tagName,
    });
    
    if (data?.onNodeClick) {
      console.log('✅ [CustomNode] onNodeClickを呼び出します');
      // イベントを停止して、React Flowの処理を防ぐ
      e.stopPropagation();
      e.preventDefault();
      // 直接呼び出す（setTimeoutは不要）
      data.onNodeClick(id, data);
    } else {
      console.warn('⚠️ [CustomNode] onNodeClickが定義されていません', { id });
    }
  }, [id, data]);

  return (
    <div
      onClick={handleClick}
      style={{
        background: 'var(--color-surface)',
        border: `2px solid ${isHighlighted ? statusColor : 'var(--color-border-color)'}`,
        borderRadius: '12px',
        padding: '16px',
        minWidth: '180px',
        boxShadow: isHighlighted 
          ? `0 4px 12px ${statusColor}40` 
          : '0 2px 8px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s ease',
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
        pointerEvents: 'auto',
        zIndex: 10,
      }}
      title="クリックして詳細を設定"
    >
      {/* 左側のカラーアクセントバー */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          background: statusColor,
          borderRadius: '12px 0 0 12px',
        }}
      />
      
      {/* ハンドル（接続点） */}
      {Handle && (
        <>
          <Handle
            type="target"
            position={Position?.Left}
            style={{
              background: statusColor,
              width: '10px',
              height: '10px',
              border: '2px solid var(--color-surface)',
              left: '-5px',
            }}
          />
          <Handle
            type="source"
            position={Position?.Right}
            style={{
              background: statusColor,
              width: '10px',
              height: '10px',
              border: '2px solid var(--color-surface)',
              right: '-5px',
            }}
          />
        </>
      )}

      {/* ノードコンテンツ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* アイコン */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: config.bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {config.icon && <config.icon size={20} color={statusColor} />}
        </div>

        {/* テキスト */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {taskName}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              fontWeight: 400,
            }}
          >
            {config.label}
          </div>
        </div>

        {/* ステータスインジケーター */}
        {status && (
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: statusColor,
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </div>
  );
});

