'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * Agentシステムアーキテクチャセクション
 */
export function AgentSystemArchitectureSection() {
  return (
    <CollapsibleSection 
      title="Agentシステムアーキテクチャ" 
      defaultExpanded={false}
      id="agent-system-architecture-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>レイヤー構造</h4>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px' }}>
          Agentシステムは以下のレイヤーで構成されています。
        </p>
      </div>

      <ZoomableMermaidDiagram
        diagramId="agent-system-architecture-diagram"
        mermaidCode={`flowchart TB
    subgraph Presentation["① プレゼンテーション層"]
        A[ユーザー] --> B1[タスク管理UI]
        A --> B2[Agent管理UI]
        A --> B3[実行監視UI]
        A --> B4[タスクチェーンUI]
    end
    
    subgraph Orchestration["② オーケストレーション層"]
        B1 --> C1[Agentオーケストレーター<br/>AgentOrchestrator]
        B2 --> C1
        B3 --> C1
        B4 --> C2[タスクチェーンマネージャー<br/>TaskChainManager]
        
        C1 --> C3[タスクプランナー<br/>TaskPlanner]
        C3 --> C4[依存関係解析]
        C3 --> C5[実行順序決定]
        C3 --> C6[並列実行可能タスク特定]
        
        C1 --> C7[タスク配分]
        C1 --> C8[実行状態監視]
        C1 --> C9[結果統合]
    end
    
    subgraph Agent["③ Agent層"]
        C7 --> AG1[SearchAgent]
        C7 --> AG2[AnalysisAgent]
        C7 --> AG3[GenerationAgent]
        C7 --> AG4[ValidationAgent]
        C7 --> AG5[GeneralAgent]
        
        subgraph A2A["A2A通信層"]
            AG1 --> A2A1[A2A通信マネージャー<br/>A2AManager]
            AG2 --> A2A1
            AG3 --> A2A1
            AG4 --> A2A1
            AG5 --> A2A1
            
            A2A1 --> A2A2[CONFIRMATION<br/>確認メッセージ]
            A2A1 --> A2A3[REQUEST<br/>指示メッセージ]
            A2A1 --> A2A4[NOTIFICATION<br/>通知メッセージ]
            A2A1 --> A2A5[RESPONSE<br/>応答メッセージ]
        end
        
        AG1 --> MCP1
        AG2 --> MCP1
        AG3 --> MCP1
        AG4 --> MCP1
        AG5 --> MCP1
    end
    
    subgraph MCP["④ MCP層"]
        MCP1[MCPクライアント<br/>MCPClient]
        MCP1 --> MCP2[Tool実行<br/>executeTool]
        MCP2 --> MCP3[Agent Tools<br/>execute_agent_task等]
    end
    
    subgraph Data["⑤ データ層"]
        C1 --> D1[SQLite<br/>タスク定義<br/>実行履歴]
        C2 --> D1
        A2A1 --> D1
        
        D1 --> D2[tasks テーブル]
        D1 --> D3[taskExecutions テーブル]
        D1 --> D4[agents テーブル]
    end
    
    C9 --> B3
    A2A2 --> C1
    A2A3 --> C1
    A2A4 --> C1
    A2A5 --> C1
    
    style Presentation fill:#e1f5ff
    style Orchestration fill:#fff4e1
    style Agent fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    style A2A fill:#b2dfdb,stroke:#004d40,stroke-width:2px
    style MCP fill:#ffeb3b,stroke:#f57f17,stroke-width:2px
    style Data fill:#f3e5f5`}
      />
    </CollapsibleSection>
  );
}

