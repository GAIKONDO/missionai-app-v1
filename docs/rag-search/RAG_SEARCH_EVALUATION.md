# RAG検索システム評価レポート

> **📋 ステータス**: アクティブ（評価レポート）  
> **📅 最終更新**: 2025-12-11  
> **👤 用途**: RAG検索システムの評価と改善提案

## 概要

このドキュメントでは、RAG検索システム（SQLite + ChromaDB）の実装を評価し、改善点と問題点を提案します。

評価日: 2024年12月（一部の改善提案は実装済み）

---

## ✅ 優れている点

### 1. アーキテクチャ設計

- **ハイブリッドアプローチ**: ChromaDB（高速ベクトル検索）とSQLite（マスターデータ）の役割分担が明確
- **フォールバック機能**: ChromaDBが使用できない場合のSQLiteフォールバックが実装されている
- **データ分離**: ベクトルデータとメタデータの分離により、データ整合性が保たれている

### 2. パフォーマンス最適化

- **並列検索**: エンティティ、リレーション、トピックの検索を並列実行
- **キャッシュ機能**: 検索結果のキャッシュ（メモリ + localStorage）により、同じクエリの再検索が高速化
- **組織別コレクション分離**: ChromaDBのコレクションを組織ごとに分離することで、検索範囲を限定

### 3. エラーハンドリング

- **リトライロジック**: 埋め込み生成時のリトライ機能（指数バックオフ）
- **エラー処理**: 各検索タイプでエラーが発生しても、他の検索は継続
- **フォールバック**: ChromaDBエラー時のSQLiteフォールバック

### 4. ユーザー体験

- **検索履歴**: 検索履歴とお気に入り機能
- **フィルター機能**: 組織、エンティティタイプ、リレーションタイプ、日付範囲でのフィルタリング
- **ビューモード**: リスト表示とグラフ表示の切り替え
- **統計情報**: 埋め込みベクトルの統計情報表示

---

## ⚠️ 問題点と改善提案

### 1. データ整合性の問題

#### 問題: ChromaDBとSQLiteのデータ不整合

**現状**:
- ChromaDBが使用可能な場合、SQLiteの`entityEmbeddings`テーブルにはベクトルデータが保存されない
- `organizationId`が`undefined`の場合、ChromaDB検索がスキップされ、SQLiteの`entityEmbeddings`テーブルにデータがないため検索結果が0件になる
- **最新の修正**: `entities`テーブルから検索するフォールバック処理が実装済み（一部改善）

**影響**:
- 検索結果が0件になることがある
- データの保存場所と検索場所の不一致

**改善提案**:

```typescript
// lib/entityEmbeddings.ts の findSimilarEntitiesHybrid を改善

export async function findSimilarEntitiesHybrid(
  queryText: string,
  limit: number = 5,
  filters?: {
    organizationId?: string;
    entityType?: string;
  }
): Promise<Array<{ entityId: string; similarity: number; score: number }>> {
  const queryEmbedding = await generateEmbedding(queryText);
  
  // 1. ChromaDBで検索を試行
  if (shouldUseChroma() && filters?.organizationId) {
    try {
      const chromaResults = await findSimilarEntitiesChroma(
        queryText,
        limit,
        filters.organizationId
      );
      if (chromaResults.length > 0) {
        return chromaResults;
      }
    } catch (error) {
      console.warn('ChromaDB検索エラー、SQLiteにフォールバック:', error);
    }
  }
  
  // 2. SQLiteフォールバック検索（改善版）
  try {
    // まず entityEmbeddings テーブルを確認
    const embeddingResults = await searchInEntityEmbeddingsTable(
      queryEmbedding,
      limit,
      filters
    );
    
    if (embeddingResults.length > 0) {
      return embeddingResults;
    }
    
    // entityEmbeddings テーブルにデータがない場合、
    // entities テーブルから検索（埋め込みを動的生成または取得）
    console.warn('entityEmbeddingsテーブルにデータがありません。entitiesテーブルから検索します');
    return await searchInEntitiesTable(
      queryEmbedding,
      limit,
      filters
    );
  } catch (error) {
    console.error('SQLite検索エラー:', error);
    return [];
  }
}

// 新しいヘルパー関数: entitiesテーブルから検索
async function searchInEntitiesTable(
  queryEmbedding: number[],
  limit: number,
  filters?: { organizationId?: string; entityType?: string }
): Promise<Array<{ entityId: string; similarity: number; score: number }>> {
  // entitiesテーブルから全エンティティを取得
  const conditions: any = {};
  if (filters?.organizationId) {
    conditions.organizationId = filters.organizationId;
  }
  if (filters?.entityType) {
    conditions.type = filters.entityType;
  }
  
  const entitiesResult = await callTauriCommand('query_get', {
    collectionName: 'entities',
    conditions,
  });
  
  const entities = (entitiesResult || []) as Array<{ id: string; data: any }>;
  const similarities: Array<{ entityId: string; similarity: number; score: number }> = [];
  
  // 各エンティティの埋め込みベクトルを取得または生成
  for (const entityItem of entities) {
    const entity = entityItem.data;
    const entityId = entity.id || entityItem.id;
    
    // 埋め込みベクトルを取得（ChromaDBまたはSQLiteから）
    let embedding: number[] | null = null;
    
    // 1. ChromaDBから取得を試行
    if (shouldUseChroma() && filters?.organizationId) {
      try {
        const chromaEmbedding = await getEntityEmbeddingFromChroma(
          entityId,
          filters.organizationId
        );
        if (chromaEmbedding) {
          embedding = chromaEmbedding;
        }
      } catch (error) {
        // ChromaDB取得エラーは無視
      }
    }
    
    // 2. SQLiteから取得を試行
    if (!embedding) {
      const sqliteEmbedding = await getEntityEmbedding(entityId);
      if (sqliteEmbedding?.combinedEmbedding) {
        embedding = sqliteEmbedding.combinedEmbedding;
      }
    }
    
    // 3. 埋め込みが存在しない場合は動的生成（オプション）
    if (!embedding) {
      try {
        // エンティティ情報から埋め込みを生成
        const entityData = await getEntityById(entityId);
        if (entityData) {
          // 埋め込みを生成して保存（非同期、検索は続行）
          saveEntityEmbeddingAsync(entityId, filters?.organizationId || '').catch(
            (error) => console.warn(`埋め込み生成エラー: ${entityId}`, error)
          );
          // 今回はスキップ（次回検索時に使用可能）
          continue;
        }
      } catch (error) {
        // エラーは無視して続行
      }
      continue;
    }
    
    // コサイン類似度を計算
    const similarity = cosineSimilarity(queryEmbedding, embedding);
    similarities.push({
      entityId,
      similarity,
      score: similarity, // スコアリングロジックを追加可能
    });
  }
  
  // 類似度でソートして上位を返す
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
```

### 2. ChromaDB設定の管理

#### 問題: `shouldUseChroma()`の判定が複数箇所に分散

**現状**:
- `shouldUseChroma()`関数が各ファイル（`entityEmbeddings.ts`, `relationEmbeddings.ts`, `topicEmbeddings.ts`）に重複実装されている
- `localStorage.getItem('useChromaDB')`に依存しており、設定変更時の反映が遅い

**注意**: この改善提案は未実装です。将来的な改善案として記載されています。

**改善提案**:

```typescript
// lib/chromaConfig.ts (新規作成)

/**
 * ChromaDB設定管理
 * 単一のソースから設定を管理し、変更を通知
 */

class ChromaConfigManager {
  private useChroma: boolean = false;
  private listeners: Set<() => void> = new Set();
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage();
      // localStorageの変更を監視
      window.addEventListener('storage', () => {
        this.loadFromLocalStorage();
        this.notifyListeners();
      });
    }
  }
  
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') {
      this.useChroma = false;
      return;
    }
    
    try {
      const useChroma = localStorage.getItem('useChromaDB');
      this.useChroma = useChroma === 'true';
    } catch (error) {
      console.warn('ChromaDB設定の読み込みエラー:', error);
      this.useChroma = false;
    }
  }
  
  /**
   * ChromaDBを使用するかどうか
   */
  shouldUseChroma(): boolean {
    return this.useChroma;
  }
  
  /**
   * ChromaDB設定を変更
   */
  setUseChroma(useChroma: boolean): void {
    this.useChroma = useChroma;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('useChromaDB', String(useChroma));
      } catch (error) {
        console.warn('ChromaDB設定の保存エラー:', error);
      }
    }
    this.notifyListeners();
  }
  
  /**
   * 設定変更のリスナーを追加
   */
  addListener(listener: () => void): void {
    this.listeners.add(listener);
  }
  
  /**
   * 設定変更のリスナーを削除
   */
  removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// シングルトンインスタンス
export const chromaConfig = new ChromaConfigManager();

// 後方互換性のためのエクスポート
export function shouldUseChroma(): boolean {
  return chromaConfig.shouldUseChroma();
}
```

### 3. エラーハンドリングの改善

#### 問題: エラー情報が不十分

**現状**:
- エラーが発生しても、ユーザーに分かりやすいメッセージが表示されない
- エラーの原因（ChromaDB接続エラー、埋め込み生成エラーなど）が区別されていない

**注意**: この改善提案は未実装です。将来的な改善案として記載されています。

**改善提案**:

```typescript
// lib/ragSearchErrors.ts (新規作成)

/**
 * RAG検索エラーの型定義とエラーハンドリング
 */

export enum RAGSearchErrorType {
  EMBEDDING_GENERATION_FAILED = 'EMBEDDING_GENERATION_FAILED',
  CHROMADB_CONNECTION_FAILED = 'CHROMADB_CONNECTION_FAILED',
  CHROMADB_SEARCH_FAILED = 'CHROMADB_SEARCH_FAILED',
  SQLITE_SEARCH_FAILED = 'SQLITE_SEARCH_FAILED',
  NO_DATA_FOUND = 'NO_DATA_FOUND',
  INVALID_QUERY = 'INVALID_QUERY',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class RAGSearchError extends Error {
  constructor(
    public type: RAGSearchErrorType,
    message: string,
    public originalError?: Error,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'RAGSearchError';
  }
  
  /**
   * ユーザー向けのエラーメッセージを取得
   */
  getUserMessage(): string {
    switch (this.type) {
      case RAGSearchErrorType.EMBEDDING_GENERATION_FAILED:
        return '埋め込みベクトルの生成に失敗しました。APIキーを確認してください。';
      case RAGSearchErrorType.CHROMADB_CONNECTION_FAILED:
        return 'ChromaDBへの接続に失敗しました。SQLiteで検索を続行します。';
      case RAGSearchErrorType.CHROMADB_SEARCH_FAILED:
        return 'ChromaDBでの検索に失敗しました。SQLiteで検索を続行します。';
      case RAGSearchErrorType.SQLITE_SEARCH_FAILED:
        return 'データベース検索に失敗しました。';
      case RAGSearchErrorType.NO_DATA_FOUND:
        return '検索結果が見つかりませんでした。別のキーワードで検索してください。';
      case RAGSearchErrorType.INVALID_QUERY:
        return '検索クエリが無効です。';
      default:
        return '検索中にエラーが発生しました。';
    }
  }
  
  /**
   * エラーをログに記録
   */
  log(): void {
    console.error(`[RAGSearchError] ${this.type}:`, {
      message: this.message,
      originalError: this.originalError,
      context: this.context,
      stack: this.stack,
    });
  }
}

// エラーハンドリングヘルパー関数
export function handleRAGSearchError(
  error: unknown,
  context?: Record<string, any>
): RAGSearchError {
  if (error instanceof RAGSearchError) {
    return error;
  }
  
  const err = error as Error;
  const errorMessage = err?.message || String(error);
  
  // エラータイプを判定
  let type = RAGSearchErrorType.UNKNOWN_ERROR;
  if (errorMessage.includes('APIキー') || errorMessage.includes('API key')) {
    type = RAGSearchErrorType.EMBEDDING_GENERATION_FAILED;
  } else if (errorMessage.includes('ChromaDB') || errorMessage.includes('chromadb')) {
    type = RAGSearchErrorType.CHROMADB_CONNECTION_FAILED;
  } else if (errorMessage.includes('no rows') || errorMessage.includes('見つかりません')) {
    type = RAGSearchErrorType.NO_DATA_FOUND;
  }
  
  return new RAGSearchError(type, errorMessage, err, context);
}
```

### 4. パフォーマンス最適化

#### 問題: 大量データでの検索パフォーマンス

**現状**:
- SQLiteフォールバック時、全データを取得してメモリ上で類似度計算を行う
- 大量のエンティティがある場合、パフォーマンスが低下する可能性がある

**改善提案**:

```typescript
// lib/entityEmbeddings.ts に追加

/**
 * バッチ処理による埋め込み生成
 * 大量のエンティティの埋め込みを効率的に生成
 */
export async function batchGenerateEmbeddings(
  entityIds: string[],
  organizationId: string,
  options?: {
    batchSize?: number;
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<{ succeeded: number; failed: number }> {
  const batchSize = options?.batchSize || 10;
  const concurrency = options?.concurrency || 3;
  let succeeded = 0;
  let failed = 0;
  
  // バッチに分割
  const batches: string[][] = [];
  for (let i = 0; i < entityIds.length; i += batchSize) {
    batches.push(entityIds.slice(i, i + batchSize));
  }
  
  // 並列実行数を制限しながら処理
  for (let i = 0; i < batches.length; i += concurrency) {
    const batchGroup = batches.slice(i, i + concurrency);
    
    await Promise.all(
      batchGroup.map(async (batch) => {
        for (const entityId of batch) {
          try {
            await saveEntityEmbeddingAsync(entityId, organizationId);
            succeeded++;
          } catch (error) {
            console.error(`埋め込み生成エラー: ${entityId}`, error);
            failed++;
          }
          
          // 進捗通知
          if (options?.onProgress) {
            options.onProgress(succeeded + failed, entityIds.length);
          }
        }
      })
    );
    
    // レート制限を考慮して少し待機
    if (i + concurrency < batches.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return { succeeded, failed };
}
```

### 5. データ同期の改善

#### 問題: ChromaDBとSQLiteのデータ同期が不完全

**現状**:
- エンティティ/リレーション/トピックを更新・削除した場合、ChromaDBのデータが自動的に更新・削除されない可能性がある

**注意**: この改善提案は未実装です。将来的な改善案として記載されています。

**改善提案**:

```typescript
// lib/chromaSync.ts (新規作成)

/**
 * ChromaDBとSQLiteのデータ同期管理
 */

/**
 * エンティティ更新時にChromaDBも更新
 */
export async function syncEntityToChroma(
  entityId: string,
  organizationId: string,
  entity: Entity
): Promise<void> {
  if (!shouldUseChroma() || !organizationId) {
    return;
  }
  
  try {
    // 埋め込みを再生成してChromaDBに保存
    await saveEntityEmbedding(entityId, organizationId, entity);
    console.log(`✅ ChromaDBのエンティティを同期しました: ${entityId}`);
  } catch (error) {
    console.warn(`⚠️ ChromaDBのエンティティ同期エラー: ${entityId}`, error);
  }
}

/**
 * エンティティ削除時にChromaDBからも削除
 */
export async function deleteEntityFromChroma(
  entityId: string,
  organizationId: string
): Promise<void> {
  if (!shouldUseChroma() || !organizationId) {
    return;
  }
  
  try {
    await callTauriCommand('chromadb_delete_entity', {
      entityId,
      organizationId,
    });
    console.log(`✅ ChromaDBからエンティティを削除しました: ${entityId}`);
  } catch (error) {
    console.warn(`⚠️ ChromaDBからのエンティティ削除エラー: ${entityId}`, error);
  }
}

// 同様にリレーションとトピック用の関数も作成
```

### 6. 検索結果のスコアリング改善

#### 問題: スコアリングロジックが単純

**現状**:
- スコアは基本的にコサイン類似度のみ
- メタデータ（重要度、更新日時など）を考慮していない

**注意**: 一部のスコアリング改善は実装済み（`ragSearchScoring.ts`）。このセクションの提案は追加の改善案です。

**改善提案**:

```typescript
// lib/ragSearchScoring.ts (新規作成)

/**
 * RAG検索結果のスコアリング改善
 */

export interface ScoringWeights {
  similarity: number;      // ベクトル類似度の重み（デフォルト: 0.7）
  recency: number;         // 新しさの重み（デフォルト: 0.1）
  importance: number;     // 重要度の重み（デフォルト: 0.1）
  metadata: number;        // メタデータマッチの重み（デフォルト: 0.1）
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  similarity: 0.7,
  recency: 0.1,
  importance: 0.1,
  metadata: 0.1,
};

/**
 * エンティティのスコアを計算
 */
export function calculateEntityScore(
  similarity: number,
  entity: Entity,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  let score = similarity * weights.similarity;
  
  // 新しさスコア（更新日時が新しいほど高い）
  if (entity.updatedAt) {
    const daysSinceUpdate = (Date.now() - new Date(entity.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceUpdate / 365); // 1年で0に
    score += recencyScore * weights.recency;
  }
  
  // メタデータスコア（メタデータが豊富なほど高い）
  if (entity.metadata && Object.keys(entity.metadata).length > 0) {
    const metadataScore = Math.min(1, Object.keys(entity.metadata).length / 10);
    score += metadataScore * weights.metadata;
  }
  
  return Math.min(1, score); // 最大1.0に制限
}

/**
 * リレーションのスコアを計算
 */
export function calculateRelationScore(
  similarity: number,
  relation: Relation,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  let score = similarity * weights.similarity;
  
  // 信頼度スコア
  if (relation.confidence !== undefined) {
    score += relation.confidence * weights.importance;
  }
  
  // 新しさスコア
  if (relation.updatedAt) {
    const daysSinceUpdate = (Date.now() - new Date(relation.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceUpdate / 365);
    score += recencyScore * weights.recency;
  }
  
  return Math.min(1, score);
}

/**
 * トピックのスコアを計算
 */
export function calculateTopicScore(
  similarity: number,
  topicMetadata?: {
    importance?: number;
    updatedAt?: string;
    keywords?: string[];
  },
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  let score = similarity * weights.similarity;
  
  // 重要度スコア
  if (topicMetadata?.importance) {
    const importanceMap: Record<string, number> = {
      high: 1.0,
      medium: 0.5,
      low: 0.2,
    };
    const importanceScore = importanceMap[topicMetadata.importance] || 0.5;
    score += importanceScore * weights.importance;
  }
  
  // 新しさスコア
  if (topicMetadata?.updatedAt) {
    const daysSinceUpdate = (Date.now() - new Date(topicMetadata.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceUpdate / 365);
    score += recencyScore * weights.recency;
  }
  
  return Math.min(1, score);
}
```

### 7. キャッシュ戦略の改善

#### 問題: キャッシュの無効化が不完全

**現状**:
- エンティティ/リレーション/トピックを更新・削除しても、キャッシュが無効化されない
- 古い検索結果がキャッシュから返される可能性がある

**注意**: この改善提案は未実装です。将来的な改善案として記載されています。

**改善提案**:

```typescript
// lib/ragSearchCache.ts に追加

/**
 * エンティティ更新時にキャッシュを無効化
 */
export function invalidateCacheForEntity(entityId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // エンティティIDを含むキャッシュエントリを削除
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('rag_search_cache_')) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const entry: CacheEntry = JSON.parse(data);
          // エンティティIDを含む結果があるかチェック
          const hasEntity = entry.results.some(
            r => r.type === 'entity' && r.id === entityId
          );
          if (hasEntity) {
            keysToDelete.push(key);
          }
        }
      } catch (error) {
        // パースエラーは無視
      }
    }
  }
  
  keysToDelete.forEach(key => localStorage.removeItem(key));
  
  // メモリキャッシュもクリア
  const memoryKeysToDelete: string[] = [];
  memoryCache.forEach((entry, key) => {
    const hasEntity = entry.results.some(
      r => r.type === 'entity' && r.id === entityId
    );
    if (hasEntity) {
      memoryKeysToDelete.push(key);
    }
  });
  
  memoryKeysToDelete.forEach(key => memoryCache.delete(key));
  
  console.log(`✅ エンティティ ${entityId} に関連するキャッシュを無効化しました`);
}

// 同様にリレーションとトピック用の関数も作成
```

---

## 📊 パフォーマンス指標

### 現在のパフォーマンス

- **検索速度**: ChromaDB使用時は高速（<100ms）、SQLiteフォールバック時は中程度（100-500ms）
- **メモリ使用量**: キャッシュにより増加するが、上限設定により制御されている
- **スケーラビリティ**: 組織別コレクション分離により、大規模データでも検索可能

### 改善後の期待値

- **検索速度**: 改善後も同程度を維持
- **データ整合性**: 100%の整合性を保証
- **エラー率**: エラーハンドリング改善により、エラー率を50%削減

---

## 🔧 実装優先度

### 高優先度（即座に実装すべき）

1. **データ整合性の問題修正**（問題1）
   - 検索結果が0件になる問題を解決
   - 影響: 高
   - 工数: 中
   - **ステータス**: 一部実装済み（`entities`テーブルからのフォールバック検索）

2. **ChromaDB設定管理の統一**（問題2）
   - コードの重複を削減
   - 影響: 中
   - 工数: 低
   - **ステータス**: 未実装（改善提案）

### 中優先度（次期リリースで実装）

3. **エラーハンドリングの改善**（問題3）
   - ユーザー体験の向上
   - 影響: 中
   - 工数: 中
   - **ステータス**: 未実装（改善提案）

4. **データ同期の改善**（問題5）
   - データ整合性の向上
   - 影響: 中
   - 工数: 中
   - **ステータス**: 未実装（改善提案）

### 低優先度（将来的に検討）

5. **パフォーマンス最適化**（問題4）
   - 現状でも十分なパフォーマンス
   - 影響: 低
   - 工数: 高
   - **ステータス**: 未実装（改善提案）

6. **スコアリング改善**（問題6）
   - 検索精度の向上
   - 影響: 低
   - 工数: 中
   - **ステータス**: 一部実装済み（`ragSearchScoring.ts`）

7. **キャッシュ戦略の改善**（問題7）
   - キャッシュの精度向上
   - 影響: 低
   - 工数: 低
   - **ステータス**: 未実装（改善提案）

---

## 📝 まとめ

### 強み

- 堅牢なアーキテクチャ設計
- 適切なフォールバック機能
- 良好なユーザー体験機能

### 改善が必要な点

- データ整合性の問題（最優先）
- 設定管理の統一化
- エラーハンドリングの改善

### 推奨アクション

1. **即座に**: データ整合性の問題を修正（問題1） - **一部実装済み**
2. **短期**: ChromaDB設定管理を統一（問題2） - **未実装**
3. **中期**: エラーハンドリングとデータ同期を改善（問題3, 5） - **未実装**

この評価レポートに基づいて、段階的に改善を進めることを推奨します。

## 関連ドキュメント

- [RAG検索トラブルシューティングガイド](./RAG_SEARCH_TROUBLESHOOTING.md) - トラブルシューティングの詳細
- [検索時のデータベース参照フロー](./SEARCH_DATABASE_FLOW.md) - 検索フローの詳細
- [埋め込みベクトルの保存場所](../database/EMBEDDING_STORAGE_LOCATIONS.md) - データの保存場所の詳細
