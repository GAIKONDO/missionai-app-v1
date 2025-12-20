'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '@/components/Layout';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import RelationshipDiagram2D, { type RelationshipNode, type RelationshipLink } from '@/components/RelationshipDiagram2D';
import { getThemes, getFocusInitiatives, deleteTheme, saveTheme, updateThemePositions, type Theme, type FocusInitiative, getAllTopics, type TopicInfo } from '@/lib/orgApi';
import { getOrgTreeFromDb, type OrgNodeData } from '@/lib/orgApi';
// import { getAllCompanies, getCompanyFocusInitiatives, type Company, type CompanyFocusInitiative } from '@/lib/companiesApi'; // 削除（事業会社ページ削除のため）
import dynamic from 'next/dynamic';

// RelationshipDiagram2Dを動的インポート（SSRを回避）
const DynamicRelationshipDiagram2D = dynamic(() => import('@/components/RelationshipDiagram2D'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      関係性図を読み込み中...
    </div>
  ),
});

// RelationshipBubbleChartを動的インポート（SSRを回避）
const DynamicRelationshipBubbleChart = dynamic(() => import('@/components/RelationshipBubbleChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      バブルチャートを読み込み中...
    </div>
  ),
});

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

// テーマ選択ボタンコンポーネント
function ThemeSelector({ 
  themes, 
  selectedThemeId, 
  onSelect
}: { 
  themes: Theme[]; 
  selectedThemeId: string | null; 
  onSelect: (themeId: string | null) => void;
}) {
  return (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '8px',
      width: '100%',
      alignItems: 'center',
    }}>
      {/* すべて表示ボタン */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        style={{
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: selectedThemeId === null ? '600' : '400',
          color: selectedThemeId === null ? '#4262FF' : '#1A1A1A',
          backgroundColor: selectedThemeId === null ? '#F0F4FF' : '#FFFFFF',
          border: selectedThemeId === null ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          if (selectedThemeId !== null) {
          e.currentTarget.style.borderColor = '#C4C4C4';
          e.currentTarget.style.backgroundColor = '#FAFAFA';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedThemeId !== null) {
          e.currentTarget.style.borderColor = '#E0E0E0';
          e.currentTarget.style.backgroundColor = '#FFFFFF';
          }
          }}
        >
        すべて表示
      </button>

      {/* 各テーマのボタン */}
          {themes.map((theme) => {
            const isSelected = theme.id === selectedThemeId;
            return (
          <button
                key={theme.id}
            type="button"
            onClick={() => onSelect(theme.id)}
                style={{
              padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: isSelected ? '600' : '400',
                  color: isSelected ? '#4262FF' : '#1A1A1A',
                  backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
              border: isSelected ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
              gap: '6px',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                e.currentTarget.style.borderColor = '#C4C4C4';
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                e.currentTarget.style.borderColor = '#E0E0E0';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                <span>{theme.title}</span>
                {isSelected && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M13 4L6 11L3 8"
                      stroke="#4262FF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
          </button>
            );
          })}
    </div>
  );
}

// SortableThemeItemコンポーネント
function SortableThemeItem({ 
  theme, 
  onEdit, 
  onDelete 
}: { 
  theme: Theme; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: theme.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '16px',
        border: '1px solid #E0E0E0',
        borderRadius: '8px',
        marginBottom: '12px',
        backgroundColor: '#FAFAFA',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
      }}>
        {/* ドラッグハンドル */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            color: '#6B7280',
            backgroundColor: '#F3F4F6',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E5E7EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M7 5h6M7 10h6M7 15h6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        
        {/* テーマ情報 */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1A1A1A',
            marginBottom: '8px',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            {theme.title}
          </div>
          {theme.description && (
            <div style={{
              fontSize: '14px',
              color: '#4B5563',
              marginBottom: '8px',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              {theme.description}
            </div>
          )}
          {theme.initiativeIds && theme.initiativeIds.length > 0 && (
            <div style={{
              fontSize: '12px',
              color: '#808080',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              関連注力施策: {theme.initiativeIds.length}件
            </div>
          )}
        </div>
        
        {/* 編集・削除ボタン */}
        <div style={{
          display: 'flex',
          gap: '8px',
        }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#4262FF',
              backgroundColor: '#F0F4FF',
              border: '1.5px solid #4262FF',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E0E8FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F0F4FF';
            }}
          >
            編集
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#DC2626',
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #DC2626',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FEE2E2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FEF2F2';
            }}
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [initiatives, setInitiatives] = useState<FocusInitiative[]>([]);
  const [orgData, setOrgData] = useState<OrgNodeData | null>(null);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'diagram' | 'bubble'>('diagram');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'organization' | 'company' | 'person'>('all');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [themeFormTitle, setThemeFormTitle] = useState('');
  const [themeFormDescription, setThemeFormDescription] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);
  const [showEditThemesModal, setShowEditThemesModal] = useState(false);
  const [orderedThemes, setOrderedThemes] = useState<Theme[]>([]);

  // テーマリストを再読み込みする関数（先に定義）
  const refreshThemes = useCallback(async () => {
    try {
      const refreshedThemes = await getThemes();
      setThemes(refreshedThemes);
      
      // positionでソートしてorderedThemesを設定
      const sorted = [...refreshedThemes].sort((a, b) => {
        const posA = a.position ?? 999999;
        const posB = b.position ?? 999999;
        return posA - posB;
      });
      setOrderedThemes(sorted);
    } catch (error: any) {
      console.error('テーマリストの再読み込みに失敗しました:', error);
    }
  }, []);

  // トピックリストを再取得する関数
  const refreshTopics = useCallback(async () => {
    if (!orgData) {
      devWarn('組織データがありません。トピックリストを再取得できません。');
      return;
    }
    
    try {
      const allTopics: TopicInfo[] = [];
      const collectTopics = async (org: OrgNodeData) => {
        if (org.id) {
          const orgTopics = await getAllTopics(org.id);
          allTopics.push(...orgTopics);
        }
        
        if (org.children) {
          for (const child of org.children) {
            await collectTopics(child);
          }
        }
      };
      
      await collectTopics(orgData);
      setTopics(allTopics);
          devLog('✅ トピックリストを再取得しました:', allTopics.length, '件');
    } catch (error: any) {
      console.error('トピックリストの再取得に失敗しました:', error);
    }
  }, [orgData]);

  // ドラッグ&ドロップハンドラー（refreshThemesの後に定義）
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      // 現在のテーマリストを取得（最新の状態を確認）
      const currentThemes = await getThemes();
      const currentThemeIds = currentThemes.map(t => t.id);
      const originalThemeIds = orderedThemes.map(t => t.id);
      
      // テーマが追加/削除されていないか確認（楽観的ロック）
      if (currentThemeIds.length !== originalThemeIds.length ||
          !currentThemeIds.every((id, index) => id === originalThemeIds[index])) {
        // テーマリストが変更されている場合は警告を表示
        alert('テーマリストが更新されました。ページをリロードしてください。');
        // refreshThemesを直接呼び出す代わりに、getThemesを呼び出して状態を更新
        const refreshedThemes = await getThemes();
        setThemes(refreshedThemes);
        const sorted = [...refreshedThemes].sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        setOrderedThemes(sorted);
        return;
      }
      
      const oldIndex = orderedThemes.findIndex(t => t.id === active.id);
      const newIndex = orderedThemes.findIndex(t => t.id === over.id);
      
      if (oldIndex === -1 || newIndex === -1) {
        return;
      }
      
      // 一時的にUIを更新（楽観的更新）
      const newOrderedThemes = arrayMove(orderedThemes, oldIndex, newIndex);
      setOrderedThemes(newOrderedThemes);
      
      // positionを更新（1から始まる連番）
      const updates = newOrderedThemes.map((theme, index) => ({
        themeId: theme.id,
        position: index + 1,
      }));
      
      devLog('🔄 [handleDragEnd] 送信するupdates:', updates.length, '件');
      
      try {
        await updateThemePositions(updates);
        // テーマリストを再読み込み（サーバー側で正規化されたpositionを取得）
        const refreshedThemes = await getThemes();
        devLog('📖 [handleDragEnd] 再取得したテーマ数:', refreshedThemes.length, '件');
        setThemes(refreshedThemes);
        const sorted = [...refreshedThemes].sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        devLog('📊 [handleDragEnd] ソート完了');
        setOrderedThemes(sorted);
      } catch (error) {
        console.error('テーマ順序の更新に失敗しました:', error);
        // エラー時は元に戻す
        setOrderedThemes(orderedThemes);
        alert('テーマ順序の更新に失敗しました。ページをリロードしてください。');
        // テーマリストを再読み込み
        const refreshedThemes = await getThemes();
        setThemes(refreshedThemes);
        const sorted = [...refreshedThemes].sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        setOrderedThemes(sorted);
      }
    }
  }, [orderedThemes]);

  // ドラッグ&ドロップ用のセンサー（handleDragEndの後に定義）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動してからドラッグ開始
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // テーマと注力施策を読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        devLog('📖 テーマを読み込み中...');
        let themesData = await getThemes();
        devLog('📖 読み込んだテーマ数:', themesData.length);
        
        // 重複テーマを削除（タイトルで重複チェック）
        const titleMap = new Map<string, Theme[]>();
        themesData.forEach(theme => {
          if (!titleMap.has(theme.title)) {
            titleMap.set(theme.title, []);
          }
          titleMap.get(theme.title)!.push(theme);
        });
        
        // 重複しているテーマを削除（最初の1つを残して、残りを削除）
        const duplicatesToDelete: string[] = [];
        titleMap.forEach((themes, title) => {
          if (themes.length > 1) {
            devWarn(`⚠️ 重複テーマを検出: 「${title}」 (${themes.length}件)`);
            // 最初の1つを残して、残りを削除対象に追加
            for (let i = 1; i < themes.length; i++) {
              duplicatesToDelete.push(themes[i].id);
            }
          }
        });
        
        // 重複テーマを削除
        if (duplicatesToDelete.length > 0) {
          devLog(`🗑️ ${duplicatesToDelete.length}件の重複テーマを削除中...`);
          for (const themeId of duplicatesToDelete) {
            try {
              await deleteTheme(themeId);
              devLog(`✅ 重複テーマを削除しました: ${themeId}`);
            } catch (error: any) {
              console.error(`❌ 重複テーマの削除に失敗しました (ID: ${themeId}):`, error);
            }
          }
          // 削除後に再取得
          themesData = await getThemes();
          devLog(`✅ 重複削除後のテーマ数: ${themesData.length}`);
        }
        
        devLog('📖 最終的なテーマ数:', themesData.length);
        
        const orgTree = await getOrgTreeFromDb();
        
        setThemes(themesData);
        
        // positionでソートしてorderedThemesを設定
        const sorted = [...themesData].sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        setOrderedThemes(sorted);
        setOrgData(orgTree);
        
        // グローバルに公開（デバッグ用）
        if (typeof window !== 'undefined') {
          (window as any).refreshThemes = refreshThemes;
        }
        
        // 組織と事業会社の注力施策を取得（typeで区別）
        if (orgTree) {
          const allInitiatives: FocusInitiative[] = [];
          const collectInitiatives = async (org: OrgNodeData) => {
            if (org.id) {
              const orgInitiatives = await getFocusInitiatives(org.id);
              allInitiatives.push(...orgInitiatives);
            }
            
            if (org.children) {
              for (const child of org.children) {
                await collectInitiatives(child);
              }
            }
          };
          
          await collectInitiatives(orgTree);
          
          // デバッグ: topicIdsが含まれている注力施策を確認
          const initiativesWithTopics = allInitiatives.filter(i => i.topicIds && i.topicIds.length > 0);
          devLog('🔍 [Analytics] トピックが紐づけられた注力施策:', {
            count: initiativesWithTopics.length,
          });
          
          setInitiatives(allInitiatives);
          
          // すべての個別トピックを取得
          const allTopics: TopicInfo[] = [];
          const collectTopics = async (org: OrgNodeData) => {
            if (org.id) {
              const orgTopics = await getAllTopics(org.id);
              allTopics.push(...orgTopics);
            }
            
            if (org.children) {
              for (const child of org.children) {
                await collectTopics(child);
              }
            }
          };
          
          await collectTopics(orgTree);
          
          // デバッグ: 取得したトピックを確認
          devLog('🔍 [Analytics] 取得したトピック:', {
            count: allTopics.length,
          });
          
          setTopics(allTopics);
        }
      } catch (error: any) {
        console.error('データの読み込みに失敗しました:', error);
        setError(`データの読み込みに失敗しました: ${error?.message || error}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // 選択されたテーマに基づいて2D関係性図のノードとリンクを生成
  const { nodes, links } = useMemo(() => {
    devLog('🔍 [2D関係性図] useMemo実行:', {
      selectedThemeId,
      selectedTypeFilter,
      hasOrgData: !!orgData,
      themesCount: themes.length,
      initiativesCount: initiatives.length,
      topicsCount: topics.length,
    });

    // テーマが存在する場合は、組織データがなくても、テーマが選択されていなくても（すべて表示）テーマノードを表示
    if (!orgData && themes.length === 0) {
      devLog('🔍 [2D関係性図] 組織データなし、かつテーマが存在しない');
      return { nodes: [], links: [] };
    }

    const diagramNodes: RelationshipNode[] = [];
    const diagramLinks: RelationshipLink[] = [];

    // 親ノード「情報・通信部門」を追加（組織データがある場合のみ）
    const parentNodeId = 'parent-department';
    if (orgData) {
    diagramNodes.push({
      id: parentNodeId,
      label: '情報・通信部門',
      type: 'organization', // 親ノードも組織タイプとして扱う
      data: { id: parentNodeId, name: '情報・通信部門', isParent: true },
    });
    }

    // 表示するテーマを決定（選択されていない場合はすべて表示）
    const themesToShow = selectedThemeId
      ? themes.filter((t) => t.id === selectedThemeId)
      : themes;

    devLog('🔍 [2D関係性図] 表示するテーマ数:', themesToShow.length);
    
    // テーマが0件の場合は空を返す
    if (themesToShow.length === 0) {
      devLog('🔍 [2D関係性図] 表示するテーマがありません');
      return { nodes: [], links: [] };
    }

    // 各テーマのノードとリンクを追加
    themesToShow.forEach((theme) => {
      // テーマノードを追加
      diagramNodes.push({
        id: theme.id,
        label: theme.title,
        type: 'theme',
        data: theme,
      });

      // 親ノードからテーマへのリンク（親ノードが存在する場合のみ）
      if (orgData) {
      diagramLinks.push({
        source: parentNodeId,
        target: theme.id,
        type: 'main',
      });
      }

      // テーマに関連する注力施策を取得（typeでフィルタリング）
      const relatedInitiatives = initiatives.filter((init) => 
        theme.initiativeIds?.includes(init.id) || 
        init.themeId === theme.id || 
        (Array.isArray(init.themeIds) && init.themeIds.includes(theme.id))
      );

      // ループ内のログを削除（パフォーマンス最適化）

      // 組織ツリーから組織名を取得するヘルパー関数
      const getOrgName = (orgId: string, orgTree: OrgNodeData | null): string => {
        if (!orgTree) return orgId;
        
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

        const found = findOrg(orgTree);
        const orgName = found ? (found.name || found.title || orgId) : orgId;
        
        return orgName;
      };
      
      // テーマが選択されている場合、組織や注力施策、トピックが0件でもテーマノードは表示する
      // （既にテーマノードは追加済み）

      // このテーマに関連する組織を収集（注力施策から組織IDを取得、typeでフィルタリング）
      const organizationIds = new Set<string>();
      relatedInitiatives.forEach((init) => {
        // メインの組織ID
        if (init.organizationId) {
          organizationIds.add(init.organizationId);
        }
        // 関連組織も追加
        if (Array.isArray((init as any).relatedOrganizations)) {
          (init as any).relatedOrganizations.forEach((orgId: string) => {
            if (orgId) {
              organizationIds.add(orgId);
            }
          });
        }
      });

      // 各組織のノードとリンクを追加（各テーマごとに独立したノードを作成、typeでフィルタリング）
      organizationIds.forEach((orgId) => {
        // orgTreeから実際のtypeを取得
        const findOrg = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
          if (node.id === targetId) return node;
          if (node.children) {
            for (const child of node.children) {
              const found = findOrg(child, targetId);
              if (found) return found;
            }
          }
          return null;
        };
        const actualOrg = orgData ? findOrg(orgData, orgId) : null;
        const orgType = actualOrg ? ((actualOrg as any).type || 'organization') : 'organization';
        
        // typeフィルターを適用
        if (selectedTypeFilter !== 'all' && orgType !== selectedTypeFilter) {
          return;
        }
        
        // テーマごとに独立したノードIDを作成（テーマID_組織ID）
        const orgNodeId = `${theme.id}_${orgId}`;
        
        const orgName = getOrgName(orgId, orgData);
        
        // このテーマ用の組織ノードを追加（各テーマごとに独立）
        diagramNodes.push({
          id: orgNodeId,
          label: orgName,
          type: orgType === 'company' ? 'company' : 'organization',
          data: { id: orgId, name: orgName, originalId: orgId, themeId: theme.id, type: orgType },
        });

        // テーマから組織へのリンク
        diagramLinks.push({
          source: theme.id,
          target: orgNodeId,
          type: 'main',
        });
      });

      // 各注力施策のノードとリンクを追加（各テーマごとに独立したノードを作成）
      relatedInitiatives.forEach((initiative) => {
        // テーマごとに独立したノードIDを作成（テーマID_注力施策ID）
        const initiativeNodeId = `${theme.id}_${initiative.id}`;
        
        // このテーマ用の注力施策ノードを追加（各テーマごとに独立）
        diagramNodes.push({
          id: initiativeNodeId,
          label: initiative.title,
          type: 'initiative',
          data: { ...initiative, originalId: initiative.id, themeId: theme.id },
        });

        // 組織から注力施策へのリンク（組織が存在する場合のみ）
        if (initiative.organizationId) {
          // このテーマ用の組織ノードIDを作成
          const orgNodeId = `${theme.id}_${initiative.organizationId}`;
          
          // 組織ノードが存在することを確認
          const orgNodeExists = diagramNodes.find(n => n.id === orgNodeId);
          if (orgNodeExists) {
            diagramLinks.push({
              source: orgNodeId,
              target: initiativeNodeId,
              type: 'branch',
            });
          }
        }
        
        // 注力施策に紐づけられた個別トピックのノードとリンクを追加
        // topicIdsがJSON文字列の場合はパースする
        let parsedTopicIds: string[] = [];
        if (initiative.topicIds) {
          if (Array.isArray(initiative.topicIds)) {
            parsedTopicIds = initiative.topicIds;
          } else if (typeof initiative.topicIds === 'string') {
            try {
              const parsed = JSON.parse(initiative.topicIds);
              parsedTopicIds = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              devWarn('⚠️ [2D関係性図] topicIdsのパースエラー:', e, 'value:', initiative.topicIds);
              parsedTopicIds = [];
            }
          }
        }
        
        if (parsedTopicIds.length > 0) {
          // 大きなデータ構造のログを簡略化（パフォーマンス最適化）
          devLog('🔍 [2D関係性図] 注力施策に紐づけられたトピック:', {
            initiativeId: initiative.id,
            initiativeTitle: initiative.title,
            topicIdsCount: parsedTopicIds.length,
            availableTopicsCount: topics.length,
          });
          
          // 見つからなかったトピックIDを記録（重複を避けるため）
          const missingTopicIds = new Set<string>();
          
          parsedTopicIds.forEach((topicId) => {
            // トピックIDの比較（ループ内のログを削除してパフォーマンス最適化）
            const matchingTopics = topics.filter(t => {
              const matches = t.id === topicId;
              if (!matches && t.id && topicId && isDev) {
                // 部分一致や類似性を確認（開発環境のみ）
                const idStr = String(t.id);
                const searchStr = String(topicId);
                if (idStr.includes(searchStr) || searchStr.includes(idStr)) {
                  devWarn('⚠️ [2D関係性図] トピックIDの部分一致を検出:', {
                    topicId: topicId,
                    foundId: t.id,
                    topicTitle: t.title,
                  });
                }
              }
              return matches;
            });
            
            const topic = matchingTopics.length > 0 ? matchingTopics[0] : null;
            
            if (topic) {
              // ループ内のログを削除（パフォーマンス最適化）
              
              // テーマごとに独立したノードIDを作成（テーマID_注力施策ID_トピックID）
              const topicNodeId = `${theme.id}_${initiative.id}_${topic.id}`;
              
              // このテーマ用の個別トピックノードを追加
              diagramNodes.push({
                id: topicNodeId,
                label: topic.title,
                type: 'topic',
                data: { ...topic, originalId: topic.id, initiativeId: initiative.id, themeId: theme.id },
              });
              
              // 注力施策から個別トピックへのリンク
              diagramLinks.push({
                source: initiativeNodeId,
                target: topicNodeId,
                type: 'topic',
              });
            } else {
              // 見つからなかったトピックIDを記録（重複を避ける）
              missingTopicIds.add(topicId);
              // ループ内のログを簡略化（パフォーマンス最適化）
              devWarn('⚠️ [2D関係性図] トピックが見つかりませんでした:', {
                topicId,
                initiativeId: initiative.id,
                initiativeTitle: initiative.title,
              });
            }
          });
          
          // 見つからなかったトピックIDがある場合のみ、1回だけ警告を出力（開発環境でのみ）
          if (missingTopicIds.size > 0) {
            devWarn('⚠️ [2D関係性図] 一部のトピックが見つかりませんでした（データの不整合の可能性）:', {
              missingTopicIdsCount: missingTopicIds.size,
              initiativeId: initiative.id,
              initiativeTitle: initiative.title,
            });
          }
        }
      });
    });

    // デバッグ: 最終的なノードとリンクを確認
    const topicNodes = diagramNodes.filter(n => n.type === 'topic');
    const topicLinks = diagramLinks.filter(l => l.type === 'topic');
    
    // リンクの検証: すべてのリンクのsourceとtargetがノードとして存在するか確認
    const nodeIds = new Set(diagramNodes.map(n => n.id));
    const invalidLinks: Array<{ source: string; target: string; type?: string }> = [];
    diagramLinks.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) {
        invalidLinks.push({
          source: sourceId,
          target: targetId,
          type: link.type,
        });
      }
    });
    
    if (invalidLinks.length > 0) {
      // エラーログは残すが、大きなデータ構造は簡略化
      console.error('❌ [2D関係性図] 無効なリンクが検出されました:', {
        invalidLinksCount: invalidLinks.length,
        missingSourceNodesCount: invalidLinks.filter(l => !nodeIds.has(l.source)).length,
        missingTargetNodesCount: invalidLinks.filter(l => !nodeIds.has(l.target)).length,
      });
    }
    
    devLog('🔍 [2D関係性図] 最終結果:', {
      totalNodes: diagramNodes.length,
      totalLinks: diagramLinks.length,
      topicNodesCount: topicNodes.length,
      topicLinksCount: topicLinks.length,
      invalidLinksCount: invalidLinks.length,
    });

    // 無効なリンクを除外
    const validLinks = diagramLinks.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { nodes: diagramNodes, links: validLinks };
  }, [selectedThemeId, themes, initiatives, orgData, topics, selectedTypeFilter]);

  const handleNodeClick = (node: RelationshipNode) => {
    // ノードクリック時の処理（必要に応じて実装）
  };

  // デバッグ用: BPOビジネス課のAriel社協業のトピック数を確認する関数をグローバルに公開
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).checkArielTopics = async () => {
        try {
          devLog('=== BPOビジネス課のAriel社協業のトピック数を確認 ===\n');
          
          // 組織ツリーを取得
          const orgTree = await getOrgTreeFromDb();
          if (!orgTree) {
            console.error('❌ 組織ツリーの取得に失敗しました');
            return;
          }
          
          // BPOビジネス課の組織IDを検索
          const { getAllOrganizationsFromTree } = await import('@/lib/orgApi');
          const allOrgs = getAllOrganizationsFromTree(orgTree);
          const bpoOrg = allOrgs.find(org => 
            org.name === 'BPOビジネス課' || 
            org.name === 'ＢＰＯビジネス課' ||
            org.title === 'BPO Business Section'
          );
          
          if (!bpoOrg) {
            console.error('❌ BPOビジネス課が見つかりませんでした');
            devLog('利用可能な組織数:', allOrgs.length);
            return;
          }
          
          devLog(`✅ BPOビジネス課の組織ID: ${bpoOrg.id}\n`);
          
          // BPOビジネス課の注力施策を取得
          const bpoInitiatives = await getFocusInitiatives(bpoOrg.id);
          devLog(`📊 BPOビジネス課の注力施策数: ${bpoInitiatives.length}件\n`);
          
          // Ariel社協業を検索
          const arielInitiative = bpoInitiatives.find(init => 
            init.title.includes('Ariel') || 
            init.title.includes('アリエル') ||
            init.title.includes('協業')
          );
          
          if (!arielInitiative) {
            console.error('❌ Ariel社協業の注力施策が見つかりませんでした');
            devLog('利用可能な注力施策数:', bpoInitiatives.length);
            return;
          }
          
          devLog(`✅ 注力施策が見つかりました:`);
          devLog(`   ID: ${arielInitiative.id}`);
          devLog(`   タイトル: ${arielInitiative.title}`);
          devLog(`   トピック数: ${arielInitiative.topicIds ? arielInitiative.topicIds.length : 0}件\n`);
          
          if (arielInitiative.topicIds && arielInitiative.topicIds.length > 0) {
            devLog('📋 紐づけられているトピックID数:', arielInitiative.topicIds.length);
          } else {
            devLog('⚠️ トピックが紐づけられていません');
          }
          
          devLog('\n=== 確認完了 ===');
          return {
            initiativeId: arielInitiative.id,
            title: arielInitiative.title,
            topicIds: arielInitiative.topicIds || [],
            topicCount: arielInitiative.topicIds ? arielInitiative.topicIds.length : 0,
          };
        } catch (error: any) {
          console.error('❌ エラーが発生しました:', error);
          console.error('エラー詳細:', error.stack);
          throw error;
        }
      };
      // 既に読み込まれているデータから確認する関数も追加
      (window as any).checkArielTopicsFromLoadedData = () => {
        try {
          devLog('=== 読み込まれているデータから確認 ===\n');
          
          // BPOビジネス課の組織IDを検索
          if (!orgData) {
            console.error('❌ 組織データが読み込まれていません');
            return;
          }
          
          const { getAllOrganizationsFromTree } = require('@/lib/orgApi');
          const allOrgs = getAllOrganizationsFromTree(orgData);
          const bpoOrg = allOrgs.find((org: OrgNodeData) =>
            org.name === 'BPOビジネス課' ||
            org.name === 'ＢＰＯビジネス課' ||
            org.title === 'BPO Business Section'
          );
          
          if (!bpoOrg) {
            console.error('❌ BPOビジネス課が見つかりませんでした');
            return;
          }
          
          devLog(`✅ BPOビジネス課の組織ID: ${bpoOrg.id}\n`);
          
          // 読み込まれている注力施策から検索
          const bpoInitiatives = initiatives.filter(init => init.organizationId === bpoOrg.id);
          devLog(`📊 BPOビジネス課の注力施策数: ${bpoInitiatives.length}件\n`);
          
          // Ariel社協業を検索
          const arielInitiative = bpoInitiatives.find(init => 
            init.title.includes('Ariel') || 
            init.title.includes('アリエル') ||
            init.title.includes('協業')
          );
          
          if (!arielInitiative) {
            console.error('❌ Ariel社協業の注力施策が見つかりませんでした');
            devLog('利用可能な注力施策数:', bpoInitiatives.length);
            return;
          }
          
          devLog(`✅ 注力施策が見つかりました:`);
          devLog(`   ID: ${arielInitiative.id}`);
          devLog(`   タイトル: ${arielInitiative.title}`);
          devLog(`   トピック数: ${arielInitiative.topicIds ? arielInitiative.topicIds.length : 0}件\n`);
          
          if (arielInitiative.topicIds && arielInitiative.topicIds.length > 0) {
            devLog('📋 紐づけられているトピックID数:', arielInitiative.topicIds.length);
          } else {
            devLog('⚠️ トピックが紐づけられていません');
          }
          
          devLog('\n=== 確認完了 ===');
          return {
            initiativeId: arielInitiative.id,
            title: arielInitiative.title,
            topicIds: arielInitiative.topicIds || [],
            topicCount: arielInitiative.topicIds ? arielInitiative.topicIds.length : 0,
          };
        } catch (error: any) {
          console.error('❌ エラーが発生しました:', error);
          console.error('エラー詳細:', error.stack);
          throw error;
        }
      };
      
      devLog('✅ checkArielTopics() 関数が利用可能になりました。ブラウザのコンソールで実行してください。');
      devLog('✅ checkArielTopicsFromLoadedData() 関数も利用可能です（読み込まれているデータから確認）。');
    }
  }, [orgData, initiatives, topics]);

  if (loading) {
    return (
      <Layout>
        <div className="card">
          <p>データを読み込み中...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="card" style={{ padding: '32px' }}>
        {/* ヘッダー */}
        <div style={{ 
          marginBottom: '32px',
        }}>
            <h2 style={{ 
              marginBottom: '8px',
              fontSize: '24px',
              fontWeight: '600',
              color: '#1A1A1A',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              分析 - 関係性図
            </h2>
            <p style={{ 
              marginBottom: 0, 
              fontSize: '14px', 
              color: '#808080',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              テーマを中心に、各組織と注力施策の関係を2Dで表示します（typeで組織と事業会社を区別）
            </p>
        </div>

        {/* タイプフィルター（組織/事業会社/個人） */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('all')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: selectedTypeFilter === 'all' ? '600' : '400',
                color: selectedTypeFilter === 'all' ? '#4262FF' : '#1A1A1A',
                backgroundColor: selectedTypeFilter === 'all' ? '#F0F4FF' : '#FFFFFF',
                border: selectedTypeFilter === 'all' ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              すべて
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('organization')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: selectedTypeFilter === 'organization' ? '600' : '400',
                color: selectedTypeFilter === 'organization' ? '#4262FF' : '#1A1A1A',
                backgroundColor: selectedTypeFilter === 'organization' ? '#F0F4FF' : '#FFFFFF',
                border: selectedTypeFilter === 'organization' ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              組織
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('company')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: selectedTypeFilter === 'company' ? '600' : '400',
                color: selectedTypeFilter === 'company' ? '#4262FF' : '#1A1A1A',
                backgroundColor: selectedTypeFilter === 'company' ? '#F0F4FF' : '#FFFFFF',
                border: selectedTypeFilter === 'company' ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              事業会社
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('person')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: selectedTypeFilter === 'person' ? '600' : '400',
                color: selectedTypeFilter === 'person' ? '#4262FF' : '#1A1A1A',
                backgroundColor: selectedTypeFilter === 'person' ? '#F0F4FF' : '#FFFFFF',
                border: selectedTypeFilter === 'person' ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              個人
            </button>
          </div>
        </div>

        {/* 表示モード切り替え（2D関係性図/バブルチャート） */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setViewMode('diagram')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: viewMode === 'diagram' ? '600' : '400',
              color: viewMode === 'diagram' ? '#FFFFFF' : '#1A1A1A',
              backgroundColor: viewMode === 'diagram' ? '#4262FF' : '#FFFFFF',
              border: '1.5px solid',
              borderColor: viewMode === 'diagram' ? '#4262FF' : '#E0E0E0',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
            onMouseEnter={(e) => {
              if (viewMode !== 'diagram') {
                e.currentTarget.style.borderColor = '#C4C4C4';
                e.currentTarget.style.backgroundColor = '#FAFAFA';
              }
            }}
            onMouseLeave={(e) => {
              if (viewMode !== 'diagram') {
                e.currentTarget.style.borderColor = '#E0E0E0';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }
            }}
          >
            2D関係性図
          </button>
          <button
            type="button"
            onClick={() => setViewMode('bubble')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: viewMode === 'bubble' ? '600' : '400',
              color: viewMode === 'bubble' ? '#FFFFFF' : '#1A1A1A',
              backgroundColor: viewMode === 'bubble' ? '#4262FF' : '#FFFFFF',
              border: '1.5px solid',
              borderColor: viewMode === 'bubble' ? '#4262FF' : '#E0E0E0',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
            onMouseEnter={(e) => {
              if (viewMode !== 'bubble') {
                e.currentTarget.style.borderColor = '#C4C4C4';
                e.currentTarget.style.backgroundColor = '#FAFAFA';
              }
            }}
            onMouseLeave={(e) => {
              if (viewMode !== 'bubble') {
                e.currentTarget.style.borderColor = '#E0E0E0';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }
            }}
          >
            バブルチャート
          </button>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div style={{ 
            marginBottom: '24px', 
            padding: '12px 16px', 
            backgroundColor: '#FEF2F2', 
            border: '1.5px solid #FCA5A5', 
            borderRadius: '8px',
            color: '#991B1B',
            fontSize: '14px',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            <strong>エラー:</strong> {error}
          </div>
        )}

        {/* テーマ選択 */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <label style={{ 
              fontWeight: '500',
              fontSize: '14px',
              color: '#1A1A1A',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              テーマを選択
              {themes.length > 0 && (
                <span style={{ 
                  fontSize: '12px', 
                  color: '#808080', 
                  fontWeight: '400',
                  marginLeft: '8px',
                }}>
                  ({themes.length}件)
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowEditThemesModal(true);
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1A1A1A',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #E0E0E0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 150ms',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#C4C4C4';
                  e.currentTarget.style.backgroundColor = '#FAFAFA';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E0E0E0';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M11.333 2.00001C11.5084 1.82465 11.7163 1.68571 11.9447 1.59203C12.1731 1.49835 12.4173 1.4519 12.6637 1.45564C12.9101 1.45938 13.1533 1.51324 13.3788 1.6139C13.6043 1.71456 13.8075 1.8598 13.9767 2.04068C14.1459 2.22156 14.2775 2.43421 14.3639 2.66548C14.4503 2.89675 14.4896 3.14195 14.4795 3.38801C14.4694 3.63407 14.4101 3.8759 14.305 4.09868C14.1999 4.32146 14.0512 4.52059 13.8673 4.68401L5.54001 13.0113L1.33334 14.3333L2.65534 10.1267L11.333 2.00001Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                編集
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingTheme(null);
                  setThemeFormTitle('');
                  setThemeFormDescription('');
                  setShowThemeModal(true);
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  backgroundColor: '#4262FF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 150ms',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3151CC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#4262FF';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 3V13M3 8H13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                テーマを追加
              </button>
            </div>
          </div>
          {themes.length === 0 ? (
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#FFFBF0', 
              border: '1.5px solid #FCD34D', 
              borderRadius: '8px',
              color: '#92400E',
              fontSize: '14px',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              テーマが見つかりません。テーマを追加してください。
            </div>
          ) : (
            <ThemeSelector
              themes={themes}
              selectedThemeId={selectedThemeId}
              onSelect={(themeId) => {
                devLog('テーマを選択:', themeId);
                setSelectedThemeId(themeId);
              }}
            />
          )}
        </div>

        {/* 2D関係性図またはバブルチャート */}
        {/* テーマが存在する場合は、組織や注力施策、トピックが0件でも、テーマが選択されていなくても（すべて表示）表示 */}
        {(nodes.length > 0 || themes.length > 0) ? (
          <div style={{ marginBottom: '32px' }}>
            {viewMode === 'diagram' ? (
              <DynamicRelationshipDiagram2D
                width={1200}
                height={800}
                nodes={nodes}
                links={links}
                selectedThemeId={selectedThemeId ?? undefined}
                onNodeClick={handleNodeClick}
                onTopicMetadataSaved={refreshTopics}
                maxNodes={1000}
              />
            ) : (
              <DynamicRelationshipBubbleChart
                width={1200}
                height={800}
                nodes={nodes}
                links={links}
                onNodeClick={handleNodeClick}
              />
            )}
          </div>
        ) : (
          <div style={{ 
            padding: '60px', 
            textAlign: 'center', 
            color: '#808080',
            fontSize: '14px',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            backgroundColor: '#FAFAFA',
            borderRadius: '8px',
            border: '1px dashed #E0E0E0',
            marginBottom: '32px',
          }}>
            テーマを選択すると関係性図が表示されます。
          </div>
        )}

        {/* テーマ追加・編集モーダル */}
        {showThemeModal && (
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
              zIndex: 1000,
            }}
            onClick={() => setShowThemeModal(false)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{
                marginBottom: '20px',
                fontSize: '20px',
                fontWeight: '600',
                color: '#1A1A1A',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}>
                {editingTheme ? 'テーマを編集' : 'テーマを追加'}
              </h3>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1A1A1A',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}>
                  タイトル <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={themeFormTitle}
                  onChange={(e) => setThemeFormTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1.5px solid #E0E0E0',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                  placeholder="テーマのタイトルを入力"
                />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1A1A1A',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}>
                  説明
                </label>
                <textarea
                  value={themeFormDescription}
                  onChange={(e) => setThemeFormDescription(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1.5px solid #E0E0E0',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    resize: 'vertical',
                  }}
                  placeholder="テーマの説明を入力（任意）"
                />
              </div>
              
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowThemeModal(false);
                    setEditingTheme(null);
                    setThemeFormTitle('');
                    setThemeFormDescription('');
                  }}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1A1A1A',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #E0E0E0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!themeFormTitle.trim()) {
                      alert('タイトルを入力してください');
                      return;
                    }
                    
                    try {
                      if (editingTheme) {
                        await saveTheme({
                          id: editingTheme.id,
                          title: themeFormTitle.trim(),
                          description: themeFormDescription.trim() || undefined,
                          initiativeIds: editingTheme.initiativeIds,
                        });
                      } else {
                        await saveTheme({
                          title: themeFormTitle.trim(),
                          description: themeFormDescription.trim() || undefined,
                        });
                      }
                      
                      const refreshedThemes = await getThemes();
                      setThemes(refreshedThemes);
                      setShowThemeModal(false);
                      setEditingTheme(null);
                      setThemeFormTitle('');
                      setThemeFormDescription('');
                      // テーマ一覧編集モーダルが開いていた場合は再度開く
                      if (showEditThemesModal) {
                        setShowEditThemesModal(true);
                      }
                    } catch (error: any) {
                      console.error('テーマの保存に失敗しました:', error);
                      alert('テーマの保存に失敗しました');
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#FFFFFF',
                    backgroundColor: '#4262FF',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  {editingTheme ? '更新' : '作成'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 削除確認モーダル */}
        {showDeleteModal && themeToDelete && (
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
              zIndex: 1002,
            }}
            onClick={() => {
              setShowDeleteModal(false);
              setThemeToDelete(null);
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '400px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{
                marginBottom: '16px',
                fontSize: '20px',
                fontWeight: '600',
                color: '#1A1A1A',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}>
                テーマを削除
              </h3>
              
              <p style={{
                marginBottom: '24px',
                fontSize: '14px',
                color: '#4B5563',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                lineHeight: '1.6',
              }}>
                テーマ「<strong>{themeToDelete.title}</strong>」を削除してもよろしいですか？<br />
                この操作は取り消せません。
              </p>
              
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setThemeToDelete(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1A1A1A',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #E0E0E0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!themeToDelete) return;
                    
                    try {
                      await deleteTheme(themeToDelete.id);
                      await refreshThemes();
                      if (selectedThemeId === themeToDelete.id) {
                        setSelectedThemeId(null);
                      }
                      setShowDeleteModal(false);
                      setThemeToDelete(null);
                      // テーマ一覧編集モーダルは開いたままにする（削除後に一覧が更新される）
                    } catch (error: any) {
                      console.error('テーマの削除に失敗しました:', error);
                      alert('テーマの削除に失敗しました');
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#FFFFFF',
                    backgroundColor: '#DC2626',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#B91C1C';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#DC2626';
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        )}

        {/* テーマ一覧編集モーダル */}
        {showEditThemesModal && (
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
              zIndex: 1001,
            }}
            onClick={() => setShowEditThemesModal(false)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '700px',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{
                marginBottom: '20px',
                fontSize: '20px',
                fontWeight: '600',
                color: '#1A1A1A',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}>
                テーマを編集
              </h3>
              
              {orderedThemes.length === 0 ? (
                <p style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#808080',
                  fontSize: '14px',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}>
                  テーマがありません
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={orderedThemes.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div style={{ marginBottom: '24px' }}>
                      {orderedThemes.map((theme) => (
                        <SortableThemeItem
                          key={theme.id}
                          theme={theme}
                          onEdit={() => {
                            setEditingTheme(theme);
                            setThemeFormTitle(theme.title);
                            setThemeFormDescription(theme.description || '');
                            setShowEditThemesModal(false);
                            setShowThemeModal(true);
                          }}
                          onDelete={() => {
                            setThemeToDelete(theme);
                            setShowDeleteModal(true);
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
              
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}>
                <button
                  type="button"
                  onClick={() => setShowEditThemesModal(false)}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1A1A1A',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #E0E0E0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
