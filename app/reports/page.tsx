'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { ReportsTabBar } from './components/TabBar';
import { ReportTab1 } from './components/ReportTab1';
import { PlaceholderTab } from './components/PlaceholderTab';

type ReportsTab = 'report1' | 'report2' | 'report3' | 'report4';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportsTab>('report1');

  return (
    <Layout>
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '8px' }}>レポート</h2>
        </div>

        <ReportsTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'report1' && (
          <ReportTab1 />
        )}

        {activeTab === 'report2' && (
          <PlaceholderTab tabName="レポート2" />
        )}

        {activeTab === 'report3' && (
          <PlaceholderTab tabName="レポート3" />
        )}

        {activeTab === 'report4' && (
          <PlaceholderTab tabName="レポート4" />
        )}
      </div>
    </Layout>
  );
}
