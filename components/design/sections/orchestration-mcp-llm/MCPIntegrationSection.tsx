'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * MCPサーバーとの連携セクション
 */
export function MCPIntegrationSection() {
  return (
    <CollapsibleSection 
      title="MCPサーバーとの連携" 
      defaultExpanded={false}
      id="mcp-integration-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>MCPプロバイダーの動作</h4>
        
          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>1. MCPクライアントの接続確認</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>接続状態:</strong> MCPClient.isConnected()で接続状態を確認</li>
              <li><strong>未接続時:</strong> 空配列を返す（エラーにはしない）</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>2. Tool呼び出し</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>Tool名:</strong> 'search_knowledge_graph'</li>
              <li><strong>引数:</strong> <code>{'{'}query: 検索クエリ, limit: 結果数, organizationId: 組織ID（オプション）{'}'}</code></li>
              <li><strong>実行:</strong> executeTool()関数でローカルToolレジストリから実行（現在はMCPサーバー経由ではなくローカル実行）</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>3. 結果の変換</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>入力:</strong> Tool実行結果（context: 文字列, sources: ソース情報配列）</li>
              <li><strong>処理:</strong> コンテキストをセクションごとに分割し、InformationItemに変換</li>
              <li><strong>出力:</strong> InformationItem[]（source: 'mcp', score: ソースのスコア）</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>将来の実装</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li>MCPサーバーへのHTTP接続（現在はローカルTool実行）</li>
              <li>MCPサーバーからのTool一覧取得</li>
              <li>MCPサーバー経由でのTool実行</li>
            </ul>
          </div>
        </div>
    </CollapsibleSection>
  );
}

