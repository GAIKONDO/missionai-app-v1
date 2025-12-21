import React from 'react';
import type { DesignCardProps } from './DesignCard.types';

// 型定義を再エクスポート（既存のコードとの互換性のため）
export type { DesignCardProps };

/**
 * デザインページ用のカードコンポーネント
 * 各カードコンポーネントはこのコンポーネントをラップして使用します
 */
export function DesignCard({ id, title, description, isActive = false, onClick, children }: DesignCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '24px',
        border: '1px solid var(--color-border-color)',
        borderRadius: '8px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        backgroundColor: isActive ? 'var(--color-background)' : 'var(--color-surface)',
        borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border-color)',
      }}
      onMouseEnter={(e) => {
        if (onClick && !isActive) {
          e.currentTarget.style.borderColor = 'var(--color-primary)';
          e.currentTarget.style.backgroundColor = 'var(--color-background)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick && !isActive) {
          e.currentTarget.style.borderColor = 'var(--color-border-color)';
          e.currentTarget.style.backgroundColor = 'var(--color-surface)';
        }
      }}
    >
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
        {title}
      </h2>
      {description && (
        <p style={{ fontSize: '14px', color: 'var(--color-text-light)', lineHeight: '1.5', marginBottom: children ? '16px' : '0' }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
