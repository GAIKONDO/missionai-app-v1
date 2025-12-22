'use client';

export type OrganizationTab = 'introduction' | 'focusAreas' | 'focusInitiatives' | 'meetingNotes';

interface OrganizationTabBarProps {
  activeTab: OrganizationTab;
  onTabChange: (tab: OrganizationTab) => void;
  focusInitiativesCount?: number;
  meetingNotesCount?: number;
}

export function OrganizationTabBar({ 
  activeTab, 
  onTabChange, 
  focusInitiativesCount = 0,
  meetingNotesCount = 0 
}: OrganizationTabBarProps) {
  const tabs = [
    { id: 'introduction' as const, label: '組織紹介' },
    { id: 'focusAreas' as const, label: '注力領域' },
    { id: 'focusInitiatives' as const, label: `注力施策 (${focusInitiativesCount})` },
    { id: 'meetingNotes' as const, label: `議事録 (${meetingNotesCount})` },
  ];

  return (
    <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border-color)', marginBottom: '24px' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '8px 16px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-light)',
            borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === tab.id ? '600' : '400',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

