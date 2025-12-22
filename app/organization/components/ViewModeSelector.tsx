type ViewMode = 'hierarchy' | 'bubble' | 'finder';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function ViewModeSelector({ viewMode, onViewModeChange }: ViewModeSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={() => onViewModeChange('hierarchy')}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: viewMode === 'hierarchy' ? '#1E40AF' : '#E5E7EB',
          color: viewMode === 'hierarchy' ? '#ffffff' : '#6B7280',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: viewMode === 'hierarchy' ? '600' : '400',
          transition: 'all 0.2s',
          fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
        }}
        onMouseEnter={(e) => {
          if (viewMode !== 'hierarchy') {
            e.currentTarget.style.backgroundColor = '#D1D5DB';
          }
        }}
        onMouseLeave={(e) => {
          if (viewMode !== 'hierarchy') {
            e.currentTarget.style.backgroundColor = '#E5E7EB';
          }
        }}
      >
        階層表示
      </button>
      <button
        onClick={() => onViewModeChange('bubble')}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: viewMode === 'bubble' ? '#1E40AF' : '#E5E7EB',
          color: viewMode === 'bubble' ? '#ffffff' : '#6B7280',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: viewMode === 'bubble' ? '600' : '400',
          transition: 'all 0.2s',
          fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
        }}
        onMouseEnter={(e) => {
          if (viewMode !== 'bubble') {
            e.currentTarget.style.backgroundColor = '#D1D5DB';
          }
        }}
        onMouseLeave={(e) => {
          if (viewMode !== 'bubble') {
            e.currentTarget.style.backgroundColor = '#E5E7EB';
          }
        }}
      >
        バブル表示
      </button>
      <button
        onClick={() => onViewModeChange('finder')}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: viewMode === 'finder' ? '#3B82F6' : '#10B981',
          color: '#ffffff',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          transition: 'all 0.2s',
          fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#059669';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = viewMode === 'finder' ? '#3B82F6' : '#10B981';
        }}
      >
        {viewMode === 'finder' ? '✓ Finder表示' : 'Finder表示'}
      </button>
    </div>
  );
}

