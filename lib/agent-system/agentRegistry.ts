/**
 * Agentレジストリ
 * Agentの登録・管理を行う
 */

import type { Agent, AgentRole } from './types';
import { BaseAgent } from './agent';
import { saveAgent, loadAgent, loadAllAgents } from './agentStorage';

/**
 * Agentレジストリ
 */
class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  private agentDefinitions: Map<string, Agent> = new Map();

  /**
   * Agentを登録
   * @param agentInstance Agentインスタンス
   * @param saveToDatabase データベースに保存するか（デフォルト: true）
   */
  async register(agentInstance: BaseAgent, saveToDatabase: boolean = true): Promise<void> {
    const agent = agentInstance.getAgent();
    this.agents.set(agent.id, agentInstance);
    this.agentDefinitions.set(agent.id, agent);
    console.log(`[AgentRegistry] Agent登録: ${agent.id} (${agent.name})`);
    
    // データベースに保存
    if (saveToDatabase) {
      try {
        await saveAgent(agent);
      } catch (error) {
        console.error(`[AgentRegistry] Agent定義のデータベース保存に失敗 (${agent.id}):`, error);
      }
    }
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
   * Agent定義を更新
   * @param agentId Agent ID
   * @param updates 更新内容
   * @param saveToDatabase データベースに保存するか（デフォルト: true）
   */
  async updateAgentDefinition(agentId: string, updates: Partial<Agent>, saveToDatabase: boolean = true): Promise<boolean> {
    const agentInstance = this.agents.get(agentId);
    if (!agentInstance) {
      console.warn(`[AgentRegistry] Agentが見つかりません: ${agentId}`);
      return false;
    }

    // Agentインスタンスの定義を更新
    agentInstance.updateAgent(updates);

    // レジストリの定義も更新
    const currentDefinition = this.agentDefinitions.get(agentId);
    if (currentDefinition) {
      const updatedDefinition: Agent = {
        ...currentDefinition,
        ...updates,
        updatedAt: Date.now(),
      };
      this.agentDefinitions.set(agentId, updatedDefinition);
      console.log(`[AgentRegistry] Agent定義を更新: ${agentId}`);
      
      // データベースに保存
      if (saveToDatabase) {
        try {
          await saveAgent(updatedDefinition);
        } catch (error) {
          console.error(`[AgentRegistry] Agent定義のデータベース保存に失敗 (${agentId}):`, error);
        }
      }
      
      return true;
    }

    return false;
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

  /**
   * データベースからAgent定義を読み込んで登録
   * @param agentId Agent ID
   */
  async loadFromDatabase(agentId: string): Promise<boolean> {
    try {
      const agent = await loadAgent(agentId);
      if (!agent) {
        return false;
      }

      // Agentインスタンスを再作成する必要がある
      // これは各Agentクラスのコンストラクタに依存するため、
      // 呼び出し側で適切なAgentインスタンスを作成してからregisterを呼ぶ必要がある
      // ここでは定義のみを更新
      this.agentDefinitions.set(agentId, agent);
      console.log(`[AgentRegistry] Agent定義をデータベースから読み込み: ${agentId}`);
      return true;
    } catch (error) {
      console.error(`[AgentRegistry] Agent定義のデータベース読み込みに失敗 (${agentId}):`, error);
      return false;
    }
  }

  /**
   * すべてのAgent定義をデータベースから読み込む
   * 注意: Agentインスタンスは作成されないため、呼び出し側で適切にインスタンス化する必要がある
   */
  async loadAllFromDatabase(): Promise<Agent[]> {
    try {
      const agents = await loadAllAgents();
      for (const agent of agents) {
        this.agentDefinitions.set(agent.id, agent);
      }
      console.log(`[AgentRegistry] ${agents.length}個のAgent定義をデータベースから読み込み`);
      return agents;
    } catch (error) {
      console.error(`[AgentRegistry] Agent定義の一括読み込みに失敗:`, error);
      return [];
    }
  }
}

/**
 * グローバルAgentレジストリインスタンス
 */
export const agentRegistry = new AgentRegistry();

