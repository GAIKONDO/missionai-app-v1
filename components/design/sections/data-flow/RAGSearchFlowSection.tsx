'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * RAG検索フローセクション
 */
export function RAGSearchFlowSection() {
  return (
    <CollapsibleSection 
      title="RAG検索フロー" 
      defaultExpanded={false}
      id="rag-search-flow-section"
    >
      <ZoomableMermaidDiagram
        diagramId="rag-search-flow-diagram"
        mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Next.js Frontend
    participant RAGOrch as RAGオーケストレーター
    participant API as Rust API Server
    participant EmbedAPI as 埋め込みAPI
    participant ChromaDB as ChromaDB
    participant SQLite as SQLite
    participant LLM as LLM API

    User->>Frontend: 検索クエリ入力
    Frontend->>RAGOrch: orchestrate(query, limit, filters)
    
    Note over RAGOrch: 複数の情報源から情報を取得（並列実行）
    
    par 並列情報取得
        RAGOrch->>API: ナレッジグラフ検索
        API->>EmbedAPI: クエリの埋め込みベクトル生成
        EmbedAPI-->>API: クエリ埋め込みベクトル
        API->>ChromaDB: エンティティ類似度検索
        API->>ChromaDB: リレーション類似度検索
        API->>ChromaDB: トピック類似度検索
        ChromaDB-->>API: 検索結果（ID + 類似度）
        API->>SQLite: IDで詳細情報取得
        SQLite-->>API: 詳細データ
        API->>API: 結果統合・スコアリング
        API-->>RAGOrch: ナレッジグラフ検索結果
    and
        RAGOrch->>API: 設計ドキュメント検索
        API->>EmbedAPI: クエリの埋め込みベクトル生成
        EmbedAPI-->>API: クエリ埋め込みベクトル
        API->>ChromaDB: 設計ドキュメント類似度検索
        ChromaDB-->>API: 類似セクションID + 類似度
        API->>SQLite: IDで詳細情報取得
        SQLite-->>API: 詳細データ
        API-->>RAGOrch: 設計ドキュメント検索結果
    and
        RAGOrch->>RAGOrch: MCP情報源から情報取得
    end
    
    Note over RAGOrch: 結果統合・重複排除・スコアリング
    RAGOrch->>RAGOrch: 重み付け適用
    RAGOrch->>RAGOrch: 重複排除
    RAGOrch->>RAGOrch: スコアでソート・フィルタリング
    RAGOrch->>RAGOrch: トークン数制限内で情報選択
    RAGOrch->>RAGOrch: コンテキスト文字列生成
    
    RAGOrch-->>Frontend: 統合コンテキスト
    
    alt AIアシスタント使用時
        Frontend->>LLM: コンテキスト + ユーザークエリ
        LLM-->>Frontend: コンテキストに基づく回答
        Frontend-->>User: AI回答表示
    else 検索結果のみ表示
        Frontend-->>User: 検索結果表示
    end
    
    Note over ChromaDB,SQLite: ChromaDB: 高速な類似度検索<br/>SQLite: 詳細情報の取得`}
      />
      
      <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>RAG検索の特徴</h4>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>RAGオーケストレーター:</strong> 複数の情報源（ナレッジグラフ、設計ドキュメント、MCP）を統合して情報を取得</li>
          <li><strong>並列検索:</strong> エンティティ、リレーション、トピック、設計ドキュメントを並列に検索してパフォーマンスを最適化</li>
          <li><strong>ハイブリッド検索:</strong> ChromaDBのベクトル類似度とSQLiteのメタデータを組み合わせてスコアリング</li>
          <li><strong>重み付けと統合:</strong> 情報源ごとに重みを適用し、重複排除、スコアリング、フィルタリングを実行</li>
          <li><strong>コンテキスト構築:</strong> 検索結果をLLMのコンテキストとして使用し、より正確な回答を生成</li>
          <li><strong>段階的取得:</strong> まずChromaDBで高速に類似度検索し、その後SQLiteで詳細情報を取得</li>
        </ul>
      </div>
    </CollapsibleSection>
  );
}

