'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { OrgNodeData } from '@/components/OrgChart';

type TabType = 'introduction' | 'focusAreas' | 'focusInitiatives' | 'meetingNotes';

interface IntroductionTabProps {
  organization: OrgNodeData | null;
  tabRef: React.RefObject<HTMLDivElement>;
  onDownloadImage: (tabType: TabType) => void;
}

export default function IntroductionTab({
  organization,
  tabRef,
  onDownloadImage,
}: IntroductionTabProps) {
  const router = useRouter();

  return (
    <div ref={tabRef}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => onDownloadImage('introduction')}
          title="組織紹介を画像としてダウンロード"
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
      <>
        {organization?.description && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
              説明
            </h3>
            <p style={{ color: 'var(--color-text-light)', lineHeight: '1.6' }}>
              {organization.description}
            </p>
          </div>
        )}

        {organization?.members && organization.members.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
              所属メンバー ({organization.members.length}名)
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '12px',
              }}
            >
              {organization.members.map((member, index) => {
                const hasPosition = member.title && member.title.trim() !== '';
                return (
                  <div
                    key={index}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: hasPosition ? '#F9FAFB' : '#ffffff',
                      border: hasPosition ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxShadow: hasPosition ? '0 2px 4px rgba(59, 130, 246, 0.1)' : '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div style={{ marginBottom: '4px' }}>
                      <strong style={{ fontSize: '15px', color: '#1F2937' }}>{member.name}</strong>
                    </div>
                    {member.title && (
                      <div style={{ color: '#374151', fontWeight: '500', fontSize: '13px' }}>
                        {member.title}
                      </div>
                    )}
                    {member.department && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                        部署: {member.department}
                      </div>
                    )}
                    {member.extension && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                        内線: {member.extension}
                      </div>
                    )}
                    {member.itochuEmail && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                        <a href={`mailto:${member.itochuEmail}`} style={{ color: '#2563EB', textDecoration: 'none' }}>
                          {member.itochuEmail}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {organization?.children && organization.children.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
              子組織 ({organization.children.length}個)
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '12px',
              }}
            >
              {organization.children.map((child) => (
                <div
                  key={child.id}
                  onClick={() => {
                    if (child.id) {
                      router.push(`/organization/detail?id=${child.id}`);
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: child.id ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (child.id) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                      e.currentTarget.style.borderColor = '#3B82F6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (child.id) {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#E5E7EB';
                    }
                  }}
                >
                  <div style={{ marginBottom: '4px' }}>
                    <strong style={{ fontSize: '15px', color: '#1F2937' }}>{child.name}</strong>
                  </div>
                  {child.title && (
                    <div style={{ color: '#374151', fontSize: '13px' }}>
                      {child.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    </div>
  );
}

