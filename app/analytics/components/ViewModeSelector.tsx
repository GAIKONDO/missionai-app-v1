type ViewMode = 'diagram' | 'bubble';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function ViewModeSelector({ viewMode, onViewModeChange }: ViewModeSelectorProps) {
  return (
    <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
      <button
        type="button"
        onClick={() => onViewModeChange('diagram')}
        style={{
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: viewMode === 'diagram' ? '600' : '400',
          color: viewMode === 'diagram' ? '#FFFFFF' : '#1A1A1A',
          backgroundColor: viewMode === 'diagram' ? '#4262FF' : '#FFFFFF',
          border: '1.5px solid',
          borderColor: viewMode === 'diagram' ? '#4262FF' : '#E0E0E0',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
        onMouseEnter={(e) => {
          if (viewMode !== 'diagram') {
            e.currentTarget.style.borderColor = '#C4C4C4';
            e.currentTarget.style.backgroundColor = '#FAFAFA';
          }
        }}
        onMouseLeave={(e) => {
          if (viewMode !== 'diagram') {
            e.currentTarget.style.borderColor = '#E0E0E0';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }
        }}
      >
        2D関係性図
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('bubble')}
        style={{
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: viewMode === 'bubble' ? '600' : '400',
          color: viewMode === 'bubble' ? '#FFFFFF' : '#1A1A1A',
          backgroundColor: viewMode === 'bubble' ? '#4262FF' : '#FFFFFF',
          border: '1.5px solid',
          borderColor: viewMode === 'bubble' ? '#4262FF' : '#E0E0E0',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
        onMouseEnter={(e) => {
          if (viewMode !== 'bubble') {
            e.currentTarget.style.borderColor = '#C4C4C4';
            e.currentTarget.style.backgroundColor = '#FAFAFA';
          }
        }}
        onMouseLeave={(e) => {
          if (viewMode !== 'bubble') {
            e.currentTarget.style.borderColor = '#E0E0E0';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }
        }}
      >
        バブルチャート
      </button>
    </div>
  );
}

