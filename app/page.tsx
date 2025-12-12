'use client';

import Layout from '@/components/Layout';

export default function DashboardPage() {
  return (
    <Layout>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ marginBottom: '8px' }}>ダッシュボード</h2>
          <p style={{ marginBottom: 0, fontSize: '14px', color: 'var(--color-text-light)' }}>
            テンプレートアプリケーションのダッシュボードです
          </p>
        </div>
      </div>
    </Layout>
  );
}

