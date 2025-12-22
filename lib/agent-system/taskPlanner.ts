/**
 * タスクプランナー
 * タスクの依存関係を分析し、実行計画を作成
 */

import type { Task, ExecutionPlan, ExecutionStage, FullExecutionPlan, TaskType } from './types';
import { agentRegistry } from './agentRegistry';
import { TaskType as TT } from './types';
import { getExecutionTimePredictor } from './executionTimePredictor';
import { getExecutionAnalyzer } from './executionAnalyzer';

/**
 * キューイング戦略
 */
export enum QueueingStrategy {
  FIFO = 'fifo',                    // 先入先出（デフォルト）
  PRIORITY = 'priority',            // 優先度ベース
  SHORTEST_JOB_FIRST = 'sjf',      // 最短ジョブ優先
  ROUND_ROBIN = 'round_robin',     // ラウンドロビン
}

/**
 * タスクプランナー設定
 */
export interface TaskPlannerConfig {
  queueingStrategy: QueueingStrategy;
  enableAutoAgentSelection: boolean; // タスクタイプに基づく自動Agent選択
}

/**
 * タスクプランナー
 */
export class TaskPlanner {
  private config: TaskPlannerConfig;

  constructor(config: Partial<TaskPlannerConfig> = {}) {
    this.config = {
      queueingStrategy: config.queueingStrategy || QueueingStrategy.FIFO,
      enableAutoAgentSelection: config.enableAutoAgentSelection !== false,
    };
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<TaskPlannerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * タスクタイプに基づいて適切なAgentを自動選択（実行履歴分析を考慮）
   */
  private async selectAgentByTaskType(taskType: TaskType): Promise<string> {
    // 実行履歴分析器を使用して最適なAgentを推奨
    const analyzer = getExecutionAnalyzer();
    const recommendations = await analyzer.recommendAgentForTaskType(taskType);

    // 推奨されたAgentから、タスクタイプを実行可能なものを選択
    for (const recommendation of recommendations) {
      const agent = agentRegistry.get(recommendation.agentId);
      if (agent) {
        const agentDef = agent.getAgent();
        // Agentがこのタスクタイプを実行可能か確認
        if (agentDef.capabilities.includes(taskType)) {
          // 推奨スコアが高い場合のみ使用
          if (recommendation.score >= 0.3) {
            console.log(`[TaskPlanner] 実行履歴分析に基づいてAgentを選択: ${recommendation.agentId} (スコア: ${recommendation.score.toFixed(2)})`);
            return recommendation.agentId;
          }
        }
      }
    }

    // フォールバック: タスクタイプとAgentのマッピング
    const taskTypeToAgentRole: Record<TaskType, string[]> = {
      [TT.SEARCH]: ['search-agent', 'general-agent'],
      [TT.ANALYSIS]: ['analysis-agent', 'general-agent'],
      [TT.GENERATION]: ['generation-agent', 'general-agent'],
      [TT.VALIDATION]: ['validation-agent', 'general-agent'],
      [TT.COORDINATION]: ['general-agent'],
    };

    const preferredAgentIds = taskTypeToAgentRole[taskType] || ['general-agent'];

    // 優先順位に従ってAgentを検索
    for (const agentId of preferredAgentIds) {
      const agent = agentRegistry.get(agentId);
      if (agent) {
        const agentDef = agent.getAgent();
        // Agentがこのタスクタイプを実行可能か確認
        if (agentDef.capabilities.includes(taskType)) {
          return agentId;
        }
      }
    }

    // フォールバック: タスクタイプを実行可能なAgentを検索
    const capableAgents = agentRegistry.getByCapability(taskType);
    if (capableAgents.length > 0) {
      return capableAgents[0].getAgent().id;
    }

    // 最終フォールバック: general-agent
    return 'general-agent';
  }

  /**
   * 単一タスクの実行計画を作成
   */
  async createPlan(task: Task): Promise<ExecutionPlan> {
    // 依存関係を確認
    const dependencies = task.dependencies || [];

    // Agent IDが指定されていない場合、適切なAgentを自動選択（実行履歴分析を考慮）
    let assignedAgentId = task.agentId;
    if (!assignedAgentId && this.config.enableAutoAgentSelection) {
      assignedAgentId = await this.selectAgentByTaskType(task.type);
    } else if (!assignedAgentId) {
      assignedAgentId = 'general-agent';
    }

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

    // 2. 実行時間を予測（最適化のため）
    const predictor = getExecutionTimePredictor();
    const timePredictions = await predictor.predictMultipleTasks(tasks);

    // 3. クリティカルパスを計算（最長パスを特定）
    const criticalPath = this.calculateCriticalPath(tasks, dependencyGraph, timePredictions);

    // 4. トポロジカルソートで実行順序を決定（実行時間とクリティカルパスを考慮）
    const stages: ExecutionStage[] = [];
    const visited = new Set<string>();

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
          // 実行時間の短い順にソート（最短ジョブ優先）
          remainingTasks.sort((a, b) => {
            const timeA = timePredictions.get(a.id)?.estimatedTime || a.timeout || 60000;
            const timeB = timePredictions.get(b.id)?.estimatedTime || b.timeout || 60000;
            return timeA - timeB;
          });
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

      // 実行時間とクリティカルパスを考慮してソート
      // クリティカルパス上のタスクを優先し、その後実行時間の短い順
      availableTasks.sort((a, b) => {
        const isACritical = criticalPath.has(a.id);
        const isBCritical = criticalPath.has(b.id);
        
        // クリティカルパス上のタスクを優先
        if (isACritical && !isBCritical) return -1;
        if (!isACritical && isBCritical) return 1;
        
        // 両方ともクリティカルパス上、または両方ともそうでない場合、実行時間でソート
        const timeA = timePredictions.get(a.id)?.estimatedTime || a.timeout || 60000;
        const timeB = timePredictions.get(b.id)?.estimatedTime || b.timeout || 60000;
        return timeA - timeB;
      });

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
   * クリティカルパスを計算（最長パスを特定）
   */
  private calculateCriticalPath(
    tasks: Task[],
    dependencyGraph: Map<string, string[]>,
    timePredictions: Map<string, { estimatedTime: number }>
  ): Set<string> {
    const criticalPath = new Set<string>();
    
    // 各タスクの最長パス長を計算
    const longestPath = new Map<string, number>();
    
    // 依存関係がないタスクから開始
    const getTasksWithoutDependencies = (): Task[] => {
      return tasks.filter(task => {
        const deps = dependencyGraph.get(task.id) || [];
        return deps.length === 0;
      });
    };

    // 初期化
    for (const task of tasks) {
      longestPath.set(task.id, 0);
    }

    // トポロジカル順序で最長パスを計算
    const visited = new Set<string>();
    const queue: Task[] = getTasksWithoutDependencies();

    while (queue.length > 0) {
      const task = queue.shift()!;
      if (visited.has(task.id)) continue;
      visited.add(task.id);

      const taskTime = timePredictions.get(task.id)?.estimatedTime || task.timeout || 60000;
      const currentPathLength = longestPath.get(task.id) || 0;
      const newPathLength = currentPathLength + taskTime;

      // 依存タスクの最長パスを更新
      const dependents = Array.from(dependencyGraph.entries())
        .filter(([_, deps]) => deps.includes(task.id))
        .map(([taskId]) => tasks.find(t => t.id === taskId))
        .filter((t): t is Task => t !== undefined);

      for (const dependent of dependents) {
        const dependentPathLength = longestPath.get(dependent.id) || 0;
        if (newPathLength > dependentPathLength) {
          longestPath.set(dependent.id, newPathLength);
        }
        
        // 依存関係がすべて処理されたタスクをキューに追加
        const deps = dependencyGraph.get(dependent.id) || [];
        if (deps.every(depId => visited.has(depId))) {
          queue.push(dependent);
        }
      }
    }

    // 最長パス長を特定
    let maxPathLength = 0;
    for (const pathLength of longestPath.values()) {
      maxPathLength = Math.max(maxPathLength, pathLength);
    }

    // 最長パス上のタスクを特定（簡易実装）
    // 実際の実装では、より正確なクリティカルパス計算が必要
    for (const task of tasks) {
      const pathLength = longestPath.get(task.id) || 0;
      if (pathLength >= maxPathLength * 0.9) { // 90%以上の場合、クリティカルパスとみなす
        criticalPath.add(task.id);
      }
    }

    return criticalPath;
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

