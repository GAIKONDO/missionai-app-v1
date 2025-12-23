'use client';

import React, { useState, useCallback } from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
// テーブル詳細コンポーネント
// ユーザー管理系
import UsersTable from '../../tables/UsersTable';
import ApprovalRequestsTable from '../../tables/ApprovalRequestsTable';
// 組織管理系
import OrganizationsTable from '../../tables/OrganizationsTable';
import OrganizationMembersTable from '../../tables/OrganizationMembersTable';
import OrganizationContentsTable from '../../tables/OrganizationContentsTable';
// 事業会社系
import CompaniesTable from '../../tables/CompaniesTable';
import CompanyContentsTable from '../../tables/CompanyContentsTable';
import OrganizationCompanyDisplayTable from '../../tables/OrganizationCompanyDisplayTable';
// ナレッジグラフ系
import EntitiesTable from '../../tables/EntitiesTable';
import RelationsTable from '../../tables/RelationsTable';
import TopicsTable from '../../tables/TopicsTable';
// 議事録・施策系
import MeetingNotesTable from '../../tables/MeetingNotesTable';
import FocusInitiativesTable from '../../tables/FocusInitiativesTable';
import ThemesTable from '../../tables/ThemesTable';
import ThemeHierarchyConfigsTable from '../../tables/ThemeHierarchyConfigsTable';
// システム設計ドキュメント系
import DesignDocSectionsTable from '../../tables/DesignDocSectionsTable';
import DesignDocSectionRelationsTable from '../../tables/DesignDocSectionRelationsTable';
// その他
import AiSettingsTable from '../../tables/AiSettingsTable';
import BackupHistoryTable from '../../tables/BackupHistoryTable';

/**
 * テーブル詳細セクション
 */
export function TableDetailsSection() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>('none');

  const selectTable = useCallback((tableId: string | null) => {
    setSelectedTableId(tableId);
  }, []);

  const tableList = [
    // ユーザー管理系
    { number: '①', name: 'users', id: 'table-users', japanese: 'ユーザー', component: UsersTable },
    { number: '②', name: 'approvalRequests', id: 'table-approval-requests', japanese: '承認リクエスト', component: ApprovalRequestsTable },
    // 組織管理系
    { number: '③', name: 'organizations', id: 'table-organizations', japanese: '組織', component: OrganizationsTable },
    { number: '④', name: 'organizationMembers', id: 'table-organization-members', japanese: '組織メンバー', component: OrganizationMembersTable },
    { number: '⑤', name: 'organizationContents', id: 'table-organization-contents', japanese: '組織コンテンツ', component: OrganizationContentsTable },
    // 事業会社系
    { number: '⑥', name: 'companies', id: 'table-companies', japanese: '事業会社', component: CompaniesTable },
    { number: '⑦', name: 'companyContents', id: 'table-company-contents', japanese: '事業会社コンテンツ', component: CompanyContentsTable },
    { number: '⑧', name: 'organizationCompanyDisplay', id: 'table-organization-company-display', japanese: '組織・事業会社表示', component: OrganizationCompanyDisplayTable },
    // ナレッジグラフ系
    { number: '⑨', name: 'entities', id: 'table-entities', japanese: 'エンティティ', component: EntitiesTable },
    { number: '⑩', name: 'relations', id: 'table-relations', japanese: 'リレーション', component: RelationsTable },
    { number: '⑪', name: 'topics', id: 'table-topics', japanese: 'トピック', component: TopicsTable },
    // 議事録・施策系
    { number: '⑫', name: 'meetingNotes', id: 'table-meeting-notes', japanese: '議事録', component: MeetingNotesTable },
    { number: '⑬', name: 'focusInitiatives', id: 'table-focus-initiatives', japanese: '注力施策', component: FocusInitiativesTable },
    { number: '⑭', name: 'themes', id: 'table-themes', japanese: 'テーマ', component: ThemesTable },
    { number: '⑮', name: 'themeHierarchyConfigs', id: 'table-theme-hierarchy-configs', japanese: 'テーマ階層設定', component: ThemeHierarchyConfigsTable },
    // システム設計ドキュメント系
    { number: '⑯', name: 'designDocSections', id: 'table-design-doc-sections', japanese: 'システム設計ドキュメントセクション', component: DesignDocSectionsTable },
    { number: '⑰', name: 'designDocSectionRelations', id: 'table-design-doc-section-relations', japanese: '設計ドキュメントセクションリレーション', component: DesignDocSectionRelationsTable },
    // その他
    { number: '⑱', name: 'aiSettings', id: 'table-ai-settings', japanese: 'AI設定', component: AiSettingsTable },
    { number: '⑲', name: 'backupHistory', id: 'table-backup-history', japanese: 'バックアップ履歴', component: BackupHistoryTable },
  ];

  return (
    <CollapsibleSection 
      title="① テーブル詳細" 
      defaultExpanded={false}
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
  );
}

