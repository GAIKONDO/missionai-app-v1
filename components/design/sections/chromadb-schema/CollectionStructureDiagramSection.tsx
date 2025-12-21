'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * コレクション構造図セクション
 */
export function CollectionStructureDiagramSection() {
  return (
    <CollapsibleSection 
      title="コレクション構造図" 
      defaultExpanded={false}
      id="chromadb-collection-structure-section"
    >
      <ZoomableMermaidDiagram
        diagramId="chromadb-schema-diagram"
        mermaidCode={`graph TB
    %% ChromaDBスキーマ図
    subgraph Database["ChromaDB Database<br/>default_database"]
        subgraph Org1["組織1<br/>organizationId: org_001"]
            Entities1["entities_org_001<br/>エンティティ埋め込み"]
            Relations1["relations_org_001<br/>リレーション埋め込み"]
            Topics1["topics_org_001<br/>トピック埋め込み"]
        end
        
        subgraph Org2["組織2<br/>organizationId: org_002"]
            Entities2["entities_org_002<br/>エンティティ埋め込み"]
            Relations2["relations_org_002<br/>リレーション埋め込み"]
            Topics2["topics_org_002<br/>トピック埋め込み"]
        end
    end
    
    subgraph Shared["共有コレクション"]
        DesignDocs["design_docs<br/>システム設計ドキュメント"]
    end
    
    subgraph SQLite["SQLite（参照用）"]
        SQLiteEntities[("entities<br/>テーブル")]
        SQLiteRelations[("relations<br/>テーブル")]
        SQLiteTopics[("topics<br/>テーブル")]
        SQLiteDesignDocs[("designDocSections<br/>テーブル")]
    end
    
    Entities1 -.->|"メタデータ: entityId"| SQLiteEntities
    Relations1 -.->|"メタデータ: relationId"| SQLiteRelations
    Topics1 -.->|"メタデータ: topicId"| SQLiteTopics
    DesignDocs -.->|"メタデータ: sectionId"| SQLiteDesignDocs
    
    Entities2 -.->|"メタデータ: entityId"| SQLiteEntities
    Relations2 -.->|"メタデータ: relationId"| SQLiteRelations
    Topics2 -.->|"メタデータ: topicId"| SQLiteTopics
    
    style Database fill:#fff4e1
    style Entities1 fill:#e3f2fd
    style Relations1 fill:#f3e5f5
    style Topics1 fill:#e8f5e9
    style Entities2 fill:#e3f2fd
    style Relations2 fill:#f3e5f5
    style Topics2 fill:#e8f5e9
    style SQLiteEntities fill:#e1f5ff
    style SQLiteRelations fill:#e1f5ff
    style SQLiteTopics fill:#e1f5ff
    style SQLiteDesignDocs fill:#e1f5ff
    style DesignDocs fill:#fff9c4
    style Shared fill:#fff4e1`}
      />
    </CollapsibleSection>
  );
}

