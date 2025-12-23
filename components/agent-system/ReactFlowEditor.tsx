/**
 * React Flowエディタコンポーネント
 */

'use client';

import { CustomNode } from './CustomNode';

// React Flowの動的インポート
let ReactFlow: any = null;
let Controls: any = null;
let Background: any = null;
let MiniMap: any = null;
let BackgroundVariant: any = null;

try {
  const rf = require('reactflow');
  ReactFlow = rf.default;
  Controls = rf.Controls;
  Background = rf.Background;
  MiniMap = rf.MiniMap;
  BackgroundVariant = rf.BackgroundVariant;
  require('reactflow/dist/style.css');
} catch {
  // React Flowが利用できない場合は何もしない
}

interface ReactFlowEditorProps {
  nodes: any[];
  edges: any[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (params: any) => void;
  onNodeClick: (event: any, node: any) => void;
  onNodeDoubleClick: (event: any, node: any) => void;
  onPaneClick: () => void;
}

export function ReactFlowEditor({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDoubleClick,
  onPaneClick,
}: ReactFlowEditorProps) {
  if (!ReactFlow) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          React Flowが利用できません。
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      flex: 1, 
      minHeight: '500px', 
      background: 'var(--color-background)',
      position: 'relative',
      borderRadius: '0'
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={{ customNode: CustomNode }}
        fitView
        style={{ background: 'var(--color-background)' }}
        defaultEdgeOptions={{
          style: { stroke: '#d1d5db', strokeWidth: 2 },
          type: 'smoothstep',
        }}
        nodeOrigin={[0, 0]}
        connectionLineStyle={{ stroke: '#d1d5db', strokeWidth: 2 }}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        panOnDrag={false}
        panOnScroll={true}
        zoomOnScroll={true}
        preventScrolling={false}
        selectNodesOnDrag={false}
        nodesFocusable={true}
        deleteKeyCode={null}
        onlyRenderVisibleElements={false}
        onPaneClick={onPaneClick}
        onPaneContextMenu={(e: any) => {
          e.preventDefault();
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        {Controls && <Controls style={{ 
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-color)',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }} />}
        {Background && <Background 
          variant={BackgroundVariant?.Dots} 
          gap={16} 
          size={1}
          color="var(--color-border-color)"
          style={{ opacity: 0.5 }}
        />}
        {MiniMap && <MiniMap 
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-color)',
            borderRadius: '8px'
          }}
          nodeColor={(node: any) => {
            if (node.data?.status === 'completed') return '#10b981';
            if (node.data?.status === 'failed') return '#ef4444';
            if (node.data?.status === 'running') return '#f59e0b';
            return '#9ca3af';
          }}
        />}
      </ReactFlow>
    </div>
  );
}

