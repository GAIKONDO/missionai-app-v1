'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * テーブル関係図セクション
 */
export function TableRelationshipDiagramSection() {
  return (
    <CollapsibleSection 
      title="テーブル関係図" 
      defaultExpanded={false}
      id="sqlite-schema-diagram-section"
    >
      <ZoomableMermaidDiagram
        diagramId="sqlite-schema-diagram"
        mermaidCode={`erDiagram
    %% SQLiteスキーマ図
    organizations ||--o{ organizations : "parent"
    organizations ||--o{ organizationMembers : "has"
    organizations ||--o{ organizationContents : "has"
    organizations ||--o{ meetingNotes : "has"
    organizations ||--o{ entities : "belongs_to"
    organizations ||--o{ topics : "belongs_to"
    organizations ||--o{ relations : "belongs_to"
    organizations ||--o{ focusInitiatives : "has"
    
    meetingNotes ||--o{ topics : "contains"
    
    topics ||--o{ relations : "has"
    
    entities ||--o{ relations : "source"
    entities ||--o{ relations : "target"
    
    themes ||--o{ focusInitiatives : "references"
    
    designDocSections ||--o{ designDocSectionRelations : "source"
    designDocSections ||--o{ designDocSectionRelations : "target"
`}
      />
    </CollapsibleSection>
  );
}

