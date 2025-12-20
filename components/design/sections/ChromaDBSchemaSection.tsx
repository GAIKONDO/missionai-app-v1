'use client';

import React from 'react';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../common/ZoomableMermaidDiagram';

export function ChromaDBSchemaSection() {
  return (
    <div>
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
      </CollapsibleSection>

      <CollapsibleSection 
        title="コレクション詳細" 
        defaultExpanded={false}
        id="chromadb-collection-details-section"
      >
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#4A90E2', borderRadius: '50%', marginRight: '8px' }}></span>
            entities_{'{organizationId}'}（エンティティ埋め込み）
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>役割:</strong> エンティティの埋め込みベクトルを保存し、セマンティック検索を提供します。
            </p>
            <p style={{ marginBottom: '8px', fontWeight: 600 }}>コレクション構造:</p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><code>id</code> - エンティティID（SQLiteの<code>entities.id</code>と同じ）</li>
              <li><code>embedding</code> - 埋め込みベクトル（エンティティ名 + エイリアス + メタデータ）</li>
              <li><code>metadata</code> - メタデータ（JSON形式）:
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li><code>entityId</code> - エンティティID（SQLite参照用）</li>
                  <li><code>organizationId</code> - 組織ID（NULL可能、type='organization'またはtype='company'の組織を参照）</li>
                  <li><code>name</code> - エンティティ名</li>
                  <li><code>type</code> - エンティティタイプ（例: "organization"、"person"、"product"）</li>
                  <li><code>aliases</code> - 別名リスト（JSON文字列）</li>
                  <li><code>metadata</code> - 追加メタデータ（JSON文字列、<code>topicId</code>を含む）</li>
                  <li><code>embeddingModel</code> - 使用した埋め込みモデル（例: "text-embedding-3-small"）</li>
                  <li><code>embeddingVersion</code> - 埋め込みバージョン（例: "1.0"）</li>
                  <li><code>createdAt</code> - 作成日時（ISO 8601形式）</li>
                  <li><code>updatedAt</code> - 更新日時（ISO 8601形式）</li>
                </ul>
              </li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              <strong>ID連携:</strong> <code>id</code>フィールドはSQLiteの<code>entities.id</code>と同じ値を使用します。これにより、ChromaDBで検索した結果のIDを使ってSQLiteから詳細情報を取得できます。
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic', marginTop: '8px' }}>
              <strong>埋め込み生成:</strong> エンティティ名 + エイリアス + メタデータ（JSON文字列）を結合したテキストから埋め込みベクトルを生成します。
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic', marginTop: '8px' }}>
              <strong>組織と事業会社:</strong> 組織（type='organization'）と事業会社（type='company'）は同じコレクションを使用します。<code>organizationId</code>で区別し、事業会社専用のコレクションは不要です。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#7ED321', borderRadius: '50%', marginRight: '8px' }}></span>
            relations_{'{organizationId}'}（リレーション埋め込み）
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>役割:</strong> エンティティ間のリレーションの埋め込みベクトルを保存し、関係性のセマンティック検索を提供します。
            </p>
            <p style={{ marginBottom: '8px', fontWeight: 600 }}>コレクション構造:</p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><code>id</code> - リレーションID（SQLiteの<code>relations.id</code>と同じ）</li>
              <li><code>embedding</code> - 埋め込みベクトル（リレーションタイプ + 説明 + 関連エンティティ名 + メタデータ、1536次元）</li>
              <li><code>metadata</code> - メタデータ（JSON形式）:
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li><code>relationId</code> - リレーションID（SQLite参照用）</li>
                  <li><code>organizationId</code> - 組織ID（NULL可能、type='organization'またはtype='company'の組織を参照）</li>
                  <li><code>topicId</code> - トピックID（SQLiteの<code>topics.id</code>形式: <code>{'{meetingNoteId}-topic-{topicId}'}</code>）</li>
                  <li><code>sourceEntityId</code> - 起点エンティティID</li>
                  <li><code>targetEntityId</code> - 終点エンティティID</li>
                  <li><code>sourceEntityName</code> - 起点エンティティ名（検索用）</li>
                  <li><code>targetEntityName</code> - 終点エンティティ名（検索用）</li>
                  <li><code>relationType</code> - リレーションタイプ（例: "works_for"、"partners_with"）</li>
                  <li><code>description</code> - リレーションの説明</li>
                  <li><code>metadata</code> - 追加メタデータ（JSON文字列）</li>
                  <li><code>embeddingModel</code> - 使用した埋め込みモデル（例: "text-embedding-3-small"）</li>
                  <li><code>embeddingVersion</code> - 埋め込みバージョン（例: "1.0"）</li>
                  <li><code>createdAt</code> - 作成日時（ISO 8601形式）</li>
                  <li><code>updatedAt</code> - 更新日時（ISO 8601形式）</li>
                </ul>
              </li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              <strong>ID連携:</strong> <code>id</code>フィールドはSQLiteの<code>relations.id</code>と同じ値を使用します。<code>metadata.topicId</code>には完全なトピックID（<code>{'{meetingNoteId}-topic-{topicId}'}</code>）が保存されます。
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic', marginTop: '8px' }}>
              <strong>組織と事業会社:</strong> 組織（type='organization'）と事業会社（type='company'）は同じコレクションを使用します。<code>organizationId</code>で区別し、事業会社専用のコレクションは不要です。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#F5A623', borderRadius: '50%', marginRight: '8px' }}></span>
            topics_{'{organizationId}'}（トピック埋め込み）
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>役割:</strong> トピックの埋め込みベクトルを保存し、トピック内容のセマンティック検索を提供します。
            </p>
            <p style={{ marginBottom: '8px', fontWeight: 600 }}>コレクション構造:</p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><code>id</code> - トピックID（SQLiteの<code>topics.topicId</code>と同じ、例: <code>init_mj0b1gma_hywcwrspw</code>）</li>
              <li><code>embedding</code> - 埋め込みベクトル（タイトル + コンテンツ + メタデータ、1536次元）</li>
              <li><code>metadata</code> - メタデータ（JSON形式）:
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li><code>topicId</code> - トピックID（SQLite参照用）</li>
                  <li><code>meetingNoteId</code> - 議事録ID</li>
                  <li><code>organizationId</code> - 組織ID（NULL可能、type='organization'またはtype='company'の組織を参照）</li>
                  <li><code>title</code> - トピックタイトル</li>
                  <li><code>content</code> - トピックコンテンツ</li>
                  <li><code>semanticCategory</code> - セマンティックカテゴリ（例: "戦略"、"実行"）</li>
                  <li><code>keywords</code> - キーワードリスト（JSON文字列）</li>
                  <li><code>tags</code> - タグリスト（JSON文字列）</li>
                  <li><code>summary</code> - 要約</li>
                  <li><code>embeddingModel</code> - 使用した埋め込みモデル（例: "text-embedding-3-small"）</li>
                  <li><code>embeddingVersion</code> - 埋め込みバージョン（例: "1.0"、"2.0"）</li>
                  <li><code>createdAt</code> - 作成日時（ISO 8601形式）</li>
                  <li><code>updatedAt</code> - 更新日時（ISO 8601形式）</li>
                </ul>
              </li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              <strong>ID連携:</strong> <code>id</code>フィールドはSQLiteの<code>topics.topicId</code>と同じ値を使用します（<code>topics.id</code>ではないことに注意）。<code>metadata.meetingNoteId</code>には議事録IDが保存されます。SQLiteで検索する際は<code>topics.id</code>（<code>{'{meetingNoteId}-topic-{topicId}'}</code>形式）を使用する必要があります。
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic', marginTop: '8px' }}>
              <strong>組織と事業会社:</strong> 組織（type='organization'）と事業会社（type='company'）は同じコレクションを使用します。<code>organizationId</code>で区別し、事業会社専用のコレクションは不要です。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#95A5A6', borderRadius: '50%', marginRight: '8px' }}></span>
            design_docs（システム設計ドキュメント埋め込み）
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>役割:</strong> システム設計ドキュメントの埋め込みベクトルを保存し、設計ドキュメントのセマンティック検索を提供します。<strong>組織を跨いで共有</strong>されるコレクションです。
            </p>
            <p style={{ marginBottom: '8px', fontWeight: 600 }}>コレクション構造:</p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><code>id</code> - セクションID（SQLiteの<code>designDocSections.id</code>と同じ）</li>
              <li><code>embedding</code> - 埋め込みベクトル（タイトル + コンテンツ、1536次元）</li>
              <li><code>metadata</code> - メタデータ（JSON形式）:
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li><code>sectionId</code> - セクションID（SQLite参照用）</li>
                  <li><code>sectionTitle</code> - セクションタイトル</li>
                  <li><code>content</code> - セクションの内容（全文、検索後の表示用）</li>
                  <li><code>tags</code> - タグリスト（JSON文字列）</li>
                  <li><code>order</code> - 表示順序</li>
                  <li><code>pageUrl</code> - ページURL（デフォルト: '/design'）</li>
                  <li><code>hierarchy</code> - 階層情報（JSON文字列）</li>
                  <li><code>relatedSections</code> - 関連セクションIDリスト（JSON文字列）</li>
                  <li><code>embeddingModel</code> - 使用した埋め込みモデル（例: "text-embedding-3-small"）</li>
                  <li><code>embeddingVersion</code> - 埋め込みバージョン（例: "1.0"）</li>
                  <li><code>createdAt</code> - 作成日時（ISO 8601形式）</li>
                  <li><code>updatedAt</code> - 更新日時（ISO 8601形式）</li>
                </ul>
              </li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              <strong>ID連携:</strong> <code>id</code>フィールドはSQLiteの<code>designDocSections.id</code>と同じ値を使用します。これにより、ChromaDBで検索した結果のIDを使ってSQLiteから詳細情報を取得できます。
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic', marginTop: '8px' }}>
              <strong>共有コレクション:</strong> このコレクションは組織を跨いで共有されるため、すべての組織の設計ドキュメントが同じコレクションに保存されます。
            </p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection 
        title="コレクション命名規則" 
        defaultExpanded={false}
        id="chromadb-naming-convention-section"
      >
        <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
            ChromaDBのコレクション名は<strong>組織ごとに分離</strong>されています（<code>design_docs</code>を除く）：
          </p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><code>entities_{'{organizationId}'}</code> - エンティティ埋め込みコレクション（組織ごと、組織と事業会社の両方を含む）</li>
            <li><code>relations_{'{organizationId}'}</code> - リレーション埋め込みコレクション（組織ごと、組織と事業会社の両方を含む）</li>
            <li><code>topics_{'{organizationId}'}</code> - トピック埋め込みコレクション（組織ごと、組織と事業会社の両方を含む）</li>
            <li><code>design_docs</code> - システム設計ドキュメント埋め込みコレクション（<strong>組織を跨いで共有</strong>）</li>
          </ul>
          <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
            <strong>注意:</strong> 事業会社（type='company'）専用のコレクション（<code>companies_{'{organizationId}'}</code>など）は不要です。組織と事業会社は同じコレクションを使用し、<code>organizationId</code>で区別します。
          </p>
          <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8' }}>
            <strong>例:</strong> 組織IDが<code>init_miwceusf_lmthnq2ks</code>の場合：
          </p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><code>entities_init_miwceusf_lmthnq2ks</code></li>
            <li><code>relations_init_miwceusf_lmthnq2ks</code></li>
            <li><code>topics_init_miwceusf_lmthnq2ks</code></li>
          </ul>
        </div>
      </CollapsibleSection>

      <CollapsibleSection 
        title="SQLiteとのID連携" 
        defaultExpanded={false}
        id="chromadb-id-linkage-section"
      >
        <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
            検索フロー
          </h4>
          <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>類似度検索:</strong> ChromaDBでクエリの埋め込みベクトルと類似度が高いエンティティ/リレーション/トピックを検索</li>
            <li><strong>ID取得:</strong> 検索結果から<code>id</code>フィールド（または<code>metadata</code>内のID）を取得</li>
            <li><strong>詳細情報取得:</strong> 取得したIDを使用してSQLiteから詳細情報を取得</li>
            <li><strong>結果統合:</strong> ベクトル類似度スコアとSQLiteの詳細情報を統合してユーザーに表示</li>
          </ol>
          
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', marginTop: '24px', color: 'var(--color-text)' }}>
            IDマッピング
          </h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>エンティティ:</strong> ChromaDBの<code>id</code> = SQLiteの<code>entities.id</code></li>
            <li><strong>リレーション:</strong> ChromaDBの<code>id</code> = SQLiteの<code>relations.id</code></li>
            <li><strong>トピック:</strong> ChromaDBの<code>id</code> = SQLiteの<code>topics.topicId</code>（<code>topics.id</code>ではない）</li>
            <li><strong>システム設計ドキュメント:</strong> ChromaDBの<code>id</code> = SQLiteの<code>designDocSections.id</code></li>
          </ul>
          
          <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8', fontStyle: 'italic' }}>
            <strong>注意:</strong> トピックの場合、ChromaDBの<code>id</code>は<code>topics.topicId</code>（例: <code>init_mj0b1gma_hywcwrspw</code>）を使用しますが、SQLiteで検索する際は<code>topics.id</code>（例: <code>init_miwceusf_lmthnq2ks-topic-init_mj0b1gma_hywcwrspw</code>）を使用する必要があります。この変換はアプリケーション層で処理されます。
          </p>
        </div>
      </CollapsibleSection>
    </div>
  );
}
