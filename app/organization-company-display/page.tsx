'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import {
  getAllOrganizationCompanyDisplays,
  createOrganizationCompanyDisplay,
  deleteOrganizationCompanyDisplay,
  updateOrganizationCompanyDisplayOrder,
  type OrganizationCompanyDisplay,
} from '@/lib/organizationCompanyDisplayApi';
import { getOrgTreeFromDb, type OrgNodeData } from '@/lib/orgApi';
// import { getAllCompanies, type Company } from '@/lib/companiesApi'; // Companiesテーブル削除のためコメントアウト
import { tauriAlert, tauriConfirm } from '@/lib/orgApi';

export default function OrganizationCompanyDisplayPage() {
  const router = useRouter();
  const [displays, setDisplays] = useState<OrganizationCompanyDisplay[]>([]);
  const [organizations, setOrganizations] = useState<OrgNodeData | null>(null);
  // const [companies, setCompanies] = useState<Company[]>([]); // Companiesテーブル削除のためコメントアウト
  const [loading, setLoading] = useState(true);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // 組織ツリーを取得
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [orgTree, displaysData] = await Promise.all([
          getOrgTreeFromDb(),
          getAllOrganizationCompanyDisplays(),
        ]);
        setOrganizations(orgTree);
        // setCompanies(companiesData || []); // Companiesテーブル削除のためコメントアウト
        setDisplays(displaysData || []);
      } catch (error: any) {
        console.error('データの取得に失敗しました:', error);
        await tauriAlert(`データの取得に失敗しました: ${error?.message || '不明なエラー'}`);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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

  // 組織名を取得
  const getOrganizationName = (organizationId: string): string => {
    if (!organizations) return organizationId;
    const org = findOrganizationById(organizations, organizationId);
    return org?.name || organizationId;
  };

  // 事業会社名を取得（Companiesテーブル削除のため、IDをそのまま返す）
  const getCompanyName = (companyId: string): string => {
    // const company = companies.find(c => c.id === companyId);
    // return company?.name || companyId;
    return companyId; // Companiesテーブル削除のため、IDをそのまま返す
  };

  // 選択された組織に表示される事業会社のリスト
  const getCompaniesForOrganization = (organizationId: string): OrganizationCompanyDisplay[] => {
    return displays.filter(d => d.organizationId === organizationId);
  };

  // 選択された事業会社が表示される組織のリスト
  const getOrganizationsForCompany = (companyId: string): OrganizationCompanyDisplay[] => {
    return displays.filter(d => d.companyId === companyId);
  };

  // 表示関係を追加
  const handleAddDisplay = async () => {
    if (!selectedOrganizationId || !selectedCompanyId) {
      await tauriAlert('組織と事業会社を選択してください');
      return;
    }

    // 既に存在するか確認
    const exists = displays.some(
      d => d.organizationId === selectedOrganizationId && d.companyId === selectedCompanyId
    );
    if (exists) {
      await tauriAlert('この表示関係は既に存在します');
      return;
    }

    try {
      setSaving(true);
      const newDisplay = await createOrganizationCompanyDisplay(
        selectedOrganizationId,
        selectedCompanyId
      );
      setDisplays([...displays, newDisplay]);
      setShowAddModal(false);
      setSelectedOrganizationId(null);
      setSelectedCompanyId(null);
      await tauriAlert('表示関係を追加しました');
    } catch (error: any) {
      console.error('表示関係の追加に失敗しました:', error);
      await tauriAlert(`追加に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSaving(false);
    }
  };

  // 表示関係を削除
  const handleDeleteDisplay = async (id: string) => {
    const confirmed = await tauriConfirm('この表示関係を削除しますか？');
    if (!confirmed) return;

    try {
      await deleteOrganizationCompanyDisplay(id);
      setDisplays(displays.filter(d => d.id !== id));
      await tauriAlert('表示関係を削除しました');
    } catch (error: any) {
      console.error('表示関係の削除に失敗しました:', error);
      await tauriAlert(`削除に失敗しました: ${error?.message || '不明なエラー'}`);
    }
  };

  // 表示順序を更新
  const handleUpdateDisplayOrder = async (id: string, newOrder: number) => {
    try {
      await updateOrganizationCompanyDisplayOrder(id, newOrder);
      setDisplays(
        displays.map(d => (d.id === id ? { ...d, displayOrder: newOrder } : d))
      );
    } catch (error: any) {
      console.error('表示順序の更新に失敗しました:', error);
      await tauriAlert(`更新に失敗しました: ${error?.message || '不明なエラー'}`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>データを読み込み中...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
            組織と事業会社の表示関係管理
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            + 表示関係を追加
          </button>
        </div>

        {/* 表示関係一覧 */}
        <div style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            表示関係一覧 ({displays.length}件)
          </h2>
          {displays.length === 0 ? (
            <p style={{ color: '#6B7280', fontSize: '14px' }}>表示関係がありません</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {displays.map(display => (
                <div
                  key={display.id}
                  style={{
                    padding: '16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ fontSize: '16px', color: '#1F2937' }}>
                        {getOrganizationName(display.organizationId)}
                      </strong>
                      <span style={{ margin: '0 8px', color: '#9CA3AF' }}>→</span>
                      <strong style={{ fontSize: '16px', color: '#1F2937' }}>
                        {getCompanyName(display.companyId)}
                      </strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      表示順序: {display.displayOrder}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={display.displayOrder}
                      onChange={(e) => {
                        const newOrder = parseInt(e.target.value) || 0;
                        handleUpdateDisplayOrder(display.id, newOrder);
                      }}
                      style={{
                        width: '80px',
                        padding: '6px 8px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        fontSize: '14px',
                      }}
                    />
                    <button
                      onClick={() => handleDeleteDisplay(display.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#EF4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 追加モーダル */}
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
                setSelectedOrganizationId(null);
                setSelectedCompanyId(null);
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
              <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700' }}>
                表示関係を追加
              </h3>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  組織
                </label>
                <select
                  value={selectedOrganizationId || ''}
                  onChange={(e) => setSelectedOrganizationId(e.target.value || null)}
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: saving ? '#F3F4F6' : '#FFFFFF',
                  }}
                >
                  <option value="">選択してください</option>
                  {organizations && flattenOrganizations(organizations).map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 事業会社選択はCompaniesテーブル削除のため無効化 */}
              <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#FEF3C7', borderRadius: '6px', border: '1px solid #FCD34D' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#92400E' }}>
                  ⚠️ 事業会社機能は削除されました。組織と事業会社の表示関係管理は現在利用できません。
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedOrganizationId(null);
                    setSelectedCompanyId(null);
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
                  onClick={handleAddDisplay}
                  disabled={true}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#9CA3AF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'not-allowed',
                    fontSize: '14px',
                  }}
                >
                  追加（無効化）
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
