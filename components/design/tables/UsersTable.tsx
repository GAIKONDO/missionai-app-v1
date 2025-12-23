'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: '主キー',
    pages: '/（ログイン機能）',
    relatedTables: 'approvalRequests.userId',
  },
  {
    name: 'email',
    description: 'メールアドレス（UNIQUE、NOT NULL）',
    pages: '/（ログイン機能）',
    relatedTables: '-',
  },
  {
    name: 'passwordHash',
    description: 'パスワードハッシュ（NOT NULL）',
    pages: '/（ログイン機能）',
    relatedTables: '-',
  },
  {
    name: 'approved',
    description: '承認状態（0: 未承認、1: 承認済み、デフォルト: 0）',
    pages: '/（ログイン機能、承認機能）',
    relatedTables: 'approvalRequests.userId',
  },
  {
    name: 'role',
    description: 'ユーザー役割（\'user\': 一般ユーザー、\'admin\': 管理者、デフォルト: \'user\'）',
    pages: '/（ユーザー管理機能）',
    relatedTables: '-',
  },
];

export default function UsersTable() {
  return (
    <TableDetailCard
      id="table-users"
      number="①"
      tableName="users"
      tableNameJapanese="ユーザー"
      color="#808080"
      role="アプリケーションのユーザー認証情報を保存します。"
      columns={columns}
    />
  );
}
