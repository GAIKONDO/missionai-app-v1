# Setup ドキュメント

このフォルダには、MissionAIプロジェクトの開発環境セットアップに関するドキュメントが含まれています。

## 📁 ファイル構成

### セットアップガイド

#### `SETUP_GUIDE.md` ⭐ **最重要**
- **ステータス**: アクティブ（セットアップガイド）
- **用途**: 新規開発者向けの開発環境セットアップ手順
- **対象読者**: 新規開発者（必読）
- **内容**:
  - 前提条件
  - セットアップ手順（Node.js、Rust、Tauri CLI、ChromaDB）
  - 環境変数の設定
  - 動作確認
  - トラブルシューティング
  - 次のステップ

## 🔗 ドキュメント間の関係性

```
SETUP_GUIDE.md (セットアップガイド)
    ├─→ ../environment/ENVIRONMENT_VARIABLES.md（環境変数の参照）
    ├─→ ../development/DEVELOPMENT_GUIDELINES.md（開発ガイドライン）
    ├─→ ../architecture/port-and-server-design.md（ポート設計の参照）
    ├─→ ../rust/RUST_TAURI_CONFIGURATION.md（Rust/Tauri設定の参照）
    └─→ ../react/REACT_CONFIGURATION.md（React設定の参照）
```

## 📖 読み方のガイド

### 新規開発者

1. **まず読む**: `SETUP_GUIDE.md`（開発環境のセットアップ）
2. **次に読む**: `../environment/ENVIRONMENT_VARIABLES.md`（環境変数の設定）
3. **参考**: `../development/DEVELOPMENT_GUIDELINES.md`（開発ガイドライン）

### 既存開発者

1. **参考**: `SETUP_GUIDE.md`（新しいマシンでのセットアップ時）

## 📝 ドキュメントの更新方針

- **セットアップガイド** (`SETUP_GUIDE.md`): セットアップ手順の変更時に更新
- 新しい依存関係の追加時に更新
- トラブルシューティング情報の追加時に更新

## 🔄 重要な変更履歴

### 2025-01-15
- `SETUP_GUIDE.md`を作成
  - 開発環境セットアップ手順を文書化
  - Node.js、Rust、Tauri CLI、ChromaDBのインストール手順を記載
  - 環境変数の設定、動作確認、トラブルシューティングを追加
- `SETUP_GUIDE.md`を更新（整合性チェック）
  - SQLiteフォールバックの記述を削除（ChromaDBが必須であることを明確化）
  - フロントエンド側の環境変数ファイル（`.env.local`）についての説明を追加
  - Tauri CLIのインストール方法を明確化（`cargo install tauri-cli`を推奨）
  - ChromaDBのインストール手順を詳細化（Python環境の確認、インストール確認手順を追加）
  - 環境変数のトラブルシューティングをRust側とフロントエンド側に分けて説明
  - 関連ドキュメントのリンクを修正（`./ENVIRONMENT_VARIABLES.md` → `../environment/ENVIRONMENT_VARIABLES.md`）

---

最終更新: 2025-12-11
