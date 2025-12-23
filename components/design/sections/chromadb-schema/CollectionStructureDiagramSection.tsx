'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * コレクション構造図セクション
 */
export function CollectionStructureDiagramSection() {
  return (
    <CollapsibleSection 
      title="コレクション構造図" 
      defaultExpanded={false}
      id="chromadb-collection-structure-section"
    >
      <ZoomableMermaidDiagram
        diagramId="chromadb-schema-diagram"
        mermaidCode={`graph TB
    %% ChromaDBスキーマ図
    subgraph Database["ChromaDB Database<br/>default_database"]
        subgraph Org1["組織1<br/>organizationId: org_001"]
            Entities1["entities_org_001<br/>エンティティ埋め込み"]
            Relations1["relations_org_001<br/>リレーション埋め込み"]
            Topics1["topics_org_001<br/>トピック埋め込み"]
        end
        
        subgraph Org2["組織2<br/>organizationId: org_002"]
            Entities2["entities_org_002<br/>エンティティ埋め込み"]
            Relations2["relations_org_002<br/>リレーション埋め込み"]
            Topics2["topics_org_002<br/>トピック埋め込み"]
        end
    end
    
    subgraph Shared["共有コレクション"]
        DesignDocs["design_docs<br/>システム設計ドキュメント"]
    end
    
    subgraph SQLite["SQLite（参照用）"]
        SQLiteEntities[("entities<br/>テーブル")]
        SQLiteRelations[("relations<br/>テーブル")]
        SQLiteTopics[("topics<br/>テーブル")]
        SQLiteDesignDocs[("designDocSections<br/>テーブル")]
    end
    
    Entities1 -.->|"メタデータ: entityId"| SQLiteEntities
    Relations1 -.->|"メタデータ: relationId"| SQLiteRelations
    Topics1 -.->|"メタデータ: topicId"| SQLiteTopics
    DesignDocs -.->|"メタデータ: sectionId"| SQLiteDesignDocs
    
    Entities2 -.->|"メタデータ: entityId"| SQLiteEntities
    Relations2 -.->|"メタデータ: relationId"| SQLiteRelations
    Topics2 -.->|"メタデータ: topicId"| SQLiteTopics
    
    style Database fill:#fff4e1
    style Entities1 fill:#e3f2fd
    style Relations1 fill:#f3e5f5
    style Topics1 fill:#e8f5e9
    style Entities2 fill:#e3f2fd
    style Relations2 fill:#f3e5f5
    style Topics2 fill:#e8f5e9
    style SQLiteEntities fill:#e1f5ff
    style SQLiteRelations fill:#e1f5ff
    style SQLiteTopics fill:#e1f5ff
    style SQLiteDesignDocs fill:#e1f5ff
    style DesignDocs fill:#fff9c4
    style Shared fill:#fff4e1`}
      />
      
      <div style={{ marginTop: '24px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          コレクションの役割
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>コレクション名</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>役割</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>保存内容</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>特徴</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>{'entities_{organizationId}'}</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>エンティティのセマンティック検索を提供</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>エンティティ名、エイリアス、メタデータの埋め込みベクトル（1536次元）</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織ごとにコレクションを分離、RAG検索で使用</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>{'relations_{organizationId}'}</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>リレーションのセマンティック検索を提供</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>リレーションタイプ、説明、メタデータの埋め込みベクトル（1536次元）</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織ごとにコレクションを分離、RAG検索で使用</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>{'topics_{organizationId}'}</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>トピックのセマンティック検索を提供</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>トピックのタイトル、コンテンツ、メタデータの埋め込みベクトル（1536次元）</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織ごとにコレクションを分離、RAG検索で使用</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>design_docs</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>システム設計ドキュメントのセマンティック検索を提供</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>設計ドキュメントセクションのタイトル、コンテンツの埋め込みベクトル（1536次元）</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織を跨いで共有、全組織で共通の設計情報を検索可能</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </CollapsibleSection>
  );
}

