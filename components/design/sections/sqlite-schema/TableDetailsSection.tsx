'use client';

import React, { useState, useCallback } from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
// テーブル詳細コンポーネント
import OrganizationsTable from '../../tables/OrganizationsTable';
import OrganizationMembersTable from '../../tables/OrganizationMembersTable';
import OrganizationContentsTable from '../../tables/OrganizationContentsTable';
import MeetingNotesTable from '../../tables/MeetingNotesTable';
import TopicsTable from '../../tables/TopicsTable';
import EntitiesTable from '../../tables/EntitiesTable';
import RelationsTable from '../../tables/RelationsTable';
import FocusInitiativesTable from '../../tables/FocusInitiativesTable';
import ThemesTable from '../../tables/ThemesTable';
import DesignDocSectionsTable from '../../tables/DesignDocSectionsTable';
import DesignDocSectionRelationsTable from '../../tables/DesignDocSectionRelationsTable';

/**
 * テーブル詳細セクション
 */
export function TableDetailsSection() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>('none');

  const selectTable = useCallback((tableId: string | null) => {
    setSelectedTableId(tableId);
  }, []);

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

