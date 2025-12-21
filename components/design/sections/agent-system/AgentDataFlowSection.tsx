'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * データフローセクション
 */
export function AgentDataFlowSection() {
  return (
    <CollapsibleSection 
      title="データフロー" 
      defaultExpanded={false}
      id="agent-data-flow-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>Agentシステムのデータフロー</h4>
        
        <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>プレゼンテーション層 → オーケストレーション層:</strong> タスク実行リクエストを送信</li>
          <li><strong>オーケストレーション層:</strong> TaskPlannerが実行計画を作成（依存関係解析、実行順序決定）</li>
          <li><strong>オーケストレーション層 → Agent層:</strong> タスクを適切なAgentに配分</li>
          <li><strong>Agent層:</strong> Agentがタスクを実行（必要に応じてToolを呼び出し）</li>
          <li><strong>Agent層（A2A通信層）:</strong> Agent間でメッセージを送受信（確認・指示・通知）</li>
          <li><strong>Agent層 → MCP層:</strong> AgentがMCPクライアント経由でToolを実行</li>
          <li><strong>Agent層 → データ層:</strong> 実行結果をSQLiteに保存</li>
          <li><strong>Agent層 → オーケストレーション層:</strong> タスク実行結果を返す</li>
          <li><strong>オーケストレーション層:</strong> 結果を統合して最終結果を生成</li>
          <li><strong>オーケストレーション層 → プレゼンテーション層:</strong> 実行結果を返す</li>
        </ol>
      </div>
    </CollapsibleSection>
  );
}

