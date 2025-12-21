/**
 * RAG検索結果のキャッシュ管理
 * 検索クエリとフィルターをキーに検索結果をキャッシュ
 */

import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';

interface CacheEntry {
  results: KnowledgeGraphSearchResult[];
  timestamp: number;
  query: string;
  filters?: {
    organizationId?: string;
    entityType?: string;
    relationType?: string;
    topicSemanticCategory?: string;
  };
}

interface CacheKey {
  query: string;
  filters?: {
    organizationId?: string;
    entityType?: string;
    relationType?: string;
    topicSemanticCategory?: string;
  };
}

// メモリキャッシュ（最大50件）
const memoryCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 50;
const CACHE_TTL = 60 * 60 * 1000; // 1時間

/**
 * キャッシュキーを生成
 */
function generateCacheKey(key: CacheKey): string {
  const filterStr = key.filters 
    ? JSON.stringify(key.filters, Object.keys(key.filters).sort())
    : '';
  const cacheKey = `${key.query}::${filterStr}`;
  console.log(`[generateCacheKey] クエリ: "${key.query}", フィルター:`, key.filters, `→ キャッシュキー: "${cacheKey}"`);
  return cacheKey;
}

/**
 * キャッシュから検索結果を取得
 * 
 * @param query 検索クエリ
 * @param filters フィルター条件
 * @returns キャッシュされた検索結果、またはnull
 */
export function getCachedSearchResults(
  query: string,
  filters?: CacheKey['filters']
): KnowledgeGraphSearchResult[] | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const cacheKey = generateCacheKey({ query, filters });
  console.log(`[getCachedSearchResults] キャッシュキー: "${cacheKey}"`);
  
  // メモリキャッシュをチェック
  const memoryEntry = memoryCache.get(cacheKey);
  if (memoryEntry) {
    const age = Date.now() - memoryEntry.timestamp;
    if (age < CACHE_TTL) {
      console.log(`[getCachedSearchResults] メモリキャッシュから取得: ${memoryEntry.results.length}件 (age: ${Math.round(age / 1000)}秒)`);
      return memoryEntry.results;
    } else {
      // 期限切れの場合は削除
      console.log(`[getCachedSearchResults] メモリキャッシュが期限切れ (age: ${Math.round(age / 1000)}秒)`);
      memoryCache.delete(cacheKey);
    }
  }

  // localStorageキャッシュをチェック
  try {
    const cachedData = localStorage.getItem(`rag_search_cache_${cacheKey}`);
    if (cachedData) {
      const entry: CacheEntry = JSON.parse(cachedData);
      const age = Date.now() - entry.timestamp;
      
      if (age < CACHE_TTL) {
        // メモリキャッシュにも保存
        memoryCache.set(cacheKey, entry);
        console.log(`[getCachedSearchResults] localStorageキャッシュから取得: ${entry.results.length}件 (age: ${Math.round(age / 1000)}秒)`);
        return entry.results;
      } else {
        // 期限切れの場合は削除
        console.log(`[getCachedSearchResults] localStorageキャッシュが期限切れ (age: ${Math.round(age / 1000)}秒)`);
        localStorage.removeItem(`rag_search_cache_${cacheKey}`);
      }
    }
  } catch (error) {
    console.warn('キャッシュの読み込みエラー:', error);
  }

  return null;
}

/**
 * 検索結果をキャッシュに保存
 * 
 * @param query 検索クエリ
 * @param filters フィルター条件
 * @param results 検索結果
 */
export function setCachedSearchResults(
  query: string,
  filters: CacheKey['filters'] | undefined,
  results: KnowledgeGraphSearchResult[]
): void {
  if (typeof window === 'undefined') {
    return;
  }

  const cacheKey = generateCacheKey({ query, filters });
  const entry: CacheEntry = {
    results,
    timestamp: Date.now(),
    query,
    filters,
  };

  // メモリキャッシュに保存
  memoryCache.set(cacheKey, entry);

  // キャッシュサイズが上限を超えた場合は古いものを削除
  if (memoryCache.size > MAX_CACHE_SIZE) {
    const oldestKey = Array.from(memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    memoryCache.delete(oldestKey);
  }

  // localStorageにも保存（永続化）
  try {
    localStorage.setItem(`rag_search_cache_${cacheKey}`, JSON.stringify(entry));
    
    // localStorageの古いキャッシュをクリーンアップ（最大100件）
    cleanupOldCacheEntries();
  } catch (error) {
    // localStorageの容量制限に達した場合は古いキャッシュを削除
    console.warn('キャッシュの保存エラー（容量制限の可能性）:', error);
    cleanupOldCacheEntries();
    
    // 再度試行
    try {
      localStorage.setItem(`rag_search_cache_${cacheKey}`, JSON.stringify(entry));
    } catch (retryError) {
      console.warn('キャッシュの保存に失敗しました:', retryError);
    }
  }
}

/**
 * 古いキャッシュエントリをクリーンアップ
 */
function cleanupOldCacheEntries(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const cacheKeys: Array<{ key: string; timestamp: number }> = [];
    
    // すべてのキャッシュキーを取得
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('rag_search_cache_')) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const entry: CacheEntry = JSON.parse(data);
            cacheKeys.push({ key, timestamp: entry.timestamp });
          }
        } catch (error) {
          // パースエラーの場合は削除
          localStorage.removeItem(key);
        }
      }
    }

    // タイムスタンプでソート（古い順）
    cacheKeys.sort((a, b) => a.timestamp - b.timestamp);

    // 100件を超える場合は古いものを削除
    if (cacheKeys.length > 100) {
      const toDelete = cacheKeys.slice(0, cacheKeys.length - 100);
      toDelete.forEach(({ key }) => {
        localStorage.removeItem(key);
      });
    }

    // 期限切れのキャッシュも削除
    const now = Date.now();
    cacheKeys.forEach(({ key, timestamp }) => {
      if (now - timestamp > CACHE_TTL) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('キャッシュのクリーンアップエラー:', error);
  }
}

/**
 * キャッシュをクリア
 */
export function clearSearchCache(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // メモリキャッシュをクリア
  memoryCache.clear();

  // localStorageのキャッシュをクリア
  try {
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('rag_search_cache_')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('キャッシュのクリアエラー:', error);
  }
}

/**
 * キャッシュの統計情報を取得
 */
export function getCacheStats(): {
  memoryCacheSize: number;
  localStorageCacheSize: number;
  totalSize: number;
} {
  if (typeof window === 'undefined') {
    return { memoryCacheSize: 0, localStorageCacheSize: 0, totalSize: 0 };
  }

  let localStorageCacheSize = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('rag_search_cache_')) {
        localStorageCacheSize++;
      }
    }
  } catch (error) {
    // エラーは無視
  }

  return {
    memoryCacheSize: memoryCache.size,
    localStorageCacheSize,
    totalSize: memoryCache.size + localStorageCacheSize,
  };
}

/**
 * エンティティ更新時にキャッシュを無効化
 */
export function invalidateCacheForEntity(entityId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // エンティティIDを含むキャッシュエントリを削除
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('rag_search_cache_')) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const entry: CacheEntry = JSON.parse(data);
          // エンティティIDを含む結果があるかチェック
          const hasEntity = entry.results.some(
            r => r.type === 'entity' && r.id === entityId
          );
          if (hasEntity) {
            keysToDelete.push(key);
          }
        }
      } catch (error) {
        // パースエラーは無視
      }
    }
  }
  
  keysToDelete.forEach(key => localStorage.removeItem(key));
  
  // メモリキャッシュもクリア
  const memoryKeysToDelete: string[] = [];
  memoryCache.forEach((entry, key) => {
    const hasEntity = entry.results.some(
      r => r.type === 'entity' && r.id === entityId
    );
    if (hasEntity) {
      memoryKeysToDelete.push(key);
    }
  });
  
  memoryKeysToDelete.forEach(key => memoryCache.delete(key));
  
  console.log(`✅ エンティティ ${entityId} に関連するキャッシュを無効化しました`);
}

/**
 * リレーション更新時にキャッシュを無効化
 */
export function invalidateCacheForRelation(relationId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // リレーションIDを含むキャッシュエントリを削除
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('rag_search_cache_')) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const entry: CacheEntry = JSON.parse(data);
          // リレーションIDを含む結果があるかチェック
          const hasRelation = entry.results.some(
            r => r.type === 'relation' && r.id === relationId
          );
          if (hasRelation) {
            keysToDelete.push(key);
          }
        }
      } catch (error) {
        // パースエラーは無視
      }
    }
  }
  
  keysToDelete.forEach(key => localStorage.removeItem(key));
  
  // メモリキャッシュもクリア
  const memoryKeysToDelete: string[] = [];
  memoryCache.forEach((entry, key) => {
    const hasRelation = entry.results.some(
      r => r.type === 'relation' && r.id === relationId
    );
    if (hasRelation) {
      memoryKeysToDelete.push(key);
    }
  });
  
  memoryKeysToDelete.forEach(key => memoryCache.delete(key));
  
  console.log(`✅ リレーション ${relationId} に関連するキャッシュを無効化しました`);
}

/**
 * トピック更新時にキャッシュを無効化
 */
export function invalidateCacheForTopic(topicId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // トピックIDを含むキャッシュエントリを削除
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('rag_search_cache_')) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const entry: CacheEntry = JSON.parse(data);
          // トピックIDを含む結果があるかチェック
          const hasTopic = entry.results.some(
            r => r.type === 'topic' && r.topicId === topicId
          );
          if (hasTopic) {
            keysToDelete.push(key);
          }
        }
      } catch (error) {
        // パースエラーは無視
      }
    }
  }
  
  keysToDelete.forEach(key => localStorage.removeItem(key));
  
  // メモリキャッシュもクリア
  const memoryKeysToDelete: string[] = [];
  memoryCache.forEach((entry, key) => {
    const hasTopic = entry.results.some(
      r => r.type === 'topic' && r.topicId === topicId
    );
    if (hasTopic) {
      memoryKeysToDelete.push(key);
    }
  });
  
  memoryKeysToDelete.forEach(key => memoryCache.delete(key));
  
  console.log(`✅ トピック ${topicId} に関連するキャッシュを無効化しました`);
}

/**
 * 組織のデータ更新時にキャッシュを無効化
 */
export function invalidateCacheForOrganization(organizationId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // 組織IDを含むキャッシュエントリを削除
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('rag_search_cache_')) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const entry: CacheEntry = JSON.parse(data);
          // 組織IDが一致するキャッシュエントリを削除
          if (entry.filters?.organizationId === organizationId) {
            keysToDelete.push(key);
          }
        }
      } catch (error) {
        // パースエラーは無視
      }
    }
  }
  
  keysToDelete.forEach(key => localStorage.removeItem(key));
  
  // メモリキャッシュもクリア
  const memoryKeysToDelete: string[] = [];
  memoryCache.forEach((entry, key) => {
    if (entry.filters?.organizationId === organizationId) {
      memoryKeysToDelete.push(key);
    }
  });
  
  memoryKeysToDelete.forEach(key => memoryCache.delete(key));
  
  console.log(`✅ 組織 ${organizationId} に関連するキャッシュを無効化しました`);
}
