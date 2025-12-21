'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * SQLiteとのID連携セクション
 */
export function IDLinkageSection() {
  return (
    <CollapsibleSection 
      title="③ SQLiteとのID連携" 
      defaultExpanded={false}
      id="sqlite-id-linkage-section"
    >
      <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
          IDマッピング
        </h4>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>エンティティ:</strong> ChromaDBの<code>id</code> = SQLiteの<code>entities.id</code></li>
          <li><strong>リレーション:</strong> ChromaDBの<code>id</code> = SQLiteの<code>relations.id</code></li>
          <li><strong>トピック:</strong> ChromaDBの<code>id</code> = SQLiteの<code>topics.topicId</code>（<code>topics.id</code>ではない）</li>
          <li><strong>システム設計ドキュメント:</strong> ChromaDBの<code>id</code> = SQLiteの<code>designDocSections.id</code></li>
        </ul>
        
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', marginTop: '24px', color: 'var(--color-text)' }}>
          検索フロー
        </h4>
        <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>類似度検索:</strong> ChromaDBでクエリの埋め込みベクトルと類似度が高いエンティティ/リレーション/トピックを検索</li>
          <li><strong>ID取得:</strong> 検索結果から<code>id</code>フィールド（または<code>metadata</code>内のID）を取得</li>
          <li><strong>詳細情報取得:</strong> 取得したIDを使用してSQLiteから詳細情報を取得</li>
          <li><strong>結果統合:</strong> ベクトル類似度スコアとSQLiteの詳細情報を統合してユーザーに表示</li>
        </ol>
        
        <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8', fontStyle: 'italic' }}>
          <strong>注意:</strong> トピックの場合、ChromaDBの<code>id</code>は<code>topics.topicId</code>（例: <code>init_mj0b1gma_hywcwrspw</code>）を使用しますが、SQLiteで検索する際は<code>topics.id</code>（例: <code>init_miwceusf_lmthnq2ks-topic-init_mj0b1gma_hywcwrspw</code>）を使用する必要があります。この変換はアプリケーション層で処理されます。
        </p>
      </div>
    </CollapsibleSection>
  );
}

