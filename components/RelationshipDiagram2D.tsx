'use client';

import React, { useEffect, useRef, useState } from 'react';
import { zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TopicInfo } from '@/lib/orgApi';
import type { TopicSemanticCategory } from '@/types/topicMetadata';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';
import { getRelationsByTopicId } from '@/lib/relationApi';
import { getEntitiesByOrganizationId, getEntitiesByCompanyId } from '@/lib/entityApi';
import type { Entity, EntityType } from '@/types/entity';
import type { Relation, RelationType } from '@/types/relation';
import KnowledgeGraph2D from './KnowledgeGraph2D';
import KnowledgeGraph3D from './KnowledgeGraph3D';
import { getOrgTreeFromDb, getAllOrganizationsFromTree, getOrgMembers } from '@/lib/orgApi';
import type { OrgNodeData } from '@/lib/orgApi';
import { useMemo } from 'react';
import type { RelationshipNode, RelationshipLink, RelationshipDiagram2DProps } from './RelationshipDiagram2D/types';
import { DESIGN } from './RelationshipDiagram2D/constants';
import { wrapText, getNodeRadius, getCollisionRadius, isDateInRange } from './RelationshipDiagram2D/utils';
import EntityModal from './RelationshipDiagram2D/modals/EntityModal';
import RelationModal from './RelationshipDiagram2D/modals/RelationModal';
import PathSearchModal from './RelationshipDiagram2D/modals/PathSearchModal';
import StatsModal from './RelationshipDiagram2D/modals/StatsModal';
import TopicDetailModal from './RelationshipDiagram2D/modals/TopicDetailModal';
import { useRelationshipFilters } from './RelationshipDiagram2D/hooks/useRelationshipFilters';
import { useGraphSimulation } from './RelationshipDiagram2D/hooks/useGraphSimulation';
import { useTopicManagement } from './RelationshipDiagram2D/hooks/useTopicManagement';
import { useEntityRelationManagement } from './RelationshipDiagram2D/hooks/useEntityRelationManagement';

export type { RelationshipNode, RelationshipLink, RelationshipDiagram2DProps };

export default function RelationshipDiagram2D({
  width = 1200,
  height = 800,
  nodes,
  links,
  selectedThemeId,
  onNodeClick,
  onTopicMetadataSaved,
  maxNodes = 1000,
}: RelationshipDiagram2DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
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
  const [showTopics, setShowTopics] = useState(false);
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
  const [showOrganizationFilter, setShowOrganizationFilter] = useState(false);
  const [showMemberFilter, setShowMemberFilter] = useState(false);
  const [showImportanceFilter, setShowImportanceFilter] = useState(false);

  // フィルタリングロジックをカスタムフックで管理
  const {
    selectedOrganizationIds,
    setSelectedOrganizationIds,
    selectedMemberIds,
    setSelectedMemberIds,
    dateRangeStart,
    setDateRangeStart,
    dateRangeEnd,
    setDateRangeEnd,
    selectedImportance,
    setSelectedImportance,
    isLoadingFilters,
    setIsLoadingFilters,
    filteredNodes,
    filteredLinks,
    resetFilters,
    hasActiveFilters,
  } = useRelationshipFilters({
    nodes,
    links,
    members,
    maxNodes,
    showTopics,
  });

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

  useEffect(() => {
    if (modelType === 'local') {
      loadLocalModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelType]);

  useEffect(() => {
    const loadFilterData = async () => {
      setIsLoadingFilters(true);
      try {
        const tree = await getOrgTreeFromDb();
        setOrgTree(tree);
        
        if (tree) {
          const orgList = getAllOrganizationsFromTree(tree);
          setOrganizations(orgList);
          
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
        const topicEmbeddingId = `${selectedTopic.meetingNoteId}-topic-${selectedTopic.id}`;
        
        const relations = await getRelationsByTopicId(topicEmbeddingId);
        setTopicRelations(relations);

        const allEntities = selectedTopic.companyId
          ? await getEntitiesByCompanyId(selectedTopic.companyId)
          : await getEntitiesByOrganizationId(selectedTopic.organizationId);
        const topicEntities = allEntities.filter(e => {
          if (!e.metadata || typeof e.metadata !== 'object') return false;
          return 'topicId' in e.metadata && e.metadata.topicId === selectedTopic.id;
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

  const isDateInRange = (dateStr: string | null | undefined, startDate: string, endDate: string): boolean => {
    if (dateStr === null || dateStr === undefined || dateStr === '') {
      return true;
    }
    
    if (!startDate && !endDate) {
      return true;
    }
    
    try {
      const topicDate = new Date(dateStr);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && !end) {
        return topicDate >= start;
      }
      
      if (!start && end) {
        return topicDate <= end;
      }
      
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

  // D3.jsグラフ描画ロジックをカスタムフックで管理
  const { simulationRef, zoomRef } = useGraphSimulation({
    svgRef,
    filteredNodes,
    filteredLinks,
    width,
    height,
    onNodeClick,
    selectedThemeId,
    maxNodes,
    hoveredNodeId,
    setHoveredNodeId,
    setSelectedTopic,
  });

  // トピック管理ロジックをカスタムフックで管理
  const { handleAIGenerateMetadata, handleSaveMetadata } = useTopicManagement({
    selectedTopic,
    setSelectedTopic,
    pendingMetadata,
    setPendingMetadata,
    pendingEntities,
    setPendingEntities,
    pendingRelations,
    setPendingRelations,
    topicEntities,
    setTopicEntities,
    topicRelations,
    setTopicRelations,
    isGeneratingMetadata,
    setIsGeneratingMetadata,
    isSavingMetadata,
    setIsSavingMetadata,
    selectedModel,
    metadataMode,
    onTopicMetadataSaved,
  });

  // エンティティ・リレーション管理ロジックをカスタムフックで管理
  const { handleEntitySave, handleRelationSave, handleExport } = useEntityRelationManagement({
    selectedTopic,
    pendingEntities,
    setPendingEntities,
    pendingRelations,
    setPendingRelations,
    topicEntities,
    setTopicEntities,
    topicRelations,
    setTopicRelations,
    editingEntity,
    setEditingEntity,
    editingRelation,
    setEditingRelation,
    showAddEntityModal,
    setShowAddEntityModal,
    showAddRelationModal,
    setShowAddRelationModal,
    isExporting,
    setIsExporting,
    exportSuccess,
    setExportSuccess,
  });

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
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
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
      {hasActiveFilters && (
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
        <TopicDetailModal
          selectedTopic={selectedTopic}
          onClose={() => {
            setSelectedTopic(null);
            setPendingMetadata(null);
          }}
          onTopicMetadataSaved={onTopicMetadataSaved}
          pendingMetadata={pendingMetadata}
          setPendingMetadata={setPendingMetadata}
          isGeneratingMetadata={isGeneratingMetadata}
          setIsGeneratingMetadata={setIsGeneratingMetadata}
          isSavingMetadata={isSavingMetadata}
          setIsSavingMetadata={setIsSavingMetadata}
          isEditingTopicDate={isEditingTopicDate}
          setIsEditingTopicDate={setIsEditingTopicDate}
          editingTopicDate={editingTopicDate}
          setEditingTopicDate={setEditingTopicDate}
          editingTopicTime={editingTopicTime}
          setEditingTopicTime={setEditingTopicTime}
          isAllPeriods={isAllPeriods}
          setIsAllPeriods={setIsAllPeriods}
          isSavingTopicDate={isSavingTopicDate}
          setIsSavingTopicDate={setIsSavingTopicDate}
          setSelectedTopic={setSelectedTopic}
          topicEntities={topicEntities}
          setTopicEntities={setTopicEntities}
          topicRelations={topicRelations}
          setTopicRelations={setTopicRelations}
          isLoadingEntities={isLoadingEntities}
          isLoadingRelations={isLoadingRelations}
          pendingEntities={pendingEntities}
          setPendingEntities={setPendingEntities}
          pendingRelations={pendingRelations}
          setPendingRelations={setPendingRelations}
          showAddEntityModal={showAddEntityModal}
          setShowAddEntityModal={setShowAddEntityModal}
          showAddRelationModal={showAddRelationModal}
          setShowAddRelationModal={setShowAddRelationModal}
          editingEntity={editingEntity}
          setEditingEntity={setEditingEntity}
          editingRelation={editingRelation}
          setEditingRelation={setEditingRelation}
          showMergeEntityModal={showMergeEntityModal}
          setShowMergeEntityModal={setShowMergeEntityModal}
          mergeSourceEntity={mergeSourceEntity}
          setMergeSourceEntity={setMergeSourceEntity}
          showPathSearchModal={showPathSearchModal}
          setShowPathSearchModal={setShowPathSearchModal}
          showStatsModal={showStatsModal}
          setShowStatsModal={setShowStatsModal}
          knowledgeGraphViewMode={knowledgeGraphViewMode}
          setKnowledgeGraphViewMode={setKnowledgeGraphViewMode}
          entitySearchQuery={entitySearchQuery}
          setEntitySearchQuery={setEntitySearchQuery}
          entityTypeFilter={entityTypeFilter}
          setEntityTypeFilter={setEntityTypeFilter}
          relationSearchQuery={relationSearchQuery}
          setRelationSearchQuery={setRelationSearchQuery}
          relationTypeFilter={relationTypeFilter}
          setRelationTypeFilter={setRelationTypeFilter}
          selectedEntityIds={selectedEntityIds}
          setSelectedEntityIds={setSelectedEntityIds}
          selectedRelationIds={selectedRelationIds}
          setSelectedRelationIds={setSelectedRelationIds}
          bulkOperationMode={bulkOperationMode}
          setBulkOperationMode={setBulkOperationMode}
          isExporting={isExporting}
          setIsExporting={setIsExporting}
          exportSuccess={exportSuccess}
          setExportSuccess={setExportSuccess}
          modelType={modelType}
          setModelType={setModelType}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          metadataMode={metadataMode}
          setMetadataMode={setMetadataMode}
          loadingLocalModels={loadingLocalModels}
          availableModels={availableModels}
          handleAIGenerateMetadata={handleAIGenerateMetadata}
          handleSaveMetadata={handleSaveMetadata}
        />
      )}
      
      {/* パス検索モーダル */}
      {/* パス検索モーダル */}
      {showPathSearchModal && selectedTopic && (
        <PathSearchModal
          isOpen={showPathSearchModal}
          topicEntities={topicEntities}
          pendingEntities={pendingEntities}
          topicRelations={topicRelations}
          pendingRelations={pendingRelations}
          onClose={() => {
            setShowPathSearchModal(false);
          }}
        />
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
          onSave={handleEntitySave}
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
          onSave={handleRelationSave}
        />
      )}
      
      {/* 統計情報モーダル */}
      <StatsModal
        isOpen={showStatsModal}
        topicEntities={topicEntities}
        pendingEntities={pendingEntities}
        topicRelations={topicRelations}
        pendingRelations={pendingRelations}
        selectedTopic={selectedTopic}
        isExporting={isExporting}
        exportSuccess={exportSuccess}
        onClose={() => setShowStatsModal(false)}
        onExport={handleExport}
      />
    </div>
  );
}
