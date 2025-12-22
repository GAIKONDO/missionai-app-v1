/**
 * Agentオーケストレーター
 * タスクの受付、Agentへの配分、実行管理を行う
 */

import type { Task, TaskExecution, ExecutionStatus, ExecutionPlan, FullExecutionPlan } from './types';
import { ExecutionStatus as ES } from './types';
import { TaskPlanner, QueueingStrategy, type TaskPlannerConfig } from './taskPlanner';
import { agentRegistry } from './agentRegistry';
import { getA2AManager } from './a2aManager';
import { generateId } from './utils';
import { getErrorHandler } from './errorHandler';
import { saveTaskExecution, getAllTaskExecutions } from './taskManager';
import { getExecutionTimePredictor } from './executionTimePredictor';
import { getResourceMonitor } from './resourceMonitor';

/**
 * Agentオーケストレーター
 */
/**
 * タスクキューエントリ
 */
interface QueuedTask {
  task: Task;
  resolve: (execution: TaskExecution) => void;
  reject: (error: Error) => void;
  executionId: string;
}

export class AgentOrchestrator {
  private taskPlanner: TaskPlanner;
  private a2aManager = getA2AManager();
  private executions: Map<string, TaskExecution> = new Map();
  private abortControllers: Map<string, AbortController> = new Map(); // 実行ID -> AbortController
  private runningTasks: Set<string> = new Set(); // 実行中のタスクID
  private taskQueues: Map<string, QueuedTask[]> = new Map(); // Agent ID -> タスクキュー
  private maxConcurrentTasks: number = 10; // デフォルトの最大同時実行数
  private globalMaxConcurrentTasks: number | null = null; // グローバル同時実行数制限（null = 制限なし）
  private queueingStrategy: QueueingStrategy = QueueingStrategy.FIFO; // キューイング戦略
  private resourceMonitor = getResourceMonitor();
  private dynamicAdjustmentEnabled: boolean = false;

  constructor(config?: { globalMaxConcurrentTasks?: number; queueingStrategy?: QueueingStrategy; enableDynamicAdjustment?: boolean }) {
    this.taskPlanner = new TaskPlanner({
      enableAutoAgentSelection: true,
      queueingStrategy: config?.queueingStrategy || QueueingStrategy.FIFO,
    });
    this.globalMaxConcurrentTasks = config?.globalMaxConcurrentTasks || null;
    this.queueingStrategy = config?.queueingStrategy || QueueingStrategy.FIFO;
    this.dynamicAdjustmentEnabled = config?.enableDynamicAdjustment !== false;

    // リソース監視を開始
    if (this.dynamicAdjustmentEnabled) {
      this.resourceMonitor.startMonitoring((usage) => {
        this.adjustConcurrencyBasedOnResources(usage);
      });
    }
  }

  /**
   * オーケストレーター設定を更新
   */
  updateConfig(config: { globalMaxConcurrentTasks?: number; queueingStrategy?: QueueingStrategy; enableDynamicAdjustment?: boolean }): void {
    if (config.globalMaxConcurrentTasks !== undefined) {
      this.globalMaxConcurrentTasks = config.globalMaxConcurrentTasks;
    }
    if (config.queueingStrategy !== undefined) {
      this.queueingStrategy = config.queueingStrategy;
      this.taskPlanner.updateConfig({ queueingStrategy: config.queueingStrategy });
    }
    if (config.enableDynamicAdjustment !== undefined) {
      this.dynamicAdjustmentEnabled = config.enableDynamicAdjustment;
      if (this.dynamicAdjustmentEnabled) {
        this.resourceMonitor.startMonitoring((usage) => {
          this.adjustConcurrencyBasedOnResources(usage);
        });
      } else {
        this.resourceMonitor.stopMonitoring();
      }
    }
  }

  /**
   * リソース使用率に基づいて同時実行数を調整
   */
  private adjustConcurrencyBasedOnResources(usage: { cpuUsage: number; memoryUsage: number }): void {
    if (!this.dynamicAdjustmentEnabled) return;

    // グローバル同時実行数制限を調整
    if (this.globalMaxConcurrentTasks !== null) {
      const recommended = this.resourceMonitor.getRecommendedConcurrentTasks(this.globalMaxConcurrentTasks);
      if (recommended !== this.globalMaxConcurrentTasks) {
        console.log(`[AgentOrchestrator] リソース使用率に基づいて同時実行数を調整: ${this.globalMaxConcurrentTasks} -> ${recommended} (CPU: ${(usage.cpuUsage * 100).toFixed(1)}%, Memory: ${(usage.memoryUsage * 100).toFixed(1)}%)`);
        this.globalMaxConcurrentTasks = recommended;
      }
    }

    // Agent別の同時実行数も調整（必要に応じて）
    // 現時点では、グローバル制限のみを調整
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
      // 実行履歴をデータベースに保存（エラー時）
      try {
        await saveTaskExecution(execution);
      } catch (saveError) {
        console.error(`[AgentOrchestrator] 実行履歴の保存に失敗（Agent未検出時）:`, saveError);
      }
      return execution;
    }

    // 5. 同時実行数制御（キューイングシステム）
    const agentDef = agent.getAgent();
    const agentMaxConcurrent = agentDef.config.maxConcurrentTasks || this.maxConcurrentTasks;
    
    // グローバル同時実行数制限をチェック
    if (this.globalMaxConcurrentTasks !== null) {
      const globalRunningCount = Array.from(this.runningTasks).filter(taskId => {
        const exec = this.executions.get(taskId);
        return exec && exec.status === ES.RUNNING;
      }).length;
      
      if (globalRunningCount >= this.globalMaxConcurrentTasks) {
        // グローバル制限に達している場合、キューに追加
        return new Promise<TaskExecution>((resolve, reject) => {
          // グローバルキューに追加（Agent ID = 'global'）
          if (!this.taskQueues.has('global')) {
            this.taskQueues.set('global', []);
          }
          this.taskQueues.get('global')!.push({
            task,
            resolve,
            reject,
            executionId,
          });
          
          // グローバルキューから処理を開始
          this.processQueue('global', this.globalMaxConcurrentTasks!);
        });
      }
    }
    
    // 同じAgentで実行中のタスク数をカウント
    const runningCount = Array.from(this.runningTasks).filter(taskId => {
      const exec = this.executions.get(taskId);
      return exec && exec.agentId === agentDef.id && exec.status === ES.RUNNING;
    }).length;

    // Agent別の同時実行数制限に達している場合、キューに追加
    if (runningCount >= agentMaxConcurrent) {
      return new Promise<TaskExecution>((resolve, reject) => {
        // キューに追加
        if (!this.taskQueues.has(agentDef.id)) {
          this.taskQueues.set(agentDef.id, []);
        }
        this.taskQueues.get(agentDef.id)!.push({
          task,
          resolve,
          reject,
          executionId,
        });
        
        // キューから処理を開始（既に処理中の場合はスキップ）
        this.processQueue(agentDef.id, agentMaxConcurrent);
      });
    }

    // 実行中のタスクとして登録
    this.runningTasks.add(executionId);

    // 6. タスクを実行（内部実装を呼び出し）
    return await this.executeTaskInternal(task, executionId);
  }

  /**
   * キューからタスクを処理
   */
  private async processQueue(agentId: string, maxConcurrent: number): Promise<void> {
    const queue = this.taskQueues.get(agentId);
    if (!queue || queue.length === 0) {
      return;
    }

    // キューイング戦略に応じてキューをソート
    await this.sortQueue(queue);

    // 現在の実行中タスク数をカウント
    const runningCount = agentId === 'global'
      ? Array.from(this.runningTasks).filter(taskId => {
          const exec = this.executions.get(taskId);
          return exec && exec.status === ES.RUNNING;
        }).length
      : Array.from(this.runningTasks).filter(taskId => {
          const exec = this.executions.get(taskId);
          return exec && exec.agentId === agentId && exec.status === ES.RUNNING;
        }).length;

    // 実行可能なタスク数を計算
    const availableSlots = maxConcurrent - runningCount;

    // 実行可能なタスクを処理
    for (let i = 0; i < Math.min(availableSlots, queue.length); i++) {
      const queuedTask = queue.shift();
      if (!queuedTask) break;

      // グローバルキューの場合、実行計画を再作成してAgentを決定
      if (agentId === 'global') {
        const plan = await this.taskPlanner.createPlan(queuedTask.task);
        const agent = agentRegistry.get(plan.assignedAgentId);
        if (agent) {
          const agentDef = agent.getAgent();
          const agentMaxConcurrent = agentDef.config.maxConcurrentTasks || this.maxConcurrentTasks;
          const agentRunningCount = Array.from(this.runningTasks).filter(taskId => {
            const exec = this.executions.get(taskId);
            return exec && exec.agentId === agentDef.id && exec.status === ES.RUNNING;
          }).length;
          
          // Agent別の制限に達している場合、Agent別キューに移動
          if (agentRunningCount >= agentMaxConcurrent) {
            if (!this.taskQueues.has(agentDef.id)) {
              this.taskQueues.set(agentDef.id, []);
            }
            this.taskQueues.get(agentDef.id)!.push(queuedTask);
            continue;
          }
        }
      }

      try {
        // タスクを実行（executeTaskの内部処理を実行）
        const execution = await this.executeTaskInternal(queuedTask.task, queuedTask.executionId);
        queuedTask.resolve(execution);
      } catch (error) {
        queuedTask.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // グローバルキューの処理後、Agent別キューも処理
    if (agentId === 'global') {
      for (const [agentId, agentQueue] of this.taskQueues.entries()) {
        if (agentId !== 'global' && agentQueue.length > 0) {
          const agent = agentRegistry.get(agentId);
          if (agent) {
            const agentDef = agent.getAgent();
            const agentMaxConcurrent = agentDef.config.maxConcurrentTasks || this.maxConcurrentTasks;
            this.processQueue(agentId, agentMaxConcurrent);
          }
        }
      }
    }
  }

  /**
   * キューイング戦略に応じてキューをソート
   */
  private async sortQueue(queue: QueuedTask[]): Promise<void> {
    switch (this.queueingStrategy) {
      case QueueingStrategy.PRIORITY:
        // 優先度の高い順（priorityが大きい順）
        queue.sort((a, b) => (b.task.priority || 5) - (a.task.priority || 5));
        break;
      case QueueingStrategy.SHORTEST_JOB_FIRST:
        // 実行時間予測を使用して最短ジョブ優先
        const predictor = getExecutionTimePredictor();
        const predictions = await predictor.predictMultipleTasks(queue.map(qt => qt.task));
        queue.sort((a, b) => {
          const timeA = predictions.get(a.task.id)?.estimatedTime || a.task.timeout || 60000;
          const timeB = predictions.get(b.task.id)?.estimatedTime || b.task.timeout || 60000;
          return timeA - timeB;
        });
        break;
      case QueueingStrategy.ROUND_ROBIN:
        // ラウンドロビンは既にFIFOで実現されているため、そのまま
        // （必要に応じて、より高度な実装を追加可能）
        break;
      case QueueingStrategy.FIFO:
      default:
        // デフォルトはFIFO（既にキューに入っている順序を維持）
        break;
    }
  }

  /**
   * タスクを実行（内部実装、キューイングなし）
   */
  private async executeTaskInternal(task: Task, executionId: string): Promise<TaskExecution> {
    // 1. 実行計画を作成
    const plan = await this.taskPlanner.createPlan(task);

    // 2. 実行記録を作成
    const execution: TaskExecution = {
      id: executionId,
      taskId: task.id,
      agentId: plan.assignedAgentId,
      status: ES.PENDING,
      startedAt: Date.now(),
      logs: [],
    };

    this.executions.set(executionId, execution);

    // 3. Agentを取得
    const agent = agentRegistry.get(plan.assignedAgentId);
    if (!agent) {
      execution.status = ES.FAILED;
      execution.completedAt = Date.now();
      execution.error = `Agent ${plan.assignedAgentId} not found`;
      try {
        await saveTaskExecution(execution);
      } catch (saveError) {
        console.error(`[AgentOrchestrator] 実行履歴の保存に失敗（Agent未検出時）:`, saveError);
      }
      return execution;
    }

    // 4. タスクが実行可能かチェック
    if (!agent.canExecuteTask(task)) {
      execution.status = ES.FAILED;
      execution.completedAt = Date.now();
      execution.error = `Agent ${plan.assignedAgentId} cannot execute task type ${task.type}`;
      this.runningTasks.delete(executionId);
      try {
        await saveTaskExecution(execution);
      } catch (saveError) {
        console.error(`[AgentOrchestrator] 実行履歴の保存に失敗（実行不可時）:`, saveError);
      }
      return execution;
    }

    // 5. 実行履歴をデータベースに保存（開始時）
    try {
      await saveTaskExecution(execution);
    } catch (saveError) {
      console.error(`[AgentOrchestrator] 実行履歴の保存に失敗（開始時）:`, saveError);
    }

    // 6. AbortControllerを作成
    const abortController = new AbortController();
    this.abortControllers.set(executionId, abortController);

    // 7. タスクを実行（タイムアウト処理付き）
    execution.status = ES.RUNNING;
    try {
      // タイムアウト処理
      const timeout = task.timeout || 60000; // デフォルト60秒
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`タスクがタイムアウトしました（${timeout}ms）`));
        }, timeout);
        
        // AbortControllerがシグナルされた場合、タイムアウトをクリア
        abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
        });
      });

      const taskPromise = agent.executeTask(task, {
        executionId,
        a2aManager: this.a2aManager,
        abortController,
      });

      // タイムアウトとタスク実行を競争させる
      // AbortControllerがシグナルされた場合、エラーをスロー
      const abortPromise = new Promise<never>((_, reject) => {
        abortController.signal.addEventListener('abort', () => {
          reject(new Error('タスクがキャンセルされました'));
        });
      });

      const result = await Promise.race([taskPromise, timeoutPromise, abortPromise]);

      execution.status = ES.COMPLETED;
      execution.completedAt = Date.now();
      execution.result = result;

      // 実行履歴をデータベースに保存（完了時）
      try {
        await saveTaskExecution(execution);
      } catch (saveError) {
        console.error(`[AgentOrchestrator] 実行履歴の保存に失敗（完了時）:`, saveError);
      }
    } catch (error: any) {
      const errorHandler = getErrorHandler();
      const errorInfo = errorHandler.classifyError(error);

      execution.status = ES.FAILED;
      execution.completedAt = Date.now();
      execution.error = errorInfo.message;
      this.addLog(execution, 'error', `タスク実行エラー: ${errorInfo.message}`, errorInfo);

      // 実行履歴をデータベースに保存（エラー時）
      try {
        await saveTaskExecution(execution);
      } catch (saveError) {
        console.error(`[AgentOrchestrator] 実行履歴の保存に失敗（エラー時）:`, saveError);
      }

      // エラー通知
      await errorHandler.notifyError(errorInfo, task, execution);

      // リトライ可能なエラーで、リトライ回数が残っている場合
      if (errorInfo.retryable && task.retryCount && task.retryCount > 0) {
        // Agentの設定からリトライポリシーを取得（デフォルト値を使用）
        const agentDef = agent.getAgent();
        const defaultRetryPolicy = agentDef.config.retryPolicy || {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2,
        };
        
        const retryPolicy = {
          maxRetries: task.retryCount,
          retryDelay: defaultRetryPolicy.retryDelay,
          backoffMultiplier: defaultRetryPolicy.backoffMultiplier,
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

        // リトライ後の実行履歴をデータベースに保存
        try {
          await saveTaskExecution(execution);
        } catch (saveError) {
          console.error(`[AgentOrchestrator] 実行履歴の保存に失敗（リトライ後）:`, saveError);
        }
      }
    } finally {
      // 実行中のタスクから削除
      this.runningTasks.delete(executionId);
      // AbortControllerを削除
      this.abortControllers.delete(executionId);
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
   * メモリ内の実行とデータベースから読み込んだ実行をマージ
   */
  async getAllExecutions(): Promise<TaskExecution[]> {
    // データベースから実行履歴を読み込む
    try {
      const dbExecutions = await getAllTaskExecutions();
      
      // メモリ内の実行とマージ（メモリ内の実行が優先）
      const memoryExecutionIds = new Set(Array.from(this.executions.keys()));
      const mergedExecutions = [...Array.from(this.executions.values())];
      
      // データベースにあってメモリにない実行を追加
      for (const dbExec of dbExecutions) {
        if (!memoryExecutionIds.has(dbExec.id)) {
          mergedExecutions.push(dbExec);
        }
      }
      
      // 開始時刻でソート（新しい順）
      mergedExecutions.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
      
      return mergedExecutions;
    } catch (error) {
      console.error('[AgentOrchestrator] 実行履歴の読み込みに失敗:', error);
      // エラー時はメモリ内の実行のみを返す
      return Array.from(this.executions.values());
    }
  }

  /**
   * すべての実行を取得（同期版、メモリ内のみ）
   */
  getAllExecutionsSync(): TaskExecution[] {
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
    if (!execution) {
      console.warn(`[AgentOrchestrator] 実行が見つかりません: ${executionId}`);
      return;
    }

    // 実行中または待機中のタスクのみキャンセル可能
    if (execution.status !== ES.RUNNING && execution.status !== ES.PENDING) {
      console.warn(`[AgentOrchestrator] 実行は既に完了または失敗しています: ${executionId} (${execution.status})`);
      return;
    }

    // AbortControllerを取得して中断シグナルを送信
    const abortController = this.abortControllers.get(executionId);
    if (abortController) {
      abortController.abort();
      console.log(`[AgentOrchestrator] 実行を中断: ${executionId}`);
    }

    // 実行状態を更新
      execution.status = ES.CANCELLED;
      execution.completedAt = Date.now();
    execution.error = 'ユーザーによってキャンセルされました';
      this.addLog(execution, 'info', '実行がキャンセルされました');

    // 実行中のタスクから削除
    this.runningTasks.delete(executionId);
    this.abortControllers.delete(executionId);

    // 実行履歴をデータベースに保存
    try {
      await saveTaskExecution(execution);
    } catch (saveError) {
      console.error(`[AgentOrchestrator] 実行履歴の保存に失敗（キャンセル時）:`, saveError);
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

  /**
   * オーケストレーターの設定を取得
   */
  getOrchestratorConfig(): {
    globalMaxConcurrentTasks: number | null;
    queueingStrategy: QueueingStrategy;
    defaultMaxConcurrentTasks: number;
  } {
    return {
      globalMaxConcurrentTasks: this.globalMaxConcurrentTasks,
      queueingStrategy: this.queueingStrategy,
      defaultMaxConcurrentTasks: this.maxConcurrentTasks,
    };
  }

  /**
   * オーケストレーターの状態を取得（管理用）
   */
  getOrchestratorStatus(): {
    runningTasksCount: number;
    queuedTasksCount: number;
    pendingTasksCount: number;
    agentQueues: Array<{ agentId: string; queueLength: number; runningCount: number }>;
    totalExecutions: number;
  } {
    const runningTasksCount = this.runningTasks.size;
    let queuedTasksCount = 0;
    const agentQueues: Array<{ agentId: string; queueLength: number; runningCount: number }> = [];

    // Agent別のキュー情報を取得
    for (const [agentId, queue] of this.taskQueues.entries()) {
      const queueLength = queue.length;
      queuedTasksCount += queueLength;

      // このAgentで実行中のタスク数をカウント
      const runningCount = Array.from(this.runningTasks).filter(taskId => {
        const exec = this.executions.get(taskId);
        return exec && exec.agentId === agentId && exec.status === ES.RUNNING;
      }).length;

      agentQueues.push({ agentId, queueLength, runningCount });
    }

    // 待機中タスク数をカウント
    const pendingTasksCount = Array.from(this.executions.values()).filter(
      exec => exec.status === ES.PENDING
    ).length;

    // グローバル実行中タスク数
    const globalRunningCount = Array.from(this.runningTasks).filter(taskId => {
      const exec = this.executions.get(taskId);
      return exec && exec.status === ES.RUNNING;
    }).length;

    return {
      runningTasksCount,
      queuedTasksCount,
      pendingTasksCount,
      agentQueues,
      totalExecutions: this.executions.size,
      globalRunningCount,
    };
  }

  /**
   * キュー内のタスク情報を取得
   */
  getQueuedTasks(): Array<{ agentId: string; taskId: string; taskName: string; executionId: string; queuedAt?: number }> {
    const queuedTasks: Array<{ agentId: string; taskId: string; taskName: string; executionId: string; queuedAt?: number }> = [];

    for (const [agentId, queue] of this.taskQueues.entries()) {
      for (const queuedTask of queue) {
        const execution = this.executions.get(queuedTask.executionId);
        queuedTasks.push({
          agentId,
          taskId: queuedTask.task.id,
          taskName: queuedTask.task.name,
          executionId: queuedTask.executionId,
          queuedAt: execution?.startedAt,
        });
      }
    }

    return queuedTasks;
  }

  /**
   * キューからタスクを削除（キャンセル）
   */
  async removeTaskFromQueue(executionId: string): Promise<boolean> {
    for (const [agentId, queue] of this.taskQueues.entries()) {
      const index = queue.findIndex(qt => qt.executionId === executionId);
      if (index !== -1) {
        const queuedTask = queue[index];
        queue.splice(index, 1);

        // 実行記録を更新
        const execution = this.executions.get(executionId);
        if (execution) {
          execution.status = ES.CANCELLED;
          execution.completedAt = Date.now();
          execution.error = 'キューから削除されました';
          this.addLog(execution, 'info', 'キューから削除されました');

          // データベースに保存
          try {
            await saveTaskExecution(execution);
          } catch (saveError) {
            console.error(`[AgentOrchestrator] 実行履歴の保存に失敗（キュー削除時）:`, saveError);
          }
        }

        // Promiseを拒否
        queuedTask.reject(new Error('キューから削除されました'));
        return true;
      }
    }
    return false;
  }

  /**
   * キューをクリア
   */
  async clearQueue(agentId?: string): Promise<number> {
    let clearedCount = 0;

    if (agentId) {
      // 特定のAgentのキューをクリア
      const queue = this.taskQueues.get(agentId);
      if (queue) {
        clearedCount = queue.length;
        for (const queuedTask of queue) {
          const execution = this.executions.get(queuedTask.executionId);
          if (execution) {
            execution.status = ES.CANCELLED;
            execution.completedAt = Date.now();
            execution.error = 'キューがクリアされました';
            this.addLog(execution, 'info', 'キューがクリアされました');

            try {
              await saveTaskExecution(execution);
            } catch (saveError) {
              console.error(`[AgentOrchestrator] 実行履歴の保存に失敗（キュークリア時）:`, saveError);
            }
          }
          queuedTask.reject(new Error('キューがクリアされました'));
        }
        this.taskQueues.delete(agentId);
      }
    } else {
      // すべてのキューをクリア
      for (const [agentId, queue] of this.taskQueues.entries()) {
        clearedCount += queue.length;
        for (const queuedTask of queue) {
          const execution = this.executions.get(queuedTask.executionId);
          if (execution) {
            execution.status = ES.CANCELLED;
            execution.completedAt = Date.now();
            execution.error = 'キューがクリアされました';
            this.addLog(execution, 'info', 'キューがクリアされました');

            try {
              await saveTaskExecution(execution);
            } catch (saveError) {
              console.error(`[AgentOrchestrator] 実行履歴の保存に失敗（キュークリア時）:`, saveError);
            }
          }
          queuedTask.reject(new Error('キューがクリアされました'));
        }
      }
      this.taskQueues.clear();
    }

    return clearedCount;
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

