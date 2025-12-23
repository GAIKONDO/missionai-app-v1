'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: '主キー',
    pages: '/organization/detail',
    relatedTables: '-',
  },
  {
    name: 'organizationId',
    description: '組織ID（外部キー、NOT NULL）',
    pages: '/organization/detail',
    relatedTables: 'organizations.id',
  },
  {
    name: 'introduction',
    description: '組織の紹介文',
    pages: '/organization/detail',
    relatedTables: '-',
  },
  {
    name: 'focusAreas',
    description: '注力領域',
    pages: '/organization/detail',
    relatedTables: '-',
  },
  {
    name: 'meetingNotes',
    description: '議事録情報（JSON形式）',
    pages: '/organization/detail',
    relatedTables: '-',
  },
];

export default function OrganizationContentsTable() {
  return (
    <TableDetailCard
      id="table-organization-contents"
      number="⑤"
      tableName="organizationContents"
      tableNameJapanese="組織コンテンツ"
      color="#6B8E23"
      role="組織の紹介文、注力領域、議事録情報などのコンテンツを保存します。"
      columns={columns}
    />
  );
}
