'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * データの流れ（詳細）セクション
 */
export function DataFlowDetailsSection() {
  return (
    <CollapsibleSection 
      title="データの流れ（詳細）" 
      defaultExpanded={false}
      id="data-flow-details-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>各レイヤー間で渡されるデータ</h4>
        
          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>1. ユーザー → RAGオーケストレーター</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>入力:</strong> <code>{'{'}query: string, limit: number, filters: {'{'}organizationId?, includeDesignDocs?, designDocSectionId?{'}'}{'}'}</code></li>
              <li><strong>出力:</strong> RAGコンテキスト文字列（Markdown形式、情報源ごとにセクション分け）</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>2. RAGオーケストレーター → LLM</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>システムプロンプト:</strong> RAGコンテキスト + Tool一覧 + 指示を含む文字列</li>
              <li><strong>会話履歴:</strong> 過去のメッセージ配列（role: 'user' | 'assistant', content: string）</li>
              <li><strong>ユーザーメッセージ:</strong> 現在の質問テキスト</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>3. LLM → Toolパーサー</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>入力:</strong> LLMのレスポンステキスト（Tool呼び出し形式を含む可能性）</li>
              <li><strong>検出形式:</strong> &lt;tool_call name="tool_name"&gt;{'{}'}{'...'}{'{}'}&lt;/tool_call&gt;</li>
              <li><strong>出力:</strong> ParsedToolCall[]（tool, arguments, rawCall）</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>4. Tool実行器 → LLM（再問い合わせ）</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>入力:</strong> Tool実行結果（フォーマット済み文字列）</li>
              <li><strong>メッセージ:</strong> 前回の会話履歴 + Tool実行結果 + 「結果を確認して回答してください」という指示</li>
              <li><strong>出力:</strong> Tool実行結果を基にした最終回答</li>
            </ul>
          </div>
        </div>
      </CollapsibleSection>
  );
}

