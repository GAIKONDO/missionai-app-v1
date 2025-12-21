/**
 * タスクテンプレート機能
 * タスクテンプレートの定義と管理
 */

import type { Task, TaskType } from './types';
import { generateId } from './utils';

/**
 * タスクテンプレート定義
 */
export interface TaskTemplate {
  id: string;                    // テンプレートID
  name: string;                  // テンプレート名
  description: string;           // テンプレートの説明
  type: TaskType;                // タスクタイプ
  defaultParameters: Record<string, any>; // デフォルトパラメータ
  requiredParameters: string[];   // 必須パラメータ
  optionalParameters: string[];  // オプションパラメータ
  defaultPriority: number;       // デフォルト優先度
  defaultTimeout?: number;       // デフォルトタイムアウト
  defaultRetryCount?: number;    // デフォルトリトライ回数
  category: string;              // カテゴリ
  tags: string[];                // タグ
  createdAt: number;             // 作成日時
  updatedAt: number;             // 更新日時
}

/**
 * テンプレートからタスクを生成
 */
export function createTaskFromTemplate(
  template: TaskTemplate,
  overrides: {
    name?: string;
    description?: string;
    parameters?: Record<string, any>;
    priority?: number;
    timeout?: number;
    retryCount?: number;
    agentId?: string;
    dependencies?: string[];
  } = {}
): Task {
  // パラメータをマージ（テンプレートのデフォルト + オーバーライド）
  const parameters = {
    ...template.defaultParameters,
    ...overrides.parameters,
  };

  // 必須パラメータのチェック
  for (const param of template.requiredParameters) {
    if (!(param in parameters)) {
      throw new Error(`必須パラメータ "${param}" が指定されていません`);
    }
  }

  return {
    id: generateId('task'),
    name: overrides.name || template.name,
    description: overrides.description || template.description,
    type: template.type,
    agentId: overrides.agentId,
    parameters,
    priority: overrides.priority ?? template.defaultPriority,
    timeout: overrides.timeout ?? template.defaultTimeout,
    retryCount: overrides.retryCount ?? template.defaultRetryCount,
    dependencies: overrides.dependencies,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * 標準タスクテンプレート
 */
export const STANDARD_TEMPLATES: TaskTemplate[] = [
  {
    id: 'template-search-knowledge-graph',
    name: 'ナレッジグラフ検索',
    description: 'ナレッジグラフを検索して関連情報を取得します',
    type: 'search' as TaskType,
    defaultParameters: {
      query: '',
      limit: 10,
    },
    requiredParameters: ['query'],
    optionalParameters: ['limit', 'organizationId'],
    defaultPriority: 5,
    defaultTimeout: 30000,
    category: '検索',
    tags: ['knowledge-graph', 'search', 'rag'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'template-analyze-topic',
    name: 'トピック分析',
    description: 'トピックを分析して洞察を抽出します',
    type: 'analysis' as TaskType,
    defaultParameters: {
      topicId: '',
    },
    requiredParameters: ['topicId'],
    optionalParameters: ['analysisType', 'depth'],
    defaultPriority: 6,
    defaultTimeout: 60000,
    category: '分析',
    tags: ['analysis', 'topic', 'insight'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'template-generate-summary',
    name: '要約生成',
    description: '指定された内容の要約を生成します',
    type: 'generation' as TaskType,
    defaultParameters: {
      content: '',
      maxLength: 500,
    },
    requiredParameters: ['content'],
    optionalParameters: ['maxLength', 'style'],
    defaultPriority: 5,
    defaultTimeout: 45000,
    category: '生成',
    tags: ['generation', 'summary', 'text'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'template-validate-data',
    name: 'データ検証',
    description: 'データの整合性を検証します',
    type: 'validation' as TaskType,
    defaultParameters: {
      data: {},
      validationRules: [],
    },
    requiredParameters: ['data'],
    optionalParameters: ['validationRules', 'strict'],
    defaultPriority: 7,
    defaultTimeout: 20000,
    category: '検証',
    tags: ['validation', 'data', 'quality'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'template-coordinate-agents',
    name: 'Agent協調',
    description: '複数のAgentを協調させてタスクを実行します',
    type: 'coordination' as TaskType,
    defaultParameters: {
      targetAgents: [],
      coordinationType: 'parallel',
    },
    requiredParameters: ['targetAgents'],
    optionalParameters: ['coordinationType', 'waitForAll'],
    defaultPriority: 8,
    defaultTimeout: 120000,
    category: '協調',
    tags: ['coordination', 'multi-agent', 'parallel'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

/**
 * テンプレートを取得
 */
export function getTemplate(templateId: string): TaskTemplate | undefined {
  return STANDARD_TEMPLATES.find(t => t.id === templateId);
}

/**
 * すべてのテンプレートを取得
 */
export function getAllTemplates(): TaskTemplate[] {
  return [...STANDARD_TEMPLATES];
}

/**
 * カテゴリでテンプレートを取得
 */
export function getTemplatesByCategory(category: string): TaskTemplate[] {
  return STANDARD_TEMPLATES.filter(t => t.category === category);
}

/**
 * タグでテンプレートを取得
 */
export function getTemplatesByTag(tag: string): TaskTemplate[] {
  return STANDARD_TEMPLATES.filter(t => t.tags.includes(tag));
}

/**
 * タスクタイプでテンプレートを取得
 */
export function getTemplatesByType(type: TaskType): TaskTemplate[] {
  return STANDARD_TEMPLATES.filter(t => t.type === type);
}

