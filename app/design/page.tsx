'use client';

import React, { useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { FiSearch, FiMessageSquare } from 'react-icons/fi';
import { cardComponents } from '@/components/design/cards';
import { DesignDocSearchView } from '@/components/design/views/DesignDocSearchView';
import { DesignDocAIView } from '@/components/design/views/DesignDocAIView';
import { AppArchitectureSection } from '@/components/design/sections/AppArchitectureSection';
import { DatabaseOverviewSection } from '@/components/design/sections/DatabaseOverviewSection';
import { SQLiteSchemaSection } from '@/components/design/sections/SQLiteSchemaSection';
import { ChromaDBSchemaSection } from '@/components/design/sections/ChromaDBSchemaSection';
import { DataFlowSection } from '@/components/design/sections/DataFlowSection';
import { PageStructureSection } from '@/components/design/sections/PageStructureSection';
import { RAGSearchMechanismSection } from '@/components/design/sections/RAGSearchMechanismSection';
import { OrchestrationMCPLLMSection } from '@/components/design/sections/OrchestrationMCPLLMSection';
import { AgentSystemSection } from '@/components/design/sections/AgentSystemSection';

export default function DesignPage() {
  const [viewMode, setViewMode] = useState<'sections' | 'search' | 'ai'>('sections');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionContentRef = useRef<HTMLDivElement>(null);

  return (
    <Layout>
      <div style={{ padding: '48px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
              システム設計
            </h1>
          </div>
          <p style={{ fontSize: '16px', color: 'var(--color-text-light)', lineHeight: '1.6' }}>
            MissionAIアプリケーションのシステム設計を可視化します。アプリ全体構成、データベース構成（SQLite・ChromaDB）、データフロー、ページ構造などの詳細を確認できます。
          </p>
        </div>

        {/* タブナビゲーション */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px',
          borderBottom: '2px solid var(--color-border-color)'
        }}>
          <button
            onClick={() => {
              setViewMode('sections');
              setActiveSection(null);
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: viewMode === 'sections' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'sections' ? 'white' : 'var(--color-text)',
              border: 'none',
              borderBottom: viewMode === 'sections' ? '2px solid var(--color-primary)' : '2px solid transparent',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              marginBottom: '-2px',
            }}
          >
            セクション一覧
          </button>
          <button
            onClick={() => {
              setViewMode('search');
              setActiveSection(null);
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: viewMode === 'search' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'search' ? 'white' : 'var(--color-text)',
              border: 'none',
              borderBottom: viewMode === 'search' ? '2px solid var(--color-primary)' : '2px solid transparent',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              marginBottom: '-2px',
            }}
          >
            <FiSearch style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            検索
          </button>
          <button
            onClick={() => {
              setViewMode('ai');
              setActiveSection(null);
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: viewMode === 'ai' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'ai' ? 'white' : 'var(--color-text)',
              border: 'none',
              borderBottom: viewMode === 'ai' ? '2px solid var(--color-primary)' : '2px solid transparent',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              marginBottom: '-2px',
            }}
          >
            <FiMessageSquare style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            AIで質問
          </button>
        </div>

        {/* 検索画面 */}
        {viewMode === 'search' && <DesignDocSearchView />}

        {/* AI質問画面 */}
        {viewMode === 'ai' && <DesignDocAIView />}

        {/* セクション一覧 */}
        {viewMode === 'sections' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
              {cardComponents.length > 0 ? (
                cardComponents.map((card) => {
                  const CardComponent = card.component;
                  return (
                    <CardComponent
                      key={card.id}
                      id={card.id}
                      title={card.title}
                      description={card.description}
                      isActive={activeSection === card.id}
                      onClick={() => setActiveSection(activeSection === card.id ? null : card.id)}
                    />
                  );
                })
              ) : (
                <div style={{ 
                  padding: '24px', 
                  backgroundColor: 'var(--color-surface)', 
                  borderRadius: '8px',
                  border: '1px solid var(--color-border-color)',
                  gridColumn: '1 / -1'
                }}>
                  <p style={{ color: 'var(--color-text-light)' }}>カードがまだ追加されていません。components/design/cards/ にカードコンポーネントを追加してください。</p>
                </div>
              )}
            </div>

            {/* アクティブなセクションの内容を表示 */}
            {activeSection && (
              <div
                ref={sectionContentRef}
                style={{
                  padding: '32px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-surface)',
                  minHeight: '400px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                    {cardComponents.find(c => c.id === activeSection)?.title || 'セクション'}
                  </h2>
                </div>
                <div style={{ color: 'var(--color-text-light)', lineHeight: '1.8' }}>
                  {activeSection === 'app-architecture' && <AppArchitectureSection />}
                  {activeSection === 'database-overview' && <DatabaseOverviewSection />}
                  {activeSection === 'sqlite-schema' && <SQLiteSchemaSection />}
                  {activeSection === 'chromadb-schema' && <ChromaDBSchemaSection />}
                  {activeSection === 'data-flow' && <DataFlowSection />}
                  {activeSection === 'page-structure' && <PageStructureSection />}
                  {activeSection === 'rag-search-mechanism' && <RAGSearchMechanismSection />}
                  {activeSection === 'orchestration-mcp-llm' && <OrchestrationMCPLLMSection />}
                  {activeSection === 'agent-system' && <AgentSystemSection />}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
