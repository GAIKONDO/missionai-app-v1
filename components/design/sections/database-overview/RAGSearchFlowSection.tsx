'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * RAG検索の流れセクション
 */
export function RAGSearchFlowSection() {
  return (
    <CollapsibleSection 
      title="RAG検索の流れ" 
      defaultExpanded={false}
      id="rag-search-flow-section"
    >
      <ZoomableMermaidDiagram
        diagramId="rag-search-flow-diagram"
        mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Frontend
    participant Backend as Rust Backend
    participant EmbedAPI as 埋め込みAPI<br/>(OpenAI/Ollama)
    participant ChromaDB as ChromaDB
    participant SQLite as SQLite
    participant AI as AIアシスタント<br/>(GPT-4o-mini等)

    User->>Frontend: 検索クエリ入力<br/>例: "トヨタのプロジェクト"
    Frontend->>Backend: RAG検索リクエスト
    Backend->>EmbedAPI: クエリの埋め込みベクトル生成
    EmbedAPI-->>Backend: クエリ埋め込みベクトル
    
    par 並列検索
        Backend->>ChromaDB: エンティティ類似度検索
        ChromaDB-->>Backend: 類似エンティティID + 類似度
    and
        Backend->>ChromaDB: リレーション類似度検索
        ChromaDB-->>Backend: 類似リレーションID + 類似度
    and
        Backend->>ChromaDB: トピック類似度検索
        ChromaDB-->>Backend: 類似トピックID + 類似度
    end
    
    Backend->>SQLite: IDで詳細情報取得<br/>(エンティティ、リレーション、トピック)
    SQLite-->>Backend: 詳細データ
    
    Backend->>Backend: 結果統合・スコアリング<br/>(ベクトル類似度 + メタデータブースト)
    Backend-->>Frontend: 検索結果<br/>(エンティティ、リレーション、トピック)
    Frontend-->>User: 検索結果表示
    
    opt AIアシスタント使用時
        Frontend->>AI: 検索結果をコンテキストに追加
        AI-->>Frontend: コンテキストに基づく回答
    end
    
    Note over ChromaDB,SQLite: ChromaDB: 高速な類似度検索<br/>SQLite: 詳細情報の取得`}
      />
    </CollapsibleSection>
  );
}

