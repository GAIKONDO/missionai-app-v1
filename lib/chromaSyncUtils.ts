/**
 * ChromaDB同期ユーティリティ
 * 同期機能の初期化、設定、監視など
 */

import { chromaSyncConfig } from './chromaSyncConfig';
import { startConsistencyCheck, stopConsistencyCheck } from './chromaSyncConsistency';
import { setNotificationHandler } from './chromaSyncNotification';

/**
 * ChromaDB同期機能を初期化
 */
export function initializeChromaSync(options?: {
  organizationId?: string;
  onNotification?: (notification: any) => void;
}): void {
  // 通知ハンドラーを設定
  if (options?.onNotification) {
    setNotificationHandler(options.onNotification);
  }
  
  // 整合性チェックを開始
  const config = chromaSyncConfig.getConfig();
  if (config.checkConsistency) {
    startConsistencyCheck(options?.organizationId);
  }
  
  console.log('✅ ChromaDB同期機能を初期化しました', {
    enabled: config.enabled,
    async: config.async,
    retryOnFailure: config.retryOnFailure,
    checkConsistency: config.checkConsistency,
  });
}

/**
 * ChromaDB同期機能を停止
 */
export function shutdownChromaSync(): void {
  stopConsistencyCheck();
  console.log('ChromaDB同期機能を停止しました');
}

/**
 * 同期設定を取得（UI表示用）
 */
export function getSyncConfigForUI(): {
  enabled: boolean;
  async: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
  checkConsistency: boolean;
  showNotifications: boolean;
} {
  const config = chromaSyncConfig.getConfig();
  return {
    enabled: config.enabled,
    async: config.async,
    retryOnFailure: config.retryOnFailure,
    maxRetries: config.maxRetries,
    checkConsistency: config.checkConsistency,
    showNotifications: config.showNotifications,
  };
}

/**
 * 同期設定を更新（UIから呼び出し）
 */
export function updateSyncConfigFromUI(
  updates: Partial<{
    enabled: boolean;
    async: boolean;
    retryOnFailure: boolean;
    maxRetries: number;
    checkConsistency: boolean;
    showNotifications: boolean;
  }>
): void {
  chromaSyncConfig.setConfig(updates);
  
  // 整合性チェックの再起動
  if (updates.checkConsistency !== undefined) {
    if (updates.checkConsistency) {
      startConsistencyCheck();
    } else {
      stopConsistencyCheck();
    }
  }
}
