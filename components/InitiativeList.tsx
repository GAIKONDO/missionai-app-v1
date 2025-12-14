'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Theme, FocusInitiative, OrgNodeData } from '@/lib/orgApi';

interface InitiativeListProps {
  theme: Theme | null;
  initiatives: FocusInitiative[];
  orgTree: OrgNodeData | null;
}

// 組織ツリーから組織名を取得する関数
function findOrganizationNameById(orgTree: OrgNodeData | null, organizationId: string): string {
  if (!orgTree) return organizationId;
  
  function search(node: OrgNodeData): OrgNodeData | null {
    if (node.id === organizationId) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = search(child);
        if (found) return found;
      }
    }
    return null;
  }
  
  const found = search(orgTree);
  return found?.name || organizationId;
}

export default function InitiativeList({ theme, initiatives, orgTree }: InitiativeListProps) {
  const router = useRouter();

  // 選択されたテーマに紐づく注力施策を取得
  const relatedInitiatives = useMemo(() => {
    if (!theme) return [];
    
    return initiatives.filter(initiative => {
      // themeIds配列に含まれているか、またはthemeIdが一致するか
      return (
        (initiative.themeIds && initiative.themeIds.includes(theme.id)) ||
        initiative.themeId === theme.id
      );
    });
  }, [theme, initiatives]);

  const handleInitiativeClick = (initiative: FocusInitiative) => {
    router.push(`/organization/initiative?organizationId=${initiative.organizationId}&initiativeId=${initiative.id}`);
  };

  if (!theme) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        border: '1px solid #E0E0E0',
        minWidth: '300px',
        textAlign: 'center',
        color: 'var(--color-text-light)',
      }}>
        テーマを選択してください
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#FFFFFF',
      borderRadius: '8px',
      border: '1px solid #E0E0E0',
      minWidth: '450px',
      maxWidth: '100%',
      maxHeight: 'calc(100vh - 200px)',
      overflowY: 'auto',
      position: 'sticky',
      top: '24px',
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 600,
        marginBottom: '8px',
        color: 'var(--color-text)',
      }}>
        {theme.title}
      </h3>
      <p style={{
        fontSize: '12px',
        color: 'var(--color-text-light)',
        marginBottom: '16px',
      }}>
        {relatedInitiatives.length}件の注力施策
      </p>

      {relatedInitiatives.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--color-text-light)',
          fontSize: '14px',
        }}>
          このテーマに紐づく注力施策はありません
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {relatedInitiatives.map(initiative => (
            <div
              key={initiative.id}
              onClick={() => handleInitiativeClick(initiative)}
              style={{
                padding: '16px',
                backgroundColor: '#FAFAFA',
                borderRadius: '6px',
                border: '1px solid #E0E0E0',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F0F0F0';
                e.currentTarget.style.borderColor = '#4262FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FAFAFA';
                e.currentTarget.style.borderColor = '#E0E0E0';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px',
                gap: '12px',
              }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  margin: 0,
                  color: 'var(--color-text)',
                  flex: 1,
                }}>
                  {initiative.title}
                </h4>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#6B7280',
                  backgroundColor: '#F3F4F6',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {findOrganizationNameById(orgTree, initiative.organizationId)}
                </span>
              </div>
              {initiative.description && (
                <p style={{
                  fontSize: '12px',
                  color: 'var(--color-text-light)',
                  marginBottom: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {initiative.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
