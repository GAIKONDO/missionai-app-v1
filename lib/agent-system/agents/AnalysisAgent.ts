/**
 * 分析Agent
 * 分析タスク専用のAgent
 */

import { BaseAgent } from '../agent';
import type { Task, TaskExecutionContext, Agent, A2AMessage, A2AMessageType } from '../types';
import { AgentRole, TaskType } from '../types';
import { A2AMessageType as AMT } from '../types';

/**
 * 分析Agent
 */
export class AnalysisAgent extends BaseAgent {
  constructor(agent?: Partial<Agent>) {
    const defaultAgent: Agent = {
      id: agent?.id || 'analysis-agent',
      name: agent?.name || '分析Agent',
      description: agent?.description || '分析タスクに特化したAgent。データやトピックを分析して洞察を抽出します。',
      role: agent?.role || AgentRole.ANALYZER,
      capabilities: agent?.capabilities || [TaskType.ANALYSIS],
      tools: agent?.tools || [],
      modelType: agent?.modelType || 'gpt',
      systemPrompt: agent?.systemPrompt || `あなたは分析専門のAIエージェントです。
提供されたデータやトピックを分析し、パターン、傾向、洞察を抽出します。
分析結果は構造化され、アクション可能な推奨事項を含めます。`,
      config: agent?.config || {
        maxConcurrentTasks: 3,
        defaultTimeout: 60000,
        retryPolicy: {
          maxRetries: 1,
          retryDelay: 2000,
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
      // 分析パラメータを取得
      const data = task.parameters.data || task.parameters.topicId;
      if (!data) {
        throw new Error('分析データが指定されていません');
      }

      const analysisType = task.parameters.analysisType || 'general';
      const depth = task.parameters.depth || 'standard';

      if (execution) {
        this.addLog(execution, 'info', `分析を開始: タイプ=${analysisType}, 深度=${depth}`);
      }

      // 分析を実行（将来実装: 実際の分析機能を呼び出す）
      // 現時点ではモック実装
      const analysisResult = {
        data,
        analysisType,
        depth,
        insights: [
          '分析結果1: 重要なパターンが検出されました',
          '分析結果2: 傾向が確認されました',
        ],
        recommendations: [
          '推奨事項1: この傾向を継続的に監視してください',
          '推奨事項2: 追加のデータ収集を検討してください',
        ],
        patterns: ['パターンA', 'パターンB'],
        summary: '分析が完了しました。重要な洞察が抽出されました。',
      };

      if (execution) {
        this.addLog(execution, 'info', `分析完了: ${analysisResult.insights.length}件の洞察を抽出`);
      }

      return analysisResult;
    } catch (error: any) {
      if (execution) {
        this.addLog(execution, 'error', `分析エラー: ${error.message}`, error);
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
          payload: { result: '分析リクエストを受信しました' },
          timestamp: Date.now(),
          responseTo: message.id,
          requiresResponse: false,
        };

      case AMT.NOTIFICATION:
        console.log(`[AnalysisAgent] 通知を受信: ${message.payload.notification}`);
        return null;

      case AMT.STATUS_UPDATE:
        console.log(`[AnalysisAgent] 状態更新を受信: ${message.payload.status}`);
        return null;

      default:
        console.warn(`[AnalysisAgent] 未知のメッセージタイプ: ${message.type}`);
        return null;
    }
  }
}

