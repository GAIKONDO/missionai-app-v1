import { useState, useMemo, useCallback } from 'react';
import type { RelationshipNode, RelationshipLink } from '../types';
import { isDateInRange } from '../utils';

interface Member {
  id: string;
  name: string;
  organizationId: string;
}

interface UseRelationshipFiltersProps {
  nodes: RelationshipNode[];
  links: RelationshipLink[];
  members: Member[];
  maxNodes: number;
  showTopics: boolean;
}

interface UseRelationshipFiltersReturn {
  // フィルター状態
  selectedOrganizationIds: Set<string>;
  setSelectedOrganizationIds: (ids: Set<string>) => void;
  selectedMemberIds: Set<string>;
  setSelectedMemberIds: (ids: Set<string>) => void;
  dateRangeStart: string;
  setDateRangeStart: (date: string) => void;
  dateRangeEnd: string;
  setDateRangeEnd: (date: string) => void;
  selectedImportance: Set<'high' | 'medium' | 'low'>;
  setSelectedImportance: (importance: Set<'high' | 'medium' | 'low'>) => void;
  isLoadingFilters: boolean;
  setIsLoadingFilters: (loading: boolean) => void;
  
  // フィルター済みデータ
  filteredNodes: RelationshipNode[];
  filteredLinks: RelationshipLink[];
  
  // フィルターリセット
  resetFilters: () => void;
  
  // フィルターがアクティブかどうか
  hasActiveFilters: boolean;
}

export function useRelationshipFilters({
  nodes,
  links,
  members,
  maxNodes,
  showTopics,
}: UseRelationshipFiltersProps): UseRelationshipFiltersReturn {
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<Set<string>>(new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [selectedImportance, setSelectedImportance] = useState<Set<'high' | 'medium' | 'low'>>(new Set());
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // ノードのインデックスマップを作成
  const nodeIndexes = useMemo(() => {
    const map = new Map<string, number>();
    nodes.forEach((node, index) => {
      map.set(node.id, index);
    });
    return map;
  }, [nodes]);

  // リンクのインデックスマップを作成
  const linkIndexes = useMemo(() => {
    const map = new Map<string, number>();
    links.forEach((link, index) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      const key = `${sourceId}-${targetId}`;
      map.set(key, index);
    });
    return map;
  }, [links]);

  // フィルターに基づいてノードとリンクをフィルタリング
  const filteredNodes = useMemo(() => {
    const hasOrganizationFilter = selectedOrganizationIds.size > 0;
    const hasMemberFilter = selectedMemberIds.size > 0;
    const hasDateFilter = dateRangeStart || dateRangeEnd;
    const hasImportanceFilter = selectedImportance.size > 0;
    
    if (!hasOrganizationFilter && !hasMemberFilter && !hasDateFilter && !hasImportanceFilter) {
      // フィルターがない場合は全ノードを返す（最大ノード数まで）
      return nodes.slice(0, maxNodes);
    }

    const filtered: RelationshipNode[] = [];
    const matchedNodeIds = new Set<string>();
    const linkedNodeIds = new Set<string>();

    // 1. 直接マッチするノードを探す
    for (const node of nodes) {
      if (filtered.length >= maxNodes) break;

      let matches = false;

      // 組織フィルター
      if (hasOrganizationFilter && node.type === 'initiative') {
        // 注力施策ノードは組織IDを持つ
        const initiativeOrgId = node.data?.organizationId;
        if (initiativeOrgId && selectedOrganizationIds.has(initiativeOrgId)) {
          matches = true;
        }
      } else if (hasOrganizationFilter && node.type === 'organization') {
        // 組織ノード自体も組織フィルターにマッチする
        if (selectedOrganizationIds.has(node.id)) {
          matches = true;
        }
      }

      // メンバーフィルター
      if (hasMemberFilter && node.type === 'initiative') {
        // 注力施策の担当者をチェック
        const assignees = node.data?.assigneeIds;
        if (assignees && Array.isArray(assignees)) {
          for (const assigneeId of assignees) {
            if (selectedMemberIds.has(assigneeId)) {
              matches = true;
              break;
            }
          }
        }
      }

      // 日付フィルター
      if (hasDateFilter && node.type === 'initiative') {
        // 注力施策の期間をチェック
        const startDate = node.data?.startDate;
        const endDate = node.data?.endDate;
        // 期間がフィルター範囲と重複するかチェック
        if (startDate || endDate) {
          const filterStart = dateRangeStart || '';
          const filterEnd = dateRangeEnd || '9999-12-31';
          const initStart = startDate || '0000-01-01';
          const initEnd = endDate || '9999-12-31';
          
          // 期間の重複判定: 開始日が終了日より前で、終了日が開始日より後
          if (initStart <= filterEnd && initEnd >= filterStart) {
            matches = true;
          }
        }
      } else if (hasDateFilter && node.type === 'topic') {
        // トピックの日付をチェック
        // isAllPeriodsがtrueの場合は日付フィルタに関係なく表示
        if (node.data?.isAllPeriods === true) {
          matches = true;
        } else {
          // isAllPeriodsがfalseまたは未設定の場合はtopicDateでフィルタリング
          if (node.data?.topicDate !== undefined) {
            return isDateInRange(node.data.topicDate, dateRangeStart, dateRangeEnd);
          }
        }
      }

      // 重要度フィルター
      if (hasImportanceFilter) {
        const importance = node.data?.importance;
        if (importance && selectedImportance.has(importance as 'high' | 'medium' | 'low')) {
          matches = true;
        }
      }

      if (matches) {
        filtered.push(node);
        matchedNodeIds.add(node.id);
      }
    }

    // 2. マッチしたノードに直接接続されているノードを追加
    for (const link of links) {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;

      if (matchedNodeIds.has(sourceId)) {
        linkedNodeIds.add(targetId);
      }
      if (matchedNodeIds.has(targetId)) {
        linkedNodeIds.add(sourceId);
      }
    }

    // 3. リンクされたノードを追加
    for (const nodeId of linkedNodeIds) {
      if (filtered.length >= maxNodes) break;
      if (matchedNodeIds.has(nodeId)) continue; // 既に追加済み

      const nodeIndex = nodeIndexes.get(nodeId);
      if (nodeIndex !== undefined) {
        const node = nodes[nodeIndex];
        filtered.push(node);
        matchedNodeIds.add(nodeId);
      }
    }

    // 4. 親ノードとテーマノードを追加
    // トピック表示がオフの場合はトピックノードを除外
    for (const node of nodes) {
      if (filtered.length >= maxNodes) break;
      if (matchedNodeIds.has(node.id)) continue; // 既に追加済み

      // 親ノードは常に表示
      if (node.data?.isParent) {
        filtered.push(node);
        matchedNodeIds.add(node.id);
        continue;
      }

      // テーマノードは、関連する組織/施策が表示されている場合のみ表示
      if (node.type === 'theme') {
        // テーマに接続されているノードが1つ以上フィルタリング結果に含まれているかチェック
        for (const link of links) {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;

          if (
            (sourceId === node.id && matchedNodeIds.has(targetId)) ||
            (targetId === node.id && matchedNodeIds.has(sourceId))
          ) {
            filtered.push(node);
            matchedNodeIds.add(node.id);
            break;
          }
        }
      }
    }
    
    return filtered;
  }, [nodes, links, selectedOrganizationIds, selectedMemberIds, members, dateRangeStart, dateRangeEnd, selectedImportance, maxNodes, nodeIndexes, linkIndexes, showTopics]);

  const filteredLinks = useMemo(() => {
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    
    // 親ノードとテーマノードのIDも確実に含める
    const parentNodeIds = new Set(nodes.filter(n => n.data?.isParent).map(n => n.id));
    const themeNodeIds = new Set(nodes.filter(n => n.type === 'theme').map(n => n.id));
    
    const filtered = links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      // 両方のノードがフィルタリング結果に含まれている場合のみリンクを表示
      const hasSource = filteredNodeIds.has(sourceId);
      const hasTarget = filteredNodeIds.has(targetId);
      
      // トピック表示がオフの場合はトピックノードとのリンクを除外
      if (!showTopics) {
        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);
        if (sourceNode?.type === 'topic' || targetNode?.type === 'topic') {
          return false;
        }
      }
      
      return hasSource && hasTarget;
    });
    
    return filtered;
  }, [links, filteredNodes, nodes, selectedOrganizationIds, selectedMemberIds, showTopics]);

  // フィルターリセット
  const resetFilters = useCallback(() => {
    setSelectedOrganizationIds(new Set());
    setSelectedMemberIds(new Set());
    setDateRangeStart('');
    setDateRangeEnd('');
    setSelectedImportance(new Set());
  }, []);

  // フィルターがアクティブかどうか
  const hasActiveFilters = useMemo(() => {
    return (
      selectedOrganizationIds.size > 0 ||
      selectedMemberIds.size > 0 ||
      dateRangeStart !== '' ||
      dateRangeEnd !== '' ||
      selectedImportance.size > 0
    );
  }, [selectedOrganizationIds, selectedMemberIds, dateRangeStart, dateRangeEnd, selectedImportance]);

  return {
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
  };
}

