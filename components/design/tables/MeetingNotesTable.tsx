'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: <>主キー（例: <code>init_miwceusf_lmthnq2ks</code>）</>,
    pages: '/organization/detail, /organization/detail/meeting, /companies/detail, /organization/initiative, /rag-search',
    relatedTables: 'topics.meetingNoteId, topics.id（形式: meetingNoteId-topic-topicId）',
  },
  {
    name: 'organizationId',
    description: '組織ID（外部キー、NULL可能）',
    pages: '/organization/detail, /organization/detail/meeting, /rag-search',
    relatedTables: 'organizations.id',
  },
  {
    name: 'companyId',
    description: '事業会社ID（外部キー、NULL可能）',
    pages: '/companies/detail, /rag-search',
    relatedTables: 'companies.id',
  },
  {
    name: 'title',
    description: '議事録タイトル（NOT NULL）',
    pages: '/organization/detail, /organization/detail/meeting, /companies/detail',
    relatedTables: '-',
  },
  {
    name: 'description',
    description: '議事録の説明',
    pages: '/organization/detail, /organization/detail/meeting',
    relatedTables: '-',
  },
  {
    name: 'content',
    description: '議事録の内容（JSON形式、月別のトピック情報を含む）',
    pages: '/organization/detail/meeting',
    relatedTables: 'topics（content内のtopics[]配列にtopicIdを保存）',
  },
  {
    name: 'chromaSynced',
    description: 'ChromaDB同期状態（0: 未同期、1: 同期済み）',
    pages: '/knowledge-graph（埋め込み再生成時）',
    relatedTables: '-',
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
];

export default function MeetingNotesTable() {
  return (
    <TableDetailCard
      id="table-meeting-notes"
      number="④"
      tableName="meetingNotes"
      tableNameJapanese="議事録"
      color="#E53935"
      role="組織または事業会社の議事録情報を保存します。各議事録には複数のトピックが含まれます。"
      columns={columns}
      constraints={<><code>organizationId</code>と<code>companyId</code>のいずれか一方のみがNULLでない必要があります（CHECK制約）。</>}
    />
  );
}
