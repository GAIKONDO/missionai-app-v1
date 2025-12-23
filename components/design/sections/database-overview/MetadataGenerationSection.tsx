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
      <div style={{ marginBottom: '32px' }}>
        <h4 style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          color: 'var(--color-text)',
          borderBottom: '2px solid var(--color-border-color)',
          paddingBottom: '8px'
        }}>
          AIと人間の協働フロー
        </h4>
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
                  width: '20%'
                }}>
                  ステップ
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  border: '1px solid var(--color-border-color)',
                  width: '26.67%'
                }}>
                  人間
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  border: '1px solid var(--color-border-color)',
                  width: '26.67%'
                }}>
                  AIモデル
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  border: '1px solid var(--color-border-color)',
                  width: '26.67%'
                }}>
                  システム
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  step: '1. メタデータ抽出',
                  human: 'トピックのタイトルとコンテンツを入力',
                  ai: 'トピックのタイトルとコンテンツからエンティティとリレーションを自動抽出（GPT-4o-mini等のLLMを使用）',
                  system: 'LLM APIを呼び出し、結果を取得'
                },
                {
                  step: '2. 確認・編集',
                  human: 'AI生成結果を確認し、追加・削除・編集を行う（専門知識の追加、文脈の理解、検証と調整）',
                  ai: '-',
                  system: 'AI生成結果をユーザーに提示'
                },
                {
                  step: '3. メタデータ保存',
                  human: '確認済みのメタデータを保存',
                  ai: '-',
                  system: 'メタデータをSQLiteに保存（構造化データ）'
                },
                {
                  step: '4. 埋め込み生成',
                  human: '-',
                  ai: '埋め込みベクトルを生成（OpenAI text-embedding-3-smallまたはOllama nomic-embed-text等を使用）',
                  system: '埋め込みAPIを呼び出し、ベクトルを取得（非同期・バックグラウンド）'
                },
                {
                  step: '5. 埋め込み保存',
                  human: '-',
                  ai: '-',
                  system: '埋め込みベクトルをChromaDBに保存（検索インデックス）'
                },
                {
                  step: '6. RAG検索',
                  human: 'RAG検索を実行して情報を取得',
                  ai: 'クエリの埋め込みベクトルを生成（検索時に使用）',
                  system: 'RAG検索で活用（類似度検索による情報取得）'
                }
              ].map((row, index) => (
                <tr key={row.step} style={{ backgroundColor: index % 2 === 0 ? 'var(--color-background)' : 'var(--color-surface)', borderBottom: '1px solid var(--color-border-color)' }}>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600, color: 'var(--color-text)' }}>
                    {row.step}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                    {row.human}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                    {row.ai}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                    {row.system}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <p style={{ marginBottom: '24px', lineHeight: '1.8', color: 'var(--color-text)' }}>
          本システムは<strong>AI生成と人間の手動入力の両方</strong>をサポートし、それぞれの強みを活かしてメタデータを生成します。
          AI生成は大量のデータから迅速にパターンを抽出し、人間は専門知識の追加やAI生成結果の検証・調整を行います。
        </p>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h4 style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          color: 'var(--color-text)',
          borderBottom: '2px solid var(--color-border-color)',
          paddingBottom: '8px'
        }}>
          メタデータ生成方法の比較
        </h4>
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
                  width: '20%'
                }}>
                  項目
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  border: '1px solid var(--color-border-color)',
                  width: '40%'
                }}>
                  AI生成による抽出
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  border: '1px solid var(--color-border-color)',
                  width: '40%'
                }}>
                  手動入力による作成
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  item: 'プロセス',
                  ai: 'トピックのタイトルとコンテンツから、GPT-4o-miniなどのLLMを使用して自動的にエンティティとリレーションを抽出',
                  manual: 'ユーザーが直接エンティティやリレーションを作成・編集'
                },
                {
                  item: '入力',
                  ai: 'トピックのタイトル、コンテンツ、既存のエンティティ情報',
                  manual: 'ユーザーが名前、タイプ、メタデータを手動で入力'
                },
                {
                  item: '処理',
                  ai: 'LLMがエンティティ（人物、組織、製品など）とリレーション（関係性）を抽出',
                  manual: 'エンティティ間の関係を手動で定義、キーワード、セマンティックカテゴリ、重要度などを設定'
                },
                {
                  item: '出力',
                  ai: '構造化されたエンティティとリレーションのリスト（JSON形式）',
                  manual: 'ユーザーが定義したエンティティとリレーション'
                },
                {
                  item: '人間の関与',
                  ai: '生成結果を確認し、追加・削除・編集が可能',
                  manual: '最初から最後まで人間が完全に制御'
                },
                {
                  item: '強み',
                  ai: '大量のデータから迅速にパターンを抽出、一貫性のある構造化',
                  manual: 'AIが抽出できない細かい情報や専門的な知識を追加可能'
                },
                {
                  item: '適用場面',
                  ai: '大量のトピックから効率的にメタデータを抽出したい場合',
                  manual: '専門知識や文脈の理解が必要な場合、AI生成結果の精度を高めたい場合'
                }
              ].map((row, index) => (
                <tr key={row.item} style={{ backgroundColor: index % 2 === 0 ? 'var(--color-background)' : 'var(--color-surface)', borderBottom: '1px solid var(--color-border-color)' }}>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600, color: 'var(--color-text)' }}>
                    {row.item}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                    {row.ai}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                    {row.manual}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h4 style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          color: 'var(--color-text)',
          borderBottom: '2px solid var(--color-border-color)',
          paddingBottom: '8px'
        }}>
          埋め込みベクトルの生成
        </h4>
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
                  width: '25%'
                }}>
                  データタイプ
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  border: '1px solid var(--color-border-color)',
                  width: '35%'
                }}>
                  入力内容
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  border: '1px solid var(--color-border-color)',
                  width: '20%'
                }}>
                  生成タイミング
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  border: '1px solid var(--color-border-color)',
                  width: '20%'
                }}>
                  使用API
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  type: 'エンティティ埋め込み',
                  input: 'エンティティ名 + メタデータ（エイリアス、タイプ等）',
                  timing: 'データ作成時、更新時（非同期）',
                  api: 'OpenAI API（text-embedding-3-small）またはOllama（nomic-embed-text等）'
                },
                {
                  type: 'リレーション埋め込み',
                  input: 'リレーションタイプ + 説明 + メタデータ',
                  timing: 'データ作成時、更新時（非同期）',
                  api: 'OpenAI API（text-embedding-3-small）またはOllama（nomic-embed-text等）'
                },
                {
                  type: 'トピック埋め込み',
                  input: 'タイトル + コンテンツ + メタデータ（キーワード、セマンティックカテゴリ等）',
                  timing: 'データ作成時、更新時（非同期）',
                  api: 'OpenAI API（text-embedding-3-small）またはOllama（nomic-embed-text等）'
                },
                {
                  type: '設計ドキュメント埋め込み',
                  input: 'セクションタイトル + 内容（Mermaidコード除去）',
                  timing: 'セクション作成時、更新時（非同期）',
                  api: 'OpenAI API（text-embedding-3-small、1536次元）'
                }
              ].map((row, index) => (
                <tr key={row.type} style={{ backgroundColor: index % 2 === 0 ? 'var(--color-background)' : 'var(--color-surface)', borderBottom: '1px solid var(--color-border-color)' }}>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600, color: 'var(--color-text)' }}>
                    {row.type}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                    {row.input}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                    {row.timing}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', color: 'var(--color-text)' }}>
                    {row.api}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic', lineHeight: '1.6' }}>
          埋め込みベクトルはRAG検索の精度を決定する重要な要素です。AI生成・手動入力のどちらで作成されたデータでも、保存時に自動的に埋め込みベクトルが生成されます。
        </p>
      </div>

    </CollapsibleSection>
  );
}

