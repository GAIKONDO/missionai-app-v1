'use client';

import type { HierarchyLevel } from '../../utils/organizationUtils';

interface OrganizationLevelSelectorProps {
  hierarchyLevels: HierarchyLevel[];
  selectedLevel: number | null;
  hasActiveFilters: boolean;
  filterCount: number;
  onLevelChange: (level: number) => void;
  onOpenFilterModal: () => void;
  onClearFilters: () => void;
}

export function OrganizationLevelSelector({
  hierarchyLevels,
  selectedLevel,
  hasActiveFilters,
  filterCount,
  onLevelChange,
  onOpenFilterModal,
  onClearFilters,
}: OrganizationLevelSelectorProps) {
  if (hierarchyLevels.length === 0) return null;

  return (
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
            onClick={onOpenFilterModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              color: hasActiveFilters ? '#4262FF' : '#6B7280',
              backgroundColor: hasActiveFilters ? '#F0F4FF' : '#FFFFFF',
              border: hasActiveFilters ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
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
            {hasActiveFilters && (
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
                {filterCount}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
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
            onClick={() => onLevelChange(levelData.level)}
            style={{
              padding: '10px 20px',
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
  );
}

