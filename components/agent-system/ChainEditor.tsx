/**
 * チェーンエディタコンポーネント（基本版）
 * React Flowを使用したフローチャートエディタ
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { TaskChain, ChainNode } from '@/lib/agent-system/taskChain';
import { getTaskChainManager } from '@/lib/agent-system/taskChain';
import { generateId } from '@/lib/agent-system/utils';
import { NodeEditModal } from './NodeEditModal';
import { getAllTasks, saveTaskChain, getTaskChain } from '@/lib/agent-system/taskManager';
import type { Task } from '@/lib/agent-system/types';
import { ChainExecutionMonitor } from './ChainExecutionMonitor';
import type { ChainExecutionResult } from '@/lib/agent-system/taskChain';
import { ChainEditorHeader } from './ChainEditorHeader';
import { NodePalette } from './NodePalette';
import { TemplateModal } from './TemplateModal';
import { ChainEditorFallback } from './ChainEditorFallback';
import { ReactFlowEditor } from './ReactFlowEditor';
import { 
  getNodeLabel, 
  createChainNode, 
  convertChainToFlowNodes, 
  convertChainToFlowEdges, 
  convertFlowToChain 
} from './chainEditorUtils';

// React Flowの動的インポート
let useNodesState: any = null;
let useEdgesState: any = null;
let addEdge: any = null;

// React Flowが利用可能かチェック
const isReactFlowAvailable = (() => {
  try {
    const rf = require('reactflow');
    useNodesState = rf.useNodesState;
    useEdgesState = rf.useEdgesState;
    addEdge = rf.addEdge;
    require('reactflow/dist/style.css');
    return true;
  } catch {
    return false;
  }
})();

interface ChainEditorProps {
  chainId?: string;
  onSave?: (chain: TaskChain) => void;
  onExecute?: (chain: TaskChain) => void;
}

export function ChainEditor({ chainId, onSave, onExecute }: ChainEditorProps) {
  // React Flowが利用できない場合は簡易版UIを表示
  if (!isReactFlowAvailable) {
    return <ChainEditorFallback chainId={chainId} />;
  }

  // ResizeObserverエラーを抑制（グローバルに設定）
  useEffect(() => {
    const resizeObserverLoopErrRe = /^[^(]*ResizeObserver loop completed with undelivered notifications/;
    const originalError = window.console.error;
    const originalWarn = window.console.warn;
    
    window.console.error = (...args: any[]) => {
      if (resizeObserverLoopErrRe.test(args[0] as string)) {
        return;
      }
      originalError.apply(window.console, args);
    };
    
    window.console.warn = (...args: any[]) => {
      if (resizeObserverLoopErrRe.test(args[0] as string)) {
        return;
      }
      originalWarn.apply(window.console, args);
    };
    
    // グローバルエラーハンドラーも追加
    const handleError = (event: ErrorEvent) => {
      if (resizeObserverLoopErrRe.test(event.message)) {
        event.preventDefault();
        return;
      }
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      window.console.error = originalError;
      window.console.warn = originalWarn;
      window.removeEventListener('error', handleError);
    };
  }, []);

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

  // ノードクリックハンドラー（最初に定義）
  const handleNodeClickRef = useRef<(nodeId: string, nodeData: any) => void | undefined>(undefined);
  const handleNodeClick = useCallback((nodeId: string, nodeData: any) => {
    console.log('🔵 [ChainEditor] ノードクリック検出:', { 
      nodeId, 
      data: nodeData, 
      hasChainNode: !!nodeData?.chainNode,
      nodeType: nodeData?.nodeType,
    });
    
    setSelectedNode(nodeId);
    
    // ノードをクリックで編集モーダルを開く
    const nodeType = nodeData?.nodeType || 'task';
    let chainNodeToEdit: ChainNode;
    
    if (nodeData?.chainNode) {
      chainNodeToEdit = nodeData.chainNode;
      console.log('✅ [ChainEditor] 既存のchainNodeを使用');
    } else {
      // chainNodeが存在しない場合は、デフォルトのchainNodeを作成
      chainNodeToEdit = createChainNode(nodeType);
      console.log('⚠️ [ChainEditor] chainNodeが存在しないため、デフォルトを作成:', chainNodeToEdit);
    }
    
    const editingNodeData = {
      id: nodeId,
      type: nodeType,
      chainNode: chainNodeToEdit,
    };
    
    console.log('📝 [ChainEditor] editingNodeを設定:', editingNodeData);
    setEditingNode(editingNodeData);
  }, []);

  // handleNodeClickをrefに保存（常に最新の関数を使用）
  useEffect(() => {
    handleNodeClickRef.current = handleNodeClick;
  }, [handleNodeClick]);

  // React FlowのonNodeClickハンドラー（フォールバック）
  const onNodeClickHandler = useCallback((event: any, node: any) => {
    console.log('🔵 [ChainEditor] React Flow onNodeClick発火:', { 
      nodeId: node.id, 
      data: node.data,
      hasOnNodeClick: !!node.data?.onNodeClick,
      dataKeys: node.data ? Object.keys(node.data) : [],
      eventType: event?.type,
      eventTarget: event?.target?.tagName,
    });
    
    // イベントを停止
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // 常にhandleNodeClickを直接呼び出す（より確実）
    console.log('✅ [ChainEditor] handleNodeClickを直接呼び出します');
    handleNodeClick(node.id, node.data);
  }, [handleNodeClick]);
  
  // React FlowのonNodeDoubleClickハンドラー（フォールバック）
  const onNodeDoubleClickHandler = useCallback((event: any, node: any) => {
    console.log('🟣 [ChainEditor] React Flow onNodeDoubleClick発火:', { 
      nodeId: node.id, 
    });
    handleNodeClick(node.id, node.data);
  }, [handleNodeClick]);

  // editingNodeの変更をデバッグ
  useEffect(() => {
    if (editingNode) {
      console.log('🎯 [ChainEditor] editingNodeが設定されました:', editingNode);
    } else {
      console.log('❌ [ChainEditor] editingNodeがnullです');
    }
  }, [editingNode]);

  const loadTasks = async () => {
    try {
      const tasks = await getAllTasks();
      setAvailableTasks(tasks);
    } catch (error) {
      console.error('タスク読み込みエラー:', error);
    }
  };

  // チェーンを読み込む
  useEffect(() => {
    const loadChain = async () => {
      if (chainId) {
        try {
          // まずデータベースから読み込む
          let chain = await getTaskChain(chainId);
          
          // データベースにない場合はメモリから読み込む
          if (!chain) {
            const manager = getTaskChainManager();
            const memChain = manager.getChain(chainId);
            chain = memChain || null;
          }
          if (!chain) {
            return;
          }
          
          if (chain) {
            // メモリにも登録（実行時に使用）
            const manager = getTaskChainManager();
            manager.registerChain(chain);
            
            setChainName(chain.name);
            setChainDescription(chain.description);
            // チェーンからReact Flowのノードとエッジを生成
            const flowNodes = convertChainToFlowNodes(chain, handleNodeClickRef.current || handleNodeClick);
            const flowEdges = convertChainToFlowEdges(chain);
            setNodes(flowNodes);
            setEdges(flowEdges);
          }
        } catch (error) {
          console.error('チェーン読み込みエラー:', error);
        }
      }
    };
    
    loadChain();
    // タスクを読み込む
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);

  // エッジ接続時の処理
  const onConnect = useCallback(
    (params: any) => {
      setEdges((eds: any[]) => addEdge(params, eds));
    },
    [setEdges]
  );

  // ノード追加
  const handleAddNode = (type: 'start' | 'task' | 'condition' | 'loop' | 'end') => {
    // 既存のノードの最大X座標を取得して、右側に配置
    const maxX = nodes.length > 0 
      ? Math.max(...nodes.map((n: any) => n.position.x)) 
      : 0;
    const newNode: any = {
      id: generateId(),
      type: 'customNode', // カスタムノードタイプを使用
      position: { x: maxX + 250, y: Math.random() * 200 }, // 右側に配置、Yはランダム
      data: {
        label: getNodeLabel(type),
        nodeType: type,
        chainNode: createChainNode(type),
        onNodeClick: handleNodeClick,
      },
    };
    setNodes((nds: any[]) => [...nds, newNode]);
  };

  // ノード削除
  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds: any[]) => nds.filter((n: any) => n.id !== nodeId));
    setEdges((eds: any[]) => eds.filter((e: any) => e.source !== nodeId && e.target !== nodeId));
  };

  // ノードの実行状態を更新
  const updateNodeStatuses = (result: ChainExecutionResult) => {
    setNodes((nds: any[]) =>
      nds.map((n) => {
        const nodeResult = result.nodeResults.get(n.id);
        const isInPath = result.executionPath.includes(n.id);
        const isCurrent = result.executionPath[result.executionPath.length - 1] === n.id;

        return {
          ...n,
          data: {
            ...n.data,
            status: nodeResult?.status || (isInPath ? 'pending' : undefined),
          },
          selected: isCurrent, // 現在実行中のノードを選択状態にする
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
            stroke: isInPath ? '#10b981' : '#d1d5db',
            strokeWidth: isInPath ? 3 : 2,
          },
          animated: isInPath && targetIndex === result.executionPath.length - 1,
          markerEnd: {
            type: 'arrowclosed',
            color: isInPath ? '#10b981' : '#d1d5db',
          },
        };
      })
    );
  };

  // チェーン保存
  const handleSave = async () => {
    const chain = convertFlowToChain(nodes, edges, chainName, chainDescription, chainId);
    if (onSave) {
      onSave(chain);
    } else {
      try {
        // データベースに保存
        await saveTaskChain(chain);
        // メモリにも登録（実行時に使用）
        const manager = getTaskChainManager();
        manager.registerChain(chain);
        alert('チェーンを保存しました');
      } catch (error: any) {
        console.error('チェーン保存エラー:', error);
        alert(`チェーン保存エラー: ${error.message || error}`);
      }
    }
  };

  // チェーン実行
  const handleExecute = async () => {
    const chain = convertFlowToChain(nodes, edges, chainName, chainDescription, chainId);
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

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-background)' }}>
        <ChainEditorHeader
          chainName={chainName}
          chainDescription={chainDescription}
          chainId={chainId}
          isExecuting={isExecuting}
          nodes={nodes}
          edges={edges}
          onChainNameChange={setChainName}
          onChainDescriptionChange={setChainDescription}
          onSave={handleSave}
          onExecute={handleExecute}
          onShowTemplateModal={() => setShowTemplateModal(true)}
          onImport={(importedChain) => {
            setChainName(importedChain.name);
            setChainDescription(importedChain.description);
            const flowNodes = convertChainToFlowNodes(importedChain, handleNodeClickRef.current || handleNodeClick);
            const flowEdges = convertChainToFlowEdges(importedChain);
            setNodes(flowNodes);
            setEdges(flowEdges);
          }}
        />

        <NodePalette
          selectedNode={selectedNode}
          onAddNode={handleAddNode}
          onDeleteNode={handleDeleteNode}
          onClearSelection={() => setSelectedNode(null)}
        />

        <ReactFlowEditor
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClickHandler}
          onNodeDoubleClick={onNodeDoubleClickHandler}
          onPaneClick={() => setSelectedNode(null)}
        />

      {/* ノード編集モーダル */}
      {editingNode && (
        <NodeEditModal
          key={editingNode.id}
          nodeId={editingNode.id}
          nodeType={editingNode.type}
          chainNode={editingNode.chainNode}
          onClose={() => {
            console.log('🔴 [ChainEditor] モーダルを閉じます');
            setEditingNode(null);
          }}
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

      {showTemplateModal && (
        <TemplateModal
          onClose={() => setShowTemplateModal(false)}
          onSelectTemplate={(chain, flowNodes, flowEdges) => {
            setChainName(chain.name);
            setChainDescription(chain.description);
            setNodes(flowNodes);
            setEdges(flowEdges);
            setShowTemplateModal(false);
          }}
          onNodeClick={handleNodeClickRef.current || handleNodeClick}
        />
      )}
      </div>
    </>
  );
}

// ヘルパー関数はchainEditorUtils.tsに移動

