'use client';

export default function SqliteSettings() {
  return (
    <div style={{
      padding: '24px',
      border: '1px solid var(--color-border-color)',
      borderRadius: '8px',
      backgroundColor: 'var(--color-surface)',
    }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
        SQLiteデータベース設定
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
        SQLiteは構造化データの永続化に使用されています。データロックを回避するため、読み取りと書き込みを分離し、書き込みキューシステムを実装しています。
      </p>

      <div style={{
        padding: '16px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-color)',
        marginBottom: '16px',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: '8px' }}>
          <strong>📁 データベースファイルの場所</strong>
        </p>
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
          <div><strong>開発環境:</strong> {`{app_data_dir}/mission-ai-local-dev/app.db`}</div>
          <div style={{ marginTop: '4px' }}><strong>本番環境:</strong> {`{app_data_dir}/mission-ai-local/app.db`}</div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>
          <strong>app_data_dirの場所:</strong><br />
          macOS: <code style={{ backgroundColor: 'var(--color-background)', padding: '2px 6px', borderRadius: '4px' }}>~/Library/Application Support/</code><br />
          Windows: <code style={{ backgroundColor: 'var(--color-background)', padding: '2px 6px', borderRadius: '4px' }}>%APPDATA%\</code><br />
          Linux: <code style={{ backgroundColor: 'var(--color-background)', padding: '2px 6px', borderRadius: '4px' }}>~/.local/share/</code>
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
          <strong>🔌 接続プール設定</strong>
        </p>
        <ul style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, paddingLeft: '20px' }}>
          <li><strong>最大コネクション数:</strong> 10</li>
          <li><strong>最小アイドルコネクション数:</strong> 2</li>
        </ul>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', marginBottom: 0 }}>
          r2d2を使用してSQLiteコネクションをプール管理しています。
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
          <strong>⚙️ PRAGMA設定</strong>
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
          データベース接続時に以下のPRAGMAが自動的に設定されます：
        </p>
        <pre style={{
          backgroundColor: 'var(--color-background)',
          padding: '12px',
          borderRadius: '6px',
          fontSize: '12px',
          overflow: 'auto',
          color: 'var(--color-text)',
          margin: 0,
        }}>
{`PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA cache_size = -64000;`}
        </pre>
        <ul style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
          <li><strong>journal_mode = WAL:</strong> 書き込み先読みログモード。読み取りと書き込みの並行実行が可能</li>
          <li><strong>synchronous = NORMAL:</strong> 通常モード。パフォーマンスと安全性のバランス</li>
          <li><strong>foreign_keys = ON:</strong> 外部キー制約を有効化</li>
          <li><strong>busy_timeout = 5000:</strong> ビジー状態のタイムアウト（5秒）</li>
          <li><strong>cache_size = -64000:</strong> キャッシュサイズ（64MB）</li>
        </ul>
      </div>

      <div style={{
        padding: '16px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-color)',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: '8px' }}>
          <strong>📊 データベースの役割</strong>
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
          SQLiteは構造化データの永続化に使用されています：
        </p>
        <ul style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, paddingLeft: '20px' }}>
          <li>ユーザー管理、組織情報、メンバー情報</li>
          <li>議事録、注力施策、テーマ</li>
          <li>エンティティ、関係、トピックのメタデータ</li>
          <li>システム設計ドキュメント、AI設定</li>
          <li>ChromaDB同期状態の管理</li>
        </ul>
      </div>
    </div>
  );
}

