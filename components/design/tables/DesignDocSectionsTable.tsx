'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: '主キー',
    pages: '/design',
    relatedTables: 'designDocSectionRelations.sourceSectionId, designDocSectionRelations.targetSectionId, ChromaDB: design_docs.id',
  },
  {
    name: 'title',
    description: 'セクションタイトル（NOT NULL）',
    pages: '/design',
    relatedTables: '-',
  },
  {
    name: 'content',
    description: 'セクションの内容（NOT NULL、埋め込み生成の元データ）',
    pages: '/design',
    relatedTables: 'ChromaDB: design_docs（埋め込みベクトルとして保存）',
  },
  {
    name: 'tags',
    description: 'タグ（JSON配列）',
    pages: '/design',
    relatedTables: '-',
  },
  {
    name: 'relatedSections',
    description: '関連セクション（JSON配列、designDocSectionRelationsと連動）',
    pages: '/design',
    relatedTables: 'designDocSectionRelations',
  },
];

export default function DesignDocSectionsTable() {
  return (
    <TableDetailCard
      id="table-design-doc-sections"
      number="⑯"
      tableName="designDocSections"
      tableNameJapanese="システム設計ドキュメントセクション"
      color="#95A5A6"
      role="システム設計ドキュメントのセクション情報を保存します。埋め込みベクトルはChromaDBに保存されます。"
      columns={columns}
    />
  );
}
