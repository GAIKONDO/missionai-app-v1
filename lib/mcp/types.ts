/**
 * MCP (Model Context Protocol) 関連の型定義
 */

/**
 * MCP Toolの引数
 */
export interface MCPToolArgument {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
}

/**
 * MCP Toolの定義
 */
export interface MCPTool {
  name: string;
  description: string;
  arguments: MCPToolArgument[];
  returns?: {
    type: 'string' | 'object' | 'array';
    description: string;
  };
}

/**
 * MCP Toolの実行結果
 */
export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime?: number;
    tokensUsed?: number;
    source?: string;
  };
}

/**
 * MCPサーバー設定
 */
export interface MCPServerConfig {
  name: string;
  url: string;
  apiKey?: string;
  capabilities: string[];
  tools: MCPTool[];
  enabled: boolean;
}

/**
 * MCP Tool呼び出しリクエスト
 */
export interface MCPToolRequest {
  tool: string;
  arguments: Record<string, any>;
  context?: {
    query?: string;
    organizationId?: string;
    userId?: string;
    [key: string]: any;
  };
}

/**
 * MCP Tool呼び出しレスポンス
 */
export interface MCPToolResponse {
  result: MCPToolResult;
  tool: string;
  requestId?: string;
}

