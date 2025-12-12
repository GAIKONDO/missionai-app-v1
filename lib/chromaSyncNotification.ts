/**
 * ChromaDB同期エラー通知機能
 * ユーザーにエラーを通知する機能を提供
 */

import { chromaSyncConfig } from './chromaSyncConfig';

export interface SyncNotification {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  autoClose?: boolean;
  duration?: number; // ミリ秒
}

type NotificationHandler = (notification: SyncNotification) => void;

let notificationHandler: NotificationHandler | null = null;

/**
 * 通知ハンドラーを設定
 * UIコンポーネントから呼び出す
 */
export function setNotificationHandler(handler: NotificationHandler): void {
  notificationHandler = handler;
}

/**
 * 通知を表示
 */
export function showSyncNotification(notification: SyncNotification): void {
  if (!chromaSyncConfig.shouldShowNotifications()) {
    // 通知が無効な場合はコンソールにのみ出力
    console.log(`[ChromaDB同期] ${notification.type}: ${notification.message}`);
    return;
  }
  
  if (notificationHandler) {
    notificationHandler(notification);
  } else {
    // ハンドラーが設定されていない場合はコンソールに出力
    console.warn(`[ChromaDB同期] ${notification.type}: ${notification.message}`);
  }
}

/**
 * エラー通知を表示
 */
export function showSyncError(
  message: string,
  action?: { label: string; onClick: () => void }
): void {
  showSyncNotification({
    type: 'error',
    message,
    action,
    autoClose: false,
  });
}

/**
 * 警告通知を表示
 */
export function showSyncWarning(
  message: string,
  action?: { label: string; onClick: () => void }
): void {
  showSyncNotification({
    type: 'warning',
    message,
    action,
    autoClose: true,
    duration: 5000,
  });
}

/**
 * 情報通知を表示
 */
export function showSyncInfo(message: string): void {
  showSyncNotification({
    type: 'info',
    message,
    autoClose: true,
    duration: 3000,
  });
}

/**
 * 成功通知を表示
 */
export function showSyncSuccess(message: string): void {
  showSyncNotification({
    type: 'success',
    message,
    autoClose: true,
    duration: 2000,
  });
}
