'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: '主キー',
    pages: '/companies, /companies/detail, /organization/detail',
    relatedTables: 'meetingNotes.companyId, entities.companyId, topics.companyId, relations.companyId, focusInitiatives.companyId, companyContents.companyId, organizationCompanyDisplay.companyId',
  },
  {
    name: 'code',
    description: '会社コード（UNIQUE、NOT NULL）',
    pages: '/companies, /companies/detail',
    relatedTables: '-',
  },
  {
    name: 'name',
    description: '会社名（NOT NULL）',
    pages: '/companies, /companies/detail',
    relatedTables: '-',
  },
  {
    name: 'organizationId',
    description: '組織ID（外部キー、NOT NULL）',
    pages: '/companies, /companies/detail, /organization/detail',
    relatedTables: 'organizations.id',
  },
  {
    name: 'category',
    description: 'カテゴリ（NOT NULL）',
    pages: '/companies, /companies/detail',
    relatedTables: '-',
  },
  {
    name: 'region',
    description: '地域（NOT NULL）',
    pages: '/companies, /companies/detail',
    relatedTables: '-',
  },
];

export default function CompaniesTable() {
  return (
    <TableDetailCard
      id="table-companies"
      number="⑥"
      tableName="companies"
      tableNameJapanese="事業会社"
      color="#50C878"
      role="事業会社情報を保存します。"
      columns={columns}
      constraints="その他のカラム: nameShort, company, division, department, position など"
    />
  );
}
