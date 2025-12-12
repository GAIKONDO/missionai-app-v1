# Design ドキュメント

このフォルダには、MissionAIプロジェクトのシステム設計ドキュメント機能に関するドキュメントが含まれています。

## 📁 ファイル構成

### 実装仕様書

#### `DESIGN_DOCUMENT_SYSTEM.md` ⭐ **最重要**
- **ステータス**: アクティブ（実装仕様書）
- **用途**: システム設計ドキュメント機能の詳細説明
- **対象読者**: 実装者、開発者
- **内容**:
  - システム設計ドキュメント機能の概要
  - データ構造（SQLiteテーブル、ChromaDBコレクション）
  - データフロー
  - APIとコマンド
  - 使用方法
  - 注意事項

## 🔗 ドキュメント間の関係性

```
DESIGN_DOCUMENT_SYSTEM.md (システム設計ドキュメント機能)
    ├─→ ../database/database-design.md (データベース設計の参照)
    ├─→ ../database/EMBEDDING_STORAGE_LOCATIONS.md (埋め込みベクトルの保存場所)
    ├─→ ../rag-search/RAG_SEARCH_EVALUATION.md (RAG検索システムの評価)
    └─→ ../testing/TESTING_DESIGN_DOC_SECTIONS.md (テスト手順書)
```

## 📖 読み方のガイド

### 実装者・開発者

1. **まず読む**: `DESIGN_DOCUMENT_SYSTEM.md`（システム設計ドキュメント機能の理解）
2. **参考**: `../testing/TESTING_DESIGN_DOC_SECTIONS.md`（動作確認手順）

### データベース管理者

1. **まず読む**: `DESIGN_DOCUMENT_SYSTEM.md`（データ構造の確認）
2. **参考**: `../database/database-design.md`（データベース設計の参照）

### デバッグ担当者

1. **まず読む**: `DESIGN_DOCUMENT_SYSTEM.md`（機能の理解）
2. **参考**: `../testing/TESTING_DESIGN_DOC_SECTIONS.md`（動作確認手順）

## 📝 ドキュメントの更新方針

- **実装仕様書** (`DESIGN_DOCUMENT_SYSTEM.md`): 実装変更時に更新
- データ構造の変更時に更新
- API仕様の変更時に更新

## 🔄 重要な変更履歴

### 2025-01-15
- `DESIGN_DOCUMENT_SYSTEM.md`を作成
  - システム設計ドキュメント機能の詳細を文書化
  - データ構造、データフロー、API仕様を記載
  - 使用方法と注意事項を追加

---

最終更新: 2025-12-11
