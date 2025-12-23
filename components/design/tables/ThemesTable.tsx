'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: '主キー',
    pages: '/organization/detail, /organization/initiative',
    relatedTables: 'focusInitiatives.themeIds[]（JSON配列）',
  },
  {
    name: 'title',
    description: 'テーマタイトル（NOT NULL）',
    pages: '/organization/detail, /organization/initiative',
    relatedTables: '-',
  },
  {
    name: 'description',
    description: 'テーマの説明',
    pages: '/organization/detail, /organization/initiative',
    relatedTables: '-',
  },
  {
    name: 'initiativeIds',
    description: '注力施策IDリスト（JSON配列、focusInitiatives.themeIds[]と相互参照）',
    pages: '/organization/detail, /organization/initiative',
    relatedTables: 'focusInitiatives.id',
  },
  {
    name: 'position',
    description: '表示順序',
    pages: '/organization/detail, /organization/initiative',
    relatedTables: '-',
  },
];

export default function ThemesTable() {
  return (
    <TableDetailCard
      id="table-themes"
      number="⑭"
      tableName="themes"
      tableNameJapanese="テーマ"
      color="#4ECDC4"
      role="テーマ情報を保存します。複数の注力施策をグループ化します。"
      columns={columns}
    />
  );
}
