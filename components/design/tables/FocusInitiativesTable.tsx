'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: '主キー',
    pages: '/organization/detail, /organization/initiative, /analytics',
    relatedTables: 'themes.initiativeIds[]（JSON配列）',
  },
  {
    name: 'organizationId',
    description: '組織ID（外部キー、NULL可能）',
    pages: '/organization/detail, /organization/initiative, /analytics',
    relatedTables: 'organizations.id',
  },
  {
    name: 'companyId',
    description: '事業会社ID（外部キー、NULL可能）',
    pages: '/companies/detail, /analytics',
    relatedTables: 'companies.id',
  },
  {
    name: 'title',
    description: '施策タイトル（NOT NULL）',
    pages: '/organization/detail, /organization/initiative, /analytics',
    relatedTables: '-',
  },
  {
    name: 'description',
    description: '施策の説明',
    pages: '/organization/detail, /organization/initiative',
    relatedTables: '-',
  },
  {
    name: 'content',
    description: '施策の内容',
    pages: '/organization/initiative',
    relatedTables: '-',
  },
  {
    name: 'themeIds',
    description: 'テーマIDリスト（JSON配列）',
    pages: '/organization/initiative',
    relatedTables: 'themes.id（themes.initiativeIds[]と相互参照）',
  },
  {
    name: 'topicIds',
    description: 'トピックIDリスト（JSON配列、個別トピックを紐づけ）',
    pages: '/organization/initiative, /analytics',
    relatedTables: 'topics.topicId（topics.idではない）',
  },
];

export default function FocusInitiativesTable() {
  return (
    <TableDetailCard
      id="table-focus-initiatives"
      number="⑩"
      tableName="focusInitiatives"
      tableNameJapanese="注力施策"
      color="#FF6B6B"
      role="組織または事業会社の注力施策情報を保存します。"
      columns={columns}
      constraints={<><code>organizationId</code>と<code>companyId</code>のいずれか一方のみがNULLでない必要があります（CHECK制約）。</>}
    />
  );
}
