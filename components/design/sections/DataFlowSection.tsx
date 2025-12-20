'use client';

import React from 'react';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../common/ZoomableMermaidDiagram';

export function DataFlowSection() {
  return (
    <div>
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

      <CollapsibleSection 
        title="RAG検索フロー" 
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
        
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>RAG検索の特徴</h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>並列検索:</strong> エンティティ、リレーション、トピックを並列に検索してパフォーマンスを最適化</li>
            <li><strong>ハイブリッド検索:</strong> ChromaDBのベクトル類似度とSQLiteのメタデータを組み合わせてスコアリング</li>
            <li><strong>コンテキスト構築:</strong> 検索結果をLLMのコンテキストとして使用し、より正確な回答を生成</li>
            <li><strong>段階的取得:</strong> まずChromaDBで高速に類似度検索し、その後SQLiteで詳細情報を取得</li>
          </ul>
        </div>
      </CollapsibleSection>

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
    </div>
  );
}
