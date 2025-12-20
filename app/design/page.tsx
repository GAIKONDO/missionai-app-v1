'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, startTransition } from 'react';
import Layout from '@/components/Layout';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { searchDesignDocs, listDesignDocSectionIds, type DesignDocResult } from '@/lib/designDocRAG';
import { FiSearch, FiMessageSquare, FiX, FiSend, FiCopy, FiCheck, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import AIAssistantPanel from '@/components/AIAssistantPanel';
import { getAllSections, getAllSectionsLightweight, getSection, createSection, updateSection, deleteSection, type DesignDocSection } from '@/lib/designDocSections';
import { saveDesignDocEmbeddingToChroma } from '@/lib/designDocRAG';
import { analyzeSectionSemantics } from '@/lib/designDocSemanticAnalysis';
import { getAllSectionRelations, createSectionRelation, updateSectionRelation, deleteSectionRelation, getSectionRelationsBySection, RELATION_TYPES, type DesignDocSectionRelation } from '@/lib/designDocSectionRelations';
import MarkdownRenderer from '@/components/MarkdownRenderer';
// テーブル詳細コンポーネント
import OrganizationsTable from '@/components/design/tables/OrganizationsTable';
import OrganizationMembersTable from '@/components/design/tables/OrganizationMembersTable';
import OrganizationContentsTable from '@/components/design/tables/OrganizationContentsTable';
import MeetingNotesTable from '@/components/design/tables/MeetingNotesTable';
import TopicsTable from '@/components/design/tables/TopicsTable';
import EntitiesTable from '@/components/design/tables/EntitiesTable';
import RelationsTable from '@/components/design/tables/RelationsTable';
import CompaniesTable from '@/components/design/tables/CompaniesTable';
import CompanyContentsTable from '@/components/design/tables/CompanyContentsTable';
import FocusInitiativesTable from '@/components/design/tables/FocusInitiativesTable';
import ThemesTable from '@/components/design/tables/ThemesTable';
import OrganizationCompanyDisplayTable from '@/components/design/tables/OrganizationCompanyDisplayTable';
import DesignDocSectionsTable from '@/components/design/tables/DesignDocSectionsTable';
import DesignDocSectionRelationsTable from '@/components/design/tables/DesignDocSectionRelationsTable';
import UsersTable from '@/components/design/tables/UsersTable';
import PageContainersTable from '@/components/design/tables/PageContainersTable';
import AdminsTable from '@/components/design/tables/AdminsTable';
import ApprovalRequestsTable from '@/components/design/tables/ApprovalRequestsTable';
import AiSettingsTable from '@/components/design/tables/AiSettingsTable';
import BackupHistoryTable from '@/components/design/tables/BackupHistoryTable';
import ThemeHierarchyConfigsTable from '@/components/design/tables/ThemeHierarchyConfigsTable';

// Mermaid.jsの型定義は lib/mermaidLoader.ts で定義されています

// 共通スタイル定数
const styles = {
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '16px',
    color: 'var(--color-text)',
  },
  subsectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '12px',
    color: 'var(--color-text)',
    display: 'flex' as const,
    alignItems: 'center' as const,
  },
  infoBox: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: 'var(--color-background)',
    borderRadius: '8px',
    border: '1px solid var(--color-border-color)',
  },
  infoBoxTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '12px',
    color: 'var(--color-text)',
  },
  infoBoxText: {
    marginBottom: '12px',
    fontSize: '14px',
    lineHeight: '1.8',
  },
  infoBoxList: {
    marginLeft: '20px',
    lineHeight: '1.8',
    fontSize: '14px',
  },
  subsectionContent: {
    paddingLeft: '24px',
    borderLeft: '2px solid #e0e0e0',
  },
  subsectionList: {
    marginLeft: '20px',
    marginBottom: '12px',
  },
  colorDot: (color: string) => ({
    display: 'inline-block',
    width: '8px',
    height: '8px',
    backgroundColor: color,
    borderRadius: '50%',
    marginRight: '8px',
  }),
};

// Mermaid図のズーム可能なラッパーコンポーネント
function ZoomableMermaidDiagram({ 
  mermaidCode, 
  diagramId 
}: { 
  mermaidCode: string; 
  diagramId: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mermaidContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const translateRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const mermaidRenderedRef = useRef(false);
  const [mermaidLoaded, setMermaidLoaded] = useState(false);

  // 最新の値をrefに同期
  useEffect(() => {
    translateRef.current = { x: translateX, y: translateY };
  }, [translateX, translateY]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  // マウスドラッグ処理
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (zoomRef.current > 1) {
        setIsDragging(true);
        dragStartRef.current = {
          x: e.clientX - translateRef.current.x,
          y: e.clientY - translateRef.current.y,
        };
        wrapper.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && zoomRef.current > 1) {
        setTranslateX(e.clientX - dragStartRef.current.x);
        setTranslateY(e.clientY - dragStartRef.current.y);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (wrapper) {
        wrapper.style.cursor = zoomRef.current > 1 ? 'grab' : 'default';
      }
    };

    wrapper.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      wrapper.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // ズーム変更時にカーソルを更新
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapper.style.cursor = zoom > 1 ? 'grab' : 'default';
    }
  }, [zoom]);

  // マウスホイールズーム
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Mermaid.jsの読み込み
  useEffect(() => {
    if (window.mermaid) {
      setMermaidLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    script.async = true;
    script.onload = () => {
      if (window.mermaid) {
        window.mermaid.initialize({ 
          startOnLoad: false, // 自動実行を無効化
          theme: 'default',
          securityLevel: 'loose',
        });
        setMermaidLoaded(true);
      }
    };
    document.head.appendChild(script);

    return () => {
      // クリーンアップはしない（他のページでも使用する可能性があるため）
    };
  }, []);

  // mermaidCodeの前回の値をrefで保持（無限ループを防ぐため）
  const previousMermaidCodeRef = useRef<string>('');

  // Mermaid図のレンダリング（このコンポーネント内で管理）
  useEffect(() => {
    if (!mermaidLoaded || !mermaidContainerRef.current) return;

    // mermaidCodeが実際に変更された場合のみ処理を実行
    if (previousMermaidCodeRef.current === mermaidCode && mermaidRenderedRef.current) {
      return; // コードが変更されていないかつレンダリング済みの場合はスキップ
    }

    // mermaidCodeが変更された場合は、レンダリング済みフラグをリセット
    if (previousMermaidCodeRef.current !== mermaidCode) {
      const svg = mermaidContainerRef.current.querySelector('svg');
      if (svg) {
        svg.remove();
      }
      mermaidRenderedRef.current = false;
      previousMermaidCodeRef.current = mermaidCode;
    }

    if (mermaidRenderedRef.current) return; // 既にレンダリング済みの場合はスキップ

    // レンダリング中フラグを設定（重複実行を防ぐ）
    if (mermaidContainerRef.current.dataset.rendering === 'true') {
      return;
    }
    mermaidContainerRef.current.dataset.rendering = 'true';

    const renderDiagram = async () => {
      try {
        // Mermaidが利用可能になるまで待つ
        let retries = 0;
        const maxRetries = 50;
        while (retries < maxRetries && (!window.mermaid || typeof window.mermaid.run !== 'function')) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        const mermaid = window.mermaid;
        if (!mermaid || typeof mermaid.run !== 'function') {
          console.warn('Mermaidが利用できません');
          return;
        }

        // コンテナがまだ存在することを確認
        if (!mermaidContainerRef.current) {
          return;
        }

        // 既にSVGが生成されている場合はスキップ
        if (mermaidContainerRef.current.querySelector('svg')) {
          mermaidRenderedRef.current = true;
          return;
        }

        // Mermaid図をレンダリング（このコンテナのみ）
        await mermaid.run({
          nodes: [mermaidContainerRef.current],
        });
        
        mermaidRenderedRef.current = true;
      } catch (error) {
        console.error('Mermaid図のレンダリングエラー:', error);
        mermaidRenderedRef.current = false;
      } finally {
        // レンダリング中フラグを解除
        if (mermaidContainerRef.current) {
          mermaidContainerRef.current.dataset.rendering = 'false';
        }
      }
    };

    renderDiagram();
  }, [mermaidLoaded, mermaidCode, diagramId]);

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={wrapperRef}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '8px',
          minHeight: '200px',
          backgroundColor: '#f5f5f5',
        }}
      >
        <div
          ref={containerRef}
          style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            transform: `scale(${zoom}) translate(${translateX}px, ${translateY}px)`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.1s ease',
            minHeight: '200px',
            userSelect: 'none',
          }}
        >
          <div 
            ref={mermaidContainerRef}
            className="mermaid" 
            data-diagram-id={diagramId}
          >
            {mermaidCode}
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '8px',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 10,
        }}
      >
        <button
          onClick={handleZoomOut}
          style={{
            padding: '6px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          −
        </button>
        <span
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            minWidth: '60px',
            justifyContent: 'center',
          }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          style={{
            padding: '6px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          +
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '6px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            marginLeft: '4px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          リセット
        </button>
      </div>
      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: 'var(--color-text-light)',
          fontStyle: 'italic',
        }}
      >
        💡 Ctrl/Cmd + マウスホイールでズーム、拡大後はドラッグで移動できます
      </div>
    </div>
  );
}

// アプリ全体構成セクション
function AppArchitectureSection() {
  // Mermaid図のレンダリングはZoomableMermaidDiagramコンポーネント内で管理されるため、
  // ここでは何もする必要がない

  return (
    <div>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          アーキテクチャ図
        </h3>
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
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          主要ライブラリ・技術スタック
        </h3>
        
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
    </div>
  );
}

// データベース構成セクション
function DatabaseOverviewSection() {
  // Mermaid図のレンダリングはZoomableMermaidDiagramコンポーネント内で管理されるため、
  // ここでは何もする必要がない

  return (
    <div>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          全体構成図
        </h3>
        <ZoomableMermaidDiagram
          diagramId="database-overview-diagram"
          mermaidCode={`graph TB
    subgraph AppLayer["アプリケーション層"]
        Frontend["Next.js Frontend<br/>React + TypeScript"]
        Backend["Rust Backend<br/>Tauri"]
        AIAssistant["AIアシスタント<br/>チャットインターフェース"]
    end

    subgraph DBLayer["データベース層"]
        subgraph SQLiteGroup["SQLite"]
            SQLiteDB[("SQLite Database<br/>構造化データ")]
            Tables["テーブル群<br/>- organizations<br/>- entities<br/>- topicRelations<br/>- topicEmbeddings<br/>- meetingNotes<br/>- etc."]
        end

        subgraph ChromaGroup["ChromaDB"]
            ChromaDB[("ChromaDB<br/>ベクトルデータベース")]
            Collections["コレクション群<br/>- entities_orgId<br/>- relations_orgId<br/>- topics_orgId"]
        end
    end

    subgraph AILayer["AI生成層"]
        AIGen["AI生成<br/>GPT-4o-mini等"]
        EmbedGen["埋め込み生成<br/>OpenAI/Ollama"]
        LLMAPI["LLM API<br/>OpenAI/Ollama"]
    end

    subgraph UserLayer["ユーザー操作"]
        ManualInput["手動入力<br/>エンティティ・リレーション作成"]
        ReviewEdit["確認・編集<br/>AI生成結果の調整"]
    end

    Frontend -->|"Tauri Commands"| Backend
    Backend -->|"SQLクエリ"| SQLiteDB
    Backend -->|"HTTP API"| ChromaDB
    SQLiteDB --> Tables
    ChromaDB --> Collections
    
    UserLayer -->|"データ作成"| Frontend
    AIGen -->|"メタデータ抽出"| Frontend
    Frontend -->|"確認・編集"| UserLayer
    Frontend -->|"埋め込み生成リクエスト"| EmbedGen
    EmbedGen -->|"埋め込みベクトル"| Backend
    Backend -->|"ベクトル保存"| ChromaDB
    
    SQLiteDB -.->|"ID参照<br/>（メタデータ経由）"| ChromaDB
    ChromaDB -.->|"ID検索<br/>（類似度検索後）"| SQLiteDB
    
    Frontend -->|"RAG検索クエリ"| EmbedGen
    EmbedGen -->|"クエリ埋め込み"| Backend
    Backend -->|"類似度検索"| ChromaDB
    ChromaDB -.->|"検索結果ID"| Backend
    Backend -->|"詳細情報取得"| SQLiteDB
    SQLiteDB -->|"検索結果"| Frontend
    
    AIAssistant -->|"ユーザークエリ"| Frontend
    Frontend -->|"RAG検索実行"| Backend
    Backend -->|"類似度検索"| ChromaDB
    ChromaDB -.->|"検索結果ID"| Backend
    Backend -->|"詳細情報取得"| SQLiteDB
    SQLiteDB -->|"エンティティ・リレーション・トピック情報"| Frontend
    Frontend -->|"RAGコンテキスト + ユーザークエリ"| AIAssistant
    AIAssistant -->|"LLM API呼び出し"| LLMAPI
    LLMAPI -->|"回答生成"| AIAssistant
    AIAssistant -->|"回答表示"| Frontend

    style SQLiteDB fill:#e1f5ff
    style ChromaDB fill:#fff4e1
    style Frontend fill:#f0f0f0
    style Backend fill:#f0f0f0
    style AIGen fill:#e8f5e9
    style EmbedGen fill:#fff9c4
    style ManualInput fill:#f3e5f5
    style ReviewEdit fill:#f3e5f5
    style AIAssistant fill:#e3f2fd
    style LLMAPI fill:#ffebee`}
        />
        
        <div style={styles.infoBox}>
          <h4 style={styles.infoBoxTitle}>SQLiteとChromaDBの連携</h4>
          <p style={styles.infoBoxText}>
            SQLiteとChromaDBは<strong>直接接続はしません</strong>が、<strong>IDを介して間接的に連携</strong>しています。
          </p>
          <ul style={styles.infoBoxList}>
            <li><strong>保存時:</strong> SQLiteにエンティティの基本情報（ID、名前、タイプなど）を保存 → ChromaDBに埋め込みベクトルを保存（SQLiteのIDをメタデータとして含む）</li>
            <li><strong>検索時:</strong> ChromaDBで類似度検索を実行 → 検索結果のIDを使用してSQLiteから詳細情報を取得</li>
            <li><strong>データ整合性:</strong> SQLiteがマスターデータ、ChromaDBが検索用インデックスとして機能</li>
          </ul>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          役割分担
        </h3>
        
        <div style={{ marginBottom: '24px' }}>
          <h4 style={styles.subsectionTitle}>
            <span style={styles.colorDot('#4A90E2')}></span>
            SQLite - 構造化データの保存
          </h4>
          <div style={styles.subsectionContent}>
            <p style={{ marginBottom: '12px' }}>
              <strong>役割:</strong> メタデータ、リレーション、ID管理など、構造化されたデータを保存します。
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><strong>エンティティ情報:</strong> 名前、タイプ、メタデータ、組織IDなど</li>
              <li><strong>リレーション情報:</strong> エンティティ間の関係、トピックID、リレーションタイプなど</li>
              <li><strong>トピック情報:</strong> トピックの基本情報、メタデータ、キーワードなど</li>
              <li><strong>組織・メンバー情報:</strong> 組織階層、メンバー情報、議事録など</li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              SQLiteは高速な構造化データの検索・更新に最適で、トランザクション管理も可能です。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={styles.subsectionTitle}>
            <span style={styles.colorDot('#F5A623')}></span>
            ChromaDB - ベクトルデータの保存
          </h4>
          <div style={styles.subsectionContent}>
            <p style={{ marginBottom: '12px' }}>
              <strong>役割:</strong> エンティティ、リレーション、トピックの埋め込みベクトルを保存し、類似度検索を提供します。
            </p>
            <ul style={styles.subsectionList}>
              <li><strong>エンティティ埋め込み:</strong> エンティティ名とメタデータのベクトル表現</li>
              <li><strong>リレーション埋め込み:</strong> リレーションタイプと説明のベクトル表現</li>
              <li><strong>トピック埋め込み:</strong> トピックのタイトル、コンテンツ、メタデータのベクトル表現</li>
            </ul>
            <p style={{ marginBottom: '12px' }}>
              <strong>コレクション命名規則:</strong>
            </p>
            <ul style={styles.subsectionList}>
              <li><code>{'entities_{organizationId}'}</code> - エンティティ埋め込み</li>
              <li><code>{'relations_{organizationId}'}</code> - リレーション埋め込み</li>
              <li><code>{'topics_{organizationId}'}</code> - トピック埋め込み</li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              ChromaDBは組織ごとにコレクションを分離し、セマンティック検索とRAG（Retrieval-Augmented Generation）を実現します。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={styles.subsectionTitle}>
            <span style={styles.colorDot('#7ED321')}></span>
            データの連携
          </h4>
          <div style={styles.subsectionContent}>
            <p style={{ marginBottom: '12px' }}>
              SQLiteとChromaDBは相互補完的に動作します：
            </p>
            <ul style={styles.subsectionList}>
              <li><strong>ID管理:</strong> SQLiteでエンティティやリレーションのIDを管理し、ChromaDBではそのIDをメタデータとして保存</li>
              <li><strong>検索フロー:</strong> ChromaDBで類似度検索 → SQLiteで詳細情報を取得</li>
              <li><strong>データ整合性:</strong> SQLiteがマスターデータ、ChromaDBが検索用インデックスとして機能</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          データ保存・埋め込み生成の流れ
        </h3>
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
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          RAG検索の流れ
        </h3>
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
      </div>

      <div>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          メタデータ生成と人間の関与
        </h3>
        
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#4A90E2', borderRadius: '50%', marginRight: '8px' }}></span>
            AI生成によるメタデータ抽出
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0', marginBottom: '16px' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>プロセス:</strong> トピックのタイトルとコンテンツから、GPT-4o-miniなどのLLMを使用して自動的にエンティティとリレーションを抽出します。
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><strong>入力:</strong> トピックのタイトル、コンテンツ、既存のエンティティ情報</li>
              <li><strong>AI処理:</strong> LLMがエンティティ（人物、組織、製品など）とリレーション（関係性）を抽出</li>
              <li><strong>出力:</strong> 構造化されたエンティティとリレーションのリスト（JSON形式）</li>
              <li><strong>人間の確認:</strong> ユーザーが生成結果を確認し、追加・削除・編集が可能</li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              AI生成は効率的ですが、人間による確認と調整が重要です。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#7ED321', borderRadius: '50%', marginRight: '8px' }}></span>
            手動入力によるメタデータ作成
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0', marginBottom: '16px' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>プロセス:</strong> ユーザーが直接エンティティやリレーションを作成・編集します。
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><strong>エンティティ作成:</strong> 名前、タイプ、メタデータを手動で入力</li>
              <li><strong>リレーション作成:</strong> エンティティ間の関係を手動で定義</li>
              <li><strong>メタデータ編集:</strong> キーワード、セマンティックカテゴリ、重要度などを設定</li>
              <li><strong>埋め込み自動生成:</strong> 手動で作成したデータも自動的に埋め込みベクトルが生成される</li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              手動入力により、AIが抽出できない細かい情報や専門的な知識を追加できます。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#F5A623', borderRadius: '50%', marginRight: '8px' }}></span>
            埋め込みベクトルの生成
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0', marginBottom: '16px' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>プロセス:</strong> エンティティ、リレーション、トピックの埋め込みベクトルは、保存時に自動的に生成されます。
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><strong>エンティティ埋め込み:</strong> エンティティ名 + メタデータ → 埋め込みベクトル</li>
              <li><strong>リレーション埋め込み:</strong> リレーションタイプ + 説明 → 埋め込みベクトル</li>
              <li><strong>トピック埋め込み:</strong> タイトル + コンテンツ + メタデータ → 埋め込みベクトル</li>
              <li><strong>生成タイミング:</strong> データ作成時、更新時（非同期処理）</li>
              <li><strong>使用API:</strong> OpenAI API（text-embedding-3-small）またはOllama（nomic-embed-text等）</li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              埋め込みベクトルはRAG検索の精度を決定する重要な要素です。
            </p>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#BD10E0', borderRadius: '50%', marginRight: '8px' }}></span>
            AIと人間の協働
          </h4>
          <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
            <p style={{ marginBottom: '12px', lineHeight: '1.8' }}>
              本システムは<strong>AI生成と人間の手動入力の両方</strong>をサポートし、それぞれの強みを活かします：
            </p>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
              <li><strong>AI生成の強み:</strong> 大量のデータから迅速にパターンを抽出、一貫性のある構造化</li>
              <li><strong>人間の強み:</strong> 専門知識の追加、文脈の理解、AI生成結果の検証と調整</li>
              <li><strong>協働の流れ:</strong> AI生成 → 人間による確認・編集 → 埋め込み生成 → RAG検索で活用</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// renderRelatedTables関数は components/design/TableDetailCard.tsx に移動しました

// SQLiteスキーマセクション
function SQLiteSchemaSection() {
  // Mermaid図のレンダリングはZoomableMermaidDiagramコンポーネント内で管理されるため、
  // ここでは何もする必要がない

  // 選択中のテーブルIDを管理（nullの場合はすべて表示、'none'の場合はすべて非表示）
  const [selectedTableId, setSelectedTableId] = useState<string | null>('none');
  const [selectedSystemTableId, setSelectedSystemTableId] = useState<string | null>('none');
  const [selectedIdLinkageId, setSelectedIdLinkageId] = useState<string | null>('none');

  // テーブル番号一覧のデータ
  const tableList = [
    { number: '①', name: 'organizations', id: 'table-organizations', japanese: '組織', component: OrganizationsTable },
    { number: '②', name: 'organizationMembers', id: 'table-organization-members', japanese: '組織メンバー', component: OrganizationMembersTable },
    { number: '③', name: 'organizationContents', id: 'table-organization-contents', japanese: '組織コンテンツ', component: OrganizationContentsTable },
    { number: '④', name: 'meetingNotes', id: 'table-meeting-notes', japanese: '議事録', component: MeetingNotesTable },
    { number: '⑤', name: 'topics', id: 'table-topics', japanese: 'トピック', component: TopicsTable },
    { number: '⑥', name: 'entities', id: 'table-entities', japanese: 'エンティティ', component: EntitiesTable },
    { number: '⑦', name: 'relations', id: 'table-relations', japanese: 'リレーション', component: RelationsTable },
    { number: '⑧', name: 'companies', id: 'table-companies', japanese: '事業会社', component: CompaniesTable },
    { number: '⑨', name: 'companyContents', id: 'table-company-contents', japanese: '事業会社コンテンツ', component: CompanyContentsTable },
    { number: '⑩', name: 'focusInitiatives', id: 'table-focus-initiatives', japanese: '注力施策', component: FocusInitiativesTable },
    { number: '⑪', name: 'themes', id: 'table-themes', japanese: 'テーマ', component: ThemesTable },
    { number: '⑫', name: 'organizationCompanyDisplay', id: 'table-organization-company-display', japanese: '組織・事業会社表示', component: OrganizationCompanyDisplayTable },
    { number: '⑬', name: 'designDocSections', id: 'table-design-doc-sections', japanese: 'システム設計ドキュメントセクション', component: DesignDocSectionsTable },
    { number: '⑭', name: 'designDocSectionRelations', id: 'table-design-doc-section-relations', japanese: '設計ドキュメントセクションリレーション', component: DesignDocSectionRelationsTable },
  ];

  const systemTableList = [
    { number: '', name: 'users', id: 'table-users', japanese: 'ユーザー', component: UsersTable },
    { number: '', name: 'pageContainers', id: 'table-page-containers', japanese: 'ページコンテナ', component: PageContainersTable },
    { number: '', name: 'admins', id: 'table-admins', japanese: '管理者', component: AdminsTable },
    { number: '', name: 'approvalRequests', id: 'table-approval-requests', japanese: '承認リクエスト', component: ApprovalRequestsTable },
    { number: '', name: 'aiSettings', id: 'table-ai-settings', japanese: 'AI設定', component: AiSettingsTable },
    { number: '', name: 'backupHistory', id: 'table-backup-history', japanese: 'バックアップ履歴', component: BackupHistoryTable },
    { number: '', name: 'themeHierarchyConfigs', id: 'table-theme-hierarchy-configs', japanese: 'テーマ階層設定', component: ThemeHierarchyConfigsTable },
  ];

  // テーブルを選択する関数
  const selectTable = useCallback((tableId: string | null) => {
    setSelectedTableId(tableId);
  }, []);

  // システム管理テーブルを選択する関数
  const selectSystemTable = useCallback((tableId: string | null) => {
    setSelectedSystemTableId(tableId);
  }, []);

  // ID連携セクションを選択する関数
  const selectIdLinkage = useCallback((sectionId: string | null) => {
    setSelectedIdLinkageId(sectionId);
  }, []);

  return (
    <div>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          テーブル関係図
        </h3>
        <ZoomableMermaidDiagram
          diagramId="sqlite-schema-diagram"
          mermaidCode={`erDiagram
    %% テーブル番号: ①organizations ②organizationMembers ③organizationContents ④meetingNotes ⑤topics ⑥entities ⑦relations ⑧companies ⑨companyContents ⑩focusInitiatives ⑪themes ⑫organizationCompanyDisplay ⑬designDocSections ⑭designDocSectionRelations
    
    organizations ||--o{ organizationMembers : "has"
    organizations ||--o{ organizationContents : "has"
    organizations ||--o{ meetingNotes : "has"
    organizations ||--o{ entities : "belongs_to"
    organizations ||--o{ topics : "belongs_to"
    organizations ||--o{ relations : "belongs_to"
    organizations ||--o{ companies : "belongs_to"
    organizations ||--o{ focusInitiatives : "has"
    
    companies ||--o{ companyContents : "has"
    companies ||--o{ meetingNotes : "has"
    companies ||--o{ entities : "belongs_to"
    companies ||--o{ topics : "belongs_to"
    companies ||--o{ relations : "belongs_to"
    companies ||--o{ focusInitiatives : "has"
    companies ||--o{ organizationCompanyDisplay : "displayed_in"
    
    meetingNotes ||--o{ topics : "contains"
    
    topics ||--o{ relations : "has"
    
    entities ||--o{ relations : "source"
    entities ||--o{ relations : "target"
    
    themes ||--o{ focusInitiatives : "contains"
    
    designDocSections ||--o{ designDocSectionRelations : "source"
    designDocSections ||--o{ designDocSectionRelations : "target"
    
    organizations {
        string id PK
        string parentId FK
        string name
        string title
        string description
        int level
        string levelName
        int position
        string createdAt
        string updatedAt
    }
    
    organizationMembers {
        string id PK
        string organizationId FK
        string name
        string position
        string nameRomaji
        string department
        string extension
        string companyPhone
        string mobilePhone
        string email
        string itochuEmail
        string teams
        string employeeType
        string roleName
        string indicator
        string location
        string floorDoorNo
        string previousName
        string createdAt
        string updatedAt
    }
    
    organizationContents {
        string id PK
        string organizationId FK
        string introduction
        string focusAreas
        string meetingNotes
        string createdAt
        string updatedAt
    }
    
    meetingNotes {
        string id PK
        string organizationId FK
        string companyId FK
        string title
        string description
        string content
        int chromaSynced
        string chromaSyncError
        string lastChromaSyncAttempt
        string createdAt
        string updatedAt
    }
    
    topics {
        string id PK
        string topicId
        string meetingNoteId FK
        string organizationId FK
        string companyId FK
        string title
        string description
        string content
        string semanticCategory
        string keywords
        string tags
        string contentSummary
        string searchableText
        int chromaSynced
        string chromaSyncError
        string lastChromaSyncAttempt
        string lastSearchDate
        int searchCount
        string createdAt
        string updatedAt
    }
    
    entities {
        string id PK
        string name
        string type
        string aliases
        string metadata
        string organizationId FK
        string companyId FK
        string searchableText
        string displayName
        int chromaSynced
        string chromaSyncError
        string lastChromaSyncAttempt
        string lastSearchDate
        int searchCount
        string createdAt
        string updatedAt
    }
    
    relations {
        string id PK
        string topicId FK
        string sourceEntityId FK
        string targetEntityId FK
        string relationType
        string description
        float confidence
        string metadata
        string organizationId FK
        string companyId FK
        string searchableText
        int chromaSynced
        string chromaSyncError
        string lastChromaSyncAttempt
        string lastSearchDate
        int searchCount
        string createdAt
        string updatedAt
    }
    
    companies {
        string id PK
        string code UK
        string name
        string nameShort
        string category
        string organizationId FK
        string company
        string division
        string department
        string region
        int position
        string createdAt
        string updatedAt
    }
    
    companyContents {
        string id PK
        string companyId FK
        string introduction
        string focusBusinesses
        string capitalStructure
        string capitalStructureDiagram
        string createdAt
        string updatedAt
    }
    
    focusInitiatives {
        string id PK
        string organizationId FK
        string companyId FK
        string title
        string description
        string content
        string themeIds
        string topicIds
        string createdAt
        string updatedAt
    }
    
    themes {
        string id PK
        string title
        string description
        string initiativeIds
        int position
        string createdAt
        string updatedAt
    }
    
    organizationCompanyDisplay {
        string id PK
        string organizationId FK
        string companyId FK
        int displayOrder
        string createdAt
        string updatedAt
    }
    
    designDocSections {
        string id PK
        string title
        string description
        string content
        string tags
        int order_index
        string pageUrl
        string hierarchy
        string relatedSections
        string semanticCategory
        string keywords
        string summary
        string createdAt
        string updatedAt
    }
    
    designDocSectionRelations {
        string id PK
        string sourceSectionId FK
        string targetSectionId FK
        string relationType
        string description
        string createdAt
        string updatedAt
    }`}
        />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          ① すべてのSQLiteテーブル詳細
        </h3>
        <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>
              テーブル番号一覧（クリックで該当テーブルを表示）:
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => selectTable('none')}
                style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  backgroundColor: selectedTableId === 'none' ? '#4A90E2' : 'var(--color-surface)',
                  color: selectedTableId === 'none' ? 'white' : 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (selectedTableId !== 'none') {
                    e.currentTarget.style.backgroundColor = 'var(--color-border-color)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTableId !== 'none') {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                  }
                }}
              >
                非表示
              </button>
              <button
                onClick={() => selectTable(null)}
                style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  backgroundColor: selectedTableId === null ? '#4A90E2' : 'var(--color-surface)',
                  color: selectedTableId === null ? 'white' : 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (selectedTableId !== null) {
                    e.currentTarget.style.backgroundColor = 'var(--color-border-color)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTableId !== null) {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                  }
                }}
              >
                すべて表示
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {tableList.map((table) => {
              const isSelected = selectedTableId === table.id;
              return (
                <button
                  key={table.id}
                  onClick={() => selectTable(isSelected ? 'none' : table.id)}
                  style={{
                    fontSize: '13px',
                    padding: '6px 12px',
                    backgroundColor: isSelected ? '#4A90E2' : 'var(--color-surface)',
                    color: isSelected ? 'white' : 'var(--color-text)',
                    border: `1px solid ${isSelected ? '#4A90E2' : 'var(--color-border-color)'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--color-border-color)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{table.number}</span>
                  <span>{table.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedTableId === 'none' ? null : selectedTableId === null ? (
          <>
            <OrganizationsTable />
            <OrganizationMembersTable />
            <OrganizationContentsTable />
            <MeetingNotesTable />
            <TopicsTable />
            <EntitiesTable />
            <RelationsTable />
            <CompaniesTable />
            <CompanyContentsTable />
            <FocusInitiativesTable />
            <ThemesTable />
            <OrganizationCompanyDisplayTable />
            <DesignDocSectionsTable />
            <DesignDocSectionRelationsTable />
          </>
        ) : (
          tableList.find(t => t.id === selectedTableId)?.component && (
            <div key={selectedTableId}>
              {React.createElement(tableList.find(t => t.id === selectedTableId)!.component)}
            </div>
          )
        )}
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          ② システム管理テーブル
        </h3>
        <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>
              システム管理テーブル一覧（クリックで該当テーブルを表示）:
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => selectSystemTable('none')}
                style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  backgroundColor: selectedSystemTableId === 'none' ? '#4A90E2' : 'var(--color-surface)',
                  color: selectedSystemTableId === 'none' ? 'white' : 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (selectedSystemTableId !== 'none') {
                    e.currentTarget.style.backgroundColor = 'var(--color-border-color)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedSystemTableId !== 'none') {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                  }
                }}
              >
                非表示
              </button>
              <button
                onClick={() => selectSystemTable(null)}
                style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  backgroundColor: selectedSystemTableId === null ? '#4A90E2' : 'var(--color-surface)',
                  color: selectedSystemTableId === null ? 'white' : 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (selectedSystemTableId !== null) {
                    e.currentTarget.style.backgroundColor = 'var(--color-border-color)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedSystemTableId !== null) {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                  }
                }}
              >
                すべて表示
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {systemTableList.map((table) => {
              const isSelected = selectedSystemTableId === table.id;
              return (
                <button
                  key={table.id}
                  onClick={() => selectSystemTable(isSelected ? 'none' : table.id)}
                  style={{
                    fontSize: '13px',
                    padding: '6px 12px',
                    backgroundColor: isSelected ? '#4A90E2' : 'var(--color-surface)',
                    color: isSelected ? 'white' : 'var(--color-text)',
                    border: `1px solid ${isSelected ? '#4A90E2' : 'var(--color-border-color)'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--color-border-color)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {table.name}
                </button>
              );
            })}
          </div>
        </div>

        {selectedSystemTableId === 'none' ? null : selectedSystemTableId === null ? (
          <>
            <UsersTable />
            <PageContainersTable />
            <AdminsTable />
            <ApprovalRequestsTable />
            <AiSettingsTable />
            <BackupHistoryTable />
            <ThemeHierarchyConfigsTable />
          </>
        ) : (
          systemTableList.find(t => t.id === selectedSystemTableId)?.component && (
            <div key={selectedSystemTableId}>
              {React.createElement(systemTableList.find(t => t.id === selectedSystemTableId)!.component)}
            </div>
          )
        )}
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          ③ ID連携の仕組み
        </h3>
        
        <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>
              ID連携セクション一覧（クリックで該当セクションを表示）:
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => selectIdLinkage('none')}
                style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  backgroundColor: selectedIdLinkageId === 'none' ? '#4A90E2' : 'var(--color-surface)',
                  color: selectedIdLinkageId === 'none' ? 'white' : 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (selectedIdLinkageId !== 'none') {
                    e.currentTarget.style.backgroundColor = 'var(--color-border-color)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedIdLinkageId !== 'none') {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                  }
                }}
              >
                非表示
              </button>
              <button
                onClick={() => selectIdLinkage(null)}
                style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  backgroundColor: selectedIdLinkageId === null ? '#4A90E2' : 'var(--color-surface)',
                  color: selectedIdLinkageId === null ? 'white' : 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (selectedIdLinkageId !== null) {
                    e.currentTarget.style.backgroundColor = 'var(--color-border-color)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedIdLinkageId !== null) {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                  }
                }}
              >
                すべて表示
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {[
              { id: 'id-linkage-topic-structure', name: 'トピックIDの構造' },
              { id: 'id-linkage-data-flow', name: 'データ取得フロー' },
              { id: 'id-linkage-foreign-keys', name: '外部キー制約' },
              { id: 'id-linkage-check-constraints', name: 'CHECK制約' },
              { id: 'id-linkage-chroma-sync', name: 'ChromaDB同期状態管理' },
              { id: 'id-linkage-rag-optimization', name: 'RAG検索最適化カラム' },
            ].map((section) => {
              const isSelected = selectedIdLinkageId === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => selectIdLinkage(isSelected ? 'none' : section.id)}
                  style={{
                    fontSize: '13px',
                    padding: '6px 12px',
                    backgroundColor: isSelected ? '#4A90E2' : 'var(--color-surface)',
                    color: isSelected ? 'white' : 'var(--color-text)',
                    border: `1px solid ${isSelected ? '#4A90E2' : 'var(--color-border-color)'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--color-border-color)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {section.name}
                </button>
              );
            })}
          </div>
        </div>

        {selectedIdLinkageId === 'none' ? null : selectedIdLinkageId === null ? (
          <>
            <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                トピックIDの構造
              </h4>
              <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
                <code>topics.id</code>は<strong>複合ID</strong>として設計されています：
              </p>
              <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', marginBottom: '12px', fontFamily: 'monospace', fontSize: '13px' }}>
                <code>{'{meetingNoteId}-topic-{topicId}'}</code>
              </div>
              <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
                例: <code>init_miwceusf_lmthnq2ks-topic-init_mj0b1gma_hywcwrspw</code>
              </p>
              <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
                <li><code>meetingNoteId</code>部分: 議事録ID（<code>meetingNotes.id</code>）</li>
                <li><code>topicId</code>部分: トピックのユニークID（<code>topics.topicId</code>）</li>
              </ul>
              <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8' }}>
                <strong>重要なポイント:</strong> エンティティの<code>metadata.topicId</code>には<code>topicId</code>部分のみが保存され、<code>relations.topicId</code>には完全な<code>id</code>（<code>{'{meetingNoteId}-topic-{topicId}'}</code>）が保存されます。
              </p>
            </div>

            <div style={{ marginTop: '24px', padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                データ取得フロー
              </h4>
              <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
                <li><strong>トピック選択時:</strong> <code>topics.id</code>（例: <code>init_miwceusf_lmthnq2ks-topic-init_mj0b1gma_hywcwrspw</code>）を使用</li>
                <li><strong>リレーション取得:</strong> <code>getRelationsByTopicId(topics.id)</code>で<code>relations</code>を検索</li>
                <li><strong>エンティティ取得:</strong> リレーションから<code>sourceEntityId</code>と<code>targetEntityId</code>を抽出し、<code>entities</code>から取得</li>
                <li><strong>トピックフィルタリング:</strong> エンティティの<code>metadata.topicId</code>が<code>topics.topicId</code>と一致するもののみを表示</li>
              </ol>
            </div>

            <div style={{ marginTop: '24px', padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                外部キー制約
              </h4>
              <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
                SQLiteでは外部キー制約が有効化されており、以下の参照整合性が保証されます：
              </p>
              <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
                <li><code>relations.topicId</code> → <code>topics.id</code></li>
                <li><code>relations.sourceEntityId</code> → <code>entities.id</code></li>
                <li><code>relations.targetEntityId</code> → <code>entities.id</code></li>
                <li><code>relations.organizationId</code> → <code>organizations.id</code></li>
                <li><code>relations.companyId</code> → <code>companies.id</code></li>
                <li><code>topics.meetingNoteId</code> → <code>meetingNotes.id</code></li>
                <li><code>topics.organizationId</code> → <code>organizations.id</code></li>
                <li><code>topics.companyId</code> → <code>companies.id</code></li>
                <li><code>entities.organizationId</code> → <code>organizations.id</code></li>
                <li><code>entities.companyId</code> → <code>companies.id</code></li>
                <li><code>meetingNotes.organizationId</code> → <code>organizations.id</code></li>
                <li><code>meetingNotes.companyId</code> → <code>companies.id</code></li>
                <li><code>focusInitiatives.organizationId</code> → <code>organizations.id</code></li>
                <li><code>focusInitiatives.companyId</code> → <code>companies.id</code></li>
              </ul>
            </div>

            <div style={{ marginTop: '24px', padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                CHECK制約
              </h4>
              <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
                以下のテーブルでは、<code>organizationId</code>と<code>companyId</code>のいずれか一方のみがNULLでない必要があります：
              </p>
              <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
                <li><code>entities</code> - エンティティは組織または事業会社のいずれかに属する</li>
                <li><code>relations</code> - リレーションは組織または事業会社のいずれかに属する</li>
                <li><code>topics</code> - トピックは組織または事業会社のいずれかに属する</li>
                <li><code>meetingNotes</code> - 議事録は組織または事業会社のいずれかに属する</li>
                <li><code>focusInitiatives</code> - 注力施策は組織または事業会社のいずれかに属する</li>
              </ul>
            </div>

            <div style={{ marginTop: '24px', padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                ChromaDB同期状態管理
              </h4>
              <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
                以下のテーブルには、ChromaDBとの同期状態を管理するカラムが追加されています：
              </p>
              <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
                <li><code>chromaSynced</code> - 同期状態（0: 未同期、1: 同期済み）</li>
                <li><code>chromaSyncError</code> - 同期エラーメッセージ（NULL: エラーなし）</li>
                <li><code>lastChromaSyncAttempt</code> - 最後の同期試行日時</li>
              </ul>
              <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8' }}>
                <strong>対象テーブル:</strong> <code>entities</code>、<code>relations</code>、<code>topics</code>、<code>meetingNotes</code>
              </p>
            </div>

            <div style={{ marginTop: '24px', padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                RAG検索最適化カラム
              </h4>
              <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
                以下のテーブルには、RAG検索のパフォーマンス向上のためのカラムが追加されています：
              </p>
              <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
                <li><code>entities.searchableText</code> - 検索用テキスト（name + aliases + metadataから自動生成）</li>
                <li><code>entities.displayName</code> - 表示名（name + roleから自動生成）</li>
                <li><code>relations.searchableText</code> - 検索用テキスト（relationType + descriptionから自動生成）</li>
                <li><code>topics.searchableText</code> - 検索用テキスト（title + description + contentの先頭200文字から自動生成）</li>
                <li><code>topics.contentSummary</code> - コンテンツ要約（contentの先頭200文字から自動生成）</li>
              </ul>
              <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8' }}>
                <strong>自動生成:</strong> これらのカラムは、INSERT/UPDATE時にトリガーによって自動的に生成されます。
              </p>
            </div>
          </>
        ) : (
          <>
            {selectedIdLinkageId === 'id-linkage-topic-structure' && (
              <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                  トピックIDの構造
                </h4>
                <ZoomableMermaidDiagram
                  diagramId="topic-id-structure-diagram"
                  mermaidCode={`graph TB
    subgraph TopicID["topics.id（複合ID）"]
        MeetingNoteID["meetingNoteId部分<br/>例: init_miwceusf_lmthnq2ks<br/>（meetingNotes.id）"]
        Separator["-topic-"]
        TopicIDPart["topicId部分<br/>例: init_mj0b1gma_hywcwrspw<br/>（topics.topicId）"]
    end
    
    subgraph Usage["IDの使用箇所"]
        EntityMeta["entities.metadata.topicId<br/>topicId部分のみ"]
        RelationTopicID["relations.topicId<br/>完全なid"]
        ChromaDBID["ChromaDB topics_{orgId}.id<br/>topicId部分のみ"]
    end
    
    TopicID --> MeetingNoteID
    TopicID --> Separator
    TopicID --> TopicIDPart
    
    TopicIDPart --> EntityMeta
    TopicID --> RelationTopicID
    TopicIDPart --> ChromaDBID
    
    style TopicID fill:#e1f5ff
    style MeetingNoteID fill:#fff9c4
    style TopicIDPart fill:#fff9c4
    style EntityMeta fill:#c8e6c9
    style RelationTopicID fill:#c8e6c9
    style ChromaDBID fill:#c8e6c9`}
                />
                <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8', marginTop: '16px' }}>
                  <code>topics.id</code>は<strong>複合ID</strong>として設計されています：
                </p>
                <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', marginBottom: '12px', fontFamily: 'monospace', fontSize: '13px' }}>
                  <code>{'{meetingNoteId}-topic-{topicId}'}</code>
                </div>
                <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
                  例: <code>init_miwceusf_lmthnq2ks-topic-init_mj0b1gma_hywcwrspw</code>
                </p>
                <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
                  <li><code>meetingNoteId</code>部分: 議事録ID（<code>meetingNotes.id</code>）</li>
                  <li><code>topicId</code>部分: トピックのユニークID（<code>topics.topicId</code>）</li>
                </ul>
                <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8' }}>
                  <strong>重要なポイント:</strong> エンティティの<code>metadata.topicId</code>には<code>topicId</code>部分のみが保存され、<code>relations.topicId</code>には完全な<code>id</code>（<code>{'{meetingNoteId}-topic-{topicId}'}</code>）が保存されます。
                </p>
              </div>
            )}

            {selectedIdLinkageId === 'id-linkage-data-flow' && (
              <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                  データ取得フロー
                </h4>
                <ZoomableMermaidDiagram
                  diagramId="data-retrieval-flow-diagram"
                  mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant App as アプリケーション
    participant Topics as topicsテーブル
    participant Relations as relationsテーブル
    participant Entities as entitiesテーブル
    
    User->>App: トピック選択<br/>topics.idを使用
    App->>Topics: SELECT * FROM topics<br/>WHERE id = topics.id
    Topics-->>App: トピックデータ取得
    
    App->>Relations: getRelationsByTopicId(topics.id)<br/>WHERE topicId = topics.id
    Relations-->>App: リレーション一覧<br/>sourceEntityId, targetEntityId
    
    App->>Entities: SELECT * FROM entities<br/>WHERE id IN (sourceEntityId, targetEntityId)
    Entities-->>App: エンティティデータ取得
    
    App->>App: フィルタリング<br/>metadata.topicId = topics.topicId
    App-->>User: トピック + リレーション + エンティティ表示`}
                />
                <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', marginTop: '16px' }}>
                  <li><strong>トピック選択時:</strong> <code>topics.id</code>（例: <code>init_miwceusf_lmthnq2ks-topic-init_mj0b1gma_hywcwrspw</code>）を使用</li>
                  <li><strong>リレーション取得:</strong> <code>getRelationsByTopicId(topics.id)</code>で<code>relations</code>を検索</li>
                  <li><strong>エンティティ取得:</strong> リレーションから<code>sourceEntityId</code>と<code>targetEntityId</code>を抽出し、<code>entities</code>から取得</li>
                  <li><strong>トピックフィルタリング:</strong> エンティティの<code>metadata.topicId</code>が<code>topics.topicId</code>と一致するもののみを表示</li>
                </ol>
              </div>
            )}

            {selectedIdLinkageId === 'id-linkage-foreign-keys' && (
              <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                  外部キー制約
                </h4>
                <ZoomableMermaidDiagram
                  diagramId="foreign-key-constraints-diagram"
                  mermaidCode={`erDiagram
    organizations ||--o{ relations : "has"
    organizations ||--o{ topics : "has"
    organizations ||--o{ entities : "has"
    organizations ||--o{ meetingNotes : "has"
    organizations ||--o{ focusInitiatives : "has"
    
    companies ||--o{ relations : "has"
    companies ||--o{ topics : "has"
    companies ||--o{ entities : "has"
    companies ||--o{ meetingNotes : "has"
    companies ||--o{ focusInitiatives : "has"
    
    meetingNotes ||--o{ topics : "has"
    topics ||--o{ relations : "has"
    entities ||--o{ relations : "source"
    entities ||--o{ relations : "target"
    
    organizations {
        string id PK
    }
    
    companies {
        string id PK
    }
    
    meetingNotes {
        string id PK
        string organizationId FK
        string companyId FK
    }
    
    topics {
        string id PK
        string topicId
        string meetingNoteId FK
        string organizationId FK
        string companyId FK
    }
    
    entities {
        string id PK
        string organizationId FK
        string companyId FK
    }
    
    relations {
        string id PK
        string topicId FK
        string sourceEntityId FK
        string targetEntityId FK
        string organizationId FK
        string companyId FK
    }
    
    focusInitiatives {
        string id PK
        string organizationId FK
        string companyId FK
    }`}
                />
                <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8', marginTop: '16px' }}>
                  SQLiteでは外部キー制約が有効化されており、以下の参照整合性が保証されます：
                </p>
                <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
                  <li><code>relations.topicId</code> → <code>topics.id</code></li>
                  <li><code>relations.sourceEntityId</code> → <code>entities.id</code></li>
                  <li><code>relations.targetEntityId</code> → <code>entities.id</code></li>
                  <li><code>relations.organizationId</code> → <code>organizations.id</code></li>
                  <li><code>relations.companyId</code> → <code>companies.id</code></li>
                  <li><code>topics.meetingNoteId</code> → <code>meetingNotes.id</code></li>
                  <li><code>topics.organizationId</code> → <code>organizations.id</code></li>
                  <li><code>topics.companyId</code> → <code>companies.id</code></li>
                  <li><code>entities.organizationId</code> → <code>organizations.id</code></li>
                  <li><code>entities.companyId</code> → <code>companies.id</code></li>
                  <li><code>meetingNotes.organizationId</code> → <code>organizations.id</code></li>
                  <li><code>meetingNotes.companyId</code> → <code>companies.id</code></li>
                  <li><code>focusInitiatives.organizationId</code> → <code>organizations.id</code></li>
                  <li><code>focusInitiatives.companyId</code> → <code>companies.id</code></li>
                </ul>
              </div>
            )}

            {selectedIdLinkageId === 'id-linkage-check-constraints' && (
              <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                  CHECK制約
                </h4>
                <ZoomableMermaidDiagram
                  diagramId="check-constraints-diagram"
                  mermaidCode={`graph TB
    subgraph Constraint["CHECK制約: organizationId XOR companyId"]
        Condition["(organizationId IS NOT NULL AND companyId IS NULL)<br/>OR<br/>(organizationId IS NULL AND companyId IS NOT NULL)"]
    end
    
    subgraph Tables["対象テーブル"]
        Entities["entities"]
        Relations["relations"]
        Topics["topics"]
        MeetingNotes["meetingNotes"]
        FocusInitiatives["focusInitiatives"]
    end
    
    subgraph Valid["有効なパターン"]
        OrgOnly["organizationId = 'org_001'<br/>companyId = NULL<br/>✓ 有効"]
        CompanyOnly["organizationId = NULL<br/>companyId = 'comp_001'<br/>✓ 有効"]
    end
    
    subgraph Invalid["無効なパターン"]
        BothNull["organizationId = NULL<br/>companyId = NULL<br/>✗ 無効"]
        BothSet["organizationId = 'org_001'<br/>companyId = 'comp_001'<br/>✗ 無効"]
    end
    
    Constraint --> Tables
    Tables --> Valid
    Tables --> Invalid
    
    style Constraint fill:#e1f5ff
    style Valid fill:#c8e6c9
    style Invalid fill:#ffcdd2`}
                />
                <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8', marginTop: '16px' }}>
                  以下のテーブルでは、<code>organizationId</code>と<code>companyId</code>のいずれか一方のみがNULLでない必要があります：
                </p>
                <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
                  <li><code>entities</code> - エンティティは組織または事業会社のいずれかに属する</li>
                  <li><code>relations</code> - リレーションは組織または事業会社のいずれかに属する</li>
                  <li><code>topics</code> - トピックは組織または事業会社のいずれかに属する</li>
                  <li><code>meetingNotes</code> - 議事録は組織または事業会社のいずれかに属する</li>
                  <li><code>focusInitiatives</code> - 注力施策は組織または事業会社のいずれかに属する</li>
                </ul>
              </div>
            )}

            {selectedIdLinkageId === 'id-linkage-chroma-sync' && (
              <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                  ChromaDB同期状態管理
                </h4>
                <ZoomableMermaidDiagram
                  diagramId="chromadb-sync-state-diagram"
                  mermaidCode={`stateDiagram-v2
    [*] --> 未同期: データ作成/更新
    
    未同期 --> 同期中: 同期処理開始
    同期中 --> 同期済み: 同期成功
    同期中 --> 同期エラー: 同期失敗
    
    同期済み --> 未同期: データ更新
    同期エラー --> 未同期: 再同期試行
    
    note right of 未同期
        chromaSynced = 0
        chromaSyncError = NULL
    end note
    
    note right of 同期中
        lastChromaSyncAttempt = 現在時刻
    end note
    
    note right of 同期済み
        chromaSynced = 1
        chromaSyncError = NULL
    end note
    
    note right of 同期エラー
        chromaSynced = 0
        chromaSyncError = エラーメッセージ
    end note`}
                />
                <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8', marginTop: '16px' }}>
                  以下のテーブルには、ChromaDBとの同期状態を管理するカラムが追加されています：
                </p>
                <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
                  <li><code>chromaSynced</code> - 同期状態（0: 未同期、1: 同期済み）</li>
                  <li><code>chromaSyncError</code> - 同期エラーメッセージ（NULL: エラーなし）</li>
                  <li><code>lastChromaSyncAttempt</code> - 最後の同期試行日時</li>
                </ul>
                <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8' }}>
                  <strong>対象テーブル:</strong> <code>entities</code>、<code>relations</code>、<code>topics</code>、<code>meetingNotes</code>
                </p>
              </div>
            )}

            {selectedIdLinkageId === 'id-linkage-rag-optimization' && (
              <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
                  RAG検索最適化カラム
                </h4>
                <ZoomableMermaidDiagram
                  diagramId="rag-optimization-columns-diagram"
                  mermaidCode={`graph TB
    subgraph EntitiesTable["entitiesテーブル"]
        EntityName["name"]
        EntityAliases["aliases (JSON)"]
        EntityMetadata["metadata (JSON)"]
        EntityRole["role"]
        EntitySearchableText["searchableText<br/>（自動生成）"]
        EntityDisplayName["displayName<br/>（自動生成）"]
    end
    
    subgraph RelationsTable["relationsテーブル"]
        RelationType["relationType"]
        RelationDesc["description"]
        RelationSearchableText["searchableText<br/>（自動生成）"]
    end
    
    subgraph TopicsTable["topicsテーブル"]
        TopicTitle["title"]
        TopicDesc["description"]
        TopicContent["content"]
        TopicSearchableText["searchableText<br/>（自動生成）"]
        TopicContentSummary["contentSummary<br/>（自動生成）"]
    end
    
    EntityName --> EntitySearchableText
    EntityAliases --> EntitySearchableText
    EntityMetadata --> EntitySearchableText
    
    EntityName --> EntityDisplayName
    EntityRole --> EntityDisplayName
    
    RelationType --> RelationSearchableText
    RelationDesc --> RelationSearchableText
    
    TopicTitle --> TopicSearchableText
    TopicDesc --> TopicSearchableText
    TopicContent --> TopicSearchableText
    TopicContent --> TopicContentSummary
    
    style EntitySearchableText fill:#c8e6c9
    style EntityDisplayName fill:#c8e6c9
    style RelationSearchableText fill:#c8e6c9
    style TopicSearchableText fill:#c8e6c9
    style TopicContentSummary fill:#c8e6c9`}
                />
                <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8', marginTop: '16px' }}>
                  以下のテーブルには、RAG検索のパフォーマンス向上のためのカラムが追加されています：
                </p>
                <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
                  <li><code>entities.searchableText</code> - 検索用テキスト（name + aliases + metadataから自動生成）</li>
                  <li><code>entities.displayName</code> - 表示名（name + roleから自動生成）</li>
                  <li><code>relations.searchableText</code> - 検索用テキスト（relationType + descriptionから自動生成）</li>
                  <li><code>topics.searchableText</code> - 検索用テキスト（title + description + contentの先頭200文字から自動生成）</li>
                  <li><code>topics.contentSummary</code> - コンテンツ要約（contentの先頭200文字から自動生成）</li>
                </ul>
                <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8' }}>
                  <strong>自動生成:</strong> これらのカラムは、INSERT/UPDATE時にトリガーによって自動的に生成されます。
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ChromaDBスキーマセクション
function ChromaDBSchemaSection() {
  // Mermaid図のレンダリングはZoomableMermaidDiagramコンポーネント内で管理されるため、
  // ここでは何もする必要がない

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          コレクション構造図
        </h3>
        <ZoomableMermaidDiagram
          diagramId="chromadb-schema-diagram"
          mermaidCode={`graph TB
    subgraph Database["ChromaDB Database<br/>default_database"]
        subgraph Org1["組織1<br/>organizationId: org_001"]
            Entities1["entities_org_001<br/>エンティティ埋め込み"]
            Relations1["relations_org_001<br/>リレーション埋め込み"]
            Topics1["topics_org_001<br/>トピック埋め込み"]
        end
        
        subgraph Org2["組織2<br/>organizationId: org_002"]
            Entities2["entities_org_002<br/>エンティティ埋め込み"]
            Relations2["relations_org_002<br/>リレーション埋め込み"]
            Topics2["topics_org_002<br/>トピック埋め込み"]
        end
    end
    
    subgraph Shared["共有コレクション"]
        DesignDocs["design_docs<br/>システム設計ドキュメント<br/>（組織を跨いで共有）"]
    end
    
    subgraph SQLite["SQLite（参照用）"]
        SQLiteEntities[("entities<br/>テーブル")]
        SQLiteRelations[("relations<br/>テーブル")]
        SQLiteTopics[("topics<br/>テーブル")]
        SQLiteDesignDocs[("designDocSections<br/>テーブル")]
    end
    
    Entities1 -.->|"メタデータ: entityId"| SQLiteEntities
    Relations1 -.->|"メタデータ: relationId"| SQLiteRelations
    Topics1 -.->|"メタデータ: topicId"| SQLiteTopics
    DesignDocs -.->|"メタデータ: sectionId"| SQLiteDesignDocs
    
    Entities2 -.->|"メタデータ: entityId"| SQLiteEntities
    Relations2 -.->|"メタデータ: relationId"| SQLiteRelations
    Topics2 -.->|"メタデータ: topicId"| SQLiteTopics
    
    style Database fill:#fff4e1
    style Entities1 fill:#e3f2fd
    style Relations1 fill:#f3e5f5
    style Topics1 fill:#e8f5e9
    style Entities2 fill:#e3f2fd
    style Relations2 fill:#f3e5f5
    style Topics2 fill:#e8f5e9
    style SQLiteEntities fill:#e1f5ff
    style SQLiteRelations fill:#e1f5ff
    style SQLiteTopics fill:#e1f5ff
    style SQLiteDesignDocs fill:#e1f5ff
    style DesignDocs fill:#fff9c4
    style Shared fill:#fff4e1`}
        />
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          コレクション詳細
        </h3>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#4A90E2', borderRadius: '50%', marginRight: '8px' }}></span>
            entities_{'{organizationId}'}（エンティティ埋め込み）
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>役割:</strong> エンティティの埋め込みベクトルを保存し、セマンティック検索を提供します。
            </p>
            <p style={{ marginBottom: '8px', fontWeight: 600 }}>コレクション構造:</p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><code>id</code> - エンティティID（SQLiteの<code>entities.id</code>と同じ）</li>
              <li><code>embedding</code> - 埋め込みベクトル（エンティティ名 + エイリアス + メタデータ）</li>
              <li><code>metadata</code> - メタデータ（JSON形式）:
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li><code>entityId</code> - エンティティID（SQLite参照用）</li>
                  <li><code>organizationId</code> - 組織ID（NULL可能）</li>
                  <li><code>companyId</code> - 事業会社ID（NULL可能、Rust側で追加される可能性あり）</li>
                  <li><code>name</code> - エンティティ名</li>
                  <li><code>type</code> - エンティティタイプ（例: "organization"、"person"、"product"）</li>
                  <li><code>aliases</code> - 別名リスト（JSON文字列）</li>
                  <li><code>metadata</code> - 追加メタデータ（JSON文字列、<code>topicId</code>を含む）</li>
                  <li><code>nameEmbedding</code> - 名前のみの埋め込み（JSON文字列、将来用）</li>
                  <li><code>metadataEmbedding</code> - メタデータのみの埋め込み（JSON文字列、将来用）</li>
                  <li><code>embeddingModel</code> - 使用した埋め込みモデル（例: "text-embedding-3-small"）</li>
                  <li><code>embeddingVersion</code> - 埋め込みバージョン（例: "1.0"）</li>
                  <li><code>createdAt</code> - 作成日時（ISO 8601形式）</li>
                  <li><code>updatedAt</code> - 更新日時（ISO 8601形式）</li>
                </ul>
              </li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              <strong>ID連携:</strong> <code>id</code>フィールドはSQLiteの<code>entities.id</code>と同じ値を使用します。これにより、ChromaDBで検索した結果のIDを使ってSQLiteから詳細情報を取得できます。
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic', marginTop: '8px' }}>
              <strong>埋め込み生成:</strong> エンティティ名 + エイリアス + メタデータ（JSON文字列）を結合したテキストから埋め込みベクトルを生成します。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#7ED321', borderRadius: '50%', marginRight: '8px' }}></span>
            relations_{'{organizationId}'}（リレーション埋め込み）
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>役割:</strong> エンティティ間のリレーションの埋め込みベクトルを保存し、関係性のセマンティック検索を提供します。
            </p>
            <p style={{ marginBottom: '8px', fontWeight: 600 }}>コレクション構造:</p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><code>id</code> - リレーションID（SQLiteの<code>relations.id</code>と同じ）</li>
              <li><code>embedding</code> - 埋め込みベクトル（リレーションタイプ + 説明 + 関連エンティティ名 + メタデータ、1536次元）</li>
              <li><code>metadata</code> - メタデータ（JSON形式）:
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li><code>relationId</code> - リレーションID（SQLite参照用）</li>
                  <li><code>organizationId</code> - 組織ID（NULL可能）</li>
                  <li><code>companyId</code> - 事業会社ID（NULL可能）</li>
                  <li><code>topicId</code> - トピックID（SQLiteの<code>topics.id</code>形式: <code>{'{meetingNoteId}-topic-{topicId}'}</code>）</li>
                  <li><code>sourceEntityId</code> - 起点エンティティID</li>
                  <li><code>targetEntityId</code> - 終点エンティティID</li>
                  <li><code>sourceEntityName</code> - 起点エンティティ名（検索用）</li>
                  <li><code>targetEntityName</code> - 終点エンティティ名（検索用）</li>
                  <li><code>relationType</code> - リレーションタイプ（例: "works_for"、"partners_with"）</li>
                  <li><code>description</code> - リレーションの説明</li>
                  <li><code>metadata</code> - 追加メタデータ（JSON文字列）</li>
                  <li><code>descriptionEmbedding</code> - 説明のみの埋め込み（JSON文字列、将来用）</li>
                  <li><code>relationTypeEmbedding</code> - リレーションタイプのみの埋め込み（JSON文字列、将来用）</li>
                  <li><code>embeddingModel</code> - 使用した埋め込みモデル（例: "text-embedding-3-small"）</li>
                  <li><code>embeddingVersion</code> - 埋め込みバージョン（例: "1.0"）</li>
                  <li><code>createdAt</code> - 作成日時（ISO 8601形式）</li>
                  <li><code>updatedAt</code> - 更新日時（ISO 8601形式）</li>
                </ul>
              </li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              <strong>ID連携:</strong> <code>id</code>フィールドはSQLiteの<code>relations.id</code>と同じ値を使用します。<code>metadata.topicId</code>には完全なトピックID（<code>{'{meetingNoteId}-topic-{topicId}'}</code>）が保存されます。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#F5A623', borderRadius: '50%', marginRight: '8px' }}></span>
            topics_{'{organizationId}'}（トピック埋め込み）
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>役割:</strong> トピックの埋め込みベクトルを保存し、トピック内容のセマンティック検索を提供します。
            </p>
            <p style={{ marginBottom: '8px', fontWeight: 600 }}>コレクション構造:</p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><code>id</code> - トピックID（SQLiteの<code>topics.topicId</code>と同じ、例: <code>init_mj0b1gma_hywcwrspw</code>）</li>
              <li><code>embedding</code> - 埋め込みベクトル（タイトル + コンテンツ + メタデータ、1536次元）</li>
              <li><code>metadata</code> - メタデータ（JSON形式）:
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li><code>topicId</code> - トピックID（SQLite参照用）</li>
                  <li><code>meetingNoteId</code> - 議事録ID</li>
                  <li><code>organizationId</code> - 組織ID（NULL可能）</li>
                  <li><code>companyId</code> - 事業会社ID（NULL可能）</li>
                  <li><code>title</code> - トピックタイトル</li>
                  <li><code>content</code> - トピックコンテンツ</li>
                  <li><code>semanticCategory</code> - セマンティックカテゴリ（例: "戦略"、"実行"）</li>
                  <li><code>keywords</code> - キーワードリスト（JSON文字列）</li>
                  <li><code>tags</code> - タグリスト（JSON文字列）</li>
                  <li><code>summary</code> - 要約</li>
                  <li><code>importance</code> - 重要度（例: "high"、"medium"、"low"）</li>
                  <li><code>meetingNoteTitle</code> - 議事録タイトル（出典情報）</li>
                  <li><code>titleEmbedding</code> - タイトルのみの埋め込み（JSON文字列、将来用）</li>
                  <li><code>contentEmbedding</code> - コンテンツのみの埋め込み（JSON文字列、将来用）</li>
                  <li><code>metadataEmbedding</code> - メタデータのみの埋め込み（JSON文字列、将来用）</li>
                  <li><code>embeddingModel</code> - 使用した埋め込みモデル（例: "text-embedding-3-small"）</li>
                  <li><code>embeddingVersion</code> - 埋め込みバージョン（例: "1.0"、"2.0"）</li>
                  <li><code>createdAt</code> - 作成日時（ISO 8601形式）</li>
                  <li><code>updatedAt</code> - 更新日時（ISO 8601形式）</li>
                </ul>
              </li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              <strong>ID連携:</strong> <code>id</code>フィールドはSQLiteの<code>topics.topicId</code>と同じ値を使用します（<code>topics.id</code>ではないことに注意）。<code>metadata.meetingNoteId</code>には議事録IDが保存されます。SQLiteで検索する際は<code>topics.id</code>（<code>{'{meetingNoteId}-topic-{topicId}'}</code>形式）を使用する必要があります。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#95A5A6', borderRadius: '50%', marginRight: '8px' }}></span>
            design_docs（システム設計ドキュメント埋め込み）
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>役割:</strong> システム設計ドキュメントの埋め込みベクトルを保存し、設計ドキュメントのセマンティック検索を提供します。<strong>組織を跨いで共有</strong>されるコレクションです。
            </p>
            <p style={{ marginBottom: '8px', fontWeight: 600 }}>コレクション構造:</p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><code>id</code> - セクションID（SQLiteの<code>designDocSections.id</code>と同じ）</li>
              <li><code>embedding</code> - 埋め込みベクトル（タイトル + コンテンツ、1536次元）</li>
              <li><code>metadata</code> - メタデータ（JSON形式）:
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li><code>sectionId</code> - セクションID（SQLite参照用）</li>
                  <li><code>sectionTitle</code> - セクションタイトル</li>
                  <li><code>content</code> - セクションの内容（全文、検索後の表示用）</li>
                  <li><code>tags</code> - タグリスト（JSON文字列）</li>
                  <li><code>order</code> - 表示順序</li>
                  <li><code>pageUrl</code> - ページURL（デフォルト: '/design'）</li>
                  <li><code>hierarchy</code> - 階層情報（JSON文字列）</li>
                  <li><code>relatedSections</code> - 関連セクションIDリスト（JSON文字列）</li>
                  <li><code>embeddingModel</code> - 使用した埋め込みモデル（例: "text-embedding-3-small"）</li>
                  <li><code>embeddingVersion</code> - 埋め込みバージョン（例: "1.0"）</li>
                  <li><code>createdAt</code> - 作成日時（ISO 8601形式）</li>
                  <li><code>updatedAt</code> - 更新日時（ISO 8601形式）</li>
                </ul>
              </li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              <strong>ID連携:</strong> <code>id</code>フィールドはSQLiteの<code>designDocSections.id</code>と同じ値を使用します。これにより、ChromaDBで検索した結果のIDを使ってSQLiteから詳細情報を取得できます。
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic', marginTop: '8px' }}>
              <strong>共有コレクション:</strong> このコレクションは組織を跨いで共有されるため、すべての組織の設計ドキュメントが同じコレクションに保存されます。
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          コレクション命名規則
        </h3>
        
        <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
            ChromaDBのコレクション名は<strong>組織ごとに分離</strong>されています（<code>design_docs</code>を除く）：
          </p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><code>{'entities_{organizationId}'}</code> - エンティティ埋め込みコレクション（組織ごと）</li>
            <li><code>{'relations_{organizationId}'}</code> - リレーション埋め込みコレクション（組織ごと）</li>
            <li><code>{'topics_{organizationId}'}</code> - トピック埋め込みコレクション（組織ごと）</li>
            <li><code>design_docs</code> - システム設計ドキュメント埋め込みコレクション（<strong>組織を跨いで共有</strong>）</li>
          </ul>
          <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8' }}>
            <strong>例:</strong> 組織IDが<code>init_miwceusf_lmthnq2ks</code>の場合：
          </p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><code>entities_init_miwceusf_lmthnq2ks</code></li>
            <li><code>relations_init_miwceusf_lmthnq2ks</code></li>
            <li><code>topics_init_miwceusf_lmthnq2ks</code></li>
            <li><code>design_docs</code>（全組織で共有）</li>
          </ul>
          <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8' }}>
            これにより、組織間でデータが混在することなく、セキュアにベクトル検索を実行できます。システム設計ドキュメントは全組織で共有されるため、設計情報の横断的な検索が可能です。
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          SQLiteとのID連携
        </h3>
        
        <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
            検索フロー
          </h4>
          <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>類似度検索:</strong> ChromaDBでクエリの埋め込みベクトルと類似度が高いエンティティ/リレーション/トピックを検索</li>
            <li><strong>ID取得:</strong> 検索結果から<code>id</code>フィールド（または<code>metadata</code>内のID）を取得</li>
            <li><strong>詳細情報取得:</strong> 取得したIDを使用してSQLiteから詳細情報を取得</li>
            <li><strong>結果統合:</strong> ベクトル類似度スコアとSQLiteの詳細情報を統合してユーザーに表示</li>
          </ol>
          
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', marginTop: '24px', color: 'var(--color-text)' }}>
            IDマッピング
          </h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>エンティティ:</strong> ChromaDBの<code>id</code> = SQLiteの<code>entities.id</code></li>
            <li><strong>リレーション:</strong> ChromaDBの<code>id</code> = SQLiteの<code>relations.id</code></li>
            <li><strong>トピック:</strong> ChromaDBの<code>id</code> = SQLiteの<code>topics.topicId</code>（<code>topics.id</code>ではない）</li>
            <li><strong>システム設計ドキュメント:</strong> ChromaDBの<code>id</code> = SQLiteの<code>designDocSections.id</code></li>
          </ul>
          
          <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8', fontStyle: 'italic' }}>
            <strong>注意:</strong> トピックの場合、ChromaDBの<code>id</code>は<code>topics.topicId</code>（例: <code>init_mj0b1gma_hywcwrspw</code>）を使用しますが、SQLiteで検索する際は<code>topics.id</code>（例: <code>init_miwceusf_lmthnq2ks-topic-init_mj0b1gma_hywcwrspw</code>）を使用する必要があります。この変換はアプリケーション層で処理されます。
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          埋め込みベクトルの生成
        </h3>
        
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#4A90E2', borderRadius: '50%', marginRight: '8px' }}></span>
            エンティティ埋め込み
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>生成方法:</strong> エンティティ名 + エイリアス + メタデータ（JSON文字列）を結合して埋め込みベクトルを生成します。
            </p>
            <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', marginBottom: '12px', fontFamily: 'monospace', fontSize: '13px' }}>
              <code>combinedText = "{'{entityName}'}\n\n{'{aliases}'}\n\n{'{metadataJSON}'}"</code>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              これにより、エンティティの名前だけでなく、関連する情報も含めた包括的な検索が可能になります。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#7ED321', borderRadius: '50%', marginRight: '8px' }}></span>
            リレーション埋め込み
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>生成方法:</strong> リレーションタイプ（3回繰り返して重要度を上げる）+ 関連エンティティ名 + 説明 + メタデータを結合して埋め込みベクトルを生成します。
            </p>
            <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', marginBottom: '12px', fontFamily: 'monospace', fontSize: '13px' }}>
              <code>combinedText = "{'{relationType}'}\n\n{'{relationType}'}\n\n{'{relationType}'}\n\n{'{sourceEntityName} と {targetEntityName} の関係'}\n\n{'{description}'}\n\n{'{metadataText}'}"</code>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              リレーションタイプを3回繰り返すことで、リレーションタイプの重要度を上げ、より正確な検索が可能になります。関連エンティティ名も含めることで、エンティティ間の関係性を検索できます。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#F5A623', borderRadius: '50%', marginRight: '8px' }}></span>
            トピック埋め込み
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>生成方法:</strong> タイトル + コンテンツ + メタデータ（キーワード、セマンティックカテゴリなど）を結合して埋め込みベクトルを生成します。メタデータがある場合は、分離埋め込み（タイトル、コンテンツ、メタデータ）も生成されます。
            </p>
            <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', marginBottom: '12px', fontFamily: 'monospace', fontSize: '13px' }}>
              <code>combinedText = "{'{title}'}\n\n{'{content}'}\n\n{'{keywords}'}\n\n{'{semanticCategory}'}\n\n{'{tags}'}\n\n{'{summary}'}"</code>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              トピックの内容全体を理解した検索が可能になります。メタデータがある場合（embeddingVersion: "2.0"）、タイトル、コンテンツ、メタデータの分離埋め込みも生成され、より柔軟な検索が可能です。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#95A5A6', borderRadius: '50%', marginRight: '8px' }}></span>
            システム設計ドキュメント埋め込み
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>生成方法:</strong> セクションタイトル + コンテンツ（Mermaidコードを除去したテキスト）を結合して埋め込みベクトルを生成します。
            </p>
            <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', marginBottom: '12px', fontFamily: 'monospace', fontSize: '13px' }}>
              <code>combinedText = "{'{sectionTitle}'}\n\n{'{content}'}"</code>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              システム設計ドキュメントの内容を理解した検索が可能になります。Mermaidコードは検索前に除去されるため、テキストのみが埋め込みに使用されます。
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          埋め込みベクトルの仕様
        </h3>
        
        <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
            モデルと次元数
          </h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>モデル:</strong> OpenAI <code>text-embedding-3-small</code></li>
            <li><strong>次元数:</strong> 1536次元（固定）</li>
            <li><strong>ベクトル形式:</strong> <code>number[]</code>（浮動小数点数の配列）</li>
          </ul>
          
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', marginTop: '24px', color: 'var(--color-text)' }}>
            組織横断検索
          </h4>
          <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
            <code>organizationId</code>が未指定の場合、すべての組織のコレクションを横断して検索を実行します：
          </p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li>エンティティ: すべての<code>entities_{'{organizationId}'}</code>コレクションを検索</li>
            <li>リレーション: すべての<code>relations_{'{organizationId}'}</code>コレクションを検索</li>
            <li>トピック: すべての<code>topics_{'{organizationId}'}</code>コレクションを検索</li>
          </ul>
          <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8', fontStyle: 'italic' }}>
            これにより、複数の組織にまたがる情報を一度に検索できます。
          </p>
        </div>
      </div>
    </div>
  );
}

// データフローセクション
function DataFlowSection() {
  // Mermaid図のレンダリングはZoomableMermaidDiagramコンポーネント内で管理されるため、
  // ここでは何もする必要がない

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          データ保存フロー
        </h3>
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
        
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>保存フローの特徴</h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>二段階保存:</strong> まずSQLiteに構造化データを保存し、その後非同期でChromaDBに埋め込みベクトルを保存</li>
            <li><strong>IDの一貫性:</strong> ChromaDBの<code>id</code>フィールドはSQLiteのIDと同じ値を使用し、メタデータにも含める</li>
            <li><strong>非同期処理:</strong> 埋め込み生成は非同期で実行され、ユーザー操作をブロックしない</li>
            <li><strong>エラーハンドリング:</strong> 埋め込み生成が失敗しても、SQLiteのデータは保存済み（後で再生成可能）</li>
          </ul>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          RAG検索フロー
        </h3>
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
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          データ更新フロー
        </h3>
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
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          データ削除フロー
        </h3>
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
    
    Note over Backend: カスケード削除の確認
    
    Backend->>SQLite: 関連データの確認<br/>(リレーション、エンティティ等)
    SQLite-->>Backend: 関連データ一覧
    
    Backend->>Backend: カスケード削除実行
    
    par 並列削除
        Backend->>SQLite: メインデータ削除<br/>(entities/topicRelations/topicEmbeddings)
        SQLite-->>Backend: 削除完了
    and
        Backend->>SQLite: 関連データ削除<br/>(リレーション、エンティティ等)
        SQLite-->>Backend: 削除完了
    end
    
    Note over Backend,ChromaDB: ChromaDB削除は未実装<br/>（将来実装予定）
    
    Backend-->>Frontend: 削除完了通知
    
    Note over SQLite,ChromaDB: SQLite: データ削除完了<br/>ChromaDB: 埋め込みは残存（検索結果に影響なし）`}
        />
        
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>削除フローの特徴</h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>カスケード削除:</strong> トピック削除時、関連するエンティティとリレーションも自動的に削除</li>
            <li><strong>トランザクション:</strong> SQLiteのトランザクション機能により、削除の整合性を保証</li>
            <li><strong>ChromaDB削除:</strong> 現在は未実装（将来実装予定）。削除されたデータのIDで検索してもSQLiteで見つからないため、実質的に無効</li>
            <li><strong>データ整合性:</strong> SQLiteがマスターデータとして機能し、ChromaDBは検索インデックスとして補助的に使用</li>
          </ul>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          データ同期フロー
        </h3>
        <ZoomableMermaidDiagram
          diagramId="data-sync-flow-diagram"
          mermaidCode={`graph TB
    subgraph SQLiteLayer["SQLite層（マスターデータ）"]
        SQLiteEntities[("entities<br/>テーブル")]
        SQLiteRelations[("topicRelations<br/>テーブル")]
        SQLiteTopics[("topicEmbeddings<br/>テーブル")]
    end
    
    subgraph SyncLayer["同期層"]
        IDMapping["IDマッピング<br/>entities.id → ChromaDB.id<br/>topicRelations.id → ChromaDB.id<br/>topicEmbeddings.topicId → ChromaDB.id"]
        EmbeddingGen["埋め込み生成<br/>非同期処理"]
    end
    
    subgraph ChromaDBLayer["ChromaDB層（検索インデックス）"]
        ChromaEntities["entities_{orgId}<br/>コレクション"]
        ChromaRelations["relations_{orgId}<br/>コレクション"]
        ChromaTopics["topics_{orgId}<br/>コレクション"]
    end
    
    SQLiteEntities -->|"データ作成/更新"| IDMapping
    SQLiteRelations -->|"データ作成/更新"| IDMapping
    SQLiteTopics -->|"データ作成/更新"| IDMapping
    
    IDMapping -->|"ID + メタデータ"| EmbeddingGen
    EmbeddingGen -->|"埋め込みベクトル + ID"| ChromaEntities
    EmbeddingGen -->|"埋め込みベクトル + ID"| ChromaRelations
    EmbeddingGen -->|"埋め込みベクトル + ID"| ChromaTopics
    
    ChromaEntities -.->|"検索結果ID"| SQLiteEntities
    ChromaRelations -.->|"検索結果ID"| SQLiteRelations
    ChromaTopics -.->|"検索結果ID"| SQLiteTopics
    
    style SQLiteLayer fill:#e1f5ff
    style SyncLayer fill:#fff9c4
    style ChromaDBLayer fill:#fff4e1`}
        />
        
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>同期フローの特徴</h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>一方向同期:</strong> SQLite → ChromaDBの方向で同期（SQLiteがマスターデータ）</li>
            <li><strong>IDの一貫性:</strong> 同じIDを使用することで、検索結果からSQLiteの詳細情報を確実に取得可能</li>
            <li><strong>非同期処理:</strong> 埋め込み生成は非同期で実行され、ユーザー操作をブロックしない</li>
            <li><strong>メタデータの保持:</strong> ChromaDBのメタデータにSQLiteのIDを含めることで、検索後の参照を高速化</li>
            <li><strong>組織ごとの分離:</strong> ChromaDBのコレクションは組織ごとに分離され、データの混在を防止</li>
          </ul>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          データフローのまとめ
        </h3>
        <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
            本システムのデータフローは、<strong>SQLiteをマスターデータ、ChromaDBを検索インデックス</strong>として設計されています。
          </p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>保存:</strong> SQLiteに構造化データを保存 → 非同期でChromaDBに埋め込みベクトルを保存</li>
            <li><strong>検索:</strong> ChromaDBで類似度検索 → SQLiteで詳細情報を取得 → 結果を統合</li>
            <li><strong>更新:</strong> SQLiteを即座に更新 → 非同期でChromaDBの埋め込みを再生成</li>
            <li><strong>削除:</strong> SQLiteから削除（カスケード削除対応） → ChromaDB削除は将来実装予定</li>
            <li><strong>同期:</strong> IDの一貫性を保ちながら、SQLite → ChromaDBの方向で同期</li>
          </ul>
          <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8', fontStyle: 'italic' }}>
            この設計により、構造化データの整合性を保ちながら、高速なセマンティック検索を実現しています。
          </p>
        </div>
      </div>
    </div>
  );
}

// ページ構造セクション
function PageStructureSection() {
  // Mermaid図のレンダリングはZoomableMermaidDiagramコンポーネント内で管理されるため、
  // ここでは何もする必要がない

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          ページ階層構造図
        </h3>
        <ZoomableMermaidDiagram
          diagramId="page-structure-diagram"
          mermaidCode={`graph TB
    subgraph DashboardArea["ダッシュボード（/）"]
        DashboardPage["app/page.tsx<br/>ダッシュボードページ<br/>（現在はシンプルな表示のみ）"]
        Sidebar["Sidebarコンポーネント<br/>（Layout経由で全ページに表示）"]
        MenuItems["menuItems配列<br/>（ハードコーディング）"]
    end
    
    subgraph StaticPages["静的ページ（サイドバーから直接アクセス）"]
        Analytics["/analytics <br/>app/analytics/page.tsx<br/>分析"]
        KnowledgeGraph["/knowledge-graph <br/>app/knowledge-graph/page.tsx<br/>ナレッジグラフ"]
        RAGSearch["/rag-search <br/>app/rag-search/page.tsx<br/>RAG検索"]
        Reports["/reports <br/>app/reports/page.tsx<br/>レポート"]
        Design["/design <br/>app/design/page.tsx<br/>システム設計"]
        Settings["/settings <br/>app/settings/page.tsx<br/>設定"]
    end
    
    subgraph DynamicPages["動的ページ（IDで管理）"]
        OrgList["/organization <br/>app/organization/page.tsx<br/>組織一覧"]
        OrgDetail["/organization/detail?id=xxx <br/>app/organization/detail/page.tsx<br/>組織詳細<br/>タブ: ?tab=introduction|focusAreas|focusInitiatives|meetingNotes"]
        MeetingDetail["/organization/detail/meeting?meetingId=xxx&id=xxx <br/>app/organization/detail/meeting/page.tsx<br/>議事録詳細<br/>個別トピック作成可能"]
        InitiativeDetail["/organization/initiative?organizationId=xxx&initiativeId=xxx <br/>app/organization/initiative/page.tsx<br/>注力施策詳細<br/>トピック紐づけ可能"]
        CompanyList["/companies <br/>app/companies/page.tsx<br/>事業会社一覧"]
        CompanyDetail["/companies/detail?id=xxx <br/>app/companies/detail/page.tsx<br/>事業会社詳細"]
    end
    
    subgraph TopicData["個別トピック（ID管理）"]
        TopicCreation["トピック作成<br/>議事録詳細ページ内<br/>generateUniqueId()でID生成"]
        TopicStorage["SQLite: topicEmbeddings<br/>id: meetingNoteId-topic-topicId<br/>topicId: ユニークID"]
        TopicChromaDB["ChromaDB: topics_{orgId}<br/>id: topicId<br/>（SQLiteのtopicIdと同じ）"]
        TopicLink["注力施策への紐づけ<br/>focusInitiatives.topicIds[]<br/>（トピックIDの配列）"]
    end
    
    subgraph QueryParamPages["クエリパラメータでIDを渡すページ"]
        KnowledgeGraphEntity["/knowledge-graph?entityId=xxx <br/>エンティティハイライト"]
        KnowledgeGraphRelation["/knowledge-graph?relationId=xxx <br/>リレーションハイライト"]
    end
    
    DashboardPage -->|"Layoutコンポーネント経由"| Sidebar
    Sidebar -->|"menuItems配列を参照"| MenuItems
    
    MenuItems -->|"アイコンクリック<br/>router.push('/organization')"| OrgList
    MenuItems -->|"アイコンクリック<br/>router.push('/companies')"| CompanyList
    MenuItems -->|"アイコンクリック<br/>router.push('/analytics')"| Analytics
    MenuItems -->|"アイコンクリック<br/>router.push('/knowledge-graph')"| KnowledgeGraph
    MenuItems -->|"アイコンクリック<br/>router.push('/rag-search')"| RAGSearch
    MenuItems -->|"アイコンクリック<br/>router.push('/reports')"| Reports
    MenuItems -->|"アイコンクリック<br/>router.push('/design')"| Design
    MenuItems -->|"アイコンクリック<br/>router.push('/settings')"| Settings
    
    OrgList -->|"組織カードクリック<br/>router.push('/organization/detail?id=xxx')"| OrgDetail
    OrgDetail -->|"議事録クリック<br/>router.push('/organization/detail/meeting?meetingId=xxx&id=xxx')"| MeetingDetail
    OrgDetail -->|"注力施策クリック<br/>router.push('/organization/initiative?organizationId=xxx&initiativeId=xxx')"| InitiativeDetail
    CompanyList -->|"事業会社カードクリック<br/>router.push('/companies/detail?id=xxx')"| CompanyDetail
    
    MeetingDetail -->|"個別トピック作成<br/>generateUniqueId()でtopicId生成"| TopicCreation
    TopicCreation -->|"SQLiteに保存<br/>topicEmbeddingsテーブル<br/>id: meetingNoteId-topic-topicId"| TopicStorage
    TopicCreation -->|"ChromaDBに保存<br/>topics_{orgId}コレクション<br/>id: topicId"| TopicChromaDB
    TopicStorage -.->|"topicIdを参照"| TopicLink
    TopicChromaDB -.->|"topicIdを参照"| TopicLink
    TopicLink -->|"focusInitiatives.topicIds[]<br/>にtopicIdを追加"| InitiativeDetail
    
    RAGSearch -->|"entityIdをクエリパラメータで<br/>router.push('/knowledge-graph?entityId=xxx')"| KnowledgeGraphEntity
    RAGSearch -->|"relationIdをクエリパラメータで<br/>router.push('/knowledge-graph?relationId=xxx')"| KnowledgeGraphRelation
    RAGSearch -->|"meetingNoteIdで遷移<br/>router.push('/organization/detail/meeting?meetingId=xxx&id=xxx')"| MeetingDetail
    
    KnowledgeGraph -->|"エンティティクリック<br/>router.push('/knowledge-graph?entityId=xxx')"| KnowledgeGraphEntity
    KnowledgeGraph -->|"リレーションクリック<br/>router.push('/knowledge-graph?relationId=xxx')"| KnowledgeGraphRelation
    
    style DashboardArea fill:#e3f2fd
    style StaticPages fill:#fff4e1
    style DynamicPages fill:#e8f5e9
    style QueryParamPages fill:#f3e5f5
    style TopicData fill:#fff9c4`}
        />
        
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>ダッシュボードからのナビゲーション</h4>
          <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
            ダッシュボードページ（<code>/</code>）自体は現在シンプルな表示のみですが、<strong>Layoutコンポーネント経由でサイドバーが表示</strong>されます。
          </p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>サイドバーの表示:</strong> すべてのページで<code>Layout</code>コンポーネントが使用され、その中で<code>Sidebar</code>コンポーネントがレンダリングされます</li>
            <li><strong>ナビゲーション方法:</strong> サイドバーのアイコンまたはメニューアイテムをクリックすると、<code>router.push(path)</code>で該当ページに遷移します</li>
            <li><strong>ダッシュボードから組織一覧へ:</strong> サイドバーの「組織」アイコンをクリック → <code>router.push('/organization')</code> → 組織一覧ページに遷移</li>
            <li><strong>ダッシュボードから事業会社一覧へ:</strong> サイドバーの「事業会社」アイコンをクリック → <code>router.push('/companies')</code> → 事業会社一覧ページに遷移</li>
            <li><strong>その他のページ:</strong> 同様にサイドバーの各アイコンから直接アクセス可能</li>
          </ul>
          <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8', fontStyle: 'italic' }}>
            <strong>注意:</strong> ダッシュボードページ内に直接リンクボタンはありませんが、サイドバーが常に表示されているため、どのページからでも他のページにアクセスできます。
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          ページとID管理の詳細
        </h3>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#4A90E2', borderRadius: '50%', marginRight: '8px' }}></span>
            ダッシュボードとサイドバーのリンク関係
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>サイドバーの構造:</strong> サイドバーは2つの部分で構成されています。
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <p style={{ marginBottom: '8px', fontWeight: 600 }}>1. アイコンサイドバー（常に表示）</p>
              <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
                <li><strong>位置:</strong> 画面左端、固定表示（幅70px）</li>
                <li><strong>機能:</strong> 各ページへのアイコンボタンとハンバーガーメニューボタン</li>
                <li><strong>クリック動作:</strong> アイコンをクリックすると<code>router.push(path)</code>で該当ページに遷移</li>
              </ul>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ marginBottom: '8px', fontWeight: 600 }}>2. サイドメニュー（ハンバーガーメニューで開閉）</p>
              <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
                <li><strong>位置:</strong> アイコンサイドバーの右側（幅280px）</li>
                <li><strong>表示条件:</strong> ハンバーガーメニューボタンをクリックすると表示</li>
                <li><strong>機能:</strong> アイコン + ラベルのメニューリスト</li>
                <li><strong>アクティブ状態:</strong> 現在のページに応じてハイライト表示</li>
              </ul>
            </div>

            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <p style={{ marginBottom: '8px', fontWeight: 600 }}>メニューアイテムの定義（<code>components/Sidebar.tsx</code>）:</p>
              <pre style={{ fontSize: '12px', overflow: 'auto', margin: 0 }}>
{`const menuItems = [
  { icon: DashboardIcon, label: 'ダッシュボード', id: 'dashboard', path: '/' },
  { icon: LineChartIcon, label: '分析', id: 'analytics', path: '/analytics' },
  { icon: KnowledgeGraphIcon, label: 'ナレッジグラフ', id: 'knowledge-graph', path: '/knowledge-graph' },
  { icon: RAGSearchIcon, label: 'RAG検索', id: 'rag-search', path: '/rag-search' },
  { icon: BarChartIcon, label: 'レポート', id: 'reports', path: '/reports' },
  { icon: OrganizationIcon, label: '組織', id: 'organization', path: '/organization' },
  { icon: CompanyIcon, label: '事業会社', id: 'companies', path: '/companies' },
  { icon: DesignIcon, label: '設計', id: 'design', path: '/design' },
  { icon: SettingsIcon, label: '設定', id: 'settings', path: '/settings' },
];`}
              </pre>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ marginBottom: '8px', fontWeight: 600 }}>ナビゲーション処理:</p>
              <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
                <li><strong>クリックイベント:</strong> アイコンまたはメニューアイテムをクリック</li>
                <li><strong>処理:</strong> <code>handleNavigation(item.path)</code>が呼ばれる</li>
                <li><strong>遷移:</strong> <code>router.push(path)</code>でNext.jsのルーティングが実行される</li>
                <li><strong>アクティブ判定:</strong> <code>usePathname()</code>で現在のパスを取得し、<code>getCurrentPage()</code>でページIDを判定</li>
              </ul>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ marginBottom: '8px', fontWeight: 600 }}>ダッシュボードページ（<code>/</code>）:</p>
              <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
                <li><strong>パス:</strong> <code>/</code>（ルートパス）</li>
                <li><strong>ページID:</strong> <code>dashboard</code></li>
                <li><strong>アイコン:</strong> <code>DashboardIcon</code></li>
                <li><strong>ファイル:</strong> <code>app/page.tsx</code></li>
                <li><strong>アクティブ判定:</strong> <code>pathname === '/'</code>の場合に<code>dashboard</code>として判定</li>
                <li><strong>リンク方法:</strong> サイドバーの最初のメニューアイテムとして表示され、クリックで<code>router.push('/')</code>が実行される</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#7ED321', borderRadius: '50%', marginRight: '8px' }}></span>
            その他の静的ページ
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>特徴:</strong> サイドバーのメニューアイテムとして定義され、パスがハードコーディングされています。
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><code>/analytics</code> - 分析ページ（<code>id: 'analytics'</code>）</li>
              <li><code>/knowledge-graph</code> - ナレッジグラフ（全組織横断、<code>id: 'knowledge-graph'</code>）</li>
              <li><code>/rag-search</code> - RAG検索（<code>id: 'rag-search'</code>）</li>
              <li><code>/reports</code> - レポート（<code>id: 'reports'</code>）</li>
              <li><code>/design</code> - システム設計（<code>id: 'design'</code>）</li>
              <li><code>/settings</code> - 設定（<code>id: 'settings'</code>）</li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              <strong>定義場所:</strong> すべて<code>components/Sidebar.tsx</code>の<code>menuItems</code>配列で定義されています。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#7ED321', borderRadius: '50%', marginRight: '8px' }}></span>
            動的ページ（クエリパラメータでID管理）
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>特徴:</strong> クエリパラメータ（<code>?id=xxx</code>）を使用し、URLからIDを取得してデータを読み込みます。
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <p style={{ marginBottom: '8px', fontWeight: 600 }}>1. 組織詳細ページ</p>
              <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
                <li><strong>パス:</strong> <code>/organization/detail?id={'{organizationId}'}</code></li>
                <li><strong>ID取得:</strong> <code>useSearchParams()</code>で<code>?id=xxx</code>から取得</li>
                <li><strong>データ読み込み:</strong> <code>getOrgTreeFromDb()</code>で組織ツリーを取得し、<code>id</code>で該当組織を検索</li>
                <li><strong>タブ管理:</strong> <code>?tab=introduction|focusAreas|focusInitiatives|meetingNotes</code>でタブを切り替え</li>
                <li><strong>データソース:</strong> SQLiteの<code>organizations</code>テーブル</li>
                <li><strong>遷移例:</strong> <code>router.push('/organization/detail?id=init_miwceusf_lmthnq2ks')</code></li>
              </ul>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ marginBottom: '8px', fontWeight: 600 }}>2. 議事録詳細ページ</p>
              <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
                <li><strong>パス:</strong> <code>/organization/detail/meeting?meetingId={'{meetingId}'}&id={'{organizationId}'}</code></li>
                <li><strong>ID取得:</strong> <code>useSearchParams()</code>で<code>?meetingId=xxx&id=xxx</code>から取得</li>
                <li><strong>データ読み込み:</strong> <code>getMeetingNoteById(meetingId)</code>で議事録データを取得</li>
                <li><strong>データソース:</strong> SQLiteの<code>meetingNotes</code>テーブル</li>
                <li><strong>リンク元:</strong> 組織詳細ページの「議事録」タブから遷移</li>
                <li><strong>個別トピック作成:</strong> 議事録内の各アイテムに対して個別トピックを作成可能</li>
                <li><strong>トピックID管理:</strong> <code>generateUniqueId()</code>で<code>topicId</code>を生成（例: <code>init_mj0b1gma_hywcwrspw</code>）</li>
                <li><strong>トピック保存:</strong> 
                  <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                    <li>議事録データ内の<code>topics</code>配列に保存（<code>meetingNotes.content</code>のJSON内）</li>
                    <li>SQLiteの<code>topicEmbeddings</code>テーブルに保存（<code>id: {'{meetingNoteId}-topic-{topicId}'}</code>）</li>
                    <li>ChromaDBの<code>{'topics_{organizationId}'}</code>コレクションに保存（<code>id: topicId</code>）</li>
                  </ul>
                </li>
                <li><strong>遷移例:</strong> <code>router.push('/organization/detail/meeting?meetingId=meeting_001&id=init_miwceusf_lmthnq2ks')</code></li>
              </ul>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ marginBottom: '8px', fontWeight: 600 }}>3. 注力施策詳細ページ</p>
              <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
                <li><strong>パス:</strong> <code>/organization/initiative?organizationId={'{organizationId}'}&initiativeId={'{initiativeId}'}</code></li>
                <li><strong>ID取得:</strong> <code>useSearchParams()</code>で<code>?organizationId=xxx&initiativeId=xxx</code>から取得</li>
                <li><strong>データ読み込み:</strong> <code>getFocusInitiatives(organizationId)</code>で注力施策リストを取得し、<code>initiativeId</code>で該当施策を検索</li>
                <li><strong>データソース:</strong> SQLiteの<code>focusInitiatives</code>テーブル</li>
                <li><strong>リンク元:</strong> 組織詳細ページの「注力施策」タブから遷移</li>
                <li><strong>トピック紐づけ:</strong> <code>focusInitiatives.topicIds</code>配列に複数の<code>topicId</code>を保存可能</li>
                <li><strong>トピック表示:</strong> <code>getTopicsByMeetingNote()</code>で紐づけられたトピックを取得して表示</li>
                <li><strong>遷移例:</strong> <code>router.push('/organization/initiative?organizationId=init_miwceusf_lmthnq2ks&initiativeId=initiative_001')</code></li>
              </ul>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ marginBottom: '8px', fontWeight: 600 }}>4. 事業会社詳細ページ</p>
              <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
                <li><strong>パス:</strong> <code>/companies/detail?id={'{companyId}'}</code></li>
                <li><strong>ID取得:</strong> <code>useSearchParams()</code>で<code>?id=xxx</code>から取得</li>
                <li><strong>データ読み込み:</strong> <code>getCompanyById(id)</code>で事業会社データを取得</li>
                <li><strong>データソース:</strong> SQLiteの<code>companies</code>テーブル</li>
                <li><strong>リンク元:</strong> 事業会社一覧ページ（<code>/companies</code>）から遷移</li>
                <li><strong>遷移例:</strong> <code>router.push('/companies/detail?id=company_12345')</code></li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#F5A623', borderRadius: '50%', marginRight: '8px' }}></span>
            クエリパラメータでIDを渡すページ
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>特徴:</strong> クエリパラメータ（<code>?entityId=xxx</code>など）を使用して、ページ内で特定の要素をハイライトまたはフィルタリングします。
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <p style={{ marginBottom: '8px', fontWeight: 600 }}>ナレッジグラフページ</p>
              <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
                <li><strong>パス:</strong> <code>/knowledge-graph</code></li>
                <li><strong>クエリパラメータ:</strong>
                  <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                    <li><code>?entityId=xxx</code> - エンティティをハイライト</li>
                    <li><code>?relationId=xxx</code> - リレーションをハイライト</li>
                  </ul>
                </li>
                <li><strong>ID取得:</strong> <code>useSearchParams()</code>で<code>entityId</code>または<code>relationId</code>を取得</li>
                <li><strong>データ読み込み:</strong> 
                  <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                    <li>全エンティティ・リレーションを<code>getAllEntities()</code>、<code>getAllRelations()</code>で取得</li>
                    <li>クエリパラメータがある場合、<code>getEntityById(entityId)</code>または<code>getRelationById(relationId)</code>で詳細を取得</li>
                  </ul>
                </li>
                <li><strong>データソース:</strong> SQLiteの<code>entities</code>、<code>topicRelations</code>テーブル</li>
                <li><strong>リンク元:</strong> RAG検索ページからエンティティ/リレーションをクリックして遷移</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          サイドバーとページのリンク関係
        </h3>
        <ZoomableMermaidDiagram
          diagramId="sidebar-page-links-diagram"
          mermaidCode={`graph TB
    subgraph SidebarComponent["Sidebarコンポーネント<br/>components/Sidebar.tsx"]
        MenuItems["menuItems配列<br/>（ハードコーディング）"]
        IconSidebar["アイコンサイドバー<br/>（常に表示、70px幅）"]
        SideMenu["サイドメニュー<br/>（ハンバーガーで開閉、280px幅）"]
        HandleNav["handleNavigation関数<br/>router.push(path)"]
    end
    
    subgraph Pages["各ページ"]
        Dashboard["/ <br/>app/page.tsx<br/>ダッシュボード"]
        Analytics["/analytics <br/>app/analytics/page.tsx<br/>分析"]
        KnowledgeGraph["/knowledge-graph <br/>app/knowledge-graph/page.tsx<br/>ナレッジグラフ"]
        RAGSearch["/rag-search <br/>app/rag-search/page.tsx<br/>RAG検索"]
        Reports["/reports <br/>app/reports/page.tsx<br/>レポート"]
        Organization["/organization <br/>app/organization/page.tsx<br/>組織一覧"]
        Companies["/companies <br/>app/companies/page.tsx<br/>事業会社一覧"]
        Design["/design <br/>app/design/page.tsx<br/>システム設計"]
        Settings["/settings <br/>app/settings/page.tsx<br/>設定"]
    end
    
    MenuItems -->|"各メニューアイテム<br/>{icon, label, id, path}"| IconSidebar
    MenuItems -->|"各メニューアイテム<br/>{icon, label, id, path}"| SideMenu
    
    IconSidebar -->|"アイコンクリック"| HandleNav
    SideMenu -->|"メニューアイテムクリック"| HandleNav
    
    HandleNav -->|"router.push('/')"| Dashboard
    HandleNav -->|"router.push('/analytics')"| Analytics
    HandleNav -->|"router.push('/knowledge-graph')"| KnowledgeGraph
    HandleNav -->|"router.push('/rag-search')"| RAGSearch
    HandleNav -->|"router.push('/reports')"| Reports
    HandleNav -->|"router.push('/organization')"| Organization
    HandleNav -->|"router.push('/companies')"| Companies
    HandleNav -->|"router.push('/design')"| Design
    HandleNav -->|"router.push('/settings')"| Settings
    
    style SidebarComponent fill:#e3f2fd
    style Pages fill:#fff4e1`}
        />
        
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>サイドバーの動作フロー</h4>
          <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>メニューアイテム定義:</strong> <code>menuItems</code>配列に各ページの情報（アイコン、ラベル、ID、パス）を定義</li>
            <li><strong>レンダリング:</strong> <code>menuItems.map()</code>でアイコンサイドバーとサイドメニューに表示</li>
            <li><strong>クリックイベント:</strong> アイコンまたはメニューアイテムをクリック</li>
            <li><strong>ナビゲーション実行:</strong> <code>handleNavigation(item.path)</code>が呼ばれ、<code>router.push(path)</code>で遷移</li>
            <li><strong>アクティブ状態更新:</strong> <code>usePathname()</code>で現在のパスを取得し、該当するメニューアイテムをハイライト</li>
          </ol>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          個別トピックと注力施策の紐づけ
        </h3>
        <ZoomableMermaidDiagram
          diagramId="topic-initiative-link-diagram"
          mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant MeetingPage as 議事録詳細ページ<br/>/organization/[id]/meeting/[meetingId]
    participant SQLite as SQLite
    participant ChromaDB as ChromaDB
    participant InitiativePage as 注力施策詳細ページ<br/>/organization/[id]/initiative/[initiativeId]

    Note over User,InitiativePage: ステップ1: 個別トピックの作成
    
    User->>MeetingPage: 議事録アイテムに<br/>個別トピックを作成
    MeetingPage->>MeetingPage: generateUniqueId()<br/>でtopicIdを生成<br/>例: init_mj0b1gma_hywcwrspw
    MeetingPage->>SQLite: topicEmbeddingsテーブルに保存<br/>id: meetingNoteId-topic-topicId<br/>topicId: 生成されたID
    MeetingPage->>ChromaDB: topics_{orgId}コレクションに保存<br/>id: topicId<br/>（埋め込みベクトル含む）
    MeetingPage->>SQLite: meetingNotes.content内の<br/>topics[]配列にも保存
    
    Note over User,InitiativePage: ステップ2: 注力施策への紐づけ
    
    User->>InitiativePage: 注力施策詳細ページで<br/>トピックを選択
    InitiativePage->>SQLite: focusInitiatives.topicIds[]<br/>にtopicIdを追加
    SQLite-->>InitiativePage: 更新完了
    
    Note over User,InitiativePage: ステップ3: トピックの表示
    
    InitiativePage->>SQLite: focusInitiatives.topicIds[]<br/>を取得
    SQLite-->>InitiativePage: topicId配列
    InitiativePage->>SQLite: getTopicsByMeetingNote()<br/>で各トピックの詳細を取得
    SQLite-->>InitiativePage: トピック詳細データ
    InitiativePage-->>User: 紐づけられたトピックを表示
    
    Note over SQLite,ChromaDB: トピックIDの一貫性:<br/>SQLite: topicEmbeddings.topicId<br/>ChromaDB: topics_{orgId}.id<br/>focusInitiatives.topicIds[]<br/>すべて同じtopicIdを使用`}
        />
        
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>個別トピックのID管理</h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>トピックID生成:</strong> <code>generateUniqueId()</code>でユニークIDを生成（例: <code>init_mj0b1gma_hywcwrspw</code>）</li>
            <li><strong>SQLite保存:</strong> <code>topicEmbeddings</code>テーブルに<code>id: {'{meetingNoteId}-topic-{topicId}'}</code>形式で保存</li>
            <li><strong>ChromaDB保存:</strong> <code>{'topics_{organizationId}'}</code>コレクションに<code>id: topicId</code>（SQLiteの<code>topicId</code>と同じ）で保存</li>
            <li><strong>注力施策への紐づけ:</strong> <code>focusInitiatives.topicIds[]</code>配列に<code>topicId</code>を追加（複数のトピックを紐づけ可能）</li>
            <li><strong>データ整合性:</strong> すべての場所で同じ<code>topicId</code>を使用することで、一貫性を保証</li>
          </ul>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          ページ間のリンク関係
        </h3>
        <ZoomableMermaidDiagram
          diagramId="page-links-diagram"
          mermaidCode={`flowchart LR
    subgraph EntryPoints["エントリーポイント"]
        Sidebar["サイドバー<br/>（ハードコーディング）"]
        Home["ホームページ"]
    end
    
    subgraph OrganizationFlow["組織フロー"]
        OrgList["組織一覧<br/>/organization"]
        OrgDetail["組織詳細<br/>/organization/[id]"]
        MeetingList["議事録リスト<br/>（タブ内）"]
        MeetingDetail["議事録詳細<br/>/organization/[id]/meeting/[meetingId]"]
        InitiativeList["注力施策リスト<br/>（タブ内）"]
        InitiativeDetail["注力施策詳細<br/>/organization/[id]/initiative/[initiativeId]"]
    end
    
    subgraph CompanyFlow["事業会社フロー"]
        CompanyList["事業会社一覧<br/>/companies"]
        CompanyDetail["事業会社詳細<br/>/companies/[id]"]
    end
    
    subgraph SearchFlow["検索フロー"]
        RAGSearch["RAG検索<br/>/rag-search"]
        KnowledgeGraph["ナレッジグラフ<br/>/knowledge-graph"]
        KnowledgeGraphEntity["ナレッジグラフ<br/>?entityId=xxx"]
        KnowledgeGraphRelation["ナレッジグラフ<br/>?relationId=xxx"]
    end
    
    Sidebar --> OrgList
    Sidebar --> CompanyList
    Sidebar --> RAGSearch
    Sidebar --> KnowledgeGraph
    
    Home --> OrgList
    Home --> CompanyList
    
    OrgList -->|"組織IDで遷移"| OrgDetail
    OrgDetail -->|"meetingIdで遷移"| MeetingDetail
    OrgDetail -->|"initiativeIdで遷移"| InitiativeDetail
    
    CompanyList -->|"companyIdで遷移"| CompanyDetail
    
    RAGSearch -->|"entityIdをクエリパラメータで"| KnowledgeGraphEntity
    RAGSearch -->|"relationIdをクエリパラメータで"| KnowledgeGraphRelation
    RAGSearch -->|"meetingNoteIdで遷移"| MeetingDetail
    
    KnowledgeGraph -->|"エンティティクリック"| KnowledgeGraphEntity
    KnowledgeGraph -->|"リレーションクリック"| KnowledgeGraphRelation
    
    style EntryPoints fill:#e3f2fd
    style OrganizationFlow fill:#fff4e1
    style CompanyFlow fill:#e8f5e9
    style SearchFlow fill:#f3e5f5`}
        />
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          ID管理の仕組み
        </h3>
        
        <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
            IDの種類と管理方法
          </h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>組織ID（organizationId）:</strong> SQLiteの<code>organizations.id</code>を使用。形式: <code>init_miwceusf_lmthnq2ks</code></li>
            <li><strong>議事録ID（meetingId）:</strong> SQLiteの<code>meetingNotes.id</code>を使用。形式: <code>init_miwceusf_lmthnq2ks</code></li>
            <li><strong>トピックID（topicId）:</strong> SQLiteの<code>topicEmbeddings.topicId</code>を使用。形式: <code>init_mj0b1gma_hywcwrspw</code></li>
            <li><strong>エンティティID（entityId）:</strong> SQLiteの<code>entities.id</code>を使用。形式: <code>entity_{'{timestamp}'}_{'{random}'}</code></li>
            <li><strong>リレーションID（relationId）:</strong> SQLiteの<code>topicRelations.id</code>を使用</li>
            <li><strong>事業会社ID（companyId）:</strong> SQLiteの<code>companies.id</code>を使用</li>
            <li><strong>注力施策ID（initiativeId）:</strong> SQLiteの<code>focusInitiatives.id</code>を使用</li>
          </ul>
          
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', marginTop: '24px', color: 'var(--color-text)' }}>
            IDの取得方法
          </h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>クエリパラメータ:</strong> <code>useSearchParams()</code>で取得（例: <code>?id=xxx</code>の<code>id</code>、<code>?entityId=xxx</code>の<code>entityId</code>）</li>
            <li><strong>プログラムからの遷移:</strong> <code>router.push()</code>でパスとクエリパラメータを組み合わせて遷移（例: <code>router.push('/organization/detail?id=xxx')</code>）</li>
          </ul>
          
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', marginTop: '24px', color: 'var(--color-text)' }}>
            データの読み込みフロー
          </h4>
          <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>ページマウント時:</strong> <code>useEffect</code>でIDを取得</li>
            <li><strong>ID検証:</strong> IDが存在するか確認</li>
            <li><strong>データ取得:</strong> IDを使用してSQLiteからデータを取得（<code>getEntityById</code>、<code>getMeetingNoteById</code>など）</li>
            <li><strong>状態更新:</strong> 取得したデータをReactの状態に設定</li>
            <li><strong>レンダリング:</strong> データを基にUIをレンダリング</li>
          </ol>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          ページ構造のまとめ
        </h3>
        <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
            本システムのページ構造は、<strong>クエリパラメータ方式</strong>と<strong>SQLiteのID管理</strong>を組み合わせて実現されています。
          </p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>静的ページ:</strong> サイドバーにハードコーディングされたパスで直接アクセス</li>
            <li><strong>動的ページ:</strong> クエリパラメータ（<code>?id=xxx</code>）でIDを管理し、SQLiteからデータを読み込み</li>
            <li><strong>クエリパラメータ:</strong> ページ内でのフィルタリングやハイライト、IDの受け渡しに使用</li>
            <li><strong>データソース:</strong> すべてのデータはSQLiteから取得され、IDで一意に識別</li>
            <li><strong>ID取得:</strong> <code>useSearchParams()</code>フックでクエリパラメータからIDを取得</li>
            <li><strong>リンク関係:</strong> <code>router.push()</code>を使用してプログラムから遷移、または<code>Link</code>コンポーネントでリンク</li>
          </ul>
          <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8', fontStyle: 'italic' }}>
            この設計により、URLから直接ページにアクセスでき、ブラウザの戻る/進むボタンも正常に動作します。
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DesignPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [viewMode, setViewMode] = useState<'sections' | 'search' | 'ai'>('sections');
  const sectionContentRef = useRef<HTMLDivElement>(null);
  
  // 検索関連の状態
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DesignDocResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<DesignDocResult | null>(null);
  const [searchFilters, setSearchFilters] = useState<{
    tags?: string[];
    semanticCategory?: string;
  }>({});
  
  // AIアシスタント関連の状態
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | undefined>(undefined);

  // セクション管理関連の状態
  const [dbSections, setDbSections] = useState<DesignDocSection[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [loadedContentSections, setLoadedContentSections] = useState<Set<string>>(new Set()); // contentを読み込んだセクションIDのセット
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<DesignDocSection | null>(null);
  const [deletingSection, setDeletingSection] = useState<DesignDocSection | null>(null);
  const [generatingEmbedding, setGeneratingEmbedding] = useState<string | null>(null); // 生成中のセクションID
  const [sectionRelations, setSectionRelations] = useState<DesignDocSectionRelation[]>([]);
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const [editingRelation, setEditingRelation] = useState<DesignDocSectionRelation | null>(null);
  const [deletingRelation, setDeletingRelation] = useState<DesignDocSectionRelation | null>(null);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false); // メタデータ編集モード

  // システム設計ドキュメントの自動インデックス（初回のみ）
  useEffect(() => {
    const indexDesignDocs = async () => {
      // ローカルストレージでインデックス済みかチェック
      const indexedKey = 'design_docs_indexed';
      const lastIndexed = localStorage.getItem(indexedKey);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000; // 1日

      // 1日以内にインデックス済みの場合はスキップ
      if (lastIndexed && (now - parseInt(lastIndexed)) < oneDay) {
        console.log('ℹ️  システム設計ドキュメントは既にインデックス済みです');
        return;
      }

      try {
        setIsIndexing(true);
        const { indexDesignDocs } = await import('@/lib/designDocIndexer');
        await indexDesignDocs();
        localStorage.setItem(indexedKey, now.toString());
        console.log('✅ システム設計ドキュメントのインデックスが完了しました');
      } catch (error) {
        console.error('❌ システム設計ドキュメントのインデックスエラー:', error);
        // エラーが発生してもページは表示を続ける
      } finally {
        setIsIndexing(false);
      }
    };

    // ChromaDBが初期化されるまで少し待機
    setTimeout(() => {
      indexDesignDocs();
    }, 2000);
  }, []);

  // セクション一覧を読み込む（軽量版、contentを除外）
  useEffect(() => {
    const loadSections = async () => {
      try {
        setIsLoadingSections(true);
        const sections = await getAllSectionsLightweight();
        setDbSections(sections);
        setLoadedContentSections(new Set()); // リセット
      } catch (error) {
        console.error('セクション一覧の読み込みエラー:', error);
      } finally {
        setIsLoadingSections(false);
      }
    };

    if (viewMode === 'sections') {
      loadSections();
    }
  }, [viewMode]);

  // アクティブなセクションのcontentを読み込む（必要に応じて）
  useEffect(() => {
    const loadSectionContent = async () => {
      if (!activeSection || loadedContentSections.has(activeSection)) {
        return; // 既に読み込まれている場合はスキップ
      }

      try {
        const fullSection = await getSection(activeSection);
        setDbSections(prev => prev.map(s => 
          s.id === activeSection ? fullSection : s
        ));
        setLoadedContentSections(prev => new Set(prev).add(activeSection));
      } catch (error) {
        console.error('セクション詳細の読み込みエラー:', error);
      }
    };

    if (viewMode === 'sections' && activeSection) {
      loadSectionContent();
    }
  }, [activeSection, viewMode, loadedContentSections]);

  // セクション関係を読み込む
  useEffect(() => {
    const loadRelations = async () => {
      try {
        const relations = await getAllSectionRelations();
        setSectionRelations(relations);
      } catch (error) {
        console.error('セクション関係の読み込みエラー:', error);
      }
    };

    if (viewMode === 'sections') {
      loadRelations();
    }
  }, [viewMode]);

  // activeSectionが変更されたときにisEditingMetadataをリセット
  useEffect(() => {
    setIsEditingMetadata(false);
  }, [activeSection]);

  // editingSectionをrefで管理（無限ループを防ぐ）
  const editingSectionRef = useRef<DesignDocSection | null>(null);
  
  // refを更新
  useEffect(() => {
    editingSectionRef.current = editingSection;
  }, [editingSection]);

  // セクション保存用のハンドラー（useCallbackでメモ化）
  const handleSectionSave = useCallback(async (sectionData: { title: string; description?: string; content: string }) => {
    // 現在の編集セクションをrefから取得
    const currentEditingSection = editingSectionRef.current;
    
    try {
      // 保存処理を実行
      const result = currentEditingSection
        ? await updateSection(
            currentEditingSection.id,
            sectionData.title,
            sectionData.description,
            sectionData.content,
            currentEditingSection.tags,
            currentEditingSection.order,
            currentEditingSection.pageUrl,
            currentEditingSection.hierarchy,
            currentEditingSection.relatedSections,
            currentEditingSection.semanticCategory,
            currentEditingSection.keywords,
            currentEditingSection.summary,
          )
        : await createSection(
            sectionData.title,
            sectionData.description,
            sectionData.content,
            undefined,
            undefined,
            '/design',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

      // 状態を更新
      if (currentEditingSection) {
        setDbSections(prev => {
          const existingIndex = prev.findIndex(s => s.id === result.id);
          if (existingIndex >= 0) {
            const newSections = [...prev];
            newSections[existingIndex] = result;
            return newSections;
          }
          return prev;
        });
      } else {
        setDbSections(prev => [...prev, result]);
      }
      
      // モーダルを閉じる
      setIsSectionModalOpen(false);
      setEditingSection(null);
    } catch (error) {
      console.error('[handleSectionSave] 保存処理エラー:', error);
      alert(error instanceof Error ? error.message : 'セクションの保存に失敗しました');
      // エラー時はモーダルを開いたままにする（閉じない）
    }
  }, []); // 依存配列を空にして、関数を固定

  // アクティブなセクションの関係を取得
  const activeSectionRelations = activeSection
    ? sectionRelations.filter(
        r => r.sourceSectionId === activeSection || r.targetSectionId === activeSection
      )
    : [];

  const sections = [
    {
      id: 'app-architecture',
      title: 'アプリ全体構成',
      description: '使用ライブラリとアーキテクチャ',
    },
    {
      id: 'database-overview',
      title: 'データベース構成',
      description: 'SQLiteとChromaDBの全体構成',
    },
    {
      id: 'sqlite-schema',
      title: 'SQLiteスキーマ',
      description: 'SQLiteに保存されるデータ構造とテーブル関係',
    },
    {
      id: 'chromadb-schema',
      title: 'ChromaDBスキーマ',
      description: 'ChromaDBに保存されるベクトルデータ',
    },
    {
      id: 'data-flow',
      title: 'データフロー',
      description: 'データの保存・取得の流れ',
    },
    {
      id: 'page-structure',
      title: 'ページ構造',
      description: 'ページ間のリンク関係とID管理',
    },
  ];

  const handleExportPDF = async () => {
    if (!sectionContentRef.current || !activeSection) return;

    setIsExportingPDF(true);
    try {
      // Mermaid図のレンダリングを待つ
      await new Promise(resolve => setTimeout(resolve, 1000));

      // セクションのタイトルを取得
      const sectionTitle = sections.find(s => s.id === activeSection)?.title || 'システム設計';

      // HTMLをキャンバスに変換
      const canvas = await html2canvas(sectionContentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      } as any);

      // PDFを作成
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4幅（mm）
      const pageHeight = 297; // A4高さ（mm）
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // 最初のページを追加
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 複数ページに分割
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // PDFをダウンロード
      pdf.save(`${sectionTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF出力エラー:', error);
      alert('PDF出力中にエラーが発生しました。');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <Layout>
      <div style={{ padding: '48px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
              システム設計
            </h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isIndexing && (
                <div style={{ 
                  padding: '8px 16px', 
                  backgroundColor: 'var(--color-primary)', 
                  color: 'white', 
                  borderRadius: '6px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>インデックス中...</span>
                </div>
              )}
              <button
                onClick={async () => {
                  try {
                    setIsIndexing(true);
                    const { reindexDesignDocs } = await import('@/lib/designDocIndexer');
                    await reindexDesignDocs();
                    localStorage.setItem('design_docs_indexed', Date.now().toString());
                    alert('システム設計ドキュメントの再インデックスが完了しました');
                  } catch (error) {
                    console.error('再インデックスエラー:', error);
                    alert('再インデックスに失敗しました。コンソールを確認してください。');
                  } finally {
                    setIsIndexing(false);
                  }
                }}
                disabled={isIndexing}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isIndexing ? 'var(--color-border-color)' : 'var(--color-surface)',
                  color: isIndexing ? 'var(--color-text-light)' : 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: isIndexing ? 'not-allowed' : 'pointer',
                  opacity: isIndexing ? 0.6 : 1,
                }}
                title="システム設計ドキュメントをChromaDBに再インデックスします"
              >
                再インデックス
              </button>
            </div>
          </div>
          <p style={{ fontSize: '16px', color: 'var(--color-text-light)', lineHeight: '1.6' }}>
            MissionAIアプリケーションのシステム設計を可視化します。アプリ全体構成、データベース構成（SQLite・ChromaDB）、データフロー、ページ構造などの詳細を確認できます。
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-light)', lineHeight: '1.6', marginTop: '8px', fontStyle: 'italic' }}>
            💡 システム設計ドキュメントは自動的にAIアシスタントで検索可能になります。内容を更新した場合は「再インデックス」ボタンをクリックしてください。
          </p>
        </div>

        {/* タブナビゲーション */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px',
          borderBottom: '2px solid var(--color-border-color)'
        }}>
          <button
            onClick={() => {
              setViewMode('sections');
              setActiveSection(null);
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: viewMode === 'sections' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'sections' ? 'white' : 'var(--color-text)',
              border: 'none',
              borderBottom: viewMode === 'sections' ? '2px solid var(--color-primary)' : '2px solid transparent',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              marginBottom: '-2px',
            }}
          >
            セクション一覧
          </button>
          <button
            onClick={() => {
              setViewMode('search');
              setActiveSection(null);
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: viewMode === 'search' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'search' ? 'white' : 'var(--color-text)',
              border: 'none',
              borderBottom: viewMode === 'search' ? '2px solid var(--color-primary)' : '2px solid transparent',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              marginBottom: '-2px',
            }}
          >
            <FiSearch style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            検索
          </button>
          <button
            onClick={() => {
              setViewMode('ai');
              setActiveSection(null);
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: viewMode === 'ai' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'ai' ? 'white' : 'var(--color-text)',
              border: 'none',
              borderBottom: viewMode === 'ai' ? '2px solid var(--color-primary)' : '2px solid transparent',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              marginBottom: '-2px',
            }}
          >
            <FiMessageSquare style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            AIで質問
          </button>
        </div>

        {/* 検索画面 */}
        {viewMode === 'search' && (
            <DesignDocSearchView
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSearching={isSearching}
            setIsSearching={setIsSearching}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            selectedResult={selectedResult}
            setSelectedResult={setSelectedResult}
            sections={sections}
            dbSections={dbSections}
            sectionRelations={sectionRelations}
            searchFilters={searchFilters}
            setSearchFilters={setSearchFilters}
            setActiveSection={setActiveSection}
            setViewMode={setViewMode}
          />
        )}

        {/* AI質問画面 */}
        {viewMode === 'ai' && (
          <DesignDocAIView
            aiAssistantOpen={aiAssistantOpen}
            setAiAssistantOpen={setAiAssistantOpen}
            setInitialQuery={setInitialQuery}
          />
        )}

        {/* セクション一覧（既存） */}
        {viewMode === 'sections' && (
          <>
          {/* セクション作成ボタン */}
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setEditingSection(null);
                setIsSectionModalOpen(true);
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FiPlus />
              <span>セクションを追加</span>
            </button>
          </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          {/* 既存のハードコーディングされたセクション */}
          {sections.map((section) => (
            <div
              key={section.id}
              onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
              style={{
                padding: '24px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: activeSection === section.id ? 'var(--color-background)' : 'var(--color-surface)',
                borderColor: activeSection === section.id ? 'var(--color-primary)' : 'var(--color-border-color)',
              }}
              onMouseEnter={(e) => {
                if (activeSection !== section.id) {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--color-background)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== section.id) {
                  e.currentTarget.style.borderColor = 'var(--color-border-color)';
                  e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                }
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
                {section.title}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--color-text-light)', lineHeight: '1.5' }}>
                {section.description}
              </p>
            </div>
          ))}

          {/* SQLiteから取得したセクション */}
          {isLoadingSections ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-light)' }}>
              読み込み中...
            </div>
          ) : (
            dbSections.map((section) => (
              <div
                key={section.id}
                onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                style={{
                  padding: '24px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: activeSection === section.id ? 'var(--color-background)' : 'var(--color-surface)',
                  borderColor: activeSection === section.id ? 'var(--color-primary)' : 'var(--color-border-color)',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== section.id) {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--color-background)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== section.id) {
                    e.currentTarget.style.borderColor = 'var(--color-border-color)';
                    e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)', flex: 1 }}>
                    {section.title}
                  </h2>
                  <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSection(section);
                        setIsSectionModalOpen(true);
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: '1px solid var(--color-border-color)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: 'var(--color-text)',
                      }}
                      title="編集"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingSection(section);
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: '1px solid var(--color-border-color)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: 'var(--color-danger, #ef4444)',
                      }}
                      title="削除"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--color-text-light)', lineHeight: '1.5' }}>
                  {section.description || section.summary || '説明なし'}
                </p>
                {section.tags && section.tags.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {section.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '2px 8px',
                          backgroundColor: 'var(--color-background)',
                          border: '1px solid var(--color-border-color)',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: 'var(--color-text-light)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {activeSection && (
          <div
            ref={sectionContentRef}
            style={{
              padding: '32px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface)',
              minHeight: '400px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                {(() => {
                  const section = sections.find(s => s.id === activeSection);
                  const dbSection = dbSections.find(s => s.id === activeSection);
                  return section?.title || dbSection?.title || 'セクション';
                })()}
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Embedding生成ボタン（SQLiteセクションのみ） */}
                {(() => {
                  const dbSection = dbSections.find(s => s.id === activeSection);
                  if (!dbSection) return null;
                  
                  const hasContent = dbSection.content && dbSection.content.length > 0;
                  
                  return (
                    <button
                      onClick={async () => {
                        // contentがまだ読み込まれていない場合は先に読み込む
                        if (!hasContent) {
                          try {
                            const fullSection = await getSection(activeSection);
                            setDbSections(prev => prev.map(s => 
                              s.id === activeSection ? fullSection : s
                            ));
                            setLoadedContentSections(prev => new Set(prev).add(activeSection));
                            // 再帰的に呼び出してcontentを使用
                            const updatedSection = fullSection;
                            try {
                              setGeneratingEmbedding(updatedSection.id);
                              await saveDesignDocEmbeddingToChroma(
                                updatedSection.id,
                                updatedSection.title,
                                updatedSection.content,
                                {
                                  tags: updatedSection.tags,
                                  order: updatedSection.order,
                                  pageUrl: updatedSection.pageUrl,
                                  hierarchy: updatedSection.hierarchy,
                                  relatedSections: updatedSection.relatedSections,
                                }
                              );
                              alert('Embeddingの生成と保存が完了しました');
                            } catch (error) {
                              console.error('Embedding生成エラー:', error);
                              alert('Embeddingの生成に失敗しました。コンソールを確認してください。');
                            } finally {
                              setGeneratingEmbedding(null);
                            }
                            return;
                          } catch (error) {
                            console.error('セクション詳細の読み込みエラー:', error);
                            alert('セクションの読み込みに失敗しました。');
                            return;
                          }
                        }
                        
                        try {
                          setGeneratingEmbedding(dbSection.id);
                          await saveDesignDocEmbeddingToChroma(
                            dbSection.id,
                            dbSection.title,
                            dbSection.content,
                            {
                              tags: dbSection.tags,
                              order: dbSection.order,
                              pageUrl: dbSection.pageUrl,
                              hierarchy: dbSection.hierarchy,
                              relatedSections: dbSection.relatedSections,
                            }
                          );
                          alert('Embeddingの生成と保存が完了しました');
                        } catch (error) {
                          console.error('Embedding生成エラー:', error);
                          alert('Embeddingの生成に失敗しました。コンソールを確認してください。');
                        } finally {
                          setGeneratingEmbedding(null);
                        }
                      }}
                      disabled={generatingEmbedding === activeSection}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: generatingEmbedding === activeSection ? 'var(--color-border-color)' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: generatingEmbedding === activeSection ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: generatingEmbedding === activeSection ? 0.6 : 1,
                        transition: 'opacity 0.2s',
                      }}
                      title="このセクションのEmbeddingを生成してChromaDBに保存します"
                    >
                      {generatingEmbedding === activeSection ? (
                        <>
                          <span>生成中...</span>
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                            <path d="M2 12l10 5 10-5"></path>
                          </svg>
                          <span>Embedding生成</span>
                        </>
                      )}
                    </button>
                  );
                })()}
                <button
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isExportingPDF ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: isExportingPDF ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isExportingPDF) {
                      e.currentTarget.style.opacity = '0.8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isExportingPDF) {
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                >
                  {isExportingPDF ? (
                    <>
                      <span>出力中...</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      <span>PDF出力</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <div style={{ color: 'var(--color-text-light)', lineHeight: '1.8' }}>
              {activeSection === 'app-architecture' && <AppArchitectureSection />}
              {activeSection === 'database-overview' && <DatabaseOverviewSection />}
              {activeSection === 'sqlite-schema' && <SQLiteSchemaSection />}
              {activeSection === 'chromadb-schema' && <ChromaDBSchemaSection />}
              {activeSection === 'data-flow' && <DataFlowSection />}
              {activeSection === 'page-structure' && <PageStructureSection />}
              {(() => {
                // SQLiteから取得したセクションの内容を表示
                const dbSection = dbSections.find(s => s.id === activeSection);
                if (dbSection) {
                  return (
                    <SectionDetailView
                      key={dbSection.id}
                      section={dbSection}
                      dbSections={dbSections}
                      isEditingMetadata={isEditingMetadata}
                      setIsEditingMetadata={setIsEditingMetadata}
                      onMetadataUpdate={async (metadata) => {
                        try {
                          const updated = await updateSection(
                            dbSection.id,
                            undefined, // title
                            undefined, // description
                            undefined, // content
                            metadata.tags,
                            metadata.order,
                            undefined, // pageUrl
                            undefined, // hierarchy
                            undefined, // relatedSections
                            metadata.semanticCategory,
                            metadata.keywords,
                            metadata.summary,
                          );
                          setDbSections(dbSections.map(s => s.id === updated.id ? updated : s));
                          setIsEditingMetadata(false);
                        } catch (error) {
                          console.error('メタデータ更新エラー:', error);
                          alert('メタデータの更新に失敗しました');
                        }
                      }}
                      onSemanticAnalysis={async () => {
                        try {
                          // contentがまだ読み込まれていない場合は先に読み込む
                          let sectionWithContent = dbSection;
                          if (!dbSection.content || dbSection.content.length === 0) {
                            sectionWithContent = await getSection(activeSection);
                            setDbSections(prev => prev.map(s => 
                              s.id === activeSection ? sectionWithContent : s
                            ));
                            setLoadedContentSections(prev => new Set(prev).add(activeSection));
                          }
                          const result = await analyzeSectionSemantics(sectionWithContent.title, sectionWithContent.content);
                          const updated = await updateSection(
                            sectionWithContent.id,
                            undefined,
                            undefined,
                            undefined,
                            result.tags || sectionWithContent.tags,
                            sectionWithContent.order,
                            undefined,
                            undefined,
                            undefined,
                            result.semanticCategory || sectionWithContent.semanticCategory,
                            result.keywords || sectionWithContent.keywords,
                            result.summary || sectionWithContent.summary,
                          );
                          setDbSections(prev => prev.map(s => s.id === updated.id ? updated : s));
                          alert('AI分析が完了しました。生成されたメタデータを確認してください。');
                        } catch (error) {
                          console.error('AI分析エラー:', error);
                          alert('AI分析に失敗しました。コンソールを確認してください。');
                        }
                      }}
                      sectionRelations={activeSectionRelations}
                      onAddRelation={() => {
                        setEditingRelation(null);
                        setIsRelationModalOpen(true);
                      }}
                      onEditRelation={(relation) => {
                        setEditingRelation(relation);
                        setIsRelationModalOpen(true);
                      }}
                      onDeleteRelation={(relation) => {
                        setDeletingRelation(relation);
                      }}
                    />
                  );
                }
                // 既存のハードコーディングされたセクション以外の場合
                if (activeSection !== 'app-architecture' && activeSection !== 'database-overview' && activeSection !== 'sqlite-schema' && activeSection !== 'chromadb-schema' && activeSection !== 'data-flow' && activeSection !== 'page-structure' && activeSection) {
                  return <p>このセクションの詳細は今後追加予定です。</p>;
                }
                return null;
              })()}
            </div>
          </div>
        )}

        {!activeSection && viewMode === 'sections' && (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              color: 'var(--color-text-light)',
              border: '2px dashed var(--color-border-color)',
              borderRadius: '8px',
            }}
          >
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>セクションを選択して詳細を表示</p>
            <p style={{ fontSize: '14px', opacity: 0.7 }}>各セクションの詳細は今後追加していきます</p>
          </div>
        )}
          </>
        )}

        {/* セクション作成・編集モーダル */}
        {isSectionModalOpen && (
          <SectionModal
            section={editingSection}
            onClose={() => {
              setIsSectionModalOpen(false);
              setEditingSection(null);
            }}
            onSave={handleSectionSave}
          />
        )}

        {/* 削除確認モーダル */}
        {deletingSection && (
          <DeleteConfirmModal
            section={deletingSection}
            onClose={() => {
              setDeletingSection(null);
            }}
            onConfirm={async () => {
              try {
                await deleteSection(deletingSection.id);
                setDbSections(dbSections.filter(s => s.id !== deletingSection.id));
                if (activeSection === deletingSection.id) {
                  setActiveSection(null);
                }
                setDeletingSection(null);
              } catch (error) {
                console.error('セクション削除エラー:', error);
                alert('セクションの削除に失敗しました');
              }
            }}
          />
        )}

        {/* 関連セクション削除確認モーダル */}
        {deletingRelation && (
          <DeleteRelationConfirmModal
            relation={deletingRelation}
            dbSections={dbSections}
            onClose={() => {
              setDeletingRelation(null);
            }}
            onConfirm={async () => {
              try {
                await deleteSectionRelation(deletingRelation.id);
                setSectionRelations(sectionRelations.filter(r => r.id !== deletingRelation.id));
                setDeletingRelation(null);
              } catch (error) {
                console.error('関係削除エラー:', error);
                alert('関係の削除に失敗しました');
              }
            }}
          />
        )}

        {/* セクション関係作成・編集モーダル */}
        {isRelationModalOpen && activeSection && (
          <SectionRelationModal
            sourceSectionId={activeSection}
            relation={editingRelation}
            sections={dbSections}
            onClose={() => {
              setIsRelationModalOpen(false);
              setEditingRelation(null);
            }}
            onSave={async (relationData) => {
              try {
                if (editingRelation) {
                  // 更新
                  const updated = await updateSectionRelation(
                    editingRelation.id,
                    relationData.relationType,
                    relationData.description,
                  );
                  setSectionRelations(sectionRelations.map(r => r.id === updated.id ? updated : r));
                } else {
                  // 作成
                  const created = await createSectionRelation(
                    relationData.sourceSectionId,
                    relationData.targetSectionId,
                    relationData.relationType,
                    relationData.description,
                  );
                  setSectionRelations([...sectionRelations, created]);
                }
                setIsRelationModalOpen(false);
                setEditingRelation(null);
              } catch (error) {
                console.error('セクション関係保存エラー:', error);
                alert('セクション関係の保存に失敗しました');
              }
            }}
          />
        )}
      </div>
      
      {/* AIアシスタントパネル */}
      <AIAssistantPanel 
        isOpen={aiAssistantOpen} 
        onClose={() => {
          setAiAssistantOpen(false);
          setInitialQuery(undefined); // 閉じたときに初期クエリをクリア
        }}
        initialQuery={initialQuery}
      />
    </Layout>
  );
}

// テキストエリアコンポーネント（パフォーマンス最適化 - 完全非制御コンポーネント）
function ContentTextarea({
  initialValue,
  onChange,
  disabled,
}: {
  initialValue: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(initialValue);
  
  // onChangeの参照を最新に保つ
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  // 初期値の設定（一度だけ、またはinitialValueが変更されたとき）
  useEffect(() => {
    if (textareaRef.current && initialValueRef.current !== initialValue) {
      // カーソル位置を保存
      const cursorPosition = textareaRef.current.selectionStart;
      const scrollTop = textareaRef.current.scrollTop;
      
      // 値を更新
      textareaRef.current.value = initialValue;
      initialValueRef.current = initialValue;
      
      // カーソル位置を復元（可能な範囲内で）
      const newCursorPosition = Math.min(cursorPosition, initialValue.length);
      textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      textareaRef.current.scrollTop = scrollTop;
    } else if (textareaRef.current && !textareaRef.current.value) {
      // 初回のみ初期値を設定
      textareaRef.current.value = initialValue;
      initialValueRef.current = initialValue;
    }
  }, [initialValue]);

  // 入力時の処理（再レンダリングなし）
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // refのみを更新（親コンポーネントの再レンダリングを完全に避ける）
    onChangeRef.current(newValue);
  }, []);

  return (
    <textarea
      ref={textareaRef}
      onChange={handleChange}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '10px',
        border: '1px solid var(--color-border-color)',
        borderRadius: '6px',
        fontSize: '14px',
        backgroundColor: disabled ? 'var(--color-surface)' : 'var(--color-background)',
        color: 'var(--color-text)',
        minHeight: '200px',
        fontFamily: 'monospace',
        resize: 'vertical',
        opacity: disabled ? 0.6 : 1,
      }}
      placeholder="セクションの内容（Markdown形式可）"
    />
  );
}

// React.memoでメモ化（initialValueが変更されたときのみ再レンダリング）
const MemoizedContentTextarea = React.memo(ContentTextarea, (prevProps, nextProps) => {
  // initialValueが変更されたときのみ再レンダリング
  return prevProps.initialValue === nextProps.initialValue && 
         prevProps.disabled === nextProps.disabled &&
         prevProps.onChange === nextProps.onChange;
});

// セクション詳細ビューコンポーネント（メタデータ編集機能付き）
function SectionDetailView({
  section,
  dbSections,
  isEditingMetadata,
  setIsEditingMetadata,
  onMetadataUpdate,
  onSemanticAnalysis,
  sectionRelations,
  onAddRelation,
  onEditRelation,
  onDeleteRelation,
}: {
  section: DesignDocSection;
  dbSections: DesignDocSection[];
  isEditingMetadata: boolean;
  setIsEditingMetadata: (editing: boolean) => void;
  onMetadataUpdate: (metadata: {
    tags?: string[];
    order?: number;
    semanticCategory?: string;
    keywords?: string[];
    summary?: string;
  }) => Promise<void>;
  onSemanticAnalysis: () => Promise<void>;
  sectionRelations: DesignDocSectionRelation[];
  onAddRelation: () => void;
  onEditRelation: (relation: DesignDocSectionRelation) => void;
  onDeleteRelation: (relation: DesignDocSectionRelation) => void;
}) {
  // sectionの値を文字列化して比較用に保持
  const sectionValuesRef = useRef<string>('');
  
  const [tags, setTags] = useState<string[]>(section?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [order, setOrder] = useState(section?.order || 0);
  const [semanticCategory, setSemanticCategory] = useState(section?.semanticCategory || '');
  const [keywords, setKeywords] = useState<string[]>(section?.keywords || []);
  const [keywordInput, setKeywordInput] = useState('');
  const [summary, setSummary] = useState(section?.summary || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // sectionが変更されたときに状態を更新（編集モードでない場合のみ）
  useEffect(() => {
    if (!section) return;
    
    const currentValues = JSON.stringify({
      id: section.id,
      tags: section.tags || [],
      order: section.order || 0,
      semanticCategory: section.semanticCategory || '',
      keywords: section.keywords || [],
      summary: section.summary || '',
    });
    
    if (currentValues !== sectionValuesRef.current && !isEditingMetadata) {
      setTags(section.tags || []);
      setOrder(section.order || 0);
      setSemanticCategory(section.semanticCategory || '');
      setKeywords(section.keywords || []);
      setSummary(section.summary || '');
      sectionValuesRef.current = currentValues;
    }
  }, [section?.id, section?.tags, section?.order, section?.semanticCategory, section?.keywords, section?.summary, isEditingMetadata]);

  const handleAddTag = useCallback(() => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags(prevTags => prevTags.filter(t => t !== tag));
  }, []);

  const handleAddKeyword = useCallback(() => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  }, [keywordInput, keywords]);

  const handleRemoveKeyword = useCallback((keyword: string) => {
    setKeywords(prevKeywords => prevKeywords.filter(k => k !== keyword));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      await onMetadataUpdate({
        tags: tags.length > 0 ? tags : undefined,
        order,
        semanticCategory: semanticCategory.trim() || undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        summary: summary.trim() || undefined,
      });
    } catch (error) {
      console.error('メタデータ保存エラー:', error);
      alert('メタデータの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [tags, order, semanticCategory, keywords, summary, onMetadataUpdate]);

  const handleSemanticAnalysis = useCallback(async () => {
    try {
      setIsAnalyzing(true);
      await onSemanticAnalysis();
    } catch (error) {
      console.error('AI分析エラー:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [onSemanticAnalysis]);

  if (!section) {
    return null;
  }

  return (
    <div>
      {section.description && (
        <p style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--color-text-light)' }}>
          {section.description}
        </p>
      )}
      {section.summary && !isEditingMetadata && (
        <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>要約</h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-light)', lineHeight: '1.6' }}>
            {section.summary}
          </p>
        </div>
      )}
      <div style={{ marginBottom: '16px' }}>
        {section.content && section.content.length > 0 ? (
          <MarkdownRenderer content={section.content} />
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-light)' }}>
            読み込み中...
          </div>
        )}
      </div>

      {/* メタデータセクション */}
      <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>メタデータ</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isEditingMetadata ? (
              <>
                <button
                  onClick={handleSemanticAnalysis}
                  disabled={isAnalyzing}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: isAnalyzing ? 'var(--color-border-color)' : '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: isAnalyzing ? 0.6 : 1,
                  }}
                  title="AIでメタデータを自動生成"
                >
                  {isAnalyzing ? '分析中...' : 'AI分析'}
                </button>
                <button
                  onClick={() => setIsEditingMetadata(true)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  編集
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: isSaving ? 'var(--color-border-color)' : 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    opacity: isSaving ? 0.6 : 1,
                  }}
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => setIsEditingMetadata(false)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  キャンセル
                </button>
              </>
            )}
          </div>
        </div>

        {/* 要約 */}
        {isEditingMetadata ? (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
              要約
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
                minHeight: '100px',
              }}
              placeholder="セクションの要約"
            />
          </div>
        ) : section.summary && (
          <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>要約</h4>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', lineHeight: '1.6' }}>
              {section.summary}
            </p>
          </div>
        )}

        {/* タグ */}
        {isEditingMetadata ? (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
              タグ
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
                placeholder="タグを入力してEnter"
              />
              <button
                onClick={handleAddTag}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                追加
              </button>
            </div>
            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '4px',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      style={{
                        padding: 0,
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-light)',
                        fontSize: '16px',
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : section.tags && section.tags.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>タグ</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {section.tags.map((tag, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: 'var(--color-text-light)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* キーワード */}
        {isEditingMetadata ? (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
              キーワード
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
                placeholder="キーワードを入力してEnter"
              />
              <button
                onClick={handleAddKeyword}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                追加
              </button>
            </div>
            {keywords.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '4px',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      style={{
                        padding: 0,
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-light)',
                        fontSize: '16px',
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : section.keywords && section.keywords.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>キーワード</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {section.keywords.map((keyword, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: 'var(--color-text-light)',
                  }}
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 順序 */}
        {isEditingMetadata ? (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
              順序
            </label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>順序</h4>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)' }}>{section.order || 0}</p>
          </div>
        )}

        {/* セマンティックカテゴリ */}
        {isEditingMetadata ? (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
              セマンティックカテゴリ
            </label>
            <input
              type="text"
              value={semanticCategory}
              onChange={(e) => setSemanticCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
              placeholder="例: architecture, database, api"
            />
          </div>
        ) : section.semanticCategory && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>セマンティックカテゴリ</h4>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)' }}>{section.semanticCategory}</p>
          </div>
        )}

        {/* セクション関係 */}
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>関連セクション</h3>
            <button
              onClick={onAddRelation}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <FiPlus size={14} />
              <span>関係を追加</span>
            </button>
          </div>
          {sectionRelations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sectionRelations.map((relation) => {
                const relatedSectionId = relation.sourceSectionId === section.id
                  ? relation.targetSectionId
                  : relation.sourceSectionId;
                const relatedSection = dbSections.find(s => s.id === relatedSectionId);
                
                return (
                  <div
                    key={relation.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                          {relatedSection?.title || relatedSectionId}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-light)', padding: '2px 8px', backgroundColor: 'var(--color-surface)', borderRadius: '4px' }}>
                          {RELATION_TYPES.find(t => t.value === relation.relationType)?.label || relation.relationType}
                        </span>
                      </div>
                      {relation.description && (
                        <p style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '4px' }}>
                          {relation.description}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditRelation(relation);
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--color-border-color)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: 'var(--color-text)',
                        }}
                        title="編集"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRelation(relation);
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--color-border-color)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: 'var(--color-danger, #ef4444)',
                        }}
                        title="削除"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              関連セクションがありません。「関係を追加」ボタンから追加できます。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// セクション作成・編集モーダルコンポーネント（シンプルな実装）
function SectionModal({
  section,
  onClose,
  onSave,
}: {
  section: DesignDocSection | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    content: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // sectionが変更されたときに初期値を設定
  useEffect(() => {
    if (section) {
      setTitle(section.title || '');
      setDescription(section.description || '');
      setContent(section.content || '');
    } else {
      setTitle('');
      setDescription('');
      setContent('');
    }
  }, [section?.id]);

  const handleSave = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      alert('タイトルと内容は必須です');
      return;
    }

    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        content: content.trim(),
      });
    } catch (error) {
      console.error('[SectionModal] 保存エラー:', error);
      alert('保存中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  }, [title, description, content, isSaving, onSave]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '1400px',
          width: '95%',
          maxHeight: '95vh',
          overflow: 'auto',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
              {section ? 'セクションを編集' : 'セクションを作成'}
            </h2>
            {section?.id && (
              <p style={{ fontSize: '12px', color: 'var(--color-text-light)', margin: '4px 0 0 0', fontFamily: 'monospace' }}>
                ID: {section.id}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-light)',
              }}
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
              タイトル <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
              placeholder="セクションのタイトル"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
              説明
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
              placeholder="セクションの説明"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
              内容 <span style={{ color: 'red' }}>*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: isSaving ? 'var(--color-surface)' : 'var(--color-background)',
                color: 'var(--color-text)',
                minHeight: '200px',
                fontFamily: 'monospace',
                resize: 'vertical',
                opacity: isSaving ? 0.6 : 1,
              }}
              placeholder="セクションの内容（Markdown形式可）"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '10px 20px',
              backgroundColor: isSaving ? 'var(--color-border-color)' : 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? '保存中...' : (section ? '更新' : '作成')}
          </button>
        </div>
      </div>
    </div>
  );
}

// 削除確認モーダルコンポーネント
function DeleteConfirmModal({
  section,
  onClose,
  onConfirm,
}: {
  section: DesignDocSection;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
            セクションを削除
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--color-text-light)', lineHeight: '1.6' }}>
            セクション「<strong style={{ color: 'var(--color-text)' }}>{section.title}</strong>」を削除しますか？
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-light)', marginTop: '12px', lineHeight: '1.6' }}>
            この操作は取り消せません。セクションの内容とメタデータが完全に削除されます。
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              onConfirm();
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}

// 関連セクション削除確認モーダルコンポーネント
function DeleteRelationConfirmModal({
  relation,
  dbSections,
  onClose,
  onConfirm,
}: {
  relation: DesignDocSectionRelation;
  dbSections: DesignDocSection[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const sourceSection = dbSections.find(s => s.id === relation.sourceSectionId);
  const targetSection = dbSections.find(s => s.id === relation.targetSectionId);
  const relationTypeLabel = RELATION_TYPES.find(t => t.value === relation.relationType)?.label || relation.relationType;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
            関連セクションの関係を削除
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--color-text-light)', lineHeight: '1.6', marginBottom: '8px' }}>
            <strong style={{ color: 'var(--color-text)' }}>{sourceSection?.title || relation.sourceSectionId}</strong>
            {' '}
            <span style={{ color: 'var(--color-text-light)' }}>--[{relationTypeLabel}]--&gt;</span>
            {' '}
            <strong style={{ color: 'var(--color-text)' }}>{targetSection?.title || relation.targetSectionId}</strong>
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-light)', marginTop: '12px', lineHeight: '1.6' }}>
            この関係を削除しますか？この操作は取り消せません。
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              onConfirm();
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}

// セクション関係作成・編集モーダルコンポーネント
function SectionRelationModal({
  sourceSectionId,
  relation,
  sections,
  onClose,
  onSave,
}: {
  sourceSectionId: string;
  relation: DesignDocSectionRelation | null;
  sections: DesignDocSection[];
  onClose: () => void;
  onSave: (data: {
    sourceSectionId: string;
    targetSectionId: string;
    relationType: string;
    description?: string;
  }) => void;
}) {
  const [targetSectionId, setTargetSectionId] = useState(relation?.targetSectionId || '');
  const [relationType, setRelationType] = useState(relation?.relationType || 'related_to');
  const [description, setDescription] = useState(relation?.description || '');

  const handleSave = () => {
    if (!targetSectionId) {
      alert('関連セクションを選択してください');
      return;
    }

    if (targetSectionId === sourceSectionId) {
      alert('同じセクションを選択することはできません');
      return;
    }

    onSave({
      sourceSectionId: relation?.sourceSectionId || sourceSectionId,
      targetSectionId,
      relationType,
      description: description.trim() || undefined,
    });
  };

  // 選択可能なセクション（現在のセクションを除く）
  const availableSections = sections.filter(s => s.id !== sourceSectionId);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '600px',
          width: '90%',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)' }}>
            {relation ? 'セクション関係を編集' : 'セクション関係を作成'}
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-light)',
            }}
          >
            <FiX size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
              関連セクション <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={targetSectionId}
              onChange={(e) => setTargetSectionId(e.target.value)}
              disabled={!!relation}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: relation ? 'var(--color-background)' : 'var(--color-background)',
                color: 'var(--color-text)',
                cursor: relation ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">選択してください</option>
              {availableSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
              関係タイプ <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
            >
              {RELATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
                minHeight: '100px',
              }}
              placeholder="関係の説明（オプション）"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {relation ? '更新' : '作成'}
          </button>
        </div>
      </div>
    </div>
  );
}

// システム設計ドキュメント検索ビュー
function DesignDocSearchView({
  searchQuery,
  setSearchQuery,
  isSearching,
  setIsSearching,
  searchResults,
  setSearchResults,
  selectedResult,
  setSelectedResult,
  sections,
  dbSections,
  sectionRelations,
  searchFilters,
  setSearchFilters,
  setActiveSection,
  setViewMode,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;
  searchResults: DesignDocResult[];
  setSearchResults: (results: DesignDocResult[]) => void;
  selectedResult: DesignDocResult | null;
  setSelectedResult: (result: DesignDocResult | null) => void;
  sections: Array<{ id: string; title: string; description: string }>;
  dbSections: DesignDocSection[];
  sectionRelations: DesignDocSectionRelation[];
  searchFilters: { tags?: string[]; semanticCategory?: string };
  setSearchFilters: (filters: { tags?: string[]; semanticCategory?: string }) => void;
  setActiveSection: (section: string | null) => void;
  setViewMode: (mode: 'sections' | 'search' | 'ai') => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [chromaSectionIds, setChromaSectionIds] = useState<string[]>([]);
  const [isCheckingChroma, setIsCheckingChroma] = useState(false);

  // 利用可能なタグとカテゴリを取得
  const allTags = Array.from(new Set(
    dbSections.flatMap(s => s.tags || [])
  )).sort();
  const allCategories = Array.from(new Set(
    dbSections.map(s => s.semanticCategory).filter((c): c is string => !!c)
  )).sort();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setSelectedResult(null);

    try {
      const filters: { tags?: string[]; semanticCategory?: string } = {};
      if (searchFilters.tags && searchFilters.tags.length > 0) {
        filters.tags = searchFilters.tags;
      }
      if (searchFilters.semanticCategory) {
        filters.semanticCategory = searchFilters.semanticCategory;
      }

      const results = await searchDesignDocs(searchQuery, 10, filters);
      setSearchResults(results);
    } catch (error) {
      console.error('検索エラー:', error);
      alert('検索中にエラーが発生しました。コンソールを確認してください。');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddTagFilter = (tag: string) => {
    if (!searchFilters.tags?.includes(tag)) {
      setSearchFilters({
        ...searchFilters,
        tags: [...(searchFilters.tags || []), tag],
      });
    }
  };

  const handleRemoveTagFilter = (tag: string) => {
    setSearchFilters({
      ...searchFilters,
      tags: searchFilters.tags?.filter(t => t !== tag),
    });
  };

  const handleSetCategoryFilter = (category: string) => {
    setSearchFilters({
      ...searchFilters,
      semanticCategory: category || undefined,
    });
  };

  const handleCopyContent = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('コピーエラー:', error);
    }
  };

  const handleCheckChromaData = async () => {
    setIsCheckingChroma(true);
    try {
      const sectionIds = await listDesignDocSectionIds();
      setChromaSectionIds(sectionIds);
      console.log('📊 ChromaDBに保存されているセクションID:', sectionIds);
      console.log('📊 セクション数:', sectionIds.length);
      alert(`ChromaDBに保存されているセクション数: ${sectionIds.length}\n\nセクションID:\n${sectionIds.join('\n')}\n\n詳細はコンソールを確認してください。`);
    } catch (error) {
      console.error('ChromaDBデータ確認エラー:', error);
      alert('ChromaDBデータの確認に失敗しました。コンソールを確認してください。');
    } finally {
      setIsCheckingChroma(false);
    }
  };

  return (
    <div>
      {/* 検索バー */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'center',
          padding: '16px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          border: '1px solid var(--color-border-color)',
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <FiSearch style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'var(--color-text-light)',
              fontSize: '18px',
            }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isSearching) {
                  handleSearch();
                }
              }}
              placeholder="システム設計ドキュメントを検索（例: Tauri、データベース構成、RAG検索）"
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                fontSize: '14px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
            />
          </div>
          <button
            onClick={handleCheckChromaData}
            disabled={isCheckingChroma}
            style={{
              padding: '12px 16px',
              backgroundColor: isCheckingChroma ? 'var(--color-border-color)' : 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              cursor: isCheckingChroma ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              opacity: isCheckingChroma ? 0.6 : 1,
            }}
            title="ChromaDBに保存されているデータを確認"
          >
            {isCheckingChroma ? '確認中...' : '📊 データ確認'}
          </button>
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: isSearching || !searchQuery.trim() ? 'var(--color-border-color)' : 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isSearching || !searchQuery.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isSearching || !searchQuery.trim() ? 0.6 : 1,
            }}
          >
            {isSearching ? (
              <>
                <span>検索中...</span>
              </>
            ) : (
              <>
                <FiSearch />
                <span>検索</span>
              </>
            )}
          </button>
        </div>

        {/* フィルター */}
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* タグフィルター */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                タグでフィルター
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (searchFilters.tags?.includes(tag)) {
                        handleRemoveTagFilter(tag);
                      } else {
                        handleAddTagFilter(tag);
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: searchFilters.tags?.includes(tag) ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: searchFilters.tags?.includes(tag) ? 'white' : 'var(--color-text)',
                      border: `1px solid ${searchFilters.tags?.includes(tag) ? 'var(--color-primary)' : 'var(--color-border-color)'}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {searchFilters.tags && searchFilters.tags.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {searchFilters.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTagFilter(tag)}
                        style={{
                          padding: 0,
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'white',
                          fontSize: '14px',
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* セマンティックカテゴリフィルター */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                カテゴリでフィルター
              </label>
              <select
                value={searchFilters.semanticCategory || ''}
                onChange={(e) => handleSetCategoryFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="">すべて</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* フィルターリセット */}
          {(searchFilters.tags && searchFilters.tags.length > 0) || searchFilters.semanticCategory ? (
            <div style={{ marginTop: '12px' }}>
              <button
                onClick={() => setSearchFilters({})}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-light)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                フィルターをリセット
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* 検索結果 */}
      {searchResults.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
            検索結果 ({searchResults.length}件)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {searchResults.map((result) => (
              <div
                key={result.sectionId}
                onClick={() => setSelectedResult(selectedResult?.sectionId === result.sectionId ? null : result)}
                style={{
                  padding: '16px',
                  backgroundColor: selectedResult?.sectionId === result.sectionId ? 'var(--color-background)' : 'var(--color-surface)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--color-background)';
                }}
                onMouseLeave={(e) => {
                  if (selectedResult?.sectionId !== result.sectionId) {
                    e.currentTarget.style.borderColor = 'var(--color-border-color)';
                    e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                    {result.sectionTitle}
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '12px', 
                      color: 'var(--color-text-light)',
                      backgroundColor: 'var(--color-surface)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}>
                      関連度: {(result.score * 100).toFixed(1)}%
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSection(result.sectionId);
                        setViewMode('sections');
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      セクションを表示
                    </button>
                  </div>
                </div>
                {result.tags && result.tags.length > 0 && (
                  <div style={{ marginBottom: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {result.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-text-light)',
                          backgroundColor: 'var(--color-surface)',
                          padding: '2px 6px',
                          borderRadius: '3px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {selectedResult?.sectionId === result.sectionId && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* 階層構造の表示 */}
                    {result.hierarchy && result.hierarchy.length > 0 && (
                      <div style={{ 
                        padding: '8px 12px',
                        backgroundColor: 'var(--color-surface)',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border-color)',
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', marginRight: '8px' }}>階層:</span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>
                          {result.hierarchy.join(' > ')}
                        </span>
                      </div>
                    )}

                    {/* 関連セクションの表示 */}
                    {(() => {
                      const relatedRelations = sectionRelations.filter(
                        rel => rel.sourceSectionId === result.sectionId || rel.targetSectionId === result.sectionId
                      );
                      const relatedSectionIds = new Set<string>();
                      relatedRelations.forEach(rel => {
                        if (rel.sourceSectionId === result.sectionId) {
                          relatedSectionIds.add(rel.targetSectionId);
                        } else {
                          relatedSectionIds.add(rel.sourceSectionId);
                        }
                      });
                      const relatedSections = dbSections.filter(s => relatedSectionIds.has(s.id));

                      if (relatedSections.length > 0) {
                        return (
                          <div style={{ 
                            padding: '8px 12px',
                            backgroundColor: 'var(--color-surface)',
                            borderRadius: '6px',
                            border: '1px solid var(--color-border-color)',
                          }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: '8px' }}>
                              関連セクション ({relatedSections.length}件):
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {relatedSections.map(relatedSection => (
                                <button
                                  key={relatedSection.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveSection(relatedSection.id);
                                    setViewMode('sections');
                                  }}
                                  style={{
                                    padding: '6px 8px',
                                    backgroundColor: 'var(--color-background)',
                                    border: '1px solid var(--color-border-color)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    textAlign: 'left',
                                    color: 'var(--color-text)',
                                    transition: 'all 0.2s',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                                    e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--color-border-color)';
                                    e.currentTarget.style.backgroundColor = 'var(--color-background)';
                                  }}
                                >
                                  {relatedSection.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* 内容の表示 */}
                    {result.content && (
                      <div style={{ 
                        padding: '12px',
                        backgroundColor: 'var(--color-surface)',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border-color)',
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '8px',
                        }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)' }}>内容:</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyContent(result.content, result.sectionId);
                            }}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'transparent',
                              border: '1px solid var(--color-border-color)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {copiedId === result.sectionId ? (
                              <>
                                <FiCheck size={12} />
                                <span>コピー済み</span>
                              </>
                            ) : (
                              <>
                                <FiCopy size={12} />
                                <span>コピー</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p style={{ 
                          fontSize: '14px', 
                          color: 'var(--color-text)', 
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '300px',
                          overflow: 'auto',
                        }}>
                          {result.content.length > 500 
                            ? result.content.substring(0, 500) + '...'
                            : result.content
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isSearching && searchResults.length === 0 && searchQuery && (
        <div style={{ 
          padding: '48px', 
          textAlign: 'center', 
          color: 'var(--color-text-light)',
          border: '2px dashed var(--color-border-color)',
          borderRadius: '8px',
        }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>検索結果が見つかりませんでした</p>
          <p style={{ fontSize: '14px', opacity: 0.7 }}>別のキーワードで検索してみてください</p>
        </div>
      )}

      {!searchQuery && !isSearching && (
        <div style={{ 
          padding: '48px', 
          textAlign: 'center', 
          color: 'var(--color-text-light)',
          border: '2px dashed var(--color-border-color)',
          borderRadius: '8px',
        }}>
          <FiSearch size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>システム設計ドキュメントを検索</p>
          <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '16px' }}>
            キーワードを入力して検索ボタンをクリックしてください
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setSearchQuery(section.title);
                  setTimeout(() => handleSearch(), 100);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// システム設計ドキュメントAI質問ビュー
function DesignDocAIView({
  aiAssistantOpen,
  setAiAssistantOpen,
  setInitialQuery,
}: {
  aiAssistantOpen: boolean;
  setAiAssistantOpen: (open: boolean) => void;
  setInitialQuery: (query: string | undefined) => void;
}) {
  return (
    <div style={{ 
      padding: '48px', 
      textAlign: 'center',
      border: '2px dashed var(--color-border-color)',
      borderRadius: '8px',
      backgroundColor: 'var(--color-surface)',
    }}>
      <FiMessageSquare size={64} style={{ marginBottom: '24px', color: 'var(--color-primary)', opacity: 0.8 }} />
      <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
        AIアシスタントでシステム設計について質問
      </h3>
      <p style={{ fontSize: '16px', color: 'var(--color-text-light)', lineHeight: '1.6', marginBottom: '32px' }}>
        AIアシスタントがシステム設計ドキュメントを参照して、あなたの質問に答えます。
      </p>
      <button
        onClick={() => setAiAssistantOpen(true)}
        style={{
          padding: '16px 32px',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#2563EB';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-primary)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <FiMessageSquare size={20} />
        AIアシスタントを開く
      </button>
      <div style={{ marginTop: '32px', textAlign: 'left', maxWidth: '600px', margin: '32px auto 0' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
          質問例:
        </h4>
        <ul style={{ 
          listStyle: 'none', 
          padding: 0, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px' 
        }}>
          {[
            'Tauriとは何ですか？どのように使われていますか？',
            'SQLiteとChromaDBはどのように連携していますか？',
            'RAG検索のフローを教えてください',
            'データの保存フローを説明してください',
            'ページ構造とID管理について教えてください',
          ].map((example, idx) => (
            <li
              key={idx}
              onClick={() => {
                setInitialQuery(example); // 初期クエリを設定
                setAiAssistantOpen(true); // AIアシスタントパネルを開く
              }}
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                color: 'var(--color-text)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.backgroundColor = 'var(--color-surface)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-color)';
                e.currentTarget.style.backgroundColor = 'var(--color-background)';
              }}
            >
              {example}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
