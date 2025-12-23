'use client';

import React from 'react';
import { TauriOverviewSection } from './app-architecture/TauriOverviewSection';
import { ArchitectureDiagramSection } from './app-architecture/ArchitectureDiagramSection';
import { TechStackSection } from './app-architecture/TechStackSection';

/**
 * アプリ全体構成セクション
 * 各サブセクションを統合するメインコンポーネント
 */
export function AppArchitectureSection() {
  return (
    <div>
      <TauriOverviewSection />
      <ArchitectureDiagramSection />
      <TechStackSection />
    </div>
  );
}
