# ドキュメント一覧

このディレクトリには、MissionAIプロジェクトの設計・開発ドキュメントがカテゴリー別に整理されています。

## 📁 カテゴリー構成

### 🏗️ architecture/ - アーキテクチャ設計

ポート設計、サーバー構成、システム全体のアーキテクチャに関するドキュメント。

- `ARCHITECTURE_OVERVIEW.md` - アーキテクチャ概要（入門者向け）
- `port-and-server-design.md` - ポート設計とサーバー構成の設計書（**最重要**）
- `COMPANY_DATABASE_DESIGN_COMPARISON.md` - 事業会社データベース設計の比較
- `THEME_ORDER_RISKS_AND_CONCERNS.md` - テーマ順序実装のリスクと懸念点
- `PLANTUML_OFFLINE_IMPLEMENTATION.md` - PlantUMLのオフライン実装計画

### 💾 database/ - データベース設計

SQLiteとChromaDBの設計、データ同期、埋め込みベクトルの保存場所に関するドキュメント。

- `database-design.md` - データベース設計ドキュメント（SQLiteとChromaDBの役割分担）
- `EMBEDDING_STORAGE_LOCATIONS.md` - 埋め込みベクトルの保存場所
- `DATA_SYNC_RISKS_AND_BENEFITS.md` - データ同期のリスクとベネフィット

### 🗄️ sqlite/ - SQLite設定

SQLiteデータベースの設定、接続、パフォーマンス設定に関するドキュメント。

- `SQLITE_CONFIGURATION.md` - SQLite設定ドキュメント（接続プール、PRAGMA設定、書き込みキューシステム）

### ⚛️ react/ - React/Next.js設定

React/Next.jsフロントエンドの設定、ビルド、実行環境に関するドキュメント。

- `REACT_CONFIGURATION.md` - React/Next.js設定ドキュメント（Next.js設定、TypeScript設定、React Query設定）

### 🦀 rust/ - Rust/Tauri設定

RustバックエンドとTauriアプリケーションの設定、API仕様に関するドキュメント。

- `RUST_TAURI_CONFIGURATION.md` - Rust/Tauri設定ドキュメント（Cargo.toml設定、Tauri設定、APIサーバー設定）
- `API_SPECIFICATION.md` - API仕様書（エンドポイント仕様、リクエスト/レスポンス形式）

### 🔧 environment/ - 環境変数

環境変数の一覧、説明、設定方法に関するドキュメント。

- `ENVIRONMENT_VARIABLES.md` - 環境変数一覧（サーバーポート、AI API設定）

### 🚀 setup/ - 開発環境セットアップ

新規開発者向けの開発環境セットアップ手順に関するドキュメント。

- `SETUP_GUIDE.md` - 開発環境セットアップガイド（セットアップ手順、動作確認）

### 📦 deployment/ - ビルド・デプロイ

ビルド手順、デプロイ手順、配布パッケージ作成に関するドキュメント。

- `BUILD_AND_DEPLOYMENT.md` - ビルド・デプロイガイド（ビルド手順、デプロイ手順）

### 🔍 troubleshooting/ - トラブルシューティング

よくある問題と解決方法、デバッグ手順に関するドキュメント。

- `TROUBLESHOOTING.md` - 総合トラブルシューティングガイド（よくある問題と解決方法）

### 🔒 security/ - セキュリティ

セキュリティ設定、APIキー管理、データ保護ポリシーに関するドキュメント。

- `SECURITY.md` - セキュリティポリシー（CSP設定、APIキー管理、データ保護）

### 🤝 contributing/ - コントリビューション

コントリビューション方法、コーディング規約、プルリクエストの手順に関するドキュメント。

- `CONTRIBUTING.md` - コントリビューションガイド（コントリビューション方法、コーディング規約）

### 🔍 chromadb/ - ChromaDB関連

ChromaDBの統合、使用方法、テスト、検証に関するドキュメント。

- `CHROMADB_INTEGRATION_PLAN.md` - ChromaDB組み込みの実装計画
- `CHROMADB_INTEGRATION_PLAN.pdf` - ChromaDB統合計画のPDF版
- `CHROMADB_LOCAL_USAGE.md` - ChromaDBのローカル使用方法
- `CHROMADB_QUICK_START.md` - ChromaDBクイックスタートガイド
- `CHROMADB_SEARCH_CONDITIONS.md` - ChromaDB検索条件
- `CHROMADB_SQLITE_RELATIONSHIP.md` - ChromaDBとSQLiteの関係
- `CHROMADB_SYNC_IMPROVEMENTS.md` - ChromaDB同期の改善
- `CHROMADB_TESTING.md` - ChromaDBテスト
- `CHROMADB_VERIFICATION_CHECKLIST.md` - ChromaDB検証チェックリスト

### 🔎 rag-search/ - RAG検索関連

RAG（Retrieval-Augmented Generation）検索システムの設計、評価、トラブルシューティングに関するドキュメント。

- `RAG_IMPROVEMENTS.md` - RAG検索の改善
- `RAG_SEARCH_EVALUATION.md` - RAG検索の評価
- `RAG_SEARCH_TROUBLESHOOTING.md` - RAG検索のトラブルシューティング
- `SEARCH_DATABASE_FLOW.md` - 検索データベースフロー
- `WHY_SEARCH_RESULTS_ZERO.md` - 検索結果が0件になる理由

### 👥 organization/ - 組織・メンバー関連

組織構造、メンバー管理、組織IDの設計に関するドキュメント。

- `MEMBER_ORGANIZATION_LINKING_DESIGN.md` - メンバーと組織のリンク設計
- `ORGANIZATION_ID_DESIGN_COMPARISON.md` - 組織ID設計の比較
- `WHAT_IS_ORGANIZATION_ID.md` - 組織IDとは何か

### 📝 topic/ - トピック関連

トピックの分離、データ保存フローに関するドキュメント。

- `TOPIC_SEPARATION_PLAN.md` - トピック分離計画
- `TOPIC_DATA_SAVE_FLOW.md` - トピックデータ保存フロー

### 🛠️ development/ - 開発ガイドライン

開発ガイドライン、AIアプリケーション基盤に関するドキュメント。

- `DEVELOPMENT_GUIDELINES.md` - 開発ガイドライン（Mac開発・Windowsビルド前提）
- `AI_APPLICATION_FOUNDATION.md` - AIアプリケーション基盤の設計状況

### 🧪 testing/ - テスト関連

テスト設計、テストセクションに関するドキュメント。

- `TESTING_DESIGN_DOC_SECTIONS.md` - テスト設計ドキュメントセクション

### 📈 scalability/ - スケーラビリティ

スケーラビリティ分析に関するドキュメント。

- `SCALABILITY_ANALYSIS.md` - スケーラビリティ分析

### 🎨 design/ - システム設計ドキュメント機能

システム設計ドキュメントの管理、検索、RAG統合機能に関するドキュメント。

- `DESIGN_DOCUMENT_SYSTEM.md` - システム設計ドキュメント機能の詳細（セクション管理、RAG検索、データ構造）

---

## 📖 主要ドキュメント

### 新規開発者向け

1. **`setup/SETUP_GUIDE.md`** - 開発環境セットアップガイド（**必読**）
2. **`architecture/port-and-server-design.md`** - ポート設計とサーバー構成（**必読**）
3. **`database/database-design.md`** - データベース設計の概要
4. **`development/DEVELOPMENT_GUIDELINES.md`** - 開発ガイドライン
5. **`environment/ENVIRONMENT_VARIABLES.md`** - 環境変数の設定

### 実装者向け

1. **`rust/RUST_TAURI_CONFIGURATION.md`** - Rust/Tauri設定の詳細
2. **`rust/API_SPECIFICATION.md`** - API仕様の詳細
3. **`chromadb/CHROMADB_INTEGRATION_PLAN.md`** - ChromaDB統合の実装計画
4. **`react/REACT_CONFIGURATION.md`** - React/Next.js設定の詳細
5. **`sqlite/SQLITE_CONFIGURATION.md`** - SQLite設定の詳細
6. **`rag-search/RAG_SEARCH_EVALUATION.md`** - RAG検索システムの評価
7. **`organization/MEMBER_ORGANIZATION_LINKING_DESIGN.md`** - 組織・メンバー管理の設計

### トラブルシューティング

1. **`troubleshooting/TROUBLESHOOTING.md`** - 総合トラブルシューティングガイド
2. **`rag-search/RAG_SEARCH_TROUBLESHOOTING.md`** - RAG検索のトラブルシューティング
3. **`rag-search/WHY_SEARCH_RESULTS_ZERO.md`** - 検索結果が0件になる理由
4. **`architecture/port-design-concerns.md`** - ポート設計の懸念点と解決策

### コントリビューター向け

1. **`contributing/CONTRIBUTING.md`** - コントリビューションガイド
2. **`setup/SETUP_GUIDE.md`** - 開発環境セットアップ
3. **`development/DEVELOPMENT_GUIDELINES.md`** - 開発ガイドライン

---

## 🔗 ドキュメント間の関連性

```
architecture/port-and-server-design.md
    ├─→ database/database-design.md（ポート設定セクション）
    └─→ chromadb/CHROMADB_INTEGRATION_PLAN.md（ポート設定とフォールバック仕様）

database/database-design.md
    ├─→ chromadb/CHROMADB_SQLITE_RELATIONSHIP.md
    ├─→ chromadb/DATA_SYNC_RISKS_AND_BENEFITS.md
    └─→ sqlite/SQLITE_CONFIGURATION.md（SQLite設定の詳細）

sqlite/SQLITE_CONFIGURATION.md
    ├─→ database/database-design.md（データベース設計の参照）
    └─→ chromadb/CHROMADB_INTEGRATION_PLAN.md（ChromaDB統合計画）

react/REACT_CONFIGURATION.md
    ├─→ architecture/port-and-server-design.md（ポート設計の参照）
    ├─→ development/DEVELOPMENT_GUIDELINES.md（開発ガイドライン）
    └─→ database/database-design.md（データベース設計）

rust/RUST_TAURI_CONFIGURATION.md
    ├─→ API_SPECIFICATION.md（API仕様の参照）
    ├─→ architecture/port-and-server-design.md（ポート設計の参照）
    ├─→ sqlite/SQLITE_CONFIGURATION.md（SQLite設定の参照）
    └─→ chromadb/CHROMADB_INTEGRATION_PLAN.md（ChromaDB統合計画）

rust/API_SPECIFICATION.md
    ├─→ RUST_TAURI_CONFIGURATION.md（Rust/Tauri設定の参照）
    ├─→ architecture/port-and-server-design.md（ポート設計の参照）
    └─→ react/REACT_CONFIGURATION.md（React設定の参照）

rag-search/RAG_SEARCH_EVALUATION.md
    ├─→ chromadb/CHROMADB_SEARCH_CONDITIONS.md
    └─→ database/EMBEDDING_STORAGE_LOCATIONS.md

environment/ENVIRONMENT_VARIABLES.md
    ├─→ ../architecture/port-and-server-design.md（ポート設計の参照）
    ├─→ ../rust/RUST_TAURI_CONFIGURATION.md（Rust/Tauri設定の参照）
    ├─→ ../react/REACT_CONFIGURATION.md（React設定の参照）
    └─→ ./SECURITY.md（セキュリティの参照）

setup/SETUP_GUIDE.md
    ├─→ ../environment/ENVIRONMENT_VARIABLES.md（環境変数の参照）
    ├─→ ../development/DEVELOPMENT_GUIDELINES.md（開発ガイドライン）
    └─→ ../architecture/port-and-server-design.md（ポート設計の参照）

deployment/BUILD_AND_DEPLOYMENT.md
    ├─→ ../development/DEVELOPMENT_GUIDELINES.md（開発ガイドライン）
    ├─→ ../environment/ENVIRONMENT_VARIABLES.md（環境変数の参照）
    └─→ ../troubleshooting/TROUBLESHOOTING.md（トラブルシューティング）

troubleshooting/TROUBLESHOOTING.md
    ├─→ ../rag-search/RAG_SEARCH_TROUBLESHOOTING.md（RAG検索のトラブルシューティング）
    ├─→ ../architecture/port-design-concerns.md（ポート設計の懸念点）
    ├─→ ../environment/ENVIRONMENT_VARIABLES.md（環境変数の参照）
    └─→ ../deployment/BUILD_AND_DEPLOYMENT.md（ビルド・デプロイ）

security/SECURITY.md
    ├─→ ../environment/ENVIRONMENT_VARIABLES.md（環境変数の参照）
    ├─→ ../architecture/port-and-server-design.md（ポート設計の参照）
    └─→ ../rust/RUST_TAURI_CONFIGURATION.md（Rust/Tauri設定の参照）

contributing/CONTRIBUTING.md
    ├─→ ../setup/SETUP_GUIDE.md（開発環境セットアップの参照）
    ├─→ ../development/DEVELOPMENT_GUIDELINES.md（開発ガイドライン）
    └─→ ../troubleshooting/TROUBLESHOOTING.md（トラブルシューティング）
```

---

## 📝 ドキュメントの更新方針

- **設計書**: `architecture/`フォルダに配置
- **実装計画**: 各機能フォルダに配置
- **レビューコメント**: 設計書と同じフォルダに配置
- **トラブルシューティング**: 該当機能フォルダに配置

---

最終更新: 2025-12-11

