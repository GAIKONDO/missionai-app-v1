# 検索時のデータベース参照フロー

> **📋 ステータス**: アクティブ（実装仕様書）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: RAG検索時のデータベース参照フローの詳細説明

## 概要

RAG検索を実行すると、以下の順序でデータベースとテーブルを参照します。

## 検索フローの全体像

```
ユーザーが検索クエリを入力
    ↓
searchKnowledgeGraph() が呼ばれる
    ↓
並列で3つの検索を実行:
  ├─ findSimilarEntitiesHybrid() → エンティティ検索
  ├─ findSimilarRelationsHybrid() → リレーション検索
  └─ findSimilarTopicsHybrid() → トピック検索
    ↓
各検索結果のIDを使ってSQLiteから詳細情報を取得
    ↓
結果を統合して返す
```

## エンティティ検索の詳細フロー

### ステップ1: ベクトル類似度検索（IDと類似度を取得）

#### パターン1: ChromaDBが使用可能 && organizationIdが指定されている場合

```
1. ChromaDBの entities_{organizationId} コレクションを検索
   ↓
   結果を返す [{ entityId, similarity }]
```

**参照先**: 
- **ChromaDB**: `entities_{organizationId}` コレクション

#### パターン2: ChromaDBが使用できない || organizationIdが未指定の場合

```
空の結果を返す（SQLiteフォールバックなし）
```

**注意**: 
- ChromaDBが無効な場合、または`organizationId`が未指定の場合、検索結果は空になります
- 埋め込みベクトルはChromaDBにのみ保存されるため、SQLiteフォールバックはありません

### ステップ2: 詳細情報の取得

```
検索結果の各IDに対して:
  getEntityById(entityId) を呼び出す
    ↓
  SQLiteの entities テーブルから詳細情報を取得
    ↓
  結果を統合: { entityId, similarity, entity: { name, type, ... } }
```

**参照先**: 
- **SQLite**: `entities` テーブル

## リレーション検索の詳細フロー

### ステップ1: ベクトル類似度検索

#### パターン1: ChromaDBが使用可能 && organizationIdが指定されている場合

```
1. ChromaDBの relations_{organizationId} コレクションを検索
   ↓
   結果を返す [{ relationId, similarity }]
```

**参照先**: 
- **ChromaDB**: `relations_{organizationId}` コレクション

#### パターン2: ChromaDBが使用できない || organizationIdが未指定の場合

```
空の結果を返す（SQLiteフォールバックなし）
```

**注意**: 
- ChromaDBが無効な場合、または`organizationId`が未指定の場合、検索結果は空になります
- 埋め込みベクトルはChromaDBにのみ保存されるため、SQLiteフォールバックはありません

### ステップ2: 詳細情報の取得

```
検索結果の各IDに対して:
  getRelationById(relationId) を呼び出す
    ↓
  SQLiteの relations テーブルから詳細情報を取得
```

**参照先**: 
- **SQLite**: `relations` テーブル（`topicRelations`からリネーム済み）

## トピック検索の詳細フロー

### ステップ1: ベクトル類似度検索

#### パターン1: ChromaDBが使用可能 && organizationIdが指定されている場合

```
1. ChromaDBの topics_{organizationId} コレクションを検索
   ↓
   結果が空でない？
   ├─ Yes → 結果を返す [{ topicId, meetingNoteId, similarity }]
   └─ No  → ステップ2に進む
```

**参照先**: 
- **ChromaDB**: `topics_{organizationId}` コレクション

#### パターン2: ChromaDBが無効または検索失敗の場合

```
1. ChromaDBが無効な場合、または検索が失敗した場合
   ↓
2. 空の結果を返す（SQLiteフォールバックなし）
   ↓
   **注意**: トピック検索にはSQLiteフォールバックはありません。
   埋め込みベクトルはChromaDBにのみ保存されます。
```

**参照先**: 
- なし（空の結果を返す）

## まとめ表

### エンティティ検索

| 条件 | 1次参照 | 詳細情報取得 |
|------|---------|------------|
| ChromaDB使用可能 && organizationId指定 | ChromaDB: `entities_{orgId}` | SQLite: `entities` |
| ChromaDB使用不可 \|\| organizationId未指定 | なし（空の結果を返す） | - |

**注意**: 
- ChromaDBが無効な場合、または`organizationId`が未指定の場合、検索結果は空になります
- SQLiteフォールバックはありません（埋め込みベクトルはChromaDBにのみ保存）

### リレーション検索

| 条件 | 1次参照 | 詳細情報取得 |
|------|---------|------------|
| ChromaDB使用可能 && organizationId指定 | ChromaDB: `relations_{orgId}` | SQLite: `relations` |
| ChromaDB使用不可 \|\| organizationId未指定 | なし（空の結果を返す） | - |

**注意**: 
- `topicRelations`テーブルは`relations`テーブルにリネーム済みです
- ChromaDBが無効な場合、または`organizationId`が未指定の場合、検索結果は空になります
- SQLiteフォールバックはありません（埋め込みベクトルはChromaDBにのみ保存）

### トピック検索

| 条件 | 1次参照 | 2次参照（フォールバック） | 詳細情報取得 |
|------|---------|------------------------|------------|
| ChromaDB使用可能 && organizationId指定 | ChromaDB: `topics_{orgId}` | なし（空の結果を返す） | SQLite: `topics` |
| ChromaDB使用不可 \|\| organizationId未指定 | - | なし（空の結果を返す） | SQLite: `topics` |

**注意**: 
- トピック検索にはSQLiteフォールバックはありません。埋め込みベクトルはChromaDBにのみ保存されます。
- `topicEmbeddings`テーブルは`topics`テーブルに統合済みです。

## 実際のコードフロー

### エンティティ検索のコード

```typescript
// 1. searchKnowledgeGraph() が呼ばれる
const entityResults = await findSimilarEntitiesHybrid(
  queryText,
  limit,
  { organizationId: filters?.organizationId }
);

// 2. findSimilarEntitiesHybrid() 内部で findSimilarEntities() を呼び出す
const vectorResults = await findSimilarEntities(
  queryText,
  limit * 2,
  filters?.organizationId
);

// 3. findSimilarEntities() の処理
if (shouldUseChroma() && organizationId) {
  // ChromaDB検索
  const results = await findSimilarEntitiesChroma(...);
  // → ChromaDB: entities_{organizationId} を参照
  return results;  // 結果を返す（空の結果でも返す）
}

// ChromaDBが無効 || organizationIdが未指定の場合
// 空の結果を返す（SQLiteフォールバックなし）
return [];

// 4. 詳細情報を取得（検索結果がある場合のみ）
for (const result of entityResults) {
  const entity = await getEntityById(result.entityId);
  // → SQLite: entities を参照（詳細情報取得用）
}
```

## 検索結果が0件になる原因

### 原因1: ChromaDBが無効な場合

**状況**:
- ChromaDBが無効（`localStorage.getItem('useChromaDB') !== 'true'`）
- 埋め込みベクトルはChromaDBにのみ保存される
- SQLiteフォールバックはない

**解決方法**:
- ChromaDBを有効化する（設定ページで有効化、または`localStorage.setItem('useChromaDB', 'true')`）

### 原因2: organizationIdが未指定の場合

**状況**:
- `organizationId`が`undefined`の場合、ChromaDB検索がスキップされる
- SQLiteフォールバックはない

**解決方法**:
- `organizationId`を指定して検索する
- 組織ページ（`/organization/[id]`）から検索を実行する

### 原因3: ChromaDBにデータがない場合

**状況**:
- ChromaDBが有効だが、データが保存されていない
- SQLiteフォールバックはない

**解決方法**:
- エンティティ/リレーション/トピックを作成し直す
- ChromaDBに埋め込みベクトルが保存されることを確認する

## デバッグ方法

### 1. ブラウザの開発者ツール（F12）でコンソールを確認

以下のログが表示されているか確認：

```
[findSimilarEntities] 🔍 検索開始: queryText="...", organizationId="...", shouldUseChroma()=true
[findSimilarEntities] ChromaDB検索を試行: organizationId="..."
[findSimilarEntities] ChromaDB検索完了: X件の結果を取得
```

または

```
[findSimilarEntities] ⚠️ ChromaDBが無効です（localStorage['useChromaDB']="..."）。
[findSimilarEntities] 💡 埋め込みベクトルはChromaDBにのみ保存されます。ChromaDBを有効にするには...
```

### 2. ChromaDBの状態を確認

```typescript
// ブラウザの開発者ツール（F12）で実行
console.log('useChromaDB:', localStorage.getItem('useChromaDB'));
console.log('shouldUseChroma():', shouldUseChroma());
```

### 3. ChromaDBのコレクション件数を確認

```typescript
// organizationIdが指定されている場合、コレクション件数がログに表示される
// 例: "[findSimilarEntities] ChromaDBコレクション entities_xxx の件数: 10件"
```

## まとめ

検索時は以下の順序でデータベースを参照します：

1. **ChromaDB**（ChromaDBが有効 && organizationIdが指定されている場合）
   - `entities_{organizationId}` / `relations_{organizationId}` / `topics_{organizationId}`
   - 結果が空の場合は空の結果を返す（SQLiteフォールバックなし）

2. **ChromaDBが無効 || organizationIdが未指定の場合**
   - 空の結果を返す（SQLiteフォールバックなし）

3. **SQLiteの基本テーブル**（詳細情報取得）
   - `entities` / `relations` / `topics`（検索結果のIDから詳細情報を取得）

**重要な注意事項**: 
- **SQLiteフォールバックはありません**。埋め込みベクトルはChromaDBにのみ保存されます
- ChromaDBが無効な場合、または`organizationId`が未指定の場合、検索結果は空になります
- `topicRelations`テーブルは`relations`テーブルにリネーム済み
- `topicEmbeddings`テーブルは`topics`テーブルに統合済み
