import type { OrgNodeData } from '@/components/OrgChart';

interface FilterPanelProps {
  orgData: OrgNodeData | null;
  searchQuery: string;
  searchInput: string;
  setSearchQuery: (query: string) => void;
  setSearchInput: (input: string) => void;
  selectedRootOrgId: string | null;
  setSelectedRootOrgId: (id: string | null) => void;
  isFilterExpanded: boolean;
  setIsFilterExpanded: (expanded: boolean) => void;
  getRootOrganizations: () => OrgNodeData[];
  onResetFilters: () => void;
}

export default function FilterPanel({
  orgData,
  searchQuery,
  searchInput,
  setSearchQuery,
  setSearchInput,
  selectedRootOrgId,
  setSelectedRootOrgId,
  isFilterExpanded,
  setIsFilterExpanded,
  getRootOrganizations,
  onResetFilters,
}: FilterPanelProps) {
  const rootOrganizations = getRootOrganizations();
  const hasOrgData = orgData !== null;

  return (
    <>
      {/* ルート組織選択タブとフィルターボタン */}
      {hasOrgData && (
        <div style={{ 
          marginTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          {/* タブ風のルート組織選択 */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              borderBottom: '1px solid #E0E0E0',
              overflowX: 'auto',
            }}>
              <button
                onClick={() => setSelectedRootOrgId(null)}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  background: 'transparent',
                  color: selectedRootOrgId === null ? '#4262FF' : '#808080',
                  borderBottom: selectedRootOrgId === null ? '2px solid #4262FF' : '2px solid transparent',
                  cursor: 'pointer',
                  fontWeight: selectedRootOrgId === null ? 600 : 400,
                  fontSize: '14px',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  transition: 'all 150ms',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (selectedRootOrgId !== null) {
                    e.currentTarget.style.color = '#1A1A1A';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedRootOrgId !== null) {
                    e.currentTarget.style.color = '#808080';
                  }
                }}
              >
                すべて表示
              </button>
              {rootOrganizations.map((rootOrg) => (
                <button
                  key={rootOrg.id}
                  onClick={() => setSelectedRootOrgId(rootOrg.id || null)}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    background: 'transparent',
                    color: selectedRootOrgId === rootOrg.id ? '#4262FF' : '#808080',
                    borderBottom: selectedRootOrgId === rootOrg.id ? '2px solid #4262FF' : '2px solid transparent',
                    cursor: 'pointer',
                    fontWeight: selectedRootOrgId === rootOrg.id ? 600 : 400,
                    fontSize: '14px',
                    fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    transition: 'all 150ms',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedRootOrgId !== rootOrg.id) {
                      e.currentTarget.style.color = '#1A1A1A';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedRootOrgId !== rootOrg.id) {
                      e.currentTarget.style.color = '#808080';
                    }
                  }}
                >
                  {rootOrg.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* フィルターボタン */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #BAE6FD',
                backgroundColor: '#fff',
                color: '#0369A1',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E0F2FE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
              }}
            >
              {isFilterExpanded ? '▼' : '▶'} フィルター
              {searchQuery && (
                <span style={{ 
                  marginLeft: '4px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  backgroundColor: '#3B82F6',
                  color: '#fff',
                  fontSize: '11px',
                }}>
                  適用中
                </span>
              )}
            </button>
            {searchQuery && (
              <button
                onClick={onResetFilters}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #BAE6FD',
                  backgroundColor: '#fff',
                  color: '#0369A1',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E0F2FE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
              >
                🔄 リセット
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

