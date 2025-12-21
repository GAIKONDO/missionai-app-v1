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
      <ZoomableMermaidDiagram
        diagramId="data-delete-flow-diagram"
        mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Frontend
    participant Backend as Rust Backend
    participant SQLite as SQLite
    participant ChromaDB as ChromaDB

    User->>Frontend: エンティティ・リレーション・トピック削除
    Frontend->>Backend: 削除リクエスト
    
    Backend->>SQLite: 構造化データ削除<br/>(idで削除)
    SQLite-->>Backend: 削除完了
    
    Backend->>ChromaDB: ベクトル削除<br/>(同じIDで削除)
    ChromaDB-->>Backend: 削除完了
    
    Backend-->>Frontend: 削除完了通知
    Frontend-->>User: 削除完了表示
    
    Note over SQLite,ChromaDB: 両方のデータベースから<br/>同じIDで削除される`}
      />
      
      <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>削除フローの特徴</h4>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>同期削除:</strong> SQLiteとChromaDBの両方から同じIDで削除される</li>
          <li><strong>データ整合性:</strong> 両方のデータベースでデータが一致するように保証</li>
          <li><strong>関連データ:</strong> 削除時は関連するリレーションやトピックも適切に処理される</li>
          <li><strong>エラーハンドリング:</strong> 一方の削除が失敗した場合、ロールバックまたは再試行が行われる</li>
        </ul>
      </div>
    </CollapsibleSection>
  );
}

