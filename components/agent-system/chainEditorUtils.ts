/**
 * ChainEditor用のユーティリティ関数
 */

import type { TaskChain, ChainNode } from '@/lib/agent-system/taskChain';
import { getTaskChainManager } from '@/lib/agent-system/taskChain';
import { generateId } from '@/lib/agent-system/utils';

export function getNodeLabel(type: 'start' | 'task' | 'condition' | 'loop' | 'end'): string {
  const labels = {
    start: '開始',
    task: 'タスク',
    condition: '条件分岐',
    loop: 'ループ',
    end: '終了',
  };
  return labels[type];
}

export function createChainNode(type: 'start' | 'task' | 'condition' | 'loop' | 'end'): ChainNode {
  const id = generateId();
  switch (type) {
    case 'start':
      return {
        id,
        type: 'task', // startは内部的にtaskとして扱う
      };
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
    case 'end':
      return {
        id,
        type: 'task', // endは内部的にtaskとして扱う
      };
    default:
      return {
        id,
        type: 'task',
      };
  }
}

export function convertChainToFlowNodes(
  chain: TaskChain,
  onNodeClick?: (nodeId: string, nodeData: any) => void
): any[] {
  const nodes: any[] = [];
  let xPosition = 0;
  const ySpacing = 150;
  let yPosition = 0;
  
  // 開始ノードから順に配置
  const visited = new Set<string>();
  const nodeMap = new Map<string, { id: string; chainNode: ChainNode; nodeType: string }>();
  
  chain.nodes.forEach((chainNode, nodeId) => {
    // 開始ノードと終了ノードを判定
    let nodeType: 'start' | 'task' | 'condition' | 'loop' | 'end' = 'task';
    if (nodeId === chain.startNodeId) {
      nodeType = 'start';
    } else if (chainNode.type === 'condition') {
      nodeType = 'condition';
    } else if (chainNode.type === 'loop') {
      nodeType = 'loop';
    } else {
      // 終了ノードの判定（nextNodeIdがない場合）
      if (!chainNode.nextNodeId && !chainNode.trueBranch && !chainNode.falseBranch) {
        nodeType = 'end';
      } else {
        nodeType = 'task';
      }
    }
    nodeMap.set(nodeId, { id: nodeId, chainNode, nodeType });
  });
  
  // BFSでノードを配置（左から右へ）
  const queue: string[] = [];
  if (chain.startNodeId) {
    queue.push(chain.startNodeId);
  } else if (nodeMap.size > 0) {
    queue.push(Array.from(nodeMap.keys())[0]);
  }
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    
    const nodeInfo = nodeMap.get(nodeId);
    if (!nodeInfo) continue;
    
    const nodeData = {
      label: getNodeLabel(nodeInfo.nodeType as 'start' | 'task' | 'condition' | 'loop' | 'end'),
      nodeType: nodeInfo.nodeType,
      chainNode: nodeInfo.chainNode,
      onNodeClick: onNodeClick,
    };
    
    console.log('📦 [convertChainToFlowNodes] ノードを作成:', { 
      nodeId, 
      hasOnNodeClick: !!onNodeClick,
      nodeType: nodeInfo.nodeType,
    });
    
    nodes.push({
      id: nodeId,
      type: 'customNode',
      position: { x: xPosition, y: yPosition },
      data: nodeData,
    });
    
    // 次のノードをキューに追加
    const chainNode = nodeInfo.chainNode;
    if (chainNode.nextNodeId && !visited.has(chainNode.nextNodeId)) {
      queue.push(chainNode.nextNodeId);
    }
    if (chainNode.trueBranch && !visited.has(chainNode.trueBranch)) {
      queue.push(chainNode.trueBranch);
    }
    if (chainNode.falseBranch && !visited.has(chainNode.falseBranch)) {
      queue.push(chainNode.falseBranch);
    }
    
    // 次のX位置に移動
    xPosition += 250;
    yPosition = (yPosition + ySpacing) % 400; // Y位置を循環させる
  }
  
  // 未訪問のノードも追加
  nodeMap.forEach((nodeInfo, nodeId) => {
    if (!visited.has(nodeId)) {
      const nodeData = {
        label: getNodeLabel(nodeInfo.nodeType),
        nodeType: nodeInfo.nodeType,
        chainNode: nodeInfo.chainNode,
        onNodeClick: onNodeClick,
      };
      
      console.log('📦 [convertChainToFlowNodes] 未訪問ノードを作成:', { 
        nodeId, 
        hasOnNodeClick: !!onNodeClick,
        nodeType: nodeInfo.nodeType,
      });
      
      nodes.push({
        id: nodeId,
        type: 'customNode',
        position: { x: xPosition, y: yPosition },
        data: nodeData,
      });
      xPosition += 250;
      yPosition = (yPosition + ySpacing) % 400;
    }
  });
  
  return nodes;
}

export function convertChainToFlowEdges(chain: TaskChain): any[] {
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

export function convertFlowToChain(
  nodes: any[],
  edges: any[],
  name: string,
  description: string,
  existingChainId?: string
): TaskChain {
  const chainNodes = new Map<string, ChainNode>();
  let startNodeId = '';
  let existingChain: TaskChain | undefined;

  // 既存のチェーンがある場合は読み込む
  if (existingChainId) {
    const manager = getTaskChainManager();
    existingChain = manager.getChain(existingChainId) || undefined;
  }

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
    id: existingChain?.id || generateId(),
    name: name || '無題のチェーン',
    description,
    startNodeId: startNodeId || nodes[0]?.id || '',
    nodes: chainNodes,
    createdAt: existingChain?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
}

