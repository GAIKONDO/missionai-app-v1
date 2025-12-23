'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * 役割分担セクション
 */
export function RoleAssignmentSection() {
  return (
    <CollapsibleSection 
      title="役割分担" 
      defaultExpanded={false}
      id="database-role-assignment-section"
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px',
          backgroundColor: 'var(--color-background)'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#1F2937', borderBottom: '2px solid var(--color-border-color)' }}>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                fontWeight: 600,
                color: '#FFFFFF',
                border: '1px solid var(--color-border-color)',
                width: '15%'
              }}>
                項目
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                fontWeight: 600,
                color: '#FFFFFF',
                border: '1px solid var(--color-border-color)',
                width: '20%'
              }}>
                SQLite
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                fontWeight: 600,
                color: '#FFFFFF',
                border: '1px solid var(--color-border-color)',
                width: '20%'
              }}>
                ChromaDB
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                fontWeight: 600,
                color: '#FFFFFF',
                border: '1px solid var(--color-border-color)',
                width: '45%'
              }}>
                説明
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              // 基本情報
              {
                item: '役割',
                sqlite: 'メタデータ、リレーション、ID管理など、構造化されたデータを保存',
                chromadb: 'エンティティ、リレーション、トピックの埋め込みベクトルを保存し、類似度検索を提供',
                description: 'SQLiteは構造化データ、ChromaDBはベクトルデータをそれぞれ担当'
              },
              {
                item: '特徴',
                sqlite: '高速な構造化データの検索・更新に最適、トランザクション管理可能',
                chromadb: '組織ごとにコレクションを分離、セマンティック検索とRAGを実現',
                description: 'それぞれの特徴と用途'
              },
              // データタイプ
              {
                item: 'エンティティ情報',
                sqlite: '名前、タイプ、メタデータ、組織IDなど',
                chromadb: 'エンティティ名とメタデータのベクトル表現',
                description: 'SQLiteにメタデータ、ChromaDBにベクトル表現を保存'
              },
              {
                item: 'リレーション情報',
                sqlite: 'エンティティ間の関係、トピックID、リレーションタイプなど',
                chromadb: 'リレーションタイプと説明のベクトル表現',
                description: 'SQLiteに構造化データ、ChromaDBにベクトル表現を保存'
              },
              {
                item: 'トピック情報',
                sqlite: 'トピックの基本情報、メタデータ、キーワードなど',
                chromadb: 'トピックのタイトル、コンテンツ、メタデータのベクトル表現',
                description: 'SQLiteにメタデータ、ChromaDBにベクトル表現を保存'
              },
              {
                item: '設計ドキュメント',
                sqlite: 'セクション情報、階層構造、関連性など',
                chromadb: 'システム設計ドキュメントセクションのベクトル表現（組織を跨いで共有）',
                description: 'SQLiteに構造化データ、ChromaDBにベクトル表現を保存（design_docsコレクション）'
              },
              {
                item: '組織・メンバー情報',
                sqlite: '組織階層、メンバー情報、議事録など',
                chromadb: '-',
                description: 'SQLiteのみで管理（構造化データのみ）'
              },
              // ChromaDB詳細
              {
                item: 'コレクション命名規則',
                sqlite: '-',
                chromadb: (
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li><code>{'entities_{organizationId}'}</code> - エンティティ埋め込み（組織ごと）</li>
                    <li><code>{'relations_{organizationId}'}</code> - リレーション埋め込み（組織ごと）</li>
                    <li><code>{'topics_{organizationId}'}</code> - トピック埋め込み（組織ごと）</li>
                    <li><code>{'design_docs'}</code> - 設計ドキュメント埋め込み（組織を跨いで共有）</li>
                  </ul>
                ),
                description: 'ChromaDBのコレクション命名規則'
              },
              // 連携
              {
                item: 'ID管理',
                sqlite: 'エンティティやリレーションのIDを管理',
                chromadb: 'SQLiteのIDをメタデータとして保存',
                description: 'SQLiteでIDを管理し、ChromaDBではそのIDをメタデータとして保存'
              },
              {
                item: '検索フロー',
                sqlite: '詳細情報を取得',
                chromadb: '類似度検索を実行',
                description: 'ChromaDBで類似度検索 → SQLiteで詳細情報を取得'
              },
              {
                item: 'データ整合性',
                sqlite: 'マスターデータとして機能',
                chromadb: '検索用インデックスとして機能',
                description: 'SQLiteがマスターデータ、ChromaDBが検索用インデックスとして機能'
              }
            ].map((row, index) => (
              <tr key={row.item} style={{ backgroundColor: index % 2 === 0 ? 'var(--color-background)' : 'var(--color-surface)', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600, color: 'var(--color-text)' }}>
                  {index + 1}. {row.item}
                </td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                  {row.sqlite}
                </td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                  {row.chromadb}
                </td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                  {row.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  );
}

