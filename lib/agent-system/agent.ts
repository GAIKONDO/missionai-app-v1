/**
 * Agent基底クラス
 * すべてのAgentはこのクラスを継承
 */

import type { Task, TaskExecution, TaskExecutionContext, Agent, AgentRole, AgentConfig, A2AMessage } from './types';
import type { ModelType } from '@/components/AIAssistantPanel/types';
import { ExecutionStatus } from './types';
import { getA2AManager } from './a2aManager';

/**
 * Agent基底クラス
 */
export abstract class BaseAgent {
  protected agent: Agent;
  protected a2aManager = getA2AManager();

  constructor(agent: Agent) {
    this.agent = agent;
    // A2AManagerに登録
    this.a2aManager.registerAgent(agent.id, this);
  }

  /**
   * Agent IDを取得
   */
  getId(): string {
    return this.agent.id;
  }

  /**
   * Agent情報を取得
   */
  getAgent(): Agent {
    return { ...this.agent };
  }

  /**
   * Agent定義を更新
   */
  updateAgent(updates: Partial<Agent>): void {
    this.agent = {
      ...this.agent,
      ...updates,
      updatedAt: Date.now(),
    };
  }

  /**
   * タスクを実行（抽象メソッド）
   */
  abstract executeTask(
    task: Task,
    context: TaskExecutionContext
  ): Promise<any>;

  /**
   * メッセージを処理（抽象メソッド）
   */
  abstract handleMessage(message: A2AMessage): Promise<A2AMessage | null>;

  /**
   * タスクが実行可能かチェック
   */
  canExecuteTask(task: Task): boolean {
    // タスクタイプがAgentの能力に含まれているか
    if (!this.agent.capabilities.includes(task.type)) {
      return false;
    }

    // 指定されたAgent IDと一致するか（指定されている場合）
    if (task.agentId && task.agentId !== this.agent.id) {
      return false;
    }

    return true;
  }

  /**
   * 実行ログを追加
   */
  protected addLog(
    execution: TaskExecution,
    level: 'info' | 'warn' | 'error',
    message: string,
    data?: any
  ): void {
    execution.logs.push({
      timestamp: Date.now(),
      level,
      message,
      data,
    });
  }

  /**
   * 他のAgentに確認を求める
   */
  protected async requestConfirmation(
    agentId: string,
    question: string,
    taskId?: string
  ): Promise<boolean> {
    return await this.a2aManager.requestConfirmation(
      this.agent.id,
      agentId,
      question,
      taskId
    );
  }

  /**
   * 他のAgentに通知を送る
   */
  protected async sendNotification(
    agentId: string,
    notification: string,
    taskId?: string
  ): Promise<void> {
    await this.a2aManager.sendNotification(
      this.agent.id,
      agentId,
      notification,
      taskId
    );
  }

  /**
   * 他のAgentに状態更新を送る
   */
  protected async sendStatusUpdate(
    agentId: string,
    status: string,
    data?: any,
    taskId?: string
  ): Promise<void> {
    await this.a2aManager.sendStatusUpdate(
      this.agent.id,
      agentId,
      status,
      data,
      taskId
    );
  }

  /**
   * Agentを破棄
   */
  destroy(): void {
    this.a2aManager.unregisterAgent(this.agent.id);
  }
}

