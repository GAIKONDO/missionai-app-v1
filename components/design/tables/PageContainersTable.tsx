'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: '主キー',
    pages: '-',
    relatedTables: '-',
  },
  {
    name: 'userId',
    description: 'ユーザーID（外部キー、NOT NULL）',
    pages: '-',
    relatedTables: 'users.id',
  },
  {
    name: 'containerData',
    description: 'コンテナデータ（JSON形式、NOT NULL）',
    pages: '-',
    relatedTables: '-',
  },
];

export default function PageContainersTable() {
  return (
    <TableDetailCard
      id="table-page-containers"
      number=""
      tableName="pageContainers"
      tableNameJapanese="ページコンテナ"
      color="#696969"
      role="ユーザーごとのページコンテナ情報を保存します。"
      columns={columns}
    />
  );
}
