/**
 * MCPツールのクリーンアップユーティリティ
 * 削除された標準ツールをデータベースから削除
 */

import { loadAllMCPToolsWithMetadata, deleteMCPTool } from './toolStorage';
import { listAvailableToolsSync } from './tools';

/**
 * 削除された標準ツールをデータベースから削除
 */
export async function cleanupRemovedStandardTools(): Promise<void> {
  try {
    // メモリ内の標準ツールを取得
    const memoryTools = listAvailableToolsSync();
    const memoryToolNames = new Set(memoryTools.map(t => t.name));
    
    // データベースからすべての標準ツールを取得
    const dbTools = await loadAllMCPToolsWithMetadata();
    const standardToolsInDB = dbTools.filter(t => t.implementationType === 'standard');
    
    // メモリに存在しない標準ツールをデータベースから削除
    const removedTools: string[] = [];
    for (const dbTool of standardToolsInDB) {
      if (!memoryToolNames.has(dbTool.name)) {
        console.log(`[MCP Cleanup] 削除された標準ツールをデータベースから削除: ${dbTool.name}`);
        try {
          await deleteMCPTool(dbTool.name);
          removedTools.push(dbTool.name);
        } catch (error) {
          console.warn(`[MCP Cleanup] ツール削除エラー (${dbTool.name}):`, error);
        }
      }
    }
    
    if (removedTools.length > 0) {
      console.log(`[MCP Cleanup] ${removedTools.length}個の削除された標準ツールを削除しました:`, removedTools);
    } else {
      console.log('[MCP Cleanup] 削除する標準ツールはありませんでした');
    }
  } catch (error) {
    console.error('[MCP Cleanup] クリーンアップエラー:', error);
    throw error;
  }
}

