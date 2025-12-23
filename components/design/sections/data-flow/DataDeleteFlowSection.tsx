'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * データ削除フローセクション
 */
export function DataDeleteFlowSection() {
  return (
    <CollapsibleSection 
      title="データ削除フロー" 
      defaultExpanded={false}
      id="data-delete-flow-section"
    >
      <div style={{ marginBottom: '32px' }}>
        <h4 style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          color: 'var(--color-text)',
          borderBottom: '2px solid var(--color-border-color)',
          paddingBottom: '8px'
        }}>
          パターン1: エンティティ削除
        </h4>
        <ZoomableMermaidDiagram
          diagramId="data-delete-flow-entity"
          mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Next.js Frontend
    participant API as Rust API Server
    participant SQLite as SQLite
    participant ChromaDB as ChromaDB

    User->>Frontend: エンティティ削除
    Frontend->>API: HTTP API: 関連リレーション取得<br/>(GET /api/relations?entityId=xxx)
    API->>SQLite: 関連リレーション取得
    SQLite-->>API: 関連リレーション一覧
    API-->>Frontend: 関連リレーション一覧
    
    Note over Frontend,ChromaDB: 関連リレーションを削除
    Frontend->>API: HTTP API: リレーション削除<br/>(DELETE /api/relations/{id})
    API->>SQLite: リレーション削除
    API->>ChromaDB: リレーション埋め込み削除<br/>(非同期、エラーは無視)
    
    Note over Frontend,ChromaDB: エンティティ削除
    Frontend->>API: HTTP API: エンティティ削除<br/>(DELETE /api/entities/{id})
    API->>SQLite: エンティティ削除
    SQLite-->>API: 削除完了
    API-->>Frontend: 削除完了
    
    Note over Frontend,ChromaDB: ChromaDB埋め込み削除（非同期）
    Frontend->>API: ChromaDB埋め込み削除<br/>(非同期、エラーは無視)
    API->>ChromaDB: エンティティ埋め込み削除<br/>(entities_{orgId})
    ChromaDB-->>API: 削除完了
    
    Frontend-->>User: 削除完了表示`}
        />
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h4 style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          color: 'var(--color-text)',
          borderBottom: '2px solid var(--color-border-color)',
          paddingBottom: '8px'
        }}>
          パターン2: トピック削除
        </h4>
        <ZoomableMermaidDiagram
          diagramId="data-delete-flow-topic"
          mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Next.js Frontend
    participant API as Rust API Server
    participant SQLite as SQLite
    participant ChromaDB as ChromaDB

    User->>Frontend: トピック削除
    Frontend->>API: HTTP API: 関連リレーション取得<br/>(GET /api/relations?topicId=xxx)
    API->>SQLite: 関連リレーション取得
    SQLite-->>API: 関連リレーション一覧
    API-->>Frontend: 関連リレーション一覧
    
    Note over Frontend,ChromaDB: 関連リレーションを削除
    Frontend->>API: HTTP API: リレーション削除<br/>(DELETE /api/relations/{id})
    API->>SQLite: リレーション削除
    API->>ChromaDB: リレーション埋め込み削除<br/>(非同期、エラーは無視)
    
    Note over Frontend,ChromaDB: トピック削除
    Frontend->>API: HTTP API: トピック削除<br/>(DELETE /api/topics/{id})
    API->>SQLite: トピック削除<br/>(topicsテーブル)
    SQLite-->>API: 削除完了
    API-->>Frontend: 削除完了
    
    Note over Frontend,ChromaDB: ChromaDB埋め込み削除（非同期）
    Frontend->>API: ChromaDB埋め込み削除<br/>(非同期、エラーは無視)
    API->>ChromaDB: トピック埋め込み削除<br/>(topics_{orgId})
    ChromaDB-->>API: 削除完了
    
    Frontend-->>User: 削除完了表示`}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h4 style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          color: 'var(--color-text)',
          borderBottom: '2px solid var(--color-border-color)',
          paddingBottom: '8px'
        }}>
          パターン3: リレーション削除
        </h4>
        <ZoomableMermaidDiagram
          diagramId="data-delete-flow-relation"
          mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Next.js Frontend
    participant API as Rust API Server
    participant SQLite as SQLite
    participant ChromaDB as ChromaDB

    User->>Frontend: リレーション削除
    Frontend->>API: HTTP API: リレーション削除<br/>(DELETE /api/relations/{id})
    API->>SQLite: リレーション削除<br/>(relationsテーブル)
    SQLite-->>API: 削除完了
    API-->>Frontend: 削除完了
    
    Note over Frontend,ChromaDB: ChromaDB埋め込み削除（非同期）
    Frontend->>API: ChromaDB埋め込み削除<br/>(非同期、エラーは無視)
    API->>ChromaDB: リレーション埋め込み削除<br/>(relations_{orgId})
    ChromaDB-->>API: 削除完了
    
    Frontend-->>User: 削除完了表示`}
        />
      </div>
      
      <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>削除フローの特徴</h4>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>関連データの処理:</strong> エンティティやトピック削除時は、関連するリレーションを先に削除</li>
          <li><strong>SQLite優先:</strong> まずSQLiteから構造化データを削除し、その後ChromaDBから埋め込みを削除</li>
          <li><strong>非同期削除:</strong> ChromaDBの埋め込み削除は非同期で実行され、エラーが発生しても処理を続行</li>
          <li><strong>データ整合性:</strong> SQLiteがマスターデータとして機能し、ChromaDBは検索用インデックスとして管理</li>
          <li><strong>エラーハンドリング:</strong> ChromaDBの削除が失敗しても、SQLiteの削除は完了しているため、データの整合性は維持される</li>
        </ul>
      </div>
    </CollapsibleSection>
  );
}

