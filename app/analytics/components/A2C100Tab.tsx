/**
 * A to C 100タブコンテンツ
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import ThemeHierarchyEditor from '@/components/ThemeHierarchyEditor';
import ThemeHierarchyChart from '@/components/ThemeHierarchyChart';
import InitiativeList from '@/components/InitiativeList';
import { getThemes, getFocusInitiatives, getOrgTreeFromDb, getAllOrganizationsFromTree, type Theme, type FocusInitiative } from '@/lib/orgApi';
import { loadHierarchyConfig, getDefaultHierarchyConfig, type ThemeHierarchyConfig } from '@/lib/themeHierarchy';

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

export function A2C100Tab() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [initiatives, setInitiatives] = useState<FocusInitiative[]>([]);
  const [config, setConfig] = useState<ThemeHierarchyConfig>(getDefaultHierarchyConfig());
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showHierarchyEditor, setShowHierarchyEditor] = useState(false);
  const [orgTree, setOrgTree] = useState<any>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'organization' | 'company' | 'person'>('all');

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

        // すべての組織の注力施策を取得（typeで区別）
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
        devLog('✅ [A2C100] データ読み込み完了:', {
          themes: loadedThemes.length,
          initiatives: allInitiatives.length,
        });
      } catch (err: any) {
        console.error('データの読み込みに失敗しました:', err);
        setError(err.message || 'データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-light)' }}>
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>
        エラー: {error}
      </div>
    );
  }

  return (
    <>
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
            テーマを階層構造で表示し、各テーマに紐づく注力施策を確認できます（typeで組織と事業会社を区別）
          </p>
          
          {/* タイプフィルター（組織/事業会社/個人） */}
          <div style={{ marginTop: '12px' }}>
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
            initiatives={initiatives}
            orgTree={orgTree}
            selectedTypeFilter={selectedTypeFilter}
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
              initiatives={initiatives}
              orgTree={orgTree}
              selectedTypeFilter={selectedTypeFilter}
            />
          </div>
        )}
      </div>
    </>
  );
}

