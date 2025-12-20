# データベース最適化実装サマリー

## 実装完了日
2025-01-XX

## 実装内容

### 1. SQLiteテーブルの最適化 ✅

#### topicsテーブル
**追加カラム**:
- `contentSummary TEXT`: contentの要約（200文字程度）
- `searchableText TEXT`: title + description + contentSummaryを結合した検索用テキスト

**追加インデックス**:
- `idx_topics_searchable_text`: searchableTextカラムのインデックス
- `idx_topics_semanticCategory`: semanticCategoryカラムのインデックス

#### entitiesテーブル
**追加カラム**:
- `searchableText TEXT`: name + aliases + metadataの重要フィールドを結合した検索用テキスト
- `displayName TEXT`: 表示用の名前（name + 重要なメタデータ）

**追加インデックス**:
- `idx_entities_searchable_text`: searchableTextカラムのインデックス

#### relationsテーブル
**追加カラム**:
- `searchableText TEXT`: relationType + description + metadataの重要フィールドを結合した検索用テキスト

**追加インデックス**:
- `idx_relations_searchable_text`: searchableTextカラムのインデックス

### 2. ChromaDBコレクション名の修正 ✅

**修正内容**:
- `organizationId`が空文字列の場合、コレクション名を`topics_all`、`entities_all`、`relations_all`に変更
- ChromaDBの命名規則に準拠（末尾が`_`で終わらない）

**修正箇所**:
- `save_topic_embedding()`
- `get_topic_embedding()`
- `delete_topic_embedding()`
- `find_similar_topics()`（組織横断検索時のループ内）
- `save_entity_embedding()`（すべての箇所）
- `get_entity_embedding()`
- `delete_entity_embedding()`
- `find_similar_entities()`（組織横断検索時のループ内）
- `save_relation_embedding()`（すべての箇所）
- `get_relation_embedding()`
- `delete_relation_embedding()`
- `find_similar_relations()`（組織横断検索時のループ内）

## 次のステップ

### ステップ1: アプリケーションの起動と初期化確認

1. **アプリケーションを起動**
   ```bash
   # 開発環境の場合
   npm run dev
   # または
   cargo tauri dev
   ```

2. **初期化ログの確認**
   - SQLiteデータベースの作成
   - テーブルの作成
   - インデックスの作成
   - ChromaDBサーバーの起動

3. **エラーの確認**
   - テーブル作成エラーがないか
   - インデックス作成エラーがないか
   - ChromaDBサーバーの起動エラーがないか

### ステップ2: データベース構造の確認

```sql
-- SQLiteでテーブル構造を確認
.schema topics
.schema entities
.schema relations

-- インデックスを確認
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';
```

### ステップ3: ChromaDBの確認

- ChromaDBサーバーが起動していることを確認
- コレクション名が正しく生成されることを確認（`organizationId`が空文字列の場合）

## 注意事項

### 1. 既存データがない状態

- クリーンな状態から始めるため、既存データは存在しない
- 新しいデータを追加する際に、`searchableText`、`contentSummary`、`displayName`カラムも更新する必要がある

### 2. データ追加時の処理

新しいデータを追加する際は、以下のカラムも更新する必要があります：

- **topics**: `contentSummary`、`searchableText`
- **entities**: `searchableText`、`displayName`
- **relations**: `searchableText`

これらのカラムは、RAG検索のパフォーマンス向上のために使用されます。

### 3. ChromaDBコレクション名

- `organizationId`が空文字列の場合、`topics_all`、`entities_all`、`relations_all`が使用される
- 既存のコードで`organizationId`が空文字列で渡される場合、新しいコレクション名が使用される

## トラブルシューティング

### 問題1: テーブル作成エラー

**症状**: アプリケーション起動時にテーブル作成エラーが発生

**対処法**:
1. ログを確認してエラー内容を確認
2. SQLiteデータベースファイルを削除して再作成
3. アプリケーションを再起動

### 問題2: インデックス作成エラー

**症状**: インデックス作成時にエラーが発生

**対処法**:
1. ログを確認してエラー内容を確認
2. 既存のインデックスを削除して再作成
3. アプリケーションを再起動

### 問題3: ChromaDBサーバーの起動エラー

**症状**: ChromaDBサーバーが起動しない

**対処法**:
1. Python環境がインストールされているか確認
2. ChromaDBがインストールされているか確認: `pip3 install chromadb`
3. ポート8000が使用可能か確認
4. アプリケーションを再起動

## 実装ファイル

### 修正したファイル

1. **`src-tauri/src/database/mod.rs`**
   - `topics`テーブルに`contentSummary`と`searchableText`カラムを追加
   - `entities`テーブルに`searchableText`と`displayName`カラムを追加
   - `relations`テーブルに`searchableText`カラムを追加
   - 検索用インデックスを追加

2. **`src-tauri/src/database/chromadb.rs`**
   - コレクション名生成ロジックを修正（`organizationId`が空文字列の場合の処理）

## 次の実装予定

1. **データ追加時の自動更新**: `searchableText`、`contentSummary`、`displayName`カラムの自動更新
2. **RAG検索結果の拡張**: トピック情報（title, contentSummary）を含める
3. **コンテキスト生成の最適化**: トークン制限内で重要な情報のみを含める
