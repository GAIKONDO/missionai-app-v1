/**
 * レポート1タブコンテンツ
 */

'use client';

export function ReportTab1() {
  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ marginBottom: '8px' }}>レポート1</h2>
        <p style={{ marginBottom: 0, fontSize: '14px', color: 'var(--color-text-light)' }}>
          レポート1の内容
        </p>
      </div>
    </div>
  );
}

