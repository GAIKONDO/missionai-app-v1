'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * データ更新フローセクション
 */
export function DataUpdateFlowSection() {
  return (
    <CollapsibleSection 
      title="データ更新フロー" 
      defaultExpanded={false}
      id="data-update-flow-section"
    >
      <ZoomableMermaidDiagram
        diagramId="data-update-flow-diagram"
        mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Frontend
    participant Backend as Rust Backend
    participant EmbedAPI as 埋め込みAPI<br/>(OpenAI/Ollama)
    participant SQLite as SQLite
    participant ChromaDB as ChromaDB

    User->>Frontend: エンティティ・リレーション・トピック編集
    Frontend->>Backend: 更新リクエスト
    Backend->>SQLite: 構造化データ更新<br/>(name, type, metadata等)
    SQLite-->>Backend: 更新完了
    
    Backend-->>Frontend: 更新完了通知
    
    Frontend->>Backend: 埋め込み再生成（非同期）
    Backend->>EmbedAPI: 更新された内容で<br/>埋め込みベクトル再生成
    EmbedAPI-->>Backend: 新しい埋め込みベクトル
    Backend->>ChromaDB: ベクトル更新（upsert）<br/>(同じIDで上書き)
    ChromaDB-->>Backend: 更新完了
    
    Note over SQLite,ChromaDB: SQLite: 即座に更新<br/>ChromaDB: 非同期で埋め込み再生成後に更新`}
      />
      
      <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>更新フローの特徴</h4>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>即座の更新:</strong> SQLiteの構造化データは即座に更新され、ユーザーはすぐに変更を確認できる</li>
          <li><strong>非同期再生成:</strong> 埋め込みベクトルは非同期で再生成され、検索精度を維持</li>
          <li><strong>Upsert操作:</strong> ChromaDBでは<code>upsert</code>を使用し、同じIDで既存データを上書き</li>
          <li><strong>IDの保持:</strong> 更新時もIDは変更されず、SQLiteとChromaDBの連携が維持される</li>
        </ul>
      </div>
    </CollapsibleSection>
  );
}

