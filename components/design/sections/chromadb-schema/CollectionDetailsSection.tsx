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
      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          entities_{'{organizationId}'}（エンティティ埋め込み）
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>フィールド</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>型</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>説明</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>id</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>エンティティID（SQLiteの<code>entities.id</code>と同じ）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>embedding</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>Array&lt;Float&gt; (1536次元)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>埋め込みベクトル（エンティティ名 + エイリアス + メタデータ）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.entityId</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>エンティティID（SQLite参照用）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.organizationId</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織ID（type='organization'またはtype='company'の組織を参照）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.companyId</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>事業会社ID（事業会社のエンティティの場合）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.name</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>エンティティ名</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.type</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>エンティティタイプ（例: "organization"、"person"、"product"）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.aliases</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (JSON)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>別名リスト（JSON文字列）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.metadata</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (JSON)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>追加メタデータ（JSON文字列、<code>topicId</code>を含む場合あり）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.createdAt</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (ISO 8601)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>作成日時</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.updatedAt</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (ISO 8601)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>更新日時</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
          <strong>ID連携:</strong> <code>id</code>フィールドはSQLiteの<code>entities.id</code>と同じ値を使用します。これにより、ChromaDBで検索した結果のIDを使ってSQLiteから詳細情報を取得できます。
        </p>
        <p style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--color-text-light)', fontStyle: 'italic', marginTop: '8px' }}>
          <strong>埋め込み生成:</strong> エンティティ名 + エイリアス + メタデータ（JSON文字列）を結合したテキストから埋め込みベクトルを生成します。
        </p>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          relations_{'{organizationId}'}（リレーション埋め込み）
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>フィールド</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>型</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>説明</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>id</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>リレーションID（SQLiteの<code>relations.id</code>と同じ）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>embedding</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>Array&lt;Float&gt; (1536次元)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>埋め込みベクトル（リレーションタイプ + 説明 + 関連エンティティ名 + メタデータ）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.relationId</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>リレーションID（SQLite参照用）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.organizationId</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織ID（type='organization'またはtype='company'の組織を参照）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.companyId</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>事業会社ID（事業会社のリレーションの場合）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.topicId</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>トピックID（SQLiteの<code>topics.id</code>形式: <code>{'{meetingNoteId}-topic-{topicId}'}</code>）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.sourceEntityId</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>起点エンティティID</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.targetEntityId</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>終点エンティティID</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.sourceEntityName</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>起点エンティティ名（検索用）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.targetEntityName</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>終点エンティティ名（検索用）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.relationType</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>リレーションタイプ（例: "works_for"、"partners_with"）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.description</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>リレーションの説明</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.metadata</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (JSON)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>追加メタデータ（JSON文字列）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.createdAt</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (ISO 8601)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>作成日時</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.updatedAt</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (ISO 8601)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>更新日時</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
          <strong>ID連携:</strong> <code>id</code>フィールドはSQLiteの<code>relations.id</code>と同じ値を使用します。<code>metadata.topicId</code>には完全なトピックID（<code>{'{meetingNoteId}-topic-{topicId}'}</code>）が保存されます。
        </p>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          topics_{'{organizationId}'}（トピック埋め込み）
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>フィールド</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>型</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>説明</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>id</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>トピックID（SQLiteの<code>topics.topicId</code>と同じ、例: <code>init_mj0b1gma_hywcwrspw</code>）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>embedding</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>Array&lt;Float&gt; (1536次元)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>埋め込みベクトル（タイトル + コンテンツ + メタデータ）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.topicId</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>トピックID（SQLite参照用）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.meetingNoteId</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>議事録ID</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.organizationId</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織ID（type='organization'またはtype='company'の組織を参照）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.title</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>トピックタイトル</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.contentSummary</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>コンテンツ要約（最初の200文字）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.semanticCategory</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>セマンティックカテゴリ（例: "戦略"、"実行"）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.keywords</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (JSON)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>キーワードリスト（JSON文字列）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.tags</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (JSON)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>タグリスト（JSON文字列）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.summary</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>要約</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.importance</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>重要度</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.meetingNoteTitle</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>議事録タイトル</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.createdAt</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (ISO 8601)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>作成日時</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.updatedAt</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (ISO 8601)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>更新日時</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
          <strong>ID連携:</strong> <code>id</code>フィールドはSQLiteの<code>topics.topicId</code>と同じ値を使用します（<code>topics.id</code>ではないことに注意）。<code>metadata.meetingNoteId</code>には議事録IDが保存されます。SQLiteで検索する際は<code>topics.id</code>（<code>{'{meetingNoteId}-topic-{topicId}'}</code>形式）を使用する必要があります。
        </p>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          design_docs（システム設計ドキュメント埋め込み）
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>フィールド</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>型</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>説明</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>id</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>セクションID（SQLiteの<code>designDocSections.id</code>と同じ）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>embedding</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>Array&lt;Float&gt; (1536次元)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>埋め込みベクトル（タイトル + コンテンツ）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.sectionId</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>セクションID（SQLite参照用）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.sectionTitle</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>セクションタイトル</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.content</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>セクションの内容（全文、検索後の表示用、Mermaidコードは除去済み）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.tags</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (JSON)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>タグリスト（JSON文字列）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.order</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>表示順序（数値の文字列）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.pageUrl</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>ページURL（デフォルト: '/design'）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.hierarchy</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (JSON)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>階層情報（JSON文字列）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.relatedSections</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (JSON)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>関連セクションIDリスト（JSON文字列）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.embeddingModel</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>使用した埋め込みモデル（例: "text-embedding-3-small"）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.embeddingVersion</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>埋め込みバージョン（例: "1.0"）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.createdAt</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (ISO 8601)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>作成日時</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>metadata.updatedAt</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>String (ISO 8601)</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>更新日時</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
          <strong>ID連携:</strong> <code>id</code>フィールドはSQLiteの<code>designDocSections.id</code>と同じ値を使用します。これにより、ChromaDBで検索した結果のIDを使ってSQLiteから詳細情報を取得できます。
        </p>
        <p style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--color-text-light)', fontStyle: 'italic', marginTop: '8px' }}>
          <strong>共有コレクション:</strong> このコレクションは組織を跨いで共有されるため、すべての組織の設計ドキュメントが同じコレクションに保存されます。
        </p>
      </div>
    </CollapsibleSection>
  );
}
