/**
 * Agentオーケストレーター
 * タスクの受付、Agentへの配分、実行管理を行う
 */

import type { Task, TaskExecution, ExecutionStatus, ExecutionPlan, FullExecutionPlan } from './types';
import { ExecutionStatus as ES } from './types';
import { TaskPlanner } from './taskPlanner';
import { agentRegistry } from './agentRegistry';
import { getA2AManager } from './a2aManager';
import { generateId } from './utils';
import { getErrorHandler } from './errorHandler';

/**
 * Agentオーケストレーター
 */
export class AgentOrchestrator {
  private taskPlanner: TaskPlanner;
  private a2aManager = getA2AManager();
  private executions: Map<string, TaskExecution> = new Map();

  constructor() {
    this.taskPlanner = new TaskPlanner();
  }

  /**
   * タスクを実行
   */
  async executeTask(task: Task): Promise<TaskExecution> {
    // 1. 実行計画を作成
    const plan = await this.taskPlanner.createPlan(task);

    // 2. 実行IDを生成
    const executionId = generateId('exec');

    // 3. 実行記録を作成
    const execution: TaskExecution = {
      id: executionId,
      taskId: task.id,
      agentId: plan.assignedAgentId,
      status: ES.PENDING,
      startedAt: Date.now(),
      logs: [],
    };

    this.executions.set(executionId, execution);

    // 4. Agentを取得
    const agent = agentRegistry.get(plan.assignedAgentId);
    if (!agent) {
      execution.status = ES.FAILED;
      execution.completedAt = Date.now();
      execution.error = `Agent ${plan.assignedAgentId} not found`;
      return execution;
    }

    // 5. タスクが実行可能かチェック
    if (!agent.canExecuteTask(task)) {
      execution.status = ES.FAILED;
      execution.completedAt = Date.now();
      execution.error = `Agent ${plan.assignedAgentId} cannot execute task type ${task.type}`;
      return execution;
    }

    // 6. タスクを実行
    execution.status = ES.RUNNING;
    try {
      const result = await agent.executeTask(task, {
        executionId,
        a2aManager: this.a2aManager,
      });

      execution.status = ES.COMPLETED;
      execution.completedAt = Date.now();
      execution.result = result;
    } catch (error: any) {
      const errorHandler = getErrorHandler();
      const errorInfo = errorHandler.classifyError(error);

      execution.status = ES.FAILED;
      execution.completedAt = Date.now();
      execution.error = errorInfo.message;
      this.addLog(execution, 'error', `タスク実行エラー: ${errorInfo.message}`, errorInfo);

      // エラー通知
      await errorHandler.notifyError(errorInfo, task, execution);

      // リトライ可能なエラーで、リトライ回数が残っている場合
      if (errorInfo.retryable && task.retryCount && task.retryCount > 0) {
        const retryPolicy = {
          maxRetries: task.retryCount,
          retryDelay: 1000,
          backoffMultiplier: 2,
        };

        const retryExecution = await errorHandler.retryTask(task, execution, retryPolicy);
        
        // リトライが成功した場合、実行結果を更新
        if (retryExecution.status === ES.COMPLETED) {
          execution.status = ES.COMPLETED;
          execution.completedAt = retryExecution.completedAt;
          execution.result = retryExecution.result;
          execution.error = undefined;
          this.addLog(execution, 'info', `リトライ成功: ${task.retryCount}回のリトライ後に成功`);
        } else {
          // リトライも失敗
          execution.status = ES.FAILED;
          execution.error = retryExecution.error || errorInfo.message;
        }
      }
    }

    return execution;
  }

  /**
   * 複数タスクを実行（依存関係を考慮）
   */
  async executeTasks(tasks: Task[]): Promise<TaskExecution[]> {
    // 1. 依存関係を検証
    const validation = this.taskPlanner.validateDependencies(tasks);
    if (!validation.valid) {
      throw new Error(`依存関係エラー: ${validation.errors.join(', ')}`);
    }

    // 2. 実行計画を作成
    const plan = await this.taskPlanner.createExecutionPlan(tasks);

    // 3. 順次実行と並列実行を処理
    const results: TaskExecution[] = [];

    for (const stage of plan.stages) {
      // 並列実行可能なタスクを同時に実行
      const stageResults = await Promise.all(
        stage.tasks.map(task => this.executeTask(task))
      );
      results.push(...stageResults);

      // ステージ内で失敗したタスクがある場合、後続のステージをスキップするか検討
      const hasFailure = stageResults.some(r => r.status === ES.FAILED);
      if (hasFailure) {
        console.warn(`[AgentOrchestrator] ステージ ${stage.stageNumber} で失敗が発生しました`);
        // 現時点では続行（必要に応じて変更可能）
      }
    }

    return results;
  }

  /**
   * 実行状態を取得
   */
  getExecution(executionId: string): TaskExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * すべての実行を取得
   */
  getAllExecutions(): TaskExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * タスクIDに関連する実行を取得
   */
  getExecutionsByTaskId(taskId: string): TaskExecution[] {
    return Array.from(this.executions.values()).filter(
      exec => exec.taskId === taskId
    );
  }

  /**
   * 実行をキャンセル
   */
  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === ES.RUNNING) {
      execution.status = ES.CANCELLED;
      execution.completedAt = Date.now();
      this.addLog(execution, 'info', '実行がキャンセルされました');
    }
  }

  /**
   * 実行ログを追加
   */
  private addLog(
    execution: TaskExecution,
    level: 'info' | 'warn' | 'error',
    message: string,
    data?: any
  ): void {
    execution.logs.push({
      timestamp: Date.now(),
      level,
      message,
      data,
    });
  }
}

/**
 * グローバルAgentオーケストレーターインスタンス
 */
let globalOrchestrator: AgentOrchestrator | null = null;

/**
 * Agentオーケストレーターを取得（シングルトン）
 */
export function getAgentOrchestrator(): AgentOrchestrator {
  if (!globalOrchestrator) {
    globalOrchestrator = new AgentOrchestrator();
  }
  return globalOrchestrator;
}

