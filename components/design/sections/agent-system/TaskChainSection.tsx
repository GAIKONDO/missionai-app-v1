'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * タスクチェーン機能セクション
 */
export function TaskChainSection() {
  return (
    <CollapsibleSection 
      title="タスクチェーン機能" 
      defaultExpanded={false}
      id="task-chain-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>タスクチェーンとは</h4>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px' }}>
          タスクチェーンは、複数のタスクを連鎖的に実行する機能です。
          条件分岐やループ処理に対応し、複雑なワークフローを実現できます。
        </p>

        <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>ノードタイプ</h5>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>開始ノード:</strong> チェーンの開始点</li>
          <li><strong>タスクノード:</strong> 実行するタスク</li>
          <li><strong>条件ノード:</strong> 条件分岐（真/偽の分岐）</li>
          <li><strong>ループノード:</strong> ループ処理（回数指定または条件指定）</li>
          <li><strong>終了ノード:</strong> チェーンの終了点</li>
        </ul>

        <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>条件分岐</h5>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>条件タイプ:</strong> equals, not_equals, greater_than, less_than, contains, exists</li>
          <li><strong>フィールドパス:</strong> 前のノードの実行結果から値を取得（例: result.status）</li>
          <li><strong>比較値:</strong> 比較する値</li>
          <li><strong>分岐:</strong> 条件が真の場合はtrueBranch、偽の場合はfalseBranchに進む</li>
        </ul>

        <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>ループ処理</h5>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>回数指定:</strong> 指定回数だけループ内タスクを実行</li>
          <li><strong>条件指定:</strong> 条件が満たされるまでループ内タスクを実行</li>
          <li><strong>注意:</strong> 無限ループを防ぐための適切な終了条件が必要</li>
        </ul>
      </div>

      <ZoomableMermaidDiagram
        diagramId="task-chain-diagram"
        mermaidCode={`flowchart TD
    Start[開始ノード] --> Task1[タスク1<br/>検索]
    Task1 --> Condition{条件分岐<br/>result.count > 10?}
    
    Condition -->|真| Task2[タスク2<br/>分析]
    Condition -->|偽| Task3[タスク3<br/>再検索]
    
    Task2 --> Loop[ループノード<br/>5回繰り返し]
    Task3 --> End[終了ノード]
    
    Loop --> Task4[タスク4<br/>ループ内タスク]
    Task4 --> Loop
    
    Loop -->|5回完了| End
    
    style Start fill:#4caf50,color:#fff
    style Task1 fill:#2196f3,color:#fff
    style Task2 fill:#2196f3,color:#fff
    style Task3 fill:#2196f3,color:#fff
    style Task4 fill:#2196f3,color:#fff
    style Condition fill:#ffc107,color:#000
    style Loop fill:#9c27b0,color:#fff
    style End fill:#f44336,color:#fff`}
      />
    </CollapsibleSection>
  );
}

