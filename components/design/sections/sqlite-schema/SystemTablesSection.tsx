'use client';

import React, { useState, useCallback } from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
// システム管理テーブルコンポーネント
import UsersTable from '../../tables/UsersTable';
import ApprovalRequestsTable from '../../tables/ApprovalRequestsTable';
import PageContainersTable from '../../tables/PageContainersTable';
import AiSettingsTable from '../../tables/AiSettingsTable';
import BackupHistoryTable from '../../tables/BackupHistoryTable';
import ThemeHierarchyConfigsTable from '../../tables/ThemeHierarchyConfigsTable';

/**
 * システム管理テーブルセクション
 */
export function SystemTablesSection() {
  const [selectedSystemTableId, setSelectedSystemTableId] = useState<string | null>('none');

  const selectSystemTable = useCallback((tableId: string | null) => {
    setSelectedSystemTableId(tableId);
  }, []);

  const systemTableList = [
    { number: '⑫', name: 'users', id: 'table-users', japanese: 'ユーザー', component: UsersTable },
    { number: '⑬', name: 'approvalRequests', id: 'table-approval-requests', japanese: '承認リクエスト', component: ApprovalRequestsTable },
    { number: '⑭', name: 'pageContainers', id: 'table-page-containers', japanese: 'ページコンテナ', component: PageContainersTable },
    { number: '⑮', name: 'aiSettings', id: 'table-ai-settings', japanese: 'AI設定', component: AiSettingsTable },
    { number: '⑯', name: 'backupHistory', id: 'table-backup-history', japanese: 'バックアップ履歴', component: BackupHistoryTable },
    { number: '⑰', name: 'themeHierarchyConfigs', id: 'table-theme-hierarchy-configs', japanese: 'テーマ階層設定', component: ThemeHierarchyConfigsTable },
  ];

  return (
    <CollapsibleSection 
      title="② システム管理テーブル" 
      defaultExpanded={false}
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
  );
}

