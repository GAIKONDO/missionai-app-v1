# 検索結果が0件になる原因と解決方法

> **📋 ステータス**: アクティブ（問題解決ガイド）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: 検索結果が0件になる原因と解決方法の説明

## 問題の原因

検索結果が0件になる主な原因は、**データの保存場所と検索場所の不一致**です。

## データの保存フロー

### ChromaDBが使用可能な場合

```
エンティティ/リレーション/トピックを作成
    ↓
SQLiteに基本情報を保存（entities, relations, topics）
    ↓
埋め込みベクトルを生成
    ↓
ChromaDBに埋め込みベクトルを保存 ✅
    ↓
SQLiteのフォールバック用テーブル（entityEmbeddings, relationEmbeddings）には保存されない ❌
    ↓
**注意**: トピックの埋め込みベクトルはChromaDBにのみ保存されます（SQLiteフォールバックなし）
```

**重要なポイント**:
- ChromaDBが使用可能な場合、**SQLiteの`entityEmbeddings`テーブルにはデータが保存されません**
- これは二重保存を避けるための設計です

### ChromaDBが使用できない場合

```
エンティティ/リレーションを作成
    ↓
SQLiteに基本情報を保存（entities, relations）
    ↓
埋め込みベクトルを生成
    ↓
SQLiteのフォールバック用テーブル（entityEmbeddings, relationEmbeddings）に保存 ✅
    ↓
**注意**: トピックの埋め込みベクトルはChromaDBが無効な場合でもSQLiteには保存されません
```

## 検索フローの問題

### 現在の検索フロー

```typescript
// 1. ChromaDBで検索を試行
if (shouldUseChroma() && organizationId) {
  // ChromaDBで検索
  const results = await findSimilarEntitiesChroma(...);
  return results;  // ✅ 成功（空の結果でも返す）
}

// 2. ChromaDBが無効 || organizationIdが未指定の場合
// 空の結果を返す（SQLiteフォールバックなし）
return [];
```

### 問題点

1. **ChromaDBが無効な場合**:
   - 埋め込みベクトルはChromaDBにのみ保存される
   - SQLiteフォールバックはない
   - 結果: 検索結果が0件

2. **organizationIdが未指定の場合**:
   - ChromaDB検索がスキップされる
   - SQLiteフォールバックはない
   - 結果: 検索結果が0件

3. **ChromaDBにデータがない場合**:
   - 空の結果が返される
   - SQLiteフォールバックはない
   - 結果: 検索結果が0件

## 解決方法

### 方法1: ChromaDBを有効化する（必須）

ChromaDBを有効化することで、検索が機能するようになります。

```typescript
// 設定ページでChromaDBを有効化
// または、ブラウザのコンソールで実行
localStorage.setItem('useChromaDB', 'true');
```

### 方法2: organizationIdを指定する

検索時に`organizationId`を指定することで、ChromaDB検索が実行されます。

```typescript
// organizationIdを指定して検索
const results = await findSimilarEntities(
  queryText,
  limit,
  organizationId  // ← これを指定
);
```

### 方法3: ChromaDBにデータを再保存

既存のエンティティ/リレーション/トピックの埋め込みベクトルをChromaDBに再保存します。

```typescript
// すべてのエンティティを取得
const entities = await getAllEntities(organizationId);

// 各エンティティの埋め込みベクトルをChromaDBに保存
for (const entity of entities) {
  await saveEntityEmbeddingToChroma(
    entity.id,
    organizationId,
    entity
  );
}
```

**重要**: SQLiteフォールバックはありません。ChromaDBを有効化する必要があります。

## 実際のコード修正案

### 修正1: SQLiteフォールバック時の検索方法を変更

`lib/entityEmbeddings.ts`の`findSimilarEntities`関数を修正：

```typescript
// SQLiteで検索
try {
  // クエリの埋め込みを生成
  const queryEmbedding = await generateEmbedding(queryText);

  // 方法1: entityEmbeddingsテーブルから検索（既存の方法）
  let conditions: any = {};
  if (organizationId) {
    conditions.organizationId = organizationId;
  }

  const result = await callTauriCommand('query_get', {
    collectionName: 'entityEmbeddings',
    conditions,
  });

  const items = (result || []) as Array<{id: string; data: any}>;
  
  // データがない場合、entitiesテーブルから検索を試みる
  if (items.length === 0) {
    console.warn('entityEmbeddingsテーブルにデータがありません。entitiesテーブルから検索を試みます');
    
    // entitiesテーブルから全データを取得
    const entitiesResult = await callTauriCommand('query_get', {
      collectionName: 'entities',  // ← topicRelationsではなくentities
      conditions: organizationId ? { organizationId } : {},
    });
    
    const entities = (entitiesResult || []) as Array<{id: string; data: any}>;
    
    // 各エンティティの埋め込みベクトルを取得または生成
    for (const entityItem of entities) {
      const entity = entityItem.data;
      
      // 埋め込みベクトルを取得
      const embedding = await getEntityEmbedding(entity.id || entityItem.id);
      
      if (embedding && embedding.combinedEmbedding) {
        const similarity = cosineSimilarity(queryEmbedding, embedding.combinedEmbedding);
        similarities.push({
          entityId: entity.id || entityItem.id,
          similarity,
        });
      }
    }
    
    // 類似度でソートして上位を返す
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
  
  // 既存の処理（entityEmbeddingsテーブルにデータがある場合）
  // ...
}
```

## 確認方法

### 1. ブラウザの開発者ツール（F12）でコンソールを確認

以下のログが表示されているか確認：

```
⚠️ organizationIdが指定されていないため、SQLiteで検索します
```

### 2. SQLiteのデータを確認

```typescript
// ブラウザの開発者ツール（F12）で実行
const entities = await callTauriCommand('query_get', {
  collectionName: 'entities',
  conditions: {},
});
console.log('entitiesテーブルのデータ数:', entities.length);

const embeddings = await callTauriCommand('query_get', {
  collectionName: 'entityEmbeddings',
  conditions: {},
});
console.log('entityEmbeddingsテーブルのデータ数:', embeddings.length);
```

### 3. ChromaDBのデータを確認

```typescript
// ChromaDBにデータが保存されているか確認
// （これはRust側で実装する必要があります）
```

## まとめ

検索結果が0件になる原因：

1. **ChromaDBが無効**な場合、検索結果は常に0件（SQLiteフォールバックなし）
2. **organizationIdがundefined**の場合、ChromaDB検索がスキップされ、検索結果は0件
3. **ChromaDBにデータがない**場合、検索結果は0件
4. **埋め込みベクトルはChromaDBにのみ保存**されるため、SQLiteフォールバックはありません

解決方法：

1. **ChromaDBを有効化する**（必須）
2. **organizationIdを指定**して検索する
3. **ChromaDBにデータを再保存**する（既存データがある場合）
4. **エンティティ/リレーション/トピックを作成し直す**（ChromaDBに埋め込みベクトルが保存される）

**重要な注意事項**: 
- SQLiteフォールバックはありません
- ChromaDBを有効化する必要があります
- トピック検索も同様に、ChromaDBを有効化する必要があります

## 関連ドキュメント

- [埋め込みベクトルの保存場所](../database/EMBEDDING_STORAGE_LOCATIONS.md) - データの保存場所の詳細
- [検索時のデータベース参照フロー](./SEARCH_DATABASE_FLOW.md) - 検索フローの詳細
- [RAG検索トラブルシューティングガイド](./RAG_SEARCH_TROUBLESHOOTING.md) - トラブルシューティングの詳細
