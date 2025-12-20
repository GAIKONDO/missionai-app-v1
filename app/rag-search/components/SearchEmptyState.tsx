'use client';

import { RAGSearchIcon } from '@/components/Icons';

export default function SearchEmptyState() {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      padding: '48px',
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      <RAGSearchIcon size={64} color="#D1D5DB" />
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginTop: '16px', marginBottom: '8px' }}>
        RAG検索でナレッジグラフを探索
      </h3>
      <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
        自然言語で検索クエリを入力すると、AIが意味的に類似したエンティティ、リレーション、トピックを検索します。
      </p>
      <div style={{ marginTop: '24px', textAlign: 'left', maxWidth: '600px', margin: '24px auto 0' }}>
        <p style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937', marginBottom: '8px' }}>検索例:</p>
        <ul style={{ fontSize: '14px', color: '#6B7280', paddingLeft: '20px', margin: 0 }}>
          <li>「自動車メーカーとの提携」</li>
          <li>「AI技術を活用している企業」</li>
          <li>「プロジェクトマネージャーが担当している案件」</li>
        </ul>
      </div>
    </div>
  );
}

