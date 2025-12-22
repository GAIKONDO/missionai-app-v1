'use client';

import { useState, Suspense } from 'react';
import Layout from '@/components/Layout';
import { KnowledgeGraphTabBar } from './components/TabBar';
import { KnowledgeGraphTab } from './components/KnowledgeGraphTab';
import { RAGSearchTab } from './components/RAGSearchTab';
import { PlaceholderTab } from './components/PlaceholderTab';

type KnowledgeGraphPageTab = 'knowledge-graph' | 'rag-search' | 'tab3' | 'tab4';

function KnowledgeGraphPageContent() {
  const [activeTab, setActiveTab] = useState<KnowledgeGraphPageTab>('knowledge-graph');

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
            ナレッジグラフ
          </h1>
        </div>

        <KnowledgeGraphTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'knowledge-graph' && (
          <KnowledgeGraphTab />
        )}

        {activeTab === 'rag-search' && (
          <RAGSearchTab />
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

export default function KnowledgeGraphPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <KnowledgeGraphPageContent />
    </Suspense>
  );
}
