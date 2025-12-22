'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Layout from '@/components/Layout';
import html2canvas from 'html2canvas';
import { setupDebugFunctions } from './utils/debugUtils';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardCalculations } from './hooks/useDashboardCalculations';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { ViewModeSelector } from './components/dashboard/ViewModeSelector';
import { CompanyModeFilters } from './components/dashboard/CompanyModeFilters';
import { OrganizationLevelSelector } from './components/dashboard/OrganizationLevelSelector';
import { StatisticsCards } from './components/dashboard/StatisticsCards';
import { DashboardChart } from './components/dashboard/DashboardChart';
import { InitiativeList } from './components/dashboard/InitiativeList';
import { FilterModal } from './components/dashboard/FilterModal';

// 表示モードの型定義（typeベースのフィルターに変更）
type DashboardViewMode = 'all' | 'organization' | 'company' | 'person';

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<DashboardViewMode>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'organization' | 'company' | 'person'>('all');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filteredOrgIds, setFilteredOrgIds] = useState<Set<string>>(new Set());
  const [filteredThemeIds, setFilteredThemeIds] = useState<Set<string>>(new Set());

  // グラフと注力施策一覧を含むコンテナの参照
  const chartAndInitiativesRef = useRef<HTMLDivElement>(null);

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

  // 計算ロジックカスタムフック
  const {
    selectedLevelOrgs,
    selectedLevelCompanies,
    level1And2Orgs,
    orgIdsWithDescendants,
    filteredThemes,
    chartData,
    selectedTheme,
    selectedThemeInitiatives,
    selectedThemeCompanyInitiatives,
    filteredInitiativeCount,
  } = useDashboardCalculations({
    selectedTypeFilter,
    hierarchyLevels,
    selectedLevel,
    orgTree,
    filteredOrgIds,
    themes,
    filteredThemeIds,
    initiatives,
    selectedThemeId,
  });


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

  // グラフのクリックイベントハンドラー
  const handleChartSignal = useCallback((signalName: string, value: any) => {
    if (signalName === 'clicked_theme' && value && value.themeId) {
      setSelectedThemeId(value.themeId);
    }
  }, []);


  // フィルターが適用されているかチェック
  const hasActiveFilters = useMemo(() => {
    return filteredOrgIds.size > 0 || filteredThemeIds.size > 0;
  }, [filteredOrgIds, filteredThemeIds]);

  // フィルター数の計算
  const filterCount = useMemo(() => {
    return filteredOrgIds.size + filteredThemeIds.size;
  }, [filteredOrgIds, filteredThemeIds]);

  // フィルタークリア関数
  const handleClearFilters = useCallback(() => {
    setFilteredOrgIds(new Set());
    setFilteredThemeIds(new Set());
    // 事業会社の管理はorganizationsテーブルのtypeカラムで行うため、この処理は不要
    // setFilteredCompanyIds(new Set());
  }, []);

  // グラフと注力施策一覧を画像としてダウンロード
  const handleDownloadImage = useCallback(async () => {
    if (!chartAndInitiativesRef.current) {
      alert('ダウンロードするコンテンツが見つかりません。');
      return;
    }

    // ローディング表示（オプション）
    const originalCursor = document.body.style.cursor;
    
    try {
      document.body.style.cursor = 'wait';

      // html2canvasでキャプチャ
      const canvas = await html2canvas(chartAndInitiativesRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 高解像度
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
      });

      // PNGとしてダウンロード
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('画像の生成に失敗しました。');
          document.body.style.cursor = originalCursor;
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const themeTitle = selectedTheme?.title || 'ダッシュボード';
        const sanitizedTitle = themeTitle.replace(/[<>:"/\\|?*]/g, '_'); // ファイル名に使えない文字を置換
        link.href = url;
        link.download = `${sanitizedTitle}_グラフと注力施策一覧_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);

        document.body.style.cursor = originalCursor;
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('画像ダウンロードエラー:', error);
      alert('画像のダウンロードに失敗しました。');
      document.body.style.cursor = originalCursor;
    }
  }, [selectedTheme]);

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
        <ViewModeSelector 
          selectedTypeFilter={selectedTypeFilter}
          onTypeFilterChange={handleTypeFilterChange}
        />

        {viewMode === 'company' && (
          <CompanyModeFilters
            level1And2Orgs={level1And2Orgs}
            filteredOrgIds={filteredOrgIds}
            hasActiveFilters={hasActiveFilters}
            filterCount={filterCount}
            onOrgFilterToggle={handleOrgFilterToggle}
            onOpenFilterModal={() => setShowFilterModal(true)}
            onClearFilters={handleClearFilters}
          />
        )}

        {hierarchyLevels.length > 0 && (
          <OrganizationLevelSelector
            hierarchyLevels={hierarchyLevels}
            selectedLevel={selectedLevel}
            hasActiveFilters={hasActiveFilters}
            filterCount={filterCount}
            onLevelChange={handleLevelChange}
            onOpenFilterModal={() => setShowFilterModal(true)}
            onClearFilters={handleClearFilters}
          />
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

        {viewMode === 'organization' && selectedLevelOrgs.length === 0 && selectedLevel !== null && (
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

        {selectedTypeFilter === 'company' && selectedLevelCompanies.length === 0 && (
          <div style={{
            padding: '16px',
            backgroundColor: '#FFFBF0',
            border: '1.5px solid #FCD34D',
            borderRadius: '8px',
            color: '#92400E',
            fontSize: '14px',
            marginBottom: '24px',
          }}>
            事業会社が存在しません。
          </div>
        )}

        {chartData.length > 0 && (
          <StatisticsCards
            selectedTypeFilter={selectedTypeFilter}
            filteredThemes={filteredThemes}
            filteredThemeIds={filteredThemeIds}
            selectedLevelOrgs={selectedLevelOrgs}
            selectedLevelCompanies={selectedLevelCompanies}
            filteredOrgIds={filteredOrgIds}
            filteredInitiativeCount={filteredInitiativeCount}
          />
        )}

        <div ref={chartAndInitiativesRef}>
          <DashboardChart
            chartData={chartData}
            filteredThemes={filteredThemes}
            selectedTypeFilter={selectedTypeFilter}
            selectedLevel={selectedLevel}
            viewMode={viewMode}
            onChartSignal={handleChartSignal}
          />
          {chartData.length > 0 && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              fontSize: '14px',
            }}>
              <InitiativeList
                selectedTypeFilter={selectedTypeFilter}
                selectedTheme={selectedTheme || null}
                selectedThemeInitiatives={selectedThemeInitiatives}
                selectedThemeCompanyInitiatives={selectedThemeCompanyInitiatives}
                selectedLevelOrgs={selectedLevelOrgs}
                orgIdsWithDescendants={orgIdsWithDescendants}
                orgTree={orgTree}
                onDownloadImage={handleDownloadImage}
              />
            </div>
          )}
        </div>

        <FilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          viewMode={viewMode}
          selectedTypeFilter={selectedTypeFilter}
          hierarchyLevels={hierarchyLevels}
          orgTree={orgTree}
          themes={themes}
          filteredOrgIds={filteredOrgIds}
          filteredThemeIds={filteredThemeIds}
          onOrgFilterChange={setFilteredOrgIds}
          onThemeFilterChange={setFilteredThemeIds}
        />
      </div>
    </Layout>
  );
}

