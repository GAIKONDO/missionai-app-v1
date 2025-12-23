'use client';

import TableDetailCard, { type ColumnDefinition } from '../TableDetailCard';

const columns: ColumnDefinition[] = [
  {
    name: 'id',
    description: '主キー',
    pages: '/settings',
    relatedTables: '-',
  },
  {
    name: 'provider',
    description: 'プロバイダー名（NOT NULL、例: "openai", "ollama"）',
    pages: '/settings',
    relatedTables: '-',
  },
  {
    name: 'apiKey',
    description: 'APIキー（暗号化して保存）',
    pages: '/settings',
    relatedTables: '-',
  },
  {
    name: 'defaultModel',
    description: 'デフォルトモデル名',
    pages: '/settings',
    relatedTables: '-',
  },
];

export default function AiSettingsTable() {
  return (
    <TableDetailCard
      id="table-ai-settings"
      number="⑱"
      tableName="aiSettings"
      tableNameJapanese="AI設定"
      color="#5F9EA0"
      role="AIプロバイダー（OpenAI、Ollamaなど）の設定情報を保存します。"
      columns={columns}
    />
  );
}
