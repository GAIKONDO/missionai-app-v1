# システム設計ドキュメント機能

> **📋 ステータス**: アクティブ（実装仕様書）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: システム設計ドキュメントの管理、検索、RAG統合機能の説明

## 概要

MissionAIアプリケーションには、システム設計ドキュメントを管理・検索する機能が実装されています。この機能により、システム設計情報を構造化して保存し、AIアシスタントがRAG（Retrieval-Augmented Generation）検索を通じて設計情報を参照できるようになります。

## 主な機能

### 1. セクション管理
- システム設計ドキュメントをセクション単位で管理
- セクションの作成、更新、削除
- セクションの階層構造と関連性の管理

### 2. RAG検索
- ChromaDBを使用したベクトル類似度検索
- セマンティック検索による設計情報の検索
- AIアシスタントへの設計情報の提供

### 3. セクション間の関係管理
- セクション間の関連性を定義
- 関係タイプの管理（依存、参照、関連など）

## データ構造

### SQLiteテーブル

#### `designDocSections`テーブル

システム設計ドキュメントのセクション情報を保存します。

**スキーマ**:
```sql
CREATE TABLE designDocSections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    tags TEXT,  -- JSON配列文字列
    order_index INTEGER DEFAULT 0,
    pageUrl TEXT DEFAULT '/design',
    hierarchy TEXT,  -- JSON配列文字列
    relatedSections TEXT,  -- JSON配列文字列
    semanticCategory TEXT,
    keywords TEXT,  -- JSON配列文字列
    summary TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
)
```

**主要フィールド**:
- `id`: セクションID（`section_{uuid}`形式）
- `title`: セクションタイトル
- `description`: セクションの説明
- `content`: セクションの内容（Markdown形式、Mermaidコードを含む）
- `tags`: タグの配列（JSON文字列）
- `order_index`: 表示順序
- `hierarchy`: 階層構造（JSON配列文字列）
- `relatedSections`: 関連セクションIDの配列（JSON文字列）
- `semanticCategory`: セマンティックカテゴリ
- `keywords`: キーワードの配列（JSON文字列）
- `summary`: 要約

#### `designDocSectionRelations`テーブル

セクション間の関係を保存します。

**スキーマ**:
```sql
CREATE TABLE designDocSectionRelations (
    id TEXT PRIMARY KEY,
    sourceSectionId TEXT NOT NULL,
    targetSectionId TEXT NOT NULL,
    relationType TEXT NOT NULL,
    description TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (sourceSectionId) REFERENCES designDocSections(id) ON DELETE CASCADE,
    FOREIGN KEY (targetSectionId) REFERENCES designDocSections(id) ON DELETE CASCADE
)
```

**主要フィールド**:
- `id`: 関係ID（`relation_{uuid}`形式）
- `sourceSectionId`: 起点セクションID
- `targetSectionId`: 終点セクションID
- `relationType`: 関係タイプ（例: `depends_on`, `references`, `related_to`）
- `description`: 関係の説明

### ChromaDBコレクション

#### `design_docs`コレクション

システム設計ドキュメントの埋め込みベクトルを保存します。

**特徴**:
- **組織を跨いで共有**: 組織ごとではなく、全体で1つのコレクション
- **埋め込みモデル**: OpenAI `text-embedding-3-small`（1536次元）
- **メタデータ**: セクションID、タイトル、内容、タグ、階層構造など

**構造**:
- `id`: セクションID（SQLiteの`designDocSections.id`と同じ）
- `embedding`: 埋め込みベクトル（タイトル + 内容）
- `metadata`: メタデータ（JSON形式）
  - `sectionId`: セクションID
  - `sectionTitle`: セクションタイトル
  - `content`: セクション内容（Mermaidコードを除去）
  - `tags`: タグ（JSON文字列）
  - `order`: 表示順序
  - `pageUrl`: ページURL
  - `hierarchy`: 階層構造（JSON文字列）
  - `relatedSections`: 関連セクション（JSON文字列）
  - `embeddingModel`: 使用モデル（`text-embedding-3-small`）
  - `embeddingVersion`: 埋め込みバージョン（`1.0`）
  - `createdAt`: 作成日時
  - `updatedAt`: 更新日時

## データフロー

### セクション作成フロー

```
1. ユーザーがセクションを作成
   ↓
2. SQLiteのdesignDocSectionsテーブルに保存
   ↓
3. （オプション）埋め込みベクトルを生成
   ↓
4. ChromaDBのdesign_docsコレクションに保存
```

### 検索フロー

```
1. ユーザーが検索クエリを入力
   ↓
2. クエリの埋め込みベクトルを生成（OpenAI API）
   ↓
3. ChromaDBで類似度検索
   ↓
4. メタデータフィルタリング（タグ、セマンティックカテゴリなど）
   ↓
5. 検索結果を返す
```

## APIとコマンド

### Tauriコマンド（Rust側）

#### セクション管理
- `create_design_doc_section_cmd`: セクションを作成
- `update_design_doc_section_cmd`: セクションを更新
- `get_design_doc_section_cmd`: IDでセクションを取得
- `get_all_design_doc_sections_cmd`: すべてのセクションを取得
- `get_all_design_doc_sections_lightweight_cmd`: すべてのセクションを取得（軽量版、content除外）
- `delete_design_doc_section_cmd`: セクションを削除

#### セクション関係管理
- `create_design_doc_section_relation_cmd`: セクション関係を作成
- `update_design_doc_section_relation_cmd`: セクション関係を更新
- `get_design_doc_section_relation_cmd`: IDでセクション関係を取得
- `get_all_design_doc_section_relations_cmd`: すべてのセクション関係を取得
- `get_design_doc_section_relations_by_section_cmd`: セクションIDでセクション関係を取得
- `delete_design_doc_section_relation_cmd`: セクション関係を削除

#### ChromaDB操作
- `chromadb_save_design_doc_embedding`: 設計ドキュメントの埋め込みをChromaDBに保存
- `chromadb_find_similar_design_docs`: 類似設計ドキュメントを検索
- `chromadb_get_design_doc_metadata`: 設計ドキュメントのメタデータを取得
- `chromadb_list_design_doc_section_ids`: セクションID一覧を取得（デバッグ用）

### フロントエンド関数（TypeScript）

#### セクション管理（`lib/designDocSections.ts`）
- `createSection()`: セクションを作成
- `updateSection()`: セクションを更新
- `getSection()`: IDでセクションを取得
- `getAllSections()`: すべてのセクションを取得
- `getAllSectionsLightweight()`: すべてのセクションを取得（軽量版）
- `deleteSection()`: セクションを削除

#### RAG検索（`lib/designDocRAG.ts`）
- `saveDesignDocEmbeddingToChroma()`: 埋め込みをChromaDBに保存
- `searchDesignDocs()`: 類似設計ドキュメントを検索
- `getDesignDocContext()`: AIアシスタント用のコンテキストを取得
- `isDesignDocQuery()`: 設計ドキュメントに関する質問かどうかを判定
- `searchDesignDocsWithFallback()`: フォールバック対応の検索

#### セクション関係管理（`lib/designDocSectionRelations.ts`）
- `getAllSectionRelations()`: すべてのセクション関係を取得
- `createSectionRelation()`: セクション関係を作成
- `updateSectionRelation()`: セクション関係を更新
- `deleteSectionRelation()`: セクション関係を削除
- `getSectionRelationsBySection()`: セクションIDでセクション関係を取得

## 使用方法

### セクションの作成

```typescript
import { createSection } from '@/lib/designDocSections';

const section = await createSection(
  'アプリ全体構成',
  '使用ライブラリとアーキテクチャ',
  '## 概要\n\nこのアプリケーションは...',
  ['architecture', 'frontend', 'backend'],
  1,
  '/design',
  ['アプリ全体構成'],
  undefined,
  'architecture',
  ['Tauri', 'Next.js', 'React'],
  'アプリケーションの全体構成を説明します'
);
```

### 埋め込みの生成と保存

```typescript
import { saveDesignDocEmbeddingToChroma } from '@/lib/designDocRAG';

await saveDesignDocEmbeddingToChroma(
  section.id,
  section.title,
  section.content, // Mermaidコードを除去したテキスト
  {
    tags: section.tags,
    order: section.order,
    pageUrl: section.pageUrl,
    hierarchy: section.hierarchy,
    relatedSections: section.relatedSections
  }
);
```

### 検索

```typescript
import { searchDesignDocs } from '@/lib/designDocRAG';

const results = await searchDesignDocs(
  'データベース設計について教えて',
  5,
  {
    tags: ['database'],
    semanticCategory: 'architecture'
  }
);
```

### AIアシスタントへのコンテキスト提供

```typescript
import { getDesignDocContext } from '@/lib/designDocRAG';

const context = await getDesignDocContext(
  'データベース設計について',
  3,
  2000 // 最大トークン数
);

// AIアシスタントにコンテキストを提供
const response = await askAI(query, context);
```

## 注意事項

### Mermaidコードの処理
- 埋め込み生成時、Mermaidコードブロック（`\`\`\`mermaid ... \`\`\``）は自動的に除去されます
- 検索対象には含まれませんが、表示時には元の内容が表示されます

### ChromaDBの依存性
- 埋め込み生成と検索にはChromaDB Serverが必要です
- ChromaDBが起動していない場合、埋め込み生成と検索は失敗します
- フォールバック機能は現在実装されていません（空の結果を返す）

### 組織分離
- `design_docs`コレクションは組織を跨いで共有されます
- すべての組織で同じ設計ドキュメントを参照します

### 埋め込みモデル
- 現在はOpenAI `text-embedding-3-small`（1536次元）のみサポート
- 他のモデルを使用する場合は、コレクションの次元数を変更する必要があります

## インデックス

パフォーマンス向上のため、以下のインデックスが作成されています：

- `idx_designDocSections_order`: 表示順序検索
- `idx_designDocSections_semanticCategory`: セマンティックカテゴリ検索
- `idx_designDocSectionRelations_source`: 起点セクション検索
- `idx_designDocSectionRelations_target`: 終点セクション検索
- `idx_designDocSectionRelations_type`: 関係タイプ検索

## 関連ドキュメント

- [データベース設計](../database/database-design.md) - SQLiteとChromaDBの役割分担
- [埋め込みベクトルの保存場所](../database/EMBEDDING_STORAGE_LOCATIONS.md) - ChromaDBコレクションの構造
- [RAG検索の評価](../rag-search/RAG_SEARCH_EVALUATION.md) - RAG検索システムの評価
- [テスト手順書](../testing/TESTING_DESIGN_DOC_SECTIONS.md) - 動作確認手順

---

最終更新: 2025-12-11
