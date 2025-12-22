'use client';

import { useState } from 'react';
import type { OrgNodeData, MemberInfo } from '@/components/OrgChart';

interface SelectedOrganizationPanelProps {
  selectedNode: OrgNodeData | null;
  expandedMembers: Set<string>;
  setExpandedMembers: (set: Set<string>) => void;
  onEditClick: () => void;
  onNavigateToDetail: () => void;
  showCompanyDisplay?: boolean;
  containerStyle?: React.CSSProperties;
}

const EditIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

export default function SelectedOrganizationPanel({
  selectedNode,
  expandedMembers,
  setExpandedMembers,
  onEditClick,
  onNavigateToDetail,
  showCompanyDisplay = false,
  containerStyle,
}: SelectedOrganizationPanelProps) {
  const [expandedMemberIndex, setExpandedMemberIndex] = useState<number | null>(null);

  if (!selectedNode) {
    return (
      <div style={{
        width: '400px',
        padding: '20px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        ...containerStyle,
      }}>
        <p style={{ color: '#6B7280', fontSize: '14px', textAlign: 'center' }}>
          組織を選択してください
        </p>
      </div>
    );
  }

  const toggleMemberExpansion = (index: number) => {
    const newExpanded = new Set(expandedMembers);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMembers(newExpanded);
  };

  return (
    <div style={{
      width: '400px',
      padding: '20px',
      backgroundColor: 'var(--color-surface)',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      maxHeight: '80vh',
      overflowY: 'auto',
      ...containerStyle,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0 }}>選択された組織</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {selectedNode.id && (
            <>
              <button
                onClick={onEditClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6B7280',
                  opacity: 0.7,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.06)';
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.opacity = '0.7';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="編集"
              >
                <EditIcon size={18} color="#6B7280" />
              </button>
              {showCompanyDisplay && selectedNode.id && (
                <button
                  onClick={() => {
                    // TODO: 事業会社追加機能を実装
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#10B981',
                    opacity: 0.7,
                    transition: 'all 0.2s',
                    fontSize: '20px',
                    fontWeight: '400',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.opacity = '0.7';
                  }}
                  title="事業会社を追加"
                >
                  +
                </button>
              )}
              <button
                onClick={onNavigateToDetail}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1F2937',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#111827';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1F2937';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                専用ページへ →
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)' }}>
          {selectedNode.name}
        </h4>
        {selectedNode.id && (
          <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
            ID: {selectedNode.id}
          </p>
        )}
        {selectedNode.title && (
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
            {selectedNode.title}
          </p>
        )}
        {selectedNode.description && (
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
            {selectedNode.description}
          </p>
        )}
      </div>

      {selectedNode.members && selectedNode.members.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-text)' }}>
            メンバー ({selectedNode.members.length}名)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedNode.members.map((member, index) => (
              <div
                key={index}
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--color-background)',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border-color)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
                      {member.name}
                    </p>
                    {member.title && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                        {member.title}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleMemberExpansion(index)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: 'var(--color-text-light)',
                    }}
                  >
                    {expandedMembers.has(index) ? '−' : '+'}
                  </button>
                </div>
                {expandedMembers.has(index) && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border-color)' }}>
                    {member.department && (
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#6B7280' }}>
                        部署: {member.department}
                      </p>
                    )}
                    {member.email && (
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#6B7280' }}>
                        メール: {member.email}
                      </p>
                    )}
                    {member.extension && (
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#6B7280' }}>
                        内線: {member.extension}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
