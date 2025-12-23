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
      <div style={{ marginBottom: '24px' }}>
        <p style={{ marginBottom: '16px', fontSize: '14px', lineHeight: '1.8' }}>
          ChromaDBのコレクション名は<strong>組織ごとに分離</strong>されています（<code>design_docs</code>を除く）。組織と事業会社は同じコレクションを使用し、<code>organizationId</code>で区別します。
        </p>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>コレクション名</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>用途</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>分離方式</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>備考</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>{'entities_{organizationId}'}</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>エンティティ埋め込み</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織ごと</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織と事業会社の両方を含む</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>{'relations_{organizationId}'}</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>リレーション埋め込み</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織ごと</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織と事業会社の両方を含む</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>{'topics_{organizationId}'}</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>トピック埋め込み</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織ごと</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織と事業会社の両方を含む</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>design_docs</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>システム設計ドキュメント埋め込み</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>共有</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織を跨いで共有（<code>organizationId</code>不要）</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
          命名規則の詳細
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>項目</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>説明</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>基本形式</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>{'{データタイプ}_{organizationId}'}</code>（例: <code>entities_init_miwceusf_lmthnq2ks</code>）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>organizationId</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織ID（type='organization'またはtype='company'の組織を参照）。空文字列の場合は<code>entities_all</code>や<code>relations_all</code>を使用（特殊ケース）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>データタイプ</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>entities</code>、<code>relations</code>、<code>topics</code>のいずれか</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>特殊ケース</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>design_docs</code>は組織IDを含まない固定名（組織を跨いで共有）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>事業会社の扱い</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>事業会社（type='company'）専用のコレクションは不要。組織と同じコレクションを使用し、<code>metadata.organizationId</code>または<code>metadata.companyId</code>で区別</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
          命名例
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>組織ID</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>エンティティ</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>リレーション</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>トピック</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>init_miwceusf_lmthnq2ks</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>entities_init_miwceusf_lmthnq2ks</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>relations_init_miwceusf_lmthnq2ks</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>topics_init_miwceusf_lmthnq2ks</code></td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>org_001</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>entities_org_001</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>relations_org_001</code></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><code>topics_org_001</code></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}><strong>共有</strong></td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }} colSpan={3}><code>design_docs</code>（全組織で共通）</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ padding: '12px', backgroundColor: '#FEF3C7', borderRadius: '6px', border: '1px solid #FCD34D' }}>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.8' }}>
          <strong>⚠️ 重要な注意事項:</strong> 事業会社（type='company'）専用のコレクション（<code>companies_{'{organizationId}'}</code>など）は作成されません。組織と事業会社は同じコレクションを使用し、<code>metadata.organizationId</code>または<code>metadata.companyId</code>で区別します。これにより、データの分離とセキュリティを実現しながら、コレクション管理を簡素化しています。
        </p>
      </div>
    </CollapsibleSection>
  );
}

