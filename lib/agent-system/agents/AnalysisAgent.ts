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
      selectedModel: agent?.selectedModel,
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

      // LLM APIを使用して分析を実行
      const { getModelInfo } = await import('../llmHelper');
      const { modelType, selectedModel } = getModelInfo(
        this.agent.modelType,
        undefined,
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
      const systemPrompt = this.agent.systemPrompt || 'あなたはデータ分析の専門家です。提供されたデータを分析し、洞察、推奨事項、パターンを抽出してください。';
      
      const analysisPrompt = `以下のデータを分析してください。

分析タイプ: ${analysisType}
分析深度: ${depth}

データ:
${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}

以下の形式で分析結果を返してください：
- 洞察: 重要な発見や気づき
- 推奨事項: アクション可能な提案
- パターン: 検出されたパターン
- 要約: 分析結果の要約`;

      const analysisText = await callLLMAPI(analysisPrompt, systemPrompt, modelType, selectedModel);

      // AbortControllerのチェック（LLM API呼び出し後）
      if (context.abortController?.signal.aborted) {
        throw new Error('タスクがキャンセルされました');
      }

      // 分析結果をパース（簡易実装）
      const insights: string[] = [];
      const recommendations: string[] = [];
      const patterns: string[] = [];
      let summary = '分析が完了しました。';

      // テキストから構造化された情報を抽出（簡易実装）
      const lines = analysisText.split('\n');
      let currentSection = '';
      for (const line of lines) {
        if (line.includes('洞察') || line.includes('insight')) {
          currentSection = 'insights';
        } else if (line.includes('推奨') || line.includes('recommendation')) {
          currentSection = 'recommendations';
        } else if (line.includes('パターン') || line.includes('pattern')) {
          currentSection = 'patterns';
        } else if (line.includes('要約') || line.includes('summary')) {
          currentSection = 'summary';
        } else if (line.trim() && line.startsWith('-')) {
          const content = line.replace(/^-\s*/, '').trim();
          if (currentSection === 'insights' && content) {
            insights.push(content);
          } else if (currentSection === 'recommendations' && content) {
            recommendations.push(content);
          } else if (currentSection === 'patterns' && content) {
            patterns.push(content);
          }
        } else if (currentSection === 'summary' && line.trim()) {
          summary = line.trim();
        }
      }

      // 抽出できなかった場合は、全体を要約として使用
      if (insights.length === 0 && recommendations.length === 0 && patterns.length === 0) {
        summary = analysisText;
      }

      const analysisResult = {
        data,
        analysisType,
        depth,
        insights: insights.length > 0 ? insights : ['分析が完了しました。'],
        recommendations: recommendations.length > 0 ? recommendations : ['追加の分析を推奨します。'],
        patterns: patterns.length > 0 ? patterns : ['パターンが検出されました。'],
        summary,
        rawAnalysis: analysisText,
        modelType,
        selectedModel,
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

