'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import KnowledgeGraph2D from '@/components/KnowledgeGraph2D';
import { searchKnowledgeGraph, findRelatedEntities, findRelatedRelations, getKnowledgeGraphContext } from '@/lib/knowledgeGraphRAG';
import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';
import { getCacheStats, clearSearchCache } from '@/lib/ragSearchCache';
import { analyzeSearchHistory, getSearchHistory, analyzeKeywords } from '@/lib/searchHistoryAnalytics';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import { getOrgTreeFromDb, getAllOrganizationsFromTree, getMeetingNoteById } from '@/lib/orgApi';
import { getEntityById } from '@/lib/entityApi';
import { getRelationById, getAllRelations } from '@/lib/relationApi';
import { RAGSearchIcon } from '@/components/Icons';
import { printEmbeddingStats, checkAllEmbeddings } from '@/lib/checkEmbeddings';
import { getAllEntities } from '@/lib/entityApi';

interface SearchHistory {
  query: string;
  timestamp: string;
  resultCount: number;
  filters?: {
    organizationId?: string;
    entityType?: string;
    relationType?: string;
  };
}

export default function RAGSearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<KnowledgeGraphSearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<KnowledgeGraphSearchResult | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; title?: string }>>([]);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [relationTypeFilter, setRelationTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<'none' | 'created' | 'updated'>('none');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');
  const [savedFilterPresets, setSavedFilterPresets] = useState<Array<{ name: string; filters: any }>>([]);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [favoriteSearches, setFavoriteSearches] = useState<SearchHistory[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [graphEntities, setGraphEntities] = useState<Entity[]>([]);
  const [graphRelations, setGraphRelations] = useState<Relation[]>([]);
  const [isLoadingGraphData, setIsLoadingGraphData] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ memoryCacheSize: number; localStorageCacheSize: number; totalSize: number }>({ memoryCacheSize: 0, localStorageCacheSize: 0, totalSize: 0 });
  const [useCache, setUseCache] = useState<boolean>(true);
  const [searchFeedbackRatings, setSearchFeedbackRatings] = useState<Record<string, boolean>>({});
  const [dataQualityReport, setDataQualityReport] = useState<any>(null);
  const [showDataQualityReport, setShowDataQualityReport] = useState(false);
  const [embeddingStats, setEmbeddingStats] = useState<any>(null);
  const [showEmbeddingStats, setShowEmbeddingStats] = useState(false);
  const [showEvaluationPanel, setShowEvaluationPanel] = useState(false);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [evaluationReport, setEvaluationReport] = useState<any>(null);
  const [isRunningEvaluation, setIsRunningEvaluation] = useState(false);
  
  // パフォーマンス最適化: デバウンスされた検索関数
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [actualEntityCount, setActualEntityCount] = useState<number | null>(null);
  const [actualRelationCount, setActualRelationCount] = useState<number | null>(null);

  // ブラウザコンソールから呼び出せるようにグローバルに公開
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).checkEmbeddings = async (organizationId?: string) => {
        const stats = await checkAllEmbeddings(organizationId);
        console.log('📊 埋め込みベクトルの統計情報:', stats);
        return stats;
      };
      (window as any).printEmbeddingStats = async (organizationId?: string) => {
        await printEmbeddingStats(organizationId);
      };
      (window as any).diagnoseRAGSearch = async () => {
        console.log('🔍 RAG検索の診断を開始します...\n');
        
        // 1. ChromaDB設定の確認
        const { shouldUseChroma } = await import('@/lib/chromaConfig');
        const useChroma = shouldUseChroma();
        const localStorageValue = localStorage.getItem('useChromaDB');
        console.log('1️⃣ ChromaDB設定:');
        console.log(`   - shouldUseChroma(): ${useChroma}`);
        console.log(`   - localStorage['useChromaDB']: "${localStorageValue}"`);
        console.log(`   - 推奨: ${useChroma ? '✅ ChromaDBが有効です' : '⚠️ ChromaDBが無効です。有効化するには: localStorage.setItem("useChromaDB", "true")'}\n`);
        
        // 2. エンティティの存在確認
        const { getAllEntities } = await import('@/lib/entityApi');
        const allEntities = await getAllEntities();
        console.log('2️⃣ エンティティの存在確認:');
        console.log(`   - 総エンティティ数: ${allEntities.length}件`);
        if (allEntities.length > 0) {
          console.log(`   - サンプルエンティティ:`, allEntities.slice(0, 3).map(e => ({ id: e.id, name: e.name, organizationId: e.organizationId })));
        } else {
          console.log('   ⚠️ エンティティが存在しません。エンティティを作成してください。\n');
        }
        
        // 3. 埋め込みの状態確認
        const stats = await checkAllEmbeddings();
        console.log('3️⃣ 埋め込みベクトルの状態:');
        console.log(`   - エンティティ: 総数=${stats.entities.total}, 埋め込みあり=${stats.entities.withEmbeddings}, 埋め込みなし=${stats.entities.withoutEmbeddings}`);
        console.log(`   - リレーション: 総数=${stats.relations.total}, 埋め込みあり=${stats.relations.withEmbeddings}, 埋め込みなし=${stats.relations.withoutEmbeddings}`);
        console.log(`   - トピック: 総数=${stats.topics.total}, 埋め込みあり=${stats.topics.withEmbeddings}, 埋め込みなし=${stats.topics.withoutEmbeddings}`);
        if (stats.entities.actualTotal !== undefined) {
          console.log(`   - 実際のエンティティ総数: ${stats.entities.actualTotal}件`);
        }
        console.log('');
        
        // 4. ChromaDBコレクションの確認（ChromaDBが有効な場合）
        if (useChroma && allEntities.length > 0) {
          const orgIds = [...new Set(allEntities.map(e => e.organizationId).filter(Boolean))];
          console.log('4️⃣ ChromaDBコレクションの確認:');
          if (orgIds.length === 0) {
            console.log('   ⚠️ organizationIdが設定されているエンティティがありません。');
          } else {
            for (const orgId of orgIds.slice(0, 5)) {
              if (!orgId) continue;
              try {
                const { countEntitiesInChroma } = await import('@/lib/entityEmbeddingsChroma');
                const count = await countEntitiesInChroma(orgId);
                console.log(`   - entities_${orgId}: ${count}件`);
                if (count === 0) {
                  const orgEntities = allEntities.filter(e => e.organizationId === orgId);
                  console.log(`     ⚠️ コレクションが空です。この組織には${orgEntities.length}件のエンティティがありますが、ChromaDBに保存されていません。`);
                }
              } catch (error: any) {
                console.log(`   - entities_${orgId}: エラー - ${error?.message || error}`);
              }
            }
          }
          console.log('');
        }
        
        // 5. 検索テスト（エンティティ名で検索）
        if (allEntities.length > 0 && useChroma) {
          const testEntity = allEntities[0];
          const testOrgId = testEntity.organizationId;
          if (testOrgId) {
            console.log('5️⃣ 検索テスト:');
            console.log(`   - テストクエリ: "${testEntity.name}"`);
            console.log(`   - organizationId: "${testOrgId}"`);
            try {
              const { findSimilarEntities } = await import('@/lib/entityEmbeddings');
              const searchResults = await findSimilarEntities(testEntity.name, 5, testOrgId);
              console.log(`   - 検索結果: ${searchResults.length}件`);
              if (searchResults.length > 0) {
                console.log(`   - 結果の詳細:`, searchResults.map(r => ({ entityId: r.entityId, similarity: r.similarity.toFixed(4) })));
              } else {
                console.log(`   ⚠️ 検索結果が0件です。ChromaDBにデータが保存されていない可能性があります。`);
              }
            } catch (error: any) {
              console.log(`   - 検索エラー: ${error?.message || error}`);
            }
            console.log('');
          }
        }
        
        // 6. 推奨事項
        console.log('6️⃣ 推奨事項:');
        if (!useChroma) {
          console.log('   ⚠️ ChromaDBが無効です。RAG検索を有効にするには:');
          console.log('      localStorage.setItem("useChromaDB", "true"); location.reload();');
        } else if (allEntities.length === 0) {
          console.log('   ⚠️ エンティティが存在しません。エンティティを作成してください。');
        } else if (stats.entities.withEmbeddings === 0) {
          console.log('   ⚠️ 埋め込みベクトルが生成されていません。ナレッジグラフページで「埋め込み再生成」を実行してください。');
          console.log('   💡 ナレッジグラフページのURL: /knowledge-graph');
        } else {
          const orgIds = [...new Set(allEntities.map(e => e.organizationId).filter(Boolean))];
          if (orgIds.length > 0) {
            console.log(`   ✅ 設定は正常です。検索時にorganizationIdを指定してください。`);
            console.log(`   💡 利用可能なorganizationId: ${orgIds.join(', ')}`);
            console.log(`   💡 RAG検索ページで組織を選択するか、検索フィルターでorganizationIdを指定してください。`);
          } else {
            console.log('   ⚠️ エンティティにorganizationIdが設定されていません。');
          }
        }
        
        return { useChroma, allEntities, stats };
      };
      console.log('✅ 埋め込みベクトル確認関数が利用可能になりました:');
      console.log('  - window.checkEmbeddings(organizationId?) - 統計情報を取得');
      console.log('  - window.printEmbeddingStats(organizationId?) - 統計情報をコンソールに表示');
      console.log('  - window.diagnoseRAGSearch() - RAG検索の診断を実行');
    }
  }, []);

  // 組織データの読み込み
  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const orgTree = await getOrgTreeFromDb();
        if (orgTree) {
          const allOrgs = getAllOrganizationsFromTree(orgTree);
          setOrganizations(allOrgs);
        }
      } catch (error) {
        console.error('組織データの読み込みエラー:', error);
      }
    };
    loadOrganizations();
  }, []);

  // キャッシュ統計の更新
  useEffect(() => {
    const stats = getCacheStats();
    setCacheStats(stats);
  }, [searchResults]);

  // 保存されたフィルタープリセットの読み込み
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rag_search_filter_presets');
        if (saved) {
          setSavedFilterPresets(JSON.parse(saved));
        }
      } catch (error) {
        console.warn('フィルタープリセットの読み込みエラー:', error);
      }
    }
  }, []);

  // 検索履歴の読み込み
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedHistory = localStorage.getItem('ragSearchHistory');
      if (savedHistory) {
        const history = JSON.parse(savedHistory) as SearchHistory[];
        setSearchHistory(history);
      }
      const savedFavorites = localStorage.getItem('ragSearchFavorites');
      if (savedFavorites) {
        const favorites = JSON.parse(savedFavorites) as SearchHistory[];
        setFavoriteSearches(favorites);
      }
    } catch (error) {
      console.error('検索履歴の読み込みエラー:', error);
    }
  }, []);

  // 検索履歴の保存
  const saveSearchHistory = (query: string, resultCount: number) => {
    if (typeof window === 'undefined') return;
    try {
      const newHistoryItem: SearchHistory = {
        query,
        timestamp: new Date().toISOString(),
        resultCount,
        filters: {
          organizationId: selectedOrganizationId || undefined,
          entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
          relationType: relationTypeFilter !== 'all' ? relationTypeFilter : undefined,
        },
      };

      const updatedHistory = [newHistoryItem, ...searchHistory.filter(h => h.query !== query)].slice(0, 20); // 最新20件
      setSearchHistory(updatedHistory);
      localStorage.setItem('ragSearchHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('検索履歴の保存エラー:', error);
    }
  };

  // お気に入り検索の追加/削除
  const toggleFavorite = (historyItem: SearchHistory) => {
    if (typeof window === 'undefined') return;
    try {
      const isFavorite = favoriteSearches.some(f => f.query === historyItem.query && f.timestamp === historyItem.timestamp);
      let updatedFavorites: SearchHistory[];
      
      if (isFavorite) {
        updatedFavorites = favoriteSearches.filter(f => !(f.query === historyItem.query && f.timestamp === historyItem.timestamp));
      } else {
        updatedFavorites = [...favoriteSearches, historyItem].slice(0, 10); // 最大10件
      }
      
      setFavoriteSearches(updatedFavorites);
      localStorage.setItem('ragSearchFavorites', JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('お気に入りの保存エラー:', error);
    }
  };

  // 履歴から検索を実行
  const executeHistorySearch = (historyItem: SearchHistory) => {
    setSearchQuery(historyItem.query);
    if (historyItem.filters) {
      setSelectedOrganizationId(historyItem.filters.organizationId || '');
      setEntityTypeFilter(historyItem.filters.entityType || 'all');
      setRelationTypeFilter(historyItem.filters.relationType || 'all');
    }
    setShowHistory(false);
    // 検索を実行
    setTimeout(() => {
      handleSearchWithQuery(historyItem.query, historyItem.filters);
    }, 100);
  };

  // 検索履歴の削除（個別）
  const deleteHistoryItem = (historyItem: SearchHistory) => {
    if (typeof window === 'undefined') return;
    try {
      const updatedHistory = searchHistory.filter(
        h => !(h.query === historyItem.query && h.timestamp === historyItem.timestamp)
      );
      setSearchHistory(updatedHistory);
      localStorage.setItem('ragSearchHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('検索履歴の削除エラー:', error);
    }
  };

  // 検索結果のフィードバックを保存
  const handleSearchFeedback = (resultId: string, resultType: 'entity' | 'relation' | 'topic', relevant: boolean) => {
    if (typeof window === 'undefined') return;
    
    try {
      const { saveSearchFeedback } = require('@/lib/feedback');
      saveSearchFeedback({
        query: searchQuery,
        resultId,
        resultType,
        relevant,
      });
      
      // UIの状態を更新
      setSearchFeedbackRatings(prev => ({ ...prev, [resultId]: relevant }));
      
      console.log('[RAGSearch] 検索フィードバックを保存:', { resultId, resultType, relevant });
    } catch (error) {
      console.error('[RAGSearch] フィードバック保存エラー:', error);
    }
  };

  // 検索履歴の全削除
  const clearAllHistory = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (typeof window === 'undefined') return;
    console.log('[clearAllHistory] 関数が呼ばれました');
    if (window.confirm('すべての検索履歴を削除しますか？')) {
      try {
        console.log('[clearAllHistory] 削除を実行します');
        setSearchHistory([]);
        localStorage.setItem('ragSearchHistory', JSON.stringify([]));
        console.log('[clearAllHistory] 削除完了');
      } catch (error) {
        console.error('検索履歴の全削除エラー:', error);
      }
    } else {
      console.log('[clearAllHistory] ユーザーがキャンセルしました');
    }
  };

  // パフォーマンス最適化: デバウンス処理
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const { debounce } = require('@/lib/performance');
    const debouncedHandler = debounce((query: string) => {
      setDebouncedSearchQuery(query);
    }, 300);
    
    if (searchQuery) {
      debouncedHandler(searchQuery);
    }
    
    return () => {
      // クリーンアップ
    };
  }, [searchQuery]);

  // RAG検索の実行（内部関数）
  const handleSearchWithQuery = async (query: string, filters?: SearchHistory['filters']) => {
    setIsSearching(true);
    setSearchResults([]);
    setSelectedResult(null);

    try {
      // 日付フィルターの準備
      const dateFilters: { createdAfter?: string; createdBefore?: string; updatedAfter?: string; updatedBefore?: string } = {};
      if (dateFilterType === 'created' && dateRangeStart) {
        dateFilters.createdAfter = dateRangeStart;
      }
      if (dateFilterType === 'created' && dateRangeEnd) {
        dateFilters.createdBefore = dateRangeEnd;
      }
      if (dateFilterType === 'updated' && dateRangeStart) {
        dateFilters.updatedAfter = dateRangeStart;
      }
      if (dateFilterType === 'updated' && dateRangeEnd) {
        dateFilters.updatedBefore = dateRangeEnd;
      }

      // organizationIdが空文字列の場合はundefinedとして扱う
      const orgId = filters?.organizationId || (selectedOrganizationId && selectedOrganizationId.trim() !== '' ? selectedOrganizationId : undefined);
      
      console.log(`[handleSearchWithQuery] 検索実行: query="${query}", orgId=${orgId}, useCache=${useCache}`);
      
      const results = await searchKnowledgeGraph(
        query,
        10,
        {
          organizationId: orgId,
          entityType: filters?.entityType || (entityTypeFilter !== 'all' ? entityTypeFilter : undefined),
          relationType: filters?.relationType || (relationTypeFilter !== 'all' ? relationTypeFilter : undefined),
          ...dateFilters,
          filterLogic: filterLogic,
        },
        useCache
      );
      
      console.log(`[handleSearchWithQuery] 検索結果: ${results.length}件`);

      setSearchResults(results);
      // 検索履歴に保存
      saveSearchHistory(query, results.length);
      
      // グラフ表示用のデータを準備
      await prepareGraphData(results);
    } catch (error: any) {
      console.error('RAG検索エラー:', error);
      alert(`検索エラー: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  // 検索結果からグラフデータを準備
  const prepareGraphData = async (results: KnowledgeGraphSearchResult[]) => {
    setIsLoadingGraphData(true);
    try {
      const entities: Entity[] = [];
      const relations: Relation[] = [];
      const entityIds = new Set<string>();
      const relationIds = new Set<string>();

      // エンティティを収集
      for (const result of results) {
        if (result.type === 'entity' && result.entity && !entityIds.has(result.entity.id)) {
          entities.push(result.entity);
          entityIds.add(result.entity.id);
        }
      }

      // リレーションを収集（検索結果に含まれるリレーション）
      for (const result of results) {
        if (result.type === 'relation' && result.relation && !relationIds.has(result.relation.id)) {
          relations.push(result.relation);
          relationIds.add(result.relation.id);
        }
      }

      // エンティティ間のリレーションを取得（検索結果のエンティティに関連するリレーション）
      for (const entity of entities) {
        try {
          // このエンティティに関連するリレーションを取得
          const allRelations = await getAllRelations();
          const relatedRelations = allRelations.filter(rel => 
            (rel.sourceEntityId === entity.id || rel.targetEntityId === entity.id) &&
            !relationIds.has(rel.id)
          );
          
          for (const rel of relatedRelations) {
            // リレーションの両端のエンティティが検索結果に含まれているか、または関連エンティティを追加
            const sourceInResults = entityIds.has(rel.sourceEntityId || '');
            const targetInResults = entityIds.has(rel.targetEntityId || '');
            
            if (sourceInResults || targetInResults) {
              relations.push(rel);
              relationIds.add(rel.id);
              
              // 関連エンティティも追加（まだ含まれていない場合）
              if (rel.sourceEntityId && !entityIds.has(rel.sourceEntityId)) {
                try {
                  const sourceEntity = await getEntityById(rel.sourceEntityId);
                  if (sourceEntity) {
                    entities.push(sourceEntity);
                    entityIds.add(sourceEntity.id);
                  }
                } catch (error) {
                  // エンティティ取得エラーは無視
                }
              }
              
              if (rel.targetEntityId && !entityIds.has(rel.targetEntityId)) {
                try {
                  const targetEntity = await getEntityById(rel.targetEntityId);
                  if (targetEntity) {
                    entities.push(targetEntity);
                    entityIds.add(targetEntity.id);
                  }
                } catch (error) {
                  // エンティティ取得エラーは無視
                }
              }
            }
          }
        } catch (error) {
          console.warn(`エンティティ ${entity.id} の関連リレーション取得エラー:`, error);
        }
      }

      setGraphEntities(entities);
      setGraphRelations(relations);
    } catch (error) {
      console.error('グラフデータの準備エラー:', error);
    } finally {
      setIsLoadingGraphData(false);
    }
  };

  // RAG検索の実行（公開関数）
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }
    await handleSearchWithQuery(searchQuery);
  };

  // Enterキーで検索
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  // 結果のタイプ別にグループ化
  const groupedResults = useMemo(() => {
    const groups = {
      entities: searchResults.filter(r => r.type === 'entity'),
      relations: searchResults.filter(r => r.type === 'relation'),
      topics: searchResults.filter(r => r.type === 'topic'),
    };
    return groups;
  }, [searchResults]);

  // エンティティタイプのラベル
  const entityTypeLabels: Record<string, string> = {
    person: '👤 人',
    company: '🏢 会社',
    product: '📦 製品',
    project: '📋 プロジェクト',
    organization: '🏛️ 組織',
    location: '📍 場所',
    technology: '💻 技術',
    other: '📌 その他',
  };

  // リレーションタイプのラベル
  const relationTypeLabels: Record<string, string> = {
    subsidiary: '子会社',
    uses: '使用',
    invests: '出資',
    employs: '雇用',
    partners: '提携',
    competes: '競合',
    supplies: '供給',
    owns: '所有',
    'located-in': '所在',
    'works-for': '勤務',
    manages: '管理',
    'reports-to': '報告',
    'related-to': '関連',
    other: 'その他',
  };

  return (
    <Layout>
      <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB', padding: '24px' }}>
        <div style={{ width: '100%' }}>
          {/* ヘッダー */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <RAGSearchIcon size={32} color="#3B82F6" />
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                RAG検索
              </h1>
            </div>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
              AIによる意味検索で、エンティティ・リレーション・トピックを統合検索できます
            </p>
          </div>

          {/* 検索バー */}
          <div style={{ 
            backgroundColor: '#FFFFFF', 
            borderRadius: '12px', 
            padding: '24px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="検索クエリを入力（例: 自動車メーカーとの提携、AI技術の活用など）"
                  disabled={isSearching}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    paddingLeft: '44px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3B82F6';
                    setShowHistory(true);
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    // 少し遅延させてクリックイベントを処理
                    setTimeout(() => setShowHistory(false), 200);
                  }}
                />
                <div style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}>
                  <RAGSearchIcon size={20} color="#9CA3AF" />
                </div>
                
                {/* 検索履歴ドロップダウン */}
                {showHistory && (searchHistory.length > 0 || favoriteSearches.length > 0) && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}>
                    {favoriteSearches.length > 0 && (
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }}>お気に入り</div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (window.confirm('すべてのお気に入りを削除しますか？')) {
                                setFavoriteSearches([]);
                                localStorage.setItem('ragSearchFavorites', JSON.stringify([]));
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              fontSize: '11px',
                              color: '#EF4444',
                              borderRadius: '4px',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#FEE2E2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="すべてのお気に入りを削除"
                          >
                            すべて削除
                          </button>
                        </div>
                        {favoriteSearches.map((item, index) => (
                          <div
                            key={`favorite-${index}`}
                            onClick={() => executeHistorySearch(item)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F3F4F6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <span style={{ fontSize: '14px', color: '#1F2937', flex: 1 }}>{item.query}</span>
                            <span style={{ fontSize: '12px', color: '#9CA3AF', marginRight: '8px' }}>
                              {item.resultCount}件
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: '#F59E0B',
                                marginRight: '4px',
                              }}
                              title="お気に入りから削除"
                            >
                              ★
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteHistoryItem(item);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: '#9CA3AF',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#EF4444';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#9CA3AF';
                              }}
                              title="履歴から削除"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchHistory.length > 0 && (
                      <div style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }}>最近の検索</div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              clearAllHistory(e);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              fontSize: '11px',
                              color: '#EF4444',
                              borderRadius: '4px',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#FEE2E2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="すべての履歴を削除"
                          >
                            すべて削除
                          </button>
                        </div>
                        {searchHistory.slice(0, 10).map((item, index) => {
                          const isFavorite = favoriteSearches.some(f => f.query === item.query && f.timestamp === item.timestamp);
                          return (
                            <div
                              key={`history-${index}`}
                              onClick={() => executeHistorySearch(item)}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#F3F4F6';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <span style={{ fontSize: '14px', color: '#1F2937', flex: 1 }}>{item.query}</span>
                              <span style={{ fontSize: '12px', color: '#9CA3AF', marginRight: '8px' }}>
                                {item.resultCount}件
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(item);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  color: isFavorite ? '#F59E0B' : '#D1D5DB',
                                  marginRight: '4px',
                                }}
                                title={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
                              >
                                {isFavorite ? '★' : '☆'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteHistoryItem(item);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  color: '#9CA3AF',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#EF4444';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#9CA3AF';
                                }}
                                title="履歴から削除"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: isSearching || !searchQuery.trim() ? '#D1D5DB' : '#3B82F6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 500,
                    cursor: isSearching || !searchQuery.trim() ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                >
                  {isSearching ? '検索中...' : '検索'}
                </button>
                
                {/* 評価・テストボタン（検索ボタンの横に配置） */}
                <button
                  onClick={async () => {
                    try {
                      const { getTestCases } = await import('@/lib/evaluation');
                      const cases = getTestCases();
                      setTestCases(cases);
                      setShowEvaluationPanel(true);
                    } catch (error) {
                      console.error('評価システムの読み込みに失敗しました:', error);
                      alert('評価システムの読み込みに失敗しました。コンソールを確認してください。');
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FDE68A',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FDE68A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FEF3C7';
                  }}
                  title="評価・テストシステムを開く"
                >
                  📊 評価・テスト
                </button>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: showFilters ? '#3B82F6' : '#F3F4F6',
                  color: showFilters ? '#FFFFFF' : '#6B7280',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                フィルター
              </button>
              <button
                onClick={async () => {
                  try {
                    // 実際のエンティティとリレーションの総数を取得
                    const [entities, relations] = await Promise.all([
                      getAllEntities(),
                      getAllRelations(),
                    ]);
                    setActualEntityCount(entities.length);
                    setActualRelationCount(relations.length);
                    
                    const stats = await checkAllEmbeddings(selectedOrganizationId || undefined);
                    setEmbeddingStats(stats);
                    setShowEmbeddingStats(true);
                  } catch (error) {
                    console.error('埋め込みベクトル統計の取得に失敗しました:', error);
                    alert('埋め込みベクトル統計の取得に失敗しました。コンソールを確認してください。');
                  }
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#EFF6FF',
                  color: '#1E40AF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                title="埋め込みベクトルの次元数と存在を確認"
              >
                📊 埋め込み統計
              </button>
              <button
                onClick={() => {
                  const history = getSearchHistory();
                  const analyticsData = analyzeSearchHistory(history);
                  setAnalytics(analyticsData);
                  setShowAnalytics(true);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                📊 分析
              </button>
            </div>

            {/* フィルター */}
            {showFilters && (
              <div style={{
                padding: '16px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
                    組織
                  </label>
                  <select
                    value={selectedOrganizationId}
                    onChange={(e) => setSelectedOrganizationId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="">すべての組織</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
                    エンティティタイプ
                  </label>
                  <select
                    value={entityTypeFilter}
                    onChange={(e) => setEntityTypeFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="all">すべて</option>
                    {Object.entries(entityTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
                    リレーションタイプ
                  </label>
                  <select
                    value={relationTypeFilter}
                    onChange={(e) => setRelationTypeFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="all">すべて</option>
                    {Object.entries(relationTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                
                {/* 高度なフィルター */}
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* 日付範囲フィルター */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '120px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
                        日付フィルター
                      </label>
                      <select
                        value={dateFilterType}
                        onChange={(e) => {
                          setDateFilterType(e.target.value as 'none' | 'created' | 'updated');
                          if (e.target.value === 'none') {
                            setDateRangeStart('');
                            setDateRangeEnd('');
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <option value="none">なし</option>
                        <option value="created">作成日</option>
                        <option value="updated">更新日</option>
                      </select>
                    </div>
                    
                    {dateFilterType !== 'none' && (
                      <>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
                            開始日
                          </label>
                          <input
                            type="date"
                            value={dateRangeStart}
                            onChange={(e) => setDateRangeStart(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              fontSize: '14px',
                            }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
                            終了日
                          </label>
                          <input
                            type="date"
                            value={dateRangeEnd}
                            onChange={(e) => setDateRangeEnd(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              fontSize: '14px',
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* フィルターロジックとプリセット */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '120px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
                        条件の組み合わせ
                      </label>
                      <select
                        value={filterLogic}
                        onChange={(e) => setFilterLogic(e.target.value as 'AND' | 'OR')}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <option value="AND">AND（すべて一致）</option>
                        <option value="OR">OR（いずれか一致）</option>
                      </select>
                    </div>
                    
                    {/* プリセット保存・読み込み */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      <button
                        onClick={() => {
                          const presetName = prompt('プリセット名を入力してください:');
                          if (presetName) {
                            const preset = {
                              name: presetName,
                              filters: {
                                organizationId: selectedOrganizationId || undefined,
                                entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
                                relationType: relationTypeFilter !== 'all' ? relationTypeFilter : undefined,
                                dateFilterType,
                                dateRangeStart: dateRangeStart || undefined,
                                dateRangeEnd: dateRangeEnd || undefined,
                                filterLogic,
                              },
                            };
                            const updated = [...savedFilterPresets, preset].slice(0, 10); // 最大10件
                            setSavedFilterPresets(updated);
                            localStorage.setItem('rag_search_filter_presets', JSON.stringify(updated));
                            alert('プリセットを保存しました');
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#3B82F6',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        プリセット保存
                      </button>
                      
                      {savedFilterPresets.length > 0 && (
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setShowPresetMenu(!showPresetMenu)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#F3F4F6',
                              color: '#6B7280',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              fontSize: '14px',
                              cursor: 'pointer',
                            }}
                          >
                            プリセット読み込み ▼
                          </button>
                          
                          {showPresetMenu && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              marginTop: '4px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                              zIndex: 100,
                              minWidth: '200px',
                            }}>
                              {savedFilterPresets.map((preset, index) => (
                                <div key={index}>
                                  <button
                                    onClick={() => {
                                      setSelectedOrganizationId(preset.filters.organizationId || '');
                                      setEntityTypeFilter(preset.filters.entityType || 'all');
                                      setRelationTypeFilter(preset.filters.relationType || 'all');
                                      setDateFilterType(preset.filters.dateFilterType || 'none');
                                      setDateRangeStart(preset.filters.dateRangeStart || '');
                                      setDateRangeEnd(preset.filters.dateRangeEnd || '');
                                      setFilterLogic(preset.filters.filterLogic || 'AND');
                                      setShowPresetMenu(false);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      textAlign: 'left',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      fontSize: '14px',
                                      cursor: 'pointer',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#F3F4F6';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    {preset.name}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`「${preset.name}」を削除しますか？`)) {
                                        const updated = savedFilterPresets.filter((_, i) => i !== index);
                                        setSavedFilterPresets(updated);
                                        localStorage.setItem('rag_search_filter_presets', JSON.stringify(updated));
                                        setShowPresetMenu(false);
                                      }
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      backgroundColor: '#FEF2F2',
                                      color: '#991B1B',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                      marginLeft: '8px',
                                      marginBottom: '4px',
                                    }}
                                  >
                                    削除
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 検索結果 */}
          {searchResults.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937' }}>
                  検索結果 ({searchResults.length}件)
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '14px', color: '#6B7280' }}>
                    <span>エンティティ: {groupedResults.entities.length}</span>
                    <span>リレーション: {groupedResults.relations.length}</span>
                    <span>トピック: {groupedResults.topics.length}</span>
                  </div>
                  
                  {/* ビューモード切り替え */}
                  <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F3F4F6', borderRadius: '6px', padding: '2px' }}>
                    <button
                      onClick={() => setViewMode('list')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                        color: viewMode === 'list' ? '#1F2937' : '#6B7280',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: viewMode === 'list' ? 500 : 400,
                        cursor: 'pointer',
                        boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      リスト
                    </button>
                    <button
                      onClick={() => setViewMode('graph')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: viewMode === 'graph' ? '#FFFFFF' : 'transparent',
                        color: viewMode === 'graph' ? '#1F2937' : '#6B7280',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: viewMode === 'graph' ? 500 : 400,
                        cursor: 'pointer',
                        boxShadow: viewMode === 'graph' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      グラフ
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* キャッシュ統計 */}
                    {cacheStats.totalSize > 0 && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6B7280',
                        padding: '4px 8px',
                        backgroundColor: '#F3F4F6',
                        borderRadius: '4px',
                      }}>
                        キャッシュ: {cacheStats.totalSize}件
                      </div>
                    )}
                    
                    {/* キャッシュ設定 */}
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      fontSize: '12px',
                      color: '#6B7280',
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={useCache}
                        onChange={(e) => setUseCache(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      キャッシュ使用
                    </label>
                    
                    {cacheStats.totalSize > 0 && (
                      <button
                        onClick={() => {
                          if (confirm('キャッシュをクリアしますか？')) {
                            clearSearchCache();
                            setCacheStats({ memoryCacheSize: 0, localStorageCacheSize: 0, totalSize: 0 });
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#FEF2F2',
                          color: '#991B1B',
                          border: '1px solid #FECACA',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                        title="キャッシュをクリア"
                      >
                        キャッシュクリア
                      </button>
                    )}
                    
                    {/* 埋め込みベクトル統計 */}
                    <button
                      onClick={async () => {
                        try {
                          const stats = await checkAllEmbeddings(selectedOrganizationId || undefined);
                          setEmbeddingStats(stats);
                          setShowEmbeddingStats(true);
                        } catch (error) {
                          console.error('埋め込みベクトル統計の取得に失敗しました:', error);
                          alert('埋め込みベクトル統計の取得に失敗しました。コンソールを確認してください。');
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#EFF6FF',
                        color: '#1E40AF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                      title="埋め込みベクトルの次元数と存在を確認"
                    >
                      埋め込み統計
                    </button>
                    
                    {/* データ品質レポート */}
                    <button
                      onClick={async () => {
                        try {
                          const { generateComprehensiveQualityReport } = await import('@/lib/dataQuality');
                          const report = await generateComprehensiveQualityReport(selectedOrganizationId || undefined);
                          setDataQualityReport(report);
                          setShowDataQualityReport(true);
                        } catch (error) {
                          console.error('データ品質レポートの生成に失敗しました:', error);
                          alert('データ品質レポートの生成に失敗しました。コンソールを確認してください。');
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#F0FDF4',
                        color: '#166534',
                        border: '1px solid #BBF7D0',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                      title="データ品質レポートを生成"
                    >
                      データ品質
                    </button>
                    
                    {/* 評価・テストシステム */}
                    <button
                      onClick={async () => {
                        try {
                          const { getTestCases } = await import('@/lib/evaluation');
                          const cases = getTestCases();
                          setTestCases(cases);
                          setShowEvaluationPanel(true);
                        } catch (error) {
                          console.error('評価システムの読み込みに失敗しました:', error);
                          alert('評価システムの読み込みに失敗しました。コンソールを確認してください。');
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FDE68A',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                      title="評価・テストシステム"
                    >
                      評価・テスト
                    </button>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          // JSON形式でエクスポート
                        const dataStr = JSON.stringify(searchResults, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `rag-search-results-${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#F3F4F6',
                        color: '#6B7280',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                      title="JSON形式でエクスポート"
                    >
                      JSON
                    </button>
                    <button
                      onClick={() => {
                        // CSV形式でエクスポート
                        const csvRows = [
                          ['タイプ', 'ID', '名前/説明', 'スコア', '類似度'],
                          ...searchResults.map(result => {
                            if (result.entity) {
                              return [
                                'エンティティ',
                                result.entity.id,
                                result.entity.name,
                                result.score.toFixed(3),
                                result.similarity.toFixed(3),
                              ];
                            } else if (result.relation) {
                              return [
                                'リレーション',
                                result.relation.id,
                                result.relation.description || result.relation.relationType,
                                result.score.toFixed(3),
                                result.similarity.toFixed(3),
                              ];
                            } else {
                              return [
                                'トピック',
                                result.topicId || '',
                                '',
                                result.score.toFixed(3),
                                result.similarity.toFixed(3),
                              ];
                            }
                          }),
                        ];
                        const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
                        const dataBlob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `rag-search-results-${new Date().toISOString().split('T')[0]}.csv`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#F3F4F6',
                        color: '#6B7280',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                      title="CSV形式でエクスポート"
                    >
                      CSV
                    </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ビューモードに応じた表示 */}
              {viewMode === 'list' ? (
                /* リスト表示 */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {searchResults.map((result, index) => (
                  <div
                    key={`${result.type}-${result.id}-${index}`}
                    onClick={() => setSelectedResult(result)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      padding: '16px',
                      border: selectedResult?.id === result.id ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedResult?.id !== result.id) {
                        e.currentTarget.style.borderColor = '#9CA3AF';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedResult?.id !== result.id) {
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: result.type === 'entity' ? '#DBEAFE' : result.type === 'relation' ? '#E9D5FF' : '#D1FAE5',
                            color: result.type === 'entity' ? '#1E40AF' : result.type === 'relation' ? '#6B21A8' : '#065F46',
                          }}>
                            {result.type === 'entity' ? 'エンティティ' : result.type === 'relation' ? 'リレーション' : 'トピック'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>
                            スコア: {(result.score * 100).toFixed(1)}%
                          </span>
                        </div>
                        {result.entity && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                {result.entity.name}
                              </h3>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/knowledge-graph?entityId=${result.entity!.id}`);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#3B82F6',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                                title="ナレッジグラフで表示"
                              >
                                グラフで表示
                              </button>
                            </div>
                            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                              {entityTypeLabels[result.entity.type] || result.entity.type}
                            </p>
                          </div>
                        )}
                        {result.relation && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                {relationTypeLabels[result.relation.relationType] || result.relation.relationType}
                              </h3>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/knowledge-graph?relationId=${result.relation!.id}`);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#3B82F6',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                                title="ナレッジグラフで表示"
                              >
                                グラフで表示
                              </button>
                            </div>
                            {result.relation.description && (
                              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                                {result.relation.description}
                              </p>
                            )}
                          </div>
                        )}
                        {result.type === 'topic' && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                トピック
                              </h3>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (result.meetingNoteId) {
                                    try {
                                      // 議事録から組織IDを取得
                                      const meetingNote = await getMeetingNoteById(result.meetingNoteId);
                                      if (meetingNote && meetingNote.organizationId) {
                                        router.push(`/organization/meeting?organizationId=${meetingNote.organizationId}&meetingId=${result.meetingNoteId}`);
                                      } else {
                                        alert('議事録の組織IDが取得できませんでした');
                                      }
                                    } catch (error) {
                                      console.error('議事録の取得エラー:', error);
                                      alert('議事録の取得に失敗しました');
                                    }
                                  }
                                }}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#3B82F6',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                                title="議事録ページで表示"
                              >
                                議事録で表示
                              </button>
                            </div>
                            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                              ID: {result.topicId}
                            </p>
                          </div>
                        )}
                        
                        {/* フィードバックボタン */}
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: '12px',
                            paddingTop: '12px',
                            borderTop: '1px solid #E5E7EB',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleSearchFeedback(result.id, result.type, true)}
                            style={{
                              background: searchFeedbackRatings[result.id] === true 
                                ? '#D1FAE5' 
                                : '#F3F4F6',
                              border: `1px solid ${searchFeedbackRatings[result.id] === true 
                                ? '#10B981' 
                                : '#D1D5DB'}`,
                              borderRadius: '6px',
                              padding: '6px 12px',
                              cursor: 'pointer',
                              color: searchFeedbackRatings[result.id] === true 
                                ? '#065F46' 
                                : '#6B7280',
                              fontSize: '12px',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (searchFeedbackRatings[result.id] !== true) {
                                e.currentTarget.style.background = '#E5F7F0';
                                e.currentTarget.style.borderColor = '#10B981';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (searchFeedbackRatings[result.id] !== true) {
                                e.currentTarget.style.background = '#F3F4F6';
                                e.currentTarget.style.borderColor = '#D1D5DB';
                              }
                            }}
                            title="関連性が高い"
                          >
                            ✓ 関連
                          </button>
                          <button
                            onClick={() => handleSearchFeedback(result.id, result.type, false)}
                            style={{
                              background: searchFeedbackRatings[result.id] === false 
                                ? '#FEE2E2' 
                                : '#F3F4F6',
                              border: `1px solid ${searchFeedbackRatings[result.id] === false 
                                ? '#EF4444' 
                                : '#D1D5DB'}`,
                              borderRadius: '6px',
                              padding: '6px 12px',
                              cursor: 'pointer',
                              color: searchFeedbackRatings[result.id] === false 
                                ? '#991B1B' 
                                : '#6B7280',
                              fontSize: '12px',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (searchFeedbackRatings[result.id] !== false) {
                                e.currentTarget.style.background = '#FEE2E2';
                                e.currentTarget.style.borderColor = '#EF4444';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (searchFeedbackRatings[result.id] !== false) {
                                e.currentTarget.style.background = '#F3F4F6';
                                e.currentTarget.style.borderColor = '#D1D5DB';
                              }
                            }}
                            title="関連性が低い"
                          >
                            ✗ 無関係
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                /* グラフ表示 */
                <div style={{ 
                  height: '600px', 
                  border: '1px solid #E5E7EB', 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  backgroundColor: '#FFFFFF',
                }}>
                  {isLoadingGraphData ? (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%',
                      color: '#6B7280',
                    }}>
                      グラフデータを準備中...
                    </div>
                  ) : graphEntities.length === 0 ? (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%',
                      color: '#9CA3AF',
                      flexDirection: 'column',
                      gap: '8px',
                    }}>
                      <div style={{ fontSize: '48px' }}>📊</div>
                      <div style={{ fontSize: '14px' }}>グラフ表示するデータがありません</div>
                      <div style={{ fontSize: '12px', color: '#D1D5DB' }}>
                        エンティティまたはリレーションを含む検索結果が必要です
                      </div>
                    </div>
                  ) : (
                    <KnowledgeGraph2D
                      entities={graphEntities}
                      relations={graphRelations}
                      isLoading={false}
                      maxNodes={200}
                      onEntityClick={(entity) => {
                        // エンティティをクリックしたら詳細表示
                        const result = searchResults.find(r => r.entity?.id === entity.id);
                        if (result) {
                          setSelectedResult(result);
                        }
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* 詳細表示 */}
          {selectedResult && (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937' }}>
                  詳細情報
                </h2>
                <button
                  onClick={() => setSelectedResult(null)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#F3F4F6',
                    color: '#6B7280',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  閉じる
                </button>
              </div>

              {selectedResult.entity && (
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>
                    {selectedResult.entity.name}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>タイプ: </span>
                      <span style={{ fontSize: '14px', color: '#1F2937' }}>
                        {entityTypeLabels[selectedResult.entity.type] || selectedResult.entity.type}
                      </span>
                    </div>
                    {selectedResult.entity.aliases && selectedResult.entity.aliases.length > 0 && (
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>別名: </span>
                        <span style={{ fontSize: '14px', color: '#1F2937' }}>
                          {selectedResult.entity.aliases.join(', ')}
                        </span>
                      </div>
                    )}
                    {selectedResult.entity.metadata && Object.keys(selectedResult.entity.metadata).length > 0 && (
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>メタデータ: </span>
                        <pre style={{ fontSize: '12px', color: '#1F2937', margin: '8px 0', padding: '8px', backgroundColor: '#F9FAFB', borderRadius: '4px', overflow: 'auto' }}>
                          {JSON.stringify(selectedResult.entity.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedResult.relation && (
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>
                    {relationTypeLabels[selectedResult.relation.relationType] || selectedResult.relation.relationType}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedResult.relation.description && (
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>説明: </span>
                        <span style={{ fontSize: '14px', color: '#1F2937' }}>
                          {selectedResult.relation.description}
                        </span>
                      </div>
                    )}
                    {selectedResult.relation.confidence !== undefined && (
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>信頼度: </span>
                        <span style={{ fontSize: '14px', color: '#1F2937' }}>
                          {(selectedResult.relation.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {selectedResult.relation.metadata && Object.keys(selectedResult.relation.metadata).length > 0 && (
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>メタデータ: </span>
                        <pre style={{ fontSize: '12px', color: '#1F2937', margin: '8px 0', padding: '8px', backgroundColor: '#F9FAFB', borderRadius: '4px', overflow: 'auto' }}>
                          {JSON.stringify(selectedResult.relation.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedResult.type === 'topic' && (
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>
                    トピック
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>トピックID: </span>
                      <span style={{ fontSize: '14px', color: '#1F2937' }}>{selectedResult.topicId}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>議事録ID: </span>
                      <span style={{ fontSize: '14px', color: '#1F2937' }}>{selectedResult.meetingNoteId}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 検索前の説明 */}
          {searchResults.length === 0 && !isSearching && (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '48px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <RAGSearchIcon size={64} color="#D1D5DB" />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginTop: '16px', marginBottom: '8px' }}>
                RAG検索でナレッジグラフを探索
              </h3>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                自然言語で検索クエリを入力すると、AIが意味的に類似したエンティティ、リレーション、トピックを検索します。
              </p>
              <div style={{ marginTop: '24px', textAlign: 'left', maxWidth: '600px', margin: '24px auto 0' }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937', marginBottom: '8px' }}>検索例:</p>
                <ul style={{ fontSize: '14px', color: '#6B7280', paddingLeft: '20px', margin: 0 }}>
                  <li>「自動車メーカーとの提携」</li>
                  <li>「AI技術を活用している企業」</li>
                  <li>「プロジェクトマネージャーが担当している案件」</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 分析モーダル */}
      {showAnalytics && analytics && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAnalytics(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '900px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
              検索履歴の分析
            </h2>

            {/* 基本統計 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: '#F0F9FF', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>総検索数</div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937' }}>{analytics.totalSearches}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>ユニーククエリ</div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937' }}>{analytics.uniqueQueries}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#FEF3C7', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>平均結果数</div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937' }}>{analytics.averageResultCount.toFixed(1)}</div>
              </div>
            </div>

            {/* よく使われる検索クエリ */}
            {analytics.topQueries.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>よく使われる検索クエリ</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {analytics.topQueries.map((item: any, index: number) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{item.query}</div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>平均結果: {item.avgResults.toFixed(1)}件</div>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#3B82F6' }}>{item.count}回</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* よく使われる組織 */}
            {analytics.topOrganizations.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>よく検索される組織</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {analytics.topOrganizations.map((item: any, index: number) => {
                    const org = organizations.find(o => o.id === item.organizationId);
                    return (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                        <div style={{ fontSize: '14px' }}>{org?.name || item.organizationId}</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#3B82F6' }}>{item.count}回</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 時間分布 */}
            {analytics.timeDistribution.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>時間帯別の検索数</h3>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '150px' }}>
                  {analytics.timeDistribution.map((item: any, index: number) => {
                    const maxCount = Math.max(...analytics.timeDistribution.map((d: any) => d.count));
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    return (
                      <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '100%', backgroundColor: '#3B82F6', height: `${height}%`, borderRadius: '4px 4px 0 0', minHeight: item.count > 0 ? '4px' : '0' }} />
                        <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '4px' }}>{item.hour}時</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 最近のトレンド */}
            {analytics.recentTrends.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>最近のトレンド（日別）</h3>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '100px' }}>
                  {analytics.recentTrends.map((item: any, index: number) => {
                    const maxCount = Math.max(...analytics.recentTrends.map((d: any) => d.count));
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    return (
                      <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '100%', backgroundColor: '#10B981', height: `${height}%`, borderRadius: '4px 4px 0 0', minHeight: item.count > 0 ? '4px' : '0' }} />
                        <div style={{ fontSize: '9px', color: '#6B7280', marginTop: '4px', writingMode: 'vertical-rl' }}>
                          {new Date(item.date).getMonth() + 1}/{new Date(item.date).getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => setShowAnalytics(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#6B7280',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 埋め込みベクトル統計モーダル */}
      {showEmbeddingStats && embeddingStats && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowEmbeddingStats(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '900px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
                埋め込みベクトル統計
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={async () => {
                    try {
                      // 実際のエンティティとリレーションの総数を取得
                      const [entities, relations] = await Promise.all([
                        getAllEntities(),
                        getAllRelations(),
                      ]);
                      setActualEntityCount(entities.length);
                      setActualRelationCount(relations.length);
                      
                      // 組織IDフィルターなしで再取得
                      const stats = await checkAllEmbeddings(undefined);
                      setEmbeddingStats(stats);
                    } catch (error) {
                      console.error('埋め込みベクトル統計の取得に失敗しました:', error);
                      alert('埋め込みベクトル統計の取得に失敗しました。コンソールを確認してください。');
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#F3F4F6',
                    color: '#6B7280',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                  title="すべての組織の埋め込みを確認"
                >
                  全組織表示
                </button>
                <button
                  onClick={() => setShowEmbeddingStats(false)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#F3F4F6',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            {selectedOrganizationId && (
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: '#EFF6FF', 
                borderRadius: '6px', 
                marginBottom: '16px',
                fontSize: '12px',
                color: '#1E40AF'
              }}>
                ⚠️ 現在、組織ID「{selectedOrganizationId}」でフィルタリングされています。「全組織表示」ボタンをクリックすると、すべての組織の埋め込みを確認できます。
              </div>
            )}

            {/* エンティティ埋め込み */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>エンティティ埋め込み</h3>
              {(actualEntityCount !== null || embeddingStats.entities.actualTotal !== undefined) && (
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: (actualEntityCount ?? embeddingStats.entities.actualTotal ?? 0) > embeddingStats.entities.total ? '#FEF3C7' : '#F0FDF4', 
                  borderRadius: '6px', 
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: (actualEntityCount ?? embeddingStats.entities.actualTotal ?? 0) > embeddingStats.entities.total ? '#92400E' : '#065F46'
                }}>
                  {(actualEntityCount ?? embeddingStats.entities.actualTotal ?? 0) > embeddingStats.entities.total ? (
                    <>⚠️ 実際のエンティティ総数: {actualEntityCount ?? embeddingStats.entities.actualTotal ?? 0}件（埋め込みが生成されていないエンティティ: {(actualEntityCount ?? embeddingStats.entities.actualTotal ?? 0) - embeddingStats.entities.total}件）</>
                  ) : (
                    <>✅ 実際のエンティティ総数: {actualEntityCount ?? embeddingStats.entities.actualTotal ?? 0}件（すべて埋め込み済み）</>
                  )}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みテーブル総数</div>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{embeddingStats.entities.total}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みあり</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#16A34A' }}>{embeddingStats.entities.withEmbeddings}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みなし</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#DC2626' }}>{embeddingStats.entities.withoutEmbeddings}</div>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>次元数分布:</div>
                <pre style={{ fontSize: '12px', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
                  {JSON.stringify(embeddingStats.entities.dimensions, null, 2)}
                </pre>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>モデル分布:</div>
                <pre style={{ fontSize: '12px', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
                  {JSON.stringify(embeddingStats.entities.models, null, 2)}
                </pre>
              </div>
            </div>

            {/* リレーション埋め込み */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>リレーション埋め込み</h3>
              {(actualRelationCount !== null || embeddingStats.relations.actualTotal !== undefined) && (
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: (actualRelationCount ?? embeddingStats.relations.actualTotal ?? 0) > embeddingStats.relations.total ? '#FEF3C7' : '#F0FDF4', 
                  borderRadius: '6px', 
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: (actualRelationCount ?? embeddingStats.relations.actualTotal ?? 0) > embeddingStats.relations.total ? '#92400E' : '#065F46'
                }}>
                  {(actualRelationCount ?? embeddingStats.relations.actualTotal ?? 0) > embeddingStats.relations.total ? (
                    <>⚠️ 実際のリレーション総数: {actualRelationCount ?? embeddingStats.relations.actualTotal ?? 0}件（埋め込みが生成されていないリレーション: {(actualRelationCount ?? embeddingStats.relations.actualTotal ?? 0) - embeddingStats.relations.total}件）</>
                  ) : (
                    <>✅ 実際のリレーション総数: {actualRelationCount ?? embeddingStats.relations.actualTotal ?? 0}件（すべて埋め込み済み）</>
                  )}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みテーブル総数</div>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{embeddingStats.relations.total}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みあり</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#16A34A' }}>{embeddingStats.relations.withEmbeddings}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みなし</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#DC2626' }}>{embeddingStats.relations.withoutEmbeddings}</div>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>次元数分布:</div>
                <pre style={{ fontSize: '12px', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
                  {JSON.stringify(embeddingStats.relations.dimensions, null, 2)}
                </pre>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>モデル分布:</div>
                <pre style={{ fontSize: '12px', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
                  {JSON.stringify(embeddingStats.relations.models, null, 2)}
                </pre>
              </div>
            </div>

            {/* トピック埋め込み */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>トピック埋め込み</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>総数</div>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{embeddingStats.topics.total}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みあり</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#16A34A' }}>{embeddingStats.topics.withEmbeddings}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みなし</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#DC2626' }}>{embeddingStats.topics.withoutEmbeddings}</div>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>次元数分布:</div>
                <pre style={{ fontSize: '12px', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
                  {JSON.stringify(embeddingStats.topics.dimensions, null, 2)}
                </pre>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>モデル分布:</div>
                <pre style={{ fontSize: '12px', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
                  {JSON.stringify(embeddingStats.topics.models, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* データ品質レポートモーダル */}
      {showDataQualityReport && dataQualityReport && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDataQualityReport(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '900px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
                データ品質レポート
              </h2>
              <button
                onClick={() => setShowDataQualityReport(false)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#F3F4F6',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* 全体品質スコア */}
            <div style={{ 
              padding: '16px', 
              backgroundColor: dataQualityReport.overallQualityScore >= 80 ? '#F0FDF4' : dataQualityReport.overallQualityScore >= 60 ? '#FEF3C7' : '#FEE2E2',
              borderRadius: '8px',
              marginBottom: '24px',
              border: `2px solid ${dataQualityReport.overallQualityScore >= 80 ? '#10B981' : dataQualityReport.overallQualityScore >= 60 ? '#F59E0B' : '#EF4444'}`,
            }}>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>全体品質スコア</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: dataQualityReport.overallQualityScore >= 80 ? '#065F46' : dataQualityReport.overallQualityScore >= 60 ? '#92400E' : '#991B1B' }}>
                {dataQualityReport.overallQualityScore.toFixed(1)} / 100
              </div>
            </div>

            {/* エンティティ品質 */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>エンティティ</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>総数</div>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{dataQualityReport.entities.totalEntities}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みあり</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#10B981' }}>{dataQualityReport.entities.entitiesWithEmbeddings}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#FEE2E2', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みなし</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#EF4444' }}>{dataQualityReport.entities.entitiesWithoutEmbeddings}</div>
                </div>
              </div>
              <div style={{ padding: '8px 12px', backgroundColor: '#F9FAFB', borderRadius: '6px', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  ChromaDB同期状況: <strong>{dataQualityReport.entities.chromaDbSyncStatus === 'synced' ? '✅ 同期済み' : dataQualityReport.entities.chromaDbSyncStatus === 'partial' ? '⚠️ 部分的' : dataQualityReport.entities.chromaDbSyncStatus === 'outdated' ? '❌ 未同期' : 'N/A'}</strong>
                </div>
              </div>
              <div style={{ padding: '8px 12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  品質スコア: <strong>{dataQualityReport.entities.qualityScore.toFixed(1)} / 100</strong>
                </div>
              </div>
            </div>

            {/* リレーション品質 */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>リレーション</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>総数</div>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{dataQualityReport.relations.totalRelations}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みあり</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#10B981' }}>{dataQualityReport.relations.relationsWithEmbeddings}</div>
                </div>
              </div>
            </div>

            {/* トピック品質 */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>トピック</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>総数</div>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{dataQualityReport.topics.totalTopics}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みあり</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#10B981' }}>{dataQualityReport.topics.topicsWithEmbeddings}</div>
                </div>
              </div>
            </div>

            {/* 不整合リスト */}
            {dataQualityReport.entities.inconsistencies.length > 0 || 
             dataQualityReport.relations.inconsistencies.length > 0 || 
             dataQualityReport.topics.inconsistencies.length > 0 ? (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#EF4444' }}>不整合</h3>
                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {[...dataQualityReport.entities.inconsistencies, ...dataQualityReport.relations.inconsistencies, ...dataQualityReport.topics.inconsistencies].map((inc, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#FEE2E2',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        fontSize: '12px',
                        color: '#991B1B',
                      }}
                    >
                      <strong>{inc.type}:</strong> {inc.details}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ 
                padding: '16px', 
                backgroundColor: '#F0FDF4', 
                borderRadius: '8px',
                textAlign: 'center',
                color: '#065F46',
                fontSize: '14px',
              }}>
                ✅ 不整合は見つかりませんでした
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => setShowDataQualityReport(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#6B7280',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 評価・テストシステムパネル */}
      {showEvaluationPanel && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowEvaluationPanel(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '1200px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
                評価・テストシステム
              </h2>
              <button
                onClick={() => setShowEvaluationPanel(false)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#F3F4F6',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* タブ */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #E5E7EB' }}>
              <button
                onClick={() => {
                  const { getTestCases } = require('@/lib/evaluation');
                  setTestCases(getTestCases());
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: '2px solid #3B82F6',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                テストケース管理
              </button>
              <button
                onClick={async () => {
                  const { getEvaluationReports } = await import('@/lib/evaluation');
                  const reports = getEvaluationReports(10);
                  if (reports.length > 0) {
                    setEvaluationReport(reports[0]);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                評価レポート
              </button>
            </div>

            {/* テストケース管理 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>テストケース一覧</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={async () => {
                      const testCaseId = `test-${Date.now()}`;
                      const newTestCase = {
                        id: testCaseId,
                        query: 'サンプルクエリ', // デフォルトでサンプルクエリを設定
                        expectedTopics: [],
                        expectedEntities: [],
                        expectedRelations: [],
                        category: 'general',
                        description: '',
                      };
                      const { saveTestCase, getTestCases } = await import('@/lib/evaluation');
                      saveTestCase(newTestCase);
                      setTestCases(getTestCases());
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    + 新規追加
                  </button>
                  <button
                    onClick={async () => {
                      // クエリが空のテストケースを除外
                      const validTestCases = testCases.filter(tc => tc.query && tc.query.trim().length > 0);
                      if (validTestCases.length === 0) {
                        alert('実行可能なテストケースがありません。クエリが設定されているテストケースが必要です。');
                        return;
                      }
                      
                      if (confirm(`すべてのテストケース（${validTestCases.length}件）を実行しますか？`)) {
                        setIsRunningEvaluation(true);
                        try {
                          const { runTestSuite } = await import('@/lib/evaluation');
                          const report = await runTestSuite(validTestCases, selectedOrganizationId || undefined);
                          setEvaluationReport(report);
                          alert(`評価完了: ${report.passedTests}/${report.totalTests}件合格（平均スコア: ${(report.averageOverallScore * 100).toFixed(1)}%）`);
                        } catch (error) {
                          console.error('評価実行エラー:', error);
                          alert('評価の実行に失敗しました。コンソールを確認してください。');
                        } finally {
                          setIsRunningEvaluation(false);
                        }
                      }
                    }}
                    disabled={isRunningEvaluation || testCases.length === 0 || testCases.every(tc => !tc.query || tc.query.trim().length === 0)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: isRunningEvaluation || testCases.length === 0 ? '#D1D5DB' : '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: isRunningEvaluation || testCases.length === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isRunningEvaluation ? '実行中...' : 'すべて実行'}
                  </button>
                </div>
              </div>

              {testCases.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
                  テストケースがありません。「+ 新規追加」ボタンで追加してください。
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {testCases.map((testCase) => (
                    <div
                      key={testCase.id}
                      style={{
                        padding: '16px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                            {testCase.query || '(クエリ未設定)'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>
                            カテゴリ: {testCase.category} | ID: {testCase.id}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={async () => {
                              // クエリが空の場合は警告
                              if (!testCase.query || testCase.query.trim().length === 0) {
                                alert('テストケースのクエリが空です。クエリを設定してから実行してください。');
                                return;
                              }
                              
                              const { runTestCase, getTestCases } = await import('@/lib/evaluation');
                              setIsRunningEvaluation(true);
                              try {
                                const result = await runTestCase(testCase, selectedOrganizationId || undefined);
                                if (result.passed) {
                                  alert(`テストケースを実行しました: 合格（スコア: ${(result.overallScore * 100).toFixed(1)}%）`);
                                } else {
                                  alert(`テストケースを実行しました: 不合格（スコア: ${(result.overallScore * 100).toFixed(1)}%）`);
                                }
                              } catch (error) {
                                console.error('テストケース実行エラー:', error);
                                alert('テストケースの実行に失敗しました');
                              } finally {
                                setIsRunningEvaluation(false);
                              }
                            }}
                            disabled={isRunningEvaluation || !testCase.query || testCase.query.trim().length === 0}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#3B82F6',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: isRunningEvaluation ? 'not-allowed' : 'pointer',
                            }}
                          >
                            実行
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('このテストケースを削除しますか？')) {
                                const { deleteTestCase, getTestCases } = await import('@/lib/evaluation');
                                deleteTestCase(testCase.id);
                                setTestCases(getTestCases());
                              }
                            }}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#EF4444',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
                        <div>期待されるトピック: {testCase.expectedTopics?.length || 0}件</div>
                        <div>期待されるエンティティ: {testCase.expectedEntities?.length || 0}件</div>
                        <div>期待されるリレーション: {testCase.expectedRelations?.length || 0}件</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 評価レポート表示 */}
            {evaluationReport && (
              <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>最新の評価レポート</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>合格率</div>
                    <div style={{ fontSize: '20px', fontWeight: 600 }}>
                      {evaluationReport.passedTests}/{evaluationReport.totalTests}
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>関連性スコア</div>
                    <div style={{ fontSize: '20px', fontWeight: 600 }}>
                      {(evaluationReport.averageRelevanceScore * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>精度スコア</div>
                    <div style={{ fontSize: '20px', fontWeight: 600 }}>
                      {(evaluationReport.averageAccuracyScore * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>全体スコア</div>
                    <div style={{ fontSize: '20px', fontWeight: 600 }}>
                      {(evaluationReport.averageOverallScore * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => setShowEvaluationPanel(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#6B7280',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
