'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: <>主キー（形式: <code>{'{meetingNoteId}-topic-{topicId}'}</code>）</>,
    pages: '/organization/detail/meeting, /rag-search, /knowledge-graph, /analytics',
    relatedTables: 'relations.topicId, entities.metadata.topicId, focusInitiatives.topicIds[]',
  },
  {
    name: 'topicId',
    description: <>トピックのユニークID（例: <code>init_mj0b1gma_hywcwrspw</code>）、ChromaDBのIDとしても使用</>,
    pages: '/organization/detail/meeting, /organization/initiative, /rag-search, /knowledge-graph, /analytics',
    relatedTables: 'ChromaDB: topics_{orgId}.id, relations.topicId（形式変換後）, entities.metadata.topicId, focusInitiatives.topicIds[]',
  },
  {
    name: 'meetingNoteId',
    description: '議事録ID（外部キー、NOT NULL）',
    pages: '/organization/detail/meeting, /rag-search',
    relatedTables: 'meetingNotes.id',
  },
  {
    name: 'organizationId',
    description: '組織ID（外部キー、NULL可能）',
    pages: '/organization/detail/meeting, /rag-search, /knowledge-graph, /analytics',
    relatedTables: 'organizations.id',
  },
  {
    name: 'companyId',
    description: '事業会社ID（外部キー、NULL可能）',
    pages: '/companies/detail, /rag-search, /knowledge-graph',
    relatedTables: 'companies.id',
  },
  {
    name: 'title',
    description: 'トピックタイトル（NOT NULL）',
    pages: '/organization/detail/meeting, /organization/initiative, /rag-search, /knowledge-graph, /analytics',
    relatedTables: '-',
  },
  {
    name: 'description',
    description: 'トピックの説明',
    pages: '/organization/detail/meeting, /rag-search',
    relatedTables: '-',
  },
  {
    name: 'content',
    description: 'トピックの内容（埋め込み生成の元データ）',
    pages: '/organization/detail/meeting, /rag-search',
    relatedTables: 'ChromaDB: topics_{orgId}（埋め込みベクトルとして保存）',
  },
  {
    name: 'semanticCategory',
    description: 'セマンティックカテゴリ（例: "戦略"、"実行"）',
    pages: '/organization/detail/meeting, /rag-search, /analytics',
    relatedTables: '-',
  },
  {
    name: 'keywords',
    description: 'キーワード（JSON配列）',
    pages: '/organization/detail/meeting, /rag-search',
    relatedTables: '-',
  },
  {
    name: 'tags',
    description: 'タグ（JSON配列）',
    pages: '/organization/detail/meeting, /rag-search',
    relatedTables: '-',
  },
  {
    name: 'contentSummary',
    description: 'コンテンツの要約（自動生成、最大200文字、RAG検索で優先的に使用）',
    pages: '/rag-search, /knowledge-graph',
    relatedTables: 'ChromaDB: topics_{orgId}.metadata.contentSummary',
  },
  {
    name: 'searchableText',
    description: '検索用テキスト（自動生成、title + description + contentの先頭200文字）',
    pages: '/rag-search',
    relatedTables: '-',
  },
  {
    name: 'chromaSynced',
    description: 'ChromaDB同期状態（0: 未同期、1: 同期済み）',
    pages: '/knowledge-graph（埋め込み再生成時）',
    relatedTables: 'ChromaDB: topics_{orgId}（同期状態を追跡）',
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

export default function TopicsTable() {
  return (
    <TableDetailCard
      id="table-topics"
      number="⑪"
      tableName="topics"
      tableNameJapanese="トピック"
      color="#7ED321"
      role="議事録内のトピック情報のメタデータを保存します。埋め込みベクトルはChromaDBに保存されます。"
      columns={columns}
      constraints={<><code>organizationId</code>と<code>companyId</code>のいずれか一方のみがNULLでない必要があります（CHECK制約）。</>}
    />
  );
}
