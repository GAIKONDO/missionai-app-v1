'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOrgTreeFromDb, getAllOrganizationsFromTree, type OrgNodeData } from '@/lib/orgApi';
import { getThemes, getFocusInitiatives, type Theme, type FocusInitiative } from '@/lib/orgApi';
import { extractOrganizationsByDepth, type HierarchyLevel } from '../utils/organizationUtils';

// 開発環境でのみログを有効化するヘルパー関数
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

interface UseDashboardDataProps {
  selectedTypeFilter: 'all' | 'organization' | 'company' | 'person';
  selectedLevel: number | null;
  setSelectedLevel: (level: number | null) => void;
}

export function useDashboardData({
  selectedTypeFilter,
  selectedLevel,
  setSelectedLevel,
}: UseDashboardDataProps) {
  const [orgTree, setOrgTree] = useState<OrgNodeData | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [initiatives, setInitiatives] = useState<FocusInitiative[]>([]);
  const [hierarchyLevels, setHierarchyLevels] = useState<HierarchyLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // データ取得関数
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      devLog('📖 [ダッシュボード] データ読み込み開始', { selectedTypeFilter });

      // 組織ツリーとテーマは常に取得（事業会社モードでも階層レベル判定に必要）
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

      // 階層レベルは組織ツリーから計算（typeフィルターを適用）
      const typeFilter: 'all' | 'organization' | 'company' | 'person' | undefined = selectedTypeFilter === 'all' ? undefined : selectedTypeFilter;
      const levels = extractOrganizationsByDepth(orgTreeData, typeFilter);
      setHierarchyLevels(levels);

      // 選択された階層レベルが存在しない場合、最初の階層レベルを選択
      if (selectedLevel === null || !levels.find(l => l.level === selectedLevel)) {
        if (levels.length > 0) {
          setSelectedLevel(levels[0].level);
        }
      }

      // 全組織の注力施策を取得（typeフィルターを適用）
      const allOrgs = getAllOrganizationsFromTree(orgTreeData);
      const filteredOrgs = typeFilter
        ? allOrgs.filter(org => {
            const orgType = (org as any).type || 'organization';
            return orgType === typeFilter;
          })
        : allOrgs;
      
      devLog('📖 [ダッシュボード] 全組織数:', allOrgs.length, 'フィルター後:', filteredOrgs.length);

      // 並列で各組織の施策を取得（パフォーマンス向上）
      const initiativePromises = filteredOrgs.map(org => getFocusInitiatives(org.id));
      const initiativeResults = await Promise.allSettled(initiativePromises);

      const allInitiatives: FocusInitiative[] = [];
      initiativeResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allInitiatives.push(...result.value);
        } else {
          devWarn(`⚠️ [ダッシュボード] 組織「${filteredOrgs[index].name}」の施策取得エラー:`, result.reason);
        }
      });

      setInitiatives(allInitiatives);
      devLog('✅ [ダッシュボード] データ読み込み完了:', {
        themes: themesData.length,
        initiatives: allInitiatives.length,
        hierarchyLevels: levels.length,
        typeFilter: selectedTypeFilter,
      });
    } catch (err: any) {
      console.error('❌ [ダッシュボード] データ読み込みエラー:', err);
      setError(`データの読み込みに失敗しました: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  }, [selectedTypeFilter, selectedLevel, setSelectedLevel]);

  // データ取得（selectedTypeFilter変更時）
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ページがフォーカスされたときにデータを再取得
  useEffect(() => {
    const handleFocus = () => {
      devLog('🔄 [ダッシュボード] ページがフォーカスされました。データを再取得します。');
      loadData();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadData]);

  return {
    orgTree,
    themes,
    initiatives,
    hierarchyLevels,
    loading,
    error,
    setOrgTree,
    setThemes,
    setInitiatives,
    setHierarchyLevels,
    setError,
    reloadData: loadData,
  };
}

