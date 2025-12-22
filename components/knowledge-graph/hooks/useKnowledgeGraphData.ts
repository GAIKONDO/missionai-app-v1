'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAllEntities, getEntityById } from '@/lib/entityApi';
import { getAllRelations, getRelationById } from '@/lib/relationApi';
import { getAllTopicsBatch, getOrgTreeFromDb, getAllOrganizationsFromTree, getAllMembersBatch } from '@/lib/orgApi';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { TopicInfo } from '@/lib/orgApi';

// 開発環境でのみログを有効化するヘルパー関数
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

interface UseKnowledgeGraphDataReturn {
  entities: Entity[];
  relations: Relation[];
  topics: TopicInfo[];
  organizations: Array<{ id: string; name: string; title?: string; type?: string }>;
  members: Array<{ id: string; name: string; position?: string; organizationId: string }>;
  isLoading: boolean;
  isLoadingFilters: boolean;
  searchResultEntityIds: Set<string>;
  searchResultRelationIds: Set<string>;
  highlightedEntityId: string | null;
  highlightedRelationId: string | null;
  selectedEntity: Entity | null;
  selectedRelation: Relation | null;
  viewMode: 'list' | 'graph2d' | 'graph3d';
  setEntities: React.Dispatch<React.SetStateAction<Entity[]>>;
  setRelations: React.Dispatch<React.SetStateAction<Relation[]>>;
  setTopics: React.Dispatch<React.SetStateAction<TopicInfo[]>>;
  setOrganizations: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; title?: string; type?: string }>>>;
  setMembers: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; position?: string; organizationId: string }>>>;
  setSearchResultEntityIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSearchResultRelationIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setHighlightedEntityId: React.Dispatch<React.SetStateAction<string | null>>;
  setHighlightedRelationId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedEntity: React.Dispatch<React.SetStateAction<Entity | null>>;
  setSelectedRelation: React.Dispatch<React.SetStateAction<Relation | null>>;
  setViewMode: React.Dispatch<React.SetStateAction<'list' | 'graph2d' | 'graph3d'>>;
}

export function useKnowledgeGraphData(): UseKnowledgeGraphDataReturn {
  const searchParams = useSearchParams();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; title?: string; type?: string }>>([]);
  const [members, setMembers] = useState<Array<{ id: string; name: string; position?: string; organizationId: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'graph2d' | 'graph3d'>('graph3d');
  const [highlightedEntityId, setHighlightedEntityId] = useState<string | null>(null);
  const [highlightedRelationId, setHighlightedRelationId] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<Relation | null>(null);
  const [searchResultEntityIds, setSearchResultEntityIds] = useState<Set<string>>(new Set());
  const [searchResultRelationIds, setSearchResultRelationIds] = useState<Set<string>>(new Set());

  // メインデータの読み込み
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        devLog('📖 [ナレッジグラフ] データ読み込み開始');
        
        // Promise.allSettledを使用して、一部が失敗しても続行
        const results = await Promise.allSettled([
          getAllEntities(),
          getAllRelations(),
          getAllTopicsBatch(),
        ]);
        
        const allEntities = results[0].status === 'fulfilled' ? results[0].value : [];
        const allRelations = results[1].status === 'fulfilled' ? results[1].value : [];
        const allTopics = results[2].status === 'fulfilled' ? results[2].value : [];
        
        // エラーがあった場合はログに出力（エラーログは残す）
        if (results[0].status === 'rejected') {
          console.error('❌ [ナレッジグラフ] エンティティの読み込みエラー:', results[0].reason);
        }
        if (results[1].status === 'rejected') {
          console.error('❌ [ナレッジグラフ] リレーションの読み込みエラー:', results[1].reason);
        }
        if (results[2].status === 'rejected') {
          console.error('❌ [ナレッジグラフ] トピックの読み込みエラー:', results[2].reason);
        }
        
        setEntities(allEntities);
        setRelations(allRelations);
        setTopics(allTopics);
        
        // 組織ツリーを取得して、typeで組織と事業会社を区別
        const orgTreeData = await getOrgTreeFromDb();
        if (orgTreeData) {
          const allOrgs = getAllOrganizationsFromTree(orgTreeData);
          setOrganizations(allOrgs.map(org => ({
            id: org.id,
            name: org.name || org.title || org.id,
            title: org.title,
            type: (org as any).type || 'organization',
          })));
        }
        
        devLog('✅ ナレッジグラフデータ読み込み完了:', {
          entities: allEntities.length,
          relations: allRelations.length,
          topics: allTopics.length,
        });

        // URLパラメータからエンティティIDまたはリレーションIDを取得
        const entityId = searchParams?.get('entityId');
        const relationId = searchParams?.get('relationId');
        const entityIdsParam = searchParams?.get('entityIds');
        const relationIdsParam = searchParams?.get('relationIds');
        const topicIdsParam = searchParams?.get('topicIds');
        const fromSearch = searchParams?.get('fromSearch') === 'true';

        // 検索結果モードの場合、IDリストを保存
        if (fromSearch && (entityIdsParam || relationIdsParam || topicIdsParam)) {
          if (entityIdsParam) {
            const ids = entityIdsParam.split(',').filter(id => id.trim());
            setSearchResultEntityIds(new Set(ids));
          }
          if (relationIdsParam) {
            const ids = relationIdsParam.split(',').filter(id => id.trim());
            setSearchResultRelationIds(new Set(ids));
          }
          setViewMode('graph3d'); // グラフ表示に切り替え
        }

        if (entityId) {
          try {
            const entity = await getEntityById(entityId);
            if (entity) {
              setHighlightedEntityId(entityId);
              setSelectedEntity(entity); // 詳細表示用にエンティティを保存
              setViewMode('graph3d'); // グラフ表示に切り替え
            }
          } catch (error) {
            devWarn('⚠️ [ナレッジグラフ] エンティティIDの取得エラー:', error);
          }
        }

        if (relationId) {
          try {
            const relation = await getRelationById(relationId);
            if (relation) {
              setHighlightedRelationId(relationId);
              setSelectedRelation(relation); // 詳細表示用にリレーションを保存
              setViewMode('graph3d'); // グラフ表示に切り替え
            }
          } catch (error) {
            devWarn('⚠️ [ナレッジグラフ] リレーションIDの取得エラー:', error);
          }
        }
      } catch (error: any) {
        console.error('❌ ナレッジグラフデータの読み込みエラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [searchParams]);

  // フィルター用データの読み込み（最適化版：一括取得）
  useEffect(() => {
    const loadFilterData = async () => {
      setIsLoadingFilters(true);
      try {
        const orgTreeData = await getOrgTreeFromDb();
        if (orgTreeData) {
          const allOrgs = getAllOrganizationsFromTree(orgTreeData);
          setOrganizations(allOrgs.map(org => ({
            id: org.id,
            name: org.name || org.title || org.id,
            title: org.title,
            type: (org as any).type || 'organization',
          })));
          
          // 全組織のトピックを一括取得（最適化版）
          const allTopics = await getAllTopicsBatch();
          setTopics(allTopics);
          
          // 全組織のメンバーを一括取得（最適化版：並列処理）
          const orgIds = allOrgs.filter(org => org.id).map(org => org.id!);
          const allMembers = await getAllMembersBatch(orgIds);
          setMembers(allMembers);
        }
      } catch (error: any) {
        console.error('❌ フィルターデータの読み込みエラー:', error);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    loadFilterData();
  }, []);

  return {
    entities,
    relations,
    topics,
    organizations,
    members,
    isLoading,
    isLoadingFilters,
    searchResultEntityIds,
    searchResultRelationIds,
    highlightedEntityId,
    highlightedRelationId,
    selectedEntity,
    selectedRelation,
    viewMode,
    setEntities,
    setRelations,
    setTopics,
    setOrganizations,
    setMembers,
    setSearchResultEntityIds,
    setSearchResultRelationIds,
    setHighlightedEntityId,
    setHighlightedRelationId,
    setSelectedEntity,
    setSelectedRelation,
    setViewMode,
  };
}
