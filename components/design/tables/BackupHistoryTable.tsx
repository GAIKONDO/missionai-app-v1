'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: '主キー',
    pages: '/settings',
    relatedTables: '-',
  },
  {
    name: 'backupPath',
    description: 'バックアップファイルのパス（NOT NULL）',
    pages: '/settings',
    relatedTables: '-',
  },
  {
    name: 'backupSize',
    description: 'バックアップファイルサイズ（バイト）',
    pages: '/settings',
    relatedTables: '-',
  },
];

export default function BackupHistoryTable() {
  return (
    <TableDetailCard
      id="table-backup-history"
      number="⑲"
      tableName="backupHistory"
      tableNameJapanese="バックアップ履歴"
      color="#4682B4"
      role="データベースのバックアップ履歴を保存します。"
      columns={columns}
    />
  );
}
