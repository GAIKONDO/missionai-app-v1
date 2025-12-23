'use client';

import React from 'react';
import { OverviewDiagramSection } from './database-overview/OverviewDiagramSection';
import { RoleAssignmentSection } from './database-overview/RoleAssignmentSection';
import { MetadataGenerationSection } from './database-overview/MetadataGenerationSection';

/**
 * データベース構成セクション
 * 各サブセクションを統合するメインコンポーネント
 */
export function DatabaseOverviewSection() {
  return (
    <div>
      <OverviewDiagramSection />
      <RoleAssignmentSection />
      <MetadataGenerationSection />
    </div>
  );
}
