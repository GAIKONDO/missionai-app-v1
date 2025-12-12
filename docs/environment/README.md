# Environment ドキュメント

このフォルダには、MissionAIプロジェクトの環境変数設定に関するドキュメントが含まれています。

## 📁 ファイル構成

### 環境変数仕様書

#### `ENVIRONMENT_VARIABLES.md` ⭐ **最重要**
- **ステータス**: アクティブ（環境変数仕様書）
- **用途**: プロジェクトで使用する環境変数の一覧、説明、設定方法
- **対象読者**: すべての開発者（必読）
- **内容**:
  - 環境変数の読み込み順序
  - 環境変数一覧（サーバーポート、AI API設定）
  - 環境変数ファイルの例
  - セキュリティ注意事項
  - トラブルシューティング

## 🔗 ドキュメント間の関係性

```
ENVIRONMENT_VARIABLES.md (環境変数)
    ├─→ ../architecture/port-and-server-design.md（ポート設計の参照）
    ├─→ ../rust/RUST_TAURI_CONFIGURATION.md（Rust/Tauri設定の参照）
    ├─→ ../react/REACT_CONFIGURATION.md（React設定の参照）
    └─→ ../security/SECURITY.md（セキュリティの参照）
```

## 📖 読み方のガイド

### 新規開発者

1. **まず読む**: `ENVIRONMENT_VARIABLES.md`（環境変数の設定方法を理解）
2. **次に読む**: `../setup/SETUP_GUIDE.md`（開発環境セットアップ）

### 実装者

1. **まず読む**: `ENVIRONMENT_VARIABLES.md`（環境変数の確認）
2. **参考**: `../rust/RUST_TAURI_CONFIGURATION.md`（Rust側の環境変数使用箇所）

### デバッグ担当者

1. **まず読む**: `ENVIRONMENT_VARIABLES.md`（環境変数のトラブルシューティング）
2. **参考**: `../troubleshooting/TROUBLESHOOTING.md`（総合トラブルシューティング）

## 📝 ドキュメントの更新方針

- **環境変数仕様書** (`ENVIRONMENT_VARIABLES.md`): 新しい環境変数追加時に更新
- 環境変数のデフォルト値変更時に更新
- セキュリティ要件変更時に更新

## 🔄 重要な変更履歴

### 2025-01-15（整合性チェック後）
- `ENVIRONMENT_VARIABLES.md`を更新
  - フロントエンド側の環境変数読み込み順序を明確化（`.env.local` > `.env` > システム環境変数）
  - Rust側（`local.env`）とフロントエンド側（`.env.local`）の使い分けを明確化
  - 環境変数ファイルの例を分離（Rust側とフロントエンド側を別々に記載）
  - トラブルシューティングセクションを拡充（Rust側とフロントエンド側の違いを明確化）
  - 補足セクションを追加（環境変数ファイルの使い分けを説明）

### 2025-01-15
- `ENVIRONMENT_VARIABLES.md`を作成
  - 環境変数の一覧と説明を文書化
  - サーバーポート設定、AI API設定を記載
  - 環境変数ファイルの例、セキュリティ注意事項、トラブルシューティングを追加

---

最終更新: 2025-12-11
