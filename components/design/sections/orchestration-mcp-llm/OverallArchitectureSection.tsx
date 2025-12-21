'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * 全体アーキテクチャセクション
 */
export function OverallArchitectureSection() {
  return (
    <CollapsibleSection 
      title="全体アーキテクチャ" 
      defaultExpanded={true}
      id="orchestration-architecture-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>レイヤー構造の概要</h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px' }}>
            システムは以下のレイヤーで構成されています。各レイヤーは明確な役割を持ち、相互に連携して動作します。
          </p>
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '2px solid var(--color-border-color)' }}>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: 'var(--color-text)', border: '1px solid var(--color-border-color)', width: '60px' }}>項番</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text)', border: '1px solid var(--color-border-color)' }}>レイヤー名</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text)', border: '1px solid var(--color-border-color)' }}>役割</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text)', border: '1px solid var(--color-border-color)' }}>主要コンポーネント</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#e1f5ff',
                      color: '#0277bd',
                      fontWeight: 600,
                      fontSize: '14px'
                    }}>1</div>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600, color: 'var(--color-text)' }}>プレゼンテーション層</td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>ユーザーインターフェース</td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>AIアシスタントパネル（useAIChat）</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-border-color)', backgroundColor: 'var(--color-surface)' }}>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#fff4e1',
                      color: '#e65100',
                      fontWeight: 600,
                      fontSize: '14px'
                    }}>2</div>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600, color: 'var(--color-text)' }}>オーケストレーション層</td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>複数の情報源を統合・管理</td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>RAGOrchestrator<br/>（並列情報取得、重複排除、スコアリング、コンテキスト生成）</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#e8f5e9',
                      color: '#2e7d32',
                      fontWeight: 600,
                      fontSize: '14px'
                    }}>3</div>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600, color: 'var(--color-text)' }}>プロバイダー層</td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>各情報源へのアクセス</td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                    • KnowledgeGraphProvider<br/>
                    • DesignDocsProvider<br/>
                    • MCPProvider
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-border-color)', backgroundColor: 'var(--color-surface)' }}>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#fff9c4',
                      color: '#f57f17',
                      fontWeight: 600,
                      fontSize: '14px',
                      border: '2px solid #f57f17'
                    }}>4</div>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600, color: 'var(--color-text)' }}>MCP層</td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>Model Context Protocol<br/>（Tool実行の管理）<br/><br/>主な役割：<br/>• LLMがToolを呼び出せるようにする仕組み<br/>• ToolレジストリでToolを登録・管理<br/>• LLMのレスポンスからTool呼び出しを検出・実行<br/>• RAGオーケストレーターの情報源の一つとして機能</td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                    • MCPClient<br/>
                    • MCPサーバー（将来実装）<br/>
                    • ローカルToolレジストリ<br/>
                    • Tool実行器（executeTool）<br/>
                    • Toolパーサー（parseToolCalls）
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#f3e5f5',
                      color: '#7b1fa2',
                      fontWeight: 600,
                      fontSize: '14px'
                    }}>5</div>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600, color: 'var(--color-text)' }}>データ層</td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>データの永続化</td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                    • ChromaDB（ベクトル検索）<br/>
                    • SQLite（詳細情報取得）
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#e0f2f1',
                      color: '#00695c',
                      fontWeight: 600,
                      fontSize: '14px'
                    }}>6</div>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600, color: 'var(--color-text)' }}>AI Agent層</td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>マルチエージェントシステム<br/>（タスク自動実行・協調）<br/><br/>主な役割：<br/>• タスクの自動実行<br/>• 複数Agentの協調<br/>• タスクオーケストレーション<br/><br/><strong>※ A2A通信層はAI Agent層内に含まれる</strong></td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                    • AgentOrchestrator<br/>（タスク配分・管理）<br/>
                    • TaskPlanner<br/>（実行計画作成）<br/>
                    • Agent（SearchAgent、<br/>AnalysisAgent等）<br/>
                    <br/>
                    <strong>【A2A通信層】</strong><br/>
                    • A2AManager<br/>（Agent間通信管理）<br/>
                    • A2Aメッセージ<br/>（確認・指示・通知）
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-border-color)', backgroundColor: 'var(--color-surface)' }}>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#ffe1f5',
                      color: '#c2185b',
                      fontWeight: 600,
                      fontSize: '14px'
                    }}>7</div>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600, color: 'var(--color-text)' }}>LLM層</td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>言語モデルとTool実行</td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                    • GPT-4o-mini / GPT-4o / GPT-5<br/>
                    • Ollama（ローカルモデル）<br/>
                    • Toolパーサー（parseToolCalls）<br/>
                    • Tool実行器（executeToolCalls）
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <ZoomableMermaidDiagram
          diagramId="orchestration-architecture-diagram"
          mermaidCode={`flowchart TB
    subgraph Presentation["① プレゼンテーション層"]
        A[ユーザー] --> B[AIアシスタント<br/>useAIChat]
        A --> B2[Agent管理UI<br/>タスク管理UI]
    end
    
    subgraph Orchestration["② オーケストレーション層"]
        B --> C[RAGオーケストレーター<br/>RAGOrchestrator]
        C --> C1[並列情報取得]
        C1 --> C2[重複排除]
        C2 --> C3[スコアリング]
        C3 --> C4[コンテキスト生成]
        
        B2 --> C5[Agentオーケストレーター<br/>AgentOrchestrator]
        C5 --> C6[タスク配分・管理]
        C5 --> C7[実行計画作成<br/>TaskPlanner]
    end
    
    subgraph Providers["③ プロバイダー層"]
        C1 --> D1[ナレッジグラフ<br/>プロバイダー<br/>KnowledgeGraphProvider]
        C1 --> D2[システム設計ドキュメント<br/>プロバイダー<br/>DesignDocsProvider]
        C1 --> D3[MCPプロバイダー<br/>MCPProvider]
        
        D1 --> E1[ナレッジグラフ検索<br/>searchKnowledgeGraph]
        D2 --> E2[設計ドキュメント検索<br/>getDesignDocContext]
        D3 --> E3[MCPクライアント<br/>MCPClient]
    end
    
    subgraph MCP["④ MCP層 (Model Context Protocol)"]
        E3 --> MCP1[MCPクライアント<br/>MCPClient]
        MCP1 --> MCP2{接続状態<br/>確認}
        MCP2 -->|接続済み| MCP3[MCPサーバー<br/>HTTP接続<br/>将来実装]
        MCP2 -->|未接続| MCP4[ローカルTool<br/>レジストリ<br/>executeTool]
        MCP3 --> MCP5[Tool実行<br/>search_knowledge_graph等]
        MCP4 --> MCP5
        MCP5 --> MCP6[Tool実行結果<br/>context + sources]
    end
    
    subgraph Data["⑤ データ層"]
        E1 --> F1[ChromaDB<br/>ベクトル検索]
        E1 --> F2[SQLite<br/>詳細情報取得]
        E2 --> F3[ChromaDB<br/>ベクトル検索]
        E2 --> F4[SQLite<br/>詳細情報取得]
        
        F1 --> G1[エンティティ<br/>リレーション<br/>トピック]
        F2 --> G1
        F3 --> G2[設計ドキュメント<br/>セクション]
        F4 --> G2
    end
    
    subgraph Agent["⑥ AI Agent層"]
        C6 --> AG1[Agent配分]
        C7 --> AG1
        AG1 --> AG2[SearchAgent]
        AG1 --> AG3[AnalysisAgent]
        AG1 --> AG4[GenerationAgent]
        AG1 --> AG5[ValidationAgent]
        
        subgraph A2A["A2A通信層<br/>(Agent-to-Agent)"]
            AG2 --> AG6[A2A通信マネージャー<br/>A2AManager]
            AG3 --> AG6
            AG4 --> AG6
            AG5 --> AG6
            AG6 --> AG7[メッセージ送信<br/>CONFIRMATION]
            AG6 --> AG8[メッセージ送信<br/>REQUEST]
            AG6 --> AG9[メッセージ送信<br/>NOTIFICATION]
            AG7 --> AG10[Agent間通信<br/>確認・指示・通知]
            AG8 --> AG10
            AG9 --> AG10
        end
        
        AG2 --> MCP1
        AG3 --> MCP1
        AG4 --> MCP1
        AG5 --> MCP1
    end
    
    subgraph LLM["⑦ LLM層"]
        C4 --> H[システムプロンプト構築<br/>RAGコンテキスト + Tool一覧]
        H --> I[LLM API<br/>GPT-4o-mini / Ollama]
        I --> J[Tool呼び出し検出<br/>parseToolCalls]
        J --> K{Tool呼び出し<br/>あり?}
        K -->|Yes| L[Tool実行<br/>executeToolCalls]
        K -->|No| M[回答生成]
        L --> MCP1
        MCP6 --> N[Tool結果を<br/>LLMに再送信]
        N --> I
        M --> O[最終回答]
    end
    
    G1 --> C2
    G2 --> C2
    MCP6 --> C2
    O --> B
    AG7 --> C5
    
    style Presentation fill:#e1f5ff
    style Orchestration fill:#fff4e1
    style Providers fill:#e8f5e9
    style MCP fill:#ffeb3b,stroke:#f57f17,stroke-width:3px
    style Data fill:#f3e5f5
    style Agent fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    style A2A fill:#b2dfdb,stroke:#004d40,stroke-width:2px
    style LLM fill:#ffe1f5`}
        />
        
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>レイヤー間のデータフロー</h4>
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#e0f2f1', borderRadius: '6px', border: '1px solid #00695c' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#004d40' }}>A2A通信層について</h5>
            <p style={{ fontSize: '14px', lineHeight: '1.8', margin: 0, color: 'var(--color-text)' }}>
              <strong>A2A（Agent-to-Agent）通信層</strong>は、AI Agent層内に含まれる通信インフラです。
              A2AManagerが各Agent間のメッセージ送受信を管理し、Agent同士が確認（CONFIRMATION）、指示（REQUEST）、通知（NOTIFICATION）を行うためのプロトコルを提供します。
              A2A通信により、複数のAgentが協調して複雑なタスクを実行できます。
            </p>
          </div>
          <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>プレゼンテーション層 → オーケストレーション層:</strong> ユーザーの質問（query）を渡す、またはタスク実行リクエストを渡す</li>
            <li><strong>オーケストレーション層 → プロバイダー層:</strong> 並列で各プロバイダーに検索リクエストを送信</li>
            <li><strong>オーケストレーション層 → AI Agent層:</strong> タスクをAgentに配分し、実行計画を作成</li>
            <li><strong>プロバイダー層 → データ層:</strong> ChromaDBでベクトル検索、SQLiteで詳細情報取得</li>
            <li><strong>プロバイダー層 → MCP層:</strong> MCPプロバイダーがMCPクライアント経由でToolを実行</li>
            <li><strong>AI Agent層 → MCP層:</strong> AgentがMCPクライアント経由でToolを実行</li>
            <li><strong>AI Agent層（A2A通信層）:</strong> Agent間でA2A通信（確認・指示・通知）を実行。A2AManagerがメッセージの送受信を管理</li>
            <li><strong>MCP層:</strong> MCPクライアントがMCPサーバー（将来実装）またはローカルToolレジストリからToolを実行</li>
            <li><strong>データ層 → オーケストレーション層:</strong> InformationItem[]として情報を返す</li>
            <li><strong>MCP層 → オーケストレーション層:</strong> Tool実行結果をInformationItem[]として返す</li>
            <li><strong>AI Agent層 → オーケストレーション層:</strong> タスク実行結果を返す</li>
            <li><strong>オーケストレーション層 → LLM層:</strong> 統合されたRAGコンテキスト文字列を渡す</li>
            <li><strong>LLM層 → MCP層:</strong> Tool呼び出しがある場合、MCPクライアント経由でToolを実行</li>
            <li><strong>LLM層 → プレゼンテーション層:</strong> 最終回答を返す</li>
          </ol>
        </div>
      </CollapsibleSection>
  );
}

