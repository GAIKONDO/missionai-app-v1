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
    name: 'maxLevels',
    description: '最大階層レベル数（NOT NULL）',
    pages: '-',
    relatedTables: '-',
  },
  {
    name: 'levels',
    description: '階層レベル情報（JSON形式、NOT NULL）',
    pages: '-',
    relatedTables: '-',
  },
];

export default function ThemeHierarchyConfigsTable() {
  return (
    <TableDetailCard
      id="table-theme-hierarchy-configs"
      number="⑮"
      tableName="themeHierarchyConfigs"
      tableNameJapanese="テーマ階層設定"
      color="#8B7355"
      role="テーマの階層構造設定を保存します（A2C100用）。"
      columns={columns}
    />
  );
}
