/**
 * 分析ページ用タブバーコンポーネント
 */

'use client';

interface AnalyticsTabBarProps {
  activeTab: 'relationship-diagram' | 'a2c100' | 'tab3' | 'tab4';
  onTabChange: (tab: 'relationship-diagram' | 'a2c100' | 'tab3' | 'tab4') => void;
}

export function AnalyticsTabBar({ activeTab, onTabChange }: AnalyticsTabBarProps) {
  const tabs = [
    { id: 'relationship-diagram' as const, label: '関係性図' },
    { id: 'a2c100' as const, label: 'A to C 100' },
    { id: 'tab3' as const, label: '機能3（準備中）' },
    { id: 'tab4' as const, label: '機能4（準備中）' },
  ];

  return (
    <div style={{ 
      display: 'flex', 
      gap: '8px', 
      marginBottom: '24px', 
      borderBottom: '1px solid #E0E0E0' 
    }}>
      {tabs.map(tab => (
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
          {tab.label}
        </button>
      ))}
    </div>
  );
}

