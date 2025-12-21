'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';
import { styles } from '../../common/styles';

/**
 * アーキテクチャ図セクション
 */
export function ArchitectureDiagramSection() {
  return (
    <CollapsibleSection 
      title="アーキテクチャ図" 
      defaultExpanded={false}
      id="app-architecture-diagram-section"
    >
      <ZoomableMermaidDiagram
        diagramId="app-architecture-diagram"
        mermaidCode={`graph TB
    subgraph "MissionAIアプリ（ローカルPC）"
        subgraph "フロントエンド層"
            NextJS[Next.js 14<br/>React 18 + TypeScript]
            UI[UIコンポーネント<br/>- React Components<br/>- D3.js<br/>- Three.js<br/>- Monaco Editor]
            State[状態管理<br/>- React Query<br/>- React Hooks]
            AIAssistant[AIアシスタント<br/>チャットインターフェース]
        end

        subgraph "バックエンド層（Rust）"
            Tauri[Tauri 2.0<br/>デスクトップアプリフレームワーク]
            API[HTTP API Server<br/>Axum]
            Commands[Tauri Commands<br/>IPC通信]
        end

        subgraph "データベース層"
            SQLite[(SQLite<br/>rusqlite)]
            ChromaDB[(ChromaDB<br/>Python Server)]
            ChromaClient[ChromaDB Rust Client<br/>chromadb crate]
        end
    end

    subgraph "Ollama（ローカルPC）"
        Ollama[Ollama<br/>ローカルLLM実行環境]
        EmbedModel1[nomic-embed-text<br/>埋め込みモデル]
        EmbedModel2[all-minilm<br/>埋め込みモデル]
        EmbedModel3[mxbai-embed-large<br/>埋め込みモデル]
        LLMModel1[qwen2.5:latest<br/>LLMモデル]
        LLMModel2[llama2 / llama3<br/>LLMモデル]
    end

    subgraph "クラウド（外部サービス）"
        OpenAI[OpenAI API<br/>埋め込み生成・LLM<br/>text-embedding-3-small<br/>GPT-4o-mini等]
    end

    NextJS -->|Tauri IPC| Tauri
    NextJS -->|HTTP| API
    Tauri --> Commands
    Commands --> SQLite
    Commands --> ChromaClient
    ChromaClient -->|HTTP localhost| ChromaDB
    API --> SQLite
    API --> ChromaClient
    Commands -->|HTTP localhost| Ollama
    Ollama --> EmbedModel1
    Ollama --> EmbedModel2
    Ollama --> EmbedModel3
    Ollama --> LLMModel1
    Ollama --> LLMModel2
    Commands -->|HTTPS インターネット| OpenAI
    
    AIAssistant -->|"ユーザークエリ"| NextJS
    NextJS -->|"RAG検索実行"| ChromaClient
    ChromaClient -->|"類似度検索"| ChromaDB
    ChromaDB -.->|"検索結果ID"| ChromaClient
    ChromaClient -->|"詳細情報取得"| SQLite
    SQLite -->|"エンティティ・リレーション・トピック情報"| NextJS
    NextJS -->|"RAGコンテキスト + ユーザークエリ"| AIAssistant
    AIAssistant -->|"LLM API呼び出し"| OpenAI
    AIAssistant -->|"LLM API呼び出し"| Ollama
    Ollama --> LLMModel1
    Ollama --> LLMModel2
    OpenAI -->|"回答生成"| AIAssistant
    Ollama -->|"回答生成"| AIAssistant
    AIAssistant -->|"回答表示"| NextJS

    style NextJS fill:#e1f5ff
    style Tauri fill:#fff4e1
    style SQLite fill:#e8f5e9
    style ChromaDB fill:#fce4ec
    style Ollama fill:#fff9c4
    style EmbedModel1 fill:#fffde7
    style EmbedModel2 fill:#fffde7
    style EmbedModel3 fill:#fffde7
    style LLMModel1 fill:#fffde7
    style LLMModel2 fill:#fffde7
    style OpenAI fill:#ffebee
    style AIAssistant fill:#e3f2fd`}
      />
      
      <div style={styles.infoBox}>
        <h4 style={styles.infoBoxTitle}>実行環境の説明</h4>
        <ul style={styles.infoBoxList}>
          <li><strong style={{ color: '#4A90E2' }}>MissionAIアプリ（ローカルPC）:</strong> Tauriアプリとしてバンドルされ、ユーザーのPC上で直接実行される</li>
          <li><strong style={{ color: '#F5A623' }}>Ollama（ローカルPC）:</strong> ユーザーのPC上で動作するローカルLLM実行環境。埋め込み生成とLLM推論の両方に対応</li>
          <li><strong style={{ color: '#E53935' }}>クラウド（外部サービス）:</strong> インターネット経由でアクセスする外部API（OpenAI APIなど）</li>
        </ul>
      </div>

      <div style={styles.infoBox}>
        <h4 style={styles.infoBoxTitle}>AIアシスタントの動作</h4>
        <p style={styles.infoBoxText}>
          AIアシスタントは、ユーザーの質問に対して<strong>RAG（Retrieval-Augmented Generation）</strong>を使用して回答を生成します。
        </p>
        <ol style={styles.infoBoxList}>
          <li><strong>ユーザークエリ受信:</strong> ユーザーが質問を入力</li>
          <li><strong>RAG検索実行:</strong> クエリに関連するエンティティ、リレーション、トピックをChromaDBで検索</li>
          <li><strong>詳細情報取得:</strong> 検索結果のIDを使用してSQLiteから詳細情報を取得</li>
          <li><strong>コンテキスト構築:</strong> 検索結果をコンテキストとして整形</li>
          <li><strong>LLM API呼び出し:</strong> OpenAI APIまたはOllamaに、コンテキスト + ユーザークエリを送信</li>
          <li><strong>回答生成:</strong> LLMがコンテキストを参照して回答を生成</li>
          <li><strong>回答表示:</strong> 生成された回答をユーザーに表示</li>
        </ol>
        <p style={styles.infoBoxText}>
          <strong>読み込むデータ:</strong> エンティティ（名前、タイプ、メタデータ）、リレーション（関係性、説明）、トピック（タイトル、コンテンツ、キーワード）の情報をRAG検索で取得し、LLMのコンテキストとして使用します。
        </p>
      </div>
    </CollapsibleSection>
  );
}

