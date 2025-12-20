'use client';

import type { FilterPreset } from '../types';

interface SearchFiltersProps {
  showFilters: boolean;
  organizations: Array<{ id: string; name: string; title?: string; type?: string }>;
  selectedOrganizationId: string;
  onSelectedOrganizationIdChange: (id: string) => void;
  entityTypeFilter: string;
  onEntityTypeFilterChange: (type: string) => void;
  relationTypeFilter: string;
  onRelationTypeFilterChange: (type: string) => void;
  dateFilterType: 'none' | 'created' | 'updated';
  onDateFilterTypeChange: (type: 'none' | 'created' | 'updated') => void;
  dateRangeStart: string;
  onDateRangeStartChange: (date: string) => void;
  dateRangeEnd: string;
  onDateRangeEndChange: (date: string) => void;
  filterLogic: 'AND' | 'OR';
  onFilterLogicChange: (logic: 'AND' | 'OR') => void;
  savedFilterPresets: FilterPreset[];
  onSavedFilterPresetsChange: (presets: FilterPreset[]) => void;
  showPresetMenu: boolean;
  onShowPresetMenuChange: (show: boolean) => void;
  entityTypeLabels: Record<string, string>;
  relationTypeLabels: Record<string, string>;
}

export default function SearchFilters({
  showFilters,
  organizations,
  selectedOrganizationId,
  onSelectedOrganizationIdChange,
  entityTypeFilter,
  onEntityTypeFilterChange,
  relationTypeFilter,
  onRelationTypeFilterChange,
  dateFilterType,
  onDateFilterTypeChange,
  dateRangeStart,
  onDateRangeStartChange,
  dateRangeEnd,
  onDateRangeEndChange,
  filterLogic,
  onFilterLogicChange,
  savedFilterPresets,
  onSavedFilterPresetsChange,
  showPresetMenu,
  onShowPresetMenuChange,
  entityTypeLabels,
  relationTypeLabels,
}: SearchFiltersProps) {
  if (!showFilters) return null;

  const handleSavePreset = () => {
    const presetName = prompt('プリセット名を入力してください:');
    if (presetName) {
      const preset: FilterPreset = {
        name: presetName,
        filters: {
          organizationId: selectedOrganizationId || undefined,
          entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
          relationType: relationTypeFilter !== 'all' ? relationTypeFilter : undefined,
          dateFilterType,
          dateRangeStart: dateRangeStart || undefined,
          dateRangeEnd: dateRangeEnd || undefined,
          filterLogic,
        },
      };
      const updated = [...savedFilterPresets, preset].slice(0, 10);
      onSavedFilterPresetsChange(updated);
      localStorage.setItem('rag_search_filter_presets', JSON.stringify(updated));
      alert('プリセットを保存しました');
    }
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    onSelectedOrganizationIdChange(preset.filters.organizationId || '');
    onEntityTypeFilterChange(preset.filters.entityType || 'all');
    onRelationTypeFilterChange(preset.filters.relationType || 'all');
    onDateFilterTypeChange(preset.filters.dateFilterType || 'none');
    onDateRangeStartChange(preset.filters.dateRangeStart || '');
    onDateRangeEndChange(preset.filters.dateRangeEnd || '');
    onFilterLogicChange(preset.filters.filterLogic || 'AND');
    onShowPresetMenuChange(false);
  };

  const handleDeletePreset = (index: number) => {
    if (confirm(`「${savedFilterPresets[index].name}」を削除しますか？`)) {
      const updated = savedFilterPresets.filter((_, i) => i !== index);
      onSavedFilterPresetsChange(updated);
      localStorage.setItem('rag_search_filter_presets', JSON.stringify(updated));
      onShowPresetMenuChange(false);
    }
  };

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#F9FAFB',
      borderRadius: '8px',
      border: '1px solid #E5E7EB',
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
          組織
        </label>
        <select
          value={selectedOrganizationId}
          onChange={(e) => onSelectedOrganizationIdChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <option value="">すべての組織</option>
          {organizations.map(org => (
            <option key={org.id} value={org.id}>
              {org.name} {org.type === 'company' ? '(事業会社)' : org.type === 'person' ? '(個人)' : ''}
            </option>
          ))}
        </select>
      </div>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
          エンティティタイプ
        </label>
        <select
          value={entityTypeFilter}
          onChange={(e) => onEntityTypeFilterChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <option value="all">すべて</option>
          {Object.entries(entityTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
          リレーションタイプ
        </label>
        <select
          value={relationTypeFilter}
          onChange={(e) => onRelationTypeFilterChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <option value="all">すべて</option>
          {Object.entries(relationTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      
      {/* 高度なフィルター */}
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {/* 日付範囲フィルター */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '120px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
              日付フィルター
            </label>
            <select
              value={dateFilterType}
              onChange={(e) => {
                const value = e.target.value as 'none' | 'created' | 'updated';
                onDateFilterTypeChange(value);
                if (value === 'none') {
                  onDateRangeStartChange('');
                  onDateRangeEndChange('');
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="none">なし</option>
              <option value="created">作成日</option>
              <option value="updated">更新日</option>
            </select>
          </div>
          
          {dateFilterType !== 'none' && (
            <>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
                  開始日
                </label>
                <input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => onDateRangeStartChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
                  終了日
                </label>
                <input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => onDateRangeEndChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>
            </>
          )}
        </div>
        
        {/* フィルターロジックとプリセット */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '120px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
              条件の組み合わせ
            </label>
            <select
              value={filterLogic}
              onChange={(e) => onFilterLogicChange(e.target.value as 'AND' | 'OR')}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="AND">AND（すべて一致）</option>
              <option value="OR">OR（いずれか一致）</option>
            </select>
          </div>
          
          {/* プリセット保存・読み込み */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <button
              onClick={handleSavePreset}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              プリセット保存
            </button>
            
            {savedFilterPresets.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => onShowPresetMenuChange(!showPresetMenu)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#F3F4F6',
                    color: '#6B7280',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  プリセット読み込み ▼
                </button>
                
                {showPresetMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    minWidth: '200px',
                  }}>
                    {savedFilterPresets.map((preset, index) => (
                      <div key={index}>
                        <button
                          onClick={() => handleLoadPreset(preset)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            textAlign: 'left',
                            backgroundColor: 'transparent',
                            border: 'none',
                            fontSize: '14px',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F3F4F6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {preset.name}
                        </button>
                        <button
                          onClick={() => handleDeletePreset(index)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#FEF2F2',
                            color: '#991B1B',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            marginLeft: '8px',
                            marginBottom: '4px',
                          }}
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

