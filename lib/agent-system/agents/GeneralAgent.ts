/**
 * 汎用Agent
 * 様々なタスクタイプに対応できる汎用Agent
 */

import { BaseAgent } from '../agent';
import type { Task, TaskExecutionContext, Agent, A2AMessage, A2AMessageType } from '../types';
import { AgentRole, TaskType } from '../types';
import { A2AMessageType as AMT } from '../types';
import { useAIChat } from '@/components/AIAssistantPanel/hooks/useAIChat';

/**
 * 汎用Agent
 */
export class GeneralAgent extends BaseAgent {
  constructor(agent?: Partial<Agent>) {
    const defaultAgent: Agent = {
      id: agent?.id || 'general-agent',
      name: agent?.name || '汎用Agent',
      description: agent?.description || '様々なタスクタイプに対応できる汎用Agent',
      role: agent?.role || AgentRole.GENERAL,
      capabilities: agent?.capabilities || Object.values(TaskType),
      tools: agent?.tools || [],
      modelType: agent?.modelType || 'gpt',
      selectedModel: agent?.selectedModel,
      systemPrompt: agent?.systemPrompt || `あなたは汎用AIエージェントです。
ユーザーからのタスクを実行し、適切な結果を返してください。
必要に応じて、他のAgentに確認や指示を出すことができます。`,
      config: agent?.config || {
        maxConcurrentTasks: 3,
        defaultTimeout: 30000,
        retryPolicy: {
          maxRetries: 2,
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

    // 実行ログを追加
    const execution = context.executionId ? {
      id: context.executionId,
      taskId: task.id,
      agentId: this.agent.id,
      status: 'running' as const,
      startedAt: Date.now(),
      logs: [] as any[],
    } : null;

    try {
      // タスクタイプに応じた処理
      switch (task.type) {
        case TaskType.SEARCH:
          return await this.executeSearchTask(task, context, execution);
        case TaskType.ANALYSIS:
          return await this.executeAnalysisTask(task, context, execution);
        case TaskType.GENERATION:
          return await this.executeGenerationTask(task, context, execution);
        case TaskType.VALIDATION:
          return await this.executeValidationTask(task, context, execution);
        case TaskType.COORDINATION:
          return await this.executeCoordinationTask(task, context, execution);
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
    } catch (error: any) {
      // キャンセルエラーの場合は再スロー
      if (error.message?.includes('キャンセル') || context.abortController?.signal.aborted) {
        throw error;
      }
      if (execution) {
        execution.logs.push({
          timestamp: Date.now(),
          level: 'error',
          message: error.message,
          data: error,
        });
      }
      throw error;
    }
  }

  /**
   * 検索タスクを実行
   */
  private async executeSearchTask(
    task: Task,
    context: TaskExecutionContext,
    execution: any
  ): Promise<any> {
    if (execution) {
      execution.logs.push({
        timestamp: Date.now(),
        level: 'info',
        message: '検索タスクを開始',
      });
    }

    // 検索パラメータを取得
    const query = task.parameters.query || task.parameters.searchQuery;
    if (!query) {
      throw new Error('検索クエリが指定されていません');
    }

    // RAG検索を実行（将来実装: 実際の検索機能を呼び出す）
    // 現時点ではモック実装
    return {
      query,
      results: [],
      message: '検索タスクが実行されました（モック実装）',
    };
  }

  /**
   * 分析タスクを実行
   */
  private async executeAnalysisTask(
    task: Task,
    context: TaskExecutionContext,
    execution: any
  ): Promise<any> {
    if (execution) {
      execution.logs.push({
        timestamp: Date.now(),
        level: 'info',
        message: '分析タスクを開始',
      });
    }

    // 分析パラメータを取得
    const data = task.parameters.data;
    if (!data) {
      throw new Error('分析データが指定されていません');
    }

    // 分析を実行（将来実装: 実際の分析機能を呼び出す）
    return {
      data,
      analysis: '分析結果（モック実装）',
    };
  }

  /**
   * 生成タスクを実行
   */
  private async executeGenerationTask(
    task: Task,
    context: TaskExecutionContext,
    execution: any
  ): Promise<any> {
    if (execution) {
      execution.logs.push({
        timestamp: Date.now(),
        level: 'info',
        message: '生成タスクを開始',
      });
    }

    // 生成パラメータを取得
    const prompt = task.parameters.prompt || task.parameters.instruction;
    if (!prompt) {
      throw new Error('生成プロンプトが指定されていません');
    }

    // LLM APIを使用してコンテンツを生成
    const { getModelInfo } = await import('../llmHelper');
    const { modelType, selectedModel } = getModelInfo(
      this.agent.modelType,
      undefined,
      task.modelType,
      task.selectedModel
    );

    if (execution) {
      execution.logs.push({
        timestamp: Date.now(),
        level: 'info',
        message: `LLM APIを呼び出し: ${modelType} / ${selectedModel}`,
      });
    }

    // AbortControllerのチェック
    if (context.abortController?.signal.aborted) {
      throw new Error('タスクがキャンセルされました');
    }

    const { callLLMAPI } = await import('../llmHelper');
    const systemPrompt = this.agent.systemPrompt || 'あなたはテキスト生成の専門家です。ユーザーの指示に従って、高品質なコンテンツを生成してください。';
    
    const generated = await callLLMAPI(prompt, systemPrompt, modelType, selectedModel);

    // AbortControllerのチェック（LLM API呼び出し後）
    if (context.abortController?.signal.aborted) {
      throw new Error('タスクがキャンセルされました');
    }

    if (execution) {
      execution.logs.push({
        timestamp: Date.now(),
        level: 'info',
        message: `生成完了: ${generated.length}文字`,
      });
    }

    return {
      prompt,
      generated,
      modelType,
      selectedModel,
    };
  }

  /**
   * 検証タスクを実行
   */
  private async executeValidationTask(
    task: Task,
    context: TaskExecutionContext,
    execution: any
  ): Promise<any> {
    if (execution) {
      execution.logs.push({
        timestamp: Date.now(),
        level: 'info',
        message: '検証タスクを開始',
      });
    }

    // 検証パラメータを取得
    const target = task.parameters.target || task.parameters.data;
    if (!target) {
      throw new Error('検証対象が指定されていません');
    }

    // 検証を実行（将来実装: 実際の検証機能を呼び出す）
    return {
      target,
      valid: true,
      message: '検証結果（モック実装）',
    };
  }

  /**
   * 協調タスクを実行
   */
  private async executeCoordinationTask(
    task: Task,
    context: TaskExecutionContext,
    execution: any
  ): Promise<any> {
    if (execution) {
      execution.logs.push({
        timestamp: Date.now(),
        level: 'info',
        message: '協調タスクを開始',
      });
    }

    // 協調パラメータを取得
    const targetAgents = task.parameters.targetAgents || task.requiredAgents || [];
    if (targetAgents.length === 0) {
      throw new Error('協調対象のAgentが指定されていません');
    }

    // 他のAgentに確認を求める（例）
    const confirmations: boolean[] = [];
    for (const agentId of targetAgents) {
      const confirmed = await this.requestConfirmation(
        agentId,
        `タスク "${task.name}" の実行に協力できますか？`,
        task.id
      );
      confirmations.push(confirmed);
    }

    return {
      targetAgents,
      confirmations,
      message: '協調タスクが実行されました（モック実装）',
    };
  }

  /**
   * メッセージを処理
   */
  async handleMessage(message: A2AMessage): Promise<A2AMessage | null> {
    switch (message.type) {
      case AMT.CONFIRMATION:
        // 確認要求への応答（デフォルトで承認）
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
        // リクエストへの応答
        return {
          id: `response-${Date.now()}`,
          from: this.agent.id,
          to: message.from,
          type: AMT.RESPONSE,
          taskId: message.taskId,
          payload: { result: 'リクエストを受信しました' },
          timestamp: Date.now(),
          responseTo: message.id,
          requiresResponse: false,
        };

      case AMT.NOTIFICATION:
        // 通知は応答不要
        console.log(`[GeneralAgent] 通知を受信: ${message.payload.notification}`);
        return null;

      case AMT.STATUS_UPDATE:
        // 状態更新は応答不要
        console.log(`[GeneralAgent] 状態更新を受信: ${message.payload.status}`);
        return null;

      default:
        console.warn(`[GeneralAgent] 未知のメッセージタイプ: ${message.type}`);
        return null;
    }
  }
}

