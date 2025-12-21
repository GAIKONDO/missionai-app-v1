'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * ページ構造のまとめセクション
 */
export function PageStructureSummarySection() {
  return (
    <CollapsibleSection 
      title="ページ構造のまとめ" 
      defaultExpanded={false}
      id="page-structure-summary-section"
    >
      <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
          本システムのページ構造は、<strong>クエリパラメータ方式</strong>と<strong>SQLiteのID管理</strong>を組み合わせて実現されています。
        </p>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>静的ページ:</strong> サイドバーにハードコーディングされたパスで直接アクセス</li>
          <li><strong>動的ページ:</strong> クエリパラメータ（<code>?id=xxx</code>）でIDを管理し、SQLiteからデータを読み込み</li>
          <li><strong>クエリパラメータ:</strong> ページ内でのフィルタリングやハイライト、IDの受け渡しに使用</li>
          <li><strong>データソース:</strong> すべてのデータはSQLiteから取得され、IDで一意に識別</li>
          <li><strong>ID取得:</strong> <code>useSearchParams()</code>フックでクエリパラメータからIDを取得</li>
          <li><strong>リンク関係:</strong> <code>router.push()</code>を使用してプログラムから遷移、または<code>Link</code>コンポーネントでリンク</li>
        </ul>
      </div>
    </CollapsibleSection>
  );
}

