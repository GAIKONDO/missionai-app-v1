'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { getCompanyById } from '@/lib/companiesApi';
import type { Company } from '@/lib/companiesApi';
import {
  getOrganizationsByCompanyDisplay,
  createOrganizationCompanyDisplay,
  deleteOrganizationCompanyDisplay,
  type OrganizationCompanyDisplay,
} from '@/lib/organizationCompanyDisplayApi';
import { getOrgTreeFromDb, type OrgNodeData } from '@/lib/orgApi';
import { tauriAlert, tauriConfirm } from '@/lib/orgApi';

function CompanyDetailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const companyId = searchParams?.get('id') as string;
  
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationDisplays, setOrganizationDisplays] = useState<OrganizationCompanyDisplay[]>([]);
  const [organizations, setOrganizations] = useState<OrgNodeData | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCompanyData = async () => {
      if (!companyId) {
        setError('事業会社IDが指定されていません');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // 事業会社データと組織表示関係を取得
        const [companyData, displaysData, orgTree] = await Promise.all([
          getCompanyById(companyId),
          getOrganizationsByCompanyDisplay(companyId),
          getOrgTreeFromDb(),
        ]);
        setCompany(companyData);
        setOrganizationDisplays(displaysData || []);
        setOrganizations(orgTree);
      } catch (err: any) {
        console.error('事業会社データの取得に失敗しました:', err);
        setError(err.message || '事業会社データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadCompanyData();
  }, [companyId]);

  // 組織を再帰的に検索する関数
  const findOrganizationById = (node: OrgNodeData, id: string): OrgNodeData | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findOrganizationById(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  // 組織ツリーを再帰的にフラットなリストに変換
  const flattenOrganizations = (node: OrgNodeData): OrgNodeData[] => {
    const result: OrgNodeData[] = [];
    if (node.id !== 'virtual-root') {
      result.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        result.push(...flattenOrganizations(child));
      }
    }
    return result;
  };

  // 指定された組織IDのすべての祖先組織IDを取得
  const getAllAncestorIds = (organizationId: string): string[] => {
    if (!organizations) return [];
    
    const findPath = (node: OrgNodeData, targetId: string, path: string[]): string[] | null => {
      if (!node.id) return null;
      
      const currentPath = [...path, node.id];
      
      if (node.id === targetId) {
        return currentPath;
      }
      
      if (node.children) {
        for (const child of node.children) {
          const result = findPath(child, targetId, currentPath);
          if (result) return result;
        }
      }
      
      return null;
    };
    
    const path = findPath(organizations, organizationId, []);
    if (!path) return [];
    
    // 自分自身を除いた祖先組織のIDを返す（virtual-rootも除外）
    return path.slice(0, -1).filter(id => id && id !== 'virtual-root');
  };

  // 指定された組織IDのすべての子孫組織IDを取得
  const getAllDescendantIds = (organizationId: string): string[] => {
    if (!organizations) return [];
    
    const org = findOrganizationById(organizations, organizationId);
    if (!org) return [];
    
    const descendants: string[] = [];
    const collectDescendants = (node: OrgNodeData) => {
      if (node.children) {
        for (const child of node.children) {
          if (child.id) {
            descendants.push(child.id);
            collectDescendants(child);
          }
        }
      }
    };
    
    collectDescendants(org);
    return descendants;
  };

  // 組織が選択されているか（自分自身または子孫が選択されている場合）
  // モーダル内では、selectedOrganizationIdsに含まれているかどうかで判定
  const isOrganizationSelected = (organizationId: string): boolean => {
    // 自分自身が選択されているか
    if (selectedOrganizationIds.includes(organizationId)) {
      return true;
    }
    
    // 子孫組織が選択されているか
    const descendantIds = getAllDescendantIds(organizationId);
    return descendantIds.some(id => selectedOrganizationIds.includes(id));
  };

  // 組織ツリーを階層構造でレンダリングする関数
  const renderOrganizationTree = (node: OrgNodeData, depth: number = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    
    // virtual-rootは表示しない、idが存在する場合のみ処理
    if (node.id && node.id !== 'virtual-root') {
      const isAlreadyAdded = organizationDisplays.some(d => d.organizationId === node.id);
      const isSelected = isOrganizationSelected(node.id);
      
      elements.push(
        <label
          key={node.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            paddingLeft: `${8 + depth * 24}px`,
            cursor: saving ? 'not-allowed' : 'pointer',
            borderRadius: '4px',
            backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!saving) {
              e.currentTarget.style.backgroundColor = isSelected ? '#DBEAFE' : '#F9FAFB';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isSelected ? '#EFF6FF' : 'transparent';
          }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {
              if (!saving && node.id) {
                handleOrganizationToggleWithAncestors(node.id);
              }
            }}
            disabled={saving}
            style={{
              marginRight: '8px',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          />
          <span style={{ fontSize: '14px', color: isAlreadyAdded ? '#6B7280' : '#1F2937' }}>
            {node.name}
            {isAlreadyAdded && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#9CA3AF' }}>(追加済み)</span>}
          </span>
        </label>
      );
    }
    
    // 子組織を再帰的にレンダリング
    if (node.children) {
      for (const child of node.children) {
        elements.push(...renderOrganizationTree(child, depth + 1));
      }
    }
    
    return elements;
  };

  // 組織を選択/解除する際に、祖先組織も自動的に選択/解除する
  const handleOrganizationToggleWithAncestors = (organizationId: string) => {
    const ancestorIds = getAllAncestorIds(organizationId);
    const allRelatedIds = [organizationId, ...ancestorIds];
    
    setSelectedOrganizationIds(prev => {
      // 現在この組織が選択されているかチェック（selectedOrganizationIdsに含まれているか）
      const isCurrentlySelected = prev.includes(organizationId);
      
      if (isCurrentlySelected) {
        // 解除: この組織とその祖先組織をすべて解除
        // ただし、子孫組織が選択されている場合は解除しない
        const descendantIds = getAllDescendantIds(organizationId);
        const hasSelectedDescendants = descendantIds.some(id => prev.includes(id));
        
        if (hasSelectedDescendants) {
          // 子孫が選択されている場合は、この組織だけを解除
          return prev.filter(id => id !== organizationId);
        } else {
          // 子孫が選択されていない場合は、この組織と祖先組織をすべて解除
          return prev.filter(id => !allRelatedIds.includes(id));
        }
      } else {
        // 選択: この組織とその祖先組織をすべて選択（重複を除外）
        const newIds = [...prev, ...allRelatedIds];
        return Array.from(new Set(newIds));
      }
    });
  };

  // 組織名を取得
  const getOrganizationName = (organizationId: string): string => {
    if (!organizations) return organizationId;
    const org = findOrganizationById(organizations, organizationId);
    return org?.name || organizationId;
  };

  // 組織の階層レベルを取得（ルートが0、深くなるほど大きくなる）
  const getOrganizationDepth = (organizationId: string): number => {
    if (!organizations) return 0;
    
    const findDepth = (node: OrgNodeData, targetId: string, depth: number): number | null => {
      if (node.id === targetId) {
        return depth;
      }
      
      if (node.children) {
        for (const child of node.children) {
          const result = findDepth(child, targetId, depth + 1);
          if (result !== null) return result;
        }
      }
      
      return null;
    };
    
    const depth = findDepth(organizations, organizationId, 0);
    return depth !== null ? depth : 999; // 見つからない場合は最後に
  };

  // 組織の階層順にソート（親組織が先、同じ階層内では名前順）
  const sortOrganizationsByHierarchy = (displays: OrganizationCompanyDisplay[]): OrganizationCompanyDisplay[] => {
    return [...displays].sort((a, b) => {
      const depthA = getOrganizationDepth(a.organizationId);
      const depthB = getOrganizationDepth(b.organizationId);
      
      // まず階層レベルでソート（浅い方が先）
      if (depthA !== depthB) {
        return depthA - depthB;
      }
      
      // 同じ階層内では名前順
      const nameA = getOrganizationName(a.organizationId);
      const nameB = getOrganizationName(b.organizationId);
      return nameA.localeCompare(nameB, 'ja');
    });
  };

  // 表示関係を追加/削除（複数選択対応、階層構造を考慮）
  const handleSaveDisplay = async () => {
    if (!companyId) {
      await tauriAlert('事業会社IDが取得できません');
      return;
    }

    try {
      setSaving(true);
      
      // 選択された組織とその祖先組織をすべて含める
      const allSelectedOrganizationIds = new Set<string>();
      selectedOrganizationIds.forEach(orgId => {
        allSelectedOrganizationIds.add(orgId);
        const ancestorIds = getAllAncestorIds(orgId);
        ancestorIds.forEach(ancestorId => allSelectedOrganizationIds.add(ancestorId));
      });

      // 現在追加されている組織IDのセット
      const currentDisplayIds = new Set(organizationDisplays.map(d => d.organizationId));
      
      // 追加する組織（選択されているが、まだ追加されていない）
      const toAdd = Array.from(allSelectedOrganizationIds).filter(
        orgId => !currentDisplayIds.has(orgId)
      );
      
      // 削除する組織（追加されているが、選択されていない）
      const toRemove = organizationDisplays.filter(
        d => !allSelectedOrganizationIds.has(d.organizationId)
      );

      // 追加処理（エラーハンドリング付き）
      const addResults = await Promise.allSettled(
        toAdd.map(orgId => createOrganizationCompanyDisplay(orgId, companyId))
      );
      
      const newDisplays: OrganizationCompanyDisplay[] = [];
      const addErrors: string[] = [];
      
      addResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          newDisplays.push(result.value);
        } else {
          const orgId = toAdd[index];
          const errorMsg = result.reason?.message || '不明なエラー';
          // UNIQUE制約エラーの場合は無視（既に存在するため）
          if (!errorMsg.includes('UNIQUE constraint')) {
            addErrors.push(`${orgId}: ${errorMsg}`);
          }
        }
      });

      // 削除処理
      const deletePromises = toRemove.map(display =>
        deleteOrganizationCompanyDisplay(display.id)
      );
      await Promise.all(deletePromises);

      // 状態を更新
      const updatedDisplays = [
        ...organizationDisplays.filter(d => !toRemove.some(r => r.id === d.id)),
        ...newDisplays,
      ];
      setOrganizationDisplays(updatedDisplays);
      setShowAddModal(false);
      setSelectedOrganizationIds([]);
      
      const messages = [];
      if (newDisplays.length > 0) messages.push(`${newDisplays.length}件を追加`);
      if (toRemove.length > 0) messages.push(`${toRemove.length}件を削除`);
      if (addErrors.length > 0) {
        console.error('追加エラー:', addErrors);
      }
      await tauriAlert(messages.length > 0 ? messages.join('、') : '変更はありません');
    } catch (error: any) {
      console.error('表示関係の保存に失敗しました:', error);
      await tauriAlert(`保存に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSaving(false);
    }
  };


  // すべて選択/すべて解除（階層構造を考慮）
  const handleSelectAll = () => {
    if (!organizations) return;
    const allOrgs = flattenOrganizations(organizations);
    
    // 現在選択されている組織の数（祖先組織を含む）を計算
    const allSelectedIds = new Set<string>();
    selectedOrganizationIds.forEach(orgId => {
      allSelectedIds.add(orgId);
      const ancestorIds = getAllAncestorIds(orgId);
      ancestorIds.forEach(id => allSelectedIds.add(id));
    });
    
    // 既に追加済みの組織IDも含める
    organizationDisplays.forEach(d => allSelectedIds.add(d.organizationId));
    
    if (allSelectedIds.size >= allOrgs.length) {
      // すべて解除
      setSelectedOrganizationIds([]);
    } else {
      // すべて選択（すべての組織を選択）
      setSelectedOrganizationIds(allOrgs.map(org => org.id).filter((id): id is string => id !== undefined));
    }
  };

  // 表示関係を削除
  const handleDeleteDisplay = async (id: string) => {
    const confirmed = await tauriConfirm('この表示関係を削除しますか？');
    if (!confirmed) return;

    try {
      await deleteOrganizationCompanyDisplay(id);
      setOrganizationDisplays(organizationDisplays.filter(d => d.id !== id));
      await tauriAlert('表示関係を削除しました');
    } catch (error: any) {
      console.error('表示関係の削除に失敗しました:', error);
      await tauriAlert(`削除に失敗しました: ${error?.message || '不明なエラー'}`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>事業会社データを読み込み中...</p>
        </div>
      </Layout>
    );
  }

  if (error || !company) {
    return (
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#EF4444', marginBottom: '20px' }}>{error || '事業会社が見つかりません'}</p>
          <button
            onClick={() => router.push('/companies')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            事業会社一覧に戻る
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)' }}>
            {company.name}
            {company.nameShort && (
              <span style={{ fontSize: '16px', color: '#6B7280', marginLeft: '8px' }}>
                ({company.nameShort})
              </span>
            )}
          </h1>
          <button
            onClick={() => router.push('/companies')}
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
              基本情報
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <strong>コード:</strong> {company.code}
              </div>
              <div>
                <strong>カテゴリ:</strong> {company.category}
              </div>
              <div>
                <strong>地域:</strong> {company.region}
              </div>
              {company.organizationId && (
                <div>
                  <strong>組織ID:</strong> {company.organizationId}
                </div>
              )}
            </div>
          </div>

          {(company.company || company.division || company.department) && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                主管情報
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {company.company && (
                  <div>
                    <strong>主管カンパニー:</strong> {company.company}
                  </div>
                )}
                {company.division && (
                  <div>
                    <strong>主管部門:</strong> {company.division}
                  </div>
                )}
                {company.department && (
                  <div>
                    <strong>主管部:</strong> {company.department}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
                主管組織 ({organizationDisplays.length}件)
              </h3>
              <button
                onClick={() => {
                  // モーダルを開くときに、既に追加済みの組織IDを選択状態にする
                  const addedOrgIds = organizationDisplays.map(d => d.organizationId);
                  setSelectedOrganizationIds(addedOrgIds);
                  setShowAddModal(true);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                組織を編集
              </button>
            </div>
            {organizationDisplays.length === 0 ? (
              <p style={{ color: '#6B7280', fontSize: '14px' }}>主管組織がありません</p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '12px',
                }}
              >
                {sortOrganizationsByHierarchy(organizationDisplays).map(display => {
                  const orgName = getOrganizationName(display.organizationId);
                  const depth = getOrganizationDepth(display.organizationId);
                  
                  return (
                    <div
                      key={display.id}
                      onClick={() => router.push(`/organization/detail?id=${display.organizationId}`)}
                      style={{
                        padding: '16px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                        e.currentTarget.style.borderColor = '#3B82F6';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      <div style={{ marginBottom: '8px' }}>
                        <strong style={{ fontSize: '16px', color: '#1F2937', display: 'block' }}>
                          {orgName}
                        </strong>
                        {depth > 0 && (
                          <span style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                            {Array(depth).fill('└').join('')} 階層レベル: {depth}
                          </span>
                        )}
                      </div>
                      {display.displayOrder !== 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>
                            表示順序: {display.displayOrder}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
              その他
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <strong>位置:</strong> {company.position}
              </div>
              <div>
                <strong>作成日:</strong> {new Date(company.createdAt).toLocaleDateString('ja-JP')}
              </div>
              <div>
                <strong>更新日:</strong> {new Date(company.updatedAt).toLocaleDateString('ja-JP')}
              </div>
            </div>
          </div>
        </div>

        {/* 組織追加モーダル */}
        {showAddModal && (
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
              if (!saving) {
                setShowAddModal(false);
                setSelectedOrganizationIds([]);
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
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '700' }}>
                表示組織を編集
              </h3>
              <p style={{ margin: '0 0 24px 0', fontSize: '12px', color: '#6B7280' }}>
                組織を選択すると、その上位組織にも自動的に表示されます。チェックを外すと削除されます。
              </p>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600' }}>
                    組織（複数選択可）
                  </label>
                  {organizations && (
                    <button
                      onClick={handleSelectAll}
                      disabled={saving}
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#F3F4F6',
                        color: '#374151',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {selectedOrganizationIds.length > 0 ? 'すべて解除' : 'すべて選択'}
                    </button>
                  )}
                </div>
                <div
                  style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    padding: '8px',
                    backgroundColor: saving ? '#F3F4F6' : '#FFFFFF',
                  }}
                >
                  {organizations && renderOrganizationTree(organizations)}
                  {organizations && flattenOrganizations(organizations)
                    .filter(org => !organizationDisplays.some(d => d.organizationId === org.id))
                    .length === 0 && (
                    <p style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                      追加できる組織がありません
                    </p>
                  )}
                </div>
                {selectedOrganizationIds.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
                    {selectedOrganizationIds.length}件選択中
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedOrganizationIds([]);
                  }}
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveDisplay}
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: saving ? '#9CA3AF' : '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {saving ? '保存中...' : `保存 (${selectedOrganizationIds.length}件選択中)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function CompanyDetailPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>読み込み中...</p>
        </div>
      </Layout>
    }>
      <CompanyDetailPageContent />
    </Suspense>
  );
}
