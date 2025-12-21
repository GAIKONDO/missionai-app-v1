/**
 * GenerationAgent詳細コンポーネント
 */

'use client';

import React from 'react';
import type { Agent } from '@/lib/agent-system/types';
import { ZoomableMermaidDiagram } from '@/components/design/common/ZoomableMermaidDiagram';
import { AgentModelEditor } from './AgentModelEditor';
import { AgentSystemPromptEditor } from './AgentSystemPromptEditor';
import { AgentConfigEditor } from './AgentConfigEditor';

interface GenerationAgentDetailProps {
  agent: Agent;
  onUpdate?: (updatedAgent: Agent) => void;
}

export function GenerationAgentDetail({ agent, onUpdate }: GenerationAgentDetailProps) {
  const codeSnippet = `export class GenerationAgent extends BaseAgent {
  async executeTask(task: Task, context: TaskExecutionContext): Promise<any> {
    const prompt = task.parameters.prompt || 
                   task.parameters.instruction || 
                   task.parameters.content;
    const maxLength = task.parameters.maxLength || 500;
    const style = task.parameters.style || 'standard';

    // 生成を実行
    const generated = await generateContent(prompt, {
      maxLength,
      style,
    });

    return {
      prompt,
      generated,
      style,
      length: generated.length,
    };
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
    participant GA as GenerationAgent
    participant LLM as LLM API
    participant Log as ログ

    Task->>GA: executeTask(task, context)
    GA->>GA: パラメータ取得<br/>(prompt/instruction/content, maxLength, style)
    GA->>Log: 生成開始ログ
    GA->>LLM: generateContent(prompt, {maxLength, style})
    LLM->>LLM: コンテンツ生成
    LLM-->>GA: generated
    GA->>Log: 生成完了ログ
    GA-->>Task: {prompt, generated, style, length}
    alt エラー発生
        GA->>Log: エラーログ
        GA-->>Task: 例外をスロー
    end`}
            diagramId="generation-agent-flow"
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

    subgraph GenerationAgent["GenerationAgent"]
        direction TB
        GA1[executeTask]
        GA2[handleMessage]
    end

    subgraph LLM["LLM API"]
        direction TB
        LLM1[GPT-4]
        LLM2[GPT-3.5]
        LLM3[Local Model]
    end

    subgraph Generator["生成エンジン"]
        direction TB
        GEN1[プロンプト処理]
        GEN2[コンテンツ生成]
        GEN3[後処理]
    end

    BaseAgent -->|継承| GenerationAgent
    GenerationAgent -->|使用| Generator
    Generator -->|呼び出し| LLM
    GA1 -->|呼び出し| GEN1
    GEN1 -->|呼び出し| GEN2
    GEN2 -->|使用| LLM1
    GEN2 -->|使用| LLM2
    GEN2 -->|使用| LLM3
    GEN2 -->|呼び出し| GEN3`}
            diagramId="generation-agent-architecture"
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

