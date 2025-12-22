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
  const hasMultipleRootOrgs = orgData && (orgData.id === 'virtual-root' || getRootOrganizations().length > 1);

  return (
    <>
      {/* ルート組織選択ボタンとフィルターボタン */}
      {hasMultipleRootOrgs && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          backgroundColor: '#F0F9FF', 
          borderRadius: '8px',
          border: '1px solid #BAE6FD',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: '500', 
                color: '#0369A1', 
                marginBottom: '8px' 
              }}>
                表示する組織を選択:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedRootOrgId(null)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #BAE6FD',
                    backgroundColor: selectedRootOrgId === null ? '#0EA5E9' : '#fff',
                    color: selectedRootOrgId === null ? '#fff' : '#0369A1',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedRootOrgId !== null) {
                      e.currentTarget.style.backgroundColor = '#E0F2FE';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedRootOrgId !== null) {
                      e.currentTarget.style.backgroundColor = '#fff';
                    }
                  }}
                >
                  すべて表示
                </button>
                {getRootOrganizations().map((rootOrg) => (
                  <button
                    key={rootOrg.id}
                    onClick={() => setSelectedRootOrgId(rootOrg.id || null)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #BAE6FD',
                      backgroundColor: selectedRootOrgId === rootOrg.id ? '#0EA5E9' : '#fff',
                      color: selectedRootOrgId === rootOrg.id ? '#fff' : '#0369A1',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedRootOrgId !== rootOrg.id) {
                        e.currentTarget.style.backgroundColor = '#E0F2FE';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedRootOrgId !== rootOrg.id) {
                        e.currentTarget.style.backgroundColor = '#fff';
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
        </div>
      )}
      
      {/* ルート組織が1つの場合、またはデータがない場合でもフィルターボタンを表示 */}
      {!hasMultipleRootOrgs && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          backgroundColor: '#F0F9FF', 
          borderRadius: '8px',
          border: '1px solid #BAE6FD',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

