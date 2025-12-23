'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * SQLiteとChromaDBのID連携セクション
 */
export function IDLinkageSection() {
  return (
    <CollapsibleSection 
      title="② SQLiteとChromaDBのID連携" 
      defaultExpanded={false}
      id="sqlite-id-linkage-section"
    >
      <div>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
          IDマッピング
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>データタイプ</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>ChromaDBのid</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>SQLiteの対応カラム</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>備考</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><strong>エンティティ</strong></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>{'entities_{orgId}.id'}</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>entities.id</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>完全一致</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><strong>リレーション</strong></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>{'relations_{orgId}.id'}</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>relations.id</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>完全一致</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><strong>トピック</strong></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>{'topics_{orgId}.id'}</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>topics.topicId</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>ChromaDBのid = SQLiteのtopicId（例: <code>init_mj0b1gma_hywcwrspw</code>）<br/>SQLite検索時は<code>topics.id</code>（形式: <code>{'{meetingNoteId}-topic-{topicId}'}</code>）を使用</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><strong>システム設計ドキュメント</strong></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>design_docs.id</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>designDocSections.id</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>完全一致（組織を跨いで共有）</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', marginTop: '24px', color: 'var(--color-text)' }}>
          検索フロー
        </h4>
        <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>クエリ埋め込み生成:</strong> ユーザークエリテキストから埋め込みベクトルを生成（OpenAI/Ollama API）</li>
          <li><strong>類似度検索:</strong> ChromaDBでクエリの埋め込みベクトルと類似度が高いエンティティ/リレーション/トピック/設計ドキュメントを並列検索</li>
          <li><strong>ID取得:</strong> 検索結果から<code>id</code>フィールド（または<code>metadata</code>内のID）を取得</li>
          <li><strong>ID変換:</strong> トピックの場合は、<code>topicId</code>から<code>topics.id</code>形式に変換（アプリケーション層で処理）</li>
          <li><strong>詳細情報取得:</strong> 取得したIDを使用してSQLiteから詳細情報を取得（エンティティ名、リレーションタイプ、トピック内容など）</li>
          <li><strong>結果統合:</strong> ベクトル類似度スコアとSQLiteの詳細情報を統合し、スコアリング・ブーストを適用</li>
          <li><strong>結果表示:</strong> 統合された検索結果をユーザーに表示（またはAIアシスタントのコンテキストとして使用）</li>
        </ol>
        
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', marginTop: '24px', color: 'var(--color-text)' }}>
          メタデータ内のID参照
        </h4>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '12px' }}>
          ChromaDBの<code>metadata</code>には、SQLite参照用のIDも含まれています：
        </p>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>エンティティ:</strong> <code>metadata.entityId</code> = <code>entities.id</code></li>
          <li><strong>リレーション:</strong> <code>metadata.relationId</code> = <code>relations.id</code>、<code>metadata.topicId</code> = <code>topics.topicId</code></li>
          <li><strong>トピック:</strong> <code>metadata.topicId</code> = <code>topics.topicId</code>、<code>metadata.meetingNoteId</code> = <code>meetingNotes.id</code></li>
          <li><strong>システム設計ドキュメント:</strong> <code>metadata.sectionId</code> = <code>designDocSections.id</code></li>
        </ul>
        
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#FEF3C7', borderRadius: '6px', border: '1px solid #FCD34D' }}>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.8' }}>
            <strong>⚠️ 重要な注意事項:</strong> トピックの場合、ChromaDBの<code>id</code>は<code>topics.topicId</code>（例: <code>init_mj0b1gma_hywcwrspw</code>）を使用しますが、SQLiteで検索する際は<code>topics.id</code>（形式: <code>{'{meetingNoteId}-topic-{topicId}'}</code>、例: <code>init_miwceusf_lmthnq2ks-topic-init_mj0b1gma_hywcwrspw</code>）を使用する必要があります。この変換はアプリケーション層（RAG検索処理）で自動的に処理されます。
          </p>
        </div>
      </div>
    </CollapsibleSection>
  );
}

