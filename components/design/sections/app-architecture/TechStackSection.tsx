'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { styles } from '../../common/styles';

/**
 * 主要ライブラリ・技術スタックセクション
 */
export function TechStackSection() {
  return (
    <CollapsibleSection 
      title="主要ライブラリ・技術スタック" 
      defaultExpanded={false}
      id="tech-stack-section"
    >
      <div style={{ marginBottom: '24px' }}>
        <h4 style={styles.subsectionTitle}>
          <span style={styles.colorDot('#4A90E2')}></span>
          フロントエンド（Next.js / React）
        </h4>
        <div style={styles.subsectionContent}>
          <ul style={styles.subsectionList}>
            <li><strong>Next.js 14:</strong> Reactフレームワーク、SSR/SSG対応</li>
            <li><strong>React 18:</strong> UIライブラリ</li>
            <li><strong>TypeScript:</strong> 型安全なJavaScript</li>
            <li><strong>@tanstack/react-query:</strong> サーバー状態管理、キャッシング</li>
            <li><strong>D3.js:</strong> データ可視化（グラフ、チャート）</li>
            <li><strong>react-force-graph / react-force-graph-3d:</strong> 3Dグラフ可視化</li>
            <li><strong>Three.js:</strong> 3Dレンダリング</li>
            <li><strong>@monaco-editor/react:</strong> コードエディタ</li>
            <li><strong>react-markdown:</strong> Markdownレンダリング</li>
          </ul>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={styles.subsectionTitle}>
          <span style={styles.colorDot('#F5A623')}></span>
          バックエンド（Rust / Tauri）
        </h4>
        <div style={styles.subsectionContent}>
          <ul style={styles.subsectionList}>
            <li><strong>Tauri 2.0:</strong> デスクトップアプリフレームワーク（軽量、セキュア）</li>
            <li><strong>Tokio:</strong> 非同期ランタイム</li>
            <li><strong>Axum:</strong> HTTPサーバーフレームワーク</li>
            <li><strong>rusqlite:</strong> SQLiteデータベースドライバ</li>
            <li><strong>chromadb (2.3.0):</strong> ChromaDB Rustクライアント</li>
            <li><strong>reqwest:</strong> HTTPクライアント（OpenAI/Ollama API呼び出し）</li>
            <li><strong>serde / serde_json:</strong> シリアライゼーション</li>
            <li><strong>uuid:</strong> UUID生成</li>
            <li><strong>chrono:</strong> 日時処理</li>
          </ul>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={styles.subsectionTitle}>
          <span style={styles.colorDot('#7ED321')}></span>
          データベース
        </h4>
        <div style={styles.subsectionContent}>
          <ul style={styles.subsectionList}>
            <li><strong>SQLite:</strong> 構造化データの保存（エンティティ、リレーション、メタデータ）</li>
            <li><strong>ChromaDB:</strong> ベクトルデータベース（埋め込みベクトルの保存・検索）</li>
            <li><strong>Python:</strong> ChromaDBサーバーの実行環境</li>
          </ul>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={styles.subsectionTitle}>
          <span style={styles.colorDot('#BD10E0')}></span>
          外部サービス・API
        </h4>
        <div style={styles.subsectionContent}>
          <ul style={styles.subsectionList}>
            <li><strong>OpenAI API:</strong> 埋め込みベクトル生成（text-embedding-3-small等）</li>
            <li><strong>Ollama:</strong> ローカルLLM実行環境（埋め込み生成の代替）</li>
          </ul>
        </div>
      </div>

      <div>
        <h3 style={styles.sectionTitle}>
          技術スタックの特徴
        </h3>
        <div style={{ ...styles.infoBox, padding: '20px' }}>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
            <li><strong>クロスプラットフォーム:</strong> Tauriにより、Mac/Windows/Linuxで動作</li>
            <li><strong>パフォーマンス:</strong> Rustバックエンドによる高速処理</li>
            <li><strong>セキュリティ:</strong> TauriのセキュリティモデルとRustのメモリ安全性</li>
            <li><strong>スケーラビリティ:</strong> ChromaDBによる大規模ベクトル検索対応</li>
            <li><strong>開発体験:</strong> TypeScript + Reactによる型安全なフロントエンド開発</li>
          </ul>
        </div>
      </div>
    </CollapsibleSection>
  );
}

