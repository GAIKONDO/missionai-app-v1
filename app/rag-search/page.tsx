'use client';

import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';
import { getCacheStats } from '@/lib/ragSearchCache';
import { getOrgTreeFromDb, getAllOrganizationsFromTree } from '@/lib/orgApi';
import type { SearchHistory } from './types';
import AnalyticsModal from './components/modals/AnalyticsModal';
import EmbeddingStatsModal from './components/modals/EmbeddingStatsModal';
import DataQualityReportModal from './components/modals/DataQualityReportModal';
import EvaluationPanelModal from './components/modals/EvaluationPanelModal';
import SearchBar from './components/SearchBar';
import SearchFilters from './components/SearchFilters';
import SearchResultsHeader from './components/SearchResultsHeader';
import SearchResultsList from './components/SearchResultsList';
import { useSearchHistory } from './hooks/useSearchHistory';
import { useSearchFilters } from './hooks/useSearchFilters';
import { useRAGSearch } from './hooks/useRAGSearch';
import { useGraphData } from './hooks/useGraphData';
import { useModalHandlers } from './hooks/useModalHandlers';
import { setupDiagnosticTools } from './utils/diagnoseRAGSearch';
import { devWarn } from './utils/devLog';
import { entityTypeLabels, relationTypeLabels } from './constants/labels';
import SearchResultDetail from './components/SearchResultDetail';
import SearchEmptyState from './components/SearchEmptyState';
import GraphView from './components/GraphView';
import PageHeader from './components/PageHeader';

export default function RAGSearchPage() {
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
          
          // 組織が選択されていない場合、最初の組織を自動選択
          if (orgs.length > 0 && !searchFiltersHook.selectedOrganizationId) {
            console.log('[RAGSearchPage] 組織が選択されていないため、最初の組織を自動選択:', orgs[0].id);
            searchFiltersHook.setSelectedOrganizationId(orgs[0].id);
          }
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

    console.log('[RAGSearchPage] 検索実行:', { query, searchFilters });
    
    // organizationIdが未指定の場合、全組織横断検索が実行される
    if (!searchFilters.organizationId) {
      console.log('[RAGSearchPage] organizationIdが未指定のため、全組織横断検索を実行します。');
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
    <Layout>
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
    </Layout>
  );
}
