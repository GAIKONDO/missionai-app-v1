'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: '主キー',
    pages: '/（承認機能）',
    relatedTables: '-',
  },
  {
    name: 'email',
    description: '管理者メールアドレス（UNIQUE、NOT NULL）',
    pages: '/（承認機能）',
    relatedTables: '-',
  },
];

export default function AdminsTable() {
  return (
    <TableDetailCard
      id="table-admins"
      number=""
      tableName="admins"
      tableNameJapanese="管理者"
      color="#778899"
      role="管理者のメールアドレスを保存します。"
      columns={columns}
    />
  );
}
