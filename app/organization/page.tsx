'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import type { OrgNodeData, MemberInfo } from '@/components/OrgChart';
import { getOrgTreeFromDb, getOrgMembers, deleteOrg, tauriAlert } from '@/lib/orgApi';
import { sortMembersByPosition } from '@/lib/memberSort';
import HierarchyView from './views/HierarchyView';
import BubbleView from './views/BubbleView';
import FinderView from './views/FinderView';
import SelectedOrganizationPanel from './components/SelectedOrganizationPanel';
import OrganizationEditModal from './components/modals/OrganizationEditModal';
import DeleteOrganizationModal from './components/modals/DeleteOrganizationModal';
import ViewModeSelector from './components/ViewModeSelector';
import FilterPanel from './components/FilterPanel';
import SearchBar from './components/SearchBar';
import SearchCandidates from './components/SearchCandidates';
import FilterResults from './components/FilterResults';
import { mapMembersToMemberInfo, findOrgInTree } from './utils/organizationUtils';
import { useOrganizationData } from './hooks/useOrganizationData';
import { useOrganizationFilters } from './hooks/useOrganizationFilters';
import { useOrganizationManagement } from './hooks/useOrganizationManagement';
import { useFinderManagement } from './hooks/useFinderManagement';
import { devLog, devWarn } from './utils/devLog';

type ViewMode = 'hierarchy' | 'bubble' | 'finder';



export default function OrganizationPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchy');
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteOrgModal, setShowDeleteOrgModal] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<OrgNodeData | null>(null);
  
  // Finder風カラム表示用のstate
  const [finderSelectedPath, setFinderSelectedPath] = useState<OrgNodeData[]>([]);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [editingOrgName, setEditingOrgName] = useState('');
  const [showFinderDeleteModal, setShowFinderDeleteModal] = useState(false);
  const [orgToDeleteInFinder, setOrgToDeleteInFinder] = useState<{ id: string; name: string } | null>(null);

  // データ取得フック
  const {
    selectedNode,
    setSelectedNode,
    orgData,
    setOrgData,
    loading,
    error,
    selectedNodeMembers,
    setSelectedNodeMembers,
    refreshOrgData,
  } = useOrganizationData();

  // フィルターフック
  const {
    searchQuery,
    setSearchQuery,
    searchInput,
    setSearchInput,
    searchCandidates,
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
  } = useOrganizationFilters(orgData);

  // 組織管理フック
  const {
    handleNodeClick,
    handleNavigateToDetail,
    handleAddOrg,
  } = useOrganizationManagement(setOrgData, setSelectedNode, setSelectedNodeMembers);

  // Finder管理フック
  const {
    handleReorderOrg,
    handleMoveOrg,
    handleEditSave,
    handleCreateOrg,
  } = useFinderManagement(
    setOrgData,
    finderSelectedPath,
    setFinderSelectedPath,
    setEditingOrgId,
    setEditingOrgName,
    filteredOrgData,
    orgData
  );


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
            <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
          
          <FilterPanel
            orgData={orgData}
            searchQuery={searchQuery}
            searchInput={searchInput}
            setSearchQuery={setSearchQuery}
            setSearchInput={setSearchInput}
            selectedRootOrgId={selectedRootOrgId}
            setSelectedRootOrgId={setSelectedRootOrgId}
            isFilterExpanded={isFilterExpanded}
            setIsFilterExpanded={setIsFilterExpanded}
            getRootOrganizations={getRootOrganizations}
            onResetFilters={resetFilters}
          />
          
          {/* フィルターUI（展開時） */}
          {isFilterExpanded && (
            <div style={{ 
              marginTop: '16px', 
              padding: '16px', 
              backgroundColor: '#F9FAFB', 
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <SearchBar
                  searchInput={searchInput}
                  searchQuery={searchQuery}
                  setSearchInput={setSearchInput}
                  setSearchQuery={setSearchQuery}
                />
              </div>
              
              <SearchCandidates
                candidates={searchCandidates}
                selectedRootOrgTree={selectedRootOrgTree}
                onCandidateClick={handleNodeClick}
                onClearSearch={resetFilters}
              />

              <FilterResults
                orgData={orgData}
                filteredOrgData={filteredOrgData}
                searchQuery={searchQuery}
                selectedRootOrgId={selectedRootOrgId}
                searchCandidates={searchCandidates}
                getRootOrganizations={getRootOrganizations}
              />
            </div>
          )}
          
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
              onNavigateToDetail={() => handleNavigateToDetail(selectedNode)}
              onAddOrg={handleAddOrg}
              error={error}
            />
            <SelectedOrganizationPanel
              selectedNode={selectedNode}
              expandedMembers={expandedMembers}
              setExpandedMembers={setExpandedMembers}
              onEditClick={() => setShowEditModal(true)}
              onNavigateToDetail={() => handleNavigateToDetail(selectedNode)}
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
              onNavigateToDetail={() => handleNavigateToDetail(selectedNode)}
              onAddOrg={handleAddOrg}
              error={error}
            />
            <SelectedOrganizationPanel
              selectedNode={selectedNode}
              expandedMembers={expandedMembers}
              setExpandedMembers={setExpandedMembers}
              onEditClick={() => setShowEditModal(true)}
              onNavigateToDetail={() => handleNavigateToDetail(selectedNode)}
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
                onReorderOrg={handleReorderOrg}
                onMoveOrg={handleMoveOrg}
                onEditSave={handleEditSave}
                onCreateOrg={handleCreateOrg}
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


