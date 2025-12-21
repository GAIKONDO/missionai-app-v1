'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * LLMとの連携セクション
 */
export function LLMIntegrationSection() {
  return (
    <CollapsibleSection 
      title="LLMとの連携" 
      defaultExpanded={false}
      id="llm-integration-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>LLMへの情報提供</h4>
        
          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>1. システムプロンプトの構築</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>RAGコンテキスト:</strong> オーケストレーターが生成したコンテキスト文字列を「## 利用可能な情報」セクションに挿入</li>
              <li><strong>Tool一覧:</strong> 利用可能なToolの一覧と使用方法を「## 利用可能なTool」セクションに追加</li>
              <li><strong>指示:</strong> 提供された情報を優先的に使用し、出典を明記するよう指示</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>2. LLM API呼び出し</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>OpenAI API:</strong> GPT-4o-mini、GPT-4o、GPT-5など（https://api.openai.com/v1/chat/completions）</li>
              <li><strong>Ollama API:</strong> ローカルモデル（qwen、llama、mistralなど、http://localhost:11434/api/chat）</li>
              <li><strong>メッセージ:</strong> system（システムプロンプト）、user（会話履歴 + ユーザーの質問）</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>3. Tool呼び出しの検出と実行</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>検出:</strong> LLMのレスポンスから&lt;tool_call name="tool_name"&gt;...&lt;/tool_call&gt;形式を抽出（parseToolCalls）</li>
              <li><strong>実行:</strong> 検出されたToolを並列で実行（executeToolCalls）</li>
              <li><strong>結果のフォーマット:</strong> Tool実行結果をAIが理解しやすい形式にフォーマット（formatToolCallResults）</li>
              <li><strong>再問い合わせ:</strong> Tool実行結果をLLMに再送信して、結果を基に回答を生成</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>4. 出典情報の追加</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>RAGソース:</strong> 使用した情報源（ナレッジグラフ、設計ドキュメントなど）を「## 参考情報の出典」セクションに追加</li>
              <li><strong>フォーマット:</strong> formatSources()関数でソース情報を整形</li>
            </ul>
          </div>
        </div>

        <ZoomableMermaidDiagram
          diagramId="llm-integration-diagram"
          mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Frontend<br/>useAIChat
    participant Orchestrator as RAGオーケストレーター
    participant LLM as LLM<br/>GPT-4o-mini/Ollama
    participant ToolParser as Toolパーサー
    participant ToolExecutor as Tool実行器

    User->>Frontend: 質問を入力
    Frontend->>Orchestrator: クエリを渡す
    Orchestrator->>Orchestrator: 複数情報源から情報取得<br/>（並列）
    Orchestrator->>Orchestrator: 重複排除・スコアリング
    Orchestrator-->>Frontend: RAGコンテキスト文字列
    
    Frontend->>Frontend: システムプロンプト構築<br/>（RAGコンテキスト + Tool一覧）
    Frontend->>LLM: メッセージ送信<br/>（system + conversation + user）
    LLM-->>Frontend: レスポンス（Tool呼び出し含む可能性）
    
    Frontend->>ToolParser: Tool呼び出しを検出
    ToolParser-->>Frontend: ParsedToolCall[]
    
    alt Tool呼び出しあり
        Frontend->>ToolExecutor: Toolを実行
        ToolExecutor-->>Frontend: Tool実行結果
        Frontend->>Frontend: 結果をフォーマット
        Frontend->>LLM: Tool実行結果を再送信
        LLM-->>Frontend: 最終回答
    end
    
    Frontend->>Frontend: 出典情報を追加
    Frontend-->>User: 最終回答を表示`}
        />
      </CollapsibleSection>
  );
}

