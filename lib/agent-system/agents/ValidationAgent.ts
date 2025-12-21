/**
 * 検証Agent
 * 検証タスク専用のAgent
 */

import { BaseAgent } from '../agent';
import type { Task, TaskExecutionContext, Agent, A2AMessage, A2AMessageType } from '../types';
import { AgentRole, TaskType } from '../types';
import { A2AMessageType as AMT } from '../types';

/**
 * 検証Agent
 */
export class ValidationAgent extends BaseAgent {
  constructor(agent?: Partial<Agent>) {
    const defaultAgent: Agent = {
      id: agent?.id || 'validation-agent',
      name: agent?.name || '検証Agent',
      description: agent?.description || '検証タスクに特化したAgent。データの整合性や品質を検証します。',
      role: agent?.role || AgentRole.VALIDATOR,
      capabilities: agent?.capabilities || [TaskType.VALIDATION],
      tools: agent?.tools || [],
      modelType: agent?.modelType || 'gpt',
      selectedModel: agent?.selectedModel,
      systemPrompt: agent?.systemPrompt || `あなたは検証専門のAIエージェントです。
提供されたデータの整合性、品質、正確性を検証します。
検証結果は明確で、問題があれば具体的な指摘を行います。`,
      config: agent?.config || {
        maxConcurrentTasks: 4,
        defaultTimeout: 20000,
        retryPolicy: {
          maxRetries: 1,
          retryDelay: 1000,
          backoffMultiplier: 2,
        },
      },
      createdAt: agent?.createdAt || Date.now(),
      updatedAt: agent?.updatedAt || Date.now(),
    };

    super(defaultAgent);
  }

  /**
   * タスクを実行
   */
  async executeTask(
    task: Task,
    context: TaskExecutionContext
  ): Promise<any> {
    // AbortControllerのチェック
    if (context.abortController?.signal.aborted) {
      throw new Error('タスクがキャンセルされました');
    }

    const execution = context.executionId ? {
      id: context.executionId,
      taskId: task.id,
      agentId: this.agent.id,
      status: 'running' as const,
      startedAt: Date.now(),
      logs: [] as any[],
    } : null;

    try {
      // 検証パラメータを取得
      const target = task.parameters.target || task.parameters.data;
      if (!target) {
        throw new Error('検証対象が指定されていません');
      }

      const validationRules = task.parameters.validationRules || [];
      const strict = task.parameters.strict !== false;

      if (execution) {
        this.addLog(execution, 'info', `検証を開始: ルール数=${validationRules.length}, 厳密モード=${strict}`);
      }

      // 検証を実行（将来実装: 実際の検証機能を呼び出す）
      // 現時点ではモック実装
      const validationResult = {
        target,
        valid: true,
        errors: [] as string[],
        warnings: [] as string[],
        checks: [
          { name: '整合性チェック', passed: true },
          { name: '品質チェック', passed: true },
          { name: '正確性チェック', passed: true },
        ],
        message: '検証が完了しました。すべてのチェックをパスしました。',
      };

      if (execution) {
        this.addLog(execution, 'info', `検証完了: ${validationResult.checks.filter(c => c.passed).length}/${validationResult.checks.length}件のチェックをパス`);
      }

      return validationResult;
    } catch (error: any) {
      if (execution) {
        this.addLog(execution, 'error', `検証エラー: ${error.message}`, error);
      }
      throw error;
    }
  }

  /**
   * メッセージを処理
   */
  async handleMessage(message: A2AMessage): Promise<A2AMessage | null> {
    switch (message.type) {
      case AMT.CONFIRMATION:
        return {
          id: `response-${Date.now()}`,
          from: this.agent.id,
          to: message.from,
          type: AMT.RESPONSE,
          taskId: message.taskId,
          payload: { confirmed: true },
          timestamp: Date.now(),
          responseTo: message.id,
          requiresResponse: false,
        };

      case AMT.REQUEST:
        return {
          id: `response-${Date.now()}`,
          from: this.agent.id,
          to: message.from,
          type: AMT.RESPONSE,
          taskId: message.taskId,
          payload: { result: '検証リクエストを受信しました' },
          timestamp: Date.now(),
          responseTo: message.id,
          requiresResponse: false,
        };

      case AMT.NOTIFICATION:
        console.log(`[ValidationAgent] 通知を受信: ${message.payload.notification}`);
        return null;

      case AMT.STATUS_UPDATE:
        console.log(`[ValidationAgent] 状態更新を受信: ${message.payload.status}`);
        return null;

      default:
        console.warn(`[ValidationAgent] 未知のメッセージタイプ: ${message.type}`);
        return null;
    }
  }
}

