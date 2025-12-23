'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { styles } from '../../common/styles';

/**
 * 主要ライブラリ・技術スタックセクション
 */
export function TechStackSection() {
  const techStack = [
    {
      category: 'フロントエンド（Next.js / React）',
      items: [
        { name: 'Next.js', version: '14', description: 'Reactフレームワーク、App Router、SSR/SSG対応' },
        { name: 'React', version: '18.2', description: 'UIライブラリ' },
        { name: 'TypeScript', version: '5', description: '型安全なJavaScript' },
        { name: '@tanstack/react-query', version: '5.0', description: 'サーバー状態管理、キャッシング' },
        { name: 'D3.js系', version: '3.x', description: 'd3-force, d3-drag, d3-zoom, d3-selection, d3-hierarchy - データ可視化' },
        { name: 'react-force-graph-3d', version: '1.25', description: '3Dグラフ可視化' },
        { name: 'three.js', version: '0.182', description: '3Dレンダリング' },
        { name: '@monaco-editor/react', version: '4.6', description: 'コードエディタ（Monaco Editor）' },
        { name: 'react-markdown', version: '9.0', description: 'Markdownレンダリング' },
        { name: 'remark-gfm', version: '4.0', description: 'GitHub Flavored Markdown対応' },
        { name: '@dnd-kit', version: '6.3 / 10.0', description: 'ドラッグ&ドロップ機能' },
        { name: 'react-icons', version: '5.0', description: 'アイコンライブラリ' },
        { name: 'reactflow', version: '11.11', description: 'フローチャート・ダイアグラム作成' },
        { name: 'Vega / Vega-Lite', version: '6.2 / 6.4', description: 'データ可視化（グラフ、チャート）' },
        { name: 'html2canvas / jspdf', version: '1.4 / 3.0', description: 'PDF生成' },
        { name: 'plantuml-encoder', version: '1.4', description: 'PlantUMLエンコーダー' },
      ]
    },
    {
      category: 'バックエンド（Rust / Tauri）',
      items: [
        { name: 'Tauri', version: '2.0', description: 'デスクトップアプリフレームワーク（軽量、セキュア）' },
        { name: 'Tokio', version: '1.x', description: '非同期ランタイム' },
        { name: 'Axum', version: '0.7', description: 'HTTPサーバーフレームワーク' },
        { name: 'rusqlite', version: '0.31', description: 'SQLiteデータベースドライバ' },
        { name: 'r2d2 / r2d2_sqlite', version: '0.8 / 0.24', description: 'コネクションプール管理' },
        { name: 'chromadb', version: '2.3.0', description: 'ChromaDB Rustクライアント' },
        { name: 'reqwest', version: '0.11', description: 'HTTPクライアント（OpenAI/Ollama API呼び出し）' },
        { name: 'serde / serde_json', version: '1.0', description: 'シリアライゼーション' },
        { name: 'uuid', version: '1.0', description: 'UUID生成' },
        { name: 'chrono', version: '0.4', description: '日時処理' },
        { name: 'anyhow', version: '1.0', description: 'エラーハンドリング' },
        { name: 'bcrypt', version: '0.15', description: 'パスワードハッシュ化' },
        { name: 'async-channel', version: '2.0', description: '非同期チャネル' },
        { name: 'dotenv', version: '0.15', description: '環境変数管理' },
        { name: 'sha2', version: '0.10', description: 'SHA-2ハッシュ関数' },
        { name: 'tower / tower-http', version: '0.4 / 0.5', description: 'HTTPミドルウェア（CORS等）' },
        { name: 'hnsw_rs', version: '0.3.3', description: 'RustネイティブのHNSW実装（ベクトル検索）' },
        { name: 'csv', version: '1.3', description: 'CSVパーサー' },
        { name: 'dirs', version: '5.0', description: 'ホームディレクトリ取得' },
        { name: 'sysinfo', version: '0.30', description: 'システムリソース監視' },
      ]
    },
    {
      category: 'データベース',
      items: [
        { name: 'SQLite', version: '3.44+ (bundled)', description: '構造化データの保存（エンティティ、リレーション、メタデータ）。rusqlite 0.31にバンドル' },
        { name: 'ChromaDB', version: 'Pythonパッケージ', description: 'ベクトルデータベース（埋め込みベクトルの保存・検索）。Pythonパッケージとしてインストール' },
        { name: 'Python', version: '3.8-3.12', description: 'ChromaDBサーバーの実行環境。Python 3.8以上が必要' },
      ]
    },
    {
      category: '外部サービス・API',
      items: [
        { name: 'OpenAI API', version: '-', description: '埋め込みベクトル生成（text-embedding-3-small等）、LLM（GPT-4o-mini等）' },
        { name: 'Ollama', version: '-', description: 'ローカルLLM実行環境（埋め込み生成・LLM推論の代替）' },
      ]
    },
  ];

  return (
    <CollapsibleSection 
      title="主要ライブラリ・技術スタック" 
      defaultExpanded={false}
      id="tech-stack-section"
    >
      {techStack.map((category, categoryIndex) => (
        <div key={categoryIndex} style={{ marginBottom: categoryIndex < techStack.length - 1 ? '32px' : '0' }}>
          <h4 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            marginBottom: '16px', 
            color: 'var(--color-text)',
            borderBottom: '2px solid var(--color-border-color)',
            paddingBottom: '8px'
          }}>
            {category.category}
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
                    ライブラリ名
                  </th>
                  <th style={{ 
                    padding: '12px', 
                    textAlign: 'left', 
                    fontWeight: 600, 
                    color: '#FFFFFF', 
                    border: '1px solid var(--color-border-color)',
                    width: '15%'
                  }}>
                    バージョン
                  </th>
                  <th style={{ 
                    padding: '12px', 
                    textAlign: 'left', 
                    fontWeight: 600, 
                    color: '#FFFFFF', 
                    border: '1px solid var(--color-border-color)',
                    width: '60%'
                  }}>
                    説明
                  </th>
                </tr>
              </thead>
              <tbody>
                {category.items.map((item, itemIndex) => (
                  <tr 
                    key={itemIndex}
                    style={{ 
                      borderBottom: '1px solid var(--color-border-color)',
                      backgroundColor: itemIndex % 2 === 0 ? 'var(--color-background)' : 'var(--color-surface)'
                    }}
                  >
                    <td style={{ 
                      padding: '12px', 
                      border: '1px solid var(--color-border-color)', 
                      color: 'var(--color-text)',
                      fontWeight: 500
                    }}>
                      {item.name}
                    </td>
                    <td style={{ 
                      padding: '12px', 
                      border: '1px solid var(--color-border-color)', 
                      color: 'var(--color-text-secondary)',
                      fontFamily: 'monospace',
                      fontSize: '13px'
                    }}>
                      {item.version}
                    </td>
                    <td style={{ 
                      padding: '12px', 
                      border: '1px solid var(--color-border-color)', 
                      color: 'var(--color-text)',
                      lineHeight: '1.6'
                    }}>
                      {item.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
      </div>
        </div>
      ))}

      <div style={{ marginTop: '32px' }}>
        <h4 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          marginBottom: '16px', 
          color: 'var(--color-text)',
          borderBottom: '2px solid var(--color-border-color)',
          paddingBottom: '8px'
        }}>
          技術スタックの特徴
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
                  特徴
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: '#FFFFFF', 
                  border: '1px solid var(--color-border-color)',
                  width: '75%'
                }}>
                  説明
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { 
                  feature: 'クロスプラットフォーム', 
                  description: 'Tauriにより、Mac/Windows/Linuxで動作'
                },
                { 
                  feature: 'パフォーマンス', 
                  description: 'Rustバックエンドによる高速処理'
                },
                { 
                  feature: 'セキュリティ', 
                  description: 'TauriのセキュリティモデルとRustのメモリ安全性'
                },
                { 
                  feature: 'スケーラビリティ', 
                  description: 'ChromaDBによる大規模ベクトル検索対応'
                },
                { 
                  feature: '開発体験', 
                  description: 'TypeScript + Reactによる型安全なフロントエンド開発'
                }
              ].map((item, index) => (
                <tr 
                  key={index}
                  style={{ 
                    borderBottom: '1px solid var(--color-border-color)',
                    backgroundColor: index % 2 === 0 ? 'var(--color-background)' : 'var(--color-surface)'
                  }}
                >
                  <td style={{ 
                    padding: '12px', 
                    border: '1px solid var(--color-border-color)', 
                    color: 'var(--color-text)',
                    fontWeight: 600
                  }}>
                    {item.feature}
                  </td>
                  <td style={{ 
                    padding: '12px', 
                    border: '1px solid var(--color-border-color)', 
                    color: 'var(--color-text)',
                    lineHeight: '1.6'
                  }}>
                    {item.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CollapsibleSection>
  );
}

