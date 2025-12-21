'use client';

import React from 'react';
import { CollectionStructureDiagramSection } from './chromadb-schema/CollectionStructureDiagramSection';
import { CollectionDetailsSection } from './chromadb-schema/CollectionDetailsSection';
import { NamingConventionSection } from './chromadb-schema/NamingConventionSection';
import { IDLinkageSection } from './chromadb-schema/IDLinkageSection';

/**
 * ChromaDBスキーマセクション
 * 各サブセクションを統合するメインコンポーネント
 */
export function ChromaDBSchemaSection() {
  return (
    <div>
      <CollectionStructureDiagramSection />
      <CollectionDetailsSection />
      <NamingConventionSection />
      <IDLinkageSection />
    </div>
  );
}
