/**
 * ナレッジグラフタブコンテンツ
 */

'use client';

import { useState } from 'react';
// import KnowledgeGraph2D from '@/components/KnowledgeGraph2D';
import KnowledgeGraph3D from '@/components/KnowledgeGraph3D';
import { useEmbeddingRegeneration } from '@/components/EmbeddingRegenerationContext';
import VersionCheckModal from '@/components/knowledge-graph/modals/VersionCheckModal';
import EntityDetailModal from '@/components/knowledge-graph/modals/EntityDetailModal';
import RelationDetailModal from '@/components/knowledge-graph/modals/RelationDetailModal';
import DeleteEntityModal from '@/components/knowledge-graph/modals/DeleteEntityModal';
import BulkDeleteModal from '@/components/knowledge-graph/modals/BulkDeleteModal';
import EmbeddingRegenerationModal from '@/components/knowledge-graph/modals/EmbeddingRegenerationModal';
import KnowledgeGraphFilters from '@/components/knowledge-graph/filters/KnowledgeGraphFilters';
import EntityRelationList from '@/components/knowledge-graph/EntityRelationList';
import ViewModeSwitcher from '@/components/knowledge-graph/ViewModeSwitcher';
import { useKnowledgeGraphData } from '@/components/knowledge-graph/hooks/useKnowledgeGraphData';
import { useKnowledgeGraphFilters } from '@/components/knowledge-graph/hooks/useKnowledgeGraphFilters';
import { useEntityDeletion } from '@/components/knowledge-graph/hooks/useEntityDeletion';
import { useEmbeddingRegenerationState } from '@/components/knowledge-graph/hooks/useEmbeddingRegenerationState';
import { useVersionCheck } from '@/components/knowledge-graph/hooks/useVersionCheck';
import { useDevConsoleCommands } from '@/components/knowledge-graph/hooks/useDevConsoleCommands';
import { entityTypeLabels, relationTypeLabels } from '@/components/knowledge-graph/constants/typeLabels';

export function KnowledgeGraphTab() {
  // データ読み込みロジックをカスタムフックに抽出
  const {
    entities,
    setEntities,
    relations,
    setRelations,
    topics,
    setTopics,
    organizations,
    setOrganizations,
    members,
    setMembers,
    isLoading,
    isLoadingFilters,
    searchResultEntityIds,
    setSearchResultEntityIds,
    searchResultRelationIds,
    setSearchResultRelationIds,
    highlightedEntityId,
    setHighlightedEntityId,
    highlightedRelationId,
    setHighlightedRelationId,
    selectedEntity,
    setSelectedEntity,
    selectedRelation,
    setSelectedRelation,
    viewMode,
    setViewMode,
  } = useKnowledgeGraphData();

  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [relationSearchQuery, setRelationSearchQuery] = useState('');
  const [relationTypeFilter, setRelationTypeFilter] = useState<string>('all');
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  
  // ページネーション状態
  const [entityPage, setEntityPage] = useState(1);
  const [relationPage, setRelationPage] = useState(1);
  const [topicPage, setTopicPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  
  // フィルター状態
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<Set<string>>(new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [selectedImportance, setSelectedImportance] = useState<Set<'high' | 'medium' | 'low'>>(new Set());
  const [showOrganizationFilter, setShowOrganizationFilter] = useState(false);
  const [showMemberFilter, setShowMemberFilter] = useState(false);
  const [showImportanceFilter, setShowImportanceFilter] = useState(false);
  
  // 埋め込み再生成のグローバル状態管理
  const { startRegeneration, completeRegeneration, cancelRegeneration } = useEmbeddingRegeneration();
  
  // 埋め込み再生成関連の状態をカスタムフックに抽出
  const {
    showRegenerationModal,
    setShowRegenerationModal,
    selectedTypeFilter,
    setSelectedTypeFilter,
    regenerationType,
    setRegenerationType,
    missingCounts,
    setMissingCounts,
    isCountingMissing,
    setIsCountingMissing,
    showCleanupConfirm,
    setShowCleanupConfirm,
    showRepairEntityConfirm,
    setShowRepairEntityConfirm,
    showRepairRelationConfirm,
    setShowRepairRelationConfirm,
    showRepairTopicConfirm,
    setShowRepairTopicConfirm,
    isRegeneratingEmbeddings,
    setIsRegeneratingEmbeddings,
    regenerationProgress,
    setRegenerationProgress,
    isCancelledRef,
    updateMissingCountsOrganization,
  } = useEmbeddingRegenerationState({
    entities,
    relations,
    topics,
  });
  // バージョンチェック関連のロジックをカスタムフックに抽出
  const {
    showVersionCheck,
    setShowVersionCheck,
    outdatedEntities,
    outdatedRelations,
    isCheckingVersion,
    handleCheckVersion,
  } = useVersionCheck();
  
  // 一括削除の状態
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
  
  // エンティティ削除処理をカスタムフックに抽出
  const {
    deleteTargetEntityId,
    setDeleteTargetEntityId,
    showDeleteEntityModal,
    setShowDeleteEntityModal,
    isDeletingEntity,
    showBulkDeleteModal,
    setShowBulkDeleteModal,
    isBulkDeleting,
    handleDeleteEntity,
    handleBulkDeleteEntities,
  } = useEntityDeletion({
    entities,
    setEntities,
    setRelations,
    selectedEntityIds,
    setSelectedEntityIds,
  });
  
  // 開発用コンソールコマンドを登録
  useDevConsoleCommands(setEntities, setRelations);

  // フィルタリングロジックをカスタムフックに抽出
  const {
    filteredEntities,
    filteredRelations,
    filteredTopics,
    paginatedEntities,
    paginatedRelations,
    paginatedTopics,
    totalEntityPages,
    totalRelationPages,
    totalTopicPages,
    filteredRelationIds,
  } = useKnowledgeGraphFilters({
    entities,
    relations,
    topics,
    members,
    entitySearchQuery,
    entityTypeFilter,
    relationSearchQuery,
    relationTypeFilter,
    topicSearchQuery,
    selectedOrganizationIds,
    selectedMemberIds,
    dateRangeStart,
    dateRangeEnd,
    selectedImportance,
    searchResultEntityIds,
    searchResultRelationIds,
    relationTypeLabels,
    entityPage,
    relationPage,
    topicPage,
    ITEMS_PER_PAGE,
    setEntityPage,
    setRelationPage,
    setTopicPage,
  });

  return (
    <>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
            ナレッジグラフ（全データ）
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            全組織・全トピック横断でナレッジグラフを表示します
            <br />
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
              参照テーブル: <code style={{ backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>entities</code>, <code style={{ backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>topicRelations</code>
            </span>
          </p>
        </div>

        {/* フィルターセクション */}
        <KnowledgeGraphFilters
          organizations={organizations}
          members={members}
          selectedOrganizationIds={selectedOrganizationIds}
          setSelectedOrganizationIds={setSelectedOrganizationIds}
          selectedMemberIds={selectedMemberIds}
          setSelectedMemberIds={setSelectedMemberIds}
          dateRangeStart={dateRangeStart}
          setDateRangeStart={setDateRangeStart}
          dateRangeEnd={dateRangeEnd}
          setDateRangeEnd={setDateRangeEnd}
          selectedImportance={selectedImportance}
          setSelectedImportance={setSelectedImportance}
          isLoadingFilters={isLoadingFilters}
          showOrganizationFilter={showOrganizationFilter}
          setShowOrganizationFilter={setShowOrganizationFilter}
          showMemberFilter={showMemberFilter}
          setShowMemberFilter={setShowMemberFilter}
          showImportanceFilter={showImportanceFilter}
          setShowImportanceFilter={setShowImportanceFilter}
        />

        {/* ビューモード切り替えと埋め込み再生成 */}
        <ViewModeSwitcher
          viewMode={viewMode}
          setViewMode={setViewMode}
          isCheckingVersion={isCheckingVersion}
          onCheckVersion={handleCheckVersion}
          isRegeneratingEmbeddings={isRegeneratingEmbeddings}
          regenerationProgress={regenerationProgress}
          onOpenRegenerationModal={() => {
            setRegenerationType('missing');
            setShowRegenerationModal(true);
          }}
        />

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
            ナレッジグラフデータを読み込み中...
          </div>
        ) : (
          <>
            {/* リスト表示 */}
            {viewMode === 'list' && (
              <EntityRelationList
                entities={entities}
                relations={relations}
                topics={topics}
                filteredEntities={filteredEntities}
                filteredRelations={filteredRelations}
                filteredTopics={filteredTopics}
                paginatedEntities={paginatedEntities}
                paginatedRelations={paginatedRelations}
                paginatedTopics={paginatedTopics}
                entityPage={entityPage}
                setEntityPage={setEntityPage}
                totalEntityPages={totalEntityPages}
                relationPage={relationPage}
                setRelationPage={setRelationPage}
                totalRelationPages={totalRelationPages}
                topicPage={topicPage}
                setTopicPage={setTopicPage}
                totalTopicPages={totalTopicPages}
                entitySearchQuery={entitySearchQuery}
                setEntitySearchQuery={setEntitySearchQuery}
                relationSearchQuery={relationSearchQuery}
                setRelationSearchQuery={setRelationSearchQuery}
                topicSearchQuery={topicSearchQuery}
                setTopicSearchQuery={setTopicSearchQuery}
                entityTypeFilter={entityTypeFilter}
                setEntityTypeFilter={setEntityTypeFilter}
                relationTypeFilter={relationTypeFilter}
                setRelationTypeFilter={setRelationTypeFilter}
                selectedEntityIds={selectedEntityIds}
                setSelectedEntityIds={setSelectedEntityIds}
                entityTypeLabels={entityTypeLabels}
                relationTypeLabels={relationTypeLabels}
                isDeletingEntity={isDeletingEntity}
                isBulkDeleting={isBulkDeleting}
                setDeleteTargetEntityId={setDeleteTargetEntityId}
                setShowDeleteEntityModal={setShowDeleteEntityModal}
                setShowBulkDeleteModal={setShowBulkDeleteModal}
              />
            )}

            {/* 3Dグラフ表示 */}
            {viewMode === 'graph3d' && (
              <div style={{ height: '600px', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                <KnowledgeGraph3D
                  entities={filteredEntities}
                  relations={filteredRelations}
                  isLoading={false}
                  maxNodes={1000}
                  onEntityClick={() => {
                    setViewMode('list');
                  }}
                  highlightedEntityId={highlightedEntityId}
                  highlightedRelationId={highlightedRelationId}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* 埋め込み再生成モーダル（処理中でも表示可能） */}
      <EmbeddingRegenerationModal
        isOpen={showRegenerationModal}
        onClose={() => setShowRegenerationModal(false)}
        regenerationProgress={regenerationProgress}
        setRegenerationProgress={setRegenerationProgress}
        regenerationType={regenerationType}
        setRegenerationType={setRegenerationType}
        missingCounts={missingCounts}
        setMissingCounts={setMissingCounts}
        isCountingMissing={isCountingMissing}
        setIsCountingMissing={setIsCountingMissing}
        showCleanupConfirm={showCleanupConfirm}
        setShowCleanupConfirm={setShowCleanupConfirm}
        showRepairEntityConfirm={showRepairEntityConfirm}
        setShowRepairEntityConfirm={setShowRepairEntityConfirm}
        showRepairRelationConfirm={showRepairRelationConfirm}
        setShowRepairRelationConfirm={setShowRepairRelationConfirm}
        showRepairTopicConfirm={showRepairTopicConfirm}
        setShowRepairTopicConfirm={setShowRepairTopicConfirm}
        isRegeneratingEmbeddings={isRegeneratingEmbeddings}
        setIsRegeneratingEmbeddings={setIsRegeneratingEmbeddings}
        isCancelledRef={isCancelledRef}
        organizations={organizations}
        entities={entities}
        relations={relations}
        topics={topics}
        updateMissingCountsOrganization={updateMissingCountsOrganization}
        startRegeneration={startRegeneration}
        completeRegeneration={completeRegeneration}
        cancelRegeneration={cancelRegeneration}
      />

      {/* バージョンチェックモーダル */}
      <VersionCheckModal
        isOpen={showVersionCheck}
        onClose={() => setShowVersionCheck(false)}
        outdatedEntities={outdatedEntities}
        outdatedRelations={outdatedRelations}
        onOpenRegenerationModal={() => setShowRegenerationModal(true)}
      />

      {/* エンティティ/リレーション詳細表示モーダル */}
      <EntityDetailModal
        entity={selectedEntity}
        entityTypeLabels={entityTypeLabels}
        onClose={() => setSelectedEntity(null)}
      />
      <RelationDetailModal
        relation={selectedRelation}
        relationTypeLabels={relationTypeLabels}
        onClose={() => setSelectedRelation(null)}
      />

      {/* エンティティ削除確認モーダル */}
      <DeleteEntityModal
        isOpen={showDeleteEntityModal}
        entityId={deleteTargetEntityId}
        entities={entities}
        relations={relations}
        isDeleting={isDeletingEntity}
        onClose={() => {
          setShowDeleteEntityModal(false);
          setDeleteTargetEntityId(null);
        }}
        onConfirm={handleDeleteEntity}
      />

      {/* 一括削除確認モーダル */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        selectedEntityIds={selectedEntityIds}
        entities={entities}
        relations={relations}
        entityTypeLabels={entityTypeLabels}
        isDeleting={isBulkDeleting}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDeleteEntities}
      />
    </>
  );
}

