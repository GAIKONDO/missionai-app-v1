'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import type { OrgNodeData, MemberInfo } from '@/components/OrgChart';
import { getOrgTreeFromDb, getOrgMembers, updateOrg, updateOrgParent, addOrgMember, updateOrgMember, deleteOrgMember, tauriAlert, tauriConfirm, createOrg, deleteOrg, getAllOrganizationsFromTree, findOrganizationById, getDeletionTargets } from '@/lib/orgApi';
import { callTauriCommand } from '@/lib/localFirebase';
import { sortMembersByPosition } from '@/lib/memberSort';
import { saveBpoMembersOnly } from '@/lib/save-bpo-members-only';
import { saveFrontierBusinessMembers } from '@/lib/save-frontier-business-members';
import { removeIctDivisionDuplicates } from '@/lib/remove-ict-division-duplicates';
import { saveIctDivisionMembers } from '@/lib/save-ict-division-members';
import { reorderFrontierBusiness } from '@/lib/reorder-frontier-business';
import HierarchyView from './views/HierarchyView';
import BubbleView from './views/BubbleView';
import FinderView from './views/FinderView';
import SelectedOrganizationPanel from './components/SelectedOrganizationPanel';
import OrganizationInfoTab from './components/tabs/OrganizationInfoTab';
import MembersTab from './components/tabs/MembersTab';
import { tabsConfig, type TabId } from './components/tabs/tabsConfig';
import OrganizationEditModal from './components/modals/OrganizationEditModal';
import AddOrganizationModal from './components/modals/AddOrganizationModal';
import DeleteOrganizationModal from './components/modals/DeleteOrganizationModal';
import { mapMembersToMemberInfo, findOrgInTree, calculateSimilarity } from './utils/organizationUtils';

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

type ViewMode = 'hierarchy' | 'bubble' | 'finder';



export default function OrganizationPage() {
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<OrgNodeData | null>(null);
  const [orgData, setOrgData] = useState<OrgNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchy');
  const [expandedMembers, setExpandedMembers] = useState<Set<number>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNodeMembers, setSelectedNodeMembers] = useState<(MemberInfo & { id?: string })[]>([]);
  const [showDeleteOrgModal, setShowDeleteOrgModal] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<OrgNodeData | null>(null);
  
  // Finder風カラム表示用のstate
  const [finderSelectedPath, setFinderSelectedPath] = useState<OrgNodeData[]>([]);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [editingOrgName, setEditingOrgName] = useState('');
  const [creatingOrgParentId, setCreatingOrgParentId] = useState<string | null>(null);
  const [showFinderDeleteModal, setShowFinderDeleteModal] = useState(false);
  const [orgToDeleteInFinder, setOrgToDeleteInFinder] = useState<{ id: string; name: string } | null>(null);
  
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

  useEffect(() => {
    const loadOrgData = async () => {
      try {
        setLoading(true);
        
        // 情報・通信部門の重複メンバーを削除（開発時のみ）
        if (process.env.NODE_ENV === 'development') {
          try {
            await removeIctDivisionDuplicates();
          } catch (error: any) {
            devWarn('情報・通信部門の重複削除でエラーが発生しました:', error.message);
          }
        }
        
        // データベースから組織データを取得（メンバー情報も含む）
        devLog('📖 [組織ページ] 組織データの取得を開始');
        const data = await getOrgTreeFromDb();
        devLog('📖 [組織ページ] 組織データの取得完了:', data ? '成功' : 'データなし');
        
        if (data) {
          setOrgData(data);
          devLog('✅ データベースから組織データを読み込みました');
          
          // ルートノード（情報・通信部門）を初期選択として設定
          if (data.id) {
            try {
              const members = await getOrgMembers(data.id);
              // メンバー情報をMemberInfo形式に変換（ID付き）
              const memberInfos = mapMembersToMemberInfo(members);
              const sortedMembers = sortMembersByPosition(memberInfos, data.name);
              // ID付きメンバー情報を保存（編集モーダル用）
              setSelectedNodeMembers(sortedMembers);
              // ノードにメンバー情報を追加（IDなし、表示用）
              setSelectedNode({
                ...data,
                members: sortedMembers.map(m => {
                  // idプロパティが存在する場合は削除
                  if ('id' in m) {
                    const { id, ...memberWithoutId } = m as any;
                  return memberWithoutId;
                  }
                  return m;
                }),
              });
            } catch (error: any) {
              devWarn('ルートノードのメンバー取得に失敗しました:', error);
              setSelectedNode(data);
              setSelectedNodeMembers([]);
            }
          } else {
            setSelectedNode(data);
            setSelectedNodeMembers([]);
          }
          
          // デバッグ用：BPOビジネス課のメンバー数を確認（開発時のみ）
          if (isDev) {
            function findBpoSection(node: OrgNodeData): OrgNodeData | null {
              if (node.name === 'BPOビジネス課' || node.name === 'ＢＰＯビジネス課') {
                return node;
              }
              if (node.children) {
                for (const child of node.children) {
                  const found = findBpoSection(child);
                  if (found) return found;
                }
              }
              return null;
            }
            
            const bpoSection = findBpoSection(data);
            if (bpoSection) {
              devLog(`📊 BPOビジネス課のメンバー数: ${bpoSection.members?.length || 0}名`);
              if (bpoSection.id) {
                devLog(`📊 BPOビジネス課の組織ID: ${bpoSection.id}`);
              }
            }
          }
        } else {
          // データベースにデータがない場合
          devLog('データベースに組織データがありません。');
          setOrgData(null);
          setSelectedNode(null);
          setSelectedNodeMembers([]);
        }
        setError(null);
      } catch (err: any) {
        console.error('組織データの読み込みエラー:', err);
        setError(err.message || '組織データの読み込みに失敗しました');
        // エラー時はデータをクリア
        setOrgData(null);
        setSelectedNode(null);
        setSelectedNodeMembers([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrgData();
    
    // デバッグ用：グローバルに公開（開発時のみ）
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).saveBpoMembersOnly = saveBpoMembersOnly;
      (window as any).saveFrontierBusinessMembers = saveFrontierBusinessMembers;
      (window as any).removeIctDivisionDuplicates = removeIctDivisionDuplicates;
      (window as any).saveIctDivisionMembers = saveIctDivisionMembers;
      (window as any).reorderFrontierBusiness = reorderFrontierBusiness;
    }
  }, []);


  const handleNodeClick = async (node: OrgNodeData, event: MouseEvent) => {
    devLog('🔗 [組織一覧] ノードがクリックされました:', { id: node.id, name: node.name });
    
    // ノードにIDがある場合、メンバー情報を取得して右側のポップアップに表示
    if (node.id) {
      try {
        const members = await getOrgMembers(node.id);
        devLog(`${node.name}のメンバーを取得しました:`, members.length, '名');
        
        // メンバー情報をMemberInfo形式に変換（ID付き）
        const memberInfos = mapMembersToMemberInfo(members);
        
        // 役職順にソート（情報・通信部門の場合は部門長を最上位にする）
        const sortedMembers = sortMembersByPosition(memberInfos, node.name);
        
        // ID付きメンバー情報を保存（編集モーダル用）
        setSelectedNodeMembers(sortedMembers);
        
        // ノードにメンバー情報を追加（IDなし、表示用）
        const nodeWithMembers = {
          ...node,
          id: node.id, // IDを明示的に保持
          members: sortedMembers.map(m => {
            // idプロパティが存在する場合は削除
            if ('id' in m) {
              const { id, ...memberWithoutId } = m as any;
            return memberWithoutId;
            }
            return m;
          }),
        };
        
        devLog('✅ [handleNodeClick] selectedNodeを設定:', { 
          id: nodeWithMembers.id, 
          name: nodeWithMembers.name,
          hasId: !!nodeWithMembers.id
        });
        setSelectedNode(nodeWithMembers);
      } catch (error: any) {
        console.error(`${node.name}のメンバー取得に失敗しました:`, error);
        setSelectedNode(node);
        setSelectedNodeMembers([]);
      }
    } else {
      setSelectedNode(node);
      setSelectedNodeMembers([]);
    }
  };

  // 組織詳細ページへの遷移ハンドラー
  const handleNavigateToDetail = useCallback(() => {
    if (!selectedNode?.id) {
      devWarn('⚠️ [組織一覧] 組織IDが存在しないため、詳細ページに遷移できません:', {
        selectedNode,
        hasId: !!selectedNode?.id
      });
      tauriAlert('組織IDが存在しないため、詳細ページに遷移できません。');
      return;
    }
    
    devLog('🔗 [組織一覧] 組織詳細ページに遷移:', { 
      selectedNode,
      organizationId: selectedNode.id, 
      organizationName: selectedNode.name,
      hasId: !!selectedNode.id
    });
    
    router.push(`/organization/detail?id=${selectedNode.id}`);
  }, [selectedNode, router]);

  // 組織追加ハンドラー（組織データがない場合に使用）
  const handleAddOrg = async () => {
    try {
      const level = 0;
      const levelName = '部門';
      
      console.log('🔍 [handleAddOrg] ルート組織を作成中:', {
        parentId: null,
        name: 'ルート組織',
        level,
        levelName,
      });
      
      // 組織を作成
      const result = await createOrg(null, 'ルート組織', null, null, level, levelName, 0);
      
      if (!result || !result.id) {
        throw new Error('組織の作成に失敗しました。IDが返されませんでした。');
      }
      
      console.log('✅ [handleAddOrg] 組織を作成しました:', result.id);
      
      // データベースの更新を待つために、複数回再取得を試みる
      let tree: OrgNodeData | null = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts && !tree) {
        await new Promise(resolve => setTimeout(resolve, 300));
        tree = await getOrgTreeFromDb();
        
        if (tree) {
          // 作成された組織がツリーに含まれているか確認
          const findNewOrg = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
            if (node.id === targetId) return node;
            if (node.children) {
              for (const child of node.children) {
                const found = findNewOrg(child, targetId);
                if (found) return found;
              }
            }
            return null;
          };
          
          const foundOrg = findNewOrg(tree, result.id);
          if (foundOrg) {
            console.log('✅ [handleAddOrg] 作成された組織をツリーで確認:', result.id);
            break;
          } else {
            console.log(`⏳ [handleAddOrg] 組織がまだツリーに反映されていません (試行 ${attempts + 1}/${maxAttempts})`);
            tree = null; // 見つからない場合は再試行
          }
        }
        attempts++;
      }
      
      if (!tree) {
        // 最後の試行として、もう一度取得
        tree = await getOrgTreeFromDb();
      }
      
      if (!tree) {
        throw new Error('組織ツリーの取得に失敗しました。');
      }
      
      console.log('✅ [handleAddOrg] 組織ツリーを更新:', tree);
      setOrgData(tree);
      
      // 作成された組織を初期選択として設定
      if (tree.id === result.id) {
        try {
          const members = await getOrgMembers(tree.id);
          const memberInfos = mapMembersToMemberInfo(members);
          const sortedMembers = sortMembersByPosition(memberInfos, tree.name);
          setSelectedNodeMembers(sortedMembers);
          setSelectedNode({
            ...tree,
            members: sortedMembers.map(m => {
              if ('id' in m) {
                const { id, ...memberWithoutId } = m as any;
                return memberWithoutId;
              }
              return m;
            }),
          });
        } catch (error: any) {
          devWarn('ルートノードのメンバー取得に失敗しました:', error);
          setSelectedNode(tree);
          setSelectedNodeMembers([]);
        }
      } else {
        setSelectedNode(tree);
        setSelectedNodeMembers([]);
      }
      
      await tauriAlert('ルート組織を作成しました。');
    } catch (error: any) {
      console.error('❌ [handleAddOrg] 組織の作成に失敗しました:', error);
      const errorMessage = error?.response?.data?.error || error?.message || String(error);
      await tauriAlert(`組織の作成に失敗しました: ${errorMessage}`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>組織データを読み込み中...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ marginBottom: 0 }}>組織</h2>
              <button
                onClick={() => setShowCompanyDisplay(!showCompanyDisplay)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #BAE6FD',
                  backgroundColor: showCompanyDisplay ? '#E0F2FE' : '#fff',
                  color: '#0369A1',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E0F2FE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = showCompanyDisplay ? '#E0F2FE' : '#fff';
                }}
              >
                事業会社表示
              </button>
              <button
                onClick={() => setShowPersonDisplay(!showPersonDisplay)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #BAE6FD',
                  backgroundColor: showPersonDisplay ? '#E0F2FE' : '#fff',
                  color: '#0369A1',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E0F2FE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = showPersonDisplay ? '#E0F2FE' : '#fff';
                }}
              >
                個人表示
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setViewMode('hierarchy')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: viewMode === 'hierarchy' ? '#1E40AF' : '#E5E7EB',
                  color: viewMode === 'hierarchy' ? '#ffffff' : '#6B7280',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: viewMode === 'hierarchy' ? '600' : '400',
                  transition: 'all 0.2s',
                  fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (viewMode !== 'hierarchy') {
                    e.currentTarget.style.backgroundColor = '#D1D5DB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (viewMode !== 'hierarchy') {
                    e.currentTarget.style.backgroundColor = '#E5E7EB';
                  }
                }}
              >
                階層表示
              </button>
              <button
                onClick={() => setViewMode('bubble')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: viewMode === 'bubble' ? '#1E40AF' : '#E5E7EB',
                  color: viewMode === 'bubble' ? '#ffffff' : '#6B7280',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: viewMode === 'bubble' ? '600' : '400',
                  transition: 'all 0.2s',
                  fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (viewMode !== 'bubble') {
                    e.currentTarget.style.backgroundColor = '#D1D5DB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (viewMode !== 'bubble') {
                    e.currentTarget.style.backgroundColor = '#E5E7EB';
                  }
                }}
              >
                バブル表示
              </button>
              <button
                onClick={() => setViewMode('finder')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: viewMode === 'finder' ? '#3B82F6' : '#10B981',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = viewMode === 'finder' ? '#3B82F6' : '#10B981';
                }}
              >
                {viewMode === 'finder' ? '✓ Finder表示' : 'Finder表示'}
              </button>
            </div>
          </div>
          
          {/* ルート組織選択ボタンとフィルターボタン */}
          {orgData && (orgData.id === 'virtual-root' || getRootOrganizations().length > 1) && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: '#F0F9FF', 
              borderRadius: '8px',
              border: '1px solid #BAE6FD',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <div style={{ 
                    fontSize: '13px', 
                    fontWeight: '500', 
                    color: '#0369A1', 
                    marginBottom: '8px' 
                  }}>
                    表示する組織を選択:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setSelectedRootOrgId(null)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #BAE6FD',
                        backgroundColor: selectedRootOrgId === null ? '#0EA5E9' : '#fff',
                        color: selectedRootOrgId === null ? '#fff' : '#0369A1',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedRootOrgId !== null) {
                          e.currentTarget.style.backgroundColor = '#E0F2FE';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedRootOrgId !== null) {
                          e.currentTarget.style.backgroundColor = '#fff';
                        }
                      }}
                    >
                      すべて表示
                    </button>
                    {getRootOrganizations().map((rootOrg) => (
                      <button
                        key={rootOrg.id}
                        onClick={() => setSelectedRootOrgId(rootOrg.id || null)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #BAE6FD',
                          backgroundColor: selectedRootOrgId === rootOrg.id ? '#0EA5E9' : '#fff',
                          color: selectedRootOrgId === rootOrg.id ? '#fff' : '#0369A1',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedRootOrgId !== rootOrg.id) {
                            e.currentTarget.style.backgroundColor = '#E0F2FE';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedRootOrgId !== rootOrg.id) {
                            e.currentTarget.style.backgroundColor = '#fff';
                          }
                        }}
                      >
                        {rootOrg.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* フィルターボタン */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  <button
                    onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #BAE6FD',
                      backgroundColor: '#fff',
                      color: '#0369A1',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E0F2FE';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff';
                    }}
                  >
                    {isFilterExpanded ? '▼' : '▶'} フィルター
                    {searchQuery && (
                      <span style={{ 
                        marginLeft: '4px',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        backgroundColor: '#3B82F6',
                        color: '#fff',
                        fontSize: '11px',
                      }}>
                        適用中
                      </span>
                    )}
                  </button>
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchInput('');
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #BAE6FD',
                        backgroundColor: '#fff',
                        color: '#0369A1',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#E0F2FE';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fff';
                      }}
                    >
                      🔄 リセット
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* ルート組織が1つの場合、またはデータがない場合でもフィルターボタンを表示 */}
          {(!orgData || !(orgData.id === 'virtual-root' || getRootOrganizations().length > 1)) && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: '#F0F9FF', 
              borderRadius: '8px',
              border: '1px solid #BAE6FD',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #BAE6FD',
                    backgroundColor: '#fff',
                    color: '#0369A1',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E0F2FE';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                  }}
                >
                  {isFilterExpanded ? '▼' : '▶'} フィルター
                  {searchQuery && (
                    <span style={{ 
                      marginLeft: '4px',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      backgroundColor: '#3B82F6',
                      color: '#fff',
                      fontSize: '11px',
                    }}>
                      適用中
                    </span>
                  )}
                </button>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchInput('');
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #BAE6FD',
                      backgroundColor: '#fff',
                      color: '#0369A1',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E0F2FE';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff';
                    }}
                  >
                    🔄 リセット
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* フィルターUI（展開時） */}
          {isFilterExpanded ? (
            <div style={{ 
              marginTop: '16px', 
              padding: '16px', 
              backgroundColor: '#F9FAFB', 
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                {/* 検索ボックス */}
                <div style={{ flex: '1', minWidth: '250px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '6px' 
                  }}>
                    組織名で検索
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: '1' }}>
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setSearchQuery(searchInput.trim());
                          }
                        }}
                        placeholder="組織名、英語名、説明、メンバー名で検索..."
                        style={{
                          width: '100%',
                          padding: '8px 36px 8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #D1D5DB',
                          fontSize: '14px',
                          fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#3B82F6';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#D1D5DB';
                        }}
                      />
                      {searchInput && (
                        <button
                          onClick={() => {
                            setSearchInput('');
                            setSearchQuery('');
                          }}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6B7280',
                            fontSize: '18px',
                            lineHeight: '1',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#374151';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#6B7280';
                          }}
                          title="検索をクリア"
                        >
                          ×
                        </button>
                      )}
                      {!searchInput && (
                        <span style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#9CA3AF',
                          fontSize: '16px',
                          pointerEvents: 'none',
                        }}>
                          🔍
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setSearchQuery(searchInput.trim())}
                      disabled={!searchInput.trim() && !searchQuery}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: searchInput.trim() || searchQuery ? '#3B82F6' : '#D1D5DB',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: searchInput.trim() || searchQuery ? 'pointer' : 'not-allowed',
                        fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                        whiteSpace: 'nowrap',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (searchInput.trim() || searchQuery) {
                          e.currentTarget.style.backgroundColor = '#2563EB';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (searchInput.trim() || searchQuery) {
                          e.currentTarget.style.backgroundColor = '#3B82F6';
                        }
                      }}
                    >
                      検索
                    </button>
                  </div>
                </div>

              </div>
              
              {/* 検索候補の表示 */}
              {searchQuery && searchCandidates.length > 0 && (
                <div style={{ 
                  marginTop: '12px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                }}>
                  <div style={{ 
                    padding: '8px 12px',
                    backgroundColor: '#F9FAFB',
                    borderBottom: '1px solid #E5E7EB',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6B7280',
                  }}>
                    検索候補 ({searchCandidates.length}件)
                  </div>
                  {searchCandidates.map((candidate, index) => (
                    <div
                      key={candidate.org.id || index}
                      onClick={async () => {
                        // 候補をクリックしたときに、その組織を選択して表示
                        const foundOrg = findOrganizationById(selectedRootOrgTree, candidate.org.id || '');
                        if (foundOrg) {
                          await handleNodeClick(foundOrg, new MouseEvent('click'));
                          // 検索をクリア
                          setSearchQuery('');
                          setSearchInput('');
                        }
                      }}
                      style={{
                        padding: '10px 12px',
                        borderBottom: index < searchCandidates.length - 1 ? '1px solid #F3F4F6' : 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F3F4F6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fff';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#1F2937' }}>
                            {candidate.org.name}
                          </div>
                          {candidate.org.title && (
                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                              {candidate.org.title}
                            </div>
                          )}
                        </div>
                        <div style={{ 
                          fontSize: '11px',
                          color: '#9CA3AF',
                          padding: '2px 6px',
                          backgroundColor: '#F3F4F6',
                          borderRadius: '4px',
                        }}>
                          {Math.round(candidate.score * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* フィルター結果の表示 */}
              {(searchQuery || selectedRootOrgId) && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '10px 14px', 
                  backgroundColor: searchQuery && orgData && !filteredOrgData && searchCandidates.length === 0 ? '#FEF2F2' : '#EFF6FF', 
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: searchQuery && orgData && !filteredOrgData && searchCandidates.length === 0 ? '#DC2626' : '#1E40AF',
                  border: `1px solid ${searchQuery && orgData && !filteredOrgData && searchCandidates.length === 0 ? '#FECACA' : '#BFDBFE'}`,
                }}>
                  {orgData && filteredOrgData ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '500' }}>検索結果:</span>
                      {selectedRootOrgId && (
                        <span style={{ 
                          padding: '2px 8px',
                          backgroundColor: '#DBEAFE',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}>
                          組織: {getRootOrganizations().find(org => org.id === selectedRootOrgId)?.name || ''}
                        </span>
                      )}
                      {searchQuery && (
                        <span style={{ 
                          padding: '2px 8px',
                          backgroundColor: '#DBEAFE',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}>
                          「{searchQuery}」に一致
                        </span>
                      )}
                    </div>
                  ) : orgData && searchCandidates.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>⚠️</span>
                      <span>「{searchQuery}」に一致する組織が見つかりませんでした</span>
                    </div>
                  ) : (
                    <span>組織データがありません</span>
                  )}
                </div>
              )}
            </div>
          ) : null}
          
          <p style={{ marginTop: '16px', marginBottom: 0, fontSize: '14px', color: 'var(--color-text-light)' }}>
            {viewMode === 'hierarchy' 
              ? '組織の体制図を階層形式で表示します。ノードをクリックすると詳細情報が表示されます。'
              : '組織をバブルチャート形式で表示します。組織のバブルの中にメンバーが表示されます。ノードをクリックすると詳細情報が表示されます。'}
          </p>
          {error && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-error)' }}>
              ⚠️ {error}（サンプルデータを表示しています）
            </p>
          )}
        </div>
      </div>

      <div style={{ 
        display: 'flex',
        gap: '20px',
        height: '80vh',
        minHeight: '600px',
        alignItems: 'flex-start',
        width: '100%',
        flexDirection: 'row',
      }}>
        {viewMode === 'hierarchy' ? (
          <>
            <HierarchyView
              orgData={orgData}
              filteredOrgData={filteredOrgData}
              selectedNode={selectedNode}
              expandedMembers={expandedMembers}
              setExpandedMembers={setExpandedMembers}
              onNodeClick={handleNodeClick}
              onEditClick={() => setShowEditModal(true)}
              onNavigateToDetail={handleNavigateToDetail}
              onAddOrg={handleAddOrg}
              error={error}
            />
            <SelectedOrganizationPanel
              selectedNode={selectedNode}
              expandedMembers={expandedMembers}
              setExpandedMembers={setExpandedMembers}
              onEditClick={() => setShowEditModal(true)}
              onNavigateToDetail={handleNavigateToDetail}
              showCompanyDisplay={showCompanyDisplay}
            />
          </>
        ) : viewMode === 'bubble' ? (
          <>
            <BubbleView
              orgData={orgData}
              filteredOrgData={filteredOrgData}
              selectedNode={selectedNode}
              expandedMembers={expandedMembers}
              setExpandedMembers={setExpandedMembers}
              onNodeClick={handleNodeClick}
              onEditClick={() => setShowEditModal(true)}
              onNavigateToDetail={handleNavigateToDetail}
              onAddOrg={handleAddOrg}
              error={error}
            />
            <SelectedOrganizationPanel
              selectedNode={selectedNode}
              expandedMembers={expandedMembers}
              setExpandedMembers={setExpandedMembers}
              onEditClick={() => setShowEditModal(true)}
              onNavigateToDetail={handleNavigateToDetail}
              showCompanyDisplay={showCompanyDisplay}
            />
          </>
        ) : (
          <FinderView
                orgData={orgData}
                filteredOrgData={filteredOrgData}
                finderSelectedPath={finderSelectedPath}
                setFinderSelectedPath={setFinderSelectedPath}
                editingOrgId={editingOrgId}
                editingOrgName={editingOrgName}
                setEditingOrgId={setEditingOrgId}
                setEditingOrgName={setEditingOrgName}
                onReorderOrg={async (orgId: string, newPosition: number, parentId: string | null) => {
                  try {
                    // positionを更新
                    await updateOrg(orgId, undefined, undefined, undefined, newPosition);
                    
                    // 組織ツリーを再取得
                    const tree = await getOrgTreeFromDb();
                    if (tree) {
                      setOrgData(tree);
                      
                      // selectedPathを最新の組織ツリーから再構築
                      const rebuildSelectedPath = (currentPath: OrgNodeData[], newTree: OrgNodeData): OrgNodeData[] => {
                        const findOrgInTree = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
                          if (node.id === targetId) return node;
                          if (node.children) {
                            for (const child of node.children) {
                              const found = findOrgInTree(child, targetId);
                              if (found) return found;
                            }
                          }
                          return null;
                        };
                        
                        const newPath: OrgNodeData[] = [];
                        for (const org of currentPath) {
                          if (org.id) {
                            const updatedOrg = findOrgInTree(newTree, org.id);
                            if (updatedOrg) {
                              newPath.push(updatedOrg);
                            } else {
                              break;
                            }
                          }
                        }
                        return newPath;
                      };
                      
                      const updatedPath = rebuildSelectedPath(finderSelectedPath, tree);
                      setFinderSelectedPath(updatedPath);
                    }
                  } catch (error: any) {
                    console.error('❌ [onReorderOrg] 組織の順番変更に失敗しました:', error);
                    await tauriAlert(`組織の順番変更に失敗しました: ${error.message || error}`);
                  }
                }}
                onMoveOrg={async (orgId: string, newParentId: string | null) => {
                  try {
                    // 親を変更
                    await updateOrgParent(orgId, newParentId);
                    
                    // 組織ツリーを再取得
                    const tree = await getOrgTreeFromDb();
                    if (tree) {
                      setOrgData(tree);
                      
                      // selectedPathを最新の組織ツリーから再構築
                      const rebuildSelectedPath = (currentPath: OrgNodeData[], newTree: OrgNodeData): OrgNodeData[] => {
                        const findOrgInTree = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
                          if (node.id === targetId) return node;
                          if (node.children) {
                            for (const child of node.children) {
                              const found = findOrgInTree(child, targetId);
                              if (found) return found;
                            }
                          }
                          return null;
                        };
                        
                        const newPath: OrgNodeData[] = [];
                        for (const org of currentPath) {
                          if (org.id) {
                            const updatedOrg = findOrgInTree(newTree, org.id);
                            if (updatedOrg) {
                              newPath.push(updatedOrg);
                            } else {
                              // 移動した組織が現在のパスに含まれている場合は、パスをクリア
                              break;
                            }
                          }
                        }
                        return newPath;
                      };
                      
                      const updatedPath = rebuildSelectedPath(finderSelectedPath, tree);
                      setFinderSelectedPath(updatedPath);
                    }
                  } catch (error: any) {
                    console.error('❌ [onMoveOrg] 組織の移動に失敗しました:', error);
                    await tauriAlert(`組織の移動に失敗しました: ${error.message || error}`);
                  }
                }}
                onEditSave={async (orgId, newName) => {
                  try {
                    await updateOrg(orgId, newName);
                    const tree = await getOrgTreeFromDb();
                    if (tree) {
                      setOrgData(tree);
                      
                      // selectedPathを最新の組織ツリーから再構築
                      const rebuildSelectedPath = (currentPath: OrgNodeData[], newTree: OrgNodeData): OrgNodeData[] => {
                        const findOrgInTree = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
                          if (node.id === targetId) return node;
                          if (node.children) {
                            for (const child of node.children) {
                              const found = findOrgInTree(child, targetId);
                              if (found) return found;
                            }
                          }
                          return null;
                        };
                        
                        const newPath: OrgNodeData[] = [];
                        for (const org of currentPath) {
                          if (org.id) {
                            const updatedOrg = findOrgInTree(newTree, org.id);
                            if (updatedOrg) {
                              newPath.push(updatedOrg);
                            } else {
                              break;
                            }
                          }
                        }
                        return newPath;
                      };
                      
                      const updatedPath = rebuildSelectedPath(finderSelectedPath, tree);
                      setFinderSelectedPath(updatedPath);
                    }
                    setEditingOrgId(null);
                    setEditingOrgName('');
                  } catch (error: any) {
                    await tauriAlert(`組織名の更新に失敗しました: ${error.message || error}`);
                  }
                }}
                onCreateOrg={async (parentId, type) => {
                  try {
                    const findOrgInTree = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
                      if (node.id === targetId) return node;
                      if (node.children) {
                        for (const child of node.children) {
                          const found = findOrgInTree(child, targetId);
                          if (found) return found;
                        }
                      }
                      return null;
                    };
                    
                    const currentTree = filteredOrgData || orgData!;
                    if (!currentTree) {
                      await tauriAlert('組織データが読み込まれていません。ページをリロードしてください。');
                      return;
                    }
                    
                    let parentLevel = -1;
                    if (parentId) {
                      const parentOrg = findOrgInTree(currentTree, parentId);
                      if (!parentOrg) {
                        await tauriAlert(`親組織（ID: ${parentId}）が見つかりません。`);
                        return;
                      }
                      parentLevel = (parentOrg as any)?.level ?? 0;
                    }
                    
                    const level = parentLevel >= 0 ? parentLevel + 1 : 1;
                    const levelName = `階層レベル ${level}`;
                    
                    // デフォルト名をtypeに応じて設定
                    const defaultName = type === 'company' ? '新しい事業会社' : type === 'person' ? '新しい個人' : '新しい組織';
                    
                    console.log('🔍 [onCreateOrg] 組織を作成中:', {
                      parentId,
                      name: defaultName,
                      type: type || 'organization',
                      level,
                      levelName,
                    });
                    
                    // 組織を作成
                    const result = await createOrg(parentId, defaultName, null, null, level, levelName, 0, type);
                    
                    devLog('🔍 [onCreateOrg] createOrgの結果:', {
                      result,
                      hasId: !!result?.id,
                      id: result?.id,
                      fullResult: JSON.stringify(result, null, 2)
                    });
                    
                    if (!result || !result.id) {
                      throw new Error('組織の作成に失敗しました。IDが返されませんでした。');
                    }
                    
                    devLog('✅ [onCreateOrg] 組織を作成しました:', {
                      id: result.id,
                      name: result.name || '新しい組織',
                      parentId: result.parent_id || parentId,
                      level: result.level || level,
                      levelName: result.level_name || levelName
                    });
                    
                    // データベースの更新を待つために、複数回再取得を試みる
                    let tree: OrgNodeData | null = null;
                    let attempts = 0;
                    const maxAttempts = 5;
                    
                    while (attempts < maxAttempts && !tree) {
                      await new Promise(resolve => setTimeout(resolve, 300));
                      tree = await getOrgTreeFromDb();
                      
                      if (tree) {
                        // 作成された組織がツリーに含まれているか確認
                        const findNewOrg = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
                          if (node.id === targetId) return node;
                          if (node.children) {
                            for (const child of node.children) {
                              const found = findNewOrg(child, targetId);
                              if (found) return found;
                            }
                          }
                          return null;
                        };
                        
                        const foundOrg = findNewOrg(tree, result.id);
                        if (foundOrg) {
                          console.log('✅ [onCreateOrg] 作成された組織をツリーで確認:', result.id);
                          break;
                        } else {
                          console.log(`⏳ [onCreateOrg] 組織がまだツリーに反映されていません (試行 ${attempts + 1}/${maxAttempts})`);
                          tree = null; // 見つからない場合は再試行
                        }
                      }
                      attempts++;
                    }
                    
                    if (!tree) {
                      // 最後の試行として、もう一度取得
                      tree = await getOrgTreeFromDb();
                    }
                    
                    if (!tree) {
                      throw new Error('組織ツリーの取得に失敗しました。');
                    }
                    
                    console.log('✅ [onCreateOrg] 組織ツリーを更新:', tree);
                    setOrgData(tree);
                    
                    // selectedPathを最新の組織ツリーから再構築する関数
                    const rebuildSelectedPath = (currentPath: OrgNodeData[], newTree: OrgNodeData): OrgNodeData[] => {
                      const findOrgInTree = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
                        if (node.id === targetId) return node;
                        if (node.children) {
                          for (const child of node.children) {
                            const found = findOrgInTree(child, targetId);
                            if (found) return found;
                          }
                        }
                        return null;
                      };
                      
                      const newPath: OrgNodeData[] = [];
                      for (const org of currentPath) {
                        if (org.id) {
                          const updatedOrg = findOrgInTree(newTree, org.id);
                          if (updatedOrg) {
                            newPath.push(updatedOrg);
                          } else {
                            // 組織が見つからない場合は、パスをここで終了
                            break;
                          }
                        }
                      }
                      return newPath;
                    };
                    
                    // selectedPathを最新のツリーから再構築
                    const updatedPath = rebuildSelectedPath(finderSelectedPath, tree);
                    setFinderSelectedPath(updatedPath);
                    
                    // 新しく作成された組織を探す（作成されたIDを使用）
                    const newOrg = (() => {
                      const findNewOrg = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
                        if (node.id === targetId) return node;
                        if (node.children) {
                          for (const child of node.children) {
                            const found = findNewOrg(child, targetId);
                            if (found) return found;
                          }
                        }
                        return null;
                      };
                      return findNewOrg(tree, result.id);
                    })();
                    
                    devLog('🔍 [onCreateOrg] 作成された組織をツリーで検索:', {
                      searchId: result.id,
                      foundOrg: newOrg,
                      foundOrgId: newOrg?.id,
                      foundOrgName: newOrg?.name,
                      hasId: !!newOrg?.id
                    });
                    
                    if (newOrg?.id) {
                      devLog('✅ [onCreateOrg] 作成された組織が見つかりました。編集モードに設定:', {
                        id: newOrg.id,
                        name: newOrg.name
                      });
                      setEditingOrgId(newOrg.id);
                      setEditingOrgName(defaultName);
                      
                      // 親組織が選択されている場合、選択パスを更新して新しく作成された組織を表示
                      if (parentId) {
                        const parentOrg = findOrgInTree(tree, parentId);
                        if (parentOrg) {
                          // 親組織がパスに含まれているか確認
                          const parentIndex = updatedPath.findIndex(org => org.id === parentId);
                          if (parentIndex >= 0) {
                            // 親組織がパスにある場合、その位置までパスを更新（既に更新済み）
                            // 必要に応じて、新しく作成された組織の親を選択パスに追加
                          } else {
                            // 親組織がパスにない場合、親組織を追加
                            setFinderSelectedPath([...updatedPath, parentOrg]);
                          }
                        }
                      }
                    } else {
                      console.warn('⚠️ [onCreateOrg] 新しく作成された組織が見つかりませんでした:', result.id);
                    }
                  } catch (error: any) {
                    console.error('❌ [onCreateOrg] 組織の作成に失敗しました:', error);
                    const errorMessage = error?.response?.data?.error || error?.message || String(error);
                    await tauriAlert(`組織の作成に失敗しました: ${errorMessage}`);
                  }
                }}
                onDeleteOrg={async (orgId, orgName) => {
                  setOrgToDeleteInFinder({ id: orgId, name: orgName });
                  setShowFinderDeleteModal(true);
                }}
                error={error}
              />
        )}
      </div>


      {/* Finder形式用の組織削除確認モーダル */}
      {showFinderDeleteModal && orgToDeleteInFinder && (
        <DeleteOrganizationModal
          organization={{ id: orgToDeleteInFinder.id, name: orgToDeleteInFinder.name } as OrgNodeData}
          onClose={() => {
            setShowFinderDeleteModal(false);
            setOrgToDeleteInFinder(null);
          }}
          onConfirm={async () => {
            if (!orgToDeleteInFinder?.id) {
              console.error('❌ [Finder削除] orgToDeleteInFinder.idがありません');
              await tauriAlert('組織IDが取得できませんでした。');
              return;
            }

            try {
              devLog('🗑️ [Finder削除] 削除開始:', { id: orgToDeleteInFinder.id, name: orgToDeleteInFinder.name });
              
              const deletedOrgId = orgToDeleteInFinder.id;
              const deletedOrgName = orgToDeleteInFinder.name;
              
              await deleteOrg(deletedOrgId);
              devLog('✅ [Finder削除] 削除成功:', { id: deletedOrgId, name: deletedOrgName });
              
              // 組織ツリーを再取得
              const tree = await getOrgTreeFromDb();
              
              if (tree) {
                setOrgData(tree);
                
                // selectedPathを最新の組織ツリーから再構築（削除された組織を除外）
                const rebuildSelectedPath = (currentPath: OrgNodeData[], newTree: OrgNodeData): OrgNodeData[] => {
                  const findOrgInTree = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
                    if (node.id === targetId) return node;
                    if (node.children) {
                      for (const child of node.children) {
                        const found = findOrgInTree(child, targetId);
                        if (found) return found;
                      }
                    }
                    return null;
                  };
                  
                  const newPath: OrgNodeData[] = [];
                  for (const org of currentPath) {
                    if (org.id && org.id !== deletedOrgId) {
                      const updatedOrg = findOrgInTree(newTree, org.id);
                      if (updatedOrg) {
                        newPath.push(updatedOrg);
                      } else {
                        break;
                      }
                    } else if (org.id === deletedOrgId) {
                      // 削除された組織の場合は、パスをここで終了
                      break;
                    }
                  }
                  return newPath;
                };
                
                const updatedPath = rebuildSelectedPath(finderSelectedPath, tree);
                setFinderSelectedPath(updatedPath);
              }
              
              await tauriAlert('組織を削除しました');
              setShowFinderDeleteModal(false);
              setOrgToDeleteInFinder(null);
            } catch (error: any) {
              console.error('❌ [Finder削除] 削除処理でエラーが発生しました:', error);
              await tauriAlert(`組織の削除に失敗しました: ${error.message || error}`);
            }
          }}
        />
      )}

      {/* 組織削除確認モーダル */}
      {showDeleteOrgModal && orgToDelete && (
        <DeleteOrganizationModal
          organization={orgToDelete}
          onClose={() => {
            setShowDeleteOrgModal(false);
            setOrgToDelete(null);
          }}
          onConfirm={async () => {
            if (!orgToDelete?.id) {
              console.error('❌ [組織削除] orgToDelete.idがありません');
              await tauriAlert('組織IDが取得できませんでした。');
              return;
            }

            // 仮想的なルートノードは削除できない
            if (orgToDelete.id === 'virtual-root') {
              await tauriAlert('仮想的なルートノードは削除できません。実際の組織を選択してください。');
              return;
            }

            try {
              devLog('🗑️ [組織削除] 削除開始:', { id: orgToDelete.id, name: orgToDelete.name });
              
              // 削除前に選択状態を保存
              const deletedOrgId = orgToDelete.id;
              const deletedOrgName = orgToDelete.name;
              
              await deleteOrg(deletedOrgId);
              devLog('✅ [組織削除] 削除成功:', { id: deletedOrgId, name: deletedOrgName });
              
              // 組織ツリーを再取得
              const tree = await getOrgTreeFromDb();
              
              if (tree) {
                setOrgData(tree);
                
                // 削除された組織が選択されていた場合、選択をクリア
                if (selectedNode?.id === deletedOrgId) {
                  devLog('🗑️ [組織削除] 選択されていた組織が削除されました。選択をクリアします。');
                  setSelectedNode(null);
                  setSelectedNodeMembers([]);
                } else if (selectedNode?.id) {
                  // 選択されている組織がまだ存在する場合、最新のデータで更新
                  const foundOrg = findOrgInTree(tree, selectedNode.id);
                  if (foundOrg) {
                    devLog('✅ [組織削除] 選択されている組織を更新します:', foundOrg.name);
                    if (foundOrg.id) {
                      try {
                        const members = await getOrgMembers(foundOrg.id);
                        const memberInfos = mapMembersToMemberInfo(members);
                        const sortedMembers = sortMembersByPosition(memberInfos, foundOrg.name);
                        setSelectedNodeMembers(sortedMembers);
                        setSelectedNode({
                          ...foundOrg,
                          members: sortedMembers.map(m => {
                            if ('id' in m) {
                              const { id, ...memberWithoutId } = m as any;
                              return memberWithoutId;
                            }
                            return m;
                          }),
                        });
                      } catch (error: any) {
                        console.error('メンバー取得エラー:', error);
                        setSelectedNode(foundOrg);
                      }
                    } else {
                      setSelectedNode(foundOrg);
                    }
                  } else {
                    // 選択されている組織が見つからない場合、選択をクリア
                    devLog('⚠️ [組織削除] 選択されている組織が見つかりませんでした。選択をクリアします。');
                    setSelectedNode(null);
                    setSelectedNodeMembers([]);
                  }
                }
                
                devLog('✅ [組織削除] 組織ツリーを更新しました');
              } else {
                devWarn('⚠️ [組織削除] 組織ツリーの再取得に失敗しました');
                // ツリーが取得できない場合も選択をクリア
                setSelectedNode(null);
                setSelectedNodeMembers([]);
              }
              
              await tauriAlert(`組織「${deletedOrgName}」を削除しました。`);
              
              setShowDeleteOrgModal(false);
              setOrgToDelete(null);
              
              // 編集モーダルが開いていたら閉じる
              if (showEditModal) {
                setShowEditModal(false);
              }
            } catch (error: any) {
              console.error('❌ [組織削除] エラーが発生しました:', error);
              const errorMessage = error?.message || error?.toString() || '不明なエラー';
              console.error('❌ [組織削除] エラー詳細:', {
                message: errorMessage,
                id: orgToDelete.id,
                name: orgToDelete.name,
                error: error,
              });
              await tauriAlert(`組織の削除に失敗しました: ${errorMessage}\n\n組織ID: ${orgToDelete.id}\n組織名: ${orgToDelete.name}`);
              // エラーが発生してもモーダルを閉じる
              setShowDeleteOrgModal(false);
              setOrgToDelete(null);
            }
          }}
        />
      )}


      {/* 組織・メンバー編集モーダル */}
      {showEditModal && selectedNode && (
        <OrganizationEditModal
          organization={selectedNode}
          members={selectedNodeMembers}
          onClose={() => setShowEditModal(false)}
          onDeleteClick={() => {
            // 削除モーダルを表示
            setOrgToDelete(selectedNode);
            setShowDeleteOrgModal(true);
          }}
          onSave={async (updatedOrg, updatedMembers) => {
            try {
              // 組織データを再取得
              const tree = await getOrgTreeFromDb();
              if (tree && selectedNode.id) {
                const foundOrg = findOrgInTree(tree, selectedNode.id);
                if (foundOrg) {
                  // メンバーを再取得
                  const membersData = await getOrgMembers(selectedNode.id);
                  const memberInfos = mapMembersToMemberInfo(membersData);
                  const sortedMembers = sortMembersByPosition(memberInfos, foundOrg.name);
                  
                  // ID付きメンバー情報を保存（編集モーダル用）
                  setSelectedNodeMembers(sortedMembers);
                  
                  // ノードにメンバー情報を追加（IDなし、表示用）
                  setSelectedNode({
                    ...foundOrg,
                    members: sortedMembers.map(m => {
                      // idプロパティが存在する場合は削除
                      if ('id' in m) {
                        const { id, ...memberWithoutId } = m as any;
                      return memberWithoutId;
                      }
                      return m;
                    }),
                  });
                }
              }

              // 組織ツリー全体を更新
              if (tree) {
                setOrgData(tree);
              }

              await tauriAlert('保存が完了しました');
              setShowEditModal(false);
            } catch (error: any) {
              console.error('保存エラー:', error);
              await tauriAlert(`保存に失敗しました: ${error.message}`);
            }
          }}
        />
      )}
    </Layout>
  );
}

// 削除済み: OrganizationEditModalはcomponents/modals/OrganizationEditModal.tsxに移動しました
// 削除済み: FinderColumnViewはcomponents/FinderColumnView.tsxに既に存在します（重複削除）
// 削除済み: AddOrganizationModalはcomponents/modals/AddOrganizationModal.tsxに移動しました


