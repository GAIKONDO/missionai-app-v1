/**
 * MCPクライアント
 * MCPサーバーとの通信を管理
 */

import type { MCPServerConfig, MCPToolRequest, MCPToolResponse, MCPToolResult } from './types';
import { executeTool } from './tools';

/**
 * MCPクライアント
 */
export class MCPClient {
  private config: MCPServerConfig | null = null;
  private connected: boolean = false;

  /**
   * MCPサーバーに接続
   */
  async connect(config: MCPServerConfig): Promise<boolean> {
    try {
      this.config = config;
      
      // 接続確認（将来実装: 実際のMCPサーバーへの接続）
      if (!config.enabled) {
        console.log(`[MCPClient] サーバー "${config.name}" は無効化されています`);
        return false;
      }

      // 接続テスト（将来実装）
      // const response = await fetch(`${config.url}/health`, {
      //   headers: config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {},
      // });
      // if (!response.ok) {
      //   throw new Error(`MCPサーバー接続エラー: ${response.status}`);
      // }

      this.connected = true;
      console.log(`[MCPClient] MCPサーバー "${config.name}" に接続しました`);
      return true;
    } catch (error: any) {
      console.error(`[MCPClient] 接続エラー:`, error);
      this.connected = false;
      return false;
    }
  }

  /**
   * MCPサーバーから切断
   */
  disconnect(): void {
    this.connected = false;
    this.config = null;
    console.log('[MCPClient] MCPサーバーから切断しました');
  }

  /**
   * Toolを呼び出し
   */
  async callTool(request: MCPToolRequest): Promise<MCPToolResult> {
    if (!this.connected || !this.config) {
      return {
        success: false,
        error: 'MCPサーバーに接続されていません',
      };
    }

    // サーバー側のToolが利用可能か確認
    const toolAvailable = this.config.tools.some(tool => tool.name === request.tool);
    if (!toolAvailable) {
      // ローカルのToolレジストリから実行を試みる
      console.log(`[MCPClient] サーバー側にTool "${request.tool}" が見つかりません。ローカルToolを試行します`);
      return await executeTool(request);
    }

    // 将来実装: MCPサーバー経由でToolを実行
    // try {
    //   const response = await fetch(`${this.config.url}/tools/execute`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
    //     },
    //     body: JSON.stringify(request),
    //   });
    //
    //   if (!response.ok) {
    //     throw new Error(`Tool実行エラー: ${response.status}`);
    //   }
    //
    //   const data: MCPToolResponse = await response.json();
    //   return data.result;
    // } catch (error: any) {
    //   console.error(`[MCPClient] Tool実行エラー:`, error);
    //   // フォールバック: ローカルToolを試行
    //   return await executeTool(request);
    // }

    // 現在はローカルToolを実行
    return await executeTool(request);
  }

  /**
   * 利用可能なToolの一覧を取得
   */
  async listTools(): Promise<string[]> {
    if (!this.connected || !this.config) {
      return [];
    }

    // 将来実装: MCPサーバーからTool一覧を取得
    // try {
    //   const response = await fetch(`${this.config.url}/tools`, {
    //     headers: this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {},
    //   });
    //   if (response.ok) {
    //     const data = await response.json();
    //     return data.tools.map((t: any) => t.name);
    //   }
    // } catch (error) {
    //   console.error('[MCPClient] Tool一覧取得エラー:', error);
    // }

    // 現在は設定からTool一覧を返す
    return this.config.tools.map(tool => tool.name);
  }

  /**
   * 接続状態を取得
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 設定を取得
   */
  getConfig(): MCPServerConfig | null {
    return this.config;
  }
}

/**
 * グローバルMCPクライアントインスタンス
 */
let globalMCPClient: MCPClient | null = null;

/**
 * MCPクライアントを取得（シングルトン）
 */
export function getMCPClient(): MCPClient {
  if (!globalMCPClient) {
    globalMCPClient = new MCPClient();
  }
  return globalMCPClient;
}

