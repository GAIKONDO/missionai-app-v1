/**
 * Agentレジストリ
 * Agentの登録・管理を行う
 */

import type { Agent, AgentRole } from './types';
import { BaseAgent } from './agent';

/**
 * Agentレジストリ
 */
class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  private agentDefinitions: Map<string, Agent> = new Map();

  /**
   * Agentを登録
   */
  register(agentInstance: BaseAgent): void {
    const agent = agentInstance.getAgent();
    this.agents.set(agent.id, agentInstance);
    this.agentDefinitions.set(agent.id, agent);
    console.log(`[AgentRegistry] Agent登録: ${agent.id} (${agent.name})`);
  }

  /**
   * Agentの登録を解除
   */
  unregister(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.destroy();
      this.agents.delete(agentId);
      this.agentDefinitions.delete(agentId);
      console.log(`[AgentRegistry] Agent登録解除: ${agentId}`);
    }
  }

  /**
   * Agentを取得
   */
  get(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Agent定義を取得
   */
  getDefinition(agentId: string): Agent | undefined {
    return this.agentDefinitions.get(agentId);
  }

  /**
   * すべてのAgentを取得
   */
  getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * すべてのAgent定義を取得
   */
  getAllDefinitions(): Agent[] {
    return Array.from(this.agentDefinitions.values());
  }

  /**
   * 特定の役割のAgentを取得
   */
  getByRole(role: AgentRole): BaseAgent[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.getAgent().role === role
    );
  }

  /**
   * 特定のタスクタイプを実行可能なAgentを取得
   */
  getByCapability(taskType: string): BaseAgent[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.getAgent().capabilities.includes(taskType)
    );
  }

  /**
   * 登録されているAgentのIDリストを取得
   */
  getAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Agentが登録されているかチェック
   */
  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * すべてのAgentをクリア
   */
  clear(): void {
    for (const agent of this.agents.values()) {
      agent.destroy();
    }
    this.agents.clear();
    this.agentDefinitions.clear();
  }
}

/**
 * グローバルAgentレジストリインスタンス
 */
export const agentRegistry = new AgentRegistry();

