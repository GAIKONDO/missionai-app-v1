/**
 * モニタリング・メトリクス収集システム
 * 検索パフォーマンス、AI応答時間、エラー率などを追跡
 */

// 検索メトリクス
export interface SearchMetrics {
  query: string;
  responseTime: number; // ミリ秒
  resultCount: number;
  organizationId?: string;
  searchType: 'entity' | 'relation' | 'topic' | 'all';
  usedChromaDB: boolean;
  timestamp: Date;
  filters?: {
    organizationId?: string;
    entityType?: string;
    relationType?: string;
  };
}

// AIアシスタントメトリクス
export interface AIMetrics {
  query: string;
  responseTime: number; // ミリ秒
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  cost: number; // USD
  model: string;
  ragContextUsed: boolean;
  ragContextLength?: number;
  timestamp: Date;
}

// エラーメトリクス
export interface ErrorMetrics {
  errorType: string;
  errorMessage: string;
  component: string; // 'search' | 'ai-assistant' | 'embedding' | 'chromadb'
  timestamp: Date;
  context?: Record<string, any>;
}

// メトリクスのストレージキー
const SEARCH_METRICS_KEY = 'monitoring_search_metrics';
const AI_METRICS_KEY = 'monitoring_ai_metrics';
const ERROR_METRICS_KEY = 'monitoring_error_metrics';
const MAX_METRICS_COUNT = 1000; // 最大保持件数

/**
 * 検索メトリクスを記録
 */
export function logSearchMetrics(metrics: Omit<SearchMetrics, 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  try {
    const metricsHistory = JSON.parse(
      localStorage.getItem(SEARCH_METRICS_KEY) || '[]'
    ) as SearchMetrics[];

    const newMetric: SearchMetrics = {
      ...metrics,
      timestamp: new Date(),
    };

    metricsHistory.push(newMetric);

    // 最新MAX_METRICS_COUNT件のみ保持
    const recentMetrics = metricsHistory.slice(-MAX_METRICS_COUNT);
    localStorage.setItem(SEARCH_METRICS_KEY, JSON.stringify(recentMetrics));

    console.log('[Monitoring] 検索メトリクスを記録:', {
      query: metrics.query.substring(0, 50),
      responseTime: metrics.responseTime,
      resultCount: metrics.resultCount,
    });
  } catch (error) {
    console.error('[Monitoring] 検索メトリクスの記録エラー:', error);
  }
}

/**
 * AIアシスタントメトリクスを記録
 */
export function logAIMetrics(metrics: Omit<AIMetrics, 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  try {
    const metricsHistory = JSON.parse(
      localStorage.getItem(AI_METRICS_KEY) || '[]'
    ) as AIMetrics[];

    const newMetric: AIMetrics = {
      ...metrics,
      timestamp: new Date(),
    };

    metricsHistory.push(newMetric);

    // 最新MAX_METRICS_COUNT件のみ保持
    const recentMetrics = metricsHistory.slice(-MAX_METRICS_COUNT);
    localStorage.setItem(AI_METRICS_KEY, JSON.stringify(recentMetrics));

    console.log('[Monitoring] AIメトリクスを記録:', {
      query: metrics.query.substring(0, 50),
      responseTime: metrics.responseTime,
      cost: metrics.cost,
      tokens: metrics.tokenUsage.total,
    });
  } catch (error) {
    console.error('[Monitoring] AIメトリクスの記録エラー:', error);
  }
}

/**
 * エラーメトリクスを記録
 */
export function logErrorMetrics(metrics: Omit<ErrorMetrics, 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  try {
    const metricsHistory = JSON.parse(
      localStorage.getItem(ERROR_METRICS_KEY) || '[]'
    ) as ErrorMetrics[];

    const newMetric: ErrorMetrics = {
      ...metrics,
      timestamp: new Date(),
    };

    metricsHistory.push(newMetric);

    // 最新MAX_METRICS_COUNT件のみ保持
    const recentMetrics = metricsHistory.slice(-MAX_METRICS_COUNT);
    localStorage.setItem(ERROR_METRICS_KEY, JSON.stringify(recentMetrics));

    console.error('[Monitoring] エラーメトリクスを記録:', {
      errorType: metrics.errorType,
      component: metrics.component,
      message: metrics.errorMessage.substring(0, 100),
    });
  } catch (error) {
    console.error('[Monitoring] エラーメトリクスの記録エラー:', error);
  }
}

/**
 * 検索メトリクスを取得
 */
export function getSearchMetrics(limit: number = 100): SearchMetrics[] {
  if (typeof window === 'undefined') return [];

  try {
    const metricsHistory = JSON.parse(
      localStorage.getItem(SEARCH_METRICS_KEY) || '[]'
    ) as SearchMetrics[];

    return metricsHistory.slice(-limit).map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch (error) {
    console.error('[Monitoring] 検索メトリクスの取得エラー:', error);
    return [];
  }
}

/**
 * AIメトリクスを取得
 */
export function getAIMetrics(limit: number = 100): AIMetrics[] {
  if (typeof window === 'undefined') return [];

  try {
    const metricsHistory = JSON.parse(
      localStorage.getItem(AI_METRICS_KEY) || '[]'
    ) as AIMetrics[];

    return metricsHistory.slice(-limit).map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch (error) {
    console.error('[Monitoring] AIメトリクスの取得エラー:', error);
    return [];
  }
}

/**
 * エラーメトリクスを取得
 */
export function getErrorMetrics(limit: number = 100): ErrorMetrics[] {
  if (typeof window === 'undefined') return [];

  try {
    const metricsHistory = JSON.parse(
      localStorage.getItem(ERROR_METRICS_KEY) || '[]'
    ) as ErrorMetrics[];

    return metricsHistory.slice(-limit).map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch (error) {
    console.error('[Monitoring] エラーメトリクスの取得エラー:', error);
    return [];
  }
}

/**
 * 検索パフォーマンス統計を計算
 */
export interface SearchPerformanceStats {
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  totalSearches: number;
  averageResultCount: number;
  chromaDBUsageRate: number; // ChromaDB使用率（0-1）
  successRate: number; // 成功率（0-1）
}

export function calculateSearchPerformanceStats(
  timeRange?: { start: Date; end: Date }
): SearchPerformanceStats {
  const metrics = getSearchMetrics(MAX_METRICS_COUNT);
  
  let filteredMetrics = metrics;
  if (timeRange) {
    filteredMetrics = metrics.filter(
      m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  if (filteredMetrics.length === 0) {
    return {
      averageResponseTime: 0,
      medianResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      totalSearches: 0,
      averageResultCount: 0,
      chromaDBUsageRate: 0,
      successRate: 0,
    };
  }

  const responseTimes = filteredMetrics.map(m => m.responseTime).sort((a, b) => a - b);
  const resultCounts = filteredMetrics.map(m => m.resultCount);
  const chromaDBUsages = filteredMetrics.map(m => m.usedChromaDB ? 1 : 0);

  const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const medianResponseTime = responseTimes[Math.floor(responseTimes.length / 2)];
  const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
  const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];
  const averageResultCount = resultCounts.reduce((a, b) => a + b, 0) / resultCounts.length;
  const chromaDBUsageRate = chromaDBUsages.reduce((a, b) => a + b, 0 as number) / chromaDBUsages.length;
  
  // 成功率: 結果が1件以上返された検索の割合
  const successfulSearches = filteredMetrics.filter(m => m.resultCount > 0).length;
  const successRate = successfulSearches / filteredMetrics.length;

  return {
    averageResponseTime,
    medianResponseTime,
    p95ResponseTime,
    p99ResponseTime,
    totalSearches: filteredMetrics.length,
    averageResultCount,
    chromaDBUsageRate,
    successRate,
  };
}

/**
 * AIパフォーマンス統計を計算
 */
export interface AIPerformanceStats {
  averageResponseTime: number;
  averageCost: number;
  totalCost: number;
  totalTokens: number;
  averageTokensPerQuery: number;
  ragContextUsageRate: number; // RAGコンテキスト使用率（0-1）
  totalQueries: number;
}

export function calculateAIPerformanceStats(
  timeRange?: { start: Date; end: Date }
): AIPerformanceStats {
  const metrics = getAIMetrics(MAX_METRICS_COUNT);
  
  let filteredMetrics = metrics;
  if (timeRange) {
    filteredMetrics = metrics.filter(
      m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  if (filteredMetrics.length === 0) {
    return {
      averageResponseTime: 0,
      averageCost: 0,
      totalCost: 0,
      totalTokens: 0,
      averageTokensPerQuery: 0,
      ragContextUsageRate: 0,
      totalQueries: 0,
    };
  }

  const responseTimes = filteredMetrics.map(m => m.responseTime);
  const costs = filteredMetrics.map(m => m.cost);
  const tokens = filteredMetrics.map(m => m.tokenUsage.total);
  const ragContextUsages = filteredMetrics.map(m => m.ragContextUsed ? 1 : 0);

  const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const averageCost = costs.reduce((a, b) => a + b, 0) / costs.length;
  const totalCost = costs.reduce((a, b) => a + b, 0);
  const totalTokens = tokens.reduce((a, b) => a + b, 0 as number);
  const averageTokensPerQuery = totalTokens / filteredMetrics.length;
  const ragContextUsageRate = ragContextUsages.reduce((a, b) => a + b, 0 as number) / ragContextUsages.length;

  return {
    averageResponseTime,
    averageCost,
    totalCost,
    totalTokens,
    averageTokensPerQuery,
    ragContextUsageRate,
    totalQueries: filteredMetrics.length,
  };
}

/**
 * エラー統計を計算
 */
export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByComponent: Record<string, number>;
  recentErrors: ErrorMetrics[];
}

export function calculateErrorStats(
  timeRange?: { start: Date; end: Date },
  limit: number = 50
): ErrorStats {
  const metrics = getErrorMetrics(MAX_METRICS_COUNT);
  
  let filteredMetrics = metrics;
  if (timeRange) {
    filteredMetrics = metrics.filter(
      m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  const errorsByType: Record<string, number> = {};
  const errorsByComponent: Record<string, number> = {};

  filteredMetrics.forEach(m => {
    errorsByType[m.errorType] = (errorsByType[m.errorType] || 0) + 1;
    errorsByComponent[m.component] = (errorsByComponent[m.component] || 0) + 1;
  });

  // 最新のエラーを取得
  const recentErrors = filteredMetrics
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);

  return {
    totalErrors: filteredMetrics.length,
    errorsByType,
    errorsByComponent,
    recentErrors,
  };
}

/**
 * すべてのメトリクスをクリア
 */
export function clearAllMetrics(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(SEARCH_METRICS_KEY);
    localStorage.removeItem(AI_METRICS_KEY);
    localStorage.removeItem(ERROR_METRICS_KEY);
    console.log('[Monitoring] すべてのメトリクスをクリアしました');
  } catch (error) {
    console.error('[Monitoring] メトリクスのクリアエラー:', error);
  }
}

/**
 * メトリクスのストレージ使用量を取得
 */
export function getMetricsStorageSize(): {
  searchMetrics: number;
  aiMetrics: number;
  errorMetrics: number;
  total: number;
} {
  if (typeof window === 'undefined') {
    return { searchMetrics: 0, aiMetrics: 0, errorMetrics: 0, total: 0 };
  }

  try {
    const searchMetricsSize = (localStorage.getItem(SEARCH_METRICS_KEY) || '').length;
    const aiMetricsSize = (localStorage.getItem(AI_METRICS_KEY) || '').length;
    const errorMetricsSize = (localStorage.getItem(ERROR_METRICS_KEY) || '').length;

    return {
      searchMetrics: searchMetricsSize,
      aiMetrics: aiMetricsSize,
      errorMetrics: errorMetricsSize,
      total: searchMetricsSize + aiMetricsSize + errorMetricsSize,
    };
  } catch (error) {
    console.error('[Monitoring] ストレージサイズの取得エラー:', error);
    return { searchMetrics: 0, aiMetrics: 0, errorMetrics: 0, total: 0 };
  }
}
