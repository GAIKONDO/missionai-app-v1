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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { marked } from 'marked';
import type { Entity, EntityType } from '@/types/entity';
import type { Relation, RelationType } from '@/types/relation';
import { getRelationsByTopicId, createRelation, deleteRelation } from '@/lib/relationApi';
import { getEntityById, createEntity, getEntitiesByOrganizationId, deleteEntity } from '@/lib/entityApi';
import { callTauriCommand } from '@/lib/localFirebase';
import { deleteTopicFromChroma } from '@/lib/chromaSync';

// 開発環境でのみログを有効化するヘルパー関数（パフォーマンス最適化）
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};
const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

// ReactMarkdown用の共通コンポーネント設定（リンクを新しいタブで開くように）
const markdownComponents = {
  a: ({ node, ...props }: any) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
    />
  ),
};

// アイコンコンポーネント
const SaveIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);

const DownloadIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const BackIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"></path>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const EditIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const DeleteIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

type MonthTab = 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december' | 'january' | 'february' | 'march';
type SummaryTab = 'q1-summary' | 'q2-summary' | 'first-half-summary' | 'q3-summary' | 'q1-q3-summary' | 'q4-summary' | 'annual-summary';
type TabType = MonthTab | SummaryTab;

interface MonthContent {
  summary: string; // 月サマリのMDコンテンツ
  summaryId?: string; // サマリのユニークID
  items: Array<{
    id: string;
    title: string;
    content: string; // MDコンテンツ
    location?: string;
    date?: string;
    author?: string;
    topics?: Array<Topic>; // Topic型に拡張（メタデータを含む）
  }>;
}

interface MeetingNoteData {
  [key: string]: MonthContent; // 月も総括タブもMonthContent型
}

function MeetingNoteDetailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const organizationId = searchParams?.get('id') as string;
  const meetingId = searchParams?.get('meetingId') as string;
  
  const [meetingNote, setMeetingNote] = useState<MeetingNote | null>(null);
  const [orgData, setOrgData] = useState<OrgNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('april');
  const [activeSection, setActiveSection] = useState<string>('summary');
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingHtml, setDownloadingHtml] = useState(false);
  
  // 各月のコンテンツデータ
  const [monthContents, setMonthContents] = useState<MeetingNoteData>({});
  
  // 編集モード
  const [editingMonth, setEditingMonth] = useState<MonthTab | SummaryTab | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingItemTitle, setEditingItemTitle] = useState('');
  const [editingItemDate, setEditingItemDate] = useState(''); // 日付部分（YYYY-MM-DD形式）
  const [editingItemTime, setEditingItemTime] = useState(''); // 時間部分（任意の文字列）
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // 削除確認モーダル
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteTargetTab, setDeleteTargetTab] = useState<TabType | null>(null);
  const [deleteTargetItemId, setDeleteTargetItemId] = useState<string | null>(null);
  
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
  
  // ナレッジグラフ関連のstate
  const [topicEntities, setTopicEntities] = useState<Entity[]>([]);
  const [topicRelations, setTopicRelations] = useState<Relation[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [pendingEntities, setPendingEntities] = useState<Entity[] | null>(null);
  const [pendingRelations, setPendingRelations] = useState<Relation[] | null>(null);
  const [replaceExistingEntities, setReplaceExistingEntities] = useState(false); // 既存のエンティティ・リレーションを置き換えるか
  // エンティティ・リレーション一括削除確認モーダル
  const [showDeleteEntitiesModal, setShowDeleteEntitiesModal] = useState(false);
  const [showDeleteRelationsModal, setShowDeleteRelationsModal] = useState(false);
  const [showAddEntityModal, setShowAddEntityModal] = useState(false);
  const [showAddRelationModal, setShowAddRelationModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [editingRelation, setEditingRelation] = useState<Relation | null>(null);
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [relationSearchQuery, setRelationSearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | 'all'>('all');
  const [relationTypeFilter, setRelationTypeFilter] = useState<RelationType | 'all'>('all');
  const [bulkOperationMode, setBulkOperationMode] = useState<'none' | 'entities' | 'relations'>('none');
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
  const [selectedRelationIds, setSelectedRelationIds] = useState<Set<string>>(new Set());
  const [showMergeEntityModal, setShowMergeEntityModal] = useState(false);
  const [mergeSourceEntity, setMergeSourceEntity] = useState<Entity | null>(null);
  const [showPathSearchModal, setShowPathSearchModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // ナビゲーションで展開されている議事録アイテムを管理（アイテムIDをキーとする）
  const [expandedNavItems, setExpandedNavItems] = useState<Set<string>>(new Set());
  
  // AI作文モーダル関連
  const [isAIGenerationModalOpen, setIsAIGenerationModalOpen] = useState(false);
  const [aiGenerationInput, setAIGenerationInput] = useState('');
  const [selectedTopicIdsForAI, setSelectedTopicIdsForAI] = useState<string[]>([]);
  const [selectedSummaryIdsForAI, setSelectedSummaryIdsForAI] = useState<string[]>([]);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiSummaryFormat, setAiSummaryFormat] = useState<'auto' | 'bullet' | 'paragraph' | 'custom'>('auto');
  const [aiSummaryLength, setAiSummaryLength] = useState<number>(500);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  
  // AI生成結果の比較用
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  
  // AIモデル選択関連
  const [aiModelType, setAiModelType] = useState<'gpt' | 'local'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiGenerationModelType');
      return (saved as 'gpt' | 'local') || 'gpt';
    }
    return 'gpt';
  });
  const [aiSelectedModel, setAiSelectedModel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiGenerationSelectedModel');
      return saved || 'gpt-4o-mini';
    }
    return 'gpt-4o-mini';
  });
  const [aiLocalModels, setAiLocalModels] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingAiLocalModels, setLoadingAiLocalModels] = useState(false);
  
  // GPTモデルリスト
  const gptModels = [
    { value: 'gpt-5.1', label: 'gpt-5.1' },
    { value: 'gpt-5', label: 'gpt-5' },
    { value: 'gpt-5-mini', label: 'gpt-5-mini' },
    { value: 'gpt-5-nano', label: 'gpt-5-nano' },
    { value: 'gpt-4.1', label: 'gpt-4.1' },
    { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
    { value: 'gpt-4.1-nano', label: 'gpt-4.1-nano' },
    { value: 'gpt-4o', label: 'gpt-4o' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  ];
  
  const availableAiModels = aiModelType === 'gpt' ? gptModels : aiLocalModels;
  
  const MONTHS: Array<{ id: MonthTab; label: string }> = [
    { id: 'april', label: '4月' },
    { id: 'may', label: '5月' },
    { id: 'june', label: '6月' },
    { id: 'july', label: '7月' },
    { id: 'august', label: '8月' },
    { id: 'september', label: '9月' },
    { id: 'october', label: '10月' },
    { id: 'november', label: '11月' },
    { id: 'december', label: '12月' },
    { id: 'january', label: '1月' },
    { id: 'february', label: '2月' },
    { id: 'march', label: '3月' },
  ];
  
  const SUMMARY_TABS: Array<{ id: SummaryTab; label: string }> = [
    { id: 'q1-summary', label: '1Q総括' },
    { id: 'q2-summary', label: '2Q総括' },
    { id: 'first-half-summary', label: '上期総括' },
    { id: 'q3-summary', label: '3Q総括' },
    { id: 'q1-q3-summary', label: '1-3Q総括' },
    { id: 'q4-summary', label: '4Q総括' },
    { id: 'annual-summary', label: '年間総括' },
  ];

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      if (!organizationId || !meetingId) {
        setError('組織IDまたは事業会社ID、または議事録IDが指定されていません');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // 議事録データを取得
        const noteData = await getMeetingNoteById(meetingId);
        if (!noteData) {
          setError('議事録が見つかりませんでした');
          setLoading(false);
          return;
        }
        
        setMeetingNote(noteData);
        
        // コンテンツをパース（JSON形式で保存されている想定）
        if (noteData.content) {
          try {
            const parsed = JSON.parse(noteData.content) as MeetingNoteData;
            // 型チェックと初期化
            const initialized: MeetingNoteData = {};
            MONTHS.forEach(month => {
              if (parsed[month.id] && typeof parsed[month.id] === 'object') {
                const monthData = parsed[month.id] as MonthContent;
                // サマリにIDがない場合は付与
                const summaryId = monthData.summaryId || generateUniqueId();
                // 各アイテムにIDがない場合は付与
                const itemsWithIds = monthData.items.map(item => ({
                  ...item,
                  id: item.id || generateUniqueId(),
                }));
                initialized[month.id] = {
                  ...monthData,
                  summaryId,
                  items: itemsWithIds,
                };
              } else {
                initialized[month.id] = { 
                  summary: '', 
                  summaryId: generateUniqueId(),
                  items: [] 
                };
              }
            });
            SUMMARY_TABS.forEach(tab => {
              // 既存の文字列データはsummaryとして扱い、itemsは空配列として初期化
              if (parsed[tab.id]) {
                if (typeof parsed[tab.id] === 'string') {
                  // 既存の文字列データをMonthContent型に変換
                  initialized[tab.id] = {
                    summary: parsed[tab.id] as unknown as string,
                    summaryId: generateUniqueId(),
                    items: [],
                  };
                } else if (typeof parsed[tab.id] === 'object') {
                  // 既にMonthContent型の場合は、サマリと各アイテムにIDがない場合は付与
                  const tabData = parsed[tab.id] as MonthContent;
                  const summaryId = tabData.summaryId || generateUniqueId();
                  const itemsWithIds = tabData.items.map(item => ({
                    ...item,
                    id: item.id || generateUniqueId(),
                  }));
                  initialized[tab.id] = {
                    ...tabData,
                    summaryId,
                    items: itemsWithIds,
                  };
                } else {
                  initialized[tab.id] = { 
                    summary: '', 
                    summaryId: generateUniqueId(),
                    items: [] 
                  };
                }
              } else {
                initialized[tab.id] = { 
                  summary: '', 
                  summaryId: generateUniqueId(),
                  items: [] 
                };
              }
            });
            setMonthContents(initialized);
            
            // 初期タブのサマリIDをactiveSectionに設定
            const initialTab = activeTab;
            const initialTabData = initialized[initialTab] as MonthContent | undefined;
            if (initialTabData?.summaryId) {
              setActiveSection(initialTabData.summaryId);
            }
          } catch {
            // JSONでない場合は空のオブジェクトとして扱う
            const empty: MeetingNoteData = {};
            MONTHS.forEach(month => {
              empty[month.id] = { summary: '', summaryId: generateUniqueId(), items: [] };
            });
            SUMMARY_TABS.forEach(tab => {
              empty[tab.id] = { summary: '', summaryId: generateUniqueId(), items: [] };
            });
            setMonthContents(empty);
          }
        } else {
          // コンテンツがない場合も初期化
          const empty: MeetingNoteData = {};
          MONTHS.forEach(month => {
            empty[month.id] = { summary: '', summaryId: generateUniqueId(), items: [] };
          });
          SUMMARY_TABS.forEach(tab => {
            empty[tab.id] = { summary: '', summaryId: generateUniqueId(), items: [] };
          });
          setMonthContents(empty);
          
          // 初期タブのサマリIDをactiveSectionに設定
          const initialTab = activeTab;
          const initialTabData = empty[initialTab] as MonthContent | undefined;
          if (initialTabData?.summaryId) {
            setActiveSection(initialTabData.summaryId);
          }
        }
        
        // 組織データを取得（organizationIdが指定されている場合のみ）
        if (organizationId) {
          const orgTree = await getOrgTreeFromDb();
          if (orgTree) {
            const findOrganization = (node: OrgNodeData): OrgNodeData | null => {
              if (node.id === organizationId) {
                return node;
              }
              if (node.children) {
                for (const child of node.children) {
                  const found = findOrganization(child);
                  if (found) return found;
                }
              }
              return null;
            };
            const foundOrg = findOrganization(orgTree);
            setOrgData(foundOrg);
          }
        } else {
          // 組織データを設定
          setOrgData(null);
        }
        
        setError(null);
      } catch (err: any) {
        console.error('データの読み込みエラー:', err);
        setError(err.message || 'データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId, meetingId]);

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

  // トピック編集モーダルを開いたときにエンティティとリレーションを読み込む
  useEffect(() => {
    if (!showTopicModal || !editingTopicId || !organizationId) {
      return;
    }

    const loadKnowledgeGraph = async () => {
      try {
        setIsLoadingEntities(true);
        setIsLoadingRelations(true);

        // エンティティを読み込み
        const entities = await getEntitiesByOrganizationId(organizationId);
        // トピックに関連するエンティティをフィルタリング
        const topicEmbeddingId = `${meetingId}-topic-${editingTopicId}`;
        const topicEntities = entities.filter(e => 
          e.metadata && typeof e.metadata === 'object' && 'topicId' in e.metadata && e.metadata.topicId === editingTopicId
        );
        setTopicEntities(topicEntities);

        // リレーションを読み込み（topicEmbeddingIdを使用）
        const relations = await getRelationsByTopicId(topicEmbeddingId);
        setTopicRelations(relations);
        
        // リレーションに関連するエンティティも取得
        const relationEntityIds = new Set<string>();
        relations.forEach(r => {
          if (r.sourceEntityId) relationEntityIds.add(r.sourceEntityId);
          if (r.targetEntityId) relationEntityIds.add(r.targetEntityId);
        });
        
        // エンティティを取得して追加
        const relationEntities: Entity[] = [];
        for (const entityId of relationEntityIds) {
          try {
            const entity = await getEntityById(entityId);
            if (entity && !topicEntities.find(e => e.id === entityId)) {
              relationEntities.push(entity);
            }
          } catch (error) {
            devWarn(`⚠️ エンティティ取得エラー (${entityId}):`, error);
          }
        }
        
        // エンティティリストに追加
        if (relationEntities.length > 0) {
          setTopicEntities([...topicEntities, ...relationEntities]);
        }
      } catch (error: any) {
        console.error('❌ ナレッジグラフ読み込みエラー:', error);
      } finally {
        setIsLoadingEntities(false);
        setIsLoadingRelations(false);
      }
    };

    loadKnowledgeGraph();
  }, [showTopicModal, editingTopicId, organizationId, meetingId]);


  // 手動保存
  const handleManualSave = useCallback(async () => {
    if (!meetingNote) return;
    
    try {
      setSavingStatus('saving');
      
      // 現在のコンテンツをJSON文字列に変換
      const contentJson = JSON.stringify(monthContents, null, 2);
      
      // データを保存（事業会社の管理はorganizationsテーブルのtypeカラムで行うため、通常のsaveMeetingNoteを使用）
      await saveMeetingNote({
        ...meetingNote,
        content: contentJson,
      });
      
      devLog('✅ [handleManualSave] 保存成功');
      
      setSavingStatus('saved');
      setHasUnsavedChanges(false); // 保存完了後、未保存フラグをリセット
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (error: any) {
      console.error('❌ [handleManualSave] 保存に失敗しました:', error);
      alert(`保存に失敗しました: ${error?.message || '不明なエラー'}`);
      setSavingStatus('idle');
    }
  }, [meetingNote, monthContents]);

  // JSONダウンロード
  const handleDownloadJson = useCallback(async () => {
    if (!meetingNote || downloadingJson) return;
    
    try {
      setDownloadingJson(true);
      
      const dataToDownload = {
        ...meetingNote,
        content: JSON.stringify(monthContents, null, 2),
      };
      
      const jsonString = JSON.stringify(dataToDownload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${meetingNote.id || 'meeting-note'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      devLog('✅ [handleDownloadJson] JSONファイルのダウンロード成功');
      
      // 少し遅延を入れてから状態をリセット（視覚的なフィードバックのため）
      setTimeout(() => {
        setDownloadingJson(false);
      }, 500);
    } catch (error: any) {
      console.error('❌ [handleDownloadJson] JSONファイルのダウンロードに失敗しました:', error);
      alert(`JSONファイルのダウンロードに失敗しました: ${error?.message || '不明なエラー'}`);
      setDownloadingJson(false);
    }
  }, [meetingNote, monthContents, downloadingJson]);

  // HTMLダウンロード
  const handleDownloadHtml = useCallback(async () => {
    if (!meetingNote || downloadingHtml) return;
    
    try {
      setDownloadingHtml(true);
      // MarkdownをHTMLに変換する関数
      const markdownToHtml = (markdown: string): string => {
        if (!markdown) return '';
        try {
          return marked.parse(markdown, { breaks: true, gfm: true }) as string;
        } catch (error) {
          console.error('Markdown変換エラー:', error);
          return markdown.replace(/\n/g, '<br>');
        }
      };

      // タブのコンテンツペインを生成
      const generateContentPane = (tabId: TabType, tabData: MonthContent, isFirst: boolean): string => {
        const tabLabel = MONTHS.find(m => m.id === tabId)?.label || 
                        SUMMARY_TABS.find(t => t.id === tabId)?.label || 
                        tabId;
        const isMonthTab = MONTHS.some(m => m.id === tabId);
        
        let html = `<div id="${tabId}" class="content-pane${isFirst ? ' active' : ''}">`;
        html += `<h2>${tabLabel}${isMonthTab ? 'の議事録' : ''}</h2>`;
        
        // サマリ
        if (tabData.summary) {
          html += `<div id="${tabId}-summary" class="content-section month-summary${isFirst ? ' active' : ''}">`;
          html += `<h3>${tabLabel}サマリ</h3>`;
          html += `<div>${markdownToHtml(tabData.summary)}</div>`;
          html += `</div>`;
        }
        
        // 議事録アイテム（個別トピックは除外）
        if (tabData.items && tabData.items.length > 0) {
          tabData.items.forEach((item, index) => {
            const itemId = `${tabId}-item${index + 1}`;
            html += `<div id="${itemId}" class="content-section${isFirst && index === 0 && !tabData.summary ? ' active' : ''}">`;
            html += `<h3>${item.title || '無題'}</h3>`;
            if (item.date || item.location || item.author) {
              html += `<p>`;
              if (item.location) html += `<strong>場所:</strong> ${item.location}<br>`;
              if (item.date) html += `<strong>日時:</strong> ${item.date}<br>`;
              if (item.author) html += `<strong>文責:</strong> ${item.author}`;
              html += `</p>`;
            }
            // 個別トピック（item.topics）はエクスポート対象外
            if (item.content) {
              html += `<div>${markdownToHtml(item.content)}</div>`;
            }
            html += `</div>`;
          });
        }
        
        html += `</div>`;
        return html;
      };

      // サイドバーナビゲーションを生成
      const generateSidebar = (tabId: TabType, tabData: MonthContent, isFirst: boolean): string => {
        const tabLabel = MONTHS.find(m => m.id === tabId)?.label || 
                        SUMMARY_TABS.find(t => t.id === tabId)?.label || 
                        tabId;
        
        let html = `<div id="${tabId}-sidebar" class="sidebar-content${isFirst ? ' active' : ''}">`;
        html += `<h4>${tabLabel}</h4>`;
        html += `<ul>`;
        
        // サマリリンク
        if (tabData.summary) {
          html += `<li><a href="#${tabId}-summary" class="sidebar-link${isFirst ? ' active' : ''}">サマリ</a></li>`;
        }
        
        // 議事録アイテムリンク
        if (tabData.items && tabData.items.length > 0) {
          tabData.items.forEach((item, index) => {
            const itemId = `${tabId}-item${index + 1}`;
            html += `<li><a href="#${itemId}" class="sidebar-link">${item.title || '無題'}</a></li>`;
          });
        }
        
        html += `</ul>`;
        html += `</div>`;
        return html;
      };

      // タブHTMLを生成
      let tabsHtml = '';
      tabsHtml += `<div class="tabs-wrapper">`;
      tabsHtml += `<div class="tabs">`;
      tabsHtml += `<div class="tabs-row">`;
      MONTHS.forEach((month, index) => {
        tabsHtml += `<li class="tab-item${index === 0 ? ' active' : ''}" data-tab="${month.id}">${month.label}</li>`;
      });
      tabsHtml += `</div>`;
      tabsHtml += `<div class="tabs-row">`;
      SUMMARY_TABS.forEach((tab) => {
        tabsHtml += `<li class="tab-item" data-tab="${tab.id}">${tab.label}</li>`;
      });
      tabsHtml += `</div>`;
      tabsHtml += `</div>`;
      tabsHtml += `</div>`;

      // コンテンツペインを生成
      let contentPanesHtml = '';
      let firstTab = true;
      MONTHS.forEach(month => {
        const monthData = monthContents[month.id];
        if (monthData) {
          contentPanesHtml += generateContentPane(month.id, monthData, firstTab);
          firstTab = false;
        }
      });
      SUMMARY_TABS.forEach(tab => {
        const tabData = monthContents[tab.id];
        if (tabData) {
          contentPanesHtml += generateContentPane(tab.id, tabData, firstTab);
          firstTab = false;
        }
      });

      // サイドバーを生成
      let sidebarHtml = '';
      firstTab = true;
      MONTHS.forEach(month => {
        const monthData = monthContents[month.id];
        if (monthData) {
          sidebarHtml += generateSidebar(month.id, monthData, firstTab);
          firstTab = false;
        }
      });
      SUMMARY_TABS.forEach(tab => {
        const tabData = monthContents[tab.id];
        if (tabData) {
          sidebarHtml += generateSidebar(tab.id, tabData, firstTab);
          firstTab = false;
        }
      });

      // HTMLテンプレート（テンプレートHTMLと同じ構造）
      const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${meetingNote.title || '議事録アーカイブ'}</title>
    <style>
        :root {
            --primary-color: #2c3e50;
            --secondary-color: #0066CC;
            --accent-color: #e74c3c;
            --background-color: #f4f7fb;
            --text-color: #34495e;
            --light-gray: #bdc3c7;
            --white: #ffffff;
        }

        body {
            margin: 0;
            font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
        }

        .header {
            background-color: var(--primary-color);
            color: var(--white);
            padding: 28px 0 24px 0;
            text-align: center;
            border-bottom: 5px solid var(--secondary-color);
            box-shadow: 0 4px 16px rgba(44,62,80,0.08);
        }
        .header h1 {
            margin: 0;
            font-size: 2.2em;
            letter-spacing: 2px;
        }

        .archive-container {
            max-width: 1300px;
            margin: 30px auto;
            padding: 0 20px;
        }

        .tabs-wrapper {
            background-color: var(--white);
            border-radius: 12px 12px 0 0;
            box-shadow: 0 5px 20px rgba(44,62,80,0.07);
            border-bottom: 2px solid var(--secondary-color);
        }
        .tabs {
            display: flex;
            flex-direction: column;
            list-style-type: none;
            margin: 0;
            padding: 0;
        }
        .tabs-row {
            display: flex;
            width: 100%;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .tabs-row:first-child {
            border-bottom: 2px solid var(--secondary-color);
            padding-bottom: 10px;
            margin-bottom: 10px;
        }
        .tab-item {
            padding: 15px 28px;
            cursor: pointer;
            color: var(--primary-color);
            font-weight: bold;
            border: none;
            border-radius: 8px 8px 0 0;
            background: none;
            transition: all 0.2s;
            flex-shrink: 0;
            text-align: center;
            margin: 0 3px;
            font-size: 1.08em;
            box-shadow: 0 2px 8px rgba(44,62,80,0.04);
        }
        .tabs-row:first-child .tab-item {
            flex: 0 0 auto;
            width: calc((100% - 750px) / 12);
        }
        .tabs-row:last-child .tab-item {
            flex: 1;
        }
        .tab-item:hover {
            background-color: var(--secondary-color);
            color: var(--white);
            transform: translateY(-2px) scale(1.04);
            box-shadow: 0 4px 16px rgba(0,102,204,0.10);
        }
        .tab-item.active {
            background-color: var(--secondary-color);
            color: var(--white);
            box-shadow: 0 6px 20px rgba(0,102,204,0.13);
            z-index: 2;
        }

        .content-layout {
            display: flex;
            margin-top: 24px;
            gap: 28px;
        }
        .main-content {
            flex-grow: 1;
            background-color: var(--white);
            padding: 36px 32px 32px 32px;
            border-radius: 14px;
            min-height: 350px;
            box-shadow: 0 6px 24px rgba(44,62,80,0.10);
            border: none;
        }
        .content-pane {
            display: none;
        }
        .content-pane.active {
            display: block;
        }
        .content-pane h2 {
            margin-top: 0;
            font-size: 1.7em;
            border-bottom: 2px solid var(--secondary-color);
            padding-bottom: 12px;
            margin-bottom: 28px;
            color: var(--primary-color);
            letter-spacing: 1px;
        }
        .content-pane h3 {
            margin-top: 35px;
            font-size: 1.25em;
            color: var(--primary-color);
            border-left: 5px solid var(--secondary-color);
            padding-left: 15px;
            background: linear-gradient(90deg, #eaf3fa 60%, transparent 100%);
        }
        .content-pane h4 {
            margin-top: 30px;
            font-size: 1.1em;
            color: var(--secondary-color);
            font-weight: bold;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 8px;
        }
        .content-pane h5 {
            margin-top: 25px;
            font-size: 1em;
            color: var(--secondary-color);
            font-weight: bold;
            margin-bottom: 10px;
        }
        .content-pane h6 {
            margin-top: 20px;
            font-size: 0.98em;
            color: var(--secondary-color);
            font-weight: bold;
            margin-bottom: 8px;
        }
        .content-pane p {
            line-height: 1.85;
            margin-bottom: 15px;
            color: #444;
        }
        .content-pane ul {
            margin: 15px 0;
            padding-left: 22px;
        }
        .content-pane li {
            line-height: 1.7;
            margin-bottom: 8px;
            color: #444;
        }
        .content-pane strong {
            color: var(--primary-color);
            font-weight: 600;
        }
        .content-section {
            display: none;
        }
        .content-section.active {
            display: block;
        }
        .content-pane .month-summary {
            background-color: #f8fafd;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            padding: 22px 24px;
            margin-bottom: 32px;
            box-shadow: 0 2px 8px rgba(44,62,80,0.04);
        }
        .content-pane .month-summary h3 {
            color: var(--secondary-color);
            margin-top: 0;
            margin-bottom: 15px;
        }
        .content-pane .month-summary ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .content-pane .month-summary li {
            margin-bottom: 5px;
            color: #444;
        }
        .sidebar-link {
            display: block;
            padding: 12px 16px;
            text-decoration: none;
            color: var(--secondary-color);
            border-radius: 6px;
            transition: background 0.2s, color 0.2s, transform 0.2s;
            cursor: pointer;
            font-weight: 500;
            margin-bottom: 4px;
        }
        .sidebar-link:hover, .sidebar-link.active {
            background-color: var(--secondary-color);
            color: var(--white);
            transform: translateX(5px);
        }
        .sidebar {
            position: sticky;
            top: 20px;
            flex-basis: 300px;
            flex-shrink: 0;
            max-height: calc(100vh - 40px);
            overflow-y: auto;
            background-color: var(--white);
            padding: 28px 20px;
            border-radius: 14px;
            box-shadow: 0 4px 16px rgba(44,62,80,0.08);
            border: none;
        }
        .sidebar-content {
            display: none;
        }
        .sidebar-content.active {
            display: block;
        }
        .sidebar h4 {
            margin-top: 0;
            font-size: 1.08em;
            color: var(--primary-color);
            border-bottom: 2px solid var(--secondary-color);
            padding-bottom: 10px;
            margin-bottom: 18px;
        }
        .sidebar ul {
            list-style-type: none;
            padding: 0;
            margin: 0;
        }
        .sidebar li a {
            display: block;
            padding: 10px;
            text-decoration: none;
            color: var(--secondary-color);
            border-radius: 5px;
            transition: background-color 0.2s;
        }
        .sidebar li a:hover {
            background-color: #e9ecef;
        }
    </style>
</head>
<body>

    <header class="header">
        <h1>${meetingNote.title || '議事録アーカイブ'}</h1>
    </header>

    <div class="archive-container">
        ${tabsHtml}

        <div class="content-layout">
            <main class="main-content">
                ${contentPanesHtml}
            </main>
            
            <aside class="sidebar">
                ${sidebarHtml}
            </aside>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const tabs = document.querySelectorAll('.tab-item');

            // サイドバーリンクのクリックイベント
            document.querySelectorAll('.sidebar-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    // すべてのサイドバーリンクから.activeクラスを削除
                    document.querySelectorAll('.sidebar-link').forEach(l => {
                        l.classList.remove('active');
                    });
                    
                    // クリックされたリンクに.activeクラスを追加
                    link.classList.add('active');
                    
                    // リンクのhrefから対象IDを取得
                    const targetId = link.getAttribute('href').substring(1);
                    
                    // 総括レポートのリンクかどうかを判定
                    const isSummaryLink = targetId.includes('summary') && !targetId.includes('key-topics') && !targetId.includes('projects') && !targetId.includes('insights');
                    
                    if (isSummaryLink) {
                        // 総括レポートの場合、対応するタブをアクティブにする
                        let tabId;
                        if (targetId.includes('-summary-content')) {
                            tabId = targetId.replace('-summary-content', '');
                        } else if (targetId.includes('-summary')) {
                            tabId = targetId.replace('-summary', '');
                        } else {
                            tabId = targetId;
                        }
                        const targetTab = document.querySelector(\`[data-tab="\${tabId}"]\`);
                        
                        if (targetTab) {
                            // タブをアクティブにする
                            tabs.forEach(item => item.classList.remove('active'));
                            targetTab.classList.add('active');
                            
                            // コンテンツペインを切り替え
                            document.querySelectorAll('.content-pane').forEach(pane => {
                                pane.classList.remove('active');
                            });
                            const targetPane = document.getElementById(tabId);
                            if (targetPane) {
                                targetPane.classList.add('active');
                            }
                            
                            // サイドバーを切り替え
                            document.querySelectorAll('.sidebar-content').forEach(sidebar => {
                                sidebar.classList.remove('active');
                            });
                            const targetSidebar = document.getElementById(tabId + '-sidebar');
                            if (targetSidebar) {
                                targetSidebar.classList.add('active');
                            }
                            
                            // 総括レポートの場合は最初のセクションを表示
                            setTimeout(() => {
                                const currentPane = document.querySelector('.content-pane.active');
                                if (currentPane) {
                                    currentPane.querySelectorAll('.content-section').forEach(section => {
                                        section.classList.remove('active');
                                    });
                                    const firstSection = currentPane.querySelector('.content-section');
                                    if (firstSection) {
                                        firstSection.classList.add('active');
                                    }
                                }
                            }, 10);
                        }
                    } else {
                        // 通常のセクションリンクの場合
                        // 現在のコンテンツペイン内のすべてのセクションを非表示
                        const currentPane = document.querySelector('.content-pane.active');
                        if (currentPane) {
                            currentPane.querySelectorAll('.content-section').forEach(section => {
                                section.classList.remove('active');
                            });
                        }
                        
                        // 対応するセクションを表示
                        const targetElement = document.getElementById(targetId);
                        if (targetElement) {
                            targetElement.classList.add('active');
                        }
                    }
                    
                    // ページの一番上に移動
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                });
            });

            // タブ切り替え時のデフォルト表示設定
            function setDefaultContent(tabId) {
                const currentPane = document.getElementById(tabId);
                if (currentPane) {
                    // すべてのセクションを非表示
                    currentPane.querySelectorAll('.content-section').forEach(section => {
                        section.classList.remove('active');
                    });
                    
                    // 月別タブの場合は月サマリを表示
                    const summaryElement = currentPane.querySelector(\`#\${tabId}-summary\`);
                    if (summaryElement) {
                        summaryElement.classList.add('active');
                    } else {
                        // 総括レポートの場合は最初のセクションを表示
                        const firstSection = currentPane.querySelector('.content-section');
                        if (firstSection) {
                            firstSection.classList.add('active');
                        }
                    }
                }
            }

            // タブクリックイベント
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.dataset.tab;
                    
                    // タブ切り替え処理
                    tabs.forEach(item => item.classList.remove('active'));
                    tab.classList.add('active');

                    // すべてのコンテンツペインを非表示
                    document.querySelectorAll('.content-pane').forEach(pane => {
                        pane.classList.remove('active');
                    });
                    
                    // 対応するコンテンツペインを表示
                    const targetPane = document.getElementById(tabId);
                    if (targetPane) {
                        targetPane.classList.add('active');
                    }

                    // サイドバー切り替え
                    document.querySelectorAll('.sidebar-content').forEach(sidebar => {
                        sidebar.classList.remove('active');
                    });
                    const targetSidebar = document.getElementById(tabId + '-sidebar');
                    if (targetSidebar) {
                        targetSidebar.classList.add('active');
                    }
                    
                    document.querySelectorAll('.sidebar-link').forEach(link => {
                        link.classList.remove('active');
                    });

                    // デフォルト表示設定を実行
                    setDefaultContent(tabId);
                });
            });
        });
    </script>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${meetingNote.id || 'meeting-note'}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      devLog('✅ [handleDownloadHtml] HTMLファイルのダウンロード成功');
      
      // 少し遅延を入れてから状態をリセット（視覚的なフィードバックのため）
      setTimeout(() => {
        setDownloadingHtml(false);
      }, 500);
    } catch (error: any) {
      console.error('❌ [handleDownloadHtml] HTMLファイルのダウンロードに失敗しました:', error);
      alert(`HTMLファイルのダウンロードに失敗しました: ${error?.message || '不明なエラー'}`);
      setDownloadingHtml(false);
    }
  }, [meetingNote, monthContents, orgData, downloadingHtml]);

  // ローカルモデルを読み込む
  useEffect(() => {
    if (aiModelType === 'local' && isAIGenerationModalOpen) {
      loadAiLocalModels();
    }
  }, [aiModelType, isAIGenerationModalOpen]);
  
  const loadAiLocalModels = async () => {
    setLoadingAiLocalModels(true);
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
        setAiLocalModels(formattedModels);
        if (formattedModels.length > 0 && !aiSelectedModel.startsWith('gpt')) {
          setAiSelectedModel(formattedModels[0].value);
        }
      } else {
        setAiLocalModels([]);
      }
    } catch (error) {
      console.error('ローカルモデルの取得エラー:', error);
      setAiLocalModels([]);
    } finally {
      setLoadingAiLocalModels(false);
    }
  };
  
  // トピックメタデータ生成用のローカルモデル一覧を取得
  const loadTopicMetadataLocalModels = async () => {
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
  };
  
  // モデルタイプが変更されたら、ローカルモデルを取得
  useEffect(() => {
    if (topicMetadataModelType === 'local') {
      loadTopicMetadataLocalModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicMetadataModelType]);
  
  // AI要約生成関数
  const generateAISummary = async (inputText: string, selectedTopics: Topic[], selectedSummaries: Array<{ monthId: MonthTab; summary: string; label: string }>): Promise<string> => {
    try {
      setIsAIGenerating(true);
      
      // トピックの内容を結合
      const topicsContent = selectedTopics.map(topic => `【${topic.title}】\n${topic.content}`).join('\n\n');
      
      // 選択したサマリの内容を結合
      const summariesContent = selectedSummaries.map(summary => `【${summary.label}サマリ】\n${summary.summary}`).join('\n\n');
      
      // 要約形式に応じた指示を生成
      let formatInstruction = '';
      switch (aiSummaryFormat) {
        case 'bullet':
          formatInstruction = `箇条書き形式で要約を作成してください。各項目は「-」または「1.」で始まる箇条書きとして出力してください。`;
          break;
        case 'paragraph':
          formatInstruction = `段落形式で要約を作成してください。複数の段落に分けて、読みやすい文章として出力してください。`;
          break;
        case 'custom':
          formatInstruction = aiCustomPrompt || '要約を作成してください。';
          break;
        case 'auto':
        default:
          formatInstruction = `以下のマークダウン記法を使用して、読みやすく構造化された要約を作成してください：
- 見出し（##, ###）でセクションを分ける
- 箇条書き（- または 1.）で重要なポイントを列挙
- **太字**で重要なキーワードを強調
- 必要に応じて段落を分けて読みやすくする`;
          break;
      }
      
      // プロンプトを作成（マークダウン形式で出力するように指示）
      const systemPrompt = `あなたはビジネス文書の要約を専門とするアシスタントです。提供された情報を基に、約${aiSummaryLength}文字で簡潔かつ明確な要約をマークダウン記法で作成してください。

${formatInstruction}

出力は必ずマークダウン形式で、プレーンテキストではなく、適切にフォーマットされたマークダウンとして出力してください。`;
      
      const userPrompt = `以下の情報を基に、約${aiSummaryLength}文字で要約をマークダウン形式で作成してください。\n\n${inputText ? `【概要】\n${inputText}\n\n` : ''}${summariesContent ? `【月別サマリ】\n${summariesContent}\n\n` : ''}${topicsContent ? `【関連トピック】\n${topicsContent}` : ''}`;
      
      // モデルタイプに応じてAPIを呼び出し
      const isLocalModel = aiSelectedModel.startsWith('qwen') || 
                           aiSelectedModel.startsWith('llama') || 
                           aiSelectedModel.startsWith('mistral') ||
                           aiSelectedModel.includes(':latest') ||
                           aiSelectedModel.includes(':instruct');
      
      if (isLocalModel || aiModelType === 'local') {
        // Ollama APIを呼び出し
        const apiUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/api/chat';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: aiSelectedModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            stream: false,
            options: {
              temperature: 0.7,
              num_predict: aiSummaryLength,
            },
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Ollama APIエラー: ${response.status} ${response.statusText}. ${errorText}`);
        }
        
        const data = await response.json();
        const summary = data.message?.content?.trim() || '';
        
        if (!summary) {
          throw new Error('AIからの応答が空でした');
        }
        
        return summary;
      } else {
        // OpenAI APIを呼び出し
        // APIキーを取得: 設定ページ > localStorage > 環境変数の順
        let apiKey: string | undefined;
        if (typeof window !== 'undefined') {
          try {
            const { getAPIKey } = await import('@/lib/security');
            apiKey = getAPIKey('openai') || undefined;
          } catch (error) {
            // セキュリティモジュールがない場合は直接localStorageから取得
            apiKey = localStorage.getItem('NEXT_PUBLIC_OPENAI_API_KEY') || undefined;
          }
        }
        if (!apiKey) {
          apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
        }
        
        if (!apiKey) {
          throw new Error('OpenAI APIキーが設定されていません。設定ページ（/settings）でAPIキーを設定してください。');
        }
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: aiSelectedModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: aiSummaryLength,
            temperature: 0.7,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
          throw new Error(`OpenAI APIエラー: ${response.status} ${response.statusText}. ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content?.trim() || '';
        
        if (!summary) {
          throw new Error('AIからの応答が空でした');
        }
        
        return summary;
      }
    } catch (error) {
      console.error('AI要約生成エラー:', error);
      throw error;
    } finally {
      setIsAIGenerating(false);
    }
  };
  
  // モデルタイプとモデル選択の変更を保存
  useEffect(() => {
    if (aiModelType) {
      localStorage.setItem('aiGenerationModelType', aiModelType);
    }
  }, [aiModelType]);
  
  useEffect(() => {
    if (aiSelectedModel) {
      localStorage.setItem('aiGenerationSelectedModel', aiSelectedModel);
    }
  }, [aiSelectedModel]);
  
  // サマリの編集開始（月タブと総括タブの両方に対応）
  const handleStartEditSummary = (tab: TabType) => {
    setEditingMonth(tab);
    const tabData = monthContents[tab] as MonthContent | undefined;
    const summaryId = tabData?.summaryId;
    if (summaryId) {
      setEditingSection(summaryId);
      setEditingContent(tabData?.summary || '');
    }
  };

  // 議事録アイテムの編集開始（月タブと総括タブの両方に対応）
  const handleStartEditItem = (tab: TabType, itemId: string) => {
    setEditingMonth(tab);
    setEditingSection(itemId);
    const tabData = monthContents[tab] as MonthContent | undefined;
    const item = tabData?.items?.find(i => i.id === itemId);
    setEditingContent(item?.content || '');
    setEditingItemTitle(item?.title || '');
    
    // 日時を日付と時間に分離
    const dateStr = item?.date || '';
    if (dateStr) {
      // YYYY-MM-DD形式の日付を抽出（最初の10文字）
      const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        setEditingItemDate(dateMatch[1]);
        // 残りの部分を時間として設定
        const timePart = dateStr.substring(10).trim();
        setEditingItemTime(timePart);
      } else {
        // 日付形式でない場合は全体を時間として扱う
        setEditingItemDate('');
        setEditingItemTime(dateStr);
      }
    } else {
      setEditingItemDate('');
      setEditingItemTime('');
    }
  };
  
  // 議事録アイテムのタイトル編集開始（月タブと総括タブの両方に対応）
  const handleStartEditItemTitle = (tab: TabType, itemId: string) => {
    setEditingMonth(tab);
    setEditingSection(`${itemId}-title`);
    const tabData = monthContents[tab] as MonthContent | undefined;
    const item = tabData?.items?.find(i => i.id === itemId);
    setEditingItemTitle(item?.title || '');
  };

  // 編集キャンセル
  const handleCancelEdit = () => {
    setEditingMonth(null);
    setEditingSection(null);
    setEditingContent('');
    setEditingItemTitle('');
    setEditingItemDate('');
    setEditingItemTime('');
  };

  // 編集保存
  const handleSaveEdit = async () => {
    if (!editingMonth || !editingSection) return;
    
    // 保存ステータスを開始（即座に表示されるように）
    setSavingStatus('saving');
    
    // 状態を更新
    let updatedContents: typeof monthContents = monthContents;
    setMonthContents(prev => {
      const updated = { ...prev };
      
      // 総括タブの場合（MonthContent型として扱う）
      if (SUMMARY_TABS.some(t => t.id === editingMonth)) {
        const summaryTab = editingMonth as SummaryTab;
        if (!updated[summaryTab] || typeof updated[summaryTab] === 'string') {
          updated[summaryTab] = { summary: '', items: [] };
        }
        const summaryData = updated[summaryTab] as MonthContent;
        const summaryId = summaryData.summaryId;
        if (editingSection === summaryId) {
          updated[summaryTab] = {
            ...summaryData,
            summary: editingContent,
          };
        } else if (editingSection.endsWith('-title')) {
          // タイトルの編集
          const itemId = editingSection.replace('-title', '');
          const itemIndex = summaryData.items.findIndex(i => i.id === itemId);
          if (itemIndex >= 0) {
            summaryData.items[itemIndex] = {
              ...summaryData.items[itemIndex],
              title: editingItemTitle,
            };
          }
          updated[summaryTab] = summaryData;
        } else {
          // コンテンツの編集
          const itemIndex = summaryData.items.findIndex(i => i.id === editingSection);
          if (itemIndex >= 0) {
            // 日付と時間を結合
            const combinedDate = editingItemDate 
              ? (editingItemTime ? `${editingItemDate} ${editingItemTime}`.trim() : editingItemDate)
              : (editingItemTime || undefined);
            
            summaryData.items[itemIndex] = {
              ...summaryData.items[itemIndex],
              content: editingContent,
              date: combinedDate,
            };
          }
          updated[summaryTab] = summaryData;
        }
        updatedContents = updated;
        return updated;
      }
      
      // 月タブの場合
      const month = editingMonth as MonthTab;
      if (!updated[month] || typeof updated[month] === 'string') {
        updated[month] = { summary: '', items: [] };
      }
      
        const monthData = updated[month] as MonthContent;
        const summaryId = monthData.summaryId;
        
        if (editingSection === summaryId) {
          updated[month] = {
            ...monthData,
            summary: editingContent,
          };
        } else if (editingSection.endsWith('-title')) {
        // タイトルの編集
        const itemId = editingSection.replace('-title', '');
        const itemIndex = monthData.items.findIndex(i => i.id === itemId);
        if (itemIndex >= 0) {
          monthData.items[itemIndex] = {
            ...monthData.items[itemIndex],
            title: editingItemTitle,
          };
        }
        updated[month] = monthData;
      } else {
        // コンテンツの編集
        const itemIndex = monthData.items.findIndex(i => i.id === editingSection);
        if (itemIndex >= 0) {
          // 日付と時間を結合
          const combinedDate = editingItemDate 
            ? (editingItemTime ? `${editingItemDate} ${editingItemTime}`.trim() : editingItemDate)
            : (editingItemTime || undefined);
          
          monthData.items[itemIndex] = {
            ...monthData.items[itemIndex],
            content: editingContent,
            date: combinedDate,
          };
        }
        updated[month] = monthData;
      }
      
      updatedContents = updated;
      return updated;
    });
    
    // 編集モードをキャンセル
    handleCancelEdit();
    
    // 少し待ってから保存処理を実行（状態更新を確実にするため）
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // JSONファイルに保存（handleManualSaveと同じロジック）
    if (meetingNote && updatedContents) {
      try {
        const contentJson = JSON.stringify(updatedContents, null, 2);
        // 事業会社の管理はorganizationsテーブルのtypeカラムで行うため、通常のsaveMeetingNoteを使用
        await saveMeetingNote({
          ...meetingNote,
          content: contentJson,
        });
        devLog('✅ [handleSaveEdit] 保存成功');
        setHasUnsavedChanges(false); // 保存完了後、未保存フラグをリセット
        setSavingStatus('saved'); // 保存完了ステータスを設定
        setTimeout(() => {
          setSavingStatus('idle');
        }, 2000);
      } catch (error: any) {
        console.error('❌ [handleSaveEdit] 保存に失敗しました:', error);
        alert(`保存に失敗しました: ${error?.message || '不明なエラー'}`);
        setHasUnsavedChanges(true); // エラー時は未保存フラグをtrueのまま
        setSavingStatus('idle');
      }
    } else {
      // データがない場合は保存ステータスをリセット
      setSavingStatus('idle');
    }
  };
  
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
  const handleDeleteTopic = (itemId: string, topicId: string) => {
    setDeleteTargetTopicItemId(itemId);
    setDeleteTargetTopicId(topicId);
    setShowDeleteTopicModal(true);
  };
  
  // データベース操作のリトライ関数
  const retryDbOperation = async <T,>(
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
  };

  // トピック削除実行
  const confirmDeleteTopic = async () => {
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
        // topicEmbeddingIdは既に1817行目で定義済み
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
  };
  
  // トピック削除確認モーダルをキャンセル
  const cancelDeleteTopic = () => {
    setShowDeleteTopicModal(false);
    setDeleteTargetTopicItemId(null);
    setDeleteTargetTopicId(null);
  };

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
    let updatedContents: typeof monthContents;
    
    setMonthContents(prev => {
      const updated = { ...prev };
      if (!updated[tab] || typeof updated[tab] === 'string') {
        updated[tab] = { summary: '', items: [] };
      }
      const tabData = updated[tab] as MonthContent;
      // 新しい配列を作成して不変性を保つ
      updated[tab] = {
        ...tabData,
        items: [...tabData.items, {
          id: newItemId,
          title: '新しい議事録',
          content: '',
        }],
      };
      updatedContents = updated;
      return updated;
    });
    
    setHasUnsavedChanges(true); // 未保存の変更があることを記録
    
    // 追加したアイテムを選択状態にしてタイトル編集モードにする
    setActiveSection(newItemId);
    setEditingMonth(tab);
    setEditingSection(`${newItemId}-title`); // タイトル編集モード
    setEditingContent('');
    setEditingItemTitle('新しい議事録');
    
    // JSONファイルに自動保存
    if (meetingNote && updatedContents!) {
      try {
        const contentJson = JSON.stringify(updatedContents!, null, 2);
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
  }, [meetingNote]);

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

  return (
    <Layout>
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
        {/* ヘッダー */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 30%, #334155 100%)',
          color: '#FFFFFF',
          padding: '48px 32px 36px 32px',
          textAlign: 'center',
          borderBottom: '5px solid #0066CC',
          boxShadow: '0 10px 32px rgba(15, 23, 42, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15)',
          marginBottom: '32px',
          borderRadius: '14px 14px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* 装飾的な背景パターン */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(0, 102, 204, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(0, 191, 255, 0.12) 0%, transparent 50%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ 
              margin: 0, 
              fontSize: '3.2em', 
              letterSpacing: '2px',
              fontWeight: '800',
              textShadow: '0 3px 12px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3)',
              color: '#FFFFFF',
              marginBottom: '20px',
              lineHeight: '1.2',
            }}>
              {meetingNote.title}
            </h1>
            <div style={{
              display: 'inline-block',
              width: '100px',
              height: '5px',
              background: 'linear-gradient(90deg, #0066CC 0%, #00BFFF 50%, #0066CC 100%)',
              borderRadius: '3px',
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(0, 102, 204, 0.4)',
            }} />
            <p style={{ 
              margin: 0, 
              fontSize: '1.1em', 
              fontWeight: '500',
              color: '#E2E8F0',
              letterSpacing: '0.5px',
              textShadow: '0 2px 6px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
              lineHeight: '1.5',
            }}>
              議事録アーカイブ
            </p>
          </div>
        </div>

        {/* アクションボタン */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
          {savingStatus !== 'idle' && (
            <div style={{
              padding: '8px 12px',
              fontSize: '12px',
              color: savingStatus === 'saving' ? '#6B7280' : '#10B981',
              backgroundColor: savingStatus === 'saving' ? '#F3F4F6' : '#D1FAE5',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              {savingStatus === 'saving' ? '💾 保存中...' : '✅ 保存完了'}
            </div>
          )}
          <button
            onClick={handleManualSave}
            disabled={savingStatus === 'saving'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: savingStatus === 'saving' ? '#9CA3AF' : '#10B981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: savingStatus === 'saving' ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s, opacity 0.2s',
              opacity: savingStatus === 'saving' ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (savingStatus !== 'saving') {
                e.currentTarget.style.backgroundColor = '#059669';
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (savingStatus !== 'saving') {
                e.currentTarget.style.backgroundColor = '#10B981';
                e.currentTarget.style.opacity = '1';
              }
            }}
            title="編集内容を保存します"
          >
            <SaveIcon size={18} color="white" />
          </button>
          <button
            onClick={handleDownloadJson}
            disabled={downloadingJson}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: downloadingJson ? '#9CA3AF' : '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: downloadingJson ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s, opacity 0.2s',
              opacity: downloadingJson ? 0.7 : 1,
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (!downloadingJson) {
                e.currentTarget.style.backgroundColor = '#2563EB';
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (!downloadingJson) {
                e.currentTarget.style.backgroundColor = '#3B82F6';
                e.currentTarget.style.opacity = '1';
              }
            }}
            title={downloadingJson ? 'JSONファイルをダウンロード中...' : 'JSONファイルをダウンロード'}
          >
            {downloadingJson ? (
              <div style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            ) : (
              <DownloadIcon size={18} color="white" />
            )}
          </button>
          <button
            onClick={handleDownloadHtml}
            disabled={downloadingHtml}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: downloadingHtml ? '#9CA3AF' : '#8B5CF6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: downloadingHtml ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s, opacity 0.2s',
              opacity: downloadingHtml ? 0.7 : 1,
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (!downloadingHtml) {
                e.currentTarget.style.backgroundColor = '#7C3AED';
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (!downloadingHtml) {
                e.currentTarget.style.backgroundColor = '#8B5CF6';
                e.currentTarget.style.opacity = '1';
              }
            }}
            title={downloadingHtml ? 'HTMLファイルをダウンロード中...' : 'HTMLファイルをダウンロード'}
          >
            {downloadingHtml ? (
              <div style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            ) : (
              <DownloadIcon size={18} color="white" />
            )}
          </button>
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: '#6B7280',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s, opacity 0.2s',
              opacity: 0.9,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4B5563';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6B7280';
              e.currentTarget.style.opacity = '0.9';
            }}
            title="戻る"
          >
            <BackIcon size={18} color="white" />
          </button>
        </div>

        {/* タブ */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 5px 20px rgba(44,62,80,0.07)',
          borderBottom: '2px solid #0066CC',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* 月タブ */}
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginBottom: '5px', borderBottom: '2px solid #0066CC', paddingBottom: '10px' }}>
              {MONTHS.map((month) => (
                <button
                  key={month.id}
                    onClick={() => {
                      setActiveTab(month.id);
                      const monthData = monthContents[month.id] as MonthContent | undefined;
                      if (monthData?.summaryId) {
                        setActiveSection(monthData.summaryId);
                      }
                    }}
                  style={{
                    padding: '14px 24px',
                    cursor: 'pointer',
                    color: activeTab === month.id ? '#FFFFFF' : '#475569',
                    fontWeight: activeTab === month.id ? '700' : '600',
                    border: 'none',
                    borderRadius: '8px 8px 0 0',
                    background: activeTab === month.id 
                      ? 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)' 
                      : 'transparent',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                    textAlign: 'center',
                    margin: '0 2px',
                    fontSize: '1.05em',
                    letterSpacing: '0.3px',
                    boxShadow: activeTab === month.id 
                      ? '0 4px 12px rgba(0,102,204,0.2), inset 0 -2px 4px rgba(0,0,0,0.1)' 
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== month.id) {
                      e.currentTarget.style.backgroundColor = '#EFF6FF';
                      e.currentTarget.style.color = '#0066CC';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== month.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#475569';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {month.label}
                </button>
              ))}
            </div>
            
            {/* 総括タブ */}
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
              {SUMMARY_TABS.map((tab) => (
                <button
                  key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      const tabData = monthContents[tab.id] as MonthContent | undefined;
                      if (tabData?.summaryId) {
                        setActiveSection(tabData.summaryId);
                      }
                    }}
                  style={{
                    padding: '14px 20px',
                    cursor: 'pointer',
                    color: activeTab === tab.id ? '#FFFFFF' : '#475569',
                    fontWeight: activeTab === tab.id ? '700' : '600',
                    border: 'none',
                    borderRadius: '8px 8px 0 0',
                    background: activeTab === tab.id 
                      ? 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)' 
                      : 'transparent',
                    transition: 'all 0.2s ease',
                    flex: 1,
                    textAlign: 'center',
                    margin: '0 2px',
                    fontSize: '1.05em',
                    letterSpacing: '0.3px',
                    boxShadow: activeTab === tab.id 
                      ? '0 4px 12px rgba(0,102,204,0.2), inset 0 -2px 4px rgba(0,0,0,0.1)' 
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.backgroundColor = '#EFF6FF';
                      e.currentTarget.style.color = '#0066CC';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#475569';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

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
                {activeSection === currentSummaryId && (
                  <div style={{ marginBottom: '36px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div>
                        <h3 style={{ 
                          margin: 0, 
                          fontSize: '1.4em', 
                          color: '#1E293B',
                          fontWeight: '600',
                          letterSpacing: '0.3px',
                        }}>
                          {SUMMARY_TABS.find(t => t.id === activeTab)?.label}サマリ
                        </h3>
                        {currentSummaryId && (
                          <p style={{
                            margin: '4px 0 0 0',
                            fontSize: '12px',
                            color: '#64748B',
                            fontFamily: 'monospace',
                            fontWeight: '500',
                          }}>
                            ID: {currentSummaryId}
                          </p>
                        )}
                      </div>
                        {editingMonth === activeTab && editingSection === currentSummaryId ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={handleSaveEdit}
                            style={{
                              padding: '4px 12px',
                              backgroundColor: '#10B981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            style={{
                              padding: '4px 12px',
                              backgroundColor: '#F3F4F6',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              const currentTabData = monthContents[activeTab] as MonthContent | undefined;
                              setAIGenerationInput('');
                              setSelectedTopicIdsForAI([]);
                              setSelectedSummaryIdsForAI([]);
                              setAiSummaryFormat('auto');
                              setAiSummaryLength(500);
                              setAiCustomPrompt('');
                              setIsAIGenerationModalOpen(true);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 16px',
                              backgroundColor: '#3B82F6',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 500,
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#2563EB';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#3B82F6';
                            }}
                          >
                            <span>🤖</span>
                            <span>AIで作文</span>
                          </button>
                          <button
                            onClick={() => handleStartEditSummary(activeTab as SummaryTab as any)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '40px',
                              height: '40px',
                              backgroundColor: 'transparent',
                              color: '#475569',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              opacity: 0.7,
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(0, 102, 204, 0.1)';
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.color = '#0066CC';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.opacity = '0.7';
                              e.currentTarget.style.color = '#475569';
                            }}
                            title="編集"
                          >
                            <EditIcon size={18} color="currentColor" />
                          </button>
                        </div>
                      )}
                    </div>
                        {editingMonth === activeTab && editingSection === currentSummaryId ? (
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '200px',
                          padding: '12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontFamily: 'monospace',
                          resize: 'vertical',
                          lineHeight: '1.6',
                        }}
                      />
                    ) : (
                      <div style={{ width: '100%', overflow: 'hidden' }}>
                        {currentTabData?.summary ? (
                          <div className="markdown-content" style={{ width: '100%', wordBreak: 'break-word' }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {currentTabData.summary}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p style={{ color: '#64748B', fontStyle: 'italic', fontSize: '16px', fontWeight: '500' }}>
                            サマリがありません。編集ボタンから追加してください。
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* 議事録アイテム */}
                <div style={{ marginBottom: '32px' }}>
                  {currentTabData?.items && currentTabData.items.length > 0 && activeSection !== currentSummaryId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {currentTabData.items
                        .filter((item) => activeSection === item.id)
                        .map((item) => (
                      <div
                        key={item.id}
                        style={{
                          marginBottom: '32px',
                        }}
                      >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            {editingMonth === activeTab && editingSection === `${item.id}-title` ? (
                              <div style={{ flex: 1, marginRight: '8px' }}>
                                <input
                                  type="text"
                                  value={editingItemTitle}
                                  onChange={(e) => setEditingItemTitle(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #0066CC',
                                    borderRadius: '4px',
                                    fontSize: '1.35em',
                                    fontWeight: '700',
                                    color: '#0F172A',
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveEdit();
                                    } else if (e.key === 'Escape') {
                                      handleCancelEdit();
                                    }
                                  }}
                                  autoFocus
                                />
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                  <button
                                    onClick={handleSaveEdit}
                                    style={{
                                      padding: '4px 12px',
                                      backgroundColor: '#10B981',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                    }}
                                  >
                                    保存
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    style={{
                                      padding: '4px 12px',
                                      backgroundColor: '#F3F4F6',
                                      color: '#374151',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                    }}
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <h3 style={{ 
                                margin: 0, 
                                fontSize: '1.3em',
                                color: '#0F172A',
                                borderLeft: '5px solid #0066CC',
                                paddingLeft: '20px',
                                background: 'linear-gradient(90deg, #EFF6FF 0%, #F0F9FF 60%, transparent 100%)',
                                flex: 1,
                                cursor: 'pointer',
                                fontWeight: '700',
                                letterSpacing: '0.3px',
                                lineHeight: '1.5',
                                paddingTop: '6px',
                                paddingBottom: '6px',
                                borderRadius: '6px',
                                transition: 'all 0.2s ease',
                                position: 'relative',
                                zIndex: 1,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditItemTitle(activeTab as any, item.id);
                              }}
                              title="クリックしてタイトルを編集"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(90deg, #DBEAFE 0%, #E0F2FE 60%, transparent 100%)';
                                e.currentTarget.style.color = '#0066CC';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(90deg, #EFF6FF 0%, #F0F9FF 60%, transparent 100%)';
                                e.currentTarget.style.color = '#0F172A';
                              }}
                            >
                              {item.title}
                            </h3>
                          )}
                          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                            {editingMonth === activeTab && editingSection === item.id ? (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={handleSaveEdit}
                                  style={{
                                    padding: '4px 12px',
                                    backgroundColor: '#10B981',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                  }}
                                >
                                  保存
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  style={{
                                    padding: '4px 12px',
                                    backgroundColor: '#F3F4F6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                  }}
                                >
                                  キャンセル
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEditItem(activeTab as any, item.id)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '40px',
                                    height: '40px',
                                    backgroundColor: 'transparent',
                                    color: '#475569',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    opacity: 0.7,
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(0, 102, 204, 0.1)';
                                    e.currentTarget.style.opacity = '1';
                                    e.currentTarget.style.color = '#0066CC';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.opacity = '0.7';
                                    e.currentTarget.style.color = '#475569';
                                  }}
                                  title="コンテンツを編集"
                                >
                                  <EditIcon size={18} color="currentColor" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    devLog('🔴 [削除ボタン] クリックイベント発火:', { itemId: item.id, activeTab });
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteItem(activeTab, item.id);
                                  }}
                                  type="button"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '40px',
                                    height: '40px',
                                    backgroundColor: 'transparent',
                                    color: '#DC2626',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    opacity: 0.7,
                                    transition: 'all 0.2s ease',
                                    position: 'relative',
                                    zIndex: 10,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                                    e.currentTarget.style.opacity = '1';
                                    e.currentTarget.style.color = '#DC2626';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.opacity = '0.7';
                                    e.currentTarget.style.color = '#DC2626';
                                  }}
                                  title="削除"
                                >
                                  <DeleteIcon size={18} color="currentColor" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* トピック一括追加ボタン */}
                        {item.content && (
                          <div style={{ marginBottom: '16px' }}>
                            <button
                              onClick={() => {
                                try {
                                  // 内容を---で分割（行全体が---のパターンにマッチ）
                                  // 最初と最後の---は区切りとして扱う
                                  const content = item.content.trim();
                                  const sections = content.split(/\n\s*---\s*\n/).filter(section => section.trim().length > 0);
                                  
                                  // 最初と最後が---で始まる/終わる場合は除去
                                  const cleanedSections = sections.map(section => {
                                    return section.replace(/^---\s*\n?/, '').replace(/\n?---\s*$/, '').trim();
                                  }).filter(section => section.length > 0);
                                  
                                  if (cleanedSections.length === 0) {
                                    alert('---で区切られたセクションが見つかりませんでした。');
                                    return;
                                  }
                                  
                                  const newTopics: Topic[] = [];
                                  
                                  cleanedSections.forEach((section) => {
                                    const trimmedSection = section.trim();
                                    if (trimmedSection.length === 0) return;
                                    
                                    // 最初の##見出しを探す
                                    const headingMatch = trimmedSection.match(/^##\s+(.+)$/m);
                                    let title = '無題のトピック';
                                    
                                    if (headingMatch && headingMatch[1]) {
                                      title = headingMatch[1].trim();
                                    } else {
                                      // ##がない場合は最初の行をタイトルにする
                                      const firstLine = trimmedSection.split('\n')[0].trim();
                                      if (firstLine.length > 0) {
                                        title = firstLine.replace(/^#+\s*/, '').trim() || '無題のトピック';
                                      }
                                    }
                                    
                                    // トピックIDを生成
                                    const topicId = generateUniqueId();
                                    
                                    const now = new Date().toISOString();
                                    
                                    newTopics.push({
                                      id: topicId,
                                      title: title,
                                      content: trimmedSection,
                                      mentionedDate: item.date || undefined, // 親の議事録の日時を引き継ぐ
                                      createdAt: now,
                                      updatedAt: now,
                                    });
                                  });
                                  
                                  if (newTopics.length === 0) {
                                    alert('トピックを抽出できませんでした。');
                                    return;
                                  }
                                  
                                  // 既存のトピックに追加
                                  const updatedContents = { ...monthContents };
                                  const tabData = updatedContents[activeTab];
                                  if (tabData) {
                                    const itemIndex = tabData.items.findIndex(i => i.id === item.id);
                                    if (itemIndex !== -1) {
                                      const updatedItems = [...tabData.items];
                                      const currentTopics = updatedItems[itemIndex].topics || [];
                                      updatedItems[itemIndex] = {
                                        ...updatedItems[itemIndex],
                                        topics: [...currentTopics, ...newTopics],
                                      };
                                      updatedContents[activeTab] = {
                                        ...tabData,
                                        items: updatedItems,
                                      };
                                      setMonthContents(updatedContents);
                                      setHasUnsavedChanges(true);
                                      
                                      // 埋め込みはChromaDB側で一元管理されているため、Topics生成時には実行しない
                                      // if (typeof window !== 'undefined' && organizationId && meetingId) {
                                      //   newTopics.forEach((topic) => {
                                      //     saveTopicEmbeddingAsync(
                                      //       topic.id,
                                      //       meetingId,
                                      //       organizationId,
                                      //       topic.title,
                                      //       topic.content
                                      //     ).catch((error) => {
                                      //       console.warn('⚠️ トピック埋め込みの生成に失敗しました:', error);
                                      //     });
                                      //   });
                                      // }
                                      
                                      alert(`${newTopics.length}個のトピックを追加しました。`);
                                    }
                                  }
                                } catch (error: any) {
                                  console.error('トピック一括追加エラー:', error);
                                  alert(`トピックの一括追加に失敗しました: ${error?.message || '不明なエラー'}`);
                                }
                              }}
                              style={{
                                padding: '8px 16px',
                                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.9em',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.2)';
                              }}
                            >
                              📋 トピック一括追加
                            </button>
                          </div>
                        )}
                        
                        {(item.location || item.date || item.author) && (
                          <div style={{ 
                            marginBottom: '20px', 
                            padding: '12px 16px',
                            backgroundColor: '#F8FAFC',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                          }}>
                            <p style={{ margin: 0, color: '#475569', fontSize: '15px', lineHeight: '1.8', fontWeight: '500' }}>
                              {item.location && <><strong style={{ color: '#0F172A', fontWeight: '700' }}>場所:</strong> {item.location}<br /></>}
                              {item.date && <><strong style={{ color: '#0F172A', fontWeight: '700' }}>日時:</strong> {item.date}<br /></>}
                              {item.author && <><strong style={{ color: '#0F172A', fontWeight: '700' }}>文責:</strong> {item.author}</>}
                            </p>
                          </div>
                        )}
                        
                        {editingMonth === activeTab && editingSection === item.id ? (
                          <div>
                            <div style={{ marginBottom: '16px' }}>
                              <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '600',
                                color: '#1E293B',
                                fontSize: '14px',
                              }}>
                                日時
                              </label>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                <div style={{ flex: '0 0 200px' }}>
                                  <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontWeight: '500',
                                    color: '#475569',
                                    fontSize: '13px',
                                  }}>
                                    日付
                                  </label>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                      type="date"
                                      value={editingItemDate}
                                      onChange={(e) => setEditingItemDate(e.target.value)}
                                      style={{
                                        flex: 1,
                                        padding: '10px 12px',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const today = new Date();
                                        const year = today.getFullYear();
                                        const month = String(today.getMonth() + 1).padStart(2, '0');
                                        const day = String(today.getDate()).padStart(2, '0');
                                        setEditingItemDate(`${year}-${month}-${day}`);
                                      }}
                                      style={{
                                        padding: '10px 16px',
                                        backgroundColor: '#0066CC',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.2s ease',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#0051a8';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#0066CC';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                      }}
                                    >
                                      今日
                                    </button>
                                  </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontWeight: '500',
                                    color: '#475569',
                                    fontSize: '13px',
                                  }}>
                                    時間（任意）
                                  </label>
                                  <input
                                    type="text"
                                    value={editingItemTime}
                                    onChange={(e) => setEditingItemTime(e.target.value)}
                                    placeholder="例: 14:00-16:00"
                                    style={{
                                      width: '100%',
                                      padding: '10px 12px',
                                      border: '1px solid #D1D5DB',
                                      borderRadius: '6px',
                                      fontSize: '14px',
                                      boxSizing: 'border-box',
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              style={{
                                width: '100%',
                                minHeight: '300px',
                                padding: '12px',
                                border: '1px solid #D1D5DB',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontFamily: 'monospace',
                                resize: 'vertical',
                                lineHeight: '1.6',
                              }}
                            />
                          </div>
                        ) : (
                          <div>
                            {item.content ? (
                              <div className="markdown-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                  {item.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p style={{ color: '#64748B', fontStyle: 'italic', fontSize: '16px', fontWeight: '500' }}>
                                コンテンツがありません。編集ボタンから追加してください。
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* 個別トピックセクション */}
                        <div style={{
                          marginTop: '30px',
                          paddingTop: '20px',
                          borderTop: '2px solid #E2E8F0',
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                          }}>
                            <h4 style={{
                              margin: 0,
                              fontSize: '1.15em',
                              color: '#0066CC',
                              fontWeight: '600',
                            }}>
                              個別トピック
                            </h4>
                            <button
                              onClick={() => {
                                setEditingTopicItemId(item.id);
                                setEditingTopicId(null);
                                setTopicTitle('');
                                setTopicContent('');
                                // メタデータフィールドもリセット
                                setTopicSemanticCategory('');
                                setTopicKeywords('');
                                setTopicSummary('');
                                setTopicImportance('');
                                setShowTopicModal(true);
                              }}
                              style={{
                                padding: '8px 16px',
                                background: '#0066CC',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.95em',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,102,204,0.15)',
                                transition: 'background 0.2s, transform 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#0051a8';
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#0066CC';
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                              }}
                            >
                              + トピックを追加
                            </button>
                          </div>
                          
                          {item.topics && item.topics.length > 0 ? (
                            <div>
                              {item.topics.map((topic) => {
                                const topicKey = `${item.id}-topic-${topic.id}`;
                                const isExpanded = expandedTopics.has(topicKey);
                                
                                return (
                                <div
                                  key={topic.id}
                                  id={topicKey}
                                  style={{
                                    backgroundColor: '#F8FAFD',
                                    border: '1px solid #E0E0E0',
                                    borderRadius: '8px',
                                    padding: '18px 20px',
                                    marginBottom: '15px',
                                    position: 'relative',
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: isExpanded ? '12px' : '0',
                                  }}>
                                    <div 
                                      style={{ 
                                        flex: 1,
                                        cursor: 'pointer',
                                      }}
                                      onClick={() => {
                                        const newExpanded = new Set(expandedTopics);
                                        if (isExpanded) {
                                          newExpanded.delete(topicKey);
                                        } else {
                                          newExpanded.add(topicKey);
                                        }
                                        setExpandedTopics(newExpanded);
                                      }}
                                    >
                                      <h5 style={{
                                        fontSize: '1.1em',
                                        fontWeight: 'bold',
                                        color: '#1E293B',
                                        margin: 0,
                                        marginBottom: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                      }}>
                                        <span style={{
                                          fontSize: '14px',
                                          transition: 'transform 0.2s ease',
                                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                          display: 'inline-block',
                                        }}>
                                          ▶
                                        </span>
                                        {topic.title}
                                        <span style={{
                                          fontSize: '0.85em',
                                          color: '#888',
                                          marginLeft: '10px',
                                          fontWeight: 'normal',
                                        }}>
                                          ID: {item.id}-topic-{topic.id}
                                        </span>
                                      </h5>
                                      {/* メタデータ表示 */}
                                      {(topic.semanticCategory || topic.importance || topic.keywords?.length || topic.summary) && (
                                        <div style={{
                                          display: 'flex',
                                          flexWrap: 'wrap',
                                          gap: '8px',
                                          marginTop: '8px',
                                        }}>
                                          {topic.semanticCategory && (
                                            <span style={{
                                              padding: '4px 10px',
                                              backgroundColor: '#EFF6FF',
                                              color: '#0066CC',
                                              borderRadius: '12px',
                                              fontSize: '0.75em',
                                              fontWeight: '600',
                                            }}>
                                              📂 {topic.semanticCategory === 'action-item' ? 'アクションアイテム' :
                                                  topic.semanticCategory === 'decision' ? '決定事項' :
                                                  topic.semanticCategory === 'discussion' ? '議論・討議' :
                                                  topic.semanticCategory === 'issue' ? '課題・問題' :
                                                  topic.semanticCategory === 'risk' ? 'リスク' :
                                                  topic.semanticCategory === 'opportunity' ? '機会' :
                                                  topic.semanticCategory === 'question' ? '質問・疑問' :
                                                  topic.semanticCategory === 'summary' ? 'サマリー' :
                                                  topic.semanticCategory === 'follow-up' ? 'フォローアップ' :
                                                  topic.semanticCategory === 'reference' ? '参照情報' : 'その他'}
                                            </span>
                                          )}
                                          {topic.importance && (
                                            <span style={{
                                              padding: '4px 10px',
                                              backgroundColor: topic.importance === 'high' ? '#FEF2F2' :
                                                               topic.importance === 'medium' ? '#FEF3C7' : '#F0FDF4',
                                              color: topic.importance === 'high' ? '#DC2626' :
                                                     topic.importance === 'medium' ? '#D97706' : '#16A34A',
                                              borderRadius: '12px',
                                              fontSize: '0.75em',
                                              fontWeight: '600',
                                            }}>
                                              {topic.importance === 'high' ? '🔴 高' :
                                               topic.importance === 'medium' ? '🟡 中' : '🟢 低'}
                                            </span>
                                          )}
                                          {topic.keywords && topic.keywords.length > 0 && (
                                            <span style={{
                                              padding: '4px 10px',
                                              backgroundColor: '#F3F4F6',
                                              color: '#475569',
                                              borderRadius: '12px',
                                              fontSize: '0.75em',
                                            }}>
                                              🏷️ {topic.keywords.slice(0, 3).join(', ')}
                                              {topic.keywords.length > 3 && ` +${topic.keywords.length - 3}`}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {topic.summary && (
                                        <div style={{
                                          marginTop: '8px',
                                          padding: '8px 12px',
                                          backgroundColor: '#F8FAFC',
                                          borderRadius: '6px',
                                          fontSize: '0.85em',
                                          color: '#475569',
                                          fontStyle: 'italic',
                                        }}>
                                          📝 {topic.summary}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                      <button
                                        onClick={() => {
                                          setEditingTopicItemId(item.id);
                                          setEditingTopicId(topic.id);
                                          setTopicTitle(topic.title);
                                          setTopicContent(topic.content);
                                          // メタデータも読み込む
                                          setTopicSemanticCategory(topic.semanticCategory || '');
                                          setTopicKeywords(topic.keywords?.join(', ') || '');
                                          setTopicSummary(topic.summary || '');
                                          setTopicImportance(topic.importance || '');
                                          setShowTopicModal(true);
                                        }}
                                        style={{
                                          padding: '4px 10px',
                                          background: '#27ae60',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '0.85em',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        編集
                                      </button>
                                      <button
                                        onClick={async () => {
                                          setSearchingTopicId(topic.id);
                                          setIsSearchingSimilarTopics(true);
                                          setShowSimilarTopicsModal(true);
                                          
                                          try {
                                            const queryText = `${topic.title} ${topic.content}`;
                                            const results = await findSimilarTopics(
                                              queryText,
                                              10,
                                              meetingId,
                                              organizationId
                                            );
                                            
                                            // 自分自身を除外
                                            const filteredResults = results.filter(r => r.topicId !== topic.id);
                                            setSimilarTopics(filteredResults);
                                          } catch (error: any) {
                                            console.error('類似トピック検索エラー:', error);
                                            alert(`類似トピックの検索に失敗しました: ${error?.message || '不明なエラー'}`);
                                            setSimilarTopics([]);
                                          } finally {
                                            setIsSearchingSimilarTopics(false);
                                          }
                                        }}
                                        style={{
                                          padding: '4px 10px',
                                          background: '#8B5CF6',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '0.85em',
                                          cursor: 'pointer',
                                          fontWeight: '600',
                                          boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)',
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#7C3AED';
                                          e.currentTarget.style.transform = 'translateY(-1px)';
                                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(139, 92, 246, 0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = '#8B5CF6';
                                          e.currentTarget.style.transform = 'translateY(0)';
                                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(139, 92, 246, 0.3)';
                                        }}
                                      >
                                        🔍 類似検索
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTopic(item.id, topic.id)}
                                        style={{
                                          padding: '4px 10px',
                                          background: '#e74c3c',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '0.85em',
                                          cursor: 'pointer',
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#c0392b';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = '#e74c3c';
                                        }}
                                      >
                                        削除
                                      </button>
                                    </div>
                                  </div>
                                  {isExpanded && (
                                    <div
                                      className="markdown-content"
                                      style={{
                                        marginTop: '12px',
                                        paddingTop: '12px',
                                        borderTop: '1px solid #E2E8F0',
                                      }}
                                    >
                                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                        {topic.content}
                                      </ReactMarkdown>
                                    </div>
                                  )}
                                </div>
                              );
                              })}
                            </div>
                          ) : (
                            <p style={{
                              color: '#888',
                              fontStyle: 'italic',
                              fontSize: '14px',
                            }}>
                              まだトピックが追加されていません。
                            </p>
                          )}
                        </div>
                      </div>
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
                  {MONTHS.find(m => m.id === activeTab)?.label}の議事録
                </h2>
                
                  {/* 月サマリ - サマリが選択されている場合のみ表示 */}
                  {activeSection === currentSummaryId && (
                  <div style={{ marginBottom: '36px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ 
                        color: '#0066CC', 
                        margin: 0,
                        fontSize: '1.35em',
                        fontWeight: '600',
                        letterSpacing: '0.3px',
                      }}>
                        {MONTHS.find(m => m.id === activeTab)?.label}サマリ
                      </h3>
                      {currentSummaryId && (
                        <p style={{
                          margin: '4px 0 0 0',
                          fontSize: '12px',
                          color: '#64748B',
                          fontFamily: 'monospace',
                          fontWeight: '500',
                        }}>
                          ID: {currentSummaryId}
                        </p>
                      )}
                    </div>
                        {editingMonth === activeTab && editingSection === currentSummaryId ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#10B981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#F3F4F6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => {
                            const currentTabData = monthContents[activeTab] as MonthContent | undefined;
                            setAIGenerationInput('');
                            setSelectedTopicIdsForAI([]);
                            setAiSummaryFormat('auto');
                            setAiSummaryLength(500);
                            setAiCustomPrompt('');
                            setIsAIGenerationModalOpen(true);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            backgroundColor: '#3B82F6',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#2563EB';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#3B82F6';
                          }}
                        >
                          <span>🤖</span>
                          <span>AIで作文</span>
                        </button>
                        <button
                          onClick={() => handleStartEditSummary(activeTab as MonthTab)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            backgroundColor: 'transparent',
                            color: '#475569',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            opacity: 0.7,
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 102, 204, 0.1)';
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.color = '#0066CC';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.opacity = '0.7';
                            e.currentTarget.style.color = '#475569';
                          }}
                          title="編集"
                        >
                          <EditIcon size={18} color="currentColor" />
                        </button>
                      </div>
                    )}
                  </div>
                        {editingMonth === activeTab && editingSection === currentSummaryId ? (
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '200px',
                        padding: '12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        resize: 'vertical',
                        lineHeight: '1.6',
                      }}
                    />
                  ) : (
                    <div style={{ width: '100%', overflow: 'hidden' }}>
                      {currentTabData?.summary ? (
                        <div className="markdown-content" style={{ width: '100%', wordBreak: 'break-word' }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {currentTabData.summary}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p style={{ color: '#64748B', fontStyle: 'italic', fontSize: '16px', fontWeight: '500' }}>
                          サマリがありません。編集ボタンから追加してください。
                        </p>
                      )}
                    </div>
                  )}
                  </div>
                )}
                
                {/* 議事録アイテム */}
                <div style={{ marginBottom: '32px' }}>
                  {currentTabData?.items && currentTabData.items.length > 0 && activeSection !== currentSummaryId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {currentTabData.items
                        .filter((item) => activeSection === item.id)
                        .map((item) => (
                      <div
                        key={item.id}
                        style={{
                          marginBottom: '32px',
                        }}
                      >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            {editingMonth === activeTab && editingSection === `${item.id}-title` ? (
                              <div style={{ flex: 1, marginRight: '8px' }}>
                                <input
                                  type="text"
                                  value={editingItemTitle}
                                  onChange={(e) => setEditingItemTitle(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #0066CC',
                                    borderRadius: '4px',
                                  fontSize: '1.35em',
                                  fontWeight: '700',
                                  color: '#0F172A',
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveEdit();
                                    } else if (e.key === 'Escape') {
                                      handleCancelEdit();
                                    }
                                  }}
                                  autoFocus
                                />
                                <p style={{
                                  margin: '4px 0 0 0',
                                  fontSize: '12px',
                                  color: '#64748B',
                                  fontFamily: 'monospace',
                                  fontWeight: '500',
                                }}>
                                  ID: {item.id}
                                </p>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                  <button
                                    onClick={handleSaveEdit}
                                    style={{
                                      padding: '4px 12px',
                                      backgroundColor: '#10B981',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                    }}
                                  >
                                    保存
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    style={{
                                      padding: '4px 12px',
                                      backgroundColor: '#F3F4F6',
                                      color: '#374151',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                    }}
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ flex: 1 }}>
                                <h3 
                                  style={{
                                    marginTop: 0,
                                    fontSize: '1.3em',
                                    color: '#0F172A',
                                    borderLeft: '5px solid #0066CC',
                                    paddingLeft: '20px',
                                    background: 'linear-gradient(90deg, #EFF6FF 0%, #F0F9FF 60%, transparent 100%)',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px',
                                    lineHeight: '1.5',
                                    paddingTop: '6px',
                                    paddingBottom: '6px',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s ease',
                                  }}
                                  onClick={() => handleStartEditItemTitle(activeTab, item.id)}
                                  title="クリックしてタイトルを編集"
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(90deg, #DBEAFE 0%, #E0F2FE 60%, transparent 100%)';
                                    e.currentTarget.style.color = '#0066CC';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(90deg, #EFF6FF 0%, #F0F9FF 60%, transparent 100%)';
                                    e.currentTarget.style.color = '#1E293B';
                                  }}
                                >
                                  {item.title}
                                </h3>
                                {editingMonth === activeTab && editingSection === item.id && (
                                  <p style={{
                                    margin: '4px 0 0 20px',
                                    fontSize: '12px',
                                    color: '#64748B',
                                    fontFamily: 'monospace',
                                    fontWeight: '500',
                                  }}>
                                    ID: {item.id}
                                  </p>
                                )}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                              {editingMonth === activeTab && editingSection === item.id ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={handleSaveEdit}
                                    style={{
                                      padding: '4px 12px',
                                      backgroundColor: '#10B981',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                    }}
                                  >
                                    保存
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    style={{
                                      padding: '4px 12px',
                                      backgroundColor: '#F3F4F6',
                                      color: '#374151',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                    }}
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              ) : (
                                <>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleStartEditItem(activeTab, item.id);
                                  }}
                                  type="button"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '40px',
                                    height: '40px',
                                    backgroundColor: 'transparent',
                                    color: '#475569',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    opacity: 0.7,
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(0, 102, 204, 0.1)';
                                    e.currentTarget.style.opacity = '1';
                                    e.currentTarget.style.color = '#0066CC';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.opacity = '0.7';
                                    e.currentTarget.style.color = '#475569';
                                  }}
                                  title="コンテンツを編集"
                                >
                                  <EditIcon size={18} color="currentColor" />
                                </button>
                                  <button
                                    onClick={() => handleDeleteItem(activeTab, item.id)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '40px',
                                      height: '40px',
                                      backgroundColor: 'transparent',
                                      color: '#DC2626',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      opacity: 0.7,
                                      transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                                      e.currentTarget.style.opacity = '1';
                                      e.currentTarget.style.color = '#DC2626';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.opacity = '0.7';
                                      e.currentTarget.style.color = '#DC2626';
                                    }}
                                    title="削除"
                                  >
                                    <DeleteIcon size={18} color="currentColor" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {(item.location || item.date || item.author) && (
                            <div style={{ 
                              marginBottom: '20px', 
                              padding: '12px 16px',
                              backgroundColor: '#F8FAFC',
                              borderRadius: '6px',
                              border: '1px solid #E2E8F0',
                            }}>
                              <p style={{ margin: 0, color: '#475569', fontSize: '15px', lineHeight: '1.8', fontWeight: '500' }}>
                                {item.location && <><strong style={{ color: '#0F172A', fontWeight: '700' }}>場所:</strong> {item.location}<br /></>}
                                {item.date && <><strong style={{ color: '#0F172A', fontWeight: '700' }}>日時:</strong> {item.date}<br /></>}
                                {item.author && <><strong style={{ color: '#0F172A', fontWeight: '700' }}>文責:</strong> {item.author}</>}
                              </p>
                            </div>
                          )}
                          
                          {editingMonth === activeTab && editingSection === item.id ? (
                            <div>
                              <p style={{
                                margin: '0 0 8px 0',
                                fontSize: '12px',
                                color: '#64748B',
                                fontFamily: 'monospace',
                                fontWeight: '500',
                              }}>
                                ID: {item.id}
                              </p>
                              <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                  display: 'block',
                                  marginBottom: '8px',
                                  fontWeight: '600',
                                  color: '#1E293B',
                                  fontSize: '14px',
                                }}>
                                  日時
                                </label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                  <div style={{ flex: '0 0 200px' }}>
                                    <label style={{
                                      display: 'block',
                                      marginBottom: '6px',
                                      fontWeight: '500',
                                      color: '#475569',
                                      fontSize: '13px',
                                    }}>
                                      日付
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <input
                                        type="date"
                                        value={editingItemDate}
                                        onChange={(e) => setEditingItemDate(e.target.value)}
                                        style={{
                                          flex: 1,
                                          padding: '10px 12px',
                                          border: '1px solid #D1D5DB',
                                          borderRadius: '6px',
                                          fontSize: '14px',
                                          boxSizing: 'border-box',
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const today = new Date();
                                          const year = today.getFullYear();
                                          const month = String(today.getMonth() + 1).padStart(2, '0');
                                          const day = String(today.getDate()).padStart(2, '0');
                                          setEditingItemDate(`${year}-${month}-${day}`);
                                        }}
                                        style={{
                                          padding: '10px 16px',
                                          backgroundColor: '#0066CC',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '6px',
                                          fontSize: '13px',
                                          fontWeight: '600',
                                          cursor: 'pointer',
                                          whiteSpace: 'nowrap',
                                          transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = '#0051a8';
                                          e.currentTarget.style.transform = 'translateY(-1px)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = '#0066CC';
                                          e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                      >
                                        今日
                                      </button>
                                    </div>
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <label style={{
                                      display: 'block',
                                      marginBottom: '6px',
                                      fontWeight: '500',
                                      color: '#475569',
                                      fontSize: '13px',
                                    }}>
                                      時間（任意）
                                    </label>
                                    <input
                                      type="text"
                                      value={editingItemTime}
                                      onChange={(e) => setEditingItemTime(e.target.value)}
                                      placeholder="例: 14:00-16:00"
                                      style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                              <textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                style={{
                                  width: '100%',
                                  minHeight: '300px',
                                  padding: '12px',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  fontFamily: 'monospace',
                                  resize: 'vertical',
                                  lineHeight: '1.6',
                                }}
                              />
                            </div>
                          ) : (
                            <div>
                              {item.content ? (
                                <div className="markdown-content">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                    {item.content}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <p style={{ color: '#64748B', fontStyle: 'italic', fontSize: '16px', fontWeight: '500' }}>
                                  コンテンツがありません。編集ボタンから追加してください。
                                </p>
                              )}
                            </div>
                          )}
                          
                          {/* トピック一括追加ボタン（2箇所目） */}
                          {item.content && (
                            <div style={{ marginBottom: '16px' }}>
                              <button
                                onClick={() => {
                                  try {
                                    // 内容を---で分割（行全体が---のパターンにマッチ）
                                    // 最初と最後の---は区切りとして扱う
                                    const content = item.content.trim();
                                    const sections = content.split(/\n\s*---\s*\n/).filter(section => section.trim().length > 0);
                                    
                                    // 最初と最後が---で始まる/終わる場合は除去
                                    const cleanedSections = sections.map(section => {
                                      return section.replace(/^---\s*\n?/, '').replace(/\n?---\s*$/, '').trim();
                                    }).filter(section => section.length > 0);
                                    
                                    if (cleanedSections.length === 0) {
                                      alert('---で区切られたセクションが見つかりませんでした。');
                                      return;
                                    }
                                    
                                    const newTopics: Topic[] = [];
                                    
                                    cleanedSections.forEach((section) => {
                                      const trimmedSection = section.trim();
                                      if (trimmedSection.length === 0) return;
                                      
                                      // 最初の##見出しを探す
                                      const headingMatch = trimmedSection.match(/^##\s+(.+)$/m);
                                      let title = '無題のトピック';
                                      
                                      if (headingMatch && headingMatch[1]) {
                                        title = headingMatch[1].trim();
                                      } else {
                                        // ##がない場合は最初の行をタイトルにする
                                        const firstLine = trimmedSection.split('\n')[0].trim();
                                        if (firstLine.length > 0) {
                                          title = firstLine.replace(/^#+\s*/, '').trim() || '無題のトピック';
                                        }
                                      }
                                      
                                      // トピックIDを生成
                                      const topicId = generateUniqueId();
                                      
                                      const now = new Date().toISOString();
                                      
                                      newTopics.push({
                                        id: topicId,
                                        title: title,
                                        content: trimmedSection,
                                        mentionedDate: item.date || undefined, // 親の議事録の日時を引き継ぐ
                                        createdAt: now,
                                        updatedAt: now,
                                      });
                                    });
                                    
                                    if (newTopics.length === 0) {
                                      alert('トピックを抽出できませんでした。');
                                      return;
                                    }
                                    
                                    // 既存のトピックに追加
                                    const updatedContents = { ...monthContents };
                                    const tabData = updatedContents[activeTab];
                                    if (tabData) {
                                      const itemIndex = tabData.items.findIndex(i => i.id === item.id);
                                      if (itemIndex !== -1) {
                                        const updatedItems = [...tabData.items];
                                        const currentTopics = updatedItems[itemIndex].topics || [];
                                        updatedItems[itemIndex] = {
                                          ...updatedItems[itemIndex],
                                          topics: [...currentTopics, ...newTopics],
                                        };
                                        updatedContents[activeTab] = {
                                          ...tabData,
                                          items: updatedItems,
                                        };
                                        setMonthContents(updatedContents);
                                        setHasUnsavedChanges(true);
                                        
                                      // 埋め込みはChromaDB側で一元管理されているため、Topics生成時には実行しない
                                      // if (typeof window !== 'undefined' && organizationId && meetingId) {
                                      //   newTopics.forEach((topic) => {
                                      //     saveTopicEmbeddingAsync(
                                      //       topic.id,
                                      //       meetingId,
                                      //       organizationId,
                                      //       topic.title,
                                      //       topic.content
                                      //     ).catch((error) => {
                                      //       console.warn('⚠️ トピック埋め込みの生成に失敗しました:', error);
                                      //     });
                                      //   });
                                      // }
                                        
                                        alert(`${newTopics.length}個のトピックを追加しました。`);
                                      }
                                    }
                                  } catch (error: any) {
                                    console.error('トピック一括追加エラー:', error);
                                    alert(`トピックの一括追加に失敗しました: ${error?.message || '不明なエラー'}`);
                                  }
                                }}
                                style={{
                                  padding: '8px 16px',
                                  background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.9em',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)',
                                  transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.2)';
                                }}
                              >
                                📋 トピック一括追加
                              </button>
                            </div>
                          )}
                          
                          {/* 個別トピックセクション */}
                          <div style={{
                            marginTop: '30px',
                            paddingTop: '20px',
                            borderTop: '2px solid #E2E8F0',
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '20px',
                            }}>
                              <h4 style={{
                                margin: 0,
                                fontSize: '1.15em',
                                color: '#0066CC',
                                fontWeight: '600',
                              }}>
                                個別トピック
                              </h4>
                              <button
                                onClick={() => {
                                  setEditingTopicItemId(item.id);
                                  setEditingTopicId(null);
                                  setTopicTitle('');
                                  setTopicContent('');
                                  setShowTopicModal(true);
                                }}
                                style={{
                                  padding: '8px 16px',
                                  background: '#0066CC',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.95em',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px rgba(0,102,204,0.15)',
                                  transition: 'background 0.2s, transform 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#0051a8';
                                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#0066CC';
                                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                }}
                              >
                                + トピックを追加
                              </button>
                            </div>
                            
                            {item.topics && item.topics.length > 0 ? (
                              <div>
                                {item.topics.map((topic) => {
                                  const topicKey = `${item.id}-topic-${topic.id}`;
                                  const isExpanded = expandedTopics.has(topicKey);
                                  
                                  return (
                                  <div
                                    key={topic.id}
                                    id={topicKey}
                                    style={{
                                      backgroundColor: '#F8FAFD',
                                      border: '1px solid #E0E0E0',
                                      borderRadius: '8px',
                                      padding: '18px 20px',
                                      marginBottom: '15px',
                                      position: 'relative',
                                    }}
                                  >
                                    <div style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'flex-start',
                                      marginBottom: isExpanded ? '12px' : '0',
                                    }}>
                                      <div 
                                        style={{ 
                                          flex: 1,
                                          cursor: 'pointer',
                                        }}
                                        onClick={() => {
                                          const newExpanded = new Set(expandedTopics);
                                          if (isExpanded) {
                                            newExpanded.delete(topicKey);
                                          } else {
                                            newExpanded.add(topicKey);
                                          }
                                          setExpandedTopics(newExpanded);
                                        }}
                                      >
                                        <h5 style={{
                                          fontSize: '1.1em',
                                          fontWeight: 'bold',
                                          color: '#1E293B',
                                          margin: 0,
                                          marginBottom: '8px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                        }}>
                                          <span style={{
                                            fontSize: '14px',
                                            transition: 'transform 0.2s ease',
                                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                            display: 'inline-block',
                                          }}>
                                            ▶
                                          </span>
                                          {topic.title}
                                          <span style={{
                                            fontSize: '0.85em',
                                            color: '#888',
                                            marginLeft: '10px',
                                            fontWeight: 'normal',
                                          }}>
                                            ID: {item.id}-topic-{topic.id}
                                          </span>
                                        </h5>
                                        {/* メタデータ表示 */}
                                        {(topic.semanticCategory || topic.importance || topic.keywords?.length || topic.summary) && (
                                          <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '8px',
                                            marginTop: '8px',
                                          }}>
                                            {topic.semanticCategory && (
                                              <span style={{
                                                padding: '4px 10px',
                                                backgroundColor: '#EFF6FF',
                                                color: '#0066CC',
                                                borderRadius: '12px',
                                                fontSize: '0.75em',
                                                fontWeight: '600',
                                              }}>
                                                📂 {topic.semanticCategory === 'action-item' ? 'アクションアイテム' :
                                                    topic.semanticCategory === 'decision' ? '決定事項' :
                                                    topic.semanticCategory === 'discussion' ? '議論・討議' :
                                                    topic.semanticCategory === 'issue' ? '課題・問題' :
                                                    topic.semanticCategory === 'risk' ? 'リスク' :
                                                    topic.semanticCategory === 'opportunity' ? '機会' :
                                                    topic.semanticCategory === 'question' ? '質問・疑問' :
                                                    topic.semanticCategory === 'summary' ? 'サマリー' :
                                                    topic.semanticCategory === 'follow-up' ? 'フォローアップ' :
                                                    topic.semanticCategory === 'reference' ? '参照情報' : 'その他'}
                                              </span>
                                            )}
                                            {topic.importance && (
                                              <span style={{
                                                padding: '4px 10px',
                                                backgroundColor: topic.importance === 'high' ? '#FEF2F2' :
                                                               topic.importance === 'medium' ? '#FEF3C7' : '#F0FDF4',
                                                color: topic.importance === 'high' ? '#DC2626' :
                                                       topic.importance === 'medium' ? '#D97706' : '#16A34A',
                                                borderRadius: '12px',
                                                fontSize: '0.75em',
                                                fontWeight: '600',
                                              }}>
                                                {topic.importance === 'high' ? '🔴 高' :
                                                 topic.importance === 'medium' ? '🟡 中' : '🟢 低'}
                                              </span>
                                            )}
                                            {topic.keywords && topic.keywords.length > 0 && (
                                              <span style={{
                                                padding: '4px 10px',
                                                backgroundColor: '#F3F4F6',
                                                color: '#475569',
                                                borderRadius: '12px',
                                                fontSize: '0.75em',
                                              }}>
                                                🏷️ {topic.keywords.slice(0, 3).join(', ')}
                                                {topic.keywords.length > 3 && ` +${topic.keywords.length - 3}`}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        {topic.summary && (
                                          <div style={{
                                            marginTop: '8px',
                                            padding: '8px 12px',
                                            backgroundColor: '#F8FAFC',
                                            borderRadius: '6px',
                                            fontSize: '0.85em',
                                            color: '#475569',
                                            fontStyle: 'italic',
                                          }}>
                                            📝 {topic.summary}
                                          </div>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', gap: '5px' }}>
                                        <button
                                          onClick={() => {
                                            setEditingTopicItemId(item.id);
                                            setEditingTopicId(topic.id);
                                            setTopicTitle(topic.title);
                                            setTopicContent(topic.content);
                                            // メタデータも読み込む
                                            setTopicSemanticCategory(topic.semanticCategory || '');
                                            setTopicKeywords(topic.keywords?.join(', ') || '');
                                            setTopicSummary(topic.summary || '');
                                            setTopicImportance(topic.importance || '');
                                            setShowTopicModal(true);
                                          }}
                                          style={{
                                            padding: '4px 10px',
                                            background: '#27ae60',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '0.85em',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          編集
                                        </button>
                                        <button
                                          onClick={async () => {
                                            setSearchingTopicId(topic.id);
                                            setIsSearchingSimilarTopics(true);
                                            setShowSimilarTopicsModal(true);
                                            
                                            try {
                                              const queryText = `${topic.title} ${topic.content}`;
                                              const results = await findSimilarTopics(
                                                queryText,
                                                10,
                                                meetingId,
                                                organizationId
                                              );
                                              
                                              // 自分自身を除外
                                              const filteredResults = results.filter(r => r.topicId !== topic.id);
                                              setSimilarTopics(filteredResults);
                                            } catch (error: any) {
                                              console.error('類似トピック検索エラー:', error);
                                              alert(`類似トピックの検索に失敗しました: ${error?.message || '不明なエラー'}`);
                                              setSimilarTopics([]);
                                            } finally {
                                              setIsSearchingSimilarTopics(false);
                                            }
                                          }}
                                          style={{
                                            padding: '4px 10px',
                                            background: '#8B5CF6',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '0.85em',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#7C3AED';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(139, 92, 246, 0.4)';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#8B5CF6';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(139, 92, 246, 0.3)';
                                          }}
                                        >
                                          🔍 類似検索
                                        </button>
                                        <button
                                          onClick={() => handleDeleteTopic(item.id, topic.id)}
                                          style={{
                                            padding: '4px 10px',
                                            background: '#e74c3c',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '0.85em',
                                            cursor: 'pointer',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#c0392b';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#e74c3c';
                                          }}
                                        >
                                          削除
                                        </button>
                                    </div>
                                  </div>
                                  {isExpanded && (
                                    <div
                                      className="markdown-content"
                                      style={{
                                        marginTop: '12px',
                                        paddingTop: '12px',
                                        borderTop: '1px solid #E2E8F0',
                                      }}
                                    >
                                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                        {topic.content}
                                      </ReactMarkdown>
                                    </div>
                                  )}
                                </div>
                              );
                              })}
                              </div>
                            ) : (
                              <p style={{
                                color: '#888',
                                fontStyle: 'italic',
                                fontSize: '14px',
                              }}>
                                まだトピックが追加されていません。
                              </p>
                            )}
                          </div>
                        </div>
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
            )}
          </main>
          
          {/* サイドバー */}
          <aside style={{
            position: 'sticky',
            top: '20px',
            flexBasis: '300px',
            flexShrink: 0,
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto',
            backgroundColor: '#FFFFFF',
            padding: '28px 24px',
            borderRadius: '14px',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
            border: '1px solid #E5E7EB',
          }}>
            {currentTabData && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '1.15em',
                    color: '#1E293B',
                    borderBottom: '3px solid #0066CC',
                    paddingBottom: '12px',
                    flex: 1,
                    fontWeight: '600',
                    letterSpacing: '0.3px',
                  }}>
                    ナビゲーション
                  </h4>
                  <button
                    onClick={(e) => handleAddItem(activeTab as MonthTab, e)}
                    type="button"
                    disabled={isAddingItem}
                    style={{
                      padding: '8px 14px',
                      background: isAddingItem 
                        ? 'linear-gradient(135deg, #64748B 0%, #475569 50%, #334155 100%)'
                        : 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #475569 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: isAddingItem ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      marginLeft: '12px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 4px rgba(15, 23, 42, 0.2)',
                      transition: 'all 0.2s ease',
                      opacity: isAddingItem ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(15, 23, 42, 0.3)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #475569 100%)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(15, 23, 42, 0.2)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    title="新しい議事録を追加"
                  >
                    + 追加
                  </button>
                </div>
                <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                  <li>
                      <a
                        href={`#${currentSummaryId || 'summary'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentSummaryId) {
                            setActiveSection(currentSummaryId);
                          }
                        }}
                        style={{
                          display: 'block',
                          padding: '12px 16px 12px 32px', // アイコンがない場合も同じインデント
                          textDecoration: 'none',
                          color: activeSection === currentSummaryId ? '#FFFFFF' : '#475569',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          fontWeight: activeSection === currentSummaryId ? '600' : '500',
                          marginBottom: '6px',
                          backgroundColor: activeSection === currentSummaryId ? '#0066CC' : 'transparent',
                          fontSize: '14px',
                          letterSpacing: '0.2px',
                        }}
                        onMouseEnter={(e) => {
                          if (activeSection !== currentSummaryId) {
                            e.currentTarget.style.backgroundColor = '#EFF6FF';
                            e.currentTarget.style.color = '#0066CC';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (activeSection !== currentSummaryId) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#475569';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }
                        }}
                      >
                        サマリ
                      </a>
                  </li>
                  {currentTabData.items?.map((item) => (
                    <li key={item.id}>
                      <div>
                        <a
                          href={`#${item.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveSection(item.id);
                            // トピックの展開/折りたたみを切り替え
                            if (item.topics && item.topics.length > 0) {
                              const newExpanded = new Set(expandedNavItems);
                              if (newExpanded.has(item.id)) {
                                newExpanded.delete(item.id);
                              } else {
                                newExpanded.add(item.id);
                              }
                              setExpandedNavItems(newExpanded);
                            }
                          }}
                          style={{
                            position: 'relative',
                            display: 'block',
                            padding: '12px 16px 12px 32px', // 左側にアイコン用のスペースを確保
                            textDecoration: 'none',
                            color: activeSection === item.id ? '#FFFFFF' : '#475569',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            fontWeight: activeSection === item.id ? '600' : '500',
                            marginBottom: '6px',
                            backgroundColor: activeSection === item.id ? '#0066CC' : 'transparent',
                            fontSize: '14px',
                            letterSpacing: '0.2px',
                          }}
                          onMouseEnter={(e) => {
                            if (activeSection !== item.id) {
                              e.currentTarget.style.backgroundColor = '#EFF6FF';
                              e.currentTarget.style.color = '#0066CC';
                              e.currentTarget.style.transform = 'translateX(4px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (activeSection !== item.id) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#475569';
                              e.currentTarget.style.transform = 'translateX(0)';
                            }
                          }}
                        >
                          {item.topics && item.topics.length > 0 && (
                            <span style={{
                              position: 'absolute',
                              left: '16px',
                              top: '50%',
                              transform: `translateY(-50%) ${expandedNavItems.has(item.id) ? 'rotate(90deg)' : 'rotate(0deg)'}`,
                              fontSize: '12px',
                              transition: 'transform 0.2s ease',
                              display: 'inline-block',
                            }}>
                              ▶
                            </span>
                          )}
                          {item.title}
                        </a>
                        {/* 個別トピックリンク */}
                        {item.topics && item.topics.length > 0 && expandedNavItems.has(item.id) && (
                          <ul style={{ listStyleType: 'none', padding: 0, margin: '4px 0 0 0', paddingLeft: '24px' }}>
                            {item.topics.map((topic) => {
                              const topicId = `${item.id}-topic-${topic.id}`;
                              return (
                                <li key={topic.id}>
                                  <a
                                    href={`#${topicId}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setActiveSection(item.id);
                                      setTimeout(() => {
                                        const topicElement = document.getElementById(topicId);
                                        if (topicElement) {
                                          topicElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          topicElement.style.backgroundColor = '#fff9e6';
                                          setTimeout(() => {
                                            topicElement.style.backgroundColor = '';
                                          }, 2000);
                                        }
                                      }, 100);
                                    }}
                                    style={{
                                      display: 'block',
                                      padding: '8px 12px',
                                      textDecoration: 'none',
                                      color: '#666',
                                      fontSize: '0.95em',
                                      borderRadius: '4px',
                                      marginBottom: '2px',
                                      transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#F3F4F6';
                                      e.currentTarget.style.color = '#0066CC';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.color = '#666';
                                    }}
                                  >
                                    └ {topic.title}
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
      
      {/* 議事録アイテム削除確認モーダル */}
      {showDeleteConfirmModal && deleteTargetTab && deleteTargetItemId && (
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
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cancelDeleteItem();
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '20px', fontWeight: '600', color: '#DC2626' }}>
              ⚠️ 議事録の削除
            </h3>
            {(() => {
              const tabData = monthContents[deleteTargetTab] as MonthContent | undefined;
              const item = tabData?.items?.find(i => i.id === deleteTargetItemId);
              const itemTitle = item?.title || 'この議事録';
              const tabLabel = MONTHS.find(m => m.id === deleteTargetTab)?.label || 
                               SUMMARY_TABS.find(t => t.id === deleteTargetTab)?.label || 
                               deleteTargetTab;
              
              return (
                <>
                  <p style={{ marginBottom: '16px', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                    削除操作は取り消せません
                  </p>
                  <p style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                    「{itemTitle}」を削除しますか？
                  </p>
                  <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '500', color: '#991B1B' }}>
                      この操作により、以下のデータが完全に削除されます：
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#7F1D1D' }}>
                      <li>タブ: {tabLabel}</li>
                      <li>タイトル: {itemTitle}</li>
                      <li>コンテンツ: {item?.content ? 'あり' : 'なし'}</li>
                    </ul>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={cancelDeleteItem}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#F3F4F6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={confirmDeleteItem}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#DC2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      削除する
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
      
      {/* トピック削除確認モーダル */}
      {showDeleteTopicModal && deleteTargetTopicItemId && deleteTargetTopicId && (() => {
        const tabData = monthContents[activeTab] as MonthContent | undefined;
        const item = tabData?.items?.find(i => i.id === deleteTargetTopicItemId);
        const topic = item?.topics?.find(t => t.id === deleteTargetTopicId);
        const topicTitle = topic?.title || 'このトピック';
        
        return (
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
              zIndex: 2000,
              padding: '20px',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                cancelDeleteTopic();
              }
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '24px',
                width: '90%',
                maxWidth: '500px',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '20px', fontWeight: '600', color: '#DC2626' }}>
                ⚠️ トピックの削除
              </h3>
              <p style={{ marginBottom: '16px', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                削除操作は取り消せません
              </p>
              <p style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                「{topicTitle}」を削除しますか？
              </p>
              <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '500', color: '#991B1B' }}>
                  この操作により、以下のデータが完全に削除されます：
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#7F1D1D' }}>
                  <li>タイトル: {topicTitle}</li>
                  <li>コンテンツ: {topic?.content ? 'あり' : 'なし'}</li>
                  {topic?.semanticCategory && <li>カテゴリ: {topic.semanticCategory}</li>}
                </ul>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelDeleteTopic}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDeleteTopic}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#DC2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* エンティティ一括削除確認モーダル */}
      {showDeleteEntitiesModal && (
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
            zIndex: 2002,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteEntitiesModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '20px', fontWeight: '600', color: '#DC2626' }}>
              ⚠️ エンティティの一括削除
            </h3>
            <p style={{ marginBottom: '16px', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
              削除操作は取り消せません
            </p>
            <p style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
              このトピックに関連するすべてのエンティティを削除しますか？
            </p>
            <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '500', color: '#991B1B' }}>
                この操作により、以下のデータが完全に削除されます：
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#7F1D1D' }}>
                <li>エンティティ数: {((pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities).length}件</li>
                {((pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities).slice(0, 5).map((entity, idx) => (
                  <li key={entity.id}>{entity.name} ({entity.type})</li>
                ))}
                {((pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities).length > 5 && (
                  <li>...他 {((pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities).length - 5}件</li>
                )}
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteEntitiesModal(false);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
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
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#DC2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* リレーション一括削除確認モーダル */}
      {showDeleteRelationsModal && (
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
            zIndex: 2002,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteRelationsModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '20px', fontWeight: '600', color: '#DC2626' }}>
              ⚠️ リレーションの一括削除
            </h3>
            <p style={{ marginBottom: '16px', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
              削除操作は取り消せません
            </p>
            <p style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
              このトピックに関連するすべてのリレーションを削除しますか？
            </p>
            <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '500', color: '#991B1B' }}>
                この操作により、以下のデータが完全に削除されます：
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#7F1D1D' }}>
                <li>リレーション数: {((pendingRelations && pendingRelations.length > 0) ? pendingRelations : topicRelations).length}件</li>
                {((pendingRelations && pendingRelations.length > 0) ? pendingRelations : topicRelations).slice(0, 5).map((relation, idx) => {
                  const allEntities = (pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities;
                  const sourceEntity = allEntities.find(e => e.id === relation.sourceEntityId);
                  const targetEntity = allEntities.find(e => e.id === relation.targetEntityId);
                  const sourceName = sourceEntity?.name || relation.sourceEntityId || '不明';
                  const targetName = targetEntity?.name || relation.targetEntityId || '不明';
                  const relationTypeLabels: Record<string, string> = {
                    'subsidiary': '子会社',
                    'uses': '使用',
                    'invests': '出資',
                    'employs': '雇用',
                    'partners': '提携',
                    'competes': '競合',
                    'supplies': '供給',
                    'owns': '所有',
                    'located-in': '所在',
                    'works-for': '勤務',
                    'manages': '管理',
                    'reports-to': '報告',
                    'related-to': '関連',
                    'other': 'その他',
                  };
                  return (
                    <li key={relation.id}>
                      {sourceName} - {relationTypeLabels[relation.relationType] || relation.relationType} - {targetName}
                    </li>
                  );
                })}
                {((pendingRelations && pendingRelations.length > 0) ? pendingRelations : topicRelations).length > 5 && (
                  <li>...他 {((pendingRelations && pendingRelations.length > 0) ? pendingRelations : topicRelations).length - 5}件</li>
                )}
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteRelationsModal(false);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
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
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#DC2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 個別トピック追加・編集モーダル */}
      {showTopicModal && editingTopicItemId && (() => {
        const currentItem = monthContents[activeTab]?.items?.find(i => i.id === editingTopicItemId);
        const displayTopicId = editingTopicId 
          ? `${editingTopicItemId}-topic-${editingTopicId}`
          : `${editingTopicItemId}-topic-${generateUniqueId()}`;
        
        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(44, 62, 80, 0.4) 0%, rgba(30, 41, 59, 0.35) 100%)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2001,
              padding: '20px',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={() => {
              setShowTopicModal(false);
              setEditingTopicItemId(null);
              setEditingTopicId(null);
              setTopicTitle('');
              setTopicContent('');
              // メタデータフィールドもリセット
              setTopicSemanticCategory('');
              setTopicKeywords('');
              setTopicSummary('');
              setTopicImportance('');
              setPendingMetadata(null);
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '1200px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                  {editingTopicId ? '個別トピックを編集' : '個別トピックを追加'}
                </h2>
                <button
                  onClick={() => {
                    setShowTopicModal(false);
                    setEditingTopicItemId(null);
                    setEditingTopicId(null);
                    setTopicTitle('');
                    setTopicContent('');
                    // メタデータフィールドもリセット
                    setTopicSemanticCategory('');
                    setTopicKeywords('');
                    setTopicSummary('');
                    setTopicImportance('');
                    setPendingMetadata(null);
                    setReplaceExistingEntities(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '28px',
                    cursor: 'pointer',
                    color: '#6B7280',
                    padding: '4px 8px',
                    lineHeight: 1,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#1a1a1a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#6B7280';
                  }}
                >
                  ×
                </button>
              </div>
              
              {/* コンテンツ */}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
                {/* ID表示 */}
                <div style={{
                  marginBottom: '28px',
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  borderLeft: '4px solid #0066CC',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <span style={{ fontSize: '18px' }}>🆔</span>
                      トピックID:
                    </span>
                    <code 
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(displayTopicId);
                          alert('トピックIDをコピーしました: ' + displayTopicId);
                        } catch (error) {
                          console.error('コピーに失敗しました:', error);
                          // フォールバック: テキストエリアを使用
                          const textArea = document.createElement('textarea');
                          textArea.value = displayTopicId;
                          document.body.appendChild(textArea);
                          textArea.select();
                          try {
                            document.execCommand('copy');
                            alert('トピックIDをコピーしました: ' + displayTopicId);
                          } catch (err) {
                            alert('コピーに失敗しました');
                          }
                          document.body.removeChild(textArea);
                        }
                      }}
                      style={{
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        color: '#0066CC',
                        backgroundColor: '#EFF6FF',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        letterSpacing: '0.5px',
                        border: '1px solid #DBEAFE',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s, transform 0.1s',
                        userSelect: 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#DBEAFE';
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#EFF6FF';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      title="クリックしてコピー"
                    >
                      {displayTopicId} 📋
                    </code>
                    {!editingTopicId && (
                      <span style={{
                        fontSize: '12px',
                        color: '#64748B',
                        fontStyle: 'italic',
                        padding: '4px 8px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '6px',
                      }}>
                        (保存時に確定)
                      </span>
                    )}
                  </div>
                </div>
                
                {/* トピックタイトル */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                    トピックタイトル <span style={{ color: '#DC2626' }}>*</span>
                  </div>
                  <input
                    type="text"
                    value={topicTitle}
                    onChange={(e) => setTopicTitle(e.target.value)}
                    placeholder="例: プロジェクト進捗報告、課題の共有など"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      fontSize: '16px',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                
                {/* 内容 */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                    内容
                  </div>
                  <textarea
                    value={topicContent}
                    onChange={(e) => setTopicContent(e.target.value)}
                    placeholder="トピックの詳細な内容を入力してください。Markdown形式で記述できます。"
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      fontSize: '16px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      lineHeight: '1.6',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </div>
                
                {/* メタデータセクション */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600, marginBottom: '12px' }}>
                    メタデータ
                  </div>
                  
                  <div>
                    {/* モデル選択とモード選択 */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>タイプ:</span>
                          <select
                            value={topicMetadataModelType}
                            onChange={(e) => {
                              const newType = e.target.value as 'gpt' | 'local';
                              setTopicMetadataModelType(newType);
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('topicMetadataGenerationModelType', newType);
                              }
                              if (newType === 'gpt') {
                                setTopicMetadataSelectedModel('gpt-4o-mini');
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('topicMetadataGenerationModel', 'gpt-4o-mini');
                                }
                              }
                            }}
                            disabled={isGeneratingMetadata}
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.875em',
                              border: '1px solid #D1D5DB',
                              borderRadius: '4px',
                              backgroundColor: '#FFFFFF',
                              color: '#1a1a1a',
                              cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <option value="gpt">GPT</option>
                            <option value="local">ローカル</option>
                          </select>
                        </label>
                        <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>AIモデル:</span>
                          <select
                            value={topicMetadataSelectedModel}
                            onChange={(e) => {
                              const newModel = e.target.value;
                              setTopicMetadataSelectedModel(newModel);
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('topicMetadataGenerationModel', newModel);
                              }
                            }}
                            disabled={isGeneratingMetadata || loadingTopicMetadataLocalModels}
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.875em',
                              border: '1px solid #D1D5DB',
                              borderRadius: '4px',
                              backgroundColor: '#FFFFFF',
                              color: '#1a1a1a',
                              cursor: isGeneratingMetadata || loadingTopicMetadataLocalModels ? 'not-allowed' : 'pointer',
                              minWidth: '140px',
                            }}
                          >
                            {loadingTopicMetadataLocalModels ? (
                              <option>読み込み中...</option>
                            ) : topicMetadataModelType === 'gpt' ? (
                              <>
                                <option value="gpt-5.1">gpt-5.1</option>
                                <option value="gpt-5">gpt-5</option>
                                <option value="gpt-5-mini">gpt-5-mini</option>
                                <option value="gpt-5-nano">gpt-5-nano</option>
                                <option value="gpt-4.1">gpt-4.1</option>
                                <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                                <option value="gpt-4.1-nano">gpt-4.1-nano</option>
                                <option value="gpt-4o">gpt-4o</option>
                                <option value="gpt-4o-mini">gpt-4o-mini</option>
                              </>
                            ) : topicMetadataLocalModels.length === 0 ? (
                              <option>モデルが見つかりません</option>
                            ) : (
                              topicMetadataLocalModels.map((model) => (
                                <option key={model.value} value={model.value}>
                                  {model.label}
                                </option>
                              ))
                            )}
                          </select>
                        </label>
                        <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>モード:</span>
                          <select
                            value={topicMetadataMode}
                            onChange={(e) => {
                              const newMode = e.target.value as 'overwrite' | 'merge';
                              setTopicMetadataMode(newMode);
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('topicMetadataGenerationMode', newMode);
                              }
                            }}
                            disabled={isGeneratingMetadata}
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.875em',
                              border: '1px solid #D1D5DB',
                              borderRadius: '4px',
                              backgroundColor: '#FFFFFF',
                              color: '#1a1a1a',
                              cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <option value="overwrite">上書き</option>
                            <option value="merge">追加</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!topicTitle.trim() || !topicContent.trim()) {
                              alert('タイトルと内容を入力してからAI生成を実行してください。');
                              return;
                            }
                            
                            setIsGeneratingMetadata(true);
                            try {
                              const metadata = await generateTopicMetadata(topicTitle, topicContent, topicMetadataSelectedModel);
                              
                              let finalMetadata = metadata;
                              if (topicMetadataMode === 'merge') {
                                finalMetadata = {
                                  semanticCategory: topicSemanticCategory || metadata.semanticCategory,
                                  importance: topicImportance || metadata.importance,
                                  keywords: topicKeywords && topicKeywords.trim() ? topicKeywords.split(',').map(k => k.trim()) : metadata.keywords,
                                  summary: topicSummary || metadata.summary,
                                };
                              }
                              
                              // エンティティとリレーションを生成
                              devLog('🤖 エンティティ・リレーション抽出を開始...');
                              const extractedEntities = await extractEntities(topicTitle, topicContent, topicMetadataSelectedModel);
                              devLog('✅ エンティティ抽出完了:', extractedEntities.length, '件');
                              
                              const extractedRelations = extractedEntities.length > 0
                                ? await extractRelations(topicTitle, topicContent, extractedEntities, topicMetadataSelectedModel)
                                : [];
                              devLog('✅ リレーション抽出完了:', extractedRelations.length, '件');
                              
                              // エンティティにorganizationIdを設定
                              const entitiesWithOrgId = extractedEntities.map(entity => ({
                                ...entity,
                                organizationId: organizationId,
                              }));
                              
                              // リレーションにtopicIdとorganizationIdを設定
                              const topicEmbeddingId = editingTopicId 
                                ? `${meetingId}-topic-${editingTopicId}`
                                : `${meetingId}-topic-${generateUniqueId()}`;
                              const relationsWithIds = extractedRelations.map(relation => ({
                                ...relation,
                                topicId: editingTopicId || topicEmbeddingId,
                                organizationId: organizationId,
                              }));
                              
                              // 生成されたメタデータを一時的に保持
                              setPendingMetadata(finalMetadata);
                              setPendingEntities(entitiesWithOrgId);
                              setPendingRelations(relationsWithIds);
                              devLog('✅ AI生成完了:', finalMetadata);
                            } catch (error: any) {
                              console.error('❌ AI生成エラー:', error);
                              alert(`メタデータの生成に失敗しました: ${error?.message || '不明なエラー'}`);
                            } finally {
                              setIsGeneratingMetadata(false);
                            }
                          }}
                          disabled={isGeneratingMetadata || !topicTitle.trim() || !topicContent.trim()}
                          style={{
                            padding: '8px 16px',
                            background: isGeneratingMetadata 
                              ? '#94A3B8' 
                              : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease',
                            boxShadow: isGeneratingMetadata 
                              ? 'none' 
                              : '0 2px 8px rgba(16, 185, 129, 0.3)',
                          }}
                          onMouseEnter={(e) => {
                            if (!isGeneratingMetadata) {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isGeneratingMetadata) {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                            }
                          }}
                        >
                          {isGeneratingMetadata ? (
                            <>
                              <span style={{ 
                                display: 'inline-block',
                                width: '12px',
                                height: '12px',
                                border: '2px solid #FFFFFF',
                                borderTopColor: 'transparent',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                              }} />
                              AI生成中...
                            </>
                          ) : (
                            <>
                              <span>🤖</span>
                              AI生成
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* 生成されたメタデータのプレビューと適用/キャンセルボタン */}
                      {pendingMetadata && (
                        <div style={{
                          marginTop: '12px',
                          padding: '12px',
                          backgroundColor: '#F0FDF4',
                          border: '1px solid #86EFAC',
                          borderRadius: '8px',
                        }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>
                            AI生成結果（プレビュー）
                          </div>
                          <div style={{ fontSize: '12px', color: '#166534', marginBottom: '12px', lineHeight: '1.6' }}>
                            {pendingMetadata.semanticCategory && (
                              <div>セマンティックカテゴリ: {pendingMetadata.semanticCategory}</div>
                            )}
                            {pendingMetadata.importance && (
                              <div>重要度: {pendingMetadata.importance}</div>
                            )}
                            {pendingMetadata.keywords && pendingMetadata.keywords.length > 0 && (
                              <div>キーワード: {pendingMetadata.keywords.join(', ')}</div>
                            )}
                            {pendingMetadata.summary && (
                              <div>要約: {pendingMetadata.summary}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                // 生成されたメタデータを適用
                                if (pendingMetadata.semanticCategory) {
                                  setTopicSemanticCategory(pendingMetadata.semanticCategory);
                                }
                                if (pendingMetadata.importance) {
                                  setTopicImportance(pendingMetadata.importance);
                                }
                                if (pendingMetadata.keywords && pendingMetadata.keywords.length > 0) {
                                  setTopicKeywords(pendingMetadata.keywords.join(', '));
                                }
                                if (pendingMetadata.summary) {
                                  setTopicSummary(pendingMetadata.summary);
                                }
                                setPendingMetadata(null);
                              }}
                              style={{
                                padding: '6px 12px',
                                background: '#10B981',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              適用する
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPendingMetadata(null);
                              }}
                              style={{
                                padding: '6px 12px',
                                background: '#F3F4F6',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* セマンティックカテゴリ */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '10px',
                        fontWeight: '600',
                        color: '#475569',
                        fontSize: '14px',
                      }}>
                        セマンティックカテゴリ
                      </label>
                      <select
                        value={topicSemanticCategory}
                        onChange={(e) => setTopicSemanticCategory(e.target.value as TopicSemanticCategory | '')}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '2px solid #E2E8F0',
                          borderRadius: '10px',
                          fontSize: '14px',
                          backgroundColor: '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#0066CC';
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 102, 204, 0.1)';
                          e.currentTarget.style.backgroundColor = '#FAFBFC';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#E2E8F0';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }}
                      >
                        <option value="">選択してください</option>
                        <option value="action-item">アクションアイテム</option>
                        <option value="decision">決定事項</option>
                        <option value="discussion">議論・討議</option>
                        <option value="issue">課題・問題</option>
                        <option value="risk">リスク</option>
                        <option value="opportunity">機会</option>
                        <option value="question">質問・疑問</option>
                        <option value="summary">サマリー</option>
                        <option value="follow-up">フォローアップ</option>
                        <option value="reference">参照情報</option>
                        <option value="other">その他</option>
                      </select>
                    </div>
                    
                    {/* 重要度 */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '10px',
                        fontWeight: '600',
                        color: '#475569',
                        fontSize: '14px',
                      }}>
                        重要度
                      </label>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '10px',
                      }}>
                        {(['high', 'medium', 'low'] as TopicImportance[]).map((importance) => (
                          <button
                            key={importance}
                            type="button"
                            onClick={() => setTopicImportance(topicImportance === importance ? '' : importance)}
                            style={{
                              padding: '12px 16px',
                              border: `2px solid ${topicImportance === importance ? '#0066CC' : '#E2E8F0'}`,
                              borderRadius: '10px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              backgroundColor: topicImportance === importance 
                                ? importance === 'high' ? '#FEF2F2' :
                                  importance === 'medium' ? '#FEF3C7' : '#F0FDF4'
                                : '#FFFFFF',
                              color: topicImportance === importance
                                ? importance === 'high' ? '#DC2626' :
                                  importance === 'medium' ? '#D97706' : '#16A34A'
                                : '#64748B',
                            }}
                            onMouseEnter={(e) => {
                              if (topicImportance !== importance) {
                                e.currentTarget.style.borderColor = '#CBD5E1';
                                e.currentTarget.style.backgroundColor = '#F8FAFC';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (topicImportance !== importance) {
                                e.currentTarget.style.borderColor = '#E2E8F0';
                                e.currentTarget.style.backgroundColor = '#FFFFFF';
                              }
                            }}
                          >
                            {importance === 'high' ? '🔴 高' :
                             importance === 'medium' ? '🟡 中' : '🟢 低'}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* キーワード */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '10px',
                        fontWeight: '600',
                        color: '#475569',
                        fontSize: '14px',
                      }}>
                        キーワード
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 'normal',
                          color: '#64748B',
                          marginLeft: '6px',
                        }}>
                          (カンマ区切り)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={topicKeywords}
                        onChange={(e) => setTopicKeywords(e.target.value)}
                        placeholder="例: プロジェクト, 進捗, 報告"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '2px solid #E2E8F0',
                          borderRadius: '10px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          transition: 'all 0.2s ease',
                          backgroundColor: '#FFFFFF',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#0066CC';
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 102, 204, 0.1)';
                          e.currentTarget.style.backgroundColor = '#FAFBFC';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#E2E8F0';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }}
                      />
                    </div>
                    
                    {/* 要約 */}
                    <div style={{ marginBottom: '0' }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '10px',
                        fontWeight: '600',
                        color: '#475569',
                        fontSize: '14px',
                      }}>
                        要約
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 'normal',
                          color: '#64748B',
                          marginLeft: '6px',
                        }}>
                          (AI生成または手動入力)
                        </span>
                      </label>
                      <textarea
                        value={topicSummary}
                        onChange={(e) => setTopicSummary(e.target.value)}
                        placeholder="トピックの要約を入力してください"
                        style={{
                          width: '100%',
                          minHeight: '120px',
                          padding: '12px 14px',
                          border: '2px solid #E2E8F0',
                          borderRadius: '10px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                          lineHeight: '1.6',
                          transition: 'all 0.2s ease',
                          backgroundColor: '#FFFFFF',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#0066CC';
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 102, 204, 0.1)';
                          e.currentTarget.style.backgroundColor = '#FAFBFC';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#E2E8F0';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* ナレッジグラフ: エンティティとリレーション */}
                <div style={{ marginBottom: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '16px', color: '#1a1a1a', fontWeight: 600 }}>
                        📊 ナレッジグラフ
                      </div>
                    </div>
                  </div>
                  
                  {/* リスト表示 */}
                  <>
                      {/* エンティティ表示 */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>
                            エンティティ
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {((pendingEntities && pendingEntities.length > 0) || topicEntities.length > 0) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteEntitiesModal(true);
                                }}
                                style={{
                                  padding: '4px 12px',
                                  backgroundColor: '#EF4444',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                }}
                              >
                                一括削除
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingEntity(null);
                                setShowAddEntityModal(true);
                              }}
                              style={{
                                padding: '4px 12px',
                                backgroundColor: '#3B82F6',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 500,
                              }}
                            >
                              + 追加
                            </button>
                          </div>
                        </div>
                        {isLoadingEntities ? (
                          <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#6B7280' }}>
                            読み込み中...
                          </div>
                        ) : (pendingEntities && pendingEntities.length > 0) || topicEntities.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {((pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities)
                              .filter((entity) => {
                                if (entitySearchQuery) {
                                  const query = entitySearchQuery.toLowerCase();
                                  const matchesName = entity.name.toLowerCase().includes(query);
                                  const matchesAliases = entity.aliases?.some(alias => 
                                    alias.toLowerCase().includes(query)
                                  ) || false;
                                  if (!matchesName && !matchesAliases) {
                                    return false;
                                  }
                                }
                                if (entityTypeFilter !== 'all' && entity.type !== entityTypeFilter) {
                                  return false;
                                }
                                return true;
                              })
                              .map((entity) => {
                                const entityTypeLabels: Record<string, string> = {
                                  'person': '👤 人',
                                  'company': '🏢 会社',
                                  'product': '📦 製品',
                                  'project': '📋 プロジェクト',
                                  'organization': '🏛️ 組織',
                                  'location': '📍 場所',
                                  'technology': '💻 技術',
                                  'other': '📌 その他',
                                };
                                return (
                                  <div
                                    key={entity.id}
                                    style={{
                                      padding: '12px',
                                      backgroundColor: '#F9FAFB',
                                      borderRadius: '8px',
                                      border: '1px solid #E5E7EB',
                                      fontSize: '14px',
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#1a1a1a', fontWeight: 600 }}>
                                          {entityTypeLabels[entity.type] || '📌 その他'} {entity.name}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                          onClick={() => {
                                            setEditingEntity(entity);
                                            setShowAddEntityModal(true);
                                          }}
                                          style={{
                                            padding: '4px 8px',
                                            backgroundColor: 'transparent',
                                            color: '#6B7280',
                                            border: '1px solid #D1D5DB',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          編集
                                        </button>
                                      </div>
                                    </div>
                                    {entity.aliases && entity.aliases.length > 0 && (
                                      <div style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>
                                        別名: {entity.aliases.join(', ')}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic' }}>
                            登録なし（AI生成で自動追加されます）
                          </div>
                        )}
                      </div>
                      
                      {/* リレーション表示 */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>
                            リレーション
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {((pendingRelations && pendingRelations.length > 0) || topicRelations.length > 0) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteRelationsModal(true);
                                }}
                                style={{
                                  padding: '4px 12px',
                                  backgroundColor: '#EF4444',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                }}
                              >
                                一括削除
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingRelation(null);
                                setShowAddRelationModal(true);
                              }}
                              style={{
                                padding: '4px 12px',
                                backgroundColor: '#3B82F6',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 500,
                              }}
                            >
                              + 追加
                            </button>
                          </div>
                        </div>
                        {isLoadingRelations ? (
                          <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#6B7280' }}>
                            読み込み中...
                          </div>
                        ) : (pendingRelations && pendingRelations.length > 0) || topicRelations.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {((pendingRelations && pendingRelations.length > 0) ? pendingRelations : topicRelations)
                              .map((relation) => {
                                const allEntities = (pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities;
                                const sourceEntity = allEntities.find(e => e.id === relation.sourceEntityId);
                                const targetEntity = allEntities.find(e => e.id === relation.targetEntityId);
                                const sourceName = sourceEntity?.name || relation.sourceEntityId || '不明';
                                const targetName = targetEntity?.name || relation.targetEntityId || '不明';
                                const relationTypeLabels: Record<string, string> = {
                                  'subsidiary': '子会社',
                                  'uses': '使用',
                                  'invests': '出資',
                                  'employs': '雇用',
                                  'partners': '提携',
                                  'competes': '競合',
                                  'supplies': '供給',
                                  'owns': '所有',
                                  'located-in': '所在',
                                  'works-for': '勤務',
                                  'manages': '管理',
                                  'reports-to': '報告',
                                  'related-to': '関連',
                                  'other': 'その他',
                                };
                                return (
                                  <div
                                    key={relation.id}
                                    style={{
                                      padding: '12px',
                                      backgroundColor: '#F9FAFB',
                                      borderRadius: '8px',
                                      border: '1px solid #E5E7EB',
                                      fontSize: '14px',
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                      <div style={{ color: '#1a1a1a', fontWeight: 500 }}>
                                        <span style={{ color: '#0066CC', fontWeight: 600 }}>{sourceName}</span>{' '}
                                        <span style={{ color: '#6B7280' }}>→ [{relationTypeLabels[relation.relationType] || relation.relationType}]</span>{' '}
                                        <span style={{ color: '#0066CC', fontWeight: 600 }}>{targetName}</span>
                                      </div>
                                      <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                          onClick={() => {
                                            setEditingRelation(relation);
                                            setShowAddRelationModal(true);
                                          }}
                                          style={{
                                            padding: '4px 8px',
                                            backgroundColor: 'transparent',
                                            color: '#6B7280',
                                            border: '1px solid #D1D5DB',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          編集
                                        </button>
                                      </div>
                                    </div>
                                    {relation.description && (
                                      <div style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>
                                        {relation.description}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic' }}>
                            登録なし（AI生成で自動追加されます）
                          </div>
                        )}
                      </div>
                  </>
                </div>
                
                {/* エンティティ・リレーション保存オプション */}
                {(pendingEntities && pendingEntities.length > 0) || (pendingRelations && pendingRelations.length > 0) ? (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#F0F9FF',
                    borderRadius: '8px',
                    border: '1px solid #BFDBFE',
                    marginTop: '24px',
                  }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#1E40AF',
                    }}>
                      <input
                        type="checkbox"
                        checked={replaceExistingEntities}
                        onChange={(e) => setReplaceExistingEntities(e.target.checked)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                        }}
                      />
                      <span>
                        <strong>既存のエンティティ・リレーションを置き換える</strong>
                        <br />
                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                          チェックを入れると、このトピックに関連する既存のエンティティとリレーションを削除してから新しいものを追加します。
                          チェックを外すと、既存のものに追加されます。
                        </span>
                      </span>
                    </label>
                  </div>
                ) : null}
                
                {/* ボタン */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '16px',
                  paddingTop: '32px',
                  marginTop: '32px',
                  borderTop: '2px solid #E5E7EB',
                }}>
                  <button
                    onClick={() => {
                      setShowTopicModal(false);
                      setEditingTopicItemId(null);
                      setEditingTopicId(null);
                      setTopicTitle('');
                      setTopicContent('');
                      // メタデータフィールドもリセット
                      setTopicSemanticCategory('');
                      setTopicKeywords('');
                      setTopicSummary('');
                      setTopicImportance('');
                      setPendingMetadata(null);
                      // ナレッジグラフ関連のstateもリセット
                      setPendingEntities(null);
                      setPendingRelations(null);
                      setTopicEntities([]);
                      setTopicRelations([]);
                      setReplaceExistingEntities(false);
                    }}
                    style={{
                      padding: '14px 28px',
                      background: '#F3F4F6',
                      color: '#374151',
                      border: '2px solid #E5E7EB',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#E5E7EB';
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F3F4F6';
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => {
                      if (!topicTitle.trim()) {
                        alert('トピックタイトルを入力してください。');
                        return;
                      }
                      
                      const updatedContents = { ...monthContents };
                      const tabData = updatedContents[activeTab];
                      if (tabData) {
                        const itemIndex = tabData.items.findIndex(i => i.id === editingTopicItemId);
                        if (itemIndex !== -1) {
                          const updatedItems = [...tabData.items];
                          const currentItem = updatedItems[itemIndex];
                          const currentTopics = currentItem.topics || [];
                          
                          const now = new Date().toISOString();
                          
                          // キーワードを配列に変換（カンマ区切り）
                          const keywordsArray = topicKeywords
                            .split(',')
                            .map(k => k.trim())
                            .filter(k => k.length > 0);
                          
                          if (editingTopicId) {
                            // 編集モード
                            const topicIndex = currentTopics.findIndex(t => t.id === editingTopicId);
                            if (topicIndex !== -1) {
                              const existingTopic = currentTopics[topicIndex];
                              const updatedTopics = [...currentTopics];
                              updatedTopics[topicIndex] = {
                                ...existingTopic,
                                id: existingTopic.id,
                                title: topicTitle.trim(),
                                content: topicContent.trim(),
                                // メタデータを追加
                                semanticCategory: topicSemanticCategory || undefined,
                                importance: topicImportance || undefined,
                                keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
                                summary: topicSummary.trim() || undefined,
                                updatedAt: now,
                                // 既存のcreatedAtを保持
                                createdAt: existingTopic.createdAt || now,
                              };
                              updatedItems[itemIndex] = {
                                ...currentItem,
                                topics: updatedTopics,
                              };
                            }
                          } else {
                            // 新規追加モード
                            const newTopicId = generateUniqueId();
                            updatedItems[itemIndex] = {
                              ...currentItem,
                              topics: [
                                ...currentTopics,
                                {
                                  id: newTopicId,
                                  title: topicTitle.trim(),
                                  content: topicContent.trim(),
                                  // メタデータを追加
                                  semanticCategory: topicSemanticCategory || undefined,
                                  importance: topicImportance || undefined,
                                  keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
                                  summary: topicSummary.trim() || undefined,
                                  mentionedDate: currentItem.date || undefined, // 親の議事録の日時を引き継ぐ
                                  createdAt: now,
                                  updatedAt: now,
                                },
                              ],
                            };
                          }
                          
                          updatedContents[activeTab] = {
                            ...tabData,
                            items: updatedItems,
                          };
                          setMonthContents(updatedContents);
                          setHasUnsavedChanges(true);
                          
                          // Phase 2: エンティティとリレーションを保存
                          // 埋め込みはChromaDB側で一元管理されているため、Topics生成時には実行しない
                          // クライアント側でのみ実行（サーバーサイドレンダリングを回避）
                          if (typeof window !== 'undefined' && organizationId && meetingId) {
                            const savedTopic = editingTopicId 
                              ? updatedItems[itemIndex].topics?.find(t => t.id === editingTopicId)
                              : updatedItems[itemIndex].topics?.[updatedItems[itemIndex].topics.length - 1];
                            
                            if (savedTopic) {
                              const finalTopicId = editingTopicId || savedTopic.id;
                              const topicEmbeddingId = `${meetingId}-topic-${finalTopicId}`;
                              
                              // エンティティとリレーションを保存
                              (async () => {
                                try {
                                  // topicsレコードが存在するか確認（存在しない場合は作成）
                                  let topicEmbeddingRecordId = topicEmbeddingId;
                                  try {
                                    const topicEmbeddingResult = await callTauriCommand('doc_get', {
                                      collectionName: 'topics',
                                      docId: topicEmbeddingId,
                                    });
                                    
                                    if (topicEmbeddingResult && topicEmbeddingResult.exists && topicEmbeddingResult.data) {
                                      topicEmbeddingRecordId = topicEmbeddingResult.data.id || topicEmbeddingId;
                                    } else {
                                      // レコードが存在しない場合は作成
                                      const now = new Date().toISOString();
                                      const finalOrganizationId = organizationId || null;
                                      await callTauriCommand('doc_set', {
                                        collectionName: 'topics',
                                        docId: topicEmbeddingId,
                                        data: {
                                          id: topicEmbeddingId,
                                          topicId: finalTopicId,
                                          meetingNoteId: meetingId,
                                          organizationId: finalOrganizationId,
                                          title: savedTopic.title || '',
                                          content: savedTopic.content || '',
                                          createdAt: now,
                                          updatedAt: now,
                                        },
                                      });
                                    }
                                  } catch (error: any) {
                                    // エラーの場合はレコードを作成
                                    const now = new Date().toISOString();
                                    const finalOrganizationId = organizationId || null;
                                    await callTauriCommand('doc_set', {
                                      collectionName: 'topics',
                                      docId: topicEmbeddingId,
                                      data: {
                                        id: topicEmbeddingId,
                                        topicId: finalTopicId,
                                        meetingNoteId: meetingId,
                                        organizationId: finalOrganizationId,
                                        title: savedTopic.title || '',
                                        content: savedTopic.content || '',
                                        createdAt: now,
                                        updatedAt: now,
                                      },
                                    });
                                  }
                                  
                                  // 既存のエンティティとリレーションを削除（置き換えモードの場合）
                                  if (replaceExistingEntities) {
                                    devLog('🔄 [トピック保存] 既存のエンティティとリレーションを削除します');
                                    
                                    // 1. 既存のリレーションを削除
                                    try {
                                      const existingRelations = await getRelationsByTopicId(topicEmbeddingRecordId);
                                      devLog(`📊 [トピック保存] 既存のリレーション: ${existingRelations.length}件`);
                                      for (const relation of existingRelations) {
                                        try {
                                          await deleteRelation(relation.id);
                                          devLog(`✅ [トピック保存] リレーション削除: ${relation.id}`);
                                        } catch (error: any) {
                                          devWarn(`⚠️ [トピック保存] リレーション削除エラー（続行します）: ${relation.id}`, error);
                                        }
                                      }
                                    } catch (error: any) {
                                      devWarn('⚠️ [トピック保存] 既存リレーション取得エラー（続行します）:', error);
                                    }
                                    
                                    // 2. 既存のエンティティを削除（このトピックに関連するもののみ）
                                    try {
                                      const allEntities = await getEntitiesByOrganizationId(organizationId);
                                      const topicRelatedEntities = allEntities.filter(e => 
                                        e.metadata && typeof e.metadata === 'object' && 'topicId' in e.metadata && e.metadata.topicId === finalTopicId
                                      );
                                      devLog(`📊 [トピック保存] 既存のエンティティ: ${topicRelatedEntities.length}件`);
                                      for (const entity of topicRelatedEntities) {
                                        try {
                                          await deleteEntity(entity.id);
                                          devLog(`✅ [トピック保存] エンティティ削除: ${entity.id}`);
                                        } catch (error: any) {
                                          devWarn(`⚠️ [トピック保存] エンティティ削除エラー（続行します）: ${entity.id}`, error);
                                        }
                                      }
                                    } catch (error: any) {
                                      devWarn('⚠️ [トピック保存] 既存エンティティ取得エラー（続行します）:', error);
                                    }
                                  }
                                  
                                  // エンティティを保存（IDを保持して保存）
                                  const entitiesToSave = pendingEntities || [];
                                  const entityIdMap = new Map<string, string>(); // 元のID -> 実際のIDのマッピング
                                  
                                  for (const entity of entitiesToSave) {
                                    try {
                                      const existingEntity = await getEntityById(entity.id);
                                      if (!existingEntity) {
                                        // エンティティに既にIDが設定されている場合はそれを使用
                                        // エンティティに既にIDが設定されている場合はそれを使用
                                        const entityData: any = {
                                          ...entity,
                                          metadata: {
                                            ...entity.metadata,
                                            topicId: finalTopicId,
                                          },
                                          organizationId: organizationId || undefined,
                                        };
                                        // idが存在する場合は追加（createEntity関数内で処理される）
                                        if (entity.id) {
                                          entityData.id = entity.id;
                                        }
                                        const createdEntity = await createEntity(entityData);
                                        entityIdMap.set(entity.id, createdEntity.id);
                                        devLog(`✅ エンティティを作成しました: ${entity.id} -> ${createdEntity.id}`);
                                      } else {
                                        entityIdMap.set(entity.id, existingEntity.id);
                                        devLog(`✅ エンティティは既に存在します: ${entity.id}`);
                                      }
                                    } catch (error: any) {
                                      devWarn('⚠️ エンティティ保存エラー:', error);
                                    }
                                  }
                                  
                                  // リレーションを保存（エンティティIDのマッピングを適用）
                                  const relationsToSave = pendingRelations || [];
                                  for (const relation of relationsToSave) {
                                    try {
                                      // エンティティIDをマッピング（存在する場合）
                                      const mappedSourceEntityId = relation.sourceEntityId 
                                        ? (entityIdMap.get(relation.sourceEntityId) || relation.sourceEntityId)
                                        : undefined;
                                      const mappedTargetEntityId = relation.targetEntityId 
                                        ? (entityIdMap.get(relation.targetEntityId) || relation.targetEntityId)
                                        : undefined;
                                      
                                      // エンティティの存在確認
                                      let canCreateRelation = true;
                                      
                                      if (mappedSourceEntityId) {
                                        const sourceEntity = await getEntityById(mappedSourceEntityId);
                                        if (!sourceEntity) {
                                          devWarn(`⚠️ 起点エンティティが見つかりません: ${mappedSourceEntityId}（元のID: ${relation.sourceEntityId}）（リレーション作成をスキップ）`);
                                          canCreateRelation = false;
                                        }
                                      }
                                      
                                      if (mappedTargetEntityId) {
                                        const targetEntity = await getEntityById(mappedTargetEntityId);
                                        if (!targetEntity) {
                                          devWarn(`⚠️ 終点エンティティが見つかりません: ${mappedTargetEntityId}（元のID: ${relation.targetEntityId}）（リレーション作成をスキップ）`);
                                          canCreateRelation = false;
                                        }
                                      }
                                      
                                      if (canCreateRelation) {
                                        await createRelation({
                                          ...relation,
                                          sourceEntityId: mappedSourceEntityId,
                                          targetEntityId: mappedTargetEntityId,
                                          topicId: topicEmbeddingRecordId,
                                          organizationId: organizationId || undefined,
                                        });
                                        devLog(`✅ リレーションを作成しました: ${relation.relationType} (${mappedSourceEntityId} -> ${mappedTargetEntityId})`);
                                      }
                                    } catch (error: any) {
                                      devWarn('⚠️ リレーション保存エラー:', error);
                                    }
                                  }
                                  
                                  // 一時状態をクリア
                                  setPendingEntities(null);
                                  setPendingRelations(null);
                                } catch (error: any) {
                                  devWarn('⚠️ エンティティ・リレーション保存エラー:', error);
                                }
                              })();
                            }
                          }
                          
                          setShowTopicModal(false);
                          setEditingTopicItemId(null);
                          setEditingTopicId(null);
                          setTopicTitle('');
                          setTopicContent('');
                          // メタデータフィールドもリセット
                          setTopicSemanticCategory('');
                          setTopicKeywords('');
                          setTopicSummary('');
                          setTopicImportance('');
                          setPendingMetadata(null);
                          // ナレッジグラフ関連のstateもリセット
                          setPendingEntities(null);
                          setPendingRelations(null);
                          setTopicEntities([]);
                          setTopicRelations([]);
                        }
                      }
                    }}
                    style={{
                      padding: '14px 28px',
                      background: 'linear-gradient(135deg, #0066CC 0%, #0051a8 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0, 102, 204, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #0051a8 0%, #004080 100%)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 102, 204, 0.4), 0 4px 8px rgba(0, 0, 0, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #0066CC 0%, #0051a8 100%)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 102, 204, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {editingTopicId ? '💾 変更を保存' : '✨ トピックを追加'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* AI生成モーダル */}
      {isAIGenerationModalOpen && (() => {
        // 対象の月で作成されている個別トピックを取得
        const currentTabData = monthContents[activeTab] as MonthContent | undefined;
        const isSummaryTab = SUMMARY_TABS.some(t => t.id === activeTab);
        
        let allTopicsInMonth: Topic[] = [];
        
        if (isSummaryTab) {
          // 総括タブの場合、対応する月のトピックを取得
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
              // 全ての月
              targetMonths = ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march'];
              break;
          }
          
          // 対象の月のトピックを収集
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
          // 月タブの場合、その月のトピックを取得
          if (currentTabData?.items) {
            currentTabData.items.forEach(item => {
              if (item.topics && item.topics.length > 0) {
                allTopicsInMonth.push(...item.topics);
              }
            });
          }
        }
        
        return (
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
              zIndex: 10000,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsAIGenerationModalOpen(false);
              }
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                width: '95%',
                maxWidth: '1400px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                  AIで作文 - サマリ
                </h2>
                <button
                  onClick={() => {
                    setAiGeneratedContent(null);
                    setOriginalContent(null);
                    setAIGenerationInput('');
                    setSelectedTopicIdsForAI([]);
                    setAiSummaryFormat('auto');
                    setAiSummaryLength(500);
                    setAiCustomPrompt('');
                    setIsAIGenerationModalOpen(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: '#6B7280',
                    cursor: 'pointer',
                    padding: '0',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
              
              {/* コンテンツ */}
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                {/* AIモデル選択 */}
                <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                    AIモデル選択
                  </label>
                  
                  {/* モデルタイプ選択 */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      {(['gpt', 'local'] as const).map((type) => (
                        <label
                          key={type}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            border: `2px solid ${aiModelType === type ? '#3B82F6' : '#D1D5DB'}`,
                            borderRadius: '6px',
                            backgroundColor: aiModelType === type ? '#EFF6FF' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '13px',
                          }}
                        >
                          <input
                            type="radio"
                            name="aiModelType"
                            value={type}
                            checked={aiModelType === type}
                            onChange={(e) => setAiModelType(e.target.value as 'gpt' | 'local')}
                            style={{ cursor: 'pointer' }}
                          />
                          <span>{type === 'gpt' ? 'GPT' : 'ローカル'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {/* モデル選択 */}
                  {aiModelType === 'local' && loadingAiLocalModels && (
                    <div style={{ padding: '8px', fontSize: '12px', color: '#6B7280' }}>
                      🔄 利用可能なモデルを取得中...
                    </div>
                  )}
                  {aiModelType === 'local' && !loadingAiLocalModels && availableAiModels.length === 0 && (
                    <div style={{ padding: '8px', fontSize: '12px', color: '#DC2626' }}>
                      ⚠️ 利用可能なローカルモデルが見つかりませんでした
                    </div>
                  )}
                  {availableAiModels.length > 0 && (
                    <select
                      value={aiSelectedModel}
                      onChange={(e) => setAiSelectedModel(e.target.value)}
                      disabled={loadingAiLocalModels}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: '#FFFFFF',
                        color: '#374151',
                        cursor: loadingAiLocalModels ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {availableAiModels.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                {/* 要約形式選択 */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
                    要約形式
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {[
                      { value: 'auto', label: 'おまかせ' },
                      { value: 'bullet', label: '箇条書き' },
                      { value: 'paragraph', label: '説明文' },
                      { value: 'custom', label: 'カスタム' },
                    ].map((format) => (
                      <button
                        key={format.value}
                        type="button"
                        onClick={() => setAiSummaryFormat(format.value as 'auto' | 'bullet' | 'paragraph' | 'custom')}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: aiSummaryFormat === format.value ? '#111827' : '#FFFFFF',
                          color: aiSummaryFormat === format.value ? '#FFFFFF' : '#374151',
                          border: `1px solid ${aiSummaryFormat === format.value ? '#111827' : '#D1D5DB'}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (aiSummaryFormat !== format.value) {
                            e.currentTarget.style.backgroundColor = '#F9FAFB';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (aiSummaryFormat !== format.value) {
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                          }
                        }}
                      >
                        {format.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* 文字数選択（おまかせ、箇条書き、説明文の場合） */}
                  {aiSummaryFormat !== 'custom' && (
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#6B7280' }}>
                        文字数: {aiSummaryLength}文字
                      </label>
                      <input
                        type="range"
                        min="200"
                        max="2000"
                        step="100"
                        value={aiSummaryLength}
                        onChange={(e) => setAiSummaryLength(Number(e.target.value))}
                        style={{
                          width: '100%',
                          height: '6px',
                          borderRadius: '3px',
                          backgroundColor: '#E5E7EB',
                          outline: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', color: '#9CA3AF' }}>
                        <span>200文字</span>
                        <span>2000文字</span>
                      </div>
                    </div>
                  )}
                  
                  {/* カスタムプロンプト入力（カスタム選択時） */}
                  {aiSummaryFormat === 'custom' && (
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                        カスタム指示（プロンプト）
                      </label>
                      <textarea
                        value={aiCustomPrompt}
                        onChange={(e) => setAiCustomPrompt(e.target.value)}
                        placeholder="例: 3つの主要なポイントを箇条書きで、各ポイントは2-3文で説明してください。"
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px',
                          resize: 'vertical',
                        }}
                      />
                    </div>
                  )}
                </div>
                
                {/* 概要入力 */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                    概要（任意）
                  </label>
                  <textarea
                    value={aiGenerationInput}
                    onChange={(e) => setAIGenerationInput(e.target.value)}
                    placeholder="要約したい内容を入力してください（任意）"
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical',
                    }}
                  />
                </div>
                
                {/* 月のサマリを選択（総括タブの場合のみ） */}
                {isSummaryTab && (() => {
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
                  
                  const availableSummaries = targetMonths
                    .map(monthId => {
                      const monthData = monthContents[monthId] as MonthContent | undefined;
                      const monthLabel = MONTHS.find(m => m.id === monthId)?.label || monthId;
                      return {
                        monthId,
                        summary: monthData?.summary || '',
                        summaryId: monthData?.summaryId || '',
                        label: monthLabel,
                      };
                    })
                    .filter(s => s.summary && s.summary.trim().length > 0);
                  
                  return availableSummaries.length > 0 ? (
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                        月のサマリを選択（任意）
                      </label>
                      <div
                        style={{
                          maxHeight: '300px',
                          overflowY: 'auto',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          padding: '12px',
                        }}
                      >
                        {availableSummaries.map((summary) => (
                          <label
                            key={summary.summaryId}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              padding: '12px',
                              marginBottom: '8px',
                              border: selectedSummaryIdsForAI.includes(summary.summaryId) ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                              borderRadius: '6px',
                              backgroundColor: selectedSummaryIdsForAI.includes(summary.summaryId) ? '#EFF6FF' : '#FFFFFF',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedSummaryIdsForAI.includes(summary.summaryId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSummaryIdsForAI([...selectedSummaryIdsForAI, summary.summaryId]);
                                } else {
                                  setSelectedSummaryIdsForAI(selectedSummaryIdsForAI.filter(id => id !== summary.summaryId));
                                }
                              }}
                              style={{ marginRight: '12px', marginTop: '2px', flexShrink: 0 }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                                {summary.label}サマリ
                              </div>
                              <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
                                {summary.summary.substring(0, 200)}{summary.summary.length > 200 ? '...' : ''}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '6px', color: '#6B7280', fontSize: '14px' }}>
                      対象の月にサマリがありません
                    </div>
                  );
                })()}
                
                {/* 対象の月で作成されている個別トピック選択 */}
                {allTopicsInMonth.length > 0 ? (
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                      個別トピックを選択（任意）
                    </label>
                    <div
                      style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        padding: '12px',
                      }}
                    >
                      {allTopicsInMonth.map((topic) => (
                        <label
                          key={topic.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            padding: '12px',
                            marginBottom: '8px',
                            border: selectedTopicIdsForAI.includes(topic.id) ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                            borderRadius: '6px',
                            backgroundColor: selectedTopicIdsForAI.includes(topic.id) ? '#EFF6FF' : '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTopicIdsForAI.includes(topic.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTopicIdsForAI([...selectedTopicIdsForAI, topic.id]);
                              } else {
                                setSelectedTopicIdsForAI(selectedTopicIdsForAI.filter(id => id !== topic.id));
                              }
                            }}
                            style={{ marginRight: '12px', marginTop: '2px', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                              {topic.title}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
                              {topic.content.substring(0, 200)}{topic.content.length > 200 ? '...' : ''}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '6px', color: '#6B7280', fontSize: '14px' }}>
                    この月には個別トピックがありません
                  </div>
                )}
                
                {/* AI生成結果のプレビュー */}
                {aiGeneratedContent && originalContent != null && (
                  <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
                    <div style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                      AI生成結果のプレビュー
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
                      {/* 既存の内容 */}
                      <div>
                        <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#6B7280' }}>
                          既存の内容
                        </div>
                        <div
                          style={{
                            padding: '16px',
                            backgroundColor: '#F9FAFB',
                            borderRadius: '6px',
                            maxHeight: '400px',
                            overflowY: 'auto',
                          }}
                        >
                          {originalContent ? (
                            <div
                              className="markdown-content"
                              style={{
                                fontSize: '14px',
                                lineHeight: '1.8',
                                color: '#374151',
                              }}
                            >
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {originalContent}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>
                              内容がありません
                            </p>
                          )}
                        </div>
                      </div>
                      {/* AI生成結果 */}
                      <div>
                        <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                          AI生成結果
                        </div>
                        <div
                          style={{
                            padding: '16px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '6px',
                            maxHeight: '400px',
                            overflowY: 'auto',
                          }}
                        >
                          <div
                            className="markdown-content"
                            style={{
                              fontSize: '14px',
                              lineHeight: '1.8',
                              color: '#374151',
                            }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {aiGeneratedContent}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          setAiGeneratedContent(null);
                          setOriginalContent(null);
                          setAIGenerationInput('');
                          setSelectedTopicIdsForAI([]);
                          setSelectedSummaryIdsForAI([]);
                          setAiSummaryFormat('auto');
                          setAiSummaryLength(500);
                          setAiCustomPrompt('');
                        }}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#FFFFFF',
                          color: '#374151',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }}
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => {
                          // 生成結果をサマリに適用
                          const currentTabData = monthContents[activeTab] as MonthContent | undefined;
                          if (currentTabData) {
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
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#111827',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#374151';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#111827';
                        }}
                      >
                        適用する
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* フッター */}
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #E5E7EB',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                }}
              >
                <button
                  onClick={() => {
                    setAiGeneratedContent(null);
                    setOriginalContent(null);
                    setAIGenerationInput('');
                    setSelectedTopicIdsForAI([]);
                    setAiSummaryFormat('auto');
                    setAiSummaryLength(500);
                    setAiCustomPrompt('');
                    setIsAIGenerationModalOpen(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  キャンセル
                </button>
                {!aiGeneratedContent && (
                  <button
                    onClick={async () => {
                      try {
                        if (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0 && selectedSummaryIdsForAI.length === 0) {
                          alert('概要、月のサマリ、または個別トピックを少なくとも1つ選択してください');
                          return;
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
                        
                        const summary = await generateAISummary(aiGenerationInput, selectedTopics, selectedSummaries);
                        
                        // 既存の内容を保存
                        const currentTabData = monthContents[activeTab] as MonthContent | undefined;
                        const currentContent = currentTabData?.summary || '';
                        
                        // 状態を設定（比較ビューを表示するため）
                        setOriginalContent(currentContent);
                        setAiGeneratedContent(summary);
                      } catch (error: any) {
                        alert(`エラーが発生しました: ${error.message || '不明なエラー'}`);
                      }
                    }}
                    disabled={isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0 && selectedSummaryIdsForAI.length === 0)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0 && selectedSummaryIdsForAI.length === 0) ? '#9CA3AF' : '#3B82F6',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0 && selectedSummaryIdsForAI.length === 0) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isAIGenerating ? (
                      <>
                        <span>生成中...</span>
                      </>
                    ) : (
                      <>
                        <span>🤖</span>
                        <span>要約を生成</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* 類似トピック検索結果モーダル */}
      {showSimilarTopicsModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(44, 62, 80, 0.4) 0%, rgba(30, 41, 59, 0.35) 100%)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2002,
            padding: '20px',
          }}
          onClick={() => {
            setShowSimilarTopicsModal(false);
            setSearchingTopicId(null);
            setSimilarTopics([]);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '800px',
              width: '90vw',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '0',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              padding: '24px 32px',
              borderRadius: '16px 16px 0 0',
              borderBottom: '3px solid #6D28D9',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#FFFFFF',
                  }}>
                    🔍 類似トピック検索結果
                  </h3>
                  <p style={{
                    margin: '0',
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.9)',
                  }}>
                    {searchingTopicId ? `トピックID: ${searchingTopicId}` : '検索中...'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSimilarTopicsModal(false);
                    setSearchingTopicId(null);
                    setSimilarTopics([]);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  &times;
                </button>
              </div>
            </div>
            
            {/* コンテンツ */}
            <div style={{ padding: '32px' }}>
              {isSearchingSimilarTopics ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#64748B',
                }}>
                  <div style={{
                    display: 'inline-block',
                    width: '40px',
                    height: '40px',
                    border: '4px solid #E2E8F0',
                    borderTopColor: '#8B5CF6',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    marginBottom: '16px',
                  }} />
                  <p>類似トピックを検索中...</p>
                </div>
              ) : similarTopics.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#64748B',
                }}>
                  <p style={{ fontSize: '18px', marginBottom: '8px' }}>🔍</p>
                  <p>類似トピックが見つかりませんでした。</p>
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>
                    トピックの埋め込みが生成されていない可能性があります。
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{
                    marginBottom: '20px',
                    fontSize: '14px',
                    color: '#64748B',
                  }}>
                    {similarTopics.length}件の類似トピックが見つかりました
                  </p>
                  {similarTopics.map((result, index) => {
                    // トピックを検索（monthContentsから）
                    let foundTopic: Topic | null = null;
                    let foundItemTitle = '';
                    
                    (Object.values(monthContents) as MonthContent[]).forEach((monthData) => {
                      if (monthData && typeof monthData === 'object' && 'items' in monthData) {
                        if (monthData.items) {
                          monthData.items.forEach((item) => {
                            const topic = item.topics?.find(t => t.id === result.topicId);
                            if (topic) {
                              foundTopic = topic;
                              foundItemTitle = item.title;
                            }
                          });
                        }
                      }
                    });
                    
                    return (
                      <div
                        key={result.topicId}
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '20px',
                          marginBottom: '16px',
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '12px',
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '12px',
                              color: '#64748B',
                              marginBottom: '4px',
                            }}>
                              {foundItemTitle || '議事録アイテム'}
                            </div>
                            <h4 style={{
                              margin: 0,
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#1E293B',
                            }}>
                              {(foundTopic as Topic | null)?.title || 'トピックが見つかりません'}
                            </h4>
                            {foundTopic && (foundTopic as Topic).summary && (
                              <p style={{
                                marginTop: '8px',
                                fontSize: '14px',
                                color: '#64748B',
                                fontStyle: 'italic',
                              }}>
                                {(foundTopic as Topic).summary}
                              </p>
                            )}
                          </div>
                          <div style={{
                            padding: '8px 12px',
                            background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            minWidth: '80px',
                            textAlign: 'center',
                          }}>
                            {Math.round(result.similarity * 100)}%
                          </div>
                        </div>
                        {foundTopic && (
                          <div style={{
                            fontSize: '12px',
                            color: '#64748B',
                            marginTop: '8px',
                          }}>
                            ID: {result.topicId}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* エンティティ追加・編集モーダル */}
      {showAddEntityModal && showTopicModal && editingTopicId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4000,
          }}
          onClick={() => {
            setShowAddEntityModal(false);
            setEditingEntity(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
              {editingEntity ? 'エンティティ編集' : 'エンティティ追加'}
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                名前 *
              </label>
              <input
                key={`entity-name-${editingEntity?.id || 'new'}`}
                type="text"
                id="entityNameInput"
                defaultValue={editingEntity?.name || ''}
                placeholder="エンティティ名を入力"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                タイプ *
              </label>
              <select
                key={`entity-type-${editingEntity?.id || 'new'}`}
                id="entityTypeSelect"
                defaultValue={editingEntity?.type || 'other'}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="person">👤 人</option>
                <option value="company">🏢 会社</option>
                <option value="product">📦 製品</option>
                <option value="project">📋 プロジェクト</option>
                <option value="organization">🏛️ 組織</option>
                <option value="location">📍 場所</option>
                <option value="technology">💻 技術</option>
                <option value="other">📌 その他</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => {
                  setShowAddEntityModal(false);
                  setEditingEntity(null);
                }}
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
                キャンセル
              </button>
              <button
                onClick={async () => {
                  const nameInput = document.getElementById('entityNameInput') as HTMLInputElement;
                  const typeSelect = document.getElementById('entityTypeSelect') as HTMLSelectElement;
                  const name = nameInput?.value.trim();
                  const type = typeSelect?.value as EntityType;
                  
                  if (!name) {
                    alert('名前を入力してください');
                    return;
                  }
                  
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
                {editingEntity ? '更新' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* リレーション追加・編集モーダル */}
      {showAddRelationModal && showTopicModal && editingTopicId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4000,
          }}
          onClick={() => {
            setShowAddRelationModal(false);
            setEditingRelation(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
              {editingRelation ? 'リレーション編集' : 'リレーション追加'}
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                起点エンティティ *
              </label>
              <select
                key={`relation-source-${editingRelation?.id || 'new'}`}
                id="relationSourceSelect"
                defaultValue={editingRelation?.sourceEntityId || ''}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="">選択してください</option>
                {((pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities).map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                リレーションタイプ *
              </label>
              <select
                key={`relation-type-${editingRelation?.id || 'new'}`}
                id="relationTypeSelect"
                defaultValue={editingRelation?.relationType || 'related-to'}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="subsidiary">子会社</option>
                <option value="uses">使用</option>
                <option value="invests">出資</option>
                <option value="employs">雇用</option>
                <option value="partners">提携</option>
                <option value="competes">競合</option>
                <option value="supplies">供給</option>
                <option value="owns">所有</option>
                <option value="located-in">所在</option>
                <option value="works-for">勤務</option>
                <option value="manages">管理</option>
                <option value="reports-to">報告</option>
                <option value="related-to">関連</option>
                <option value="other">その他</option>
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                終点エンティティ *
              </label>
              <select
                key={`relation-target-${editingRelation?.id || 'new'}`}
                id="relationTargetSelect"
                defaultValue={editingRelation?.targetEntityId || ''}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="">選択してください</option>
                {((pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities).map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                説明
              </label>
              <textarea
                key={`relation-description-${editingRelation?.id || 'new'}`}
                id="relationDescriptionInput"
                defaultValue={editingRelation?.description || ''}
                placeholder="リレーションの説明を入力"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minHeight: '80px',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => {
                  setShowAddRelationModal(false);
                  setEditingRelation(null);
                }}
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
                キャンセル
              </button>
              <button
                onClick={async () => {
                  const sourceSelect = document.getElementById('relationSourceSelect') as HTMLSelectElement;
                  const targetSelect = document.getElementById('relationTargetSelect') as HTMLSelectElement;
                  const typeSelect = document.getElementById('relationTypeSelect') as HTMLSelectElement;
                  const descriptionInput = document.getElementById('relationDescriptionInput') as HTMLTextAreaElement;
                  
                  const sourceEntityId = sourceSelect?.value;
                  const targetEntityId = targetSelect?.value;
                  const relationType = typeSelect?.value as RelationType;
                  const description = descriptionInput?.value.trim() || undefined;
                  
                  if (!sourceEntityId || !targetEntityId) {
                    alert('起点エンティティと終点エンティティを選択してください');
                    return;
                  }
                  
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
                {editingRelation ? '更新' : '追加'}
              </button>
            </div>
          </div>
        </div>
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
