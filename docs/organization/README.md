# Organization ドキュメント

このフォルダには、MissionAIプロジェクトの組織管理に関するドキュメントが含まれています。

## 📁 ファイル構成

### 概念説明

#### `WHAT_IS_ORGANIZATION_ID.md` ⭐ **最重要**
- **ステータス**: アクティブ（概念説明）
- **用途**: organizationIdの概念と用途の説明
- **対象読者**: すべての開発者（理解必須）
- **内容**:
  - organizationIdとは何か
  - 組織の階層構造
  - データベースでの保存
  - organizationIdの用途
  - ChromaDBのコレクション分離
  - 検索範囲の限定
  - 実際の使用例

### 設計比較・検討

#### `ORGANIZATION_ID_DESIGN_COMPARISON.md`
- **ステータス**: アクティブ（設計比較ドキュメント）
- **用途**: 組織ID管理方式の比較と推奨事項
- **対象読者**: 設計レビュー担当者、実装者
- **内容**:
  - UUID形式 vs 組織コード形式の比較
  - メリット・デメリットの分析
  - 影響範囲の比較
  - 推奨案（UUID形式継続）
- **結論**: UUID形式継続を推奨（実装と一致）

#### `MEMBER_ORGANIZATION_LINKING_DESIGN.md`
- **ステータス**: 設計案（未実装）
- **用途**: メンバーと組織マスターテーブルの紐づけ設計案の記録
- **対象読者**: 設計レビュー担当者、将来の実装検討者
- **内容**:
  - 組織コード形式への変更案
  - 一元化の設計案
  - 移行戦略
  - 実装時のチェックリスト
- **注意**: このドキュメントは**設計案**です。現在の実装では**UUID形式を継続**しています。

## 🔗 ドキュメント間の関係性

```
WHAT_IS_ORGANIZATION_ID.md (概念説明)
    ├─→ ORGANIZATION_ID_DESIGN_COMPARISON.md (設計比較の参照)
    ├─→ chromadb/CHROMADB_SEARCH_CONDITIONS.md (検索条件の参照)
    └─→ database/database-design.md (データベース設計の参照)

ORGANIZATION_ID_DESIGN_COMPARISON.md (設計比較)
    └─→ MEMBER_ORGANIZATION_LINKING_DESIGN.md (設計案の参照)

MEMBER_ORGANIZATION_LINKING_DESIGN.md (設計案)
    └─→ ORGANIZATION_ID_DESIGN_COMPARISON.md (設計比較の参照)
```

## 📖 読み方のガイド

### 新規開発者

1. **まず読む**: `WHAT_IS_ORGANIZATION_ID.md`（organizationIdの概念を理解）
2. **参考**: `ORGANIZATION_ID_DESIGN_COMPARISON.md`（設計の背景を理解）

### 設計レビュー担当者

1. **まず読む**: `ORGANIZATION_ID_DESIGN_COMPARISON.md`（設計比較の確認）
2. **参考**: `MEMBER_ORGANIZATION_LINKING_DESIGN.md`（将来の設計案の確認）

### 実装者

1. **まず読む**: `WHAT_IS_ORGANIZATION_ID.md`（organizationIdの理解）
2. **参考**: `ORGANIZATION_ID_DESIGN_COMPARISON.md`（現在の実装方針の確認）

## 📝 ドキュメントの更新方針

- **概念説明** (`WHAT_IS_ORGANIZATION_ID.md`): 実装変更時に更新
- **設計比較** (`ORGANIZATION_ID_DESIGN_COMPARISON.md`): 設計方針の変更時に更新
- **設計案** (`MEMBER_ORGANIZATION_LINKING_DESIGN.md`): 基本的に更新しない（設計案として保持）

## 🔄 重要な変更履歴

### 2025-01-15（整合性チェック後）
- `WHAT_IS_ORGANIZATION_ID.md`を更新
  - `organizationContents`テーブルを追加（`organizationId`で紐づけられるテーブル一覧に追加）
  - `organizations`テーブルの外部キー制約（`parentId`の自己参照）を追加
- `ORGANIZATION_ID_DESIGN_COMPARISON.md`を更新
  - 9つのテーブルの詳細な説明を追加
  - `organizations`テーブル自身の`parentId`の自己参照について明記
- `README.md`を更新
  - 9つのテーブルの一覧を追加
  - 自己参照について明記

### 2025-01-15
- `WHAT_IS_ORGANIZATION_ID.md`を実装に合わせて更新
  - テーブル名を実装に合わせて修正（`topicRelations` → `relations`、`topicEmbeddings` → `topics`）
  - 組織IDの形式をUUID形式に修正
  - システム設計ドキュメント検索の説明を修正
  - 関連ドキュメントリンクを修正

### 2025-01-15
- `MEMBER_ORGANIZATION_LINKING_DESIGN.md`にステータス情報を追加
  - 設計案であることを明記
  - 現在の実装ではUUID形式を継続していることを明記

### 2025-01-15
- `ORGANIZATION_ID_DESIGN_COMPARISON.md`にステータス情報を追加
  - 現在の実装状況を明記

## 💡 現在の実装状況

### 組織IDの形式
- **形式**: UUID形式（例: `f41b8b41-b52b-4204-aae6-345a83e565e7`）
- **参照先**: `organizations(id)`テーブル
- **外部キー制約**: 9つのテーブルが`organizations(id)`を参照
  - `organizationMembers`, `organizationContents`, `focusInitiatives`, `meetingNotes`, `entities`, `relations`, `topics`, `organizationCompanyDisplay`, `companies`
- **自己参照**: `organizations`テーブル自身の`parentId`も`organizations(id)`を参照

### 組織マスターテーブル
- **`organizations`テーブル**: 主テーブル（UUID形式の`id`で管理）
- **`organization_master`テーブル**: 補助テーブル（CSVマスターデータ用、UUID形式の`id` + 組織コード`code`）

### 推奨事項
- **UUID形式継続**を推奨（`ORGANIZATION_ID_DESIGN_COMPARISON.md`の結論と一致）
- 組織コードでの検索も可能（`get_organization_master_by_code`を使用）

---

最終更新: 2025-12-11
