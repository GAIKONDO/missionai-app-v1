/**
 * Tool呼び出しパーサー
 * AIのレスポンスからTool呼び出し要求を抽出し、実行する
 */

import type { MCPToolRequest, MCPToolResult } from './types';
import { executeTool } from './tools';

/**
 * Tool呼び出しの抽出結果
 */
export interface ParsedToolCall {
  tool: string;
  arguments: Record<string, any>;
  rawCall: string;
}

/**
 * AIのレスポンスからTool呼び出しを抽出
 */
export function parseToolCalls(responseText: string): ParsedToolCall[] {
  const toolCalls: ParsedToolCall[] = [];
  
  // <tool_call name="tool_name">...</tool_call> のパターンを検索
  const toolCallRegex = /<tool_call\s+name=["']([^"']+)["']\s*>([\s\S]*?)<\/tool_call>/gi;
  
  let match;
  while ((match = toolCallRegex.exec(responseText)) !== null) {
    const toolName = match[1];
    const argumentsText = match[2].trim();
    
    try {
      // JSON形式の引数をパース
      const args = argumentsText ? JSON.parse(argumentsText) : {};
      
      toolCalls.push({
        tool: toolName,
        arguments: args,
        rawCall: match[0],
      });
    } catch (error) {
      console.warn(`[parseToolCalls] Tool呼び出しの引数パースエラー (${toolName}):`, error);
      // パースに失敗した場合でも、空の引数で追加
      toolCalls.push({
        tool: toolName,
        arguments: {},
        rawCall: match[0],
      });
    }
  }
  
  return toolCalls;
}

/**
 * Tool呼び出しを実行し、結果を取得
 */
export async function executeToolCalls(
  toolCalls: ParsedToolCall[],
  context?: {
    query?: string;
    organizationId?: string;
    userId?: string;
    modelType?: string;
    selectedModel?: string;
    [key: string]: any;
  }
): Promise<Array<{ toolCall: ParsedToolCall; result: MCPToolResult }>> {
  const results: Array<{ toolCall: ParsedToolCall; result: MCPToolResult }> = [];
  
  for (const toolCall of toolCalls) {
    try {
      const request: MCPToolRequest = {
        tool: toolCall.tool,
        arguments: {
          ...toolCall.arguments,
          // コンテキストから追加情報をマージ（特にqueryは重要）
          ...(context?.query && { query: context.query }),
          ...(context?.organizationId && { organizationId: context.organizationId }),
          ...(context?.modelType && { modelType: context.modelType }),
          ...(context?.selectedModel && { selectedModel: context.selectedModel }),
        },
        context: {
          query: context?.query,
          organizationId: context?.organizationId,
          userId: context?.userId,
        },
      };
      
      // デバッグ: Tool呼び出しの詳細をログ出力
      console.log(`[executeToolCalls] Tool呼び出し:`, {
        tool: toolCall.tool,
        arguments: request.arguments,
        hasQuery: !!request.arguments.query,
      });
      
      const result = await executeTool(request);
      results.push({ toolCall, result });
    } catch (error: any) {
      console.error(`[executeToolCalls] Tool実行エラー (${toolCall.tool}):`, error);
      results.push({
        toolCall,
        result: {
          success: false,
          error: error.message || 'Tool実行中にエラーが発生しました',
        },
      });
    }
  }
  
  return results;
}

/**
 * Tool呼び出し結果をAIが理解しやすい形式にフォーマット
 */
export function formatToolCallResults(
  results: Array<{ toolCall: ParsedToolCall; result: MCPToolResult }>
): string {
  if (results.length === 0) {
    return '';
  }
  
  const formattedResults = results.map(({ toolCall, result }) => {
    if (result.success && result.data) {
      const data = result.data;
      
      // search_knowledge_graph Toolの場合、特別なフォーマット
      if (toolCall.tool === 'search_knowledge_graph') {
        const context = data.context || '';
        const sources = data.sources || [];
        const searchResults = data.results || [];
        
        let formatted = `## ナレッジグラフ検索結果\n\n`;
        
        if (searchResults.length === 0) {
          formatted += `検索結果が見つかりませんでした。\n`;
        } else {
          // トピック結果を優先的に表示
          const topicResults = searchResults.filter((r: any) => r.type === 'topic');
          const entityResults = searchResults.filter((r: any) => r.type === 'entity');
          const relationResults = searchResults.filter((r: any) => r.type === 'relation');
          
          if (topicResults.length > 0) {
            formatted += `### 関連トピック (${topicResults.length}件)\n\n`;
            for (const topic of topicResults.slice(0, 5)) {
              formatted += `**${topic.topic?.title || topic.topicId}** (関連度: ${(topic.score * 100).toFixed(1)}%)\n`;
              
              // 詳細内容（全文）を優先的に表示
              const fullContent = (topic.topic as any)?.fullContent;
              if (fullContent) {
                formatted += `\n**詳細内容:**\n${fullContent}\n\n`;
              } else if (topic.topic?.contentSummary) {
                formatted += `内容: ${topic.topic.contentSummary}\n`;
              }
              
              if (topic.topic?.keywords && topic.topic.keywords.length > 0) {
                formatted += `キーワード: ${topic.topic.keywords.join(', ')}\n`;
              }
              if (topic.topic?.semanticCategory) {
                formatted += `カテゴリ: ${topic.topic.semanticCategory}\n`;
              }
              formatted += `\n`;
            }
          }
          
          if (entityResults.length > 0) {
            formatted += `### 関連エンティティ (${entityResults.length}件)\n\n`;
            for (const entity of entityResults.slice(0, 3)) {
              formatted += `**${entity.entity?.name || entity.id}** (${entity.entity?.type || '不明'}) (関連度: ${(entity.score * 100).toFixed(1)}%)\n`;
            }
            formatted += `\n`;
          }
          
          if (relationResults.length > 0) {
            formatted += `### 関連リレーション (${relationResults.length}件)\n\n`;
            for (const relation of relationResults.slice(0, 3)) {
              formatted += `**${relation.relation?.type || relation.id}** (関連度: ${(relation.score * 100).toFixed(1)}%)\n`;
            }
            formatted += `\n`;
          }
          
          // コンテキスト全体も含める（詳細情報）
          if (context && context.trim() !== '') {
            formatted += `### 詳細情報\n\n${context}\n`;
          }
        }
        
        return formatted;
      }
      
      // その他のToolの場合
      const dataStr = typeof data === 'string'
        ? data
        : JSON.stringify(data, null, 2);
      return `Tool "${toolCall.tool}" の実行結果:\n${dataStr}`;
    } else {
      return `Tool "${toolCall.tool}" の実行エラー: ${result.error || '不明なエラー'}`;
    }
  });
  
  return `\n\n${formattedResults.join('\n\n')}\n`;
}

