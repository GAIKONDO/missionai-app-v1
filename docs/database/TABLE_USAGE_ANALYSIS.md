# SQLiteテーブル使用状況分析

> **📋 ステータス**: 分析結果  
> **📅 作成日**: 2025-01-XX  
> **👤 用途**: 使用されていないテーブルと機能が重複しているテーブルの特定

## 📊 テーブル一覧と使用状況

### ✅ 使用されているテーブル（20個）

| テーブル名 | 用途 | 使用箇所 |
|-----------|------|---------|
| `users` | ユーザー情報 | 認証、ユーザー管理 |
| `pageContainers` | ページコンテナ | ページ管理機能 |
| `approvalRequests` | 承認リクエスト | 認証フロー（`auth.rs`） |
| `aiSettings` | AI設定 | AI機能設定 |
| `backupHistory` | バックアップ履歴 | バックアップ機能（`backup.rs`） |
| `organizations` | 組織情報（アプリ内作成） | 組織管理機能 |
| `organizationMembers` | 組織メンバー | メンバー管理機能 |
| `organizationContents` | 組織コンテンツ | 組織詳細ページ |
| ~~`organization_master`~~ | ~~組織マスターデータ（CSV）~~ | ~~削除済み~~ |
| `focusInitiatives` | 注力施策 | 注力施策管理 |
| `meetingNotes` | 議事録 | 議事録管理 |
| `companyContents` | 事業会社コンテンツ | 事業会社詳細ページ |
| `themes` | テーマ | テーマ管理 |
| `themeHierarchyConfigs` | テーマ階層設定 | A2C100ページ |
| `entities` | エンティティ | ナレッジグラフ、RAG検索 |
| `relations` | リレーション | ナレッジグラフ、RAG検索 |
| `topics` | トピック | ナレッジグラフ、RAG検索 |
| `companies` | 事業会社 | 事業会社管理 |
| `organizationCompanyDisplay` | 組織・会社表示関係 | 組織・会社表示管理 |
| `designDocSections` | システム設計ドキュメントセクション | 設計ドキュメント管理 |
| `designDocSectionRelations` | システム設計ドキュメントセクション関係 | 設計ドキュメント管理 |

### ✅ 削除済みテーブル（2個）

#### `admins`テーブル

**削除理由**:
- `users`テーブルと機能が重複していた
- `users`テーブルに`role`カラムを追加して管理者を管理するように統一

**削除日**: 2025-01-XX

**影響範囲**:
- `users`テーブルに`role`カラムを追加（'user'または'admin'）
- 管理者は`users`テーブルで`role='admin'`として管理

### ✅ 削除済みテーブル（1個）

#### `organization_master`

**削除理由**:
- `organizations`テーブルと機能が重複していた
- `organizations`テーブルを唯一の組織データソースとして統一するため

**削除日**: 2025-01-XX

**影響範囲**:
- CSVインポート機能（`import_organization_master_csv`）が削除されました
- 組織データは`organizations`テーブルのみを使用するようになりました

## 📋 削除候補テーブル

### 1. `admins`テーブル

**理由**:
- 定義されているが、実際の使用箇所が見つからない
- SELECT/INSERT/UPDATE/DELETEのクエリが存在しない

**確認事項**:
- 将来の機能で使用予定があるか
- 他の認証機能で使用されているか（`users`テーブルの`approved`カラムで代替可能な可能性）

**推奨**:
- 使用予定がない場合は削除を検討
- 削除する場合は、関連するインデックスも削除

## ✅ 完了した統合作業

### `organization_master`テーブルの削除

**実施内容**:
- `organization_master`テーブルを削除
- `organizations`テーブルを唯一の組織データソースとして統一

**削除された機能**:
- `import_organization_master_csv` Tauriコマンド
- `importOrganizationMasterFromCSV` TypeScript関数
- `build_organization_tree_from_master` 関数
- その他`organization_master`関連の関数

**現在の状態**:
- 組織データは`organizations`テーブルのみを使用
- CSVインポート機能は削除されました（必要に応じて`organizations`テーブルへの直接インポート機能を実装可能）

## 📊 統計情報

- **総テーブル数**: 19個（`organization_master`と`admins`削除後）
- **使用中**: 19個
- **削除済み**: 2個（`organization_master`、`admins`）

## 🎯 推奨アクション

### 完了済み
1. ✅ **`organization_master`テーブルの削除**
   - `organization_master`テーブルを削除
   - `organizations`テーブルを唯一の組織データソースとして統一

2. ✅ **`admins`テーブルの削除**
   - `admins`テーブルを削除
   - `users`テーブルに`role`カラムを追加して管理者を管理

## 📝 注意事項

- **変更を加える前に**: 必ずバックアップを取得
- **段階的な移行**: 一度にすべてを変更せず、段階的に移行
- **テスト**: 各段階で十分なテストを実施
- **ドキュメント更新**: 変更後は関連ドキュメントを更新





