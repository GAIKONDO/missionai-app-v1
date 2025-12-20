'use client';

import { useMemo } from 'react';
import OrgChart from '@/components/OrgChart';
import type { OrgNodeData, MemberInfo } from '@/components/OrgChart';

interface HierarchyViewProps {
  orgData: OrgNodeData | null;
  filteredOrgData: OrgNodeData | null;
  selectedNode: OrgNodeData | null;
  expandedMembers: Set<string>;
  setExpandedMembers: (set: Set<string>) => void;
  onNodeClick: (node: OrgNodeData, event: MouseEvent) => void;
  onEditClick: () => void;
  onNavigateToDetail: () => void;
  onAddOrg: () => Promise<void>;
  error: string | null;
}

export default function HierarchyView({
  orgData,
  filteredOrgData,
  selectedNode,
  expandedMembers,
  setExpandedMembers,
  onNodeClick,
  onEditClick,
  onNavigateToDetail,
  onAddOrg,
  error,
}: HierarchyViewProps) {
  const displayData = filteredOrgData || orgData;

  if (!displayData) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '40px',
        textAlign: 'center',
        color: '#6B7280',
      }}>
        <div>
          <p style={{ fontSize: '16px', marginBottom: '8px', color: '#374151' }}>
            {error || '組織データが見つかりませんでした。'}
          </p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
            最初の組織を追加してください。
          </p>
          <button
            onClick={onAddOrg}
            style={{
              padding: '12px 24px',
              backgroundColor: '#10B981',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#10B981';
            }}
          >
            <span style={{ fontSize: '20px' }}>+</span>
            組織を追加
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      <OrgChart
        data={displayData}
        onNodeClick={onNodeClick}
        selectedNodeId={selectedNode?.id || null}
      />
    </div>
  );
}
