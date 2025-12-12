# RAG検索トラブルシューティングガイド

> **📋 ステータス**: アクティブ（トラブルシューティングガイド）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: RAG検索でデータが見つからない場合の原因と解決方法の説明

## 概要

このドキュメントでは、RAG検索でデータが見つからない場合の原因と解決方法を説明します。

## RAG検索のフロー

### 1. 基本的な検索フロー

```
ユーザーが検索クエリを入力
    ↓
Frontend: 検索リクエスト送信
    ↓
Frontend: クエリの埋め込みベクトル生成（OpenAI API）
    ↓
organizationIdが指定されている？
    ├─ Yes → ChromaDBで検索を試行
    │         ├─ 成功 → 結果を返す
    │         └─ 失敗 or 空の結果 → SQLiteにフォールバック
    └─ No  → 直接SQLiteで検索
    ↓
SQLite: 全データを取得してコサイン類似度を計算
    ↓
結果を統合・スコアリング
    ↓
検索結果を返す
```

### 2. 検索タイプ別のフロー

#### エンティティ検索 (`findSimilarEntities`)

1. **ChromaDB検索**（ChromaDBが有効 && `organizationId`が指定されている場合）
   - `entities_{organizationId}`コレクションから検索
   - 結果を返す

2. **ChromaDBが無効 || organizationIdが未指定の場合**
   - 空の結果を返す（SQLiteフォールバックなし）

**注意**: 埋め込みベクトルはChromaDBにのみ保存されるため、SQLiteフォールバックはありません

#### リレーション検索 (`findSimilarRelations`)

1. **ChromaDB検索**（ChromaDBが有効 && `organizationId`が指定されている場合）
   - `relations_{organizationId}`コレクションから検索
   - 結果を返す

2. **ChromaDBが無効 || organizationIdが未指定の場合**
   - 空の結果を返す（SQLiteフォールバックなし）

**注意**: 埋め込みベクトルはChromaDBにのみ保存されるため、SQLiteフォールバックはありません

#### トピック検索 (`findSimilarTopics`)

1. **ChromaDB検索**（`organizationId`が指定されている場合）
   - `topics_{organizationId}`コレクションから検索
   - ChromaDBが無効な場合、または検索が失敗した場合は空の結果を返す
   - **注意**: トピック検索にはSQLiteフォールバックはありません。埋め込みベクトルはChromaDBにのみ保存されます。

## データが見つからない場合の確認ポイント

### 1. organizationIdの確認

**問題**: `organizationId`が`undefined`の場合、ChromaDB検索がスキップされます。

**確認方法**:
```javascript
// ブラウザの開発者ツール（F12）でコンソールを確認
console.log('organizationId:', organizationId);
```

**解決方法**:
- 組織ページ（`/organization/[id]`）から検索を実行する
- または、RAG検索ページで組織を選択する

### 2. ChromaDBのデータ確認

**問題**: ChromaDBにデータが保存されていない場合、検索結果が空になります。

**確認方法**:
1. ブラウザの開発者ツール（F12）でコンソールを確認
2. 以下のログが表示されているか確認：
   ```
   ✅ ChromaDBにエンティティ埋め込みを保存しました: [entity-id]
   ✅ ChromaDBにリレーション埋め込みを保存しました: [relation-id]
   ✅ ChromaDBにトピック埋め込みを保存しました: [topic-id]
   ```

**解決方法**:
- ChromaDBを有効化する（設定ページで有効化、または`localStorage.setItem('useChromaDB', 'true')`）
- エンティティ/リレーション/トピックを作成し直す（ChromaDBに埋め込みベクトルが保存される）
- **重要**: SQLiteフォールバックはありません。ChromaDBを有効化する必要があります

### 3. ChromaDBが無効な場合

**問題**: ChromaDBが無効な場合、検索結果は常に空になります。

**確認方法**:
```javascript
// ブラウザの開発者ツール（F12）でコンソールを確認
// 以下のログが表示されることを確認：
console.log('useChromaDB:', localStorage.getItem('useChromaDB'));
// または
// "⚠️ ChromaDBが無効です" という警告が表示される
```

**解決方法**:
- ChromaDBを有効化する（設定ページで有効化、または`localStorage.setItem('useChromaDB', 'true')`）
- **重要**: SQLiteフォールバックはありません。ChromaDBを有効化する必要があります

### 4. ChromaDB Serverの状態確認

**問題**: ChromaDB Serverが起動していない場合、検索が失敗します。

**確認方法**:
1. ブラウザの開発者ツール（F12）でコンソールを確認
2. 以下のエラーが表示されていないか確認：
   ```
   ChromaDBでの検索に失敗しました。SQLiteにフォールバックします
   ```

**解決方法**:
- ChromaDB Serverが自動的に起動することを確認
- または、SQLiteにフォールバックする（自動的に実行されます）

### 5. 埋め込みベクトルの確認

**問題**: 埋め込みベクトルが生成されていない場合、検索できません。

**確認方法**:
```javascript
// ブラウザの開発者ツール（F12）でコンソールを確認
// 埋め込み生成のログが表示されているか確認
```

**解決方法**:
- エンティティ/リレーション/トピックを作成し直す
- 埋め込みが自動生成されることを確認する

## デバッグ方法

### 1. コンソールログの確認

ブラウザの開発者ツール（F12）でコンソールを開き、以下のログを確認：

**正常な場合**:
```
✅ ChromaDBにエンティティ埋め込みを保存しました: [entity-id]
✅ ChromaDBでの検索結果: [件数]件
[findSimilarTopics] ChromaDB検索完了: [件数]件の結果を取得
```

**フォールバックが発生した場合**:
```
⚠️ organizationIdが指定されていないため、SQLiteで検索します
⚠️ ChromaDBでの検索結果が空でした。SQLiteにフォールバックします
[findSimilarTopics] ⚠️ ChromaDBが無効です。
[findSimilarTopics] 💡 埋め込みベクトルはChromaDBにのみ保存されます。ChromaDBを有効にするには、設定ページでChromaDBを有効化するか、コンソールで以下を実行: localStorage.setItem('useChromaDB', 'true')
```

### 2. 検索フローの確認

`lib/entityEmbeddings.ts`、`lib/relationEmbeddings.ts`、`lib/topicEmbeddings.ts`の検索関数にログを追加：

```typescript
console.log('検索開始:', { queryText, limit, organizationId });
console.log('ChromaDB使用:', shouldUseChroma());
console.log('検索結果:', results);
```

### 3. ChromaDBの状態確認

ChromaDBテストページ（`/test-chromadb`）で動作確認：

1. `/test-chromadb`に移動
2. 「テストを実行」ボタンをクリック
3. すべてのテストが成功することを確認

## よくある問題と解決方法

### 問題1: データがあるのに検索結果が0件

**原因**:
- `organizationId`が`undefined`で、ChromaDB検索がスキップされている
- ChromaDBにデータが保存されていない
- SQLiteにもデータが保存されていない

**解決方法**:
1. `organizationId`を確認する
2. ChromaDBにデータが保存されているか確認する
3. SQLiteにデータが保存されているか確認する
4. エンティティ/リレーション/トピックを作成し直す

### 問題2: ChromaDB検索が失敗する

**原因**:
- ChromaDB Serverが起動していない
- `organizationId`が`undefined`
- ChromaDBにデータが保存されていない

**解決方法**:
1. ChromaDB Serverが自動的に起動することを確認
2. `organizationId`を指定する
3. エンティティ/リレーション/トピックを作成し直す
4. SQLiteにフォールバックする（自動的に実行されます）

### 問題3: 検索速度が遅い

**原因**:
- ChromaDBが使用されず、SQLiteで全データを検索している

**解決方法**:
1. ChromaDB Serverが起動していることを確認
2. `organizationId`を指定する
3. ChromaDBにデータが保存されていることを確認

## 修正内容（2024年12月）

### 修正1: organizationIdがundefinedの場合の処理

**変更前**:
- ChromaDBが空の結果を返す
- フォールバック処理が実行されない

**変更後**:
- `organizationId`が`undefined`の場合は、ChromaDB検索をスキップして直接SQLiteにフォールバック
- ChromaDBの結果が空の場合も、SQLiteにフォールバック

### 修正2: Rust側のエラーハンドリング

**変更前**:
- `organizationId`が`undefined`の場合、エラーを返す

**変更後**:
- `organizationId`が`undefined`の場合、空の結果を返す（エラーを返さない）

## 関連ファイル

- `lib/entityEmbeddings.ts` - エンティティ検索
- `lib/relationEmbeddings.ts` - リレーション検索
- `lib/topicEmbeddings.ts` - トピック検索（ChromaDBのみ、SQLiteフォールバックなし）
- `lib/knowledgeGraphRAG.ts` - 統合RAG検索
- `src-tauri/src/database/chromadb.rs` - ChromaDB検索実装

## 関連ドキュメント

- [埋め込みベクトルの保存場所](../database/EMBEDDING_STORAGE_LOCATIONS.md) - データの保存場所の詳細
- [検索時のデータベース参照フロー](./SEARCH_DATABASE_FLOW.md) - 検索フローの詳細
- [ChromaDB使用ガイド](../chromadb/CHROMADB_USAGE_GUIDE.md) - ChromaDBのセットアップとトラブルシューティング
