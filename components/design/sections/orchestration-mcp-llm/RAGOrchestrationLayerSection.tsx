'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * RAGオーケストレーションレイヤーセクション
 */
export function RAGOrchestrationLayerSection() {
  return (
    <CollapsibleSection 
      title="RAGオーケストレーションレイヤー" 
      defaultExpanded={false}
      id="orchestration-layer-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>役割</h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px' }}>
            RAGオーケストレーションレイヤーは、複数の情報源（ナレッジグラフ、システム設計ドキュメント、MCP）から情報を取得し、
            統合、重複排除、優先順位付けを行って、LLMに渡す最適なコンテキストを生成します。
          </p>

          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>処理フロー</h5>
          <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>並列情報取得:</strong> 3つのプロバイダー（ナレッジグラフ、設計ドキュメント、MCP）から並列で情報を取得</li>
            <li><strong>重み付け:</strong> 各情報源に重みを適用（ナレッジグラフ: 0.5、設計ドキュメント: 0.3、MCP: 0.15）</li>
            <li><strong>重複排除:</strong> コンテンツのハッシュを比較して重複を排除（スコアが高い方を優先）</li>
            <li><strong>スコアリング:</strong> 各情報アイテムのスコア（0.0-1.0）を計算し、最小関連度スコア（0.05）でフィルタリング</li>
            <li><strong>トークン数制限:</strong> 最大トークン数（4000）内で情報を選択</li>
            <li><strong>コンテキスト生成:</strong> 情報源ごとにグループ化してコンテキスト文字列を生成</li>
          </ol>

          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>情報アイテム（InformationItem）</h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>id:</strong> 情報アイテムの一意ID</li>
            <li><strong>source:</strong> 情報源（'knowledgeGraph' | 'designDocs' | 'mcp' | 'other'）</li>
            <li><strong>content:</strong> 情報の内容（Markdown形式）</li>
            <li><strong>score:</strong> 関連度スコア（0.0-1.0）</li>
            <li><strong>metadata:</strong> タイトル、タイプ、タイムスタンプなどの追加情報</li>
          </ul>
        </div>
    </CollapsibleSection>
  );
}

