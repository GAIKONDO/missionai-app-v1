/**
 * Agent定義のストレージ管理（SQLite版）
 * Agent定義をSQLiteデータベースに保存・読み込み
 */

import type { Agent } from './types';
import { invoke } from '@tauri-apps/api/core';

/**
 * Agent定義をデータベースに保存
 */
export async function saveAgent(agent: Agent): Promise<void> {
  try {
    // Agent定義をRust側の形式に変換
    const agentData = {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      role: agent.role,
      capabilities: JSON.stringify(agent.capabilities),
      tools: JSON.stringify(agent.tools),
      modelType: agent.modelType,
      selectedModel: agent.selectedModel || null,
      systemPrompt: agent.systemPrompt,
      config: JSON.stringify(agent.config),
      createdAt: typeof agent.createdAt === 'number' 
        ? Math.floor(agent.createdAt / 1000).toString() 
        : agent.createdAt.toString(),
      updatedAt: typeof agent.updatedAt === 'number' 
        ? Math.floor(agent.updatedAt / 1000).toString() 
        : agent.updatedAt.toString(),
    };

    await invoke('save_agent_command', { agent: agentData });
    console.log(`✅ [agentStorage] Agent定義を保存: ${agent.id}`);
  } catch (error: any) {
    console.error(`❌ [agentStorage] Agent定義の保存に失敗 (${agent.id}):`, error);
    throw error;
  }
}

/**
 * Agent定義をデータベースから読み込み
 */
export async function loadAgent(agentId: string): Promise<Agent | null> {
  try {
    const agentData: any = await invoke('get_agent_command', { agentId });
    
    if (!agentData) {
      console.log(`ℹ️ [agentStorage] Agent定義が存在しません: ${agentId}`);
      return null;
    }

    // Rust側の形式からAgent型に変換
    const agent: Agent = {
      id: agentData.id,
      name: agentData.name,
      description: agentData.description,
      role: agentData.role as any,
      capabilities: agentData.capabilities ? JSON.parse(agentData.capabilities) : [],
      tools: agentData.tools ? JSON.parse(agentData.tools) : [],
      modelType: agentData.modelType as any,
      selectedModel: agentData.selectedModel || undefined,
      systemPrompt: agentData.systemPrompt,
      config: agentData.config ? JSON.parse(agentData.config) : {},
      createdAt: typeof agentData.createdAt === 'string' 
        ? parseInt(agentData.createdAt, 10) * 1000 
        : agentData.createdAt,
      updatedAt: typeof agentData.updatedAt === 'string' 
        ? parseInt(agentData.updatedAt, 10) * 1000 
        : agentData.updatedAt,
    };

    console.log(`✅ [agentStorage] Agent定義を読み込み: ${agentId}`);
    return agent;
  } catch (error: any) {
    console.error(`❌ [agentStorage] Agent定義の読み込みに失敗 (${agentId}):`, error);
    return null;
  }
}

/**
 * すべてのAgent定義をデータベースから読み込み
 */
export async function loadAllAgents(): Promise<Agent[]> {
  try {
    const agentsData: any[] = await invoke('get_all_agents_command');
    
    const agents: Agent[] = agentsData.map(agentData => {
      // Rust側の形式からAgent型に変換
      return {
        id: agentData.id,
        name: agentData.name,
        description: agentData.description,
        role: agentData.role as any,
        capabilities: agentData.capabilities ? JSON.parse(agentData.capabilities) : [],
        tools: agentData.tools ? JSON.parse(agentData.tools) : [],
        modelType: agentData.modelType as any,
        selectedModel: agentData.selectedModel || undefined,
        systemPrompt: agentData.systemPrompt,
        config: agentData.config ? JSON.parse(agentData.config) : {},
        createdAt: typeof agentData.createdAt === 'string' 
          ? parseInt(agentData.createdAt, 10) * 1000 
          : agentData.createdAt,
        updatedAt: typeof agentData.updatedAt === 'string' 
          ? parseInt(agentData.updatedAt, 10) * 1000 
          : agentData.updatedAt,
      };
    });

    console.log(`✅ [agentStorage] ${agents.length}個のAgent定義を読み込み`);
    return agents;
  } catch (error: any) {
    console.error('❌ [agentStorage] Agent定義の一括読み込みに失敗:', error);
    return [];
  }
}

/**
 * Agent定義をデータベースから削除
 */
export async function deleteAgent(agentId: string): Promise<void> {
  try {
    await invoke('delete_agent_command', { agentId });
    console.log(`✅ [agentStorage] Agent定義を削除: ${agentId}`);
  } catch (error: any) {
    console.error(`❌ [agentStorage] Agent定義の削除に失敗 (${agentId}):`, error);
    throw error;
  }
}
