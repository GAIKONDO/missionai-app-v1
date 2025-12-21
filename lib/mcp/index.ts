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
  
  // 標準Toolを登録（メモリ内）
  const { registerStandardTools } = await import('./tools/registry');
  registerStandardTools();

  // 標準Toolのメタデータをデータベースに保存（初回のみ）
  // また、削除された標準ツールをデータベースから削除
  await saveStandardToolsToDatabase();

  // 将来実装: MCPサーバー設定を読み込み、接続
  // const config = await loadMCPServerConfig();
  // if (config) {
  //   const { getMCPClient } = await import('./client');
  //   const client = getMCPClient();
  //   await client.connect(config);
  // }

  console.log('[MCP] MCP統合の初期化が完了しました');
}

/**
 * 標準Toolのメタデータをデータベースに保存（初回のみ）
 * また、削除された標準ツールをデータベースから削除
 */
async function saveStandardToolsToDatabase(): Promise<void> {
  try {
    const { saveMCPTool, loadMCPTool, loadAllMCPToolsWithMetadata, deleteMCPTool } = await import('./toolStorage');
    const { listAvailableToolsSync } = await import('./tools');
    
    // 登録されている標準ツールを取得（メモリ内のみ、同期版を使用）
    const memoryTools = listAvailableToolsSync();
    const memoryToolNames = new Set(memoryTools.map(t => t.name));
    
    // データベースからすべての標準ツールを取得
    const dbTools = await loadAllMCPToolsWithMetadata();
    const standardToolsInDB = dbTools.filter(t => t.implementationType === 'standard');
    
    // メモリに存在しない標準ツールをデータベースから削除
    for (const dbTool of standardToolsInDB) {
      if (!memoryToolNames.has(dbTool.name)) {
        console.log(`[MCP] 削除された標準ツールをデータベースから削除: ${dbTool.name}`);
        try {
          await deleteMCPTool(dbTool.name);
        } catch (error) {
          console.warn(`[MCP] ツール削除エラー (${dbTool.name}):`, error);
        }
      }
    }
    
    // 各ツールのメタデータをデータベースに保存（存在しない場合のみ）
    for (const tool of memoryTools) {
      const existing = await loadMCPTool(tool.name);
      if (!existing) {
        // データベースに存在しない場合のみ保存
        await saveMCPTool({
          id: `tool-${tool.name}`,
          name: tool.name,
          description: tool.description,
          arguments: tool.arguments || [],
          returns: tool.returns,
          implementationType: 'standard',
          enabled: true,
        });
        console.log(`[MCP] 標準ツールのメタデータをデータベースに保存: ${tool.name}`);
      }
    }
  } catch (error) {
    console.warn('[MCP] 標準ツールのメタデータ保存に失敗（続行します）:', error);
  }
}

