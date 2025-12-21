'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * データ構造セクション
 */
export function AgentDataStructuresSection() {
  return (
    <CollapsibleSection 
      title="データ構造" 
      defaultExpanded={false}
      id="agent-data-structures-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>主要なデータ構造</h4>
        
        <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>Task（タスク）</h5>
        <pre style={{ 
          padding: '12px', 
          backgroundColor: 'var(--color-surface)', 
          borderRadius: '6px', 
          fontSize: '12px',
          overflow: 'auto',
          border: '1px solid var(--color-border-color)',
          marginBottom: '16px'
        }}>
{`{
  id: string;                    // タスクID
  name: string;                  // タスク名
  description: string;           // タスクの説明
  type: TaskType;                // タスクタイプ
  agentId?: string;              // 実行Agent（指定時）
  requiredAgents?: string[];     // 必要なAgentリスト
  dependencies?: string[];       // 依存タスクIDリスト
  parameters: Record<string, any>; // タスクパラメータ
  priority: number;              // 優先度（1-10）
  timeout?: number;              // タイムアウト（ミリ秒）
  retryCount?: number;           // リトライ回数
  createdAt: number;             // 作成日時
  updatedAt: number;             // 更新日時
}`}
        </pre>

        <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>Agent（エージェント）</h5>
        <pre style={{ 
          padding: '12px', 
          backgroundColor: 'var(--color-surface)', 
          borderRadius: '6px', 
          fontSize: '12px',
          overflow: 'auto',
          border: '1px solid var(--color-border-color)',
          marginBottom: '16px'
        }}>
{`{
  id: string;                    // Agent ID
  name: string;                  // Agent名
  description: string;           // Agentの説明
  role: AgentRole;               // Agentの役割
  capabilities: TaskType[];      // 対応可能なタスクタイプ
  tools: string[];               // 使用可能なTool
  modelType: string;             // 使用するLLMモデル
  systemPrompt: string;          // システムプロンプト
  config: AgentConfig;           // Agent設定
  createdAt: number;             // 作成日時
  updatedAt: number;             // 更新日時
}`}
        </pre>

        <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>TaskChain（タスクチェーン）</h5>
        <pre style={{ 
          padding: '12px', 
          backgroundColor: 'var(--color-surface)', 
          borderRadius: '6px', 
          fontSize: '12px',
          overflow: 'auto',
          border: '1px solid var(--color-border-color)',
          marginBottom: '16px'
        }}>
{`{
  id: string;                    // チェーンID
  name: string;                  // チェーン名
  description: string;           // チェーンの説明
  startNodeId: string;           // 開始ノードID
  nodes: Map<string, ChainNode>; // ノードマップ
  createdAt: number;             // 作成日時
  updatedAt: number;             // 更新日時
}`}
        </pre>
      </div>
    </CollapsibleSection>
  );
}

