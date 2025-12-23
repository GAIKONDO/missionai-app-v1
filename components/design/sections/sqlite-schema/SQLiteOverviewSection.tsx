'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * SQLiteとはセクション
 */
export function SQLiteOverviewSection() {
  return (
    <CollapsibleSection 
      title="SQLiteとは" 
      defaultExpanded={false}
      id="sqlite-overview-section"
    >
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          SQLiteとは
        </h4>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
          <strong>SQLite</strong>は、軽量でサーバーレスなリレーショナルデータベース管理システム（RDBMS）です。
          本アプリケーションでは、構造化データの保存と管理にSQLiteを使用しています。
        </p>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
          SQLiteは、ファイルベースのデータベースで、サーバーを必要とせず、アプリケーションに組み込んで使用できます。
          トランザクション管理、ACID準拠、高速なクエリ処理などの特徴を持ち、デスクトップアプリケーションやモバイルアプリケーションで広く使用されています。
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          本アプリケーションでの役割
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>役割</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>説明</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>保存データ例</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>構造化データの保存</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>メタデータ、リレーション、ID管理など、構造化されたデータを保存</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>エンティティ情報、リレーション情報、トピック情報など</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>高速な検索・更新</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>インデックスを使用した高速な構造化データの検索・更新</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>IDによる検索、条件によるフィルタリングなど</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>トランザクション管理</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>データの整合性を保証するトランザクション管理</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>複数テーブルの同時更新、ロールバックなど</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>ID管理</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>エンティティ、リレーション、トピックなどのIDを管理</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>entityId、relationId、topicIdなど</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          SQLiteとChromaDBの連携
        </h4>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
          SQLiteとChromaDBは相互補完的に動作します：
        </p>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
          <li><strong>SQLite:</strong> 構造化データ（メタデータ、リレーション、ID管理など）を保存し、高速な検索・更新を提供</li>
          <li><strong>ChromaDB:</strong> ベクトルデータ（埋め込みベクトル）を保存し、セマンティック検索を提供</li>
          <li><strong>連携:</strong> ChromaDBで類似度検索を行い、取得したIDを使用してSQLiteから詳細情報を取得</li>
        </ul>
      </div>

      <div style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #3B82F6' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>💡 SQLiteの特徴</h4>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
          <li><strong>サーバーレス:</strong> サーバーを必要とせず、ファイルベースで動作</li>
          <li><strong>軽量:</strong> 小さなフットプリントで、アプリケーションに組み込みやすい</li>
          <li><strong>ACID準拠:</strong> トランザクションの整合性を保証</li>
          <li><strong>高速:</strong> インデックスを使用した高速なクエリ処理</li>
          <li><strong>標準SQL:</strong> 標準的なSQL構文を使用可能</li>
        </ul>
      </div>
    </CollapsibleSection>
  );
}

