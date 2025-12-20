'use client';

import React from 'react';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../common/ZoomableMermaidDiagram';

export function PageStructureSection() {
  return (
    <div>
      <CollapsibleSection 
        title="ページ階層構造図" 
        defaultExpanded={false}
        id="page-hierarchy-diagram-section"
      >
        <ZoomableMermaidDiagram
          diagramId="page-hierarchy-diagram"
          mermaidCode={`graph TB
    subgraph EntryPoints["エントリーポイント"]
        Sidebar["サイドバー<br/>（ハードコーディング）"]
        Home["ホームページ"]
    end
    
    subgraph OrganizationFlow["組織フロー"]
        OrgList["組織一覧<br/>/organization"]
        OrgDetail["組織詳細<br/>/organization/[id]"]
        MeetingList["議事録リスト<br/>（タブ内）"]
        MeetingDetail["議事録詳細<br/>/organization/[id]/meeting/[meetingId]"]
        InitiativeList["注力施策リスト<br/>（タブ内）"]
        InitiativeDetail["注力施策詳細<br/>/organization/[id]/initiative/[initiativeId]"]
    end
    
    subgraph CompanyFlow["事業会社フロー"]
        CompanyList["事業会社一覧<br/>/companies"]
        CompanyDetail["事業会社詳細<br/>/companies/[id]"]
    end
    
    subgraph SearchFlow["検索フロー"]
        RAGSearch["RAG検索<br/>/rag-search"]
        KnowledgeGraph["ナレッジグラフ<br/>/knowledge-graph"]
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
    
    RAGSearch -->|"entityIdをクエリパラメータで"| KnowledgeGraph
    RAGSearch -->|"meetingNoteIdで遷移"| MeetingDetail
    
    KnowledgeGraph -->|"エンティティクリック"| KnowledgeGraph
    
    style EntryPoints fill:#e3f2fd
    style OrganizationFlow fill:#fff4e1
    style CompanyFlow fill:#e8f5e9
    style SearchFlow fill:#f3e5f5`}
        />
      </CollapsibleSection>

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

      <CollapsibleSection 
        title="ID管理の仕組み" 
        defaultExpanded={false}
        id="id-management-section"
      >
        <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
            IDの種類と管理方法
          </h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>組織ID（organizationId）:</strong> SQLiteの<code>organizations.id</code>を使用。形式: <code>init_miwceusf_lmthnq2ks</code></li>
            <li><strong>議事録ID（meetingId）:</strong> SQLiteの<code>meetingNotes.id</code>を使用。形式: <code>init_miwceusf_lmthnq2ks</code></li>
            <li><strong>トピックID（topicId）:</strong> SQLiteの<code>topicEmbeddings.topicId</code>を使用。形式: <code>init_mj0b1gma_hywcwrspw</code></li>
            <li><strong>エンティティID（entityId）:</strong> SQLiteの<code>entities.id</code>を使用。形式: <code>entity_{'{timestamp}'}_{'{random}'}</code></li>
            <li><strong>リレーションID（relationId）:</strong> SQLiteの<code>topicRelations.id</code>を使用</li>
            <li><strong>事業会社ID（companyId）:</strong> SQLiteの<code>companies.id</code>を使用</li>
            <li><strong>注力施策ID（initiativeId）:</strong> SQLiteの<code>focusInitiatives.id</code>を使用</li>
          </ul>
          
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', marginTop: '24px', color: 'var(--color-text)' }}>
            IDの取得方法
          </h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>クエリパラメータ:</strong> <code>useSearchParams()</code>で取得（例: <code>?id=xxx</code>の<code>id</code>、<code>?entityId=xxx</code>の<code>entityId</code>）</li>
            <li><strong>プログラムからの遷移:</strong> <code>router.push()</code>でパスとクエリパラメータを組み合わせて遷移（例: <code>router.push('/organization/detail?id=xxx')</code>）</li>
          </ul>
          
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', marginTop: '24px', color: 'var(--color-text)' }}>
            データの読み込みフロー
          </h4>
          <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>ページマウント時:</strong> <code>useEffect</code>でIDを取得</li>
            <li><strong>ID検証:</strong> IDが存在するか確認</li>
            <li><strong>データ取得:</strong> IDを使用してSQLiteからデータを取得（<code>getEntityById</code>、<code>getMeetingNoteById</code>など）</li>
            <li><strong>状態更新:</strong> 取得したデータをReactの状態に設定</li>
            <li><strong>レンダリング:</strong> データを基にUIをレンダリング</li>
          </ol>
        </div>
      </CollapsibleSection>

      <CollapsibleSection 
        title="ページ構造のまとめ" 
        defaultExpanded={false}
        id="page-structure-summary-section"
      >
        <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <p style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.8' }}>
            本システムのページ構造は、<strong>クエリパラメータ方式</strong>と<strong>SQLiteのID管理</strong>を組み合わせて実現されています。
          </p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li><strong>静的ページ:</strong> サイドバーにハードコーディングされたパスで直接アクセス</li>
            <li><strong>動的ページ:</strong> クエリパラメータ（<code>?id=xxx</code>）でIDを管理し、SQLiteからデータを読み込み</li>
            <li><strong>クエリパラメータ:</strong> ページ内でのフィルタリングやハイライト、IDの受け渡しに使用</li>
            <li><strong>データソース:</strong> すべてのデータはSQLiteから取得され、IDで一意に識別</li>
            <li><strong>ID取得:</strong> <code>useSearchParams()</code>フックでクエリパラメータからIDを取得</li>
            <li><strong>リンク関係:</strong> <code>router.push()</code>を使用してプログラムから遷移、または<code>Link</code>コンポーネントでリンク</li>
          </ul>
        </div>
      </CollapsibleSection>
    </div>
  );
}
