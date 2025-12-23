'use client';

import React from 'react';
import { DataSaveFlowSection } from './data-flow/DataSaveFlowSection';
import { RAGSearchFlowSection } from './data-flow/RAGSearchFlowSection';
import { DataDeleteFlowSection } from './data-flow/DataDeleteFlowSection';

/**
 * データフローセクション
 * 各サブセクションを統合するメインコンポーネント
 */
export function DataFlowSection() {
  return (
    <div>
      <DataSaveFlowSection />
      <RAGSearchFlowSection />
      <DataDeleteFlowSection />
    </div>
  );
}
