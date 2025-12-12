# Deployment ドキュメント

このフォルダには、MissionAIプロジェクトのビルド・デプロイに関するドキュメントが含まれています。

## 📁 ファイル構成

### ビルド・デプロイガイド

#### `BUILD_AND_DEPLOYMENT.md` ⭐ **最重要**
- **ステータス**: アクティブ（ビルド・デプロイガイド）
- **用途**: ビルド手順、デプロイ手順、配布パッケージ作成
- **対象読者**: ビルド担当者、リリース担当者
- **内容**:
  - ビルド環境
  - ビルド手順（開発/本番、macOS/Windows）
  - ビルド出力
  - ビルド設定
  - デプロイ手順
  - 配布パッケージ
  - クロスプラットフォームビルド
  - ビルド最適化
  - トラブルシューティング
  - CI設定例

## 🔗 ドキュメント間の関係性

```
BUILD_AND_DEPLOYMENT.md (ビルド・デプロイ)
    ├─→ ../development/DEVELOPMENT_GUIDELINES.md（開発ガイドライン）
    ├─→ ../environment/ENVIRONMENT_VARIABLES.md（環境変数の参照）
    ├─→ ../rust/RUST_TAURI_CONFIGURATION.md（Rust/Tauri設定の参照）
    └─→ ../troubleshooting/TROUBLESHOOTING.md（トラブルシューティング）
```

## 📖 読み方のガイド

### ビルド担当者

1. **まず読む**: `BUILD_AND_DEPLOYMENT.md`（ビルド手順の確認）
2. **参考**: `../environment/ENVIRONMENT_VARIABLES.md`（環境変数の設定）

### リリース担当者

1. **まず読む**: `BUILD_AND_DEPLOYMENT.md`（デプロイ手順の確認）
2. **参考**: `../troubleshooting/TROUBLESHOOTING.md`（トラブルシューティング）

## 📝 ドキュメントの更新方針

- **ビルド・デプロイガイド** (`BUILD_AND_DEPLOYMENT.md`): ビルド手順の変更時に更新
- 新しいプラットフォーム対応時に更新
- CI設定の変更時に更新

## 🔄 重要な変更履歴

### 2025-01-15
- `BUILD_AND_DEPLOYMENT.md`を作成
  - ビルド手順を文書化
  - 開発/本番ビルド、macOS/Windowsビルドを記載
  - デプロイ手順、配布パッケージ、トラブルシューティングを追加

---

最終更新: 2025-12-11
