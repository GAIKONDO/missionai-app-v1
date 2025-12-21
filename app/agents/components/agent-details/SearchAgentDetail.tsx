/**
 * SearchAgent詳細コンポーネント
 */

'use client';

import React from 'react';
import type { Agent } from '@/lib/agent-system/types';
import { ZoomableMermaidDiagram } from '@/components/design/common/ZoomableMermaidDiagram';
import { AgentModelEditor } from './AgentModelEditor';
import { AgentSystemPromptEditor } from './AgentSystemPromptEditor';
import { AgentConfigEditor } from './AgentConfigEditor';

interface SearchAgentDetailProps {
  agent: Agent;
  onUpdate?: (updatedAgent: Agent) => void;
}

export function SearchAgentDetail({ agent, onUpdate }: SearchAgentDetailProps) {
  const codeSnippet = `export class SearchAgent extends BaseAgent {
  async executeTask(task: Task, context: TaskExecutionContext): Promise<any> {
    const query = task.parameters.query || task.parameters.searchQuery;
    const limit = task.parameters.limit || 10;
    const organizationId = task.parameters.organizationId;

    // ナレッジグラフ検索を実行
    const searchResults = await searchKnowledgeGraph(
      query,
      limit,
      organizationId ? { organizationId } : undefined
    );

    // 検索結果からコンテキストを生成
    const result = await getKnowledgeGraphContextWithResults(
      query,
      limit,
      organizationId ? { organizationId } : undefined,
      2000
    );

    return {
      query,
      results: searchResults,
      context: result.context,
      sources: result.sources,
      count: searchResults.length,
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
        <div style={{ marginTop: '12px' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>利用可能なツール:</span>
          <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {agent.tools.length > 0 ? (
              agent.tools.map((tool) => (
                <span
                  key={tool}
                  style={{
                    padding: '4px 8px',
                    background: 'var(--color-primary)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: 'white',
                  }}
                >
                  {tool}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>なし</span>
            )}
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
    participant SA as SearchAgent
    participant KG as ナレッジグラフ
    participant RAG as RAG検索
    participant Log as ログ

    Task->>SA: executeTask(task, context)
    SA->>SA: パラメータ取得<br/>(query, limit, organizationId)
    SA->>Log: 検索開始ログ
    SA->>RAG: searchKnowledgeGraph(query, limit, orgId)
    RAG->>KG: ベクトル検索実行
    KG-->>RAG: 検索結果
    RAG-->>SA: searchResults
    SA->>RAG: getKnowledgeGraphContextWithResults(query, limit, orgId, 2000)
    RAG->>KG: コンテキスト生成
    KG-->>RAG: context + sources
    RAG-->>SA: context + sources
    SA->>Log: 検索結果ログ
    SA-->>Task: {query, results, context, sources, count}
    alt エラー発生
        SA->>Log: エラーログ
        SA-->>Task: 例外をスロー
    end`}
            diagramId="search-agent-flow"
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

    subgraph SearchAgent["SearchAgent"]
        direction TB
        SA1[executeTask]
        SA2[handleMessage]
    end

    subgraph RAG["RAG検索モジュール"]
        direction TB
        RAG1[searchKnowledgeGraph]
        RAG2[getKnowledgeGraphContextWithResults]
    end

    subgraph ChromaDB["ChromaDB"]
        direction TB
        CDB1[ベクトル検索]
        CDB2[コンテキスト取得]
    end

    BaseAgent -->|継承| SearchAgent
    SearchAgent -->|使用| RAG
    RAG -->|アクセス| ChromaDB
    SA1 -->|呼び出し| RAG1
    SA1 -->|呼び出し| RAG2
    RAG1 -->|実行| CDB1
    RAG2 -->|実行| CDB2`}
            diagramId="search-agent-architecture"
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

