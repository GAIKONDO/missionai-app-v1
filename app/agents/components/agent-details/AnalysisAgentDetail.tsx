/**
 * AnalysisAgent詳細コンポーネント
 */

'use client';

import React from 'react';
import type { Agent } from '@/lib/agent-system/types';
import { ZoomableMermaidDiagram } from '@/components/design/common/ZoomableMermaidDiagram';
import { AgentModelEditor } from './AgentModelEditor';
import { AgentSystemPromptEditor } from './AgentSystemPromptEditor';
import { AgentConfigEditor } from './AgentConfigEditor';

interface AnalysisAgentDetailProps {
  agent: Agent;
  onUpdate?: (updatedAgent: Agent) => void;
}

export function AnalysisAgentDetail({ agent, onUpdate }: AnalysisAgentDetailProps) {
  const codeSnippet = `export class AnalysisAgent extends BaseAgent {
  async executeTask(task: Task, context: TaskExecutionContext): Promise<any> {
    const data = task.parameters.data || task.parameters.topicId;
    const analysisType = task.parameters.analysisType || 'general';
    const depth = task.parameters.depth || 'standard';

    // 分析を実行
    const analysisResult = {
      data,
      analysisType,
      depth,
      insights: [...],
      recommendations: [...],
      patterns: [...],
      summary: '...',
    };

    return analysisResult;
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
    participant AA as AnalysisAgent
    participant Analyzer as 分析エンジン
    participant Log as ログ

    Task->>AA: executeTask(task, context)
    AA->>AA: パラメータ取得<br/>(data/topicId, analysisType, depth)
    AA->>Log: 分析開始ログ
    AA->>Analyzer: データ分析実行
    Analyzer->>Analyzer: パターン検出
    Analyzer->>Analyzer: 洞察抽出
    Analyzer->>Analyzer: 推奨事項生成
    Analyzer-->>AA: {insights, recommendations, patterns, summary}
    AA->>Log: 分析完了ログ
    AA-->>Task: 分析結果
    alt エラー発生
        AA->>Log: エラーログ
        AA-->>Task: 例外をスロー
    end`}
            diagramId="analysis-agent-flow"
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

    subgraph AnalysisAgent["AnalysisAgent"]
        direction TB
        AA1[executeTask]
        AA2[handleMessage]
    end

    subgraph Analyzer["分析エンジン"]
        direction TB
        AN1[パターン検出]
        AN2[洞察抽出]
        AN3[推奨事項生成]
        AN4[要約生成]
    end

    subgraph LLM["LLM"]
        direction TB
        LLM1[GPT API]
    end

    BaseAgent -->|継承| AnalysisAgent
    AnalysisAgent -->|使用| Analyzer
    Analyzer -->|必要に応じて| LLM
    AA1 -->|呼び出し| AN1
    AA1 -->|呼び出し| AN2
    AA1 -->|呼び出し| AN3
    AA1 -->|呼び出し| AN4`}
            diagramId="analysis-agent-architecture"
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

