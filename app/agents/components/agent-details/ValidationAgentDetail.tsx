/**
 * ValidationAgent詳細コンポーネント
 */

'use client';

import React from 'react';
import type { Agent } from '@/lib/agent-system/types';
import { ZoomableMermaidDiagram } from '@/components/design/common/ZoomableMermaidDiagram';
import { AgentModelEditor } from './AgentModelEditor';
import { AgentSystemPromptEditor } from './AgentSystemPromptEditor';
import { AgentConfigEditor } from './AgentConfigEditor';

interface ValidationAgentDetailProps {
  agent: Agent;
  onUpdate?: (updatedAgent: Agent) => void;
}

export function ValidationAgentDetail({ agent, onUpdate }: ValidationAgentDetailProps) {
  const codeSnippet = `export class ValidationAgent extends BaseAgent {
  async executeTask(task: Task, context: TaskExecutionContext): Promise<any> {
    const target = task.parameters.target || task.parameters.data;
    const validationRules = task.parameters.validationRules || [];
    const strict = task.parameters.strict !== false;

    // 検証を実行
    const validationResult = {
      target,
      valid: true,
      errors: [],
      warnings: [],
      checks: [
        { name: '整合性チェック', passed: true },
        { name: '品質チェック', passed: true },
        { name: '正確性チェック', passed: true },
      ],
      message: '検証が完了しました。',
    };

    return validationResult;
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

      {/* Agent設定 */}
      <section>
        {onUpdate ? (
          <AgentConfigEditor agent={agent} onUpdate={onUpdate} />
        ) : null}
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
    participant VA as ValidationAgent
    participant Validator as 検証エンジン
    participant Log as ログ

    Task->>VA: executeTask(task, context)
    VA->>VA: パラメータ取得<br/>(target/data, validationRules, strict)
    VA->>Log: 検証開始ログ
    VA->>Validator: 整合性チェック
    Validator-->>VA: 整合性結果
    VA->>Validator: 品質チェック
    Validator-->>VA: 品質結果
    VA->>Validator: 正確性チェック
    Validator-->>VA: 正確性結果
    VA->>VA: 結果を集約<br/>(valid, errors, warnings, checks)
    VA->>Log: 検証完了ログ
    VA-->>Task: 検証結果
    alt エラー発生
        VA->>Log: エラーログ
        VA-->>Task: 例外をスロー
    end`}
            diagramId="validation-agent-flow"
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

    subgraph ValidationAgent["ValidationAgent"]
        direction TB
        VA1[executeTask]
        VA2[handleMessage]
    end

    subgraph Validator["検証エンジン"]
        direction TB
        VAL1[整合性チェック]
        VAL2[品質チェック]
        VAL3[正確性チェック]
        VAL4[ルール検証]
    end

    subgraph Rules["検証ルール"]
        direction TB
        R1[カスタムルール]
        R2[デフォルトルール]
    end

    BaseAgent -->|継承| ValidationAgent
    ValidationAgent -->|使用| Validator
    Validator -->|参照| Rules
    VA1 -->|呼び出し| VAL1
    VA1 -->|呼び出し| VAL2
    VA1 -->|呼び出し| VAL3
    VA1 -->|呼び出し| VAL4
    VAL4 -->|使用| R1
    VAL4 -->|使用| R2`}
            diagramId="validation-agent-architecture"
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

