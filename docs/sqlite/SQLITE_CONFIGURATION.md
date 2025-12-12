# SQLite設定ドキュメント

> **📋 ステータス**: アクティブ（設定仕様書）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: SQLiteデータベースの設定、接続、パフォーマンス設定の詳細

## 概要

このプロジェクトでは、SQLiteを構造化データの永続化に使用しています。データロックを回避するため、読み取りと書き込みを分離し、書き込みキューシステムを実装しています。

## データベースファイルの場所

### 開発環境
```
{app_data_dir}/mission-ai-local-dev/app.db
```

### 本番環境
```
{app_data_dir}/mission-ai-local/app.db
```

**`app_data_dir`の場所**:
- **macOS**: `~/Library/Application Support/`
- **Windows**: `%APPDATA%\`
- **Linux**: `~/.local/share/`

データベースファイルは、Tauriの`app.path().app_data_dir()`を使用して自動的に取得されます。

## 接続プール設定

### ライブラリ
- **r2d2**: コネクションプール管理
- **r2d2-sqlite**: SQLite用のr2d2アダプター
- **rusqlite**: SQLiteのRustバインディング

### プール設定

```rust
// 最大コネクション数
max_size: 10

// 最小アイドルコネクション数
min_idle: 2
```

**設定の意味**:
- **max_size**: 同時に保持できる最大コネクション数（10個）
- **min_idle**: 常に保持するアイドルコネクション数（2個）

## PRAGMA設定

データベース接続時に以下のPRAGMAが自動的に設定されます：

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA cache_size = -64000;
```

### 各PRAGMAの説明

#### `journal_mode = WAL`
- **WAL (Write-Ahead Logging)**: 書き込み先読みログモード
- **利点**:
  - 読み取りと書き込みの並行実行が可能
  - パフォーマンスの向上
  - データ整合性の保証

#### `synchronous = NORMAL`
- **同期モード**: 通常モード
- **動作**: チェックポイント時にディスクに同期
- **バランス**: パフォーマンスとデータ安全性のバランス

#### `foreign_keys = ON`
- **外部キー制約**: 有効化
- **動作**: 外部キー制約が自動的にチェックされる
- **重要性**: データ整合性の保証

#### `busy_timeout = 5000`
- **ビジータイムアウト**: 5000ミリ秒（5秒）
- **動作**: データベースがロックされている場合、最大5秒待機
- **利点**: ロック競合時のエラーを回避

#### `cache_size = -64000`
- **キャッシュサイズ**: -64000（約64MB）
- **単位**: 負の値はキロバイト単位
- **利点**: メモリキャッシュによる読み取りパフォーマンスの向上

## 書き込みキューシステム

### アーキテクチャ

すべてのデータベース書き込み操作は、単一の書き込みワーカー（`WriteWorker`）を経由します。

```
フロントエンド/API
    ↓
書き込みキュー（async_channel）
    ↓
WriteWorker（単一スレッド）
    ↓
SQLite（書き込み専用コネクション）
```

### 書き込みジョブの種類

- `UpsertEntity`: エンティティの挿入/更新
- `DeleteEntities`: エンティティの削除
- `UpsertRelation`: リレーションの挿入/更新
- `DeleteRelations`: リレーションの削除
- `UpsertTopic`: トピックの挿入/更新
- `DeleteTopics`: トピックの削除
- `UpsertOrganization`: 組織の挿入/更新
- `DeleteOrganization`: 組織の削除
- `DeleteMeetingNote`: 議事録の削除
- `UpdateChromaSyncStatus`: ChromaDB同期状態の更新

### 利点

- ✅ 書き込み操作の順序保証
- ✅ デッドロックの回避
- ✅ トランザクションの適切な管理
- ✅ エラーハンドリングの一元化

## 読み取り操作

読み取り操作は、接続プール（`DatabasePool`）から取得したコネクションを使用します。

**特徴**:
- 複数の読み取り操作を並列実行可能
- 書き込み操作と競合しない
- 読み取り専用トランザクションを使用

## テーブル構造

### 主要テーブル

#### ユーザー管理
- `users`: ユーザー情報
- `admins`: 管理者情報
- `approvalRequests`: 承認リクエスト

#### 組織管理
- `organizations`: 組織情報
- `organizationMembers`: 組織メンバー情報
- `organization_master`: 組織マスターデータ
- `organizationContents`: 組織コンテンツ

#### 事業会社
- `companies`: 事業会社情報
- `organizationCompanyDisplay`: 組織と事業会社の表示関係

#### ナレッジグラフ
- `entities`: エンティティ（メタデータのみ）
- `relations`: リレーション（メタデータのみ）
- `topics`: トピック（メタデータのみ）

**注意**: 埋め込みベクトルはChromaDBに保存されます。SQLiteにはメタデータのみ保存されます。

#### 議事録・施策
- `meetingNotes`: 議事録
- `focusInitiatives`: 注力施策
- `themes`: テーマ

#### システム設計ドキュメント
- `designDocSections`: 設計ドキュメントセクション
- `designDocSectionRelations`: セクション間の関係

#### その他
- `pageContainers`: ページコンテナ
- `aiSettings`: AI設定
- `backupHistory`: バックアップ履歴

### ChromaDB同期状態カラム

以下のテーブルには、ChromaDBとの同期状態を管理するカラムが追加されています：

- `chromaSynced`: 同期状態（0: 未同期、1: 同期済み）
- `chromaSyncError`: 同期エラーメッセージ（NULL: エラーなし）
- `lastChromaSyncAttempt`: 最後の同期試行日時

**対象テーブル**:
- `entities`
- `relations`
- `topics`
- `meetingNotes`

## インデックス

パフォーマンス向上のため、以下のインデックスが作成されています：

### 組織関連
- `idx_organizations_parentId`: 親組織検索
- `idx_organizations_level`: レベル検索
- `idx_organizations_levelName`: レベル名検索
- `idx_organizationMembers_organizationId`: 組織メンバー検索
- `idx_organizationContents_organizationId`: 組織コンテンツ検索
- `idx_org_master_code`: 組織マスターコード検索
- `idx_org_master_parent_code`: 組織マスター親コード検索
- `idx_org_master_hierarchy_level`: 組織マスターレベル検索
- `idx_org_master_company_code`: 組織マスター会社コード検索
- `idx_org_master_division_code`: 組織マスター部門コード検索
- `idx_org_master_department_code`: 組織マスター部署コード検索
- `idx_org_master_section_code`: 組織マスターセクションコード検索
- `idx_org_master_is_active`: 組織マスター有効性検索

### ナレッジグラフ関連
- `idx_entities_organizationId`: エンティティの組織検索
- `idx_entities_type`: エンティティタイプ検索
- `idx_entities_name`: エンティティ名検索
- `idx_entities_chromaSynced`: ChromaDB同期状態検索
- `idx_relations_topicId`: リレーションのトピック検索
- `idx_relations_sourceEntityId`: 起点エンティティ検索
- `idx_relations_targetEntityId`: 終点エンティティ検索
- `idx_relations_relationType`: リレーションタイプ検索
- `idx_relations_organizationId`: リレーションの組織検索
- `idx_relations_chromaSynced`: ChromaDB同期状態検索
- `idx_topics_meetingNoteId`: トピックの議事録検索
- `idx_topics_organizationId`: トピックの組織検索
- `idx_topics_chromaSynced`: ChromaDB同期状態検索

### その他
- `idx_users_email`: ユーザー検索
- `idx_meetingNotes_organizationId`: 議事録の組織検索
- `idx_meetingNotes_chromaSynced`: ChromaDB同期状態検索
- `idx_companies_code`: 事業会社コード検索
- `idx_companies_organizationId`: 事業会社の組織検索
- `idx_companies_category`: 事業会社カテゴリ検索
- `idx_companies_region`: 事業会社地域検索
- `idx_focusInitiatives_organizationId`: 注力施策の組織検索
- `idx_themes_id`: テーマID検索
- `idx_pageContainers_pageId`: ページコンテナのページID検索
- `idx_pageContainers_planId`: ページコンテナのプランID検索
- `idx_pageContainers_userId`: ページコンテナのユーザーID検索
- `idx_organizationCompanyDisplay_organizationId`: 組織・会社表示の組織ID検索
- `idx_organizationCompanyDisplay_companyId`: 組織・会社表示の会社ID検索
- `idx_designDocSections_order`: 設計ドキュメント順序検索
- `idx_designDocSections_semanticCategory`: 設計ドキュメントセマンティックカテゴリ検索
- `idx_designDocSectionRelations_source`: 設計ドキュメント関係の起点検索
- `idx_designDocSectionRelations_target`: 設計ドキュメント関係の終点検索
- `idx_designDocSectionRelations_type`: 設計ドキュメント関係タイプ検索

## マイグレーション

### カラム追加

SQLiteでは`ALTER TABLE ADD COLUMN IF NOT EXISTS`が使えないため、エラーハンドリングで対応しています。

**例**: `organizationMembers`テーブルへのカラム追加

```rust
// カラムが存在するかチェック
let column_exists: bool = conn.query_row(
    "SELECT COUNT(*) FROM pragma_table_info('organizationMembers') WHERE name = ?1",
    params![column_name],
    |row| Ok(row.get::<_, i32>(0)? > 0),
).unwrap_or(false);

if !column_exists {
    conn.execute(
        &format!("ALTER TABLE organizationMembers ADD COLUMN {} {}", column_name, column_type),
        [],
    )?;
}
```

### テーブル削除

不要になったテーブルは、`drop_unused_tables()`メソッドで削除されます。

**削除対象テーブル**（ChromaDBに移行済み）:
- `entityEmbeddings`
- `topicEmbeddings`
- `relationEmbeddings`

## バックアップ

### バックアップ機能

- **バックアップ作成**: `create_backup()`
- **バックアップ復元**: `restore_backup()`
- **バックアップ一覧**: `list_backups()`
- **古いバックアップの削除**: `cleanup_old_backups()`

### バックアップファイル名

```
app_backup_{timestamp}.db
```

### バックアップ履歴

`backupHistory`テーブルにバックアップ履歴が保存されます。

## デフォルトユーザー

データベースが新規作成された場合、デフォルトユーザーが自動的に作成されます。

**デフォルト認証情報**（開発環境のみ）:
- **メールアドレス**: `admin@example.com`
- **パスワード**: `admin123`

**注意**: 本番環境では必ずパスワードを変更してください。

## パフォーマンス最適化

### WALモードの活用
- 読み取りと書き込みの並行実行
- パフォーマンスの向上

### 接続プール
- コネクションの再利用
- 接続オーバーヘッドの削減

### インデックス
- 頻繁に検索されるカラムにインデックスを作成
- クエリパフォーマンスの向上

### キャッシュサイズ
- 64MBのメモリキャッシュ
- 読み取りパフォーマンスの向上

## トラブルシューティング

### データベースファイルが見つからない

**原因**: アプリケーションデータディレクトリが作成されていない

**解決方法**: アプリケーションを起動すると自動的に作成されます。

### ロックエラー

**原因**: 複数の書き込み操作が同時に実行されている

**解決方法**: 書き込みキューシステムにより、書き込み操作は順次実行されます。`busy_timeout`により、最大5秒待機します。

### パフォーマンスの問題

**確認項目**:
1. インデックスが適切に作成されているか
2. WALモードが有効になっているか
3. キャッシュサイズが適切か
4. 接続プールの設定が適切か

## 関連ドキュメント

- [データベース設計ドキュメント](../database/database-design.md)
- [埋め込みベクトルの保存場所](../database/EMBEDDING_STORAGE_LOCATIONS.md)
- [データ同期のリスクとメリット](../database/DATA_SYNC_RISKS_AND_BENEFITS.md)
- [ChromaDB統合計画](../chromadb/CHROMADB_INTEGRATION_PLAN.md)

---

最終更新: 2025-12-11
