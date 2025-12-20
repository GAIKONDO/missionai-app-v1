'use client';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: any;
  organizations: Array<{ id: string; name: string; title?: string; type?: string }>;
}

export default function AnalyticsModal({ isOpen, onClose, analytics, organizations }: AnalyticsModalProps) {
  if (!isOpen || !analytics) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '900px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
          検索履歴の分析
        </h2>

        {/* 基本統計 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', backgroundColor: '#F0F9FF', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>総検索数</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937' }}>{analytics.totalSearches}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>ユニーククエリ</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937' }}>{analytics.uniqueQueries}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#FEF3C7', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>平均結果数</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937' }}>{analytics.averageResultCount.toFixed(1)}</div>
          </div>
        </div>

        {/* よく使われる検索クエリ */}
        {analytics.topQueries.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>よく使われる検索クエリ</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {analytics.topQueries.map((item: any, index: number) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{item.query}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>平均結果: {item.avgResults.toFixed(1)}件</div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#3B82F6' }}>{item.count}回</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* よく使われる組織 */}
        {analytics.topOrganizations.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>よく検索される組織</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {analytics.topOrganizations.map((item: any, index: number) => {
                const org = organizations.find(o => o.id === item.organizationId);
                return (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                    <div style={{ fontSize: '14px' }}>{org?.name || item.organizationId}</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#3B82F6' }}>{item.count}回</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 時間分布 */}
        {analytics.timeDistribution.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>時間帯別の検索数</h3>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '150px' }}>
              {analytics.timeDistribution.map((item: any, index: number) => {
                const maxCount = Math.max(...analytics.timeDistribution.map((d: any) => d.count));
                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                return (
                  <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', backgroundColor: '#3B82F6', height: `${height}%`, borderRadius: '4px 4px 0 0', minHeight: item.count > 0 ? '4px' : '0' }} />
                    <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '4px' }}>{item.hour}時</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 最近のトレンド */}
        {analytics.recentTrends.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>最近のトレンド（日別）</h3>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '100px' }}>
              {analytics.recentTrends.map((item: any, index: number) => {
                const maxCount = Math.max(...analytics.recentTrends.map((d: any) => d.count));
                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                return (
                  <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', backgroundColor: '#10B981', height: `${height}%`, borderRadius: '4px 4px 0 0', minHeight: item.count > 0 ? '4px' : '0' }} />
                    <div style={{ fontSize: '9px', color: '#6B7280', marginTop: '4px', writingMode: 'vertical-rl' }}>
                      {new Date(item.date).getMonth() + 1}/{new Date(item.date).getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#6B7280',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

