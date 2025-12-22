'use client';

interface DashboardHeaderProps {
  selectedTypeFilter: 'all' | 'organization' | 'company' | 'person';
}

export function DashboardHeader({ selectedTypeFilter }: DashboardHeaderProps) {
  const typeLabel = selectedTypeFilter === 'all' 
    ? 'すべて' 
    : selectedTypeFilter === 'company' 
    ? '事業会社' 
    : selectedTypeFilter === 'person' 
    ? '個人' 
    : '組織';

  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={{
        marginBottom: '8px',
        fontSize: '24px',
        fontWeight: '600',
        color: '#1A1A1A',
      }}>
        ダッシュボード
      </h2>
    </div>
  );
}

