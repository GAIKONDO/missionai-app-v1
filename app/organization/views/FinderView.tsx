'use client';

import type { OrgNodeData } from '@/components/OrgChart';
import FinderColumnView from '../components/FinderColumnView';

interface FinderViewProps {
  orgData: OrgNodeData | null;
  filteredOrgData: OrgNodeData | null;
  finderSelectedPath: OrgNodeData[];
  setFinderSelectedPath: (path: OrgNodeData[]) => void;
  editingOrgId: string | null;
  editingOrgName: string;
  setEditingOrgId: (id: string | null) => void;
  setEditingOrgName: (name: string) => void;
  onEditSave: (orgId: string, newName: string) => Promise<void>;
  onCreateOrg: (parentId: string | null, type?: string) => Promise<void>;
  onDeleteOrg: (orgId: string, orgName: string) => Promise<void>;
  onReorderOrg: (orgId: string, newPosition: number, parentId: string | null) => Promise<void>;
  onMoveOrg: (orgId: string, newParentId: string | null) => Promise<void>;
  error: string | null;
}

export default function FinderView({
  orgData,
  filteredOrgData,
  finderSelectedPath,
  setFinderSelectedPath,
  editingOrgId,
  editingOrgName,
  setEditingOrgId,
  setEditingOrgName,
  onEditSave,
  onCreateOrg,
  onDeleteOrg,
  onReorderOrg,
  onMoveOrg,
  error,
}: FinderViewProps) {
  return (
    <div style={{ 
      background: 'var(--color-surface)',
      borderRadius: '6px',
      padding: '0',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
      marginBottom: '0',
      border: 'none',
      overflow: 'hidden',
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {!orgData ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px',
          textAlign: 'center',
          color: '#6B7280',
          gap: '20px',
        }}>
          <div>
            <p style={{ fontSize: '16px', marginBottom: '8px', color: '#374151' }}>
              {error || '組織データが見つかりませんでした。'}
            </p>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
              最初の組織を追加してください。
            </p>
            <button
              onClick={() => onCreateOrg(null)}
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
      ) : (filteredOrgData || orgData) ? (
        <FinderColumnView
          orgTree={filteredOrgData || orgData}
          selectedPath={finderSelectedPath}
          onPathChange={setFinderSelectedPath}
          editingOrgId={editingOrgId}
          editingOrgName={editingOrgName}
          onEditStart={(orgId, orgName) => {
            setEditingOrgId(orgId);
            setEditingOrgName(orgName);
          }}
          onEditCancel={() => {
            setEditingOrgId(null);
            setEditingOrgName('');
          }}
          onEditSave={onEditSave}
          onCreateOrg={onCreateOrg}
          onEditNameChange={setEditingOrgName}
          onDeleteOrg={onDeleteOrg}
          onReorderOrg={onReorderOrg}
          onMoveOrg={onMoveOrg}
        />
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px',
          textAlign: 'center',
          color: '#6B7280',
        }}>
          <div>
            <p style={{ fontSize: '16px', marginBottom: '8px', color: '#374151' }}>
              組織データがフィルター条件に一致しませんでした。
            </p>
            <p style={{ fontSize: '14px', color: '#6B7280' }}>
              フィルター条件を変更してください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
