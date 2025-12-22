/**
 * テーマ別施策分析タブコンテンツ
 */

'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { useDashboardCalculations } from '@/app/hooks/useDashboardCalculations';
import { ViewModeSelector } from './ViewModeSelector';
import { CompanyModeFilters } from './CompanyModeFilters';
import { OrganizationLevelSelector } from './OrganizationLevelSelector';
import { StatisticsCards } from './StatisticsCards';
import { DashboardChart } from './DashboardChart';
import { InitiativeList } from './InitiativeList';
import { FilterModal } from './FilterModal';
import type { OrgNodeData } from '@/lib/orgApi';
import type { Theme, FocusInitiative } from '@/lib/orgApi';
import type { HierarchyLevel } from '@/app/utils/organizationUtils';

interface ThemeInitiativeAnalysisTabProps {
  selectedTypeFilter: 'all' | 'organization' | 'company' | 'person';
  viewMode: 'all' | 'organization' | 'company' | 'person';
  selectedLevel: number | null;
  selectedThemeId: string | null;
  filteredOrgIds: Set<string>;
  filteredThemeIds: Set<string>;
  orgTree: OrgNodeData | null;
  themes: Theme[];
  initiatives: FocusInitiative[];
  hierarchyLevels: HierarchyLevel[];
  level1And2Orgs: any[];
  onTypeFilterChange: (filter: 'all' | 'organization' | 'company' | 'person') => void;
  onLevelChange: (level: number) => void;
  onOrgFilterToggle: (orgId: string) => void;
  onClearFilters: () => void;
  onSelectedThemeIdChange: (themeId: string | null) => void;
  onOrgFilterChange: (orgIds: Set<string>) => void;
  onThemeFilterChange: (themeIds: Set<string>) => void;
}

export function ThemeInitiativeAnalysisTab({
  selectedTypeFilter,
  viewMode,
  selectedLevel,
  selectedThemeId,
  filteredOrgIds,
  filteredThemeIds,
  orgTree,
  themes,
  initiatives,
  hierarchyLevels,
  level1And2Orgs,
  onTypeFilterChange,
  onLevelChange,
  onOrgFilterToggle,
  onClearFilters,
  onSelectedThemeIdChange,
  onOrgFilterChange,
  onThemeFilterChange,
}: ThemeInitiativeAnalysisTabProps) {
  const [showFilterModal, setShowFilterModal] = useState(false);

  // グラフと注力施策一覧を含むコンテナの参照
  const chartAndInitiativesRef = useRef<HTMLDivElement>(null);

  // 計算ロジックカスタムフック
  const {
    selectedLevelOrgs,
    selectedLevelCompanies,
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

  // グラフのクリックイベントハンドラー
  const handleChartSignal = useCallback((signalName: string, value: any) => {
    if (signalName === 'clicked_theme' && value && value.themeId) {
      onSelectedThemeIdChange(value.themeId);
    }
  }, [onSelectedThemeIdChange]);

  // フィルターが適用されているかチェック
  const hasActiveFilters = useMemo(() => {
    return filteredOrgIds.size > 0 || filteredThemeIds.size > 0;
  }, [filteredOrgIds, filteredThemeIds]);

  // フィルター数の計算
  const filterCount = useMemo(() => {
    return filteredOrgIds.size + filteredThemeIds.size;
  }, [filteredOrgIds, filteredThemeIds]);

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

  return (
    <>
      <ViewModeSelector 
        selectedTypeFilter={selectedTypeFilter}
        onTypeFilterChange={onTypeFilterChange}
      />

      {viewMode === 'company' && (
        <CompanyModeFilters
          level1And2Orgs={level1And2Orgs}
          filteredOrgIds={filteredOrgIds}
          hasActiveFilters={hasActiveFilters}
          filterCount={filterCount}
          onOrgFilterToggle={onOrgFilterToggle}
          onOpenFilterModal={() => setShowFilterModal(true)}
          onClearFilters={onClearFilters}
        />
      )}

      {hierarchyLevels.length > 0 && (
        <OrganizationLevelSelector
          hierarchyLevels={hierarchyLevels}
          selectedLevel={selectedLevel}
          hasActiveFilters={hasActiveFilters}
          filterCount={filterCount}
          onLevelChange={onLevelChange}
          onOpenFilterModal={() => setShowFilterModal(true)}
          onClearFilters={onClearFilters}
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
        onOrgFilterChange={onOrgFilterChange}
        onThemeFilterChange={onThemeFilterChange}
      />
    </>
  );
}

