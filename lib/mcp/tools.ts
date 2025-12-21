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
  arguments?: MCPToolArgument[]; // 引数情報（オプション）
  returns?: {
    type: 'string' | 'object' | 'array';
    description: string;
  };
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
      arguments: tool.arguments || [],
      returns: tool.returns,
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
 * メモリ内のツールとデータベースのツールをマージ
 */
export async function listAvailableTools(): Promise<MCPTool[]> {
  // メモリ内のツール（実行可能なツール）
  const memoryTools = toolRegistry.list();
  
  // データベースからツールのメタデータを取得（将来的にカスタムツールを追加する場合）
  try {
    const { loadEnabledMCPTools } = await import('../mcp/toolStorage');
    const dbTools = await loadEnabledMCPTools();
    
    // メモリ内のツールを優先し、データベースのツールで補完
    const toolMap = new Map<string, MCPTool>();
    
    // まずメモリ内のツールを追加
    for (const tool of memoryTools) {
      toolMap.set(tool.name, tool);
    }
    
    // データベースのツールで、メモリ内にないものを追加（カスタムツールなど）
    for (const tool of dbTools) {
      if (!toolMap.has(tool.name)) {
        toolMap.set(tool.name, tool);
      }
    }
    
    return Array.from(toolMap.values());
  } catch (error) {
    console.warn('[MCPTools] データベースからのツール読み込みに失敗、メモリ内のツールのみを使用:', error);
    return memoryTools;
  }
}

/**
 * 利用可能なToolの一覧を取得（同期版、後方互換性のため）
 * @deprecated 非同期版のlistAvailableTools()を使用してください
 */
export function listAvailableToolsSync(): MCPTool[] {
  return toolRegistry.list();
}

