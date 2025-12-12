# 埋め込みベクトルの保存場所

> **📋 ステータス**: アクティブ（実装仕様書）  
> **📅 最終更新**: 2025-12-12  
> **👤 用途**: 埋め込みベクトルの保存場所と構造の説明

## 概要

埋め込みベクトルは、**ChromaDBに統一して保存**されています。SQLiteには埋め込みベクトルは保存されません（メタデータのみ保存）。

## ChromaDB（ベクトルデータベース）

**重要**: ChromaDBは常に有効です。設定画面での選択は不要で、アプリケーション起動時に自動的にChromaDB Serverが起動します。

**注意**: ChromaDBは`organizationId`が指定されている場合のみ使用されます。

### 1. `entities_{organizationId}` コレクション
**用途**: エンティティの埋め込みベクトル（組織ごとに分離）

**構造**:
- `id` - エンティティID（SQLiteの`entities.id`と同じ）
- `embedding` - 埋め込みベクトル（1536次元または768次元）
- `metadata` - メタデータ（JSON形式）
  - `entityId`: エンティティID
  - `organizationId`: 組織ID
  - `name`: エンティティ名
  - `type`: エンティティタイプ
  - `aliases`: エイリアス（JSON文字列）
  - `metadata`: その他のメタデータ（JSON文字列）
  - `embeddingModel`: 使用モデル（例: `text-embedding-3-small`）
  - `embeddingVersion`: 埋め込みバージョン（例: `1.0`）
  - `createdAt`: 作成日時
  - `updatedAt`: 更新日時

**確認方法**: Rust側のTauriコマンド経由で確認

### 2. `relations_{organizationId}` コレクション
**用途**: リレーションの埋め込みベクトル（組織ごとに分離）

**構造**:
- `id` - リレーションID（SQLiteの`relations.id`と同じ）
- `embedding` - 埋め込みベクトル（1536次元または768次元）
- `metadata` - メタデータ（JSON形式）
  - `relationId`: リレーションID
  - `organizationId`: 組織ID
  - `topicId`: トピックID
  - `sourceEntityId`: 起点エンティティID
  - `targetEntityId`: 終点エンティティID
  - `relationType`: リレーションタイプ
  - `description`: 説明
  - `confidence`: 信頼度
  - `metadata`: その他のメタデータ（JSON文字列）
  - `embeddingModel`: 使用モデル
  - `embeddingVersion`: 埋め込みバージョン
  - `createdAt`: 作成日時
  - `updatedAt`: 更新日時

**確認方法**: Rust側のTauriコマンド経由で確認

### 3. `topics_{organizationId}` コレクション
**用途**: トピックの埋め込みベクトル（組織ごとに分離）

**構造**:
- `id` - トピックID（SQLiteの`topics.topicId`と同じ）
- `embedding` - 埋め込みベクトル（1536次元または768次元）
- `metadata` - メタデータ（JSON形式）
  - `topicId`: トピックID
  - `meetingNoteId`: 議事録ID
  - `organizationId`: 組織ID
  - `title`: タイトル
  - `content`: コンテンツ
  - `semanticCategory`: セマンティックカテゴリ
  - `keywords`: キーワード（JSON文字列）
  - `tags`: タグ（JSON文字列）
  - `embeddingModel`: 使用モデル
  - `embeddingVersion`: 埋め込みバージョン
  - `createdAt`: 作成日時
  - `updatedAt`: 更新日時

**確認方法**: Rust側のTauriコマンド経由で確認

### 4. `design_docs` コレクション
**用途**: システム設計ドキュメントの埋め込みベクトル（組織を跨いで共有）

**構造**:
- `id` - セクションID（SQLiteの`designDocSections.id`と同じ）
- `embedding` - 埋め込みベクトル（1536次元または768次元）
- `metadata` - メタデータ（JSON形式）
  - `sectionId`: セクションID
  - `title`: セクションタイトル
  - `content`: セクション内容
  - `tags`: タグ（JSON文字列）
  - `embeddingModel`: 使用モデル
  - `embeddingVersion`: 埋め込みバージョン
  - `createdAt`: 作成日時
  - `updatedAt`: 更新日時

**確認方法**: Rust側のTauriコマンド経由で確認

## SQLiteデータベース

**重要**: SQLiteには埋め込みベクトルは保存されません。メタデータのみ保存されます。

### エンティティ・リレーション・トピックのメタデータ

SQLiteの以下のテーブルにメタデータが保存されます：

- `entities` - エンティティのメタデータ（名前、タイプ、エイリアスなど）
- `relations` - リレーションのメタデータ（タイプ、説明、信頼度など）
- `topics` - トピックのメタデータ（タイトル、コンテンツ、カテゴリなど）

**ChromaDB同期状態の管理**:
各テーブルには以下のカラムが追加されています：
- `chromaSynced`: 同期状態（0: 未同期、1: 同期済み）
- `chromaSyncError`: 同期エラーメッセージ（NULL: エラーなし）
- `lastChromaSyncAttempt`: 最後の同期試行日時

## データの保存フロー

### エンティティ・リレーション・トピックの保存

1. **SQLiteにメタデータを保存**
   - `chromaSynced = 0`で保存
   - エンティティ/リレーション/トピックの基本情報を保存

2. **バックグラウンドでChromaDBに埋め込みベクトルを保存**
   - 埋め込みベクトルを生成（OpenAI APIまたはOllama）
   - ChromaDBの対応するコレクションに保存
   - 成功時に`chromaSynced = 1`に更新
   - 失敗時に`chromaSyncError`にエラーメッセージを記録

### システム設計ドキュメントの保存

1. **SQLiteにメタデータを保存**
   - `designDocSections`テーブルに保存

2. **バックグラウンドでChromaDBに埋め込みベクトルを保存**
   - `design_docs`コレクションに保存（組織を跨いで共有）

## フォールバック動作

**重要**: ChromaDBは常に有効です。ChromaDB Serverが起動しない場合は、アプリケーション起動時にエラーが表示されます。

### ChromaDB Serverが起動しない場合

**エンティティ・リレーション・トピック検索**:
- ChromaDB Serverが起動しない場合、埋め込みベクトルの保存・検索はできません
- **SQLiteフォールバックなし**: 埋め込みベクトルはChromaDBにのみ保存されるため
- ChromaDB Serverの起動に失敗した場合は、アプリケーションを再起動してください

**システム設計ドキュメント検索**:
- ChromaDB Serverが起動しない場合、検索結果は空になります
- フォールバックなし

## データの保存優先順位

**重要**: ChromaDBは常に有効です。設定画面での選択は不要で、アプリケーション起動時に自動的にChromaDB Serverが起動します。

### エンティティ・リレーション埋め込み

1. **ChromaDB**: `organizationId`が指定されている場合、ChromaDBに保存
2. **フォールバックなし**: 埋め込みベクトルはChromaDBにのみ保存されるため、SQLiteへのフォールバックはありません

### トピック埋め込み

1. **ChromaDB**: `organizationId`が指定されている場合、ChromaDBに保存
2. **フォールバックなし**: ChromaDBが使用できない場合、埋め込みベクトルは保存されない（検索不可）

### システム設計ドキュメント埋め込み

1. **ChromaDB**: `design_docs`コレクションに保存（組織を跨いで共有）
2. **フォールバックなし**: ChromaDBが使用できない場合、検索不可

## 確認方法

### ChromaDBのコレクションを確認

```rust
// Rust側のTauriコマンド経由
// コレクション一覧を取得
let collections = chromadb_client.list_collections().await?;
```

### SQLiteの同期状態を確認

```sql
-- エンティティの同期状態を確認
SELECT id, name, chromaSynced, chromaSyncError, lastChromaSyncAttempt 
FROM entities 
WHERE organizationId = 'org-123';

-- 未同期のエンティティを確認
SELECT COUNT(*) FROM entities WHERE chromaSynced = 0;
```

## 注意事項

- **ChromaDB**: 常に有効です。設定画面での選択は不要で、アプリケーション起動時に自動的にChromaDB Serverが起動します
- **ChromaDB使用条件**: `organizationId`が指定されている場合のみ、ChromaDBに保存・検索されます
- **SQLite**: 埋め込みベクトルは保存されません（メタデータのみ）
- **埋め込みベクトルの次元数**: 
  - 1536次元（OpenAI `text-embedding-3-small`）
  - 768次元（Ollama `nomic-embed-text`）
- **廃止されたテーブル**: 
  - `entityEmbeddings`テーブルは廃止されました（ChromaDBに統一）
  - `relationEmbeddings`テーブルは廃止されました（ChromaDBに統一）
  - `topicEmbeddings`テーブルは`topics`テーブルに統合されました
- **設定関数**: `shouldUseChroma()`は常に`true`を返します（ChromaDBは常に有効）

## 関連ドキュメント

- [`database-design.md`](./database-design.md) - データベース設計の概要
- [`CHROMADB_SQLITE_RELATIONSHIP.md`](../chromadb/CHROMADB_SQLITE_RELATIONSHIP.md) - ChromaDBとSQLiteの関係
- [`DATA_SYNC_RISKS_AND_BENEFITS.md`](./DATA_SYNC_RISKS_AND_BENEFITS.md) - データ同期のリスクとベネフィット
