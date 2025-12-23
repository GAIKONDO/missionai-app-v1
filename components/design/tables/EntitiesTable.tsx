'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: <>主キー（形式: <code>{'entity_{timestamp}_{random}'}</code>）</>,
    pages: '/organization/detail/meeting, /rag-search, /knowledge-graph, /companies/detail',
    relatedTables: 'relations.sourceEntityId, relations.targetEntityId, ChromaDB: entities_{orgId}.id',
  },
  {
    name: 'name',
    description: 'エンティティ名（NOT NULL、例: "トヨタ自動車"）',
    pages: '/organization/detail/meeting, /rag-search, /knowledge-graph, /companies/detail',
    relatedTables: 'ChromaDB: entities_{orgId}.metadata.name',
  },
  {
    name: 'type',
    description: 'エンティティタイプ（NOT NULL、例: "organization"、"person"、"product"）',
    pages: '/organization/detail/meeting, /rag-search, /knowledge-graph',
    relatedTables: 'ChromaDB: entities_{orgId}.metadata.type',
  },
  {
    name: 'aliases',
    description: '別名リスト（JSON配列）',
    pages: '/organization/detail/meeting, /rag-search',
    relatedTables: 'ChromaDB: entities_{orgId}.metadata.aliases',
  },
  {
    name: 'metadata',
    description: <>メタデータ（JSONオブジェクト、<code>topicId</code>を含む）</>,
    pages: '/organization/detail/meeting, /rag-search, /knowledge-graph',
    relatedTables: 'topics.topicId（metadata.topicId経由）, ChromaDB: entities_{orgId}.metadata',
  },
  {
    name: 'organizationId',
    description: '組織ID（外部キー、NULL可能）',
    pages: '/organization/detail/meeting, /rag-search, /knowledge-graph',
    relatedTables: 'organizations.id, ChromaDB: entities_{orgId}（コレクション名に使用）',
  },
  {
    name: 'companyId',
    description: '事業会社ID（外部キー、NULL可能）',
    pages: '/companies/detail, /rag-search, /knowledge-graph',
    relatedTables: 'companies.id',
  },
  {
    name: 'searchableText',
    description: '検索用テキスト（自動生成、name + aliases + metadataから抽出）',
    pages: '/rag-search',
    relatedTables: '-',
  },
  {
    name: 'displayName',
    description: '表示名（自動生成、name + role）',
    pages: '/organization/detail/meeting, /knowledge-graph',
    relatedTables: '-',
  },
  {
    name: 'chromaSynced',
    description: 'ChromaDB同期状態（0: 未同期、1: 同期済み）',
    pages: '/knowledge-graph（埋め込み再生成時）, /rag-search',
    relatedTables: 'ChromaDB: entities_{orgId}（同期状態を追跡）',
  },
  {
    name: 'chromaSyncError',
    description: '同期エラーメッセージ（NULL: エラーなし）',
    pages: '/knowledge-graph（埋め込み再生成時）',
    relatedTables: '-',
  },
  {
    name: 'lastChromaSyncAttempt',
    description: '最後の同期試行日時',
    pages: '/knowledge-graph（埋め込み再生成時）',
    relatedTables: '-',
  },
  {
    name: 'lastSearchDate',
    description: '最後に検索された日時（検索頻度追跡用）',
    pages: '/rag-search（検索実行時に自動更新）',
    relatedTables: '-',
  },
  {
    name: 'searchCount',
    description: '検索された回数（検索頻度追跡用、デフォルト: 0、スコアリングブーストに使用）',
    pages: '/rag-search（検索実行時に自動更新）',
    relatedTables: '-',
  },
];

export default function EntitiesTable() {
  return (
    <TableDetailCard
      id="table-entities"
      number="⑨"
      tableName="entities"
      tableNameJapanese="エンティティ"
      color="#F5A623"
      role="ナレッジグラフのノード（人物、組織、製品など）を表すエンティティ情報を保存します。埋め込みベクトルはChromaDBに保存されます。"
      columns={columns}
      constraints={<><code>organizationId</code>と<code>companyId</code>のいずれか一方のみがNULLでない必要があります（CHECK制約）。</>}
    />
  );
}
