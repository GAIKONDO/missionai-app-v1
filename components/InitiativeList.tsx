'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Theme, FocusInitiative, OrgNodeData } from '@/lib/orgApi';
// import type { Company, CompanyFocusInitiative } from '@/lib/companiesApi'; // Companiesテーブル削除のためコメントアウト
type CompanyFocusInitiative = any; // Companiesテーブル削除のため、一時的な型定義

// ReactMarkdown用の共通コンポーネント設定（カード内の説明文用 - 一律小さな文字）
const markdownComponents = {
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
};

interface InitiativeListProps {
  theme: Theme | null;
  initiatives: FocusInitiative[] | CompanyFocusInitiative[];
  orgTree: OrgNodeData | null;
  companies?: Company[];
  viewMode?: 'organization' | 'company';
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

export default function InitiativeList({ theme, initiatives, orgTree, companies, viewMode = 'organization' }: InitiativeListProps) {
  const router = useRouter();

  // 選択されたテーマに紐づく注力施策を取得
  const relatedInitiatives = useMemo(() => {
    if (!theme) return [];
    
    return initiatives.filter(initiative => {
      if (viewMode === 'organization') {
        const orgInitiative = initiative as FocusInitiative;
        // themeIds配列に含まれているか、またはthemeIdが一致するか
        return (
          (orgInitiative.themeIds && orgInitiative.themeIds.includes(theme.id)) ||
          orgInitiative.themeId === theme.id
        );
      } else {
        const companyInitiative = initiative as CompanyFocusInitiative;
        // themeIds配列に含まれているかチェック
        const themeIds = Array.isArray(companyInitiative.themeIds) 
          ? companyInitiative.themeIds 
          : (typeof companyInitiative.themeIds === 'string' 
              ? JSON.parse(companyInitiative.themeIds) 
              : []);
        return themeIds.includes(theme.id);
      }
    });
  }, [theme, initiatives, viewMode]);

  const handleInitiativeClick = (initiative: FocusInitiative | CompanyFocusInitiative) => {
    if (viewMode === 'organization') {
      const orgInitiative = initiative as FocusInitiative;
      router.push(`/organization/initiative?organizationId=${orgInitiative.organizationId}&initiativeId=${orgInitiative.id}`);
    } else {
      const companyInitiative = initiative as CompanyFocusInitiative;
      router.push(`/companies/initiative?companyId=${companyInitiative.companyId}&initiativeId=${companyInitiative.id}`);
    }
  };

  // 組織名または事業会社名を取得
  const getEntityName = (initiative: FocusInitiative | CompanyFocusInitiative): string => {
    if (viewMode === 'organization') {
      const orgInitiative = initiative as FocusInitiative;
      if (!orgInitiative.organizationId) return '不明な組織';
      return findOrganizationNameById(orgTree, orgInitiative.organizationId);
    } else {
      const companyInitiative = initiative as CompanyFocusInitiative;
      const company = companies?.find(c => c.id === companyInitiative.companyId);
      return company?.name || companyInitiative.companyId;
    }
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
                  {getEntityName(initiative)}
                </span>
              </div>
              {initiative.description && (
                <div style={{
                  fontSize: '11px',
                  color: 'var(--color-text-light)',
                  marginBottom: 0,
                  lineHeight: '1.4',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    components={markdownComponents}
                  >
                    {initiative.description.replace(/\n/g, ' ').replace(/\s+/g, ' ')}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
