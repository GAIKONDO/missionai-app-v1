'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { useAnalyticsData } from './hooks/useAnalyticsData';
import { AnalyticsTabBar } from './components/TabBar';
import { RelationshipDiagramTab } from './components/RelationshipDiagramTab';
import { A2C100Tab } from './components/A2C100Tab';
import { PlaceholderTab } from './components/PlaceholderTab';

type AnalyticsTab = 'relationship-diagram' | 'a2c100' | 'tab3' | 'tab4';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('relationship-diagram');
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'diagram' | 'bubble'>('diagram');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'organization' | 'company' | 'person'>('all');

  const {
    themes,
    setThemes,
    initiatives,
    orgData,
    topics,
    setTopics,
    loading,
    error,
    refreshThemes,
    refreshTopics,
  } = useAnalyticsData();

  if (loading) {
    return (
      <Layout>
        <div className="card">
          <p>データを読み込み中...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="card" style={{ padding: '32px' }}>
        {/* ヘッダー */}
        <div style={{ 
          marginBottom: '32px',
        }}>
          <h2 style={{ 
            marginBottom: '8px',
            fontSize: '24px',
            fontWeight: '600',
            color: '#1A1A1A',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            分析
          </h2>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div style={{ 
            marginBottom: '24px', 
            padding: '12px 16px', 
            backgroundColor: '#FEF2F2', 
            border: '1.5px solid #FCA5A5', 
            borderRadius: '8px',
            color: '#991B1B',
            fontSize: '14px',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            <strong>エラー:</strong> {error}
          </div>
        )}

        <AnalyticsTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'relationship-diagram' && (
          <RelationshipDiagramTab
            selectedThemeId={selectedThemeId}
            viewMode={viewMode}
            selectedTypeFilter={selectedTypeFilter}
            themes={themes}
            setThemes={setThemes}
            initiatives={initiatives}
            orgData={orgData}
            topics={topics}
            setTopics={setTopics}
            refreshThemes={refreshThemes}
            refreshTopics={refreshTopics}
            onSelectedThemeIdChange={setSelectedThemeId}
            onViewModeChange={setViewMode}
            onTypeFilterChange={setSelectedTypeFilter}
          />
        )}

        {activeTab === 'a2c100' && (
          <A2C100Tab />
        )}

        {activeTab === 'tab3' && (
          <PlaceholderTab tabName="機能3" />
        )}

        {activeTab === 'tab4' && (
          <PlaceholderTab tabName="機能4" />
        )}
      </div>
    </Layout>
  );
}
