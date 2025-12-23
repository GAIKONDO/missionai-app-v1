'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * レイヤー構造の概要セクション
 */
export function LayerStructureOverviewSection() {
  return (
    <CollapsibleSection 
      title="レイヤー構造の概要" 
      defaultExpanded={false}
      id="layer-structure-overview-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px' }}>
          システムは以下のレイヤーで構成されています。各レイヤーは明確な役割を持ち、相互に連携して動作します。
        </p>
        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, border: '1px solid var(--color-border-color)', width: '60px' }}>項番</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, border: '1px solid var(--color-border-color)' }}>レイヤー名</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, border: '1px solid var(--color-border-color)' }}>役割</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, border: '1px solid var(--color-border-color)' }}>主要コンポーネント</th>
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
              <tr style={{ borderBottom: '1px solid var(--color-border-color)', backgroundColor: '#F9FAFB' }}>
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
              <tr style={{ borderBottom: '1px solid var(--color-border-color)', backgroundColor: '#F9FAFB' }}>
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
              <tr style={{ borderBottom: '1px solid var(--color-border-color)', backgroundColor: '#F9FAFB' }}>
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
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
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

