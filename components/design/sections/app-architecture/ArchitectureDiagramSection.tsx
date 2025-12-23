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
            AIAssistant[AIアシスタント<br/>useAIChat]
            AgentUI[Agent管理UI<br/>タスク管理UI]
        end

        subgraph "オーケストレーション層"
            RAGOrch[RAGオーケストレーター<br/>RAGOrchestrator]
            AgentOrch[Agentオーケストレーター<br/>AgentOrchestrator]
            TaskPlan[タスクプランナー<br/>TaskPlanner]
        end

        subgraph "プロバイダー層"
            KGProvider[ナレッジグラフ<br/>プロバイダー<br/>KnowledgeGraphProvider]
            DesignProvider[設計ドキュメント<br/>プロバイダー<br/>DesignDocsProvider]
            MCPProvider[MCPプロバイダー<br/>MCPProvider]
        end

        subgraph "MCP層"
            MCPClient[MCPクライアント<br/>MCPClient]
            ToolRegistry[ローカルTool<br/>レジストリ]
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

        subgraph "AI Agent層"
            Agents[Agent群<br/>SearchAgent<br/>AnalysisAgent<br/>GenerationAgent<br/>ValidationAgent]
            A2AManager[A2A通信マネージャー<br/>A2AManager]
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
    
    AIAssistant -->|"ユーザークエリ"| RAGOrch
    AgentUI -->|"タスク実行"| AgentOrch
    RAGOrch -->|"並列情報取得"| KGProvider
    RAGOrch -->|"並列情報取得"| DesignProvider
    RAGOrch -->|"並列情報取得"| MCPProvider
    KGProvider -->|"検索"| ChromaClient
    DesignProvider -->|"検索"| ChromaClient
    MCPProvider -->|"Tool実行"| MCPClient
    MCPClient -->|"Tool実行"| ToolRegistry
    AgentOrch -->|"タスク配分"| Agents
    AgentOrch -->|"実行計画"| TaskPlan
    Agents -->|"A2A通信"| A2AManager
    Agents -->|"Tool実行"| MCPClient
    ChromaClient -->|"類似度検索"| ChromaDB
    ChromaDB -.->|"検索結果ID"| ChromaClient
    ChromaClient -->|"詳細情報取得"| SQLite
    RAGOrch -->|"RAGコンテキスト"| AIAssistant
    AIAssistant -->|"LLM API呼び出し"| OpenAI
    AIAssistant -->|"LLM API呼び出し"| Ollama
    OpenAI -->|"回答生成"| AIAssistant
    Ollama -->|"回答生成"| AIAssistant

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
    style AIAssistant fill:#e3f2fd
    style RAGOrch fill:#fff4e1
    style AgentOrch fill:#fff4e1
    style MCPClient fill:#ffeb3b,stroke:#f57f17,stroke-width:3px
    style Agents fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    style A2AManager fill:#b2dfdb,stroke:#004d40,stroke-width:2px`}
      />
      
      <div style={{ marginTop: '32px' }}>
        <h4 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          marginBottom: '16px', 
          color: 'var(--color-text)',
          borderBottom: '2px solid var(--color-border-color)',
          paddingBottom: '8px'
        }}>
          実行環境の説明
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
          <li style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#4A90E2' }}>MissionAIアプリ（ローカルPC）:</strong> Tauriアプリとしてバンドルされ、ユーザーのPC上で直接実行される
          </li>
          <li style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#F5A623' }}>Ollama（ローカルPC）:</strong> ユーザーのPC上で動作するローカルLLM実行環境。埋め込み生成とLLM推論の両方に対応
          </li>
          <li>
            <strong style={{ color: '#E53935' }}>クラウド（外部サービス）:</strong> インターネット経由でアクセスする外部API（OpenAI APIなど）
          </li>
        </ul>
      </div>

      <div style={{ marginTop: '32px' }}>
        <h4 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          marginBottom: '16px', 
          color: 'var(--color-text)',
          borderBottom: '2px solid var(--color-border-color)',
          paddingBottom: '8px'
        }}>
          主要な機能
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '14px',
            backgroundColor: 'var(--color-background)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', borderBottom: '2px solid var(--color-border-color)' }}>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#FFFFFF', 
                  border: '1px solid var(--color-border-color)',
                  width: '25%'
                }}>
                  機能名
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#FFFFFF', 
                  border: '1px solid var(--color-border-color)',
                  width: '75%'
                }}>
                  説明
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { 
                  name: 'AIアシスタント', 
                  description: 'RAG（Retrieval-Augmented Generation）を使用したチャットインターフェース。ナレッジグラフや設計ドキュメントから情報を検索して回答を生成'
                },
                { 
                  name: 'RAGオーケストレーター', 
                  description: '複数の情報源（ナレッジグラフ、設計ドキュメント、MCP）から並列で情報を取得し、統合・重複排除・スコアリングを行う'
                },
                { 
                  name: 'Agentシステム', 
                  description: '複数の専門Agent（SearchAgent、AnalysisAgent、GenerationAgent、ValidationAgent等）が協調してタスクを実行。Agentオーケストレーターがタスクの配分・実行計画作成・状態監視を行う'
                },
                { 
                  name: 'MCP（Model Context Protocol）', 
                  description: 'LLMがToolを呼び出せるようにする仕組み。ローカルToolレジストリとMCPサーバー（将来実装）に対応'
                },
                { 
                  name: 'ナレッジグラフ', 
                  description: 'エンティティ、リレーション、トピックを可視化・管理。ChromaDBでベクトル検索、SQLiteで詳細情報を保存'
                },
                { 
                  name: 'データベース', 
                  description: 'SQLiteで構造化データ、ChromaDBでベクトルデータを管理。両者を連携してRAG検索を実現'
                }
              ].map((item, index) => (
                <tr 
                  key={index}
                  style={{ 
                    borderBottom: '1px solid var(--color-border-color)',
                    backgroundColor: index % 2 === 0 ? 'var(--color-background)' : 'var(--color-surface)'
                  }}
                >
                  <td style={{ 
                    padding: '12px', 
                    border: '1px solid var(--color-border-color)', 
                    color: 'var(--color-text)',
                    fontWeight: 600
                  }}>
                    {item.name}
                  </td>
                  <td style={{ 
                    padding: '12px', 
                    border: '1px solid var(--color-border-color)', 
                    color: 'var(--color-text)',
                    lineHeight: '1.6'
                  }}>
                    {item.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        <h4 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          marginBottom: '16px', 
          color: 'var(--color-text)',
          borderBottom: '2px solid var(--color-border-color)',
          paddingBottom: '8px'
        }}>
          ポート構成
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '14px',
            backgroundColor: 'var(--color-background)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', borderBottom: '2px solid var(--color-border-color)' }}>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#FFFFFF', 
                  border: '1px solid var(--color-border-color)',
                  width: '20%'
                }}>
                  サービス
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#FFFFFF', 
                  border: '1px solid var(--color-border-color)',
                  width: '15%'
                }}>
                  開発環境
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#FFFFFF', 
                  border: '1px solid var(--color-border-color)',
                  width: '15%'
                }}>
                  本番環境
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#FFFFFF', 
                  border: '1px solid var(--color-border-color)',
                  width: '50%'
                }}>
                  説明
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { 
                  service: 'Next.js開発サーバー', 
                  dev: '3010', 
                  prod: 'N/A', 
                  description: 'フロントエンドの開発サーバー（HMR対応）。開発環境のみで使用'
                },
                { 
                  service: 'Rust APIサーバー', 
                  dev: '3010', 
                  prod: '3011', 
                  description: 'バックエンドAPIサーバー（Axum）。開発環境ではNext.jsと同じポート、本番環境では3011を使用'
                },
                { 
                  service: 'ChromaDB Server', 
                  dev: '8000', 
                  prod: '8000', 
                  description: 'ベクトル検索サーバー（Pythonプロセス）。環境変数CHROMADB_PORTで変更可能'
                },
                { 
                  service: 'HTML配信', 
                  dev: 'http://localhost:3010', 
                  prod: 'tauri://localhost', 
                  description: '開発環境ではNext.js開発サーバー、本番環境ではTauriカスタムプロトコルで静的HTMLを配信'
                }
              ].map((item, index) => (
                <tr 
                  key={index}
                  style={{ 
                    borderBottom: '1px solid var(--color-border-color)',
                    backgroundColor: index % 2 === 0 ? 'var(--color-background)' : 'var(--color-surface)'
                  }}
                >
                  <td style={{ 
                    padding: '12px', 
                    border: '1px solid var(--color-border-color)', 
                    color: 'var(--color-text)',
                    fontWeight: 600
                  }}>
                    {item.service}
                  </td>
                  <td style={{ 
                    padding: '12px', 
                    border: '1px solid var(--color-border-color)', 
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'monospace',
                    fontSize: '13px'
                  }}>
                    {item.dev}
                  </td>
                  <td style={{ 
                    padding: '12px', 
                    border: '1px solid var(--color-border-color)', 
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'monospace',
                    fontSize: '13px'
                  }}>
                    {item.prod}
                  </td>
                  <td style={{ 
                    padding: '12px', 
                    border: '1px solid var(--color-border-color)', 
                    color: 'var(--color-text)',
                    lineHeight: '1.6'
                  }}>
                    {item.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        <h4 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          marginBottom: '16px', 
          color: 'var(--color-text)',
          borderBottom: '2px solid var(--color-border-color)',
          paddingBottom: '8px'
        }}>
          APIの関係性
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '14px',
            backgroundColor: 'var(--color-background)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', borderBottom: '2px solid var(--color-border-color)' }}>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#FFFFFF', 
                  border: '1px solid var(--color-border-color)',
                  width: '30%'
                }}>
                  送信元
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#FFFFFF', 
                  border: '1px solid var(--color-border-color)',
                  width: '30%'
                }}>
                  送信先
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#FFFFFF', 
                  border: '1px solid var(--color-border-color)',
                  width: '15%'
                }}>
                  プロトコル
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#FFFFFF', 
                  border: '1px solid var(--color-border-color)',
                  width: '25%'
                }}>
                  用途
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { 
                  from: 'フロントエンド', 
                  to: 'Rust APIサーバー', 
                  protocol: 'HTTP', 
                  purpose: 'データ取得・保存、RAG検索、Agent実行等のAPI呼び出し'
                },
                { 
                  from: 'Rust APIサーバー', 
                  to: 'SQLite', 
                  protocol: '直接アクセス', 
                  purpose: '構造化データの保存・取得（エンティティ、リレーション、トピック等）'
                },
                { 
                  from: 'Rust APIサーバー', 
                  to: 'ChromaDB Server', 
                  protocol: 'HTTP', 
                  purpose: 'ベクトル検索、埋め込みベクトルの保存・取得'
                },
                { 
                  from: 'フロントエンド', 
                  to: 'OpenAI API', 
                  protocol: 'HTTPS', 
                  purpose: '埋め込み生成、LLM推論（GPT-4o-mini等）'
                },
                { 
                  from: 'フロントエンド', 
                  to: 'Ollama', 
                  protocol: 'HTTP', 
                  purpose: 'ローカルLLM推論、埋め込み生成（localhost:11434）'
                },
                { 
                  from: 'Rust APIサーバー', 
                  to: 'Tauri Commands', 
                  protocol: 'IPC', 
                  purpose: 'TauriアプリケーションとのIPC通信'
                }
              ].map((item, index) => (
                <tr 
                  key={index}
                  style={{ 
                    borderBottom: '1px solid var(--color-border-color)',
                    backgroundColor: index % 2 === 0 ? 'var(--color-background)' : 'var(--color-surface)'
                  }}
                >
                  <td style={{ 
                    padding: '12px', 
                    border: '1px solid var(--color-border-color)', 
                    color: 'var(--color-text)',
                    fontWeight: 500
                  }}>
                    {item.from}
                  </td>
                  <td style={{ 
                    padding: '12px', 
                    border: '1px solid var(--color-border-color)', 
                    color: 'var(--color-text)',
                    fontWeight: 500
                  }}>
                    {item.to}
                  </td>
                  <td style={{ 
                    padding: '12px', 
                    border: '1px solid var(--color-border-color)', 
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'monospace',
                    fontSize: '13px'
                  }}>
                    {item.protocol}
                  </td>
                  <td style={{ 
                    padding: '12px', 
                    border: '1px solid var(--color-border-color)', 
                    color: 'var(--color-text)',
                    lineHeight: '1.6'
                  }}>
                    {item.purpose}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CollapsibleSection>
  );
}

