'use client';

import type { OrgWithDepth } from '../../utils/organizationUtils';

interface CompanyModeFiltersProps {
  level1And2Orgs: OrgWithDepth[];
  filteredOrgIds: Set<string>;
  hasActiveFilters: boolean;
  filterCount: number;
  onOrgFilterToggle: (orgId: string) => void;
  onOpenFilterModal: () => void;
  onClearFilters: () => void;
}

export function CompanyModeFilters({
  level1And2Orgs,
  filteredOrgIds,
  hasActiveFilters,
  filterCount,
  onOrgFilterToggle,
  onOpenFilterModal,
  onClearFilters,
}: CompanyModeFiltersProps) {
  if (level1And2Orgs.length === 0) return null;

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
          組織でフィルター（事業会社に紐づけられている組織）
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
        {level1And2Orgs.map(org => {
          const isSelected = filteredOrgIds.has(org.id);
          return (
            <button
              key={org.id}
              type="button"
              onClick={() => onOrgFilterToggle(org.id)}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: isSelected ? '600' : '400',
                color: isSelected ? '#4262FF' : '#1A1A1A',
                backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
                border: isSelected ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {org.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

