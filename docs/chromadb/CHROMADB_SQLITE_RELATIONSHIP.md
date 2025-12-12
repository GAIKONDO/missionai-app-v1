# ChromaDBとSQLiteの関係 - 詳しい説明

## 重要なポイント

**ChromaDBで検索はできます**が、ChromaDBには**ベクトルデータ（埋め込み）しか保存されていません**。詳細情報（エンティティ名、リレーションタイプ、トピック内容など）は**SQLiteに保存**されています。

## データの保存場所

### ChromaDBに保存されるもの

**ベクトルデータ（埋め込み）のみ**

```rust
// ChromaDBに保存されるデータ構造
{
  id: "entity-123",                    // エンティティID（SQLiteと同じ）
  embedding: [0.123, 0.456, ...],      // 1536次元のベクトルデータ
  metadata: {
    entityId: "entity-123",            // SQLite参照用のID
    organizationId: "org-123"
  }
}
```

**保存されるもの**:
- ✅ 埋め込みベクトル（1536次元の数値配列）
- ✅ ID（SQLiteのIDと同じ値）
- ✅ 最小限のメタデータ（ID参照用）

**保存されないもの**:
- ❌ エンティティ名
- ❌ エンティティタイプ
- ❌ エイリアス
- ❌ メタデータの詳細情報

### SQLiteに保存されるもの

**基本情報（詳細データ）**

```sql
-- SQLiteのentitiesテーブル
CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  name TEXT,                    -- エンティティ名
  type TEXT,                     -- エンティティタイプ
  aliases TEXT,                  -- エイリアス（JSON）
  metadata TEXT,                  -- メタデータ（JSON）
  createdAt TEXT,
  updatedAt TEXT,
  organizationId TEXT
);
```

**保存されるもの**:
- ✅ エンティティ名、リレーションタイプ、トピック内容
- ✅ エイリアス、メタデータ
- ✅ 作成日時、更新日時
- ✅ 組織ID

## 検索フローの詳細

### ステップ1: ChromaDBでベクトル類似度検索

```typescript
// 1. クエリテキストから埋め込みベクトルを生成
const queryEmbedding = await generateEmbedding('トヨタ');

// 2. ChromaDBで類似度検索
const results = await callTauriCommand('chromadb_find_similar_entities', {
  queryEmbedding,  // [0.123, 0.456, ...] (1536次元)
  limit: 5,
  organizationId: 'org-123'
});

// 3. ChromaDBから返される結果
// [
//   ['entity-123', 0.85],  // [ID, 類似度]
//   ['entity-456', 0.82],
//   ...
// ]
```

**ChromaDBの役割**:
- ベクトル類似度検索（高速）
- IDと類似度を返す

### ステップ2: SQLiteから詳細情報を取得

```typescript
// 4. ChromaDBで取得したIDを使ってSQLiteから詳細情報を取得
for (const [entityId, similarity] of results) {
  const entity = await getEntityById(entityId);  // SQLiteから取得
  
  // entityには以下の情報が含まれる：
  // {
  //   id: 'entity-123',
  //   name: 'トヨタ自動車',
  //   type: '企業',
  //   aliases: ['Toyota', 'トヨタ'],
  //   metadata: {...},
  //   ...
  // }
}
```

**SQLiteの役割**:
- IDを使って詳細情報を取得
- エンティティ名、タイプ、メタデータなどを返す

### ステップ3: 結果を統合

```typescript
// 5. ベクトル類似度と詳細情報を統合
const finalResults = results.map(([entityId, similarity]) => ({
  entityId,
  similarity,        // ChromaDBから取得
  entity: entity,   // SQLiteから取得
  score: similarity  // スコアリング
}));
```

## 実際のコードフロー

### `lib/knowledgeGraphRAG.ts`の`searchKnowledgeGraph`関数

```typescript
// 1. ChromaDBで検索（IDと類似度を取得）
const entityResults = await findSimilarEntitiesHybrid(
  queryText,
  limit,
  { organizationId: filters?.organizationId }
);
// 結果: [{ entityId: 'entity-123', similarity: 0.85, score: 0.85 }]

// 2. SQLiteから詳細情報を取得
for (const result of entityResults) {
  const entity = await getEntityById(result.entityId);  // SQLiteから取得
  // entity: { id: 'entity-123', name: 'トヨタ自動車', type: '企業', ... }
  
  // 3. 結果を統合
  results.push({
    type: 'entity',
    id: result.entityId,
    score: result.score,
    similarity: result.similarity,
    entity,  // SQLiteから取得した詳細情報
  });
}
```

## なぜこの設計なのか？

### 1. パフォーマンスの最適化

- **ChromaDB**: ベクトル類似度検索に特化（HNSWインデックスで高速）
- **SQLite**: 詳細情報の保存に特化（リレーショナルデータベース）

### 2. データの分離

- **ChromaDB**: 検索用インデックス（ベクトルデータのみ）
- **SQLite**: マスターデータ（基本情報）

### 3. スケーラビリティ

- **ChromaDB**: 大規模なベクトル検索に最適化
- **SQLite**: 小規模な詳細情報の取得に最適化

## フォールバックの仕組み

### ChromaDBが使用できない場合

**重要**: ChromaDBは常に有効です（`shouldUseChroma()`は常に`true`を返します）。

```typescript
// organizationIdが指定されている場合のみChromaDBを使用
if (organizationId) {
  // ChromaDBで検索
} else {
  // organizationIdが未指定の場合は検索不可
  // エンティティ・リレーション・トピック検索にはorganizationIdが必要
}
```

**注意**: 
- ChromaDBは常に有効ですが、`organizationId`が指定されていない場合は検索できません
- 埋め込みデータはChromaDBにのみ保存されるため、SQLiteへのフォールバックはありません

## まとめ

### あなたの理解

> 「ChromaDBの中身は見れないから、それが保管されているSQLiteを参照してます」

**部分的に正しいですが、より正確には**:

1. **ChromaDBで検索はできます**（ベクトル類似度検索）
2. **ChromaDBにはベクトルデータしか保存されていません**
3. **詳細情報はSQLiteに保存されています**
4. **検索時は**:
   - ChromaDBでベクトル類似度検索 → IDと類似度を取得
   - SQLiteからIDを使って詳細情報を取得
   - 結果を統合して返す

### 図解

```
検索クエリ: "トヨタ"
    ↓
[ステップ1] ChromaDBでベクトル類似度検索
    ↓
    クエリの埋め込みベクトル: [0.123, 0.456, ...]
    ↓
    ChromaDBのentities_{orgId}コレクションから検索
    ↓
    結果: [
      { id: 'entity-123', similarity: 0.85 },
      { id: 'entity-456', similarity: 0.82 }
    ]
    ↓
[ステップ2] SQLiteから詳細情報を取得
    ↓
    getEntityById('entity-123') → SQLiteのentitiesテーブルから取得
    ↓
    結果: {
      id: 'entity-123',
      name: 'トヨタ自動車',
      type: '企業',
      aliases: ['Toyota', 'トヨタ'],
      ...
    }
    ↓
[ステップ3] 結果を統合
    ↓
    最終結果: {
      entityId: 'entity-123',
      similarity: 0.85,  // ChromaDBから
      entity: {          // SQLiteから
        name: 'トヨタ自動車',
        type: '企業',
        ...
      }
    }
```

## よくある質問

### Q: ChromaDBで検索できないの？

**A**: 検索できます。ただし、ChromaDBにはベクトルデータしかないので、詳細情報を取得するためにSQLiteを参照します。

### Q: なぜChromaDBに詳細情報を保存しないの？

**A**: 
- ChromaDBはベクトル検索に特化している
- 詳細情報はSQLiteに保存することで、データの整合性を保つ
- 二重保存を避けるため

### Q: SQLiteだけで検索できないの？

**A**: できます（フォールバック）。ただし、パフォーマンスは劣ります。ChromaDBのHNSWインデックスにより、大規模データでも高速に検索できます。

### Q: ChromaDBとSQLiteのデータは同期されているの？

**A**: はい。エンティティ/リレーション/トピックを作成・更新すると、両方に保存されます（ChromaDBにはベクトル、SQLiteには詳細情報）。
