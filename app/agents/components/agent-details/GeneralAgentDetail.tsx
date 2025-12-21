/**
 * GeneralAgent詳細コンポーネント
 */

'use client';

import React from 'react';
import type { Agent } from '@/lib/agent-system/types';
import { ZoomableMermaidDiagram } from '@/components/design/common/ZoomableMermaidDiagram';
import { AgentModelEditor } from './AgentModelEditor';
import { AgentSystemPromptEditor } from './AgentSystemPromptEditor';
import { AgentConfigEditor } from './AgentConfigEditor';

interface GeneralAgentDetailProps {
  agent: Agent;
  onUpdate?: (updatedAgent: Agent) => void;
}

export function GeneralAgentDetail({ agent, onUpdate }: GeneralAgentDetailProps) {
  const codeSnippet = `export class GeneralAgent extends BaseAgent {
  async executeTask(task: Task, context: TaskExecutionContext): Promise<any> {
    switch (task.type) {
      case TaskType.SEARCH:
        return await this.executeSearchTask(task, context, execution);
      case TaskType.ANALYSIS:
        return await this.executeAnalysisTask(task, context, execution);
      case TaskType.GENERATION:
        return await this.executeGenerationTask(task, context, execution);
      case TaskType.VALIDATION:
        return await this.executeValidationTask(task, context, execution);
      case TaskType.COORDINATION:
        return await this.executeCoordinationTask(task, context, execution);
    }
  }
}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 基本情報 */}
      <section>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-color)',
          }}
        >
          基本情報
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            fontSize: '14px',
          }}
        >
          <div>
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>ID:</span>
            <span style={{ marginLeft: '8px', color: 'var(--color-text)' }}>{agent.id}</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>役割:</span>
            <span style={{ marginLeft: '8px', color: 'var(--color-text)' }}>{agent.role}</span>
          </div>
          {onUpdate ? (
            <div>
              <AgentModelEditor agent={agent} onUpdate={onUpdate} />
            </div>
          ) : (
            <div>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>モデル:</span>
              <span style={{ marginLeft: '8px', color: 'var(--color-text)' }}>{agent.modelType}</span>
            </div>
          )}
        </div>
        <div style={{ marginTop: '12px' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>説明:</span>
          <p style={{ marginTop: '4px', color: 'var(--color-text)', lineHeight: '1.6' }}>
            {agent.description}
          </p>
        </div>
        <div style={{ marginTop: '12px' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>能力:</span>
          <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {agent.capabilities.map((cap) => (
              <span
                key={cap}
                style={{
                  padding: '4px 8px',
                  background: 'var(--color-surface)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: 'var(--color-text)',
                }}
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* システムプロンプト */}
      <section>
        {onUpdate ? (
          <AgentSystemPromptEditor agent={agent} onUpdate={onUpdate} />
        ) : (
          <>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--color-border-color)',
              }}
            >
              システムプロンプト
            </h3>
            <pre
              style={{
                padding: '16px',
                background: 'var(--color-surface)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--color-text)',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                border: '1px solid var(--color-border-color)',
              }}
            >
              {agent.systemPrompt}
            </pre>
          </>
        )}
      </section>

      {/* アクションフロー */}
      <section>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-color)',
          }}
        >
          アクションフロー
        </h3>
        <div
          style={{
            padding: '16px',
            background: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border-color)',
          }}
        >
          <ZoomableMermaidDiagram
            mermaidCode={`sequenceDiagram
    participant Task as タスク
    participant GA as GeneralAgent
    participant Exec as 実行メソッド
    participant Log as ログ

    Task->>GA: executeTask(task, context)
    GA->>GA: タスクタイプを判定
    alt SEARCH
        GA->>Exec: executeSearchTask()
    else ANALYSIS
        GA->>Exec: executeAnalysisTask()
    else GENERATION
        GA->>Exec: executeGenerationTask()
    else VALIDATION
        GA->>Exec: executeValidationTask()
    else COORDINATION
        GA->>Exec: executeCoordinationTask()
    end
    Exec->>Log: 実行ログを記録
    Exec-->>GA: 結果を返す
    GA-->>Task: タスク実行結果
    alt エラー発生
        Exec->>Log: エラーログを記録
        Exec-->>GA: 例外をスロー
        GA-->>Task: エラー
    end`}
            diagramId="general-agent-flow"
          />
        </div>
      </section>

      {/* アーキテクチャ */}
      <section>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-color)',
          }}
        >
          アーキテクチャ
        </h3>
        <div
          style={{
            padding: '16px',
            background: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border-color)',
          }}
        >
          <ZoomableMermaidDiagram
            mermaidCode={`flowchart TB
    subgraph BaseAgent["BaseAgent (基底クラス)"]
        direction TB
        BA1[getAgent]
        BA2[canExecuteTask]
        BA3[addLog]
    end

    subgraph GeneralAgent["GeneralAgent"]
        direction TB
        GA1[executeTask]
        GA2[handleMessage]
        GA3[executeSearchTask]
        GA4[executeAnalysisTask]
        GA5[executeGenerationTask]
        GA6[executeValidationTask]
        GA7[executeCoordinationTask]
    end

    subgraph A2AManager["A2AManager"]
        direction TB
        A2A1[registerAgent]
        A2A2[sendMessage]
    end

    subgraph AgentRegistry["AgentRegistry"]
        direction TB
        AR1[register]
        AR2[get]
    end

    BaseAgent -->|継承| GeneralAgent
    GeneralAgent -->|使用| A2AManager
    AgentRegistry -->|管理| GeneralAgent
    GeneralAgent -->|実装| GA1
    GA1 -->|分岐| GA3
    GA1 -->|分岐| GA4
    GA1 -->|分岐| GA5
    GA1 -->|分岐| GA6
    GA1 -->|分岐| GA7`}
            diagramId="general-agent-architecture"
          />
        </div>
      </section>

      {/* コード */}
      <section>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-color)',
          }}
        >
          主要コード
        </h3>
        <pre
          style={{
            padding: '16px',
            background: 'var(--color-surface)',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--color-text)',
            overflow: 'auto',
            border: '1px solid var(--color-border-color)',
            fontFamily: 'monospace',
          }}
        >
          <code>{codeSnippet}</code>
        </pre>
      </section>

    </div>
  );
}

