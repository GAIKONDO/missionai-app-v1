'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: '主キー',
    pages: '/companies/detail',
    relatedTables: '-',
  },
  {
    name: 'companyId',
    description: '事業会社ID（外部キー、NOT NULL）',
    pages: '/companies/detail',
    relatedTables: 'companies.id',
  },
  {
    name: 'introduction',
    description: '事業会社の紹介文',
    pages: '/companies/detail',
    relatedTables: '-',
  },
  {
    name: 'focusBusinesses',
    description: '注力事業',
    pages: '/companies/detail',
    relatedTables: '-',
  },
  {
    name: 'capitalStructure',
    description: '資本構成（テキスト）',
    pages: '/companies/detail',
    relatedTables: '-',
  },
  {
    name: 'capitalStructureDiagram',
    description: '資本構成図（画像URLなど）',
    pages: '/companies/detail',
    relatedTables: '-',
  },
];

export default function CompanyContentsTable() {
  return (
    <TableDetailCard
      id="table-company-contents"
      number="⑦"
      tableName="companyContents"
      tableNameJapanese="事業会社コンテンツ"
      color="#32CD32"
      role="事業会社の紹介文、注力事業、資本構成などのコンテンツを保存します。"
      columns={columns}
    />
  );
}
