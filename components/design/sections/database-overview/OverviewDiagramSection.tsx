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
    </CollapsibleSection>
  );
}

