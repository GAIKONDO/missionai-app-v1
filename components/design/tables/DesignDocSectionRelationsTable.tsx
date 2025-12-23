'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: '主キー',
    pages: '/design',
    relatedTables: '-',
  },
  {
    name: 'sourceSectionId',
    description: '起点セクションID（外部キー、NOT NULL）',
    pages: '/design',
    relatedTables: 'designDocSections.id',
  },
  {
    name: 'targetSectionId',
    description: '終点セクションID（外部キー、NOT NULL）',
    pages: '/design',
    relatedTables: 'designDocSections.id',
  },
  {
    name: 'relationType',
    description: 'リレーションタイプ（例: "references", "depends_on"）',
    pages: '/design',
    relatedTables: '-',
  },
];

export default function DesignDocSectionRelationsTable() {
  return (
    <TableDetailCard
      id="table-design-doc-section-relations"
      number="⑰"
      tableName="designDocSectionRelations"
      tableNameJapanese="設計ドキュメントセクションリレーション"
      color="#A8A8A8"
      role="設計ドキュメントセクション間の関係性を保存します。"
      columns={columns}
    />
  );
}
