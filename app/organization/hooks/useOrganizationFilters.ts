import { useState, useMemo, useCallback, useEffect } from 'react';
import type { OrgNodeData } from '@/components/OrgChart';
import { calculateSimilarity, findOrganizationById } from '../utils/organizationUtils';

export function useOrganizationFilters(orgData: OrgNodeData | null) {
  // フィルター関連のstate
  const [searchQuery, setSearchQuery] = useState(''); // 実際に適用される検索クエリ
  const [searchInput, setSearchInput] = useState(''); // 検索入力欄の値（検索ボタンを押すまで適用されない）
  const [searchCandidates, setSearchCandidates] = useState<Array<{ org: OrgNodeData; score: number }>>([]); // 検索候補
  const [levelFilter, setLevelFilter] = useState<string>('all'); // 'all', '部門', '部', '課', 'チーム'
  const [minMembers, setMinMembers] = useState<number>(0);
  const [selectedRootOrgId, setSelectedRootOrgId] = useState<string | null>(null); // 選択されたルート組織のID
  const [isFilterExpanded, setIsFilterExpanded] = useState(false); // フィルターUIの展開状態
  const [showCompanyDisplay, setShowCompanyDisplay] = useState(false); // 事業会社表示の切り替え
  const [showPersonDisplay, setShowPersonDisplay] = useState(false); // 個人表示の切り替え

  // ルート組織のリストを取得する関数
  const getRootOrganizations = (): OrgNodeData[] => {
    if (!orgData) return [];
    
    // virtual-rootの場合は、その子ノード（実際のルート組織）を返す
    if (orgData.id === 'virtual-root' && orgData.children) {
      return orgData.children;
    }
    
    // 単一のルート組織の場合
    return [orgData];
  };

  // 選択されたルート組織の傘下のみを取得する関数
  const getSelectedRootOrgTree = (): OrgNodeData | null => {
    if (!orgData) return null;
    
    // ルート組織が選択されていない場合は、全体を返す
    if (!selectedRootOrgId) {
      return orgData;
    }
    
    // virtual-rootの場合は、子ノードから選択された組織を探す
    if (orgData.id === 'virtual-root' && orgData.children) {
      const selectedOrg = orgData.children.find(child => child.id === selectedRootOrgId);
      return selectedOrg || null;
    }
    
    // 単一のルート組織で、選択されたIDと一致する場合
    if (orgData.id === selectedRootOrgId) {
      return orgData;
    }
    
    return null;
  };

  // 組織ツリーをフィルターする関数
  const filterOrgTree = (node: OrgNodeData | null): OrgNodeData | null => {
    if (!node) return null;

    // 検索クエリでフィルター（組織名、英語名、説明で検索）
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesSearch = !normalizedQuery || 
      node.name.toLowerCase().includes(normalizedQuery) ||
      node.title?.toLowerCase().includes(normalizedQuery) ||
      node.description?.toLowerCase().includes(normalizedQuery) ||
      // メンバー名でも検索可能にする
      node.members?.some(member => 
        member.name?.toLowerCase().includes(normalizedQuery) ||
        member.title?.toLowerCase().includes(normalizedQuery)
      );

    // レベルでフィルター（常に'all'なので常にtrue）
    const matchesLevel = levelFilter === 'all' || 
      node.levelName === levelFilter;

    // メンバー数でフィルター（常に0以上なので常にtrue）
    const memberCount = node.members?.length || 0;
    const matchesMembers = memberCount >= minMembers;

    // 現在のノードが条件を満たすか
    const nodeMatches = matchesSearch && matchesLevel && matchesMembers;

    // 子ノードを再帰的にフィルター
    const filteredChildren = node.children
      ?.map(child => filterOrgTree(child))
      .filter((child): child is OrgNodeData => child !== null) || [];

    // 現在のノードが条件を満たす、または子ノードが条件を満たす場合に表示
    if (nodeMatches || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      };
    }

    return null;
  };

  // 選択されたルート組織の傘下を取得し、フィルターを適用
  const selectedRootOrgTree = useMemo(() => getSelectedRootOrgTree(), [orgData, selectedRootOrgId]);
  const filteredOrgData = useMemo(() => filterOrgTree(selectedRootOrgTree), [selectedRootOrgTree, searchQuery, levelFilter, minMembers, showCompanyDisplay, showPersonDisplay]);

  // 検索候補を計算する関数
  const calculateSearchCandidates = useCallback((query: string, tree: OrgNodeData | null) => {
    if (!query.trim() || !tree) {
      setSearchCandidates([]);
      return;
    }

    const normalizedQuery = query.trim().toLowerCase();
    const candidates: Array<{ org: OrgNodeData; score: number }> = [];

    // 組織ツリーからすべての組織を取得
    const allOrgs: OrgNodeData[] = [];
    const traverse = (node: OrgNodeData) => {
      if (node.id) {
        allOrgs.push(node);
      }
      if (node.children) {
        node.children.forEach(child => traverse(child));
      }
    };
    traverse(tree);

    // 各組織の類似度を計算
    allOrgs.forEach(org => {
      const scores: number[] = [];
      
      // 組織名での類似度
      if (org.name) {
        scores.push(calculateSimilarity(normalizedQuery, org.name.toLowerCase()));
        // 部分一致の場合はボーナス
        if (org.name.toLowerCase().includes(normalizedQuery)) {
          scores.push(0.8);
        }
      }
      
      // 英語名での類似度
      if (org.title) {
        scores.push(calculateSimilarity(normalizedQuery, org.title.toLowerCase()));
        if (org.title.toLowerCase().includes(normalizedQuery)) {
          scores.push(0.7);
        }
      }
      
      // 説明での類似度
      if (org.description) {
        scores.push(calculateSimilarity(normalizedQuery, org.description.toLowerCase()) * 0.5);
        if (org.description.toLowerCase().includes(normalizedQuery)) {
          scores.push(0.6);
        }
      }
      
      // メンバー名での類似度
      if (org.members) {
        org.members.forEach(member => {
          if (member.name) {
            const memberScore = calculateSimilarity(normalizedQuery, member.name.toLowerCase()) * 0.3;
            scores.push(memberScore);
            if (member.name.toLowerCase().includes(normalizedQuery)) {
              scores.push(0.5);
            }
          }
          if (member.title) {
            const titleScore = calculateSimilarity(normalizedQuery, member.title.toLowerCase()) * 0.2;
            scores.push(titleScore);
          }
        });
      }

      // 最高スコアを使用
      const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
      
      // スコアが0.3以上の候補のみ追加
      if (maxScore >= 0.3) {
        candidates.push({ org, score: maxScore });
      }
    });

    // スコアでソート（降順）
    candidates.sort((a, b) => b.score - a.score);
    
    // 上位10件まで
    setSearchCandidates(candidates.slice(0, 10));
  }, []);

  // 検索クエリが変更されたときに候補を計算
  useEffect(() => {
    if (searchQuery && selectedRootOrgTree) {
      calculateSearchCandidates(searchQuery, selectedRootOrgTree);
    } else {
      setSearchCandidates([]);
    }
  }, [searchQuery, selectedRootOrgTree, calculateSearchCandidates]);

  const resetFilters = () => {
    setSearchQuery('');
    setSearchInput('');
  };

  return {
    searchQuery,
    setSearchQuery,
    searchInput,
    setSearchInput,
    searchCandidates,
    levelFilter,
    setLevelFilter,
    minMembers,
    setMinMembers,
    selectedRootOrgId,
    setSelectedRootOrgId,
    isFilterExpanded,
    setIsFilterExpanded,
    showCompanyDisplay,
    setShowCompanyDisplay,
    showPersonDisplay,
    setShowPersonDisplay,
    getRootOrganizations,
    selectedRootOrgTree,
    filteredOrgData,
    resetFilters,
  };
}

