'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';

/**
 * ページ間のリンク関係セクション
 */
export function PageLinksSection() {
  return (
    <CollapsibleSection 
      title="ページ間のリンク関係" 
      defaultExpanded={false}
      id="page-links-section"
    >
      <ZoomableMermaidDiagram
        diagramId="page-links-diagram"
        mermaidCode={`flowchart LR
    subgraph EntryPoints["エントリーポイント"]
        Sidebar["サイドバー<br/>（ハードコーディング）"]
        Home["ホームページ"]
    end
    
    subgraph OrganizationFlow["組織フロー"]
        OrgList["組織一覧<br/>/organization"]
        OrgDetail["組織詳細<br/>/organization/[id]"]
        MeetingDetail["議事録詳細<br/>/organization/[id]/meeting/[meetingId]"]
        InitiativeDetail["注力施策詳細<br/>/organization/[id]/initiative/[initiativeId]"]
    end
    
    subgraph CompanyFlow["事業会社フロー"]
        CompanyList["事業会社一覧<br/>/companies"]
        CompanyDetail["事業会社詳細<br/>/companies/[id]"]
    end
    
    subgraph SearchFlow["検索フロー"]
        RAGSearch["RAG検索<br/>/rag-search"]
        KnowledgeGraph["ナレッジグラフ<br/>/knowledge-graph"]
        KnowledgeGraphEntity["ナレッジグラフ<br/>?entityId=xxx"]
        KnowledgeGraphRelation["ナレッジグラフ<br/>?relationId=xxx"]
    end
    
    Sidebar --> OrgList
    Sidebar --> CompanyList
    Sidebar --> RAGSearch
    Sidebar --> KnowledgeGraph
    
    Home --> OrgList
    Home --> CompanyList
    
    OrgList -->|"組織IDで遷移"| OrgDetail
    OrgDetail -->|"meetingIdで遷移"| MeetingDetail
    OrgDetail -->|"initiativeIdで遷移"| InitiativeDetail
    
    CompanyList -->|"companyIdで遷移"| CompanyDetail
    
    RAGSearch -->|"entityIdをクエリパラメータで"| KnowledgeGraphEntity
    RAGSearch -->|"relationIdをクエリパラメータで"| KnowledgeGraphRelation
    RAGSearch -->|"meetingNoteIdで遷移"| MeetingDetail
    
    KnowledgeGraph -->|"エンティティクリック"| KnowledgeGraphEntity
    KnowledgeGraph -->|"リレーションクリック"| KnowledgeGraphRelation
    
    style EntryPoints fill:#e3f2fd
    style OrganizationFlow fill:#fff4e1
    style CompanyFlow fill:#e8f5e9
    style SearchFlow fill:#f3e5f5`}
      />
    </CollapsibleSection>
  );
}

