'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * データの流れセクション
 */
export function RAGDataFlowSection() {
  return (
    <CollapsibleSection 
      title="データの流れ" 
      defaultExpanded={false}
      id="rag-data-flow-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>各ステップで渡されるデータ</h4>
        
        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>1. クエリ → 埋め込みAPI</h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>入力:</strong> クエリテキスト（例: "伊藤忠商事のプロジェクト"）</li>
            <li><strong>出力:</strong> 1536次元の浮動小数点配列（例: [0.123, -0.456, ...]）</li>
            <li><strong>API:</strong> OpenAI Embeddings API（text-embedding-3-smallモデル）</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>2. 埋め込みベクトル → ChromaDB</h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>入力:</strong> クエリベクトル（1536次元）、検索数（limit）、組織ID（オプション）</li>
            <li><strong>処理:</strong> コサイン類似度計算（各コレクション内の全ベクトルと比較）</li>
            <li><strong>出力:</strong> 類似度の高い順のIDと類似度スコアの配列</li>
            <li><strong>例:</strong> <code>[{'{'}entityId: "entity_123", similarity: 0.85{'}'}, {'{'}entityId: "entity_456", similarity: 0.72{'}'}]</code></li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>3. ID → SQLite</h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>入力:</strong> エンティティID、リレーションID、トピックIDの配列</li>
            <li><strong>処理:</strong> バッチでIDを指定して詳細情報を取得（N+1問題を回避）</li>
            <li><strong>出力:</strong> エンティティ/リレーション/トピックの完全なオブジェクト</li>
            <li><strong>例:</strong> <code>{'{'}id: "entity_123", name: "伊藤忠商事", type: "組織", metadata: {'{'}...{'}'}{'}'}</code></li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>4. スコアリング</h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>入力:</strong> 類似度スコア、エンティティ/リレーション/トピックの詳細情報、クエリテキスト</li>
            <li><strong>処理:</strong> 類似度を正規化（0.0-1.0）し、メタデータ（タイプ、更新日時など）を考慮してブースト</li>
            <li><strong>出力:</strong> 総合スコア（0.0-1.0）</li>
            <li><strong>計算式:</strong> score = normalizedSimilarity × weight + metadataBoost</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>5. 結果の統合</h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>入力:</strong> エンティティ、リレーション、トピックの検索結果（それぞれスコア付き）</li>
            <li><strong>処理:</strong> 3種類の結果を1つの配列に統合し、スコア順にソート</li>
            <li><strong>出力:</strong> KnowledgeGraphSearchResult[]（type, id, score, entity/relation/topicを含む）</li>
          </ul>
        </div>
      </div>
    </CollapsibleSection>
  );
}

