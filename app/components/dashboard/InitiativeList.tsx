'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { FocusInitiative, Theme } from '@/lib/orgApi';
import type { OrgNodeData } from '@/lib/orgApi';
import type { OrgWithDepth } from '../../utils/organizationUtils';

interface InitiativeListProps {
  selectedTypeFilter: 'all' | 'organization' | 'company' | 'person';
  selectedTheme: Theme | null;
  selectedThemeInitiatives: FocusInitiative[];
  selectedThemeCompanyInitiatives: FocusInitiative[];
  selectedLevelOrgs: OrgWithDepth[];
  orgIdsWithDescendants: Map<string, string[]>;
  orgTree: OrgNodeData | null;
  onDownloadImage: () => void;
}

export function InitiativeList({
  selectedTypeFilter,
  selectedTheme,
  selectedThemeInitiatives,
  selectedThemeCompanyInitiatives,
  orgIdsWithDescendants,
  orgTree,
  onDownloadImage,
}: InitiativeListProps) {
  if (!selectedTheme) return null;

  // 組織モードの施策一覧
  const organizationInitiatives = selectedTypeFilter !== 'company' && selectedThemeInitiatives.length > 0;

  // 事業会社モードの施策一覧
  const companyInitiatives = selectedTypeFilter === 'company' && selectedThemeCompanyInitiatives.length > 0;

  // 施策がない場合のメッセージ
  const noInitiatives = 
    (selectedTypeFilter !== 'company' && selectedThemeInitiatives.length === 0) ||
    (selectedTypeFilter === 'company' && selectedThemeCompanyInitiatives.length === 0);

  // 組織名を取得するヘルパー関数
  const findOrg = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
    if (node.id === targetId) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findOrg(child, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  return (
    <>
      {/* 選択されたテーマの注力施策カード - 組織モード */}
      {organizationInitiatives && (
        <div style={{ marginTop: '24px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
          <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '16px', color: '#1A1A1A' }}>
            「{selectedTheme.title}」の注力施策 ({selectedThemeInitiatives.length}件)
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}>
            {selectedThemeInitiatives.map(initiative => {
              // 組織名を取得
              const orgName = Array.from(orgIdsWithDescendants.entries())
                .find(([_, orgIds]) => initiative.organizationId && orgIds.includes(initiative.organizationId))?.[0]
                ? '不明な組織'
                : (() => {
                    const orgEntry = Array.from(orgIdsWithDescendants.entries())
                      .find(([_, orgIds]) => initiative.organizationId && orgIds.includes(initiative.organizationId));
                    if (!orgEntry) return '不明な組織';
                    const orgId = orgEntry[0];
                    const org = orgTree ? findOrg(orgTree, orgId) : null;
                    return org?.name || org?.title || '不明な組織';
                  })();

              return (
                <div
                  key={initiative.id}
                  style={{
                    padding: '16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#4262FF';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(66, 98, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={() => {
                    window.location.href = `/organization/initiative?organizationId=${initiative.organizationId}&initiativeId=${initiative.id}`;
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    marginBottom: '8px',
                  }}>
                    {orgName}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1A1A1A',
                    marginBottom: '8px',
                    lineHeight: '1.4',
                  }}>
                    {initiative.title}
                  </div>
                  {initiative.description && (
                    <div style={{
                      fontSize: '11px',
                      color: '#4B5563',
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]} 
                        components={{
                          a: ({ node, ...props }: any) => (
                            <a
                              {...props}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#4262FF', textDecoration: 'underline', fontSize: 'inherit' }}
                            />
                          ),
                          p: ({ node, ...props }: any) => (
                            <p {...props} style={{ margin: 0, marginBottom: 0, fontSize: 'inherit', display: 'inline' }} />
                          ),
                          h1: ({ node, ...props }: any) => (
                            <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                          ),
                          h2: ({ node, ...props }: any) => (
                            <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                          ),
                          h3: ({ node, ...props }: any) => (
                            <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                          ),
                          h4: ({ node, ...props }: any) => (
                            <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                          ),
                          h5: ({ node, ...props }: any) => (
                            <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                          ),
                          h6: ({ node, ...props }: any) => (
                            <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                          ),
                          strong: ({ node, ...props }: any) => (
                            <strong {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                          ),
                          em: ({ node, ...props }: any) => (
                            <em {...props} style={{ fontSize: 'inherit', fontStyle: 'italic' }} />
                          ),
                          ul: ({ node, ...props }: any) => (
                            <span {...props} style={{ fontSize: 'inherit' }} />
                          ),
                          ol: ({ node, ...props }: any) => (
                            <span {...props} style={{ fontSize: 'inherit' }} />
                          ),
                          li: ({ node, ...props }: any) => (
                            <span {...props} style={{ fontSize: 'inherit' }} />
                          ),
                          code: ({ node, ...props }: any) => (
                            <code {...props} style={{ fontSize: 'inherit', backgroundColor: '#F3F4F6', padding: '2px 4px', borderRadius: '3px' }} />
                          ),
                          blockquote: ({ node, ...props }: any) => (
                            <span {...props} style={{ fontSize: 'inherit' }} />
                          ),
                        }}
                      >
                        {initiative.description.replace(/\n/g, ' ').replace(/\s+/g, ' ')}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 選択されたテーマの注力施策カード - 事業会社モード */}
      {companyInitiatives && (
        <div style={{ marginTop: '24px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
          <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '16px', color: '#1A1A1A' }}>
            「{selectedTheme.title}」の注力施策 ({selectedThemeCompanyInitiatives.length}件)
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}>
            {selectedThemeCompanyInitiatives.map(initiative => {
              const companyOrg = orgTree ? findOrg(orgTree, initiative.organizationId || '') : null;
              const companyName = companyOrg?.name || companyOrg?.title || '不明な事業会社';

              return (
                <div
                  key={initiative.id}
                  style={{
                    padding: '16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#4262FF';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(66, 98, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={() => {
                    window.location.href = `/organization/initiative?organizationId=${initiative.organizationId}&initiativeId=${initiative.id}`;
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    marginBottom: '8px',
                  }}>
                    {companyName}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1A1A1A',
                    lineHeight: '1.4',
                  }}>
                    {initiative.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 施策がない場合のメッセージ */}
      {noInitiatives && (
        <div style={{
          marginTop: '24px',
          borderTop: '1px solid #E5E7EB',
          paddingTop: '16px',
          color: '#6B7280',
          fontSize: '14px',
        }}>
          「{selectedTheme.title}」に関連する注力施策はありません。
        </div>
      )}

      {/* ダウンロードボタン */}
      <div style={{
        marginTop: '16px',
        display: 'flex',
        justifyContent: 'flex-end',
      }}>
        <button
          type="button"
          onClick={onDownloadImage}
          title="グラフと注力施策一覧を画像としてダウンロード"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            padding: 0,
            fontSize: '14px',
            color: '#6B7280',
            backgroundColor: 'transparent',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
            e.currentTarget.style.borderColor = '#D1D5DB';
            e.currentTarget.style.color = '#374151';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = '#E5E7EB';
            e.currentTarget.style.color = '#6B7280';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2.5V12.5M10 12.5L6.25 8.75M10 12.5L13.75 8.75M2.5 15V16.25C2.5 16.913 3.037 17.5 3.75 17.5H16.25C16.963 17.5 17.5 16.913 17.5 16.25V15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </>
  );
}

