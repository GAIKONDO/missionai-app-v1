import React from 'react';
import { DesignCard, DesignCardProps } from './DesignCard';

/**
 * サンプルカードコンポーネント
 * 新しいカードを作成する際のテンプレートとして使用してください
 */
export function ExampleCard(props: DesignCardProps) {
  return (
    <DesignCard {...props}>
      {/* カードの内容をここに追加 */}
      <div style={{ marginTop: '16px' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-light)' }}>
          このカードの内容をカスタマイズできます。
        </p>
      </div>
    </DesignCard>
  );
}
