'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * RAG検索の概要セクション
 */
export function RAGOverviewSection() {
  return (
    <CollapsibleSection 
      title="RAG検索とは" 
      defaultExpanded={false}
      id="rag-overview-section"
    >
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          RAG（Retrieval-Augmented Generation）とは
        </h4>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
          <strong>RAG（Retrieval-Augmented Generation）</strong>は、大規模言語モデル（LLM）に外部の知識ベースから関連情報を検索・取得させ、その情報をコンテキストとして利用して回答を生成する技術です。
        </p>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
          従来のLLMは、学習時に記憶した情報のみを使用して回答を生成するため、最新の情報や組織固有の情報を扱うことができませんでした。RAG検索により、LLMはリアルタイムで組織のナレッジグラフやシステム設計ドキュメントから情報を検索し、その情報を基に正確で最新の回答を生成できます。
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          RAG検索の仕組み
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>ステップ</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>処理内容</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>説明</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>1. クエリ受信</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>ユーザーの質問を受け取る</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>例: "伊藤忠商事のプロジェクトについて教えて"</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>2. 埋め込み生成</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>クエリテキストを埋め込みベクトルに変換</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>OpenAI/Ollamaの埋め込みAPIを使用（1536次元）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>3. 類似度検索</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>ChromaDBで類似する情報を検索</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>エンティティ、リレーション、トピック、設計ドキュメントを並列検索</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>4. 詳細情報取得</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>SQLiteから検索結果の詳細情報を取得</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>検索結果のIDを使用して構造化データを取得</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>5. コンテキスト構築</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>検索結果をLLM用のコンテキストに整形</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>関連エンティティ、リレーション、トピック、設計ドキュメントを統合</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>6. 回答生成</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>LLMがコンテキストを参照して回答を生成</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>OpenAI/OllamaのLLM APIを使用</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          RAG検索でできること
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>検索対象</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>検索内容</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>活用例</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>エンティティ</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>人物、組織、概念などのエンティティ情報</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>"山田さんについて"、"伊藤忠商事の情報"など</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>リレーション</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>エンティティ間の関係性</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>"A社とB社の関係"、"誰がどのプロジェクトに参加しているか"など</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>トピック</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>議事録や会議メモから抽出されたトピック情報</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>"先月の会議で話し合われた内容"、"プロジェクトの進捗状況"など</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>システム設計ドキュメント</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>アプリケーションのシステム設計情報</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>"データベースの構造"、"APIの仕様"、"アーキテクチャの説明"など</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          RAG検索の特徴
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>特徴</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>説明</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>メリット</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>セマンティック検索</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>意味的な類似度に基づく検索</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>キーワードが一致しなくても、意味が近い情報を検索可能</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>複数情報源の統合</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>ナレッジグラフ、設計ドキュメント、MCPから情報を統合</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>より包括的で正確な情報を提供</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>リアルタイム情報</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>最新の組織データを検索</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>LLMの学習データに依存せず、最新情報を参照可能</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>組織固有の情報</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織ごとに分離されたデータを検索</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>組織の内部情報を安全に検索・活用可能</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>出典の明示</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>回答に使用した情報の出典を表示</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>回答の信頼性を確認し、元の情報を参照可能</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #3B82F6' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>💡 RAG検索の活用シーン</h4>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
          <li><strong>会議内容の確認:</strong> "先月の会議で話し合われた内容を教えて" → 関連するトピックやエンティティを検索して回答</li>
          <li><strong>人物情報の検索:</strong> "山田さんについて教えて" → エンティティと関連するトピック、リレーションを検索</li>
          <li><strong>プロジェクトの把握:</strong> "伊藤忠商事のプロジェクトについて" → 関連するエンティティ、リレーション、トピックを統合して回答</li>
          <li><strong>システム設計の確認:</strong> "データベースの構造を教えて" → システム設計ドキュメントから情報を検索</li>
          <li><strong>関係性の探索:</strong> "A社とB社の関係は？" → リレーション情報を検索して回答</li>
        </ul>
      </div>
    </CollapsibleSection>
  );
}

