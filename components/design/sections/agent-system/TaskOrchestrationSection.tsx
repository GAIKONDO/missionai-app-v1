'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * タスクオーケストレーションセクション
 */
export function TaskOrchestrationSection() {
  return (
    <CollapsibleSection 
      title="タスクオーケストレーション" 
      defaultExpanded={false}
      id="task-orchestration-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>タスク実行の流れ</h4>
        
        <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>1. タスク受付</h5>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li>AgentOrchestratorがタスクを受付</li>
          <li>タスクの検証（必須パラメータ、依存関係の存在確認）</li>
        </ul>

        <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>2. 実行計画の作成</h5>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li>TaskPlannerがタスクの依存関係を解析</li>
          <li>トポロジカルソートで実行順序を決定</li>
          <li>並列実行可能なタスクを特定</li>
          <li>リソース制約を考慮</li>
        </ul>

        <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>3. Agentへの配分</h5>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li>タスクタイプに応じて適切なAgentを選択</li>
          <li>Agentの能力（capabilities）と負荷を考慮</li>
          <li>タスクをAgentに配分</li>
        </ul>

        <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>4. 実行監視</h5>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li>各タスクの実行状態を監視</li>
          <li>エラー発生時のリトライ処理</li>
          <li>タイムアウトの検出と処理</li>
        </ul>

        <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>5. 結果統合</h5>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li>各Agentからの実行結果を収集</li>
          <li>結果を統合して最終結果を生成</li>
          <li>実行履歴をデータベースに保存</li>
        </ul>
      </div>

      <ZoomableMermaidDiagram
        diagramId="task-orchestration-diagram"
        mermaidCode={`flowchart TD
    A[タスク受付] --> B[タスク検証]
    B --> C[TaskPlanner<br/>実行計画作成]
    C --> D[依存関係解析]
    D --> E[実行順序決定<br/>トポロジカルソート]
    E --> F[並列実行可能タスク特定]
    F --> G[Agent配分]
    
    G --> H1[SearchAgent]
    G --> H2[AnalysisAgent]
    G --> H3[GenerationAgent]
    
    H1 --> I1[タスク実行]
    H2 --> I2[タスク実行]
    H3 --> I3[タスク実行]
    
    I1 --> J[実行状態監視]
    I2 --> J
    I3 --> J
    
    J --> K{エラー?}
    K -->|Yes| L[リトライ処理]
    L --> I1
    K -->|No| M[結果統合]
    
    M --> N[最終結果]
    N --> O[実行履歴保存]
    
    style A fill:#e1f5ff
    style C fill:#fff4e1
    style G fill:#e0f2f1
    style J fill:#fff9c4
    style M fill:#e8f5e9
    style O fill:#f3e5f5`}
      />
    </CollapsibleSection>
  );
}

