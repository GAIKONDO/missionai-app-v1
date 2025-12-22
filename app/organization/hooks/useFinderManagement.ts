import { useCallback } from 'react';
import type { OrgNodeData } from '@/components/OrgChart';
import { getOrgTreeFromDb, updateOrg, updateOrgParent, createOrg, tauriAlert } from '@/lib/orgApi';
import { findOrgInTree } from '../utils/organizationUtils';
import { devLog } from '../utils/devLog';

export function useFinderManagement(
  setOrgData: (data: OrgNodeData | null) => void,
  finderSelectedPath: OrgNodeData[],
  setFinderSelectedPath: (path: OrgNodeData[]) => void,
  setEditingOrgId: (id: string | null) => void,
  setEditingOrgName: (name: string) => void,
  filteredOrgData: OrgNodeData | null,
  orgData: OrgNodeData | null
) {
  const rebuildSelectedPath = useCallback((currentPath: OrgNodeData[], newTree: OrgNodeData): OrgNodeData[] => {
    const findOrgInTreeHelper = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
      if (node.id === targetId) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findOrgInTreeHelper(child, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    
    const newPath: OrgNodeData[] = [];
    for (const org of currentPath) {
      if (org.id) {
        const updatedOrg = findOrgInTreeHelper(newTree, org.id);
        if (updatedOrg) {
          newPath.push(updatedOrg);
        } else {
          break;
        }
      }
    }
    return newPath;
  }, []);

  const handleReorderOrg = useCallback(async (orgId: string, newPosition: number, parentId: string | null) => {
    try {
      await updateOrg(orgId, undefined, undefined, undefined, newPosition);
      const tree = await getOrgTreeFromDb();
      if (tree) {
        setOrgData(tree);
        const updatedPath = rebuildSelectedPath(finderSelectedPath, tree);
        setFinderSelectedPath(updatedPath);
      }
    } catch (error: any) {
      console.error('❌ [onReorderOrg] 組織の順番変更に失敗しました:', error);
      await tauriAlert(`組織の順番変更に失敗しました: ${error.message || error}`);
    }
  }, [finderSelectedPath, rebuildSelectedPath, setOrgData, setFinderSelectedPath]);

  const handleMoveOrg = useCallback(async (orgId: string, newParentId: string | null) => {
    try {
      await updateOrgParent(orgId, newParentId);
      const tree = await getOrgTreeFromDb();
      if (tree) {
        setOrgData(tree);
        const updatedPath = rebuildSelectedPath(finderSelectedPath, tree);
        setFinderSelectedPath(updatedPath);
      }
    } catch (error: any) {
      console.error('❌ [onMoveOrg] 組織の移動に失敗しました:', error);
      await tauriAlert(`組織の移動に失敗しました: ${error.message || error}`);
    }
  }, [finderSelectedPath, rebuildSelectedPath, setOrgData, setFinderSelectedPath]);

  const handleEditSave = useCallback(async (orgId: string, newName: string) => {
    try {
      await updateOrg(orgId, newName);
      const tree = await getOrgTreeFromDb();
      if (tree) {
        setOrgData(tree);
        const updatedPath = rebuildSelectedPath(finderSelectedPath, tree);
        setFinderSelectedPath(updatedPath);
      }
      setEditingOrgId(null);
      setEditingOrgName('');
    } catch (error: any) {
      await tauriAlert(`組織名の更新に失敗しました: ${error.message || error}`);
    }
  }, [finderSelectedPath, rebuildSelectedPath, setOrgData, setFinderSelectedPath, setEditingOrgId, setEditingOrgName]);

  const handleCreateOrg = useCallback(async (parentId: string | null, type?: string) => {
    try {
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
      const defaultName = type === 'company' ? '新しい事業会社' : type === 'person' ? '新しい個人' : '新しい組織';
      
      devLog('🔍 [onCreateOrg] 組織を作成中:', {
        parentId,
        name: defaultName,
        type: type || 'organization',
        level,
        levelName,
      });
      
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
            tree = null;
          }
        }
        attempts++;
      }
      
      if (!tree) {
        tree = await getOrgTreeFromDb();
      }
      
      if (!tree) {
        throw new Error('組織ツリーの取得に失敗しました。');
      }
      
      console.log('✅ [onCreateOrg] 組織ツリーを更新:', tree);
      setOrgData(tree);
      
      const updatedPath = rebuildSelectedPath(finderSelectedPath, tree);
      setFinderSelectedPath(updatedPath);
      
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
        
        if (parentId) {
          const parentOrg = findOrgInTree(tree, parentId);
          if (parentOrg) {
            const parentIndex = updatedPath.findIndex(org => org.id === parentId);
            if (parentIndex < 0) {
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
  }, [filteredOrgData, orgData, finderSelectedPath, rebuildSelectedPath, setOrgData, setFinderSelectedPath, setEditingOrgId, setEditingOrgName]);

  return {
    handleReorderOrg,
    handleMoveOrg,
    handleEditSave,
    handleCreateOrg,
  };
}

