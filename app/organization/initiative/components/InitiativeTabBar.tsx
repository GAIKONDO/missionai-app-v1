'use client';

export type InitiativeTab = 'overview' | 'details' | 'periods' | 'relations' | 'monetization' | 'relation';

interface InitiativeTabBarProps {
  activeTab: InitiativeTab;
  onTabChange: (tab: InitiativeTab) => void;
}

export function InitiativeTabBar({ activeTab, onTabChange }: InitiativeTabBarProps) {
  const tabs: { id: InitiativeTab; label: string }[] = [
    { id: 'overview', label: '概要' },
    { id: 'details', label: '詳細' },
    { id: 'periods', label: '期間' },
    { id: 'relations', label: '特性要因図' },
    { id: 'monetization', label: 'マネタイズ' },
    { id: 'relation', label: '相関図' },
  ];

  return (
    <div style={{ borderBottom: '1px solid #E5E7EB', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--color-primary)' : 'transparent'}`,
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? 'var(--color-primary)' : '#6B7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '400',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '12px', color: '#6B7280', padding: '8px 12px' }}>
          💡 右上の「保存」ボタンをクリックして編集内容を保存してください
        </div>
      </div>
    </div>
  );
}

