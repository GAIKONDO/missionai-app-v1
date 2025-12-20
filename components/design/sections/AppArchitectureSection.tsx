'use client';

import React from 'react';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../common/ZoomableMermaidDiagram';
import { styles } from '../common/styles';

export function AppArchitectureSection() {
  return (
    <div>
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

      <CollapsibleSection 
        title="主要ライブラリ・技術スタック" 
        defaultExpanded={false}
        id="tech-stack-section"
      >
        
        <div style={{ marginBottom: '24px' }}>
          <h4 style={styles.subsectionTitle}>
            <span style={styles.colorDot('#4A90E2')}></span>
            フロントエンド（Next.js / React）
          </h4>
          <div style={styles.subsectionContent}>
            <ul style={styles.subsectionList}>
              <li><strong>Next.js 14:</strong> Reactフレームワーク、SSR/SSG対応</li>
              <li><strong>React 18:</strong> UIライブラリ</li>
              <li><strong>TypeScript:</strong> 型安全なJavaScript</li>
              <li><strong>@tanstack/react-query:</strong> サーバー状態管理、キャッシング</li>
              <li><strong>D3.js:</strong> データ可視化（グラフ、チャート）</li>
              <li><strong>react-force-graph / react-force-graph-3d:</strong> 3Dグラフ可視化</li>
              <li><strong>Three.js:</strong> 3Dレンダリング</li>
              <li><strong>@monaco-editor/react:</strong> コードエディタ</li>
              <li><strong>react-markdown:</strong> Markdownレンダリング</li>
            </ul>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={styles.subsectionTitle}>
            <span style={styles.colorDot('#F5A623')}></span>
            バックエンド（Rust / Tauri）
          </h4>
          <div style={styles.subsectionContent}>
            <ul style={styles.subsectionList}>
              <li><strong>Tauri 2.0:</strong> デスクトップアプリフレームワーク（軽量、セキュア）</li>
              <li><strong>Tokio:</strong> 非同期ランタイム</li>
              <li><strong>Axum:</strong> HTTPサーバーフレームワーク</li>
              <li><strong>rusqlite:</strong> SQLiteデータベースドライバ</li>
              <li><strong>chromadb (2.3.0):</strong> ChromaDB Rustクライアント</li>
              <li><strong>reqwest:</strong> HTTPクライアント（OpenAI/Ollama API呼び出し）</li>
              <li><strong>serde / serde_json:</strong> シリアライゼーション</li>
              <li><strong>uuid:</strong> UUID生成</li>
              <li><strong>chrono:</strong> 日時処理</li>
            </ul>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={styles.subsectionTitle}>
            <span style={styles.colorDot('#7ED321')}></span>
            データベース
          </h4>
          <div style={styles.subsectionContent}>
            <ul style={styles.subsectionList}>
              <li><strong>SQLite:</strong> 構造化データの保存（エンティティ、リレーション、メタデータ）</li>
              <li><strong>ChromaDB:</strong> ベクトルデータベース（埋め込みベクトルの保存・検索）</li>
              <li><strong>Python:</strong> ChromaDBサーバーの実行環境</li>
            </ul>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={styles.subsectionTitle}>
            <span style={styles.colorDot('#BD10E0')}></span>
            外部サービス・API
          </h4>
          <div style={styles.subsectionContent}>
            <ul style={styles.subsectionList}>
              <li><strong>OpenAI API:</strong> 埋め込みベクトル生成（text-embedding-3-small等）</li>
              <li><strong>Ollama:</strong> ローカルLLM実行環境（埋め込み生成の代替）</li>
            </ul>
          </div>
        </div>

        <div>
          <h3 style={styles.sectionTitle}>
            技術スタックの特徴
          </h3>
          <div style={{ ...styles.infoBox, padding: '20px' }}>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
              <li><strong>クロスプラットフォーム:</strong> Tauriにより、Mac/Windows/Linuxで動作</li>
              <li><strong>パフォーマンス:</strong> Rustバックエンドによる高速処理</li>
              <li><strong>セキュリティ:</strong> TauriのセキュリティモデルとRustのメモリ安全性</li>
              <li><strong>スケーラビリティ:</strong> ChromaDBによる大規模ベクトル検索対応</li>
              <li><strong>開発体験:</strong> TypeScript + Reactによる型安全なフロントエンド開発</li>
            </ul>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
