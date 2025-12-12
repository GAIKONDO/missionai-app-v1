/**
 * パフォーマンス最適化システム
 * 検索結果のインデックス最適化、バッチ処理の最適化、メモリ使用量の最適化
 */

// パフォーマンス設定
export interface PerformanceConfig {
  maxCacheSize: number; // キャッシュの最大サイズ
  batchSize: number; // バッチ処理のサイズ
  debounceDelay: number; // デバウンス遅延（ミリ秒）
  enableParallelProcessing: boolean; // 並列処理を有効にするか
  maxConcurrentRequests: number; // 最大同時リクエスト数
}

// デフォルト設定
const DEFAULT_CONFIG: PerformanceConfig = {
  maxCacheSize: 1000,
  batchSize: 50,
  debounceDelay: 300,
  enableParallelProcessing: true,
  maxConcurrentRequests: 5,
};

// パフォーマンスメトリクス
export interface PerformanceMetrics {
  cacheHitRate: number; // 0-1
  averageResponseTime: number; // ミリ秒
  memoryUsage: number; // MB
  concurrentRequests: number;
  timestamp: Date;
}

/**
 * デバウンス関数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * スロットル関数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * バッチ処理
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = DEFAULT_CONFIG.batchSize
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * 並列処理（同時実行数制限付き）
 */
export async function parallelProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  maxConcurrent: number = DEFAULT_CONFIG.maxConcurrentRequests
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = processor(item).then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= maxConcurrent) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * メモリ使用量を取得（概算）
 */
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} {
  if (typeof window === 'undefined' || !(performance as any).memory) {
    return { used: 0, total: 0, percentage: 0 };
  }

  const memory = (performance as any).memory;
  const used = memory.usedJSHeapSize / 1024 / 1024; // MB
  const total = memory.totalJSHeapSize / 1024 / 1024; // MB
  const percentage = (used / total) * 100;

  return { used, total, percentage };
}

/**
 * キャッシュの最適化（LRU方式）
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = DEFAULT_CONFIG.maxCacheSize) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // アクセスされたアイテムを最後に移動（LRU）
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // 既存のキーを更新
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // キャッシュが満杯の場合、最初のアイテム（最も古い）を削除
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
      this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * インデックス付き検索結果キャッシュ
 */
export class IndexedSearchCache {
  private cache: LRUCache<string, any[]>;
  private index: Map<string, Set<string>>; // キーワード -> キャッシュキーのセット

  constructor(maxSize: number = DEFAULT_CONFIG.maxCacheSize) {
    this.cache = new LRUCache(maxSize);
    this.index = new Map();
  }

  /**
   * クエリからキーワードを抽出
   */
  private extractKeywords(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2); // 2文字以下の単語は除外
  }

  /**
   * キャッシュキーを生成
   */
  private generateCacheKey(query: string, filters?: any): string {
    return JSON.stringify({ query, filters });
  }

  /**
   * 検索結果をキャッシュに保存
   */
  set(query: string, results: any[], filters?: any): void {
    const key = this.generateCacheKey(query, filters);
    this.cache.set(key, results);

    // インデックスを更新
    const keywords = this.extractKeywords(query);
    for (const keyword of keywords) {
      if (!this.index.has(keyword)) {
        this.index.set(keyword, new Set());
      }
      this.index.get(keyword)!.add(key);
    }
  }

  /**
   * 検索結果をキャッシュから取得
   */
  get(query: string, filters?: any): any[] | undefined {
    const key = this.generateCacheKey(query, filters);
    return this.cache.get(key);
  }

  /**
   * 関連するキャッシュを検索（部分一致）
   */
  findRelated(query: string): Array<{ key: string; results: any[] }> {
    const keywords = this.extractKeywords(query);
    const relatedKeys = new Set<string>();

    for (const keyword of keywords) {
      const keys = this.index.get(keyword);
      if (keys) {
        keys.forEach((key) => relatedKeys.add(key));
      }
    }

    const related: Array<{ key: string; results: any[] }> = [];
    for (const key of relatedKeys) {
      const results = this.cache.get(key);
      if (results) {
        related.push({ key, results });
      }
    }

    return related;
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
    this.index.clear();
  }

  /**
   * キャッシュサイズを取得
   */
  size(): number {
    return this.cache.size();
  }
}

/**
 * リクエストキュー（同時実行数制限付き）
 */
export class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private running: number = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = DEFAULT_CONFIG.maxConcurrentRequests) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const request = this.queue.shift()!;

    try {
      await request();
    } finally {
      this.running--;
      this.process();
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getRunningCount(): number {
    return this.running;
  }
}

/**
 * パフォーマンス最適化された検索関数
 */
export function createOptimizedSearch(
  searchFunction: (query: string, filters?: any) => Promise<any[]>,
  config: Partial<PerformanceConfig> = {}
): (query: string, filters?: any) => Promise<any[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const cache = new IndexedSearchCache(finalConfig.maxCacheSize);
  const debouncedSearch = debounce(searchFunction, finalConfig.debounceDelay);

  return async (query: string, filters?: any) => {
    // キャッシュをチェック
    const cached = cache.get(query, filters);
    if (cached) {
      return cached;
    }

    // 検索を実行
    const results = await searchFunction(query, filters);

    // キャッシュに保存
    cache.set(query, results, filters);

    return results;
  };
}
