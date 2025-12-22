import { useState, useEffect } from 'react';
import { getOrgTreeFromDb, findOrganizationById, getOrgMembers, getFocusInitiatives, getMeetingNotes, getOrganizationContent } from '@/lib/orgApi';
import type { OrgNodeData } from '@/components/OrgChart';
import type { FocusInitiative, MeetingNote, OrganizationContent } from '@/lib/orgApi';
import { sortMembersByPosition } from '@/lib/memberSort';

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

export interface UseOrganizationDataReturn {
  organization: OrgNodeData | null;
  organizationContent: OrganizationContent | null;
  focusInitiatives: FocusInitiative[];
  initiativesByOrg: Map<string, { orgName: string; initiatives: FocusInitiative[] }>;
  meetingNotes: MeetingNote[];
  setMeetingNotes: React.Dispatch<React.SetStateAction<MeetingNote[]>>;
  loading: boolean;
  error: string | null;
  reloadInitiatives: (orgId: string, orgTree: OrgNodeData | null) => Promise<void>;
}

export function useOrganizationData(organizationId: string | null): UseOrganizationDataReturn {
  const [organization, setOrganization] = useState<OrgNodeData | null>(null);
  const [organizationContent, setOrganizationContent] = useState<OrganizationContent | null>(null);
  const [focusInitiatives, setFocusInitiatives] = useState<FocusInitiative[]>([]);
  const [initiativesByOrg, setInitiativesByOrg] = useState<Map<string, { orgName: string; initiatives: FocusInitiative[] }>>(new Map());
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 注力施策を再取得して状態を更新する共通関数
  const reloadInitiatives = async (orgId: string, orgTree: OrgNodeData | null) => {
    try {
      // 現在の組織の注力施策を取得
      const currentInitiatives = await getFocusInitiatives(orgId);
      
      // 子組織のIDを収集
      const childOrgIds: string[] = [];
      const collectChildOrgIds = (org: OrgNodeData) => {
        if (org.children) {
          for (const child of org.children) {
            if (child.id) {
              childOrgIds.push(child.id);
            }
            collectChildOrgIds(child); // 再帰的に子組織を収集
          }
        }
      };
      
      if (orgTree) {
        const findOrg = (node: OrgNodeData): OrgNodeData | null => {
          if (node.id === orgId) return node;
          if (node.children) {
            for (const child of node.children) {
              const found = findOrg(child);
              if (found) return found;
            }
          }
          return null;
        };
        const foundOrg = findOrg(orgTree);
        if (foundOrg) {
          collectChildOrgIds(foundOrg);
        }
      }
      
      // 子組織の注力施策を取得
      const childInitiatives: FocusInitiative[] = [];
      for (const childOrgId of childOrgIds) {
        try {
          const childInitiativesData = await getFocusInitiatives(childOrgId);
          childInitiatives.push(...childInitiativesData);
        } catch (error) {
          devWarn(`⚠️ [reloadInitiatives] 子組織 ${childOrgId} の注力施策取得に失敗:`, error);
        }
      }
      
      // すべての注力施策を設定
      const allInitiatives = [...currentInitiatives, ...childInitiatives];
      setFocusInitiatives(allInitiatives);
      
      // 組織ごとにグループ化
      const initiativesByOrgMap = new Map<string, { orgName: string; initiatives: FocusInitiative[] }>();
      
      // 現在の組織の注力施策
      if (currentInitiatives.length > 0 || orgId === organizationId) {
        const findOrgName = (org: OrgNodeData, targetId: string): string | null => {
          if (org.id === targetId) {
            return org.name || org.title || targetId;
          }
          if (org.children) {
            for (const child of org.children) {
              const found = findOrgName(child, targetId);
              if (found) return found;
            }
          }
          return null;
        };
        
        const orgName = orgTree ? findOrgName(orgTree, orgId) : null;
        initiativesByOrgMap.set(orgId, {
          orgName: orgName || orgId,
          initiatives: currentInitiatives,
        });
      }
      
      // 子組織の注力施策
      for (const childOrgId of childOrgIds) {
        const childInitiativesForOrg = childInitiatives.filter(init => init.organizationId === childOrgId);
        if (childInitiativesForOrg.length > 0) {
          // 組織名を取得
          const findOrgName = (org: OrgNodeData, targetId: string): string | null => {
            if (org.id === targetId) {
              return org.name || org.title || targetId;
            }
            if (org.children) {
              for (const child of org.children) {
                const found = findOrgName(child, targetId);
                if (found) return found;
              }
            }
            return null;
          };
          
          const orgName = orgTree ? findOrgName(orgTree, childOrgId) : null;
          initiativesByOrgMap.set(childOrgId, {
            orgName: orgName || childOrgId,
            initiatives: childInitiativesForOrg,
          });
        }
      }
      
      setInitiativesByOrg(initiativesByOrgMap);
      
      devLog('📋 [reloadInitiatives] 注力施策を再取得しました:', {
        currentOrg: orgId,
        currentCount: currentInitiatives.length,
        childOrgsCount: childOrgIds.length,
        childCount: childInitiatives.length,
        totalCount: allInitiatives.length,
      });
    } catch (error: any) {
      console.error('❌ [reloadInitiatives] 注力施策の再取得に失敗しました:', error);
    }
  };

  useEffect(() => {
    devLog('🚀 [useEffect] loadOrganizationData開始:', { organizationId });
    const loadOrganizationData = async () => {
      if (!organizationId) {
        devWarn('⚠️ [loadOrganizationData] 組織IDが指定されていません');
        setError('組織IDが指定されていません');
        setLoading(false);
        return;
      }

      devLog('📋 [loadOrganizationData] 関数実行開始:', { organizationId });
      try {
        setLoading(true);
        setError(null);
        
        // 組織ツリーを取得してから、指定されたIDの組織を検索
        const orgTree = await getOrgTreeFromDb();
        if (!orgTree) {
          setError('組織データが見つかりません');
          setLoading(false);
          return;
        }
        
        // デバッグ: 組織ツリーのルートノードのIDを確認
        devLog('🔍 [loadOrganizationData] デバッグ情報:', {
          organizationIdFromURL: organizationId,
          rootOrgId: orgTree.id,
          rootOrgName: orgTree.name,
        });
        
        const foundOrg = findOrganizationById(orgTree, organizationId);
        
        // デバッグ: 見つかった組織の情報を確認
        if (foundOrg) {
          devLog('✅ [loadOrganizationData] 組織が見つかりました:', {
            foundOrgId: foundOrg.id,
            foundOrgName: foundOrg.name,
          });
        } else {
          devWarn('⚠️ [loadOrganizationData] 組織が見つかりませんでした:', {
            searchId: organizationId,
            rootOrgId: orgTree.id,
          });
        }
        if (!foundOrg) {
          setError('指定された組織が見つかりません');
          setLoading(false);
          return;
        }
        
        // foundOrg.idがorganizationsテーブルに存在するか確認
        // 存在しない場合は、foundOrg.nameで組織を検索して正しいidを取得
        let validOrganizationId = foundOrg.id;
        
        // デバッグ: まず、organizationsテーブルに実際にどのようなIDが存在するか確認
        try {
          const { callTauriCommand } = await import('@/lib/localFirebase');
          
          // すべての組織を取得して、IDのリストを確認
          const allOrgsResult = await callTauriCommand('collection_get', {
            collectionName: 'organizations',
          });
          
          // 大きなデータ構造のログを簡略化（パフォーマンス最適化）
          devLog('🔍 [loadOrganizationData] organizationsテーブル:', {
            count: allOrgsResult?.length || 0,
            searchId: validOrganizationId,
            foundOrgName: foundOrg.name,
          });
          
          // 特定のIDで検索
          try {
            const orgCheckResult = await callTauriCommand('doc_get', {
              collectionName: 'organizations',
              docId: validOrganizationId,
            });
            
            if (!orgCheckResult || !orgCheckResult.exists) {
              devWarn('⚠️ [loadOrganizationData] foundOrg.idがorganizationsテーブルに存在しません:', {
                foundOrgId: validOrganizationId,
                foundOrgName: foundOrg.name,
              });
              
              // 名前で組織を検索
              const { searchOrgsByName } = await import('@/lib/orgApi');
              const searchResults = await searchOrgsByName(foundOrg.name || '');
              devLog('🔍 [loadOrganizationData] 名前で検索した結果数:', searchResults?.length || 0);
              
              if (searchResults && searchResults.length > 0) {
                // 完全一致する組織を探す
                const exactMatch = searchResults.find((org: any) => org.name === foundOrg.name);
                if (exactMatch && exactMatch.id) {
                  validOrganizationId = exactMatch.id;
                  devLog('✅ [loadOrganizationData] 名前で検索して正しいIDを取得:', validOrganizationId);
                } else if (searchResults[0] && searchResults[0].id) {
                  // 完全一致がない場合は最初の結果を使用
                  validOrganizationId = searchResults[0].id;
                  devWarn('⚠️ [loadOrganizationData] 完全一致が見つかりませんでした。最初の結果を使用:', validOrganizationId);
                }
              }
            } else {
              devLog('✅ [loadOrganizationData] foundOrg.idがorganizationsテーブルに存在します:', validOrganizationId);
            }
          } catch (docGetError: any) {
            // doc_getがエラーを返す場合（「Query returned no rows」）は、組織が存在しないことを意味する
            if (docGetError?.message?.includes('Query returned no rows') || 
                docGetError?.message?.includes('ドキュメント取得エラー')) {
              devWarn('⚠️ [loadOrganizationData] foundOrg.idがorganizationsテーブルに存在しません（doc_getが行を返さない）:', {
                foundOrgId: validOrganizationId,
                foundOrgName: foundOrg.name,
              });
              
              // 名前で組織を検索
              try {
                const { searchOrgsByName } = await import('@/lib/orgApi');
                const searchResults = await searchOrgsByName(foundOrg.name || '');
                devLog('🔍 [loadOrganizationData] 名前で検索した結果数:', searchResults?.length || 0);
                
                if (searchResults && searchResults.length > 0) {
                  // 完全一致する組織を探す
                  const exactMatch = searchResults.find((org: any) => org.name === foundOrg.name);
                  if (exactMatch && exactMatch.id) {
                    validOrganizationId = exactMatch.id;
                    devLog('✅ [loadOrganizationData] 名前で検索して正しいIDを取得:', validOrganizationId);
                  } else if (searchResults[0] && searchResults[0].id) {
                    // 完全一致がない場合は最初の結果を使用
                    validOrganizationId = searchResults[0].id;
                    devWarn('⚠️ [loadOrganizationData] 完全一致が見つかりませんでした。最初の結果を使用:', validOrganizationId);
                  }
                }
              } catch (searchError: any) {
                devWarn('⚠️ [loadOrganizationData] 名前での検索に失敗しました:', searchError);
              }
            } else {
              // その他のエラーの場合は警告のみ
              devWarn('⚠️ [loadOrganizationData] 組織IDの確認でエラーが発生しました（続行します）:', docGetError);
            }
          }
        } catch (orgCheckError: any) {
          devWarn('⚠️ [loadOrganizationData] 組織IDの確認でエラーが発生しました（続行します）:', orgCheckError);
          // エラーが発生しても続行（foundOrg.idを使用）
        }
        
        // メンバー情報を取得
        if (validOrganizationId) {
          try {
            const members = await getOrgMembers(validOrganizationId);
            devLog('✅ [loadOrganizationData] メンバーを取得:', {
              count: members?.length || 0,
            });
            const sortedMembers = sortMembersByPosition(members, foundOrg.name);
            // 正しいIDを確実に設定
            // foundOrgからmembersを削除してから新しいmembersを設定
            const { members: _, ...foundOrgWithoutMembers } = foundOrg;
            const updatedOrg: OrgNodeData = {
              ...foundOrgWithoutMembers,
              id: validOrganizationId, // 正しいIDを設定
              members: sortedMembers, // 新しく取得したメンバーを設定
            };
            setOrganization(updatedOrg);
            devLog('✅ [loadOrganizationData] organizationオブジェクトを設定:', {
              id: updatedOrg.id,
              name: updatedOrg.name,
              membersCount: updatedOrg.members?.length || 0,
            });
            
            // 組織コンテンツ、注力施策、議事録を取得
            try {
              const content = await getOrganizationContent(validOrganizationId);
              setOrganizationContent(content);
            } catch (contentError: any) {
              devWarn('組織コンテンツの取得に失敗しました:', contentError);
            }
            
            try {
              // 現在の組織の注力施策を取得
              const currentInitiatives = await getFocusInitiatives(validOrganizationId);
              
              // 子組織のIDを収集
              const childOrgIds: string[] = [];
              const collectChildOrgIds = (org: OrgNodeData) => {
                if (org.children) {
                  for (const child of org.children) {
                    if (child.id) {
                      childOrgIds.push(child.id);
                    }
                    collectChildOrgIds(child); // 再帰的に子組織を収集
                  }
                }
              };
              
              if (updatedOrg) {
                collectChildOrgIds(updatedOrg);
              }
              
              devLog('📋 [loadOrganizationData] 子組織ID数:', childOrgIds.length);
              
              // 子組織の注力施策を取得
              const childInitiatives: FocusInitiative[] = [];
              for (const childOrgId of childOrgIds) {
                try {
                  const childInitiativesData = await getFocusInitiatives(childOrgId);
                  childInitiatives.push(...childInitiativesData);
                } catch (error) {
                  devWarn(`⚠️ [loadOrganizationData] 子組織 ${childOrgId} の注力施策取得に失敗:`, error);
                }
              }
              
              // すべての注力施策を設定
              const allInitiatives = [...currentInitiatives, ...childInitiatives];
              setFocusInitiatives(allInitiatives);
              
              // 組織ごとにグループ化
              const initiativesByOrgMap = new Map<string, { orgName: string; initiatives: FocusInitiative[] }>();
              
              // 現在の組織の注力施策
              if (currentInitiatives.length > 0) {
                initiativesByOrgMap.set(validOrganizationId, {
                  orgName: updatedOrg?.name || updatedOrg?.title || validOrganizationId,
                  initiatives: currentInitiatives,
                });
              }
              
              // 子組織の注力施策
              for (const childOrgId of childOrgIds) {
                const childInitiativesForOrg = childInitiatives.filter(init => init.organizationId === childOrgId);
                if (childInitiativesForOrg.length > 0) {
                  // 組織名を取得
                  const findOrgName = (org: OrgNodeData, targetId: string): string | null => {
                    if (org.id === targetId) {
                      return org.name || org.title || targetId;
                    }
                    if (org.children) {
                      for (const child of org.children) {
                        const found = findOrgName(child, targetId);
                        if (found) return found;
                      }
                    }
                    return null;
                  };
                  
                  const orgName = updatedOrg ? findOrgName(updatedOrg, childOrgId) : null;
                  initiativesByOrgMap.set(childOrgId, {
                    orgName: orgName || childOrgId,
                    initiatives: childInitiativesForOrg,
                  });
                }
              }
              
              setInitiativesByOrg(initiativesByOrgMap);
              
              devLog('📋 [loadOrganizationData] 組織ごとの注力施策:', {
                currentOrg: validOrganizationId,
                currentCount: currentInitiatives.length,
                childOrgsCount: childOrgIds.length,
                childCount: childInitiatives.length,
                totalCount: allInitiatives.length,
                byOrgCount: initiativesByOrgMap.size,
              });
            } catch (initError: any) {
              devWarn('注力施策の取得に失敗しました:', initError);
            }
            
            try {
              const notes = await getMeetingNotes(validOrganizationId);
              setMeetingNotes(notes);
            } catch (noteError: any) {
              devWarn('議事録の取得に失敗しました:', noteError);
            }
          } catch (memberError: any) {
            devWarn('メンバー情報の取得に失敗しました:', memberError);
            // 正しいIDを確実に設定
            const updatedOrg: OrgNodeData = {
              ...foundOrg,
              id: validOrganizationId || foundOrg.id, // 正しいIDを設定
            };
            setOrganization(updatedOrg);
            devLog('✅ [loadOrganizationData] organizationオブジェクトを設定（メンバー取得失敗時）:', {
              id: updatedOrg.id,
              name: updatedOrg.name,
            });
          }
        } else {
          // validOrganizationIdが取得できなかった場合でも、foundOrgを設定
          const updatedOrg: OrgNodeData = {
            ...foundOrg,
            id: validOrganizationId || foundOrg.id, // 可能な限り正しいIDを設定
          };
          setOrganization(updatedOrg);
          devLog('⚠️ [loadOrganizationData] validOrganizationIdが取得できませんでした。foundOrgを設定:', {
            id: updatedOrg.id,
            name: updatedOrg.name,
          });
        }
      } catch (err: any) {
        console.error('組織データの取得に失敗しました:', err);
        setError(err.message || '組織データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadOrganizationData();
  }, [organizationId]);

  return {
    organization,
    organizationContent,
    focusInitiatives,
    initiativesByOrg,
    meetingNotes,
    setMeetingNotes,
    loading,
    error,
    reloadInitiatives,
  };
}

