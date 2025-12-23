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
    name: 'userId',
    description: 'ユーザーID（外部キー、NOT NULL）',
    pages: '/（承認機能）',
    relatedTables: 'users.id',
  },
  {
    name: 'status',
    description: "ステータス（デフォルト: 'pending'）",
    pages: '/（承認機能）',
    relatedTables: '-',
  },
];

export default function ApprovalRequestsTable() {
  return (
    <TableDetailCard
      id="table-approval-requests"
      number="②"
      tableName="approvalRequests"
      tableNameJapanese="承認リクエスト"
      color="#708090"
      role="ユーザーの承認リクエスト情報を保存します。"
      columns={columns}
    />
  );
}
