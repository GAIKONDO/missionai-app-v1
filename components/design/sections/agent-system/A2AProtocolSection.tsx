'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * A2A通信プロトコルセクション
 */
export function A2AProtocolSection() {
  return (
    <CollapsibleSection 
      title="A2A通信プロトコル" 
      defaultExpanded={false}
      id="a2a-protocol-section"
    >
      <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>A2A（Agent-to-Agent）通信</h4>
        <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px' }}>
          A2A通信は、Agent間でメッセージを送受信するためのプロトコルです。
          A2AManagerがメッセージのルーティングと管理を行います。
        </p>

        <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>メッセージタイプ</h5>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li><strong>CONFIRMATION:</strong> 確認メッセージ（実行前の確認）</li>
          <li><strong>REQUEST:</strong> 指示メッセージ（他のAgentへの依頼）</li>
          <li><strong>NOTIFICATION:</strong> 通知メッセージ（状態変更の通知）</li>
          <li><strong>RESPONSE:</strong> 応答メッセージ（REQUESTへの応答）</li>
          <li><strong>STATUS_UPDATE:</strong> 状態更新メッセージ（実行状態の更新）</li>
        </ul>

        <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', marginTop: '20px', color: 'var(--color-text)' }}>メッセージ構造</h5>
        <pre style={{ 
          padding: '12px', 
          backgroundColor: 'var(--color-surface)', 
          borderRadius: '6px', 
          fontSize: '12px',
          overflow: 'auto',
          border: '1px solid var(--color-border-color)'
        }}>
{`{
  id: string;              // メッセージID
  from: string;            // 送信元Agent ID
  to: string;              // 送信先Agent ID
  type: A2AMessageType;    // メッセージタイプ
  taskId?: string;         // 関連タスクID
  payload: any;            // メッセージペイロード
  timestamp: number;       // タイムスタンプ
  responseTo?: string;      // 応答元メッセージID
  requiresResponse?: boolean; // 応答が必要か
}`}
        </pre>
      </div>

      <ZoomableMermaidDiagram
        diagramId="a2a-communication-diagram"
        mermaidCode={`sequenceDiagram
    participant A1 as Agent A<br/>(SearchAgent)
    participant A2A as A2A通信マネージャー<br/>A2AManager
    participant A2 as Agent B<br/>(AnalysisAgent)
    
    A1->>A2A: REQUESTメッセージ送信<br/>(分析を依頼)
    A2A->>A2: メッセージをルーティング
    A2->>A2: メッセージを処理
    A2->>A2A: RESPONSEメッセージ送信<br/>(分析結果)
    A2A->>A1: メッセージをルーティング
    
    Note over A1,A2: 確認が必要な場合
    A1->>A2A: CONFIRMATIONメッセージ送信
    A2A->>A2: メッセージをルーティング
    A2->>A2A: RESPONSEメッセージ送信<br/>(確認済み)
    A2A->>A1: メッセージをルーティング
    
    Note over A1,A2: 状態変更の通知
    A2->>A2A: NOTIFICATIONメッセージ送信<br/>(タスク完了)
    A2A->>A1: メッセージをブロードキャスト`}
      />
    </CollapsibleSection>
  );
}

