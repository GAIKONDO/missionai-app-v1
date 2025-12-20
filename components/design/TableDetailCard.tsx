'use client';

import React from 'react';

// 連動テーブルをバッジ形式で表示するヘルパー関数
export function renderRelatedTables(tablesText: string) {
  if (!tablesText || tablesText === '-') {
    return <span style={{ color: 'var(--color-text-light)', fontStyle: 'italic' }}>-</span>;
  }

  // テキストを解析してテーブル名を抽出
  const badges: Array<{ name: string; type: 'table' | 'chroma' | 'other' }> = [];
  
  // カンマで分割
  const parts = tablesText.split(',').map(p => p.trim());
  
  for (const part of parts) {
    // "tableName.columnName" 形式からテーブル名を抽出
    if (part.includes('.')) {
      const tableName = part.split('.')[0].trim();
      if (tableName && !badges.find(b => b.name === tableName)) {
        badges.push({ name: tableName, type: 'table' });
      }
    }
    // "ChromaDB: topics_{orgId}" 形式から "ChromaDB" と "topics" を抽出
    else if (part.includes('ChromaDB:')) {
      if (!badges.find(b => b.name === 'ChromaDB')) {
        badges.push({ name: 'ChromaDB', type: 'chroma' });
      }
      // topics_{orgId} や topics_{'{orgId}'} から topics を抽出
      const chromaPart = part.replace('ChromaDB:', '').trim();
      // topics_{orgId} や topics_{'{orgId}'} の形式に対応
      const match = chromaPart.match(/^(\w+)[_\{]/);
      if (match && match[1] && !badges.find(b => b.name === match[1])) {
        badges.push({ name: match[1], type: 'chroma' });
      }
      // topics_{orgId}.id や topics_{orgId}.metadata の形式にも対応
      const dotMatch = chromaPart.match(/^(\w+)[_\{].*\./);
      if (dotMatch && dotMatch[1] && !badges.find(b => b.name === dotMatch[1])) {
        badges.push({ name: dotMatch[1], type: 'chroma' });
      }
    }
    // "topics（content内のtopics[]配列にtopicIdを保存）" のような形式
    else {
      const match = part.match(/^(\w+)/);
      if (match && match[1] && !badges.find(b => b.name === match[1])) {
        badges.push({ name: match[1], type: 'table' });
      }
    }
  }

  // バッジを表示
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
      {badges.map((badge, idx) => (
        <span
          key={idx}
          style={{
            fontSize: '11px',
            color: badge.type === 'chroma' ? '#7C3AED' : 'var(--color-text)',
            backgroundColor: badge.type === 'chroma' ? '#F3E8FF' : 'var(--color-surface)',
            padding: '3px 8px',
            borderRadius: '12px',
            border: `1px solid ${badge.type === 'chroma' ? '#C4B5FD' : 'var(--color-border-color)'}`,
            fontWeight: 500,
            fontFamily: 'monospace',
          }}
        >
          {badge.name}
        </span>
      ))}
      {badges.length === 0 && (
        <span style={{ color: 'var(--color-text-light)', fontSize: '12px' }}>{tablesText}</span>
      )}
    </div>
  );
}

// カラム定義の型
export interface ColumnDefinition {
  name: string;
  description: string | React.ReactNode;
  pages: string;
  relatedTables: string;
}

// テーブル詳細カードのProps
export interface TableDetailCardProps {
  number: string; // ①, ②, など
  tableName: string;
  tableNameJapanese: string;
  color: string; // カラードットの色
  role: string;
  columns: ColumnDefinition[];
  constraints?: string | React.ReactNode; // 制約などの追加情報
  id?: string; // スクロール用のID
}

// 共通スタイル
const styles = {
  card: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '12px',
    color: 'var(--color-text)',
    display: 'flex' as const,
    alignItems: 'center' as const,
  },
  content: {
    paddingLeft: '24px',
    borderLeft: '2px solid #e0e0e0',
  },
  colorDot: (color: string) => ({
    display: 'inline-block',
    width: '8px',
    height: '8px',
    backgroundColor: color,
    borderRadius: '50%',
    marginRight: '8px',
  }),
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
  },
  tableHeader: {
    backgroundColor: 'var(--color-border-color)',
    borderBottom: '2px solid var(--color-border-color)',
  },
  tableHeaderCell: {
    padding: '12px',
    textAlign: 'left' as const,
    fontWeight: 600,
    border: '1px solid var(--color-border-color)',
  },
  tableCell: {
    padding: '10px',
    border: '1px solid var(--color-border-color)',
  },
  tableCellMonospace: {
    padding: '10px',
    border: '1px solid var(--color-border-color)',
    fontFamily: 'monospace',
  },
  tableRowAlt: {
    backgroundColor: 'var(--color-background)',
  },
  constraints: {
    fontSize: '14px',
    color: 'var(--color-text-light)',
    fontStyle: 'italic' as const,
    marginTop: '12px',
    marginBottom: '8px',
  },
};

export default function TableDetailCard({
  number,
  tableName,
  tableNameJapanese,
  color,
  role,
  columns,
  constraints,
  id,
}: TableDetailCardProps) {
  return (
    <div id={id} style={styles.card}>
      <h4 style={styles.title}>
        <span style={styles.colorDot(color)}></span>
        {number} {tableName}（{tableNameJapanese}）
      </h4>
      <div style={styles.content}>
        <p style={{ marginBottom: '12px' }}>
          <strong>役割:</strong> {role}
        </p>
        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.tableHeaderCell}>カラム名</th>
                <th style={styles.tableHeaderCell}>解説</th>
                <th style={styles.tableHeaderCell}>使用されているページ</th>
                <th style={styles.tableHeaderCell}>連動するテーブル・コレクション</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((column, index) => (
                <tr key={index} style={index % 2 === 1 ? styles.tableRowAlt : undefined}>
                  <td style={styles.tableCellMonospace}>
                    <code>{column.name}</code>
                  </td>
                  <td style={styles.tableCell}>
                    {typeof column.description === 'string' ? column.description : column.description}
                  </td>
                  <td style={styles.tableCell}>{column.pages}</td>
                  <td style={styles.tableCell}>
                    {renderRelatedTables(column.relatedTables)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {constraints && (
          <p style={styles.constraints}>
            <strong>制約:</strong> {typeof constraints === 'string' ? constraints : constraints}
          </p>
        )}
      </div>
    </div>
  );
}
