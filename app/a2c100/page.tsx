'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import ThemeHierarchyEditor from '@/components/ThemeHierarchyEditor';
import ThemeHierarchyChart from '@/components/ThemeHierarchyChart';
import InitiativeList from '@/components/InitiativeList';
import { getThemes, getFocusInitiatives, getOrgTreeFromDb, getAllOrganizationsFromTree, type Theme, type FocusInitiative } from '@/lib/orgApi';
// import { getAllCompanies, getCompanyFocusInitiatives, type Company, type CompanyFocusInitiative } from '@/lib/companiesApi'; // 削除（事業会社ページ削除のため）
import { loadHierarchyConfig, getDefaultHierarchyConfig, type ThemeHierarchyConfig } from '@/lib/themeHierarchy';

// データ表示モードの型定義
type DataViewMode = 'organization' | 'company';

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

export default function A2C100Page() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [initiatives, setInitiatives] = useState<FocusInitiative[]>([]);
  const [config, setConfig] = useState<ThemeHierarchyConfig>(getDefaultHierarchyConfig());
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showHierarchyEditor, setShowHierarchyEditor] = useState(false);
  const [orgTree, setOrgTree] = useState<any>(null);
  const [dataViewMode, setDataViewMode] = useState<DataViewMode>('organization');
  
  // 事業会社関連の状態
  // const [companies, setCompanies] = useState<Company[]>([]); // 削除（事業会社ページ削除のため）
  // const [companyInitiatives, setCompanyInitiatives] = useState<CompanyFocusInitiative[]>([]); // 削除（事業会社ページ削除のため）
  const [companies, setCompanies] = useState<any[]>([]); // 一時的にany[]に変更
  const [companyInitiatives, setCompanyInitiatives] = useState<any[]>([]); // 一時的にany[]に変更

  // ウィンドウサイズを監視
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // 初回設定
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // テーマと注力施策を読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 階層設定を読み込み
        const savedConfig = await loadHierarchyConfig();
        setConfig(savedConfig);

        // テーマを読み込み
        const loadedThemes = await getThemes();
        setThemes(loadedThemes);

        // 組織ツリーを取得（事業会社モードでも階層レベル判定に必要）
        const orgTreeData = await getOrgTreeFromDb();
        if (!orgTreeData) {
          devWarn('組織データが取得できませんでした');
          setInitiatives([]);
          setLoading(false);
          return;
        }

        setOrgTree(orgTreeData);

        // データ表示モードに応じてデータを取得
        if (dataViewMode === 'organization') {
          // 組織モード: 組織の注力施策を取得
          const allOrgs = getAllOrganizationsFromTree(orgTreeData);
          devLog('📖 [A2C100] 全組織数:', allOrgs.length);

          // 並列で各組織の施策を取得
          const initiativePromises = allOrgs.map(org => getFocusInitiatives(org.id));
          const initiativeResults = await Promise.allSettled(initiativePromises);

          const allInitiatives: FocusInitiative[] = [];
          initiativeResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              allInitiatives.push(...result.value);
            } else {
              devWarn(`⚠️ [A2C100] 組織「${allOrgs[index].name}」の施策取得エラー:`, result.reason);
            }
          });

          setInitiatives(allInitiatives);
          devLog('✅ [A2C100] 組織モード データ読み込み完了:', {
            themes: loadedThemes.length,
            initiatives: allInitiatives.length,
          });
        } else {
          // 事業会社モード: 事業会社の注力施策を取得
          // 事業会社機能は削除（事業会社ページ削除のため）
          // const allCompanies = await getAllCompanies();
          // setCompanies(allCompanies);
          setCompanies([]); // 空配列に設定

          // 各事業会社の注力施策を取得
          // const initiativePromises = allCompanies.map(company =>
          //   getCompanyFocusInitiatives(company.id)
          // );
          // const initiativeResults = await Promise.allSettled(initiativePromises);

          // const allCompanyInitiatives: CompanyFocusInitiative[] = [];
          // initiativeResults.forEach((result, index) => {
          //   if (result.status === 'fulfilled') {
          //     allCompanyInitiatives.push(...result.value);
          //   } else {
          //     devWarn(`⚠️ [A2C100] 事業会社「${allCompanies[index].name}」の施策取得エラー:`, result.reason);
          //   }
          // });

          setCompanyInitiatives([]); // 空配列に設定
          devLog('✅ [A2C100] 事業会社モード データ読み込み完了:', {
            themes: loadedThemes.length,
            companies: 0, // allCompanies.length, // 削除（事業会社ページ削除のため）
            companyInitiatives: 0, // allCompanyInitiatives.length, // 削除（事業会社ページ削除のため）
          });
        }
      } catch (err: any) {
        console.error('データの読み込みに失敗しました:', err);
        setError(err.message || 'データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dataViewMode]);

  // 階層設定の変更ハンドラー
  const handleConfigChange = useCallback((newConfig: ThemeHierarchyConfig) => {
    setConfig(newConfig);
  }, []);

  // テーマクリックハンドラー
  const handleThemeClick = useCallback((theme: Theme) => {
    setSelectedTheme(theme);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-light)' }}>
          読み込み中...
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>
          エラー: {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h2 style={{ marginBottom: 0 }}>A to C 100</h2>
            <button
              onClick={() => setShowHierarchyEditor(!showHierarchyEditor)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: showHierarchyEditor ? '#1E40AF' : '#E5E7EB',
                color: showHierarchyEditor ? '#ffffff' : '#6B7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: showHierarchyEditor ? '600' : '400',
                transition: 'all 0.2s',
                fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
              }}
              onMouseEnter={(e) => {
                if (!showHierarchyEditor) {
                  e.currentTarget.style.backgroundColor = '#D1D5DB';
                }
              }}
              onMouseLeave={(e) => {
                if (!showHierarchyEditor) {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                }
              }}
            >
              {showHierarchyEditor ? '階層設定を閉じる' : '階層設定'}
            </button>
          </div>
          <p style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--color-text-light)' }}>
            テーマを階層構造で表示し、各テーマに紐づく注力施策を確認できます
          </p>
          
          {/* データ表示モード切り替え（組織/事業会社） */}
          <div style={{ marginTop: '12px' }}>
            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}>
              <button
                type="button"
                onClick={() => setDataViewMode('organization')}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: dataViewMode === 'organization' ? '600' : '400',
                  color: dataViewMode === 'organization' ? '#4262FF' : '#1A1A1A',
                  backgroundColor: dataViewMode === 'organization' ? '#F0F4FF' : '#FFFFFF',
                  border: dataViewMode === 'organization' ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
                onMouseEnter={(e) => {
                  if (dataViewMode !== 'organization') {
                    e.currentTarget.style.borderColor = '#C4C4C4';
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                  }
                }}
                onMouseLeave={(e) => {
                  if (dataViewMode !== 'organization') {
                    e.currentTarget.style.borderColor = '#E0E0E0';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                組織
              </button>
              <button
                type="button"
                onClick={() => setDataViewMode('company')}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: dataViewMode === 'company' ? '600' : '400',
                  color: dataViewMode === 'company' ? '#4262FF' : '#1A1A1A',
                  backgroundColor: dataViewMode === 'company' ? '#F0F4FF' : '#FFFFFF',
                  border: dataViewMode === 'company' ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
                onMouseEnter={(e) => {
                  if (dataViewMode !== 'company') {
                    e.currentTarget.style.borderColor = '#C4C4C4';
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                  }
                }}
                onMouseLeave={(e) => {
                  if (dataViewMode !== 'company') {
                    e.currentTarget.style.borderColor = '#E0E0E0';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                事業会社
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: showHierarchyEditor && windowSize.width > 1400 
          ? '320px 1fr 480px' 
          : showHierarchyEditor && windowSize.width > 1024 
          ? '280px 1fr 450px'
          : windowSize.width > 1024
          ? '1fr 480px'
          : '1fr',
        gap: windowSize.width > 1024 ? '24px' : '16px',
        minHeight: 'calc(100vh - 200px)',
      }}>
          {/* 左側: 階層設定エディタ */}
          {showHierarchyEditor && (
            <div>
              <ThemeHierarchyEditor
                themes={themes}
                config={config}
                onConfigChange={handleConfigChange}
              />
            </div>
          )}

          {/* 中央: 階層構造チャート */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: windowSize.width > 1024 ? '600px' : '400px',
            width: '100%',
            overflow: 'auto',
          }}>
            <ThemeHierarchyChart
              config={config}
              themes={themes}
              initiatives={dataViewMode === 'organization' ? initiatives : companyInitiatives}
              viewMode={dataViewMode}
              width={(() => {
                // 階層設定エディタの表示状態を考慮したサイズ計算
                if (windowSize.width > 1400) {
                  // 大画面
                  if (showHierarchyEditor) {
                    // 階層設定表示時: 左320px + 右480px + gap 24px * 2 = 848px
                    return Math.min(800, windowSize.width - 848);
                  } else {
                    // 階層設定非表示時: 右480px + gap 24px = 504px
                    return Math.min(1000, windowSize.width - 504);
                  }
                } else if (windowSize.width > 1024) {
                  // 中画面
                  if (showHierarchyEditor) {
                    // 階層設定表示時: 左280px + 右450px + gap 24px * 2 = 778px
                    return Math.min(700, windowSize.width - 778);
                  } else {
                    // 階層設定非表示時: 右450px + gap 24px = 474px
                    return Math.min(900, windowSize.width - 474);
                  }
                } else {
                  // 小画面
                  return Math.min(600, windowSize.width - 48);
                }
              })()}
              height={(() => {
                // 階層設定エディタの表示状態を考慮したサイズ計算
                if (windowSize.width > 1400) {
                  if (showHierarchyEditor) {
                    return Math.min(800, windowSize.height - 300);
                  } else {
                    return Math.min(1000, windowSize.height - 300);
                  }
                } else if (windowSize.width > 1024) {
                  if (showHierarchyEditor) {
                    return Math.min(700, windowSize.height - 300);
                  } else {
                    return Math.min(900, windowSize.height - 300);
                  }
                } else {
                  return Math.min(600, windowSize.height - 250);
                }
              })()}
              onThemeClick={handleThemeClick}
            />
          </div>

          {/* 右側: 注力施策リスト */}
          {windowSize.width > 1024 && (
            <div>
              <InitiativeList
                theme={selectedTheme}
                initiatives={dataViewMode === 'organization' ? initiatives : companyInitiatives}
                orgTree={orgTree}
                companies={dataViewMode === 'company' ? companies : undefined}
                viewMode={dataViewMode}
              />
            </div>
          )}
        </div>
    </Layout>
  );
}
