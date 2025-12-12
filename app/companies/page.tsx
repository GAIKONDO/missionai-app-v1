'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import dynamic from 'next/dynamic';
import { getAllCompanies, exportCompaniesToCSV, createCompany, updateCompany, deleteCompany } from '@/lib/companiesApi';
import type { Company } from '@/lib/companiesApi';
import { getOrgTreeFromDb, tauriAlert, getAllOrganizationsFromTree } from '@/lib/orgApi';
import type { OrgNodeData } from '@/components/OrgChart';
import { buildCompanyHierarchy } from '@/lib/buildCompanyHierarchy';
import type { CompanyNodeData } from '@/components/CompanyChart';
import { importCompaniesData } from '@/lib/import-companies-data';

// CompanyChartを動的インポート（SSRを回避）
const CompanyChart = dynamic(() => import('@/components/CompanyChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      階層表示を読み込み中...
    </div>
  ),
});

// CompanyBubbleChartを動的インポート（SSRを回避）
const CompanyBubbleChart = dynamic(() => import('@/components/CompanyBubbleChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      バブルチャートを読み込み中...
    </div>
  ),
});

type ViewMode = 'hierarchy' | 'bubble';

// ノード配下のすべての事業会社を集約する共通関数
const collectAllCompanies = (node: CompanyNodeData): Company[] => {
  const companies: Company[] = [];
  
  // 現在のノードの事業会社を追加
  if (node.companies && node.companies.length > 0) {
    companies.push(...node.companies);
  }
  
  // 子ノードからも事業会社を収集
  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => {
      companies.push(...collectAllCompanies(child));
    });
  }
  
  return companies;
};

// 選択された会社の表示コンポーネント
function SelectedCompanyPanel({
  selectedNode,
  containerStyle,
  onEditClick,
}: {
  selectedNode: CompanyNodeData;
  containerStyle?: React.CSSProperties;
  onEditClick?: (company: Company) => void;
}) {
  const router = useRouter();

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>選択された会社</h3>
      </div>
      <div style={{ marginBottom: '15px' }}>
        <p><strong>名前:</strong> {selectedNode.name}</p>
        {selectedNode.title && (
          <p><strong>タイトル:</strong> {selectedNode.title}</p>
        )}
      </div>
      {selectedNode.companies && selectedNode.companies.length > 0 && (
        <div>
          <h4 style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
            事業会社 ({selectedNode.companies.length}社)
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '12px',
            }}
          >
            {selectedNode.companies.map((company) => (
              <div
                key={company.id}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ fontSize: '15px', color: '#1F2937' }}>{company.name}</strong>
                  {company.nameShort && (
                    <span style={{ marginLeft: '8px', fontSize: '13px', color: '#6B7280' }}>
                      ({company.nameShort})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                  <strong>コード:</strong> {company.code}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                  <strong>区分:</strong> {company.category}
                </div>
                {company.company && (
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                    <strong>主管カンパニー:</strong> {company.company}
                  </div>
                )}
                {company.division && (
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                    <strong>主管部門:</strong> {company.division}
                  </div>
                )}
                {company.department && (
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                    <strong>主管部:</strong> {company.department}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                  <strong>地域:</strong> {company.region}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => router.push(`/companies/detail?id=${company.id}`)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: 'var(--color-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #2563EB)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                    }}
                  >
                    専用ページへ →
                  </button>
                  {onEditClick && (
                    <button
                      onClick={() => onEditClick(company)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#10B981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#059669';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#10B981';
                      }}
                    >
                      編集
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('bubble');
  const [selectedNode, setSelectedNode] = useState<CompanyNodeData | null>(null);
  const [importing, setImporting] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [orgTree, setOrgTree] = useState<OrgNodeData | null>(null);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [showDeleteCompanyModal, setShowDeleteCompanyModal] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  
  // フィルター関連のstate
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all'); // 'all' or specific category
  const [regionFilter, setRegionFilter] = useState<string>('all'); // 'all', '国内', '海外'
  const [minCompanies, setMinCompanies] = useState<number>(0);
  const [selectedRootCompanyId, setSelectedRootCompanyId] = useState<string | null>(null); // 選択されたルート主管カンパニーのID
  const [isFilterExpanded, setIsFilterExpanded] = useState(false); // フィルターUIの展開状態

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 組織データを取得（事業会社追加時に組織選択に使用）
        try {
          const orgData = await getOrgTreeFromDb();
          if (orgData) {
            setOrgTree(orgData);
          }
        } catch (orgErr: any) {
          console.warn('組織データの取得に失敗しました（続行します）:', orgErr);
        }
        
        // すべての事業会社を取得
        try {
          const allCompanies = await getAllCompanies();
          setCompanies(allCompanies || []);
        } catch (companyErr: any) {
          console.error('事業会社データの読み込みエラー:', companyErr);
          // エラーが発生しても空配列を設定して続行
          setCompanies([]);
          setError(companyErr.message || '事業会社データの読み込みに失敗しました');
        }
      } catch (err: any) {
        console.error('データの読み込みエラー:', err);
        setError(err.message || 'データの読み込みに失敗しました');
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 階層データを構築
  const hierarchyData = useMemo(() => {
    if (companies.length === 0) return null;
    return buildCompanyHierarchy(companies);
  }, [companies]);

  // ルート主管カンパニーのリストを取得する関数
  const getRootCompanies = (): CompanyNodeData[] => {
    if (!hierarchyData || !hierarchyData.children) return [];
    // ルートノード（統合会社）の子ノード（主管カンパニー）を返す
    return hierarchyData.children;
  };

  // 選択されたルート主管カンパニーの傘下のみを取得する関数
  const getSelectedRootCompanyTree = (): CompanyNodeData | null => {
    if (!hierarchyData) return null;
    
    // ルート主管カンパニーが選択されていない場合は、全体を返す
    if (!selectedRootCompanyId) {
      return hierarchyData;
    }
    
    // 選択された主管カンパニーを探す
    if (hierarchyData.children) {
      const selectedCompany = hierarchyData.children.find(child => child.id === selectedRootCompanyId);
      return selectedCompany || null;
    }
    
    return null;
  };

  // 事業会社ツリーをフィルターする関数
  const filterCompanyTree = (node: CompanyNodeData | null): CompanyNodeData | null => {
    if (!node) return null;

    // 現在のノード配下のすべての事業会社を取得
    const nodeCompanies = collectAllCompanies(node);

    // 検索クエリでフィルター
    const matchesSearch = !searchQuery || 
      nodeCompanies.some(company => 
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.nameShort?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.code.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.title?.toLowerCase().includes(searchQuery.toLowerCase());

    // 区分でフィルター
    const matchesCategory = categoryFilter === 'all' || 
      nodeCompanies.some(company => company.category === categoryFilter);

    // 地域でフィルター
    const matchesRegion = regionFilter === 'all' || 
      nodeCompanies.some(company => company.region === regionFilter);

    // 事業会社数でフィルター
    const companyCount = nodeCompanies.length;
    const matchesCompanies = companyCount >= minCompanies;

    // 現在のノードが条件を満たすか
    const nodeMatches = matchesSearch && matchesCategory && matchesRegion && matchesCompanies;

    // 子ノードを再帰的にフィルター
    const filteredChildren = node.children
      ?.map(child => filterCompanyTree(child))
      .filter((child): child is CompanyNodeData => child !== null) || [];

    // 現在のノードが条件を満たす、または子ノードが条件を満たす場合に表示
    if (nodeMatches || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      };
    }

    return null;
  };

  // 選択されたルート主管カンパニーの傘下を取得し、フィルターを適用
  const selectedRootCompanyTree = getSelectedRootCompanyTree();
  const filteredCompanyData = filterCompanyTree(selectedRootCompanyTree);

  // 「C0S：情金」をデフォルトで選択
  useEffect(() => {
    if (hierarchyData && !selectedNode) {
      // 「C0S：情金」のノードを探す
      const findC0SNode = (node: CompanyNodeData): CompanyNodeData | null => {
        if (node.name === 'C0S：情金') {
          return node;
        }
        if (node.children) {
          for (const child of node.children) {
            const found = findC0SNode(child);
            if (found) return found;
          }
        }
        return null;
      };

      const c0sNode = findC0SNode(hierarchyData);
      if (c0sNode) {
        const allCompanies = collectAllCompanies(c0sNode);
        const nodeWithCompanies: CompanyNodeData = {
          ...c0sNode,
          companies: allCompanies.length > 0 ? allCompanies : c0sNode.companies,
        };
        
        setSelectedNode(nodeWithCompanies);
      }
    }
  }, [hierarchyData, selectedNode]);

  // ノードクリックハンドラー
  const handleNodeClick = (node: CompanyNodeData) => {
    console.log('ノードがクリックされました:', node);
    
    // すべての事業会社を集約したノードを作成
    const allCompanies = collectAllCompanies(node);
    const nodeWithCompanies: CompanyNodeData = {
      ...node,
      companies: allCompanies.length > 0 ? allCompanies : node.companies,
    };
    
    setSelectedNode(nodeWithCompanies);
  };

  // データインポート処理
  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);
      await importCompaniesData();
      // データを再読み込み
      const allCompanies = await getAllCompanies();
      setCompanies(allCompanies || []);
      await tauriAlert('事業会社データのインポートが完了しました。');
    } catch (err: any) {
      console.error('インポートエラー:', err);
      setError(err.message || 'データのインポートに失敗しました');
      await tauriAlert(`エラー: ${err.message || 'データのインポートに失敗しました'}`);
    } finally {
      setImporting(false);
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

  if (error) {
    return (
      <Layout>
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ marginBottom: '8px' }}>事業会社</h2>
          <p style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h2 style={{ marginBottom: 0 }}>事業会社</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {companies.length === 0 && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: importing ? '#9CA3AF' : '#10B981',
                    color: '#ffffff',
                    cursor: importing ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                  }}
                >
                  {importing ? 'インポート中...' : 'サンプルデータをインポート'}
                </button>
              )}
              <button
                onClick={() => setShowAddCompanyModal(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#10B981',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
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
                + 事業会社を追加
              </button>
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
                バブルチャート
              </button>
              <button
                onClick={async () => {
                  if (isExportingCSV) return;
                  setIsExportingCSV(true);
                  try {
                    await exportCompaniesToCSV();
                    await tauriAlert('CSVエクスポートが完了しました');
                  } catch (error: any) {
                    console.error('CSVエクスポートエラー:', error);
                    await tauriAlert(`CSVエクスポートに失敗しました: ${error.message}`);
                  } finally {
                    setIsExportingCSV(false);
                  }
                }}
                disabled={isExportingCSV}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isExportingCSV ? '#9CA3AF' : '#10B981',
                  color: '#ffffff',
                  cursor: isExportingCSV ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                  opacity: isExportingCSV ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  if (!isExportingCSV) {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isExportingCSV) {
                    e.currentTarget.style.backgroundColor = '#10B981';
                  }
                }}
              >
                {isExportingCSV ? 'エクスポート中...' : '📥 CSVエクスポート'}
              </button>
            </div>
          </div>
          <p style={{ marginBottom: 0, fontSize: '14px', color: 'var(--color-text-light)' }}>
            {viewMode === 'hierarchy' 
              ? '事業会社を組織に紐づけて階層形式で表示します。'
              : '事業会社をバブルチャート形式で表示します。'}
          </p>
          
          {/* ルート主管カンパニー選択ボタンとフィルターボタン */}
          {hierarchyData && getRootCompanies().length > 0 && (
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
                    表示する主管カンパニーを選択:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setSelectedRootCompanyId(null)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #BAE6FD',
                        backgroundColor: selectedRootCompanyId === null ? '#0EA5E9' : '#fff',
                        color: selectedRootCompanyId === null ? '#fff' : '#0369A1',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedRootCompanyId !== null) {
                          e.currentTarget.style.backgroundColor = '#E0F2FE';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedRootCompanyId !== null) {
                          e.currentTarget.style.backgroundColor = '#fff';
                        }
                      }}
                    >
                      すべて表示
                    </button>
                    {getRootCompanies().map((rootCompany) => (
                      <button
                        key={rootCompany.id}
                        onClick={() => setSelectedRootCompanyId(rootCompany.id || null)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #BAE6FD',
                          backgroundColor: selectedRootCompanyId === rootCompany.id ? '#0EA5E9' : '#fff',
                          color: selectedRootCompanyId === rootCompany.id ? '#fff' : '#0369A1',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedRootCompanyId !== rootCompany.id) {
                            e.currentTarget.style.backgroundColor = '#E0F2FE';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedRootCompanyId !== rootCompany.id) {
                            e.currentTarget.style.backgroundColor = '#fff';
                          }
                        }}
                      >
                        {rootCompany.name}
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
                    {(searchQuery || categoryFilter !== 'all' || regionFilter !== 'all' || minCompanies > 0) && (
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
                  {(searchQuery || categoryFilter !== 'all' || regionFilter !== 'all' || minCompanies > 0) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setCategoryFilter('all');
                        setRegionFilter('all');
                        setMinCompanies(0);
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
                {/* 検索ボックス */}
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '6px' 
                  }}>
                    事業会社名で検索
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="事業会社名、略称、コードで検索..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      fontSize: '14px',
                      fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                    }}
                  />
                </div>

                {/* 区分フィルター */}
                <div style={{ minWidth: '150px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '6px' 
                  }}>
                    区分
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      fontSize: '14px',
                      fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">すべて</option>
                    {Array.from(new Set(companies.map(c => c.category).filter(Boolean))).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* 地域フィルター */}
                <div style={{ minWidth: '150px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '6px' 
                  }}>
                    地域
                  </label>
                  <select
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      fontSize: '14px',
                      fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">すべて</option>
                    <option value="国内">国内</option>
                    <option value="海外">海外</option>
                  </select>
                </div>

                {/* 最小事業会社数フィルター */}
                <div style={{ minWidth: '150px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '6px' 
                  }}>
                    最小事業会社数
                  </label>
                  <input
                    type="number"
                    value={minCompanies}
                    onChange={(e) => setMinCompanies(parseInt(e.target.value) || 0)}
                    min="0"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      fontSize: '14px',
                      fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                    }}
                  />
                </div>
              </div>
              
              {/* フィルター結果の表示 */}
              {(searchQuery || categoryFilter !== 'all' || regionFilter !== 'all' || minCompanies > 0 || selectedRootCompanyId) && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '8px 12px', 
                  backgroundColor: '#EFF6FF', 
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#1E40AF',
                }}>
                  {filteredCompanyData ? (
                    <>
                      フィルター適用中: 
                      {selectedRootCompanyId && (
                        <> 主管カンパニー: {getRootCompanies().find(comp => comp.id === selectedRootCompanyId)?.name || ''}</>
                      )}
                      {searchQuery && ` 検索: 「${searchQuery}」`}
                      {categoryFilter !== 'all' && ` 区分: ${categoryFilter}`}
                      {regionFilter !== 'all' && ` 地域: ${regionFilter}`}
                      {minCompanies > 0 && ` 事業会社数: ${minCompanies}社以上`}
                    </>
                  ) : (
                    <>条件に一致する事業会社が見つかりませんでした</>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-light)', marginBottom: '20px' }}>
            事業会社データがありません。サンプルデータをインポートしてください。
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'flex',
          gap: '20px',
          height: '80vh',
          minHeight: '600px',
          alignItems: 'flex-start',
          width: '100%',
        }}>
          <div style={{ 
            background: 'var(--color-surface)',
            borderRadius: '6px',
            padding: '0',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
            marginBottom: '0',
            border: 'none',
            overflow: 'hidden',
            flex: (viewMode === 'bubble' || viewMode === 'hierarchy') && selectedNode ? '0 0 60%' : '1',
            display: 'flex',
            flexDirection: 'column',
            transition: 'flex 0.3s ease',
            height: '100%',
            minWidth: 0, // flexアイテムの最小幅を0にして、縮小を許可
          }}>
            {viewMode === 'hierarchy' && hierarchyData ? (
              <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                <CompanyChart
                  data={filteredCompanyData || hierarchyData}
                  onNodeClick={(node, event) => handleNodeClick(node)}
                />
              </div>
            ) : viewMode === 'bubble' && hierarchyData ? (
              <div style={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative' }}>
                <CompanyBubbleChart
                  data={filteredCompanyData || hierarchyData}
                  onNodeClick={(node) => handleNodeClick(node)}
                />
              </div>
            ) : null}
          </div>

          {viewMode === 'bubble' && selectedNode && (
            <div style={{ 
              background: 'var(--color-surface)',
              borderRadius: '6px',
              padding: '24px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
              marginBottom: '0',
              border: 'none',
              flex: '0 0 38%',
              overflowY: 'auto',
              height: '100%',
              position: 'sticky',
              top: 0,
              alignSelf: 'flex-start',
              maxWidth: '500px',
            }}>
              <SelectedCompanyPanel 
                selectedNode={selectedNode} 
                onEditClick={(company) => {
                  setCompanyToEdit(company);
                  setShowEditCompanyModal(true);
                }}
              />
            </div>
          )}

          {viewMode === 'hierarchy' && selectedNode && (
            <div style={{ 
              background: 'var(--color-surface)',
              borderRadius: '6px',
              padding: '24px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
              marginBottom: '0',
              border: 'none',
              flex: '0 0 38%',
              overflowY: 'auto',
              height: '100%',
              position: 'sticky',
              top: 0,
              alignSelf: 'flex-start',
              maxWidth: '500px',
            }}>
              <SelectedCompanyPanel 
                selectedNode={selectedNode} 
                onEditClick={(company) => {
                  setCompanyToEdit(company);
                  setShowEditCompanyModal(true);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 事業会社追加モーダル */}
      {showAddCompanyModal && (
        <AddCompanyModal
          orgTree={orgTree}
          onClose={() => setShowAddCompanyModal(false)}
          onSave={async () => {
            // 事業会社リストを再取得
            const allCompanies = await getAllCompanies();
            setCompanies(allCompanies || []);
            await tauriAlert('事業会社を追加しました');
            setShowAddCompanyModal(false);
          }}
        />
      )}

      {/* 事業会社編集モーダル */}
      {showEditCompanyModal && companyToEdit && (
        <EditCompanyModal
          company={companyToEdit}
          orgTree={orgTree}
          onClose={() => {
            setShowEditCompanyModal(false);
            setCompanyToEdit(null);
          }}
          onSave={async () => {
            // 事業会社リストを再取得
            const allCompanies = await getAllCompanies();
            setCompanies(allCompanies || []);
            await tauriAlert('事業会社を更新しました');
            setShowEditCompanyModal(false);
            setCompanyToEdit(null);
          }}
          onDeleteClick={() => {
            setShowEditCompanyModal(false);
            setCompanyToDelete(companyToEdit);
            setShowDeleteCompanyModal(true);
          }}
        />
      )}

      {/* 事業会社削除モーダル */}
      {showDeleteCompanyModal && companyToDelete && (
        <DeleteCompanyModal
          company={companyToDelete}
          onClose={() => {
            setShowDeleteCompanyModal(false);
            setCompanyToDelete(null);
          }}
          onConfirm={async () => {
            try {
              await deleteCompany(companyToDelete.id);
              // 事業会社リストを再取得
              const allCompanies = await getAllCompanies();
              setCompanies(allCompanies || []);
              await tauriAlert('事業会社を削除しました');
              setShowDeleteCompanyModal(false);
              setCompanyToDelete(null);
            } catch (error: any) {
              console.error('事業会社削除エラー:', error);
              await tauriAlert(`事業会社の削除に失敗しました: ${error.message}`);
            }
          }}
        />
      )}
    </Layout>
  );
}

// 事業会社追加モーダルコンポーネント
function AddCompanyModal({
  orgTree,
  onClose,
  onSave,
}: {
  orgTree: OrgNodeData | null;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameShort, setNameShort] = useState('');
  const [category, setCategory] = useState('');
  const [organizationId, setOrganizationId] = useState<string>('');
  const [company, setCompany] = useState('');
  const [division, setDivision] = useState('');
  const [department, setDepartment] = useState('');
  const [region, setRegion] = useState('国内');
  const [position, setPosition] = useState(0);
  const [saving, setSaving] = useState(false);

  // 組織ツリーから組織の選択肢を生成
  const orgOptions = orgTree ? getAllOrganizationsFromTree(orgTree) : [];

  const handleSave = async () => {
    if (!code.trim()) {
      await tauriAlert('コードは必須です');
      return;
    }
    if (!name.trim()) {
      await tauriAlert('会社名は必須です');
      return;
    }
    if (!category.trim()) {
      await tauriAlert('区分は必須です');
      return;
    }
    if (!organizationId) {
      await tauriAlert('組織は必須です');
      return;
    }
    if (!region.trim()) {
      await tauriAlert('地域は必須です');
      return;
    }
    
    setSaving(true);
    try {
      await createCompany(
        code.trim(),
        name.trim(),
        nameShort.trim() || null,
        category.trim(),
        organizationId,
        company.trim() || null,
        division.trim() || null,
        department.trim() || null,
        region.trim(),
        position
      );
      await onSave();
    } catch (error: any) {
      console.error('事業会社追加エラー:', error);
      await tauriAlert(`事業会社の追加に失敗しました: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
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
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '600px',
          width: '95%',
          maxHeight: '95vh',
          overflow: 'auto',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
            事業会社を追加
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-light)',
              fontSize: '20px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              コード <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="コードを入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              会社名 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="会社名を入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              略称
            </label>
            <input
              type="text"
              value={nameShort}
              onChange={(e) => setNameShort(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="略称を入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              区分 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="区分を入力（例: グループ会社、関連会社など）"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              組織 <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              <option value="">組織を選択してください</option>
              {orgOptions.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              主管カンパニー
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="主管カンパニーを入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              主管部門
            </label>
            <input
              type="text"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="主管部門を入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              主管部
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="主管部を入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              地域 <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              <option value="国内">国内</option>
              <option value="海外">海外</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              表示順序
            </label>
            <input
              type="number"
              value={position}
              onChange={(e) => setPosition(parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border-color)' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6B7280',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: saving ? '#9CA3AF' : '#10B981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {saving ? '追加中...' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 事業会社編集モーダルコンポーネント
function EditCompanyModal({
  company,
  orgTree,
  onClose,
  onSave,
  onDeleteClick,
}: {
  company: Company;
  orgTree: OrgNodeData | null;
  onClose: () => void;
  onSave: () => Promise<void>;
  onDeleteClick?: () => void;
}) {
  const [code, setCode] = useState(company.code);
  const [name, setName] = useState(company.name);
  const [nameShort, setNameShort] = useState(company.nameShort || '');
  const [category, setCategory] = useState(company.category);
  const [organizationId, setOrganizationId] = useState<string>(company.organizationId);
  const [companyValue, setCompanyValue] = useState(company.company || '');
  const [division, setDivision] = useState(company.division || '');
  const [department, setDepartment] = useState(company.department || '');
  const [region, setRegion] = useState(company.region);
  const [position, setPosition] = useState(company.position);
  const [saving, setSaving] = useState(false);

  // 組織ツリーから組織の選択肢を生成
  const orgOptions = orgTree ? getAllOrganizationsFromTree(orgTree) : [];

  const handleSave = async () => {
    if (!code.trim()) {
      await tauriAlert('コードは必須です');
      return;
    }
    if (!name.trim()) {
      await tauriAlert('会社名は必須です');
      return;
    }
    if (!category.trim()) {
      await tauriAlert('区分は必須です');
      return;
    }
    if (!organizationId) {
      await tauriAlert('組織は必須です');
      return;
    }
    if (!region.trim()) {
      await tauriAlert('地域は必須です');
      return;
    }
    
    setSaving(true);
    try {
      await updateCompany(
        company.id,
        code.trim(),
        name.trim(),
        nameShort.trim() || undefined,
        category.trim(),
        organizationId,
        companyValue.trim() || undefined,
        division.trim() || undefined,
        department.trim() || undefined,
        region.trim(),
        position
      );
      await onSave();
    } catch (error: any) {
      console.error('事業会社更新エラー:', error);
      await tauriAlert(`事業会社の更新に失敗しました: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
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
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '600px',
          width: '95%',
          maxHeight: '95vh',
          overflow: 'auto',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
            事業会社を編集
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-light)',
              fontSize: '20px',
            }}
          >
            ×
          </button>
        </div>

        {onDeleteClick && (
          <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#991B1B', marginBottom: '4px' }}>
                  危険な操作
                </div>
                <div style={{ fontSize: '12px', color: '#7F1D1D' }}>
                  事業会社を削除すると、このデータは完全に削除されます。
                </div>
              </div>
              <button
                onClick={onDeleteClick}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#EF4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                事業会社を削除
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              コード <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="コードを入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              会社名 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="会社名を入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              略称
            </label>
            <input
              type="text"
              value={nameShort}
              onChange={(e) => setNameShort(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="略称を入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              区分 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="区分を入力（例: グループ会社、関連会社など）"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              組織 <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              <option value="">組織を選択してください</option>
              {orgOptions.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              主管カンパニー
            </label>
            <input
              type="text"
              value={companyValue}
              onChange={(e) => setCompanyValue(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="主管カンパニーを入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              主管部門
            </label>
            <input
              type="text"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="主管部門を入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              主管部
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="主管部を入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              地域 <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              <option value="国内">国内</option>
              <option value="海外">海外</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              表示順序
            </label>
            <input
              type="number"
              value={position}
              onChange={(e) => setPosition(parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border-color)' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6B7280',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: saving ? '#9CA3AF' : '#10B981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 事業会社削除確認モーダルコンポーネント
function DeleteCompanyModal({
  company,
  onClose,
  onConfirm,
}: {
  company: Company;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } catch (error: any) {
      console.error('❌ [DeleteCompanyModal] 削除処理でエラーが発生しました:', error);
      // エラーが発生してもモーダルを閉じる
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
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
        zIndex: 3000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: '#991B1B' }}>
            事業会社を削除
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--color-text-light)', lineHeight: '1.6', marginBottom: '12px' }}>
            事業会社「<strong style={{ color: 'var(--color-text)' }}>{company.name}</strong>」を削除しますか？
          </p>
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#FEF2F2', 
            borderRadius: '6px', 
            border: '1px solid #FECACA',
            marginTop: '16px'
          }}>
            <p style={{ fontSize: '14px', color: '#7F1D1D', lineHeight: '1.6', margin: 0 }}>
              <strong>⚠️ 警告:</strong> この操作は取り消せません。
            </p>
            <p style={{ fontSize: '14px', color: '#7F1D1D', lineHeight: '1.6', marginTop: '8px', marginBottom: 0 }}>
              この事業会社のデータが完全に削除されます。
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6B7280',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: deleting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: deleting ? 0.5 : 1,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            style={{
              padding: '10px 20px',
              backgroundColor: '#EF4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: deleting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: deleting ? 0.5 : 1,
            }}
          >
            {deleting ? '削除中...' : '削除する'}
          </button>
        </div>
      </div>
    </div>
  );
}
