/**
 * RAG検索タブコンテンツ
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';
import { getCacheStats } from '@/lib/ragSearchCache';
import { getOrgTreeFromDb, getAllOrganizationsFromTree } from '@/lib/orgApi';
import type { SearchHistory } from '@/app/rag-search/types';
import AnalyticsModal from '@/app/rag-search/components/modals/AnalyticsModal';
import EmbeddingStatsModal from '@/app/rag-search/components/modals/EmbeddingStatsModal';
import DataQualityReportModal from '@/app/rag-search/components/modals/DataQualityReportModal';
import EvaluationPanelModal from '@/app/rag-search/components/modals/EvaluationPanelModal';
import SearchBar from '@/app/rag-search/components/SearchBar';
import SearchFilters from '@/app/rag-search/components/SearchFilters';
import SearchResultsHeader from '@/app/rag-search/components/SearchResultsHeader';
import SearchResultsList from '@/app/rag-search/components/SearchResultsList';
import { useSearchHistory } from '@/app/rag-search/hooks/useSearchHistory';
import { useSearchFilters } from '@/app/rag-search/hooks/useSearchFilters';
import { useRAGSearch } from '@/app/rag-search/hooks/useRAGSearch';
import { useGraphData } from '@/app/rag-search/hooks/useGraphData';
import { useModalHandlers } from '@/app/rag-search/hooks/useModalHandlers';
import { setupDiagnosticTools } from '@/app/rag-search/utils/diagnoseRAGSearch';
import { devWarn } from '@/app/rag-search/utils/devLog';
import { entityTypeLabels, relationTypeLabels } from '@/app/rag-search/constants/labels';
import SearchResultDetail from '@/app/rag-search/components/SearchResultDetail';
import SearchEmptyState from '@/app/rag-search/components/SearchEmptyState';
import GraphView from '@/app/rag-search/components/GraphView';
import PageHeader from '@/app/rag-search/components/PageHeader';

export function RAGSearchTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState<KnowledgeGraphSearchResult | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; title?: string; type?: string }>>([]);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [cacheStats, setCacheStats] = useState<{ memoryCacheSize: number; localStorageCacheSize: number; totalSize: number }>({ memoryCacheSize: 0, localStorageCacheSize: 0, totalSize: 0 });
  const [useCache, setUseCache] = useState<boolean>(true);
  const [searchFeedbackRatings, setSearchFeedbackRatings] = useState<Record<string, boolean>>({});
  const [dataQualityReport, setDataQualityReport] = useState<any>(null);
  const [showDataQualityReport, setShowDataQualityReport] = useState(false);
  const [embeddingStats, setEmbeddingStats] = useState<any>(null);
  const [showEmbeddingStats, setShowEmbeddingStats] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showEvaluationPanel, setShowEvaluationPanel] = useState(false);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [evaluationReport, setEvaluationReport] = useState<any>(null);
  const [isRunningEvaluation, setIsRunningEvaluation] = useState(false);
  const [actualEntityCount, setActualEntityCount] = useState<number | null>(null);
  const [actualRelationCount, setActualRelationCount] = useState<number | null>(null);

  // カスタムフック
  const searchHistoryHook = useSearchHistory();
  const searchFiltersHook = useSearchFilters();
  const { graphEntities, graphRelations, isLoadingGraphData, prepareGraphData } = useGraphData();
  
  // モーダルハンドラー
  const modalHandlers = useModalHandlers({
    selectedOrganizationId: searchFiltersHook.selectedOrganizationId,
    setEmbeddingStats,
    setShowEmbeddingStats,
    setActualEntityCount,
    setActualRelationCount,
    setAnalytics,
    setShowAnalytics,
    setDataQualityReport,
    setShowDataQualityReport,
    setTestCases,
    setShowEvaluationPanel,
  });
  
  // RAG検索フック
  const ragSearchHook = useRAGSearch({
    useCache,
    onSearchComplete: async (results, query) => {
      // 検索履歴に保存
      const filterParams = searchFiltersHook.getFilterParams();
      searchHistoryHook.saveSearchHistory(query, results.length, {
        organizationId: filterParams.organizationId,
        entityType: filterParams.entityType,
        relationType: filterParams.relationType,
      });
      
      // グラフ表示用のデータを準備（タイムアウト付き）
      try {
        await Promise.race([
          prepareGraphData(results),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('グラフデータの準備がタイムアウトしました')), 30000)
          )
        ]);
      } catch (graphError: any) {
        devWarn('グラフデータの準備エラー（検索は続行）:', graphError);
      }
    },
    onSearchError: (error) => {
      if (error.message.includes('タイムアウト')) {
        alert(error.message);
      } else {
        alert(`検索エラー: ${error.message}`);
      }
    },
  });

  // ブラウザコンソールから呼び出せるようにグローバルに公開
  useEffect(() => {
    setupDiagnosticTools();
  }, []);

  // 組織データの読み込み
  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const orgTree = await getOrgTreeFromDb();
        if (orgTree) {
          const allOrgs = getAllOrganizationsFromTree(orgTree);
          const orgs = allOrgs.map(org => ({
            id: org.id,
            name: org.name || org.title || org.id,
            title: org.title,
            type: (org as any).type || 'organization',
          }));
          setOrganizations(orgs);
          
          // デフォルトでは全ての組織（選択なし）で検索
          // 組織の自動選択は行わない
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
  }, [ragSearchHook.searchResults]);

  // 履歴から検索を実行
  const executeHistorySearch = (historyItem: SearchHistory) => {
    setSearchQuery(historyItem.query);
    if (historyItem.filters) {
      searchFiltersHook.setSelectedOrganizationId(historyItem.filters.organizationId || '');
      searchFiltersHook.setEntityTypeFilter(historyItem.filters.entityType || 'all');
      searchFiltersHook.setRelationTypeFilter(historyItem.filters.relationType || 'all');
    }
    searchHistoryHook.setShowHistory(false);
    // 検索を実行
    setTimeout(() => {
      handleSearchWithQuery(historyItem.query, historyItem.filters);
    }, 100);
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
      
      setSearchFeedbackRatings(prev => ({ ...prev, [resultId]: relevant }));
    } catch (error) {
      console.error('[RAGSearch] フィードバック保存エラー:', error);
    }
  };
  // RAG検索の実行（内部関数）
  const handleSearchWithQuery = async (query: string, filters?: SearchHistory['filters']) => {
    setSelectedResult(null);
    
    // フィルターのマージ（履歴からの検索の場合は履歴のフィルターを優先）
    const searchFilters = searchFiltersHook.getSearchFilters({
      organizationId: filters?.organizationId,
      entityType: filters?.entityType,
      relationType: filters?.relationType,
    });

    console.log('[RAGSearchTab] 検索実行:', { query, searchFilters });
    
    // virtual-rootが選択されている場合は、全組織横断検索を実行（organizationIdを未指定にする）
    if (searchFilters.organizationId === 'virtual-root') {
      console.log('[RAGSearchTab] virtual-rootが選択されているため、全組織横断検索を実行します。');
      searchFilters.organizationId = undefined;
    }
    
    // organizationIdが未指定の場合、全組織横断検索が実行される
    if (!searchFilters.organizationId) {
      console.log('[RAGSearchTab] organizationIdが未指定のため、全組織横断検索を実行します。');
    }

    await ragSearchHook.search(query, searchFilters, 10);
  };

  // RAG検索の実行（公開関数）
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }
    await handleSearchWithQuery(searchQuery);
  };

  // 結果のタイプ別にグループ化
  const groupedResults = useMemo(() => {
    const groups = {
      entities: ragSearchHook.searchResults.filter(r => r.type === 'entity'),
      relations: ragSearchHook.searchResults.filter(r => r.type === 'relation'),
      topics: ragSearchHook.searchResults.filter(r => r.type === 'topic'),
    };
    return groups;
  }, [ragSearchHook.searchResults]);

  return (
    <>
      <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB', padding: '24px' }}>
        <div style={{ width: '100%' }}>
          <PageHeader />

          {/* 検索バー */}
          <SearchBar
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearch}
            isSearching={ragSearchHook.isSearching}
            showHistory={searchHistoryHook.showHistory}
            onShowHistoryChange={searchHistoryHook.setShowHistory}
            searchHistory={searchHistoryHook.searchHistory}
            favoriteSearches={searchHistoryHook.favoriteSearches}
            onExecuteHistorySearch={executeHistorySearch}
            onToggleFavorite={searchHistoryHook.toggleFavorite}
            onDeleteHistoryItem={searchHistoryHook.deleteHistoryItem}
            onClearAllHistory={searchHistoryHook.clearAllHistory}
            onClearAllFavorites={searchHistoryHook.clearAllFavorites}
            onShowFiltersToggle={() => searchFiltersHook.setShowFilters(!searchFiltersHook.showFilters)}
            showFilters={searchFiltersHook.showFilters}
            onShowEmbeddingStats={modalHandlers.handleShowEmbeddingStats}
            onShowAnalytics={modalHandlers.handleShowAnalytics}
            onShowEvaluationPanel={modalHandlers.handleShowEvaluationPanel}
          />

          {/* フィルター */}
          <SearchFilters
            showFilters={searchFiltersHook.showFilters}
            organizations={organizations}
            selectedOrganizationId={searchFiltersHook.selectedOrganizationId}
            onSelectedOrganizationIdChange={searchFiltersHook.setSelectedOrganizationId}
            entityTypeFilter={searchFiltersHook.entityTypeFilter}
            onEntityTypeFilterChange={searchFiltersHook.setEntityTypeFilter}
            relationTypeFilter={searchFiltersHook.relationTypeFilter}
            onRelationTypeFilterChange={searchFiltersHook.setRelationTypeFilter}
            dateFilterType={searchFiltersHook.dateFilterType}
            onDateFilterTypeChange={searchFiltersHook.setDateFilterType}
            dateRangeStart={searchFiltersHook.dateRangeStart}
            onDateRangeStartChange={searchFiltersHook.setDateRangeStart}
            dateRangeEnd={searchFiltersHook.dateRangeEnd}
            onDateRangeEndChange={searchFiltersHook.setDateRangeEnd}
            filterLogic={searchFiltersHook.filterLogic}
            onFilterLogicChange={searchFiltersHook.setFilterLogic}
            savedFilterPresets={searchFiltersHook.savedFilterPresets}
            onSavedFilterPresetsChange={searchFiltersHook.setSavedFilterPresets}
            showPresetMenu={searchFiltersHook.showPresetMenu}
            onShowPresetMenuChange={searchFiltersHook.setShowPresetMenu}
            entityTypeLabels={entityTypeLabels}
            relationTypeLabels={relationTypeLabels}
          />

          {/* 検索結果 */}
          {ragSearchHook.searchResults.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <SearchResultsHeader
                totalCount={ragSearchHook.searchResults.length}
                groupedResults={groupedResults}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                cacheStats={cacheStats}
                onCacheStatsUpdate={setCacheStats}
                useCache={useCache}
                onUseCacheChange={setUseCache}
                selectedOrganizationId={searchFiltersHook.selectedOrganizationId}
                onShowEmbeddingStats={modalHandlers.handleShowEmbeddingStats}
                onShowDataQualityReport={modalHandlers.handleShowDataQualityReport}
                onShowEvaluationPanel={modalHandlers.handleShowEvaluationPanel}
                searchResults={ragSearchHook.searchResults}
              />

              {/* ビューモードに応じた表示 */}
              {viewMode === 'list' ? (
                <SearchResultsList
                  results={ragSearchHook.searchResults}
                  selectedResult={selectedResult}
                  onSelectResult={setSelectedResult}
                  onFeedback={handleSearchFeedback}
                  feedbackRatings={searchFeedbackRatings}
                  entityTypeLabels={entityTypeLabels}
                  relationTypeLabels={relationTypeLabels}
                />
              ) : (
                <GraphView
                  graphEntities={graphEntities}
                  graphRelations={graphRelations}
                  isLoadingGraphData={isLoadingGraphData}
                  searchResults={ragSearchHook.searchResults}
                  onEntityClick={setSelectedResult}
                />
              )}
            </div>
          )}

          {/* 詳細表示 */}
          {selectedResult && (
            <SearchResultDetail
              result={selectedResult}
              onClose={() => setSelectedResult(null)}
            />
          )}

          {/* 検索前の説明 */}
          {ragSearchHook.searchResults.length === 0 && !ragSearchHook.isSearching && (
            <SearchEmptyState />
          )}
        </div>
      </div>

      {/* 分析モーダル */}
      <AnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        analytics={analytics}
        organizations={organizations}
      />

      {/* 埋め込みベクトル統計モーダル */}
      <EmbeddingStatsModal
        isOpen={showEmbeddingStats}
        onClose={() => setShowEmbeddingStats(false)}
        embeddingStats={embeddingStats}
        selectedOrganizationId={searchFiltersHook.selectedOrganizationId}
        onStatsUpdate={setEmbeddingStats}
        actualEntityCount={actualEntityCount}
        actualRelationCount={actualRelationCount}
        onCountsUpdate={(entityCount, relationCount) => {
          setActualEntityCount(entityCount);
          setActualRelationCount(relationCount);
        }}
      />

      {/* データ品質レポートモーダル */}
      <DataQualityReportModal
        isOpen={showDataQualityReport}
        onClose={() => setShowDataQualityReport(false)}
        dataQualityReport={dataQualityReport}
      />

      {/* 評価・テストシステムパネル */}
      <EvaluationPanelModal
        isOpen={showEvaluationPanel}
        onClose={() => setShowEvaluationPanel(false)}
        testCases={testCases}
        evaluationReport={evaluationReport}
        isRunningEvaluation={isRunningEvaluation}
        selectedOrganizationId={searchFiltersHook.selectedOrganizationId}
        onTestCasesUpdate={setTestCases}
        onEvaluationReportUpdate={setEvaluationReport}
        onRunningEvaluationUpdate={setIsRunningEvaluation}
      />
    </>
  );
}

