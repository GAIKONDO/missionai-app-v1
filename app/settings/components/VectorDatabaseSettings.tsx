'use client';

export default function VectorDatabaseSettings() {
  return (
    <div style={{
      padding: '24px',
      border: '1px solid var(--color-border-color)',
      borderRadius: '8px',
      backgroundColor: 'var(--color-surface)',
    }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
        ベクトルデータベース（ChromaDB）
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
        ChromaDBは常に有効です。大量データでの検索速度が100倍以上向上します。
      </p>

      <div style={{
        padding: '16px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-color)',
        marginBottom: '16px',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: '8px' }}>
          <strong>✅ ChromaDB統合完了</strong>
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>
          Rust側でChromaDB Serverが統合されました。<br />
          アプリケーション起動時に自動的にChromaDB Serverが起動します。<br />
          Python環境とChromaDBのインストールが必要です。
        </p>
      </div>

      <div style={{
        padding: '16px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-color)',
        marginBottom: '16px',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: '8px' }}>
          <strong>💡 使用方法</strong>
        </p>
        <ul style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, paddingLeft: '20px' }}>
          <li>Python 3.8-3.11がインストールされていることを確認</li>
          <li>ChromaDBがインストールされていることを確認（pip install chromadb）</li>
          <li>アプリケーションを再起動すると、ChromaDB Serverが自動的に起動します</li>
          <li>埋め込みの保存・検索がChromaDB経由で行われます</li>
        </ul>
      </div>

      <div style={{
        padding: '16px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-color)',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: '8px' }}>
          <strong>📊 現在の動作</strong>
        </p>
        <ul style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, paddingLeft: '20px' }}>
          <li>エンティティ埋め込み: ChromaDBに保存・検索</li>
          <li>リレーション埋め込み: ChromaDBに保存・検索</li>
          <li>トピック埋め込み: ChromaDBに保存・検索</li>
        </ul>
      </div>
    </div>
  );
}

