'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * コレクション詳細セクション
 */
export function CollectionDetailsSection() {
  return (
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
  );
}

