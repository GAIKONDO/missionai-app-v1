import type { OrgNodeData } from '@/components/OrgChart';

interface FilterResultsProps {
  orgData: OrgNodeData | null;
  filteredOrgData: OrgNodeData | null;
  searchQuery: string;
  selectedRootOrgId: string | null;
  searchCandidates: Array<{ org: OrgNodeData; score: number }>;
  getRootOrganizations: () => OrgNodeData[];
}

export default function FilterResults({
  orgData,
  filteredOrgData,
  searchQuery,
  selectedRootOrgId,
  searchCandidates,
  getRootOrganizations,
}: FilterResultsProps) {
  if (!searchQuery && !selectedRootOrgId) {
    return null;
  }

  const hasError = searchQuery && orgData && !filteredOrgData && searchCandidates.length === 0;

  return (
    <div style={{ 
      marginTop: '12px', 
      padding: '10px 14px', 
      backgroundColor: hasError ? '#FEF2F2' : '#EFF6FF', 
      borderRadius: '6px',
      fontSize: '13px',
      color: hasError ? '#DC2626' : '#1E40AF',
      border: `1px solid ${hasError ? '#FECACA' : '#BFDBFE'}`,
    }}>
      {orgData && filteredOrgData ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '500' }}>検索結果:</span>
          {selectedRootOrgId && (
            <span style={{ 
              padding: '2px 8px',
              backgroundColor: '#DBEAFE',
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              組織: {getRootOrganizations().find(org => org.id === selectedRootOrgId)?.name || ''}
            </span>
          )}
          {searchQuery && (
            <span style={{ 
              padding: '2px 8px',
              backgroundColor: '#DBEAFE',
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              「{searchQuery}」に一致
            </span>
          )}
        </div>
      ) : orgData && searchCandidates.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚠️</span>
          <span>「{searchQuery}」に一致する組織が見つかりませんでした</span>
        </div>
      ) : (
        <span>組織データがありません</span>
      )}
    </div>
  );
}

