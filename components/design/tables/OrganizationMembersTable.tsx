'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: '主キー',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'organizationId',
    description: '組織ID（外部キー、NOT NULL）',
    pages: '/organization, /organization/detail',
    relatedTables: 'organizations.id',
  },
  {
    name: 'name',
    description: 'メンバー名（NOT NULL）',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'position',
    description: '役職',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'nameRomaji',
    description: 'ローマ字名',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'department',
    description: '部署',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'extension',
    description: '内線番号',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'companyPhone',
    description: '会社電話番号',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'mobilePhone',
    description: '携帯電話番号',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'email',
    description: 'メールアドレス',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'itochuEmail',
    description: '伊藤忠メールアドレス',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'teams',
    description: 'Teams情報',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'employeeType',
    description: '従業員タイプ',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'roleName',
    description: '役割名',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'indicator',
    description: 'インジケーター',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'location',
    description: '所在地',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'floorDoorNo',
    description: 'フロア・ドア番号',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'previousName',
    description: '以前の名前',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
];

export default function OrganizationMembersTable() {
  return (
    <TableDetailCard
      id="table-organization-members"
      number="④"
      tableName="organizationMembers"
      tableNameJapanese="組織メンバー"
      color="#9C27B0"
      role="組織に所属するメンバー情報を保存します。"
      columns={columns}
    />
  );
}
