'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import ThemeHierarchyEditor from '@/components/ThemeHierarchyEditor';
import ThemeHierarchyChart from '@/components/ThemeHierarchyChart';
import InitiativeList from '@/components/InitiativeList';
import { getThemes, getFocusInitiatives, getOrgTreeFromDb, getAllOrganizationsFromTree, type Theme, type FocusInitiative } from '@/lib/orgApi';
import { loadHierarchyConfig, getDefaultHierarchyConfig, type ThemeHierarchyConfig } from '@/lib/themeHierarchy';

export default function A2C100Page() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [initiatives, setInitiatives] = useState<FocusInitiative[]>([]);
  const [config, setConfig] = useState<ThemeHierarchyConfig>(getDefaultHierarchyConfig());
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // 全組織の注力施策を読み込み
        const orgTree = await getOrgTreeFromDb();
        if (!orgTree) {
          console.warn('組織データが取得できませんでした');
          setInitiatives([]);
          setLoading(false);
          return;
        }

        const allOrgs = getAllOrganizationsFromTree(orgTree);
        console.log('📖 [A2C100] 全組織数:', allOrgs.length);

        // 並列で各組織の施策を取得
        const initiativePromises = allOrgs.map(org => getFocusInitiatives(org.id));
        const initiativeResults = await Promise.allSettled(initiativePromises);

        const allInitiatives: FocusInitiative[] = [];
        initiativeResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allInitiatives.push(...result.value);
          } else {
            console.warn(`⚠️ [A2C100] 組織「${allOrgs[index].name}」の施策取得エラー:`, result.reason);
          }
        });

        setInitiatives(allInitiatives);
        console.log('✅ [A2C100] データ読み込み完了:', {
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
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: 600, color: 'var(--color-text)' }}>
            A to C 100
          </h2>
          <p style={{ marginBottom: 0, fontSize: '14px', color: 'var(--color-text-light)' }}>
            テーマを階層構造で表示し、各テーマに紐づく注力施策を確認できます
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr 300px',
          gap: '24px',
          minHeight: 'calc(100vh - 200px)',
        }}>
          {/* 左側: 階層設定エディタ */}
          <div>
            <ThemeHierarchyEditor
              themes={themes}
              config={config}
              onConfigChange={handleConfigChange}
            />
          </div>

          {/* 中央: 階層構造チャート */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '600px',
          }}>
            <ThemeHierarchyChart
              config={config}
              themes={themes}
              initiatives={initiatives}
              width={800}
              height={800}
              onThemeClick={handleThemeClick}
            />
          </div>

          {/* 右側: 注力施策リスト */}
          <div>
            <InitiativeList
              theme={selectedTheme}
              initiatives={initiatives}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
