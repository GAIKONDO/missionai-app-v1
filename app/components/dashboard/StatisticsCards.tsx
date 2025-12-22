'use client';

interface StatisticsCardsProps {
  selectedTypeFilter: 'all' | 'organization' | 'company' | 'person';
  filteredThemes: Array<{ id: string; title: string }>;
  filteredThemeIds: Set<string>;
  selectedLevelOrgs: Array<{ id: string; name: string }>;
  selectedLevelCompanies: Array<{ id: string; name: string }>;
  filteredOrgIds: Set<string>;
  filteredInitiativeCount: number;
}

export function StatisticsCards({
  selectedTypeFilter,
  filteredThemes,
  filteredThemeIds,
  selectedLevelOrgs,
  selectedLevelCompanies,
  filteredOrgIds,
  filteredInitiativeCount,
}: StatisticsCardsProps) {
  const orgCount = selectedTypeFilter === 'company' 
    ? selectedLevelCompanies.length 
    : selectedLevelOrgs.length;
  
  const orgLabel = selectedTypeFilter === 'company' 
    ? '事業会社' 
    : selectedTypeFilter === 'person' 
    ? '個人' 
    : '組織';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
        ? '1fr' 
        : 'repeat(3, 1fr)',
      gap: typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '20px',
      marginBottom: '32px',
    }}>
      {/* テーマ数カード */}
      <div style={{
        padding: '24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #F0F4FF 0%, #E0E8FF 100%)',
          borderRadius: '0 12px 0 60px',
          opacity: 0.5,
        }} />
        <div style={{
          fontSize: '13px',
          color: '#6B7280',
          marginBottom: '12px',
          fontWeight: '500',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          position: 'relative',
          zIndex: 1,
        }}>
          テーマ数
        </div>
        <div style={{
          fontSize: '40px',
          fontWeight: '700',
          color: '#1A1A1A',
          lineHeight: '1',
          marginBottom: '4px',
          position: 'relative',
          zIndex: 1,
          fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
        }}>
          {filteredThemes.length}
        </div>
        <div style={{
          fontSize: '13px',
          color: '#9CA3AF',
          fontWeight: '400',
          position: 'relative',
          zIndex: 1,
        }}>
          件のテーマ
          {filteredThemeIds.size > 0 && (
            <span style={{
              fontSize: '11px',
              color: '#4262FF',
              marginLeft: '4px',
            }}>
              (フィルター適用中)
            </span>
          )}
        </div>
      </div>

      {/* 組織数/事業会社数カード */}
      <div style={{
        padding: '24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
          borderRadius: '0 12px 0 60px',
          opacity: 0.5,
        }} />
        <div style={{
          fontSize: '13px',
          color: '#6B7280',
          marginBottom: '12px',
          fontWeight: '500',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          position: 'relative',
          zIndex: 1,
        }}>
          {selectedTypeFilter === 'company' ? '事業会社数' : selectedTypeFilter === 'person' ? '個人数' : '組織数'}
        </div>
        <div style={{
          fontSize: '40px',
          fontWeight: '700',
          color: '#1A1A1A',
          lineHeight: '1',
          marginBottom: '4px',
          position: 'relative',
          zIndex: 1,
          fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
        }}>
          {orgCount}
        </div>
        <div style={{
          fontSize: '13px',
          color: '#9CA3AF',
          fontWeight: '400',
          position: 'relative',
          zIndex: 1,
        }}>
          件の{orgLabel}
          {filteredOrgIds.size > 0 && (
            <span style={{
              fontSize: '11px',
              color: '#4262FF',
              marginLeft: '4px',
            }}>
              (フィルター適用中)
            </span>
          )}
        </div>
      </div>

      {/* 施策総数カード */}
      <div style={{
        padding: '24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #FEF3F2 0%, #FEE2E2 100%)',
          borderRadius: '0 12px 0 60px',
          opacity: 0.5,
        }} />
        <div style={{
          fontSize: '13px',
          color: '#6B7280',
          marginBottom: '12px',
          fontWeight: '500',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          position: 'relative',
          zIndex: 1,
        }}>
          施策総数
        </div>
        <div style={{
          fontSize: '40px',
          fontWeight: '700',
          color: '#1A1A1A',
          lineHeight: '1',
          marginBottom: '4px',
          position: 'relative',
          zIndex: 1,
          fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
        }}>
          {filteredInitiativeCount}
        </div>
        <div style={{
          fontSize: '13px',
          color: '#9CA3AF',
          fontWeight: '400',
          position: 'relative',
          zIndex: 1,
        }}>
          件の施策
          {(filteredOrgIds.size > 0 || filteredThemeIds.size > 0) && (
            <span style={{
              fontSize: '11px',
              color: '#4262FF',
              marginLeft: '4px',
            }}>
              (フィルター適用中)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

