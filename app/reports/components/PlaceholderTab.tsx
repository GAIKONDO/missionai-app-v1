/**
 * 準備中のタブコンテンツ（プレースホルダー）
 */

'use client';

interface PlaceholderTabProps {
  tabName: string;
}

export function PlaceholderTab({ tabName }: PlaceholderTabProps) {
  return (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center', 
      color: '#808080',
      fontSize: '14px',
      fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <p>{tabName}は準備中です。</p>
    </div>
  );
}

