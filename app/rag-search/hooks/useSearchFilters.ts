import { useState, useEffect } from 'react';
import type { FilterPreset } from '../types';

export function useSearchFilters() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [relationTypeFilter, setRelationTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<'none' | 'created' | 'updated'>('none');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');
  const [savedFilterPresets, setSavedFilterPresets] = useState<FilterPreset[]>([]);
  const [showPresetMenu, setShowPresetMenu] = useState(false);

  // フィルタープリセットの読み込み
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedPresets = localStorage.getItem('rag_search_filter_presets');
      if (savedPresets) {
        const presets = JSON.parse(savedPresets) as FilterPreset[];
        setSavedFilterPresets(presets);
      }
    } catch (error) {
      console.error('フィルタープリセットの読み込みエラー:', error);
    }
  }, []);

  // フィルター状態をリセット
  const resetFilters = () => {
    setSelectedOrganizationId('');
    setEntityTypeFilter('all');
    setRelationTypeFilter('all');
    setDateFilterType('none');
    setDateRangeStart('');
    setDateRangeEnd('');
    setFilterLogic('AND');
  };

  // フィルター状態を取得（検索用）
  const getFilterParams = () => {
    return {
      organizationId: selectedOrganizationId || undefined,
      entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
      relationType: relationTypeFilter !== 'all' ? relationTypeFilter : undefined,
      dateFilterType,
      dateRangeStart: dateRangeStart || undefined,
      dateRangeEnd: dateRangeEnd || undefined,
      filterLogic,
    };
  };

  // 日付フィルターを検索用の形式に変換
  const getDateFilters = () => {
    const dateFilters: {
      createdAfter?: string;
      createdBefore?: string;
      updatedAfter?: string;
      updatedBefore?: string;
    } = {};
    
    if (dateFilterType === 'created' && dateRangeStart) {
      dateFilters.createdAfter = dateRangeStart;
    }
    if (dateFilterType === 'created' && dateRangeEnd) {
      dateFilters.createdBefore = dateRangeEnd;
    }
    if (dateFilterType === 'updated' && dateRangeStart) {
      dateFilters.updatedAfter = dateRangeStart;
    }
    if (dateFilterType === 'updated' && dateRangeEnd) {
      dateFilters.updatedBefore = dateRangeEnd;
    }
    
    return dateFilters;
  };

  // 検索用フィルターを取得（日付フィルターを含む）
  const getSearchFilters = (overrideFilters?: {
    organizationId?: string;
    entityType?: string;
    relationType?: string;
  }) => {
    const filterParams = getFilterParams();
    const dateFilters = getDateFilters();
    
    return {
      organizationId: overrideFilters?.organizationId || filterParams.organizationId,
      entityType: overrideFilters?.entityType || filterParams.entityType,
      relationType: overrideFilters?.relationType || filterParams.relationType,
      ...dateFilters,
      filterLogic: filterParams.filterLogic,
    };
  };

  return {
    selectedOrganizationId,
    setSelectedOrganizationId,
    entityTypeFilter,
    setEntityTypeFilter,
    relationTypeFilter,
    setRelationTypeFilter,
    showFilters,
    setShowFilters,
    dateFilterType,
    setDateFilterType,
    dateRangeStart,
    setDateRangeStart,
    dateRangeEnd,
    setDateRangeEnd,
    filterLogic,
    setFilterLogic,
    savedFilterPresets,
    setSavedFilterPresets,
    showPresetMenu,
    setShowPresetMenu,
    resetFilters,
    getFilterParams,
    getDateFilters,
    getSearchFilters,
  };
}

