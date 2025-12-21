'use client';

import React from 'react';
import { RAGAlgorithmSection } from './rag-search/RAGAlgorithmSection';
import { RAGDataFlowSection } from './rag-search/RAGDataFlowSection';
import { ChromaDBCollectionSection } from './rag-search/ChromaDBCollectionSection';

/**
 * RAG検索の仕組みセクション
 * 各サブセクションを統合するメインコンポーネント
 */
export function RAGSearchMechanismSection() {
  return (
    <div>
      <RAGAlgorithmSection />
      <RAGDataFlowSection />
      <ChromaDBCollectionSection />
    </div>
  );
}
