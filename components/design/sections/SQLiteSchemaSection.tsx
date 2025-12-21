'use client';

import React from 'react';
import { TableRelationshipDiagramSection } from './sqlite-schema/TableRelationshipDiagramSection';
import { TableDetailsSection } from './sqlite-schema/TableDetailsSection';
import { SystemTablesSection } from './sqlite-schema/SystemTablesSection';
import { IDLinkageSection } from './sqlite-schema/IDLinkageSection';

/**
 * SQLiteスキーマセクション
 * 各サブセクションを統合するメインコンポーネント
 */
export function SQLiteSchemaSection() {
  return (
    <div>
      <TableRelationshipDiagramSection />
      <TableDetailsSection />
      <SystemTablesSection />
      <IDLinkageSection />
    </div>
  );
}
