'use client';

import React from 'react';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { ZoomableMermaidDiagram } from '../common/ZoomableMermaidDiagram';
import { styles } from '../common/styles';

export function DatabaseOverviewSection() {
  // Mermaid図のレンダリングはZoomableMermaidDiagramコンポーネント内で管理されるため、
  // ここでは何もする必要がない

  return (
    <div>
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
        Backend["Rust Backend<br/>Tauri"]
        AIAssistant["AIアシスタント<br/>チャットインターフェース"]
    end

    subgraph DBLayer["データベース層"]
        subgraph SQLiteGroup["SQLite"]
            SQLiteDB[("SQLite Database<br/>構造化データ")]
            Tables["テーブル群<br/>- organizations<br/>- entities<br/>- topicRelations<br/>- topicEmbeddings<br/>- meetingNotes<br/>- etc."]
        end

        subgraph ChromaGroup["ChromaDB"]
            ChromaDB[("ChromaDB<br/>ベクトルデータベース")]
            Collections["コレクション群<br/>- entities_orgId<br/>- relations_orgId<br/>- topics_orgId"]
        end
    end

    subgraph AILayer["AI生成層"]
        AIGen["AI生成<br/>GPT-4o-mini等"]
        EmbedGen["埋め込み生成<br/>OpenAI/Ollama"]
        LLMAPI["LLM API<br/>OpenAI/Ollama"]
    end

    subgraph UserLayer["ユーザー操作"]
        ManualInput["手動入力<br/>エンティティ・リレーション作成"]
        ReviewEdit["確認・編集<br/>AI生成結果の調整"]
    end

    Frontend -->|"Tauri Commands"| Backend
    Backend -->|"SQLクエリ"| SQLiteDB
    Backend -->|"HTTP API"| ChromaDB
    SQLiteDB --> Tables
    ChromaDB --> Collections
    
    UserLayer -->|"データ作成"| Frontend
    AIGen -->|"メタデータ抽出"| Frontend
    Frontend -->|"確認・編集"| UserLayer
    Frontend -->|"埋め込み生成リクエスト"| EmbedGen
    EmbedGen -->|"埋め込みベクトル"| Backend
    Backend -->|"ベクトル保存"| ChromaDB
    
    SQLiteDB -.->|"ID参照<br/>（メタデータ経由）"| ChromaDB
    ChromaDB -.->|"ID検索<br/>（類似度検索後）"| SQLiteDB
    
    Frontend -->|"RAG検索クエリ"| EmbedGen
    EmbedGen -->|"クエリ埋め込み"| Backend
    Backend -->|"類似度検索"| ChromaDB
    ChromaDB -.->|"検索結果ID"| Backend
    Backend -->|"詳細情報取得"| SQLiteDB
    SQLiteDB -->|"検索結果"| Frontend
    
    AIAssistant -->|"ユーザークエリ"| Frontend
    Frontend -->|"RAG検索実行"| Backend
    Backend -->|"類似度検索"| ChromaDB
    ChromaDB -.->|"検索結果ID"| Backend
    Backend -->|"詳細情報取得"| SQLiteDB
    SQLiteDB -->|"エンティティ・リレーション・トピック情報"| Frontend
    Frontend -->|"RAGコンテキスト + ユーザークエリ"| AIAssistant
    AIAssistant -->|"LLM API呼び出し"| LLMAPI
    LLMAPI -->|"回答生成"| AIAssistant
    AIAssistant -->|"回答表示"| Frontend

    style SQLiteDB fill:#e1f5ff
    style ChromaDB fill:#fff4e1
    style Frontend fill:#f0f0f0
    style Backend fill:#f0f0f0
    style AIGen fill:#e8f5e9
    style EmbedGen fill:#fff9c4
    style ManualInput fill:#f3e5f5
    style ReviewEdit fill:#f3e5f5
    style AIAssistant fill:#e3f2fd
    style LLMAPI fill:#ffebee`}
        />
      </CollapsibleSection>
        
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

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          役割分担
        </h3>
        
        <div style={{ marginBottom: '24px' }}>
          <h4 style={styles.subsectionTitle}>
            <span style={styles.colorDot('#4A90E2')}></span>
            SQLite - 構造化データの保存
          </h4>
          <div style={styles.subsectionContent}>
            <p style={{ marginBottom: '12px' }}>
              <strong>役割:</strong> メタデータ、リレーション、ID管理など、構造化されたデータを保存します。
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><strong>エンティティ情報:</strong> 名前、タイプ、メタデータ、組織IDなど</li>
              <li><strong>リレーション情報:</strong> エンティティ間の関係、トピックID、リレーションタイプなど</li>
              <li><strong>トピック情報:</strong> トピックの基本情報、メタデータ、キーワードなど</li>
              <li><strong>組織・メンバー情報:</strong> 組織階層、メンバー情報、議事録など</li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              SQLiteは高速な構造化データの検索・更新に最適で、トランザクション管理も可能です。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={styles.subsectionTitle}>
            <span style={styles.colorDot('#F5A623')}></span>
            ChromaDB - ベクトルデータの保存
          </h4>
          <div style={styles.subsectionContent}>
            <p style={{ marginBottom: '12px' }}>
              <strong>役割:</strong> エンティティ、リレーション、トピックの埋め込みベクトルを保存し、類似度検索を提供します。
            </p>
            <ul style={styles.subsectionList}>
              <li><strong>エンティティ埋め込み:</strong> エンティティ名とメタデータのベクトル表現</li>
              <li><strong>リレーション埋め込み:</strong> リレーションタイプと説明のベクトル表現</li>
              <li><strong>トピック埋め込み:</strong> トピックのタイトル、コンテンツ、メタデータのベクトル表現</li>
            </ul>
            <p style={{ marginBottom: '12px' }}>
              <strong>コレクション命名規則:</strong>
            </p>
            <ul style={styles.subsectionList}>
              <li><code>{'entities_{organizationId}'}</code> - エンティティ埋め込み</li>
              <li><code>{'relations_{organizationId}'}</code> - リレーション埋め込み</li>
              <li><code>{'topics_{organizationId}'}</code> - トピック埋め込み</li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              ChromaDBは組織ごとにコレクションを分離し、セマンティック検索とRAG（Retrieval-Augmented Generation）を実現します。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={styles.subsectionTitle}>
            <span style={styles.colorDot('#7ED321')}></span>
            データの連携
          </h4>
          <div style={styles.subsectionContent}>
            <p style={{ marginBottom: '12px' }}>
              SQLiteとChromaDBは相互補完的に動作します：
            </p>
            <ul style={styles.subsectionList}>
              <li><strong>ID管理:</strong> SQLiteでエンティティやリレーションのIDを管理し、ChromaDBではそのIDをメタデータとして保存</li>
              <li><strong>検索フロー:</strong> ChromaDBで類似度検索 → SQLiteで詳細情報を取得</li>
              <li><strong>データ整合性:</strong> SQLiteがマスターデータ、ChromaDBが検索用インデックスとして機能</li>
            </ul>
          </div>
        </div>
      </div>

      <CollapsibleSection 
        title="データ保存・埋め込み生成の流れ" 
        defaultExpanded={false}
        id="data-save-embedding-section"
      >
        <ZoomableMermaidDiagram
          diagramId="data-save-flow-diagram"
          mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Frontend
    participant Backend as Rust Backend
    participant AI as AI生成<br/>(GPT-4o-mini等)
    participant EmbedAPI as 埋め込みAPI<br/>(OpenAI/Ollama)
    participant SQLite as SQLite
    participant ChromaDB as ChromaDB

    Note over User,ChromaDB: パターン1: AI生成によるメタデータ抽出
    
    User->>Frontend: トピック作成・編集
    Frontend->>AI: トピック内容から<br/>エンティティ・リレーション抽出
    AI-->>Frontend: 抽出結果<br/>(エンティティ、リレーション)
    User->>Frontend: AI生成結果の確認・編集
    Frontend->>Backend: エンティティ・リレーション保存
    Backend->>SQLite: 構造化データ保存<br/>(id, name, type, metadata)
    Backend-->>Frontend: 保存完了
    
    Frontend->>Backend: 埋め込み生成（非同期）
    Backend->>EmbedAPI: 埋め込みベクトル生成<br/>(エンティティ名+メタデータ)
    EmbedAPI-->>Backend: 埋め込みベクトル
    Backend->>ChromaDB: ベクトル保存<br/>(id, embedding, metadata含むSQLiteのID)
    
    Note over User,ChromaDB: パターン2: 手動入力によるメタデータ作成
    
    User->>Frontend: エンティティ手動作成
    Frontend->>Backend: createEntity API
    Backend->>SQLite: エンティティ情報保存
    Backend-->>Frontend: 作成されたエンティティ
    Frontend->>Backend: 埋め込み生成（非同期）
    Backend->>EmbedAPI: 埋め込みベクトル生成
    EmbedAPI-->>Backend: 埋め込みベクトル
    Backend->>ChromaDB: ベクトル保存
    
    Note over SQLite,ChromaDB: SQLite: 構造化データ（マスターデータ）<br/>ChromaDB: ベクトルデータ（検索インデックス）`}
        />
      </CollapsibleSection>

      <CollapsibleSection 
        title="RAG検索の流れ" 
        defaultExpanded={false}
        id="rag-search-flow-section"
      >
        <ZoomableMermaidDiagram
          diagramId="rag-search-flow-diagram"
          mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant Frontend as Frontend
    participant Backend as Rust Backend
    participant EmbedAPI as 埋め込みAPI<br/>(OpenAI/Ollama)
    participant ChromaDB as ChromaDB
    participant SQLite as SQLite
    participant AI as AIアシスタント<br/>(GPT-4o-mini等)

    User->>Frontend: 検索クエリ入力<br/>例: "トヨタのプロジェクト"
    Frontend->>Backend: RAG検索リクエスト
    Backend->>EmbedAPI: クエリの埋め込みベクトル生成
    EmbedAPI-->>Backend: クエリ埋め込みベクトル
    
    par 並列検索
        Backend->>ChromaDB: エンティティ類似度検索
        ChromaDB-->>Backend: 類似エンティティID + 類似度
    and
        Backend->>ChromaDB: リレーション類似度検索
        ChromaDB-->>Backend: 類似リレーションID + 類似度
    and
        Backend->>ChromaDB: トピック類似度検索
        ChromaDB-->>Backend: 類似トピックID + 類似度
    end
    
    Backend->>SQLite: IDで詳細情報取得<br/>(エンティティ、リレーション、トピック)
    SQLite-->>Backend: 詳細データ
    
    Backend->>Backend: 結果統合・スコアリング<br/>(ベクトル類似度 + メタデータブースト)
    Backend-->>Frontend: 検索結果<br/>(エンティティ、リレーション、トピック)
    Frontend-->>User: 検索結果表示
    
    opt AIアシスタント使用時
        Frontend->>AI: 検索結果をコンテキストに追加
        AI-->>Frontend: コンテキストに基づく回答
    end
    
    Note over ChromaDB,SQLite: ChromaDB: 高速な類似度検索<br/>SQLite: 詳細情報の取得`}
        />
      </CollapsibleSection>

      <CollapsibleSection 
        title="メタデータ生成と人間の関与" 
        defaultExpanded={false}
        id="metadata-generation-section"
      >
        
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#4A90E2', borderRadius: '50%', marginRight: '8px' }}></span>
            AI生成によるメタデータ抽出
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0', marginBottom: '16px' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>プロセス:</strong> トピックのタイトルとコンテンツから、GPT-4o-miniなどのLLMを使用して自動的にエンティティとリレーションを抽出します。
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><strong>入力:</strong> トピックのタイトル、コンテンツ、既存のエンティティ情報</li>
              <li><strong>AI処理:</strong> LLMがエンティティ（人物、組織、製品など）とリレーション（関係性）を抽出</li>
              <li><strong>出力:</strong> 構造化されたエンティティとリレーションのリスト（JSON形式）</li>
              <li><strong>人間の確認:</strong> ユーザーが生成結果を確認し、追加・削除・編集が可能</li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              AI生成は効率的ですが、人間による確認と調整が重要です。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#7ED321', borderRadius: '50%', marginRight: '8px' }}></span>
            手動入力によるメタデータ作成
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0', marginBottom: '16px' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>プロセス:</strong> ユーザーが直接エンティティやリレーションを作成・編集します。
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><strong>エンティティ作成:</strong> 名前、タイプ、メタデータを手動で入力</li>
              <li><strong>リレーション作成:</strong> エンティティ間の関係を手動で定義</li>
              <li><strong>メタデータ編集:</strong> キーワード、セマンティックカテゴリ、重要度などを設定</li>
              <li><strong>埋め込み自動生成:</strong> 手動で作成したデータも自動的に埋め込みベクトルが生成される</li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              手動入力により、AIが抽出できない細かい情報や専門的な知識を追加できます。
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#F5A623', borderRadius: '50%', marginRight: '8px' }}></span>
            埋め込みベクトルの生成
          </h4>
          <div style={{ paddingLeft: '24px', borderLeft: '2px solid #e0e0e0', marginBottom: '16px' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>プロセス:</strong> エンティティ、リレーション、トピックの埋め込みベクトルは、保存時に自動的に生成されます。
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
              <li><strong>エンティティ埋め込み:</strong> エンティティ名 + メタデータ → 埋め込みベクトル</li>
              <li><strong>リレーション埋め込み:</strong> リレーションタイプ + 説明 → 埋め込みベクトル</li>
              <li><strong>トピック埋め込み:</strong> タイトル + コンテンツ + メタデータ → 埋め込みベクトル</li>
              <li><strong>生成タイミング:</strong> データ作成時、更新時（非同期処理）</li>
              <li><strong>使用API:</strong> OpenAI API（text-embedding-3-small）またはOllama（nomic-embed-text等）</li>
            </ul>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              埋め込みベクトルはRAG検索の精度を決定する重要な要素です。
            </p>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#BD10E0', borderRadius: '50%', marginRight: '8px' }}></span>
            AIと人間の協働
          </h4>
          <div style={{ padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
            <p style={{ marginBottom: '12px', lineHeight: '1.8' }}>
              本システムは<strong>AI生成と人間の手動入力の両方</strong>をサポートし、それぞれの強みを活かします：
            </p>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
              <li><strong>AI生成の強み:</strong> 大量のデータから迅速にパターンを抽出、一貫性のある構造化</li>
              <li><strong>人間の強み:</strong> 専門知識の追加、文脈の理解、AI生成結果の検証と調整</li>
              <li><strong>協働の流れ:</strong> AI生成 → 人間による確認・編集 → 埋め込み生成 → RAG検索で活用</li>
            </ul>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
