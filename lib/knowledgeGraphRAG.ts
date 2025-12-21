/**
 * ナレッジグラフ統合RAG検索
 * エンティティ、リレーション、トピックを統合して検索する機能を提供
 */

import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { OrgNodeData } from '@/components/OrgChart';
import { findSimilarEntitiesChroma } from './entityEmbeddingsChroma';
import { findSimilarRelationsChroma } from './relationEmbeddingsChroma';
import { findSimilarTopicsChroma } from './topicEmbeddingsChroma';
import { getEntitiesByIds } from './entityApi';
import { getRelationsByIds } from './relationApi';
import { getTopicsByIds } from './topicApi';
import { normalizeSimilarity, calculateEntityScore, calculateRelationScore, calculateTopicScore, adjustWeightsForQuery, DEFAULT_WEIGHTS } from './ragSearchScoring';

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
  
  // クエリテキストを正規化（前後の空白を削除）
  const normalizedQuery = queryText.trim();

  try {
    // organizationIdが未指定の場合、Rust側で全組織横断検索が実行される
    // そのため、organizationIdが未指定でも検索を続行する

    // クエリに基づいて重みを調整
    const weights = adjustWeightsForQuery(normalizedQuery, DEFAULT_WEIGHTS);

    // 各タイプごとの検索数を計算（limitを3等分）
    const perTypeLimit = Math.max(1, Math.ceil(limit / 3));

    // 並列で各タイプを検索
    console.log('[searchKnowledgeGraph] 並列検索を開始:', { perTypeLimit, filters });
    
    const [entityResults, relationResults, topicResults] = await Promise.all([
      // エンティティ検索
      searchEntities(normalizedQuery, perTypeLimit, filters, weights).catch(error => {
        console.error('[searchKnowledgeGraph] エンティティ検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      }),
      
      // リレーション検索
      searchRelations(normalizedQuery, perTypeLimit, filters, weights).catch(error => {
        console.error('[searchKnowledgeGraph] リレーション検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      }),
      
      // トピック検索
      searchTopics(normalizedQuery, perTypeLimit, filters, weights).catch(error => {
        console.error('[searchKnowledgeGraph] トピック検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      })
    ]);
    
    console.log('[searchKnowledgeGraph] 並列検索完了:', {
      entityCount: entityResults.length,
      relationCount: relationResults.length,
      topicCount: topicResults.length,
    });

    // 結果を統合
    const allResults = [
      ...entityResults,
      ...relationResults,
      ...topicResults,
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
      filters?.organizationId
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
      if (filters?.entityType && entity.type !== filters.entityType) {
        continue;
      }

      // 日付フィルタリング
      if (filters?.createdAfter && entity.createdAt && entity.createdAt < filters.createdAfter) {
        continue;
      }
      if (filters?.createdBefore && entity.createdAt && entity.createdAt > filters.createdBefore) {
        continue;
      }
      if (filters?.updatedAfter && entity.updatedAt && entity.updatedAt < filters.updatedAfter) {
        continue;
      }
      if (filters?.updatedBefore && entity.updatedAt && entity.updatedAt > filters.updatedBefore) {
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
      filters?.organizationId,
      filters?.relationType
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
      if (filters?.relationType && relation.relationType !== filters.relationType) {
        continue;
      }

      // 日付フィルタリング
      if (filters?.createdAfter && relation.createdAt && relation.createdAt < filters.createdAfter) {
        continue;
      }
      if (filters?.createdBefore && relation.createdAt && relation.createdAt > filters.createdBefore) {
        continue;
      }
      if (filters?.updatedAfter && relation.updatedAt && relation.updatedAt < filters.updatedAfter) {
        continue;
      }
      if (filters?.updatedBefore && relation.updatedAt && relation.updatedAt > filters.updatedBefore) {
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
 * トピックを検索
 */
async function searchTopics(
  queryText: string,
  limit: number,
  filters?: {
    organizationId?: string;
    topicSemanticCategory?: string;
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
  },
  weights = DEFAULT_WEIGHTS
): Promise<KnowledgeGraphSearchResult[]> {
  // organizationIdが未指定の場合、Rust側で全組織横断検索が実行される
  try {
    console.log('[searchTopics] 検索開始:', { queryText, limit, filters, weights });
    
    // ChromaDBで類似トピックを検索
    const chromaResults = await findSimilarTopicsChroma(
      queryText,
      limit * 2, // フィルタリングで減る可能性があるため多めに取得
      filters?.organizationId,
      filters?.topicSemanticCategory
    );

    console.log('[searchTopics] ChromaDB検索結果:', chromaResults.length, '件');
    if (chromaResults.length > 0) {
      console.log('[searchTopics] ChromaDB検索結果のサンプル:', chromaResults.slice(0, 2).map(r => ({
        topicId: r.topicId,
        meetingNoteId: r.meetingNoteId,
        title: r.title,
        similarity: r.similarity,
      })));
    }

    if (chromaResults.length === 0) {
      console.log('[searchTopics] ChromaDB検索結果が空のため、空の配列を返します');
      return [];
    }

    // トピックIDとmeetingNoteIdのペアを抽出
    const topicIdsWithMeetingNoteIds = chromaResults.map(r => ({
      topicId: r.topicId,
      meetingNoteId: r.meetingNoteId,
    }));

    // バッチでトピックの詳細情報を取得（N+1問題を回避）
    const topics = await getTopicsByIds(topicIdsWithMeetingNoteIds);

    // トピックIDとmeetingNoteIdの複合キーでマップを作成
    const topicMap = new Map(topics.map(t => [`${t.topicId}-${t.meetingNoteId}`, t]));

    // 結果を構築
    const results: KnowledgeGraphSearchResult[] = [];

    for (const { topicId, meetingNoteId, similarity, title, contentSummary, organizationId: chromaOrgId } of chromaResults) {
      let topic = topicMap.get(`${topicId}-${meetingNoteId}`);
      
      // トピックが見つからない場合、ChromaDBから取得した情報を直接使用
      if (!topic) {
        console.warn(`[searchTopics] トピックID ${topicId} (会議メモID: ${meetingNoteId}) の詳細情報が見つかりませんでした。ChromaDBの情報を使用します。`);
        
        // ChromaDBから取得した情報から最小限のTopicSearchInfoを作成
        topic = {
          topicId: topicId,
          meetingNoteId: meetingNoteId,
          title: title || 'タイトル不明',
          content: contentSummary || '',
          summary: contentSummary,
          semanticCategory: undefined,
          importance: undefined,
          organizationId: chromaOrgId || '', // ChromaDBのメタデータから取得
          keywords: [],
          createdAt: undefined,
          updatedAt: undefined,
          searchCount: 0,
        };
      } else if (!topic.organizationId && chromaOrgId) {
        // トピックが見つかったがorganizationIdが空の場合、ChromaDBから取得した値を設定
        topic.organizationId = chromaOrgId;
      }

      // フィルタリング
      if (filters?.topicSemanticCategory && topic.semanticCategory !== filters.topicSemanticCategory) {
        continue;
      }
      
      // 日付フィルタリング（Firestoreタイムスタンプ形式も処理）
      let createdAtForFilter: string | undefined = topic.createdAt;
      let updatedAtForFilter: string | undefined = topic.updatedAt;
      
      if (createdAtForFilter && typeof createdAtForFilter === 'object' && createdAtForFilter !== null && 'seconds' in createdAtForFilter) {
        const timestamp = createdAtForFilter as { seconds: number; nanoseconds?: number };
        createdAtForFilter = new Date(timestamp.seconds * 1000).toISOString();
      }
      if (updatedAtForFilter && typeof updatedAtForFilter === 'object' && updatedAtForFilter !== null && 'seconds' in updatedAtForFilter) {
        const timestamp = updatedAtForFilter as { seconds: number; nanoseconds?: number };
        updatedAtForFilter = new Date(timestamp.seconds * 1000).toISOString();
      }
      
      if (filters?.createdAfter && createdAtForFilter && createdAtForFilter < filters.createdAfter) {
        continue;
      }
      if (filters?.createdBefore && createdAtForFilter && createdAtForFilter > filters.createdBefore) {
        continue;
      }
      if (filters?.updatedAfter && updatedAtForFilter && updatedAtForFilter < filters.updatedAfter) {
        continue;
      }
      if (filters?.updatedBefore && updatedAtForFilter && updatedAtForFilter > filters.updatedBefore) {
        continue;
      }

      // 類似度を正規化
      const normalizedSimilarity = normalizeSimilarity(similarity);
      
      console.log('[searchTopics] 類似度処理:', {
        topicId,
        meetingNoteId,
        rawSimilarity: similarity,
        normalizedSimilarity,
        similarityType: typeof similarity,
      });

      // スコア計算（updatedAtがFirestoreタイムスタンプ形式の場合も処理）
      let updatedAtForScore: string | undefined = updatedAtForFilter || topic.updatedAt;
      if (updatedAtForScore && typeof updatedAtForScore === 'object' && updatedAtForScore !== null && 'seconds' in updatedAtForScore) {
        // FirestoreタイムスタンプをISO文字列に変換
        const timestamp = updatedAtForScore as { seconds: number; nanoseconds?: number };
        const milliseconds = timestamp.seconds * 1000;
        updatedAtForScore = new Date(milliseconds).toISOString();
      }
      
      const score = calculateTopicScore(
        normalizedSimilarity,
        {
          importance: topic.importance,
          updatedAt: updatedAtForScore,
          keywords: topic.keywords,
          semanticCategory: topic.semanticCategory,
          title: topic.title,
        },
        weights,
        filters,
        topic.searchCount || 0,
        queryText
      );

      console.log('[searchTopics] スコア計算結果:', {
        topicId,
        meetingNoteId,
        normalizedSimilarity,
        score,
        scoreType: typeof score,
        isNaN: isNaN(score),
        isFinite: isFinite(score),
      });

      results.push({
        type: 'topic',
        id: topicId, // トピックのIDとしてtopicIdを使用
        score: typeof score === 'number' && !isNaN(score) ? score : 0,
        similarity: normalizedSimilarity,
        topicId: topicId,
        meetingNoteId: meetingNoteId,
        topic: {
          topicId: topic.topicId,
          title: topic.title || title || '',
          contentSummary: topic.summary || contentSummary || topic.content?.substring(0, 200) || '',
          semanticCategory: topic.semanticCategory,
          keywords: topic.keywords,
          meetingNoteId: topic.meetingNoteId,
          organizationId: topic.organizationId,
        },
      });
    }

    // スコアでソート
    results.sort((a, b) => b.score - a.score);

    console.log(`[searchTopics] トピック検索結果 (${results.length}件):`, results);
    return results.slice(0, limit);
  } catch (error) {
    console.error('[searchTopics] トピック検索エラー:', error);
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
/**
 * 検索結果とコンテキスト文字列のペア
 */
export interface KnowledgeGraphContextResult {
  context: string;
  results: KnowledgeGraphSearchResult[];
  sources: Array<{
    type: 'entity' | 'relation' | 'topic';
    id: string;
    name: string;
    score: number;
  }>;
}

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
    const result = await getKnowledgeGraphContextWithResults(queryText, limit, filters, maxTokens);
    return result.context;
  } catch (error: any) {
    console.error('[getKnowledgeGraphContext] エラー:', {
      error: error.message || String(error),
      stack: error.stack,
      queryText,
      limit,
      filters,
    });
    return '';
  }
}

/**
 * 検索結果も含めてコンテキストを取得
 */
export async function getKnowledgeGraphContextWithResults(
  queryText: string,
  limit: number = 5,
  filters?: {
    organizationId?: string;
    entityType?: string;
    relationType?: string;
    topicSemanticCategory?: string;
  },
  maxTokens: number = 3000
): Promise<KnowledgeGraphContextResult> {
  try {
    console.log('[getKnowledgeGraphContextWithResults] 検索開始:', { queryText, limit, filters });
    
    // 検索を実行
    const results = await searchKnowledgeGraph(queryText, limit, filters);

    console.log('[getKnowledgeGraphContextWithResults] 検索結果:', {
      resultsCount: results.length,
      topicResultsCount: results.filter(r => r.type === 'topic').length,
      entityResultsCount: results.filter(r => r.type === 'entity').length,
      relationResultsCount: results.filter(r => r.type === 'relation').length,
    });

    if (results.length === 0) {
      console.warn('[getKnowledgeGraphContextWithResults] 検索結果が0件です。クエリ:', queryText);
      return { context: '', results: [], sources: [] };
    }
    
    // 出典情報を収集
    const sources: Array<{
      type: 'entity' | 'relation' | 'topic';
      id: string;
      name: string;
      score: number;
    }> = [];

    // コンテキストを構築
    const contextParts: string[] = [];

    // エンティティ情報
    const entities = results.filter(r => r.type === 'entity' && r.entity);
    if (entities.length > 0) {
      contextParts.push('## 関連エンティティ\n');
      for (const result of entities.slice(0, limit)) {
        const entity = result.entity!;
        const scoreText = typeof result.score === 'number' && !isNaN(result.score)
          ? ` (関連度: ${(result.score * 100).toFixed(1)}%)`
          : '';
        contextParts.push(`- **${entity.name}** (${entity.type})${scoreText}`);
        
        // 出典情報を追加
        sources.push({
          type: 'entity',
          id: entity.id,
          name: entity.name,
          score: typeof result.score === 'number' && !isNaN(result.score) ? result.score : 0,
        });
        
        // エイリアス
        if (entity.aliases && entity.aliases.length > 0) {
          contextParts.push(`  エイリアス: ${entity.aliases.join(', ')}`);
        }
        
        // メタデータの詳細情報
        if (entity.metadata && typeof entity.metadata === 'object') {
          const metadata = entity.metadata as any;
          if (metadata.description) {
            contextParts.push(`  説明: ${metadata.description}`);
          }
          if (metadata.url) {
            contextParts.push(`  URL: ${metadata.url}`);
          }
          if (metadata.location) {
            contextParts.push(`  場所: ${metadata.location}`);
          }
          if (metadata.industry) {
            contextParts.push(`  業界: ${metadata.industry}`);
          }
          if (metadata.role) {
            contextParts.push(`  役割: ${metadata.role}`);
          }
          if (metadata.department) {
            contextParts.push(`  部署: ${metadata.department}`);
          }
        }
        
        // 更新日時
        if (entity.updatedAt) {
          const updatedDate = new Date(entity.updatedAt);
          const daysAgo = Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysAgo < 30) {
            contextParts.push(`  最終更新: ${daysAgo}日前`);
          }
        }
      }
    }

    // リレーション情報（関連エンティティ情報を含む）
    const relations = results.filter(r => r.type === 'relation' && r.relation);
    if (relations.length > 0) {
      contextParts.push('\n## 関連リレーション\n');
      
      // 関連エンティティの名前を取得するため、エンティティIDを収集
      const entityIds = new Set<string>();
      for (const result of relations) {
        const relation = result.relation!;
        if (relation.sourceEntityId) entityIds.add(relation.sourceEntityId);
        if (relation.targetEntityId) entityIds.add(relation.targetEntityId);
      }
      
      // バッチでエンティティ情報を取得
      const relatedEntities = entityIds.size > 0 
        ? await getEntitiesByIds(Array.from(entityIds))
        : [];
      const entityMap = new Map(relatedEntities.map(e => [e.id, e]));
      
      for (const result of relations.slice(0, limit)) {
        const relation = result.relation!;
        const scoreText = typeof result.score === 'number' && !isNaN(result.score)
          ? ` (関連度: ${(result.score * 100).toFixed(1)}%)`
          : '';
        // 関連エンティティの情報
        const sourceEntity = relation.sourceEntityId ? entityMap.get(relation.sourceEntityId) : null;
        const targetEntity = relation.targetEntityId ? entityMap.get(relation.targetEntityId) : null;
        
        contextParts.push(`- **${relation.relationType}**${scoreText}`);
        
        // 出典情報を追加
        const relationName = `${sourceEntity?.name || '起点エンティティ'} → ${targetEntity?.name || '終点エンティティ'}`;
        sources.push({
          type: 'relation',
          id: relation.id,
          name: `${relation.relationType}: ${relationName}`,
          score: typeof result.score === 'number' && !isNaN(result.score) ? result.score : 0,
        });
        
        if (sourceEntity && targetEntity) {
          contextParts.push(`  ${sourceEntity.name} → ${targetEntity.name}`);
        } else if (sourceEntity) {
          contextParts.push(`  起点: ${sourceEntity.name}`);
        } else if (targetEntity) {
          contextParts.push(`  終点: ${targetEntity.name}`);
        }
        
        // 説明
        if (relation.description) {
          contextParts.push(`  説明: ${relation.description}`);
        }
        
        // 信頼度
        if (relation.confidence !== undefined && relation.confidence !== null) {
          contextParts.push(`  信頼度: ${(relation.confidence * 100).toFixed(1)}%`);
        }
        
        // メタデータ
        if (relation.metadata && typeof relation.metadata === 'object') {
          const metadata = relation.metadata as any;
          if (metadata.strength) {
            contextParts.push(`  強度: ${metadata.strength}`);
          }
          if (metadata.direction) {
            contextParts.push(`  方向: ${metadata.direction}`);
          }
        }
      }
    }

    // トピック情報（優先的に表示）
    const topics = results.filter(r => r.type === 'topic' && r.topic);
    if (topics.length > 0) {
      contextParts.push('\n## 関連トピック\n');
      console.log(`[getKnowledgeGraphContextWithResults] トピック情報をコンテキストに追加: ${topics.length}件`);
      for (const result of topics.slice(0, limit)) {
        const topic = result.topic!;
        const scoreText = typeof result.score === 'number' && !isNaN(result.score)
          ? ` (関連度: ${(result.score * 100).toFixed(1)}%)`
          : '';
        contextParts.push(`- **${topic.title}**${scoreText}`);
        
        // 出典情報を追加
        sources.push({
          type: 'topic',
          id: topic.topicId,
          name: topic.title,
          score: typeof result.score === 'number' && !isNaN(result.score) ? result.score : 0,
        });
        
        // トピックの内容を詳細に表示（人物名などの検索に重要）
        if (topic.contentSummary) {
          // 概要をより詳細に表示（最大800文字に拡大）
          const summary = topic.contentSummary.length > 800 
            ? topic.contentSummary.substring(0, 800) + '...'
            : topic.contentSummary;
          contextParts.push(`  内容: ${summary}`);
        }
        if (topic.semanticCategory) {
          contextParts.push(`  カテゴリ: ${topic.semanticCategory}`);
        }
        if (topic.keywords && topic.keywords.length > 0) {
          contextParts.push(`  キーワード: ${topic.keywords.join(', ')}`);
        }
      }
    } else {
      console.warn(`[getKnowledgeGraphContextWithResults] トピック検索結果が0件です。クエリ: "${queryText}"`);
    }

    const context = contextParts.join('\n');

    // トークン数の簡易チェック（概算: 1文字 ≈ 0.25トークン）
    const estimatedTokens = context.length * 0.25;
    if (estimatedTokens > maxTokens) {
      // トークン数が超過する場合は、上位の結果のみを使用
      const truncatedContext = context.substring(0, Math.floor(maxTokens / 0.25));
      return {
        context: truncatedContext + '\n\n(コンテキストが長すぎるため、一部を省略しました)',
        results,
        sources,
      };
    }

    return { context, results, sources };
  } catch (error: any) {
    console.error('[getKnowledgeGraphContextWithResults] コンテキスト生成エラー:', {
      error: error.message || String(error),
      stack: error.stack,
      queryText,
      limit,
      filters,
    });
    return { context: '', results: [], sources: [] };
  }
}

/**
 * 出典情報をフォーマット
 */
export function formatSources(
  sources: Array<{
    type: 'entity' | 'relation' | 'topic';
    id: string;
    name: string;
    score: number;
  }>
): string {
  if (!sources || sources.length === 0) {
    return '';
  }

  const sourceParts: string[] = ['\n\n## 参考情報の出典\n'];
  
  // タイプごとにグループ化
  const byType = sources.reduce((acc, source) => {
    if (!acc[source.type]) {
      acc[source.type] = [];
    }
    acc[source.type].push(source);
    return acc;
  }, {} as Record<'entity' | 'relation' | 'topic', typeof sources>);

  // エンティティ
  if (byType.entity && byType.entity.length > 0) {
    sourceParts.push('### エンティティ\n');
    for (const source of byType.entity) {
      sourceParts.push(`- **${source.name}** (関連度: ${(source.score * 100).toFixed(1)}%)`);
    }
    sourceParts.push('');
  }

  // リレーション
  if (byType.relation && byType.relation.length > 0) {
    sourceParts.push('### リレーション\n');
    for (const source of byType.relation) {
      sourceParts.push(`- **${source.name}** (関連度: ${(source.score * 100).toFixed(1)}%)`);
    }
    sourceParts.push('');
  }

  // トピック
  if (byType.topic && byType.topic.length > 0) {
    sourceParts.push('### トピック\n');
    for (const source of byType.topic) {
      sourceParts.push(`- **${source.name}** (関連度: ${(source.score * 100).toFixed(1)}%)`);
    }
    sourceParts.push('');
  }

  return sourceParts.join('\n');
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
