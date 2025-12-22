'use client';

export default function EnvironmentVariablesInfo() {
  return (
    <div style={{
      padding: '24px',
      border: '1px solid var(--color-border-color)',
      borderRadius: '8px',
      backgroundColor: 'var(--color-surface)',
    }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
        環境変数の設定（開発者向け）
      </h2>
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--color-background)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-color)',
        marginBottom: '16px',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text)', margin: 0 }}>
          💡 <strong>通常のユーザーは上記のGUI設定を使用してください。</strong> 環境変数の設定は開発者向けの方法です。
        </p>
      </div>
      <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        <p style={{ marginBottom: '12px' }}>
          <strong>OpenAI APIを使用する場合:</strong>
        </p>
        <pre style={{
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
          padding: '12px',
          borderRadius: '6px',
          fontSize: '12px',
          overflow: 'auto',
          marginBottom: '16px',
        }}>
{`# .env.local
NEXT_PUBLIC_OPENAI_API_KEY=your-api-key-here
NEXT_PUBLIC_EMBEDDING_PROVIDER=openai`}
        </pre>

        <p style={{ marginBottom: '12px' }}>
          <strong>Ollamaを使用する場合:</strong>
        </p>
        <pre style={{
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
          padding: '12px',
          borderRadius: '6px',
          fontSize: '12px',
          overflow: 'auto',
        }}>
{`# .env.local
NEXT_PUBLIC_EMBEDDING_PROVIDER=ollama
NEXT_PUBLIC_OLLAMA_API_URL=http://localhost:11434/api/embeddings`}
        </pre>
      </div>
    </div>
  );
}

