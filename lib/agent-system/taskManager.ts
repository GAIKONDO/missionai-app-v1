/**
 * タスク管理機能
 * タスクのCRUD操作と実行履歴の管理
 */

import type { Task, TaskExecution } from './types';
import type { TaskChain } from './taskChain';
import { invoke } from '@tauri-apps/api/core';

/**
 * タスクを保存
 */
export async function saveTask(task: Task): Promise<void> {
  // ミリ秒のタイムスタンプを秒単位の文字列に変換
  const createdAtStr = typeof task.createdAt === 'number' 
    ? Math.floor(task.createdAt / 1000).toString() 
    : task.createdAt.toString();
  const updatedAtStr = typeof task.updatedAt === 'number' 
    ? Math.floor(task.updatedAt / 1000).toString() 
    : task.updatedAt.toString();

  // typeフィールドを文字列に変換（enumの場合）
  const typeStr = typeof task.type === 'string' ? task.type : String(task.type);

  await invoke('save_task_command', {
    task: {
      id: task.id,
      name: task.name,
      description: task.description,
      type: typeStr,
      agentId: task.agentId || null,
      requiredAgents: JSON.stringify(task.requiredAgents || []),
      dependencies: JSON.stringify(task.dependencies || []),
      parameters: JSON.stringify(task.parameters),
      priority: task.priority,
      timeout: task.timeout || null,
      retryCount: task.retryCount || null,
      modelType: task.modelType || null,
      selectedModel: task.selectedModel || null,
      createdAt: createdAtStr,
      updatedAt: updatedAtStr,
    },
  });
}

/**
 * タスクを取得
 */
export async function getTask(taskId: string): Promise<Task | null> {
  const task: any = await invoke('get_task_command', { taskId });
  if (!task) return null;

  // 秒単位の文字列タイムスタンプをミリ秒の数値に変換
  const createdAt = typeof task.createdAt === 'string' 
    ? parseInt(task.createdAt, 10) * 1000 
    : task.createdAt;
  const updatedAt = typeof task.updatedAt === 'string' 
    ? parseInt(task.updatedAt, 10) * 1000 
    : task.updatedAt;

  return {
    ...task,
    requiredAgents: task.requiredAgents ? JSON.parse(task.requiredAgents) : [],
    dependencies: task.dependencies ? JSON.parse(task.dependencies) : [],
    parameters: task.parameters ? JSON.parse(task.parameters) : {},
    createdAt,
    updatedAt,
  };
}

/**
 * すべてのタスクを取得
 */
export async function getAllTasks(): Promise<Task[]> {
  const tasks: any[] = await invoke('get_all_tasks_command');
  return tasks.map(task => {
    // 秒単位の文字列タイムスタンプをミリ秒の数値に変換
    const createdAt = typeof task.createdAt === 'string' 
      ? parseInt(task.createdAt, 10) * 1000 
      : task.createdAt;
    const updatedAt = typeof task.updatedAt === 'string' 
      ? parseInt(task.updatedAt, 10) * 1000 
      : task.updatedAt;

    return {
      ...task,
      requiredAgents: task.requiredAgents ? JSON.parse(task.requiredAgents) : [],
      dependencies: task.dependencies ? JSON.parse(task.dependencies) : [],
      parameters: task.parameters ? JSON.parse(task.parameters) : {},
      createdAt,
      updatedAt,
    };
  });
}

/**
 * タスクを削除
 */
export async function deleteTask(taskId: string): Promise<void> {
  await invoke('delete_task_command', { taskId });
}

/**
 * タスク実行を保存
 */
export async function saveTaskExecution(execution: TaskExecution): Promise<void> {
  await invoke('save_task_execution_command', {
    execution: {
      ...execution,
      result: execution.result ? JSON.stringify(execution.result) : null,
      logs: JSON.stringify(execution.logs),
    },
  });
}

/**
 * タスク実行を取得
 */
export async function getTaskExecution(executionId: string): Promise<TaskExecution | null> {
  const execution: any = await invoke('get_task_execution_command', { executionId });
  if (!execution) return null;

  return {
    ...execution,
    result: execution.result ? JSON.parse(execution.result) : undefined,
    logs: execution.logs ? JSON.parse(execution.logs) : [],
  };
}

/**
 * タスクIDに関連する実行履歴を取得
 */
export async function getTaskExecutions(taskId: string): Promise<TaskExecution[]> {
  const executions: any[] = await invoke('get_task_executions_command', { taskId });
  return executions.map(exec => ({
    ...exec,
    result: exec.result ? JSON.parse(exec.result) : undefined,
    logs: exec.logs ? JSON.parse(exec.logs) : [],
  }));
}

/**
 * すべての実行履歴を取得
 */
export async function getAllTaskExecutions(): Promise<TaskExecution[]> {
  const executions: any[] = await invoke('get_all_task_executions_command');
  return executions.map(exec => ({
    ...exec,
    result: exec.result ? JSON.parse(exec.result) : undefined,
    logs: exec.logs ? JSON.parse(exec.logs) : [],
  }));
}

/**
 * タスクチェーンを保存
 */
export async function saveTaskChain(chain: TaskChain): Promise<void> {
  // MapをJSONオブジェクトに変換
  const nodesObj: Record<string, any> = {};
  chain.nodes.forEach((node, key) => {
    nodesObj[key] = node;
  });

  await invoke('save_task_chain_command', {
    chain: {
      id: chain.id,
      name: chain.name,
      description: chain.description,
      startNodeId: chain.startNodeId,
      nodes: JSON.stringify(nodesObj),
      createdAt: chain.createdAt,
      updatedAt: chain.updatedAt,
    },
  });
}

/**
 * タスクチェーンを取得
 */
export async function getTaskChain(chainId: string): Promise<TaskChain | null> {
  const chain: any = await invoke('get_task_chain_command', { chainId });
  if (!chain) return null;

  // JSONオブジェクトをMapに変換
  const nodesObj = JSON.parse(chain.nodes);
  const nodes = new Map<string, any>();
  Object.entries(nodesObj).forEach(([key, value]) => {
    nodes.set(key, value);
  });

  return {
    id: chain.id,
    name: chain.name,
    description: chain.description,
    startNodeId: chain.startNodeId,
    nodes,
    createdAt: chain.createdAt,
    updatedAt: chain.updatedAt,
  };
}

/**
 * すべてのタスクチェーンを取得
 */
export async function getAllTaskChains(): Promise<TaskChain[]> {
  const chains: any[] = await invoke('get_all_task_chains_command');
  return chains.map(chain => {
    // JSONオブジェクトをMapに変換
    const nodesObj = JSON.parse(chain.nodes);
    const nodes = new Map<string, any>();
    Object.entries(nodesObj).forEach(([key, value]) => {
      nodes.set(key, value);
    });

    return {
      id: chain.id,
      name: chain.name,
      description: chain.description,
      startNodeId: chain.startNodeId,
      nodes,
      createdAt: chain.createdAt,
      updatedAt: chain.updatedAt,
    };
  });
}

/**
 * タスクチェーンを削除
 */
export async function deleteTaskChain(chainId: string): Promise<void> {
  await invoke('delete_task_chain_command', { chainId });
}

