import { useState } from 'react';
import { searchKnowledgeGraph } from '@/lib/knowledgeGraphRAG';
import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';

interface SearchFilters {
  organizationId?: string;
  entityType?: string;
  relationType?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  filterLogic?: 'AND' | 'OR';
}

interface UseRAGSearchOptions {
  useCache?: boolean;
  onSearchComplete?: (results: KnowledgeGraphSearchResult[], query: string) => void;
  onSearchError?: (error: Error) => void;
}

// 簡易キャッシュ（メモリベース）
const searchCache = new Map<string, { results: KnowledgeGraphSearchResult[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分

// キャッシュをクリアする関数（デバッグ用）
export function clearRAGSearchCache() {
  searchCache.clear();
  console.log('[useRAGSearch] キャッシュをクリアしました');
}

function getCacheKey(query: string, filters: SearchFilters): string {
  return JSON.stringify({ query, filters });
}

export function useRAGSearch(options: UseRAGSearchOptions = {}) {
  const { useCache = true, onSearchComplete, onSearchError } = options;
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<KnowledgeGraphSearchResult[]>([]);

  const search = async (
    query: string,
    filters: SearchFilters = {},
    maxResults: number = 10
  ): Promise<KnowledgeGraphSearchResult[]> => {
    console.log('[useRAGSearch] 検索開始:', { query, filters, maxResults });
    setIsSearching(true);
    setSearchResults([]);

    try {
      // キャッシュチェック
      if (useCache) {
        const cacheKey = getCacheKey(query, filters);
        const cached = searchCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log('[useRAGSearch] キャッシュから取得:', cached.results.length, '件');
          // キャッシュされた結果のスコアを確認
          const invalidScores = cached.results.filter(r => 
            typeof r.score !== 'number' || isNaN(r.score) || r.score <= 0
          );
          if (invalidScores.length > 0) {
            console.warn('[useRAGSearch] キャッシュされた結果に無効なスコアが含まれています。再検索を実行します。', {
              invalidCount: invalidScores.length,
              totalCount: cached.results.length,
              invalidResults: invalidScores.map(r => ({ id: r.id, score: r.score, scoreType: typeof r.score }))
            });
            // 無効なスコアの場合はキャッシュを削除して再検索
            searchCache.delete(cacheKey);
          } else {
            setSearchResults(cached.results);
            if (onSearchComplete) {
              onSearchComplete(cached.results, query);
            }
            setIsSearching(false);
            return cached.results;
          }
        }
      }

      // 検索を実行
      console.log('[useRAGSearch] searchKnowledgeGraphを呼び出し:', {
        query,
        maxResults,
        filters: {
          organizationId: filters.organizationId,
          entityType: filters.entityType,
          relationType: filters.relationType,
        },
      });
      
      // organizationIdが未指定の場合の警告
      if (!filters.organizationId) {
        console.warn('[useRAGSearch] organizationIdが指定されていません。検索結果が空になる可能性があります。');
      }
      
      const results = await searchKnowledgeGraph(
        query,
        maxResults,
        {
          organizationId: filters.organizationId,
          entityType: filters.entityType,
          relationType: filters.relationType,
          createdAfter: filters.createdAfter,
          createdBefore: filters.createdBefore,
          updatedAfter: filters.updatedAfter,
          updatedBefore: filters.updatedBefore,
          filterLogic: filters.filterLogic,
        },
        useCache
      );
      
      console.log('[useRAGSearch] 検索結果取得:', results.length, '件', results);
      
      setSearchResults(results);
      
      // キャッシュに保存
      if (useCache) {
        const cacheKey = getCacheKey(query, filters);
        searchCache.set(cacheKey, {
          results,
          timestamp: Date.now(),
        });
      }
      
      if (onSearchComplete) {
        onSearchComplete(results, query);
      }

      return results;
    } catch (error: any) {
      console.error('RAG検索エラー:', error);
      const searchError = new Error(error.message || '不明なエラーが発生しました');
      if (onSearchError) {
        onSearchError(searchError);
      }
      setSearchResults([]);
      throw searchError;
    } finally {
      setIsSearching(false);
    }
  };

  return {
    isSearching,
    searchResults,
    search,
    setSearchResults,
  };
}

