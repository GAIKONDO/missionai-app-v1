/**
 * ナレッジグラフ統合RAG検索
 * エンティティ、リレーション、トピックを統合して検索する機能を提供
 */

import { findSimilarEntitiesHybrid } from './entityEmbeddings';
import { findSimilarRelationsHybrid } from './relationEmbeddings';
import { findSimilarTopicsHybrid } from './topicEmbeddings';
import { getEntityById } from './entityApi';
import { getRelationById } from './relationApi';
import { getTopicsByMeetingNote } from './orgApi';
import { getCachedSearchResults, setCachedSearchResults } from './ragSearchCache';
import { getDesignDocContext, isDesignDocQuery } from './designDocRAG';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';

/**
 * 検索結果の種類
 */
export type SearchResultType = 'entity' | 'relation' | 'topic';

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
    useCache: boolean = true
  ): Promise<KnowledgeGraphSearchResult[]> {
  const startTime = Date.now();
  let usedChromaDB = false;
  
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

    // 並列で各タイプを検索
    const [entityResults, relationResults, topicResults] = await Promise.all([
      // エンティティ検索
      findSimilarEntitiesHybrid(
        queryText,
        limit,
        {
          organizationId: filters?.organizationId,
          entityType: filters?.entityType,
        }
      ).catch(error => {
        console.warn('エンティティ検索エラー:', error);
        return [];
      }),
      
      // リレーション検索
      findSimilarRelationsHybrid(
        queryText,
        limit,
        {
          organizationId: filters?.organizationId,
          relationType: filters?.relationType,
        }
      ).catch(error => {
        console.warn('リレーション検索エラー:', error);
        return [];
      }),
      
      // トピック検索
      findSimilarTopicsHybrid(
        queryText,
        limit,
        {
          organizationId: filters?.organizationId,
          semanticCategory: filters?.topicSemanticCategory as any,
        }
      ).catch(error => {
        console.warn('トピック検索エラー:', error);
        return [];
      }),
    ]);

    // 結果を統合
    const results: KnowledgeGraphSearchResult[] = [];

    // エンティティ結果を追加（日付フィルター適用）
    for (const result of entityResults) {
      try {
        const entity = await getEntityById(result.entityId);
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
            results.push({
              type: 'entity',
              id: result.entityId,
              score: result.score,
              similarity: result.similarity,
              entity,
            });
          }
        }
      } catch (error) {
        console.warn(`エンティティ ${result.entityId} の取得エラー:`, error);
      }
    }

    // リレーション結果を追加（日付フィルター適用）
    for (const result of relationResults) {
      try {
        const relation = await getRelationById(result.relationId);
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
            results.push({
              type: 'relation',
              id: result.relationId,
              score: result.score,
              similarity: result.similarity,
              relation,
            });
          }
        }
      } catch (error) {
        console.warn(`リレーション ${result.relationId} の取得エラー:`, error);
      }
    }

    // トピック結果を追加
    for (const result of topicResults) {
      results.push({
        type: 'topic',
        id: result.topicId,
        score: result.score,
        similarity: result.similarity,
        topicId: result.topicId,
        meetingNoteId: result.meetingNoteId,
      });
    }

    // スコアでソートして返す
    const sortedResults = results.sort((a, b) => b.score - a.score);
    
    const responseTime = Date.now() - startTime;
    
    // ChromaDB使用状況を判定（エンティティ、リレーション、トピックのいずれかでChromaDBが使用されたか）
    usedChromaDB = useChroma && (filters?.organizationId !== undefined);
    
    console.log(`[searchKnowledgeGraph] 検索完了: エンティティ=${entityResults.length}件, リレーション=${relationResults.length}件, トピック=${topicResults.length}件, 統合結果=${results.length}件, 応答時間=${responseTime}ms`);
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
export async function getKnowledgeGraphContext(
  queryText: string,
  limit: number = 5,
  filters?: {
    organizationId?: string;
    entityType?: string;
    relationType?: string;
    topicSemanticCategory?: string;
  }
): Promise<string> {
  try {
    const results = await searchKnowledgeGraph(queryText, limit, filters);

    const contextParts: string[] = [];
    
    // エンティティ情報を追加（詳細版）
    const entities = results.filter(r => r.type === 'entity' && r.entity);
    if (entities.length > 0) {
      contextParts.push('## 関連エンティティ');
      for (const result of entities) {
        if (result.entity) {
          const entity = result.entity;
          const parts: string[] = [];
          
          // 基本情報
          parts.push(`**${entity.name}**`);
          
          // 別名
          if (entity.aliases && entity.aliases.length > 0) {
            parts.push(`別名: ${entity.aliases.join(', ')}`);
          }
          
          // タイプ
          parts.push(`タイプ: ${entity.type}`);
          
          // メタデータ（重要な情報のみ）
          if (entity.metadata && Object.keys(entity.metadata).length > 0) {
            const metadataParts: string[] = [];
            for (const [key, value] of Object.entries(entity.metadata)) {
              if (value && typeof value === 'string' && value.length < 100) {
                metadataParts.push(`${key}: ${value}`);
              }
            }
            if (metadataParts.length > 0) {
              parts.push(`メタデータ: ${metadataParts.join(', ')}`);
            }
          }
          
          // スコア情報
          parts.push(`関連度: ${(result.score * 100).toFixed(1)}%`);
          
          contextParts.push(`- ${parts.join(' | ')}`);
        }
      }
    }

    // リレーション情報を追加（詳細版）
    const relations = results.filter(r => r.type === 'relation' && r.relation);
    if (relations.length > 0) {
      contextParts.push('\n## 関連リレーション');
      for (const result of relations) {
        if (result.relation) {
          const relation = result.relation;
          const parts: string[] = [];
          
          // リレーションタイプ
          parts.push(`**${relation.relationType}**`);
          
          // 説明
          if (relation.description) {
            parts.push(`説明: ${relation.description}`);
          }
          
          // 関連エンティティ情報を取得
          if (relation.sourceEntityId || relation.targetEntityId) {
            try {
              const sourceEntity = relation.sourceEntityId ? await getEntityById(relation.sourceEntityId) : null;
              const targetEntity = relation.targetEntityId ? await getEntityById(relation.targetEntityId) : null;
              
              if (sourceEntity && targetEntity) {
                parts.push(`関係: ${sourceEntity.name} → ${targetEntity.name}`);
              } else if (sourceEntity) {
                parts.push(`起点: ${sourceEntity.name}`);
              } else if (targetEntity) {
                parts.push(`終点: ${targetEntity.name}`);
              }
            } catch (error) {
              // エンティティ取得エラーは無視
            }
          }
          
          // 信頼度
          if (relation.confidence !== undefined) {
            parts.push(`信頼度: ${(relation.confidence * 100).toFixed(1)}%`);
          }
          
          // メタデータ
          if (relation.metadata && Object.keys(relation.metadata).length > 0) {
            const metadataParts: string[] = [];
            for (const [key, value] of Object.entries(relation.metadata)) {
              if (value && typeof value === 'string' && value.length < 100) {
                metadataParts.push(`${key}: ${value}`);
              }
            }
            if (metadataParts.length > 0) {
              parts.push(`メタデータ: ${metadataParts.join(', ')}`);
            }
          }
          
          // スコア情報
          parts.push(`関連度: ${(result.score * 100).toFixed(1)}%`);
          
          contextParts.push(`- ${parts.join(' | ')}`);
        }
      }
    }

    // トピック情報を追加（詳細版）
    const topics = results.filter(r => r.type === 'topic');
    if (topics.length > 0) {
      contextParts.push('\n## 関連トピック');
      for (const result of topics) {
        if (result.meetingNoteId && result.topicId) {
          try {
            // トピックの詳細情報を取得
            const topicInfos = await getTopicsByMeetingNote(result.meetingNoteId);
            const topicInfo = topicInfos.find(t => t.id === result.topicId);
            
            if (topicInfo) {
              const parts: string[] = [];
              parts.push(`**${topicInfo.title}**`);
              
              // 内容のサマリー（最初の200文字）
              if (topicInfo.content) {
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
              
              // スコア情報
              parts.push(`関連度: ${(result.score * 100).toFixed(1)}%`);
              
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

    return contextParts.join('\n');
  } catch (error) {
    console.error('コンテキスト取得エラー:', error);
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
