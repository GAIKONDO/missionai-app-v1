# データベース設計ドキュメント

> **📋 ステータス**: アクティブ（メイン設計書）  
> **📅 最終更新**: 2025-01-XX（全テーブル詳細追加）  
> **👤 用途**: データベース設計の概要とアーキテクチャ

## 概要

このプロジェクトでは、SQLiteとChromaDBの2つのデータベースを使用し、それぞれの役割を明確に分離しています。データロックがかからない設計を実現するため、読み取りと書き込みを分離し、書き込みキューを使用しています。

## データベースの役割分担

### SQLite

**役割**: 構造化データの永続化

**用途**:
- ユーザー管理（users, admins, approvalRequests）
- 組織情報（organizations）
- 組織メンバー情報（organizationMembers）
- 組織コンテンツ（organizationContents）
- 事業会社情報（companies）
- 事業会社コンテンツ（companyContents）
- 組織・会社表示関係（organizationCompanyDisplay）
- 議事録（meetingNotes）
- 注力施策（focusInitiatives）
- テーマ（themes）
- テーマ階層設定（themeHierarchyConfigs）
- エンティティ（entities）- メタデータのみ
- 関係（relations）- メタデータのみ
- トピック（topics）- メタデータのみ
- システム設計ドキュメント（designDocSections, designDocSectionRelations）
- ページコンテナ（pageContainers）
- AI設定（aiSettings）
- バックアップ履歴（backupHistory）

**特徴**:
- ACIDトランザクション保証
- リレーショナルデータの管理
- 構造化クエリ（JOIN、集計など）
- ChromaDB同期状態の管理（chromaSynced, chromaSyncError, lastChromaSyncAttempt）
- RAG検索最適化（searchableText, displayName, contentSummary, lastSearchDate, searchCount）

### ChromaDB

**役割**: ベクトル検索とセマンティック検索

**用途**:
- エンティティの埋め込みベクトル（`entities_{organizationId}`コレクション）
  - 組織（`type='organization'`）と事業会社（`type='company'`）の両方を含む
- 関係の埋め込みベクトル（`relations_{organizationId}`コレクション）
  - 組織（`type='organization'`）と事業会社（`type='company'`）の両方を含む
- トピックの埋め込みベクトル（`topics_{organizationId}`コレクション）
  - 組織（`type='organization'`）と事業会社（`type='company'`）の両方を含む
- システム設計ドキュメントの埋め込みベクトル（`design_docs`コレクション）

**注意**: 事業会社専用のコレクション（`companies_{organizationId}`など）は不要です。組織と事業会社は同じコレクションを使用し、`organizationId`で区別します。

**特徴**:
- 高次元ベクトルの保存と検索
- セマンティック類似度検索
- メタデータとベクトルの組み合わせ検索
- SQLiteとは独立したデータストア

## データロック回避の設計

### 書き込みキューシステム

すべてのデータベース書き込み操作は、単一の書き込みワーカー（`WriteWorker`）を経由します。

**アーキテクチャ**:
```
フロントエンド/API
    ↓
書き込みキュー（async_channel）
    ↓
WriteWorker（単一スレッド）
    ↓
SQLite（書き込み専用コネクション）
```

**利点**:
- 書き込み操作の順序保証
- デッドロックの回避
- トランザクションの適切な管理
- エラーハンドリングの一元化

### 読み取り操作

読み取り操作は、接続プール（`DatabasePool`）から取得したコネクションを使用します。

**特徴**:
- 複数の読み取り操作を並列実行可能
- 書き込み操作と競合しない
- 読み取り専用トランザクションを使用

### ChromaDB操作

ChromaDB操作は、Rustの非同期クライアント（`ChromaClient`）を使用します。

**特徴**:
- SQLiteとは独立した操作
- 非同期処理
- エラーハンドリングとリトライ機能

## 同期メカニズム

### SQLite → ChromaDB同期

1. SQLiteにデータを書き込み（`chromaSynced = 0`）
2. バックグラウンドでChromaDBに埋め込みベクトルを保存
3. 同期成功時に`chromaSynced = 1`に更新
4. エラー時は`chromaSyncError`にエラーメッセージを記録

### 同期状態の管理

各テーブルには以下のカラムが追加されています：
- `chromaSynced`: 同期状態（0: 未同期、1: 同期済み）
- `chromaSyncError`: 同期エラーメッセージ（NULL: エラーなし）
- `lastChromaSyncAttempt`: 最後の同期試行日時

## ポート設定

### 開発環境
- Next.js開発サーバー: ポート3010
- Rust APIサーバー: ポート3011（デフォルト、環境変数で変更可能）
- ChromaDB Server: ポート8000（環境変数で変更可能）

### 本番環境
- Rust APIサーバー: ポート3011（環境変数で変更可能）
- ChromaDB Server: ポート8000（環境変数で変更可能）
- Next.js: 静的エクスポート（Node.js不要）

**注意:**
- Next.jsとRust APIサーバーは異なるポートを使用（競合回避）
- ポートは環境変数（`API_SERVER_PORT`, `CHROMADB_PORT`）で変更可能
- ポート競合時は自動的に利用可能なポートを検出
- ChromaDB Serverが起動しない場合:
  - **エンティティ・リレーション検索**: SQLite全文検索モードにフォールバック
  - **トピック検索**: フォールバックなし（検索結果は空）

**詳細:**
ポート設定、サーバー構成、フォールバック仕様の詳細については、[ポート設計とサーバー構成の設計書](./port-and-server-design.md)を参照してください。

## ルーティング方式

動的ルーティングではなく、クエリパラメータ方式を使用しています。

**例**:
- `/companies/detail?id=123` （動的ルーティング `/companies/detail/[id]` の代わり）
- `/organization/detail?id=456&tab=focusInitiatives`

**利点**:
- 静的エクスポートが可能
- Node.jsサーバーが不要
- Rustアプリケーションで直接配信可能

## SQLiteスキーマ定義

### ユーザー管理テーブル

#### users
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    approved INTEGER DEFAULT 0,
    approvedBy TEXT,
    approvedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `email` | TEXT | NOT NULL | - | ユーザーのメールアドレス。UNIQUE制約あり |
| `passwordHash` | TEXT | NOT NULL | - | パスワードのハッシュ値（bcrypt） |
| `approved` | INTEGER | NOT NULL | 0 | 承認状態（0: 未承認、1: 承認済み） |
| `approvedBy` | TEXT | NULL | - | 承認者のユーザーID |
| `approvedAt` | TEXT | NULL | - | 承認日時（ISO 8601形式） |
| `role` | TEXT | NOT NULL | 'user' | ユーザー役割（'user': 一般ユーザー、'admin': 管理者） |
| `createdAt` | TEXT | NOT NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NOT NULL | - | 更新日時（ISO 8601形式） |

**インデックス**:
- `idx_users_email`: `email`カラムにインデックス（UNIQUE制約により自動生成）

**注意事項**:
- `role`カラムにより、一般ユーザーと管理者を区別
  - `role='user'`: 一般ユーザー（デフォルト）
  - `role='admin'`: 管理者
- 管理者は`users`テーブルで`role='admin'`として管理（`admins`テーブルは削除済み）

#### approvalRequests
```sql
CREATE TABLE approvalRequests (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    requestedAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `userId` | TEXT | NOT NULL | - | ユーザーID（usersテーブルへの外部キー） |
| `email` | TEXT | NOT NULL | - | 承認リクエストのメールアドレス |
| `status` | TEXT | NOT NULL | 'pending' | リクエスト状態（'pending', 'approved', 'rejected'） |
| `requestedAt` | TEXT | NOT NULL | - | リクエスト日時（ISO 8601形式） |

**外部キー**:
- `userId` → `users.id`

### 組織管理テーブル

#### organizations
```sql
CREATE TABLE organizations (
    id TEXT PRIMARY KEY,
    parentId TEXT,
    name TEXT NOT NULL,
    title TEXT,
    description TEXT,
    level INTEGER NOT NULL,
    levelName TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    type TEXT DEFAULT 'organization',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (parentId) REFERENCES organizations(id)
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `parentId` | TEXT | NULL | - | 親組織のID（自己参照外部キー） |
| `name` | TEXT | NOT NULL | - | 組織名（必須） |
| `title` | TEXT | NULL | - | 組織のタイトル |
| `description` | TEXT | NULL | - | 組織の説明 |
| `level` | INTEGER | NOT NULL | - | 階層レベル（0から開始。0が最上位） |
| `levelName` | TEXT | NOT NULL | - | 階層レベルの名称（例: "本部", "部", "課"） |
| `position` | INTEGER | NOT NULL | 0 | 表示順序（同じ階層内での並び順） |
| `type` | TEXT | NOT NULL | 'organization' | 組織タイプ（'organization', 'company', 'person'） |
| `createdAt` | TEXT | NOT NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NOT NULL | - | 更新日時（ISO 8601形式） |

**外部キー**:
- `parentId` → `organizations.id`（自己参照）

**インデックス**:
- `idx_organizations_parentId`: 親組織検索用
- `idx_organizations_level`: 階層レベル検索用
- `idx_organizations_levelName`: 階層レベル名検索用

**注意事項**:
- `type`カラムにより、組織、事業会社、個人を区別
  - `type='organization'`: 通常の組織
  - `type='company'`: 事業会社（旧`companies`テーブルのデータはこちらに統合）
  - `type='person'`: 個人
- `level`と`levelName`で階層構造を管理
- `parentId`がNULLの場合は最上位組織
- 事業会社を取得するには`WHERE type = 'company'`を使用

#### organizationMembers
```sql
CREATE TABLE organizationMembers (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL,
    name TEXT NOT NULL,
    position TEXT,
    nameRomaji TEXT,
    department TEXT,
    extension TEXT,
    companyPhone TEXT,
    mobilePhone TEXT,
    email TEXT,
    itochuEmail TEXT,
    teams TEXT,
    employeeType TEXT,
    roleName TEXT,
    indicator TEXT,
    location TEXT,
    floorDoorNo TEXT,
    previousName TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (organizationId) REFERENCES organizations(id)
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `organizationId` | TEXT | NOT NULL | - | 所属組織ID（organizationsテーブルへの外部キー） |
| `name` | TEXT | NOT NULL | - | メンバー名（必須） |
| `position` | TEXT | NULL | - | 役職 |
| `nameRomaji` | TEXT | NULL | - | 名前のローマ字表記 |
| `department` | TEXT | NULL | - | 部署名 |
| `extension` | TEXT | NULL | - | 内線番号 |
| `companyPhone` | TEXT | NULL | - | 会社電話番号 |
| `mobilePhone` | TEXT | NULL | - | 携帯電話番号 |
| `email` | TEXT | NULL | - | メールアドレス |
| `itochuEmail` | TEXT | NULL | - | 伊藤忠メールアドレス |
| `teams` | TEXT | NULL | - | Teams情報 |
| `employeeType` | TEXT | NULL | - | 雇用形態 |
| `roleName` | TEXT | NULL | - | ロール名 |
| `indicator` | TEXT | NULL | - | インジケーター |
| `location` | TEXT | NULL | - | 所在地 |
| `floorDoorNo` | TEXT | NULL | - | フロア・ドア番号 |
| `previousName` | TEXT | NULL | - | 旧名 |
| `createdAt` | TEXT | NOT NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NOT NULL | - | 更新日時（ISO 8601形式） |

**外部キー**:
- `organizationId` → `organizations.id`

**インデックス**:
- `idx_organizationMembers_organizationId`: 組織に紐づくメンバー検索用（組織と事業会社の両方を含む）

#### organizationContents
```sql
CREATE TABLE organizationContents (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL,
    introduction TEXT,
    focusAreas TEXT,
    meetingNotes TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY (organizationId) REFERENCES organizations(id)
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `organizationId` | TEXT | NOT NULL | - | 組織ID（organizationsテーブルへの外部キー） |
| `introduction` | TEXT | NULL | - | 組織の紹介文 |
| `focusAreas` | TEXT | NULL | - | 注力領域（JSON形式またはテキスト） |
| `meetingNotes` | TEXT | NULL | - | 議事録関連情報 |
| `createdAt` | TEXT | NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NULL | - | 更新日時（ISO 8601形式） |

**外部キー**:
- `organizationId` → `organizations.id`

**インデックス**:
- `idx_organizationContents_organizationId`: 組織コンテンツ検索用（組織と事業会社の両方を含む）

### 事業会社管理

**重要**: 事業会社は`organizations`テーブルの`type='company'`で管理されます。組織と同列でデータを扱い、`type`カラムで区別します。

- 独立した`companies`テーブルは廃止されました
- `companyContents`テーブルは廃止され、`organizationContents`テーブルに統合されました
- `organizationCompanyDisplay`テーブルは廃止されました（組織間の関係として扱う場合は、別の方法で管理）

事業会社を取得するには、以下のクエリを使用します：
```sql
SELECT * FROM organizations WHERE type = 'company'
```

事業会社のコンテンツは`organizationContents`テーブルで管理します：
```sql
SELECT oc.* FROM organizationContents oc
JOIN organizations o ON oc.organizationId = o.id
WHERE o.type = 'company'
```

### 議事録・施策テーブル

#### meetingNotes
```sql
CREATE TABLE meetingNotes (
    id TEXT PRIMARY KEY,
    organizationId TEXT,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    chromaSynced INTEGER DEFAULT 0,
    chromaSyncError TEXT,
    lastChromaSyncAttempt TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY (organizationId) REFERENCES organizations(id)
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `organizationId` | TEXT | NULL | - | 組織ID（organizationsテーブルへの外部キー、type='organization'またはtype='company'） |
| `title` | TEXT | NOT NULL | - | 議事録のタイトル（必須） |
| `description` | TEXT | NULL | - | 議事録の説明 |
| `content` | TEXT | NULL | - | 議事録の本文 |
| `chromaSynced` | INTEGER | NOT NULL | 0 | ChromaDB同期状態（0: 未同期、1: 同期済み） |
| `chromaSyncError` | TEXT | NULL | - | ChromaDB同期エラーメッセージ |
| `lastChromaSyncAttempt` | TEXT | NULL | - | 最後のChromaDB同期試行日時 |
| `createdAt` | TEXT | NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NULL | - | 更新日時（ISO 8601形式） |

**外部キー**:
- `organizationId` → `organizations.id`（`type='organization'`または`type='company'`の組織を参照）

**インデックス**:
- `idx_meetingNotes_organizationId`: 組織の議事録検索用（組織と事業会社の両方を含む）
- `idx_meetingNotes_chromaSynced`: ChromaDB同期状態検索用
- `idx_meetingNotes_org_chroma`: 組織と同期状態の複合インデックス

#### focusInitiatives
```sql
CREATE TABLE focusInitiatives (
    id TEXT PRIMARY KEY,
    organizationId TEXT,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    themeIds TEXT,
    topicIds TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY (organizationId) REFERENCES organizations(id)
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `organizationId` | TEXT | NULL | - | 組織ID（organizationsテーブルへの外部キー、type='organization'またはtype='company'） |
| `title` | TEXT | NOT NULL | - | 注力施策のタイトル（必須） |
| `description` | TEXT | NULL | - | 注力施策の説明 |
| `content` | TEXT | NULL | - | 注力施策の本文 |
| `themeIds` | TEXT | NULL | - | 関連テーマIDのJSON配列（例: `["theme-1", "theme-2"]`） |
| `topicIds` | TEXT | NULL | - | 関連トピックIDのJSON配列（例: `["topic-1", "topic-2"]`） |
| `createdAt` | TEXT | NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NULL | - | 更新日時（ISO 8601形式） |

**外部キー**:
- `organizationId` → `organizations.id`（`type='organization'`または`type='company'`の組織を参照）

**インデックス**:
- `idx_focusInitiatives_organizationId`: 組織の注力施策検索用（組織と事業会社の両方を含む）

**注意事項**:
- `themeIds`と`topicIds`はJSON配列形式の文字列として保存
- 関連するテーマやトピックを複数紐づけ可能

#### themes
```sql
CREATE TABLE themes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    initiativeIds TEXT,
    position INTEGER,
    createdAt TEXT,
    updatedAt TEXT
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `title` | TEXT | NOT NULL | - | テーマのタイトル（必須） |
| `description` | TEXT | NULL | - | テーマの説明 |
| `initiativeIds` | TEXT | NULL | - | 関連注力施策IDのJSON配列（例: `["init-1", "init-2"]`） |
| `position` | INTEGER | NULL | - | 表示順序（数値が小さいほど先に表示） |
| `createdAt` | TEXT | NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NULL | - | 更新日時（ISO 8601形式） |

**インデックス**:
- `idx_themes_id`: テーマID検索用
- `idx_themes_position`: テーマ表示順序検索用

**注意事項**:
- `initiativeIds`はJSON配列形式の文字列として保存
- `position`がNULLの場合は、`createdAt`順に表示

#### themeHierarchyConfigs
```sql
CREATE TABLE themeHierarchyConfigs (
    id TEXT PRIMARY KEY,
    maxLevels INTEGER NOT NULL,
    levels TEXT NOT NULL,
    createdAt TEXT,
    updatedAt TEXT
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `maxLevels` | INTEGER | NOT NULL | - | 最大階層レベル数 |
| `levels` | TEXT | NOT NULL | - | 階層レベルの設定（JSON形式） |
| `createdAt` | TEXT | NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NULL | - | 更新日時（ISO 8601形式） |

**注意事項**:
- A2C100用のテーマ階層設定を保存
- `levels`はJSON形式の文字列として保存

### ナレッジグラフテーブル

#### entities
```sql
CREATE TABLE entities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    aliases TEXT,
    metadata TEXT,
    organizationId TEXT,
    searchableText TEXT,
    displayName TEXT,
    chromaSynced INTEGER DEFAULT 0,
    chromaSyncError TEXT,
    lastChromaSyncAttempt TEXT,
    lastSearchDate TEXT,
    searchCount INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (organizationId) REFERENCES organizations(id)
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `name` | TEXT | NOT NULL | - | エンティティ名（必須） |
| `type` | TEXT | NOT NULL | - | エンティティタイプ（例: "person", "organization", "concept"） |
| `aliases` | TEXT | NULL | - | エイリアス（JSON配列形式の文字列） |
| `metadata` | TEXT | NULL | - | メタデータ（JSON形式の文字列） |
| `organizationId` | TEXT | NULL | - | 組織ID（organizationsテーブルへの外部キー、type='organization'またはtype='company'） |
| `searchableText` | TEXT | NULL | - | 検索用テキスト（自動生成: name + aliases + metadata） |
| `displayName` | TEXT | NULL | - | 表示用名称（自動生成: name + role） |
| `chromaSynced` | INTEGER | NOT NULL | 0 | ChromaDB同期状態（0: 未同期、1: 同期済み） |
| `chromaSyncError` | TEXT | NULL | - | ChromaDB同期エラーメッセージ |
| `lastChromaSyncAttempt` | TEXT | NULL | - | 最後のChromaDB同期試行日時 |
| `lastSearchDate` | TEXT | NULL | - | 最後に検索された日時（RAG検索最適化用） |
| `searchCount` | INTEGER | NOT NULL | 0 | 検索回数（RAG検索最適化用） |
| `createdAt` | TEXT | NOT NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NOT NULL | - | 更新日時（ISO 8601形式） |

**外部キー**:
- `organizationId` → `organizations.id`（`type='organization'`または`type='company'`の組織を参照）

**インデックス**:
- `idx_entities_organizationId`: 組織のエンティティ検索用（組織と事業会社の両方を含む）（`type='company'`の組織を参照）
- `idx_entities_type`: エンティティタイプ検索用
- `idx_entities_name`: エンティティ名検索用
- `idx_entities_chromaSynced`: ChromaDB同期状態検索用
- `idx_entities_searchable_text`: 検索用テキスト検索用
- `idx_entities_org_chroma`: 組織と同期状態の複合インデックス

**自動更新トリガー**:
- `update_entities_searchable_fields`: INSERT時に`searchableText`と`displayName`を自動生成
- `update_entities_searchable_fields_on_update`: UPDATE時に`searchableText`と`displayName`を自動更新

**注意事項**:
- `aliases`と`metadata`はJSON形式の文字列として保存
- `searchableText`と`displayName`はトリガーにより自動生成される
- RAG検索最適化のため、`lastSearchDate`と`searchCount`で検索頻度を追跡

#### relations
```sql
CREATE TABLE relations (
    id TEXT PRIMARY KEY,
    topicId TEXT NOT NULL,
    sourceEntityId TEXT,
    targetEntityId TEXT,
    relationType TEXT NOT NULL,
    description TEXT,
    confidence REAL,
    metadata TEXT,
    organizationId TEXT,
    searchableText TEXT,
    chromaSynced INTEGER DEFAULT 0,
    chromaSyncError TEXT,
    lastChromaSyncAttempt TEXT,
    lastSearchDate TEXT,
    searchCount INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (sourceEntityId) REFERENCES entities(id),
    FOREIGN KEY (targetEntityId) REFERENCES entities(id),
    FOREIGN KEY (organizationId) REFERENCES organizations(id)
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `topicId` | TEXT | NOT NULL | - | トピックID（topics.topicIdを参照） |
| `sourceEntityId` | TEXT | NULL | - | ソースエンティティID（entitiesテーブルへの外部キー） |
| `targetEntityId` | TEXT | NULL | - | ターゲットエンティティID（entitiesテーブルへの外部キー） |
| `relationType` | TEXT | NOT NULL | - | 関係タイプ（例: "works_for", "located_in"） |
| `description` | TEXT | NULL | - | 関係の説明 |
| `confidence` | REAL | NULL | - | 信頼度（0.0〜1.0） |
| `metadata` | TEXT | NULL | - | メタデータ（JSON形式の文字列） |
| `organizationId` | TEXT | NULL | - | 組織ID（organizationsテーブルへの外部キー、type='organization'またはtype='company'） |
| `searchableText` | TEXT | NULL | - | 検索用テキスト（自動生成: relationType + description） |
| `chromaSynced` | INTEGER | NOT NULL | 0 | ChromaDB同期状態（0: 未同期、1: 同期済み） |
| `chromaSyncError` | TEXT | NULL | - | ChromaDB同期エラーメッセージ |
| `lastChromaSyncAttempt` | TEXT | NULL | - | 最後のChromaDB同期試行日時 |
| `lastSearchDate` | TEXT | NULL | - | 最後に検索された日時（RAG検索最適化用） |
| `searchCount` | INTEGER | NOT NULL | 0 | 検索回数（RAG検索最適化用） |
| `createdAt` | TEXT | NOT NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NOT NULL | - | 更新日時（ISO 8601形式） |

**外部キー**:
- `sourceEntityId` → `entities.id`
- `targetEntityId` → `entities.id`
- `organizationId` → `organizations.id`（`type='organization'`または`type='company'`の組織を参照）

**インデックス**:
- `idx_relations_topicId`: トピックに紐づく関係検索用
- `idx_relations_sourceEntityId`: ソースエンティティ検索用
- `idx_relations_targetEntityId`: ターゲットエンティティ検索用
- `idx_relations_organizationId`: 組織の関係検索用（組織と事業会社の両方を含む）
- `idx_relations_relationType`: 関係タイプ検索用
- `idx_relations_chromaSynced`: ChromaDB同期状態検索用
- `idx_relations_searchable_text`: 検索用テキスト検索用
- `idx_relations_org_chroma`: 組織と同期状態の複合インデックス

**自動更新トリガー**:
- `update_relations_searchable_fields`: INSERT時に`searchableText`を自動生成
- `update_relations_searchable_fields_on_update`: UPDATE時に`searchableText`を自動更新

**注意事項**:
- `metadata`はJSON形式の文字列として保存
- `searchableText`はトリガーにより自動生成される
- RAG検索最適化のため、`lastSearchDate`と`searchCount`で検索頻度を追跡

#### topics
```sql
CREATE TABLE topics (
    id TEXT PRIMARY KEY,
    topicId TEXT NOT NULL,
    meetingNoteId TEXT NOT NULL,
    organizationId TEXT,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    semanticCategory TEXT,
    keywords TEXT,
    tags TEXT,
    contentSummary TEXT,
    searchableText TEXT,
    chromaSynced INTEGER DEFAULT 0,
    chromaSyncError TEXT,
    lastChromaSyncAttempt TEXT,
    lastSearchDate TEXT,
    searchCount INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (meetingNoteId) REFERENCES meetingNotes(id),
    FOREIGN KEY (organizationId) REFERENCES organizations(id)
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `topicId` | TEXT | NOT NULL | - | トピックID（idと同じ値、後方互換性のため保持） |
| `meetingNoteId` | TEXT | NOT NULL | - | 議事録ID（meetingNotesテーブルへの外部キー） |
| `organizationId` | TEXT | NULL | - | 組織ID（organizationsテーブルへの外部キー、type='organization'またはtype='company'） |
| `title` | TEXT | NOT NULL | - | トピックのタイトル（必須） |
| `description` | TEXT | NULL | - | トピックの説明 |
| `content` | TEXT | NULL | - | トピックの本文 |
| `semanticCategory` | TEXT | NULL | - | セマンティックカテゴリ |
| `keywords` | TEXT | NULL | - | キーワード（JSON配列形式の文字列） |
| `tags` | TEXT | NULL | - | タグ（JSON配列形式の文字列） |
| `contentSummary` | TEXT | NULL | - | コンテンツの要約（自動生成: contentの最初の200文字） |
| `searchableText` | TEXT | NULL | - | 検索用テキスト（自動生成: title + description + contentSummary） |
| `chromaSynced` | INTEGER | NOT NULL | 0 | ChromaDB同期状態（0: 未同期、1: 同期済み） |
| `chromaSyncError` | TEXT | NULL | - | ChromaDB同期エラーメッセージ |
| `lastChromaSyncAttempt` | TEXT | NULL | - | 最後のChromaDB同期試行日時 |
| `lastSearchDate` | TEXT | NULL | - | 最後に検索された日時（RAG検索最適化用） |
| `searchCount` | INTEGER | NOT NULL | 0 | 検索回数（RAG検索最適化用） |
| `createdAt` | TEXT | NOT NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NOT NULL | - | 更新日時（ISO 8601形式） |

**外部キー**:
- `meetingNoteId` → `meetingNotes.id`
- `organizationId` → `organizations.id`（`type='organization'`または`type='company'`の組織を参照）

**インデックス**:
- `idx_topics_meetingNoteId`: 議事録に紐づくトピック検索用
- `idx_topics_organizationId`: 組織のトピック検索用（組織と事業会社の両方を含む）
- `idx_topics_chromaSynced`: ChromaDB同期状態検索用
- `idx_topics_searchable_text`: 検索用テキスト検索用
- `idx_topics_semanticCategory`: セマンティックカテゴリ検索用
- `idx_topics_org_chroma`: 組織と同期状態の複合インデックス

**自動更新トリガー**:
- `update_topics_searchable_fields`: INSERT時に`contentSummary`と`searchableText`を自動生成
- `update_topics_searchable_fields_on_update`: UPDATE時に`contentSummary`と`searchableText`を自動更新

**注意事項**:
- `keywords`と`tags`はJSON配列形式の文字列として保存
- `contentSummary`と`searchableText`はトリガーにより自動生成される
- `topicId`は`id`と同じ値（後方互換性のため保持）
- RAG検索最適化のため、`lastSearchDate`と`searchCount`で検索頻度を追跡

### システム設計ドキュメントテーブル

#### designDocSections
```sql
CREATE TABLE designDocSections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    tags TEXT,
    order_index INTEGER DEFAULT 0,
    pageUrl TEXT DEFAULT '/design',
    hierarchy TEXT,
    relatedSections TEXT,
    semanticCategory TEXT,
    keywords TEXT,
    summary TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `title` | TEXT | NOT NULL | - | セクションのタイトル（必須） |
| `description` | TEXT | NULL | - | セクションの説明 |
| `content` | TEXT | NOT NULL | - | セクションの本文（必須） |
| `tags` | TEXT | NULL | - | タグ（JSON配列形式の文字列） |
| `order_index` | INTEGER | NOT NULL | 0 | 表示順序（数値が小さいほど先に表示） |
| `pageUrl` | TEXT | NOT NULL | '/design' | ページURL |
| `hierarchy` | TEXT | NULL | - | 階層構造（JSON形式の文字列） |
| `relatedSections` | TEXT | NULL | - | 関連セクションID（JSON配列形式の文字列） |
| `semanticCategory` | TEXT | NULL | - | セマンティックカテゴリ |
| `keywords` | TEXT | NULL | - | キーワード（JSON配列形式の文字列） |
| `summary` | TEXT | NULL | - | 要約 |
| `createdAt` | TEXT | NOT NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NOT NULL | - | 更新日時（ISO 8601形式） |

**インデックス**:
- `idx_designDocSections_order`: セクション順序検索用
- `idx_designDocSections_semanticCategory`: セマンティックカテゴリ検索用

**注意事項**:
- `tags`、`hierarchy`、`relatedSections`、`keywords`はJSON形式の文字列として保存

#### designDocSectionRelations
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

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `sourceSectionId` | TEXT | NOT NULL | - | ソースセクションID（designDocSectionsテーブルへの外部キー） |
| `targetSectionId` | TEXT | NOT NULL | - | ターゲットセクションID（designDocSectionsテーブルへの外部キー） |
| `relationType` | TEXT | NOT NULL | - | 関係タイプ（例: "references", "depends_on"） |
| `description` | TEXT | NULL | - | 関係の説明 |
| `createdAt` | TEXT | NOT NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NOT NULL | - | 更新日時（ISO 8601形式） |

**外部キー**:
- `sourceSectionId` → `designDocSections.id`（ON DELETE CASCADE）
- `targetSectionId` → `designDocSections.id`（ON DELETE CASCADE）

**インデックス**:
- `idx_designDocSectionRelations_source`: ソースセクション検索用
- `idx_designDocSectionRelations_target`: ターゲットセクション検索用
- `idx_designDocSectionRelations_type`: 関係タイプ検索用

### その他のテーブル

#### pageContainers
```sql
CREATE TABLE pageContainers (
    id TEXT PRIMARY KEY,
    pageId TEXT NOT NULL,
    planId TEXT NOT NULL,
    planType TEXT NOT NULL,
    containerType TEXT NOT NULL,
    containerData TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    userId TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `pageId` | TEXT | NOT NULL | - | ページID |
| `planId` | TEXT | NOT NULL | - | プランID |
| `planType` | TEXT | NOT NULL | - | プランタイプ |
| `containerType` | TEXT | NOT NULL | - | コンテナタイプ |
| `containerData` | TEXT | NOT NULL | - | コンテナデータ（JSON形式の文字列） |
| `position` | INTEGER | NOT NULL | 0 | 表示位置（数値が小さいほど先に表示） |
| `userId` | TEXT | NOT NULL | - | ユーザーID（usersテーブルへの外部キー） |
| `createdAt` | TEXT | NOT NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NOT NULL | - | 更新日時（ISO 8601形式） |

**外部キー**:
- `userId` → `users.id`

**インデックス**:
- `idx_pageContainers_pageId`: ページID検索用
- `idx_pageContainers_planId`: プランID検索用
- `idx_pageContainers_userId`: ユーザーのページコンテナ検索用

**注意事項**:
- `containerData`はJSON形式の文字列として保存

#### aiSettings
```sql
CREATE TABLE aiSettings (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    apiKey TEXT,
    baseUrl TEXT,
    defaultModel TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `provider` | TEXT | NOT NULL | - | AIプロバイダー名（例: "openai", "anthropic"） |
| `apiKey` | TEXT | NULL | - | APIキー（暗号化して保存推奨） |
| `baseUrl` | TEXT | NULL | - | APIベースURL |
| `defaultModel` | TEXT | NULL | - | デフォルトモデル名 |
| `createdAt` | TEXT | NOT NULL | - | 作成日時（ISO 8601形式） |
| `updatedAt` | TEXT | NOT NULL | - | 更新日時（ISO 8601形式） |

**注意事項**:
- `apiKey`は機密情報のため、暗号化して保存することを推奨

#### backupHistory
```sql
CREATE TABLE backupHistory (
    id TEXT PRIMARY KEY,
    backupPath TEXT NOT NULL,
    backupSize INTEGER,
    createdAt TEXT NOT NULL
)
```

**カラム詳細**:
| カラム名 | 型 | NULL制約 | デフォルト値 | 説明 |
|---------|-----|---------|--------------|------|
| `id` | TEXT | NOT NULL | - | プライマリキー。UUID形式の文字列 |
| `backupPath` | TEXT | NOT NULL | - | バックアップファイルのパス |
| `backupSize` | INTEGER | NULL | - | バックアップファイルのサイズ（バイト） |
| `createdAt` | TEXT | NOT NULL | - | バックアップ作成日時（ISO 8601形式） |

**注意事項**:
- データベースのバックアップ履歴を管理
- `backupSize`がNULLの場合はサイズ情報が不明

## インデックス

### 主要インデックス

#### 組織関連
- `idx_organizations_parentId`: 親組織検索
- `idx_organizations_level`: 階層レベル検索
- `idx_organizations_levelName`: 階層レベル名検索
- `idx_organizationMembers_organizationId`: 組織メンバー検索
- `idx_organizationContents_organizationId`: 組織コンテンツ検索


#### 議事録・施策関連
- `idx_meetingNotes_organizationId`: 組織の議事録検索（組織と事業会社の両方を含む）
- `idx_meetingNotes_chromaSynced`: ChromaDB同期状態検索
- `idx_meetingNotes_org_chroma`: 組織と同期状態の複合インデックス
- `idx_focusInitiatives_organizationId`: 組織の注力施策検索（組織と事業会社の両方を含む）
- `idx_themes_id`: テーマ検索
- `idx_themes_position`: テーマ表示順序

#### ナレッジグラフ関連
- `idx_entities_organizationId`: 組織のエンティティ検索（組織と事業会社の両方を含む）
- `idx_entities_type`: エンティティタイプ検索
- `idx_entities_name`: エンティティ名検索
- `idx_entities_chromaSynced`: ChromaDB同期状態検索
- `idx_entities_searchable_text`: 検索用テキスト検索
- `idx_entities_org_chroma`: 組織と同期状態の複合インデックス
- `idx_relations_topicId`: トピックに紐づく関係検索
- `idx_relations_sourceEntityId`: ソースエンティティ検索
- `idx_relations_targetEntityId`: ターゲットエンティティ検索
- `idx_relations_organizationId`: 組織の関係検索（組織と事業会社の両方を含む）
- `idx_relations_relationType`: 関係タイプ検索
- `idx_relations_chromaSynced`: ChromaDB同期状態検索
- `idx_relations_searchable_text`: 検索用テキスト検索
- `idx_relations_org_chroma`: 組織と同期状態の複合インデックス
- `idx_topics_meetingNoteId`: 議事録に紐づくトピック検索
- `idx_topics_organizationId`: 組織のトピック検索（組織と事業会社の両方を含む）
- `idx_topics_chromaSynced`: ChromaDB同期状態検索
- `idx_topics_searchable_text`: 検索用テキスト検索
- `idx_topics_semanticCategory`: セマンティックカテゴリ検索
- `idx_topics_org_chroma`: 組織と同期状態の複合インデックス

#### システム設計ドキュメント関連
- `idx_designDocSections_order`: セクション順序
- `idx_designDocSections_semanticCategory`: セマンティックカテゴリ検索
- `idx_designDocSectionRelations_source`: ソースセクション検索
- `idx_designDocSectionRelations_target`: ターゲットセクション検索
- `idx_designDocSectionRelations_type`: 関係タイプ検索

#### その他
- `idx_users_email`: ユーザー検索
- `idx_pageContainers_pageId`: ページコンテナ検索
- `idx_pageContainers_planId`: プラン検索
- `idx_pageContainers_userId`: ユーザーのページコンテナ検索

## 自動更新トリガー

### RAG検索最適化トリガー

以下のトリガーが自動的に検索用フィールドを更新します：

#### topicsテーブル
- `update_topics_searchable_fields`: INSERT時に`contentSummary`と`searchableText`を自動生成
- `update_topics_searchable_fields_on_update`: UPDATE時に`contentSummary`と`searchableText`を自動更新

#### entitiesテーブル
- `update_entities_searchable_fields`: INSERT時に`searchableText`と`displayName`を自動生成
- `update_entities_searchable_fields_on_update`: UPDATE時に`searchableText`と`displayName`を自動更新

#### relationsテーブル
- `update_relations_searchable_fields`: INSERT時に`searchableText`を自動生成
- `update_relations_searchable_fields_on_update`: UPDATE時に`searchableText`を自動更新

## 外部キー制約

### 主要な外部キー関係

- `organizations.parentId` → `organizations.id`
- `organizationMembers.organizationId` → `organizations.id`
- `organizationContents.organizationId` → `organizations.id`
- `companies.organizationId` → `organizations.id`
- `companyContents.companyId` → `companies.id`
- `organizationCompanyDisplay.organizationId` → `organizations.id`
- `organizationCompanyDisplay.companyId` → `companies.id`
- `meetingNotes.organizationId` → `organizations.id`（`type='organization'`または`type='company'`）
- `focusInitiatives.organizationId` → `organizations.id`（`type='organization'`または`type='company'`）
- `topics.meetingNoteId` → `meetingNotes.id`
- `topics.organizationId` → `organizations.id`（`type='organization'`または`type='company'`）
- `entities.organizationId` → `organizations.id`（`type='organization'`または`type='company'`）
- `relations.sourceEntityId` → `entities.id`
- `relations.targetEntityId` → `entities.id`
- `relations.organizationId` → `organizations.id`（`type='organization'`または`type='company'`）
- `designDocSectionRelations.sourceSectionId` → `designDocSections.id`
- `designDocSectionRelations.targetSectionId` → `designDocSections.id`
- `pageContainers.userId` → `users.id`
- `approvalRequests.userId` → `users.id`

**注意**: 事業会社関連の外部キー（`companyId`）はすべて削除され、`organizationId`のみを使用します。

## CHECK制約

### 組織/事業会社の管理

すべてのテーブルで`organizationId`のみを使用します。事業会社は`organizations`テーブルの`type='company'`で識別されます。

- `meetingNotes`: `organizationId`のみ（`type='organization'`または`type='company'`を参照）
- `focusInitiatives`: `organizationId`のみ（`type='organization'`または`type='company'`を参照）
- `topics`: `organizationId`のみ（`type='organization'`または`type='company'`を参照）
- `entities`: `organizationId`のみ（`type='organization'`または`type='company'`を参照）
- `relations`: `organizationId`のみ（`type='organization'`または`type='company'`を参照）

**注意**: `companyId`カラムとCHECK制約は削除されました。

## 注意事項

### 廃止されたテーブル

以下のテーブルは廃止されました：

#### ChromaDBに移行されたテーブル
- `entityEmbeddings`: エンティティの埋め込みベクトル（ChromaDBに移行）
- `relationEmbeddings`: リレーションの埋め込みベクトル（ChromaDBに移行）
- `topicEmbeddings`: トピックの埋め込みベクトル（topicsテーブルに統合）

#### organizationsテーブルに統合されたテーブル
- `companies`: 事業会社テーブル（`organizations`テーブルの`type='company'`に統合）
  - 事業会社は`organizations`テーブルで`type='company'`として管理されます
  - 組織と同列でデータを扱い、`type`カラムで区別します
- `companyContents`: 事業会社コンテンツテーブル（`organizationContents`テーブルに統合）
  - 事業会社のコンテンツも`organizationContents`テーブルで管理します
- `organizationCompanyDisplay`: 組織・事業会社表示関係テーブル（廃止）
  - 組織間の関係として扱う場合は、別の方法で管理します

#### usersテーブルに統合されたテーブル
- `admins`: 管理者テーブル（`users`テーブルの`role='admin'`に統合）
  - 管理者は`users`テーブルで`role='admin'`として管理されます
  - 一般ユーザーと管理者を同じテーブルで一元管理します

**重要**: すべてのテーブルから`companyId`カラムが削除され、`organizationId`のみを使用します。事業会社は`organizations`テーブルの`type='company'`で識別します。

### マイグレーション

既存のデータベースに対しては、以下のマイグレーションが自動的に実行されます：

1. `organizations`テーブルに`type`カラムを追加（デフォルト値: 'organization'）
2. `organizationMembers`テーブルに不足しているカラムを追加
3. `focusInitiatives`テーブルに`themeIds`と`topicIds`カラムを追加
4. `meetingNotes`テーブルに`companyId`カラムを追加し、`organizationId`をNULL可能に
5. `focusInitiatives`テーブルに`companyId`カラムを追加し、`organizationId`をNULL可能に
6. `companyContents`テーブルに`capitalStructure`と`capitalStructureDiagram`カラムを追加
7. `themes`テーブルに`position`カラムを追加
8. `entities`テーブルに`companyId`カラム、`searchableText`、`displayName`、`lastSearchDate`、`searchCount`カラムを追加
9. `relations`テーブルに`companyId`カラム、`searchableText`、`lastSearchDate`、`searchCount`カラムを追加
10. `topics`テーブルに`companyId`カラム、`contentSummary`、`searchableText`、`lastSearchDate`、`searchCount`カラムを追加
11. `users`テーブルに`role`カラムを追加（デフォルト値: 'user'）

