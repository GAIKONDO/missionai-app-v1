'use client';

import React from 'react';
import { SQLiteOverviewSection } from './sqlite-schema/SQLiteOverviewSection';
import { TableRelationshipDiagramSection } from './sqlite-schema/TableRelationshipDiagramSection';
import { TableDetailsSection } from './sqlite-schema/TableDetailsSection';
import { IDLinkageSection } from './sqlite-schema/IDLinkageSection';

/**
 * SQLiteスキーマセクション
 * 各サブセクションを統合するメインコンポーネント
 */
export function SQLiteSchemaSection() {
  return (
    <div>
      <SQLiteOverviewSection />
      <TableRelationshipDiagramSection />
      <TableDetailsSection />
      <IDLinkageSection />
    </div>
  );
}
