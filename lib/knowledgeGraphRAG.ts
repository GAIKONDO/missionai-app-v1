/**
 * ナレッジグラフ統合RAG検索
 * エンティティ、リレーション、トピックを統合して検索する機能を提供
 */

import { findSimilarEntitiesHybrid } from './entityEmbeddings';
import { findSimilarRelationsHybrid } from './relationEmbeddings';
import { findSimilarTopicsHybrid } from './topicEmbeddings';
import { getEntityById, getEntitiesByIds } from './entityApi';
import { getRelationById, getRelationsByIds } from './relationApi';
import { getTopicsByMeetingNote, getOrgTreeFromDb } from './orgApi';
import { getCachedSearchResults, setCachedSearchResults } from './ragSearchCache';
import { getDesignDocContext, isDesignDocQuery } from './designDocRAG';
import { processQuery, type ExpandedQuery } from './queryExpansion';
import { applyMultiStageFiltering, DEFAULT_FILTER_CONFIG, type MultiStageFilterConfig } from './multiStageFiltering';
import { optimizeContext, DEFAULT_OPTIMIZATION_CONFIG, type ContextOptimizationConfig } from './contextOptimization';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { OrgNodeData } from '@/components/OrgChart';

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
    timeoutMs: number = 30000 // デフォルト30秒のタイムアウト（10秒から延長）
  ): Promise<KnowledgeGraphSearchResult[]> {
  const startTime = Date.now();
  let usedChromaDB = false;

  // タイムアウト用のPromiseを作成
  const timeoutPromise = new Promise<KnowledgeGraphSearchResult[]>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`RAG検索がタイムアウトしました（${timeoutMs / 1000}秒）`));
    }, timeoutMs);
  });
  
  // クエリが空の場合は早期リターン
  if (!queryText || queryText.trim().length === 0) {
    console.warn('[searchKnowledgeGraph] クエリが空です');
    return [];
  }

  // セキュリティ: 入力検証
  if (typeof window !== 'undefined') {
    try {
      const { InputValidator, logAuditEvent } = await import('./security');
      const validation = InputValidator.validateQuery(queryText);
      if (!validation.valid) {
        logAuditEvent('search', {
          resource: queryText,
          organizationId: filters?.organizationId,
          success: false,
          errorMessage: validation.error,
        });
        throw new Error(validation.error || '入力検証に失敗しました');
      }
      
      // 組織IDの検証
      if (filters?.organizationId) {
        const orgValidation = InputValidator.validateOrganizationId(filters.organizationId);
        if (!orgValidation.valid) {
          logAuditEvent('search', {
            resource: queryText,
            organizationId: filters.organizationId,
            success: false,
            errorMessage: orgValidation.error,
          });
          throw new Error(orgValidation.error || '組織IDの検証に失敗しました');
        }
      }
    } catch (securityError) {
      // セキュリティモジュールの読み込みエラーは無視（後方互換性のため）
      console.warn('[searchKnowledgeGraph] セキュリティ検証のスキップ:', securityError);
    }
  }
  
  try {
    const { shouldUseChroma } = await import('./chromaConfig');
    const useChroma = shouldUseChroma();
    const localStorageValue = typeof window !== 'undefined' ? localStorage.getItem('useChromaDB') : null;
    console.log(`[searchKnowledgeGraph] 🔍 検索開始: queryText="${queryText}", filters=`, filters);
    console.log(`[searchKnowledgeGraph] 📊 ChromaDB設定: shouldUseChroma()=${useChroma}, localStorage['useChromaDB']="${localStorageValue}", organizationId="${filters?.organizationId || '未指定'}"`);
    
    // キャッシュをチェック
    if (useCache) {
      const cachedResults = getCachedSearchResults(queryText, filters);
      if (cachedResults) {
        console.log('📦 キャッシュから検索結果を取得:', cachedResults.length, '件');
        // キャッシュヒットの場合はメトリクスを記録（応答時間は0に近い）
        const responseTime = Date.now() - startTime;
        if (typeof window !== 'undefined') {
          const { logSearchMetrics } = await import('./monitoring');
          logSearchMetrics({
            query: queryText,
            responseTime,
            resultCount: cachedResults.length,
            organizationId: filters?.organizationId,
            searchType: 'all',
            usedChromaDB: false, // キャッシュのため
            filters,
          });
        }
        return cachedResults;
      }
    }

    console.log(`[searchKnowledgeGraph] ✅ キャッシュなし。新規検索を実行します。`);

    // クエリ拡張とリライティングを実行
    const processedQuery = processQuery(queryText);
    const searchQuery = processedQuery.rewritten; // リライティングされたクエリを使用
    
    console.log(`[searchKnowledgeGraph] 🔍 クエリ処理: 元のクエリ="${queryText}", リライティング後="${searchQuery}", 意図=${processedQuery.intent}`);

    // 並列で各タイプを検索（タイムアウト付き）
    // limitを増やして、より多くの候補から最適な結果を選択できるようにする
    const searchLimit = Math.max(limit * 2, 20); // 最低20件、またはlimitの2倍
    const searchPromise = Promise.all([
      // エンティティ検索（多めに取得してからフィルタリング）
      findSimilarEntitiesHybrid(
        searchQuery, // リライティングされたクエリを使用
        searchLimit,
        {
          organizationId: filters?.organizationId,
          entityType: filters?.entityType,
        }
      ).catch(error => {
        console.warn('エンティティ検索エラー:', error);
        return [];
      }),
      
      // リレーション検索（多めに取得してからフィルタリング）
      findSimilarRelationsHybrid(
        searchQuery, // リライティングされたクエリを使用
        searchLimit,
        {
          organizationId: filters?.organizationId,
          relationType: filters?.relationType,
        }
      ).catch(error => {
        console.warn('リレーション検索エラー:', error);
        return [];
      }),
      
      // トピック検索（多めに取得してからフィルタリング）
      findSimilarTopicsHybrid(
        searchQuery, // リライティングされたクエリを使用
        searchLimit,
        {
          organizationId: filters?.organizationId,
          semanticCategory: filters?.topicSemanticCategory as any,
        }
      ).catch(error => {
        console.warn('トピック検索エラー:', error);
        return [];
      }),
    ]);

    // タイムアウトと検索を競争させる
    let entityResults: any[] = [];
    let relationResults: any[] = [];
    let topicResults: any[] = [];
    let timedOut = false;
    
    try {
      const results = await Promise.race([
        searchPromise,
        timeoutPromise,
      ]);
      [entityResults, relationResults, topicResults] = results as [any[], any[], any[]];
    } catch (error: any) {
      // タイムアウトエラーの場合
      if (error?.message?.includes('タイムアウト') || error?.message?.includes('timeout')) {
        console.warn(`[searchKnowledgeGraph] ⏱️ 検索がタイムアウトしました（${timeoutMs / 1000}秒）。`);
        timedOut = true;
        
        // タイムアウト時は、既に完了している可能性のある検索結果を待機（最大2秒）
        // Promise.allSettledを使用して、各検索の状態を確認（短いタイムアウト付き）
        try {
          const quickTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('クイックタイムアウト')), 2000);
          });
          
          const settledPromise = Promise.allSettled([
            findSimilarEntitiesHybrid(
              searchQuery,
              Math.min(searchLimit, 10), // タイムアウト時は少なめに
              {
                organizationId: filters?.organizationId,
                entityType: filters?.entityType,
              }
            ).catch(() => []),
            findSimilarRelationsHybrid(
              searchQuery,
              Math.min(searchLimit, 10),
              {
                organizationId: filters?.organizationId,
                relationType: filters?.relationType,
              }
            ).catch(() => []),
            findSimilarTopicsHybrid(
              searchQuery,
              Math.min(searchLimit, 10),
              {
                organizationId: filters?.organizationId,
                semanticCategory: filters?.topicSemanticCategory as any,
              }
            ).catch(() => []),
          ]);
          
          try {
            const settledResults = await Promise.race([
              settledPromise,
              quickTimeout,
            ]) as PromiseSettledResult<any[]>[];
            
            // 成功した結果のみを使用
            if (settledResults[0]?.status === 'fulfilled') {
              entityResults = settledResults[0].value || [];
            }
            if (settledResults[1]?.status === 'fulfilled') {
              relationResults = settledResults[1].value || [];
            }
            if (settledResults[2]?.status === 'fulfilled') {
              topicResults = settledResults[2].value || [];
            }
            
            console.log(`[searchKnowledgeGraph] タイムアウト後の部分結果: エンティティ=${entityResults.length}件, リレーション=${relationResults.length}件, トピック=${topicResults.length}件`);
          } catch (raceError: any) {
            if (raceError?.message?.includes('クイックタイムアウト')) {
              console.warn(`[searchKnowledgeGraph] タイムアウト後のクイック検索もタイムアウトしました。空の結果を返します。`);
            } else {
              throw raceError;
            }
          }
        } catch (fallbackError: any) {
          console.warn(`[searchKnowledgeGraph] タイムアウト後のフォールバック検索エラー:`, fallbackError);
          // フォールバックも失敗した場合は空の結果を返す（既に空配列で初期化されている）
        }
      } else {
        // その他のエラーは再スロー
        throw error;
      }
    }

    // 結果を統合
    const results: KnowledgeGraphSearchResult[] = [];

    // エンティティ結果を一括取得（パフォーマンス最適化）
    const entityIds = entityResults.map(r => r.entityId);
    const entities = await getEntitiesByIds(entityIds, 5);
    const entityMap = new Map(entities.map(e => [e.id, e]));

    // エンティティ結果を追加（日付フィルター適用）
    for (const result of entityResults) {
      try {
        const entity = entityMap.get(result.entityId);
        if (entity) {
          // 日付フィルターの適用
          let passesDateFilter = true;
          if (filters?.createdAfter || filters?.createdBefore) {
            const createdAt = entity.createdAt ? new Date(entity.createdAt) : null;
            if (createdAt) {
              if (filters.createdAfter && createdAt < new Date(filters.createdAfter)) {
                passesDateFilter = false;
              }
              if (filters.createdBefore && createdAt > new Date(filters.createdBefore)) {
                passesDateFilter = false;
              }
            } else {
              passesDateFilter = false; // 日付情報がない場合は除外
            }
          }
          if (filters?.updatedAfter || filters?.updatedBefore) {
            const updatedAt = entity.updatedAt ? new Date(entity.updatedAt) : null;
            if (updatedAt) {
              if (filters.updatedAfter && updatedAt < new Date(filters.updatedAfter)) {
                passesDateFilter = false;
              }
              if (filters.updatedBefore && updatedAt > new Date(filters.updatedBefore)) {
                passesDateFilter = false;
              }
            } else {
              passesDateFilter = false; // 日付情報がない場合は除外
            }
          }
          
          if (passesDateFilter) {
            // スコアと類似度がNaNまたはundefinedの場合、デフォルト値を設定
            const score = (typeof result.score === 'number' && !isNaN(result.score)) ? result.score : 0;
            const similarity = (typeof result.similarity === 'number' && !isNaN(result.similarity)) ? result.similarity : 0;
            
            results.push({
              type: 'entity',
              id: result.entityId,
              score,
              similarity,
              entity,
            });
          }
        }
      } catch (error) {
        console.warn(`エンティティ ${result.entityId} の取得エラー:`, error);
      }
    }

    // リレーション結果を一括取得（パフォーマンス最適化）
    const relationIds = relationResults.map(r => r.relationId);
    const relations = await getRelationsByIds(relationIds, 5);
    const relationMap = new Map(relations.map(r => [r.id, r]));

    // リレーション結果を追加（日付フィルター適用）
    for (const result of relationResults) {
      try {
        const relation = relationMap.get(result.relationId);
        if (relation) {
          // 日付フィルターの適用
          let passesDateFilter = true;
          if (filters?.createdAfter || filters?.createdBefore) {
            const createdAt = relation.createdAt ? new Date(relation.createdAt) : null;
            if (createdAt) {
              if (filters.createdAfter && createdAt < new Date(filters.createdAfter)) {
                passesDateFilter = false;
              }
              if (filters.createdBefore && createdAt > new Date(filters.createdBefore)) {
                passesDateFilter = false;
              }
            } else {
              passesDateFilter = false; // 日付情報がない場合は除外
            }
          }
          if (filters?.updatedAfter || filters?.updatedBefore) {
            const updatedAt = relation.updatedAt ? new Date(relation.updatedAt) : null;
            if (updatedAt) {
              if (filters.updatedAfter && updatedAt < new Date(filters.updatedAfter)) {
                passesDateFilter = false;
              }
              if (filters.updatedBefore && updatedAt > new Date(filters.updatedBefore)) {
                passesDateFilter = false;
              }
            } else {
              passesDateFilter = false; // 日付情報がない場合は除外
            }
          }
          
          if (passesDateFilter) {
            // スコアと類似度がNaNまたはundefinedの場合、デフォルト値を設定
            const score = (typeof result.score === 'number' && !isNaN(result.score)) ? result.score : 0;
            const similarity = (typeof result.similarity === 'number' && !isNaN(result.similarity)) ? result.similarity : 0;
            
            results.push({
              type: 'relation',
              id: result.relationId,
              score,
              similarity,
              relation,
            });
          }
        }
      } catch (error) {
        console.warn(`リレーション ${result.relationId} の取得エラー:`, error);
      }
    }

    // トピック結果を一括取得（パフォーマンス最適化、N+1問題の解決）
    const topicIds = topicResults.map(r => r.topicId);
    const topicMap = new Map<string, TopicSummary>();
    const topicIdSet = new Set(topicIds); // 高速な検索のためSetを使用
    
    if (topicIds.length > 0) {
      try {
        // SQLiteからトピック情報を一括取得（N+1問題を解決）
        const { callTauriCommand } = await import('./localFirebase');
        const topicConditions: any = {};
        if (filters?.organizationId) {
          topicConditions.organizationId = filters.organizationId;
        }
        
        // 一度のクエリで該当するトピックをすべて取得（organizationIdでフィルタリング）
        const allTopicsResult = await callTauriCommand('query_get', {
          collectionName: 'topics',
          conditions: topicConditions,
        });
        
        const allTopics = (allTopicsResult || []) as Array<{id: string; data: any}>;
        
        // topicIdでフィルタリング（メモリ内で高速に処理）
        for (const item of allTopics) {
          const topicData = item.data;
          const topicId = topicData.topicId || item.id;
          
          // 検索結果に含まれるtopicIdのみを処理
          if (topicIdSet.has(topicId)) {
            // 対応するtopicResultを検索（ChromaDB検索結果からtitleとcontentSummaryを取得）
            const topicResult = topicResults.find(r => r.topicId === topicId);
            const topicSummary: TopicSummary = {
              topicId: topicId,
              // ChromaDB検索結果からtitleとcontentSummaryを優先的に使用（なければSQLiteから取得）
              title: topicResult?.title || topicData.title || '',
              contentSummary: topicResult?.contentSummary || topicData.contentSummary || (topicData.content ? topicData.content.substring(0, 200) : undefined),
              semanticCategory: topicData.semanticCategory,
              keywords: topicData.keywords ? (Array.isArray(topicData.keywords) ? topicData.keywords : JSON.parse(topicData.keywords || '[]')) : undefined,
              meetingNoteId: topicData.meetingNoteId || topicResult?.meetingNoteId,
              organizationId: topicData.organizationId,
            };
            topicMap.set(topicId, topicSummary);
          }
        }
        
        console.log(`[searchKnowledgeGraph] トピック情報を一括取得: ${topicIds.length}件のtopicIdに対して${topicMap.size}件の情報を取得`);
      } catch (error) {
        console.warn('トピック情報の一括取得エラー:', error);
        // エラーが発生した場合は、空のMapを返す（検索結果はtopicIdとmeetingNoteIdのみで続行）
      }
    }

    // トピック結果を追加
    for (const result of topicResults) {
      // スコアと類似度がNaNまたはundefinedの場合、デフォルト値を設定
      const score = (typeof result.score === 'number' && !isNaN(result.score)) ? result.score : 0;
      const similarity = (typeof result.similarity === 'number' && !isNaN(result.similarity)) ? result.similarity : 0;
      
      const topicSummary = topicMap.get(result.topicId);
      
      results.push({
        type: 'topic',
        id: result.topicId,
        score,
        similarity,
        topicId: result.topicId,
        meetingNoteId: result.meetingNoteId,
        topic: topicSummary,
      });
    }

    // 多段階フィルタリングを適用（オプション）
    let finalResults = results;
    try {
      // クエリの意図に応じてフィルタリング設定を調整
      const filterConfig: MultiStageFilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        vectorSearch: {
          ...DEFAULT_FILTER_CONFIG.vectorSearch,
          initialLimit: Math.max(limit * 3, 30), // より多くの候補を取得
        },
      };
      
      finalResults = applyMultiStageFiltering(results, filterConfig);
      console.log(`[searchKnowledgeGraph] 多段階フィルタリング適用: ${results.length}件 → ${finalResults.length}件`);
    } catch (filterError) {
      console.warn('[searchKnowledgeGraph] 多段階フィルタリングエラー（続行）:', filterError);
      // エラーが発生しても元の結果を使用
    }
    
    // スコアでソートして返す
    const sortedResults = finalResults.sort((a, b) => b.score - a.score);
    
    const responseTime = Date.now() - startTime;
    
    // ChromaDB使用状況を判定（エンティティ、リレーション、トピックのいずれかでChromaDBが使用されたか）
    usedChromaDB = useChroma && (filters?.organizationId !== undefined);
    
    console.log(`[searchKnowledgeGraph] 検索完了: エンティティ=${entityResults.length}件, リレーション=${relationResults.length}件, トピック=${topicResults.length}件, 統合結果=${results.length}件, 応答時間=${responseTime}ms${timedOut ? ' (タイムアウト後の部分結果)' : ''}`);
    if (sortedResults.length > 0) {
      console.log(`[searchKnowledgeGraph] トップ5のスコア:`, sortedResults.slice(0, 5).map(r => ({ 
        type: r.type, 
        id: r.id, 
        score: r.score.toFixed(4), 
        similarity: r.similarity?.toFixed(4) 
      })));
    }
    
    // メトリクスを記録
    if (typeof window !== 'undefined') {
      try {
        const { logSearchMetrics } = await import('./monitoring');
        logSearchMetrics({
          query: queryText,
          responseTime,
          resultCount: sortedResults.length,
          organizationId: filters?.organizationId,
          searchType: 'all',
          usedChromaDB,
          filters,
        });
      } catch (metricsError) {
        console.warn('[searchKnowledgeGraph] メトリクス記録エラー:', metricsError);
      }
      
      // セキュリティ: 監査ログを記録
      try {
        const { logAuditEvent } = await import('./security');
        logAuditEvent('search', {
          resource: queryText,
          organizationId: filters?.organizationId,
          success: true,
          details: {
            resultCount: sortedResults.length,
            responseTime,
            usedChromaDB,
          },
        });
      } catch (auditError) {
        console.warn('[searchKnowledgeGraph] 監査ログ記録エラー:', auditError);
      }
    }
    
    // キャッシュに保存
    if (useCache) {
      setCachedSearchResults(queryText, filters, sortedResults);
      console.log(`[searchKnowledgeGraph] 検索結果をキャッシュに保存しました`);
    }
    
    // 検索頻度の更新（バックグラウンドで非同期実行、エラーが発生しても検索結果は返す）
    try {
      updateSearchFrequency(sortedResults).catch(error => {
        console.warn('[searchKnowledgeGraph] 検索頻度の更新エラー（続行）:', error);
      });
    } catch (error) {
      console.warn('[searchKnowledgeGraph] 検索頻度更新の開始エラー（続行）:', error);
    }
    
    return sortedResults;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // エラーメトリクスを記録
    if (typeof window !== 'undefined') {
      try {
        const { logErrorMetrics } = await import('./monitoring');
        logErrorMetrics({
          errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
          errorMessage: error instanceof Error ? error.message : String(error),
          component: 'search',
          context: {
            query: queryText,
            filters,
            responseTime,
          },
        });
      } catch (metricsError) {
        console.warn('[searchKnowledgeGraph] エラーメトリクス記録エラー:', metricsError);
      }
    }
    
    console.error('ナレッジグラフ検索エラー:', error);
    throw error;
  }
}

/**
 * クエリに関連するエンティティを検索
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 返す結果の最大数（デフォルト: 10）
 * @param filters フィルタリング条件（オプション）
 * @returns エンティティの配列
 */
export async function findRelatedEntities(
  queryText: string,
  limit: number = 10,
  filters?: {
    organizationId?: string;
    entityType?: string;
  }
): Promise<Entity[]> {
  try {
    const results = await findSimilarEntitiesHybrid(
      queryText,
      limit,
      {
        organizationId: filters?.organizationId,
        entityType: filters?.entityType,
      }
    );

    const entities: Entity[] = [];
    for (const result of results) {
      try {
        const entity = await getEntityById(result.entityId);
        if (entity) {
          entities.push(entity);
        }
      } catch (error) {
        console.warn(`エンティティ ${result.entityId} の取得エラー:`, error);
      }
    }

    return entities;
  } catch (error) {
    console.error('関連エンティティ検索エラー:', error);
    throw error;
  }
}

/**
 * クエリに関連するリレーションを検索
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 返す結果の最大数（デフォルト: 10）
 * @param filters フィルタリング条件（オプション）
 * @returns リレーションの配列
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
  try {
    const results = await findSimilarRelationsHybrid(
      queryText,
      limit,
      {
        organizationId: filters?.organizationId,
        relationType: filters?.relationType,
        topicId: filters?.topicId,
      }
    );

    const relations: Relation[] = [];
    for (const result of results) {
      try {
        const relation = await getRelationById(result.relationId);
        if (relation) {
          relations.push(relation);
        }
      } catch (error) {
        console.warn(`リレーション ${result.relationId} の取得エラー:`, error);
      }
    }

    return relations;
  } catch (error) {
    console.error('関連リレーション検索エラー:', error);
    throw error;
  }
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
 * 組織ツリーから組織名を取得するヘルパー関数
 */
function findOrganizationNameById(orgTree: OrgNodeData | null, organizationId: string): string | null {
  if (!orgTree) return null;
  
  // 再帰的に組織を検索
  function search(node: OrgNodeData): OrgNodeData | null {
    if (node.id === organizationId) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = search(child);
        if (found) return found;
      }
    }
    return null;
  }
  
  const found = search(orgTree);
  return found?.name || null;
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
  maxTokens: number = 3000 // デフォルト3000トークン
): Promise<string> {
  try {
    console.log(`[getKnowledgeGraphContext] 🔍 AIアシスタント用コンテキスト生成開始: queryText="${queryText}", limit=${limit}, maxTokens=${maxTokens}, filters=`, filters);
    
    // ハイブリッド検索を実行（ChromaDBベクトル検索 + SQLiteキーワード検索）
    // searchKnowledgeGraphは既にfindSimilarEntitiesHybrid、findSimilarRelationsHybrid、findSimilarTopicsHybridを使用しているため、
    // ChromaDBとSQLiteの両方の情報が統合された結果が返されます
    // 検索結果が少ない場合に備えて、limitを増やして検索
    let searchLimit = limit * 2;
    let results = await searchKnowledgeGraph(queryText, searchLimit, filters);
    
    // 検索結果が少ない場合（3件未満）、検索範囲を広げて再試行
    if (results.length < 3) {
      console.log(`[getKnowledgeGraphContext] 検索結果が少ない（${results.length}件）ため、検索範囲を広げて再試行します`);
      searchLimit = limit * 4; // さらに多く取得
      const expandedResults = await searchKnowledgeGraph(queryText, searchLimit, {
        ...filters,
        // organizationIdフィルターを緩和（指定されている場合でも全組織検索を試行）
      });
      if (expandedResults.length > results.length) {
        console.log(`[getKnowledgeGraphContext] 検索範囲を広げた結果: ${results.length}件 → ${expandedResults.length}件`);
        results = expandedResults;
      }
    }
    
    const entityCount = results.filter(r => r.type === 'entity').length;
    const relationCount = results.filter(r => r.type === 'relation').length;
    const topicCount = results.filter(r => r.type === 'topic').length;
    
    console.log(`[getKnowledgeGraphContext] ハイブリッド検索完了: ${results.length}件の結果を取得（エンティティ: ${entityCount}件, リレーション: ${relationCount}件, トピック: ${topicCount}件）`);
    
    // 検索結果が0件の場合、デバッグ情報を出力し、フォールバック検索を試行
    if (results.length === 0) {
      console.warn(`[getKnowledgeGraphContext] ⚠️ 検索結果が0件です。queryText="${queryText}", filters=`, filters);
      console.warn(`[getKnowledgeGraphContext] デバッグ情報:`);
      console.warn(`  - organizationId: ${filters?.organizationId || '未指定（全組織検索）'}`);
      console.warn(`  - limit: ${limit}`);
      console.warn(`  - 考えられる原因:`);
      console.warn(`    1. エンティティ/リレーション/トピックが登録されていない`);
      console.warn(`    2. organizationIdフィルターが適用されている`);
      console.warn(`    3. ChromaDBに埋め込みが生成されていない`);
      console.warn(`    4. SQLiteキーワード検索でマッチしない`);
      
      // デバッグ用：直接キーワード検索を試行
      try {
        const { getAllEntities } = await import('./entityApi');
        const { getAllRelations } = await import('./relationApi');
        const { getAllTopicsBatch } = await import('./orgApi');
        
        const allEntities = await getAllEntities();
        const allRelations = await getAllRelations();
        const allTopics = await getAllTopicsBatch();
        
        console.log(`[getKnowledgeGraphContext] デバッグ: 全データ数 - エンティティ: ${allEntities.length}件, リレーション: ${allRelations.length}件, トピック: ${allTopics.length}件`);
        
        // クエリを単語に分割して部分マッチを試行
        const queryWords = queryText.toLowerCase().split(/\s+/).filter(w => w.length > 1);
        console.log(`[getKnowledgeGraphContext] デバッグ: クエリ単語: ${queryWords.join(', ')}`);
        
        // エンティティの部分マッチ
        const matchingEntities = allEntities.filter(e => {
          const nameLower = e.name.toLowerCase();
          const metadataText = e.metadata ? JSON.stringify(e.metadata).toLowerCase() : '';
          const aliasesText = e.aliases ? e.aliases.join(' ').toLowerCase() : '';
          const searchText = `${nameLower} ${metadataText} ${aliasesText}`;
          return queryWords.some(word => searchText.includes(word));
        });
        
        console.log(`[getKnowledgeGraphContext] デバッグ: 部分マッチしたエンティティ: ${matchingEntities.length}件`);
        if (matchingEntities.length > 0) {
          console.log(`[getKnowledgeGraphContext] デバッグ: マッチしたエンティティ（上位5件）:`, matchingEntities.slice(0, 5).map(e => ({
            id: e.id,
            name: e.name,
            type: e.type,
            organizationId: e.organizationId,
            hasMetadata: !!e.metadata && Object.keys(e.metadata).length > 0,
          })));
        }
        
        // リレーションの部分マッチ
        const matchingRelations = allRelations.filter(r => {
          const relationTypeLower = r.relationType?.toLowerCase() || '';
          const descriptionLower = r.description?.toLowerCase() || '';
          const searchText = `${relationTypeLower} ${descriptionLower}`;
          return queryWords.some(word => searchText.includes(word));
        });
        
        console.log(`[getKnowledgeGraphContext] デバッグ: 部分マッチしたリレーション: ${matchingRelations.length}件`);
        if (matchingRelations.length > 0) {
          console.log(`[getKnowledgeGraphContext] デバッグ: マッチしたリレーション（上位5件）:`, matchingRelations.slice(0, 5).map(r => ({
            id: r.id,
            relationType: r.relationType,
            organizationId: r.organizationId,
            hasDescription: !!r.description,
          })));
        }
        
        // トピックの部分マッチ
        const matchingTopics = allTopics.filter(t => {
          const titleLower = t.title?.toLowerCase() || '';
          const contentLower = t.content?.toLowerCase() || '';
          const keywordsText = t.keywords ? (Array.isArray(t.keywords) ? t.keywords.join(' ') : String(t.keywords)).toLowerCase() : '';
          const searchText = `${titleLower} ${contentLower} ${keywordsText}`;
          return queryWords.some(word => searchText.includes(word));
        });
        
        console.log(`[getKnowledgeGraphContext] デバッグ: 部分マッチしたトピック: ${matchingTopics.length}件`);
        if (matchingTopics.length > 0) {
          console.log(`[getKnowledgeGraphContext] デバッグ: マッチしたトピック（上位5件）:`, matchingTopics.slice(0, 5).map(t => ({
            id: t.id,
            title: t.title,
            organizationId: t.organizationId,
            hasKeywords: !!t.keywords,
          })));
        }
        
        // ChromaDBの状態確認
        const { shouldUseChroma } = await import('./chromaConfig');
        const useChroma = shouldUseChroma();
        console.log(`[getKnowledgeGraphContext] デバッグ: ChromaDB使用状態: ${useChroma ? '有効' : '無効'}`);
        
        if (!useChroma) {
          console.warn(`[getKnowledgeGraphContext] ⚠️ ChromaDBが無効です。ベクトル検索が実行されません。`);
          console.warn(`[getKnowledgeGraphContext] 💡 ChromaDBを有効にするには: localStorage.setItem('useChromaDB', 'true')`);
        }
        
        // フォールバック: 部分マッチした結果があれば、それを使用してコンテキストを構築
        if (matchingEntities.length > 0 || matchingRelations.length > 0 || matchingTopics.length > 0) {
          console.log(`[getKnowledgeGraphContext] 💡 フォールバック: 部分マッチした結果を使用してコンテキストを構築します`);
          
          // 部分マッチした結果からコンテキストを構築
          const fallbackContextParts: string[] = [];
          
          if (matchingEntities.length > 0) {
            fallbackContextParts.push('## 関連エンティティ（部分マッチ）');
            for (const entity of matchingEntities.slice(0, 5)) {
              const parts: string[] = [];
              parts.push(`**${entity.name}**`);
              if (entity.type) parts.push(`タイプ: ${entity.type}`);
              if (entity.metadata && Object.keys(entity.metadata).length > 0) {
                const metadataParts: string[] = [];
                for (const [key, value] of Object.entries(entity.metadata)) {
                  if (value && typeof value === 'string' && value.length < 100) {
                    metadataParts.push(`${key}: ${value}`);
                  }
                }
                if (metadataParts.length > 0) {
                  parts.push(`詳細: ${metadataParts.join(', ')}`);
                }
              }
              fallbackContextParts.push(`- ${parts.join(' | ')}`);
            }
          }
          
          if (matchingRelations.length > 0) {
            fallbackContextParts.push('\n## 関連リレーション（部分マッチ）');
            for (const relation of matchingRelations.slice(0, 5)) {
              const parts: string[] = [];
              parts.push(`**${relation.relationType}**`);
              if (relation.description) {
                const desc = relation.description.length > 200 
                  ? relation.description.substring(0, 200) + '...'
                  : relation.description;
                parts.push(`説明: ${desc}`);
              }
              fallbackContextParts.push(`- ${parts.join(' | ')}`);
            }
          }
          
          if (matchingTopics.length > 0) {
            fallbackContextParts.push('\n## 関連トピック（部分マッチ）');
            for (const topic of matchingTopics.slice(0, 5)) {
              const parts: string[] = [];
              parts.push(`**${topic.title}**`);
              if (topic.content) {
                const summary = topic.content.length > 200
                  ? topic.content.substring(0, 200) + '...'
                  : topic.content;
                parts.push(`内容: ${summary}`);
              }
              fallbackContextParts.push(`- ${parts.join(' | ')}`);
            }
          }
          
          const fallbackContext = fallbackContextParts.join('\n');
          console.log(`[getKnowledgeGraphContext] ✅ フォールバックコンテキストを生成: ${fallbackContext.length}文字`);
          return fallbackContext;
        }
      } catch (debugError) {
        console.warn(`[getKnowledgeGraphContext] デバッグ情報の取得に失敗:`, debugError);
      }
    }

    const contextParts: string[] = [];
    
    // 組織ツリーを取得（組織名の取得に使用、パフォーマンス向上のため一度だけ取得）
    let orgTree: OrgNodeData | null = null;
    try {
      orgTree = await getOrgTreeFromDb();
    } catch (error) {
      // 組織ツリー取得エラーは警告のみ（続行）
      console.warn('組織ツリーの取得に失敗しました（続行します）:', error);
    }
    
    // エンティティ情報を追加（詳細版）
    // ハイブリッド検索の結果には、ChromaDBベクトル検索とSQLiteキーワード検索の両方の情報が統合されています
    const entities = results.filter(r => r.type === 'entity' && r.entity);
    if (entities.length > 0) {
      contextParts.push('## 関連エンティティ（ハイブリッド検索結果：ChromaDBベクトル検索 + SQLiteキーワード検索）');
      for (const result of entities) {
        if (result.entity) {
          const entity = result.entity;
          const parts: string[] = [];
          
          // 基本情報
          parts.push(`**${entity.name}**`);
          
          // 別名（キーワード検索でマッチした可能性がある）
          if (entity.aliases && entity.aliases.length > 0) {
            parts.push(`別名: ${entity.aliases.join(', ')}`);
          }
          
          // タイプ
          parts.push(`タイプ: ${entity.type}`);
          
          // 組織情報を追加
          if (entity.organizationId && orgTree) {
            const orgName = findOrganizationNameById(orgTree, entity.organizationId);
            if (orgName) {
              parts.push(`組織: ${orgName}`);
            }
          }
          
          // メタデータ（詳細版 - 重要なフィールドを優先的に表示）
          if (entity.metadata && Object.keys(entity.metadata).length > 0) {
            const metadataParts: string[] = [];
            const priorityFields = ['role', 'department', 'position', 'industry', 'email', 'phone', 'website'];
            
            // 優先フィールドを先に処理
            for (const key of priorityFields) {
              if (entity.metadata[key]) {
                const value = entity.metadata[key];
                if (typeof value === 'string') {
                  // 長い値は要約（200文字まで）
                  const displayValue = value.length > 200 ? value.substring(0, 200) + '...' : value;
                  metadataParts.push(`${key}: ${displayValue}`);
                } else if (typeof value === 'number') {
                  metadataParts.push(`${key}: ${value}`);
                }
              }
            }
            
            // その他のメタデータフィールド
            for (const [key, value] of Object.entries(entity.metadata)) {
              if (!priorityFields.includes(key) && value) {
                if (typeof value === 'string') {
                  const displayValue = value.length > 150 ? value.substring(0, 150) + '...' : value;
                  metadataParts.push(`${key}: ${displayValue}`);
                } else if (typeof value !== 'object') {
                  metadataParts.push(`${key}: ${String(value)}`);
                }
              }
            }
            
            if (metadataParts.length > 0) {
              parts.push(`詳細: ${metadataParts.join(' | ')}`);
            }
          }
          
          // 日時情報（新しさの指標として）
          if (entity.updatedAt) {
            try {
              const updateDate = new Date(entity.updatedAt);
              const daysAgo = Math.floor((Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
              if (daysAgo < 30) {
                parts.push(`更新: ${daysAgo}日前`);
              } else {
                const dateStr = updateDate.toLocaleDateString('ja-JP');
                parts.push(`更新: ${dateStr}`);
              }
            } catch (error) {
              // 日付パースエラーは無視
            }
          }
          
          // スコア情報（ベクトル類似度とキーワードマッチスコアの統合スコア）
          parts.push(`関連度: ${(result.score * 100).toFixed(1)}% (類似度: ${(result.similarity * 100).toFixed(1)}%)`);
          
          contextParts.push(`- ${parts.join(' | ')}`);
        }
      }
    }

    // リレーション情報を追加（詳細版）
    // ハイブリッド検索の結果には、ChromaDBベクトル検索とSQLiteキーワード検索の両方の情報が統合されています
    const relations = results.filter(r => r.type === 'relation' && r.relation);
    if (relations.length > 0) {
      contextParts.push('\n## 関連リレーション（ハイブリッド検索結果：ChromaDBベクトル検索 + SQLiteキーワード検索）');
      for (const result of relations) {
        if (result.relation) {
          const relation = result.relation;
          const parts: string[] = [];
          
          // リレーションタイプ
          parts.push(`**${relation.relationType}**`);
          
          // 説明（長い場合は要約）
          if (relation.description) {
            const desc = relation.description.length > 300 
              ? relation.description.substring(0, 300) + '...'
              : relation.description;
            parts.push(`説明: ${desc}`);
          }
          
          // 関連エンティティ情報を取得（詳細情報も含む）
          if (relation.sourceEntityId || relation.targetEntityId) {
            try {
              const sourceEntity = relation.sourceEntityId ? await getEntityById(relation.sourceEntityId) : null;
              const targetEntity = relation.targetEntityId ? await getEntityById(relation.targetEntityId) : null;
              
              if (sourceEntity && targetEntity) {
                parts.push(`関係: ${sourceEntity.name} (${sourceEntity.type}) → ${targetEntity.name} (${targetEntity.type})`);
              } else if (sourceEntity) {
                parts.push(`起点: ${sourceEntity.name} (${sourceEntity.type})`);
              } else if (targetEntity) {
                parts.push(`終点: ${targetEntity.name} (${targetEntity.type})`);
              }
            } catch (error) {
              // エンティティ取得エラーは無視
            }
          }
          
          // 信頼度
          if (relation.confidence !== undefined) {
            const confidenceLevel = relation.confidence >= 0.8 ? '高' : relation.confidence >= 0.5 ? '中' : '低';
            parts.push(`信頼度: ${(relation.confidence * 100).toFixed(1)}% (${confidenceLevel})`);
          }
          
          // メタデータ（詳細版）
          if (relation.metadata && Object.keys(relation.metadata).length > 0) {
            const metadataParts: string[] = [];
            const priorityFields = ['date', 'amount', 'percentage', 'source'];
            
            // 優先フィールドを先に処理
            for (const key of priorityFields) {
              if (relation.metadata[key]) {
                const value = relation.metadata[key];
                if (typeof value === 'string') {
                  const displayValue = value.length > 200 ? value.substring(0, 200) + '...' : value;
                  metadataParts.push(`${key}: ${displayValue}`);
                } else if (typeof value === 'number') {
                  // 金額の場合はフォーマット
                  if (key === 'amount') {
                    metadataParts.push(`${key}: ¥${value.toLocaleString()}`);
                  } else if (key === 'percentage') {
                    metadataParts.push(`${key}: ${value}%`);
                  } else {
                    metadataParts.push(`${key}: ${value}`);
                  }
                }
              }
            }
            
            // その他のメタデータ
            for (const [key, value] of Object.entries(relation.metadata)) {
              if (!priorityFields.includes(key) && value) {
                if (typeof value === 'string') {
                  const displayValue = value.length > 150 ? value.substring(0, 150) + '...' : value;
                  metadataParts.push(`${key}: ${displayValue}`);
                } else if (typeof value !== 'object') {
                  metadataParts.push(`${key}: ${String(value)}`);
                }
              }
            }
            
            if (metadataParts.length > 0) {
              parts.push(`詳細: ${metadataParts.join(' | ')}`);
            }
          }
          
          // 組織情報
          if (relation.organizationId && orgTree) {
            const orgName = findOrganizationNameById(orgTree, relation.organizationId);
            if (orgName) {
              parts.push(`組織: ${orgName}`);
            }
          }
          
          // 日時情報
          if (relation.updatedAt) {
            try {
              const updateDate = new Date(relation.updatedAt);
              const daysAgo = Math.floor((Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
              if (daysAgo < 30) {
                parts.push(`更新: ${daysAgo}日前`);
              }
            } catch (error) {
              // 日付パースエラーは無視
            }
          }
          
          // スコア情報
          parts.push(`関連度: ${(result.score * 100).toFixed(1)}% (類似度: ${(result.similarity * 100).toFixed(1)}%)`);
          
          contextParts.push(`- ${parts.join(' | ')}`);
        }
      }
    }

    // トピック情報を追加（詳細版）
    // ハイブリッド検索の結果には、ChromaDBベクトル検索とSQLiteキーワード検索の両方の情報が統合されています
    const topics = results.filter(r => r.type === 'topic');
    if (topics.length > 0) {
      contextParts.push('\n## 関連トピック（ハイブリッド検索結果：ChromaDBベクトル検索 + SQLiteキーワード検索）');
      for (const result of topics) {
        if (result.meetingNoteId && result.topicId) {
          try {
            // トピックの詳細情報を取得
            const topicInfos = await getTopicsByMeetingNote(result.meetingNoteId);
            const topicInfo = topicInfos.find(t => t.id === result.topicId);
            
            if (topicInfo) {
              const parts: string[] = [];
              parts.push(`**${topicInfo.title}**`);
              
              // 出典情報を追加（AIが出典を把握しやすくするため）
              if (topicInfo.meetingNoteTitle) {
                parts.push(`出典: ${topicInfo.meetingNoteTitle}`);
              }
              
              // 組織名を追加（あれば）
              if (topicInfo.organizationId && orgTree) {
                const orgName = findOrganizationNameById(orgTree, topicInfo.organizationId);
                if (orgName) {
                  parts.push(`組織: ${orgName}`);
                }
              }
              
              // 日付情報を追加（あれば）
              if (topicInfo.topicDate) {
                try {
                  const dateStr = new Date(topicInfo.topicDate).toLocaleDateString('ja-JP');
                  parts.push(`日時: ${dateStr}`);
                } catch (error) {
                  // 日付のパースエラーは無視
                  console.warn('日付のパースエラー:', error);
                }
              }
              
              // 内容のサマリー（contentSummaryを優先的に使用、なければcontentから生成）
              if (topicInfo.contentSummary) {
                // contentSummaryを優先的に使用（既に200文字程度に要約されている）
                parts.push(`内容: ${topicInfo.contentSummary}`);
              } else if (topicInfo.content) {
                // contentSummaryがない場合は、contentから生成（最初の200文字）
                const summary = topicInfo.content.length > 200
                  ? topicInfo.content.substring(0, 200) + '...'
                  : topicInfo.content;
                parts.push(`内容: ${summary}`);
              }
              
              // セマンティックカテゴリ
              if (topicInfo.semanticCategory) {
                parts.push(`カテゴリ: ${topicInfo.semanticCategory}`);
              }
              
              // 重要度
              if (topicInfo.importance) {
                parts.push(`重要度: ${topicInfo.importance}`);
              }
              
              // キーワード
              if (topicInfo.keywords && topicInfo.keywords.length > 0) {
                const keywords = Array.isArray(topicInfo.keywords) 
                  ? topicInfo.keywords.join(', ')
                  : topicInfo.keywords;
                parts.push(`キーワード: ${keywords}`);
              }
              
              // 日時情報（新しさの指標として）
              if (topicInfo.topicDate) {
                try {
                  const topicDate = new Date(topicInfo.topicDate);
                  const daysAgo = Math.floor((Date.now() - topicDate.getTime()) / (1000 * 60 * 60 * 24));
                  if (daysAgo < 30) {
                    parts.push(`日時: ${daysAgo}日前`);
                  }
                } catch (error) {
                  // 日付パースエラーは無視
                }
              }
              
              // スコア情報
              parts.push(`関連度: ${(result.score * 100).toFixed(1)}% (類似度: ${(result.similarity * 100).toFixed(1)}%)`);
              
              contextParts.push(`- ${parts.join(' | ')}`);
            } else {
              // トピック情報が取得できない場合は基本情報のみ
              contextParts.push(`- トピックID: ${result.topicId} (議事録ID: ${result.meetingNoteId}) | 関連度: ${(result.score * 100).toFixed(1)}%`);
            }
          } catch (error) {
            // エラー時は基本情報のみ
            console.warn(`トピック ${result.topicId} の詳細取得エラー:`, error);
            contextParts.push(`- トピックID: ${result.topicId} (議事録ID: ${result.meetingNoteId}) | 関連度: ${(result.score * 100).toFixed(1)}%`);
          }
        } else {
          contextParts.push(`- トピックID: ${result.topicId} | 関連度: ${(result.score * 100).toFixed(1)}%`);
        }
      }
    }

    // コンテキスト最適化を適用（トークン制限内で優先情報を選択）
    let finalResults = results;
    try {
      const optimizationConfig: ContextOptimizationConfig = {
        ...DEFAULT_OPTIMIZATION_CONFIG,
        maxTokens,
      };
      finalResults = optimizeContext(results, optimizationConfig);
      console.log(`[getKnowledgeGraphContext] コンテキスト最適化: ${results.length}件 → ${finalResults.length}件`);
    } catch (optimizationError) {
      console.warn('[getKnowledgeGraphContext] コンテキスト最適化エラー（続行）:', optimizationError);
      // エラーが発生しても元の結果を使用
    }
    
    // 最適化後の結果でコンテキストを再構築（既存のロジックを使用）
    // ただし、最適化後の結果のみを使用
    const optimizedEntities = finalResults.filter(r => r.type === 'entity' && r.entity);
    const optimizedRelations = finalResults.filter(r => r.type === 'relation' && r.relation);
    const optimizedTopics = finalResults.filter(r => r.type === 'topic');
    
    // 既存のコンテキスト構築ロジックを使用（最適化後の結果でフィルタリング）
    const optimizedContextParts: string[] = [];
    
    // エンティティ情報（最適化後の結果のみ）
    if (optimizedEntities.length > 0) {
      optimizedContextParts.push('## 関連エンティティ（最適化済み）');
      for (const result of optimizedEntities) {
        if (result.entity) {
          const entity = result.entity;
          const parts: string[] = [];
          parts.push(`**${entity.name}**`);
          if (entity.aliases && entity.aliases.length > 0) {
            parts.push(`別名: ${entity.aliases.join(', ')}`);
          }
          parts.push(`タイプ: ${entity.type}`);
          if (entity.organizationId && orgTree) {
            const orgName = findOrganizationNameById(orgTree, entity.organizationId);
            if (orgName) {
              parts.push(`組織: ${orgName}`);
            }
          }
          if (entity.metadata && Object.keys(entity.metadata).length > 0) {
            const metadataParts: string[] = [];
            const priorityFields = ['role', 'department', 'position', 'industry'];
            for (const key of priorityFields) {
              if (entity.metadata[key]) {
                const value = entity.metadata[key];
                if (typeof value === 'string') {
                  const displayValue = value.length > 100 ? value.substring(0, 100) + '...' : value;
                  metadataParts.push(`${key}: ${displayValue}`);
                }
              }
            }
            if (metadataParts.length > 0) {
              parts.push(`詳細: ${metadataParts.join(' | ')}`);
            }
          }
          parts.push(`関連度: ${(result.score * 100).toFixed(1)}%`);
          optimizedContextParts.push(`- ${parts.join(' | ')}`);
        }
      }
    }
    
    // リレーション情報（最適化後の結果のみ）
    if (optimizedRelations.length > 0) {
      optimizedContextParts.push('\n## 関連リレーション（最適化済み）');
      for (const result of optimizedRelations) {
        if (result.relation) {
          const relation = result.relation;
          const parts: string[] = [];
          parts.push(`**${relation.relationType}**`);
          if (relation.description) {
            const desc = relation.description.length > 200 
              ? relation.description.substring(0, 200) + '...'
              : relation.description;
            parts.push(`説明: ${desc}`);
          }
          if (relation.confidence !== undefined) {
            parts.push(`信頼度: ${(relation.confidence * 100).toFixed(1)}%`);
          }
          parts.push(`関連度: ${(result.score * 100).toFixed(1)}%`);
          optimizedContextParts.push(`- ${parts.join(' | ')}`);
        }
      }
    }
    
    // トピック情報（最適化後の結果のみ）
    if (optimizedTopics.length > 0) {
      optimizedContextParts.push('\n## 関連トピック（最適化済み）');
      for (const result of optimizedTopics) {
        if (result.meetingNoteId && result.topicId) {
          try {
            const topicInfos = await getTopicsByMeetingNote(result.meetingNoteId);
            const topicInfo = topicInfos.find(t => t.id === result.topicId);
            if (topicInfo) {
              const parts: string[] = [];
              parts.push(`**${topicInfo.title}**`);
              // contentSummaryを優先的に使用（既に200文字程度に要約されている）
              if (topicInfo.contentSummary) {
                parts.push(`内容: ${topicInfo.contentSummary}`);
              } else if (topicInfo.content) {
                // contentSummaryがない場合は、contentから生成（最初の200文字）
                const summary = topicInfo.content.length > 200
                  ? topicInfo.content.substring(0, 200) + '...'
                  : topicInfo.content;
                parts.push(`内容: ${summary}`);
              }
              parts.push(`関連度: ${(result.score * 100).toFixed(1)}%`);
              optimizedContextParts.push(`- ${parts.join(' | ')}`);
            }
          } catch (error) {
            optimizedContextParts.push(`- トピックID: ${result.topicId} | 関連度: ${(result.score * 100).toFixed(1)}%`);
          }
        }
      }
    }
    
    // 最適化後のコンテキストを使用（最適化が適用された場合）
    const finalContext = optimizedContextParts.length > 0 
      ? optimizedContextParts.join('\n')
      : contextParts.join('\n');
    
    console.log(`[getKnowledgeGraphContext] AIアシスタント用コンテキスト生成完了: ${finalContext.length}文字`);
    
    return finalContext;
  } catch (error) {
    console.error('[getKnowledgeGraphContext] コンテキスト取得エラー:', error);
    return '';
  }
}

/**
 * 統合RAGコンテキストを取得
 * ナレッジグラフ + システム設計ドキュメントを統合
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 各タイプごとの最大結果数（デフォルト: 5）
 * @param filters フィルタリング条件（オプション）
 * @returns 統合RAGコンテキスト文字列
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
  const contextParts: string[] = [];
  
  // システム設計に関する質問かどうかを判定
  const isDesignQuery = isDesignDocQuery(queryText);
  
  // 1. システム設計ドキュメント（優先度を調整）
  if (isDesignQuery || filters?.includeDesignDocs !== false) {
    try {
      const designContext = await getDesignDocContext(
        queryText,
        isDesignQuery ? 5 : 2, // システム設計質問の場合は多めに取得
        2000, // トークン制限
        {
          sectionId: filters?.designDocSectionId,
        }
      );
      if (designContext) {
        contextParts.push(isDesignQuery 
          ? '## システム設計ドキュメント（優先情報）'
          : '## システム設計ドキュメント（参考）'
        );
        contextParts.push(designContext);
      }
    } catch (error) {
      console.warn('システム設計ドキュメントコンテキスト取得エラー:', error);
      // エラーが発生しても続行
    }
  }
  
  // 2. ナレッジグラフ情報（既存）
  try {
    const kgContext = await getKnowledgeGraphContext(
      queryText,
      isDesignQuery ? 3 : limit, // システム設計質問の場合は少なめに
      {
        organizationId: filters?.organizationId,
      }
    );
    if (kgContext) {
      contextParts.push(isDesignQuery 
        ? '\n## 関連するナレッジグラフ情報（補足）'
        : '\n## 関連するナレッジグラフ情報'
      );
      contextParts.push(kgContext);
    }
  } catch (error) {
    console.warn('ナレッジグラフコンテキスト取得エラー:', error);
    // エラーが発生しても続行
  }
  
  return contextParts.join('\n');
}

/**
 * 検索頻度を更新（バックグラウンドで非同期実行）
 * 検索結果に含まれるエンティティ、リレーション、トピックのsearchCountとlastSearchDateを更新
 */
async function updateSearchFrequency(results: KnowledgeGraphSearchResult[]): Promise<void> {
  if (results.length === 0) {
    return;
  }

  try {
    const { callTauriCommand } = await import('./localFirebase');
    const now = new Date().toISOString();
    
    // エンティティ、リレーション、トピックのIDを収集
    const entityIds: string[] = [];
    const relationIds: string[] = [];
    const topicIds: string[] = [];
    
    for (const result of results) {
      if (result.type === 'entity' && result.id) {
        entityIds.push(result.id);
      } else if (result.type === 'relation' && result.id) {
        relationIds.push(result.id);
      } else if (result.type === 'topic' && result.topicId) {
        // topicsテーブルのIDは`{meetingNoteId}-topic-{topicId}`形式
        // ただし、topicIdのみで更新する場合は、SQLiteでtopicIdで検索する必要がある
        topicIds.push(result.topicId);
      }
    }
    
    // バッチ更新（非同期、エラーが発生しても続行）
    const updatePromises: Promise<void>[] = [];
    
    // エンティティの検索頻度を更新
    for (const entityId of entityIds) {
      updatePromises.push(
        (async () => {
          try {
            // 現在の値を取得
            const currentDoc = await callTauriCommand('doc_get', {
              collectionName: 'entities',
              docId: entityId,
            }) as { exists: boolean; data?: any };
            
            if (currentDoc.exists && currentDoc.data) {
              const currentSearchCount = typeof currentDoc.data.searchCount === 'number' 
                ? currentDoc.data.searchCount 
                : 0;
              
              // インクリメントして更新
              await callTauriCommand('doc_update', {
                collectionName: 'entities',
                docId: entityId,
                data: {
                  lastSearchDate: now,
                  searchCount: currentSearchCount + 1,
                },
              });
            }
          } catch (error) {
            console.warn(`[updateSearchFrequency] エンティティ ${entityId} の更新エラー:`, error);
          }
        })()
      );
    }
    
    // リレーションの検索頻度を更新
    for (const relationId of relationIds) {
      updatePromises.push(
        (async () => {
          try {
            // 現在の値を取得
            const currentDoc = await callTauriCommand('doc_get', {
              collectionName: 'relations',
              docId: relationId,
            }) as { exists: boolean; data?: any };
            
            if (currentDoc.exists && currentDoc.data) {
              const currentSearchCount = typeof currentDoc.data.searchCount === 'number' 
                ? currentDoc.data.searchCount 
                : 0;
              
              // インクリメントして更新
              await callTauriCommand('doc_update', {
                collectionName: 'relations',
                docId: relationId,
                data: {
                  lastSearchDate: now,
                  searchCount: currentSearchCount + 1,
                },
              });
            }
          } catch (error) {
            console.warn(`[updateSearchFrequency] リレーション ${relationId} の更新エラー:`, error);
          }
        })()
      );
    }
    
    // トピックの検索頻度を更新（topicIdで検索してから更新）
    for (const topicId of topicIds) {
      updatePromises.push(
        (async () => {
          try {
            // topicIdでトピックを検索
            const topicResult = await callTauriCommand('query_get', {
              collectionName: 'topics',
              conditions: { topicId },
            });
            
            const items = (topicResult || []) as Array<{id: string; data: any}>;
            if (items.length > 0) {
              const topicDocId = items[0].id; // topicsテーブルのID（{meetingNoteId}-topic-{topicId}形式）
              const currentSearchCount = typeof items[0].data?.searchCount === 'number' 
                ? items[0].data.searchCount 
                : 0;
              
              // インクリメントして更新
              await callTauriCommand('doc_update', {
                collectionName: 'topics',
                docId: topicDocId,
                data: {
                  lastSearchDate: now,
                  searchCount: currentSearchCount + 1,
                },
              });
            }
          } catch (error) {
            console.warn(`[updateSearchFrequency] トピック ${topicId} の更新エラー:`, error);
          }
        })()
      );
    }
    
    // すべての更新を並列実行（エラーが発生しても続行）
    await Promise.allSettled(updatePromises);
    console.log(`[updateSearchFrequency] 検索頻度を更新しました: エンティティ=${entityIds.length}件, リレーション=${relationIds.length}件, トピック=${topicIds.length}件`);
  } catch (error) {
    console.warn('[updateSearchFrequency] 検索頻度更新エラー:', error);
  }
}
