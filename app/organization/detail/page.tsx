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

type TabType = 'introduction' | 'focusAreas' | 'focusInitiatives' | 'meetingNotes';

function OrganizationDetailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const organizationId = searchParams?.get('id') as string;
  const tabParam = searchParams?.get('tab') as TabType | null;
  
  const [organization, setOrganization] = useState<OrgNodeData | null>(null);
  const [organizationContent, setOrganizationContent] = useState<OrganizationContent | null>(null);
  const [focusInitiatives, setFocusInitiatives] = useState<FocusInitiative[]>([]);
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

  useEffect(() => {
    console.log('🚀 [useEffect] loadOrganizationData開始:', { organizationId });
    const loadOrganizationData = async () => {
      if (!organizationId) {
        console.warn('⚠️ [loadOrganizationData] 組織IDが指定されていません');
        setError('組織IDが指定されていません');
        setLoading(false);
        return;
      }

      console.log('📋 [loadOrganizationData] 関数実行開始:', { organizationId });
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
        console.log('🔍 [loadOrganizationData] デバッグ情報:', {
          organizationIdFromURL: organizationId,
          rootOrgId: orgTree.id,
          rootOrgName: orgTree.name,
          rootOrgKeys: Object.keys(orgTree),
        });
        
        const foundOrg = findOrganizationById(orgTree, organizationId);
        
        // デバッグ: 見つかった組織の情報を確認
        if (foundOrg) {
          console.log('✅ [loadOrganizationData] 組織が見つかりました:', {
            foundOrgId: foundOrg.id,
            foundOrgName: foundOrg.name,
            foundOrgKeys: Object.keys(foundOrg),
          });
        } else {
          console.warn('⚠️ [loadOrganizationData] 組織が見つかりませんでした:', {
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
          
          console.log('🔍 [loadOrganizationData] organizationsテーブルの全ID:', {
            count: allOrgsResult?.length || 0,
            ids: allOrgsResult?.slice(0, 10).map((org: any) => ({
              id: org.id || org.data?.id,
              name: org.data?.name || org.name,
            })) || [],
            searchId: validOrganizationId,
            foundOrgName: foundOrg.name,
            ictDivisionInDb: ictDivision ? {
              id: ictDivision.id || ictDivision.data?.id,
              name: ictDivision.data?.name || ictDivision.name,
            } : null,
            csvExpectedId: 'f41b8b41-b52b-4204-aae6-345a83e565e7', // CSVファイルのID
            logShownId: 'd398783c-92a5-4da5-822f-5014ef677b28', // ログで見たID
          });
          
          // 特定のIDで検索
          try {
            const orgCheckResult = await callTauriCommand('doc_get', {
              collectionName: 'organizations',
              docId: validOrganizationId,
            });
            
            if (!orgCheckResult || !orgCheckResult.exists) {
              console.warn('⚠️ [loadOrganizationData] foundOrg.idがorganizationsテーブルに存在しません:', {
                foundOrgId: validOrganizationId,
                foundOrgName: foundOrg.name,
                orgCheckResult,
              });
              
              // 名前で組織を検索
              const { searchOrgsByName } = await import('@/lib/orgApi');
              const searchResults = await searchOrgsByName(foundOrg.name || '');
              console.log('🔍 [loadOrganizationData] 名前で検索した結果:', {
                searchName: foundOrg.name,
                results: searchResults?.map((org: any) => ({
                  id: org.id,
                  name: org.name,
                })) || [],
              });
              
              if (searchResults && searchResults.length > 0) {
                // 完全一致する組織を探す
                const exactMatch = searchResults.find((org: any) => org.name === foundOrg.name);
                if (exactMatch && exactMatch.id) {
                  validOrganizationId = exactMatch.id;
                  console.log('✅ [loadOrganizationData] 名前で検索して正しいIDを取得:', validOrganizationId);
                } else if (searchResults[0] && searchResults[0].id) {
                  // 完全一致がない場合は最初の結果を使用
                  validOrganizationId = searchResults[0].id;
                  console.log('⚠️ [loadOrganizationData] 完全一致が見つかりませんでした。最初の結果を使用:', validOrganizationId);
                }
              }
            } else {
              console.log('✅ [loadOrganizationData] foundOrg.idがorganizationsテーブルに存在します:', validOrganizationId);
            }
          } catch (docGetError: any) {
            // doc_getがエラーを返す場合（「Query returned no rows」）は、組織が存在しないことを意味する
            if (docGetError?.message?.includes('Query returned no rows') || 
                docGetError?.message?.includes('ドキュメント取得エラー')) {
              console.warn('⚠️ [loadOrganizationData] foundOrg.idがorganizationsテーブルに存在しません（doc_getが行を返さない）:', {
                foundOrgId: validOrganizationId,
                foundOrgName: foundOrg.name,
              });
              
              // 名前で組織を検索
              try {
                const { searchOrgsByName } = await import('@/lib/orgApi');
                const searchResults = await searchOrgsByName(foundOrg.name || '');
                console.log('🔍 [loadOrganizationData] 名前で検索した結果:', {
                  searchName: foundOrg.name,
                  results: searchResults?.map((org: any) => ({
                    id: org.id,
                    name: org.name,
                  })) || [],
                });
                
                if (searchResults && searchResults.length > 0) {
                  // 完全一致する組織を探す
                  const exactMatch = searchResults.find((org: any) => org.name === foundOrg.name);
                  if (exactMatch && exactMatch.id) {
                    validOrganizationId = exactMatch.id;
                    console.log('✅ [loadOrganizationData] 名前で検索して正しいIDを取得:', validOrganizationId);
                  } else if (searchResults[0] && searchResults[0].id) {
                    // 完全一致がない場合は最初の結果を使用
                    validOrganizationId = searchResults[0].id;
                    console.log('⚠️ [loadOrganizationData] 完全一致が見つかりませんでした。最初の結果を使用:', validOrganizationId);
                  }
                }
              } catch (searchError: any) {
                console.warn('⚠️ [loadOrganizationData] 名前での検索に失敗しました:', searchError);
              }
            } else {
              // その他のエラーの場合は警告のみ
              console.warn('⚠️ [loadOrganizationData] 組織IDの確認でエラーが発生しました（続行します）:', docGetError);
            }
          }
        } catch (orgCheckError: any) {
          console.warn('⚠️ [loadOrganizationData] 組織IDの確認でエラーが発生しました（続行します）:', orgCheckError);
          // エラーが発生しても続行（foundOrg.idを使用）
        }
        
        // メンバー情報を取得
        if (validOrganizationId) {
          try {
            const members = await getOrgMembers(validOrganizationId);
            console.log('✅ [loadOrganizationData] メンバーを取得:', {
              count: members?.length || 0,
              members: members?.slice(0, 3).map(m => ({ name: m.name, title: m.title })) || [],
            });
            const sortedMembers = sortMembersByPosition(members, foundOrg.name);
            console.log('✅ [loadOrganizationData] メンバーをソート:', {
              count: sortedMembers?.length || 0,
            });
            // 正しいIDを確実に設定
            // foundOrgからmembersを削除してから新しいmembersを設定
            const { members: _, ...foundOrgWithoutMembers } = foundOrg;
            const updatedOrg: OrgNodeData = {
              ...foundOrgWithoutMembers,
              id: validOrganizationId, // 正しいIDを設定
              members: sortedMembers, // 新しく取得したメンバーを設定
            };
            setOrganization(updatedOrg);
            console.log('✅ [loadOrganizationData] organizationオブジェクトを設定:', {
              id: updatedOrg.id,
              name: updatedOrg.name,
              membersCount: updatedOrg.members?.length || 0,
              hasMembers: !!updatedOrg.members,
            });
            
            // 組織コンテンツ、注力施策、議事録を取得
            try {
              const content = await getOrganizationContent(validOrganizationId);
              setOrganizationContent(content);
            } catch (contentError: any) {
              console.warn('組織コンテンツの取得に失敗しました:', contentError);
            }
            
            try {
              const initiatives = await getFocusInitiatives(validOrganizationId);
              setFocusInitiatives(initiatives);
            } catch (initError: any) {
              console.warn('注力施策の取得に失敗しました:', initError);
            }
            
            try {
              const notes = await getMeetingNotes(validOrganizationId);
              setMeetingNotes(notes);
            } catch (noteError: any) {
              console.warn('議事録の取得に失敗しました:', noteError);
            }
            
            try {
              // 新しいテーブル（organizationCompanyDisplay）から表示関係を取得
              const displays = await getCompaniesByOrganizationDisplay(validOrganizationId);
              console.log('🔍 [loadOrganizationData] 表示関係を取得:', {
                organizationId: validOrganizationId,
                displaysCount: displays?.length || 0,
                displays: displays?.slice(0, 3).map(d => ({
                  id: d.id,
                  organizationId: d.organizationId,
                  companyId: d.companyId,
                  displayOrder: d.displayOrder,
                })) || [],
              });
              
              if (displays && displays.length > 0) {
                // 表示関係から会社IDのリストを取得し、表示順序でソート
                const sortedDisplays = [...displays].sort((a, b) => a.displayOrder - b.displayOrder);
                
                // 各会社IDで会社情報を取得
                const companiesPromises = sortedDisplays.map(display => {
                  const companyId = display.companyId;
                  if (!companyId) {
                    console.warn('⚠️ [loadOrganizationData] companyIdが取得できません:', display);
                    return Promise.resolve(null);
                  }
                  return getCompanyById(companyId).catch(err => {
                    console.warn(`事業会社の取得に失敗しました (ID: ${companyId}):`, err);
                    return null;
                  });
                });
                
                const companiesData = await Promise.all(companiesPromises);
                // nullを除外してCompany[]に変換
                const validCompanies = companiesData.filter((c): c is Company => c !== null);
                console.log('✅ [loadOrganizationData] 事業会社を取得:', {
                  count: validCompanies.length,
                  companies: validCompanies.slice(0, 3).map(c => ({ id: c.id, name: c.name })),
                });
                setCompanies(validCompanies);
              } else {
                // 表示関係がない場合は空配列を設定
                console.log('⚠️ [loadOrganizationData] 表示関係がありません');
                setCompanies([]);
              }
            } catch (companyError: any) {
              console.warn('事業会社の取得に失敗しました:', companyError);
              setCompanies([]);
            }
          } catch (memberError: any) {
            console.warn('メンバー情報の取得に失敗しました:', memberError);
            // 正しいIDを確実に設定
            const updatedOrg: OrgNodeData = {
              ...foundOrg,
              id: validOrganizationId || foundOrg.id, // 正しいIDを設定
            };
            setOrganization(updatedOrg);
            console.log('✅ [loadOrganizationData] organizationオブジェクトを設定（メンバー取得失敗時）:', {
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
          console.log('⚠️ [loadOrganizationData] validOrganizationIdが取得できませんでした。foundOrgを設定:', {
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
          console.warn('⚠️ [handleAddInitiative] organizationIdがorganizationsテーブルに存在しません。名前で検索します:', {
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
                console.log('✅ [handleAddInitiative] 名前で検索して正しいIDを取得:', validOrgId);
              } else if (searchResults[0] && searchResults[0].id) {
                validOrgId = searchResults[0].id;
                console.log('⚠️ [handleAddInitiative] 完全一致が見つかりませんでした。最初の結果を使用:', validOrgId);
              }
            }
          }
        } else {
          console.log('✅ [handleAddInitiative] organizationIdがorganizationsテーブルに存在します:', validOrgId);
        }
      } catch (orgCheckError: any) {
        console.warn('⚠️ [handleAddInitiative] 組織IDの確認でエラー（続行します）:', orgCheckError);
      }
    }
    
    if (!validOrgId) {
      await tauriAlert('組織IDが取得できませんでした');
      return;
    }

    try {
      setSavingInitiative(true);
      console.log('📝 注力施策を追加します:', { 
        id: newInitiativeId,
        organizationId, 
        title: newInitiativeTitle.trim(),
        description: newInitiativeDescription.trim() || undefined,
      });
      
      const initiativeId = await saveFocusInitiative({
        id: newInitiativeId,
        organizationId: validOrgId,
        title: newInitiativeTitle.trim(),
        description: newInitiativeDescription.trim() || undefined,
      });
      
      console.log('✅ 注力施策を追加しました。ID:', initiativeId);
      
      // リストを再取得
      const initiatives = await getFocusInitiatives(validOrgId);
      console.log('📋 再取得した注力施策リスト:', initiatives);
      setFocusInitiatives(initiatives);
      
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
      const initiatives = await getFocusInitiatives(validOrgId);
      setFocusInitiatives(initiatives);
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
      const initiatives = await getFocusInitiatives(validOrgId);
      setFocusInitiatives(initiatives);
      
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
          console.warn('⚠️ [handleAddMeetingNote] organizationIdがorganizationsテーブルに存在しません。名前で検索します:', {
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
                console.log('✅ [handleAddMeetingNote] 名前で検索して正しいIDを取得:', validOrgId);
              } else if (searchResults[0] && searchResults[0].id) {
                validOrgId = searchResults[0].id;
                console.log('⚠️ [handleAddMeetingNote] 完全一致が見つかりませんでした。最初の結果を使用:', validOrgId);
              }
            }
          }
        } else {
          console.log('✅ [handleAddMeetingNote] organizationIdがorganizationsテーブルに存在します:', validOrgId);
        }
      } catch (orgCheckError: any) {
        console.warn('⚠️ [handleAddMeetingNote] 組織IDの確認でエラー（続行します）:', orgCheckError);
      }
    }
    
    if (!validOrgId) {
      await tauriAlert('組織IDが取得できませんでした');
      return;
    }

    try {
      setSavingMeetingNote(true);
      console.log('📝 議事録を追加します:', { 
        id: newMeetingNoteId,
        organizationId: validOrgId, 
        title: newMeetingNoteTitle.trim(),
        description: newMeetingNoteDescription.trim() || undefined,
      });
      
      const noteId = await saveMeetingNote({
        id: newMeetingNoteId,
        organizationId: validOrgId,
        title: newMeetingNoteTitle.trim(),
        description: newMeetingNoteDescription.trim() || undefined,
      });
      
      console.log('✅ 議事録を追加しました。ID:', noteId);
      
      // リストを再取得
      const notes = await getMeetingNotes(validOrgId);
      console.log('📋 再取得した議事録リスト:', notes);
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
              console.log('🔍 [メンバー表示] organization.membersの状態:', {
                hasMembers: !!organization.members,
                membersLength: organization.members?.length || 0,
                members: organization.members?.slice(0, 3).map(m => ({ name: m.name, title: m.title })) || [],
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
            {focusInitiatives.length === 0 ? (
              <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
                注力施策が登録されていません
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px',
                }}
              >
                {focusInitiatives.map((initiative) => (
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
                              if (organizationId && initiative.id) {
                                router.push(`/organization/initiative?organizationId=${organizationId}&initiativeId=${initiative.id}`);
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
                          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(initiative);
                              }}
                              disabled={savingInitiative}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#3B82F6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: savingInitiative ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                              }}
                              title="編集"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteInitiative(initiative.id);
                              }}
                              disabled={savingInitiative}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#EF4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: savingInitiative ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                              }}
                              title="削除"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        {initiative.description && (
                          <p style={{ fontSize: '14px', color: 'var(--color-text-light)', marginBottom: '8px', lineHeight: '1.5' }}>
                            {initiative.description}
                          </p>
                        )}
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
                          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditMeetingNote(note);
                              }}
                              disabled={savingMeetingNote}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#3B82F6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                              }}
                              title="編集"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMeetingNote(note.id);
                              }}
                              disabled={savingMeetingNote}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#EF4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: savingMeetingNote ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                              }}
                              title="削除"
                            >
                              🗑️
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
