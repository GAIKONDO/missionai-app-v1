'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';

/**
 * MCPサーバー実装で可能になることセクション
 */
export function MCPServerBenefitsSection() {
  return (
    <CollapsibleSection 
      title="MCPサーバー実装で可能になること" 
      defaultExpanded={false}
      id="mcp-server-benefits-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>MCPサーバーを実装することで得られるメリット</h4>
        
          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>1. 外部リソースへのアクセス</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>外部API連携:</strong> 外部サービス（Slack、GitHub、Google Driveなど）のAPIにアクセスするToolを提供</li>
              <li><strong>データベース接続:</strong> 外部データベースやデータウェアハウスに接続するToolを提供</li>
              <li><strong>ファイルシステム:</strong> リモートサーバーのファイルシステムにアクセスするToolを提供</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>2. セキュリティとアクセス制御</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>認証・認可:</strong> APIキーやOAuthトークンなどの認証情報をサーバー側で管理</li>
              <li><strong>権限管理:</strong> ユーザーや組織ごとにToolの実行権限を制御</li>
              <li><strong>監査ログ:</strong> Tool実行の履歴を記録し、セキュリティ監査に対応</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>3. スケーラビリティとパフォーマンス</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>負荷分散:</strong> 複数のMCPサーバーインスタンスで負荷を分散</li>
              <li><strong>キャッシング:</strong> サーバー側でTool実行結果をキャッシュしてパフォーマンス向上</li>
              <li><strong>非同期処理:</strong> 時間のかかるTool実行を非同期で処理</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>4. Toolの拡張性</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>動的Tool追加:</strong> サーバー側でToolを追加・更新・削除できる</li>
              <li><strong>複数サーバー接続:</strong> 複数のMCPサーバーに接続して、より多くのToolを利用可能</li>
              <li><strong>Toolバージョン管理:</strong> Toolのバージョンを管理し、互換性を保つ</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>5. 開発・運用の分離</h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
              <li><strong>独立デプロイ:</strong> Toolの更新をアプリケーション本体の再デプロイなしで実施可能</li>
              <li><strong>環境分離:</strong> 開発環境、ステージング環境、本番環境で異なるMCPサーバーを使用</li>
              <li><strong>チーム分業:</strong> Tool開発チームとアプリケーション開発チームが独立して作業可能</li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fff9c4', borderRadius: '6px', border: '1px solid #f57f17' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#f57f17' }}>現在の実装との違い</h5>
            <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '8px' }}>
              現在は<strong>ローカルToolレジストリ</strong>を使用しており、Toolはアプリケーション内で直接実行されています。
              MCPサーバーを実装すると、Toolの実行を<strong>外部サーバーに委譲</strong>できるようになり、
              上記のメリットを享受できます。また、MCPサーバーが利用できない場合は、フォールバックとして
              ローカルToolレジストリを使用する設計になっています。
            </p>
          </div>
        </div>
    </CollapsibleSection>
  );
}

