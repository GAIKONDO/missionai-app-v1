'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * RAG検索のアルゴリズムセクション
 */
export function RAGAlgorithmSection() {
  return (
    <CollapsibleSection 
      title="RAG検索のアルゴリズム" 
      defaultExpanded={false}
      id="rag-algorithm-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>検索プロセス</h4>
        <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>クエリの埋め込み生成:</strong> ユーザーの検索クエリをOpenAI API（text-embedding-3-small）で1536次元のベクトルに変換</li>
          <li><strong>並列ベクトル検索:</strong> ChromaDBでエンティティ、リレーション、トピックの3種類を並列に検索（コサイン類似度計算）</li>
          <li><strong>IDと類似度の取得:</strong> ChromaDBから類似度の高い順にIDと類似度スコアを取得（例: entityId, similarity: 0.85）</li>
          <li><strong>詳細情報の取得:</strong> 取得したIDを使ってSQLiteからエンティティ/リレーション/トピックの詳細情報を取得</li>
          <li><strong>スコアリング:</strong> ベクトル類似度に加えて、メタデータ（タイプ、更新日時など）を考慮した総合スコアを計算</li>
          <li><strong>結果の統合とソート:</strong> 3種類の検索結果を統合し、スコア順にソートして上位N件を返す</li>
        </ol>
      </div>

      <ZoomableMermaidDiagram
        diagramId="rag-algorithm-diagram"
        mermaidCode={`flowchart TD
    A[ユーザークエリ<br/>例: 伊藤忠商事のプロジェクト] --> B[埋め込みAPI<br/>OpenAI text-embedding-3-small]
    B --> C[クエリベクトル<br/>1536次元]
    
    C --> D1[ChromaDB<br/>エンティティ検索]
    C --> D2[ChromaDB<br/>リレーション検索]
    C --> D3[ChromaDB<br/>トピック検索]
    
    D1 --> E1[類似エンティティID + 類似度<br/>例: entity_123, 0.85]
    D2 --> E2[類似リレーションID + 類似度<br/>例: relation_456, 0.78]
    D3 --> E3[類似トピックID + 類似度<br/>例: topic_789, 0.92]
    
    E1 --> F[SQLite<br/>IDで詳細情報取得]
    E2 --> F
    E3 --> F
    
    F --> G[スコアリング<br/>類似度 + メタデータブースト]
    G --> H[結果統合・ソート<br/>スコア順]
    H --> I[上位N件を返す<br/>KnowledgeGraphSearchResult配列]`}
      />
    </CollapsibleSection>
  );
}

