/**
 * 標準Toolの登録
 */

import { registerTool } from '../tools';
import type { MCPToolImplementation, MCPToolRequest, MCPToolResult } from '../tools';

/**
 * 特性要因図更新Tool
 */
class UpdateCauseEffectDiagramTool implements MCPToolImplementation {
  name = 'update_cause_effect_diagram';
  description = '特性要因図を議事録またはテキストの内容で更新します';
  arguments = [
    { name: 'causeEffectDiagramId', type: 'string' as const, description: '特性要因図ID', required: true },
    { name: 'meetingNoteId', type: 'string' as const, description: '議事録ID（textContentと排他的）', required: false },
    { name: 'textContent', type: 'string' as const, description: 'テキストコンテンツ（meetingNoteIdと排他的）', required: false },
    { name: 'modelType', type: 'string' as const, description: 'モデルタイプ（gpt/local/cursor）', required: false, default: 'gpt' },
    { name: 'selectedModel', type: 'string' as const, description: '選択されたモデル名', required: false, default: 'gpt-4.1-mini' },
  ];
  returns = {
    type: 'object' as const,
    description: '更新結果（summary, addedElementsを含む）',
  };

  async execute(request: MCPToolRequest): Promise<MCPToolResult> {
    const { causeEffectDiagramId, meetingNoteId, textContent, modelType, selectedModel } = request.arguments;
    
    if (!causeEffectDiagramId) {
      return {
        success: false,
        error: '特性要因図IDが必要です',
      };
    }

    if (!meetingNoteId && !textContent) {
      return {
        success: false,
        error: '議事録IDまたはテキストコンテンツが必要です',
      };
    }

    try {
      const { updateCauseEffectDiagramWithMeetingNote, updateCauseEffectDiagramWithText } = await import('@/lib/causeEffectDiagramUpdate');
      const { getFocusInitiativeByCauseEffectDiagramId, saveFocusInitiative } = await import('@/lib/orgApi');
      
      // モデルタイプとモデル名を取得（デフォルト値を使用）
      const finalModelType = (modelType || 'gpt') as 'gpt' | 'local' | 'cursor';
      const finalSelectedModel = selectedModel || 'gpt-4.1-mini';

      let updateResult;
      
      if (meetingNoteId) {
        // 議事録IDから更新
        updateResult = await updateCauseEffectDiagramWithMeetingNote(
          causeEffectDiagramId,
          meetingNoteId,
          finalModelType,
          finalSelectedModel
        );
      } else if (textContent) {
        // 直接テキストから更新
        // 注力施策を取得（オプション）
        let initiative = null;
        try {
          initiative = await getFocusInitiativeByCauseEffectDiagramId(causeEffectDiagramId);
        } catch (error) {
          console.warn('[UpdateCauseEffectDiagramTool] 注力施策の取得に失敗しました:', error);
        }
        
        updateResult = await updateCauseEffectDiagramWithText(
          causeEffectDiagramId,
          textContent,
          finalModelType,
          finalSelectedModel,
          initiative
        );
      } else {
        throw new Error('議事録IDまたはテキストコンテンツが必要です');
      }

      // 注力施策を更新
      try {
        const initiative = await getFocusInitiativeByCauseEffectDiagramId(causeEffectDiagramId);
        if (initiative) {
          await saveFocusInitiative({
            ...initiative,
            method: updateResult.method,
            means: updateResult.means,
            objective: updateResult.objective,
          });
        }
      } catch (error) {
        console.warn('[UpdateCauseEffectDiagramTool] 注力施策の更新に失敗しました:', error);
      }

      return {
        success: true,
        data: {
          message: `特性要因図 ${causeEffectDiagramId} を更新しました`,
          summary: updateResult.summary,
          addedElements: updateResult.addedElements,
        },
        metadata: {
          source: this.name,
        },
      };
    } catch (error: any) {
      console.error('[UpdateCauseEffectDiagramTool] エラー:', error);
      return {
        success: false,
        error: error.message || '特性要因図の更新に失敗しました',
        metadata: {
          source: this.name,
        },
      };
    }
  }
}

/**
 * ナレッジグラフ検索Tool
 */
class SearchKnowledgeGraphTool implements MCPToolImplementation {
  name = 'search_knowledge_graph';
  description = 'ナレッジグラフを検索して関連情報を取得します';
  arguments = [
    { name: 'query', type: 'string' as const, description: '検索クエリ', required: true },
    { name: 'limit', type: 'number' as const, description: '検索結果の最大件数', required: false, default: 10 },
    { name: 'organizationId', type: 'string' as const, description: '組織ID（オプション）', required: false },
  ];
  returns = {
    type: 'array' as const,
    description: '検索結果の配列（topic, entity, relationを含む）',
  };

  async execute(request: MCPToolRequest): Promise<MCPToolResult> {
    const { query, limit = 10, organizationId } = request.arguments;
    
    if (!query) {
      return {
        success: false,
        error: '検索クエリが必要です',
      };
    }

    try {
      console.log('[SearchKnowledgeGraphTool] 検索開始:', { query, limit, organizationId });
      
      // まず、searchKnowledgeGraphを直接呼び出して検索結果を取得（RAG検索ページと同じ方法）
      const { searchKnowledgeGraph } = await import('@/lib/knowledgeGraphRAG');
      
      console.log('[SearchKnowledgeGraphTool] searchKnowledgeGraph呼び出し前:', {
        query,
        limit,
        organizationId,
        queryType: typeof query,
        queryLength: query?.length,
      });
      
      const searchResults = await searchKnowledgeGraph(
        query,
        limit,
        organizationId ? { organizationId } : undefined
      );
      
      console.log('[SearchKnowledgeGraphTool] searchKnowledgeGraph結果:', {
        resultsCount: searchResults.length,
        topicResultsCount: searchResults.filter(r => r.type === 'topic').length,
        entityResultsCount: searchResults.filter(r => r.type === 'entity').length,
        relationResultsCount: searchResults.filter(r => r.type === 'relation').length,
        sampleResults: searchResults.slice(0, 5).map(r => ({
          type: r.type,
          id: r.id,
          score: r.score,
          title: r.topic?.title || r.entity?.name || r.relation?.relationType,
          topicId: r.topicId,
          meetingNoteId: r.meetingNoteId,
        })),
      });
      
      // 検索結果が空の場合、エラーメッセージを返す
      if (searchResults.length === 0) {
        console.warn('[SearchKnowledgeGraphTool] 検索結果が空です。クエリ:', query);
        return {
          success: true,
          data: {
            context: `検索クエリ「${query}」に対する検索結果が見つかりませんでした。\n\n考えられる原因:\n- 該当するトピック、エンティティ、リレーションが存在しない\n- 検索クエリが適切でない（別のキーワードを試してください）\n- 組織IDが指定されている場合、その組織に該当データが存在しない`,
            sources: [],
            results: [],
          },
          metadata: {
            source: this.name,
          },
        };
      }
      
      // 検索結果からコンテキストを生成
      const { getKnowledgeGraphContextWithResults } = await import('@/lib/knowledgeGraphRAG');
      const result = await getKnowledgeGraphContextWithResults(
        query,
        limit,
        organizationId ? { organizationId } : undefined,
        2000
      );

      console.log('[SearchKnowledgeGraphTool] コンテキスト生成結果:', {
        contextLength: result.context.length,
        resultsCount: result.results.length,
        topicResultsCount: result.results.filter(r => r.type === 'topic').length,
        entityResultsCount: result.results.filter(r => r.type === 'entity').length,
        relationResultsCount: result.results.filter(r => r.type === 'relation').length,
        sourcesCount: result.sources.length,
        contextPreview: result.context.substring(0, 500),
      });
      
      // 関連度の高いトピックの詳細内容を取得（searchResultsから取得）
      const highScoreTopicResults = searchResults.filter(r => r.type === 'topic' && r.score > 0.05);
      if (highScoreTopicResults.length > 0) {
        console.log('[SearchKnowledgeGraphTool] 関連度の高いトピックの詳細内容を取得:', highScoreTopicResults.length, '件');
        
        const { getTopicsByIds } = await import('@/lib/topicApi');
        const topicDetails = await getTopicsByIds(
          highScoreTopicResults.slice(0, 5).map(r => ({
            topicId: r.topicId!,
            meetingNoteId: r.meetingNoteId!,
          }))
        );
        
        console.log('[SearchKnowledgeGraphTool] トピック詳細取得結果:', {
          requested: highScoreTopicResults.slice(0, 5).length,
          retrieved: topicDetails.length,
          details: topicDetails.map(t => ({
            topicId: t.topicId,
            title: t.title,
            contentLength: t.content?.length || 0,
          })),
        });
        
        // トピックの詳細内容をsearchResultsに追加
        for (const topicResult of highScoreTopicResults.slice(0, 5)) {
          const detail = topicDetails.find(
            t => t.topicId === topicResult.topicId && t.meetingNoteId === topicResult.meetingNoteId
          );
          
          if (detail && detail.content) {
            // トピックの詳細内容をresultに追加
            if (!topicResult.topic) {
              topicResult.topic = {
                topicId: detail.topicId,
                title: detail.title,
                contentSummary: detail.summary || detail.content.substring(0, 200),
                semanticCategory: detail.semanticCategory,
                keywords: detail.keywords,
                meetingNoteId: detail.meetingNoteId,
                organizationId: detail.organizationId,
              };
            }
            
            // 詳細内容を追加（全文、最大2000文字）
            (topicResult.topic as any).fullContent = detail.content.length > 2000 
              ? detail.content.substring(0, 2000) + '...'
              : detail.content;
          }
        }
        
        // result.resultsにも反映
        for (const resultTopic of result.results.filter(r => r.type === 'topic')) {
          const searchResult = highScoreTopicResults.find(
            r => r.topicId === resultTopic.topicId && r.meetingNoteId === resultTopic.meetingNoteId
          );
          if (searchResult && searchResult.topic && (searchResult.topic as any).fullContent) {
            if (!resultTopic.topic) {
              resultTopic.topic = searchResult.topic;
            } else {
              (resultTopic.topic as any).fullContent = (searchResult.topic as any).fullContent;
            }
          }
        }
      }
      
      // result.resultsが空の場合、searchResultsを使用
      if (result.results.length === 0 && searchResults.length > 0) {
        console.warn('[SearchKnowledgeGraphTool] result.resultsが空ですが、searchResultsは存在します。searchResultsを使用します。');
        result.results = searchResults;
      }
      
      // 検索結果が空の場合、searchKnowledgeGraphの結果を直接使用
      if (result.results.length === 0) {
        if (searchResults.length > 0) {
          console.warn('[SearchKnowledgeGraphTool] コンテキスト生成結果が空ですが、searchKnowledgeGraphの結果は存在します。searchKnowledgeGraphの結果を直接使用します。');
          
          // searchKnowledgeGraphの結果から直接コンテキストを構築
          const sources: Array<{
            type: 'entity' | 'relation' | 'topic';
            id: string;
            name: string;
            score: number;
          }> = [];
          
          const contextParts: string[] = [];
          
          // トピック結果を優先的に処理（詳細内容も含める）
          const topicResults = searchResults.filter(r => r.type === 'topic');
          if (topicResults.length > 0) {
            contextParts.push('## 関連トピック\n');
            
            // 関連度の高いトピックの詳細内容を取得
            const { getTopicsByIds } = await import('@/lib/topicApi');
            const topicDetails = await getTopicsByIds(
              topicResults.slice(0, 5).map(r => ({
                topicId: r.topicId!,
                meetingNoteId: r.meetingNoteId!,
              }))
            );
            
            for (const topicResult of topicResults.slice(0, 5)) {
              const topic = topicResult.topic;
              const detail = topicDetails.find(
                t => t.topicId === topicResult.topicId && t.meetingNoteId === topicResult.meetingNoteId
              );
              
              if (topic || detail) {
                const scoreText = typeof topicResult.score === 'number' && !isNaN(topicResult.score)
                  ? ` (関連度: ${(topicResult.score * 100).toFixed(1)}%)`
                  : '';
                const title = topic?.title || detail?.title || topicResult.topicId;
                contextParts.push(`- **${title}**${scoreText}`);
                
                sources.push({
                  type: 'topic',
                  id: topic?.topicId || topicResult.topicId!,
                  name: title,
                  score: typeof topicResult.score === 'number' && !isNaN(topicResult.score) ? topicResult.score : 0,
                });
                
                // 詳細内容を優先的に表示
                if (detail && detail.content) {
                  const fullContent = detail.content.length > 2000 
                    ? detail.content.substring(0, 2000) + '...'
                    : detail.content;
                  contextParts.push(`\n**詳細内容:**\n${fullContent}\n`);
                } else if (topic?.contentSummary) {
                  contextParts.push(`  内容: ${topic.contentSummary}`);
                }
              }
            }
          }
          
          // エンティティ結果
          const entityResults = searchResults.filter(r => r.type === 'entity' && r.entity);
          if (entityResults.length > 0) {
            contextParts.push('\n## 関連エンティティ\n');
            for (const entityResult of entityResults.slice(0, 3)) {
              const entity = entityResult.entity!;
              const scoreText = typeof entityResult.score === 'number' && !isNaN(entityResult.score)
                ? ` (関連度: ${(entityResult.score * 100).toFixed(1)}%)`
                : '';
              contextParts.push(`- **${entity.name}** (${entity.type})${scoreText}`);
              
              sources.push({
                type: 'entity',
                id: entity.id,
                name: entity.name,
                score: typeof entityResult.score === 'number' && !isNaN(entityResult.score) ? entityResult.score : 0,
              });
            }
          }
          
          // リレーション結果
          const relationResults = searchResults.filter(r => r.type === 'relation' && r.relation);
          if (relationResults.length > 0) {
            contextParts.push('\n## 関連リレーション\n');
            for (const relationResult of relationResults.slice(0, 3)) {
              const relation = relationResult.relation!;
              const scoreText = typeof relationResult.score === 'number' && !isNaN(relationResult.score)
                ? ` (関連度: ${(relationResult.score * 100).toFixed(1)}%)`
                : '';
              contextParts.push(`- **${relation.relationType}**${scoreText}`);
              
              sources.push({
                type: 'relation',
                id: relation.id,
                name: relation.relationType,
                score: typeof relationResult.score === 'number' && !isNaN(relationResult.score) ? relationResult.score : 0,
              });
            }
          }
          
          const fallbackContext = contextParts.join('\n');
          
          return {
            success: true,
            data: {
              context: fallbackContext,
              sources,
              results: searchResults,
            },
            metadata: {
              source: this.name,
            },
          };
        } else {
          console.warn('[SearchKnowledgeGraphTool] 検索結果が完全に空です。クエリ:', query);
        }
      }

      return {
        success: true,
        data: {
          context: result.context,
          sources: result.sources,
          results: result.results,
        },
        metadata: {
          source: this.name,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'ナレッジグラフ検索に失敗しました',
        metadata: {
          source: this.name,
        },
      };
    }
  }
}

/**
 * 標準Toolを登録
 */
export function registerStandardTools(): void {
  registerTool(new UpdateCauseEffectDiagramTool());
  registerTool(new SearchKnowledgeGraphTool());
  
  // Agent関連Toolを登録
  const { executeAgentTaskTool, listAgentsTool, sendAgentMessageTool } = require('./agentTools');
  registerTool(executeAgentTaskTool);
  registerTool(listAgentsTool);
  registerTool(sendAgentMessageTool);
  
  console.log('[MCPTools] 標準Toolを登録しました（Agent関連Toolを含む）');
}

