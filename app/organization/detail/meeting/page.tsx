'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { getMeetingNoteById, saveMeetingNote, getOrgTreeFromDb, generateUniqueId } from '@/lib/orgApi';
// import { saveCompanyMeetingNote } from '@/lib/companiesApi';
import type { MeetingNote, OrgNodeData } from '@/lib/orgApi';
// import type { CompanyMeetingNote } from '@/lib/companiesApi';
import type { Topic, TopicSemanticCategory, TopicImportance } from '@/types/topicMetadata';
import { saveTopicEmbeddingAsync, findSimilarTopics } from '@/lib/topicEmbeddings';
import { generateTopicMetadata, extractEntities, extractRelations } from '@/lib/topicMetadataGeneration';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';
import type { Entity, EntityType } from '@/types/entity';
import type { Relation, RelationType } from '@/types/relation';
import { getRelationsByTopicId, createRelation, deleteRelation } from '@/lib/relationApi';
import { createEntity, getEntitiesByOrganizationId, deleteEntity } from '@/lib/entityApi';
import { callTauriCommand } from '@/lib/localFirebase';
import { deleteTopicFromChroma } from '@/lib/chromaSync';
import { EditIcon, AIIcon, DeleteIcon } from './components/Icons';
import { devLog, devWarn, markdownComponents } from './utils';
import type { TabType, MonthTab, SummaryTab, MonthContent, MeetingNoteData } from './types';
import { MONTHS, SUMMARY_TABS, GPT_MODELS, RELATION_TYPE_LABELS, ENTITY_TYPE_LABELS } from './constants';
import DeleteItemConfirmModal from './components/modals/DeleteItemConfirmModal';
import DeleteTopicConfirmModal from './components/modals/DeleteTopicConfirmModal';
import TableOfContentsModal from './components/modals/TableOfContentsModal';
import DeleteEntitiesConfirmModal from './components/modals/DeleteEntitiesConfirmModal';
import DeleteRelationsConfirmModal from './components/modals/DeleteRelationsConfirmModal';
import SimilarTopicsModal from './components/modals/SimilarTopicsModal';
import AddEntityModal from './components/modals/AddEntityModal';
import AddRelationModal from './components/modals/AddRelationModal';
import AIGenerationModal from './components/modals/AIGenerationModal';
import TopicModal from './components/modals/TopicModal';
import HeaderSection from './components/HeaderSection';
import TabNavigation from './components/TabNavigation';
import SidebarSection from './components/SidebarSection';
import SummaryContentSection from './components/SummaryContentSection';
import MonthSummarySection from './components/MonthSummarySection';
import MeetingItemCard from './components/MeetingItemCard';
import { useMeetingNoteData } from './hooks/useMeetingNoteData';
import { useEditMode } from './hooks/useEditMode';
import { useTopicManagement } from './hooks/useTopicManagement';
import { useAIGeneration } from './hooks/useAIGeneration';
import { useEntityRelationManagement } from './hooks/useEntityRelationManagement';

function MeetingNoteDetailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const organizationId = searchParams?.get('id') as string;
  const meetingId = searchParams?.get('meetingId') as string;
  
  const [activeTab, setActiveTab] = useState<TabType>('april');
  const [activeSection, setActiveSection] = useState<string>('summary');
  const [downloadingJson, setDownloadingJson] = useState(false);
  
  // カスタムフックでデータ管理
  const {
    meetingNote,
    orgData,
    loading,
    error,
    monthContents,
    setMonthContents,
    customTabLabels,
    setCustomTabLabels,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    savingStatus,
    setSavingStatus,
    downloadingHtml,
    handleManualSave,
    handleDownloadJson: handleDownloadJsonFromHook,
    handleDownloadHtml: handleDownloadHtmlFromHook,
  } = useMeetingNoteData({
    organizationId,
    meetingId,
    activeTab,
    onSetActiveSection: setActiveSection,
  });
  
  // タブ名編集モード
  const [editingTabLabel, setEditingTabLabel] = useState<TabType | null>(null);
  const [editingTabLabelValue, setEditingTabLabelValue] = useState<string>('');
  
  // 目次モーダル
  const [showTableOfContentsModal, setShowTableOfContentsModal] = useState(false);
  const [expandedMonthInTOC, setExpandedMonthInTOC] = useState<TabType | null>(null);
  
  // 編集モード管理（カスタムフック）
  const {
    editingMonth,
    editingSection,
    editingContent,
    editingItemTitle,
    editingItemDate,
    editingItemTime,
    setEditingMonth,
    setEditingSection,
    setEditingContent,
    setEditingItemTitle,
    setEditingItemDate,
    setEditingItemTime,
    handleStartEditSummary,
    handleStartEditItem,
    handleStartEditItemTitle,
    handleCancelEdit,
    handleSaveEdit,
  } = useEditMode({
    monthContents,
    setMonthContents,
    meetingNote,
    setHasUnsavedChanges,
    setSavingStatus,
  });
  
  // 削除確認モーダル
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteTargetTab, setDeleteTargetTab] = useState<TabType | null>(null);
  const [deleteTargetItemId, setDeleteTargetItemId] = useState<string | null>(null);
  
  // トピック管理（カスタムフック）
  const {
    showDeleteTopicModal,
    deleteTargetTopicItemId,
    deleteTargetTopicId,
    handleDeleteTopic,
    confirmDeleteTopic,
    cancelDeleteTopic,
    showTopicModal,
    setShowTopicModal,
    editingTopicItemId,
    setEditingTopicItemId,
    editingTopicId,
    setEditingTopicId,
    topicTitle,
    setTopicTitle,
    topicContent,
    setTopicContent,
    topicSemanticCategory,
    setTopicSemanticCategory,
    topicKeywords,
    setTopicKeywords,
    topicSummary,
    setTopicSummary,
    topicImportance,
    setTopicImportance,
    isGeneratingMetadata,
    setIsGeneratingMetadata,
    pendingMetadata,
    setPendingMetadata,
    topicMetadataModelType,
    setTopicMetadataModelType,
    topicMetadataSelectedModel,
    setTopicMetadataSelectedModel,
    topicMetadataLocalModels,
    loadingTopicMetadataLocalModels,
    topicMetadataMode,
    setTopicMetadataMode,
    loadTopicMetadataLocalModels,
    showSimilarTopicsModal,
    setShowSimilarTopicsModal,
    searchingTopicId,
    setSearchingTopicId,
    similarTopics,
    setSimilarTopics,
    isSearchingSimilarTopics,
    setIsSearchingSimilarTopics,
    expandedTopics,
    setExpandedTopics,
  } = useTopicManagement({
    monthContents,
    setMonthContents,
    activeTab,
    meetingNote,
    meetingId,
    organizationId,
    setHasUnsavedChanges,
    setSavingStatus,
  });
  
  // エンティティ・リレーション管理（カスタムフック）
  const {
    topicEntities,
    setTopicEntities,
    topicRelations,
    setTopicRelations,
    isLoadingEntities,
    isLoadingRelations,
    pendingEntities,
    setPendingEntities,
    pendingRelations,
    setPendingRelations,
    replaceExistingEntities,
    setReplaceExistingEntities,
    showDeleteEntitiesModal,
    setShowDeleteEntitiesModal,
    showDeleteRelationsModal,
    setShowDeleteRelationsModal,
    showAddEntityModal,
    setShowAddEntityModal,
    showAddRelationModal,
    setShowAddRelationModal,
    editingEntity,
    setEditingEntity,
    editingRelation,
    setEditingRelation,
    entitySearchQuery,
    setEntitySearchQuery,
    relationSearchQuery,
    setRelationSearchQuery,
    entityTypeFilter,
    setEntityTypeFilter,
    relationTypeFilter,
    setRelationTypeFilter,
    bulkOperationMode,
    setBulkOperationMode,
    selectedEntityIds,
    setSelectedEntityIds,
    selectedRelationIds,
    setSelectedRelationIds,
    showMergeEntityModal,
    setShowMergeEntityModal,
    mergeSourceEntity,
    setMergeSourceEntity,
    showPathSearchModal,
    setShowPathSearchModal,
    showStatsModal,
    setShowStatsModal,
    isExporting,
    setIsExporting,
    exportSuccess,
    setExportSuccess,
  } = useEntityRelationManagement({
    showTopicModal,
    editingTopicId,
    organizationId,
    meetingId,
  });
  
  // ナビゲーションで展開されている議事録アイテムを管理（アイテムIDをキーとする）
  const [expandedNavItems, setExpandedNavItems] = useState<Set<string>>(new Set());
  
  // AI生成管理（カスタムフック）
  const {
    isAIGenerationModalOpen,
    setIsAIGenerationModalOpen,
    aiGenerationInput,
    setAIGenerationInput,
    selectedTopicIdsForAI,
    setSelectedTopicIdsForAI,
    selectedSummaryIdsForAI,
    setSelectedSummaryIdsForAI,
    isAIGenerating,
    setIsAIGenerating,
    aiSummaryFormat,
    setAiSummaryFormat,
    aiSummaryLength,
    setAiSummaryLength,
    aiCustomPrompt,
    setAiCustomPrompt,
    aiGeneratedContent,
    setAiGeneratedContent,
    originalContent,
    setOriginalContent,
    aiModelType,
    setAiModelType,
    aiSelectedModel,
    setAiSelectedModel,
    aiLocalModels,
    loadingAiLocalModels,
    availableAiModels,
    loadAiLocalModels,
    generateAISummary,
  } = useAIGeneration();


  // ページを離れる前の確認
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '保存されていない変更があります。このページを離れますか？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // ローディングアニメーション用のスタイルを追加
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // タブが切り替わったときに、activeSectionをcurrentSummaryIdにリセット
  // 注意: currentTabDataとcurrentSummaryIdは早期returnの後に計算されるため、
  // ここではmonthContentsとactiveTabを使用して計算する
  useEffect(() => {
    const currentTabData = monthContents[activeTab] as MonthContent | undefined;
    const currentSummaryId = currentTabData?.summaryId;
    if (currentSummaryId) {
      const isCurrentSectionAnItem = currentTabData?.items?.some(item => item.id === activeSection);
      // 現在のactiveSectionがアイテムIDでない場合、またはタブが切り替わった場合はリセット
      if (!isCurrentSectionAnItem || activeSection === 'summary') {
        setActiveSection(currentSummaryId);
      }
    }
  }, [activeTab, monthContents, activeSection, setActiveSection]);

  // JSONダウンロード（カスタムフックのものを使用、downloadingJson状態を追加）
  const handleDownloadJson = useCallback(async () => {
    if (downloadingJson) return;
    setDownloadingJson(true);
    try {
      await handleDownloadJsonFromHook();
    } finally {
      setTimeout(() => setDownloadingJson(false), 500);
    }
  }, [handleDownloadJsonFromHook, downloadingJson]);

  
  // 議事録アイテムの削除確認モーダルを表示
  const handleDeleteItem = (tab: TabType, itemId: string) => {
    console.log('🗑️ [handleDeleteItem] 削除確認モーダルを表示:', { tab, itemId });
    setDeleteTargetTab(tab);
    setDeleteTargetItemId(itemId);
    setShowDeleteConfirmModal(true);
  };
  
  // 議事録アイテムの削除実行
  const confirmDeleteItem = async () => {
    if (!deleteTargetTab || !deleteTargetItemId) {
      devWarn('⚠️ [confirmDeleteItem] 削除対象が設定されていません');
      return;
    }
    
    const tab = deleteTargetTab;
    const itemId = deleteTargetItemId;
    
    devLog('✅ [confirmDeleteItem] 削除実行開始:', { tab, itemId });
    
    // モーダルを閉じる
    setShowDeleteConfirmModal(false);
    setDeleteTargetTab(null);
    setDeleteTargetItemId(null);
    
    let updatedContents: typeof monthContents = monthContents;
    setMonthContents(prev => {
      devLog('📝 [confirmDeleteItem] 状態更新前:', { 
        prevItems: (prev[tab] as MonthContent | undefined)?.items?.length || 0,
        itemId 
      });
      const updated = { ...prev };
      const tabData = updated[tab] as MonthContent | undefined;
      if (tabData) {
        const beforeCount = tabData.items.length;
        updated[tab] = {
          ...tabData,
          items: tabData.items.filter(i => i.id !== itemId),
        };
        const afterCount = (updated[tab] as MonthContent).items.length;
        devLog('📝 [confirmDeleteItem] 状態更新後:', { 
          beforeCount, 
          afterCount,
          deleted: beforeCount > afterCount
        });
      } else {
        devWarn('⚠️ [confirmDeleteItem] tabDataが見つかりません:', { tab });
      }
      updatedContents = updated;
      return updated;
    });
    
    // 削除されたアイテムが現在選択されている場合は、summaryに戻す
    if (activeSection === itemId && currentSummaryId) {
      devLog('🔄 [confirmDeleteItem] activeSectionをsummaryに変更');
      setActiveSection(currentSummaryId);
    }
    
    // 編集モードをキャンセル
    if (editingSection === itemId || editingSection === `${itemId}-title`) {
        devLog('🔄 [confirmDeleteItem] 編集モードをキャンセル');
      handleCancelEdit();
    }
    
    setHasUnsavedChanges(true); // 未保存の変更があることを記録
    
    // JSONファイルに自動保存
    if (meetingNote && updatedContents) {
      try {
        devLog('💾 [confirmDeleteItem] 保存開始...');
        const contentJson = JSON.stringify(updatedContents, null, 2);
        // 事業会社の管理はorganizationsテーブルのtypeカラムで行うため、通常のsaveMeetingNoteを使用
        await saveMeetingNote({
          ...meetingNote,
          content: contentJson,
        });
        devLog('✅ [confirmDeleteItem] 自動保存成功');
        setHasUnsavedChanges(false); // 保存完了後、未保存フラグをリセット
      } catch (error: any) {
        console.error('❌ [confirmDeleteItem] 自動保存に失敗しました:', error);
        // エラーは警告のみで続行（未保存フラグはtrueのまま）
      }
    } else {
      devWarn('⚠️ [confirmDeleteItem] 保存スキップ:', { 
        hasMeetingNote: !!meetingNote, 
        hasUpdatedContents: updatedContents !== undefined 
      });
    }
  };
  
  // 削除確認モーダルをキャンセル
  const cancelDeleteItem = () => {
    devLog('🗑️ [cancelDeleteItem] 削除をキャンセルしました');
    setShowDeleteConfirmModal(false);
    setDeleteTargetTab(null);
    setDeleteTargetItemId(null);
  };
  
  // トピック削除確認モーダルを表示
  // 追加処理中のフラグ（重複実行を防ぐ）
  const isAddingItemRef = useRef(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  // 新しい議事録アイテムを追加
  const handleAddItem = useCallback(async (tab: TabType, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // 既に追加処理中の場合は何もしない
    if (isAddingItemRef.current) {
      devLog('追加処理中のためスキップ');
      return;
    }
    
    isAddingItemRef.current = true;
    setIsAddingItem(true);
    
    const newItemId = generateUniqueId();
    
    // 状態を更新（新しいオブジェクトを作成して不変性を保つ）
    const updated = { ...monthContents };
    if (!updated[tab] || typeof updated[tab] === 'string') {
      updated[tab] = { summary: '', items: [] };
    }
    const tabData = updated[tab] as MonthContent;
    updated[tab] = {
      ...tabData,
      items: [...tabData.items, {
        id: newItemId,
        title: '新しい議事録',
        content: '',
      }],
    };
    
    // 状態を更新
    setMonthContents(updated);
    setHasUnsavedChanges(true); // 未保存の変更があることを記録
    
    // 追加したアイテムを選択状態にしてタイトル編集モードにする
    setActiveSection(newItemId);
    setEditingMonth(tab);
    setEditingSection(`${newItemId}-title`); // タイトル編集モード
    setEditingContent('');
    setEditingItemTitle('新しい議事録');
    
    // JSONファイルに自動保存
    if (meetingNote) {
      try {
        // 状態更新を確実にするため、少し待ってから保存
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const contentJson = JSON.stringify(updated, null, 2);
        // 事業会社の管理はorganizationsテーブルのtypeカラムで行うため、通常のsaveMeetingNoteを使用
        await saveMeetingNote({
          ...meetingNote,
          content: contentJson,
        });
        devLog('✅ [handleAddItem] 自動保存成功');
        setHasUnsavedChanges(false); // 保存完了後、未保存フラグをリセット
      } catch (error: any) {
        console.error('❌ [handleAddItem] 自動保存に失敗しました:', error);
        // エラーは警告のみで続行（未保存フラグはtrueのまま）
      }
    }
    
    // 少し遅延してからフラグをリセット（連続クリックを防ぐ）
    setTimeout(() => {
      isAddingItemRef.current = false;
      setIsAddingItem(false);
    }, 300);
  }, [meetingNote, monthContents, setMonthContents, setActiveSection, setEditingMonth, setEditingSection, setEditingContent, setEditingItemTitle, setHasUnsavedChanges]);

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>読み込み中...</p>
        </div>
      </Layout>
    );
  }

  if (error || !meetingNote) {
    return (
      <Layout>
        <div style={{ padding: '40px' }}>
          <h2 style={{ marginBottom: '8px' }}>議事録詳細</h2>
          <p style={{ color: 'var(--color-error)' }}>
            {error || 'データが見つかりませんでした。'}
          </p>
          <button
            onClick={async () => {
              if (hasUnsavedChanges) {
                const { tauriConfirm } = await import('@/lib/orgApi');
                const confirmed = await tauriConfirm('保存されていない変更があります。このページを離れますか？', 'ページを離れる確認');
                if (!confirmed) {
                  return;
                }
              }
              router.push(`/organization/detail?id=${organizationId}&tab=meetingNotes`);
            }}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            組織ページに戻る
          </button>
        </div>
      </Layout>
    );
  }

  const currentTabData = monthContents[activeTab] as MonthContent | undefined;
  const isSummaryTab = SUMMARY_TABS.some(t => t.id === activeTab);
  const currentSummaryId = currentTabData?.summaryId;

  // 目次データを集計する関数
  const getTableOfContentsData = () => {
    const tocData: Array<{
      tabId: TabType;
      tabLabel: string;
      itemCount: number;
      topicCount: number;
      items: Array<{
        id: string;
        title: string;
        topicCount: number;
      }>;
      isSummaryTab: boolean;
    }> = [];

    // 月タブを追加
    MONTHS.forEach((month) => {
      const monthData = monthContents[month.id] as MonthContent | undefined;
      const items = monthData?.items || [];
      let totalTopicCount = 0;
      
      const itemData = items.map((item) => {
        const topicCount = item.topics?.length || 0;
        totalTopicCount += topicCount;
        return {
          id: item.id,
          title: item.title || '無題',
          topicCount,
        };
      });

      tocData.push({
        tabId: month.id,
        tabLabel: customTabLabels[month.id] || month.label,
        itemCount: items.length,
        topicCount: totalTopicCount,
        items: itemData,
        isSummaryTab: false,
      });
    });

    // 総括タブを追加
    SUMMARY_TABS.forEach((tab) => {
      const tabData = monthContents[tab.id] as MonthContent | undefined;
      const items = tabData?.items || [];
      let totalTopicCount = 0;
      
      const itemData = items.map((item) => {
        const topicCount = item.topics?.length || 0;
        totalTopicCount += topicCount;
        return {
          id: item.id,
          title: item.title || '無題',
          topicCount,
        };
      });

      tocData.push({
        tabId: tab.id,
        tabLabel: customTabLabels[tab.id] || tab.label,
        itemCount: items.length,
        topicCount: totalTopicCount,
        items: itemData,
        isSummaryTab: true,
      });
    });

    return tocData;
  };

  return (
    <Layout>
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
        {/* ヘッダー */}
        <HeaderSection
          title={meetingNote.title}
          savingStatus={savingStatus}
          downloadingJson={downloadingJson}
          downloadingHtml={downloadingHtml}
          hasUnsavedChanges={hasUnsavedChanges}
          organizationId={organizationId}
          onSave={handleManualSave}
          onDownloadJson={handleDownloadJson}
          onDownloadHtml={handleDownloadHtmlFromHook}
        />

        {/* タブナビゲーション */}
        <TabNavigation
          activeTab={activeTab}
          customTabLabels={customTabLabels}
          monthContents={monthContents}
          onSetActiveTab={setActiveTab}
          onSetActiveSection={setActiveSection}
          onShowTableOfContents={() => setShowTableOfContentsModal(true)}
        />

        {/* 目次モーダル */}
        <TableOfContentsModal
          isOpen={showTableOfContentsModal}
          onClose={() => setShowTableOfContentsModal(false)}
          getTableOfContentsData={getTableOfContentsData}
          monthContents={monthContents}
          customTabLabels={customTabLabels}
          editingTabLabel={editingTabLabel}
          editingTabLabelValue={editingTabLabelValue}
          expandedMonthInTOC={expandedMonthInTOC}
          onSetEditingTabLabel={setEditingTabLabel}
          onSetEditingTabLabelValue={setEditingTabLabelValue}
          onSetCustomTabLabels={setCustomTabLabels}
          onSetHasUnsavedChanges={setHasUnsavedChanges}
          onSetExpandedMonthInTOC={setExpandedMonthInTOC}
          onSetActiveTab={setActiveTab}
          onSetActiveSection={setActiveSection}
        />


        {/* コンテンツレイアウト */}
        <div style={{ display: 'flex', gap: '28px', marginTop: '24px' }}>
          {/* メインコンテンツ */}
          <main style={{
            flex: '1 1 0',
            minWidth: 0,
            maxWidth: 'calc(100% - 328px)',
            backgroundColor: '#FFFFFF',
            padding: '40px 36px 36px 36px',
            borderRadius: '14px',
            minHeight: '350px',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
          }}>
            {isSummaryTab ? (
              <div>
                <h2 style={{
                  marginTop: 0,
                  fontSize: '2.1em',
                  borderBottom: '4px solid #0066CC',
                  paddingBottom: '18px',
                  marginBottom: '36px',
                  color: '#0F172A',
                  letterSpacing: '0.8px',
                  fontWeight: '800',
                  lineHeight: '1.3',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}>
                  {SUMMARY_TABS.find(t => t.id === activeTab)?.label}
                </h2>
                
                {/* 総括サマリ */}
                <SummaryContentSection
                  activeTab={activeTab}
                  activeSection={activeSection}
                  currentSummaryId={currentSummaryId}
                  currentTabData={currentTabData}
                  customTabLabels={customTabLabels}
                  editingMonth={editingMonth}
                  editingSection={editingSection}
                  editingContent={editingContent}
                  onSetEditingContent={setEditingContent}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onStartEditSummary={handleStartEditSummary}
                  onOpenAIGenerationModal={() => {
                    setAIGenerationInput('');
                    setSelectedTopicIdsForAI([]);
                    setSelectedSummaryIdsForAI([]);
                    setAiSummaryFormat('auto');
                    setAiSummaryLength(500);
                    setAiCustomPrompt('');
                    setIsAIGenerationModalOpen(true);
                  }}
                />
                
                {/* 議事録アイテム */}
                <div style={{ marginBottom: '32px' }}>
                  {currentTabData?.items && currentTabData.items.length > 0 && activeSection !== currentSummaryId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {currentTabData.items
                        .filter((item) => activeSection === item.id)
                        .map((item) => (
                          <MeetingItemCard
                            key={item.id}
                            item={item}
                            activeTab={activeTab}
                            editingMonth={editingMonth}
                            editingSection={editingSection}
                            editingItemTitle={editingItemTitle}
                            editingContent={editingContent}
                            editingItemDate={editingItemDate}
                            editingItemTime={editingItemTime}
                            expandedTopics={expandedTopics}
                            onSetEditingItemTitle={setEditingItemTitle}
                            onSetEditingContent={setEditingContent}
                            onSetEditingItemDate={setEditingItemDate}
                            onSetEditingItemTime={setEditingItemTime}
                            onSetEditingMonth={setEditingMonth}
                            onSetEditingSection={setEditingSection}
                            onSetExpandedTopics={setExpandedTopics}
                            onStartEditItem={handleStartEditItem}
                            onStartEditItemTitle={handleStartEditItemTitle}
                            onSaveEdit={handleSaveEdit}
                            onCancelEdit={handleCancelEdit}
                            onDeleteItem={handleDeleteItem}
                            monthContents={monthContents}
                            onSetMonthContents={setMonthContents}
                            onSetHasUnsavedChanges={setHasUnsavedChanges}
                            organizationId={organizationId}
                            meetingId={meetingId}
                            onSetEditingTopicItemId={setEditingTopicItemId}
                            onSetEditingTopicId={setEditingTopicId}
                            onSetTopicTitle={setTopicTitle}
                            onSetTopicContent={setTopicContent}
                            onSetTopicSemanticCategory={setTopicSemanticCategory}
                            onSetTopicKeywords={setTopicKeywords}
                            onSetTopicSummary={setTopicSummary}
                            onSetTopicImportance={setTopicImportance}
                            onSetShowTopicModal={setShowTopicModal}
                            onSetSearchingTopicId={setSearchingTopicId}
                            onSetIsSearchingSimilarTopics={setIsSearchingSimilarTopics}
                            onSetShowSimilarTopicsModal={setShowSimilarTopicsModal}
                            onSetSimilarTopics={setSimilarTopics}
                            onDeleteTopic={handleDeleteTopic}
                            onFindSimilarTopics={findSimilarTopics}
                          />
                        ))}
                    </div>
                  ) : activeSection !== 'summary' && (!currentTabData?.items || currentTabData.items.length === 0) ? (
                    <div style={{
                      padding: '48px 40px',
                      textAlign: 'center',
                      background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                      borderRadius: '12px',
                      border: '2px dashed #CBD5E1',
                    }}>
                      <p style={{ margin: 0, color: '#64748B', fontSize: '15px', lineHeight: '1.6' }}>
                        議事録がありません。「+ 追加」ボタンから追加してください。
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div>
                <h2 style={{
                  marginTop: 0,
                  fontSize: '2.1em',
                  borderBottom: '4px solid #0066CC',
                  paddingBottom: '18px',
                  marginBottom: '36px',
                  color: '#0F172A',
                  letterSpacing: '0.8px',
                  fontWeight: '800',
                  lineHeight: '1.3',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}>
                  {customTabLabels[activeTab] || MONTHS.find(m => m.id === activeTab)?.label}
                </h2>
                
                {/* 月サマリ */}
                <MonthSummarySection
                  activeTab={activeTab}
                  activeSection={activeSection}
                  currentSummaryId={currentSummaryId}
                  currentTabData={currentTabData}
                  customTabLabels={customTabLabels}
                  editingMonth={editingMonth}
                  editingSection={editingSection}
                  editingContent={editingContent}
                  onSetEditingContent={setEditingContent}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onStartEditSummary={handleStartEditSummary}
                  onOpenAIGenerationModal={() => {
                    setAIGenerationInput('');
                    setSelectedTopicIdsForAI([]);
                    setSelectedSummaryIdsForAI([]);
                    setAiSummaryFormat('auto');
                    setAiSummaryLength(500);
                    setAiCustomPrompt('');
                    setIsAIGenerationModalOpen(true);
                  }}
                />
                
                {/* 議事録アイテム */}
                <div style={{ marginBottom: '32px' }}>
                  {currentTabData?.items && currentTabData.items.length > 0 && activeSection !== currentSummaryId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {currentTabData.items
                        .filter((item) => activeSection === item.id)
                        .map((item) => (
                          <MeetingItemCard
                            key={item.id}
                            item={item}
                            activeTab={activeTab}
                            editingMonth={editingMonth}
                            editingSection={editingSection}
                            editingItemTitle={editingItemTitle}
                            editingContent={editingContent}
                            editingItemDate={editingItemDate}
                            editingItemTime={editingItemTime}
                            expandedTopics={expandedTopics}
                            onSetEditingItemTitle={setEditingItemTitle}
                            onSetEditingContent={setEditingContent}
                            onSetEditingItemDate={setEditingItemDate}
                            onSetEditingItemTime={setEditingItemTime}
                            onSetEditingMonth={setEditingMonth}
                            onSetEditingSection={setEditingSection}
                            onSetExpandedTopics={setExpandedTopics}
                            onStartEditItem={handleStartEditItem}
                            onStartEditItemTitle={handleStartEditItemTitle}
                            onSaveEdit={handleSaveEdit}
                            onCancelEdit={handleCancelEdit}
                            onDeleteItem={handleDeleteItem}
                            monthContents={monthContents}
                            onSetMonthContents={setMonthContents}
                            onSetHasUnsavedChanges={setHasUnsavedChanges}
                            organizationId={organizationId}
                            meetingId={meetingId}
                            onSetEditingTopicItemId={setEditingTopicItemId}
                            onSetEditingTopicId={setEditingTopicId}
                            onSetTopicTitle={setTopicTitle}
                            onSetTopicContent={setTopicContent}
                            onSetTopicSemanticCategory={setTopicSemanticCategory}
                            onSetTopicKeywords={setTopicKeywords}
                            onSetTopicSummary={setTopicSummary}
                            onSetTopicImportance={setTopicImportance}
                            onSetShowTopicModal={setShowTopicModal}
                            onSetSearchingTopicId={setSearchingTopicId}
                            onSetIsSearchingSimilarTopics={setIsSearchingSimilarTopics}
                            onSetShowSimilarTopicsModal={setShowSimilarTopicsModal}
                            onSetSimilarTopics={setSimilarTopics}
                            onDeleteTopic={handleDeleteTopic}
                            onFindSimilarTopics={findSimilarTopics}
                          />
                        ))}
                    </div>
                  ) : activeSection !== currentSummaryId && (!currentTabData?.items || currentTabData.items.length === 0) ? (
                    <div style={{
                      padding: '48px 40px',
                      textAlign: 'center',
                      background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                      borderRadius: '12px',
                      border: '2px dashed #CBD5E1',
                    }}>
                      <p style={{ margin: 0, color: '#64748B', fontSize: '15px', lineHeight: '1.6' }}>
                        議事録がありません。「+ 追加」ボタンから追加してください。
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </main>
          
          {/* サイドバー */}
          <SidebarSection
            currentTabData={currentTabData}
            activeSection={activeSection}
            currentSummaryId={currentSummaryId}
            expandedNavItems={expandedNavItems}
            activeTab={activeTab}
            meetingId={meetingId}
            isAddingItem={isAddingItem}
            onSetActiveSection={setActiveSection}
            onSetExpandedNavItems={setExpandedNavItems}
            onAddItem={handleAddItem}
          />
        </div>
      </div>
      
      {/* 議事録アイテム削除確認モーダル */}
      <DeleteItemConfirmModal
        isOpen={showDeleteConfirmModal}
        deleteTargetTab={deleteTargetTab}
        deleteTargetItemId={deleteTargetItemId}
        monthContents={monthContents}
        onConfirm={confirmDeleteItem}
        onCancel={cancelDeleteItem}
      />
      
      {/* トピック削除確認モーダル */}
      <DeleteTopicConfirmModal
        isOpen={showDeleteTopicModal}
        activeTab={activeTab}
        deleteTargetTopicItemId={deleteTargetTopicItemId}
        deleteTargetTopicId={deleteTargetTopicId}
        monthContents={monthContents}
        onConfirm={confirmDeleteTopic}
        onCancel={cancelDeleteTopic}
      />
      
      {/* エンティティ一括削除確認モーダル */}
      <DeleteEntitiesConfirmModal
        isOpen={showDeleteEntitiesModal}
        entities={(pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities}
        onConfirm={async () => {
          setShowDeleteEntitiesModal(false);
          try {
            const entitiesToDelete = (pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities;
            for (const entity of entitiesToDelete) {
              try {
                await deleteEntity(entity.id);
                devLog(`✅ エンティティを削除しました: ${entity.id}`);
              } catch (error: any) {
                devWarn(`⚠️ エンティティ削除エラー: ${entity.id}`, error);
              }
            }
            // pendingEntitiesの場合はクリア、topicEntitiesの場合は再読み込み
            if (pendingEntities && pendingEntities.length > 0) {
              setPendingEntities([]);
            } else {
              // トピックに関連するエンティティを再読み込み
              const entities = await getEntitiesByOrganizationId(organizationId);
              const topicEmbeddingId = `${meetingId}-topic-${editingTopicId}`;
              const filteredEntities = entities.filter(e => 
                e.metadata && typeof e.metadata === 'object' && 'topicId' in e.metadata && e.metadata.topicId === editingTopicId
              );
              setTopicEntities(filteredEntities);
            }
            alert('エンティティを削除しました');
          } catch (error: any) {
            console.error('❌ エンティティ一括削除エラー:', error);
            alert(`エンティティの削除に失敗しました: ${error?.message || '不明なエラー'}`);
          }
        }}
        onCancel={() => setShowDeleteEntitiesModal(false)}
      />
      
      {/* リレーション一括削除確認モーダル */}
      <DeleteRelationsConfirmModal
        isOpen={showDeleteRelationsModal}
        relations={(pendingRelations && pendingRelations.length > 0) ? pendingRelations : topicRelations}
        entities={(pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities}
        onConfirm={async () => {
          setShowDeleteRelationsModal(false);
          try {
            const topicEmbeddingId = `${meetingId}-topic-${editingTopicId}`;
            const relationsToDelete = (pendingRelations && pendingRelations.length > 0) 
              ? pendingRelations 
              : topicRelations;
            
            for (const relation of relationsToDelete) {
              try {
                await deleteRelation(relation.id);
                devLog(`✅ リレーションを削除しました: ${relation.id}`);
              } catch (error: any) {
                devWarn(`⚠️ リレーション削除エラー: ${relation.id}`, error);
              }
            }
            
            // pendingRelationsの場合はクリア、topicRelationsの場合は再読み込み
            if (pendingRelations && pendingRelations.length > 0) {
              setPendingRelations([]);
            } else {
              // トピックに関連するリレーションを再読み込み
              const relations = await getRelationsByTopicId(topicEmbeddingId);
              setTopicRelations(relations);
            }
            alert('リレーションを削除しました');
          } catch (error: any) {
            console.error('❌ リレーション一括削除エラー:', error);
            alert(`リレーションの削除に失敗しました: ${error?.message || '不明なエラー'}`);
          }
        }}
        onCancel={() => setShowDeleteRelationsModal(false)}
      />
      
      {/* 個別トピック追加・編集モーダル */}
      <TopicModal
        isOpen={showTopicModal}
        editingTopicId={editingTopicId}
        editingTopicItemId={editingTopicItemId}
        topicTitle={topicTitle}
        topicContent={topicContent}
        topicSemanticCategory={topicSemanticCategory}
        topicKeywords={topicKeywords}
        topicSummary={topicSummary}
        topicImportance={topicImportance}
        pendingMetadata={pendingMetadata}
        pendingEntities={pendingEntities}
        pendingRelations={pendingRelations}
        topicEntities={topicEntities}
        topicRelations={topicRelations}
        replaceExistingEntities={replaceExistingEntities}
        isGeneratingMetadata={isGeneratingMetadata}
        topicMetadataModelType={topicMetadataModelType}
        topicMetadataSelectedModel={topicMetadataSelectedModel}
        topicMetadataLocalModels={topicMetadataLocalModels}
        loadingTopicMetadataLocalModels={loadingTopicMetadataLocalModels}
        topicMetadataMode={topicMetadataMode}
        isLoadingEntities={isLoadingEntities}
        isLoadingRelations={isLoadingRelations}
        entitySearchQuery={entitySearchQuery}
        entityTypeFilter={entityTypeFilter}
        relationTypeLabels={RELATION_TYPE_LABELS}
        entityTypeLabels={ENTITY_TYPE_LABELS}
        activeTab={activeTab}
        monthContents={monthContents}
        organizationId={organizationId}
        meetingId={meetingId}
        onClose={() => {
          setShowTopicModal(false);
          setEditingTopicItemId(null);
          setEditingTopicId(null);
          setTopicTitle('');
          setTopicContent('');
          setTopicSemanticCategory('');
          setTopicKeywords('');
          setTopicSummary('');
          setTopicImportance('');
          setPendingMetadata(null);
          setPendingEntities(null);
          setPendingRelations(null);
          setTopicEntities([]);
          setTopicRelations([]);
          setReplaceExistingEntities(false);
        }}
        onSave={(updatedContents) => {
          setMonthContents(updatedContents);
          setHasUnsavedChanges(true);
          setShowTopicModal(false);
          setEditingTopicItemId(null);
          setEditingTopicId(null);
          setTopicTitle('');
          setTopicContent('');
          setTopicSemanticCategory('');
          setTopicKeywords('');
          setTopicSummary('');
          setTopicImportance('');
          setPendingMetadata(null);
          setPendingEntities(null);
          setPendingRelations(null);
          setTopicEntities([]);
          setTopicRelations([]);
        }}
        setTopicTitle={setTopicTitle}
        setTopicContent={setTopicContent}
        setTopicSemanticCategory={setTopicSemanticCategory}
        setTopicKeywords={setTopicKeywords}
        setTopicSummary={setTopicSummary}
        setTopicImportance={setTopicImportance}
        setPendingMetadata={setPendingMetadata}
        setPendingEntities={setPendingEntities}
        setPendingRelations={setPendingRelations}
        setReplaceExistingEntities={setReplaceExistingEntities}
        setIsGeneratingMetadata={setIsGeneratingMetadata}
        setTopicMetadataModelType={setTopicMetadataModelType}
        setTopicMetadataSelectedModel={setTopicMetadataSelectedModel}
        setTopicMetadataMode={setTopicMetadataMode}
        setEntitySearchQuery={setEntitySearchQuery}
        setEntityTypeFilter={setEntityTypeFilter}
        setShowDeleteEntitiesModal={setShowDeleteEntitiesModal}
        setShowAddEntityModal={setShowAddEntityModal}
        setEditingEntity={setEditingEntity}
        setShowDeleteRelationsModal={setShowDeleteRelationsModal}
        setShowAddRelationModal={setShowAddRelationModal}
        setEditingRelation={setEditingRelation}
        showDeleteEntitiesModal={showDeleteEntitiesModal}
        showDeleteRelationsModal={showDeleteRelationsModal}
        showAddEntityModal={showAddEntityModal}
        showAddRelationModal={showAddRelationModal}
        editingEntity={editingEntity}
        editingRelation={editingRelation}
      />

      {/* AI生成モーダル */}
      <AIGenerationModal
        isOpen={isAIGenerationModalOpen}
        activeTab={activeTab}
        monthContents={monthContents}
        aiModelType={aiModelType}
        aiSelectedModel={aiSelectedModel}
        availableAiModels={availableAiModels}
        loadingAiLocalModels={loadingAiLocalModels}
        aiGenerationInput={aiGenerationInput}
        selectedTopicIdsForAI={selectedTopicIdsForAI}
        selectedSummaryIdsForAI={selectedSummaryIdsForAI}
        aiSummaryFormat={aiSummaryFormat}
        aiSummaryLength={aiSummaryLength}
        aiCustomPrompt={aiCustomPrompt}
        isAIGenerating={isAIGenerating}
        aiGeneratedContent={aiGeneratedContent}
        originalContent={originalContent}
        onSetAiModelType={setAiModelType}
        onSetAiSelectedModel={setAiSelectedModel}
        onSetAIGenerationInput={setAIGenerationInput}
        onSetSelectedTopicIdsForAI={setSelectedTopicIdsForAI}
        onSetSelectedSummaryIdsForAI={setSelectedSummaryIdsForAI}
        onSetAiSummaryFormat={setAiSummaryFormat}
        onSetAiSummaryLength={setAiSummaryLength}
        onSetAiCustomPrompt={setAiCustomPrompt}
        onSetAiGeneratedContent={setAiGeneratedContent}
        onSetOriginalContent={setOriginalContent}
        onGenerate={async () => {
          try {
            if (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0 && selectedSummaryIdsForAI.length === 0) {
              alert('概要、月のサマリ、または個別トピックを少なくとも1つ選択してください');
              return;
            }
            
            const currentTabData = monthContents[activeTab] as MonthContent | undefined;
            const isSummaryTab = SUMMARY_TABS.some(t => t.id === activeTab);
            let allTopicsInMonth: Topic[] = [];
            
            if (isSummaryTab) {
              const summaryTabId = activeTab as SummaryTab;
              let targetMonths: MonthTab[] = [];
              
              switch (summaryTabId) {
                case 'q1-summary':
                  targetMonths = ['april', 'may', 'june'];
                  break;
                case 'q2-summary':
                  targetMonths = ['july', 'august', 'september'];
                  break;
                case 'first-half-summary':
                  targetMonths = ['april', 'may', 'june', 'july', 'august', 'september'];
                  break;
                case 'q3-summary':
                  targetMonths = ['october', 'november', 'december'];
                  break;
                case 'q1-q3-summary':
                  targetMonths = ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
                  break;
                case 'q4-summary':
                  targetMonths = ['january', 'february', 'march'];
                  break;
                case 'annual-summary':
                  targetMonths = ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march'];
                  break;
              }
              
              targetMonths.forEach(monthId => {
                const monthData = monthContents[monthId] as MonthContent | undefined;
                if (monthData?.items) {
                  monthData.items.forEach(item => {
                    if (item.topics && item.topics.length > 0) {
                      allTopicsInMonth.push(...item.topics);
                    }
                  });
                }
              });
            } else {
              if (currentTabData?.items) {
                currentTabData.items.forEach(item => {
                  if (item.topics && item.topics.length > 0) {
                    allTopicsInMonth.push(...item.topics);
                  }
                });
              }
            }
            
            const selectedTopics = allTopicsInMonth.filter(topic => selectedTopicIdsForAI.includes(topic.id));
            
            // 選択したサマリを取得
            const selectedSummaries: Array<{ monthId: MonthTab; summary: string; label: string }> = [];
            if (isSummaryTab) {
              const summaryTabId = activeTab as SummaryTab;
              let targetMonths: MonthTab[] = [];
              
              switch (summaryTabId) {
                case 'q1-summary':
                  targetMonths = ['april', 'may', 'june'];
                  break;
                case 'q2-summary':
                  targetMonths = ['july', 'august', 'september'];
                  break;
                case 'first-half-summary':
                  targetMonths = ['april', 'may', 'june', 'july', 'august', 'september'];
                  break;
                case 'q3-summary':
                  targetMonths = ['october', 'november', 'december'];
                  break;
                case 'q1-q3-summary':
                  targetMonths = ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
                  break;
                case 'q4-summary':
                  targetMonths = ['january', 'february', 'march'];
                  break;
                case 'annual-summary':
                  targetMonths = ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march'];
                  break;
              }
              
              targetMonths.forEach(monthId => {
                const monthData = monthContents[monthId] as MonthContent | undefined;
                if (monthData?.summaryId && selectedSummaryIdsForAI.includes(monthData.summaryId)) {
                  const monthLabel = MONTHS.find(m => m.id === monthId)?.label || monthId;
                  selectedSummaries.push({
                    monthId,
                    summary: monthData.summary || '',
                    label: monthLabel,
                  });
                }
              });
            }
            
            setIsAIGenerating(true);
            const summary = await generateAISummary(aiGenerationInput, selectedTopics, selectedSummaries);
            
            // 既存の内容を保存
            const currentContent = currentTabData?.summary || '';
            
            // 状態を設定（比較ビューを表示するため）
            setOriginalContent(currentContent);
            setAiGeneratedContent(summary);
            setIsAIGenerating(false);
          } catch (error: any) {
            setIsAIGenerating(false);
            alert(`エラーが発生しました: ${error.message || '不明なエラー'}`);
          }
        }}
        onApply={() => {
          // 生成結果をサマリに適用
          const currentTabData = monthContents[activeTab] as MonthContent | undefined;
          if (currentTabData && aiGeneratedContent) {
            const updatedContents = { ...monthContents };
            updatedContents[activeTab] = {
              ...currentTabData,
              summary: aiGeneratedContent,
            };
            setMonthContents(updatedContents);
            setHasUnsavedChanges(true);
            // 編集モードに切り替え
            setEditingMonth(activeTab);
            setEditingSection(currentTabData.summaryId ?? null);
            setEditingContent(aiGeneratedContent);
          }
          setAiGeneratedContent(null);
          setOriginalContent(null);
          setIsAIGenerationModalOpen(false);
          setAIGenerationInput('');
          setSelectedTopicIdsForAI([]);
          setSelectedSummaryIdsForAI([]);
          setAiSummaryFormat('auto');
          setAiSummaryLength(500);
          setAiCustomPrompt('');
        }}
        onCancel={() => {
          setAiGeneratedContent(null);
          setOriginalContent(null);
          setAIGenerationInput('');
          setSelectedTopicIdsForAI([]);
          setSelectedSummaryIdsForAI([]);
          setAiSummaryFormat('auto');
          setAiSummaryLength(500);
          setAiCustomPrompt('');
          setIsAIGenerationModalOpen(false);
        }}
      />
      
      {/* 類似トピック検索結果モーダル */}
      <SimilarTopicsModal
        isOpen={showSimilarTopicsModal}
        searchingTopicId={searchingTopicId}
        similarTopics={similarTopics}
        isSearchingSimilarTopics={isSearchingSimilarTopics}
        monthContents={monthContents}
        onClose={() => {
          setShowSimilarTopicsModal(false);
          setSearchingTopicId(null);
          setSimilarTopics([]);
        }}
      />
      
      {/* エンティティ追加・編集モーダル */}
      {showAddEntityModal && showTopicModal && editingTopicId && (
        <AddEntityModal
          isOpen={showAddEntityModal}
          editingEntity={editingEntity}
          onSave={async (name, type) => {
            try {
              if (editingEntity) {
                // 編集モード
                const { updateEntity } = await import('@/lib/entityApi');
                await updateEntity(editingEntity.id, {
                  name,
                  type,
                });
                
                // エンティティリストを更新
                if (pendingEntities) {
                  setPendingEntities(pendingEntities.map(e => 
                    e.id === editingEntity.id ? { ...e, name, type } : e
                  ));
                } else {
                  setTopicEntities(topicEntities.map(e => 
                    e.id === editingEntity.id ? { ...e, name, type } : e
                  ));
                }
                
                alert('エンティティを更新しました');
              } else {
                // 追加モード
                const newEntity = await createEntity({
                  name,
                  type,
                  organizationId: organizationId || undefined,
                  metadata: {
                    topicId: editingTopicId,
                  },
                });
                
                // エンティティリストに追加
                if (pendingEntities) {
                  setPendingEntities([...pendingEntities, newEntity]);
                } else {
                  setTopicEntities([...topicEntities, newEntity]);
                }
                
                alert('エンティティを追加しました');
              }
              
              setShowAddEntityModal(false);
              setEditingEntity(null);
            } catch (error: any) {
              console.error('❌ エンティティ保存エラー:', error);
              alert(`エンティティの保存に失敗しました: ${error.message}`);
            }
          }}
          onCancel={() => {
            setShowAddEntityModal(false);
            setEditingEntity(null);
          }}
        />
      )}
      
      {/* リレーション追加・編集モーダル */}
      {showAddRelationModal && showTopicModal && editingTopicId && (
        <AddRelationModal
          isOpen={showAddRelationModal}
          editingRelation={editingRelation}
          entities={(pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities}
          onSave={async (sourceEntityId, targetEntityId, relationType, description) => {
            try {
              const topicEmbeddingId = `${meetingId}-topic-${editingTopicId}`;
              
              if (editingRelation) {
                // 編集モード
                const { updateRelation } = await import('@/lib/relationApi');
                await updateRelation(editingRelation.id, {
                  sourceEntityId,
                  targetEntityId,
                  relationType,
                  description,
                });
                
                // リレーションリストを更新
                if (pendingRelations) {
                  setPendingRelations(pendingRelations.map(r => 
                    r.id === editingRelation.id ? { ...r, sourceEntityId, targetEntityId, relationType, description } : r
                  ));
                } else {
                  setTopicRelations(topicRelations.map(r => 
                    r.id === editingRelation.id ? { ...r, sourceEntityId, targetEntityId, relationType, description } : r
                  ));
                }
                
                alert('リレーションを更新しました');
              } else {
                // 追加モード
                const newRelation = await createRelation({
                  topicId: topicEmbeddingId,
                  sourceEntityId,
                  targetEntityId,
                  relationType,
                  description,
                  organizationId: organizationId,
                });
                
                // リレーションリストに追加
                if (pendingRelations) {
                  setPendingRelations([...pendingRelations, newRelation]);
                } else {
                  setTopicRelations([...topicRelations, newRelation]);
                }
                
                alert('リレーションを追加しました');
              }
              
              setShowAddRelationModal(false);
              setEditingRelation(null);
            } catch (error: any) {
              console.error('❌ リレーション保存エラー:', error);
              alert(`リレーションの保存に失敗しました: ${error.message}`);
            }
          }}
          onCancel={() => {
            setShowAddRelationModal(false);
            setEditingRelation(null);
          }}
        />
      )}
    </Layout>
  );
}

export default function MeetingNoteDetailPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <MeetingNoteDetailPageContent />
    </Suspense>
  );
}
