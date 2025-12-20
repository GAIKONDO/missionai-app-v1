'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: '主キー',
    pages: '/organization/detail/meeting, /rag-search, /knowledge-graph',
    relatedTables: 'ChromaDB: relations_{orgId}.id',
  },
  {
    name: 'topicId',
    description: <>トピックID（外部キー、NOT NULL、形式: <code>{'{meetingNoteId}-topic-{topicId}'}</code>）</>,
    pages: '/organization/detail/meeting, /rag-search, /knowledge-graph',
    relatedTables: 'topics.id',
  },
  {
    name: 'sourceEntityId',
    description: '起点エンティティID（外部キー、NULL可能）',
    pages: '/organization/detail/meeting, /rag-search, /knowledge-graph',
    relatedTables: 'entities.id, ChromaDB: relations_{orgId}.metadata.sourceEntityId, sourceEntityName',
  },
  {
    name: 'targetEntityId',
    description: '終点エンティティID（外部キー、NULL可能）',
    pages: '/organization/detail/meeting, /rag-search, /knowledge-graph',
    relatedTables: 'entities.id, ChromaDB: relations_{orgId}.metadata.targetEntityId, targetEntityName',
  },
  {
    name: 'relationType',
    description: 'リレーションタイプ（NOT NULL、例: "works_for"、"partners_with"）',
    pages: '/organization/detail/meeting, /rag-search, /knowledge-graph',
    relatedTables: 'ChromaDB: relations_{orgId}.metadata.relationType',
  },
  {
    name: 'description',
    description: 'リレーションの説明（埋め込み生成の元データ）',
    pages: '/organization/detail/meeting, /rag-search',
    relatedTables: 'ChromaDB: relations_{orgId}.metadata.description（埋め込みベクトルとして保存）',
  },
  {
    name: 'confidence',
    description: '信頼度（0.0-1.0）',
    pages: '/organization/detail/meeting, /knowledge-graph',
    relatedTables: '-',
  },
  {
    name: 'metadata',
    description: '追加メタデータ（JSONオブジェクト）',
    pages: '/organization/detail/meeting, /rag-search',
    relatedTables: 'ChromaDB: relations_{orgId}.metadata',
  },
  {
    name: 'organizationId',
    description: '組織ID（外部キー、NULL可能）',
    pages: '/organization/detail/meeting, /rag-search, /knowledge-graph',
    relatedTables: 'organizations.id, ChromaDB: relations_{orgId}（コレクション名に使用）',
  },
  {
    name: 'companyId',
    description: '事業会社ID（外部キー、NULL可能）',
    pages: '/companies/detail, /rag-search, /knowledge-graph',
    relatedTables: 'companies.id',
  },
  {
    name: 'searchableText',
    description: '検索用テキスト（自動生成、relationType + description）',
    pages: '/rag-search',
    relatedTables: '-',
  },
  {
    name: 'chromaSynced',
    description: 'ChromaDB同期状態（0: 未同期、1: 同期済み）',
    pages: '/knowledge-graph（埋め込み再生成時）',
    relatedTables: 'ChromaDB: relations_{orgId}（同期状態を追跡）',
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

export default function RelationsTable() {
  return (
    <TableDetailCard
      id="table-relations"
      number="⑦"
      tableName="relations"
      tableNameJapanese="リレーション"
      color="#BD10E0"
      role="エンティティ間の関係性を表すリレーション（エッジ）を保存します。各リレーションは特定のトピックに紐づきます。埋め込みベクトルはChromaDBに保存されます。"
      columns={columns}
      constraints={<><code>organizationId</code>と<code>companyId</code>のいずれか一方のみがNULLでない必要があります（CHECK制約）。</>}
    />
  );
}
