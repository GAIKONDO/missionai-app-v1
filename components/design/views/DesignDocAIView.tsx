'use client';

import React, { useState } from 'react';
import { FiMessageSquare } from 'react-icons/fi';

/**
 * AI質問画面のコンポーネント
 * システム設計についてAIアシスタントに質問するためのUIを提供します
 */
export interface DesignDocAIViewProps {
  // 必要に応じてpropsを追加
}

export function DesignDocAIView(props: DesignDocAIViewProps) {
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  return (
    <div style={{ 
      padding: '48px', 
      textAlign: 'center',
      border: '2px dashed var(--color-border-color)',
      borderRadius: '8px',
      backgroundColor: 'var(--color-surface)',
    }}>
      <FiMessageSquare size={64} style={{ marginBottom: '24px', color: 'var(--color-primary)', opacity: 0.8 }} />
      <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
        AIアシスタントでシステム設計について質問
      </h3>
      <p style={{ fontSize: '16px', color: 'var(--color-text-light)', lineHeight: '1.6', marginBottom: '32px' }}>
        AIアシスタントがシステム設計ドキュメントを参照して、あなたの質問に答えます。
      </p>
      <button
        onClick={() => setAiAssistantOpen(true)}
        style={{
          padding: '16px 32px',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#2563EB';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-primary)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <FiMessageSquare size={20} />
        AIアシスタントを開く
      </button>
      <div style={{ marginTop: '32px', textAlign: 'left', maxWidth: '600px', margin: '32px auto 0' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
          質問例:
        </h4>
        <ul style={{ 
          listStyle: 'none', 
          padding: 0, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px' 
        }}>
          {[
            'Tauriとは何ですか？どのように使われていますか？',
            'SQLiteとChromaDBはどのように連携していますか？',
            'RAG検索のフローを教えてください',
            'データの保存フローを説明してください',
            'ページ構造とID管理について教えてください',
          ].map((example, idx) => (
            <li
              key={idx}
              onClick={() => {
                // 初期クエリを設定してAIアシスタントを開く処理をここに実装
                setAiAssistantOpen(true);
              }}
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                color: 'var(--color-text)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.backgroundColor = 'var(--color-surface)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-color)';
                e.currentTarget.style.backgroundColor = 'var(--color-background)';
              }}
            >
              {example}
            </li>
          ))}
        </ul>
      </div>
      
      {/* AIアシスタントパネルはここに実装 */}
      {aiAssistantOpen && (
        <div style={{ 
          marginTop: '32px',
          padding: '24px',
          backgroundColor: 'var(--color-background)',
          borderRadius: '8px',
          border: '1px solid var(--color-border-color)'
        }}>
          <p style={{ color: 'var(--color-text-light)' }}>AIアシスタントパネルはここに実装されます</p>
        </div>
      )}
    </div>
  );
}
