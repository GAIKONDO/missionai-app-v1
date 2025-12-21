'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * メタデータ生成と人間の関与セクション
 */
export function MetadataGenerationSection() {
  return (
    <CollapsibleSection 
      title="メタデータ生成と人間の関与" 
      defaultExpanded={false}
      id="metadata-generation-section"
    >
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#4A90E2', borderRadius: '50%', marginRight: '8px' }}></span>
          AI生成によるメタデータ抽出
        </h4>
        <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0', marginBottom: '16px' }}>
          <p style={{ marginBottom: '12px' }}>
            <strong>プロセス:</strong> トピックのタイトルとコンテンツから、GPT-4o-miniなどのLLMを使用して自動的にエンティティとリレーションを抽出します。
          </p>
          <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
            <li><strong>入力:</strong> トピックのタイトル、コンテンツ、既存のエンティティ情報</li>
            <li><strong>AI処理:</strong> LLMがエンティティ（人物、組織、製品など）とリレーション（関係性）を抽出</li>
            <li><strong>出力:</strong> 構造化されたエンティティとリレーションのリスト（JSON形式）</li>
            <li><strong>人間の確認:</strong> ユーザーが生成結果を確認し、追加・削除・編集が可能</li>
          </ul>
          <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
            AI生成は効率的ですが、人間による確認と調整が重要です。
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#7ED321', borderRadius: '50%', marginRight: '8px' }}></span>
          手動入力によるメタデータ作成
        </h4>
        <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0', marginBottom: '16px' }}>
          <p style={{ marginBottom: '12px' }}>
            <strong>プロセス:</strong> ユーザーが直接エンティティやリレーションを作成・編集します。
          </p>
          <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
            <li><strong>エンティティ作成:</strong> 名前、タイプ、メタデータを手動で入力</li>
            <li><strong>リレーション作成:</strong> エンティティ間の関係を手動で定義</li>
            <li><strong>メタデータ編集:</strong> キーワード、セマンティックカテゴリ、重要度などを設定</li>
            <li><strong>埋め込み自動生成:</strong> 手動で作成したデータも自動的に埋め込みベクトルが生成される</li>
          </ul>
          <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
            手動入力により、AIが抽出できない細かい情報や専門的な知識を追加できます。
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#F5A623', borderRadius: '50%', marginRight: '8px' }}></span>
          埋め込みベクトルの生成
        </h4>
        <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0', marginBottom: '16px' }}>
          <p style={{ marginBottom: '12px' }}>
            <strong>プロセス:</strong> エンティティ、リレーション、トピックの埋め込みベクトルは、保存時に自動的に生成されます。
          </p>
          <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
            <li><strong>エンティティ埋め込み:</strong> エンティティ名 + メタデータ → 埋め込みベクトル</li>
            <li><strong>リレーション埋め込み:</strong> リレーションタイプ + 説明 → 埋め込みベクトル</li>
            <li><strong>トピック埋め込み:</strong> タイトル + コンテンツ + メタデータ → 埋め込みベクトル</li>
            <li><strong>生成タイミング:</strong> データ作成時、更新時（非同期処理）</li>
            <li><strong>使用API:</strong> OpenAI API（text-embedding-3-small）またはOllama（nomic-embed-text等）</li>
          </ul>
          <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
            埋め込みベクトルはRAG検索の精度を決定する重要な要素です。
          </p>
        </div>
      </div>

      <div>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#BD10E0', borderRadius: '50%', marginRight: '8px' }}></span>
          AIと人間の協働
        </h4>
        <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <p style={{ marginBottom: '12px', lineHeight: '1.8' }}>
            本システムは<strong>AI生成と人間の手動入力の両方</strong>をサポートし、それぞれの強みを活かします：
          </p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
            <li><strong>AI生成の強み:</strong> 大量のデータから迅速にパターンを抽出、一貫性のある構造化</li>
            <li><strong>人間の強み:</strong> 専門知識の追加、文脈の理解、AI生成結果の検証と調整</li>
            <li><strong>協働の流れ:</strong> AI生成 → 人間による確認・編集 → 埋め込み生成 → RAG検索で活用</li>
          </ul>
        </div>
      </div>
    </CollapsibleSection>
  );
}

