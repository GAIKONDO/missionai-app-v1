'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { FocusInitiative } from '@/lib/orgApi';

interface InitiativeIdLinksProps {
  initiative: FocusInitiative | null;
  organizationId: string;
  initiativeId: string;
}

export default function InitiativeIdLinks({
  initiative,
  organizationId,
  initiativeId,
}: InitiativeIdLinksProps) {
  const router = useRouter();

  return (
    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
            注力施策ID:
          </span>
          <a
            href={`/organization/initiative?organizationId=${organizationId}&initiativeId=${initiativeId}`}
            onClick={(e) => {
              e.preventDefault();
              router.push(`/organization/initiative?organizationId=${organizationId}&initiativeId=${initiativeId}`);
            }}
            style={{
              fontSize: '12px',
              color: '#3B82F6',
              fontFamily: 'monospace',
              fontWeight: '400',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: '#EFF6FF',
              textDecoration: 'none',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#DBEAFE';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#EFF6FF';
            }}
          >
            {initiativeId}
          </a>
        </div>
        {initiative?.causeEffectDiagramId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              特性要因図:
            </span>
            <a
              href={`/analytics/cause-effect/${initiative.causeEffectDiagramId}`}
              onClick={(e) => {
                e.preventDefault();
                router.push(`/analytics/cause-effect/${initiative.causeEffectDiagramId}`);
              }}
              style={{
                fontSize: '12px',
                color: '#3B82F6',
                fontFamily: 'monospace',
                fontWeight: '400',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: '#EFF6FF',
                textDecoration: 'none',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#DBEAFE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
              }}
            >
              {initiative.causeEffectDiagramId}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

