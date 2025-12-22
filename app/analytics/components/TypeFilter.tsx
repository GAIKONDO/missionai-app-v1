type TypeFilterValue = 'all' | 'organization' | 'company' | 'person';

interface TypeFilterProps {
  selectedTypeFilter: TypeFilterValue;
  onFilterChange: (filter: TypeFilterValue) => void;
}

export default function TypeFilter({ selectedTypeFilter, onFilterChange }: TypeFilterProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
      }}>
        <button
          type="button"
          onClick={() => onFilterChange('all')}
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
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          すべて
        </button>
        <button
          type="button"
          onClick={() => onFilterChange('organization')}
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
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          組織
        </button>
        <button
          type="button"
          onClick={() => onFilterChange('company')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: selectedTypeFilter === 'company' ? '600' : '400',
            color: selectedTypeFilter === 'company' ? '#4262FF' : '#1A1A1A',
            backgroundColor: selectedTypeFilter === 'company' ? '#F0F4FF' : '#FFFFFF',
            border: selectedTypeFilter === 'company' ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 150ms',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          事業会社
        </button>
        <button
          type="button"
          onClick={() => onFilterChange('person')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: selectedTypeFilter === 'person' ? '600' : '400',
            color: selectedTypeFilter === 'person' ? '#4262FF' : '#1A1A1A',
            backgroundColor: selectedTypeFilter === 'person' ? '#F0F4FF' : '#FFFFFF',
            border: selectedTypeFilter === 'person' ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 150ms',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          個人
        </button>
      </div>
    </div>
  );
}

