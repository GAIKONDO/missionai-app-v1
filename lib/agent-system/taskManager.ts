/**
 * タスク管理機能
 * タスクのCRUD操作と実行履歴の管理
 */

import type { Task, TaskExecution } from './types';
import { invoke } from '@tauri-apps/api/core';

/**
 * タスクを保存
 */
export async function saveTask(task: Task): Promise<void> {
  await invoke('save_task_command', {
    task: {
      ...task,
      requiredAgents: JSON.stringify(task.requiredAgents || []),
      dependencies: JSON.stringify(task.dependencies || []),
      parameters: JSON.stringify(task.parameters),
    },
  });
}

/**
 * タスクを取得
 */
export async function getTask(taskId: string): Promise<Task | null> {
  const task: any = await invoke('get_task_command', { taskId });
  if (!task) return null;

  return {
    ...task,
    requiredAgents: task.requiredAgents ? JSON.parse(task.requiredAgents) : [],
    dependencies: task.dependencies ? JSON.parse(task.dependencies) : [],
    parameters: task.parameters ? JSON.parse(task.parameters) : {},
  };
}

/**
 * すべてのタスクを取得
 */
export async function getAllTasks(): Promise<Task[]> {
  const tasks: any[] = await invoke('get_all_tasks_command');
  return tasks.map(task => ({
    ...task,
    requiredAgents: task.requiredAgents ? JSON.parse(task.requiredAgents) : [],
    dependencies: task.dependencies ? JSON.parse(task.dependencies) : [],
    parameters: task.parameters ? JSON.parse(task.parameters) : {},
  }));
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

