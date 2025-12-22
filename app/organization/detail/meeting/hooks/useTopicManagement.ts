import { useState, useEffect, useCallback } from 'react';
import { saveMeetingNote } from '@/lib/orgApi';
import type { MeetingNote } from '@/lib/orgApi';
import type { TabType, MonthContent, MeetingNoteData } from '../types';
import type { Topic, TopicSemanticCategory, TopicImportance } from '@/types/topicMetadata';
import { getRelationsByTopicId, deleteRelation } from '@/lib/relationApi';
import { callTauriCommand } from '@/lib/localFirebase';
import { deleteTopicFromChroma } from '@/lib/chromaSync';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';
import { devLog, devWarn } from '../utils';

interface UseTopicManagementProps {
  monthContents: MeetingNoteData;
  setMonthContents: (contents: MeetingNoteData) => void;
  activeTab: TabType;
  meetingNote: MeetingNote | null;
  meetingId: string;
  organizationId: string;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setSavingStatus: (status: 'idle' | 'saving' | 'saved') => void;
}

export function useTopicManagement({
  monthContents,
  setMonthContents,
  activeTab,
  meetingNote,
  meetingId,
  organizationId,
  setHasUnsavedChanges,
  setSavingStatus,
}: UseTopicManagementProps) {
  // トピック削除確認モーダル
  const [showDeleteTopicModal, setShowDeleteTopicModal] = useState(false);
  const [deleteTargetTopicItemId, setDeleteTargetTopicItemId] = useState<string | null>(null);
  const [deleteTargetTopicId, setDeleteTargetTopicId] = useState<string | null>(null);
  
  // 個別トピック関連の状態
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopicItemId, setEditingTopicItemId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicContent, setTopicContent] = useState('');
  // メタデータフィールド（Phase 1）
  const [topicSemanticCategory, setTopicSemanticCategory] = useState<TopicSemanticCategory | ''>('');
  const [topicKeywords, setTopicKeywords] = useState<string>(''); // カンマ区切りで入力
  const [topicSummary, setTopicSummary] = useState<string>('');
  const [topicImportance, setTopicImportance] = useState<TopicImportance | ''>('');
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [pendingMetadata, setPendingMetadata] = useState<{
    semanticCategory?: TopicSemanticCategory;
    importance?: TopicImportance;
    keywords?: string[];
    summary?: string;
  } | null>(null);
  
  // AI生成用のモデル選択とモード選択
  const [topicMetadataModelType, setTopicMetadataModelType] = useState<'gpt' | 'local'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('topicMetadataGenerationModelType');
      return (saved as 'gpt' | 'local') || 'gpt';
    }
    return 'gpt';
  });
  const [topicMetadataSelectedModel, setTopicMetadataSelectedModel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('topicMetadataGenerationModel');
      return saved || 'gpt-4o-mini';
    }
    return 'gpt-4o-mini';
  });
  const [topicMetadataLocalModels, setTopicMetadataLocalModels] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingTopicMetadataLocalModels, setLoadingTopicMetadataLocalModels] = useState(false);
  const [topicMetadataMode, setTopicMetadataMode] = useState<'overwrite' | 'merge'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('topicMetadataGenerationMode');
      return (saved as 'overwrite' | 'merge') || 'overwrite';
    }
    return 'overwrite';
  });
  
  // 類似トピック検索関連
  const [showSimilarTopicsModal, setShowSimilarTopicsModal] = useState(false);
  const [searchingTopicId, setSearchingTopicId] = useState<string | null>(null);
  const [similarTopics, setSimilarTopics] = useState<Array<{ topicId: string; meetingNoteId: string; similarity: number }>>([]);
  const [isSearchingSimilarTopics, setIsSearchingSimilarTopics] = useState(false);
  
  // トピックの開閉状態を管理（トピックIDをキーとする）
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // データベース操作のリトライ関数
  const retryDbOperation = useCallback(async <T,>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 100
  ): Promise<T> => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        if (error?.message?.includes('database is locked') && i < maxRetries - 1) {
          devLog(`⚠️ [retryDbOperation] データベースロック検出、${delayMs}ms後にリトライ... (${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }, []);

  // トピック削除確認モーダルを表示
  const handleDeleteTopic = useCallback((itemId: string, topicId: string) => {
    setDeleteTargetTopicItemId(itemId);
    setDeleteTargetTopicId(topicId);
    setShowDeleteTopicModal(true);
  }, []);

  // トピック削除実行
  const confirmDeleteTopic = useCallback(async () => {
    if (!deleteTargetTopicItemId || !deleteTargetTopicId) {
      devWarn('⚠️ [confirmDeleteTopic] 削除対象が設定されていません');
      return;
    }
    
    const itemId = deleteTargetTopicItemId;
    const topicId = deleteTargetTopicId;
    
    devLog('✅ [confirmDeleteTopic] 削除実行開始:', { itemId, topicId });
    
    // モーダルを閉じる
    setShowDeleteTopicModal(false);
    setDeleteTargetTopicItemId(null);
    setDeleteTargetTopicId(null);
    
    // 更新されたコンテンツを直接計算
    const updated = { ...monthContents };
    const tabData = updated[activeTab] as MonthContent | undefined;
    if (tabData) {
      const itemIndex = tabData.items.findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
        const updatedItems = [...tabData.items];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          topics: updatedItems[itemIndex].topics?.filter(t => t.id !== topicId) || [],
        };
        updated[activeTab] = {
          ...tabData,
          items: updatedItems,
        };
      }
    }
    
    // 状態を更新
    setMonthContents(updated);
    setHasUnsavedChanges(true);
    
    // トピックに関連するリレーションとエンベディングを削除（順次実行）
    if (meetingNote && organizationId) {
      try {
        setSavingStatus('saving');
        
        // 1. リレーションを削除
        const topicEmbeddingId = `${meetingId}-topic-${topicId}`;
        try {
          const relations = await retryDbOperation(() => getRelationsByTopicId(topicEmbeddingId));
          devLog(`📊 [confirmDeleteTopic] 関連リレーション: ${relations.length}件`);
          
          // リレーションを順次削除
          for (const relation of relations) {
            try {
              await retryDbOperation(() => deleteRelation(relation.id));
              devLog(`✅ [confirmDeleteTopic] リレーション削除: ${relation.id}`);
            } catch (error: any) {
              devWarn(`⚠️ [confirmDeleteTopic] リレーション削除エラー（続行します）: ${relation.id}`, error);
            }
          }
        } catch (error: any) {
          devWarn('⚠️ [confirmDeleteTopic] リレーション取得エラー（続行します）:', error);
        }
        
        // 2. トピックを削除（topicsテーブルから）
        // topicEmbeddingIdは既に定義済み
        // 埋め込みはChromaDBで管理されているため、SQLiteからはtopicsテーブルのみ削除
        try {
          await retryDbOperation(() => callTauriCommand('doc_delete', {
            collectionName: 'topics',
            docId: topicEmbeddingId,
          }));
          devLog(`✅ [confirmDeleteTopic] トピック削除: ${topicEmbeddingId}`);
        } catch (error: any) {
          devWarn('⚠️ [confirmDeleteTopic] トピック削除エラー（続行します）:', error);
        }
        
        // 3. ChromaDBからも削除（非同期、エラーは無視）
        // organizationIdが存在する場合のみ実行（事業会社の場合はスキップ）
        if (organizationId) {
          try {
            await deleteTopicFromChroma(topicId, meetingId, organizationId);
            devLog(`✅ [confirmDeleteTopic] ChromaDBトピックエンベディング削除: ${topicId}`);
          } catch (error: any) {
            devWarn('⚠️ [confirmDeleteTopic] ChromaDBトピックエンベディング削除エラー（続行します）:', error);
          }
        } else {
          devLog('⚠️ [confirmDeleteTopic] organizationIdが存在しないため、ChromaDB削除をスキップ');
        }
        
        // 4. 議事録を保存（最後に実行）
        const contentJson = JSON.stringify(updated, null, 2);
        // 事業会社の管理はorganizationsテーブルのtypeカラムで行うため、通常のsaveMeetingNoteを使用
        await retryDbOperation(() => saveMeetingNote({
          ...meetingNote,
          content: contentJson,
        }));
        
        devLog('✅ [confirmDeleteTopic] 自動保存成功');
        setHasUnsavedChanges(false);
        setSavingStatus('saved');
        setTimeout(() => setSavingStatus('idle'), 2000);
      } catch (error: any) {
        console.error('❌ [confirmDeleteTopic] 自動保存に失敗しました:', error);
        setSavingStatus('idle');
        alert(`保存に失敗しました: ${error?.message || '不明なエラー'}`);
      }
    }
  }, [deleteTargetTopicItemId, deleteTargetTopicId, monthContents, activeTab, setMonthContents, setHasUnsavedChanges, meetingNote, organizationId, meetingId, setSavingStatus, retryDbOperation]);
  
  // トピック削除確認モーダルをキャンセル
  const cancelDeleteTopic = useCallback(() => {
    setShowDeleteTopicModal(false);
    setDeleteTargetTopicItemId(null);
    setDeleteTargetTopicId(null);
  }, []);

  // トピックメタデータ生成用のローカルモデル一覧を取得
  const loadTopicMetadataLocalModels = useCallback(async () => {
    setLoadingTopicMetadataLocalModels(true);
    try {
      const models = await getAvailableOllamaModels();
      if (models.length > 0) {
        const formattedModels = models.map(model => {
          let label = model.name;
          if (model.name.includes(':')) {
            const [name, tag] = model.name.split(':');
            const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
            const spacedName = formattedName.replace(/([a-z])(\d)/g, '$1 $2');
            if (tag === 'latest') {
              label = `${spacedName} (Latest)`;
            } else {
              const formattedTag = tag.replace(/(\d)([a-z])/g, (match, num, letter) => `${num}${letter.toUpperCase()}`);
              label = `${spacedName} ${formattedTag}`;
            }
          } else {
            label = model.name.charAt(0).toUpperCase() + model.name.slice(1);
          }
          return { value: model.name, label };
        });
        setTopicMetadataLocalModels(formattedModels);
        // 最初のモデルを選択
        if (formattedModels.length > 0 && !topicMetadataSelectedModel.startsWith('gpt')) {
          setTopicMetadataSelectedModel(formattedModels[0].value);
        }
      } else {
        setTopicMetadataLocalModels([]);
      }
    } catch (error) {
      console.error('ローカルモデルの取得エラー:', error);
      setTopicMetadataLocalModels([]);
    } finally {
      setLoadingTopicMetadataLocalModels(false);
    }
  }, [topicMetadataSelectedModel]);

  // モデルタイプが変更されたら、ローカルモデルを取得
  useEffect(() => {
    if (topicMetadataModelType === 'local') {
      loadTopicMetadataLocalModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicMetadataModelType]);

  // モデルタイプとモデル選択の変更を保存
  useEffect(() => {
    if (topicMetadataModelType) {
      localStorage.setItem('topicMetadataGenerationModelType', topicMetadataModelType);
    }
  }, [topicMetadataModelType]);
  
  useEffect(() => {
    if (topicMetadataSelectedModel) {
      localStorage.setItem('topicMetadataGenerationModel', topicMetadataSelectedModel);
    }
  }, [topicMetadataSelectedModel]);

  useEffect(() => {
    if (topicMetadataMode) {
      localStorage.setItem('topicMetadataGenerationMode', topicMetadataMode);
    }
  }, [topicMetadataMode]);

  return {
    // トピック削除関連
    showDeleteTopicModal,
    deleteTargetTopicItemId,
    deleteTargetTopicId,
    handleDeleteTopic,
    confirmDeleteTopic,
    cancelDeleteTopic,
    
    // トピック編集関連
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
    
    // トピックメタデータ生成関連
    topicMetadataModelType,
    setTopicMetadataModelType,
    topicMetadataSelectedModel,
    setTopicMetadataSelectedModel,
    topicMetadataLocalModels,
    loadingTopicMetadataLocalModels,
    topicMetadataMode,
    setTopicMetadataMode,
    loadTopicMetadataLocalModels,
    
    // 類似トピック検索関連
    showSimilarTopicsModal,
    setShowSimilarTopicsModal,
    searchingTopicId,
    setSearchingTopicId,
    similarTopics,
    setSimilarTopics,
    isSearchingSimilarTopics,
    setIsSearchingSimilarTopics,
    
    // トピック展開状態
    expandedTopics,
    setExpandedTopics,
  };
}

