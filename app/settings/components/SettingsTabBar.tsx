'use client';

export type SettingsTab = 'architecture' | 'api-keys' | 'embeddings' | 'sqlite' | 'vector-db' | 'import' | 'env';

interface SettingsTabBarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

export function SettingsTabBar({ activeTab, onTabChange }: SettingsTabBarProps) {
  const tabs = [
    { id: 'architecture' as const, label: '全体構成' },
    { id: 'api-keys' as const, label: 'APIキー設定' },
    { id: 'embeddings' as const, label: '埋め込み生成' },
    { id: 'sqlite' as const, label: 'SQLite' },
    { id: 'vector-db' as const, label: 'ベクトルDB' },
    { id: 'import' as const, label: 'データインポート' },
    { id: 'env' as const, label: '環境変数' },
  ];

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--color-border-color)' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'transparent',
            color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === tab.id ? 600 : 400,
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.color = 'var(--color-text)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

