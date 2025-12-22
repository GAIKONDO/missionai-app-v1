'use client';

import { useMemo, useCallback, useEffect } from 'react';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { TopicInfo } from '@/lib/orgApi';

// 開発環境でのみログを有効化するヘルパー関数
const isDev = process.env.NODE_ENV === 'development';
const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

interface UseKnowledgeGraphFiltersProps {
  entities: Entity[];
  relations: Relation[];
  topics: TopicInfo[];
  members: Array<{ id: string; name: string; position?: string; organizationId: string }>;
  entitySearchQuery: string;
  entityTypeFilter: string;
  relationSearchQuery: string;
  relationTypeFilter: string;
  topicSearchQuery: string;
  selectedOrganizationIds: Set<string>;
  selectedMemberIds: Set<string>;
  dateRangeStart: string;
  dateRangeEnd: string;
  selectedImportance: Set<'high' | 'medium' | 'low'>;
  searchResultEntityIds: Set<string>;
  searchResultRelationIds: Set<string>;
  relationTypeLabels: Record<string, string>;
  entityPage: number;
  relationPage: number;
  topicPage: number;
  ITEMS_PER_PAGE: number;
  setEntityPage: (page: number | ((prev: number) => number)) => void;
  setRelationPage: (page: number | ((prev: number) => number)) => void;
  setTopicPage: (page: number | ((prev: number) => number)) => void;
}

interface UseKnowledgeGraphFiltersReturn {
  filteredEntities: Entity[];
  filteredRelations: Relation[];
  filteredTopics: TopicInfo[];
  paginatedEntities: Entity[];
  paginatedRelations: Relation[];
  paginatedTopics: TopicInfo[];
  totalEntityPages: number;
  totalRelationPages: number;
  totalTopicPages: number;
  filteredRelationIds: Set<string>;
}

export function useKnowledgeGraphFilters({
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
}: UseKnowledgeGraphFiltersProps): UseKnowledgeGraphFiltersReturn {
  // トピック情報のマップ化（パフォーマンス最適化）
  const topicMap = useMemo(() => {
    const map = new Map<string, TopicInfo>();
    topics.forEach(topic => {
      map.set(topic.id, topic);
    });
    return map;
  }, [topics]);

  // 日付が期間内かチェックするヘルパー関数
  const isDateInRange = useCallback((dateStr: string | null | undefined, startDate: string, endDate: string): boolean => {
    if (dateStr === null || dateStr === undefined || dateStr === '') {
      return true; // 全期間に反映
    }
    if (!startDate && !endDate) {
      return true; // 期間フィルターが設定されていない場合は全期間に反映
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
      devWarn('日付のパースエラー:', dateStr, error);
      return true;
    }
  }, []);

  // リレーションのフィルタリング（組織、期間、重要度）
  const filteredRelationIds = useMemo(() => {
    const hasOrganizationFilter = selectedOrganizationIds.size > 0;
    const hasMemberFilter = selectedMemberIds.size > 0;
    const hasDateFilter = dateRangeStart || dateRangeEnd;
    const hasImportanceFilter = selectedImportance.size > 0;
    
    if (!hasOrganizationFilter && !hasMemberFilter && !hasDateFilter && !hasImportanceFilter) {
      return new Set(relations.map(r => r.id));
    }
    
    const filteredIds = new Set<string>();
    
    for (const relation of relations) {
      let shouldInclude = true;
      
      // 組織フィルター
      if (hasOrganizationFilter) {
        if (relation.organizationId && !selectedOrganizationIds.has(relation.organizationId)) {
          // リレーションのorganizationIdで直接チェック
          // トピック経由でもチェック
          const topic = relation.topicId ? topicMap.get(relation.topicId) : null;
          if (!topic || !selectedOrganizationIds.has(topic.organizationId)) {
            shouldInclude = false;
          }
        }
      }
      
      // 期間フィルター
      if (hasDateFilter && shouldInclude) {
        const topic = relation.topicId ? topicMap.get(relation.topicId) : null;
        if (topic) {
          if (topic.isAllPeriods === true) {
            // 全期間に反映の場合は常に表示
            shouldInclude = true;
          } else if (topic.topicDate !== undefined) {
            shouldInclude = isDateInRange(topic.topicDate, dateRangeStart, dateRangeEnd);
          } else {
            // トピックに日付がない場合は除外
            shouldInclude = false;
          }
        } else {
          // トピックが見つからない場合は除外
          shouldInclude = false;
        }
      }
      
      // 重要度フィルター
      if (hasImportanceFilter && shouldInclude) {
        const topic = relation.topicId ? topicMap.get(relation.topicId) : null;
        if (topic && topic.importance) {
          if (!selectedImportance.has(topic.importance)) {
            shouldInclude = false;
          }
        } else {
          // トピックが見つからないか重要度がない場合は除外
          shouldInclude = false;
        }
      }
      
      // 担当者フィルター（エンティティのメタデータから判定）
      if (hasMemberFilter && shouldInclude) {
        const selectedMembers = members.filter(m => selectedMemberIds.has(m.id));
        if (selectedMembers.length > 0) {
          // リレーションに関連するエンティティをチェック
          const sourceEntity = relation.sourceEntityId ? entities.find(e => e.id === relation.sourceEntityId) : null;
          const targetEntity = relation.targetEntityId ? entities.find(e => e.id === relation.targetEntityId) : null;
          
          const sourceMatches = sourceEntity && selectedMembers.some(member => {
            const entityName = sourceEntity.name.toLowerCase();
            const memberName = member.name.toLowerCase();
            return entityName.includes(memberName) || entityName === memberName;
          });
          
          const targetMatches = targetEntity && selectedMembers.some(member => {
            const entityName = targetEntity.name.toLowerCase();
            const memberName = member.name.toLowerCase();
            return entityName.includes(memberName) || entityName === memberName;
          });
          
          if (!sourceMatches && !targetMatches) {
            shouldInclude = false;
          }
        }
      }
      
      if (shouldInclude) {
        filteredIds.add(relation.id);
      }
    }
    
    return filteredIds;
  }, [relations, selectedOrganizationIds, selectedMemberIds, dateRangeStart, dateRangeEnd, selectedImportance, topicMap, members, entities, isDateInRange]);

  // フィルタリング
  const filteredEntities = useMemo(() => {
    // 検索結果モードの場合、検索結果のエンティティ + 検索結果のリレーションに関連するエンティティを表示
    if (searchResultEntityIds.size > 0 || searchResultRelationIds.size > 0) {
      const entityIdsToShow = new Set<string>(searchResultEntityIds);
      
      // 検索結果のリレーションに関連するエンティティIDを追加
      if (searchResultRelationIds.size > 0) {
        for (const relation of relations) {
          if (searchResultRelationIds.has(relation.id)) {
            if (relation.sourceEntityId) {
              entityIdsToShow.add(relation.sourceEntityId);
            }
            if (relation.targetEntityId) {
              entityIdsToShow.add(relation.targetEntityId);
            }
          }
        }
      }
      
      // 検索結果のエンティティに関連するリレーションの両端のエンティティIDを追加
      if (searchResultEntityIds.size > 0) {
        for (const relation of relations) {
          const sourceInResults = searchResultEntityIds.has(relation.sourceEntityId || '');
          const targetInResults = searchResultEntityIds.has(relation.targetEntityId || '');
          
          if (sourceInResults || targetInResults) {
            // このリレーションに関連するエンティティを追加
            if (relation.sourceEntityId) {
              entityIdsToShow.add(relation.sourceEntityId);
            }
            if (relation.targetEntityId) {
              entityIdsToShow.add(relation.targetEntityId);
            }
          }
        }
      }
      
      return entities.filter(entity => entityIdsToShow.has(entity.id));
    }
    
    const hasOrganizationFilter = selectedOrganizationIds.size > 0;
    const hasMemberFilter = selectedMemberIds.size > 0;
    const hasDateFilter = dateRangeStart || dateRangeEnd;
    const hasImportanceFilter = selectedImportance.size > 0;
    
    if (!hasOrganizationFilter && !hasMemberFilter && !hasDateFilter && !hasImportanceFilter) {
      return entities.filter((entity) => {
        if (entitySearchQuery) {
          const query = entitySearchQuery.toLowerCase();
          const nameMatch = entity.name.toLowerCase().includes(query);
          const aliasesMatch = entity.aliases?.some(alias => alias.toLowerCase().includes(query));
          if (!nameMatch && !aliasesMatch) {
            return false;
          }
        }
        if (entityTypeFilter !== 'all' && entity.type !== entityTypeFilter) {
          return false;
        }
        return true;
      });
    }
    
    // フィルタリングされたリレーションに関連するエンティティIDを収集
    const relatedEntityIds = new Set<string>();
    for (const relation of relations) {
      if (filteredRelationIds.has(relation.id)) {
        if (relation.sourceEntityId) {
          relatedEntityIds.add(relation.sourceEntityId);
        }
        if (relation.targetEntityId) {
          relatedEntityIds.add(relation.targetEntityId);
        }
      }
    }
    
    return entities.filter((entity) => {
      // 検索とタイプフィルター
      if (entitySearchQuery) {
        const query = entitySearchQuery.toLowerCase();
        const nameMatch = entity.name.toLowerCase().includes(query);
        const aliasesMatch = entity.aliases?.some(alias => alias.toLowerCase().includes(query));
        if (!nameMatch && !aliasesMatch) {
          return false;
        }
      }
      if (entityTypeFilter !== 'all' && entity.type !== entityTypeFilter) {
        return false;
      }
      
      // 組織フィルター
      if (hasOrganizationFilter) {
        if (entity.organizationId && !selectedOrganizationIds.has(entity.organizationId)) {
          // エンティティがフィルタリングされたリレーションに関連しているかチェック
          if (!relatedEntityIds.has(entity.id)) {
            return false;
          }
        }
      }
      
      // フィルタリングされたリレーションに関連するエンティティのみ表示
      if (hasDateFilter || hasImportanceFilter || hasMemberFilter) {
        if (!relatedEntityIds.has(entity.id)) {
          return false;
        }
      }
      
      return true;
    });
  }, [entities, entitySearchQuery, entityTypeFilter, selectedOrganizationIds, selectedMemberIds, dateRangeStart, dateRangeEnd, selectedImportance, filteredRelationIds, relations, searchResultEntityIds, searchResultRelationIds]);
  
  // エンティティのページネーション
  const paginatedEntities = useMemo(() => {
    const startIndex = (entityPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredEntities.slice(startIndex, endIndex);
  }, [filteredEntities, entityPage, ITEMS_PER_PAGE]);
  
  const totalEntityPages = useMemo(() => {
    return Math.ceil(filteredEntities.length / ITEMS_PER_PAGE);
  }, [filteredEntities.length, ITEMS_PER_PAGE]);
  
  const filteredRelations = useMemo(() => {
    // 検索結果モードの場合、検索結果のリレーション + 検索結果のエンティティに関連するリレーションを表示
    if (searchResultEntityIds.size > 0 || searchResultRelationIds.size > 0) {
      const relationIdsToShow = new Set<string>(searchResultRelationIds);
      
      // 検索結果のエンティティに関連するリレーションIDを追加
      if (searchResultEntityIds.size > 0) {
        for (const relation of relations) {
          const sourceInResults = searchResultEntityIds.has(relation.sourceEntityId || '');
          const targetInResults = searchResultEntityIds.has(relation.targetEntityId || '');
          
          if (sourceInResults || targetInResults) {
            relationIdsToShow.add(relation.id);
          }
        }
      }
      
      return relations.filter(relation => relationIdsToShow.has(relation.id));
    }
    
    return relations.filter((relation) => {
      // フィルタリングされたリレーションIDに含まれているかチェック
      if (!filteredRelationIds.has(relation.id)) {
        return false;
      }
      
      // 検索フィルター
      if (relationSearchQuery) {
        const query = relationSearchQuery.toLowerCase();
        const sourceEntity = entities.find(e => e.id === relation.sourceEntityId);
        const targetEntity = entities.find(e => e.id === relation.targetEntityId);
        const sourceName = sourceEntity?.name || relation.sourceEntityId || '不明';
        const targetName = targetEntity?.name || relation.targetEntityId || '不明';
        const relationTypeLabel = relationTypeLabels[relation.relationType] || relation.relationType;
        const relationText = `${sourceName} ${relationTypeLabel} ${targetName} ${relation.description || ''}`.toLowerCase();
        if (!relationText.includes(query)) {
          return false;
        }
      }
      
      // タイプフィルター
      if (relationTypeFilter !== 'all' && relation.relationType !== relationTypeFilter) {
        return false;
      }
      
      return true;
    });
  }, [relations, relationSearchQuery, relationTypeFilter, filteredRelationIds, entities, relationTypeLabels, searchResultRelationIds]);
  
  // リレーションのページネーション
  const paginatedRelations = useMemo(() => {
    const startIndex = (relationPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredRelations.slice(startIndex, endIndex);
  }, [filteredRelations, relationPage, ITEMS_PER_PAGE]);
  
  const totalRelationPages = useMemo(() => {
    return Math.ceil(filteredRelations.length / ITEMS_PER_PAGE);
  }, [filteredRelations.length, ITEMS_PER_PAGE]);
  
  // トピックのフィルタリング
  const filteredTopics = useMemo(() => {
    return topics.filter((topic) => {
      // 検索フィルター
      if (topicSearchQuery) {
        const query = topicSearchQuery.toLowerCase();
        const titleMatch = topic.title?.toLowerCase().includes(query);
        const meetingNoteTitleMatch = topic.meetingNoteTitle?.toLowerCase().includes(query);
        if (!titleMatch && !meetingNoteTitleMatch) {
          return false;
        }
      }
      
      // 組織フィルター
      if (selectedOrganizationIds.size > 0) {
        if (!topic.organizationId || !selectedOrganizationIds.has(topic.organizationId)) {
          return false;
        }
      }
      
      // 期間フィルター
      if (dateRangeStart || dateRangeEnd) {
        if (topic.isAllPeriods === true) {
          // 全期間に反映の場合は常に表示
          return true;
        } else if (topic.topicDate !== undefined) {
          return isDateInRange(topic.topicDate, dateRangeStart, dateRangeEnd);
        } else {
          // トピックに日付がない場合は除外
          return false;
        }
      }
      
      // 重要度フィルター
      if (selectedImportance.size > 0) {
        if (!topic.importance || !selectedImportance.has(topic.importance)) {
          return false;
        }
      }
      
      return true;
    });
  }, [topics, topicSearchQuery, selectedOrganizationIds, dateRangeStart, dateRangeEnd, selectedImportance, isDateInRange]);
  
  // トピックのページネーション
  const paginatedTopics = useMemo(() => {
    const startIndex = (topicPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredTopics.slice(startIndex, endIndex);
  }, [filteredTopics, topicPage, ITEMS_PER_PAGE]);
  
  const totalTopicPages = useMemo(() => {
    return Math.ceil(filteredTopics.length / ITEMS_PER_PAGE);
  }, [filteredTopics.length, ITEMS_PER_PAGE]);
  
  // 検索やフィルターが変更されたらページをリセット
  useEffect(() => {
    setEntityPage(1);
  }, [entitySearchQuery, entityTypeFilter, selectedOrganizationIds, selectedMemberIds, dateRangeStart, dateRangeEnd, selectedImportance, setEntityPage]);
  
  useEffect(() => {
    setRelationPage(1);
  }, [relationSearchQuery, relationTypeFilter, setRelationPage]);
  
  useEffect(() => {
    setTopicPage(1);
  }, [topicSearchQuery, setTopicPage]);

  return {
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
  };
}
