/**
 * チェーンエディタコンポーネント（基本版）
 * React Flowを使用したフローチャートエディタ
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { TaskChain, ChainNode } from '@/lib/agent-system/taskChain';
import { getTaskChainManager } from '@/lib/agent-system/taskChain';
import { generateId } from '@/lib/agent-system/utils';
import { NodeEditModal } from './NodeEditModal';
import { getAllTasks } from '@/lib/agent-system/taskManager';
import type { Task } from '@/lib/agent-system/types';
import { ChainExecutionMonitor } from './ChainExecutionMonitor';
import type { ChainExecutionResult } from '@/lib/agent-system/taskChain';
import { ChainExportImport } from './ChainExportImport';
import { getAllChainTemplates, createChainFromTemplate } from '@/lib/agent-system/chainTemplates';
import type { ChainTemplate } from '@/lib/agent-system/chainTemplates';

// React Flowの動的インポート
let ReactFlow: any = null;
let useNodesState: any = null;
let useEdgesState: any = null;
let addEdge: any = null;
let Controls: any = null;
let Background: any = null;
let MiniMap: any = null;
let BackgroundVariant: any = null;

// React Flowが利用可能かチェック
const isReactFlowAvailable = (() => {
  try {
    const rf = require('reactflow');
    ReactFlow = rf.default;
    useNodesState = rf.useNodesState;
    useEdgesState = rf.useEdgesState;
    addEdge = rf.addEdge;
    Controls = rf.Controls;
    Background = rf.Background;
    MiniMap = rf.MiniMap;
    BackgroundVariant = rf.BackgroundVariant;
    require('reactflow/dist/style.css');
    return true;
  } catch {
    return false;
  }
})();

// カスタムノードタイプ（将来実装）
// const nodeTypes: NodeTypes = {};

interface ChainEditorProps {
  chainId?: string;
  onSave?: (chain: TaskChain) => void;
  onExecute?: (chain: TaskChain) => void;
}

export function ChainEditor({ chainId, onSave, onExecute }: ChainEditorProps) {
  // React Flowが利用できない場合は簡易版UIを表示
  if (!isReactFlowAvailable) {
    return <ChainEditorFallback chainId={chainId} onSave={onSave} onExecute={onExecute} />;
  }

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [chainName, setChainName] = useState('');
  const [chainDescription, setChainDescription] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<{ id: string; type: 'start' | 'task' | 'condition' | 'loop' | 'end'; chainNode: ChainNode } | null>(null);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [executionResult, setExecutionResult] = useState<ChainExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // チェーンを読み込む
  useEffect(() => {
    if (chainId) {
      const manager = getTaskChainManager();
      const chain = manager.getChain(chainId);
      if (chain) {
        setChainName(chain.name);
        setChainDescription(chain.description);
        // チェーンからReact Flowのノードとエッジを生成
        const flowNodes = convertChainToFlowNodes(chain);
        const flowEdges = convertChainToFlowEdges(chain);
        setNodes(flowNodes);
        setEdges(flowEdges);
      }
    }
    // タスクを読み込む
    loadTasks();
  }, [chainId, setNodes, setEdges]);

  const loadTasks = async () => {
    try {
      const tasks = await getAllTasks();
      setAvailableTasks(tasks);
    } catch (error) {
      console.error('タスク読み込みエラー:', error);
    }
  };

  // エッジ接続時の処理
  const onConnect = useCallback(
    (params: any) => {
      setEdges((eds: any[]) => addEdge(params, eds));
    },
    [setEdges]
  );

  // ノード追加
  const handleAddNode = (type: 'start' | 'task' | 'condition' | 'loop' | 'end') => {
    const newNode: any = {
      id: generateId(),
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: getNodeLabel(type),
        nodeType: type,
        chainNode: createChainNode(type),
      },
      style: getNodeStyle(type),
    };
    setNodes((nds: any[]) => [...nds, newNode]);
  };

  // ノード削除
  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  };

  // チェーン保存
  const handleSave = () => {
    const chain = convertFlowToChain(nodes, edges, chainName, chainDescription);
    if (onSave) {
      onSave(chain);
    } else {
      const manager = getTaskChainManager();
      manager.registerChain(chain);
      alert('チェーンを保存しました');
    }
  };

  // チェーン実行
  const handleExecute = async () => {
    const chain = convertFlowToChain(nodes, edges, chainName, chainDescription);
    setIsExecuting(true);
    setCurrentExecutionId(null);
    setExecutionResult(null);

    if (onExecute) {
      onExecute(chain);
    } else {
      const manager = getTaskChainManager();
      try {
        const result = await manager.executeChain(chain.id);
        setExecutionResult(result);
        setCurrentExecutionId(result.executionId);
        
        // 実行中のノードをハイライト
        updateNodeStatuses(result);
      } catch (error: any) {
        alert(`チェーン実行エラー: ${error.message}`);
      } finally {
        setIsExecuting(false);
      }
    }
  };

  // ノードの実行状態を更新
  const updateNodeStatuses = (result: ChainExecutionResult) => {
    setNodes((nds: any[]) =>
      nds.map((n) => {
        const nodeResult = result.nodeResults.get(n.id);
        const isInPath = result.executionPath.includes(n.id);
        const isCurrent = result.executionPath[result.executionPath.length - 1] === n.id;

        let statusColor = '#9e9e9e'; // デフォルト（グレー）
        if (nodeResult) {
          switch (nodeResult.status) {
            case 'completed':
              statusColor = '#4caf50'; // 緑
              break;
            case 'failed':
              statusColor = '#f44336'; // 赤
              break;
            case 'running':
              statusColor = '#ff9800'; // オレンジ
              break;
          }
        }

        return {
          ...n,
          style: {
            ...n.style,
            background: isCurrent ? statusColor : isInPath ? statusColor + '80' : n.style.background,
            borderColor: isCurrent ? statusColor : n.style.borderColor,
          },
          data: {
            ...n.data,
            status: nodeResult?.status || (isInPath ? 'pending' : undefined),
          },
        };
      })
    );

    // 実行パスのエッジをハイライト
    setEdges((eds: any[]) =>
      eds.map((e) => {
        const sourceIndex = result.executionPath.indexOf(e.source);
        const targetIndex = result.executionPath.indexOf(e.target);
        const isInPath = sourceIndex !== -1 && targetIndex !== -1 && targetIndex === sourceIndex + 1;

        return {
          ...e,
          style: {
            ...e.style,
            stroke: isInPath ? '#4caf50' : e.style?.stroke || '#999',
            strokeWidth: isInPath ? 3 : e.style?.strokeWidth || 2,
          },
          animated: isInPath && targetIndex === result.executionPath.length - 1,
        };
      })
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ヘッダー */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border-color)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="チェーン名"
            value={chainName}
            onChange={(e) => setChainName(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              fontSize: '16px',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
            }}
          />
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
          <button
            onClick={handleExecute}
            style={{
              padding: '8px 16px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            実行
          </button>
          <button
            onClick={() => setShowTemplateModal(true)}
            style={{
              padding: '8px 16px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--color-text)',
            }}
          >
            📋 テンプレート
          </button>
          {chainName && (
            <ChainExportImport
              chain={convertFlowToChain(nodes, edges, chainName, chainDescription)}
              onImport={(importedChain) => {
                setChainName(importedChain.name);
                setChainDescription(importedChain.description);
                const flowNodes = convertChainToFlowNodes(importedChain);
                const flowEdges = convertChainToFlowEdges(importedChain);
                setNodes(flowNodes);
                setEdges(flowEdges);
              }}
            />
          )}
        </div>
        <input
          type="text"
          placeholder="説明（オプション）"
          value={chainDescription}
          onChange={(e) => setChainDescription(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
          }}
        />
      </div>

      {/* ノードパレット */}
      <div style={{ padding: '12px', borderBottom: '1px solid var(--color-border-color)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleAddNode('start')}
            style={{
              padding: '6px 12px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ▶ 開始
          </button>
          <button
            onClick={() => handleAddNode('task')}
            style={{
              padding: '6px 12px',
              background: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            📋 タスク
          </button>
          <button
            onClick={() => handleAddNode('condition')}
            style={{
              padding: '6px 12px',
              background: '#ffc107',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ❓ 条件
          </button>
          <button
            onClick={() => handleAddNode('loop')}
            style={{
              padding: '6px 12px',
              background: '#9c27b0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            🔄 ループ
          </button>
          <button
            onClick={() => handleAddNode('end')}
            style={{
              padding: '6px 12px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ⏹ 終了
          </button>
          {selectedNode && (
            <button
              onClick={() => {
                handleDeleteNode(selectedNode);
                setSelectedNode(null);
              }}
              style={{
                padding: '6px 12px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                marginLeft: 'auto',
              }}
            >
              削除
            </button>
          )}
        </div>
      </div>

      {/* React Flowエディタ */}
      <div style={{ flex: 1, minHeight: '500px', background: 'var(--color-background)' }}>
        {ReactFlow && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
            setSelectedNode(node.id);
            // ノードをダブルクリックで編集
            if (node.data?.chainNode) {
              setEditingNode({
                id: node.id,
                type: node.data.nodeType,
                chainNode: node.data.chainNode,
              });
            }
          }}
          onNodeDoubleClick={(_, node) => {
            if (node.data?.chainNode) {
              setEditingNode({
                id: node.id,
                type: node.data.nodeType,
                chainNode: node.data.chainNode,
              });
            }
          }}
            fitView
          >
            {Controls && <Controls />}
            {Background && <Background variant={BackgroundVariant?.Dots} gap={12} size={1} />}
            {MiniMap && <MiniMap />}
          </ReactFlow>
        )}
      </div>

      {/* ノード編集モーダル */}
      {editingNode && (
        <NodeEditModal
          nodeId={editingNode.id}
          nodeType={editingNode.type}
          chainNode={editingNode.chainNode}
          onClose={() => setEditingNode(null)}
          onSave={(nodeId, updatedChainNode) => {
            // ノードを更新
            setNodes((nds: any[]) =>
              nds.map((n) => {
                if (n.id === nodeId) {
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      chainNode: updatedChainNode,
                    },
                  };
                }
                return n;
              })
            );
            setEditingNode(null);
          }}
          availableTasks={availableTasks}
        />
      )}

      {/* テンプレートモーダル */}
      {showTemplateModal && (
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
          onClick={() => setShowTemplateModal(false)}
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
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
                チェーンテンプレート
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getAllChainTemplates().map((template) => (
                <div
                  key={template.id}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '6px',
                    background: 'var(--color-surface)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const chain = createChainFromTemplate(template);
                    setChainName(chain.name);
                    setChainDescription(chain.description);
                    const flowNodes = convertChainToFlowNodes(chain);
                    const flowEdges = convertChainToFlowEdges(chain);
                    setNodes(flowNodes);
                    setEdges(flowEdges);
                    setShowTemplateModal(false);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-color)';
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>
                    {template.name}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                    {template.description}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    カテゴリ: {template.category}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ヘルパー関数

function getNodeLabel(type: 'start' | 'task' | 'condition' | 'loop' | 'end'): string {
  const labels = {
    start: '開始',
    task: 'タスク',
    condition: '条件分岐',
    loop: 'ループ',
    end: '終了',
  };
  return labels[type];
}

function getNodeStyle(type: 'start' | 'task' | 'condition' | 'loop' | 'end') {
  const styles = {
    start: {
      background: '#4caf50',
      color: 'white',
      border: '2px solid #2e7d32',
      borderRadius: '8px',
    },
    task: {
      background: '#2196f3',
      color: 'white',
      border: '2px solid #1565c0',
      borderRadius: '4px',
    },
    condition: {
      background: '#ffc107',
      color: 'white',
      border: '2px solid #f57c00',
      borderRadius: '4px',
      width: 120,
      height: 80,
      transform: 'rotate(45deg)',
    },
    loop: {
      background: '#9c27b0',
      color: 'white',
      border: '2px solid #6a1b9a',
      borderRadius: '8px',
    },
    end: {
      background: '#f44336',
      color: 'white',
      border: '2px solid #c62828',
      borderRadius: '8px',
    },
  };
  return styles[type];
}

function createChainNode(type: 'start' | 'task' | 'condition' | 'loop' | 'end'): ChainNode {
  const id = generateId();
  switch (type) {
    case 'task':
      return {
        id,
        type: 'task',
      };
    case 'condition':
      return {
        id,
        type: 'condition',
        condition: {
          type: 'equals',
          field: '',
          value: '',
        },
      };
    case 'loop':
      return {
        id,
        type: 'loop',
        loopCount: 1,
      };
    default:
      return {
        id,
        type: 'task',
      };
  }
}

function convertChainToFlowNodes(chain: TaskChain): any[] {
  const nodes: any[] = [];
  chain.nodes.forEach((chainNode, nodeId) => {
    const nodeType = chainNode.type === 'task' ? 'task' : chainNode.type === 'condition' ? 'condition' : 'loop';
    nodes.push({
      id: nodeId,
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: getNodeLabel(nodeType),
        nodeType,
        chainNode,
      },
      style: getNodeStyle(nodeType),
    });
  });
  return nodes;
}

function convertChainToFlowEdges(chain: TaskChain): any[] {
  const edges: any[] = [];
  chain.nodes.forEach((chainNode, nodeId) => {
    if (chainNode.nextNodeId) {
      edges.push({
        id: `${nodeId}-${chainNode.nextNodeId}`,
        source: nodeId,
        target: chainNode.nextNodeId,
      });
    }
    if (chainNode.trueBranch) {
      edges.push({
        id: `${nodeId}-true-${chainNode.trueBranch}`,
        source: nodeId,
        target: chainNode.trueBranch,
        label: '真',
        style: { stroke: '#4caf50' },
      });
    }
    if (chainNode.falseBranch) {
      edges.push({
        id: `${nodeId}-false-${chainNode.falseBranch}`,
        source: nodeId,
        target: chainNode.falseBranch,
        label: '偽',
        style: { stroke: '#f44336' },
      });
    }
  });
  return edges;
}

function convertFlowToChain(
  nodes: any[],
  edges: any[],
  name: string,
  description: string
): TaskChain {
  const chainNodes = new Map<string, ChainNode>();
  let startNodeId = '';

  // ノードを変換
  nodes.forEach((node) => {
    const nodeType = node.data.nodeType;
    if (nodeType === 'start') {
      startNodeId = node.id;
    }

    const chainNode: ChainNode = node.data.chainNode || {
      id: node.id,
      type: nodeType === 'task' ? 'task' : nodeType === 'condition' ? 'condition' : 'loop',
    };
    chainNodes.set(node.id, chainNode);
  });

  // エッジから接続情報を設定
  edges.forEach((edge) => {
    const sourceNode = chainNodes.get(edge.source);
    if (sourceNode) {
      if (edge.label === '真') {
        sourceNode.trueBranch = edge.target;
      } else if (edge.label === '偽') {
        sourceNode.falseBranch = edge.target;
      } else {
        sourceNode.nextNodeId = edge.target;
      }
    }
  });

  return {
    id: generateId(),
    name: name || '無題のチェーン',
    description,
    startNodeId: startNodeId || nodes[0]?.id || '',
    nodes: chainNodes,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

