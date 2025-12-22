'use client';

interface PeriodsTabProps {
  localConsiderationPeriod: string;
  setLocalConsiderationPeriod: (period: string) => void;
  localExecutionPeriod: string;
  setLocalExecutionPeriod: (period: string) => void;
  localMonetizationPeriod: string;
  setLocalMonetizationPeriod: (period: string) => void;
}

export default function PeriodsTab({
  localConsiderationPeriod,
  setLocalConsiderationPeriod,
  localExecutionPeriod,
  setLocalExecutionPeriod,
  localMonetizationPeriod,
  setLocalMonetizationPeriod,
}: PeriodsTabProps) {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💡 <strong>保存について:</strong> 編集内容を保存するには、ページ右上の「保存」ボタンをクリックしてください。
        </div>
      </div>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
          検討期間（例: 2024-01/2024-12）
        </label>
        <input
          type="text"
          value={localConsiderationPeriod}
          onChange={(e) => setLocalConsiderationPeriod(e.target.value)}
          placeholder="2024-01/2024-12"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
          実行期間（例: 2024-01/2024-12）
        </label>
        <input
          type="text"
          value={localExecutionPeriod}
          onChange={(e) => setLocalExecutionPeriod(e.target.value)}
          placeholder="2024-01/2024-12"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
          収益化期間（例: 2024-01/2024-12）
        </label>
        <input
          type="text"
          value={localMonetizationPeriod}
          onChange={(e) => setLocalMonetizationPeriod(e.target.value)}
          placeholder="2024-01/2024-12"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
    </div>
  );
}

