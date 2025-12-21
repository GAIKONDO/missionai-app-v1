/**
 * 検索Agent
 * 検索タスク専用のAgent
 */

import { BaseAgent } from '../agent';
import type { Task, TaskExecutionContext, Agent, A2AMessage, A2AMessageType } from '../types';
import { AgentRole, TaskType } from '../types';
import { A2AMessageType as AMT } from '../types';

/**
 * 検索Agent
 */
export class SearchAgent extends BaseAgent {
  constructor(agent?: Partial<Agent>) {
    const defaultAgent: Agent = {
      id: agent?.id || 'search-agent',
      name: agent?.name || '検索Agent',
      description: agent?.description || '検索タスクに特化したAgent。ナレッジグラフや設計ドキュメントの検索を実行します。',
      role: agent?.role || AgentRole.SEARCHER,
      capabilities: agent?.capabilities || [TaskType.SEARCH],
      tools: agent?.tools || ['search_knowledge_graph'],
      modelType: agent?.modelType || 'gpt',
      selectedModel: agent?.selectedModel,
      systemPrompt: agent?.systemPrompt || `あなたは検索専門のAIエージェントです。
ユーザーからの検索クエリに対して、ナレッジグラフや設計ドキュメントを検索し、関連情報を提供します。
検索結果は正確で関連性の高いものを優先します。`,
      config: agent?.config || {
        maxConcurrentTasks: 5,
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

    const execution = context.executionId ? {
      id: context.executionId,
      taskId: task.id,
      agentId: this.agent.id,
      status: 'running' as const,
      startedAt: Date.now(),
      logs: [] as any[],
    } : null;

    try {
      // 検索パラメータを取得
      const query = task.parameters.query || task.parameters.searchQuery;
      if (!query) {
        throw new Error('検索クエリが指定されていません');
      }

      const limit = task.parameters.limit || 10;
      const organizationId = task.parameters.organizationId;

      if (execution) {
        this.addLog(execution, 'info', `検索を開始: "${query}"`);
      }

      // AbortControllerのチェック
      if (context.abortController?.signal.aborted) {
        throw new Error('タスクがキャンセルされました');
      }

      // ナレッジグラフ検索を実行
      const { searchKnowledgeGraph } = await import('@/lib/knowledgeGraphRAG');
      const searchResults = await searchKnowledgeGraph(
        query,
        limit,
        organizationId ? { organizationId } : undefined
      );

      // AbortControllerのチェック（検索後）
      if (context.abortController?.signal.aborted) {
        throw new Error('タスクがキャンセルされました');
      }

      if (execution) {
        this.addLog(execution, 'info', `検索結果: ${searchResults.length}件`);
      }

      // 検索結果からコンテキストを生成
      const { getKnowledgeGraphContextWithResults } = await import('@/lib/knowledgeGraphRAG');
      const result = await getKnowledgeGraphContextWithResults(
        query,
        limit,
        organizationId ? { organizationId } : undefined,
        2000
      );

      // AbortControllerのチェック（コンテキスト生成後）
      if (context.abortController?.signal.aborted) {
        throw new Error('タスクがキャンセルされました');
      }

      return {
        query,
        results: searchResults,
        context: result.context,
        sources: result.sources,
        count: searchResults.length,
      };
    } catch (error: any) {
      if (execution) {
        this.addLog(execution, 'error', `検索エラー: ${error.message}`, error);
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
        // 検索リクエストの場合、検索を実行
        if (message.payload.type === 'search') {
          try {
            const { searchKnowledgeGraph } = await import('@/lib/knowledgeGraphRAG');
            const results = await searchKnowledgeGraph(
              message.payload.query,
              message.payload.limit || 10
            );
            return {
              id: `response-${Date.now()}`,
              from: this.agent.id,
              to: message.from,
              type: AMT.RESPONSE,
              taskId: message.taskId,
              payload: { results, count: results.length },
              timestamp: Date.now(),
              responseTo: message.id,
              requiresResponse: false,
            };
          } catch (error: any) {
            return {
              id: `response-${Date.now()}`,
              from: this.agent.id,
              to: message.from,
              type: AMT.RESPONSE,
              taskId: message.taskId,
              payload: { error: error.message },
              timestamp: Date.now(),
              responseTo: message.id,
              requiresResponse: false,
            };
          }
        }
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
        console.log(`[SearchAgent] 通知を受信: ${message.payload.notification}`);
        return null;

      case AMT.STATUS_UPDATE:
        console.log(`[SearchAgent] 状態更新を受信: ${message.payload.status}`);
        return null;

      default:
        console.warn(`[SearchAgent] 未知のメッセージタイプ: ${message.type}`);
        return null;
    }
  }
}

