# SQLite ドキュメント

このフォルダには、MissionAIプロジェクトのSQLiteデータベース設定に関するドキュメントが含まれています。

## 📁 ファイル構成

### 設定仕様書

#### `SQLITE_CONFIGURATION.md` ⭐ **最重要**
- **ステータス**: アクティブ（設定仕様書）
- **用途**: SQLiteデータベースの設定、接続、パフォーマンス設定の詳細
- **対象読者**: すべての開発者（必読）
- **内容**:
  - データベースファイルの場所
  - 接続プール設定
  - PRAGMA設定
  - 書き込みキューシステム
  - テーブル構造
  - インデックス
  - マイグレーション
  - バックアップ
  - パフォーマンス最適化
  - トラブルシューティング

## 🔗 ドキュメント間の関係性

```
SQLITE_CONFIGURATION.md (SQLite設定)
    ├─→ ../database/database-design.md (データベース設計の参照)
    ├─→ ../database/EMBEDDING_STORAGE_LOCATIONS.md (埋め込みベクトルの保存場所)
    └─→ ../chromadb/CHROMADB_INTEGRATION_PLAN.md (ChromaDB統合計画)
```

## 📖 読み方のガイド

### 新規開発者・実装者

1. **まず読む**: `SQLITE_CONFIGURATION.md`（SQLite設定を理解）
2. **次に読む**: `../database/database-design.md`（データベース設計を理解）
3. **参考**: `../database/EMBEDDING_STORAGE_LOCATIONS.md`（埋め込みベクトルの保存場所を理解）

### データベース管理者

1. **まず読む**: `SQLITE_CONFIGURATION.md`（SQLite設定の確認）
2. **参考**: `../database/DATA_SYNC_RISKS_AND_BENEFITS.md`（データ同期のリスクを理解）

### デバッグ担当者

1. **まず読む**: `SQLITE_CONFIGURATION.md`（設定とトラブルシューティングの確認）
2. **参考**: `../database/database-design.md`（データベース設計の確認）

## 📝 ドキュメントの更新方針

- **設定仕様書** (`SQLITE_CONFIGURATION.md`): 実装に合わせて継続的に更新
- SQLiteの設定変更時（PRAGMA、プール設定など）に更新
- テーブル構造の変更時に更新
- パフォーマンス最適化の実施時に更新

## 🔄 重要な変更履歴

### 2025-01-15
- `SQLITE_CONFIGURATION.md`を作成
  - SQLite設定の詳細を文書化
  - 接続プール設定、PRAGMA設定、書き込みキューシステムを説明
  - テーブル構造、インデックス、マイグレーション手順を記載
  - パフォーマンス最適化とトラブルシューティングを追加

---

最終更新: 2025-12-11
