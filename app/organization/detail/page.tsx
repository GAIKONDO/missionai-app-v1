'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { getOrgTreeFromDb, findOrganizationById, getOrgMembers, getFocusInitiatives, getMeetingNotes, getOrganizationContent, saveFocusInitiative, deleteFocusInitiative, generateUniqueInitiativeId, saveMeetingNote, deleteMeetingNote, generateUniqueMeetingNoteId, tauriAlert, tauriConfirm } from '@/lib/orgApi';
import type { OrgNodeData } from '@/components/OrgChart';
import type { FocusInitiative, MeetingNote, OrganizationContent } from '@/lib/orgApi';
import { sortMembersByPosition } from '@/lib/memberSort';
import { getCompaniesByOrganizationId, getCompanyById } from '@/lib/companiesApi';
import type { Company } from '@/lib/companiesApi';
import { getCompaniesByOrganizationDisplay } from '@/lib/organizationCompanyDisplayApi';
import type { OrganizationCompanyDisplay } from '@/lib/organizationCompanyDisplayApi';

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

type TabType = 'introduction' | 'focusAreas' | 'focusInitiatives' | 'meetingNotes';

function OrganizationDetailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const organizationId = searchParams?.get('id') as string;
  const tabParam = searchParams?.get('tab') as TabType | null;
  
  const [organization, setOrganization] = useState<OrgNodeData | null>(null);
  const [organizationContent, setOrganizationContent] = useState<OrganizationContent | null>(null);
  const [focusInitiatives, setFocusInitiatives] = useState<FocusInitiative[]>([]);
  const [initiativesByOrg, setInitiativesByOrg] = useState<Map<string, { orgName: string; initiatives: FocusInitiative[] }>>(new Map()); // 組織ごとの注力施策
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(new Set()); // 開いている子組織のID
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'introduction');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 注力施策追加モーダルの状態
  const [showAddInitiativeModal, setShowAddInitiativeModal] = useState(false);
  const [newInitiativeTitle, setNewInitiativeTitle] = useState('');
  const [newInitiativeDescription, setNewInitiativeDescription] = useState('');
  const [newInitiativeId, setNewInitiativeId] = useState<string>('');
  const [savingInitiative, setSavingInitiative] = useState(false);
  
  // 注力施策編集・削除の状態
  const [editingInitiativeId, setEditingInitiativeId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteTargetInitiativeId, setDeleteTargetInitiativeId] = useState<string | null>(null);
  
  // 議事録追加モーダルの状態
  const [showAddMeetingNoteModal, setShowAddMeetingNoteModal] = useState(false);
  const [newMeetingNoteTitle, setNewMeetingNoteTitle] = useState('');
  const [newMeetingNoteDescription, setNewMeetingNoteDescription] = useState('');
  const [newMeetingNoteId, setNewMeetingNoteId] = useState<string>('');
  const [savingMeetingNote, setSavingMeetingNote] = useState(false);
  
  // 議事録編集・削除の状態
  const [editingMeetingNoteId, setEditingMeetingNoteId] = useState<string | null>(null);
  const [editingMeetingNoteTitle, setEditingMeetingNoteTitle] = useState('');
  const [showDeleteMeetingNoteConfirmModal, setShowDeleteMeetingNoteConfirmModal] = useState(false);
  const [deleteTargetMeetingNoteId, setDeleteTargetMeetingNoteId] = useState<string | null>(null);

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
          
          // 情報・通信部門のIDを探す
          const ictDivision = allOrgsResult?.find((org: any) => {
            const orgData = org.data || org;
            return orgData?.name === '情報・通信部門' || orgData?.name === foundOrg.name;
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
            
            try {
              // 新しいテーブル（organizationCompanyDisplay）から表示関係を取得
              const displays = await getCompaniesByOrganizationDisplay(validOrganizationId);
              devLog('🔍 [loadOrganizationData] 表示関係を取得:', {
                organizationId: validOrganizationId,
                displaysCount: displays?.length || 0,
              });
              
              if (displays && displays.length > 0) {
                // 表示関係から会社IDのリストを取得し、表示順序でソート
                const sortedDisplays = [...displays].sort((a, b) => a.displayOrder - b.displayOrder);
                
                // 各会社IDで会社情報を取得
                const companiesPromises = sortedDisplays.map(display => {
                  const companyId = display.companyId;
                  if (!companyId) {
                    devWarn('⚠️ [loadOrganizationData] companyIdが取得できません:', display);
                    return Promise.resolve(null);
                  }
                  return getCompanyById(companyId).catch(err => {
                    devWarn(`事業会社の取得に失敗しました (ID: ${companyId}):`, err);
                    return null;
                  });
                });
                
                const companiesData = await Promise.all(companiesPromises);
                // nullを除外してCompany[]に変換
                const validCompanies = companiesData.filter((c): c is Company => c !== null);
                devLog('✅ [loadOrganizationData] 事業会社を取得:', {
                  count: validCompanies.length,
                });
                setCompanies(validCompanies);
              } else {
                // 表示関係がない場合は空配列を設定
                devLog('⚠️ [loadOrganizationData] 表示関係がありません');
                setCompanies([]);
              }
            } catch (companyError: any) {
              devWarn('事業会社の取得に失敗しました:', companyError);
              setCompanies([]);
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

  // タブパラメータが変更されたときにactiveTabを更新
  useEffect(() => {
    if (tabParam && ['introduction', 'focusAreas', 'focusInitiatives', 'meetingNotes'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (!tabParam) {
      setActiveTab('introduction');
    }
  }, [tabParam]);

  if (loading) {
    return (
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>組織データを読み込み中...</p>
        </div>
      </Layout>
    );
  }

  if (error || !organization) {
    return (
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#EF4444', marginBottom: '20px' }}>{error || '組織が見つかりません'}</p>
          <button
            onClick={() => router.push('/organization')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            組織一覧に戻る
          </button>
        </div>
      </Layout>
    );
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/organization/detail?id=${organizationId}&tab=${tab}`);
  };

  // 注力施策追加モーダルを開く
  const handleOpenAddInitiativeModal = () => {
    const newId = generateUniqueInitiativeId();
    setNewInitiativeId(newId);
    setNewInitiativeTitle('');
    setNewInitiativeDescription('');
    setShowAddInitiativeModal(true);
  };

  // 注力施策を追加
  const handleAddInitiative = async () => {
    if (!newInitiativeTitle.trim()) {
      await tauriAlert('タイトルを入力してください');
      return;
    }

    // organizationオブジェクトから正しいIDを取得
    // organizationオブジェクトがまだ設定されていない場合は、organizationIdを直接使用
    let validOrgId = organization?.id || organizationId;
    
    // organizationIdがorganizationsテーブルに存在するか確認
    if (validOrgId) {
      try {
        const { callTauriCommand } = await import('@/lib/localFirebase');
        const orgCheckResult = await callTauriCommand('doc_get', {
          collectionName: 'organizations',
          docId: validOrgId,
        });
        if (!orgCheckResult || !orgCheckResult.exists) {
          devWarn('⚠️ [handleAddInitiative] organizationIdがorganizationsテーブルに存在しません。名前で検索します:', {
            organizationId: validOrgId,
            organizationName: organization?.name,
          });
          // 名前で組織を検索
          if (organization?.name) {
            const { searchOrgsByName } = await import('@/lib/orgApi');
            const searchResults = await searchOrgsByName(organization.name);
            if (searchResults && searchResults.length > 0) {
              const exactMatch = searchResults.find((org: any) => org.name === organization.name);
              if (exactMatch && exactMatch.id) {
                validOrgId = exactMatch.id;
                devLog('✅ [handleAddInitiative] 名前で検索して正しいIDを取得:', validOrgId);
              } else if (searchResults[0] && searchResults[0].id) {
                validOrgId = searchResults[0].id;
                devWarn('⚠️ [handleAddInitiative] 完全一致が見つかりませんでした。最初の結果を使用:', validOrgId);
              }
            }
          }
        } else {
          devLog('✅ [handleAddInitiative] organizationIdがorganizationsテーブルに存在します:', validOrgId);
        }
      } catch (orgCheckError: any) {
        devWarn('⚠️ [handleAddInitiative] 組織IDの確認でエラー（続行します）:', orgCheckError);
      }
    }
    
    if (!validOrgId) {
      await tauriAlert('組織IDが取得できませんでした');
      return;
    }

    try {
      setSavingInitiative(true);
      devLog('📝 注力施策を追加します:', { 
        id: newInitiativeId,
        organizationId, 
        title: newInitiativeTitle.trim(),
      });
      
      const initiativeId = await saveFocusInitiative({
        id: newInitiativeId,
        organizationId: validOrgId,
        title: newInitiativeTitle.trim(),
        description: newInitiativeDescription.trim() || undefined,
      });
      
      devLog('✅ 注力施策を追加しました。ID:', initiativeId);
      
      // 組織ツリーを取得してから再取得
      const orgTree = await getOrgTreeFromDb();
      await reloadInitiatives(validOrgId, orgTree);
      
      // モーダルを閉じてフォームをリセット
      setShowAddInitiativeModal(false);
      setNewInitiativeTitle('');
      setNewInitiativeDescription('');
      setNewInitiativeId('');
      
      await tauriAlert('注力施策を追加しました');
    } catch (error: any) {
      console.error('❌ 注力施策の追加に失敗しました:', error);
      await tauriAlert(`追加に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingInitiative(false);
    }
  };

  // 注力施策の編集を開始
  const handleStartEdit = (initiative: FocusInitiative) => {
    setEditingInitiativeId(initiative.id);
    setEditingTitle(initiative.title);
  };

  // 注力施策の編集をキャンセル
  const handleCancelEdit = () => {
    setEditingInitiativeId(null);
    setEditingTitle('');
  };

  // 注力施策の編集を保存
  const handleSaveEdit = async (initiativeId: string) => {
    if (!editingTitle.trim()) {
      await tauriAlert('タイトルを入力してください');
      return;
    }

    try {
      setSavingInitiative(true);
      const initiative = focusInitiatives.find(i => i.id === initiativeId);
      if (!initiative) {
        throw new Error('注力施策が見つかりません');
      }

      await saveFocusInitiative({
        ...initiative,
        title: editingTitle.trim(),
      });

      const validOrgId = organization?.id || organizationId;
      const orgTree = await getOrgTreeFromDb();
      await reloadInitiatives(validOrgId, orgTree);
      setEditingInitiativeId(null);
      setEditingTitle('');
      
      await tauriAlert('注力施策を更新しました');
    } catch (error: any) {
      console.error('❌ 注力施策の更新に失敗しました:', error);
      await tauriAlert(`更新に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingInitiative(false);
    }
  };

  // 注力施策の削除をリクエスト
  const handleDeleteInitiative = (initiativeId: string) => {
    setDeleteTargetInitiativeId(initiativeId);
    setShowDeleteConfirmModal(true);
  };

  // 注力施策の削除を確認
  const confirmDeleteInitiative = async () => {
    if (!deleteTargetInitiativeId) {
      return;
    }

    const initiativeId = deleteTargetInitiativeId;
    const initiative = focusInitiatives.find(i => i.id === initiativeId);
    const initiativeTitle = initiative?.title || 'この注力施策';
    
    setShowDeleteConfirmModal(false);
    setDeleteTargetInitiativeId(null);
    
    try {
      setSavingInitiative(true);
      await deleteFocusInitiative(initiativeId);
      
      const validOrgId = organization?.id || organizationId;
      const orgTree = await getOrgTreeFromDb();
      await reloadInitiatives(validOrgId, orgTree);
      
      await tauriAlert('注力施策を削除しました');
    } catch (error: any) {
      console.error('❌ 注力施策の削除に失敗しました:', error);
      await tauriAlert(`削除に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingInitiative(false);
    }
  };

  // 注力施策の削除をキャンセル
  const cancelDeleteInitiative = () => {
    setShowDeleteConfirmModal(false);
    setDeleteTargetInitiativeId(null);
  };

  // 議事録追加モーダルを開く
  const handleOpenAddMeetingNoteModal = () => {
    const newId = generateUniqueMeetingNoteId();
    setNewMeetingNoteId(newId);
    setNewMeetingNoteTitle('');
    setNewMeetingNoteDescription('');
    setShowAddMeetingNoteModal(true);
  };

  // 議事録を追加
  const handleAddMeetingNote = async () => {
    if (!newMeetingNoteTitle.trim()) {
      await tauriAlert('タイトルを入力してください');
      return;
    }

    // organizationオブジェクトから正しいIDを取得
    // organizationオブジェクトがまだ設定されていない場合は、organizationIdを直接使用
    let validOrgId = organization?.id || organizationId;
    
    // organizationIdがorganizationsテーブルに存在するか確認
    if (validOrgId) {
      try {
        const { callTauriCommand } = await import('@/lib/localFirebase');
        const orgCheckResult = await callTauriCommand('doc_get', {
          collectionName: 'organizations',
          docId: validOrgId,
        });
        if (!orgCheckResult || !orgCheckResult.exists) {
          devWarn('⚠️ [handleAddMeetingNote] organizationIdがorganizationsテーブルに存在しません。名前で検索します:', {
            organizationId: validOrgId,
            organizationName: organization?.name,
          });
          // 名前で組織を検索
          if (organization?.name) {
            const { searchOrgsByName } = await import('@/lib/orgApi');
            const searchResults = await searchOrgsByName(organization.name);
            if (searchResults && searchResults.length > 0) {
              const exactMatch = searchResults.find((org: any) => org.name === organization.name);
              if (exactMatch && exactMatch.id) {
                validOrgId = exactMatch.id;
                devLog('✅ [handleAddMeetingNote] 名前で検索して正しいIDを取得:', validOrgId);
              } else if (searchResults[0] && searchResults[0].id) {
                validOrgId = searchResults[0].id;
                devWarn('⚠️ [handleAddMeetingNote] 完全一致が見つかりませんでした。最初の結果を使用:', validOrgId);
              }
            }
          }
        } else {
          devLog('✅ [handleAddMeetingNote] organizationIdがorganizationsテーブルに存在します:', validOrgId);
        }
      } catch (orgCheckError: any) {
        devWarn('⚠️ [handleAddMeetingNote] 組織IDの確認でエラー（続行します）:', orgCheckError);
      }
    }
    
    if (!validOrgId) {
      await tauriAlert('組織IDが取得できませんでした');
      return;
    }

    try {
      setSavingMeetingNote(true);
      devLog('📝 議事録を追加します:', { 
        id: newMeetingNoteId,
        organizationId: validOrgId, 
        title: newMeetingNoteTitle.trim(),
      });
      
      const noteId = await saveMeetingNote({
        id: newMeetingNoteId,
        organizationId: validOrgId,
        title: newMeetingNoteTitle.trim(),
        description: newMeetingNoteDescription.trim() || undefined,
      });
      
      devLog('✅ 議事録を追加しました。ID:', noteId);
      
      // リストを再取得
      const notes = await getMeetingNotes(validOrgId);
      devLog('📋 再取得した議事録リスト数:', notes.length);
      setMeetingNotes(notes);
      
      // モーダルを閉じてフォームをリセット
      setShowAddMeetingNoteModal(false);
      setNewMeetingNoteTitle('');
      setNewMeetingNoteDescription('');
      setNewMeetingNoteId('');
      
      await tauriAlert('議事録を追加しました');
    } catch (error: any) {
      console.error('❌ 議事録の追加に失敗しました:', error);
      await tauriAlert(`追加に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingMeetingNote(false);
    }
  };

  // 議事録の編集を開始
  const handleStartEditMeetingNote = (note: MeetingNote) => {
    setEditingMeetingNoteId(note.id);
    setEditingMeetingNoteTitle(note.title);
  };

  // 議事録の編集をキャンセル
  const handleCancelEditMeetingNote = () => {
    setEditingMeetingNoteId(null);
    setEditingMeetingNoteTitle('');
  };

  // 議事録の編集を保存
  const handleSaveEditMeetingNote = async (noteId: string) => {
    if (!editingMeetingNoteTitle.trim()) {
      await tauriAlert('タイトルを入力してください');
      return;
    }

    try {
      setSavingMeetingNote(true);
      const note = meetingNotes.find(n => n.id === noteId);
      if (!note) {
        throw new Error('議事録が見つかりません');
      }

      await saveMeetingNote({
        ...note,
        title: editingMeetingNoteTitle.trim(),
      });

      const validOrgId = organization?.id || organizationId;
      const notes = await getMeetingNotes(validOrgId);
      setMeetingNotes(notes);
      setEditingMeetingNoteId(null);
      setEditingMeetingNoteTitle('');
      
      await tauriAlert('議事録を更新しました');
    } catch (error: any) {
      console.error('❌ 議事録の更新に失敗しました:', error);
      await tauriAlert(`更新に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingMeetingNote(false);
    }
  };

  // 議事録の削除をリクエスト
  const handleDeleteMeetingNote = (noteId: string) => {
    setDeleteTargetMeetingNoteId(noteId);
    setShowDeleteMeetingNoteConfirmModal(true);
  };

  // 議事録の削除を確認
  const confirmDeleteMeetingNote = async () => {
    if (!deleteTargetMeetingNoteId) {
      return;
    }

    const noteId = deleteTargetMeetingNoteId;
    const note = meetingNotes.find(n => n.id === noteId);
    const noteTitle = note?.title || 'この議事録';
    
    setShowDeleteMeetingNoteConfirmModal(false);
    setDeleteTargetMeetingNoteId(null);
    
    try {
      setSavingMeetingNote(true);
      await deleteMeetingNote(noteId);
      
      const validOrgId = organization?.id || organizationId;
      const notes = await getMeetingNotes(validOrgId);
      setMeetingNotes(notes);
      
      await tauriAlert('議事録を削除しました');
    } catch (error: any) {
      console.error('❌ 議事録の削除に失敗しました:', error);
      await tauriAlert(`削除に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingMeetingNote(false);
    }
  };

  // 議事録の削除をキャンセル
  const cancelDeleteMeetingNote = () => {
    setShowDeleteMeetingNoteConfirmModal(false);
    setDeleteTargetMeetingNoteId(null);
  };

  return (
    <Layout>
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)' }}>
            {organization.name}
            {organization.title && (
              <span style={{ fontSize: '16px', color: '#6B7280', marginLeft: '8px' }}>
                ({organization.title})
              </span>
            )}
          </h1>
          <button
            onClick={() => router.push('/organization')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6B7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            一覧に戻る
          </button>
        </div>

        {/* タブ */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border-color)', marginBottom: '24px' }}>
          <button
            onClick={() => handleTabChange('introduction')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'introduction' ? 'var(--color-primary)' : 'var(--color-text-light)',
              borderBottom: activeTab === 'introduction' ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'introduction' ? '600' : '400',
            }}
          >
            組織紹介
          </button>
          <button
            onClick={() => handleTabChange('focusAreas')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'focusAreas' ? 'var(--color-primary)' : 'var(--color-text-light)',
              borderBottom: activeTab === 'focusAreas' ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'focusAreas' ? '600' : '400',
            }}
          >
            注力領域
          </button>
          <button
            onClick={() => handleTabChange('focusInitiatives')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'focusInitiatives' ? 'var(--color-primary)' : 'var(--color-text-light)',
              borderBottom: activeTab === 'focusInitiatives' ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'focusInitiatives' ? '600' : '400',
            }}
          >
            注力施策 ({focusInitiatives.length})
          </button>
          <button
            onClick={() => handleTabChange('meetingNotes')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'meetingNotes' ? 'var(--color-primary)' : 'var(--color-text-light)',
              borderBottom: activeTab === 'meetingNotes' ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'meetingNotes' ? '600' : '400',
            }}
          >
            議事録 ({meetingNotes.length})
          </button>
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'introduction' && (
          <>
            {organization.description && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                  説明
                </h3>
                <p style={{ color: 'var(--color-text-light)', lineHeight: '1.6' }}>
                  {organization.description}
                </p>
              </div>
            )}

            {(() => {
              devLog('🔍 [メンバー表示] organization.membersの状態:', {
                hasMembers: !!organization.members,
                membersLength: organization.members?.length || 0,
                organizationId: organization.id,
                organizationName: organization.name,
              });
              return null;
            })()}
            {organization.members && organization.members.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
              所属メンバー ({organization.members.length}名)
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '12px',
              }}
            >
              {organization.members.map((member, index) => {
                const hasPosition = member.title && member.title.trim() !== '';
                return (
                  <div
                    key={index}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: hasPosition ? '#F9FAFB' : '#ffffff',
                      border: hasPosition ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxShadow: hasPosition ? '0 2px 4px rgba(59, 130, 246, 0.1)' : '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div style={{ marginBottom: '4px' }}>
                      <strong style={{ fontSize: '15px', color: '#1F2937' }}>{member.name}</strong>
                    </div>
                    {member.title && (
                      <div style={{ color: '#374151', fontWeight: '500', fontSize: '13px' }}>
                        {member.title}
                      </div>
                    )}
                    {member.department && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                        部署: {member.department}
                      </div>
                    )}
                    {member.extension && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                        内線: {member.extension}
                      </div>
                    )}
                    {member.itochuEmail && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                        <a href={`mailto:${member.itochuEmail}`} style={{ color: '#2563EB', textDecoration: 'none' }}>
                          {member.itochuEmail}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {organization.children && organization.children.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
              子組織 ({organization.children.length}個)
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '12px',
              }}
            >
              {organization.children.map((child) => (
                <div
                  key={child.id}
                  onClick={() => {
                    if (child.id) {
                      router.push(`/organization/detail?id=${child.id}`);
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: child.id ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (child.id) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                      e.currentTarget.style.borderColor = '#3B82F6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (child.id) {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#E5E7EB';
                    }
                  }}
                >
                  <div style={{ marginBottom: '4px' }}>
                    <strong style={{ fontSize: '15px', color: '#1F2937' }}>{child.name}</strong>
                  </div>
                  {child.title && (
                    <div style={{ color: '#374151', fontSize: '13px' }}>
                      {child.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {companies && companies.length > 0 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
              事業会社 ({companies.length}社)
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '12px',
              }}
            >
              {companies.map((company) => (
                <div
                  key={company.id}
                  onClick={() => {
                    router.push(`/companies/detail?id=${company.id}`);
                  }}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                    e.currentTarget.style.borderColor = '#10B981';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                  }}
                >
                  <div style={{ marginBottom: '4px' }}>
                    <strong style={{ fontSize: '15px', color: '#1F2937' }}>{company.name}</strong>
                    {company.nameShort && (
                      <span style={{ marginLeft: '8px', fontSize: '13px', color: '#6B7280' }}>
                        ({company.nameShort})
                      </span>
                    )}
                  </div>
                  {company.code && (
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                      コード: {company.code}
                    </div>
                  )}
                  {company.category && (
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                      区分: {company.category}
                    </div>
                  )}
                  {company.region && (
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                      地域: {company.region}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}

        {activeTab === 'focusAreas' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
              注力領域
            </h3>
            {organizationContent?.focusAreas ? (
              <div style={{ 
                padding: '16px', 
                backgroundColor: '#F9FAFB', 
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                color: 'var(--color-text)',
              }}>
                {organizationContent.focusAreas}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
                注力領域が登録されていません
              </p>
            )}
          </div>
        )}

        {activeTab === 'focusInitiatives' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                注力施策 ({focusInitiatives.length}件)
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {initiativesByOrg.size > 1 && (
                  <button
                    onClick={() => {
                      const childOrgIds = Array.from(initiativesByOrg.keys()).filter(id => id !== organizationId);
                      const allExpanded = childOrgIds.length > 0 && childOrgIds.every(id => expandedOrgIds.has(id));
                      
                      if (allExpanded) {
                        // すべて閉じる
                        setExpandedOrgIds(new Set());
                      } else {
                        // すべて開く
                        setExpandedOrgIds(new Set(childOrgIds));
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6B7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#4B5563';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#6B7280';
                    }}
                  >
                    {(() => {
                      const childOrgIds = Array.from(initiativesByOrg.keys()).filter(id => id !== organizationId);
                      const allExpanded = childOrgIds.length > 0 && childOrgIds.every(id => expandedOrgIds.has(id));
                      return allExpanded ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                          すべて閉じる
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                          すべて開く
                        </>
                      );
                    })()}
                  </button>
                )}
                <button
                  onClick={handleOpenAddInitiativeModal}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#10B981';
                  }}
                >
                  + 追加
                </button>
              </div>
            </div>
            {focusInitiatives.length === 0 ? (
              <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
                注力施策が登録されていません
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {Array.from(initiativesByOrg.entries()).map(([orgId, orgData]) => {
                  const isCurrentOrg = orgId === organizationId;
                  const isExpanded = isCurrentOrg || expandedOrgIds.has(orgId);
                  
                  return (
                    <div key={orgId} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        paddingBottom: '8px',
                        borderBottom: '1px solid #E5E7EB',
                      }}>
                        <h4 style={{ 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: '#6B7280',
                          margin: 0,
                        }}>
                          {orgData.orgName} ({orgData.initiatives.length}件)
                        </h4>
                        {!isCurrentOrg && (
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedOrgIds);
                              if (isExpanded) {
                                newExpanded.delete(orgId);
                              } else {
                                newExpanded.add(orgId);
                              }
                              setExpandedOrgIds(newExpanded);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '24px',
                              height: '24px',
                              padding: 0,
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#6B7280',
                              transition: 'transform 0.2s ease',
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#374151';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#6B7280';
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {isExpanded && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '16px',
                          }}
                        >
                          {orgData.initiatives.map((initiative) => (
                            <div
                              key={initiative.id}
                              style={{
                                padding: '16px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (editingInitiativeId !== initiative.id) {
                                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                                  e.currentTarget.style.borderColor = '#3B82F6';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (editingInitiativeId !== initiative.id) {
                                  e.currentTarget.style.backgroundColor = '#ffffff';
                                  e.currentTarget.style.borderColor = '#E5E7EB';
                                }
                              }}
                            >
                          {editingInitiativeId === initiative.id ? (
                            // 編集モード
                            <div>
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                autoFocus
                                disabled={savingInitiative}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: '2px solid #3B82F6',
                                  borderRadius: '6px',
                                  fontSize: '16px',
                                  fontWeight: 600,
                                  marginBottom: '8px',
                                  backgroundColor: savingInitiative ? '#F3F4F6' : '#FFFFFF',
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveEdit(initiative.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                              />
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={savingInitiative}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#6B7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: savingInitiative ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                  }}
                                >
                                  キャンセル
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(initiative.id)}
                                  disabled={savingInitiative || !editingTitle.trim()}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: savingInitiative || !editingTitle.trim() ? '#9CA3AF' : '#10B981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: savingInitiative || !editingTitle.trim() ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                  }}
                                >
                                  {savingInitiative ? '保存中...' : '保存'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            // 表示モード
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <h4 
                                  onClick={() => {
                                    if (initiative.organizationId && initiative.id) {
                                      router.push(`/organization/initiative?organizationId=${initiative.organizationId}&initiativeId=${initiative.id}`);
                                    }
                                  }}
                                  style={{ 
                                    fontSize: '16px', 
                                    fontWeight: 600, 
                                    color: 'var(--color-text)',
                                    cursor: 'pointer',
                                    flex: 1,
                                  }}
                                >
                                  {initiative.title}
                                </h4>
                                <div style={{ display: 'flex', gap: '4px', marginLeft: '8px', alignItems: 'center' }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEdit(initiative);
                                    }}
                                    disabled={savingInitiative}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '28px',
                                      height: '28px',
                                      padding: 0,
                                      backgroundColor: 'transparent',
                                      color: '#6B7280',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: savingInitiative ? 'not-allowed' : 'pointer',
                                      opacity: 0.6,
                                      transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!savingInitiative) {
                                        e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
                                        e.currentTarget.style.opacity = '1';
                                        e.currentTarget.style.color = '#374151';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!savingInitiative) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.opacity = '0.6';
                                        e.currentTarget.style.color = '#6B7280';
                                      }
                                    }}
                                    title="編集"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteInitiative(initiative.id);
                                    }}
                                    disabled={savingInitiative}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '28px',
                                      height: '28px',
                                      padding: 0,
                                      backgroundColor: 'transparent',
                                      color: '#6B7280',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: savingInitiative ? 'not-allowed' : 'pointer',
                                      opacity: 0.6,
                                      transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!savingInitiative) {
                                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                        e.currentTarget.style.opacity = '1';
                                        e.currentTarget.style.color = '#DC2626';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!savingInitiative) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.opacity = '0.6';
                                        e.currentTarget.style.color = '#6B7280';
                                      }
                                    }}
                                    title="削除"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              {initiative.assignee && (
                                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
                                  担当者: {initiative.assignee}
                                </div>
                              )}
                            </>
                          )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 注力施策追加モーダル */}
        {showAddInitiativeModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => {
              if (!savingInitiative) {
                setShowAddInitiativeModal(false);
                setNewInitiativeTitle('');
                setNewInitiativeDescription('');
                setNewInitiativeId('');
              }
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '32px',
                width: '90%',
                maxWidth: '560px',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div style={{ marginBottom: '28px', paddingBottom: '20px', borderBottom: '2px solid #F3F4F6' }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#111827',
                }}>
                  新しい注力施策を追加
                </h3>
                <p style={{ 
                  margin: '8px 0 0 0', 
                  fontSize: '14px', 
                  color: '#6B7280',
                }}>
                  注力施策の情報を入力してください
                </p>
              </div>

              {/* ユニークIDセクション */}
              <div style={{ 
                marginBottom: '24px', 
                padding: '16px', 
                backgroundColor: '#F9FAFB',
                borderRadius: '12px', 
                border: '1px solid #E5E7EB',
              }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#6B7280',
                }}>
                  ユニークID
                </label>
                <div style={{ 
                  fontSize: '14px', 
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace', 
                  color: '#111827', 
                  fontWeight: '600',
                  wordBreak: 'break-all',
                }}>
                  {newInitiativeId || '生成中...'}
                </div>
              </div>

              {/* タイトル入力 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '10px', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151',
                }}>
                  <span>タイトル</span>
                  <span style={{ 
                    marginLeft: '6px',
                    color: '#EF4444',
                    fontSize: '16px',
                  }}>*</span>
                </label>
                <input
                  type="text"
                  value={newInitiativeTitle}
                  onChange={(e) => setNewInitiativeTitle(e.target.value)}
                  placeholder="注力施策のタイトルを入力"
                  autoFocus
                  disabled={savingInitiative}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '10px',
                    fontSize: '15px',
                    color: '#111827',
                    backgroundColor: savingInitiative ? '#F3F4F6' : '#FFFFFF',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    if (!savingInitiative) {
                      e.target.style.borderColor = 'var(--color-primary)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* 説明入力 */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '10px', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151',
                }}>
                  説明
                </label>
                <textarea
                  value={newInitiativeDescription}
                  onChange={(e) => setNewInitiativeDescription(e.target.value)}
                  placeholder="注力施策の説明を入力（任意）"
                  disabled={savingInitiative}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '10px',
                    fontSize: '15px',
                    color: '#111827',
                    backgroundColor: savingInitiative ? '#F3F4F6' : '#FFFFFF',
                    minHeight: '100px',
                    resize: 'vertical',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => {
                    if (!savingInitiative) {
                      e.target.style.borderColor = 'var(--color-primary)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* フッター */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => {
                    if (!savingInitiative) {
                      setShowAddInitiativeModal(false);
                      setNewInitiativeTitle('');
                      setNewInitiativeDescription('');
                      setNewInitiativeId('');
                    }
                  }}
                  disabled={savingInitiative}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6B7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: savingInitiative ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: savingInitiative ? 0.5 : 1,
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddInitiative}
                  disabled={savingInitiative || !newInitiativeTitle.trim()}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: savingInitiative || !newInitiativeTitle.trim() ? '#9CA3AF' : '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: savingInitiative || !newInitiativeTitle.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  {savingInitiative ? '保存中...' : '追加'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 注力施策削除確認モーダル */}
        {showDeleteConfirmModal && deleteTargetInitiativeId && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
            }}
            onClick={cancelDeleteInitiative}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#111827' }}>
                注力施策を削除
              </h3>
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px', lineHeight: '1.6' }}>
                {focusInitiatives.find(i => i.id === deleteTargetInitiativeId)?.title || 'この注力施策'}を削除しますか？
                <br />
                この操作は取り消せません。
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelDeleteInitiative}
                  disabled={savingInitiative}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6B7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingInitiative ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDeleteInitiative}
                  disabled={savingInitiative}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingInitiative ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {savingInitiative ? '削除中...' : '削除'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'meetingNotes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                議事録 ({meetingNotes.length}件)
              </h3>
              <button
                onClick={handleOpenAddMeetingNoteModal}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#10B981';
                }}
              >
                + 追加
              </button>
            </div>
            {meetingNotes.length === 0 ? (
              <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
                議事録が登録されていません
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px',
                }}
              >
                {meetingNotes.map((note) => (
                  <div
                    key={note.id}
                            onClick={() => {
                              if (editingMeetingNoteId !== note.id && organizationId && note.id) {
                                router.push(`/organization/detail/meeting?meetingId=${note.id}&id=${organizationId}`);
                              }
                            }}
                    style={{
                      padding: '16px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease',
                      cursor: editingMeetingNoteId !== note.id ? 'pointer' : 'default',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                    onMouseEnter={(e) => {
                      if (editingMeetingNoteId !== note.id) {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                        e.currentTarget.style.borderColor = '#3B82F6';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (editingMeetingNoteId !== note.id) {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {editingMeetingNoteId === note.id ? (
                      // 編集モード
                      <div>
                        <input
                          type="text"
                          value={editingMeetingNoteTitle}
                          onChange={(e) => setEditingMeetingNoteTitle(e.target.value)}
                          autoFocus
                          disabled={savingMeetingNote}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '2px solid #3B82F6',
                            borderRadius: '6px',
                            fontSize: '16px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            backgroundColor: savingMeetingNote ? '#F3F4F6' : '#FFFFFF',
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEditMeetingNote(note.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEditMeetingNote();
                            }
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={handleCancelEditMeetingNote}
                            disabled={savingMeetingNote}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#6B7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={() => handleSaveEditMeetingNote(note.id)}
                            disabled={savingMeetingNote || !editingMeetingNoteTitle.trim()}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: savingMeetingNote || !editingMeetingNoteTitle.trim() ? '#9CA3AF' : '#10B981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: savingMeetingNote || !editingMeetingNoteTitle.trim() ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            {savingMeetingNote ? '保存中...' : '保存'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 表示モード
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h4 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (organizationId && note.id) {
                                router.push(`/organization/detail/meeting?meetingId=${note.id}&id=${organizationId}`);
                              }
                            }}
                            style={{ 
                              fontSize: '16px', 
                              fontWeight: 600, 
                              color: 'var(--color-text)',
                              cursor: 'pointer',
                              flex: 1,
                            }}
                          >
                            {note.title}
                          </h4>
                          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditMeetingNote(note);
                              }}
                              disabled={savingMeetingNote}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                padding: 0,
                                backgroundColor: 'transparent',
                                color: '#6B7280',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                                opacity: 0.6,
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!savingMeetingNote) {
                                  e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
                                  e.currentTarget.style.opacity = '1';
                                  e.currentTarget.style.color = '#374151';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!savingMeetingNote) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                  e.currentTarget.style.opacity = '0.6';
                                  e.currentTarget.style.color = '#6B7280';
                                }
                              }}
                              title="編集"
                            >
                              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMeetingNote(note.id);
                              }}
                              disabled={savingMeetingNote}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                padding: 0,
                                backgroundColor: 'transparent',
                                color: '#6B7280',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                                opacity: 0.6,
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!savingMeetingNote) {
                                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                  e.currentTarget.style.opacity = '1';
                                  e.currentTarget.style.color = '#DC2626';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!savingMeetingNote) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                  e.currentTarget.style.opacity = '0.6';
                                  e.currentTarget.style.color = '#6B7280';
                                }
                              }}
                              title="削除"
                            >
                              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {note.description && (
                          <p style={{ fontSize: '14px', color: 'var(--color-text-light)', marginBottom: '8px', lineHeight: '1.5' }}>
                            {note.description}
                          </p>
                        )}
                        {note.createdAt && (
                          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
                            作成日: {new Date(note.createdAt).toLocaleDateString('ja-JP')}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 議事録追加モーダル */}
        {showAddMeetingNoteModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => {
              if (!savingMeetingNote) {
                setShowAddMeetingNoteModal(false);
                setNewMeetingNoteTitle('');
                setNewMeetingNoteDescription('');
                setNewMeetingNoteId('');
              }
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '32px',
                width: '90%',
                maxWidth: '560px',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div style={{ marginBottom: '28px', paddingBottom: '20px', borderBottom: '2px solid #F3F4F6' }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#111827',
                }}>
                  新しい議事録を追加
                </h3>
                <p style={{ 
                  margin: '8px 0 0 0', 
                  fontSize: '14px', 
                  color: '#6B7280',
                }}>
                  議事録の情報を入力してください
                </p>
              </div>

              {/* ユニークIDセクション */}
              <div style={{ 
                marginBottom: '24px', 
                padding: '16px', 
                backgroundColor: '#F9FAFB',
                borderRadius: '12px', 
                border: '1px solid #E5E7EB',
              }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#6B7280',
                }}>
                  ユニークID
                </label>
                <div style={{ 
                  fontSize: '14px', 
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace', 
                  color: '#111827', 
                  fontWeight: '600',
                  wordBreak: 'break-all',
                }}>
                  {newMeetingNoteId || '生成中...'}
                </div>
              </div>

              {/* タイトル入力 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '10px', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151',
                }}>
                  <span>タイトル</span>
                  <span style={{ 
                    marginLeft: '6px',
                    color: '#EF4444',
                    fontSize: '16px',
                  }}>*</span>
                </label>
                <input
                  type="text"
                  value={newMeetingNoteTitle}
                  onChange={(e) => setNewMeetingNoteTitle(e.target.value)}
                  placeholder="議事録のタイトルを入力"
                  autoFocus
                  disabled={savingMeetingNote}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '10px',
                    fontSize: '15px',
                    color: '#111827',
                    backgroundColor: savingMeetingNote ? '#F3F4F6' : '#FFFFFF',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    if (!savingMeetingNote) {
                      e.target.style.borderColor = 'var(--color-primary)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* 説明入力 */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '10px', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151',
                }}>
                  説明
                </label>
                <textarea
                  value={newMeetingNoteDescription}
                  onChange={(e) => setNewMeetingNoteDescription(e.target.value)}
                  placeholder="議事録の説明を入力（任意）"
                  disabled={savingMeetingNote}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '10px',
                    fontSize: '15px',
                    color: '#111827',
                    backgroundColor: savingMeetingNote ? '#F3F4F6' : '#FFFFFF',
                    minHeight: '100px',
                    resize: 'vertical',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => {
                    if (!savingMeetingNote) {
                      e.target.style.borderColor = 'var(--color-primary)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* フッター */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => {
                    if (!savingMeetingNote) {
                      setShowAddMeetingNoteModal(false);
                      setNewMeetingNoteTitle('');
                      setNewMeetingNoteDescription('');
                      setNewMeetingNoteId('');
                    }
                  }}
                  disabled={savingMeetingNote}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6B7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: savingMeetingNote ? 0.5 : 1,
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddMeetingNote}
                  disabled={savingMeetingNote || !newMeetingNoteTitle.trim()}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: savingMeetingNote || !newMeetingNoteTitle.trim() ? '#9CA3AF' : '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: savingMeetingNote || !newMeetingNoteTitle.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  {savingMeetingNote ? '保存中...' : '追加'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 議事録削除確認モーダル */}
        {showDeleteMeetingNoteConfirmModal && deleteTargetMeetingNoteId && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
            }}
            onClick={cancelDeleteMeetingNote}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#111827' }}>
                議事録を削除
              </h3>
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px', lineHeight: '1.6' }}>
                {meetingNotes.find(n => n.id === deleteTargetMeetingNoteId)?.title || 'この議事録'}を削除しますか？
                <br />
                この操作は取り消せません。
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelDeleteMeetingNote}
                  disabled={savingMeetingNote}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6B7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDeleteMeetingNote}
                  disabled={savingMeetingNote}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {savingMeetingNote ? '削除中...' : '削除'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function OrganizationDetailPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>読み込み中...</p>
        </div>
      </Layout>
    }>
      <OrganizationDetailPageContent />
    </Suspense>
  );
}
