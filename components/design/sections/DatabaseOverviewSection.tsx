'use client';

import React from 'react';
import { OverviewDiagramSection } from './database-overview/OverviewDiagramSection';
import { DataSaveFlowSection } from './database-overview/DataSaveFlowSection';
import { RAGSearchFlowSection } from './database-overview/RAGSearchFlowSection';
import { MetadataGenerationSection } from './database-overview/MetadataGenerationSection';

/**
 * データベース構成セクション
 * 各サブセクションを統合するメインコンポーネント
 */
export function DatabaseOverviewSection() {
  return (
    <div>
      <OverviewDiagramSection />
      <DataSaveFlowSection />
      <RAGSearchFlowSection />
      <MetadataGenerationSection />
    </div>
  );
}
