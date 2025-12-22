interface SearchBarProps {
  searchInput: string;
  searchQuery: string;
  setSearchInput: (input: string) => void;
  setSearchQuery: (query: string) => void;
}

export default function SearchBar({
  searchInput,
  searchQuery,
  setSearchInput,
  setSearchQuery,
}: SearchBarProps) {
  return (
    <div style={{ flex: '1', minWidth: '250px' }}>
      <label style={{ 
        display: 'block', 
        fontSize: '13px', 
        fontWeight: '500', 
        color: '#374151', 
        marginBottom: '6px' 
      }}>
        組織名で検索
      </label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', flex: '1' }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearchQuery(searchInput.trim());
              }
            }}
            placeholder="組織名、英語名、説明、メンバー名で検索..."
            style={{
              width: '100%',
              padding: '8px 36px 8px 12px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#D1D5DB';
            }}
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
              }}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6B7280',
                fontSize: '18px',
                lineHeight: '1',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#6B7280';
              }}
              title="検索をクリア"
            >
              ×
            </button>
          )}
          {!searchInput && (
            <span style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9CA3AF',
              fontSize: '16px',
              pointerEvents: 'none',
            }}>
              🔍
            </span>
          )}
        </div>
        <button
          onClick={() => setSearchQuery(searchInput.trim())}
          disabled={!searchInput.trim() && !searchQuery}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: searchInput.trim() || searchQuery ? '#3B82F6' : '#D1D5DB',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '500',
            cursor: searchInput.trim() || searchQuery ? 'pointer' : 'not-allowed',
            fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
            whiteSpace: 'nowrap',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (searchInput.trim() || searchQuery) {
              e.currentTarget.style.backgroundColor = '#2563EB';
            }
          }}
          onMouseLeave={(e) => {
            if (searchInput.trim() || searchQuery) {
              e.currentTarget.style.backgroundColor = '#3B82F6';
            }
          }}
        >
          検索
        </button>
      </div>
    </div>
  );
}

