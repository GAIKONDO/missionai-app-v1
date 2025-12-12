# Database ドキュメント

このフォルダには、MissionAIプロジェクトのデータベース設計に関するドキュメントが含まれています。

## 📁 ファイル構成

### メイン設計書

#### `database-design.md` ⭐ **最重要**
- **ステータス**: アクティブ（メイン設計書）
- **用途**: データベース設計の概要とアーキテクチャ
- **対象読者**: すべての開発者（必読）
- **内容**:
  - SQLiteとChromaDBの役割分担
  - データロック回避の設計
  - 書き込みキューシステム
  - 同期メカニズム
  - ポート設定
  - ルーティング方式

### 実装仕様書

#### `EMBEDDING_STORAGE_LOCATIONS.md`
- **ステータス**: アクティブ（実装仕様書）
- **用途**: 埋め込みベクトルの保存場所と構造の説明
- **対象読者**: 実装者、デバッグ担当者
- **内容**:
  - ChromaDBコレクションの構造
  - SQLiteテーブルのメタデータ構造
  - データの保存フロー
  - フォールバック動作
  - 確認方法

### リスク分析

#### `DATA_SYNC_RISKS_AND_BENEFITS.md`
- **ステータス**: アクティブ（リスク分析）
- **用途**: データ同期（ChromaDB ↔ SQLite）のリスク・デメリット・メリット分析
- **対象読者**: 設計レビュー担当者、実装者
- **内容**:
  - メリット（データ整合性、運用の自動化など）
  - デメリット（パフォーマンス、APIコストなど）
  - リスク（データ損失、パフォーマンス劣化など）
  - 推奨される対策
  - 実装の推奨事項

## 🔗 ドキュメント間の関係性

```
database-design.md (メイン設計書)
    ├─→ EMBEDDING_STORAGE_LOCATIONS.md (埋め込みベクトルの保存場所)
    └─→ DATA_SYNC_RISKS_AND_BENEFITS.md (データ同期のリスク分析)

EMBEDDING_STORAGE_LOCATIONS.md
    ├─→ database-design.md (データベース設計の参照)
    └─→ CHROMADB_SQLITE_RELATIONSHIP.md (ChromaDBとSQLiteの関係)

DATA_SYNC_RISKS_AND_BENEFITS.md
    └─→ database-design.md (同期メカニズムの参照)
```

## 📖 読み方のガイド

### 新規開発者・実装者

1. **まず読む**: `database-design.md`（データベース設計を理解）
2. **次に読む**: `EMBEDDING_STORAGE_LOCATIONS.md`（埋め込みベクトルの保存場所を理解）
3. **参考**: `DATA_SYNC_RISKS_AND_BENEFITS.md`（データ同期のリスクを理解）

### 設計レビュー担当者

1. **まず読む**: `database-design.md`（データベース設計の確認）
2. **参考**: `DATA_SYNC_RISKS_AND_BENEFITS.md`（リスク分析の確認）

### デバッグ担当者

1. **まず読む**: `EMBEDDING_STORAGE_LOCATIONS.md`（データ保存場所の確認）
2. **参考**: `database-design.md`（データベース設計の確認）

## 📝 ドキュメントの更新方針

- **メイン設計書** (`database-design.md`): 実装に合わせて継続的に更新
- **実装仕様書** (`EMBEDDING_STORAGE_LOCATIONS.md`): 実装変更時に更新
- **リスク分析** (`DATA_SYNC_RISKS_AND_BENEFITS.md`): リスク評価の変更時に更新

## 🔄 重要な変更履歴

### 2025-01-15
- `EMBEDDING_STORAGE_LOCATIONS.md`を実装に合わせて大幅更新
  - 廃止された`entityEmbeddings`、`relationEmbeddings`テーブルの記載を削除
  - `topicEmbeddings` → `topics`テーブルに統合されたことを反映
  - SQLiteには埋め込みベクトルは保存されないことを明記
  - ChromaDBコレクション名を実装に合わせて修正

### 2025-01-15
- `database-design.md`のポート番号を実装に合わせて修正
  - 開発環境ではRust APIサーバーは3010を使用（Next.jsと同じ）、本番環境では3011を使用
  - ChromaDBコレクション名を実装に合わせて修正
  - フォールバック動作を明確化（トピック検索にはSQLiteフォールバックなし）
- `EMBEDDING_STORAGE_LOCATIONS.md`のフォールバック動作を実装に合わせて修正
  - トピック検索にはSQLiteフォールバックがないことを明記
- `lib/designDocIndexer.ts`のテーブル名を実装に合わせて修正
  - `topicRelations` → `relations`
  - `topicEmbeddings` → `topics`

---

最終更新: 2025-12-11
