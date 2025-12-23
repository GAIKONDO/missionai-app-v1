'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: <>主キー（例: <code>init_miwceusf_lmthnq2ks</code>）</>,
    pages: '/organization, /organization/detail, /companies, /analytics, /knowledge-graph',
    relatedTables: 'organizationMembers.organizationId, meetingNotes.organizationId, entities.organizationId, topics.organizationId, relations.organizationId, companies.organizationId, focusInitiatives.organizationId, organizationContents.organizationId',
  },
  {
    name: 'parentId',
    description: '親組織のID（自己参照外部キー、階層構造を表現）',
    pages: '/organization, /organization/detail',
    relatedTables: 'organizations.id（自己参照）',
  },
  {
    name: 'name',
    description: '組織名（NOT NULL）',
    pages: '/organization, /organization/detail, /companies, /analytics',
    relatedTables: '-',
  },
  {
    name: 'level',
    description: '階層レベル（0=ルート、1=部門、2=チームなど）',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'levelName',
    description: 'レベル名（例: "部門"、"チーム"）',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
  {
    name: 'title',
    description: '組織タイトル',
    pages: '/organization/detail',
    relatedTables: '-',
  },
  {
    name: 'description',
    description: '組織の説明',
    pages: '/organization/detail',
    relatedTables: '-',
  },
  {
    name: 'position',
    description: '表示順序',
    pages: '/organization, /organization/detail',
    relatedTables: '-',
  },
];

export default function OrganizationsTable() {
  return (
    <TableDetailCard
      id="table-organizations"
      number="③"
      tableName="organizations"
      tableNameJapanese="組織"
      color="#4A90E2"
      role="組織階層を管理するマスターテーブル。親子関係で階層構造を表現します。"
      columns={columns}
    />
  );
}
