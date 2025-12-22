/**
 * 実行時間予測機能
 * 過去の実行履歴から実行時間を予測し、スケジューリングに活用
 */

import type { Task, TaskExecution } from './types';
import { getAllTaskExecutions } from './taskManager';
import { ExecutionStatus as ES } from './types';

/**
 * 実行時間予測結果
 */
export interface ExecutionTimePrediction {
  estimatedTime: number;        // 予測実行時間（ミリ秒）
  confidence: number;           // 信頼度（0-1）
  sampleCount: number;          // サンプル数
  minTime: number;             // 最小実行時間
  maxTime: number;             // 最大実行時間
  averageTime: number;          // 平均実行時間
}

/**
 * 実行時間予測器
 */
export class ExecutionTimePredictor {
  private cache: Map<string, ExecutionTimePrediction> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分

  /**
   * タスクの実行時間を予測
   */
  async predictExecutionTime(task: Task): Promise<ExecutionTimePrediction> {
    const cacheKey = this.getCacheKey(task);
    
    // キャッシュをチェック
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // 過去の実行履歴から予測
    const prediction = await this.calculatePrediction(task);
    
    // キャッシュに保存
    this.setCache(cacheKey, prediction);
    
    return prediction;
  }

  /**
   * 過去の実行履歴から予測を計算
   */
  private async calculatePrediction(task: Task): Promise<ExecutionTimePrediction> {
    try {
      const allExecutions = await getAllTaskExecutions();
      
      // 同じタスクタイプとAgentの実行履歴をフィルタ
      const relevantExecutions = allExecutions.filter(exec => {
        // 完了した実行のみ
        if (exec.status !== ES.COMPLETED) return false;
        if (!exec.completedAt || !exec.startedAt) return false;
        
        // 同じAgentまたは同じタスクタイプ
        if (task.agentId && exec.agentId === task.agentId) return true;
        // タスクIDが一致する場合（同じタスクの過去の実行）
        if (exec.taskId === task.id) return true;
        
        return false;
      });

      if (relevantExecutions.length === 0) {
        // サンプルがない場合、デフォルト値を返す
        return this.getDefaultPrediction(task);
      }

      // 実行時間を計算
      const executionTimes = relevantExecutions
        .map(exec => (exec.completedAt || 0) - exec.startedAt)
        .filter(time => time > 0);

      if (executionTimes.length === 0) {
        return this.getDefaultPrediction(task);
      }

      // 統計を計算
      const sortedTimes = executionTimes.sort((a, b) => a - b);
      const minTime = sortedTimes[0];
      const maxTime = sortedTimes[sortedTimes.length - 1];
      const averageTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
      
      // 中央値を使用（外れ値の影響を減らす）
      const medianTime = sortedTimes.length % 2 === 0
        ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
        : sortedTimes[Math.floor(sortedTimes.length / 2)];

      // 信頼度を計算（サンプル数に基づく）
      const confidence = Math.min(1.0, Math.log(executionTimes.length + 1) / Math.log(10));

      return {
        estimatedTime: medianTime, // 中央値を使用
        confidence,
        sampleCount: executionTimes.length,
        minTime,
        maxTime,
        averageTime,
      };
    } catch (error) {
      console.error('[ExecutionTimePredictor] 予測計算エラー:', error);
      return this.getDefaultPrediction(task);
    }
  }

  /**
   * デフォルト予測値を取得
   */
  private getDefaultPrediction(task: Task): ExecutionTimePrediction {
    // タスクのタイムアウトまたはデフォルト値を使用
    const defaultTime = task.timeout || 60000; // デフォルト60秒
    
    return {
      estimatedTime: defaultTime,
      confidence: 0.1, // 低い信頼度
      sampleCount: 0,
      minTime: defaultTime * 0.5,
      maxTime: defaultTime * 2,
      averageTime: defaultTime,
    };
  }

  /**
   * キャッシュキーを生成
   */
  private getCacheKey(task: Task): string {
    return `prediction:${task.id}:${task.agentId || 'auto'}:${task.type}`;
  }

  /**
   * キャッシュから取得
   */
  private getFromCache(key: string): ExecutionTimePrediction | null {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  /**
   * キャッシュに保存
   */
  private setCache(key: string, prediction: ExecutionTimePrediction): void {
    this.cache.set(key, prediction);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * 複数タスクの実行時間を予測
   */
  async predictMultipleTasks(tasks: Task[]): Promise<Map<string, ExecutionTimePrediction>> {
    const predictions = new Map<string, ExecutionTimePrediction>();
    
    // 並列で予測を取得
    const predictionPromises = tasks.map(async (task) => {
      const prediction = await this.predictExecutionTime(task);
      predictions.set(task.id, prediction);
    });
    
    await Promise.all(predictionPromises);
    
    return predictions;
  }
}

/**
 * グローバル実行時間予測器インスタンス
 */
let globalPredictor: ExecutionTimePredictor | null = null;

/**
 * 実行時間予測器を取得（シングルトン）
 */
export function getExecutionTimePredictor(): ExecutionTimePredictor {
  if (!globalPredictor) {
    globalPredictor = new ExecutionTimePredictor();
  }
  return globalPredictor;
}

