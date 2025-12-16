'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import dynamic from 'next/dynamic';
import type { OrgNodeData, MemberInfo } from '@/components/OrgChart';
import { getOrgTreeFromDb, getOrgMembers, exportOrganizationsAndMembersToCSV, importOrganizationMasterFromCSV, importMembersFromCSV, updateOrg, addOrgMember, updateOrgMember, deleteOrgMember, tauriAlert, tauriConfirm, createOrg, deleteOrg, checkDuplicateOrganizations, deleteDuplicateOrganizations } from '@/lib/orgApi';
import { callTauriCommand } from '@/lib/localFirebase';
import { sortMembersByPosition } from '@/lib/memberSort';
import { checkBpoMembersInDb } from '@/lib/check-bpo-members-db';
import { saveBpoMembersOnly } from '@/lib/save-bpo-members-only';
import { saveFrontierBusinessMembers } from '@/lib/save-frontier-business-members';
import { removeIctDivisionDuplicates } from '@/lib/remove-ict-division-duplicates';
import { saveIctDivisionMembers } from '@/lib/save-ict-division-members';
import { reorderFrontierBusiness } from '@/lib/reorder-frontier-business';
import { checkDepartmentOrder } from '@/lib/check-department-order';

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

// OrgChartを動的インポート（SSRを回避）
const OrgChart = dynamic(() => import('@/components/OrgChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      組織図を読み込み中...
    </div>
  ),
});

// OrgBubbleChartを動的インポート（SSRを回避）
const OrgBubbleChart = dynamic(() => import('@/components/OrgBubbleChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      バブルチャートを読み込み中...
    </div>
  ),
});

type ViewMode = 'hierarchy' | 'bubble';

// メンバー情報をMemberInfo形式に変換する共通関数
const mapMembersToMemberInfo = (members: any[]): (MemberInfo & { id?: string })[] => {
  return members.map((member: any): MemberInfo & { id?: string } => ({
    id: member.id,
    name: member.name,
    title: member.position || undefined,
    nameRomaji: member.nameRomaji || undefined,
    department: member.department || undefined,
    extension: member.extension || undefined,
    companyPhone: member.companyPhone || undefined,
    mobilePhone: member.mobilePhone || undefined,
    email: member.email || undefined,
    itochuEmail: member.itochuEmail || undefined,
    teams: member.teams || undefined,
    employeeType: member.employeeType || undefined,
    roleName: member.roleName || undefined,
    indicator: member.indicator || undefined,
    location: member.location || undefined,
    floorDoorNo: member.floorDoorNo || undefined,
    previousName: member.previousName || undefined,
  }));
};

// 組織ツリーから特定の組織を検索する共通関数
const findOrgInTree = (tree: OrgNodeData, targetId: string): OrgNodeData | null => {
  if (tree.id === targetId) return tree;
  if (tree.children) {
    for (const child of tree.children) {
      const found = findOrgInTree(child, targetId);
      if (found) return found;
    }
  }
  return null;
};

// 選択された組織の表示コンポーネント
function SelectedOrganizationPanel({
  selectedNode,
  expandedMembers,
  setExpandedMembers,
  onEditClick,
  onNavigateToDetail,
  containerStyle,
}: {
  selectedNode: OrgNodeData;
  expandedMembers: Set<number>;
  setExpandedMembers: React.Dispatch<React.SetStateAction<Set<number>>>;
  onEditClick: () => void;
  onNavigateToDetail: () => void;
  containerStyle?: React.CSSProperties;
}) {
  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>選択された組織</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {selectedNode.id && (
            <>
              <button
                onClick={onEditClick}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3B82F6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }}
              >
                ✏️ 編集
              </button>
              <button
                onClick={onNavigateToDetail}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
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
            </>
          )}
        </div>
      </div>
      <div style={{ marginBottom: '15px' }}>
        <p><strong>組織名:</strong> {selectedNode.name}</p>
        <p><strong>英語名:</strong> {selectedNode.title}</p>
        {selectedNode.description && (
          <p><strong>説明:</strong> {selectedNode.description}</p>
        )}
      </div>
      {selectedNode.members && selectedNode.members.length > 0 && (
        <div>
          <h4 style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
            所属メンバー ({selectedNode.members.length}名)
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '12px',
            }}
          >
            {sortMembersByPosition(selectedNode.members, selectedNode.name).map((member, index) => {
              // 役職があるメンバーかどうかでスタイルを変更
              const hasPosition = member.title && member.title.trim() !== '';
              const isExpanded = expandedMembers.has(index);
              const hasDetails = member.extension || member.companyPhone || member.mobilePhone || 
                                member.itochuEmail || member.teams || member.employeeType || 
                                member.roleName || member.indicator || member.location || 
                                member.floorDoorNo || member.previousName || member.department;
              
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
                  cursor: hasDetails ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => {
                  if (hasDetails) {
                    setExpandedMembers(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(index)) {
                        newSet.delete(index);
                      } else {
                        newSet.add(index);
                      }
                      return newSet;
                    });
                  }
                }}
                onMouseEnter={(e) => {
                  if (hasDetails) {
                    e.currentTarget.style.backgroundColor = hasPosition ? '#F3F4F6' : '#F9FAFB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasDetails) {
                    e.currentTarget.style.backgroundColor = hasPosition ? '#F9FAFB' : '#ffffff';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '4px' }}>
                      <strong style={{ fontSize: '15px', color: '#1F2937' }}>{member.name}</strong>
                    </div>
                    {member.title && (
                      <div style={{ color: '#374151', fontWeight: '500', fontSize: '13px' }}>
                        {member.title}
                      </div>
                    )}
                  </div>
                  {hasDetails && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6B7280',
                      marginLeft: '8px',
                      transition: 'transform 0.2s ease',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}>
                      ▼
                    </div>
                  )}
                </div>
                
                {isExpanded && hasDetails && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                    {member.department && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        <strong>部署:</strong> {member.department}
                      </div>
                    )}
                    {member.extension && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        <strong>内線:</strong> {member.extension}
                      </div>
                    )}
                    {member.companyPhone && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        <strong>会社:</strong> {member.companyPhone}
                      </div>
                    )}
                    {member.mobilePhone && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        <strong>携帯:</strong> {member.mobilePhone}
                      </div>
                    )}
                    {member.itochuEmail && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        <strong>伊藤忠メール:</strong>{' '}
                        <a href={`mailto:${member.itochuEmail}`} style={{ color: '#2563EB', textDecoration: 'none' }}>
                          {member.itochuEmail}
                        </a>
                      </div>
                    )}
                    {member.teams && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        <strong>コラボレーション:</strong> {member.teams}
                      </div>
                    )}
                    {member.employeeType && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        <strong>社員区分:</strong> {member.employeeType}
                      </div>
                    )}
                    {member.roleName && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        <strong>役割名:</strong> {member.roleName}
                      </div>
                    )}
                    {member.location && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        <strong>勤務地:</strong> {member.location}
                      </div>
                    )}
                    {member.floorDoorNo && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        <strong>フロア／ドアNo.:</strong> {member.floorDoorNo}
                      </div>
                    )}
                    {member.previousName && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        <strong>旧姓:</strong> {member.previousName}
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrganizationPage() {
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<OrgNodeData | null>(null);
  const [orgData, setOrgData] = useState<OrgNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('bubble');
  const [expandedMembers, setExpandedMembers] = useState<Set<number>>(new Set());
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isImportingCSV, setIsImportingCSV] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNodeMembers, setSelectedNodeMembers] = useState<(MemberInfo & { id?: string })[]>([]);
  const [showAddOrgModal, setShowAddOrgModal] = useState(false);
  const [showDeleteOrgModal, setShowDeleteOrgModal] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<OrgNodeData | null>(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isDeletingDuplicates, setIsDeletingDuplicates] = useState(false);
  const [showDeleteDuplicatesModal, setShowDeleteDuplicatesModal] = useState(false);
  
  // フィルター関連のstate
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all'); // 'all', '部門', '部', '課', 'チーム'
  const [minMembers, setMinMembers] = useState<number>(0);
  const [selectedRootOrgId, setSelectedRootOrgId] = useState<string | null>(null); // 選択されたルート組織のID
  const [isFilterExpanded, setIsFilterExpanded] = useState(false); // フィルターUIの展開状態

  // ルート組織のリストを取得する関数
  const getRootOrganizations = (): OrgNodeData[] => {
    if (!orgData) return [];
    
    // virtual-rootの場合は、その子ノード（実際のルート組織）を返す
    if (orgData.id === 'virtual-root' && orgData.children) {
      return orgData.children;
    }
    
    // 単一のルート組織の場合
    return [orgData];
  };

  // 選択されたルート組織の傘下のみを取得する関数
  const getSelectedRootOrgTree = (): OrgNodeData | null => {
    if (!orgData) return null;
    
    // ルート組織が選択されていない場合は、全体を返す
    if (!selectedRootOrgId) {
      return orgData;
    }
    
    // virtual-rootの場合は、子ノードから選択された組織を探す
    if (orgData.id === 'virtual-root' && orgData.children) {
      const selectedOrg = orgData.children.find(child => child.id === selectedRootOrgId);
      return selectedOrg || null;
    }
    
    // 単一のルート組織で、選択されたIDと一致する場合
    if (orgData.id === selectedRootOrgId) {
      return orgData;
    }
    
    return null;
  };

  // 組織ツリーをフィルターする関数
  const filterOrgTree = (node: OrgNodeData | null): OrgNodeData | null => {
    if (!node) return null;

    // 検索クエリでフィルター
    const matchesSearch = !searchQuery || 
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // レベルでフィルター
    const matchesLevel = levelFilter === 'all' || 
      node.levelName === levelFilter;

    // メンバー数でフィルター
    const memberCount = node.members?.length || 0;
    const matchesMembers = memberCount >= minMembers;

    // 現在のノードが条件を満たすか
    const nodeMatches = matchesSearch && matchesLevel && matchesMembers;

    // 子ノードを再帰的にフィルター
    const filteredChildren = node.children
      ?.map(child => filterOrgTree(child))
      .filter((child): child is OrgNodeData => child !== null) || [];

    // 現在のノードが条件を満たす、または子ノードが条件を満たす場合に表示
    if (nodeMatches || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      };
    }

    return null;
  };

  // 選択されたルート組織の傘下を取得し、フィルターを適用
  const selectedRootOrgTree = getSelectedRootOrgTree();
  const filteredOrgData = filterOrgTree(selectedRootOrgTree);

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
          if (isDev) {
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
      (window as any).checkBpoMembersInDb = checkBpoMembersInDb;
      (window as any).saveBpoMembersOnly = saveBpoMembersOnly;
      (window as any).saveFrontierBusinessMembers = saveFrontierBusinessMembers;
      (window as any).removeIctDivisionDuplicates = removeIctDivisionDuplicates;
      (window as any).saveIctDivisionMembers = saveIctDivisionMembers;
      (window as any).reorderFrontierBusiness = reorderFrontierBusiness;
      (window as any).checkDepartmentOrder = checkDepartmentOrder;
    }
  }, []);

  // CSVインポート処理
  const handleCSVImport = async () => {
    // ファイル選択用のinput要素を作成
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.style.display = 'none';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        return;
      }

      setIsImportingCSV(true);
      try {
        // ファイルを読み込む
        const fileContent = await file.text();
        
        // アプリデータディレクトリのパスを取得
        const appDataPath = await callTauriCommand('get_path', {}) as string;
        const tempPath = `${appDataPath}/temp_${Date.now()}_${file.name}`;
        
        // Tauriコマンドでファイルを書き込み
        const writeResult = await callTauriCommand('write_file', {
          filePath: tempPath,
          data: fileContent,
        });
        
        if (!writeResult.success) {
          throw new Error(writeResult.error || 'ファイルの保存に失敗しました');
        }

        // CSVファイルの内容を確認して、組織マスターかメンバーかを判定
        const isMemberCSV = fileContent.includes('=== メンバーデータ ===');
        
        let count: number;
        if (isMemberCSV) {
          // メンバーCSVインポート
          count = await importMembersFromCSV(tempPath);
          await tauriAlert(`メンバーデータのインポートが完了しました。\n${count}件のレコードをインポートしました。`);
        } else {
          // 組織マスターCSVインポート
          count = await importOrganizationMasterFromCSV(tempPath);
          await tauriAlert(`組織マスターデータのインポートが完了しました。\n${count}件のレコードをインポートしました。`);
          
          // 組織データを再読み込み（組織マスターの場合のみ）
          const data = await getOrgTreeFromDb();
          if (data) {
            setOrgData(data);
            devLog('✅ 組織データを再読み込みしました');
          }
        }
      } catch (error: any) {
        console.error('CSVインポートエラー:', error);
        await tauriAlert(`CSVインポートに失敗しました: ${error.message}`);
      } finally {
        setIsImportingCSV(false);
        document.body.removeChild(input);
      }
    };
    
    document.body.appendChild(input);
    input.click();
  };

  const handleNodeClick = async (node: OrgNodeData, event: MouseEvent) => {
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
          members: sortedMembers.map(m => {
            // idプロパティが存在する場合は削除
            if ('id' in m) {
              const { id, ...memberWithoutId } = m as any;
            return memberWithoutId;
            }
            return m;
          }),
        };
        
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
  };

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
            <h2 style={{ marginBottom: 0 }}>組織</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
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
                    await exportOrganizationsAndMembersToCSV();
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
              <button
                onClick={handleCSVImport}
                disabled={isImportingCSV}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isImportingCSV ? '#9CA3AF' : '#3B82F6',
                  color: '#ffffff',
                  cursor: isImportingCSV ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                  opacity: isImportingCSV ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  if (!isImportingCSV) {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isImportingCSV) {
                    e.currentTarget.style.backgroundColor = '#3B82F6';
                  }
                }}
              >
                {isImportingCSV ? 'インポート中...' : '📤 CSVインポート'}
              </button>
              <button
                onClick={() => setShowAddOrgModal(true)}
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
                + 組織を追加
              </button>
              {process.env.NODE_ENV === 'development' && (
                <>
                  <button
                    onClick={async () => {
                      if (isCheckingDuplicates) return;
                      setIsCheckingDuplicates(true);
                      try {
                        const duplicates = await checkDuplicateOrganizations();
                        if (duplicates.length === 0) {
                          await tauriAlert('重複している組織は見つかりませんでした。');
                        } else {
                          const message = `重複している組織が ${duplicates.length} 件見つかりました。\n\n` +
                            duplicates.map(dup => 
                              `・${dup.name}: ${dup.count}件\n` +
                              dup.organizations.map((org: any) => 
                                `  - ID: ${org.id}, メンバー: ${org.member_count}名, 子組織: ${org.child_count}個`
                              ).join('\n')
                            ).join('\n\n') +
                            '\n\n削除する場合は「重複組織を削除」ボタンをクリックしてください。';
                          await tauriAlert(message);
                        }
                      } catch (error: any) {
                        console.error('重複組織の確認エラー:', error);
                        await tauriAlert(`重複組織の確認に失敗しました: ${error.message}`);
                      } finally {
                        setIsCheckingDuplicates(false);
                      }
                    }}
                    disabled={isCheckingDuplicates}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isCheckingDuplicates ? '#9CA3AF' : '#F59E0B',
                      color: '#ffffff',
                      cursor: isCheckingDuplicates ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: isCheckingDuplicates ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isCheckingDuplicates) {
                        e.currentTarget.style.backgroundColor = '#D97706';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCheckingDuplicates) {
                        e.currentTarget.style.backgroundColor = '#F59E0B';
                      }
                    }}
                  >
                    {isCheckingDuplicates ? '確認中...' : '🔍 重複組織を確認'}
                  </button>
                  <button
                    onClick={() => setShowDeleteDuplicatesModal(true)}
                    disabled={isDeletingDuplicates}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isDeletingDuplicates ? '#9CA3AF' : '#EF4444',
                      color: '#ffffff',
                      cursor: isDeletingDuplicates ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: isDeletingDuplicates ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isDeletingDuplicates) {
                        e.currentTarget.style.backgroundColor = '#DC2626';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDeletingDuplicates) {
                        e.currentTarget.style.backgroundColor = '#EF4444';
                      }
                    }}
                  >
                    {isDeletingDuplicates ? '削除中...' : '🗑️ 重複組織を削除'}
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* ルート組織選択ボタンとフィルターボタン */}
          {orgData && (orgData.id === 'virtual-root' || getRootOrganizations().length > 1) && (
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
                    表示する組織を選択:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setSelectedRootOrgId(null)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #BAE6FD',
                        backgroundColor: selectedRootOrgId === null ? '#0EA5E9' : '#fff',
                        color: selectedRootOrgId === null ? '#fff' : '#0369A1',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedRootOrgId !== null) {
                          e.currentTarget.style.backgroundColor = '#E0F2FE';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedRootOrgId !== null) {
                          e.currentTarget.style.backgroundColor = '#fff';
                        }
                      }}
                    >
                      すべて表示
                    </button>
                    {getRootOrganizations().map((rootOrg) => (
                      <button
                        key={rootOrg.id}
                        onClick={() => setSelectedRootOrgId(rootOrg.id || null)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #BAE6FD',
                          backgroundColor: selectedRootOrgId === rootOrg.id ? '#0EA5E9' : '#fff',
                          color: selectedRootOrgId === rootOrg.id ? '#fff' : '#0369A1',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedRootOrgId !== rootOrg.id) {
                            e.currentTarget.style.backgroundColor = '#E0F2FE';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedRootOrgId !== rootOrg.id) {
                            e.currentTarget.style.backgroundColor = '#fff';
                          }
                        }}
                      >
                        {rootOrg.name}
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
                    {(searchQuery || levelFilter !== 'all' || minMembers > 0) && (
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
                  {(searchQuery || levelFilter !== 'all' || minMembers > 0) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setLevelFilter('all');
                        setMinMembers(0);
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
          
          {/* ルート組織が1つの場合、またはデータがない場合でもフィルターボタンを表示 */}
          {(!orgData || !(orgData.id === 'virtual-root' || getRootOrganizations().length > 1)) && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: '#F0F9FF', 
              borderRadius: '8px',
              border: '1px solid #BAE6FD',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  {(searchQuery || levelFilter !== 'all' || minMembers > 0) && (
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
                {(searchQuery || levelFilter !== 'all' || minMembers > 0) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setLevelFilter('all');
                      setMinMembers(0);
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
          )}
          
          {/* フィルターUI（展開時） */}
          {isFilterExpanded ? (
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
                  組織名で検索
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="組織名、英語名、説明で検索..."
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

              {/* レベルフィルター */}
              <div style={{ minWidth: '150px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '6px' 
                }}>
                  レベル
                </label>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
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
                  <option value="部門">部門</option>
                  <option value="部">部</option>
                  <option value="課">課</option>
                  <option value="チーム">チーム</option>
                </select>
              </div>

              {/* メンバー数フィルター */}
              <div style={{ minWidth: '150px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '6px' 
                }}>
                  最小メンバー数
                </label>
                <input
                  type="number"
                  value={minMembers}
                  onChange={(e) => setMinMembers(parseInt(e.target.value) || 0)}
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
              {(searchQuery || levelFilter !== 'all' || minMembers > 0 || selectedRootOrgId) && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '8px 12px', 
                  backgroundColor: '#EFF6FF', 
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#1E40AF',
                }}>
                  {orgData && filteredOrgData ? (
                    <>
                      フィルター適用中: 
                      {selectedRootOrgId && (
                        <> 組織: {getRootOrganizations().find(org => org.id === selectedRootOrgId)?.name || ''}</>
                      )}
                      {searchQuery && ` 検索: 「${searchQuery}」`}
                      {levelFilter !== 'all' && ` レベル: ${levelFilter}`}
                      {minMembers > 0 && ` メンバー数: ${minMembers}名以上`}
                    </>
                  ) : orgData ? (
                    <>条件に一致する組織が見つかりませんでした</>
                  ) : (
                    <>組織データがありません</>
                  )}
                </div>
              )}
            </div>
          ) : null}
          
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
      }}>
        <div style={{ 
          background: 'var(--color-surface)',
          borderRadius: '6px',
          padding: '0',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          marginBottom: '0',
          border: 'none',
          overflow: 'hidden',
          flex: viewMode === 'bubble' && selectedNode ? '0 0 60%' : '1',
          display: 'flex',
          flexDirection: 'column',
          transition: 'flex 0.3s ease',
          height: '100%',
        }}>
          {!orgData ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '40px',
              textAlign: 'center',
              color: '#6B7280',
            }}>
              <div>
                <p style={{ fontSize: '16px', marginBottom: '8px', color: '#374151' }}>
                  {error || '組織データが見つかりませんでした。'}
                </p>
                <p style={{ fontSize: '14px', color: '#6B7280' }}>
                  組織を追加するには、右上の「+ 組織を追加」ボタンをクリックしてください。
                </p>
              </div>
            </div>
          ) : (filteredOrgData || orgData) ? (
            viewMode === 'hierarchy' ? (
              <OrgChart
                data={filteredOrgData || orgData!}
                onNodeClick={handleNodeClick}
              />
            ) : (
              <OrgBubbleChart
                data={filteredOrgData || orgData!}
                onNodeClick={handleNodeClick}
                width={1200}
                height={800}
              />
            )
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '40px',
              textAlign: 'center',
              color: '#6B7280',
            }}>
              <div>
                <p style={{ fontSize: '16px', marginBottom: '8px', color: '#374151' }}>
                  組織データがフィルター条件に一致しませんでした。
                </p>
                <p style={{ fontSize: '14px', color: '#6B7280' }}>
                  フィルター条件を変更してください。
                </p>
              </div>
            </div>
          )}
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
            <SelectedOrganizationPanel
              selectedNode={selectedNode}
              expandedMembers={expandedMembers}
              setExpandedMembers={setExpandedMembers}
              onEditClick={() => setShowEditModal(true)}
              onNavigateToDetail={() => {
                if (selectedNode?.id) {
                  devLog('🔗 [組織一覧] 組織詳細ページに遷移:', { 
                    organizationId: selectedNode.id, 
                    organizationName: selectedNode.name 
                  });
                  router.push(`/organization/detail?id=${selectedNode.id}`);
                } else {
                  devWarn('⚠️ [組織一覧] 組織IDが存在しないため、詳細ページに遷移できません');
                }
              }}
            />
          </div>
        )}
      </div>

      {viewMode === 'hierarchy' && selectedNode && (
        <div className="card" style={{ marginTop: '20px', padding: '20px' }}>
          <SelectedOrganizationPanel
            selectedNode={selectedNode}
            expandedMembers={expandedMembers}
            setExpandedMembers={setExpandedMembers}
            onEditClick={() => setShowEditModal(true)}
            onNavigateToDetail={() => {
              if (selectedNode?.id) {
                devLog('🔗 [組織一覧] 組織詳細ページに遷移:', { 
                  organizationId: selectedNode.id, 
                  organizationName: selectedNode.name 
                });
                router.push(`/organization/detail?id=${selectedNode.id}`);
              } else {
                devWarn('⚠️ [組織一覧] 組織IDが存在しないため、詳細ページに遷移できません');
              }
            }}
          />
        </div>
      )}

      {/* 組織追加モーダル */}
      {showAddOrgModal && (
        <AddOrganizationModal
          orgTree={orgData}
          onClose={() => setShowAddOrgModal(false)}
          onSave={async () => {
            // 組織ツリーを再取得
            const tree = await getOrgTreeFromDb();
            if (tree) {
              setOrgData(tree);
              // 選択されたノードが存在する場合、そのノードも更新
              if (selectedNode?.id) {
                const foundOrg = findOrgInTree(tree, selectedNode.id);
                if (foundOrg) {
                  if (foundOrg.id) {
                    try {
                      const members = await getOrgMembers(foundOrg.id);
                      const memberInfos = mapMembersToMemberInfo(members);
                      const sortedMembers = sortMembersByPosition(memberInfos, foundOrg.name);
                      setSelectedNodeMembers(sortedMembers);
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
                    } catch (error: any) {
                      console.error('メンバー取得エラー:', error);
                      setSelectedNode(foundOrg);
                    }
                  } else {
                    setSelectedNode(foundOrg);
                  }
                }
              }
            }
            await tauriAlert('組織を追加しました');
            setShowAddOrgModal(false);
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

      {/* 重複組織削除確認モーダル */}
      {showDeleteDuplicatesModal && (
        <DeleteDuplicatesModal
          onClose={() => setShowDeleteDuplicatesModal(false)}
          onConfirm={async () => {
            setIsDeletingDuplicates(true);
            try {
              const deletedIds = await deleteDuplicateOrganizations();
              if (deletedIds.length === 0) {
                await tauriAlert('削除された組織はありませんでした。');
              } else {
                // 組織ツリーを再取得
                const tree = await getOrgTreeFromDb();
                if (tree) {
                  setOrgData(tree);
                  setSelectedNode(null);
                  setSelectedNodeMembers([]);
                }
                await tauriAlert(`重複組織を ${deletedIds.length} 件削除しました。\n\n削除された組織ID:\n${deletedIds.join('\n')}`);
              }
              setShowDeleteDuplicatesModal(false);
            } catch (error: any) {
              console.error('重複組織の削除エラー:', error);
              await tauriAlert(`重複組織の削除に失敗しました: ${error.message}`);
            } finally {
              setIsDeletingDuplicates(false);
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

// 組織・メンバー編集モーダルコンポーネント
function OrganizationEditModal({
  organization,
  members,
  onClose,
  onSave,
  onDeleteClick,
}: {
  organization: OrgNodeData | null;
  members: (MemberInfo & { id?: string })[];
  onClose: () => void;
  onSave: (updatedOrg: Partial<OrgNodeData> | null, updatedMembers: (MemberInfo & { id?: string })[] | null) => Promise<void>;
  onDeleteClick?: () => void;
}) {
  const [editingOrg, setEditingOrg] = useState<Partial<OrgNodeData>>({
    name: organization?.name || '',
    title: organization?.title || '',
    description: organization?.description || '',
    position: organization?.position || 0,
  });
  const [editingMembers, setEditingMembers] = useState<(MemberInfo & { id?: string })[]>(members.map(m => ({ ...m })));
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMember, setNewMember] = useState<MemberInfo>({
    name: '',
    title: '',
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'organization' | 'members'>('organization');

  const handleSave = async () => {
    if (saving) return;
    if (!editingOrg.name?.trim()) {
      await tauriAlert('組織名は必須です');
      return;
    }
    setSaving(true);
    try {
      // 組織情報を更新
      if (organization?.id) {
        await updateOrg(
          organization.id,
          editingOrg.name,
          editingOrg.title,
          editingOrg.description,
          editingOrg.position
        );
      }

      // メンバー情報を更新
      const organizationId = organization?.id;
      if (organizationId) {
        // 元のメンバーIDのセット
        const originalMemberIds = new Set(members.filter(m => m.id).map(m => m.id!));
        // 現在のメンバーIDのセット
        const currentMemberIds = new Set(editingMembers.filter(m => m.id).map(m => m.id!));
        
        // 削除されたメンバーを特定
        const deletedMemberIds = Array.from(originalMemberIds).filter(id => !currentMemberIds.has(id));
        
        // 削除されたメンバーをDBから削除
        for (const deletedId of deletedMemberIds) {
          try {
            await deleteOrgMember(deletedId);
          } catch (error: any) {
            console.error('メンバー削除エラー:', error);
            // 削除エラーは続行（他のメンバーの更新は続ける）
          }
        }

        // 既存メンバーを更新、新規メンバーを追加
        for (const member of editingMembers) {
          if (member.id) {
            // 既存メンバーの更新
            try {
              await updateOrgMember(member.id, {
                name: member.name,
                title: member.title,
                nameRomaji: member.nameRomaji,
                department: member.department,
                extension: member.extension,
                companyPhone: member.companyPhone,
                mobilePhone: member.mobilePhone,
                email: member.email,
                itochuEmail: member.itochuEmail,
                teams: member.teams,
                employeeType: member.employeeType,
                roleName: member.roleName,
                indicator: member.indicator,
                location: member.location,
                floorDoorNo: member.floorDoorNo,
                previousName: member.previousName,
              });
            } catch (error: any) {
              console.error('メンバー更新エラー:', error);
              // 更新エラーは続行
            }
          } else {
            // 新規メンバーの追加
            try {
              await addOrgMember(organizationId, {
                name: member.name,
                title: member.title,
                nameRomaji: member.nameRomaji,
                department: member.department,
                extension: member.extension,
                companyPhone: member.companyPhone,
                mobilePhone: member.mobilePhone,
                email: member.email,
                itochuEmail: member.itochuEmail,
                teams: member.teams,
                employeeType: member.employeeType,
                roleName: member.roleName,
                indicator: member.indicator,
                location: member.location,
                floorDoorNo: member.floorDoorNo,
                previousName: member.previousName,
              });
            } catch (error: any) {
              console.error('メンバー追加エラー:', error);
              // 追加エラーは続行
            }
          }
        }
      }

      await onSave(editingOrg, editingMembers);
    } catch (error: any) {
      console.error('保存エラー:', error);
      await tauriAlert(`保存に失敗しました: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.name.trim()) {
      await tauriAlert('名前は必須です');
      return;
    }
    setEditingMembers([...editingMembers, { ...newMember }]);
    setNewMember({ name: '', title: '' });
    setShowAddMemberForm(false);
  };

  const handleUpdateMember = (index: number, updatedMember: MemberInfo & { id?: string }) => {
    const updated = [...editingMembers];
    // IDを保持
    updated[index] = { ...updatedMember, id: editingMembers[index]?.id };
    setEditingMembers(updated);
    setEditingMemberIndex(null);
  };

  const handleDeleteMember = async (index: number) => {
    const member = editingMembers[index];
    if (!member) return;

    const confirmed = await tauriConfirm(`メンバー「${member.name}」を削除しますか？`);
    if (!confirmed) return;

    // editingMembersから削除（実際のDB削除は保存時に実行）
    const updated = editingMembers.filter((_, i) => i !== index);
    setEditingMembers(updated);
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
          maxWidth: '1400px',
          width: '95%',
          maxHeight: '95vh',
          overflow: 'auto',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
            組織・メンバーを編集
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

        {/* タブ */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border-color)', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('organization')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'organization' ? 'var(--color-primary)' : 'var(--color-text-light)',
              borderBottom: activeTab === 'organization' ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'organization' ? '600' : '400',
            }}
          >
            組織情報
          </button>
          <button
            onClick={() => setActiveTab('members')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'members' ? 'var(--color-primary)' : 'var(--color-text-light)',
              borderBottom: activeTab === 'members' ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'members' ? '600' : '400',
            }}
          >
            メンバー ({editingMembers.length}名)
          </button>
        </div>

        {/* 組織情報タブ */}
        {activeTab === 'organization' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {organization?.id && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#991B1B', marginBottom: '4px' }}>
                      危険な操作
                    </div>
                    <div style={{ fontSize: '12px', color: '#7F1D1D' }}>
                      組織を削除すると、子組織とメンバーもすべて削除されます。
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (organization && onDeleteClick) {
                        // 仮想的なルートノードは削除できない
                        if (organization.id === 'virtual-root') {
                          await tauriAlert('仮想的なルートノードは削除できません。実際の組織を選択してください。');
                          return;
                        }
                        onDeleteClick();
                      }
                    }}
                    disabled={organization?.id === 'virtual-root'}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: organization?.id === 'virtual-root' ? '#9CA3AF' : '#EF4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: organization?.id === 'virtual-root' ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: organization?.id === 'virtual-root' ? 0.5 : 1,
                    }}
                  >
                    組織を削除
                  </button>
                </div>
              </div>
            )}
            {organization?.id && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
                  組織ID
                </label>
                <input
                  type="text"
                  value={organization.id}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#F3F4F6',
                    color: '#6B7280',
                    cursor: 'not-allowed',
                    fontFamily: 'monospace',
                  }}
                />
                <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '4px' }}>
                  このIDは変更できません。重複組織の確認に使用します。
                </div>
              </div>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
                組織名 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                value={editingOrg.name || ''}
                onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                placeholder="組織名を入力"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
                英語名
              </label>
              <input
                type="text"
                value={editingOrg.title || ''}
                onChange={(e) => setEditingOrg({ ...editingOrg, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                placeholder="英語名を入力"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
                説明
              </label>
              <textarea
                value={editingOrg.description || ''}
                onChange={(e) => setEditingOrg({ ...editingOrg, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minHeight: '100px',
                  resize: 'vertical',
                }}
                placeholder="説明を入力"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
                表示順序
              </label>
              <input
                type="number"
                value={editingOrg.position || 0}
                onChange={(e) => setEditingOrg({ ...editingOrg, position: parseInt(e.target.value) || 0 })}
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
        )}

        {/* メンバータブ */}
        {activeTab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>メンバー一覧</h3>
              <button
                onClick={() => setShowAddMemberForm(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10B981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                + メンバーを追加
              </button>
            </div>

            {/* メンバー追加フォーム */}
            {showAddMemberForm && (
              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>新しいメンバーを追加</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                      名前 <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--color-border-color)',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                      placeholder="名前を入力"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                      役職
                    </label>
                    <input
                      type="text"
                      value={newMember.title || ''}
                      onChange={(e) => setNewMember({ ...newMember, title: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--color-border-color)',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                      placeholder="役職を入力"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowAddMemberForm(false);
                        setNewMember({ name: '', title: '' });
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#6B7280',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleAddMember}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#10B981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      追加
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* メンバー一覧 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
              {editingMembers.map((member, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '8px',
                  }}
                >
                  {editingMemberIndex === index ? (
                    <MemberEditForm
                      member={member}
                      onSave={(updated) => handleUpdateMember(index, updated)}
                      onCancel={() => setEditingMemberIndex(null)}
                      onDelete={() => handleDeleteMember(index)}
                    />
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                          {member.name}
                        </div>
                        {member.title && (
                          <div style={{ fontSize: '14px', color: 'var(--color-text-light)' }}>
                            {member.title}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setEditingMemberIndex(index)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#3B82F6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                          }}
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteMember(index)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#EF4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                          }}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {editingMembers.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-light)' }}>
                  メンバーが登録されていません
                </div>
              )}
            </div>
          </div>
        )}

        {/* フッター */}
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

// メンバー編集フォームコンポーネント
function MemberEditForm({
  member,
  onSave,
  onCancel,
  onDelete,
}: {
  member: MemberInfo & { id?: string };
  onSave: (updated: MemberInfo & { id?: string }) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [editedMember, setEditedMember] = useState<MemberInfo & { id?: string }>({ ...member });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          名前 <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="text"
          value={editedMember.name}
          onChange={(e) => setEditedMember({ ...editedMember, name: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          役職
        </label>
        <input
          type="text"
          value={editedMember.title || ''}
          onChange={(e) => setEditedMember({ ...editedMember, title: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          名前（ローマ字）
        </label>
        <input
          type="text"
          value={editedMember.nameRomaji || ''}
          onChange={(e) => setEditedMember({ ...editedMember, nameRomaji: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          部署
        </label>
        <input
          type="text"
          value={editedMember.department || ''}
          onChange={(e) => setEditedMember({ ...editedMember, department: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          内線番号
        </label>
        <input
          type="text"
          value={editedMember.extension || ''}
          onChange={(e) => setEditedMember({ ...editedMember, extension: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          会社電話番号
        </label>
        <input
          type="text"
          value={editedMember.companyPhone || ''}
          onChange={(e) => setEditedMember({ ...editedMember, companyPhone: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          携帯電話番号
        </label>
        <input
          type="text"
          value={editedMember.mobilePhone || ''}
          onChange={(e) => setEditedMember({ ...editedMember, mobilePhone: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          メールアドレス
        </label>
        <input
          type="email"
          value={editedMember.email || ''}
          onChange={(e) => setEditedMember({ ...editedMember, email: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          伊藤忠メールアドレス
        </label>
        <input
          type="email"
          value={editedMember.itochuEmail || ''}
          onChange={(e) => setEditedMember({ ...editedMember, itochuEmail: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          Teams情報
        </label>
        <input
          type="text"
          value={editedMember.teams || ''}
          onChange={(e) => setEditedMember({ ...editedMember, teams: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          従業員タイプ
        </label>
        <input
          type="text"
          value={editedMember.employeeType || ''}
          onChange={(e) => setEditedMember({ ...editedMember, employeeType: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          役割名
        </label>
        <input
          type="text"
          value={editedMember.roleName || ''}
          onChange={(e) => setEditedMember({ ...editedMember, roleName: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          インジケーター
        </label>
        <input
          type="text"
          value={editedMember.indicator || ''}
          onChange={(e) => setEditedMember({ ...editedMember, indicator: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          所在地
        </label>
        <input
          type="text"
          value={editedMember.location || ''}
          onChange={(e) => setEditedMember({ ...editedMember, location: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          階・ドア番号
        </label>
        <input
          type="text"
          value={editedMember.floorDoorNo || ''}
          onChange={(e) => setEditedMember({ ...editedMember, floorDoorNo: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          以前の名前
        </label>
        <input
          type="text"
          value={editedMember.previousName || ''}
          onChange={(e) => setEditedMember({ ...editedMember, previousName: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6B7280',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          キャンセル
        </button>
        <button
          onClick={onDelete}
          style={{
            padding: '8px 16px',
            backgroundColor: '#EF4444',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          削除
        </button>
        <button
          onClick={async () => {
            if (!editedMember.name.trim()) {
              await tauriAlert('名前は必須です');
              return;
            }
            onSave(editedMember);
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10B981',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
}

// 組織追加モーダルコンポーネント
function AddOrganizationModal({
  orgTree,
  onClose,
  onSave,
}: {
  orgTree: OrgNodeData | null;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const [parentId, setParentId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState(1);
  const [levelName, setLevelName] = useState('課');
  const [position, setPosition] = useState(0);
  const [saving, setSaving] = useState(false);

  // 組織ツリーから親組織の選択肢を生成
  const getOrgOptions = (node: OrgNodeData | null, depth: number = 0): Array<{ id: string | null; name: string; level: number }> => {
    if (!node) return [];
    const options: Array<{ id: string | null; name: string; level: number }> = [];
    if (node.id) {
      options.push({ id: node.id, name: '  '.repeat(depth) + node.name, level: node.level || 0 });
    }
    if (node.children) {
      for (const child of node.children) {
        options.push(...getOrgOptions(child, depth + 1));
      }
    }
    return options;
  };

  const orgOptions = orgTree ? [{ id: null, name: '（ルート）', level: -1 }, ...getOrgOptions(orgTree)] : [{ id: null, name: '（ルート）', level: -1 }];

  const handleLevelChange = (newLevel: number) => {
    setLevel(newLevel);
    // レベルに応じてレベル名を自動設定
    switch (newLevel) {
      case 0:
        setLevelName('部門');
        break;
      case 1:
        setLevelName('課');
        break;
      case 2:
        setLevelName('チーム');
        break;
      default:
        setLevelName('組織');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      await tauriAlert('組織名は必須です');
      return;
    }
    setSaving(true);
    try {
      await createOrg(
        parentId,
        name.trim(),
        title.trim() || null,
        description.trim() || null,
        level,
        levelName,
        position
      );
      await onSave();
    } catch (error: any) {
      console.error('組織追加エラー:', error);
      await tauriAlert(`組織の追加に失敗しました: ${error.message}`);
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
            組織を追加
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
              親組織
            </label>
            <select
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value || null)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              {orgOptions.map((opt) => (
                <option key={opt.id || 'root'} value={opt.id || ''}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              組織名 <span style={{ color: 'red' }}>*</span>
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
              placeholder="組織名を入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              英語名
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="英語名を入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                minHeight: '100px',
                resize: 'vertical',
              }}
              placeholder="説明を入力"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              階層レベル
            </label>
            <select
              value={level}
              onChange={(e) => handleLevelChange(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              <option value={0}>0 - 部門</option>
              <option value={1}>1 - 課</option>
              <option value={2}>2 - チーム</option>
              <option value={3}>3 - その他</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              レベル名
            </label>
            <input
              type="text"
              value={levelName}
              onChange={(e) => setLevelName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="レベル名を入力（例: 部門、課、チーム）"
            />
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

// 組織削除確認モーダルコンポーネント
function DeleteOrganizationModal({
  organization,
  onClose,
  onConfirm,
}: {
  organization: OrgNodeData;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } catch (error: any) {
      console.error('❌ [DeleteOrganizationModal] 削除処理でエラーが発生しました:', error);
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
            組織を削除
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--color-text-light)', lineHeight: '1.6', marginBottom: '12px' }}>
            組織「<strong style={{ color: 'var(--color-text)' }}>{organization.name}</strong>」を削除しますか？
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
              以下のデータがすべて削除されます：
            </p>
            <ul style={{ fontSize: '14px', color: '#7F1D1D', marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
              <li>この組織</li>
              <li>すべての子組織（再帰的に）</li>
              <li>すべてのメンバー</li>
            </ul>
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

// 重複組織削除確認モーダルコンポーネント
function DeleteDuplicatesModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } catch (error: any) {
      console.error('❌ [DeleteDuplicatesModal] 削除処理でエラーが発生しました:', error);
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
          maxWidth: '600px',
          width: '90%',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: '#991B1B' }}>
            重複組織を削除
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--color-text-light)', lineHeight: '1.6', marginBottom: '12px' }}>
            重複している組織を削除しますか？
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
              以下のデータが削除されます：
            </p>
            <ul style={{ fontSize: '14px', color: '#7F1D1D', marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
              <li>重複している組織（メンバー数・子組織数が少ない方）</li>
              <li>削除される組織のすべての子組織（再帰的に）</li>
              <li>削除される組織のすべてのメンバー</li>
            </ul>
            <p style={{ fontSize: '14px', color: '#7F1D1D', lineHeight: '1.6', marginTop: '12px', marginBottom: 0, fontWeight: '600' }}>
              💡 削除前に必ずデータベースのバックアップを取ってください。
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

