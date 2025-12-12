# ChromaDB検索の条件と動作

## 概要

ChromaDBは**正常に動作します**が、検索対象によって`organizationId`の有無が異なります。

## ChromaDBで検索できる条件

### ✅ エンティティ・リレーション・トピック検索

**条件**: `organizationId`が**指定されている**場合

```typescript
// ✅ ChromaDBで検索される
findSimilarEntities('トヨタ', 5, 'org-123');  // organizationId指定

// ❌ SQLiteにフォールバック
findSimilarEntities('トヨタ', 5);  // organizationId未指定
```

**理由**: 
- ChromaDBのコレクションは組織ごとに分かれています
- `entities_{organizationId}`, `relations_{organizationId}`, `topics_{organizationId}`という形式
- `organizationId`がないと、どのコレクションを検索すべきか分からないため

### ✅ システム設計ドキュメント検索

**条件**: `organizationId`は**不要**（組織に依存しない）

```typescript
// ✅ ChromaDBで検索される（organizationId不要）
searchDesignDocs('データベース設計', 5);
```

**理由**:
- システム設計ドキュメントは`design_docs`という単一のコレクションに保存
- 組織に依存しないため、`organizationId`は不要

## 検索フローの詳細

### エンティティ検索のフロー

**重要**: ChromaDBは常に有効です（`shouldUseChroma()`は常に`true`を返します）。

```
1. findSimilarEntities(queryText, limit, organizationId) が呼ばれる
   ↓
2. organizationId をチェック
   ├─ ✅ organizationIdが指定されている → ChromaDBで検索
   │   ├─ 成功 → 結果を返す
   │   └─ 失敗 or 空の結果 → 空の結果を返す（フォールバックなし）
   └─ ❌ organizationIdが未指定 → 空の結果を返す
   ↓
3. 結果を返す
```

**注意**: 
- ChromaDBは常に有効ですが、`organizationId`が指定されていない場合は検索できません
- 埋め込みデータはChromaDBにのみ保存されるため、SQLiteへのフォールバックはありません

### システム設計ドキュメント検索のフロー

```
1. searchDesignDocs(queryText, limit) が呼ばれる
   ↓
2. ChromaDBで検索（organizationId不要）
   ├─ 成功 → 結果を返す
   └─ 失敗 → 空の結果を返す（フォールバックなし）
```

## 実際の使用例

### 例1: 組織ページからの検索（✅ ChromaDB使用）

```typescript
// /organization/[id] ページから
const organizationId = 'org-123';
const results = await findSimilarEntities('トヨタ', 5, organizationId);
// → ChromaDBの entities_org-123 コレクションから検索
```

### 例2: RAG検索ページからの検索（✅ ChromaDB使用）

```typescript
// /rag-search ページで組織を選択
const results = await searchKnowledgeGraph('トヨタ', 10, {
  organizationId: 'org-123'  // 組織を選択
});
// → ChromaDBで検索
```

### 例3: システム設計ページからの検索（✅ ChromaDB使用）

```typescript
// /design ページから
const results = await searchDesignDocs('データベース設計', 5);
// → ChromaDBの design_docs コレクションから検索
// organizationId不要
```

### 例4: organizationId未指定（❌ SQLiteにフォールバック）

```typescript
// organizationIdが取得できない場合
const results = await findSimilarEntities('トヨタ', 5);
// → SQLiteで検索（フォールバック）
```

## パフォーマンス比較

| 検索方法 | 速度 | スケーラビリティ | 使用条件 |
|---------|------|----------------|---------|
| **ChromaDB** | ⚡ 高速 | ✅ 大規模データ対応 | `organizationId`指定（エンティティ等）<br>または不要（設計ドキュメント） |
| **SQLite** | 🐢 やや遅い | ⚠️ 小規模データ向け | `organizationId`未指定時<br>またはChromaDB失敗時 |

## まとめ

- **ChromaDBは正常に動作します**
- **エンティティ・リレーション・トピック**: `organizationId`が**必須**
- **システム設計ドキュメント**: `organizationId`は**不要**
- **フォールバック**: `organizationId`未指定時は自動的にSQLiteにフォールバック

## よくある質問

### Q: ChromaDBで検索できないの？

**A**: 検索できます。ただし、エンティティ・リレーション・トピックの場合は`organizationId`が必要です。

### Q: なぜorganizationIdが必要なの？

**A**: ChromaDBのコレクションが組織ごとに分かれているためです。これにより：
- 検索範囲を限定できる（パフォーマンス向上）
- 組織間のデータを分離できる（セキュリティ）

### Q: organizationIdがない場合はどうなるの？

**A**: 自動的にSQLiteにフォールバックします。検索は実行されますが、パフォーマンスは劣ります。

### Q: システム設計ドキュメントはなぜorganizationId不要？

**A**: システム設計ドキュメントは組織に依存しない共通の情報のため、単一のコレクション（`design_docs`）に保存されています。
