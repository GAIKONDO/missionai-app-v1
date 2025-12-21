/**
 * 生成Agent
 * 生成タスク専用のAgent
 */

import { BaseAgent } from '../agent';
import type { Task, TaskExecutionContext, Agent, A2AMessage, A2AMessageType } from '../types';
import { AgentRole, TaskType } from '../types';
import { A2AMessageType as AMT } from '../types';

/**
 * 生成Agent
 */
export class GenerationAgent extends BaseAgent {
  constructor(agent?: Partial<Agent>) {
    const defaultAgent: Agent = {
      id: agent?.id || 'generation-agent',
      name: agent?.name || '生成Agent',
      description: agent?.description || '生成タスクに特化したAgent。テキスト、要約、レポートなどを生成します。',
      role: agent?.role || AgentRole.GENERATOR,
      capabilities: agent?.capabilities || [TaskType.GENERATION],
      tools: agent?.tools || [],
      modelType: agent?.modelType || 'gpt',
      systemPrompt: agent?.systemPrompt || `あなたは生成専門のAIエージェントです。
ユーザーからの指示に基づいて、テキスト、要約、レポートなどを生成します。
生成されるコンテンツは正確で、構造化され、読みやすい形式にします。`,
      config: agent?.config || {
        maxConcurrentTasks: 3,
        defaultTimeout: 45000,
        retryPolicy: {
          maxRetries: 1,
          retryDelay: 1500,
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
    const execution = context.executionId ? {
      id: context.executionId,
      taskId: task.id,
      agentId: this.agent.id,
      status: 'running' as const,
      startedAt: Date.now(),
      logs: [] as any[],
    } : null;

    try {
      // 生成パラメータを取得
      const prompt = task.parameters.prompt || task.parameters.instruction || task.parameters.content;
      if (!prompt) {
        throw new Error('生成プロンプトが指定されていません');
      }

      const maxLength = task.parameters.maxLength || 500;
      const style = task.parameters.style || 'standard';

      if (execution) {
        this.addLog(execution, 'info', `生成を開始: スタイル=${style}, 最大長=${maxLength}`);
      }

      // 生成を実行（将来実装: 実際の生成機能を呼び出す）
      // 現時点ではモック実装
      const generated = `生成されたコンテンツ（モック実装）\n\nプロンプト: ${prompt}\n\nこれは生成Agentによって生成されたサンプルコンテンツです。実際の実装では、LLM APIを使用してコンテンツを生成します。`;

      if (execution) {
        this.addLog(execution, 'info', `生成完了: ${generated.length}文字`);
      }

      return {
        prompt,
        generated,
        style,
        length: generated.length,
      };
    } catch (error: any) {
      if (execution) {
        this.addLog(execution, 'error', `生成エラー: ${error.message}`, error);
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
          payload: { result: '生成リクエストを受信しました' },
          timestamp: Date.now(),
          responseTo: message.id,
          requiresResponse: false,
        };

      case AMT.NOTIFICATION:
        console.log(`[GenerationAgent] 通知を受信: ${message.payload.notification}`);
        return null;

      case AMT.STATUS_UPDATE:
        console.log(`[GenerationAgent] 状態更新を受信: ${message.payload.status}`);
        return null;

      default:
        console.warn(`[GenerationAgent] 未知のメッセージタイプ: ${message.type}`);
        return null;
    }
  }
}

