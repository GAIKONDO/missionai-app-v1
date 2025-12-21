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
      selectedModel: agent?.selectedModel,
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

      // LLM APIを使用してコンテンツを生成
      const { getModelInfo } = await import('../llmHelper');
      const { modelType, selectedModel } = getModelInfo(
        this.agent.modelType,
        this.agent.selectedModel,
        task.modelType,
        task.selectedModel
      );

      if (execution) {
        this.addLog(execution, 'info', `LLM APIを呼び出し: ${modelType} / ${selectedModel}`);
      }

      // AbortControllerのチェック
      if (context.abortController?.signal.aborted) {
        throw new Error('タスクがキャンセルされました');
      }

      const { callLLMAPI } = await import('../llmHelper');
      const systemPrompt = this.agent.systemPrompt || 'あなたはテキスト生成の専門家です。ユーザーの指示に従って、高品質なコンテンツを生成してください。';
      
      const generationPrompt = `以下のスタイルでコンテンツを生成してください。

スタイル: ${style}
最大長: ${maxLength}文字

プロンプト:
${prompt}`;

      const generated = await callLLMAPI(generationPrompt, systemPrompt, modelType, selectedModel);

      // AbortControllerのチェック（LLM API呼び出し後）
      if (context.abortController?.signal.aborted) {
        throw new Error('タスクがキャンセルされました');
      }

      if (execution) {
        this.addLog(execution, 'info', `生成完了: ${generated.length}文字`);
      }

      return {
        prompt,
        generated,
        style,
        length: generated.length,
        modelType,
        selectedModel,
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

