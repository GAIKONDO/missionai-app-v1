'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * データ保存・埋め込み生成の流れセクション
 */
export function DataSaveFlowSection() {
  return (
    <CollapsibleSection 
      title="データ保存・埋め込み生成の流れ" 
      defaultExpanded={false}
      id="data-save-embedding-section"
    >
      <ZoomableMermaidDiagram
        diagramId="data-save-flow-diagram"
        mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Frontend
    participant Backend as Rust Backend
    participant AI as AI生成<br/>(GPT-4o-mini等)
    participant EmbedAPI as 埋め込みAPI<br/>(OpenAI/Ollama)
    participant SQLite as SQLite
    participant ChromaDB as ChromaDB

    Note over User,ChromaDB: パターン1: AI生成によるメタデータ抽出
    
    User->>Frontend: トピック作成・編集
    Frontend->>AI: トピック内容から<br/>エンティティ・リレーション抽出
    AI-->>Frontend: 抽出結果<br/>(エンティティ、リレーション)
    User->>Frontend: AI生成結果の確認・編集
    Frontend->>Backend: エンティティ・リレーション保存
    Backend->>SQLite: 構造化データ保存<br/>(id, name, type, metadata)
    Backend-->>Frontend: 保存完了
    
    Frontend->>Backend: 埋め込み生成（非同期）
    Backend->>EmbedAPI: 埋め込みベクトル生成<br/>(エンティティ名+メタデータ)
    EmbedAPI-->>Backend: 埋め込みベクトル
    Backend->>ChromaDB: ベクトル保存<br/>(id, embedding, metadata含むSQLiteのID)
    
    Note over User,ChromaDB: パターン2: 手動入力によるメタデータ作成
    
    User->>Frontend: エンティティ手動作成
    Frontend->>Backend: createEntity API
    Backend->>SQLite: エンティティ情報保存
    Backend-->>Frontend: 作成されたエンティティ
    Frontend->>Backend: 埋め込み生成（非同期）
    Backend->>EmbedAPI: 埋め込みベクトル生成
    EmbedAPI-->>Backend: 埋め込みベクトル
    Backend->>ChromaDB: ベクトル保存
    
    Note over SQLite,ChromaDB: SQLite: 構造化データ（マスターデータ）<br/>ChromaDB: ベクトルデータ（検索インデックス）`}
      />
    </CollapsibleSection>
  );
}

