'use client';

import { RAGSearchIcon } from '@/components/Icons';

export default function PageHeader() {
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <RAGSearchIcon size={32} color="#3B82F6" />
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
          RAG検索
        </h1>
      </div>
      <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
        AIによる意味検索で、エンティティ・リレーション・トピックを統合検索できます
      </p>
    </div>
  );
}

