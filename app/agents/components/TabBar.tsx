/**
 * タブバーコンポーネント
 */

'use client';

interface TabBarProps {
  activeTab: 'tasks' | 'agents' | 'executions' | 'chains' | 'tools' | 'orchestrator';
  onTabChange: (tab: 'tasks' | 'agents' | 'executions' | 'chains' | 'tools' | 'orchestrator') => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const tabs = [
    { id: 'tasks' as const, label: 'タスク管理' },
    { id: 'agents' as const, label: 'Agent管理' },
    { id: 'executions' as const, label: '実行監視' },
    { id: 'chains' as const, label: 'タスクチェーン' },
    { id: 'tools' as const, label: 'MCPツール' },
    { id: 'orchestrator' as const, label: 'オーケストレーター' },
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
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

