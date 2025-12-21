'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * コレクション命名規則セクション
 */
export function NamingConventionSection() {
  return (
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
  );
}

