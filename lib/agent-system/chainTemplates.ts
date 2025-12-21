/**
 * チェーンテンプレート
 * よく使うチェーンのテンプレート定義
 */

import type { TaskChain, ChainNode } from './taskChain';
import { generateId } from './utils';
import { TaskType } from './types';

/**
 * チェーンテンプレート定義
 */
export interface ChainTemplate {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'search' | 'analysis' | 'generation' | 'validation' | 'complex';
  chain: Omit<TaskChain, 'id' | 'createdAt' | 'updatedAt'>;
}

/**
 * 基本的な検索→分析チェーン
 */
export function createSearchAnalysisTemplate(): ChainTemplate {
  const startNodeId = generateId();
  const searchNodeId = generateId();
  const analysisNodeId = generateId();
  const endNodeId = generateId();

  const nodes = new Map<string, ChainNode>();
  
  // 開始ノード（実際にはChainNodeには開始ノードタイプがないので、最初のタスクノードを開始とする）
  nodes.set(startNodeId, {
    id: startNodeId,
    type: 'task',
    task: {
      id: generateId(),
      name: '開始',
      description: 'チェーンの開始',
      type: TaskType.SEARCH,
      parameters: {},
      priority: 10,
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    nextNodeId: searchNodeId,
  });

  // 検索ノード
  nodes.set(searchNodeId, {
    id: searchNodeId,
    type: 'task',
    task: {
      id: generateId(),
      name: 'ナレッジグラフ検索',
      description: 'ナレッジグラフから情報を検索',
      type: TaskType.SEARCH,
      parameters: {
        query: '',
        limit: 10,
      },
      priority: 8,
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    nextNodeId: analysisNodeId,
  });

  // 分析ノード
  nodes.set(analysisNodeId, {
    id: analysisNodeId,
    type: 'task',
    task: {
      id: generateId(),
      name: '検索結果の分析',
      description: '検索結果を分析',
      type: TaskType.ANALYSIS,
      parameters: {
        data: 'result',
        analysisType: 'general',
      },
      priority: 6,
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    nextNodeId: endNodeId,
  });

  // 終了ノード
  nodes.set(endNodeId, {
    id: endNodeId,
    type: 'task',
    task: {
      id: generateId(),
      name: '終了',
      description: 'チェーンの終了',
      type: TaskType.VALIDATION,
      parameters: {},
      priority: 1,
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  });

  return {
    id: 'search-analysis-template',
    name: '検索→分析チェーン',
    description: 'ナレッジグラフを検索し、結果を分析する基本的なチェーン',
    category: 'basic',
    chain: {
      name: '検索→分析チェーン',
      description: 'ナレッジグラフを検索し、結果を分析する基本的なチェーン',
      startNodeId,
      nodes,
    },
  };
}

/**
 * 条件分岐を含むチェーン
 */
export function createConditionalTemplate(): ChainTemplate {
  const startNodeId = generateId();
  const task1NodeId = generateId();
  const conditionNodeId = generateId();
  const task2TrueNodeId = generateId();
  const task2FalseNodeId = generateId();
  const endNodeId = generateId();

  const nodes = new Map<string, ChainNode>();

  nodes.set(startNodeId, {
    id: startNodeId,
    type: 'task',
    task: {
      id: generateId(),
      name: '開始',
      description: 'チェーンの開始',
      type: TaskType.SEARCH,
      parameters: {},
      priority: 10,
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    nextNodeId: task1NodeId,
  });

  nodes.set(task1NodeId, {
    id: task1NodeId,
    type: 'task',
    task: {
      id: generateId(),
      name: 'タスク1',
      description: '最初のタスク',
      type: TaskType.SEARCH,
      parameters: {},
      priority: 8,
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    nextNodeId: conditionNodeId,
  });

  nodes.set(conditionNodeId, {
    id: conditionNodeId,
    type: 'condition',
    condition: {
      type: 'equals',
      field: 'result.status',
      value: 'success',
    },
    trueBranch: task2TrueNodeId,
    falseBranch: task2FalseNodeId,
  });

  nodes.set(task2TrueNodeId, {
    id: task2TrueNodeId,
    type: 'task',
    task: {
      id: generateId(),
      name: '成功時の処理',
      description: '条件が真の場合の処理',
      type: TaskType.GENERATION,
      parameters: {},
      priority: 6,
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    nextNodeId: endNodeId,
  });

  nodes.set(task2FalseNodeId, {
    id: task2FalseNodeId,
    type: 'task',
    task: {
      id: generateId(),
      name: '失敗時の処理',
      description: '条件が偽の場合の処理',
      type: TaskType.VALIDATION,
      parameters: {},
      priority: 6,
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    nextNodeId: endNodeId,
  });

  nodes.set(endNodeId, {
    id: endNodeId,
    type: 'task',
    task: {
      id: generateId(),
      name: '終了',
      description: 'チェーンの終了',
      type: TaskType.VALIDATION,
      parameters: {},
      priority: 1,
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  });

  return {
    id: 'conditional-template',
    name: '条件分岐チェーン',
    description: '条件分岐を含むチェーンのテンプレート',
    category: 'complex',
    chain: {
      name: '条件分岐チェーン',
      description: '条件分岐を含むチェーンのテンプレート',
      startNodeId,
      nodes,
    },
  };
}

/**
 * ループを含むチェーン
 */
export function createLoopTemplate(): ChainTemplate {
  const startNodeId = generateId();
  const loopNodeId = generateId();
  const taskNodeId = generateId();
  const endNodeId = generateId();

  const nodes = new Map<string, ChainNode>();

  nodes.set(startNodeId, {
    id: startNodeId,
    type: 'task',
    task: {
      id: generateId(),
      name: '開始',
      description: 'チェーンの開始',
      type: TaskType.SEARCH,
      parameters: {},
      priority: 10,
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    nextNodeId: loopNodeId,
  });

  nodes.set(loopNodeId, {
    id: loopNodeId,
    type: 'loop',
    loopCount: 5,
    nextNodeId: taskNodeId,
  });

  nodes.set(taskNodeId, {
    id: taskNodeId,
    type: 'task',
    task: {
      id: generateId(),
      name: 'ループ内タスク',
      description: 'ループ内で実行されるタスク',
      type: TaskType.ANALYSIS,
      parameters: {},
      priority: 6,
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    nextNodeId: endNodeId,
  });

  nodes.set(endNodeId, {
    id: endNodeId,
    type: 'task',
    task: {
      id: generateId(),
      name: '終了',
      description: 'チェーンの終了',
      type: TaskType.VALIDATION,
      parameters: {},
      priority: 1,
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  });

  return {
    id: 'loop-template',
    name: 'ループチェーン',
    description: 'ループ処理を含むチェーンのテンプレート',
    category: 'complex',
    chain: {
      name: 'ループチェーン',
      description: 'ループ処理を含むチェーンのテンプレート',
      startNodeId,
      nodes,
    },
  };
}

/**
 * すべてのテンプレートを取得
 */
export function getAllChainTemplates(): ChainTemplate[] {
  return [
    createSearchAnalysisTemplate(),
    createConditionalTemplate(),
    createLoopTemplate(),
  ];
}

/**
 * カテゴリ別にテンプレートを取得
 */
export function getChainTemplatesByCategory(category: ChainTemplate['category']): ChainTemplate[] {
  return getAllChainTemplates().filter((t) => t.category === category);
}

/**
 * テンプレートからチェーンを作成
 */
export function createChainFromTemplate(template: ChainTemplate): TaskChain {
  return {
    ...template.chain,
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

