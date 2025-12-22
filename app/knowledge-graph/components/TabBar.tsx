/**
 * ナレッジグラフページ用タブバーコンポーネント
 */

'use client';

import { KnowledgeGraphIcon, RAGSearchIcon } from '@/components/Icons';

interface KnowledgeGraphTabBarProps {
  activeTab: 'knowledge-graph' | 'rag-search' | 'tab3' | 'tab4';
  onTabChange: (tab: 'knowledge-graph' | 'rag-search' | 'tab3' | 'tab4') => void;
}

export function KnowledgeGraphTabBar({ activeTab, onTabChange }: KnowledgeGraphTabBarProps) {
  const tabs = [
    { id: 'knowledge-graph' as const, label: 'ナレッジグラフ', icon: KnowledgeGraphIcon },
    { id: 'rag-search' as const, label: 'RAG検索', icon: RAGSearchIcon },
    { id: 'tab3' as const, label: '機能3（準備中）', icon: null },
    { id: 'tab4' as const, label: '機能4（準備中）', icon: null },
  ];

  return (
    <div style={{ 
      display: 'flex', 
      gap: '8px', 
      marginBottom: '24px', 
      borderBottom: '1px solid #E0E0E0' 
    }}>
      {tabs.map(tab => {
        const IconComponent = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'transparent',
              color: activeTab === tab.id ? '#4262FF' : '#808080',
              borderBottom: activeTab === tab.id ? '2px solid #4262FF' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: '14px',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              transition: 'all 150ms',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = '#1A1A1A';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = '#808080';
              }
            }}
          >
            {IconComponent && (
              <IconComponent 
                size={16} 
                color={activeTab === tab.id ? '#4262FF' : '#808080'} 
              />
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

