'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import { zoom, zoomIdentity } from 'd3-zoom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TopicInfo } from '@/lib/orgApi';
import type { TopicSemanticCategory } from '@/types/topicMetadata';
import { generateTopicMetadata, extractEntities, extractRelations } from '@/lib/topicMetadataGeneration';
import { getMeetingNoteById, saveMeetingNote, getAllTopics } from '@/lib/orgApi';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';
import { getRelationsByTopicId, createRelation } from '@/lib/relationApi';
import { getEntityById, createEntity, getEntitiesByOrganizationId } from '@/lib/entityApi';
import { callTauriCommand } from '@/lib/localFirebase';
import { saveTopicEmbeddingAsync } from '@/lib/topicEmbeddings';
import type { Entity, EntityType } from '@/types/entity';
import type { Relation, RelationType } from '@/types/relation';
import KnowledgeGraph2D from './KnowledgeGraph2D';
import KnowledgeGraph3D from './KnowledgeGraph3D';
import { getOrgTreeFromDb, getAllOrganizationsFromTree, getOrgMembers } from '@/lib/orgApi';
import type { OrgNodeData } from '@/lib/orgApi';
import { useMemo } from 'react';

export interface RelationshipNode {
  id: string;
  label: string;
  type: 'theme' | 'organization' | 'initiative' | 'topic';
  data?: any;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface RelationshipLink {
  source: string | RelationshipNode;
  target: string | RelationshipNode;
  type?: 'main' | 'branch' | 'topic';
}

interface RelationshipDiagram2DProps {
  width?: number;
  height?: number;
  nodes: RelationshipNode[];
  links: RelationshipLink[];
  selectedThemeId?: string;
  onNodeClick?: (node: RelationshipNode) => void;
  onTopicMetadataSaved?: () => void; // メタデータ保存後のコールバック
  maxNodes?: number; // 最大ノード数（パフォーマンス最適化用）
}

// デザインシステム
const DESIGN = {
  colors: {
    theme: {
      fill: '#1A1A1A',
      stroke: '#000000',
      text: '#FFFFFF',
      hover: '#2D2D2D',
    },
    organization: {
      fill: '#10B981',
      stroke: '#059669',
      text: '#FFFFFF',
      hover: '#34D399',
    },
    initiative: {
      fill: '#4262FF',
      stroke: '#2E4ED8',
      text: '#FFFFFF',
      hover: '#5C7AFF',
    },
    topic: {
      fill: '#F59E0B',
      stroke: '#D97706',
      text: '#FFFFFF',
      hover: '#FBBF24',
    },
    connection: {
      main: '#666666',      // より濃いグレー（#C4C4C4 → #666666）
      branch: '#888888',    // より濃いグレー（#E0E0E0 → #888888）
      hover: '#333333',     // ホバー時はさらに濃く（#808080 → #333333）
    },
    background: {
      base: '#FFFFFF',
    },
  },
  typography: {
    theme: {
      fontSize: '16px',
      fontWeight: '600',
    },
    organization: {
      fontSize: '14px',
      fontWeight: '600',
    },
    initiative: {
      fontSize: '14px',
      fontWeight: '500',
    },
    topic: {
      fontSize: '12px',
      fontWeight: '500',
    },
  },
  spacing: {
    nodePadding: {
      theme: { x: 20, y: 10 },
      organization: { x: 16, y: 8 },
      initiative: { x: 16, y: 8 },
    topic: { x: 12, y: 6 },
    },
    radius: {
      theme: 6,
      organization: 6,
      initiative: 6,
    topic: 4,
    },
  },
  stroke: {
    main: 2,
    branch: 1.5,
    node: 1.5,
  },
  animation: {
    duration: 150,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// テキストを折り返す関数
const wrapText = (text: string, maxWidth: number, fontSize: number, nodeType?: 'theme' | 'organization' | 'initiative' | 'topic'): string[] => {
  // ノードタイプごとの最大文字数設定
  const maxCharsByType: Record<string, number> = {
    'theme': 10,        // テーマノード: 10文字
    'organization': 8,  // 組織ノード: 8文字
    'initiative': 8,    // 注力施策ノード: 8文字
  };
  
  // 文字幅ベースの最大文字数
  const charWidth = fontSize * 0.6; // 日本語文字の幅（フォントサイズの60%）
  const maxCharsByWidth = Math.floor((maxWidth * 0.85) / charWidth); // 85%の幅を使用（余白を確保）
  
  // ノードタイプに基づく最大文字数と幅ベースの最大文字数の小さい方を採用
  const maxCharsPerLine = nodeType && maxCharsByType[nodeType] 
    ? Math.min(maxCharsByType[nodeType], maxCharsByWidth)
    : maxCharsByWidth;
  
  if (text.length <= maxCharsPerLine) {
    return [text];
  }
  
  const lines: string[] = [];
  let currentLine = '';
  
  // 文字列を文字単位で処理
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const testLine = currentLine + char;
    
    // 現在の行の文字数が最大文字数を超える場合
    if (testLine.length > maxCharsPerLine) {
      // 適切な分割点を探す（スペース、句読点、特定の文字の前）
      let splitPoint = currentLine.length;
      const searchStart = Math.max(0, currentLine.length - 8); // 検索範囲を広げる
      
      // 優先順位1: 句読点、スペース
      for (let j = currentLine.length - 1; j >= searchStart; j--) {
        const c = currentLine[j];
        if (c === ' ' || c === '、' || c === '。' || c === '・' || c === '，' || c === '．') {
          splitPoint = j + 1;
          break;
        }
      }
      
      // 優先順位2: 組織関連の文字（分割点が見つかっていない場合）
      if (splitPoint === currentLine.length) {
        for (let j = currentLine.length - 1; j >= searchStart; j--) {
          const c = currentLine[j];
          if (c === '部' || c === '課' || c === '社' || c === '室' || c === 'グループ' || c === 'チーム') {
            splitPoint = j + 1;
            break;
          }
          // 2文字のキーワードをチェック
          if (j < currentLine.length - 1) {
            const twoChar = currentLine.substring(j, j + 2);
            if (twoChar === 'ビジネス' || twoChar === '協業' || twoChar === '部門' || twoChar === '事業') {
              splitPoint = j + 2;
              break;
            }
          }
        }
      }
      
      // 優先順位3: その他の分割候補（分割点が見つかっていない場合）
      if (splitPoint === currentLine.length) {
        for (let j = currentLine.length - 1; j >= searchStart; j--) {
          const c = currentLine[j];
          if (c === 'の' || c === 'と' || c === 'や' || c === '・') {
            splitPoint = j + 1;
            break;
          }
        }
      }
      
      // 分割点が見つかった場合
      if (splitPoint > 0 && splitPoint < currentLine.length) {
        lines.push(currentLine.substring(0, splitPoint));
        currentLine = currentLine.substring(splitPoint) + char;
      } else {
        // 分割点が見つからない場合、強制的に分割（最大文字数で）
        lines.push(currentLine);
        currentLine = char;
      }
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [text];
};

// ノードタイプ別のサイズ設定（シミュレーション用は固定、メリハリをつける）
const getNodeRadius = (node: RelationshipNode): number => {
  // 親ノード（情報・通信部門）は最大サイズ
  if (node.data?.isParent) return Math.max(node.label.length * 5, 100); // 親：100px
  if (node.type === 'theme') return Math.max(node.label.length * 3.5, 60); // 大：60px（75px→60px）
  if (node.type === 'organization') return Math.max(node.label.length * 3, 45); // 中：45px
  if (node.type === 'initiative') return 28; // 注力施策は固定サイズ：28px
  if (node.type === 'topic') return 20; // 個別トピックは固定サイズ：20px
  return 40;
};

// ノードタイプ別の衝突半径（固定、ホバー時も変わらない）
const getCollisionRadius = (node: RelationshipNode): number => {
  // 親ノード（情報・通信部門）は最大サイズ
  if (node.data?.isParent) return 105; // 親：105px
  if (node.type === 'theme') return 65; // 大：65px（80px→65px）
  if (node.type === 'organization') return 50; // 中：50px
  if (node.type === 'initiative') return 30; // 小：30px
  if (node.type === 'topic') return 24; // 最小：24px
  return 40;
};

export default function RelationshipDiagram2D({
  width = 1200,
  height = 800,
  nodes,
  links,
  selectedThemeId,
  onNodeClick,
  onTopicMetadataSaved,
  maxNodes = 1000, // 最大ノード数（パフォーマンス最適化用）
}: RelationshipDiagram2DProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<ReturnType<typeof forceSimulation> | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);
  const zoomRef = useRef<ReturnType<typeof zoom> | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicInfo | null>(null);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [pendingMetadata, setPendingMetadata] = useState<{
    semanticCategory?: TopicSemanticCategory;
    importance?: TopicInfo['importance'];
    keywords?: string[];
    summary?: string;
  } | null>(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [isEditingTopicDate, setIsEditingTopicDate] = useState(false);
  const [editingTopicDate, setEditingTopicDate] = useState<string>('');
  const [editingTopicTime, setEditingTopicTime] = useState<string>('');
  const [isAllPeriods, setIsAllPeriods] = useState(false);
  const [isSavingTopicDate, setIsSavingTopicDate] = useState(false);
  const [topicEntities, setTopicEntities] = useState<Entity[]>([]);
  const [topicRelations, setTopicRelations] = useState<Relation[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [pendingEntities, setPendingEntities] = useState<Entity[] | null>(null);
  const [showTopics, setShowTopics] = useState(false); // 個別トピックの表示/非表示（デフォルト: 非表示）
  const [pendingRelations, setPendingRelations] = useState<Relation[] | null>(null);
  const [showAddEntityModal, setShowAddEntityModal] = useState(false);
  const [showAddRelationModal, setShowAddRelationModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [editingRelation, setEditingRelation] = useState<Relation | null>(null);
  const [knowledgeGraphViewMode, setKnowledgeGraphViewMode] = useState<'list' | 'graph2d' | 'graph3d'>('list');
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | 'all'>('all');
  const [relationSearchQuery, setRelationSearchQuery] = useState('');
  const [relationTypeFilter, setRelationTypeFilter] = useState<RelationType | 'all'>('all');
  const [showMergeEntityModal, setShowMergeEntityModal] = useState(false);
  const [mergeSourceEntity, setMergeSourceEntity] = useState<Entity | null>(null);
  const [showPathSearchModal, setShowPathSearchModal] = useState(false);
  const [pathSearchSource, setPathSearchSource] = useState<Entity | null>(null);
  const [pathSearchTarget, setPathSearchTarget] = useState<Entity | null>(null);
  const [foundPaths, setFoundPaths] = useState<Array<{ path: Entity[]; relations: Relation[] }>>([]);
  const [isSearchingPath, setIsSearchingPath] = useState(false);
  const [entityRelatedRelations, setEntityRelatedRelations] = useState<Relation[]>([]);
  const [isLoadingEntityRelations, setIsLoadingEntityRelations] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
  const [selectedRelationIds, setSelectedRelationIds] = useState<Set<string>>(new Set());
  const [bulkOperationMode, setBulkOperationMode] = useState<'none' | 'entities' | 'relations'>('none');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [modelType, setModelType] = useState<'gpt' | 'local'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('topicMetadataGenerationModelType');
      return (saved as 'gpt' | 'local') || 'gpt';
    }
    return 'gpt';
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('topicMetadataGenerationModel');
      return saved || 'gpt-4o-mini';
    }
    return 'gpt-4o-mini';
  });
  const [localModels, setLocalModels] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingLocalModels, setLoadingLocalModels] = useState(false);
  const [metadataMode, setMetadataMode] = useState<'overwrite' | 'merge'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('topicMetadataGenerationMode');
      return (saved as 'overwrite' | 'merge') || 'overwrite';
    }
    return 'overwrite';
  });

  // フィルター用のstate
  const [orgTree, setOrgTree] = useState<OrgNodeData | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; title?: string }>>([]);
  const [members, setMembers] = useState<Array<{ id: string; name: string; position?: string; organizationId: string }>>([]);
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<Set<string>>(new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [selectedImportance, setSelectedImportance] = useState<Set<'high' | 'medium' | 'low'>>(new Set());
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [showOrganizationFilter, setShowOrganizationFilter] = useState(false);
  const [showMemberFilter, setShowMemberFilter] = useState(false);
  const [showImportanceFilter, setShowImportanceFilter] = useState(false);

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

  // 現在選択されているモデルリスト
  const availableModels = modelType === 'gpt' ? gptModels : localModels;

  // ローカルモデル一覧を取得
  const loadLocalModels = async () => {
    setLoadingLocalModels(true);
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
        setLocalModels(formattedModels);
        // 最初のモデルを選択
        if (formattedModels.length > 0 && !selectedModel.startsWith('gpt')) {
          setSelectedModel(formattedModels[0].value);
        }
      } else {
        setLocalModels([]);
      }
    } catch (error) {
      console.error('ローカルモデルの取得エラー:', error);
      setLocalModels([]);
    } finally {
      setLoadingLocalModels(false);
    }
  };

  // モデルタイプが変更されたら、ローカルモデルを取得
  useEffect(() => {
    if (modelType === 'local') {
      loadLocalModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelType]);

  // 組織リストと担当者リストを取得
  useEffect(() => {
    const loadFilterData = async () => {
      setIsLoadingFilters(true);
      try {
        // 組織ツリーを取得
        const tree = await getOrgTreeFromDb();
        setOrgTree(tree);
        
        if (tree) {
          // 組織リストを取得
          const orgList = getAllOrganizationsFromTree(tree);
          setOrganizations(orgList);
          
          // 各組織のメンバーを取得
          const allMembers: Array<{ id: string; name: string; position?: string; organizationId: string }> = [];
          for (const org of orgList) {
            try {
              const orgMembers = await getOrgMembers(org.id);
              const memberList = orgMembers.map((member: any) => ({
                id: member.id,
                name: member.name,
                position: member.position || undefined,
                organizationId: org.id,
              }));
              allMembers.push(...memberList);
            } catch (err) {
              console.warn(`⚠️ 組織 ${org.id} のメンバー取得に失敗:`, err);
            }
          }
          
          // 重複を除去（同じ名前のメンバーが複数の組織に所属している場合）
          const uniqueMembers = new Map<string, { id: string; name: string; position?: string; organizationId: string }>();
          allMembers.forEach(member => {
            if (!uniqueMembers.has(member.name) || !uniqueMembers.get(member.name)?.position) {
              uniqueMembers.set(member.name, member);
            }
          });
          
          setMembers(Array.from(uniqueMembers.values()));
        }
      } catch (error) {
        console.error('❌ フィルターデータの取得エラー:', error);
      } finally {
        setIsLoadingFilters(false);
      }
    };
    
    loadFilterData();
  }, []);

  // トピックが選択されたら、エンティティとリレーションを取得
  useEffect(() => {
    if (!selectedTopic) {
      setTopicEntities([]);
      setTopicRelations([]);
      return;
    }

    const loadTopicKnowledgeGraph = async () => {
      setIsLoadingRelations(true);
      setIsLoadingEntities(true);
      try {
        // topicsのidを取得
        const topicEmbeddingId = `${selectedTopic.meetingNoteId}-topic-${selectedTopic.id}`;
        
        console.log('📊 ナレッジグラフデータ取得開始:', { topicEmbeddingId, topicId: selectedTopic.id });
        
        // リレーションを取得（topicsのidを使用）
        console.log('📊 リレーション取得開始（トピック内）:', {
          topicEmbeddingId,
          topicId: selectedTopic.id,
          meetingNoteId: selectedTopic.meetingNoteId,
        });
        const relations = await getRelationsByTopicId(topicEmbeddingId);
        console.log('📊 取得したリレーション（トピック内）:', {
          count: relations.length,
          topicEmbeddingId,
          relations: relations.map(r => ({
            id: r.id,
            topicId: r.topicId,
            sourceEntityId: r.sourceEntityId,
            targetEntityId: r.targetEntityId,
            relationType: r.relationType,
          })),
        });
        setTopicRelations(relations);

        // エンティティを直接トピックIDでフィルタリングして取得（リレーションから抽出したIDだけでなく）
        // これにより、トピックに属するエンティティのみが表示される
        console.log('📊 エンティティ取得開始（トピックIDでフィルタリング）:', {
          organizationId: selectedTopic.organizationId,
          topicId: selectedTopic.id,
        });
        const allEntities = await getEntitiesByOrganizationId(selectedTopic.organizationId);
        const topicEntities = allEntities.filter(e => {
          if (!e.metadata || typeof e.metadata !== 'object') return false;
          return 'topicId' in e.metadata && e.metadata.topicId === selectedTopic.id;
        });
        console.log('📊 取得したエンティティ（トピック内）:', {
          totalInOrg: allEntities.length,
          inTopic: topicEntities.length,
          topicId: selectedTopic.id,
          entities: topicEntities.map(e => ({ id: e.id, name: e.name, topicId: e.metadata && typeof e.metadata === 'object' && 'topicId' in e.metadata ? e.metadata.topicId : 'なし' })),
        });
        
        // リレーションからエンティティIDを抽出（検証用）
        const relationEntityIds = new Set<string>();
        relations.forEach(relation => {
          if (relation.sourceEntityId) relationEntityIds.add(relation.sourceEntityId);
          if (relation.targetEntityId) relationEntityIds.add(relation.targetEntityId);
        });
        console.log('📊 リレーションから抽出したエンティティID:', Array.from(relationEntityIds));
        
        // リレーションに含まれるエンティティIDが、トピック内のエンティティに含まれているか確認
        const topicEntityIds = new Set(topicEntities.map(e => e.id));
        const missingEntityIds = Array.from(relationEntityIds).filter(id => !topicEntityIds.has(id));
        if (missingEntityIds.length > 0) {
          console.warn('⚠️ リレーションに含まれるエンティティIDが、トピック内のエンティティに見つかりません:', {
            missingIds: missingEntityIds,
            topicId: selectedTopic.id,
            topicEmbeddingId,
          });
        }
        
        setTopicEntities(topicEntities);
      } catch (error) {
        console.error('❌ ナレッジグラフデータ取得エラー:', error);
        setTopicRelations([]);
        setTopicEntities([]);
      } finally {
        setIsLoadingRelations(false);
        setIsLoadingEntities(false);
      }
    };

    loadTopicKnowledgeGraph();
  }, [selectedTopic]);

  // 日付が期間内かチェックするヘルパー関数
  const isDateInRange = (dateStr: string | null | undefined, startDate: string, endDate: string): boolean => {
    // topicDateがnullまたはundefinedの場合は全期間に反映（常にtrue）
    if (dateStr === null || dateStr === undefined || dateStr === '') {
      return true;
    }
    
    // 期間フィルターが設定されていない場合は全期間に反映
    if (!startDate && !endDate) {
      return true;
    }
    
    try {
      const topicDate = new Date(dateStr);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      // 開始日のみ設定されている場合
      if (start && !end) {
        return topicDate >= start;
      }
      
      // 終了日のみ設定されている場合
      if (!start && end) {
        return topicDate <= end;
      }
      
      // 両方設定されている場合
      if (start && end) {
        return topicDate >= start && topicDate <= end;
      }
      
      return true;
    } catch (error) {
      console.warn('日付のパースエラー:', dateStr, error);
      return true; // エラー時は表示
    }
  };

  // ノード数制限の警告表示用
  const nodeCount = nodes.length;
  const shouldLimitNodes = maxNodes > 0 && nodeCount > maxNodes;
  
  // インデックス化（パフォーマンス最適化）
  const nodeIndexes = useMemo(() => {
    const indexes = {
      byId: new Map<string, RelationshipNode>(),
      byOrganizationId: new Map<string, RelationshipNode[]>(),
      byType: new Map<string, RelationshipNode[]>(),
      parentAndTheme: [] as RelationshipNode[],
    };
    
    nodes.forEach(node => {
      indexes.byId.set(node.id, node);
      
      // 組織IDでインデックス化
      if (node.data?.organizationId) {
        const orgId = node.data.organizationId;
        if (!indexes.byOrganizationId.has(orgId)) {
          indexes.byOrganizationId.set(orgId, []);
        }
        indexes.byOrganizationId.get(orgId)!.push(node);
      }
      
      // タイプでインデックス化
      if (!indexes.byType.has(node.type)) {
        indexes.byType.set(node.type, []);
      }
      indexes.byType.get(node.type)!.push(node);
      
      // 親ノードとテーマノードを別途保持
      if (node.data?.isParent || node.type === 'theme') {
        indexes.parentAndTheme.push(node);
      }
    });
    
    return indexes;
  }, [nodes]);
  
  // リンクのインデックス化
  const linkIndexes = useMemo(() => {
    const indexes = {
      bySourceId: new Map<string, RelationshipLink[]>(),
      byTargetId: new Map<string, RelationshipLink[]>(),
    };
    
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      if (!indexes.bySourceId.has(sourceId)) {
        indexes.bySourceId.set(sourceId, []);
      }
      indexes.bySourceId.get(sourceId)!.push(link);
      
      if (!indexes.byTargetId.has(targetId)) {
        indexes.byTargetId.set(targetId, []);
      }
      indexes.byTargetId.get(targetId)!.push(link);
    });
    
    return indexes;
  }, [links]);
  
  // フィルターに基づいてノードとリンクをフィルタリング
  const filteredNodes = useMemo(() => {
    const hasOrganizationFilter = selectedOrganizationIds.size > 0;
    const hasMemberFilter = selectedMemberIds.size > 0;
    const hasDateFilter = dateRangeStart || dateRangeEnd;
    const hasImportanceFilter = selectedImportance.size > 0;
    
    // 個別トピックの表示/非表示フィルターが唯一のフィルターの場合
    if (!hasOrganizationFilter && !hasMemberFilter && !hasDateFilter && !hasImportanceFilter) {
      if (!showTopics) {
        // 個別トピックを非表示にする
        return nodes.filter(node => node.type !== 'topic');
      }
      return nodes;
    }
    
    let filtered: RelationshipNode[] = [];
    const visibleNodeIds = new Set<string>();
    
    // 親ノード（情報・通信部門）とテーマノードは常に表示（インデックスから取得）
    nodeIndexes.parentAndTheme.forEach(node => {
      filtered.push(node);
      visibleNodeIds.add(node.id);
    });
    
    // 組織フィルター（複数選択対応、インデックスを使用）
    if (selectedOrganizationIds.size > 0) {
      selectedOrganizationIds.forEach(orgId => {
        // 組織ノード自体を追加
        const orgNode = nodeIndexes.byId.get(orgId);
        if (orgNode && orgNode.type === 'organization' && !visibleNodeIds.has(orgNode.id)) {
          filtered.push(orgNode);
          visibleNodeIds.add(orgNode.id);
        }
        
        // 組織に関連するノードを追加（インデックスから取得）
        const orgRelatedNodes = nodeIndexes.byOrganizationId.get(orgId) || [];
        orgRelatedNodes.forEach(node => {
          if (!visibleNodeIds.has(node.id)) {
            filtered.push(node);
            visibleNodeIds.add(node.id);
          }
        });
      });
    } else {
      // 組織フィルターがない場合はすべてのノードを追加（親ノードとテーマノードは既に追加済み）
      nodes.forEach(node => {
        if (!visibleNodeIds.has(node.id)) {
          filtered.push(node);
          visibleNodeIds.add(node.id);
        }
      });
    }
    
    // 担当者フィルター（複数選択対応）
    if (selectedMemberIds.size > 0) {
      const selectedMembers = members.filter(m => selectedMemberIds.has(m.id));
      if (selectedMembers.length > 0) {
        // 選択された担当者に関連するノードを抽出（親ノードとテーマノードは除外）
        const memberFiltered = filtered.filter(node => {
          // 親ノードとテーマノードは常に表示
          if (node.data?.isParent || node.type === 'theme') {
            return true;
          }
          
          // 選択された担当者のいずれかと一致するノードを表示
          const nodeLabel = node.label.toLowerCase();
          return selectedMembers.some(member => {
            const memberName = member.name.toLowerCase();
            return nodeLabel.includes(memberName) || nodeLabel === memberName;
          });
        });
        
        // フィルタリングされたノードに関連するノードも表示
        const relatedNodeIds = new Set<string>();
        memberFiltered.forEach(node => {
          relatedNodeIds.add(node.id);
        });
        
        // リンクを通じて関連するノードを追加
        links.forEach(link => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
          
          if (relatedNodeIds.has(sourceId)) {
            relatedNodeIds.add(targetId);
          }
          if (relatedNodeIds.has(targetId)) {
            relatedNodeIds.add(sourceId);
          }
        });
        
        // 親ノードとテーマノードを確実に含める
        nodes.forEach(node => {
          if ((node.data?.isParent || node.type === 'theme') && !relatedNodeIds.has(node.id)) {
            relatedNodeIds.add(node.id);
          }
        });
        
        return filtered.filter(node => relatedNodeIds.has(node.id));
      }
    }
    
    // 期間フィルター
    if (hasDateFilter) {
      const dateFiltered = filtered.filter(node => {
        // 親ノードとテーマノードは常に表示
        if (node.data?.isParent || node.type === 'theme') {
          return true;
        }
        
        // トピックノードの場合、isAllPeriodsとtopicDateをチェック
        if (node.type === 'topic') {
          // isAllPeriodsがtrueの場合は常に表示（全期間に反映）
          if (node.data?.isAllPeriods === true) {
            return true;
          }
          // isAllPeriodsがfalseまたは未設定の場合はtopicDateでフィルタリング
          if (node.data?.topicDate !== undefined) {
            return isDateInRange(node.data.topicDate, dateRangeStart, dateRangeEnd);
          }
        }
        
        // その他のノードは表示
        return true;
      });
      
      // 期間フィルターで除外されたノードに関連するノードも除外
      const dateFilteredNodeIds = new Set(dateFiltered.map(n => n.id));
      
      // リンクを通じて関連するノードを追加（インデックスを使用）
      dateFilteredNodeIds.forEach(nodeId => {
        const sourceLinks = linkIndexes.bySourceId.get(nodeId) || [];
        sourceLinks.forEach(link => {
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
          if (!dateFilteredNodeIds.has(targetId)) {
            const targetNode = nodeIndexes.byId.get(targetId);
            if (targetNode && (targetNode.data?.isParent || targetNode.type === 'theme')) {
              dateFiltered.push(targetNode);
              dateFilteredNodeIds.add(targetId);
            }
          }
        });
        
        const targetLinks = linkIndexes.byTargetId.get(nodeId) || [];
        targetLinks.forEach(link => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          if (!dateFilteredNodeIds.has(sourceId)) {
            const sourceNode = nodeIndexes.byId.get(sourceId);
            if (sourceNode && (sourceNode.data?.isParent || sourceNode.type === 'theme')) {
              dateFiltered.push(sourceNode);
              dateFilteredNodeIds.add(sourceId);
            }
          }
        });
      });
      
      filtered = dateFiltered;
    }
    
    // 重要度フィルター
    if (hasImportanceFilter) {
      const importanceFiltered = filtered.filter(node => {
        // 親ノードとテーマノードは常に表示
        if (node.data?.isParent || node.type === 'theme') {
          return true;
        }
        
        // トピックノードの場合、重要度をチェック
        if (node.type === 'topic' && node.data?.importance) {
          return selectedImportance.has(node.data.importance);
        }
        
        // その他のノードは表示
        return true;
      });
      
      // 重要度フィルターで除外されたノードに関連するノードも除外
      const importanceFilteredNodeIds = new Set(importanceFiltered.map(n => n.id));
      
      // リンクを通じて関連するノードを追加（インデックスを使用）
      importanceFilteredNodeIds.forEach(nodeId => {
        const sourceLinks = linkIndexes.bySourceId.get(nodeId) || [];
        sourceLinks.forEach(link => {
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
          if (!importanceFilteredNodeIds.has(targetId)) {
            const targetNode = nodeIndexes.byId.get(targetId);
            if (targetNode && (targetNode.data?.isParent || targetNode.type === 'theme')) {
              importanceFiltered.push(targetNode);
              importanceFilteredNodeIds.add(targetId);
            }
          }
        });
        
        const targetLinks = linkIndexes.byTargetId.get(nodeId) || [];
        targetLinks.forEach(link => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          if (!importanceFilteredNodeIds.has(sourceId)) {
            const sourceNode = nodeIndexes.byId.get(sourceId);
            if (sourceNode && (sourceNode.data?.isParent || sourceNode.type === 'theme')) {
              importanceFiltered.push(sourceNode);
              importanceFilteredNodeIds.add(sourceId);
            }
          }
        });
      });
      
      filtered = importanceFiltered;
    }
    
    // フィルタリングされたノードに関連するリンクも含めるために、関連ノードを追加（インデックスを使用）
    // ただし、個別トピックが非表示の場合はtopicタイプのノードは追加しない
    const finalNodeIds = new Set(filtered.map(n => n.id));
    finalNodeIds.forEach(nodeId => {
      const sourceLinks = linkIndexes.bySourceId.get(nodeId) || [];
      sourceLinks.forEach(link => {
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        if (!finalNodeIds.has(targetId)) {
          const targetNode = nodeIndexes.byId.get(targetId);
          if (targetNode) {
            // 個別トピックが非表示の場合はtopicタイプのノードを追加しない
            if (showTopics || targetNode.type !== 'topic') {
              filtered.push(targetNode);
              finalNodeIds.add(targetId);
            }
          }
        }
      });
      
      const targetLinks = linkIndexes.byTargetId.get(nodeId) || [];
      targetLinks.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        if (!finalNodeIds.has(sourceId)) {
          const sourceNode = nodeIndexes.byId.get(sourceId);
          if (sourceNode) {
            // 個別トピックが非表示の場合はtopicタイプのノードを追加しない
            if (showTopics || sourceNode.type !== 'topic') {
              filtered.push(sourceNode);
              finalNodeIds.add(sourceId);
            }
          }
        }
      });
    });
    
    // 個別トピックの表示/非表示フィルター（最終的なフィルタリング）
    if (!showTopics) {
      filtered = filtered.filter(node => node.type !== 'topic');
    }
    
    // ノード数制限（パフォーマンス最適化）
    // 親ノードとテーマノードは常に含める
    const parentAndThemeNodes = filtered.filter(n => n.data?.isParent || n.type === 'theme');
    const otherNodes = filtered.filter(n => !n.data?.isParent && n.type !== 'theme');
    
    if (maxNodes > 0 && filtered.length > maxNodes) {
      // 親ノードとテーマノード + 制限内の他のノード
      const limitedOtherNodes = otherNodes.slice(0, maxNodes - parentAndThemeNodes.length);
      return [...parentAndThemeNodes, ...limitedOtherNodes];
    }
    
    return filtered;
  }, [nodes, links, selectedOrganizationIds, selectedMemberIds, members, dateRangeStart, dateRangeEnd, selectedImportance, maxNodes, nodeIndexes, linkIndexes, showTopics]);

  const filteredLinks = useMemo(() => {
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    
    // 親ノードとテーマノードのIDも確実に含める
    nodes.forEach(node => {
      if (node.data?.isParent || node.type === 'theme') {
        filteredNodeIds.add(node.id);
      }
    });
    
    // 個別トピックが非表示の場合は、topicタイプのリンクも除外
    let filtered = links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      // 両方のノードが表示されている場合のみリンクを表示
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });
    
    // 個別トピックが非表示の場合は、topicタイプのリンクを除外
    if (!showTopics) {
      filtered = filtered.filter(link => link.type !== 'topic');
    }
    
    return filtered;
  }, [links, filteredNodes, nodes, selectedOrganizationIds, selectedMemberIds, showTopics]);

  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0) return;

    // 既存のシミュレーションがあれば停止
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    // マージン設定
    const margin = { top: 60, right: 60, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // ズーム可能なコンテナグループを作成
    const zoomContainer = svg
      .append('g')
      .attr('class', 'zoom-container');

    // メイングループを作成
    const g = zoomContainer
      .append('g')
      .attr('class', 'main-group')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // SVG定義（シャドウフィルター）
    const defs = svg.append('defs');
    const shadowFilter = defs
      .append('filter')
      .attr('id', 'diagramShadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    shadowFilter
      .append('feGaussianBlur')
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', '1.5')
      .attr('result', 'blur');
    shadowFilter
      .append('feOffset')
      .attr('in', 'blur')
      .attr('dx', '0')
      .attr('dy', '1')
      .attr('result', 'offsetBlur');
    const feMerge = shadowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'offsetBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // ノードとリンクのコピーを作成（シミュレーション用）
    // 階層構造に基づいた初期配置
    const centerX = innerWidth / 2;
    const centerY = innerHeight / 2;
    
    // ノードを階層ごとに分類
    const parentNodes = filteredNodes.filter(n => n.data?.isParent);
    const themeNodes = filteredNodes.filter(n => n.type === 'theme');
    const organizationNodes = filteredNodes.filter(n => n.type === 'organization');
    const initiativeNodes = filteredNodes.filter(n => n.type === 'initiative');
    const topicNodes = filteredNodes.filter(n => n.type === 'topic');
    
    // 階層ごとの半径設定
    const parentRadius = 0; // 親ノードは中心
    const themeRadius = 180; // テーマノードの半径
    const organizationRadius = 320; // 組織ノードの半径
    const initiativeRadius = 450; // 注力施策ノードの半径
    
    const simulationNodes: RelationshipNode[] = filteredNodes.map((node) => {
      // 既存の位置を保持（ドラッグで移動した位置を維持）
      let x: number;
      let y: number;
      
      if (node.x !== undefined && node.y !== undefined) {
        x = node.x;
        y = node.y;
      } else {
      // 階層に基づいた初期配置
        x = centerX;
        y = centerY;
      
      if (node.data?.isParent) {
        // 親ノードは中心に配置
        x = centerX;
        y = centerY;
      } else if (node.type === 'theme') {
        // テーマノードを円形に配置
        const index = themeNodes.findIndex(n => n.id === node.id);
        const angle = (index / themeNodes.length) * 2 * Math.PI - Math.PI / 2; // 上から開始
        x = centerX + themeRadius * Math.cos(angle);
        y = centerY + themeRadius * Math.sin(angle);
      } else if (node.type === 'organization') {
        // 組織ノードを円形に配置
        const index = organizationNodes.findIndex(n => n.id === node.id);
        const angle = (index / organizationNodes.length) * 2 * Math.PI - Math.PI / 2;
        x = centerX + organizationRadius * Math.cos(angle);
        y = centerY + organizationRadius * Math.sin(angle);
      } else if (node.type === 'initiative') {
        // 注力施策ノードを円形に配置
        const index = initiativeNodes.findIndex(n => n.id === node.id);
        const angle = (index / initiativeNodes.length) * 2 * Math.PI - Math.PI / 2;
        x = centerX + initiativeRadius * Math.cos(angle);
        y = centerY + initiativeRadius * Math.sin(angle);
        } else if (node.type === 'topic') {
          // トピックノードは注力施策ノードの近くに配置（後でforce simulationで調整）
          const index = topicNodes.findIndex(n => n.id === node.id);
          const angle = (index / Math.max(topicNodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
          x = centerX + (initiativeRadius + 50) * Math.cos(angle);
          y = centerY + (initiativeRadius + 50) * Math.sin(angle);
        }
      }
      
      // 新しいオブジェクトを作成し、D3.jsのプロパティを変更可能にする
      const simNode: RelationshipNode = {
        id: node.id,
        label: node.label,
        type: node.type,
        data: node.data,
        x: x,
        y: y,
        fx: node.data?.isParent ? centerX : undefined,
        fy: node.data?.isParent ? centerY : undefined,
      };
      
      return simNode;
    });
    
    // 親ノードを固定位置に設定（シミュレーション開始時に固定を解除）
    setTimeout(() => {
      parentNodes.forEach(parentNode => {
        const simNode = simulationNodes.find(n => n.id === parentNode.id);
        if (simNode) {
          simNode.fx = null;
          simNode.fy = null;
        }
      });
    }, 1000); // 1秒後に固定を解除して自然な配置に

    // リンクをシミュレーション用に変換（forceLinkがノードオブジェクトに変換する）
    interface SimulationLink {
      source: RelationshipNode;
      target: RelationshipNode;
      type: 'main' | 'branch' | 'topic';
    }
    
    const simulationLinks: SimulationLink[] = filteredLinks
      .map((link) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      const sourceNode = simulationNodes.find(n => n.id === sourceId);
      const targetNode = simulationNodes.find(n => n.id === targetId);
      if (!sourceNode || !targetNode) {
          console.warn(`⚠️ [RelationshipDiagram2D] リンクが存在しないノードを参照しています: ${sourceId} -> ${targetId}`, {
            sourceExists: !!sourceNode,
            targetExists: !!targetNode,
            sourceId,
            targetId,
            linkType: link.type,
            allNodeIds: simulationNodes.map(n => n.id).slice(0, 10),
          });
          return null; // 無効なリンクはnullを返す
      }
      return {
        source: sourceNode,
        target: targetNode,
          type: (link.type || 'main') as 'main' | 'branch' | 'topic',
      };
      })
      .filter((link): link is SimulationLink => link !== null); // nullを除外

    // フォースシミュレーションを作成（パフォーマンス最適化）
    // ノード数に応じてパラメータを調整
    const nodeCount = simulationNodes.length;
    const linkCount = simulationLinks.length;
    
    // ノード数が多い場合は、シミュレーションのパラメータを調整
    const baseChargeStrength = -200;
    const chargeStrengthMultiplier = nodeCount > 500 ? 0.7 : (nodeCount > 200 ? 0.85 : 1.0);
    const linkDistanceMultiplier = nodeCount > 500 ? 0.9 : 1.0;
    const alphaDecayValue = nodeCount > 500 ? 0.08 : (nodeCount > 200 ? 0.06 : 0.05);
    const maxIterations = nodeCount > 500 ? 150 : (nodeCount > 200 ? 200 : 300);
    
    const simulation = forceSimulation<RelationshipNode>(simulationNodes)
      .force('link', forceLink<RelationshipNode, SimulationLink>(simulationLinks)
        .id((d) => d.id)
        .distance((link) => {
          // リンクタイプ別の距離設定（ノードサイズに応じて調整）
          let baseDistance = 150;
          if (link.type === 'main') baseDistance = 200; // テーマ-組織間（大-中）
          else if (link.type === 'branch') baseDistance = 120; // 組織-注力施策間（中-小）
          else if (link.type === 'topic') baseDistance = 80; // 注力施策-個別トピック間（小-最小）
          return baseDistance * linkDistanceMultiplier;
        })
        .strength(0.8) // リンクの強度を上げて階層構造を維持
      )
      .force('charge', forceManyBody().strength((d: any) => {
        // ノードタイプ別の反発力（サイズに応じて調整）
        let baseStrength = -200;
        if (d.data?.isParent) baseStrength = -1000; // 親：非常に強い反発力
        else if (d.type === 'theme') baseStrength = -600; // 大：強い反発力
        else if (d.type === 'organization') baseStrength = -400; // 中：中程度の反発力
        else if (d.type === 'initiative') baseStrength = -250; // 小：弱い反発力
        else if (d.type === 'topic') baseStrength = -150; // 最小：弱い反発力
        return baseStrength * chargeStrengthMultiplier;
      }))
      .force('center', forceCenter(innerWidth / 2, innerHeight / 2).strength(0.1)) // 中心への引力を弱める
      .force('collision', forceCollide<RelationshipNode>().radius((d) => getCollisionRadius(d)))
      .alphaDecay(alphaDecayValue) // シミュレーションの減衰を調整（ノード数が多い場合は早く収束）
      .velocityDecay(0.6); // 速度の減衰を調整

    simulationRef.current = simulation as any;
    
    // ノード数が多い場合は、シミュレーションの最大反復回数を制限
    if (nodeCount > 200) {
      let iterations = 0;
      simulation.on('tick', () => {
        iterations++;
        if (iterations >= maxIterations) {
          simulation.stop();
        }
      });
    }

    // リンク（接続線）を描画
    const linkElements = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(simulationLinks)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        const isHovered = hoveredNodeId !== null && (
          sourceId === hoveredNodeId || targetId === hoveredNodeId
        );
        return isHovered ? DESIGN.colors.connection.hover : (d.type === 'main' ? DESIGN.colors.connection.main : DESIGN.colors.connection.branch);
      })
      .attr('stroke-width', (d) => d.type === 'main' ? DESIGN.stroke.main : DESIGN.stroke.branch)
      .attr('opacity', (d) => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        const isHovered = hoveredNodeId !== null && (
          sourceId === hoveredNodeId || targetId === hoveredNodeId
        );
        return isHovered ? 1.0 : (d.type === 'main' ? 0.7 : 0.6); // 不透明度を上げて見やすく（0.5→0.7, 0.4→0.6）
      })
      .attr('stroke-dasharray', (d) => d.type === 'branch' ? '3,3' : 'none')
      .lower();

    // ノードグループを作成
    const nodeGroups = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(simulationNodes)
      .enter()
      .append('g')
      .attr('class', (d) => `${d.type}-node`)
      .style('cursor', 'pointer');

    // シャドウレイヤー（ホバー時のみ表示、半径は固定）
    nodeGroups
      .append('circle')
      .attr('class', 'shadow-layer')
      .attr('r', (d) => getNodeRadius(d))
      .attr('fill', 'rgba(0, 0, 0, 0.1)')
      .attr('filter', 'url(#diagramShadow)')
      .attr('transform', 'translate(0, 1)')
      .attr('opacity', 0)
      .style('transition', `opacity ${DESIGN.animation.duration}ms ${DESIGN.animation.easing}`)
      .style('pointer-events', 'none');

    // メインのcircle（半径は固定、スケールのみ変更してホバー効果を出す）
    const circles = nodeGroups
      .append('circle')
      .attr('r', (d) => getNodeRadius(d))
      .attr('fill', (d) => {
        // 親ノードは灰色
        if (d.data?.isParent) return '#808080'; // 灰色
        if (d.type === 'theme') return DESIGN.colors.theme.fill;
        if (d.type === 'organization') return DESIGN.colors.organization.fill;
        if (d.type === 'initiative') return DESIGN.colors.initiative.fill;
        if (d.type === 'topic') return DESIGN.colors.topic.fill;
        return '#CCCCCC';
      })
      .attr('stroke', (d) => {
        // 親ノードは灰色
        if (d.data?.isParent) return '#666666'; // 濃い灰色
        if (d.type === 'theme') return DESIGN.colors.theme.stroke;
        if (d.type === 'organization') return DESIGN.colors.organization.stroke;
        if (d.type === 'initiative') return DESIGN.colors.initiative.stroke;
        if (d.type === 'topic') return DESIGN.colors.topic.stroke;
        return '#999999';
      })
      .attr('stroke-width', DESIGN.stroke.node)
      .style('transition', `fill ${DESIGN.animation.duration}ms ${DESIGN.animation.easing}, transform ${DESIGN.animation.duration}ms ${DESIGN.animation.easing}`)
      .style('pointer-events', 'all')
      .attr('transform', 'scale(1)');

    // テキスト
    const texts = nodeGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => {
        // 親ノードのテキストは白（灰色背景のため）
        if (d.data?.isParent) return '#FFFFFF'; // 白
        if (d.type === 'theme') return DESIGN.colors.theme.text;
        if (d.type === 'organization') return DESIGN.colors.organization.text;
        if (d.type === 'initiative') return DESIGN.colors.initiative.text;
        if (d.type === 'topic') return DESIGN.colors.topic.text;
        return '#000000';
      })
      .attr('font-size', (d) => {
        if (d.type === 'theme') return DESIGN.typography.theme.fontSize;
        if (d.type === 'organization') return DESIGN.typography.organization.fontSize;
        if (d.type === 'initiative') return DESIGN.typography.initiative.fontSize;
        if (d.type === 'topic') return DESIGN.typography.topic.fontSize;
        return '14px';
      })
      .attr('font-weight', (d) => {
        if (d.type === 'theme') return DESIGN.typography.theme.fontWeight;
        if (d.type === 'organization') return DESIGN.typography.organization.fontWeight;
        if (d.type === 'initiative') return DESIGN.typography.initiative.fontWeight;
        if (d.type === 'topic') return DESIGN.typography.topic.fontWeight;
        return '500';
      })
      .attr('font-family', 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
      .attr('pointer-events', 'none')
      .each(function(d) {
        const textElement = select(this);
        const radius = getNodeRadius(d);
        const fontSize = d.type === 'theme' 
          ? parseFloat(DESIGN.typography.theme.fontSize) 
          : d.type === 'organization' 
          ? parseFloat(DESIGN.typography.organization.fontSize)
          : d.type === 'initiative'
          ? parseFloat(DESIGN.typography.initiative.fontSize)
          : d.type === 'topic'
          ? parseFloat(DESIGN.typography.topic.fontSize)
          : 14;
        // 注力施策の場合は8文字を上限として省略表示
        let displayLabel = d.label;
        if (d.type === 'initiative' && d.label.length > 8) {
          displayLabel = d.label.substring(0, 8) + '...';
        }
        const lines = wrapText(displayLabel, radius * 2, fontSize, d.type);
        const lineHeight = fontSize * 1.2;
        
        // 複数行の場合、垂直位置を中央に調整
        const totalHeight = (lines.length - 1) * lineHeight;
        const dyOffset = -totalHeight / 2 + fontSize * 0.35;
        
        // 各行をtspanで追加
        lines.forEach((line, i) => {
          const tspan = textElement
            .append('tspan')
            .attr('x', 0)
            .attr('dy', i === 0 ? `${dyOffset}px` : `${lineHeight}px`)
            .text(line);
        });
      });

    // ダブルクリック処理関数
    const handleDoubleClick = (d: RelationshipNode) => {
      console.log('🔍 [2D関係性図] ダブルクリック検出:', {
        type: d.type,
        id: d.id,
        label: d.label,
        data: d.data,
        organizationId: d.data?.organizationId,
        originalId: d.data?.originalId,
      });
      // 個別トピックのノードの場合、モーダルを表示
      if (d.type === 'topic') {
        // ノードのdataからTopicInfoを取得
        const topicData = d.data as TopicInfo;
        if (topicData) {
          setSelectedTopic(topicData);
        } else {
          console.warn('⚠️ [2D関係性図] トピックデータが見つかりません:', d);
        }
      } else if (d.type === 'initiative') {
        const organizationId = d.data?.organizationId;
        // テーマごとに独立したノードの場合、originalIdを使用
        const initiativeId = d.data?.originalId || d.id;
        console.log('🔍 [2D関係性図] 注力施策ノードを検出:', {
          organizationId,
          initiativeId,
          nodeId: d.id,
          hasOrgId: !!organizationId,
          hasInitId: !!initiativeId,
        });
        if (organizationId && initiativeId) {
          const path = `/organization/initiative?organizationId=${organizationId}&initiativeId=${initiativeId}`;
          console.log('🔍 [2D関係性図] ページ遷移:', path);
          router.push(path);
        } else {
          console.warn('⚠️ [2D関係性図] 組織IDまたは施策IDが不足:', {
            organizationId,
            initiativeId,
          });
        }
      }
    };

    // ドラッグ機能（ノードドラッグ中はズームを無効化）
    const nodeDrag = drag<SVGGElement, RelationshipNode>()
      .on('start', function(event, d) {
        // ドラッグ開始位置を記録
        dragStartPosRef.current = { x: event.x, y: event.y };
        // ドラッグ開始時にズームを無効化
        if (zoomRef.current) {
          svg.on('.zoom', null);
        }
        event.sourceEvent.stopPropagation(); // ズームイベントの伝播を停止
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        select(this).raise();
      })
      .on('drag', function(event, d) {
        event.sourceEvent.stopPropagation(); // ズームイベントの伝播を停止
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', function(event, d) {
        event.sourceEvent.stopPropagation(); // ズームイベントの伝播を停止
        
        // ドラッグ開始位置と終了位置の距離を計算
        if (dragStartPosRef.current) {
          const dx = event.x - dragStartPosRef.current.x;
          const dy = event.y - dragStartPosRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // 移動距離が小さい場合（5px未満）、クリックとして扱う
          if (distance < 5) {
            const now = Date.now();
            const timeSinceLastClick = now - lastClickTimeRef.current;
            
            // ダブルクリック判定（300ms以内の2回目のクリック）
            if (timeSinceLastClick < 300 && clickTimerRef.current) {
              // シングルクリックのタイマーをクリア
              clearTimeout(clickTimerRef.current);
              clickTimerRef.current = null;
              lastClickTimeRef.current = 0;
              // ダブルクリックとして処理
              handleDoubleClick(d);
            } else {
              // シングルクリックのタイマーを設定
              lastClickTimeRef.current = now;
              clickTimerRef.current = setTimeout(() => {
                onNodeClick?.(d);
                clickTimerRef.current = null;
                lastClickTimeRef.current = 0;
              }, 300);
            }
          }
        }
        
        // ドラッグ終了時にズームを再有効化
        if (zoomRef.current) {
          svg.call(zoomRef.current as any);
        }
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        dragStartPosRef.current = null;
      });

    nodeGroups.call(nodeDrag);

    // ホバーイベント
    nodeGroups
      .on('mouseenter', (event, d) => {
        // ホバー状態を更新（シミュレーションの再計算を防ぐため、refも更新）
        hoveredNodeIdRef.current = d.id;
        setHoveredNodeId(d.id);
        // ホバー時に視覚的なスケールと色を変更（シミュレーションには影響しない）
        const nodeGroup = select(event.currentTarget);
        const circle = nodeGroup.select('circle:not(.shadow-layer)');
        circle
          .attr('transform', 'scale(1.1)');
        // 色も変更
        if (d.data?.isParent) circle.attr('fill', '#666666'); // 親ノードのホバー色（濃いグレー）
        else if (d.type === 'theme') circle.attr('fill', DESIGN.colors.theme.hover);
        else if (d.type === 'organization') circle.attr('fill', DESIGN.colors.organization.hover);
        else if (d.type === 'initiative') circle.attr('fill', DESIGN.colors.initiative.hover);
        else if (d.type === 'topic') circle.attr('fill', DESIGN.colors.topic.hover);
        nodeGroup
          .select('.shadow-layer')
          .attr('opacity', 1);
      })
      .on('mouseleave', (event, d) => {
        // ホバー状態をクリア
        hoveredNodeIdRef.current = null;
        setHoveredNodeId(null);
        // ホバー解除時にスケールと色を戻す
        const nodeGroup = select(event.currentTarget);
        const circle = nodeGroup.select('circle:not(.shadow-layer)');
        circle
          .attr('transform', 'scale(1)');
        // 色も戻す
        if (d.data?.isParent) circle.attr('fill', '#808080'); // 親ノードの通常色（灰色）
        else if (d.type === 'theme') circle.attr('fill', DESIGN.colors.theme.fill);
        else if (d.type === 'organization') circle.attr('fill', DESIGN.colors.organization.fill);
        else if (d.type === 'initiative') circle.attr('fill', DESIGN.colors.initiative.fill);
        else if (d.type === 'topic') circle.attr('fill', DESIGN.colors.topic.fill);
        nodeGroup
          .select('.shadow-layer')
          .attr('opacity', 0);
      });

    // シミュレーションのtickイベントでノードとリンクを更新
    simulation.on('tick', () => {
      // リンクを更新（ノードの円周上で接続、半径は固定）
      linkElements.each(function(d: any) {
        const source = typeof d.source === 'object' ? d.source : simulationNodes.find((n: any) => n.id === d.source);
        const target = typeof d.target === 'object' ? d.target : simulationNodes.find((n: any) => n.id === d.target);
        
        if (!source || !target) return;
        
        // 半径は固定（ホバー時も変わらない）
        const sourceRadius = getNodeRadius(source);
        const targetRadius = getNodeRadius(target);
        
        // ノード間の距離と角度を計算
        const dx = target.x! - source.x!;
        const dy = target.y! - source.y!;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        // 単位ベクトル
        const ux = dx / distance;
        const uy = dy / distance;
        
        // 円周上の接続点
        const x1 = source.x! + ux * sourceRadius;
        const y1 = source.y! + uy * sourceRadius;
        const x2 = target.x! - ux * targetRadius;
        const y2 = target.y! - uy * targetRadius;
        
        select(this)
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2);
      });

      // ノードを更新（位置のみ、スケールはCSS transformで制御）
      nodeGroups.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // ズーム機能を設定
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4]) // ズーム範囲: 0.1倍～4倍
      .on('zoom', (event) => {
        zoomContainer.attr('transform', event.transform.toString());
      });

    // SVGにズーム機能を適用
    svg.call(zoomBehavior);
    zoomRef.current = zoomBehavior as any;

    // 初期ズーム位置を中央に設定
    const initialTransform = zoomIdentity
      .translate(width / 2, height / 2)
      .scale(0.8) // 初期スケール80%
      .translate(-width / 2, -height / 2);
    
    svg.call(zoomBehavior.transform, initialTransform);

    // クリーンアップ
    return () => {
      simulation.stop();
      simulationRef.current = null;
      zoomRef.current = null;
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    };
  }, [filteredNodes, filteredLinks, width, height, onNodeClick, selectedThemeId, maxNodes]); // hoveredNodeIdを依存配列から削除

  // AIでメタデータを生成する関数（保存はしない）
  const handleAIGenerateMetadata = async () => {
    if (!selectedTopic) return;

    try {
      setIsGeneratingMetadata(true);
      console.log('🤖 AIメタデータ生成を開始:', selectedTopic.id, 'モード:', metadataMode);

      // メタデータを生成
      const generatedMetadata = await generateTopicMetadata(selectedTopic.title, selectedTopic.content, selectedModel);
      console.log('✅ AIメタデータ生成完了:', generatedMetadata);

      // エンティティとリレーションを生成
      console.log('🤖 エンティティ・リレーション抽出を開始...');
      const extractedEntities = await extractEntities(selectedTopic.title, selectedTopic.content, selectedModel);
      console.log('✅ エンティティ抽出完了:', extractedEntities.length, '件');
      
      const extractedRelations = extractedEntities.length > 0
        ? await extractRelations(selectedTopic.title, selectedTopic.content, extractedEntities, selectedModel)
        : [];
      console.log('✅ リレーション抽出完了:', extractedRelations.length, '件');

      // モードに応じてメタデータをマージ
      let finalMetadata: typeof generatedMetadata;
      if (metadataMode === 'merge') {
        // 追加モード：既存のメタデータを保持し、空のフィールドのみを埋める
        finalMetadata = {
          semanticCategory: selectedTopic.semanticCategory || generatedMetadata.semanticCategory,
          importance: selectedTopic.importance || generatedMetadata.importance,
          keywords: selectedTopic.keywords && selectedTopic.keywords.length > 0 
            ? selectedTopic.keywords 
            : generatedMetadata.keywords,
          summary: selectedTopic.summary || generatedMetadata.summary,
        };
      } else {
        // 上書きモード：生成したメタデータで完全に置き換える
        finalMetadata = generatedMetadata;
      }

      // エンティティにorganizationIdとtopicIdを設定
      const entitiesWithOrgId = extractedEntities.map(entity => ({
        ...entity,
        organizationId: selectedTopic.organizationId,
        metadata: {
          ...entity.metadata,
          topicId: selectedTopic.id, // トピックIDをmetadataに追加
        },
      }));

      // リレーションにtopicIdとorganizationIdを設定
      const relationsWithIds = extractedRelations.map(relation => ({
        ...relation,
        topicId: selectedTopic.id,
        organizationId: selectedTopic.organizationId,
      }));

      // 一時状態に保存
      setPendingMetadata(finalMetadata);
      setPendingEntities(entitiesWithOrgId);
      setPendingRelations(relationsWithIds);

      // モーダルの表示を更新（保存はまだ）
      setSelectedTopic({
        ...selectedTopic,
        semanticCategory: finalMetadata.semanticCategory,
        importance: finalMetadata.importance,
        keywords: finalMetadata.keywords,
        summary: finalMetadata.summary,
      });
      
      // エンティティとリレーションの表示も更新（保存はまだ）
      setTopicEntities(entitiesWithOrgId);
      setTopicRelations(relationsWithIds);
    } catch (error: any) {
      console.error('❌ AIメタデータ生成エラー:', error);
      alert(`メタデータの生成に失敗しました: ${error.message}`);
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  // topicsレコード作成のヘルパー関数
  const createTopicEmbeddingRecord = async (id: string, topic: TopicInfo) => {
    const now = new Date().toISOString();
    await callTauriCommand('doc_set', {
      collectionName: 'topics',
      docId: id,
      data: {
        id: id,
        topicId: topic.id,
        meetingNoteId: topic.meetingNoteId,
        organizationId: topic.organizationId,
        title: topic.title || '',
        content: topic.content || '',
        createdAt: now,
        updatedAt: now,
      },
    });
    console.log('✅ topicsレコードを作成しました:', id);
  };

  // 生成されたメタデータを保存する関数
  const handleSaveMetadata = async () => {
    if (!selectedTopic || !pendingMetadata) return;

    try {
      setIsSavingMetadata(true);
      console.log('💾 メタデータ保存を開始:', selectedTopic.id);

      // 議事録を取得
      const meetingNote = await getMeetingNoteById(selectedTopic.meetingNoteId);
      if (!meetingNote || !meetingNote.content) {
        throw new Error('議事録が見つかりません');
      }

      // contentをJSONパース
      const parsed = JSON.parse(meetingNote.content) as Record<string, {
        summary?: string;
        summaryId?: string;
        items?: Array<{
          id: string;
          title: string;
          content: string;
          topics?: Array<{
            id: string;
            title: string;
            content: string;
            semanticCategory?: string;
            importance?: string;
            keywords?: string | string[];
            summary?: string;
          }>;
        }>;
      }>;

      // 該当トピックを見つけてメタデータを更新
      let topicFound = false;

      for (const [tabId, tabData] of Object.entries(parsed)) {
        if (!tabData.items || !Array.isArray(tabData.items)) continue;

        for (const item of tabData.items) {
          if (!item.topics || !Array.isArray(item.topics)) continue;

          const topicIndex = item.topics.findIndex(t => t.id === selectedTopic.id);
          if (topicIndex !== -1) {
            // トピックを更新
            const existingTopic = item.topics[topicIndex];
            item.topics[topicIndex] = {
              ...existingTopic,
              semanticCategory: pendingMetadata.semanticCategory,
              importance: pendingMetadata.importance,
              keywords: pendingMetadata.keywords,
              summary: pendingMetadata.summary,
            };
            topicFound = true;
            break;
          }
        }
        if (topicFound) break;
      }

      if (!topicFound) {
        throw new Error('トピックが見つかりません');
      }

      // JSONを文字列化して保存
      const updatedContent = JSON.stringify(parsed);
      await saveMeetingNote({
        id: meetingNote.id,
        organizationId: meetingNote.organizationId,
        title: meetingNote.title,
        description: meetingNote.description,
        content: updatedContent,
      });

      console.log('✅ メタデータを保存しました');

      // 更新されたトピック情報を取得
      let updatedTopic: TopicInfo | null = null;
      for (const [tabId, tabData] of Object.entries(parsed)) {
        if (!tabData.items || !Array.isArray(tabData.items)) continue;
        for (const item of tabData.items) {
          if (!item.topics || !Array.isArray(item.topics)) continue;
          const foundTopic = item.topics.find(t => t.id === selectedTopic.id);
          if (foundTopic) {
            updatedTopic = foundTopic as any;
            break;
          }
        }
        if (updatedTopic) break;
      }

      // トピック埋め込みを再保存（ChromaDBが有効な場合）
      if (updatedTopic) {
        try {
          await saveTopicEmbeddingAsync(
            updatedTopic.id,
            selectedTopic.meetingNoteId,
            meetingNote.organizationId,
            updatedTopic.title,
            updatedTopic.content,
            {
              keywords: updatedTopic.keywords,
              semanticCategory: updatedTopic.semanticCategory,
              importance: updatedTopic.importance,
              summary: updatedTopic.summary,
            }
          );
          console.log('✅ トピック埋め込みを再保存しました（ChromaDB）');
        } catch (embeddingError: any) {
          console.warn('⚠️ トピック埋め込みの再保存に失敗しました（続行します）:', embeddingError?.message || embeddingError);
          // 埋め込みの再保存に失敗しても処理を続行
        }
      }

      // topicsテーブルから該当レコードのIDを取得
      // relationsのtopicIdはtopics(id)を参照する必要がある
      const topicEmbeddingId = `${selectedTopic.meetingNoteId}-topic-${selectedTopic.id}`;
      
      // topicsレコードが存在するか確認（存在しない場合は作成）
      let topicEmbeddingRecordId = topicEmbeddingId;
      try {
        const topicEmbeddingResult = await callTauriCommand('doc_get', {
          collectionName: 'topics',
          docId: topicEmbeddingId,
        });
        
        // doc_getの結果を確認（{exists: bool, data: HashMap}形式）
        if (topicEmbeddingResult && topicEmbeddingResult.exists && topicEmbeddingResult.data) {
          // レコードが存在する場合
          topicEmbeddingRecordId = topicEmbeddingResult.data.id || topicEmbeddingId;
          console.log('✅ topicsレコードが見つかりました:', topicEmbeddingRecordId);
        } else {
          // レコードが存在しない場合は作成
          console.log('⚠️ topicsレコードが存在しないため作成します:', topicEmbeddingId);
          await createTopicEmbeddingRecord(topicEmbeddingId, selectedTopic);
        }
      } catch (error: any) {
        // エラーメッセージに「no rows」または「Query returned no rows」が含まれている場合は、レコードが存在しないことを意味する
        const errorMessage = error?.message || error?.error || error?.errorString || String(error || '');
        const isNoRowsError = errorMessage.includes('no rows') || 
                              errorMessage.includes('Query returned no rows') ||
                              errorMessage.includes('ドキュメント取得エラー');
        
        if (isNoRowsError) {
          console.log('⚠️ topicsレコードが存在しないため作成します:', topicEmbeddingId);
          try {
            await createTopicEmbeddingRecord(topicEmbeddingId, selectedTopic);
          } catch (createError: any) {
            console.error('❌ topicsレコード作成エラー:', createError);
            alert(`topicsレコードの作成に失敗しました。詳細はコンソールを確認してください。`);
            throw createError; // 作成に失敗した場合はエラーを再スロー
          }
        } else {
          console.error('❌ topicsレコード確認エラー:', error);
          // その他のエラーは続行（後でエンティティ・リレーション保存時にエラーになる）
        }
      }
      
      // エンティティとリレーションを保存
      let savedEntityCount = 0;
      let savedRelationCount = 0;
      
      // pendingEntitiesのIDから実際に作成されたIDへのマッピング
      const pendingIdToCreatedIdMap = new Map<string, string>();
      
      // エンティティを保存
      if (pendingEntities && pendingEntities.length > 0) {
          console.log('💾 エンティティ保存を開始:', pendingEntities.length, '件');
          
          // 既存のエンティティを取得（重複チェック用）
          // トピックごとに独立したエンティティを管理するため、同じトピック内での重複のみをチェック
          const existingEntities = await getEntitiesByOrganizationId(selectedTopic.organizationId);
          
          // 同じトピック内で既に存在するエンティティをフィルタリング
          const existingEntitiesInTopic = existingEntities.filter(e => {
            if (!e.metadata || typeof e.metadata !== 'object') return false;
            return 'topicId' in e.metadata && e.metadata.topicId === selectedTopic.id;
          });
          
          // 名前 + topicIdの組み合わせで重複チェック
          const existingEntityKeys = new Set(
            existingEntitiesInTopic.map(e => `${e.name.toLowerCase()}_${selectedTopic.id}`)
          );
          
          // 重複しないエンティティのみを作成（同じトピック内で重複しないもの）
          const entitiesToCreate = pendingEntities.filter(entity => {
            const key = `${entity.name.toLowerCase()}_${selectedTopic.id}`;
            return !existingEntityKeys.has(key);
          });
          
          console.log(`📊 エンティティ作成対象: ${entitiesToCreate.length}件（重複除外: ${pendingEntities.length - entitiesToCreate.length}件、トピック: ${selectedTopic.id}）`);
          
          for (const entity of entitiesToCreate) {
            try {
              const pendingId = entity.id; // 元のIDを保存
              
              // metadataにtopicIdを確実に設定
              const entityMetadata = {
                ...(entity.metadata || {}),
                topicId: selectedTopic.id, // トピックIDをmetadataに追加
              };
              
              const createdEntity = await createEntity({
                name: entity.name,
                type: entity.type,
                aliases: entity.aliases || [],
                metadata: entityMetadata,
                organizationId: entity.organizationId,
              });
              console.log('✅ エンティティ作成:', entity.name, 'pendingID:', pendingId, 'createdID:', createdEntity.id, 'topicId:', selectedTopic.id);
              // IDマッピングを作成
              pendingIdToCreatedIdMap.set(pendingId, createdEntity.id);
              savedEntityCount++;
            } catch (error: any) {
              console.error('❌ エンティティ作成エラー:', entity.name, error);
              // エラーが発生しても処理を続行
            }
          }
          
          // 既存のエンティティもマッピングに追加（同じトピック内のもののみ）
          existingEntitiesInTopic.forEach(entity => {
            const pendingEntity = pendingEntities.find(e => 
              e.name.toLowerCase() === entity.name.toLowerCase() &&
              e.metadata && typeof e.metadata === 'object' &&
              'topicId' in e.metadata && e.metadata.topicId === selectedTopic.id
            );
            if (pendingEntity) {
              pendingIdToCreatedIdMap.set(pendingEntity.id, entity.id);
            }
          });
          
          // エンティティを再取得してIDを取得
          const updatedEntities = await getEntitiesByOrganizationId(selectedTopic.organizationId);
          
          // 同じトピック内のエンティティのみをフィルタリング
          const updatedEntitiesInTopic = updatedEntities.filter(e => {
            if (!e.metadata || typeof e.metadata !== 'object') return false;
            return 'topicId' in e.metadata && e.metadata.topicId === selectedTopic.id;
          });
          
          console.log(`📊 組織内のエンティティ総数: ${updatedEntities.length}件、トピック内: ${updatedEntitiesInTopic.length}件（トピック: ${selectedTopic.id}）`);
          
          // エンティティ名からIDのマッピングを作成（同じトピック内のエンティティのみ）
          const entityNameToIdMap = new Map<string, string>();
          updatedEntitiesInTopic.forEach(entity => {
            entityNameToIdMap.set(entity.name.toLowerCase(), entity.id);
          });
          
          console.log('📊 IDマッピング:', Array.from(pendingIdToCreatedIdMap.entries()).map(([pending, created]) => `${pending} -> ${created}`));
        }
      
      // リレーションを保存（エンティティが0件でも実行可能）
      if (pendingRelations && pendingRelations.length > 0) {
        console.log('💾 リレーション保存を開始:', pendingRelations.length, '件');
        
        // エンティティ名からIDのマッピングを取得（同じトピック内のエンティティのみ）
        let entityNameToIdMap = new Map<string, string>();
        if (pendingEntities && pendingEntities.length > 0) {
          // エンティティが保存済みの場合、更新後のエンティティを取得
          const updatedEntities = await getEntitiesByOrganizationId(selectedTopic.organizationId);
          // 同じトピック内のエンティティのみをフィルタリング
          const updatedEntitiesInTopic = updatedEntities.filter(e => {
            if (!e.metadata || typeof e.metadata !== 'object') return false;
            return 'topicId' in e.metadata && e.metadata.topicId === selectedTopic.id;
          });
          updatedEntitiesInTopic.forEach(entity => {
            entityNameToIdMap.set(entity.name.toLowerCase(), entity.id);
          });
        } else {
          // エンティティが0件の場合、既存のエンティティを取得
          const existingEntities = await getEntitiesByOrganizationId(selectedTopic.organizationId);
          // 同じトピック内のエンティティのみをフィルタリング
          const existingEntitiesInTopic = existingEntities.filter(e => {
            if (!e.metadata || typeof e.metadata !== 'object') return false;
            return 'topicId' in e.metadata && e.metadata.topicId === selectedTopic.id;
          });
          existingEntitiesInTopic.forEach(entity => {
            entityNameToIdMap.set(entity.name.toLowerCase(), entity.id);
          });
        }
        
        if (pendingEntities && pendingEntities.length > 0) {
          console.log('💾 リレーション保存を開始:', pendingRelations.length, '件');
          
          for (const relation of pendingRelations) {
            try {
              // リレーションのエンティティIDを取得
              // extractRelationsが返すリレーションには、pendingEntitiesのエンティティIDが含まれている
              // このIDは一時的なものなので、実際に作成されたIDに変換する必要がある
              
              // IDマッピングを使用して実際に作成されたIDを取得
              if (!relation.sourceEntityId || !relation.targetEntityId) {
                console.warn('リレーションにsourceEntityIdまたはtargetEntityIdがありません:', relation);
                continue;
              }
              const sourceId = pendingIdToCreatedIdMap.get(relation.sourceEntityId);
              const targetId = pendingIdToCreatedIdMap.get(relation.targetEntityId);
              
              if (!sourceId || !targetId) {
                // フォールバック: エンティティ名からIDを取得
                const sourcePendingEntity = pendingEntities.find(e => e.id === relation.sourceEntityId);
                const targetPendingEntity = pendingEntities.find(e => e.id === relation.targetEntityId);
                
                if (sourcePendingEntity && targetPendingEntity) {
                  const fallbackSourceId = entityNameToIdMap.get(sourcePendingEntity.name.toLowerCase());
                  const fallbackTargetId = entityNameToIdMap.get(targetPendingEntity.name.toLowerCase());
                  
                  if (fallbackSourceId && fallbackTargetId) {
                    console.log('⚠️ IDマッピングが見つかりませんが、エンティティ名からIDを取得しました（トピック内）:', {
                      sourcePendingId: relation.sourceEntityId,
                      sourceCreatedId: fallbackSourceId,
                      targetPendingId: relation.targetEntityId,
                      targetCreatedId: fallbackTargetId,
                      topicId: selectedTopic.id,
                    });
                    // フォールバックIDを使用
                    const createdRelation = await createRelation({
                      sourceEntityId: fallbackSourceId,
                      targetEntityId: fallbackTargetId,
                      relationType: relation.relationType,
                      description: relation.description,
                      topicId: topicEmbeddingRecordId,
                      organizationId: selectedTopic.organizationId,
                    });
                    console.log('✅ リレーション作成:', createdRelation.id);
                    savedRelationCount++;
                    continue;
                  }
                }
                
                console.warn('⚠️ リレーション作成スキップ: エンティティIDが見つかりません（トピック内）', {
                  sourcePendingId: relation.sourceEntityId,
                  targetPendingId: relation.targetEntityId,
                  sourceId,
                  targetId,
                  relationType: relation.relationType,
                  topicId: selectedTopic.id,
                  pendingIdMap: Array.from(pendingIdToCreatedIdMap.entries()),
                });
                continue;
              }
              
              console.log('📊 リレーションID変換（トピック内）:', {
                sourcePendingId: relation.sourceEntityId,
                sourceCreatedId: sourceId,
                targetPendingId: relation.targetEntityId,
                targetCreatedId: targetId,
                topicId: selectedTopic.id,
              });
              
              // リレーションを作成（topicIdはtopicsのidを使用）
              console.log('📊 リレーション作成（トピック内）:', {
                topicEmbeddingRecordId,
                topicId: selectedTopic.id,
                sourceId,
                targetId,
                relationType: relation.relationType,
              });
              const createdRelation = await createRelation({
                topicId: topicEmbeddingRecordId, // topicsのidを使用
                sourceEntityId: sourceId,
                targetEntityId: targetId,
                relationType: relation.relationType,
                description: relation.description,
                confidence: relation.confidence,
                metadata: relation.metadata,
                organizationId: selectedTopic.organizationId,
              });
              console.log('✅ リレーション作成完了（トピック内）:', {
                relationId: createdRelation.id,
                topicId: createdRelation.topicId,
                expectedTopicId: topicEmbeddingRecordId,
                match: createdRelation.topicId === topicEmbeddingRecordId,
              });
              // エンティティ名を取得（ログ用）
              const sourcePendingEntity = pendingEntities.find(e => e.id === relation.sourceEntityId);
              const targetPendingEntity = pendingEntities.find(e => e.id === relation.targetEntityId);
              const sourceName = sourcePendingEntity?.name || relation.sourceEntityId;
              const targetName = targetPendingEntity?.name || relation.targetEntityId;
              console.log('✅ リレーション作成（トピック内）:', relation.relationType, `${sourceName} -> ${targetName}`, 'ID:', createdRelation.id, 'topicId:', selectedTopic.id);
              savedRelationCount++;
            } catch (error: any) {
              console.error('❌ リレーション作成エラー:', relation.relationType, error);
              // エラーが発生しても処理を続行
            }
          }
        }
        
        console.log(`✅ 保存完了: エンティティ ${savedEntityCount}件、リレーション ${savedRelationCount}件`);
      }

      // selectedTopicの状態を更新して、保存されたメタデータを反映
      setSelectedTopic({
        ...selectedTopic,
        semanticCategory: pendingMetadata.semanticCategory,
        importance: pendingMetadata.importance,
        keywords: pendingMetadata.keywords,
        summary: pendingMetadata.summary,
      });

      // エンティティとリレーションを再取得
      try {
        // topicsのidでリレーションを取得
        const relations = await getRelationsByTopicId(topicEmbeddingRecordId);
        setTopicRelations(relations);
        const entityIds = new Set<string>();
        relations.forEach(relation => {
          if (relation.sourceEntityId) entityIds.add(relation.sourceEntityId);
          if (relation.targetEntityId) entityIds.add(relation.targetEntityId);
        });
        const entities: Entity[] = [];
        for (const entityId of entityIds) {
          try {
            const entity = await getEntityById(entityId);
            if (entity) entities.push(entity);
          } catch (error) {
            console.warn(`⚠️ エンティティ取得エラー (${entityId}):`, error);
          }
        }
        setTopicEntities(entities);
      } catch (error) {
        console.error('❌ エンティティ・リレーション再取得エラー:', error);
        // エラーが発生しても一時状態はクリアしない（ユーザーが再試行できるように）
      }

      // 一時状態をクリア（保存成功時のみ）
      setPendingMetadata(null);
      setPendingEntities(null);
      setPendingRelations(null);

      // 親コンポーネントに通知してトピックリストを再取得
      if (onTopicMetadataSaved) {
        onTopicMetadataSaved();
      }

      alert('メタデータ、エンティティ、リレーションを保存しました');
    } catch (error: any) {
      console.error('❌ メタデータ保存エラー:', error);
      // エラー時は一時状態を保持して、ユーザーが再試行できるようにする
      alert(`メタデータの保存に失敗しました: ${error.message}\n\nエラー詳細はコンソールを確認してください。`);
      // 一時状態はクリアしない
    } finally {
      setIsSavingMetadata(false);
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      overflow: 'hidden', // overflow: autoからhiddenに変更（ズーム機能のため）
      background: DESIGN.colors.background.base,
      borderRadius: '8px',
      padding: '32px',
      border: `1px solid ${DESIGN.colors.connection.branch}`,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      position: 'relative',
    }}>
      {/* ノード数制限の警告 */}
      {shouldLimitNodes && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            zIndex: 1000,
            padding: '8px 12px',
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#92400E',
            maxWidth: '400px',
          }}
        >
          ⚠️ パフォーマンス最適化のため、表示ノード数を{maxNodes}件に制限しています（全{nodeCount}件中）
        </div>
      )}
      
      <div style={{
        position: 'absolute',
        top: '40px',
        right: '40px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <button
          onClick={() => {
            if (svgRef.current && zoomRef.current) {
              const svg = select(svgRef.current) as any;
              svg.transition()
                .duration(300)
                .call(zoomRef.current.scaleBy, 1.2);
            }
          }}
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: '#1A1A1A',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
          title="拡大"
        >
          +
        </button>
        <button
          onClick={() => {
            if (svgRef.current && zoomRef.current) {
              const svg = select(svgRef.current) as any;
              svg.transition()
                .duration(300)
                .call(zoomRef.current.scaleBy, 0.8);
            }
          }}
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: '#1A1A1A',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
          title="縮小"
        >
          −
        </button>
        <button
          onClick={() => {
            if (svgRef.current && zoomRef.current) {
              const initialTransform = zoomIdentity
                .translate(width / 2, height / 2)
                .scale(0.8)
                .translate(-width / 2, -height / 2);
              const svg = select(svgRef.current) as any;
              svg.transition()
                .duration(300)
                .call(zoomRef.current.transform, initialTransform);
            }
          }}
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: '#1A1A1A',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
          title="リセット"
        >
          ⌂
        </button>
        {/* 個別トピックの表示/非表示ボタン */}
        <button
          onClick={() => setShowTopics(!showTopics)}
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: showTopics ? '#3B82F6' : '#FFFFFF',
            border: `1px solid ${showTopics ? '#2563EB' : '#E0E0E0'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: showTopics ? '#FFFFFF' : '#1A1A1A',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            marginTop: '8px',
          }}
          title={showTopics ? '個別トピックを非表示' : '個別トピックを表示'}
        >
          {showTopics ? '📋' : '📄'}
        </button>
      </div>
      
      {/* フィルターUI */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#F9FAFB',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginTop: '4px' }}>
          フィルター:
        </div>
        
        {/* 組織フィルター（複数選択） */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: '#6B7280', whiteSpace: 'nowrap' }}>
              組織:
            </label>
            <button
              onClick={() => setShowOrganizationFilter(!showOrganizationFilter)}
              disabled={isLoadingFilters}
              style={{
                padding: '6px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                color: '#1F2937',
                cursor: isLoadingFilters ? 'not-allowed' : 'pointer',
                minWidth: '200px',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                {selectedOrganizationIds.size === 0
                  ? 'すべての組織'
                  : `${selectedOrganizationIds.size}件選択中`}
              </span>
              <span style={{ fontSize: '12px' }}>{showOrganizationFilter ? '▲' : '▼'}</span>
            </button>
          </div>
          
          {showOrganizationFilter && (
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              padding: '8px',
              marginTop: '4px',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedOrganizationIds.size === 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOrganizationIds(new Set());
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px' }}>すべての組織</span>
              </label>
              {organizations.map(org => (
                <label
                  key={org.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedOrganizationIds.has(org.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedOrganizationIds);
                      if (e.target.checked) {
                        newSet.add(org.id);
                      } else {
                        newSet.delete(org.id);
                      }
                      setSelectedOrganizationIds(newSet);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px' }}>{org.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        
        {/* 担当者フィルター（複数選択） */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: '#6B7280', whiteSpace: 'nowrap' }}>
              担当者:
            </label>
            <button
              onClick={() => setShowMemberFilter(!showMemberFilter)}
              disabled={isLoadingFilters}
              style={{
                padding: '6px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                color: '#1F2937',
                cursor: isLoadingFilters ? 'not-allowed' : 'pointer',
                minWidth: '200px',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                {selectedMemberIds.size === 0
                  ? 'すべての担当者'
                  : `${selectedMemberIds.size}件選択中`}
              </span>
              <span style={{ fontSize: '12px' }}>{showMemberFilter ? '▲' : '▼'}</span>
            </button>
          </div>
          
          {showMemberFilter && (
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              padding: '8px',
              marginTop: '4px',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedMemberIds.size === 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMemberIds(new Set());
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px' }}>すべての担当者</span>
              </label>
              {(selectedOrganizationIds.size > 0
                ? members.filter(m => selectedOrganizationIds.has(m.organizationId))
                : members
              ).map(member => (
                <label
                  key={member.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.has(member.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedMemberIds);
                      if (e.target.checked) {
                        newSet.add(member.id);
                      } else {
                        newSet.delete(member.id);
                      }
                      setSelectedMemberIds(newSet);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px' }}>
                    {member.name} {member.position ? `(${member.position})` : ''}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        
        {/* 期間フィルター */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '14px', color: '#6B7280', whiteSpace: 'nowrap' }}>
            期間:
          </label>
          <input
            type="date"
            value={dateRangeStart}
            onChange={(e) => setDateRangeStart(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
              color: '#1F2937',
            }}
            placeholder="開始日"
          />
          <span style={{ fontSize: '14px', color: '#6B7280' }}>〜</span>
          <input
            type="date"
            value={dateRangeEnd}
            onChange={(e) => setDateRangeEnd(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
              color: '#1F2937',
            }}
            placeholder="終了日"
          />
        </div>
        
        {/* 重要度フィルター */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={() => setShowImportanceFilter(!showImportanceFilter)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minWidth: '150px',
            }}
          >
            <span>
              {selectedImportance.size === 0
                ? 'すべての重要度'
                : `${selectedImportance.size}件選択中`}
            </span>
            <span style={{ fontSize: '12px' }}>{showImportanceFilter ? '▲' : '▼'}</span>
          </button>
          
          {showImportanceFilter && (
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              padding: '8px',
              marginTop: '4px',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedImportance.size === 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedImportance(new Set());
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px' }}>すべての重要度</span>
              </label>
              {[
                { value: 'high' as const, label: '🔴 高' },
                { value: 'medium' as const, label: '🟡 中' },
                { value: 'low' as const, label: '🟢 低' },
              ].map(importance => (
                <label
                  key={importance.value}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedImportance.has(importance.value)}
                    onChange={(e) => {
                      const newSet = new Set(selectedImportance);
                      if (e.target.checked) {
                        newSet.add(importance.value);
                      } else {
                        newSet.delete(importance.value);
                      }
                      setSelectedImportance(newSet);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px' }}>{importance.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        
        {/* フィルターリセットボタン */}
        {(selectedOrganizationIds.size > 0 || selectedMemberIds.size > 0 || dateRangeStart || dateRangeEnd || selectedImportance.size > 0) && (
          <button
            onClick={() => {
              setSelectedOrganizationIds(new Set());
              setSelectedMemberIds(new Set());
              setDateRangeStart('');
              setDateRangeEnd('');
              setSelectedImportance(new Set());
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 500,
              alignSelf: 'flex-start',
              marginTop: '4px',
            }}
          >
            フィルターをリセット
          </button>
        )}
        
        {isLoadingFilters && (
          <div style={{ fontSize: '12px', color: '#6B7280', alignSelf: 'flex-start', marginTop: '4px' }}>
            読み込み中...
          </div>
        )}
      </div>
      
      {/* 選択中のフィルターをバッジで表示 */}
      {(selectedOrganizationIds.size > 0 || selectedMemberIds.size > 0 || dateRangeStart || dateRangeEnd || selectedImportance.size > 0) && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
            選択中:
          </div>
          
          {/* 選択された組織のバッジ */}
          {Array.from(selectedOrganizationIds).map(orgId => {
            const org = organizations.find(o => o.id === orgId);
            if (!org) return null;
            return (
              <div
                key={`org-${orgId}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <span>🏛️ {org.name}</span>
                <button
                  onClick={() => {
                    const newSet = new Set(selectedOrganizationIds);
                    newSet.delete(orgId);
                    setSelectedOrganizationIds(newSet);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    padding: '0',
                    marginLeft: '4px',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                  }}
                  title="削除"
                >
                  ×
                </button>
              </div>
            );
          })}
          
          {/* 選択された担当者のバッジ */}
          {Array.from(selectedMemberIds).map(memberId => {
            const member = members.find(m => m.id === memberId);
            if (!member) return null;
            return (
              <div
                key={`member-${memberId}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <span>👤 {member.name} {member.position ? `(${member.position})` : ''}</span>
                <button
                  onClick={() => {
                    const newSet = new Set(selectedMemberIds);
                    newSet.delete(memberId);
                    setSelectedMemberIds(newSet);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    padding: '0',
                    marginLeft: '4px',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                  }}
                  title="削除"
                >
                  ×
                </button>
              </div>
            );
          })}
          
          {/* 期間フィルターのバッジ */}
          {(dateRangeStart || dateRangeEnd) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                backgroundColor: '#8B5CF6',
                color: '#FFFFFF',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              <span>
                📅 {dateRangeStart || '開始日なし'} 〜 {dateRangeEnd || '終了日なし'}
              </span>
              <button
                onClick={() => {
                  setDateRangeStart('');
                  setDateRangeEnd('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  padding: '0',
                  marginLeft: '4px',
                  lineHeight: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                }}
                title="削除"
              >
                ×
              </button>
            </div>
          )}
          
          {/* 重要度フィルターのバッジ */}
          {Array.from(selectedImportance).map(importance => {
            const importanceLabels: Record<'high' | 'medium' | 'low', string> = {
              high: '🔴 高',
              medium: '🟡 中',
              low: '🟢 低',
            };
            const importanceColors: Record<'high' | 'medium' | 'low', { bg: string; text: string }> = {
              high: { bg: '#FEF2F2', text: '#DC2626' },
              medium: { bg: '#FEF3C7', text: '#D97706' },
              low: { bg: '#F0FDF4', text: '#16A34A' },
            };
            return (
              <div
                key={`importance-${importance}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: importanceColors[importance].bg,
                  color: importanceColors[importance].text,
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <span>{importanceLabels[importance]}</span>
                <button
                  onClick={() => {
                    const newSet = new Set(selectedImportance);
                    newSet.delete(importance);
                    setSelectedImportance(newSet);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: importanceColors[importance].text,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    padding: '0',
                    marginLeft: '4px',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                  }}
                  title="削除"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
      
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: 'block', margin: '0 auto', cursor: 'grab' }}
      />
      
      {/* 個別トピック詳細モーダル */}
      {selectedTopic && (
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
            zIndex: 2000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => {
            setSelectedTopic(null);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                {selectedTopic.title}
              </h2>
              <button
                onClick={() => {
            setSelectedTopic(null);
            setPendingMetadata(null);
            setPendingEntities(null);
            setPendingRelations(null);
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
            
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                  議事録アーカイブ
                </div>
                <div style={{ fontSize: '16px', color: '#1a1a1a', fontWeight: 500 }}>
                  {selectedTopic.meetingNoteTitle}
                </div>
              </div>
              
              {/* 日時編集 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>
                    日時
                  </div>
                  {!isEditingTopicDate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // イベント伝播を停止してモーダルが閉じないようにする
                        // 現在のtopicDateの状態から初期値を設定
                        // mentionedDateは常に保存されているので、topicDateから取得
                        if (selectedTopic.topicDate) {
                          const date = new Date(selectedTopic.topicDate);
                          const dateStr = date.toISOString().split('T')[0];
                          const timeStr = date.toTimeString().split(' ')[0].substring(0, 5);
                          setEditingTopicDate(dateStr);
                          setEditingTopicTime(timeStr);
                        } else {
                          setEditingTopicDate('');
                          setEditingTopicTime('');
                        }
                        // 全期間に反映は、isAllPeriodsフィールドで判断
                        setIsAllPeriods(selectedTopic.isAllPeriods === true);
                        setIsEditingTopicDate(true);
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
                      編集
                    </button>
                  )}
                </div>
                
                {isEditingTopicDate ? (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                  }}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isAllPeriods}
                          onChange={(e) => {
                            setIsAllPeriods(e.target.checked);
                            // 日付入力は独立しているので、チェックボックスを変更しても日付はクリアしない
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', color: '#374151' }}>
                          全期間に反映（日時に関係なく全期間に表示）
                        </span>
                      </label>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', marginLeft: '24px' }}>
                        チェック時は日付設定に関係なく全期間に表示されます
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                          日付
                        </label>
                        <input
                          type="date"
                          value={editingTopicDate}
                          onChange={(e) => setEditingTopicDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '14px',
                            backgroundColor: '#FFFFFF',
                            color: '#1F2937',
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                          時刻
                        </label>
                        <input
                          type="time"
                          value={editingTopicTime}
                          onChange={(e) => setEditingTopicTime(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '14px',
                            backgroundColor: '#FFFFFF',
                            color: '#1F2937',
                          }}
                        />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation(); // イベント伝播を停止してモーダルが閉じないようにする
                          try {
                            setIsSavingTopicDate(true);
                            
                            // mentionedDateは常に日付を保存（全期間でも日付は保持）
                            // isAllPeriodsは別のフィールドとして保存
                            let mentionedDate: string | null = null;
                            if (editingTopicDate) {
                              if (editingTopicTime) {
                                mentionedDate = new Date(`${editingTopicDate}T${editingTopicTime}`).toISOString();
                              } else {
                                mentionedDate = new Date(`${editingTopicDate}T00:00:00`).toISOString();
                              }
                            }
                            // 日付が設定されていない場合はnullのまま
                            
                            // 議事録を取得
                            const meetingNote = await getMeetingNoteById(selectedTopic!.meetingNoteId);
                            if (!meetingNote || !meetingNote.content) {
                              throw new Error('議事録が見つかりません');
                            }
                            
                            // contentをJSONパース
                            const parsed = JSON.parse(meetingNote.content) as Record<string, {
                              summary?: string;
                              summaryId?: string;
                              items?: Array<{
                                id: string;
                                title: string;
                                content: string;
                                topics?: Array<{
                                  id: string;
                                  title: string;
                                  content: string;
                                  mentionedDate?: string | null;
                                  isAllPeriods?: boolean;
                                }>;
                              }>;
                            }>;
                            
                            // 該当トピックを見つけて日時を更新
                            let topicFound = false;
                            
                            for (const [tabId, tabData] of Object.entries(parsed)) {
                              if (!tabData.items || !Array.isArray(tabData.items)) continue;
                              
                              for (const item of tabData.items) {
                                if (!item.topics || !Array.isArray(item.topics)) continue;
                                
                                const topicIndex = item.topics.findIndex(t => t.id === selectedTopic!.id);
                                if (topicIndex !== -1) {
                                  // トピックを更新
                                  // mentionedDateは常に日付を保存、isAllPeriodsは別フィールドとして保存
                                  const existingTopic = item.topics[topicIndex];
                                  item.topics[topicIndex] = {
                                    ...existingTopic,
                                    mentionedDate: mentionedDate,
                                    isAllPeriods: isAllPeriods,
                                  };
                                  topicFound = true;
                                  break;
                                }
                              }
                              if (topicFound) break;
                            }
                            
                            if (!topicFound) {
                              throw new Error('トピックが見つかりません');
                            }
                            
                            // JSONを文字列化して保存
                            const updatedContent = JSON.stringify(parsed);
                            await saveMeetingNote({
                              id: meetingNote.id,
                              organizationId: meetingNote.organizationId,
                              title: meetingNote.title,
                              description: meetingNote.description,
                              content: updatedContent,
                            });
                            
                            console.log('✅ 日時を保存しました');
                            
                            // 最新のトピックデータを取得してselectedTopicを更新
                            try {
                              const updatedTopics = await getAllTopics(selectedTopic!.organizationId);
                              const updatedTopic = updatedTopics.find(t => t.id === selectedTopic!.id);
                              if (updatedTopic) {
                                setSelectedTopic(updatedTopic);
                              } else {
                                // 見つからない場合は手動で更新
                                setSelectedTopic({
                                  ...selectedTopic!,
                                  topicDate: mentionedDate,
                                  isAllPeriods: isAllPeriods,
                                });
                              }
                            } catch (error) {
                              console.warn('⚠️ トピックデータの再取得に失敗しました。手動で更新します。', error);
                              // エラー時は手動で更新
                              setSelectedTopic({
                                ...selectedTopic!,
                                topicDate: mentionedDate,
                                isAllPeriods: isAllPeriods,
                              });
                            }
                            
                            // 親コンポーネントに通知してデータを再取得
                            if (onTopicMetadataSaved) {
                              onTopicMetadataSaved();
                            }
                            
                            setIsEditingTopicDate(false);
                            alert('日時を保存しました');
                          } catch (error: any) {
                            console.error('❌ 日時保存エラー:', error);
                            alert(`日時の保存に失敗しました: ${error.message || error}`);
                          } finally {
                            setIsSavingTopicDate(false);
                          }
                        }}
                        disabled={isSavingTopicDate}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#3B82F6',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: isSavingTopicDate ? 'not-allowed' : 'pointer',
                          fontWeight: 500,
                          opacity: isSavingTopicDate ? 0.6 : 1,
                        }}
                      >
                        {isSavingTopicDate ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // イベント伝播を停止してモーダルが閉じないようにする
                          setIsEditingTopicDate(false);
                          // キャンセル時は元の値に戻す
                          if (selectedTopic.topicDate) {
                            const date = new Date(selectedTopic.topicDate);
                            const dateStr = date.toISOString().split('T')[0];
                            const timeStr = date.toTimeString().split(' ')[0].substring(0, 5);
                            setEditingTopicDate(dateStr);
                            setEditingTopicTime(timeStr);
                          } else {
                            setEditingTopicDate('');
                            setEditingTopicTime('');
                          }
                          setIsAllPeriods(selectedTopic.isAllPeriods === true);
                        }}
                        disabled={isSavingTopicDate}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#FFFFFF',
                          color: '#374151',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: isSavingTopicDate ? 'not-allowed' : 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '16px', color: '#1a1a1a', fontWeight: 500 }}>
                    {selectedTopic.isAllPeriods === true ? (
                      <div>
                        <div style={{ color: '#8B5CF6', fontStyle: 'italic', marginBottom: '8px' }}>
                          📅 全期間に反映（日時に関係なく全期間に表示）
                        </div>
                        {selectedTopic.topicDate && (
                          <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                            設定日時: {new Date(selectedTopic.topicDate).toLocaleString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                      </div>
                    ) : selectedTopic.topicDate ? (
                      <span>
                        📅 {new Date(selectedTopic.topicDate).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    ) : (
                      <span style={{ color: '#6B7280', fontStyle: 'italic' }}>
                        📅 日時未設定
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                  内容
                </div>
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div className="markdown-content" style={{
                    fontSize: '16px',
                    lineHeight: '1.6',
                    color: '#1a1a1a',
                  }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedTopic.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
              
              {/* メタデータ表示 */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>
                      メタデータ
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>タイプ:</span>
                      <select
                        value={modelType}
                        onChange={(e) => {
                          const newType = e.target.value as 'gpt' | 'local';
                          setModelType(newType);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('topicMetadataGenerationModelType', newType);
                          }
                          // モデルタイプが変更されたら、デフォルトモデルを設定
                          if (newType === 'gpt') {
                            setSelectedModel('gpt-4o-mini');
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
                        value={selectedModel}
                        onChange={(e) => {
                          const newModel = e.target.value;
                          setSelectedModel(newModel);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('topicMetadataGenerationModel', newModel);
                          }
                        }}
                        disabled={isGeneratingMetadata || loadingLocalModels}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.875em',
                          border: '1px solid #D1D5DB',
                          borderRadius: '4px',
                          backgroundColor: '#FFFFFF',
                          color: '#1a1a1a',
                          cursor: isGeneratingMetadata || loadingLocalModels ? 'not-allowed' : 'pointer',
                          minWidth: '140px',
                        }}
                      >
                        {loadingLocalModels ? (
                          <option>読み込み中...</option>
                        ) : availableModels.length === 0 ? (
                          <option>モデルが見つかりません</option>
                        ) : (
                          availableModels.map((model) => (
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
                        value={metadataMode}
                        onChange={(e) => {
                          const newMode = e.target.value as 'overwrite' | 'merge';
                          setMetadataMode(newMode);
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
                      onClick={handleAIGenerateMetadata}
                      disabled={isGeneratingMetadata}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: isGeneratingMetadata ? '#9CA3AF' : '#3B82F6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.875em',
                        fontWeight: '600',
                        cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      onMouseEnter={(e) => {
                        if (!isGeneratingMetadata) {
                          e.currentTarget.style.backgroundColor = '#2563EB';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isGeneratingMetadata) {
                          e.currentTarget.style.backgroundColor = '#3B82F6';
                        }
                      }}
                    >
                      {isGeneratingMetadata ? (
                        <>
                          <span>⏳</span>
                          <span>生成中...</span>
                        </>
                      ) : (
                        <>
                          <span>🤖</span>
                          <span>AIで登録</span>
                        </>
                      )}
                    </button>
                    {pendingMetadata && (
                      <button
                        onClick={handleSaveMetadata}
                        disabled={isSavingMetadata}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: isSavingMetadata ? '#9CA3AF' : '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.875em',
                          fontWeight: '600',
                          cursor: isSavingMetadata ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSavingMetadata) {
                            e.currentTarget.style.backgroundColor = '#059669';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSavingMetadata) {
                            e.currentTarget.style.backgroundColor = '#10B981';
                          }
                        }}
                      >
                        {isSavingMetadata ? (
                          <>
                            <span>⏳</span>
                            <span>保存中...</span>
                          </>
                        ) : (
                          <>
                            <span>💾</span>
                            <span>保存</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '16px',
                }}>
                  {selectedTopic.semanticCategory ? (
                    <span style={{
                      padding: '6px 12px',
                      backgroundColor: '#EFF6FF',
                      color: '#0066CC',
                      borderRadius: '12px',
                      fontSize: '0.875em',
                      fontWeight: '600',
                    }}>
                      📂 {selectedTopic.semanticCategory === 'action-item' ? 'アクションアイテム' :
                          selectedTopic.semanticCategory === 'decision' ? '決定事項' :
                          selectedTopic.semanticCategory === 'discussion' ? '議論・討議' :
                          selectedTopic.semanticCategory === 'issue' ? '課題・問題' :
                          selectedTopic.semanticCategory === 'risk' ? 'リスク' :
                          selectedTopic.semanticCategory === 'opportunity' ? '機会' :
                          selectedTopic.semanticCategory === 'question' ? '質問・疑問' :
                          selectedTopic.semanticCategory === 'summary' ? 'サマリー' :
                          selectedTopic.semanticCategory === 'follow-up' ? 'フォローアップ' :
                          selectedTopic.semanticCategory === 'reference' ? '参照情報' : 'その他'}
                    </span>
                  ) : (
                    <span style={{
                      padding: '6px 12px',
                      backgroundColor: '#F9FAFB',
                      color: '#9CA3AF',
                      borderRadius: '12px',
                      fontSize: '0.875em',
                      fontWeight: '500',
                    }}>
                      📂 セマンティックカテゴリ: 登録なし
                    </span>
                  )}
                  {selectedTopic.importance ? (
                    <span style={{
                      padding: '6px 12px',
                      backgroundColor: selectedTopic.importance === 'high' ? '#FEF2F2' :
                                       selectedTopic.importance === 'medium' ? '#FEF3C7' : '#F0FDF4',
                      color: selectedTopic.importance === 'high' ? '#DC2626' :
                             selectedTopic.importance === 'medium' ? '#D97706' : '#16A34A',
                      borderRadius: '12px',
                      fontSize: '0.875em',
                      fontWeight: '600',
                    }}>
                      {selectedTopic.importance === 'high' ? '🔴 高' :
                       selectedTopic.importance === 'medium' ? '🟡 中' : '🟢 低'}
                    </span>
                  ) : (
                    <span style={{
                      padding: '6px 12px',
                      backgroundColor: '#F9FAFB',
                      color: '#9CA3AF',
                      borderRadius: '12px',
                      fontSize: '0.875em',
                      fontWeight: '500',
                    }}>
                      🔴 重要度: 登録なし
                    </span>
                  )}
                  {selectedTopic.keywords && selectedTopic.keywords.length > 0 ? (
                    <>
                      {selectedTopic.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#F3F4F6',
                            color: '#475569',
                            borderRadius: '12px',
                            fontSize: '0.875em',
                            fontWeight: '500',
                          }}
                        >
                          🏷️ {keyword}
                        </span>
                      ))}
                    </>
                  ) : (
                    <span style={{
                      padding: '6px 12px',
                      backgroundColor: '#F9FAFB',
                      color: '#9CA3AF',
                      borderRadius: '12px',
                      fontSize: '0.875em',
                      fontWeight: '500',
                    }}>
                      🏷️ キーワード: 登録なし
                    </span>
                  )}
                </div>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  marginTop: '8px',
                }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px', fontWeight: 600 }}>
                    要約
                  </div>
                  <div style={{ fontSize: '14px', color: selectedTopic.summary ? '#1a1a1a' : '#9CA3AF', lineHeight: '1.6', fontStyle: selectedTopic.summary ? 'normal' : 'italic' }}>
                    {selectedTopic.summary || '登録なし'}
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
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => {
                          setShowPathSearchModal(true);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#8B5CF6',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        🔍 パス検索
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowStatsModal(true);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        📈 統計
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (isExporting) return;
                          
                          setIsExporting(true);
                          setExportSuccess(false);
                          
                          try {
                            const allEntities = (pendingEntities && pendingEntities.length > 0) ? pendingEntities : (topicEntities || []);
                            const allRelations = (pendingRelations && pendingRelations.length > 0) ? pendingRelations : (topicRelations || []);
                            
                            // JSON形式でエクスポート
                            const exportData = {
                              entities: allEntities.map(e => ({
                                id: e.id,
                                name: e.name,
                                type: e.type,
                                aliases: e.aliases || [],
                                metadata: e.metadata || {},
                              })),
                              relations: allRelations.map(r => ({
                                id: r.id,
                                sourceEntityId: r.sourceEntityId,
                                targetEntityId: r.targetEntityId,
                                relationType: r.relationType,
                                description: r.description,
                                confidence: r.confidence,
                                metadata: r.metadata || {},
                              })),
                              exportedAt: new Date().toISOString(),
                              topicId: selectedTopic?.id,
                              topicTitle: selectedTopic?.title,
                            };
                            
                            const jsonStr = JSON.stringify(exportData, null, 2);
                            const blob = new Blob([jsonStr], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `knowledge-graph-${selectedTopic?.id || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            
                            setExportSuccess(true);
                            setTimeout(() => {
                              setExportSuccess(false);
                            }, 3000);
                          } catch (error: any) {
                            console.error('❌ エクスポートエラー:', error);
                            alert(`エクスポートに失敗しました: ${error.message}`);
                          } finally {
                            setIsExporting(false);
                          }
                        }}
                        disabled={isExporting}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: isExporting ? '#9CA3AF' : (exportSuccess ? '#10B981' : '#F59E0B'),
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: isExporting ? 'not-allowed' : 'pointer',
                          fontWeight: 500,
                          opacity: isExporting ? 0.7 : 1,
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {isExporting ? (
                          <>
                            <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            エクスポート中...
                          </>
                        ) : exportSuccess ? (
                          <>
                            ✅ エクスポート完了
                          </>
                        ) : (
                          <>
                            📥 エクスポート
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setKnowledgeGraphViewMode('list')}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: knowledgeGraphViewMode === 'list' ? '#3B82F6' : '#F3F4F6',
                          color: knowledgeGraphViewMode === 'list' ? '#FFFFFF' : '#6B7280',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        リスト
                      </button>
                      <button
                        onClick={() => setKnowledgeGraphViewMode('graph2d')}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: knowledgeGraphViewMode === 'graph2d' ? '#3B82F6' : '#F3F4F6',
                          color: knowledgeGraphViewMode === 'graph2d' ? '#FFFFFF' : '#6B7280',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        2Dグラフ
                      </button>
                      <button
                        onClick={() => setKnowledgeGraphViewMode('graph3d')}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: knowledgeGraphViewMode === 'graph3d' ? '#3B82F6' : '#F3F4F6',
                          color: knowledgeGraphViewMode === 'graph3d' ? '#FFFFFF' : '#6B7280',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        3Dグラフ
                      </button>
                    </div>
                  </div>
                  
                  {/* リスト表示 */}
                  {knowledgeGraphViewMode === 'list' && (
                    <>
                      {/* エンティティ表示 */}
                      <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>
                        エンティティ
                      </div>
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
                    {isLoadingEntities ? (
                      <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#6B7280' }}>
                        読み込み中...
                      </div>
                    ) : (pendingEntities && pendingEntities.length > 0) || topicEntities.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {((pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities)
                          .filter((entity) => {
                            // 検索クエリでフィルタ
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
                            // タイプでフィルタ
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
                                backgroundColor: bulkOperationMode === 'entities' && selectedEntityIds.has(entity.id) ? '#EFF6FF' : '#F9FAFB',
                                borderRadius: '8px',
                                border: bulkOperationMode === 'entities' && selectedEntityIds.has(entity.id) ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                fontSize: '14px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {bulkOperationMode === 'entities' && (
                                    <input
                                      type="checkbox"
                                      checked={selectedEntityIds.has(entity.id)}
                                      onChange={(e) => {
                                        const newSelected = new Set(selectedEntityIds);
                                        if (e.target.checked) {
                                          newSelected.add(entity.id);
                                        } else {
                                          newSelected.delete(entity.id);
                                        }
                                        setSelectedEntityIds(newSelected);
                                      }}
                                      style={{
                                        cursor: 'pointer',
                                      }}
                                    />
                                  )}
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
                                  <button
                                    onClick={() => {
                                      setMergeSourceEntity(entity);
                                      setShowMergeEntityModal(true);
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      backgroundColor: 'transparent',
                                      color: '#8B5CF6',
                                      border: '1px solid #C4B5FD',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    マージ
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`エンティティ「${entity.name}」を削除しますか？\n\n注意: このエンティティに関連するリレーションも削除されます。`)) {
                                        try {
                                          const { deleteEntity } = await import('@/lib/entityApi');
                                          await deleteEntity(entity.id);
                                          
                                          // エンティティリストから削除
                                          if (pendingEntities) {
                                            setPendingEntities(pendingEntities.filter(e => e.id !== entity.id));
                                          } else {
                                            setTopicEntities(topicEntities.filter(e => e.id !== entity.id));
                                          }
                                          
                                          // 関連するリレーションも削除
                                          const allRelations = pendingRelations || topicRelations;
                                          const relatedRelations = allRelations.filter(r => 
                                            r.sourceEntityId === entity.id || r.targetEntityId === entity.id
                                          );
                                          
                                          if (relatedRelations.length > 0) {
                                            if (pendingRelations) {
                                              setPendingRelations(pendingRelations.filter(r => 
                                                r.sourceEntityId !== entity.id && r.targetEntityId !== entity.id
                                              ));
                                            } else {
                                              setTopicRelations(topicRelations.filter(r => 
                                                r.sourceEntityId !== entity.id && r.targetEntityId !== entity.id
                                              ));
                                            }
                                          }
                                          
                                          alert('エンティティを削除しました');
                                        } catch (error: any) {
                                          console.error('❌ エンティティ削除エラー:', error);
                                          alert(`エンティティの削除に失敗しました: ${error.message}`);
                                        }
                                      }
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      backgroundColor: 'transparent',
                                      color: '#EF4444',
                                      border: '1px solid #FCA5A5',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    削除
                                  </button>
                                </div>
                              </div>
                              {entity.aliases && entity.aliases.length > 0 && (
                                <div style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>
                                  別名: {entity.aliases.join(', ')}
                                </div>
                              )}
                              {entity.metadata && Object.keys(entity.metadata).length > 0 && (
                                <div style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>
                                  メタデータ: {JSON.stringify(entity.metadata, null, 2)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic' }}>
                        登録なし
                      </div>
                    )}
                  </div>
                  
                  {/* リレーション表示 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>
                        リレーション
                        {bulkOperationMode === 'relations' && selectedRelationIds.size > 0 && (
                          <span style={{ marginLeft: '8px', fontSize: '12px', color: '#3B82F6' }}>
                            ({selectedRelationIds.size}件選択中)
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {bulkOperationMode === 'relations' ? (
                          <>
                            <button
                              onClick={async () => {
                                if (selectedRelationIds.size === 0) {
                                  alert('削除するリレーションを選択してください');
                                  return;
                                }
                                if (!confirm(`${selectedRelationIds.size}件のリレーションを削除しますか？`)) {
                                  return;
                                }
                                try {
                                  const { deleteRelation } = await import('@/lib/relationApi');
                                  const allRelations = (pendingRelations && pendingRelations.length > 0) ? pendingRelations : (topicRelations || []);
                                  const relationsToDelete = allRelations.filter(r => selectedRelationIds.has(r.id));
                                  
                                  for (const relation of relationsToDelete) {
                                    await deleteRelation(relation.id);
                                  }
                                  
                                  // 状態を更新
                                  if (pendingRelations) {
                                    setPendingRelations(pendingRelations.filter(r => !selectedRelationIds.has(r.id)));
                                  } else {
                                    setTopicRelations(topicRelations.filter(r => !selectedRelationIds.has(r.id)));
                                  }
                                  
                                  setSelectedRelationIds(new Set());
                                  setBulkOperationMode('none');
                                  alert(`${relationsToDelete.length}件のリレーションを削除しました`);
                                } catch (error: any) {
                                  console.error('❌ 一括削除エラー:', error);
                                  alert(`リレーションの一括削除に失敗しました: ${error.message}`);
                                }
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
                              選択を削除
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRelationIds(new Set());
                                setBulkOperationMode('none');
                              }}
                              style={{
                                padding: '4px 12px',
                                backgroundColor: '#6B7280',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 500,
                              }}
                            >
                              キャンセル
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setBulkOperationMode('relations')}
                              style={{
                                padding: '4px 12px',
                                backgroundColor: '#8B5CF6',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 500,
                              }}
                            >
                              ☑️ 一括選択
                            </button>
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
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* リレーション検索・フィルタバー */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <input
                        type="text"
                        placeholder="リレーションで検索（エンティティ名、説明など）..."
                        value={relationSearchQuery}
                        onChange={(e) => setRelationSearchQuery(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      />
                      <select
                        value={relationTypeFilter}
                        onChange={(e) => setRelationTypeFilter(e.target.value as RelationType | 'all')}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <option value="all">すべてのタイプ</option>
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
                    {isLoadingRelations ? (
                      <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#6B7280' }}>
                        読み込み中...
                      </div>
                    ) : (pendingRelations && pendingRelations.length > 0) || topicRelations.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {((pendingRelations && pendingRelations.length > 0) ? pendingRelations : topicRelations)
                          .filter((relation) => {
                            // 検索クエリでフィルタ
                            if (relationSearchQuery) {
                              const query = relationSearchQuery.toLowerCase();
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
                              const relationTypeLabel = relationTypeLabels[relation.relationType] || relation.relationType;
                              const relationText = `${sourceName} ${relationTypeLabel} ${targetName} ${relation.description || ''}`.toLowerCase();
                              if (!relationText.includes(query)) {
                                return false;
                              }
                            }
                            // タイプでフィルタ
                            if (relationTypeFilter !== 'all' && relation.relationType !== relationTypeFilter) {
                              return false;
                            }
                            return true;
                          })
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
                                backgroundColor: bulkOperationMode === 'relations' && selectedRelationIds.has(relation.id) ? '#EFF6FF' : '#F9FAFB',
                                borderRadius: '8px',
                                border: bulkOperationMode === 'relations' && selectedRelationIds.has(relation.id) ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                fontSize: '14px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {bulkOperationMode === 'relations' && (
                                    <input
                                      type="checkbox"
                                      checked={selectedRelationIds.has(relation.id)}
                                      onChange={(e) => {
                                        const newSelected = new Set(selectedRelationIds);
                                        if (e.target.checked) {
                                          newSelected.add(relation.id);
                                        } else {
                                          newSelected.delete(relation.id);
                                        }
                                        setSelectedRelationIds(newSelected);
                                      }}
                                      style={{
                                        cursor: 'pointer',
                                      }}
                                    />
                                  )}
                                  <div style={{ color: '#1a1a1a', fontWeight: 500 }}>
                                    <span style={{ color: '#0066CC', fontWeight: 600 }}>{sourceName}</span>{' '}
                                    <span style={{ color: '#6B7280' }}>→ [{relationTypeLabels[relation.relationType] || relation.relationType}]</span>{' '}
                                    <span style={{ color: '#0066CC', fontWeight: 600 }}>{targetName}</span>
                                  </div>
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
                                  <button
                                    onClick={async () => {
                                      if (confirm(`リレーション「${sourceName} --[${relationTypeLabels[relation.relationType] || relation.relationType}]--> ${targetName}」を削除しますか？`)) {
                                        try {
                                          const { deleteRelation } = await import('@/lib/relationApi');
                                          await deleteRelation(relation.id);
                                          
                                          // リレーションリストから削除
                                          if (pendingRelations) {
                                            setPendingRelations(pendingRelations.filter(r => r.id !== relation.id));
                                          } else {
                                            setTopicRelations(topicRelations.filter(r => r.id !== relation.id));
                                          }
                                          
                                          alert('リレーションを削除しました');
                                        } catch (error: any) {
                                          console.error('❌ リレーション削除エラー:', error);
                                          alert(`リレーションの削除に失敗しました: ${error.message}`);
                                        }
                                      }
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      backgroundColor: 'transparent',
                                      color: '#EF4444',
                                      border: '1px solid #FCA5A5',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    削除
                                  </button>
                                </div>
                              </div>
                              {relation.description && (
                                <div style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>
                                  {relation.description}
                                </div>
                              )}
                              {relation.confidence && (
                                <div style={{ color: '#9CA3AF', fontSize: '11px', marginTop: '4px' }}>
                                  信頼度: {(relation.confidence * 100).toFixed(0)}%
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic' }}>
                        登録なし
                      </div>
                    )}
                  </div>
                    </>
                  )}
                  
                  {/* 2Dグラフ表示 */}
                  {knowledgeGraphViewMode === 'graph2d' && (
                    <KnowledgeGraph2D
                      entities={(pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities}
                      relations={(pendingRelations && pendingRelations.length > 0) ? pendingRelations : topicRelations}
                      isLoading={isLoadingEntities || isLoadingRelations}
                      onEntityClick={(entity) => {
                        setEditingEntity(entity);
                        setShowAddEntityModal(true);
                      }}
                    />
                  )}
                  
                  {/* 3Dグラフ表示 */}
                  {knowledgeGraphViewMode === 'graph3d' && (
                    <KnowledgeGraph3D
                      entities={(pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities}
                      relations={(pendingRelations && pendingRelations.length > 0) ? pendingRelations : topicRelations}
                      isLoading={isLoadingEntities || isLoadingRelations}
                      onEntityClick={(entity) => {
                        setEditingEntity(entity);
                        setShowAddEntityModal(true);
                      }}
                    />
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                    トピックID
                  </div>
                  <div style={{ fontSize: '14px', color: '#1a1a1a', fontFamily: 'monospace' }}>
                    {selectedTopic.id}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                    議事録ID
                  </div>
                  <div style={{ fontSize: '14px', color: '#1a1a1a', fontFamily: 'monospace' }}>
                    {selectedTopic.meetingNoteId}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                    組織ID
                  </div>
                  <div style={{ fontSize: '14px', color: '#1a1a1a', fontFamily: 'monospace' }}>
                    {selectedTopic.organizationId}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* エンティティマージモーダル */}
      {showMergeEntityModal && mergeSourceEntity && selectedTopic && (
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
            zIndex: 3000,
          }}
          onClick={() => {
            setShowMergeEntityModal(false);
            setMergeSourceEntity(null);
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
              エンティティをマージ
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
              「<strong>{mergeSourceEntity.name}</strong>」を他のエンティティに統合します。
              <br />
              統合後、「{mergeSourceEntity.name}」は削除され、関連するリレーションも更新されます。
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                統合先のエンティティを選択 *
              </label>
              <select
                id="mergeTargetSelect"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="">選択してください</option>
                {((pendingEntities && pendingEntities.length > 0) ? pendingEntities : topicEntities)
                  .filter(e => e.id !== mergeSourceEntity.id)
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
                      <option key={entity.id} value={entity.id}>
                        {entityTypeLabels[entity.type] || '📌 その他'} {entity.name}
                      </option>
                    );
                  })}
              </select>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => {
                  setShowMergeEntityModal(false);
                  setMergeSourceEntity(null);
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
                  const targetSelect = document.getElementById('mergeTargetSelect') as HTMLSelectElement;
                  const targetId = targetSelect?.value;
                  
                  if (!targetId) {
                    alert('統合先のエンティティを選択してください');
                    return;
                  }
                  
                  if (targetId === mergeSourceEntity.id) {
                    alert('統合元と統合先が同じです');
                    return;
                  }
                  
                  if (!confirm(`「${mergeSourceEntity.name}」を選択したエンティティに統合しますか？\n\nこの操作は取り消せません。`)) {
                    return;
                  }
                  
                  try {
                    const { mergeEntities } = await import('@/lib/entityApi');
                    const merged = await mergeEntities(mergeSourceEntity.id, targetId);
                    
                    // エンティティリストを更新
                    if (pendingEntities) {
                      setPendingEntities(pendingEntities.filter(e => e.id !== mergeSourceEntity.id).map(e => 
                        e.id === targetId ? merged : e
                      ));
                    } else {
                      setTopicEntities(topicEntities.filter(e => e.id !== mergeSourceEntity.id).map(e => 
                        e.id === targetId ? merged : e
                      ));
                    }
                    
                    // リレーションを更新（sourceEntityIdまたはtargetEntityIdを更新）
                    const updateRelations = async () => {
                      const allRelations = pendingRelations || topicRelations;
                      const relationsToUpdate = allRelations.filter(r => 
                        r.sourceEntityId === mergeSourceEntity.id || r.targetEntityId === mergeSourceEntity.id
                      );
                      
                      if (relationsToUpdate.length > 0) {
                        const { updateRelation } = await import('@/lib/relationApi');
                        for (const relation of relationsToUpdate) {
                          try {
                            await updateRelation(relation.id, {
                              sourceEntityId: relation.sourceEntityId === mergeSourceEntity.id ? targetId : relation.sourceEntityId,
                              targetEntityId: relation.targetEntityId === mergeSourceEntity.id ? targetId : relation.targetEntityId,
                            });
                          } catch (error) {
                            console.error('❌ リレーション更新エラー:', error);
                          }
                        }
                        
                        // リレーションリストを再読み込み
                        if (selectedTopic) {
                          const topicEmbeddingId = `${selectedTopic.meetingNoteId}-topic-${selectedTopic.id}`;
                          const { getRelationsByTopicId } = await import('@/lib/relationApi');
                          const updatedRelations = await getRelationsByTopicId(topicEmbeddingId);
                          if (pendingRelations) {
                            setPendingRelations(updatedRelations);
                          } else {
                            setTopicRelations(updatedRelations);
                          }
                        }
                      }
                    };
                    
                    await updateRelations();
                    
                    alert('エンティティをマージしました');
                    setShowMergeEntityModal(false);
                    setMergeSourceEntity(null);
                  } catch (error: any) {
                    console.error('❌ エンティティマージエラー:', error);
                    alert(`エンティティのマージに失敗しました: ${error.message}`);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#8B5CF6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                マージ実行
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* パス検索モーダル */}
      {showPathSearchModal && selectedTopic && (
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
            zIndex: 3000,
          }}
          onClick={() => {
            setShowPathSearchModal(false);
            setPathSearchSource(null);
            setPathSearchTarget(null);
            setFoundPaths([]);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
              🔍 エンティティ間の関係パス検索
            </h3>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                  開始エンティティ
                </label>
                <select
                  value={pathSearchSource?.id || ''}
                  onChange={(e) => {
                    const entity = (pendingEntities || topicEntities).find(ent => ent.id === e.target.value);
                    setPathSearchSource(entity || null);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">選択してください</option>
                  {(pendingEntities || topicEntities).map((entity) => {
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
                      <option key={entity.id} value={entity.id}>
                        {entityTypeLabels[entity.type] || '📌 その他'} {entity.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                  終了エンティティ
                </label>
                <select
                  value={pathSearchTarget?.id || ''}
                  onChange={(e) => {
                    const entity = (pendingEntities || topicEntities).find(ent => ent.id === e.target.value);
                    setPathSearchTarget(entity || null);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">選択してください</option>
                  {(pendingEntities || topicEntities).map((entity) => {
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
                      <option key={entity.id} value={entity.id}>
                        {entityTypeLabels[entity.type] || '📌 その他'} {entity.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button
                onClick={async () => {
                  if (!pathSearchSource || !pathSearchTarget) {
                    alert('開始エンティティと終了エンティティを選択してください');
                    return;
                  }
                  
                  if (pathSearchSource.id === pathSearchTarget.id) {
                    alert('開始エンティティと終了エンティティが同じです');
                    return;
                  }
                  
                  setIsSearchingPath(true);
                  setFoundPaths([]);
                  
                  try {
                    // BFS（幅優先探索）でパスを検索
                    const allRelations = pendingRelations || topicRelations;
                    const allEntities = pendingEntities || topicEntities;
                    
                    // グラフを構築
                    const graph = new Map<string, Array<{ target: string; relation: Relation }>>();
                    for (const relation of allRelations) {
                      if (!relation.sourceEntityId || !relation.targetEntityId) continue;
                      
                      if (!graph.has(relation.sourceEntityId)) {
                        graph.set(relation.sourceEntityId, []);
                      }
                      graph.get(relation.sourceEntityId)!.push({
                        target: relation.targetEntityId,
                        relation,
                      });
                    }
                    
                    // BFSでパスを探索（最大3ホップまで）
                    const paths: Array<{ path: Entity[]; relations: Relation[] }> = [];
                    const queue: Array<{ entityId: string; path: Entity[]; relations: Relation[]; visited: Set<string> }> = [
                      {
                        entityId: pathSearchSource.id,
                        path: [pathSearchSource],
                        relations: [],
                        visited: new Set([pathSearchSource.id]),
                      },
                    ];
                    
                    while (queue.length > 0 && paths.length < 10) {
                      const current = queue.shift()!;
                      
                      if (current.path.length > 4) continue; // 最大3ホップ
                      
                      if (current.entityId === pathSearchTarget.id && current.path.length > 1) {
                        paths.push({
                          path: current.path,
                          relations: current.relations,
                        });
                        continue;
                      }
                      
                      const neighbors = graph.get(current.entityId) || [];
                      for (const neighbor of neighbors) {
                        if (!current.visited.has(neighbor.target)) {
                          const neighborEntity = allEntities.find(e => e.id === neighbor.target);
                          if (neighborEntity) {
                            queue.push({
                              entityId: neighbor.target,
                              path: [...current.path, neighborEntity],
                              relations: [...current.relations, neighbor.relation],
                              visited: new Set([...current.visited, neighbor.target]),
                            });
                          }
                        }
                      }
                    }
                    
                    setFoundPaths(paths);
                  } catch (error: any) {
                    console.error('❌ パス検索エラー:', error);
                    alert(`パス検索に失敗しました: ${error.message}`);
                  } finally {
                    setIsSearchingPath(false);
                  }
                }}
                disabled={isSearchingPath || !pathSearchSource || !pathSearchTarget}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isSearchingPath || !pathSearchSource || !pathSearchTarget ? '#D1D5DB' : '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: isSearchingPath || !pathSearchSource || !pathSearchTarget ? 'not-allowed' : 'pointer',
                }}
              >
                {isSearchingPath ? '検索中...' : 'パスを検索'}
              </button>
              
              <button
                onClick={() => {
                  setShowPathSearchModal(false);
                  setPathSearchSource(null);
                  setPathSearchTarget(null);
                  setFoundPaths([]);
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
                閉じる
              </button>
            </div>
            
            {foundPaths.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                  見つかったパス: {foundPaths.length}件
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {foundPaths.map((pathData, index) => {
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
                        key={index}
                        style={{
                          padding: '12px',
                          backgroundColor: '#F9FAFB',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#6B7280' }}>
                          パス #{index + 1} ({pathData.path.length - 1}ホップ)
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          {pathData.path.map((entity, entityIndex) => (
                            <React.Fragment key={`${entity.id}-${entityIndex}`}>
                              <div
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                              >
                                {entityTypeLabels[entity.type] || '📌 その他'} {entity.name}
                              </div>
                              {entityIndex < pathData.path.length - 1 && pathData.relations[entityIndex] && (
                                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                  → [{relationTypeLabels[pathData.relations[entityIndex]?.relationType] || pathData.relations[entityIndex]?.relationType}]
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {foundPaths.length === 0 && !isSearchingPath && pathSearchSource && pathSearchTarget && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic' }}>
                パスが見つかりませんでした
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* エンティティ追加・編集モーダル */}
      {showAddEntityModal && selectedTopic && (
        <EntityModal
          entity={editingEntity}
          organizationId={selectedTopic.organizationId}
          existingEntities={pendingEntities || topicEntities}
          allRelations={pendingRelations || topicRelations}
          onClose={() => {
            setShowAddEntityModal(false);
            setEditingEntity(null);
          }}
          onSave={async (entityData) => {
            try {
              const { createEntity, updateEntity } = await import('@/lib/entityApi');
              
              if (editingEntity) {
                // 更新
                const updated = await updateEntity(editingEntity.id, entityData);
                if (!updated) {
                  throw new Error('エンティティの更新に失敗しました');
                }
                if (pendingEntities) {
                  setPendingEntities(pendingEntities.map(e => e.id === editingEntity.id ? updated : e));
                } else {
                  setTopicEntities(topicEntities.map(e => e.id === editingEntity.id ? updated : e));
                }
                alert('エンティティを更新しました');
              } else {
                // 新規作成
                const created = await createEntity({
                  ...entityData,
                  organizationId: selectedTopic.organizationId,
                });
                if (pendingEntities) {
                  setPendingEntities([...pendingEntities, created]);
                } else {
                  setTopicEntities([...topicEntities, created]);
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
        />
      )}
      
      {/* リレーション追加・編集モーダル */}
      {showAddRelationModal && selectedTopic && (
        <RelationModal
          relation={editingRelation}
          organizationId={selectedTopic.organizationId}
          topicId={`${selectedTopic.meetingNoteId}-topic-${selectedTopic.id}`}
          existingRelations={pendingRelations || topicRelations}
          availableEntities={pendingEntities || topicEntities}
          onClose={() => {
            setShowAddRelationModal(false);
            setEditingRelation(null);
          }}
          onSave={async (relationData) => {
            try {
              const { createRelation, updateRelation } = await import('@/lib/relationApi');
              
              if (editingRelation) {
                // 更新
                const updated = await updateRelation(editingRelation.id, relationData);
                if (!updated) {
                  throw new Error('リレーションの更新に失敗しました');
                }
                if (pendingRelations) {
                  setPendingRelations(pendingRelations.map(r => r.id === editingRelation.id ? updated : r));
                } else {
                  setTopicRelations(topicRelations.map(r => r.id === editingRelation.id ? updated : r));
                }
                alert('リレーションを更新しました');
              } else {
                // 新規作成
                const created = await createRelation({
                  ...relationData,
                  topicId: `${selectedTopic.meetingNoteId}-topic-${selectedTopic.id}`,
                  organizationId: selectedTopic.organizationId,
                });
                if (pendingRelations) {
                  setPendingRelations([...pendingRelations, created]);
                } else {
                  setTopicRelations([...topicRelations, created]);
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
        />
      )}
      
      {/* 統計情報モーダル */}
      {showStatsModal && (
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
            zIndex: 3000,
          }}
          onClick={() => setShowStatsModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>
                📊 ナレッジグラフ統計情報
              </h3>
              <button
                onClick={() => setShowStatsModal(false)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6B7280',
                }}
              >
                ×
              </button>
            </div>
            
            {(() => {
              const allEntities = (pendingEntities && pendingEntities.length > 0) ? pendingEntities : (topicEntities || []);
              const allRelations = (pendingRelations && pendingRelations.length > 0) ? pendingRelations : (topicRelations || []);
              
              // エンティティタイプ別の集計
              const entityTypeCounts: Record<string, number> = {};
              allEntities.forEach(e => {
                entityTypeCounts[e.type] = (entityTypeCounts[e.type] || 0) + 1;
              });
              
              // リレーションタイプ別の集計
              const relationTypeCounts: Record<string, number> = {};
              allRelations.forEach(r => {
                relationTypeCounts[r.relationType] = (relationTypeCounts[r.relationType] || 0) + 1;
              });
              
              // 最も関連が多いエンティティ
              const entityRelationCounts: Record<string, number> = {};
              allRelations.forEach(r => {
                if (r.sourceEntityId) entityRelationCounts[r.sourceEntityId] = (entityRelationCounts[r.sourceEntityId] || 0) + 1;
                if (r.targetEntityId) entityRelationCounts[r.targetEntityId] = (entityRelationCounts[r.targetEntityId] || 0) + 1;
              });
              const topEntities = Object.entries(entityRelationCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([id, count]) => {
                  const entity = allEntities.find(e => e.id === id);
                  return { name: entity?.name || id, count };
                });
              
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* エンティティ統計 */}
                  <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>
                      【エンティティ】
                    </div>
                    <div style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                      総数: <strong>{allEntities.length}件</strong>
                    </div>
                    {Object.entries(entityTypeCounts).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {Object.entries(entityTypeCounts).map(([type, count]) => (
                          <div key={type} style={{ fontSize: '13px', color: '#6B7280', paddingLeft: '12px' }}>
                            {entityTypeLabels[type] || type}: {count}件
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>
                        エンティティがありません
                      </div>
                    )}
                  </div>
                  
                  {/* リレーション統計 */}
                  <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>
                      【リレーション】
                    </div>
                    <div style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                      総数: <strong>{allRelations.length}件</strong>
                    </div>
                    {Object.entries(relationTypeCounts).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {Object.entries(relationTypeCounts).map(([type, count]) => (
                          <div key={type} style={{ fontSize: '13px', color: '#6B7280', paddingLeft: '12px' }}>
                            {relationTypeLabels[type] || type}: {count}件
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>
                        リレーションがありません
                      </div>
                    )}
                  </div>
                  
                  {/* 最も関連が多いエンティティ */}
                  {topEntities.length > 0 && (
                    <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>
                        【最も関連が多いエンティティ（上位5件）】
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {topEntities.map((e, i) => (
                          <div key={i} style={{ fontSize: '13px', color: '#6B7280', paddingLeft: '12px' }}>
                            {i + 1}. {e.name} (<strong>{e.count}件</strong>のリレーション)
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* グラフ密度 */}
                  <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>
                      【グラフ密度】
                    </div>
                    <div style={{ fontSize: '14px', color: '#374151' }}>
                      平均リレーション数/エンティティ: <strong>{allEntities.length > 0 ? (allRelations.length / allEntities.length).toFixed(2) : '0'}</strong>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={async () => {
                  if (isExporting) return;
                  
                  setIsExporting(true);
                  setExportSuccess(false);
                  
                  try {
                    const allEntities = (pendingEntities && pendingEntities.length > 0) ? pendingEntities : (topicEntities || []);
                    const allRelations = (pendingRelations && pendingRelations.length > 0) ? pendingRelations : (topicRelations || []);
                    
                    // CSV形式でエクスポート
                    const csvRows: string[] = [];
                    
                    // エンティティCSV
                    csvRows.push('=== エンティティ ===');
                    csvRows.push('ID,名前,タイプ,別名');
                    allEntities.forEach(e => {
                      csvRows.push(`"${e.id}","${e.name}","${e.type}","${(e.aliases || []).join('; ')}"`);
                    });
                    
                    csvRows.push('');
                    csvRows.push('=== リレーション ===');
                    csvRows.push('ID,起点エンティティID,終点エンティティID,リレーションタイプ,説明');
                    allRelations.forEach(r => {
                      const sourceName = allEntities.find(e => e.id === r.sourceEntityId)?.name || r.sourceEntityId;
                      const targetName = allEntities.find(e => e.id === r.targetEntityId)?.name || r.targetEntityId;
                      csvRows.push(`"${r.id}","${sourceName}","${targetName}","${r.relationType}","${r.description || ''}"`);
                    });
                    
                    const csvStr = csvRows.join('\n');
                    const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `knowledge-graph-${selectedTopic?.id || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    setExportSuccess(true);
                    setTimeout(() => {
                      setExportSuccess(false);
                    }, 3000);
                  } catch (error: any) {
                    console.error('❌ CSVエクスポートエラー:', error);
                    alert(`CSVエクスポートに失敗しました: ${error.message}`);
                  } finally {
                    setIsExporting(false);
                  }
                }}
                disabled={isExporting}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isExporting ? '#9CA3AF' : (exportSuccess ? '#10B981' : '#F59E0B'),
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  opacity: isExporting ? 0.7 : 1,
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isExporting ? (
                  <>
                    <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    エクスポート中...
                  </>
                ) : exportSuccess ? (
                  <>
                    ✅ CSVエクスポート完了
                  </>
                ) : (
                  <>
                    📥 CSVエクスポート
                  </>
                )}
              </button>
              <button
                onClick={() => setShowStatsModal(false)}
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
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// エンティティ追加・編集モーダルコンポーネント
function EntityModal({
  entity,
  organizationId,
  existingEntities,
  allRelations,
  onClose,
  onSave,
}: {
  entity: Entity | null;
  organizationId: string;
  existingEntities: Entity[];
  allRelations: Relation[];
  onClose: () => void;
  onSave: (data: { name: string; type: EntityType; aliases?: string[]; metadata?: any }) => Promise<void>;
}) {
  const [name, setName] = useState(entity?.name || '');
  const [type, setType] = useState<EntityType>(entity?.type || 'other');
  const [aliases, setAliases] = useState<string>(entity?.aliases?.join(', ') || '');
  const [isSaving, setIsSaving] = useState(false);
  const [similarEntities, setSimilarEntities] = useState<Array<{ entity: Entity; similarity: number }>>([]);
  const [isCheckingSimilar, setIsCheckingSimilar] = useState(false);
  
  // エンティティに関連するリレーションを取得
  const relatedRelations = entity ? allRelations.filter(r => 
    r.sourceEntityId === entity.id || r.targetEntityId === entity.id
  ) : [];
  
  // エンティティ名が変更されたときに類似エンティティを検出（新規作成時のみ）
  useEffect(() => {
    if (!entity && name.trim().length >= 2) {
      const checkSimilar = async () => {
        setIsCheckingSimilar(true);
        try {
          const { findSimilarEntities } = await import('@/lib/entityApi');
          const similar = await findSimilarEntities(name.trim(), organizationId, 0.7);
          // 既存のエンティティリストから除外
          const filtered = similar.filter(s => 
            !existingEntities.some(e => e.id === s.entity.id)
          );
          setSimilarEntities(filtered.slice(0, 5)); // 最大5件まで表示
        } catch (error) {
          console.error('❌ 類似エンティティ検出エラー:', error);
          setSimilarEntities([]);
        } finally {
          setIsCheckingSimilar(false);
        }
      };
      
      // デバウンス処理（500ms待機）
      const timer = setTimeout(checkSimilar, 500);
      return () => clearTimeout(timer);
    } else {
      setSimilarEntities([]);
    }
  }, [name, entity, organizationId, existingEntities]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('エンティティ名を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        type,
        aliases: aliases.trim() ? aliases.split(',').map(a => a.trim()).filter(Boolean) : undefined,
        metadata: {},
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
        zIndex: 3000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
          {entity ? 'エンティティ編集' : 'エンティティ追加'}
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            エンティティ名 *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
            }}
            placeholder="例: トヨタ自動車"
          />
          {isCheckingSimilar && (
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              🔍 類似エンティティを検索中...
            </div>
          )}
          {!entity && similarEntities.length > 0 && (
            <div style={{ 
              marginTop: '12px', 
              padding: '12px', 
              backgroundColor: '#FEF3C7', 
              border: '1px solid #FCD34D',
              borderRadius: '6px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400E', marginBottom: '8px' }}>
                ⚠️ 類似するエンティティが見つかりました
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {similarEntities.map(({ entity: similarEntity, similarity }) => {
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
                      key={similarEntity.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 500 }}>
                          {entityTypeLabels[similarEntity.type] || '📌 その他'} {similarEntity.name}
                        </span>
                        <span style={{ color: '#6B7280', marginLeft: '8px' }}>
                          (類似度: {Math.round(similarity * 100)}%)
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setName(similarEntity.name);
                          setType(similarEntity.type);
                          if (similarEntity.aliases && similarEntity.aliases.length > 0) {
                            setAliases(similarEntity.aliases.join(', '));
                          }
                          setSimilarEntities([]);
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#3B82F6',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        使用
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            タイプ *
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EntityType)}
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
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500 }}>
              別名（エイリアス）
            </label>
            <button
              type="button"
              onClick={() => {
                const newAlias = prompt('新しい別名を入力してください:');
                if (newAlias && newAlias.trim()) {
                  const currentAliases = aliases.trim() 
                    ? aliases.split(',').map(a => a.trim()).filter(Boolean)
                    : [];
                  if (!currentAliases.includes(newAlias.trim())) {
                    setAliases([...currentAliases, newAlias.trim()].join(', '));
                  } else {
                    alert('この別名は既に登録されています');
                  }
                }
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              + 追加
            </button>
          </div>
          <div style={{ marginBottom: '8px' }}>
            {aliases.trim() ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {aliases.split(',').map(a => a.trim()).filter(Boolean).map((alias, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <span>{alias}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const currentAliases = aliases.split(',').map(a => a.trim()).filter(Boolean);
                        currentAliases.splice(index, 1);
                        setAliases(currentAliases.join(', '));
                      }}
                      style={{
                        padding: '0',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        fontSize: '14px',
                        lineHeight: '1',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', marginBottom: '8px' }}>
                別名が登録されていません
              </div>
            )}
          </div>
          <input
            type="text"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
            }}
            placeholder="例: トヨタ, Toyota（カンマ区切りで複数入力可能）"
          />
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            💡 ヒント: 別名は表記ゆれや略称を管理するために使用します。例: 「トヨタ自動車」の別名として「トヨタ」「Toyota」を登録
          </div>
        </div>
        
        {/* 関連リレーション表示（編集時のみ） */}
        {entity && relatedRelations.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>
              📊 関連リレーション ({relatedRelations.length}件)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {relatedRelations.map((relation) => {
                const sourceEntity = existingEntities.find(e => e.id === relation.sourceEntityId);
                const targetEntity = existingEntities.find(e => e.id === relation.targetEntityId);
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
                const relationTypeLabel = relationTypeLabels[relation.relationType] || relation.relationType;
                const isSource = relation.sourceEntityId === entity.id;
                
                return (
                  <div
                    key={relation.id}
                    style={{
                      padding: '8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 500, color: '#1a1a1a' }}>
                      {isSource ? (
                        <>
                          <span style={{ color: '#3B82F6' }}>{entity.name}</span>
                          {' → '}
                          <span>{targetName}</span>
                        </>
                      ) : (
                        <>
                          <span>{sourceName}</span>
                          {' → '}
                          <span style={{ color: '#3B82F6' }}>{entity.name}</span>
                        </>
                      )}
                    </div>
                    <div style={{ color: '#6B7280', marginTop: '4px' }}>
                      タイプ: {relationTypeLabel}
                      {relation.description && ` - ${relation.description}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {entity && relatedRelations.length === 0 && (
          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center' }}>
            関連リレーションはありません
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

// リレーション追加・編集モーダルコンポーネント
function RelationModal({
  relation,
  organizationId,
  topicId,
  existingRelations,
  availableEntities,
  onClose,
  onSave,
}: {
  relation: Relation | null;
  organizationId: string;
  topicId: string;
  existingRelations: Relation[];
  availableEntities: Entity[];
  onClose: () => void;
  onSave: (data: { sourceEntityId: string; targetEntityId: string; relationType: RelationType; description?: string }) => Promise<void>;
}) {
  const [sourceEntityId, setSourceEntityId] = useState(relation?.sourceEntityId || '');
  const [targetEntityId, setTargetEntityId] = useState(relation?.targetEntityId || '');
  const [relationType, setRelationType] = useState<RelationType>(relation?.relationType || 'related-to');
  const [description, setDescription] = useState(relation?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

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
  
  // バリデーション実行
  const handleValidate = async () => {
    if (!sourceEntityId || !targetEntityId) {
      alert('起点エンティティと終点エンティティを選択してください');
      return;
    }
    
    setIsValidating(true);
    try {
      const { validateRelation } = await import('@/lib/relationApi');
      const relationToValidate: Relation = {
        id: relation?.id || '',
        topicId: topicId,
        organizationId: organizationId,
        sourceEntityId,
        targetEntityId,
        relationType,
        description: description || undefined,
        confidence: relation?.confidence,
        metadata: relation?.metadata,
        createdAt: relation?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const result = await validateRelation(relationToValidate);
      setValidationResult(result);
      
      if (!result.isValid) {
        alert(`バリデーションエラー:\n${result.errors.join('\n')}`);
      } else if (result.warnings.length > 0) {
        alert(`警告:\n${result.warnings.join('\n')}`);
      } else {
        alert('バリデーション成功: エラーはありません');
      }
    } catch (error: any) {
      console.error('❌ バリデーションエラー:', error);
      alert(`バリデーションに失敗しました: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!sourceEntityId || !targetEntityId) {
      alert('起点エンティティと終点エンティティを選択してください');
      return;
    }

    if (sourceEntityId === targetEntityId) {
      alert('起点エンティティと終点エンティティは異なるものを選択してください');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        sourceEntityId,
        targetEntityId,
        relationType,
        description: description.trim() || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
        zIndex: 3000,
      }}
      onClick={onClose}
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
          {relation ? 'リレーション編集' : 'リレーション追加'}
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            起点エンティティ *
          </label>
          <select
            value={sourceEntityId}
            onChange={(e) => setSourceEntityId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">選択してください</option>
            {availableEntities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name} ({entity.type === 'person' ? '👤' : entity.type === 'company' ? '🏢' : entity.type === 'product' ? '📦' : '📌'})
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            リレーションタイプ *
          </label>
          <select
            value={relationType}
            onChange={(e) => setRelationType(e.target.value as RelationType)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            {Object.entries(relationTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            終点エンティティ *
          </label>
          <select
            value={targetEntityId}
            onChange={(e) => setTargetEntityId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">選択してください</option>
            {availableEntities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name} ({entity.type === 'person' ? '👤' : entity.type === 'company' ? '🏢' : entity.type === 'product' ? '📦' : '📌'})
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            説明（オプション）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical',
            }}
            placeholder="例: トヨタ自動車はCTCと提携している"
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
