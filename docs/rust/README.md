# Rust ドキュメント

このフォルダには、MissionAIプロジェクトのRustバックエンドとTauriアプリケーション設定に関するドキュメントが含まれています。

## 📁 ファイル構成

### 設定仕様書

#### `RUST_TAURI_CONFIGURATION.md` ⭐ **最重要**
- **ステータス**: アクティブ（設定仕様書）
- **用途**: RustバックエンドとTauriアプリケーションの設定、依存関係、アーキテクチャの詳細
- **対象読者**: すべての開発者（必読）
- **内容**:
  - 技術スタック
  - Cargo.toml設定
  - Tauri設定（tauri.conf.json、tauri.conf.dev.json）
  - アプリケーション初期化
  - APIサーバー設定
  - 書き込みキューシステム
  - ログ設定
  - Tauriコマンド
  - 環境変数
  - モジュール構造
  - ビルドと実行
  - パフォーマンス最適化
  - トラブルシューティング

### API仕様書

#### `API_SPECIFICATION.md` ⭐ **最重要**
- **ステータス**: アクティブ（API仕様書）
- **用途**: Rust APIサーバー（Axum）のエンドポイント仕様、リクエスト/レスポンス形式、エラーハンドリング
- **対象読者**: フロントエンド開発者、API利用者
- **内容**:
  - ベースURL
  - 共通仕様
  - エンドポイント一覧
    - ヘルスチェック
    - 組織関連API
    - 事業会社関連API
    - 組織と事業会社の表示関係API
    - リレーション関連API
    - エンティティ関連API
  - 使用例
  - エラーハンドリング

## 🔗 ドキュメント間の関係性

```
RUST_TAURI_CONFIGURATION.md (Rust/Tauri設定)
    ├─→ API_SPECIFICATION.md (API仕様の参照)
    ├─→ ../architecture/port-and-server-design.md (ポート設計の参照)
    ├─→ ../sqlite/SQLITE_CONFIGURATION.md (SQLite設定の参照)
    └─→ ../chromadb/CHROMADB_INTEGRATION_PLAN.md (ChromaDB統合計画)

API_SPECIFICATION.md (API仕様)
    ├─→ RUST_TAURI_CONFIGURATION.md (Rust/Tauri設定の参照)
    ├─→ ../architecture/port-and-server-design.md (ポート設計の参照)
    └─→ ../react/REACT_CONFIGURATION.md (React設定の参照)
```

## 📖 読み方のガイド

### 新規開発者・実装者

1. **まず読む**: `RUST_TAURI_CONFIGURATION.md`（Rust/Tauri設定を理解）
2. **次に読む**: `API_SPECIFICATION.md`（API仕様を理解）
3. **参考**: `../architecture/port-and-server-design.md`（ポート設計を理解）

### フロントエンド開発者

1. **まず読む**: `API_SPECIFICATION.md`（APIエンドポイントの確認）
2. **参考**: `RUST_TAURI_CONFIGURATION.md`（バックエンド設定の確認）

### バックエンド開発者

1. **まず読む**: `RUST_TAURI_CONFIGURATION.md`（Rust/Tauri設定の確認）
2. **参考**: `API_SPECIFICATION.md`（API仕様の確認）

### デバッグ担当者

1. **まず読む**: `RUST_TAURI_CONFIGURATION.md`（設定とトラブルシューティングの確認）
2. **参考**: `API_SPECIFICATION.md`（APIエラーの確認）

## 📝 ドキュメントの更新方針

- **設定仕様書** (`RUST_TAURI_CONFIGURATION.md`): 実装に合わせて継続的に更新
- **API仕様書** (`API_SPECIFICATION.md`): APIエンドポイントの追加・変更時に更新
- Cargo.tomlの依存関係変更時に更新
- Tauri設定変更時に更新
- 新しいAPIエンドポイント追加時に更新

## 🔄 重要な変更履歴

### 2025-01-15（整合性チェック後）
- `RUST_TAURI_CONFIGURATION.md`を更新
  - Tauriコマンドの一覧を実装に合わせて拡充（組織管理、事業会社管理、表示関係管理、ChromaDB、システム設計ドキュメント、ファイル操作コマンドを追加）
  - Cargo.tomlの依存関係を実装に合わせて更新（`anyhow`、`tauri-plugin-shell`を追加）
  - APIサーバーの起動ログを実装に合わせて更新
  - `tauri.conf.json`の`url`フィールドに注意書きを追加（本番環境では使用されないことを明記）
- `API_SPECIFICATION.md`を更新
  - `GET /api/organizations/search`のクエリパラメータを`query`から`name`に修正（実装に合わせて）
  - `POST /api/companies`のリクエストボディを実装に合わせて更新（スネークケース、追加フィールド、デフォルト値を追加）
  - `POST /api/relations`のリクエストボディを実装に合わせて更新（`id`の自動生成、オプショナルフィールドを明確化）
  - `POST /api/entities`のリクエストボディを実装に合わせて更新（`id`の自動生成、`aliases`と`metadata`の形式を明確化）

### 2025-01-15
- `RUST_TAURI_CONFIGURATION.md`を作成
  - Rust/Tauri設定の詳細を文書化
  - Cargo.toml設定、Tauri設定、APIサーバー設定を説明
  - 書き込みキューシステム、ログ設定、Tauriコマンドを記載
  - ビルドと実行、パフォーマンス最適化、トラブルシューティングを追加

- `API_SPECIFICATION.md`を作成
  - APIエンドポイントの詳細な仕様を文書化
  - リクエスト/レスポンス形式、エラーハンドリングを説明
  - 使用例を追加

---

最終更新: 2025-12-11
