import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { OrgNodeData, MemberInfo } from '@/components/OrgChart';
import { getOrgTreeFromDb, getOrgMembers, createOrg, tauriAlert } from '@/lib/orgApi';
import { sortMembersByPosition } from '@/lib/memberSort';
import { mapMembersToMemberInfo } from '../utils/organizationUtils';
import { devLog, devWarn } from '../utils/devLog';

export function useOrganizationManagement(
  setOrgData: (data: OrgNodeData | null) => void,
  setSelectedNode: (node: OrgNodeData | null) => void,
  setSelectedNodeMembers: (members: (MemberInfo & { id?: string })[]) => void
) {
  const router = useRouter();

  const handleNodeClick = useCallback(async (node: OrgNodeData, event: MouseEvent) => {
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
  }, [setSelectedNode, setSelectedNodeMembers]);

  const handleNavigateToDetail = useCallback((selectedNode: OrgNodeData | null) => {
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
  }, [router]);

  const handleAddOrg = useCallback(async () => {
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
  }, [setOrgData, setSelectedNode, setSelectedNodeMembers]);

  return {
    handleNodeClick,
    handleNavigateToDetail,
    handleAddOrg,
  };
}

