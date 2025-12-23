/**
 * React Flowが利用できない場合のフォールバックコンポーネント
 */

'use client';

interface ChainEditorFallbackProps {
  chainId?: string;
}

export function ChainEditorFallback({ chainId }: ChainEditorFallbackProps) {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
        React Flowが利用できません。reactflowパッケージをインストールしてください。
      </p>
      <code style={{ 
        padding: '8px 16px', 
        background: 'var(--color-background)', 
        borderRadius: '6px',
        fontSize: '14px'
      }}>
        npm install reactflow
      </code>
    </div>
  );
}

