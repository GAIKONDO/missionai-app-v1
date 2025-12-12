# オーガニゼーションID（organizationId）とは？

> **📋 ステータス**: アクティブ（概念説明）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: organizationIdの概念と用途の説明

## 概要

**オーガニゼーションID（organizationId）**は、MissionAIアプリケーション内の**組織**を一意に識別するためのIDです。

## 組織とは？

組織は、会社内の階層構造を表す単位です。例えば：

- **部門**: 情報・通信部門、金融・保険部門など
- **部**: フロンティアビジネス部、BPOビジネス部など
- **課**: 各部門・部の下にある課
- **チーム**: 各課の下にあるチーム

### 組織の階層構造

```
会社
  ├─ 情報・通信部門 (level: 1, levelName: "部門")
  │   ├─ フロンティアビジネス部 (level: 2, levelName: "部")
  │   │   ├─ 課A (level: 3, levelName: "課")
  │   │   └─ 課B (level: 3, levelName: "課")
  │   └─ BPOビジネス部 (level: 2, levelName: "部")
  └─ 金融・保険部門 (level: 1, levelName: "部門")
      └─ 金融ビジネス部 (level: 2, levelName: "部")
```

## データベースでの保存

### SQLiteの`organizations`テーブル

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,              -- 組織ID（organizationId、UUID形式）
  parentId TEXT,                    -- 親組織ID（階層構造用）
  name TEXT NOT NULL,               -- 組織名（例: "フロンティアビジネス部"）
  title TEXT,                       -- タイトル
  description TEXT,                 -- 説明
  level INTEGER NOT NULL,           -- 階層レベル（1: 部門, 2: 部, 3: 課, 4: チーム）
  levelName TEXT NOT NULL,          -- 階層名（"部門", "部", "課", "チーム"）
  position INTEGER DEFAULT 0,       -- 表示順序
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (parentId) REFERENCES organizations(id)  -- 自己参照（階層構造）
);
```

### 組織IDの形式

**現在の実装**: UUID形式

```
例: f41b8b41-b52b-4204-aae6-345a83e565e7
```

- UUID形式（36文字）
- 各組織に一意のIDが割り当てられる
- `organizations`テーブルの`id`カラムに格納

**注意**: 過去のドキュメントでは`init_`で始まる形式が記載されていましたが、現在の実装ではUUID形式を使用しています。

## organizationIdの用途

### 1. データの紐づけ

組織に関連するデータは、すべて`organizationId`で紐づけられます：

| データタイプ | テーブル | organizationIdカラム |
|------------|---------|-------------------|
| エンティティ | `entities` | `organizationId` |
| リレーション | `relations` | `organizationId` |
| トピック | `topics` | `organizationId` |
| 議事録 | `meetingNotes` | `organizationId` |
| 注力施策 | `focusInitiatives` | `organizationId` |
| 組織メンバー | `organizationMembers` | `organizationId` |
| 組織コンテンツ | `organizationContents` | `organizationId` |
| 事業会社 | `companies` | `organizationId` |
| 組織・会社表示関係 | `organizationCompanyDisplay` | `organizationId` |

### 2. ChromaDBのコレクション分離

ChromaDBでは、組織ごとにコレクションを分けています：

```
entities_{organizationId}      → エンティティの埋め込みベクトル
relations_{organizationId}     → リレーションの埋め込みベクトル
topics_{organizationId}        → トピックの埋め込みベクトル
```

**例**:
- `entities_f41b8b41-b52b-4204-aae6-345a83e565e7` → フロンティアビジネス部のエンティティ
- `entities_abc12345-6789-0123-4567-890123456789` → BPOビジネス部のエンティティ

### 3. 検索範囲の限定

`organizationId`を指定することで、特定の組織のデータのみを検索できます：

```typescript
// フロンティアビジネス部のエンティティのみを検索
findSimilarEntities('トヨタ', 5, 'f41b8b41-b52b-4204-aae6-345a83e565e7');
```

## なぜorganizationIdが必要なのか？

### 1. データの分離

- 組織ごとにデータを分離することで、セキュリティを確保
- 他の組織のデータにアクセスできないようにする

### 2. 検索パフォーマンスの向上

- 組織ごとにコレクションを分けることで、検索範囲を限定
- 全データを検索する必要がなくなり、高速化

### 3. データ管理の明確化

- どのデータがどの組織に属するかが明確
- 組織単位でのデータ管理が可能

## 実際の使用例

### 例1: 組織ページから検索

```
URL: /organization/f41b8b41-b52b-4204-aae6-345a83e565e7
    ↓
organizationId = 'f41b8b41-b52b-4204-aae6-345a83e565e7'
    ↓
ChromaDB: entities_f41b8b41-b52b-4204-aae6-345a83e565e7 を検索
```

### 例2: RAG検索ページで組織を選択

```
RAG検索ページで「フロンティアビジネス部」を選択
    ↓
organizationId = 'f41b8b41-b52b-4204-aae6-345a83e565e7'
    ↓
ChromaDB: entities_f41b8b41-b52b-4204-aae6-345a83e565e7 を検索
```

### 例3: システム設計ページから検索

```
URL: /design
    ↓
organizationId = undefined（組織ページではない）
    ↓
ChromaDB: design_docs コレクションを検索（organizationId不要）
```

## organizationIdが取得できない場合

### 問題

- `/design`ページなど、組織ページではないページから検索する場合
- `organizationId`が`undefined`になる
- ChromaDB検索がスキップされる

### 解決方法

1. **組織ページから検索する**
   - `/organization/[id]`ページから検索を実行
   - `organizationId`が自動的に取得される

2. **RAG検索ページで組織を選択する**
   - `/rag-search`ページで組織を選択
   - `organizationId`が指定される

3. **SQLiteフォールバックを使用する**（エンティティ・リレーション・トピック検索の場合）
   - `organizationId`が`undefined`の場合、自動的にSQLite全文検索にフォールバック
   - ただし、パフォーマンスは劣る
   - システム設計ドキュメント検索の場合はフォールバックなし（`organizationId`不要）

## まとめ

- **organizationId**: 組織を一意に識別するID
- **組織**: 会社内の階層構造（部門、部、課、チーム）
- **用途**: データの紐づけ、ChromaDBのコレクション分離、検索範囲の限定
- **取得方法**: 組織ページのURLから取得、またはRAG検索ページで選択

## 関連ドキュメント

- [`chromadb/CHROMADB_SEARCH_CONDITIONS.md`](../chromadb/CHROMADB_SEARCH_CONDITIONS.md) - ChromaDB検索の条件
- [`database/database-design.md`](../database/database-design.md) - データベース設計
- [`organization/ORGANIZATION_ID_DESIGN_COMPARISON.md`](./ORGANIZATION_ID_DESIGN_COMPARISON.md) - 組織ID管理方式の比較
