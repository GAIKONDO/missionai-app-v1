'use client';

import React from 'react';
import { PageHierarchyDiagramSection } from './page-structure/PageHierarchyDiagramSection';
import { PageLinksSection } from './page-structure/PageLinksSection';
import { IDManagementSection } from './page-structure/IDManagementSection';
import { PageStructureSummarySection } from './page-structure/PageStructureSummarySection';

/**
 * ページ構造セクション
 * 各サブセクションを統合するメインコンポーネント
 */
export function PageStructureSection() {
  return (
    <div>
      <PageHierarchyDiagramSection />
      <PageLinksSection />
      <IDManagementSection />
      <PageStructureSummarySection />
    </div>
  );
}
