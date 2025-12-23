'use client';

import React from 'react';
import { RAGOverviewSection } from './rag-search/RAGOverviewSection';
import { RAGAlgorithmSection } from './rag-search/RAGAlgorithmSection';

/**
 * RAG検索の仕組みセクション
 * 各サブセクションを統合するメインコンポーネント
 */
export function RAGSearchMechanismSection() {
  return (
    <div>
      <RAGOverviewSection />
      <RAGAlgorithmSection />
    </div>
  );
}
