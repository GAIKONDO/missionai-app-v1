/**
 * レポートページ用タブバーコンポーネント
 */

'use client';

interface ReportsTabBarProps {
  activeTab: 'report1' | 'report2' | 'report3' | 'report4';
  onTabChange: (tab: 'report1' | 'report2' | 'report3' | 'report4') => void;
}

export function ReportsTabBar({ activeTab, onTabChange }: ReportsTabBarProps) {
  const tabs = [
    { id: 'report1' as const, label: 'レポート1' },
    { id: 'report2' as const, label: 'レポート2（準備中）' },
    { id: 'report3' as const, label: 'レポート3（準備中）' },
    { id: 'report4' as const, label: 'レポート4（準備中）' },
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

