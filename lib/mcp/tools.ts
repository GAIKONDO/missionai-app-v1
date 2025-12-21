/**
 * MCP Toolの定義と登録
 */

import type { MCPTool, MCPToolResult, MCPToolRequest } from './types';

/**
 * Tool実装のインターフェース
 */
export interface MCPToolImplementation {
  name: string;
  description: string;
  execute(request: MCPToolRequest): Promise<MCPToolResult>;
}

/**
 * Toolレジストリ
 */
class MCPToolRegistry {
  private tools: Map<string, MCPToolImplementation> = new Map();

  /**
   * Toolを登録
   */
  register(tool: MCPToolImplementation): void {
    this.tools.set(tool.name, tool);
    console.log(`[MCPToolRegistry] Tool登録: ${tool.name}`);
  }

  /**
   * Toolを取得
   */
  get(name: string): MCPToolImplementation | undefined {
    return this.tools.get(name);
  }

  /**
   * 登録されているToolの一覧を取得
   */
  list(): MCPTool[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      arguments: [], // 実装時に詳細を追加
    }));
  }

  /**
   * Toolを実行
   */
  async execute(request: MCPToolRequest): Promise<MCPToolResult> {
    const tool = this.get(request.tool);
    if (!tool) {
      return {
        success: false,
        error: `Tool "${request.tool}" が見つかりません`,
      };
    }

    try {
      const startTime = Date.now();
      const result = await tool.execute(request);
      const executionTime = Date.now() - startTime;

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime,
        },
      };
    } catch (error: any) {
      console.error(`[MCPToolRegistry] Tool実行エラー (${request.tool}):`, error);
      return {
        success: false,
        error: error.message || 'Tool実行中にエラーが発生しました',
        metadata: {
          source: request.tool,
        },
      };
    }
  }
}

/**
 * グローバルToolレジストリ
 */
export const toolRegistry = new MCPToolRegistry();

/**
 * Toolを登録するヘルパー関数
 */
export function registerTool(tool: MCPToolImplementation): void {
  toolRegistry.register(tool);
}

/**
 * Toolを実行するヘルパー関数
 */
export async function executeTool(request: MCPToolRequest): Promise<MCPToolResult> {
  return await toolRegistry.execute(request);
}

/**
 * 利用可能なToolの一覧を取得
 */
export function listAvailableTools(): MCPTool[] {
  return toolRegistry.list();
}

