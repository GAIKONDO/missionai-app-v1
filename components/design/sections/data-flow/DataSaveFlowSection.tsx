'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * データ保存フローセクション
 */
export function DataSaveFlowSection() {
  return (
    <CollapsibleSection 
      title="データ保存フロー" 
      defaultExpanded={false}
      id="data-save-flow-section"
    >
      <ZoomableMermaidDiagram
        diagramId="data-save-flow-diagram"
        mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Frontend
    participant Backend as Rust Backend
    participant EmbedAPI as 埋め込みAPI<br/>(OpenAI/Ollama)
    participant SQLite as SQLite
    participant ChromaDB as ChromaDB

    User->>Frontend: エンティティ・リレーション・トピック作成
    Frontend->>Backend: データ保存リクエスト
    Backend->>SQLite: 構造化データ保存<br/>(id, name, type, metadata)
    Backend-->>Frontend: 保存完了
    
    Frontend->>Backend: 埋め込み生成（非同期）
    Backend->>EmbedAPI: 埋め込みベクトル生成<br/>(エンティティ名+メタデータ)
    EmbedAPI-->>Backend: 埋め込みベクトル
    Backend->>ChromaDB: ベクトル保存<br/>(id, embedding, metadata含むSQLiteのID)
    
    Note over SQLite,ChromaDB: SQLite: 構造化データ（マスターデータ）<br/>ChromaDB: ベクトルデータ（検索インデックス）`}
      />
      
      <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>保存フローの特徴</h4>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>二段階保存:</strong> まずSQLiteに構造化データを保存し、その後非同期でChromaDBに埋め込みベクトルを保存</li>
          <li><strong>IDの一貫性:</strong> ChromaDBの<code>id</code>フィールドはSQLiteのIDと同じ値を使用し、メタデータにも含める</li>
          <li><strong>非同期処理:</strong> 埋め込み生成は非同期で実行され、ユーザー操作をブロックしない</li>
          <li><strong>エラーハンドリング:</strong> 埋め込み生成が失敗しても、SQLiteのデータは保存済み（後で再生成可能）</li>
        </ul>
      </div>
    </CollapsibleSection>
  );
}

