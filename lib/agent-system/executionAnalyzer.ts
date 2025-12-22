/**
 * 実行履歴分析機能
 * Agent別の成功率・平均実行時間を分析し、最適Agentを自動選択
 */

import type { Task, TaskExecution, TaskType } from './types';
import { getAllTaskExecutions } from './taskManager';
import { ExecutionStatus as ES } from './types';

/**
 * Agent別の実行統計
 */
export interface AgentExecutionStats {
  agentId: string;
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;
  successRate: number;              // 成功率（0-1）
  averageExecutionTime: number;     // 平均実行時間（ミリ秒）
  minExecutionTime: number;         // 最小実行時間
  maxExecutionTime: number;         // 最大実行時間
  medianExecutionTime: number;      // 中央値実行時間
  recentSuccessRate: number;        // 最近の成功率（直近10件）
  recentAverageTime: number;        // 最近の平均実行時間（直近10件）
}

/**
 * タスクタイプ別のAgent推奨度
 */
export interface AgentRecommendation {
  agentId: string;
  score: number;                    // 推奨スコア（0-1、高いほど推奨）
  reasons: string[];                // 推奨理由
  stats: AgentExecutionStats;
}

/**
 * 実行履歴分析器
 */
export class ExecutionAnalyzer {
  private cache: Map<string, AgentExecutionStats[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分

  /**
   * Agent別の実行統計を取得
   */
  async getAgentStats(agentId?: string): Promise<AgentExecutionStats[]> {
    const cacheKey = `stats:${agentId || 'all'}`;
    
    // キャッシュをチェック
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const allExecutions = await getAllTaskExecutions();
      
      // Agentでフィルタ
      const filteredExecutions = agentId
        ? allExecutions.filter(exec => exec.agentId === agentId)
        : allExecutions;

      // Agent別にグループ化
      const agentMap = new Map<string, TaskExecution[]>();
      for (const exec of filteredExecutions) {
        if (!agentMap.has(exec.agentId)) {
          agentMap.set(exec.agentId, []);
        }
        agentMap.get(exec.agentId)!.push(exec);
      }

      // 各Agentの統計を計算
      const stats: AgentExecutionStats[] = [];
      for (const [agentId, executions] of agentMap.entries()) {
        const agentStats = this.calculateAgentStats(agentId, executions);
        stats.push(agentStats);
      }

      // キャッシュに保存
      this.setCache(cacheKey, stats);
      
      return stats;
    } catch (error) {
      console.error('[ExecutionAnalyzer] 統計取得エラー:', error);
      return [];
    }
  }

  /**
   * Agentの統計を計算
   */
  private calculateAgentStats(agentId: string, executions: TaskExecution[]): AgentExecutionStats {
    const total = executions.length;
    const completed = executions.filter(e => e.status === ES.COMPLETED).length;
    const failed = executions.filter(e => e.status === ES.FAILED).length;
    const cancelled = executions.filter(e => e.status === ES.CANCELLED).length;
    const successRate = total > 0 ? completed / total : 0;

    // 実行時間の計算
    const completedExecutions = executions.filter(
      e => e.status === ES.COMPLETED && e.completedAt && e.startedAt
    );
    
    const executionTimes = completedExecutions
      .map(e => (e.completedAt || 0) - e.startedAt)
      .filter(time => time > 0);

    let averageExecutionTime = 0;
    let minExecutionTime = 0;
    let maxExecutionTime = 0;
    let medianExecutionTime = 0;

    if (executionTimes.length > 0) {
      const sortedTimes = executionTimes.sort((a, b) => a - b);
      minExecutionTime = sortedTimes[0];
      maxExecutionTime = sortedTimes[sortedTimes.length - 1];
      averageExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
      medianExecutionTime = sortedTimes.length % 2 === 0
        ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
        : sortedTimes[Math.floor(sortedTimes.length / 2)];
    }

    // 最近の実行（直近10件）の統計
    const recentExecutions = executions
      .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))
      .slice(0, 10);
    
    const recentCompleted = recentExecutions.filter(e => e.status === ES.COMPLETED).length;
    const recentSuccessRate = recentExecutions.length > 0 ? recentCompleted / recentExecutions.length : 0;
    
    const recentCompletedExecutions = recentExecutions.filter(
      e => e.status === ES.COMPLETED && e.completedAt && e.startedAt
    );
    const recentExecutionTimes = recentCompletedExecutions
      .map(e => (e.completedAt || 0) - e.startedAt)
      .filter(time => time > 0);
    const recentAverageTime = recentExecutionTimes.length > 0
      ? recentExecutionTimes.reduce((sum, time) => sum + time, 0) / recentExecutionTimes.length
      : 0;

    return {
      agentId,
      totalExecutions: total,
      completedExecutions: completed,
      failedExecutions: failed,
      cancelledExecutions: cancelled,
      successRate,
      averageExecutionTime,
      minExecutionTime,
      maxExecutionTime,
      medianExecutionTime,
      recentSuccessRate,
      recentAverageTime,
    };
  }

  /**
   * タスクタイプに最適なAgentを推奨
   */
  async recommendAgentForTaskType(taskType: TaskType): Promise<AgentRecommendation[]> {
    try {
      const allExecutions = await getAllTaskExecutions();
      
      // タスクタイプでフィルタ（タスクIDからタスク情報を取得する必要があるが、簡易実装）
      // 実際の実装では、タスク情報も取得してフィルタする必要がある
      const allStats = await this.getAgentStats();
      
      // 各Agentの推奨スコアを計算
      const recommendations: AgentRecommendation[] = [];
      
      for (const stats of allStats) {
        const score = this.calculateRecommendationScore(stats);
        const reasons = this.generateRecommendationReasons(stats);
        
        recommendations.push({
          agentId: stats.agentId,
          score,
          reasons,
          stats,
        });
      }

      // スコアの高い順にソート
      recommendations.sort((a, b) => b.score - a.score);
      
      return recommendations;
    } catch (error) {
      console.error('[ExecutionAnalyzer] Agent推奨エラー:', error);
      return [];
    }
  }

  /**
   * 推奨スコアを計算
   */
  private calculateRecommendationScore(stats: AgentExecutionStats): number {
    // スコア計算式:
    // - 成功率: 40%
    // - 最近の成功率: 30%
    // - 実行時間（短いほど良い）: 20%
    // - 実行回数（多いほど良い）: 10%

    const successScore = stats.successRate * 0.4;
    const recentSuccessScore = stats.recentSuccessRate * 0.3;
    
    // 実行時間スコア（平均実行時間が短いほど高い）
    // 最大実行時間を基準に正規化（仮に10分を最大とする）
    const maxExpectedTime = 10 * 60 * 1000; // 10分
    const timeScore = stats.averageExecutionTime > 0
      ? Math.max(0, 1 - (stats.averageExecutionTime / maxExpectedTime)) * 0.2
      : 0.1; // データがない場合は低いスコア
    
    // 実行回数スコア（多いほど良い、最大100回で正規化）
    const executionCountScore = Math.min(1, stats.totalExecutions / 100) * 0.1;

    return successScore + recentSuccessScore + timeScore + executionCountScore;
  }

  /**
   * 推奨理由を生成
   */
  private generateRecommendationReasons(stats: AgentExecutionStats): string[] {
    const reasons: string[] = [];

    if (stats.successRate >= 0.9) {
      reasons.push(`高い成功率: ${(stats.successRate * 100).toFixed(1)}%`);
    } else if (stats.successRate >= 0.7) {
      reasons.push(`良好な成功率: ${(stats.successRate * 100).toFixed(1)}%`);
    }

    if (stats.recentSuccessRate >= 0.9) {
      reasons.push(`最近の成功率が高い: ${(stats.recentSuccessRate * 100).toFixed(1)}%`);
    }

    if (stats.averageExecutionTime > 0 && stats.averageExecutionTime < 30000) {
      reasons.push(`高速な実行: 平均${(stats.averageExecutionTime / 1000).toFixed(1)}秒`);
    }

    if (stats.totalExecutions >= 50) {
      reasons.push(`豊富な実行履歴: ${stats.totalExecutions}回`);
    }

    if (reasons.length === 0) {
      reasons.push('実行履歴が少ないため、推奨度は低めです');
    }

    return reasons;
  }

  /**
   * 失敗パターンを検出
   */
  async detectFailurePatterns(agentId?: string): Promise<Array<{ pattern: string; count: number; lastOccurred: number }>> {
    try {
      const allExecutions = await getAllTaskExecutions();
      
      const failedExecutions = allExecutions.filter(
        exec => exec.status === ES.FAILED && (!agentId || exec.agentId === agentId)
      );

      // エラーメッセージのパターンを分析
      const errorPatterns = new Map<string, { count: number; lastOccurred: number }>();
      
      for (const exec of failedExecutions) {
        if (exec.error) {
          // エラーメッセージの最初の部分をパターンとして使用
          const pattern = exec.error.split('\n')[0].substring(0, 100);
          const existing = errorPatterns.get(pattern);
          
          if (existing) {
            existing.count++;
            existing.lastOccurred = Math.max(existing.lastOccurred, exec.completedAt || exec.startedAt);
          } else {
            errorPatterns.set(pattern, {
              count: 1,
              lastOccurred: exec.completedAt || exec.startedAt,
            });
          }
        }
      }

      // パターンをカウント順にソート
      const patterns = Array.from(errorPatterns.entries())
        .map(([pattern, data]) => ({
          pattern,
          count: data.count,
          lastOccurred: data.lastOccurred,
        }))
        .sort((a, b) => b.count - a.count);

      return patterns.slice(0, 10); // 上位10件
    } catch (error) {
      console.error('[ExecutionAnalyzer] 失敗パターン検出エラー:', error);
      return [];
    }
  }

  /**
   * キャッシュキーを生成
   */
  private getCacheKey(key: string): string {
    return `analyzer:${key}`;
  }

  /**
   * キャッシュから取得
   */
  private getFromCache(key: string): AgentExecutionStats[] | null {
    const cacheKey = this.getCacheKey(key);
    const expiry = this.cacheExpiry.get(cacheKey);
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
      return null;
    }
    return this.cache.get(cacheKey) || null;
  }

  /**
   * キャッシュに保存
   */
  private setCache(key: string, stats: AgentExecutionStats[]): void {
    const cacheKey = this.getCacheKey(key);
    this.cache.set(cacheKey, stats);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

/**
 * グローバル実行履歴分析器インスタンス
 */
let globalAnalyzer: ExecutionAnalyzer | null = null;

/**
 * 実行履歴分析器を取得（シングルトン）
 */
export function getExecutionAnalyzer(): ExecutionAnalyzer {
  if (!globalAnalyzer) {
    globalAnalyzer = new ExecutionAnalyzer();
  }
  return globalAnalyzer;
}

