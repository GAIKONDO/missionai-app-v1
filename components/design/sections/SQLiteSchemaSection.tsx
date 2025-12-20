'use client';

import React, { useState, useCallback } from 'react';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../common/ZoomableMermaidDiagram';
// テーブル詳細コンポーネント
import OrganizationsTable from '../tables/OrganizationsTable';
import OrganizationMembersTable from '../tables/OrganizationMembersTable';
import OrganizationContentsTable from '../tables/OrganizationContentsTable';
import MeetingNotesTable from '../tables/MeetingNotesTable';
import TopicsTable from '../tables/TopicsTable';
import EntitiesTable from '../tables/EntitiesTable';
import RelationsTable from '../tables/RelationsTable';
import FocusInitiativesTable from '../tables/FocusInitiativesTable';
import ThemesTable from '../tables/ThemesTable';
import DesignDocSectionsTable from '../tables/DesignDocSectionsTable';
import DesignDocSectionRelationsTable from '../tables/DesignDocSectionRelationsTable';
import UsersTable from '../tables/UsersTable';
import PageContainersTable from '../tables/PageContainersTable';
import ApprovalRequestsTable from '../tables/ApprovalRequestsTable';
import AiSettingsTable from '../tables/AiSettingsTable';
import BackupHistoryTable from '../tables/BackupHistoryTable';
import ThemeHierarchyConfigsTable from '../tables/ThemeHierarchyConfigsTable';

export function SQLiteSchemaSection() {
  // 選択中のテーブルIDを管理（nullの場合はすべて表示、'none'の場合はすべて非表示）
  const [selectedTableId, setSelectedTableId] = useState<string | null>('none');
  const [selectedSystemTableId, setSelectedSystemTableId] = useState<string | null>('none');
  const [selectedIdLinkageId, setSelectedIdLinkageId] = useState<string | null>('none');
  const [isDiagramExpanded, setIsDiagramExpanded] = useState(false);
  const [isTableDetailsExpanded, setIsTableDetailsExpanded] = useState(false);
  const [isSystemTablesExpanded, setIsSystemTablesExpanded] = useState(false);
  const [isIdLinkageExpanded, setIsIdLinkageExpanded] = useState(false);

  // テーブルを選択する関数
  const selectTable = useCallback((tableId: string | null) => {
    setSelectedTableId(tableId);
  }, []);

  // システム管理テーブルを選択する関数
  const selectSystemTable = useCallback((tableId: string | null) => {
    setSelectedSystemTableId(tableId);
  }, []);

  // ID連携セクションを選択する関数
  const selectIdLinkage = useCallback((sectionId: string | null) => {
    setSelectedIdLinkageId(sectionId);
  }, []);

  // テーブル番号一覧のデータ
  const tableList = [
    { number: '①', name: 'organizations', id: 'table-organizations', japanese: '組織', component: OrganizationsTable },
    { number: '②', name: 'organizationMembers', id: 'table-organization-members', japanese: '組織メンバー', component: OrganizationMembersTable },
    { number: '③', name: 'organizationContents', id: 'table-organization-contents', japanese: '組織コンテンツ', component: OrganizationContentsTable },
    { number: '④', name: 'meetingNotes', id: 'table-meeting-notes', japanese: '議事録', component: MeetingNotesTable },
    { number: '⑤', name: 'topics', id: 'table-topics', japanese: 'トピック', component: TopicsTable },
    { number: '⑥', name: 'entities', id: 'table-entities', japanese: 'エンティティ', component: EntitiesTable },
    { number: '⑦', name: 'relations', id: 'table-relations', japanese: 'リレーション', component: RelationsTable },
    { number: '⑧', name: 'focusInitiatives', id: 'table-focus-initiatives', japanese: '注力施策', component: FocusInitiativesTable },
    { number: '⑨', name: 'themes', id: 'table-themes', japanese: 'テーマ', component: ThemesTable },
    { number: '⑩', name: 'designDocSections', id: 'table-design-doc-sections', japanese: 'システム設計ドキュメントセクション', component: DesignDocSectionsTable },
    { number: '⑪', name: 'designDocSectionRelations', id: 'table-design-doc-section-relations', japanese: '設計ドキュメントセクションリレーション', component: DesignDocSectionRelationsTable },
  ];

  const systemTableList = [
    { number: '⑫', name: 'users', id: 'table-users', japanese: 'ユーザー', component: UsersTable },
    { number: '⑬', name: 'approvalRequests', id: 'table-approval-requests', japanese: '承認リクエスト', component: ApprovalRequestsTable },
    { number: '⑭', name: 'pageContainers', id: 'table-page-containers', japanese: 'ページコンテナ', component: PageContainersTable },
    { number: '⑮', name: 'aiSettings', id: 'table-ai-settings', japanese: 'AI設定', component: AiSettingsTable },
    { number: '⑯', name: 'backupHistory', id: 'table-backup-history', japanese: 'バックアップ履歴', component: BackupHistoryTable },
    { number: '⑰', name: 'themeHierarchyConfigs', id: 'table-theme-hierarchy-configs', japanese: 'テーマ階層設定', component: ThemeHierarchyConfigsTable },
  ];

  return (
    <div>
      <CollapsibleSection 
        title="テーブル関係図" 
        defaultExpanded={false}
        id="sqlite-schema-diagram-section"
      >
        <ZoomableMermaidDiagram
          diagramId="sqlite-schema-diagram"
          mermaidCode={`erDiagram
    %% SQLiteスキーマ図
    organizations ||--o{ organizations : "parent"
    organizations ||--o{ organizationMembers : "has"
    organizations ||--o{ organizationContents : "has"
    organizations ||--o{ meetingNotes : "has"
    organizations ||--o{ entities : "belongs_to"
    organizations ||--o{ topics : "belongs_to"
    organizations ||--o{ relations : "belongs_to"
    organizations ||--o{ focusInitiatives : "has"
    
    meetingNotes ||--o{ topics : "has"
    topics ||--o{ entities : "has"
    topics ||--o{ relations : "has"
    
    entities ||--o{ relations : "source"
    entities ||--o{ relations : "target"
    
    themes ||--o{ focusInitiatives : "has"
    
    designDocSections ||--o{ designDocSectionRelations : "source"
    designDocSections ||--o{ designDocSectionRelations : "target"
`}
        />
      </CollapsibleSection>

      <CollapsibleSection 
        title="① テーブル詳細" 
        defaultExpanded={isTableDetailsExpanded}
        id="sqlite-table-details-section"
      >
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button
              onClick={() => selectTable(null)}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedTableId === null ? 'var(--color-primary)' : 'var(--color-surface)',
                color: selectedTableId === null ? 'white' : 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              すべて表示
            </button>
            <button
              onClick={() => selectTable('none')}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedTableId === 'none' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: selectedTableId === 'none' ? 'white' : 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              すべて非表示
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {tableList.map((table) => (
              <button
                key={table.id}
                onClick={() => selectTable(selectedTableId === table.id ? 'none' : table.id)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: selectedTableId === table.id ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: selectedTableId === table.id ? 'white' : 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {table.number} {table.japanese}
              </button>
            ))}
          </div>
        </div>

        {selectedTableId === 'none' ? null : selectedTableId === null ? (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: 'var(--color-text-light)',
            backgroundColor: 'var(--color-background)',
            borderRadius: '8px',
            border: '1px solid var(--color-border-color)'
          }}>
            <p style={{ margin: 0, fontSize: '14px' }}>
              テーブルを選択すると詳細が表示されます
            </p>
          </div>
        ) : (
          tableList.find(t => t.id === selectedTableId)?.component && (
            <div key={selectedTableId}>
              {React.createElement(tableList.find(t => t.id === selectedTableId)!.component)}
            </div>
          )
        )}
      </CollapsibleSection>

      <CollapsibleSection 
        title="② システム管理テーブル" 
        defaultExpanded={isSystemTablesExpanded}
        id="sqlite-system-tables-section"
      >
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button
              onClick={() => selectSystemTable(null)}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedSystemTableId === null ? 'var(--color-primary)' : 'var(--color-surface)',
                color: selectedSystemTableId === null ? 'white' : 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              すべて表示
            </button>
            <button
              onClick={() => selectSystemTable('none')}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedSystemTableId === 'none' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: selectedSystemTableId === 'none' ? 'white' : 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              すべて非表示
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {systemTableList.map((table) => (
              <button
                key={table.id}
                onClick={() => selectSystemTable(selectedSystemTableId === table.id ? 'none' : table.id)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: selectedSystemTableId === table.id ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: selectedSystemTableId === table.id ? 'white' : 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {table.number} {table.japanese}
              </button>
            ))}
          </div>
        </div>

        {selectedSystemTableId === 'none' ? null : selectedSystemTableId === null ? (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: 'var(--color-text-light)',
            backgroundColor: 'var(--color-background)',
            borderRadius: '8px',
            border: '1px solid var(--color-border-color)'
          }}>
            <p style={{ margin: 0, fontSize: '14px' }}>
              テーブルを選択すると詳細が表示されます
            </p>
          </div>
        ) : (
          systemTableList.find(t => t.id === selectedSystemTableId)?.component && (
            <div key={selectedSystemTableId}>
              {React.createElement(systemTableList.find(t => t.id === selectedSystemTableId)!.component)}
            </div>
          )
        )}
      </CollapsibleSection>

      <CollapsibleSection 
        title="③ SQLiteとのID連携" 
        defaultExpanded={isIdLinkageExpanded}
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
    </div>
  );
}
