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
    name: 'companyId',
    description: '事業会社ID（外部キー、NOT NULL）',
    pages: '/organization/detail',
    relatedTables: 'companies.id',
  },
  {
    name: 'displayOrder',
    description: '表示順序（整数）',
    pages: '/organization/detail',
    relatedTables: '-',
  },
];

export default function OrganizationCompanyDisplayTable() {
  return (
    <TableDetailCard
      id="table-organization-company-display"
      number="⑧"
      tableName="organizationCompanyDisplay"
      tableNameJapanese="組織・事業会社表示"
      color="#9370DB"
      role="組織ページで表示する事業会社の順序を管理します。"
      columns={columns}
    />
  );
}
