'use client';

import type { EmbeddingProvider } from '@/lib/embeddings';

interface EmbeddingSettingsProps {
  embeddingProvider: EmbeddingProvider;
  ollamaApiUrl: string;
  ollamaModel: string;
  onProviderChange: (provider: EmbeddingProvider) => void;
  onOllamaUrlChange: (url: string) => void;
  onOllamaModelChange: (model: string) => void;
}

export default function EmbeddingSettings({
  embeddingProvider,
  ollamaApiUrl,
  ollamaModel,
  onProviderChange,
  onOllamaUrlChange,
  onOllamaModelChange,
}: EmbeddingSettingsProps) {
  return (
    <div style={{
      padding: '24px',
      border: '1px solid var(--color-border-color)',
      borderRadius: '8px',
      backgroundColor: 'var(--color-surface)',
    }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
        埋め込み生成の設定
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
        RAG検索で使用する埋め込み生成のプロバイダーを選択できます。Ollamaを使用すると、ローカルで無料で埋め込みを生成できます。
      </p>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
          プロバイダー
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => onProviderChange('openai')}
            style={{
              flex: 1,
              padding: '12px 16px',
              backgroundColor: embeddingProvider === 'openai' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: embeddingProvider === 'openai' ? '#FFFFFF' : 'var(--color-text)',
              border: embeddingProvider === 'openai' ? 'none' : '1px solid var(--color-border-color)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            OpenAI
          </button>
          <button
            onClick={() => onProviderChange('ollama')}
            style={{
              flex: 1,
              padding: '12px 16px',
              backgroundColor: embeddingProvider === 'ollama' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: embeddingProvider === 'ollama' ? '#FFFFFF' : 'var(--color-text)',
              border: embeddingProvider === 'ollama' ? 'none' : '1px solid var(--color-border-color)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Ollama（ローカル・無料）
          </button>
        </div>
      </div>

      {embeddingProvider === 'openai' && (
        <div style={{
          padding: '16px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          border: '1px solid var(--color-border-color)',
        }}>
          <p style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: '8px' }}>
            <strong>OpenAI API</strong>を使用します。
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>
            環境変数 <code style={{ backgroundColor: 'var(--color-background)', padding: '2px 6px', borderRadius: '4px' }}>NEXT_PUBLIC_OPENAI_API_KEY</code> にAPIキーを設定してください。
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', marginBottom: 0 }}>
            💡 コスト: text-embedding-3-smallモデルは$0.02/1Mトークン（約0.00002円/1,000トークン）
          </p>
        </div>
      )}

      {embeddingProvider === 'ollama' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              Ollama API URL
            </label>
            <input
              type="text"
              value={ollamaApiUrl}
              onChange={(e) => onOllamaUrlChange(e.target.value)}
              placeholder="http://localhost:11434/api/embeddings"
              style={{
                width: '100%',
                padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              埋め込みモデル
            </label>
            <select
              value={ollamaModel}
              onChange={(e) => onOllamaModelChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <option value="nomic-embed-text">nomic-embed-text（推奨）</option>
              <option value="all-minilm">all-minilm</option>
              <option value="mxbai-embed-large">mxbai-embed-large</option>
            </select>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border-color)',
          }}>
            <p style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: '8px' }}>
              <strong>✅ Ollamaを使用すると完全無料</strong>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>
              💡 Ollamaをインストールして起動してください: <code style={{ backgroundColor: 'var(--color-background)', padding: '2px 6px', borderRadius: '4px' }}>ollama serve</code>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', marginBottom: 0 }}>
              💡 埋め込みモデルをプル: <code style={{ backgroundColor: 'var(--color-background)', padding: '2px 6px', borderRadius: '4px' }}>ollama pull nomic-embed-text</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

