'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * ChromaDBとはセクション
 */
export function ChromaDBOverviewSection() {
  return (
    <CollapsibleSection 
      title="ChromaDBとは" 
      defaultExpanded={false}
      id="chromadb-overview-section"
    >
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          ChromaDBとは
        </h4>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
          <strong>ChromaDB</strong>は、オープンソースの埋め込みベクトルデータベースです。
          本アプリケーションでは、セマンティック検索とRAG（Retrieval-Augmented Generation）を実現するためにChromaDBを使用しています。
        </p>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
          ChromaDBは、テキストを埋め込みベクトル（高次元の数値配列）に変換し、ベクトル間の類似度を計算することで、意味的な類似性に基づく検索を可能にします。
          キーワードが一致しなくても、意味が近い情報を検索できるため、自然言語での検索に適しています。
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
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>ベクトルデータの保存</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>エンティティ、リレーション、トピック、設計ドキュメントの埋め込みベクトルを保存</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>1536次元の浮動小数点配列（OpenAI text-embedding-3-small）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>セマンティック検索</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>コサイン類似度を使用した意味的な類似性に基づく検索</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>クエリベクトルと類似度の高いベクトルを検索</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>コレクション管理</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織ごとにコレクションを分離し、データを管理</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>entities_{'{'}organizationId{'}'}、relations_{'{'}organizationId{'}'}、topics_{'{'}organizationId{'}'}など</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>RAG検索の実現</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>RAG検索において、関連情報を高速に検索</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>クエリに類似するエンティティ、リレーション、トピックを検索</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          ChromaDBとSQLiteの連携
        </h4>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
          ChromaDBとSQLiteは相互補完的に動作します：
        </p>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
          <li><strong>ChromaDB:</strong> ベクトルデータ（埋め込みベクトル）を保存し、セマンティック検索を提供</li>
          <li><strong>SQLite:</strong> 構造化データ（メタデータ、リレーション、ID管理など）を保存し、高速な検索・更新を提供</li>
          <li><strong>連携:</strong> ChromaDBで類似度検索を行い、取得したIDを使用してSQLiteから詳細情報を取得</li>
        </ul>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          コレクション構造
        </h4>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
          ChromaDBでは、データをコレクションという単位で管理します。本アプリケーションでは、以下のコレクションを使用しています：
        </p>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
          <li><strong>entities_{'{'}organizationId{'}'}:</strong> エンティティの埋め込みベクトル（組織ごと）</li>
          <li><strong>relations_{'{'}organizationId{'}'}:</strong> リレーションの埋め込みベクトル（組織ごと）</li>
          <li><strong>topics_{'{'}organizationId{'}'}:</strong> トピックの埋め込みベクトル（組織ごと）</li>
          <li><strong>design_docs:</strong> システム設計ドキュメントの埋め込みベクトル（組織を跨いで共有）</li>
        </ul>
      </div>

      <div style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #3B82F6' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>💡 ChromaDBの特徴</h4>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
          <li><strong>セマンティック検索:</strong> 意味的な類似性に基づく検索が可能</li>
          <li><strong>高速な類似度計算:</strong> コサイン類似度を使用した高速なベクトル検索</li>
          <li><strong>スケーラブル:</strong> 大量のベクトルデータを効率的に管理</li>
          <li><strong>メタデータ管理:</strong> ベクトルと一緒にメタデータを保存可能</li>
          <li><strong>組織分離:</strong> コレクションを組織ごとに分離し、データを安全に管理</li>
        </ul>
      </div>
    </CollapsibleSection>
  );
}

