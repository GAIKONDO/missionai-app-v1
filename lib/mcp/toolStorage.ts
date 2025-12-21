/**
 * MCPツールのストレージ管理（SQLite版）
 * MCPツールのメタデータをSQLiteデータベースに保存・読み込み
 */

import type { MCPTool, MCPToolArgument } from './types';
import { invoke } from '@tauri-apps/api/core';

/**
 * データベースから取得したMCPツールの型
 */
interface MCPToolFromDB {
  id: string;
  name: string;
  description: string;
  arguments: string; // JSON文字列
  returns?: string | null; // JSON文字列
  implementationType: string;
  enabled: number; // 0 or 1
  createdAt: string;
  updatedAt: string;
}

/**
 * MCPツールのメタデータをデータベースに保存
 */
export async function saveMCPTool(tool: {
  id: string;
  name: string;
  description: string;
  arguments: MCPToolArgument[];
  returns?: {
    type: 'string' | 'object' | 'array';
    description: string;
  };
  implementationType: 'standard' | 'custom';
  enabled?: boolean;
}): Promise<void> {
  try {
    const toolData = {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      arguments: JSON.stringify(tool.arguments),
      returns: tool.returns ? JSON.stringify(tool.returns) : null,
      implementationType: tool.implementationType,
      enabled: tool.enabled !== false ? 1 : 0,
      createdAt: Math.floor(Date.now() / 1000).toString(),
      updatedAt: Math.floor(Date.now() / 1000).toString(),
    };

    await invoke('save_mcp_tool_command', { tool: toolData });
    console.log(`✅ [toolStorage] MCPツールのメタデータを保存: ${tool.name}`);
  } catch (error: any) {
    console.error(`❌ [toolStorage] MCPツールのメタデータ保存に失敗 (${tool.name}):`, error);
    throw error;
  }
}

/**
 * MCPツールのメタデータをデータベースから読み込み
 */
export async function loadMCPTool(name: string): Promise<MCPTool | null> {
  try {
    const toolData = await invoke<MCPToolFromDB | null>('get_mcp_tool_command', { name });
    if (!toolData) {
      return null;
    }

    return {
      name: toolData.name,
      description: toolData.description,
      arguments: JSON.parse(toolData.arguments) as MCPToolArgument[],
      returns: toolData.returns ? (JSON.parse(toolData.returns) as MCPTool['returns']) : undefined,
    };
  } catch (error: any) {
    console.error(`❌ [toolStorage] MCPツールのメタデータ読み込みに失敗 (${name}):`, error);
    return null;
  }
}

/**
 * すべてのMCPツールのメタデータをデータベースから読み込み
 */
export async function loadAllMCPTools(): Promise<MCPTool[]> {
  try {
    const toolsData = await invoke<MCPToolFromDB[]>('get_all_mcp_tools_command');
    return toolsData.map(tool => ({
      name: tool.name,
      description: tool.description,
      arguments: JSON.parse(tool.arguments) as MCPToolArgument[],
      returns: tool.returns ? (JSON.parse(tool.returns) as MCPTool['returns']) : undefined,
    }));
  } catch (error: any) {
    console.error('❌ [toolStorage] MCPツール一覧の読み込みに失敗:', error);
    return [];
  }
}

/**
 * 有効なMCPツールのメタデータのみをデータベースから読み込み
 */
export async function loadEnabledMCPTools(): Promise<MCPTool[]> {
  try {
    const toolsData = await invoke<MCPToolFromDB[]>('get_enabled_mcp_tools_command');
    return toolsData.map(tool => ({
      name: tool.name,
      description: tool.description,
      arguments: JSON.parse(tool.arguments) as MCPToolArgument[],
      returns: tool.returns ? (JSON.parse(tool.returns) as MCPTool['returns']) : undefined,
    }));
  } catch (error: any) {
    console.error('❌ [toolStorage] 有効なMCPツール一覧の読み込みに失敗:', error);
    return [];
  }
}

/**
 * MCPツールのメタデータをデータベースから削除
 */
export async function deleteMCPTool(name: string): Promise<void> {
  try {
    await invoke('delete_mcp_tool_command', { name });
    console.log(`✅ [toolStorage] MCPツールのメタデータを削除: ${name}`);
  } catch (error: any) {
    console.error(`❌ [toolStorage] MCPツールのメタデータ削除に失敗 (${name}):`, error);
    throw error;
  }
}

/**
 * MCPツールの有効/無効を切り替え
 */
export async function updateMCPToolEnabled(name: string, enabled: boolean): Promise<void> {
  try {
    await invoke('update_mcp_tool_enabled_command', { name, enabled });
    console.log(`✅ [toolStorage] MCPツールの有効/無効を更新: ${name} = ${enabled}`);
  } catch (error: any) {
    console.error(`❌ [toolStorage] MCPツールの有効/無効更新に失敗 (${name}):`, error);
    throw error;
  }
}

/**
 * データベースから取得したMCPツールの完全な情報（有効/無効状態を含む）
 */
export interface MCPToolWithMetadata extends MCPTool {
  id?: string;
  implementationType?: 'standard' | 'custom';
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * すべてのMCPツールのメタデータをデータベースから読み込み（有効/無効状態を含む）
 */
export async function loadAllMCPToolsWithMetadata(): Promise<MCPToolWithMetadata[]> {
  try {
    const toolsData = await invoke<MCPToolFromDB[]>('get_all_mcp_tools_command');
    return toolsData.map(tool => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      arguments: JSON.parse(tool.arguments) as MCPToolArgument[],
      returns: tool.returns ? (JSON.parse(tool.returns) as MCPTool['returns']) : undefined,
      implementationType: tool.implementationType as 'standard' | 'custom',
      enabled: tool.enabled === 1,
      createdAt: tool.createdAt,
      updatedAt: tool.updatedAt,
    }));
  } catch (error: any) {
    console.error('❌ [toolStorage] MCPツール一覧の読み込みに失敗:', error);
    return [];
  }
}

