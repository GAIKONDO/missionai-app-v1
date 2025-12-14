'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '@/components/Layout';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getOrgTreeFromDb, getAllOrganizationsFromTree, type OrgNodeData } from '@/lib/orgApi';
import { getThemes, getFocusInitiatives, type Theme, type FocusInitiative } from '@/lib/orgApi';
import dynamic from 'next/dynamic';

// VegaChartを動的インポート（SSRを回避）
const DynamicVegaChart = dynamic(() => import('@/components/VegaChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      グラフを読み込み中...
    </div>
  ),
});

// 組織の階層レベル情報
interface OrgWithDepth {
  id: string;
  name: string;
  depth: number;
  path: string[]; // ルートから現在の組織までのパス
}

// 階層レベルごとの組織グループ
interface HierarchyLevel {
  level: number;
  orgs: OrgWithDepth[];
}

/**
 * 組織ツリーから階層レベルごとの組織を抽出
 */
function extractOrganizationsByDepth(orgTree: OrgNodeData | null): HierarchyLevel[] {
  if (!orgTree) return [];

  const orgsByDepth = new Map<number, OrgWithDepth[]>();

  function traverse(node: OrgNodeData, depth: number, path: string[]) {
    if (!node.id) return;

    const orgWithDepth: OrgWithDepth = {
      id: node.id,
      name: node.name || node.title || node.id,
      depth,
      path: [...path, node.name || node.title || node.id],
    };

    if (!orgsByDepth.has(depth)) {
      orgsByDepth.set(depth, []);
    }
    orgsByDepth.get(depth)!.push(orgWithDepth);

    if (node.children) {
      for (const child of node.children) {
        traverse(child, depth + 1, orgWithDepth.path);
      }
    }
  }

  traverse(orgTree, 0, []);

  // Mapを配列に変換してソート
  return Array.from(orgsByDepth.entries())
    .map(([level, orgs]) => ({ level, orgs }))
    .sort((a, b) => a.level - b.level);
}

/**
 * 組織ツリーから指定された組織IDの子孫組織IDをすべて取得（再帰的）
 */
function getDescendantOrgIds(orgTree: OrgNodeData | null, orgId: string): string[] {
  if (!orgTree) return [];

  const descendantIds: string[] = [];

  function findAndCollect(node: OrgNodeData, targetId: string, collecting: boolean) {
    if (!node.id) return false;

    const isTarget = node.id === targetId;
    const shouldCollect = collecting || isTarget;

    if (shouldCollect && !isTarget) {
      // ターゲット組織自体は除外（子孫のみ）
      descendantIds.push(node.id);
    }

    if (node.children) {
      for (const child of node.children) {
        findAndCollect(child, targetId, shouldCollect);
      }
    }

    return isTarget;
  }

  findAndCollect(orgTree, orgId, false);
  return descendantIds;
}

/**
 * 組織ツリーから指定された階層レベルの組織とその子孫組織IDをすべて取得
 */
function getOrgIdsWithDescendants(
  orgTree: OrgNodeData | null,
  selectedLevelOrgs: OrgWithDepth[]
): Map<string, string[]> {
  const orgIdsMap = new Map<string, string[]>();

  selectedLevelOrgs.forEach(org => {
    const descendantIds = getDescendantOrgIds(orgTree, org.id);
    // 自分自身も含める
    orgIdsMap.set(org.id, [org.id, ...descendantIds]);
  });

  return orgIdsMap;
}

export default function DashboardPage() {
  const [orgTree, setOrgTree] = useState<OrgNodeData | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [initiatives, setInitiatives] = useState<FocusInitiative[]>([]);
  const [hierarchyLevels, setHierarchyLevels] = useState<HierarchyLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filteredOrgIds, setFilteredOrgIds] = useState<Set<string>>(new Set());
  const [filteredThemeIds, setFilteredThemeIds] = useState<Set<string>>(new Set());

  // データ取得
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('📖 [ダッシュボード] データ読み込み開始');

        // 並列でデータ取得
        const [orgTreeData, themesData] = await Promise.all([
          getOrgTreeFromDb(),
          getThemes(),
        ]);

        if (!orgTreeData) {
          setError('組織データが取得できませんでした');
          setLoading(false);
          return;
        }

        setOrgTree(orgTreeData);
        setThemes(themesData);

        // 階層レベルを計算
        const levels = extractOrganizationsByDepth(orgTreeData);
        setHierarchyLevels(levels);

        // デフォルトで最初の階層レベルを選択
        if (levels.length > 0) {
          setSelectedLevel(levels[0].level);
        }

        // 全組織の注力施策を取得
        const allOrgs = getAllOrganizationsFromTree(orgTreeData);
        console.log('📖 [ダッシュボード] 全組織数:', allOrgs.length);

        // 並列で各組織の施策を取得（パフォーマンス向上）
        const initiativePromises = allOrgs.map(org => getFocusInitiatives(org.id));
        const initiativeResults = await Promise.allSettled(initiativePromises);

        const allInitiatives: FocusInitiative[] = [];
        initiativeResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allInitiatives.push(...result.value);
          } else {
            console.warn(`⚠️ [ダッシュボード] 組織「${allOrgs[index].name}」の施策取得エラー:`, result.reason);
          }
        });

        setInitiatives(allInitiatives);
        console.log('✅ [ダッシュボード] データ読み込み完了:', {
          themes: themesData.length,
          initiatives: allInitiatives.length,
          hierarchyLevels: levels.length,
        });
      } catch (err: any) {
        console.error('❌ [ダッシュボード] データ読み込みエラー:', err);
        setError(`データの読み込みに失敗しました: ${err?.message || err}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 選択された階層レベルの組織を取得
  const selectedLevelOrgs = useMemo(() => {
    if (selectedLevel === null) return [];
    const levelData = hierarchyLevels.find(l => l.level === selectedLevel);
    const orgs = levelData?.orgs || [];
    
    // フィルター適用
    if (filteredOrgIds.size > 0) {
      return orgs.filter(org => filteredOrgIds.has(org.id));
    }
    
    return orgs;
  }, [selectedLevel, hierarchyLevels, filteredOrgIds]);

  // 選択された階層レベルの組織とその子孫組織IDのマップを取得
  const orgIdsWithDescendants = useMemo(() => {
    if (selectedLevelOrgs.length === 0) return new Map<string, string[]>();
    return getOrgIdsWithDescendants(orgTree, selectedLevelOrgs);
  }, [orgTree, selectedLevelOrgs]);

  // フィルター適用後のテーマリスト
  const filteredThemes = useMemo(() => {
    if (filteredThemeIds.size === 0) return themes;
    return themes.filter(theme => filteredThemeIds.has(theme.id));
  }, [themes, filteredThemeIds]);

  // テーマ×組織の施策件数を集計（子組織の施策も含める）
  const chartData = useMemo(() => {
    if (filteredThemes.length === 0 || selectedLevelOrgs.length === 0) {
      return [];
    }

    const data: Array<{
      theme: string;
      themeId: string;
      organization: string;
      organizationId: string;
      count: number;
    }> = [];

    // 各テーマと各組織の組み合わせで集計
    filteredThemes.forEach(theme => {
      selectedLevelOrgs.forEach(org => {
        // この組織とその子孫組織のIDを取得
        const orgIdsToInclude = orgIdsWithDescendants.get(org.id) || [org.id];

        // この組織とその子孫組織の施策で、このテーマに関連するものをカウント
        const relatedInitiatives = initiatives.filter(init => {
          // 組織IDが対象組織またはその子孫組織に含まれるかチェック
          if (!orgIdsToInclude.includes(init.organizationId)) return false;

          // themeId（単一）またはthemeIds（配列）でチェック
          if (init.themeId === theme.id) return true;
          if (Array.isArray(init.themeIds) && init.themeIds.includes(theme.id)) return true;
          return false;
        });

        data.push({
          theme: theme.title,
          themeId: theme.id,
          organization: org.name,
          organizationId: org.id,
          count: relatedInitiatives.length,
        });
      });
    });

    return data;
  }, [filteredThemes, selectedLevelOrgs, initiatives, orgIdsWithDescendants]);

  // Vega-Liteのグラフ仕様を生成（メモ化でパフォーマンス向上）
  const chartSpec = useMemo(() => {
    if (chartData.length === 0) return null;

    // 組織ごとの色を自動生成（Vega-Liteのカテゴリカラースキームを使用）
    const organizations = Array.from(new Set(chartData.map(d => d.organization)));
    const maxColors = 20; // Vega-Liteのcategory20スキームは20色

    // レスポンシブ対応: 画面幅に応じて高さを調整
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const chartHeight = isMobile ? 400 : 500;

      return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      description: 'テーマごとの施策件数を組織別に積み上げて表示',
      width: 'container',
      height: chartHeight,
      padding: { top: 20, right: 20, bottom: 60, left: 60 },
      data: {
        values: chartData,
      },
      layer: [
        // 1. 積み上げ棒グラフ
        {
          mark: {
            type: 'bar',
            tooltip: true,
            cursor: 'pointer',
            cornerRadiusTopLeft: 4,
            cornerRadiusTopRight: 4,
            stroke: '#FFFFFF',
            strokeWidth: 1,
          },
          encoding: {
            x: {
              field: 'theme',
              type: 'ordinal',
              title: 'テーマ',
              axis: {
                labelAngle: isMobile ? -90 : -45,
                labelLimit: isMobile ? 50 : 120,
                labelFontSize: isMobile ? 11 : 13,
                labelColor: '#4B5563',
                labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titleFontSize: isMobile ? 12 : 14,
                titleFontWeight: '600',
                titleColor: '#1A1A1A',
                titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titlePadding: 12,
                domain: true,
                domainColor: '#E5E7EB',
                domainWidth: 1,
                tickSize: 0,
              },
            },
            y: {
              field: 'count',
              type: 'quantitative',
              title: '施策件数',
              axis: {
                grid: false,
                labelFontSize: isMobile ? 11 : 13,
                labelColor: '#6B7280',
                labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titleFontSize: isMobile ? 12 : 14,
                titleFontWeight: '600',
                titleColor: '#1A1A1A',
                titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titlePadding: 12,
                domain: true,
                domainColor: '#E5E7EB',
                domainWidth: 1,
                tickSize: 0,
              },
              stack: 'zero', // 積み上げグラフ
            },
            color: {
              field: 'organization',
              type: 'nominal',
              title: '組織',
              scale: {
                scheme: organizations.length <= maxColors ? 'category20' : 'category20b',
              },
              legend: {
                orient: isMobile ? 'bottom' : 'right',
                columns: isMobile ? 2 : 1,
                symbolLimit: organizations.length > 20 ? 50 : undefined,
                labelFontSize: isMobile ? 11 : 13,
                labelColor: '#4B5563',
                labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titleFontSize: isMobile ? 12 : 14,
                titleFontWeight: '600',
                titleColor: '#1A1A1A',
                titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titlePadding: 8,
                symbolType: 'circle',
                symbolSize: 80,
                padding: 8,
                offset: isMobile ? 0 : 20,
              },
            },
            tooltip: [
              { field: 'theme', type: 'nominal', title: 'テーマ' },
              { field: 'organization', type: 'nominal', title: '組織' },
              { field: 'count', type: 'quantitative', title: '件数', format: 'd' },
            ],
          },
        },
        // 2. テーマごとの合計値を表示するテキストレイヤー
        {
          mark: {
            type: 'text',
            align: 'center',
            baseline: 'bottom',
            dy: -8,
            fontSize: isMobile ? 12 : 14,
            fontWeight: '600',
            fill: '#1A1A1A',
            font: 'var(--font-inter), var(--font-noto), sans-serif',
          },
          encoding: {
            x: {
              field: 'theme',
              type: 'ordinal',
            },
            y: {
              aggregate: 'sum',
              field: 'count',
              type: 'quantitative',
            },
            text: {
              aggregate: 'sum',
              field: 'count',
              type: 'quantitative',
              format: 'd',
            },
            tooltip: [
              { field: 'theme', type: 'nominal', title: 'テーマ' },
              {
                aggregate: 'sum',
                field: 'count',
                type: 'quantitative',
                title: '合計件数',
                format: 'd',
              },
            ],
          },
        },
      ],
      config: {
        view: {
          stroke: 'transparent',
        },
        background: 'transparent',
        axis: {
          labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
          titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
        },
        style: {
          'bar': {
            stroke: '#FFFFFF',
            strokeWidth: 1,
          },
        },
      },
    };
  }, [chartData]);

  // 階層レベル選択ハンドラー
  const handleLevelChange = useCallback((level: number) => {
    setSelectedLevel(level);
    setSelectedThemeId(null); // 階層レベル変更時に選択をリセット
  }, []);

  // グラフのクリックイベントハンドラー
  const handleChartSignal = useCallback((signalName: string, value: any) => {
    if (signalName === 'clicked_theme' && value && value.themeId) {
      setSelectedThemeId(value.themeId);
    }
  }, []);

  // 選択されたテーマに関連する注力施策を取得
  const selectedThemeInitiatives = useMemo(() => {
    if (!selectedThemeId) return [];

    // 選択された階層レベルの組織とその子孫組織IDを取得
    const orgIdsToInclude = Array.from(orgIdsWithDescendants.values()).flat();

    return initiatives.filter(init => {
      // 組織IDが対象組織またはその子孫組織に含まれるかチェック
      if (!orgIdsToInclude.includes(init.organizationId)) return false;

      // themeId（単一）またはthemeIds（配列）でチェック
      if (init.themeId === selectedThemeId) return true;
      if (Array.isArray(init.themeIds) && init.themeIds.includes(selectedThemeId)) return true;
      return false;
    });
  }, [selectedThemeId, initiatives, orgIdsWithDescendants]);

  // 選択されたテーマの情報を取得
  const selectedTheme = useMemo(() => {
    if (!selectedThemeId) return null;
    return themes.find(t => t.id === selectedThemeId);
  }, [selectedThemeId, themes]);

  // フィルター適用後の施策総数を計算
  const filteredInitiativeCount = useMemo(() => {
    // フィルター適用後の組織IDを取得
    const orgIdsToInclude = Array.from(orgIdsWithDescendants.values()).flat();
    const filteredOrgIdsArray = filteredOrgIds.size > 0 
      ? Array.from(filteredOrgIds)
      : orgIdsToInclude;
    
    // フィルター適用後のテーマIDを取得
    const filteredThemeIdsArray = filteredThemeIds.size > 0
      ? Array.from(filteredThemeIds)
      : filteredThemes.map(t => t.id);
    
    // フィルター適用後の施策をカウント
    return initiatives.filter(i => {
      // 組織フィルター
      const orgMatch = filteredOrgIdsArray.includes(i.organizationId);
      if (!orgMatch) return false;
      
      // テーマフィルター
      const themeMatch = filteredThemeIdsArray.some(themeId => {
        if (i.themeId === themeId) return true;
        if (Array.isArray(i.themeIds) && i.themeIds.includes(themeId)) return true;
        return false;
      });
      
      return themeMatch;
    }).length;
  }, [initiatives, orgIdsWithDescendants, filteredOrgIds, filteredThemeIds, filteredThemes]);

  if (loading) {
    return (
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>データを読み込み中...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ marginBottom: '8px' }}>ダッシュボード</h2>
          <div style={{
            padding: '16px',
            backgroundColor: '#FEF2F2',
            border: '1.5px solid #FCA5A5',
            borderRadius: '8px',
            color: '#991B1B',
            fontSize: '14px',
          }}>
            <strong>エラー:</strong> {error}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="card" style={{ padding: '32px' }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            marginBottom: '8px',
            fontSize: '24px',
            fontWeight: '600',
            color: '#1A1A1A',
          }}>
            ダッシュボード
          </h2>
          <p style={{
            marginBottom: 0,
            fontSize: '14px',
            color: '#808080',
          }}>
            テーマごとの施策件数を組織別に分析します
          </p>
        </div>

        {/* 階層レベル選択とフィルター */}
        {hierarchyLevels.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px',
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#1A1A1A',
              }}>
                階層レベルを選択
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: filteredOrgIds.size > 0 || filteredThemeIds.size > 0 ? '#4262FF' : '#6B7280',
                    backgroundColor: filteredOrgIds.size > 0 || filteredThemeIds.size > 0 ? '#F0F4FF' : '#FFFFFF',
                    border: filteredOrgIds.size > 0 || filteredThemeIds.size > 0 ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 4h12M4 8h8M6 12h4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  フィルター
                  {(filteredOrgIds.size > 0 || filteredThemeIds.size > 0) && (
                    <span style={{
                      backgroundColor: '#4262FF',
                      color: '#FFFFFF',
                      borderRadius: '10px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      minWidth: '18px',
                      textAlign: 'center',
                    }}>
                      {filteredOrgIds.size + filteredThemeIds.size}
                    </span>
                  )}
                </button>
                {(filteredOrgIds.size > 0 || filteredThemeIds.size > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilteredOrgIds(new Set());
                      setFilteredThemeIds(new Set());
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#6B7280',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #E0E0E0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
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
                        d="M12 4L4 12M4 4l8 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    クリア
                  </button>
                )}
              </div>
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              {hierarchyLevels.map(levelData => (
                <button
                  key={levelData.level}
                  type="button"
                  onClick={() => handleLevelChange(levelData.level)}
                  style={{
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: selectedLevel === levelData.level ? '600' : '400',
                    color: selectedLevel === levelData.level ? '#4262FF' : '#1A1A1A',
                    backgroundColor: selectedLevel === levelData.level ? '#F0F4FF' : '#FFFFFF',
                    border: selectedLevel === levelData.level ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  レベル{levelData.level} ({levelData.orgs.length}組織)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* エラーメッセージ */}
        {themes.length === 0 && (
          <div style={{
            padding: '16px',
            backgroundColor: '#FFFBF0',
            border: '1.5px solid #FCD34D',
            borderRadius: '8px',
            color: '#92400E',
            fontSize: '14px',
            marginBottom: '24px',
          }}>
            テーマが登録されていません。テーマを追加してください。
          </div>
        )}

        {selectedLevelOrgs.length === 0 && selectedLevel !== null && (
          <div style={{
            padding: '16px',
            backgroundColor: '#FFFBF0',
            border: '1.5px solid #FCD34D',
            borderRadius: '8px',
            color: '#92400E',
            fontSize: '14px',
            marginBottom: '24px',
          }}>
            選択された階層レベルに組織が存在しません。
          </div>
        )}

        {/* 統計情報カード（グラフの上） */}
        {chartData.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
              ? '1fr' 
              : 'repeat(3, 1fr)',
            gap: typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '20px',
            marginBottom: '32px',
          }}>
            {/* テーマ数カード */}
            <div style={{
              padding: '24px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #F0F4FF 0%, #E0E8FF 100%)',
                borderRadius: '0 12px 0 60px',
                opacity: 0.5,
              }} />
              <div style={{
                fontSize: '13px',
                color: '#6B7280',
                marginBottom: '12px',
                fontWeight: '500',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                position: 'relative',
                zIndex: 1,
              }}>
                テーマ数
              </div>
              <div style={{
                fontSize: '40px',
                fontWeight: '700',
                color: '#1A1A1A',
                lineHeight: '1',
                marginBottom: '4px',
                position: 'relative',
                zIndex: 1,
                fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
              }}>
                {filteredThemes.length}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#9CA3AF',
                fontWeight: '400',
                position: 'relative',
                zIndex: 1,
              }}>
                件のテーマ
                {filteredThemeIds.size > 0 && (
                  <span style={{
                    fontSize: '11px',
                    color: '#4262FF',
                    marginLeft: '4px',
                  }}>
                    (フィルター適用中)
                  </span>
                )}
              </div>
            </div>

            {/* 組織数カード */}
            <div style={{
              padding: '24px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                borderRadius: '0 12px 0 60px',
                opacity: 0.5,
              }} />
              <div style={{
                fontSize: '13px',
                color: '#6B7280',
                marginBottom: '12px',
                fontWeight: '500',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                position: 'relative',
                zIndex: 1,
              }}>
                組織数
              </div>
              <div style={{
                fontSize: '40px',
                fontWeight: '700',
                color: '#1A1A1A',
                lineHeight: '1',
                marginBottom: '4px',
                position: 'relative',
                zIndex: 1,
                fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
              }}>
                {selectedLevelOrgs.length}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#9CA3AF',
                fontWeight: '400',
                position: 'relative',
                zIndex: 1,
              }}>
                件の組織
                {filteredOrgIds.size > 0 && (
                  <span style={{
                    fontSize: '11px',
                    color: '#4262FF',
                    marginLeft: '4px',
                  }}>
                    (フィルター適用中)
                  </span>
                )}
              </div>
            </div>

            {/* 施策総数カード */}
            <div style={{
              padding: '24px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #FEF3F2 0%, #FEE2E2 100%)',
                borderRadius: '0 12px 0 60px',
                opacity: 0.5,
              }} />
              <div style={{
                fontSize: '13px',
                color: '#6B7280',
                marginBottom: '12px',
                fontWeight: '500',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                position: 'relative',
                zIndex: 1,
              }}>
                施策総数
              </div>
              <div style={{
                fontSize: '40px',
                fontWeight: '700',
                color: '#1A1A1A',
                lineHeight: '1',
                marginBottom: '4px',
                position: 'relative',
                zIndex: 1,
                fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
              }}>
                {filteredInitiativeCount}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#9CA3AF',
                fontWeight: '400',
                position: 'relative',
                zIndex: 1,
              }}>
                件の施策
                {(filteredOrgIds.size > 0 || filteredThemeIds.size > 0) && (
                  <span style={{
                    fontSize: '11px',
                    color: '#4262FF',
                    marginLeft: '4px',
                  }}>
                    (フィルター適用中)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* グラフ */}
        {chartSpec && chartData.length > 0 ? (
          <div style={{
            marginBottom: '32px',
            width: '100%',
            overflowX: 'auto',
          }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              padding: '24px',
              overflow: 'hidden',
            }}>
              <div style={{
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #F3F4F6',
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  margin: 0,
                  fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                }}>
                  テーマ別施策件数
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: '#6B7280',
                  margin: '4px 0 0 0',
                  fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                }}>
                  階層レベル{selectedLevel}
                </p>
              </div>
              <DynamicVegaChart
                spec={chartSpec}
                language="vega-lite"
                onSignal={handleChartSignal}
                chartData={chartData}
                noBorder={true}
              />
            </div>
          </div>
        ) : (
          themes.length > 0 && selectedLevelOrgs.length > 0 && (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: '#808080',
              fontSize: '14px',
              backgroundColor: '#FAFAFA',
              borderRadius: '8px',
              border: '1px dashed #E0E0E0',
            }}>
              選択された階層レベルに施策が登録されていません。
            </div>
          )
        )}

        {/* 選択されたテーマの注力施策カード */}
        {chartData.length > 0 && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
            fontSize: '14px',
          }}>
            {/* 選択されたテーマの注力施策カード */}
            {selectedTheme && selectedThemeInitiatives.length > 0 && (
              <div style={{ marginTop: '24px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '16px', color: '#1A1A1A' }}>
                  「{selectedTheme.title}」の注力施策 ({selectedThemeInitiatives.length}件)
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px',
                }}>
                  {selectedThemeInitiatives.map(initiative => {
                    // 組織名を取得
                    const orgName = selectedLevelOrgs.find(o => {
                      const orgIds = orgIdsWithDescendants.get(o.id) || [];
                      return orgIds.includes(initiative.organizationId);
                    })?.name || '不明な組織';

                    return (
                      <div
                        key={initiative.id}
                        style={{
                          padding: '16px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 150ms',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#4262FF';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(66, 98, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#E5E7EB';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => {
                          // 注力施策詳細ページに遷移
                          window.location.href = `/organization/initiative?organizationId=${initiative.organizationId}&initiativeId=${initiative.id}`;
                        }}
                      >
                        <div style={{
                          fontSize: '12px',
                          color: '#6B7280',
                          marginBottom: '8px',
                        }}>
                          {orgName}
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1A1A1A',
                          marginBottom: '8px',
                          lineHeight: '1.4',
                        }}>
                          {initiative.title}
                        </div>
                        {initiative.description && (
                          <div style={{
                            fontSize: '11px',
                            color: '#4B5563',
                            lineHeight: '1.4',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]} 
                              components={{
                                a: ({ node, ...props }: any) => (
                                  <a
                                    {...props}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#4262FF', textDecoration: 'underline', fontSize: 'inherit' }}
                                  />
                                ),
                                p: ({ node, ...props }: any) => (
                                  <p {...props} style={{ margin: 0, marginBottom: 0, fontSize: 'inherit', display: 'inline' }} />
                                ),
                                h1: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                                ),
                                h2: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                                ),
                                h3: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                                ),
                                h4: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                                ),
                                h5: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                                ),
                                h6: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                                ),
                                strong: ({ node, ...props }: any) => (
                                  <strong {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                                ),
                                em: ({ node, ...props }: any) => (
                                  <em {...props} style={{ fontSize: 'inherit', fontStyle: 'italic' }} />
                                ),
                                ul: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit' }} />
                                ),
                                ol: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit' }} />
                                ),
                                li: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit' }} />
                                ),
                                code: ({ node, ...props }: any) => (
                                  <code {...props} style={{ fontSize: 'inherit', backgroundColor: '#F3F4F6', padding: '2px 4px', borderRadius: '3px' }} />
                                ),
                                blockquote: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit' }} />
                                ),
                              }}
                            >
                              {initiative.description.replace(/\n/g, ' ').replace(/\s+/g, ' ')}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedTheme && selectedThemeInitiatives.length === 0 && (
              <div style={{
                marginTop: '24px',
                borderTop: '1px solid #E5E7EB',
                paddingTop: '16px',
                color: '#6B7280',
                fontSize: '14px',
              }}>
                「{selectedTheme.title}」に関連する注力施策はありません。
              </div>
            )}
          </div>
        )}

        {/* フィルターモーダル */}
        {showFilterModal && (
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
            onClick={() => setShowFilterModal(false)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '32px',
                width: '95%',
                maxWidth: '1200px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  margin: 0,
                }}>
                  フィルター設定
                </h3>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M15 5L5 15M5 5l10 10"
                      stroke="#6B7280"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              {/* 組織フィルター（階層ごと、ボタン形式） */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '20px',
                }}>
                  組織でフィルター
                </label>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                }}>
                  {hierarchyLevels.map(levelData => (
                    <div key={levelData.level}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#4262FF',
                        marginBottom: '12px',
                        paddingBottom: '8px',
                        borderBottom: '1px solid #F3F4F6',
                      }}>
                        レベル{levelData.level} ({levelData.orgs.length}組織)
                      </div>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        padding: '16px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        backgroundColor: '#FAFAFA',
                      }}>
                        {levelData.orgs.map(org => {
                          const isSelected = filteredOrgIds.has(org.id);
                          return (
                            <button
                              key={org.id}
                              type="button"
                              onClick={() => {
                                const newFilteredOrgIds = new Set(filteredOrgIds);
                                if (isSelected) {
                                  newFilteredOrgIds.delete(org.id);
                                } else {
                                  newFilteredOrgIds.add(org.id);
                                }
                                setFilteredOrgIds(newFilteredOrgIds);
                              }}
                              style={{
                                padding: '12px 20px',
                                fontSize: '14px',
                                fontWeight: isSelected ? '600' : '400',
                                color: isSelected ? '#4262FF' : '#1A1A1A',
                                backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
                                border: isSelected ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 150ms',
                                whiteSpace: 'nowrap',
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
                              {org.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* テーマフィルター（ボタン形式） */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '20px',
                }}>
                  テーマでフィルター
                </label>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  padding: '16px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  backgroundColor: '#FAFAFA',
                }}>
                  {themes.length === 0 ? (
                    <p style={{
                      fontSize: '13px',
                      color: '#6B7280',
                      width: '100%',
                      textAlign: 'center',
                      padding: '20px',
                    }}>
                      テーマが登録されていません
                    </p>
                  ) : (
                    themes.map(theme => {
                      const isSelected = filteredThemeIds.has(theme.id);
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            const newFilteredThemeIds = new Set(filteredThemeIds);
                            if (isSelected) {
                              newFilteredThemeIds.delete(theme.id);
                            } else {
                              newFilteredThemeIds.add(theme.id);
                            }
                            setFilteredThemeIds(newFilteredThemeIds);
                          }}
                          style={{
                            padding: '12px 20px',
                            fontSize: '14px',
                            fontWeight: isSelected ? '600' : '400',
                            color: isSelected ? '#4262FF' : '#1A1A1A',
                            backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
                            border: isSelected ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 150ms',
                            whiteSpace: 'nowrap',
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
                          {theme.title}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* アクションボタン */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid #E5E7EB',
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setFilteredOrgIds(new Set());
                    setFilteredThemeIds(new Set());
                  }}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6B7280',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #E0E0E0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
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
                  リセット
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#FFFFFF',
                    backgroundColor: '#4262FF',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#3151CC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#4262FF';
                  }}
                >
                  適用
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

