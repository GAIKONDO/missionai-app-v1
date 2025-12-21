'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * ID管理の仕組みセクション
 */
export function IDManagementSection() {
  return (
    <CollapsibleSection 
      title="ID管理の仕組み" 
      defaultExpanded={false}
      id="id-management-section"
    >
      <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
          IDの種類と管理方法
        </h4>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>組織ID（organizationId）:</strong> SQLiteの<code>organizations.id</code>を使用。形式: <code>init_miwceusf_lmthnq2ks</code></li>
          <li><strong>議事録ID（meetingId）:</strong> SQLiteの<code>meetingNotes.id</code>を使用。形式: <code>init_miwceusf_lmthnq2ks</code></li>
          <li><strong>トピックID（topicId）:</strong> SQLiteの<code>topicEmbeddings.topicId</code>を使用。形式: <code>init_mj0b1gma_hywcwrspw</code></li>
          <li><strong>エンティティID（entityId）:</strong> SQLiteの<code>entities.id</code>を使用。形式: <code>entity_{'{timestamp}'}_{'{random}'}</code></li>
          <li><strong>リレーションID（relationId）:</strong> SQLiteの<code>topicRelations.id</code>を使用</li>
          <li><strong>事業会社ID（companyId）:</strong> SQLiteの<code>companies.id</code>を使用</li>
          <li><strong>注力施策ID（initiativeId）:</strong> SQLiteの<code>focusInitiatives.id</code>を使用</li>
        </ul>
        
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', marginTop: '24px', color: 'var(--color-text)' }}>
          IDの取得方法
        </h4>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>クエリパラメータ:</strong> <code>useSearchParams()</code>で取得（例: <code>?id=xxx</code>の<code>id</code>、<code>?entityId=xxx</code>の<code>entityId</code>）</li>
          <li><strong>プログラムからの遷移:</strong> <code>router.push()</code>でパスとクエリパラメータを組み合わせて遷移（例: <code>router.push('/organization/detail?id=xxx')</code>）</li>
        </ul>
        
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', marginTop: '24px', color: 'var(--color-text)' }}>
          データの読み込みフロー
        </h4>
        <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>ページマウント時:</strong> <code>useEffect</code>でIDを取得</li>
          <li><strong>ID検証:</strong> IDが存在するか確認</li>
          <li><strong>データ取得:</strong> IDを使用してSQLiteからデータを取得（<code>getEntityById</code>、<code>getMeetingNoteById</code>など）</li>
          <li><strong>状態更新:</strong> 取得したデータをReactの状態に設定</li>
          <li><strong>レンダリング:</strong> データを基にUIをレンダリング</li>
        </ol>
      </div>
    </CollapsibleSection>
  );
}

