'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '@/components/Layout';
import { setupDebugFunctions } from './utils/debugUtils';
import { useDashboardData } from './hooks/useDashboardData';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { DashboardTabBar } from './components/dashboard/TabBar';
import { ThemeInitiativeAnalysisTab } from './components/dashboard/ThemeInitiativeAnalysisTab';
import { PlaceholderTab } from './components/dashboard/PlaceholderTab';

// 表示モードの型定義（typeベースのフィルターに変更）
type DashboardViewMode = 'all' | 'organization' | 'company' | 'person';
type DashboardTab = 'theme-analysis' | 'tab2' | 'tab3' | 'tab4';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('theme-analysis');
  const [viewMode, setViewMode] = useState<DashboardViewMode>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'organization' | 'company' | 'person'>('all');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [filteredOrgIds, setFilteredOrgIds] = useState<Set<string>>(new Set());
  const [filteredThemeIds, setFilteredThemeIds] = useState<Set<string>>(new Set());

  // グローバルデバッグ関数を設定（ブラウザコンソールで使用可能）
  useEffect(() => {
    setupDebugFunctions();
  }, []);

  // データ取得カスタムフック
  const {
    orgTree,
    themes,
    initiatives,
    hierarchyLevels,
    loading,
    error,
  } = useDashboardData({
    selectedTypeFilter,
    selectedLevel,
    setSelectedLevel,
  });

  // level1And2Orgsを計算（フィルターボタン用）
  const level1And2Orgs = useMemo(() => {
    const level1Orgs = hierarchyLevels.find(l => l.level === 0)?.orgs || [];
    const level2Orgs = hierarchyLevels.find(l => l.level === 1)?.orgs || [];
    return [...level1Orgs, ...level2Orgs];
  }, [hierarchyLevels]);


  // 階層レベル選択ハンドラー（組織モード用）
  const handleLevelChange = useCallback((level: number) => {
    setSelectedLevel(level);
    setSelectedThemeId(null); // 階層レベル変更時に選択をリセット
  }, []);

  // 組織フィルターボタンのハンドラー（事業会社モード用）
  const handleOrgFilterToggle = useCallback((orgId: string) => {
    const newFilteredOrgIds = new Set(filteredOrgIds);
    const isAdding = !newFilteredOrgIds.has(orgId);
    
    if (isAdding) {
      newFilteredOrgIds.add(orgId);
    } else {
      newFilteredOrgIds.delete(orgId);
    }
    
    setFilteredOrgIds(newFilteredOrgIds);
    
    // 事業会社モードの場合、組織に紐づく事業会社も自動的に選択/解除
    // 事業会社の管理はorganizationsテーブルのtypeカラムで行うため、この処理は不要
    // if (viewMode === 'company') {
    //   const linkedCompanyIds = companies
    //     .filter(c => c.organizationId === orgId)
    //     .map(c => c.id);
    //   
    //   const newFilteredCompanyIds = new Set(filteredCompanyIds);
    //   if (isAdding) {
    //     // 組織を選択した場合、その組織に紐づく事業会社も選択
    //     linkedCompanyIds.forEach(companyId => {
    //       newFilteredCompanyIds.add(companyId);
    //     });
    //   } else {
    //     // 組織を解除した場合、その組織に紐づく事業会社も解除
    //     linkedCompanyIds.forEach(companyId => {
    //       newFilteredCompanyIds.delete(companyId);
    //     });
    //   }
    //   setFilteredCompanyIds(newFilteredCompanyIds);
    // }
    
    setSelectedThemeId(null); // フィルター変更時に選択をリセット
  }, [viewMode, filteredOrgIds]);

  // フィルタークリア関数
  const handleClearFilters = useCallback(() => {
    setFilteredOrgIds(new Set());
    setFilteredThemeIds(new Set());
  }, []);

  // 表示モード変更ハンドラー
  const handleTypeFilterChange = useCallback((filter: 'all' | 'organization' | 'company' | 'person') => {
    setViewMode(filter);
    setSelectedTypeFilter(filter);
  }, []);

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
        <DashboardHeader selectedTypeFilter={selectedTypeFilter} />
        
        <DashboardTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'theme-analysis' && (
          <ThemeInitiativeAnalysisTab
            selectedTypeFilter={selectedTypeFilter}
            viewMode={viewMode}
            selectedLevel={selectedLevel}
            selectedThemeId={selectedThemeId}
            filteredOrgIds={filteredOrgIds}
            filteredThemeIds={filteredThemeIds}
            orgTree={orgTree}
            themes={themes}
            initiatives={initiatives}
            hierarchyLevels={hierarchyLevels}
            level1And2Orgs={level1And2Orgs}
            onTypeFilterChange={handleTypeFilterChange}
            onLevelChange={handleLevelChange}
            onOrgFilterToggle={handleOrgFilterToggle}
            onClearFilters={handleClearFilters}
            onSelectedThemeIdChange={setSelectedThemeId}
            onOrgFilterChange={setFilteredOrgIds}
            onThemeFilterChange={setFilteredThemeIds}
          />
        )}

        {activeTab === 'tab2' && (
          <PlaceholderTab tabName="機能2" />
        )}

        {activeTab === 'tab3' && (
          <PlaceholderTab tabName="機能3" />
        )}

        {activeTab === 'tab4' && (
          <PlaceholderTab tabName="機能4" />
        )}
      </div>
    </Layout>
  );
}

