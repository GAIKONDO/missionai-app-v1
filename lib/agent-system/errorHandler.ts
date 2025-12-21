/**
 * エラーハンドリングとリトライ機能
 */

import type { Task, TaskExecution, ExecutionStatus, RetryPolicy } from './types';
import { ExecutionStatus as ES } from './types';
import { getAgentOrchestrator } from './agentOrchestrator';

/**
 * エラータイプ
 */
export enum ErrorType {
  NETWORK_ERROR = 'network_error',           // ネットワークエラー
  TIMEOUT_ERROR = 'timeout_error',           // タイムアウトエラー
  VALIDATION_ERROR = 'validation_error',     // 検証エラー
  EXECUTION_ERROR = 'execution_error',      // 実行エラー
  DEPENDENCY_ERROR = 'dependency_error',     // 依存関係エラー
  UNKNOWN_ERROR = 'unknown_error',           // 未知のエラー
}

/**
 * エラー情報
 */
export interface ErrorInfo {
  type: ErrorType;
  message: string;
  originalError?: any;
  retryable: boolean;            // リトライ可能か
  timestamp: number;             // エラー発生時刻
}

/**
 * エラーハンドラー
 */
export class ErrorHandler {
  /**
   * エラーを分類
   */
  classifyError(error: any): ErrorInfo {
    const message = error?.message || String(error);
    const timestamp = Date.now();

    // ネットワークエラー
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT')
    ) {
      return {
        type: ErrorType.NETWORK_ERROR,
        message,
        originalError: error,
        retryable: true,
        timestamp,
      };
    }

    // タイムアウトエラー
    if (
      message.includes('timeout') ||
      message.includes('TIMEOUT') ||
      message.includes('timed out')
    ) {
      return {
        type: ErrorType.TIMEOUT_ERROR,
        message,
        originalError: error,
        retryable: true,
        timestamp,
      };
    }

    // 検証エラー
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('missing')
    ) {
      return {
        type: ErrorType.VALIDATION_ERROR,
        message,
        originalError: error,
        retryable: false,
        timestamp,
      };
    }

    // 依存関係エラー
    if (
      message.includes('dependency') ||
      message.includes('not found') ||
      message.includes('missing')
    ) {
      return {
        type: ErrorType.DEPENDENCY_ERROR,
        message,
        originalError: error,
        retryable: false,
        timestamp,
      };
    }

    // その他のエラー
    return {
      type: ErrorType.UNKNOWN_ERROR,
      message,
      originalError: error,
      retryable: true, // デフォルトでリトライ可能とする
      timestamp,
    };
  }

  /**
   * タスクをリトライ実行
   */
  async retryTask(
    task: Task,
    previousExecution: TaskExecution,
    retryPolicy: RetryPolicy
  ): Promise<TaskExecution> {
    const orchestrator = getAgentOrchestrator();
    let retryCount = 0;
    let lastExecution = previousExecution;

    while (retryCount < retryPolicy.maxRetries) {
      // リトライ遅延を計算（指数バックオフ）
      const delay = retryPolicy.retryDelay * Math.pow(retryPolicy.backoffMultiplier, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));

      console.log(`[ErrorHandler] タスク "${task.name}" をリトライ中 (${retryCount + 1}/${retryPolicy.maxRetries})`);

      try {
        const execution = await orchestrator.executeTask(task);

        if (execution.status === ES.COMPLETED) {
          console.log(`[ErrorHandler] リトライ成功: タスク "${task.name}"`);
          return execution;
        }

        lastExecution = execution;
        retryCount++;
      } catch (error: any) {
        const errorInfo = this.classifyError(error);
        
        // リトライ不可能なエラーの場合、リトライを中止
        if (!errorInfo.retryable) {
          console.log(`[ErrorHandler] リトライ不可能なエラーのため、リトライを中止: ${errorInfo.message}`);
          break;
        }

        lastExecution = {
          ...lastExecution,
          status: ES.FAILED,
          error: errorInfo.message,
          completedAt: Date.now(),
        };

        retryCount++;
      }
    }

    // すべてのリトライが失敗
    return {
      ...lastExecution,
      status: ES.FAILED,
      error: `リトライ上限（${retryPolicy.maxRetries}回）に達しました`,
      completedAt: Date.now(),
    };
  }

  /**
   * エラー通知を送信
   */
  async notifyError(
    errorInfo: ErrorInfo,
    task: Task,
    execution: TaskExecution
  ): Promise<void> {
    // エラーログを出力
    console.error(`[ErrorHandler] エラー発生:`, {
      type: errorInfo.type,
      message: errorInfo.message,
      taskId: task.id,
      taskName: task.name,
      executionId: execution.id,
      retryable: errorInfo.retryable,
    });

    // 将来実装: エラー通知システム（メール、Slack等）への送信
    // 現時点ではログ出力のみ
  }

  /**
   * フォールバック処理を実行
   */
  async executeFallback(
    task: Task,
    errorInfo: ErrorInfo,
    fallbackTask?: Task
  ): Promise<TaskExecution | null> {
    if (!fallbackTask) {
      return null;
    }

    console.log(`[ErrorHandler] フォールバックタスクを実行: "${fallbackTask.name}"`);

    try {
      const orchestrator = getAgentOrchestrator();
      const execution = await orchestrator.executeTask(fallbackTask);
      return execution;
    } catch (error: any) {
      console.error(`[ErrorHandler] フォールバックタスクの実行も失敗:`, error);
      return null;
    }
  }
}

/**
 * グローバルエラーハンドラーインスタンス
 */
let globalErrorHandler: ErrorHandler | null = null;

/**
 * エラーハンドラーを取得（シングルトン）
 */
export function getErrorHandler(): ErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new ErrorHandler();
  }
  return globalErrorHandler;
}

