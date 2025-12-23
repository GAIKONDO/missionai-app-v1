'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * Tauriとはセクション
 */
export function TauriOverviewSection() {
  return (
    <CollapsibleSection 
      title="Tauriとは" 
      defaultExpanded={false}
      id="tauri-overview-section"
    >
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          Tauriとは
        </h4>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
          <strong>Tauri</strong>は、Web技術（HTML、CSS、JavaScript）を使用してデスクトップアプリケーションを構築するためのフレームワークです。
          本アプリケーションでは、Tauri 2.0を使用してデスクトップアプリケーションとして実装されています。
        </p>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
          Tauriは、フロントエンドにWeb技術（Next.js、React）を使用し、バックエンドにRustを使用することで、
          軽量で高速なデスクトップアプリケーションを実現します。Electronと比較して、より小さなバンドルサイズと高いパフォーマンスを提供します。
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
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid var(--color-border-color)' }}>実装例</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>デスクトップアプリケーションの基盤</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>Web技術とRustを組み合わせてデスクトップアプリケーションを構築</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>Next.js（フロントエンド）+ Rust（バックエンド）</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>IPC（Inter-Process Communication）</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>フロントエンドとバックエンド間の通信を管理</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>Tauri IPC、HTTP API</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>システムリソースへのアクセス</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>ファイルシステム、データベース、ネットワークなどへのアクセス</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>SQLite、ChromaDB、HTTPサーバー</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>セキュリティ</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>セキュリティポリシーによるアクセス制御</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>許可されたコマンドのみ実行可能</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          アーキテクチャ構成
        </h4>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
          本アプリケーションは、Tauriを使用して以下のように構成されています：
        </p>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
          <li><strong>フロントエンド:</strong> Next.js 14 + React 18 + TypeScript（Web UI）</li>
          <li><strong>バックエンド:</strong> Rust + Axum（APIサーバー、データベース管理）</li>
          <li><strong>通信:</strong> Tauri IPC（フロントエンド ↔ バックエンド）、HTTP API（Next.js ↔ Rust API）</li>
          <li><strong>データベース:</strong> SQLite（構造化データ）、ChromaDB（ベクトルデータ）</li>
        </ul>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
          Tauriの特徴
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
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>軽量</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>Electronと比較して、より小さなバンドルサイズ</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>アプリケーションの起動が高速、ディスク容量の節約</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>高速</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>Rustによる高性能なバックエンド処理</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>データベース操作、API処理が高速</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>セキュア</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>セキュリティポリシーによる厳格なアクセス制御</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>システムリソースへの安全なアクセス</td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>クロスプラットフォーム</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>Windows、macOS、Linuxに対応</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>1つのコードベースで複数プラットフォームに対応</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)', fontWeight: 600 }}>Web技術の活用</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>既存のWeb技術スタックをそのまま活用可能</td>
                <td style={{ padding: '12px', border: '1px solid var(--color-border-color)' }}>開発効率の向上、既存の知識を活用</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #3B82F6' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>💡 TauriとElectronの比較</h4>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
          <li><strong>バンドルサイズ:</strong> TauriはElectronより大幅に小さい（通常10MB以下 vs 100MB以上）</li>
          <li><strong>メモリ使用量:</strong> TauriはElectronより少ないメモリを消費</li>
          <li><strong>パフォーマンス:</strong> Rustによるバックエンド処理で高速</li>
          <li><strong>セキュリティ:</strong> より厳格なセキュリティポリシー</li>
          <li><strong>開発体験:</strong> Web技術を活用しつつ、Rustの型安全性を享受</li>
        </ul>
      </div>
    </CollapsibleSection>
  );
}

