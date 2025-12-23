'use client';

import React from 'react';
import { ChromaDBOverviewSection } from './chromadb-schema/ChromaDBOverviewSection';
import { CollectionStructureDiagramSection } from './chromadb-schema/CollectionStructureDiagramSection';
import { CollectionDetailsSection } from './chromadb-schema/CollectionDetailsSection';
import { NamingConventionSection } from './chromadb-schema/NamingConventionSection';

/**
 * ChromaDBスキーマセクション
 * 各サブセクションを統合するメインコンポーネント
 */
export function ChromaDBSchemaSection() {
  return (
    <div>
      <ChromaDBOverviewSection />
      <CollectionStructureDiagramSection />
      <CollectionDetailsSection />
      <NamingConventionSection />
    </div>
  );
}
