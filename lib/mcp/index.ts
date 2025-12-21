/**
 * MCP統合のエントリーポイント
 */

export * from './types';
export * from './tools';
export * from './client';
export { registerStandardTools } from './tools/registry';
export { getMCPClient } from './client';

/**
 * MCP統合を初期化
 */
export async function initializeMCP(): Promise<void> {
  console.log('[MCP] MCP統合を初期化中...');
  
  // 標準Toolを登録
  const { registerStandardTools } = await import('./tools/registry');
  registerStandardTools();

  // 将来実装: MCPサーバー設定を読み込み、接続
  // const config = await loadMCPServerConfig();
  // if (config) {
  //   const { getMCPClient } = await import('./client');
  //   const client = getMCPClient();
  //   await client.connect(config);
  // }

  console.log('[MCP] MCP統合の初期化が完了しました');
}

