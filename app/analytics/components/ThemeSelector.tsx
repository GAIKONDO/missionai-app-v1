import type { Theme } from '@/lib/orgApi';

interface ThemeSelectorProps {
  themes: Theme[];
  selectedThemeId: string | null;
  onSelect: (themeId: string | null) => void;
}

export default function ThemeSelector({ 
  themes, 
  selectedThemeId, 
  onSelect
}: ThemeSelectorProps) {
  return (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '8px',
      width: '100%',
      alignItems: 'center',
    }}>
      <button
        type="button"
        onClick={() => onSelect(null)}
        style={{
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: selectedThemeId === null ? '600' : '400',
          color: selectedThemeId === null ? '#4262FF' : '#1A1A1A',
          backgroundColor: selectedThemeId === null ? '#F0F4FF' : '#FFFFFF',
          border: selectedThemeId === null ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          if (selectedThemeId !== null) {
            e.currentTarget.style.borderColor = '#C4C4C4';
            e.currentTarget.style.backgroundColor = '#FAFAFA';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedThemeId !== null) {
            e.currentTarget.style.borderColor = '#E0E0E0';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }
        }}
      >
        すべて表示
      </button>

      {themes.map((theme) => {
        const isSelected = theme.id === selectedThemeId;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onSelect(theme.id)}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: isSelected ? '600' : '400',
              color: isSelected ? '#4262FF' : '#1A1A1A',
              backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
              border: isSelected ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = '#C4C4C4';
                e.currentTarget.style.backgroundColor = '#FAFAFA';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = '#E0E0E0';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }
            }}
          >
            <span>{theme.title}</span>
            {isSelected && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M13 4L6 11L3 8"
                  stroke="#4262FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

