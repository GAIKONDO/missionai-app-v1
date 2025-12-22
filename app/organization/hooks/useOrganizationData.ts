import { useState, useEffect } from 'react';
import type { OrgNodeData, MemberInfo } from '@/components/OrgChart';
import { getOrgTreeFromDb, getOrgMembers } from '@/lib/orgApi';
import { sortMembersByPosition } from '@/lib/memberSort';
import { mapMembersToMemberInfo } from '../utils/organizationUtils';
import { removeIctDivisionDuplicates } from '@/lib/remove-ict-division-duplicates';
import { devLog, devWarn } from '../utils/devLog';
import { saveBpoMembersOnly } from '@/lib/save-bpo-members-only';
import { saveFrontierBusinessMembers } from '@/lib/save-frontier-business-members';
import { saveIctDivisionMembers } from '@/lib/save-ict-division-members';
import { reorderFrontierBusiness } from '@/lib/reorder-frontier-business';

export function useOrganizationData() {
  const [selectedNode, setSelectedNode] = useState<OrgNodeData | null>(null);
  const [orgData, setOrgData] = useState<OrgNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeMembers, setSelectedNodeMembers] = useState<(MemberInfo & { id?: string })[]>([]);

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
          if (process.env.NODE_ENV === 'development') {
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

  const refreshOrgData = async () => {
    const data = await getOrgTreeFromDb();
    if (data) {
      setOrgData(data);
    }
    return data;
  };

  return {
    selectedNode,
    setSelectedNode,
    orgData,
    setOrgData,
    loading,
    error,
    selectedNodeMembers,
    setSelectedNodeMembers,
    refreshOrgData,
  };
}

