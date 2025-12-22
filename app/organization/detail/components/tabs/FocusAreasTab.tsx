'use client';

import { useRef } from 'react';
import type { OrganizationContent } from '@/lib/orgApi';

type TabType = 'introduction' | 'focusAreas' | 'focusInitiatives' | 'meetingNotes';

interface FocusAreasTabProps {
  organizationContent: OrganizationContent | null;
  tabRef: React.RefObject<HTMLDivElement>;
  onDownloadImage: (tabType: TabType) => void;
}

export default function FocusAreasTab({
  organizationContent,
  tabRef,
  onDownloadImage,
}: FocusAreasTabProps) {
  return (
    <div ref={tabRef}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => onDownloadImage('focusAreas')}
          title="注力領域を画像としてダウンロード"
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
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
          注力領域
        </h3>
        {organizationContent?.focusAreas ? (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#F9FAFB', 
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6',
            color: 'var(--color-text)',
          }}>
            {organizationContent.focusAreas}
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-light)', padding: '20px', textAlign: 'center' }}>
            注力領域が登録されていません
          </p>
        )}
      </div>
    </div>
  );
}

