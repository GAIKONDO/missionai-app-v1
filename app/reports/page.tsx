'use client';

import Layout from '@/components/Layout';

export default function ReportsPage() {
  return (
    <Layout>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ marginBottom: '8px' }}>レポート</h2>
          <p style={{ marginBottom: 0, fontSize: '14px', color: 'var(--color-text-light)' }}>
            レポートページ
          </p>
        </div>
      </div>
    </Layout>
  );
}
