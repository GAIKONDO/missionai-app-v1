/**
 * Agentシステム用のユーティリティ関数
 */

/**
 * ユニークIDを生成
 */
export function generateId(prefix: string = 'agent'): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}_${randomPart}`;
}

