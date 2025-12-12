# Rust/Tauri設定ドキュメント

> **📋 ステータス**: アクティブ（設定仕様書）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: RustバックエンドとTauriアプリケーションの設定、依存関係、アーキテクチャの詳細

## 概要

このプロジェクトでは、**Rust**と**Tauri 2.0**を使用してデスクトップアプリケーションのバックエンドを構築しています。Axumを使用したHTTP APIサーバー、SQLiteデータベース、ChromaDB統合、書き込みキューシステムを実装しています。

## 技術スタック

### コアフレームワーク
- **Tauri**: `2.0` (devtools feature) - デスクトップアプリケーションフレームワーク
- **Rust Edition**: `2021` - Rustのエディション

### HTTPサーバー
- **Axum**: `0.7` - 非同期Webフレームワーク
- **Tower**: `0.4` - ミドルウェアスタック
- **Tower HTTP**: `0.5` (CORS機能) - HTTPミドルウェア

### データベース
- **rusqlite**: `0.31` (bundled) - SQLiteバインディング
- **r2d2**: `0.8` - コネクションプール
- **r2d2_sqlite**: `0.24` - SQLite用r2d2アダプター

### 非同期処理
- **Tokio**: `1` (full) - 非同期ランタイム
- **async-channel**: `2.0` - 非同期チャネル

### ベクトル検索
- **ChromaDB**: `2.3.0` - ChromaDBクライアント
- **hnsw_rs**: `0.3.3` - RustネイティブのHNSW実装（検討中）

### その他
- **serde**: `1.0` (derive) - シリアライゼーション
- **serde_json**: `1.0` - JSON処理
- **uuid**: `1.0` (v4, serde) - UUID生成
- **chrono**: `0.4` (serde) - 日時処理
- **bcrypt**: `0.15` - パスワードハッシュ
- **dotenv**: `0.15` - 環境変数読み込み
- **reqwest**: `0.11` (json) - HTTPクライアント
- **csv**: `1.3` - CSVパーサー
- **dirs**: `5.0` - ホームディレクトリ取得
- **sha2**: `0.10` - SHAハッシュ
- **tracing**: `0.1` - 構造化ログ
- **tracing-subscriber**: `0.3` (env-filter) - ログサブスクライバー
- **anyhow**: `1.0` - エラーハンドリング
- **tauri-plugin-shell**: `2.0` - Tauriシェルプラグイン

## Cargo.toml設定

### パッケージ情報

```toml
[package]
name = "mission-ai"
version = "2.1.2"
description = "MissionAI - AI-powered mission management desktop application"
authors = ["you"]
license = ""
repository = ""
edition = "2021"
default-run = "mission-ai"
```

### ビルド依存関係

```toml
[build-dependencies]
tauri-build = { version = "2.0", features = [] }
```

### 機能フラグ

```toml
[features]
custom-protocol = ["tauri/custom-protocol"]
```

**`custom-protocol`**: Tauriのカスタムプロトコル（`tauri://localhost`）を有効化

### バイナリ

```toml
[[bin]]
name = "import_members_direct"
path = "../scripts/import_members_direct.rs"
```

**用途**: メンバーデータの直接インポート用スクリプト

## Tauri設定

### 本番環境設定 (`tauri.conf.json`)

```json
{
  "productName": "MissionAI",
  "version": "2.1.2",
  "identifier": "com.missionai.app",
  "build": {
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../out"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [{
      "title": "MissionAI",
      "width": 1400,
      "height": 900,
      "resizable": true,
      "fullscreen": false,
      "devtools": true,
      "url": "http://localhost:3010"  // 注意: 本番環境では使用されない（frontendDistから静的ファイルが配信される）
    }],
    "security": {
      "csp": "default-src 'self' tauri://localhost; connect-src 'self' tauri://localhost http://localhost:3011 http://127.0.0.1:3011 ws://localhost:* ws://127.0.0.1:* https://api.openai.com https://api.anthropic.com https://*.ollama.ai; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: file: tauri://localhost; font-src 'self' data: tauri://localhost;"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [...],
    "resources": ["template-data.json", "../out"]
  }
}
```

### 開発環境設定 (`tauri.conf.dev.json`)

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:3010"
  },
  "app": {
    "windows": [{
      "title": "MissionAI",
      "width": 1400,
      "height": 900,
      "resizable": true,
      "fullscreen": false,
      "devtools": true,
      "url": "http://localhost:3010"
    }],
    "security": {
      "csp": "default-src 'self' http://localhost:3010; connect-src 'self' http://localhost:3010 http://localhost:3011 http://127.0.0.1:3010 http://127.0.0.1:3011 ws://localhost:* ws://127.0.0.1:* https://api.openai.com https://api.anthropic.com https://*.ollama.ai; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3010; style-src 'self' 'unsafe-inline' http://localhost:3010; img-src 'self' data: https: file: http://localhost:3010; font-src 'self' data: http://localhost:3010;"
    }
  }
}
```

### 設定の説明

#### `withGlobalTauri: true`
- **Tauri APIのグローバル公開**: `window.__TAURI__`でアクセス可能
- **用途**: フロントエンドからTauriコマンドを呼び出し

#### CSP (Content Security Policy)
- **開発環境**: `http://localhost:3010`を許可
- **本番環境**: `tauri://localhost`を許可
- **API接続**: `http://localhost:3011`、`http://127.0.0.1:3011`を許可
- **AI API**: OpenAI、Anthropic、Ollamaを許可

## アプリケーション初期化

### メイン関数 (`src/main.rs`)

```rust
fn main() {
    // 1. ログシステムの初期化
    tracing_subscriber::fmt()
        .with_max_level(if cfg!(debug_assertions) {
            tracing::Level::DEBUG
        } else {
            tracing::Level::INFO
        })
        .with_target(false)
        .init();
    
    // 2. Tauriアプリケーションの構築
    tauri::Builder::default()
        .setup(|app| {
            // 3. 環境変数の読み込み（開発環境のみ）
            // 4. データベースの初期化
            // 5. 書き込みワーカーの起動
            // 6. ChromaDB Serverの初期化
            // 7. APIサーバーの起動
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![...])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 初期化フロー

1. **ログシステムの初期化**
   - 開発環境: DEBUGレベル
   - 本番環境: INFOレベル

2. **環境変数の読み込み**（開発環境のみ）
   - `local.env`を優先
   - なければ`.env`を読み込み

3. **データベースの初期化**
   - SQLiteデータベースの作成
   - テーブルの初期化
   - デフォルトユーザーの作成

4. **書き込みワーカーの起動**
   - 書き込みキュー（`async_channel`）の作成
   - 単一の書き込みワーカーを起動

5. **ChromaDB Serverの初期化**（非同期）
   - バックグラウンドで起動
   - 失敗時はSQLiteフォールバックを使用

6. **APIサーバーの起動**（非同期）
   - ポート3011で起動（環境変数で変更可能）
   - Axumルーターを使用

## APIサーバー設定

### Axumルーター (`src/api/server.rs`)

```rust
pub async fn start_api_server(addr: SocketAddr) -> Result<(), Box<dyn std::error::Error>> {
    eprintln!("🚀 APIサーバーを起動中: http://{}", addr);
    
    // データベース接続の確認
    if get_db().is_none() {
        eprintln!("❌ データベースが初期化されていません");
        return Err("Database not initialized".into());
    }
    
    // CORS設定
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);
    
    // ルーターの作成
    let app: Router = crate::api::routes::create_routes()
        .layer(ServiceBuilder::new().layer(cors));
    
    // サーバーの起動
    let listener = tokio::net::TcpListener::bind(addr).await?;
    eprintln!("✅ APIサーバーが起動しました: http://{}", addr);
    
    axum::serve(listener, app).await?;
    
    Ok(())
}
```

### CORS設定

- **allow_origin**: `Any` - すべてのオリジンを許可（ローカル環境のみ）
- **allow_methods**: `Any` - すべてのHTTPメソッドを許可
- **allow_headers**: `Any` - すべてのヘッダーを許可

**注意**: 本番環境では適切なCORS設定を推奨

### ポート設定

- **デフォルト**: `3011`
- **環境変数**: `API_SERVER_PORT`で変更可能
- **開発環境**: 3010を使用（Next.jsと同じポート）
- **本番環境**: 3011を使用

## 書き込みキューシステム

### アーキテクチャ

```
フロントエンド/API
    ↓
書き込みキュー（async_channel::unbounded）
    ↓
WriteWorker（単一スレッド）
    ↓
SQLite（書き込み専用コネクション）
```

### WriteWorker (`src/db/write_worker.rs`)

```rust
pub struct WriteWorker {
    pool: DatabasePool,
}

impl WriteWorker {
    pub async fn run(&self, rx: Receiver<WriteJob>) {
        while let Ok(job) = rx.recv().await {
            if let Err(e) = self.handle_job(&job).await {
                eprintln!("[DB-WRITER] ジョブ処理エラー: {e:#}");
            }
        }
    }
}
```

### WriteJobの種類

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

## ログ設定

### Tracing設定

```rust
tracing_subscriber::fmt()
    .with_max_level(if cfg!(debug_assertions) {
        tracing::Level::DEBUG
    } else {
        tracing::Level::INFO
    })
    .with_target(false)
    .init();
```

### ログレベル

- **開発環境**: `DEBUG` - 詳細なデバッグ情報
- **本番環境**: `INFO` - 重要な情報のみ

### ログ出力

- **標準エラー出力**: `eprintln!`マクロを使用
- **構造化ログ**: `tracing`クレートを使用

## Tauriコマンド

### 登録されているコマンド

#### 認証コマンド
- `sign_in`: サインイン
- `sign_up`: サインアップ
- `sign_out`: サインアウト
- `get_current_user`: 現在のユーザー取得

#### ドキュメント操作コマンド
- `doc_get`: ドキュメント取得
- `doc_set`: ドキュメント設定
- `doc_update`: ドキュメント更新
- `doc_delete`: ドキュメント削除
- `delete_meeting_note_with_relations`: 議事録と関連データの削除

#### コレクション操作コマンド
- `collection_add`: コレクション追加
- `collection_get`: コレクション取得

#### クエリ操作コマンド
- `query_get`: クエリ実行

#### データエクスポート/インポートコマンド
- `export_database_data`: データベースデータのエクスポート
- `import_database_data`: データベースデータのインポート
- `export_organizations_and_members`: 組織とメンバーのエクスポート

#### アプリ情報コマンド
- `get_version`: バージョン取得
- `get_path`: パス取得
- `get_database_path`: データベースパス取得
- `check_database_status`: データベース状態確認
- `reinitialize_database`: データベース再初期化
- `list_tables`: テーブル一覧
- `diagnose_database`: データベース診断
- `update_chroma_sync_status`: ChromaDB同期状態更新

#### 組織管理コマンド
- `create_org`: 組織作成
- `update_org`: 組織更新
- `update_org_parent`: 組織の親組織を更新
- `get_org`: 組織取得
- `search_orgs_by_name`: 組織名で検索
- `get_orgs_by_parent`: 親組織IDで組織一覧を取得
- `get_org_tree`: 組織ツリーを取得
- `delete_org`: 組織削除
- `add_org_member`: メンバー追加
- `update_org_member`: メンバー更新
- `get_org_member`: メンバー取得
- `get_org_members`: メンバー一覧取得
- `delete_org_member`: メンバー削除
- `export_organizations_and_members_csv`: 組織とメンバーをCSVエクスポート
- `import_organization_master_csv`: 組織マスターをCSVインポート
- `import_members_csv`: メンバーをCSVインポート
- `check_duplicate_orgs`: 重複組織をチェック
- `delete_duplicate_orgs`: 重複組織を削除

#### 事業会社管理コマンド
- `create_company_cmd`: 事業会社作成
- `update_company_cmd`: 事業会社更新
- `get_company`: 事業会社取得
- `get_company_by_code_cmd`: 会社コードで事業会社取得
- `get_companies_by_org`: 組織に紐づく事業会社一覧取得
- `get_all_companies_cmd`: すべての事業会社取得
- `delete_company_cmd`: 事業会社削除
- `export_companies_csv`: 事業会社をCSVエクスポート

#### 組織と事業会社の表示関係管理コマンド
- `create_org_company_display`: 表示関係作成
- `get_companies_by_org_display`: 組織に紐づく事業会社一覧取得（表示関係経由）
- `get_organizations_by_company_display_cmd`: 事業会社に紐づく組織一覧取得（表示関係経由）
- `get_all_org_company_displays`: すべての表示関係取得
- `update_org_company_display_order`: 表示順序更新
- `delete_org_company_display`: 表示関係削除
- `delete_org_company_display_by_ids`: 表示関係削除（ID指定）
- `delete_all_org_company_displays_by_org`: 組織に紐づくすべての表示関係削除
- `delete_all_org_company_displays_by_company`: 事業会社に紐づくすべての表示関係削除

#### ChromaDBコマンド
- `chromadb_save_entity_embedding`: エンティティ埋め込み保存
- `chromadb_find_similar_entities`: 類似エンティティ検索
- `chromadb_count_entities`: エンティティ数をカウント
- `chromadb_save_relation_embedding`: リレーション埋め込み保存
- `chromadb_find_similar_relations`: 類似リレーション検索
- `chromadb_save_topic_embedding`: トピック埋め込み保存
- `chromadb_find_similar_topics`: 類似トピック検索
- `chromadb_save_design_doc_embedding`: システム設計ドキュメント埋め込み保存
- `chromadb_find_similar_design_docs`: 類似システム設計ドキュメント検索
- `chromadb_get_design_doc_metadata`: システム設計ドキュメントメタデータ取得
- `chromadb_list_design_doc_section_ids`: システム設計ドキュメントセクションID一覧取得
- `chromadb_delete_topic_embedding`: トピック埋め込み削除
- `chromadb_delete_entity_embedding`: エンティティ埋め込み削除
- `chromadb_delete_relation_embedding`: リレーション埋め込み削除

#### システム設計ドキュメントセクション管理コマンド
- `create_design_doc_section_cmd`: セクション作成
- `update_design_doc_section_cmd`: セクション更新
- `get_design_doc_section_cmd`: セクション取得
- `get_all_design_doc_sections_cmd`: すべてのセクション取得
- `get_all_design_doc_sections_lightweight_cmd`: すべてのセクション取得（軽量版）
- `delete_design_doc_section_cmd`: セクション削除

#### システム設計ドキュメントセクション関係管理コマンド
- `create_design_doc_section_relation_cmd`: セクション関係作成
- `update_design_doc_section_relation_cmd`: セクション関係更新
- `get_design_doc_section_relation_cmd`: セクション関係取得
- `get_design_doc_section_relations_by_section_cmd`: セクションに紐づく関係一覧取得
- `get_all_design_doc_section_relations_cmd`: すべてのセクション関係取得
- `delete_design_doc_section_relation_cmd`: セクション関係削除

#### ファイル操作コマンド
- `read_file`: ファイル読み込み
- `write_file`: ファイル書き込み
- `file_exists`: ファイル存在確認
- `save_image_file`: 画像ファイル保存

## 環境変数

### 開発環境

**読み込み順序**:
1. `local.env`（優先）
2. `.env`（フォールバック）
3. システム環境変数

**主要な環境変数**:
- `API_SERVER_PORT`: APIサーバーのポート（デフォルト: 3011）
- `CHROMADB_PORT`: ChromaDB Serverのポート（デフォルト: 8000）

### 本番環境

環境変数ファイルは読み込まれません。システム環境変数から直接読み込みます。

## モジュール構造

```
src/
├── main.rs              # エントリーポイント
├── database/            # データベース関連
│   ├── mod.rs          # データベース初期化
│   ├── pool.rs         # コネクションプール
│   ├── chromadb.rs     # ChromaDB統合
│   └── ...
├── commands/           # Tauriコマンド
│   ├── db.rs          # データベースコマンド
│   ├── app.rs         # アプリコマンド
│   └── ...
├── api/                # HTTP API
│   ├── server.rs      # サーバー起動
│   ├── routes.rs      # ルーティング
│   └── handlers.rs    # ハンドラー
└── db/                 # 書き込みキュー
    ├── write_worker.rs # 書き込みワーカー
    └── write_job.rs    # 書き込みジョブ定義
```

## ビルドと実行

### 開発環境

```bash
# Tauri開発環境（Next.js + Tauri）
npm run tauri:dev

# Rustのみビルド
cargo build

# Rustのみ実行（テスト用）
cargo run
```

### 本番ビルド

```bash
# Tauriアプリのビルド
npm run tauri:build

# Rustのみリリースビルド
cargo build --release
```

### クロスプラットフォームビルド

```bash
# Windows向けビルド（macOSから）
cargo build --target x86_64-pc-windows-msvc

# macOS向けビルド
cargo build --target x86_64-apple-darwin
cargo build --target aarch64-apple-darwin
```

## パフォーマンス最適化

### 非同期処理
- **Tokio**: 非同期ランタイムで並行処理
- **async/await**: 非ブロッキングI/O

### コネクションプール
- **r2d2**: データベースコネクションの再利用
- **最大10コネクション**: 同時接続数の制限

### 書き込みキュー
- **単一ワーカー**: 書き込み操作の順序保証
- **非同期チャネル**: 低レイテンシのメッセージング

## トラブルシューティング

### データベース初期化エラー

**原因**: アプリケーションデータディレクトリの作成失敗

**解決方法**:
1. アプリケーションデータディレクトリの権限を確認
2. ディスク容量を確認
3. ログを確認してエラー詳細を確認

### APIサーバー起動エラー

**原因**: ポート3011が既に使用されている

**解決方法**:
1. 環境変数`API_SERVER_PORT`で別のポートを指定
2. ポート3011を使用しているプロセスを終了

### ChromaDB Server起動エラー

**原因**: ChromaDBがインストールされていない、またはポート8000が使用されている

**解決方法**:
1. ChromaDBがインストールされているか確認
2. 環境変数`CHROMADB_PORT`で別のポートを指定
3. SQLiteフォールバックが動作することを確認

### 書き込みワーカーエラー

**原因**: データベース接続エラー、トランザクションエラー

**解決方法**:
1. データベースファイルの整合性を確認
2. ログを確認してエラー詳細を確認
3. データベースを再初期化（必要に応じて）

## 関連ドキュメント

- [ポート設計とサーバー構成](../architecture/port-and-server-design.md)
- [SQLite設定](../sqlite/SQLITE_CONFIGURATION.md)
- [ChromaDB統合計画](../chromadb/CHROMADB_INTEGRATION_PLAN.md)
- [API仕様](./API_SPECIFICATION.md)

---

最終更新: 2025-12-11
