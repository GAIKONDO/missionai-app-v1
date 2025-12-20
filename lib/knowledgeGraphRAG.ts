/**
 * ナレッジグラフ統合RAG検索
 * エンティティ、リレーション、トピックを統合して検索する機能を提供
 */

import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { OrgNodeData } from '@/components/OrgChart';
import { findSimilarEntitiesChroma } from './entityEmbeddingsChroma';
import { findSimilarRelationsChroma } from './relationEmbeddingsChroma';
import { getEntitiesByIds } from './entityApi';
import { getRelationsByIds } from './relationApi';
import { normalizeSimilarity, calculateEntityScore, calculateRelationScore, adjustWeightsForQuery, DEFAULT_WEIGHTS } from './ragSearchScoring';

/**
 * 検索結果の種類
 */
export type SearchResultType = 'entity' | 'relation' | 'topic';

/**
 * トピックサマリー（RAG検索結果用）
 */
export interface TopicSummary {
  topicId: string;
  title: string;
  contentSummary?: string; // contentの要約（200文字程度）
  semanticCategory?: string;
  keywords?: string[];
  meetingNoteId?: string;
  organizationId?: string;
}

/**
 * 統合検索結果
 */
export interface KnowledgeGraphSearchResult {
  type: SearchResultType;
  id: string;
  score: number;
  similarity: number;
  // エンティティの場合
  entity?: Entity;
  // リレーションの場合
  relation?: Relation;
  // トピックの場合
  topicId?: string;
  meetingNoteId?: string;
  topic?: TopicSummary; // トピックの詳細情報（title, contentSummaryなど）
}

/**
 * ナレッジグラフ全体を検索
 * エンティティ、リレーション、トピックを統合して検索
 * 
 * 注意: 既存の検索アルゴリズムは削除されました。新しい実装が必要です。
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 各タイプごとの最大結果数（デフォルト: 10）
 * @param filters フィルタリング条件（オプション）
 * @returns 統合検索結果の配列
 */
export async function searchKnowledgeGraph(
    queryText: string,
    limit: number = 10,
    filters?: {
      organizationId?: string;
      entityType?: string;
      relationType?: string;
      topicSemanticCategory?: string;
      createdAfter?: string;
      createdBefore?: string;
      updatedAfter?: string;
      updatedBefore?: string;
      filterLogic?: 'AND' | 'OR';
    },
    useCache: boolean = true,
    timeoutMs: number = 10000
  ): Promise<KnowledgeGraphSearchResult[]> {
  console.log('[searchKnowledgeGraph] 検索開始:', { queryText, limit, filters });
  
  if (!queryText || !queryText.trim()) {
    console.warn('[searchKnowledgeGraph] クエリテキストが空です');
    return [];
  }

  try {
    // organizationIdが未指定の場合、Rust側で全組織横断検索が実行される
    // そのため、organizationIdが未指定でも検索を続行する

    // クエリに基づいて重みを調整
    const weights = adjustWeightsForQuery(queryText, DEFAULT_WEIGHTS);

    // 各タイプごとの検索数を計算（limitを3等分）
    const perTypeLimit = Math.max(1, Math.ceil(limit / 3));

    // 並列で各タイプを検索
    console.log('[searchKnowledgeGraph] 並列検索を開始:', { perTypeLimit, filters });
    
    const [entityResults, relationResults] = await Promise.all([
      // エンティティ検索
      searchEntities(queryText, perTypeLimit, filters, weights).catch(error => {
        console.error('[searchKnowledgeGraph] エンティティ検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      }),
      
      // リレーション検索
      searchRelations(queryText, perTypeLimit, filters, weights).catch(error => {
        console.error('[searchKnowledgeGraph] リレーション検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      }),
      
      // トピック検索（現時点では未実装）
      Promise.resolve([] as KnowledgeGraphSearchResult[])
    ]);
    
    console.log('[searchKnowledgeGraph] 並列検索完了:', {
      entityCount: entityResults.length,
      relationCount: relationResults.length,
    });

    // 結果を統合
    const allResults = [
      ...entityResults,
      ...relationResults,
      // ...topicResults (将来実装)
    ];

    console.log('[searchKnowledgeGraph] 検索結果:', {
      entityCount: entityResults.length,
      relationCount: relationResults.length,
      totalCount: allResults.length,
    });

    // スコアでソート
    allResults.sort((a, b) => b.score - a.score);

    // 上位N件を返す
    const finalResults = allResults.slice(0, limit);
    console.log('[searchKnowledgeGraph] 最終結果数:', finalResults.length);
    return finalResults;
  } catch (error) {
    console.error('[searchKnowledgeGraph] 検索エラー:', error);
    return [];
  }
}

/**
 * エンティティを検索
 */
async function searchEntities(
  queryText: string,
  limit: number,
  filters?: {
    organizationId?: string;
    entityType?: string;
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
  },
  weights = DEFAULT_WEIGHTS
): Promise<KnowledgeGraphSearchResult[]> {
  // organizationIdが未指定の場合、Rust側で全組織横断検索が実行される
  try {
    console.log('[searchEntities] 検索開始:', { queryText, limit, filters, weights });
    
    // ChromaDBで類似エンティティを検索
    const chromaResults = await findSimilarEntitiesChroma(
      queryText,
      limit * 2, // フィルタリングで減る可能性があるため多めに取得
      filters.organizationId
    );

    console.log('[searchEntities] ChromaDB検索結果:', chromaResults.length, '件');

    if (chromaResults.length === 0) {
      console.log('[searchEntities] ChromaDB検索結果が空のため、空の配列を返します');
      return [];
    }

    // エンティティIDを抽出
    const entityIds = chromaResults.map(r => r.entityId);

    // バッチでエンティティを取得（N+1問題を回避）
    const entities = await getEntitiesByIds(entityIds);

    // エンティティIDでマップを作成
    const entityMap = new Map(entities.map(e => [e.id, e]));

    // 結果を構築
    const results: KnowledgeGraphSearchResult[] = [];

    for (const { entityId, similarity } of chromaResults) {
      const entity = entityMap.get(entityId);
      if (!entity) continue;

      // フィルタリング
      if (filters.entityType && entity.type !== filters.entityType) {
        continue;
      }

      // 日付フィルタリング
      if (filters.createdAfter && entity.createdAt && entity.createdAt < filters.createdAfter) {
        continue;
      }
      if (filters.createdBefore && entity.createdAt && entity.createdAt > filters.createdBefore) {
        continue;
      }
      if (filters.updatedAfter && entity.updatedAt && entity.updatedAt < filters.updatedAfter) {
        continue;
      }
      if (filters.updatedBefore && entity.updatedAt && entity.updatedAt > filters.updatedBefore) {
        continue;
      }

      // 類似度を正規化
      const normalizedSimilarity = normalizeSimilarity(similarity);
      
      console.log('[searchEntities] 類似度処理:', {
        entityId,
        rawSimilarity: similarity,
        normalizedSimilarity,
        similarityType: typeof similarity,
      });

      // スコア計算
      const score = calculateEntityScore(
        normalizedSimilarity,
        entity,
        weights,
        filters,
        undefined, // searchCount（将来実装）
        queryText
      );

      console.log('[searchEntities] スコア計算結果:', {
        entityId,
        normalizedSimilarity,
        score,
        scoreType: typeof score,
        isNaN: isNaN(score),
        isFinite: isFinite(score),
      });

      results.push({
        type: 'entity',
        id: entityId,
        score: typeof score === 'number' && !isNaN(score) ? score : 0,
        similarity: normalizedSimilarity,
        entity,
      });
    }

    // スコアでソート
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  } catch (error) {
    console.error('[searchEntities] エンティティ検索エラー:', error);
    return [];
  }
}

/**
 * リレーションを検索
 */
async function searchRelations(
  queryText: string,
  limit: number,
  filters?: {
    organizationId?: string;
    relationType?: string;
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
  },
  weights = DEFAULT_WEIGHTS
): Promise<KnowledgeGraphSearchResult[]> {
  // organizationIdが未指定の場合、Rust側で全組織横断検索が実行される
  try {
    console.log('[searchRelations] 検索開始:', { queryText, limit, filters, weights });
    
    // ChromaDBで類似リレーションを検索
    const chromaResults = await findSimilarRelationsChroma(
      queryText,
      limit * 2, // フィルタリングで減る可能性があるため多めに取得
      filters.organizationId,
      filters.relationType
    );

    console.log('[searchRelations] ChromaDB検索結果:', chromaResults.length, '件');

    if (chromaResults.length === 0) {
      console.log('[searchRelations] ChromaDB検索結果が空のため、空の配列を返します');
      return [];
    }

    // リレーションIDを抽出
    const relationIds = chromaResults.map(r => r.relationId);

    // バッチでリレーションを取得（N+1問題を回避）
    const relations = await getRelationsByIds(relationIds);

    // リレーションIDでマップを作成
    const relationMap = new Map(relations.map(r => [r.id, r]));

    // 結果を構築
    const results: KnowledgeGraphSearchResult[] = [];

    for (const { relationId, similarity } of chromaResults) {
      const relation = relationMap.get(relationId);
      if (!relation) continue;

      // フィルタリング
      if (filters.relationType && relation.type !== filters.relationType) {
        continue;
      }

      // 日付フィルタリング
      if (filters.createdAfter && relation.createdAt && relation.createdAt < filters.createdAfter) {
        continue;
      }
      if (filters.createdBefore && relation.createdAt && relation.createdAt > filters.createdBefore) {
        continue;
      }
      if (filters.updatedAfter && relation.updatedAt && relation.updatedAt < filters.updatedAfter) {
        continue;
      }
      if (filters.updatedBefore && relation.updatedAt && relation.updatedAt > filters.updatedBefore) {
        continue;
      }

      // 類似度を正規化
      const normalizedSimilarity = normalizeSimilarity(similarity);
      
      console.log('[searchRelations] 類似度処理:', {
        relationId,
        rawSimilarity: similarity,
        normalizedSimilarity,
        similarityType: typeof similarity,
      });

      // スコア計算
      const score = calculateRelationScore(
        normalizedSimilarity,
        relation,
        weights,
        filters,
        undefined, // searchCount（将来実装）
        queryText
      );

      console.log('[searchRelations] スコア計算結果:', {
        relationId,
        normalizedSimilarity,
        score,
        scoreType: typeof score,
        isNaN: isNaN(score),
        isFinite: isFinite(score),
      });

      results.push({
        type: 'relation',
        id: relationId,
        score: typeof score === 'number' && !isNaN(score) ? score : 0,
        similarity: normalizedSimilarity,
        relation,
      });
    }

    // スコアでソート
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  } catch (error) {
    console.error('[searchRelations] リレーション検索エラー:', error);
    return [];
  }
}

/**
 * クエリに関連するエンティティを検索
 * 
 * 注意: 既存の検索アルゴリズムは削除されました。新しい実装が必要です。
 */
export async function findRelatedEntities(
  queryText: string,
  limit: number = 10,
  filters?: {
    organizationId?: string;
    entityType?: string;
  }
): Promise<Entity[]> {
  const results = await searchKnowledgeGraph(queryText, limit, filters);
  return results
    .filter(r => r.type === 'entity' && r.entity)
    .map(r => r.entity!)
    .slice(0, limit);
}

/**
 * クエリに関連するリレーションを検索
 * 
 * 注意: 既存の検索アルゴリズムは削除されました。新しい実装が必要です。
 */
export async function findRelatedRelations(
  queryText: string,
  limit: number = 10,
  filters?: {
    organizationId?: string;
    relationType?: string;
    topicId?: string;
  }
): Promise<Relation[]> {
  const results = await searchKnowledgeGraph(queryText, limit, {
    organizationId: filters?.organizationId,
    relationType: filters?.relationType,
  });
  return results
    .filter(r => r.type === 'relation' && r.relation)
    .map(r => r.relation!)
    .slice(0, limit);
}

/**
 * RAG用のコンテキストを取得
 * クエリに関連するエンティティ、リレーション、トピックの情報を取得してコンテキストとして返す
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 各タイプごとの最大結果数（デフォルト: 5）
 * @param filters フィルタリング条件（オプション）
 * @returns RAG用のコンテキスト文字列
 */
export async function getKnowledgeGraphContext(
  queryText: string,
  limit: number = 5,
  filters?: {
    organizationId?: string;
    entityType?: string;
    relationType?: string;
    topicSemanticCategory?: string;
  },
  maxTokens: number = 3000
): Promise<string> {
  try {
    // 検索を実行
    const results = await searchKnowledgeGraph(queryText, limit, filters);

    if (results.length === 0) {
      return '';
    }

    // コンテキストを構築
    const contextParts: string[] = [];

    // エンティティ情報
    const entities = results.filter(r => r.type === 'entity' && r.entity);
    if (entities.length > 0) {
      contextParts.push('## 関連エンティティ\n');
      for (const result of entities.slice(0, limit)) {
        const entity = result.entity!;
        contextParts.push(`- **${entity.name}** (${entity.type})`);
        if (entity.aliases && entity.aliases.length > 0) {
          contextParts.push(`  エイリアス: ${entity.aliases.join(', ')}`);
        }
        if (entity.metadata && typeof entity.metadata === 'object') {
          const metadata = entity.metadata as any;
          if (metadata.description) {
            contextParts.push(`  説明: ${metadata.description}`);
          }
        }
      }
    }

    // リレーション情報
    const relations = results.filter(r => r.type === 'relation' && r.relation);
    if (relations.length > 0) {
      contextParts.push('\n## 関連リレーション\n');
      for (const result of relations.slice(0, limit)) {
        const relation = result.relation!;
        contextParts.push(`- **${relation.type}**`);
        if (relation.description) {
          contextParts.push(`  説明: ${relation.description}`);
        }
      }
    }

    // トピック情報（将来実装）
    // const topics = results.filter(r => r.type === 'topic' && r.topic);
    // if (topics.length > 0) { ... }

    const context = contextParts.join('\n');

    // トークン数の簡易チェック（概算: 1文字 ≈ 0.25トークン）
    const estimatedTokens = context.length * 0.25;
    if (estimatedTokens > maxTokens) {
      // トークン数が超過する場合は、上位の結果のみを使用
      const truncatedContext = context.substring(0, Math.floor(maxTokens / 0.25));
      return truncatedContext + '\n\n(コンテキストが長すぎるため、一部を省略しました)';
    }

    return context;
  } catch (error) {
    console.error('[getKnowledgeGraphContext] コンテキスト生成エラー:', error);
    return '';
  }
}

/**
 * 統合RAGコンテキストを取得
 * ナレッジグラフ + システム設計ドキュメントを統合
 */
export async function getIntegratedRAGContext(
  queryText: string,
  limit: number = 5,
  filters?: {
    organizationId?: string;
    includeDesignDocs?: boolean;
    designDocSectionId?: string;
  }
): Promise<string> {
  try {
    const contextParts: string[] = [];

    // ナレッジグラフコンテキストを取得
    const knowledgeGraphContext = await getKnowledgeGraphContext(
      queryText,
      limit,
      {
        organizationId: filters?.organizationId,
      },
      2000 // ナレッジグラフ用のトークン制限
    );

    if (knowledgeGraphContext) {
      contextParts.push(knowledgeGraphContext);
    }

    // システム設計ドキュメントコンテキストを取得（オプション）
    if (filters?.includeDesignDocs) {
      try {
        const { getDesignDocContext } = await import('./designDocRAG');
        const designDocContext = await getDesignDocContext(
          queryText,
          Math.floor(limit / 2), // システム設計ドキュメント用のlimit
          1500, // システム設計ドキュメント用のトークン制限
          {
            sectionId: filters?.designDocSectionId,
          }
        );

        if (designDocContext) {
          if (contextParts.length > 0) {
            contextParts.push('\n---\n');
          }
          contextParts.push(designDocContext);
        }
      } catch (designDocError) {
        console.warn('[getIntegratedRAGContext] システム設計ドキュメントコンテキスト取得エラー:', designDocError);
        // エラーが発生してもナレッジグラフコンテキストは返す
      }
    }

    return contextParts.join('\n');
  } catch (error) {
    console.error('[getIntegratedRAGContext] 統合コンテキスト生成エラー:', error);
    return '';
  }
}

/**
 * 検索頻度を更新（バックグラウンドで非同期実行）
 * 検索結果に含まれるエンティティ、リレーション、トピックのsearchCountとlastSearchDateを更新
 * 
 * 注意: 既存の実装は削除されました。新しい実装が必要です。
 */
async function updateSearchFrequency(results: KnowledgeGraphSearchResult[]): Promise<void> {
  // TODO: 新しい実装が必要
  console.warn('[updateSearchFrequency] 既存の実装は削除されました。新しい実装が必要です。');
}
