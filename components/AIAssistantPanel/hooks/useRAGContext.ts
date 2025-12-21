import type { RAGSource } from '../types';

export function useRAGContext() {
  const getRAGContext = async (
    queryText: string,
    organizationId?: string
  ): Promise<{ context: string; sources: RAGSource[] }> => {
    let ragContext = '';
    let ragSources: RAGSource[] = [];

    try {
      const { getOrchestratedRAGContext } = await import('@/lib/orchestration/ragOrchestrator');
      const { getKnowledgeGraphContextWithResults } = await import('@/lib/knowledgeGraphRAG');
      
      // まず、ナレッジグラフから直接コンテキストを取得（デバッグ用）
      try {
        const kgContextResult = await getKnowledgeGraphContextWithResults(
          queryText,
          10,
          {
            organizationId: organizationId || undefined,
          },
          2000
        );
        
        console.log('[useRAGContext] ナレッジグラフ検索結果:', {
          queryText,
          contextLength: kgContextResult.context.length,
          resultsCount: kgContextResult.results.length,
          topicResultsCount: kgContextResult.results.filter(r => r.type === 'topic').length,
          entityResultsCount: kgContextResult.results.filter(r => r.type === 'entity').length,
          relationResultsCount: kgContextResult.results.filter(r => r.type === 'relation').length,
          sourcesCount: kgContextResult.sources.length,
        });
        
        // トピック検索結果の詳細をログ出力
        const topicResults = kgContextResult.results.filter(r => r.type === 'topic');
        if (topicResults.length > 0) {
          console.log('[useRAGContext] トピック検索結果の詳細:', topicResults.map(r => ({
            topicId: r.topicId,
            title: r.topic?.title,
            contentSummary: r.topic?.contentSummary?.substring(0, 100),
            score: r.score,
          })));
        } else {
          console.warn('[useRAGContext] トピック検索結果が0件です。クエリ:', queryText);
        }
        
        ragSources = kgContextResult.sources;
      } catch (sourceError) {
        console.warn('[useRAGContext] ナレッジグラフ検索エラー:', sourceError);
      }
      
      // オーケストレーションレイヤー経由でコンテキストを取得
      const orchestratedContext = await getOrchestratedRAGContext(
        queryText,
        10,
        {
          organizationId: organizationId || undefined,
          includeDesignDocs: true,
        },
        {
          maxTokens: 3000,
          minRelevanceScore: 0.05, // スコア閾値を下げて、より多くの結果を含める（特にトピック検索結果）
        }
      );
      
      console.log('[useRAGContext] オーケストレーション結果:', {
        contextLength: orchestratedContext?.length || 0,
        hasContext: !!(orchestratedContext && orchestratedContext.trim() !== ''),
      });
      
      if (orchestratedContext && orchestratedContext.trim() !== '') {
        ragContext = `\n\n${orchestratedContext}\n\n`;
      } else {
        // オーケストレーション結果が空の場合、直接ナレッジグラフの結果を使用
        const kgContextResult = await getKnowledgeGraphContextWithResults(
          queryText,
          10,
          {
            organizationId: organizationId || undefined,
          },
          2000
        );
        if (kgContextResult.context && kgContextResult.context.trim() !== '') {
          ragContext = `\n\n${kgContextResult.context}\n\n`;
          ragSources = kgContextResult.sources;
        }
      }
    } catch (ragError) {
      console.warn('RAG検索エラー（続行します）:', ragError);
      // エラーメトリクスを記録
      if (typeof window !== 'undefined') {
        try {
          const { logErrorMetrics } = await import('@/lib/monitoring');
          logErrorMetrics({
            errorType: ragError instanceof Error ? ragError.constructor.name : 'RAGSearchError',
            errorMessage: ragError instanceof Error ? ragError.message : String(ragError),
            component: 'ai-assistant',
            context: {
              query: queryText,
              organizationId,
            },
          });
        } catch (metricsError) {
          console.warn('[useRAGContext] エラーメトリクス記録エラー:', metricsError);
        }
      }
    }

    return { context: ragContext, sources: ragSources };
  };

  return { getRAGContext };
}

