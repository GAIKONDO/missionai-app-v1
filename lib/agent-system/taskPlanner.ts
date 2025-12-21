/**
 * タスクプランナー
 * タスクの依存関係を分析し、実行計画を作成
 */

import type { Task, ExecutionPlan, ExecutionStage, FullExecutionPlan } from './types';

/**
 * タスクプランナー
 */
export class TaskPlanner {
  /**
   * 単一タスクの実行計画を作成
   */
  async createPlan(task: Task): Promise<ExecutionPlan> {
    // 依存関係を確認
    const dependencies = task.dependencies || [];

    // Agent IDが指定されていない場合、適切なAgentを選択する必要がある
    // 現時点では、タスクタイプに基づいてAgentを選択（後で実装）
    const assignedAgentId = task.agentId || 'general';

    return {
      taskId: task.id,
      assignedAgentId,
      dependencies,
    };
  }

  /**
   * 複数タスクの実行計画を作成
   */
  async createExecutionPlan(tasks: Task[]): Promise<FullExecutionPlan> {
    // 1. 依存関係グラフを構築
    const taskMap = new Map<string, Task>();
    const dependencyGraph = new Map<string, string[]>();
    const reverseDependencyGraph = new Map<string, string[]>();

    for (const task of tasks) {
      taskMap.set(task.id, task);
      dependencyGraph.set(task.id, task.dependencies || []);
      
      // 逆方向の依存関係グラフを構築
      if (!reverseDependencyGraph.has(task.id)) {
        reverseDependencyGraph.set(task.id, []);
      }
      
      for (const depId of task.dependencies || []) {
        if (!reverseDependencyGraph.has(depId)) {
          reverseDependencyGraph.set(depId, []);
        }
        reverseDependencyGraph.get(depId)!.push(task.id);
      }
    }

    // 2. トポロジカルソートで実行順序を決定
    const stages: ExecutionStage[] = [];
    const visited = new Set<string>();
    const inProgress = new Set<string>();

    // 依存関係がないタスクから開始
    const getTasksWithoutDependencies = (): Task[] => {
      return tasks.filter(task => {
        if (visited.has(task.id)) return false;
        const deps = dependencyGraph.get(task.id) || [];
        return deps.every(depId => visited.has(depId));
      });
    };

    let stageNumber = 0;
    while (visited.size < tasks.length) {
      const availableTasks = getTasksWithoutDependencies();
      
      if (availableTasks.length === 0) {
        // 循環依存の可能性がある
        console.warn('[TaskPlanner] 循環依存の可能性があります');
        // 残りのタスクを強制的に追加
        const remainingTasks = tasks.filter(task => !visited.has(task.id));
        if (remainingTasks.length > 0) {
          stages.push({
            stageNumber: stageNumber++,
            tasks: remainingTasks,
          });
          for (const task of remainingTasks) {
            visited.add(task.id);
          }
        }
        break;
      }

      stages.push({
        stageNumber: stageNumber++,
        tasks: availableTasks,
      });

      for (const task of availableTasks) {
        visited.add(task.id);
      }
    }

    return {
      stages,
    };
  }

  /**
   * タスクの依存関係を検証
   */
  validateDependencies(tasks: Task[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const taskIds = new Set(tasks.map(t => t.id));

    for (const task of tasks) {
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          if (!taskIds.has(depId)) {
            errors.push(`タスク "${task.name}" (${task.id}) の依存タスク "${depId}" が見つかりません`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

