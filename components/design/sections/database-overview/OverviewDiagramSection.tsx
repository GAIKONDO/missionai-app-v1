'use client';

import React from 'react';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../../common/ZoomableMermaidDiagram';
import { styles } from '../../common/styles';

/**
 * 全体構成図セクション
 */
export function OverviewDiagramSection() {
  return (
    <CollapsibleSection 
      title="全体構成図" 
      defaultExpanded={false}
      id="database-overview-diagram-section"
    >
      <ZoomableMermaidDiagram
        diagramId="database-overview-diagram"
        mermaidCode={`graph TB
    subgraph AppLayer["アプリケーション層"]
        Frontend["Next.js Frontend<br/>React + TypeScript"]
        Backend["Rust Backend<br/>Tauri + Axum API"]
        AIAssistant["AIアシスタント<br/>useAIChat"]
        RAGOrch["RAGオーケストレーター<br/>RAGOrchestrator"]
    end

    subgraph DBLayer["データベース層"]
        subgraph SQLiteGroup["SQLite"]
            SQLiteDB[("SQLite Database<br/>構造化データ")]
            Tables["テーブル群<br/>- organizations<br/>- entities<br/>- relations<br/>- topics<br/>- meetingNotes<br/>- designDocSections<br/>- etc."]
        end

        subgraph ChromaGroup["ChromaDB"]
            ChromaDB[("ChromaDB<br/>ベクトルデータベース")]
            Collections["コレクション群<br/>- entities_orgId<br/>- relations_orgId<br/>- topics_orgId<br/>- design_docs<br/>（組織を跨いで共有）"]
        end
    end

    subgraph AILayer["AI生成層"]
        EmbedGen["埋め込み生成<br/>OpenAI/Ollama"]
        LLMAPI["LLM API<br/>OpenAI/Ollama"]
    end

    subgraph UserLayer["ユーザー操作"]
        ManualInput["手動入力<br/>エンティティ・リレーション作成"]
        ReviewEdit["確認・編集<br/>AI生成結果の調整"]
    end

    Frontend -->|"Tauri Commands<br/>HTTP API"| Backend
    Backend -->|"SQLクエリ"| SQLiteDB
    Backend -->|"HTTP API<br/>localhost:8000"| ChromaDB
    SQLiteDB --> Tables
    ChromaDB --> Collections
    
    UserLayer -->|"データ作成"| Frontend
    Frontend -->|"確認・編集"| UserLayer
    Frontend -->|"埋め込み生成リクエスト"| EmbedGen
    EmbedGen -->|"埋め込みベクトル"| Backend
    Backend -->|"ベクトル保存"| ChromaDB
    
    SQLiteDB -.->|"ID参照<br/>（メタデータ経由）"| ChromaDB
    ChromaDB -.->|"ID検索<br/>（類似度検索後）"| SQLiteDB
    
    AIAssistant -->|"ユーザークエリ"| RAGOrch
    RAGOrch -->|"並列情報取得"| Backend
    Backend -->|"類似度検索"| ChromaDB
    ChromaDB -.->|"検索結果ID"| Backend
    Backend -->|"詳細情報取得"| SQLiteDB
    SQLiteDB -->|"検索結果"| RAGOrch
    RAGOrch -->|"統合コンテキスト"| AIAssistant
    AIAssistant -->|"LLM API呼び出し"| LLMAPI
    LLMAPI -->|"回答生成"| AIAssistant
    AIAssistant -->|"回答表示"| Frontend

    style SQLiteDB fill:#e1f5ff
    style ChromaDB fill:#fff4e1
    style Frontend fill:#f0f0f0
    style Backend fill:#f0f0f0
    style EmbedGen fill:#fff9c4
    style ManualInput fill:#f3e5f5
    style ReviewEdit fill:#f3e5f5
    style AIAssistant fill:#e3f2fd
    style LLMAPI fill:#ffebee
    style RAGOrch fill:#fff4e1`}
      />
        
      <div style={styles.infoBox}>
        <h4 style={styles.infoBoxTitle}>SQLiteとChromaDBの連携</h4>
        <p style={styles.infoBoxText}>
          SQLiteとChromaDBは<strong>直接接続はしません</strong>が、<strong>IDを介して間接的に連携</strong>しています。
        </p>
        <ul style={styles.infoBoxList}>
          <li><strong>保存時:</strong> SQLiteにエンティティの基本情報（ID、名前、タイプなど）を保存 → ChromaDBに埋め込みベクトルを保存（SQLiteのIDをメタデータとして含む）</li>
          <li><strong>検索時:</strong> ChromaDBで類似度検索を実行 → 検索結果のIDを使用してSQLiteから詳細情報を取得</li>
          <li><strong>データ整合性:</strong> SQLiteがマスターデータ、ChromaDBが検索用インデックスとして機能</li>
        </ul>
      </div>
    </CollapsibleSection>
  );
}

