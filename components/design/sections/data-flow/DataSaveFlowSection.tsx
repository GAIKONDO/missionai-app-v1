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
      <div style={{ marginBottom: '32px' }}>
        <h4 style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          color: 'var(--color-text)',
          borderBottom: '2px solid var(--color-border-color)',
          paddingBottom: '8px'
        }}>
          パターン1: AI生成によるメタデータ抽出
        </h4>
      <ZoomableMermaidDiagram
          diagramId="data-save-flow-pattern1"
        mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Next.js Frontend
    participant API as Rust API Server<br/>(Axum)
    participant AI as AI生成<br/>(GPT-4o-mini等)
    participant EmbedAPI as 埋め込みAPI<br/>(OpenAI/Ollama)
    participant SQLite as SQLite
    participant ChromaDB as ChromaDB
    
    User->>Frontend: トピック作成・編集
    Frontend->>AI: トピック内容から<br/>エンティティ・リレーション抽出
    AI-->>Frontend: 抽出結果<br/>(エンティティ、リレーション)
    User->>Frontend: AI生成結果の確認・編集
    Frontend->>API: HTTP API: エンティティ・リレーション保存<br/>(POST /api/entities, /api/relations)
    API->>SQLite: 構造化データ保存<br/>(id, name, type, metadata)
    SQLite-->>API: 保存完了
    API-->>Frontend: 保存完了
    
    Note over Frontend,ChromaDB: 埋め込み生成（非同期・バックグラウンド）
    Frontend->>API: 埋め込み生成リクエスト<br/>(非同期)
    API->>EmbedAPI: 埋め込みベクトル生成<br/>(エンティティ名+メタデータ)
    EmbedAPI-->>API: 埋め込みベクトル<br/>(1536次元)
    API->>ChromaDB: ベクトル保存<br/>(id, embedding, metadata含むSQLiteのID)
    ChromaDB-->>API: 保存完了
    
    Note over SQLite,ChromaDB: SQLite: 構造化データ（マスターデータ）<br/>ChromaDB: ベクトルデータ（検索インデックス）<br/>IDで連携（ChromaDBのid = SQLiteのid）`}
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
          パターン2: 手動入力によるメタデータ作成
        </h4>
        <ZoomableMermaidDiagram
          diagramId="data-save-flow-pattern2"
          mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Next.js Frontend
    participant API as Rust API Server<br/>(Axum)
    participant EmbedAPI as 埋め込みAPI<br/>(OpenAI/Ollama)
    participant SQLite as SQLite
    participant ChromaDB as ChromaDB
    
    User->>Frontend: エンティティ手動作成
    Frontend->>API: HTTP API: createEntity<br/>(POST /api/entities)
    API->>SQLite: エンティティ情報保存<br/>(id, name, type, metadata)
    SQLite-->>API: 保存完了
    API-->>Frontend: 作成されたエンティティ
    
    Note over Frontend,ChromaDB: 埋め込み生成（非同期・バックグラウンド）
    Frontend->>API: 埋め込み生成リクエスト<br/>(非同期)
    API->>EmbedAPI: 埋め込みベクトル生成
    EmbedAPI-->>API: 埋め込みベクトル
    API->>ChromaDB: ベクトル保存<br/>(entities_{orgId}コレクション)
    ChromaDB-->>API: 保存完了
    
    Note over SQLite,ChromaDB: SQLite: 構造化データ（マスターデータ）<br/>ChromaDB: ベクトルデータ（検索インデックス）<br/>IDで連携（ChromaDBのid = SQLiteのid）`}
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
          パターン3: 設計ドキュメント保存
        </h4>
        <ZoomableMermaidDiagram
          diagramId="data-save-flow-pattern3"
          mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Next.js Frontend
    participant API as Rust API Server<br/>(Axum)
    participant EmbedAPI as 埋め込みAPI<br/>(OpenAI/Ollama)
    participant SQLite as SQLite
    participant ChromaDB as ChromaDB

    User->>Frontend: 設計ドキュメントセクション作成
    Frontend->>API: HTTP API: セクション保存<br/>(POST /api/design-doc-sections)
    API->>SQLite: セクション情報保存<br/>(designDocSectionsテーブル)
    SQLite-->>API: 保存完了
    API-->>Frontend: 保存完了
    
    Note over Frontend,ChromaDB: 埋め込み生成（非同期・バックグラウンド）
    Frontend->>API: 埋め込み生成リクエスト<br/>(非同期)
    API->>EmbedAPI: 埋め込みベクトル生成<br/>(タイトル+内容)
    EmbedAPI-->>API: 埋め込みベクトル<br/>(text-embedding-3-small)
    API->>ChromaDB: ベクトル保存<br/>(design_docsコレクション、組織を跨いで共有)
    ChromaDB-->>API: 保存完了
    
    Note over SQLite,ChromaDB: SQLite: 構造化データ（マスターデータ）<br/>ChromaDB: ベクトルデータ（検索インデックス）<br/>IDで連携（ChromaDBのid = SQLiteのid）`}
      />
      </div>
    </CollapsibleSection>
  );
}
