'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * Agentシステム概要セクション
 */
export function AgentSystemOverviewSection() {
  return (
    <CollapsibleSection 
      title="Agentシステム概要" 
      defaultExpanded={false}
      id="agent-system-overview-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>Agentシステムとは</h4>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px' }}>
          Agentシステムは、複数のAI Agentが協調してタスクを自動実行するマルチエージェントシステムです。
          各Agentは特定の役割を持ち、A2A（Agent-to-Agent）通信プロトコルを通じて協調動作を行います。
        </p>

        <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>主要機能</h5>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>タスク管理:</strong> 様々なタスクを登録し、Agentが自動実行</li>
          <li><strong>マルチエージェント協調:</strong> 複数のAgentが協調して複雑なタスクを実行</li>
          <li><strong>Agent間通信:</strong> A2Aプロトコルによる確認、指示、通知</li>
          <li><strong>タスクオーケストレーション:</strong> タスクの依存関係を解決し、最適な実行順序を決定</li>
          <li><strong>タスクチェーン:</strong> 複数タスクの連鎖実行、条件分岐、ループ処理</li>
          <li><strong>実行履歴と監視:</strong> タスク実行履歴の記録と監視機能</li>
        </ul>
      </div>
    </CollapsibleSection>
  );
}

