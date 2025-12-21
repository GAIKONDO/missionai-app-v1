/**
 * コンテキスト生成
 * RAG用のコンテキストを生成する機能
 */

import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { KnowledgeGraphSearchResult, KnowledgeGraphContextResult, SearchFilters } from './types';
import { searchKnowledgeGraph } from './searchKnowledgeGraph';
import { getEntitiesByIds } from '../entityApi';

/**
 * RAG用のコンテキストを取得
 * クエリに関連するエンティティ、リレーション、トピックの情報を取得してコンテキストとして返す
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 各タイプごとの最大結果数（デフォルト: 5）
 * @param filters フィルタリング条件（オプション）
 * @param maxTokens 最大トークン数（デフォルト: 3000）
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
        const { getDesignDocContext } = await import('../designDocRAG');
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
 * クエリに関連するエンティティを検索
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

