/**
 * A2A (Agent-to-Agent) 通信マネージャー
 * Agent間のメッセージ送受信を管理
 */

import type { A2AMessage, A2AMessageType } from './types';
import { generateId } from './utils';

/**
 * A2A通信マネージャー
 */
export class A2AManager {
  private agents: Map<string, any> = new Map(); // Agentインスタンス（循環参照回避のためany）
  private messageQueue: A2AMessage[] = [];
  private messageHistory: Map<string, A2AMessage> = new Map();
  private pendingResponses: Map<string, (response: A2AMessage | null) => void> = new Map();

  /**
   * Agentを登録
   */
  registerAgent(agentId: string, agent: any): void {
    this.agents.set(agentId, agent);
    console.log(`[A2AManager] Agent登録: ${agentId}`);
  }

  /**
   * Agentの登録を解除
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    console.log(`[A2AManager] Agent登録解除: ${agentId}`);
  }

  /**
   * メッセージを送信
   */
  async sendMessage(message: A2AMessage): Promise<A2AMessage | null> {
    const targetAgent = this.agents.get(message.to);
    if (!targetAgent) {
      console.error(`[A2AManager] Agent ${message.to} not found`);
      throw new Error(`Agent ${message.to} not found`);
    }

    // メッセージを履歴に記録
    this.messageHistory.set(message.id, message);

    // メッセージをキューに追加
    this.messageQueue.push(message);

    // Agentにメッセージを配信
    try {
      const response = await targetAgent.handleMessage(message);

      if (response) {
        this.messageHistory.set(response.id, response);
      }

      // 待機中のレスポンスハンドラーがあれば呼び出し
      const responseHandler = this.pendingResponses.get(message.id);
      if (responseHandler) {
        responseHandler(response);
        this.pendingResponses.delete(message.id);
      }

      return response;
    } catch (error: any) {
      console.error(`[A2AManager] メッセージ配信エラー:`, error);
      throw error;
    }
  }

  /**
   * 確認要求を送信
   */
  async requestConfirmation(
    from: string,
    to: string,
    question: string,
    taskId?: string
  ): Promise<boolean> {
    const message: A2AMessage = {
      id: generateId('a2a'),
      from,
      to,
      type: A2AMessageType.CONFIRMATION,
      taskId,
      payload: { question },
      timestamp: Date.now(),
      requiresResponse: true,
    };

    const response = await this.sendMessage(message);
    return response?.payload.confirmed === true;
  }

  /**
   * 通知を送信
   */
  async sendNotification(
    from: string,
    to: string,
    notification: string,
    taskId?: string
  ): Promise<void> {
    const message: A2AMessage = {
      id: generateId('a2a'),
      from,
      to,
      type: A2AMessageType.NOTIFICATION,
      taskId,
      payload: { notification },
      timestamp: Date.now(),
      requiresResponse: false,
    };

    await this.sendMessage(message);
  }

  /**
   * 状態更新を送信
   */
  async sendStatusUpdate(
    from: string,
    to: string,
    status: string,
    data?: any,
    taskId?: string
  ): Promise<void> {
    const message: A2AMessage = {
      id: generateId('a2a'),
      from,
      to,
      type: A2AMessageType.STATUS_UPDATE,
      taskId,
      payload: { status, data },
      timestamp: Date.now(),
      requiresResponse: false,
    };

    await this.sendMessage(message);
  }

  /**
   * メッセージ履歴を取得
   */
  getMessageHistory(agentId?: string): A2AMessage[] {
    if (agentId) {
      return Array.from(this.messageHistory.values()).filter(
        msg => msg.from === agentId || msg.to === agentId
      );
    }
    return Array.from(this.messageHistory.values());
  }

  /**
   * メッセージキューを取得
   */
  getMessageQueue(): A2AMessage[] {
    return [...this.messageQueue];
  }

  /**
   * 登録されているAgentのリストを取得
   */
  getRegisteredAgents(): string[] {
    return Array.from(this.agents.keys());
  }
}

/**
 * グローバルA2AManagerインスタンス
 */
let globalA2AManager: A2AManager | null = null;

/**
 * A2AManagerを取得（シングルトン）
 */
export function getA2AManager(): A2AManager {
  if (!globalA2AManager) {
    globalA2AManager = new A2AManager();
  }
  return globalA2AManager;
}

