import type { OrgNodeData } from '@/components/OrgChart';
import { findOrganizationById } from '@/lib/orgApi';

interface SearchCandidatesProps {
  candidates: Array<{ org: OrgNodeData; score: number }>;
  selectedRootOrgTree: OrgNodeData | null;
  onCandidateClick: (node: OrgNodeData, event: MouseEvent) => Promise<void>;
  onClearSearch: () => void;
}

export default function SearchCandidates({
  candidates,
  selectedRootOrgTree,
  onCandidateClick,
  onClearSearch,
}: SearchCandidatesProps) {
  if (!selectedRootOrgTree || candidates.length === 0) {
    return null;
  }

  return (
    <div style={{ 
      marginTop: '12px',
      maxHeight: '300px',
      overflowY: 'auto',
      border: '1px solid #E5E7EB',
      borderRadius: '6px',
      backgroundColor: '#fff',
    }}>
      <div style={{ 
        padding: '8px 12px',
        backgroundColor: '#F9FAFB',
        borderBottom: '1px solid #E5E7EB',
        fontSize: '12px',
        fontWeight: '500',
        color: '#6B7280',
      }}>
        検索候補 ({candidates.length}件)
      </div>
      {candidates.map((candidate, index) => {
        const foundOrg = findOrganizationById(selectedRootOrgTree, candidate.org.id || '');
        if (!foundOrg) return null;

        return (
          <div
            key={candidate.org.id || index}
            onClick={async () => {
              await onCandidateClick(foundOrg, new MouseEvent('click'));
              onClearSearch();
            }}
            style={{
              padding: '10px 12px',
              borderBottom: index < candidates.length - 1 ? '1px solid #F3F4F6' : 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fff';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#1F2937' }}>
                  {candidate.org.name}
                </div>
                {candidate.org.title && (
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                    {candidate.org.title}
                  </div>
                )}
              </div>
              <div style={{ 
                fontSize: '11px',
                color: '#9CA3AF',
                padding: '2px 6px',
                backgroundColor: '#F3F4F6',
                borderRadius: '4px',
              }}>
                {Math.round(candidate.score * 100)}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

