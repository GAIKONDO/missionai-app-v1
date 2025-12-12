/**
 * ChromaDB同期リトライ機能
 * 失敗した同期処理を自動的にリトライ
 */

import { chromaSyncConfig } from './chromaSyncConfig';
import { showSyncWarning } from './chromaSyncNotification';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, maxRetries: number) => void;
}

/**
 * リトライ機能付きで関数を実行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = chromaSyncConfig.getConfig();
  const maxRetries = options.maxRetries ?? config.maxRetries;
  const retryDelay = options.retryDelay ?? config.retryDelay;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0 && options.onRetry) {
        options.onRetry(attempt, maxRetries);
      }
      
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // 最後の試行でない場合、リトライ
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt); // 指数バックオフ
        console.warn(`[ChromaDB同期] リトライ ${attempt + 1}/${maxRetries} (${delay}ms後):`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  // すべてのリトライが失敗した場合
  throw lastError || new Error('リトライが失敗しました');
}

/**
 * 同期処理をリトライ付きで実行
 */
export async function syncWithRetry<T>(
  syncFn: () => Promise<T>,
  entityId: string,
  entityType: 'entity' | 'relation' | 'topic',
  options: RetryOptions = {}
): Promise<T> {
  const config = chromaSyncConfig.getConfig();
  
  if (!config.retryOnFailure) {
    // リトライが無効な場合は通常実行
    return await syncFn();
  }
  
  try {
    return await withRetry(syncFn, {
      ...options,
      onRetry: (attempt, maxRetries) => {
        showSyncWarning(
          `${entityType}「${entityId}」のChromaDB同期に失敗しました。リトライ中... (${attempt}/${maxRetries})`
        );
        if (options.onRetry) {
          options.onRetry(attempt, maxRetries);
        }
      },
    });
  } catch (error) {
    // すべてのリトライが失敗した場合
    showSyncWarning(
      `${entityType}「${entityId}」のChromaDB同期に失敗しました。後で再試行してください。`,
      {
        label: '再試行',
        onClick: () => {
          syncWithRetry(syncFn, entityId, entityType, options);
        },
      }
    );
    throw error;
  }
}
