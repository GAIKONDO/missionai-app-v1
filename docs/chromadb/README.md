# ChromaDB ドキュメント

このフォルダには、MissionAIプロジェクトにおけるChromaDB統合に関するドキュメントが含まれています。

## 📁 ファイル構成

### メイン設計書・実装計画

#### `CHROMADB_INTEGRATION_PLAN.md` ⭐ **最重要**
- **ステータス**: アクティブ（メイン設計書）
- **用途**: ChromaDB統合の実装計画とアーキテクチャ設計
- **対象読者**: 実装者、設計レビュー担当者
- **内容**:
  - 調査結果（Rustクライアントのembedded modeは存在しない）
  - 実装方法（ChromaDB Serverをバンドルして起動）
  - アーキテクチャ図
  - 実装手順とコード例

### 概念・設計説明

#### `CHROMADB_SQLITE_RELATIONSHIP.md`
- **ステータス**: アクティブ（概念説明）
- **用途**: ChromaDBとSQLiteの役割分担とデータ保存場所の説明
- **対象読者**: すべての開発者（理解必須）
- **内容**:
  - ChromaDB: ベクトルデータ（埋め込み）のみ保存
  - SQLite: 基本情報（詳細データ）を保存
  - データの保存場所と構造
  - 検索フローの説明

#### `CHROMADB_SEARCH_CONDITIONS.md`
- **ステータス**: アクティブ（概念説明）
- **用途**: ChromaDB検索の条件と動作の詳細説明
- **対象読者**: 実装者、デバッグ担当者
- **内容**:
  - `organizationId`が必要な検索と不要な検索
  - エンティティ・リレーション・トピック検索の条件
  - システム設計ドキュメント検索の条件
  - 検索フローの詳細

#### `CHROMADB_LOCAL_USAGE.md`
- **ステータス**: 参考用（過去の検討内容）
- **用途**: ChromaDB統合前の検討内容の記録
- **対象読者**: 技術調査担当者、実装履歴を確認したい開発者
- **内容**:
  - JavaScript/Node.js環境でのローカル利用の検討
  - Rust環境でのサーバー必須の説明
  - `hnsw_rs`の検討内容
- **注意**: このドキュメントで推奨されている`hnsw_rs`は採用されていません。現在の実装ではChromaDB Serverを使用しています。

### 実用ガイド

#### `CHROMADB_USAGE_GUIDE.md` ⭐ **実用ガイド**
- **ステータス**: アクティブ（実用ガイド）
- **用途**: ChromaDBのセットアップ、動作確認、トラブルシューティングの包括ガイド
- **対象読者**: 新規開発者、QA担当者、動作確認担当者
- **内容**:
  - 前提条件の確認
  - アプリケーションの起動
  - ChromaDB Serverの起動確認
  - ChromaDBは常に有効（設定ページでの選択は不要）
  - 動作確認手順（エンティティ、リレーション、トピック）
  - テストページでの動作確認
  - トラブルシューティング
  - パフォーマンス確認
  - 確認項目チェックリスト

### 実装記録・改善履歴

#### `CHROMADB_SYNC_IMPROVEMENTS.md`
- **ステータス**: 参考用（実装記録）
- **用途**: 同期機能の改善実装の記録
- **対象読者**: 実装履歴を確認したい開発者
- **内容**:
  - 実装した改善内容（同期ポリシー、リトライ、エラー通知など）
  - 実装したファイル一覧
  - 変更内容の詳細
- **注意**: 過去の実装記録（参考用）

### PDF版

#### `CHROMADB_INTEGRATION_PLAN.pdf`
- **ステータス**: PDF版（印刷・共有用）
- **用途**: 実装計画書のPDF版
- **内容**: `CHROMADB_INTEGRATION_PLAN.md`のPDF版

## 🔗 ドキュメント間の関係性

```
CHROMADB_INTEGRATION_PLAN.md (実装計画)
    ├─→ CHROMADB_SQLITE_RELATIONSHIP.md (データ保存場所の説明)
    ├─→ CHROMADB_SEARCH_CONDITIONS.md (検索条件の説明)
    └─→ CHROMADB_LOCAL_USAGE.md (技術的制約の説明)

CHROMADB_USAGE_GUIDE.md (実用ガイド)
    ├─→ CHROMADB_INTEGRATION_PLAN.md (実装計画の参照)
    ├─→ CHROMADB_SQLITE_RELATIONSHIP.md (データ構造の理解)
    └─→ CHROMADB_SEARCH_CONDITIONS.md (検索条件の理解)

CHROMADB_SYNC_IMPROVEMENTS.md (実装記録)
    └─→ 過去の改善履歴（参考用）
```

## 📖 読み方のガイド

### 新規開発者・実装者

1. **まず読む**: `CHROMADB_INTEGRATION_PLAN.md`（実装計画を理解）
2. **次に読む**: `CHROMADB_SQLITE_RELATIONSHIP.md`（データ構造を理解）
3. **動作確認**: `CHROMADB_USAGE_GUIDE.md`（セットアップと動作確認）

### QA担当者・動作確認担当者

1. **まず読む**: `CHROMADB_USAGE_GUIDE.md`（動作確認手順）
2. **参考**: `CHROMADB_SEARCH_CONDITIONS.md`（検索条件の理解）

### デバッグ担当者

1. **まず読む**: `CHROMADB_USAGE_GUIDE.md`（トラブルシューティング）
2. **参考**: `CHROMADB_SEARCH_CONDITIONS.md`（検索条件の確認）
3. **参考**: `CHROMADB_LOCAL_USAGE.md`（技術的制約の確認）

### 設計レビュー担当者

1. **まず読む**: `CHROMADB_INTEGRATION_PLAN.md`（実装計画の確認）
2. **参考**: `CHROMADB_SQLITE_RELATIONSHIP.md`（データ設計の確認）

## 📝 ドキュメントの更新方針

- **メイン設計書** (`CHROMADB_INTEGRATION_PLAN.md`): 実装に合わせて継続的に更新
- **概念説明** (`CHROMADB_SQLITE_RELATIONSHIP.md`, `CHROMADB_SEARCH_CONDITIONS.md`): 設計変更時に更新
- **実用ガイド** (`CHROMADB_USAGE_GUIDE.md`): 動作確認手順の変更時に更新
- **実装記録** (`CHROMADB_SYNC_IMPROVEMENTS.md`): 基本的に更新しない（過去の記録として保持）

## 🔄 統合履歴

以下のドキュメントは統合されました（2025-01-15）:
- ~~`CHROMADB_QUICK_START.md`~~ → `CHROMADB_USAGE_GUIDE.md`に統合
- ~~`CHROMADB_TESTING.md`~~ → `CHROMADB_USAGE_GUIDE.md`に統合
- ~~`CHROMADB_VERIFICATION_CHECKLIST.md`~~ → `CHROMADB_USAGE_GUIDE.md`に統合

---

最終更新: 2025-12-11
