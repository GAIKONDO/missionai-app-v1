'use client';

type DashboardViewMode = 'all' | 'organization' | 'company' | 'person';

interface ViewModeSelectorProps {
  selectedTypeFilter: 'all' | 'organization' | 'company' | 'person';
  onTypeFilterChange: (filter: 'all' | 'organization' | 'company' | 'person') => void;
}

export function ViewModeSelector({ selectedTypeFilter, onTypeFilterChange }: ViewModeSelectorProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
      }}>
        <button
          type="button"
          onClick={() => onTypeFilterChange('all')}
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
          }}
        >
          すべて
        </button>
        <button
          type="button"
          onClick={() => onTypeFilterChange('organization')}
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
          }}
        >
          組織
        </button>
        <button
          type="button"
          onClick={() => onTypeFilterChange('company')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: selectedTypeFilter === 'company' ? '600' : '400',
            color: selectedTypeFilter === 'company' ? '#10B981' : '#1A1A1A',
            backgroundColor: selectedTypeFilter === 'company' ? '#ECFDF5' : '#FFFFFF',
            border: selectedTypeFilter === 'company' ? '2px solid #10B981' : '1.5px solid #E0E0E0',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
        >
          事業会社
        </button>
        <button
          type="button"
          onClick={() => onTypeFilterChange('person')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: selectedTypeFilter === 'person' ? '600' : '400',
            color: selectedTypeFilter === 'person' ? '#A855F7' : '#1A1A1A',
            backgroundColor: selectedTypeFilter === 'person' ? '#F5F3FF' : '#FFFFFF',
            border: selectedTypeFilter === 'person' ? '2px solid #A855F7' : '1.5px solid #E0E0E0',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
        >
          個人
        </button>
      </div>
    </div>
  );
}

