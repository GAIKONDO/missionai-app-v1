'use client';

import React from 'react';
import Layout from '@/components/Layout';
import { useRouter } from 'next/navigation';

interface ErrorStateProps {
  error: string | null;
  organizationId: string;
}

export function LoadingState() {
  return (
    <Layout>
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <p>データを読み込み中...</p>
      </div>
    </Layout>
  );
}

export function ErrorState({ error, organizationId }: ErrorStateProps) {
  const router = useRouter();

  return (
    <Layout>
      <div className="card" style={{ padding: '20px' }}>
        <h2 style={{ marginBottom: '8px' }}>注力施策詳細</h2>
        <p style={{ color: 'var(--color-error)' }}>
          {error || 'データが見つかりませんでした。'}
        </p>
        <button
          onClick={() => {
            router.push(`/organization/detail?id=${organizationId}&tab=focusInitiatives`);
          }}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          組織ページに戻る
        </button>
      </div>
    </Layout>
  );
}

