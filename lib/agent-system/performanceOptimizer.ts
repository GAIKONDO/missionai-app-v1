/**
 * パフォーマンス最適化機能
 * 並列実行の最適化、キャッシング、リソース管理
 */

import type { Task, TaskExecution } from './types';
import { getAgentOrchestrator } from './agentOrchestrator';

/**
 * キャッシュエントリ
 */
interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number; // Time to live (ミリ秒)
}

/**
 * パフォーマンス最適化オプション
 */
export interface PerformanceOptions {
  maxConcurrentTasks: number;     // 最大同時実行タスク数
  cacheEnabled: boolean;          // キャッシュ有効化
  cacheTTL: number;               // キャッシュTTL（ミリ秒）
  enableParallelExecution: boolean; // 並列実行有効化
}

/**
 * パフォーマンス最適化オプション（デフォルト値）
 */
const DEFAULT_OPTIONS: PerformanceOptions = {
  maxConcurrentTasks: 5,
  cacheEnabled: true,
  cacheTTL: 5 * 60 * 1000, // 5分
  enableParallelExecution: true,
};

/**
 * パフォーマンス最適化オプティマイザー
 */
export class PerformanceOptimizer {
  private options: PerformanceOptions;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private runningTasks: Set<string> = new Set();
  private taskQueue: Task[] = [];

  constructor(options: Partial<PerformanceOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * タスクを実行（並列実行制御付き）
   */
  async executeTaskWithOptimization(task: Task): Promise<TaskExecution> {
    // キャッシュをチェック
    if (this.options.cacheEnabled) {
      const cacheKey = this.getCacheKey(task);
      const cached = this.getFromCache<TaskExecution>(cacheKey);
      if (cached) {
        console.log(`[PerformanceOptimizer] キャッシュから結果を取得: ${task.name}`);
        return cached;
      }
    }

    // 同時実行数制限をチェック
    if (this.runningTasks.size >= this.options.maxConcurrentTasks) {
      // キューに追加
      this.taskQueue.push(task);
      console.log(`[PerformanceOptimizer] タスクをキューに追加: ${task.name} (実行中: ${this.runningTasks.size})`);
      
      // キューから実行可能になるまで待機
      await this.waitForSlot();
    }

    // タスクを実行
    this.runningTasks.add(task.id);
    try {
      const orchestrator = getAgentOrchestrator();
      const execution = await orchestrator.executeTask(task);

      // キャッシュに保存
      if (this.options.cacheEnabled && execution.status === ExecutionStatus.COMPLETED) {
        const cacheKey = this.getCacheKey(task);
        this.setCache(cacheKey, execution, this.options.cacheTTL);
      }

      return execution;
    } finally {
      this.runningTasks.delete(task.id);
      
      // キューから次のタスクを実行
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift()!;
        // 非同期で実行（awaitしない）
        this.executeTaskWithOptimization(nextTask).catch(error => {
          console.error(`[PerformanceOptimizer] キューからのタスク実行エラー:`, error);
        });
      }
    }
  }

  /**
   * 複数タスクを並列実行（最適化付き）
   */
  async executeTasksInParallel(
    tasks: Task[],
    maxConcurrent?: number
  ): Promise<TaskExecution[]> {
    const maxConcurrentTasks = maxConcurrent || this.options.maxConcurrentTasks;
    const results: TaskExecution[] = [];
    const executing: Promise<TaskExecution>[] = [];

    for (const task of tasks) {
      // 同時実行数制限をチェック
      if (executing.length >= maxConcurrentTasks) {
        // 1つ完了するまで待機
        const completed = await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === Promise.resolve(completed)), 1);
        results.push(completed);
      }

      // タスクを実行
      const promise = this.executeTaskWithOptimization(task);
      executing.push(promise);
    }

    // 残りのタスクを待機
    const remaining = await Promise.all(executing);
    results.push(...remaining);

    return results;
  }

  /**
   * キャッシュキーを生成
   */
  private getCacheKey(task: Task): string {
    return `task:${task.id}:${JSON.stringify(task.parameters)}`;
  }

  /**
   * キャッシュから取得
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // TTLチェック
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * キャッシュに保存
   */
  private setCache<T>(key: string, value: T, ttl: number): void {
    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[PerformanceOptimizer] キャッシュをクリアしました');
  }

  /**
   * 実行スロットが空くまで待機
   */
  private async waitForSlot(): Promise<void> {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (this.runningTasks.size < this.options.maxConcurrentTasks) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100); // 100msごとにチェック
    });
  }

  /**
   * 実行中のタスク数を取得
   */
  getRunningTaskCount(): number {
    return this.runningTasks.size;
  }

  /**
   * キュー内のタスク数を取得
   */
  getQueuedTaskCount(): number {
    return this.taskQueue.length;
  }

  /**
   * オプションを更新
   */
  updateOptions(options: Partial<PerformanceOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

/**
 * グローバルパフォーマンス最適化オプティマイザーインスタンス
 */
let globalOptimizer: PerformanceOptimizer | null = null;

/**
 * パフォーマンス最適化オプティマイザーを取得（シングルトン）
 */
export function getPerformanceOptimizer(): PerformanceOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = new PerformanceOptimizer();
  }
  return globalOptimizer;
}

