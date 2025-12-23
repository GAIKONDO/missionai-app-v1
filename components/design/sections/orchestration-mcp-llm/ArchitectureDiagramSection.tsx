'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * アーキテクチャ図セクション
 */
export function ArchitectureDiagramSection() {
  return (
    <CollapsibleSection 
      title="アーキテクチャ図" 
      defaultExpanded={false}
      id="orchestration-architecture-diagram-section"
    >
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
    </CollapsibleSection>
  );
}

