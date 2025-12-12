# Development ドキュメント

このフォルダには、MissionAIプロジェクトの開発ガイドラインと実装状況に関するドキュメントが含まれています。

## 📁 ファイル構成

### 開発ガイドライン

#### `DEVELOPMENT_GUIDELINES.md` ⭐ **最重要**
- **ステータス**: アクティブ（開発ガイドライン）
- **用途**: Mac開発・Windowsビルド前提の開発ガイドライン
- **対象読者**: すべての開発者（必読）
- **内容**:
  - クロスプラットフォーム対応の基本原則
  - ファイルパスの扱い
  - Rustコードでのパス処理
  - file://プロトコルの扱い
  - シェルスクリプトの扱い
  - 開発時の注意点
  - テストとビルド確認
  - Windows転送用ファイルの作成
  - よくある問題と対処法
  - コードレビューチェックリスト

### 実装状況

#### `AI_APPLICATION_FOUNDATION.md`
- **ステータス**: アクティブ（実装状況ドキュメント）
- **用途**: AIアプリケーション基盤の実装状況と今後の設計項目の記録
- **対象読者**: 設計レビュー担当者、実装者
- **内容**:
  - 現在実装済みの基盤機能
  - 追加で設計すべき項目（優先度順）
  - 実装ロードマップ
  - 成功指標
  - 推奨事項

## 🔗 ドキュメント間の関係性

```
DEVELOPMENT_GUIDELINES.md (開発ガイドライン)
    └─→ architecture/port-and-server-design.md (ポート設計の参照)
    └─→ database/database-design.md (データベース設計の参照)
    └─→ chromadb/CHROMADB_INTEGRATION_PLAN.md (ChromaDB統合の参照)

AI_APPLICATION_FOUNDATION.md (実装状況)
    └─→ 実装済み機能の記録
    └─→ 今後の設計項目の記録
```

## 📖 読み方のガイド

### 新規開発者

1. **まず読む**: `DEVELOPMENT_GUIDELINES.md`（開発ガイドラインを理解）
2. **参考**: `AI_APPLICATION_FOUNDATION.md`（実装済み機能を確認）

### 設計レビュー担当者

1. **まず読む**: `AI_APPLICATION_FOUNDATION.md`（実装状況の確認）
2. **参考**: `DEVELOPMENT_GUIDELINES.md`（開発ガイドラインの確認）

### 実装者

1. **まず読む**: `DEVELOPMENT_GUIDELINES.md`（開発ガイドラインを理解）
2. **参考**: `AI_APPLICATION_FOUNDATION.md`（実装済み機能を確認）

## 📝 ドキュメントの更新方針

- **開発ガイドライン** (`DEVELOPMENT_GUIDELINES.md`): 開発方針の変更時に更新
- **実装状況** (`AI_APPLICATION_FOUNDATION.md`): 実装状況の変更時に更新

## 🔄 重要な変更履歴

### 2025-01-15
- `AI_APPLICATION_FOUNDATION.md`を実装に合わせて更新
  - モニタリング・メトリクス収集システムが実装済みであることを明記
  - ユーザーフィードバック機能が実装済みであることを明記
  - 実装ロードマップを更新

### 2025-01-15
- `DEVELOPMENT_GUIDELINES.md`の関連ドキュメントリンクを修正
  - 存在しないファイルへのリンクを削除
  - 実際に存在するドキュメントへのリンクに変更

---

最終更新: 2025-12-11
