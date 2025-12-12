/**
 * データ品質管理システム
 * ChromaDBとSQLiteの整合性チェック、埋め込みベクトルの有効性検証
 */

import { callTauriCommand } from './localFirebase';
import { shouldUseChroma } from './chromaConfig';

// データ品質レポート
export interface DataQualityReport {
  totalEntities: number;
  entitiesWithEmbeddings: number;
  entitiesWithoutEmbeddings: number;
  chromaDbSyncStatus: 'synced' | 'partial' | 'outdated' | 'not_used';
  inconsistencies: Array<{
    type: 'missing_embedding' | 'version_mismatch' | 'orphaned_data' | 'chromadb_missing';
    entityId?: string;
    relationId?: string;
    topicId?: string;
    details: string;
  }>;
  qualityScore: number; // 0-100
  timestamp: Date;
}

// 埋め込みバージョン情報
const CURRENT_EMBEDDING_VERSION = '1.0';
const CURRENT_EMBEDDING_MODEL = 'text-embedding-3-small';
const EXPECTED_EMBEDDING_DIMENSION = 1536;

/**
 * データ品質レポートを生成
 */
export async function checkDataQuality(
  organizationId?: string
): Promise<DataQualityReport> {
  const inconsistencies: DataQualityReport['inconsistencies'] = [];
  let totalEntities = 0;
  let entitiesWithEmbeddings = 0;
  let chromaDbSyncStatus: DataQualityReport['chromaDbSyncStatus'] = 'not_used';

  try {
    // 1. エンティティの取得
    const entitiesConditions: any = {};
    if (organizationId) {
      entitiesConditions.organizationId = organizationId;
    }

    const entitiesResult = await callTauriCommand('query_get', {
      collectionName: 'entities',
      conditions: entitiesConditions,
    });

    const entities = (entitiesResult || []) as Array<{ id: string; data: any }>;
    totalEntities = entities.length;

    // 2. 埋め込みベクトルの確認
    const embeddingConditions: any = {};
    if (organizationId) {
      embeddingConditions.organizationId = organizationId;
    }

    // 埋め込みベクトルの確認（ChromaDBから取得）
    // 注意: 埋め込みデータはChromaDBにのみ保存されるため、SQLiteのentityEmbeddingsテーブルは使用しない
    const embeddingEntityIds = new Set<string>();
    
    if (shouldUseChroma()) {
      // ChromaDBが有効な場合、各エンティティについて埋め込みの存在を確認
      // 注意: 全件取得はパフォーマンスの問題があるため、簡易的にentitiesテーブルのchromaSyncedカラムを確認
      for (const entity of entities) {
        const entityId = entity.data?.id || entity.id;
        const chromaSynced = entity.data?.chromaSynced === 1 || entity.data?.chromaSynced === true;
        if (chromaSynced) {
          embeddingEntityIds.add(entityId);
        }
      }
    } else {
      // ChromaDBが無効な場合、埋め込みデータは存在しない
      console.warn('⚠️ ChromaDBが無効です。エンティティ埋め込みの確認はできません。');
    }

    entitiesWithEmbeddings = entities.filter(e => {
      const entityId = e.data?.id || e.id;
      return embeddingEntityIds.has(entityId);
    }).length;

    // 3. 埋め込みがないエンティティを検出
    for (const entity of entities) {
      const entityId = entity.data?.id || entity.id;
      if (!embeddingEntityIds.has(entityId)) {
        inconsistencies.push({
          type: 'missing_embedding',
          entityId,
          details: `エンティティ "${entity.data?.name || entityId}" に埋め込みベクトルがありません`,
        });
      }
    }

    // 4. ChromaDBの同期状況を確認
    if (shouldUseChroma() && organizationId) {
      try {
        const { countEntitiesInChroma } = await import('./entityEmbeddingsChroma');
        const chromaCount = await countEntitiesInChroma(organizationId);
        const sqliteCount = entitiesWithEmbeddings;

        if (chromaCount === 0 && sqliteCount > 0) {
          chromaDbSyncStatus = 'outdated';
          inconsistencies.push({
            type: 'chromadb_missing',
            details: `ChromaDBにエンティティが同期されていません（SQLite: ${sqliteCount}件、ChromaDB: 0件）`,
          });
        } else if (chromaCount < sqliteCount) {
          chromaDbSyncStatus = 'partial';
          inconsistencies.push({
            type: 'chromadb_missing',
            details: `ChromaDBの同期が不完全です（SQLite: ${sqliteCount}件、ChromaDB: ${chromaCount}件）`,
          });
        } else if (chromaCount === sqliteCount && sqliteCount > 0) {
          chromaDbSyncStatus = 'synced';
        }
      } catch (error) {
        console.warn('[DataQuality] ChromaDB確認エラー:', error);
        chromaDbSyncStatus = 'outdated';
      }
    }

    // 5. 埋め込みバージョンの確認
    // 注意: 埋め込みデータはChromaDBに保存されているため、全件取得はパフォーマンスの問題がある
    // バージョンチェックは個別の埋め込み取得時に実行されるため、ここではスキップ
    // 必要に応じて、ChromaDBから取得したデータに対してバージョンチェックを実行する
    // （現在は簡易的なチェックのみ）

    // 6. 品質スコアを計算（0-100）
    const missingEmbeddingRate = (totalEntities - entitiesWithEmbeddings) / Math.max(totalEntities, 1);
    const inconsistencyRate = inconsistencies.length / Math.max(totalEntities, 1);
    const qualityScore = Math.max(0, Math.min(100, 
      100 - (missingEmbeddingRate * 50) - (inconsistencyRate * 30) - (chromaDbSyncStatus === 'synced' ? 0 : 20)
    ));

    return {
      totalEntities,
      entitiesWithEmbeddings,
      entitiesWithoutEmbeddings: totalEntities - entitiesWithEmbeddings,
      chromaDbSyncStatus,
      inconsistencies,
      qualityScore,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('[DataQuality] データ品質チェックエラー:', error);
    throw error;
  }
}

/**
 * リレーションのデータ品質をチェック
 */
export async function checkRelationDataQuality(
  organizationId?: string
): Promise<{
  totalRelations: number;
  relationsWithEmbeddings: number;
  inconsistencies: Array<{
    type: string;
    relationId: string;
    details: string;
  }>;
}> {
  const inconsistencies: Array<{ type: string; relationId: string; details: string }> = [];

  try {
    // リレーションの取得
    const relationsConditions: any = {};
    if (organizationId) {
      relationsConditions.organizationId = organizationId;
    }

    const relationsResult = await callTauriCommand('query_get', {
      collectionName: 'relations',
      conditions: relationsConditions,
    });

    const relations = (relationsResult || []) as Array<{ id: string; data: any }>;
    const totalRelations = relations.length;

    // 埋め込みベクトルの確認（ChromaDBから取得）
    // 注意: 埋め込みデータはChromaDBにのみ保存されるため、SQLiteのrelationEmbeddingsテーブルは使用しない
    const embeddingRelationIds = new Set<string>();
    
    if (shouldUseChroma()) {
      // ChromaDBが有効な場合、各リレーションについて埋め込みの存在を確認
      // 注意: 全件取得はパフォーマンスの問題があるため、簡易的にrelationsテーブルのchromaSyncedカラムを確認
      for (const relation of relations) {
        const relationId = relation.data?.id || relation.id;
        const chromaSynced = relation.data?.chromaSynced === 1 || relation.data?.chromaSynced === true;
        if (chromaSynced) {
          embeddingRelationIds.add(relationId);
        }
      }
    } else {
      // ChromaDBが無効な場合、埋め込みデータは存在しない
      console.warn('⚠️ ChromaDBが無効です。リレーション埋め込みの確認はできません。');
    }

    const relationsWithEmbeddings = relations.filter(r => {
      const relationId = r.data?.id || r.id;
      return embeddingRelationIds.has(relationId);
    }).length;

    // 埋め込みがないリレーションを検出
    for (const relation of relations) {
      const relationId = relation.data?.id || relation.id;
      if (!embeddingRelationIds.has(relationId)) {
        inconsistencies.push({
          type: 'missing_embedding',
          relationId,
          details: `リレーション "${relation.data?.relationType || relationId}" に埋め込みベクトルがありません`,
        });
      }
    }

    return {
      totalRelations,
      relationsWithEmbeddings,
      inconsistencies,
    };
  } catch (error) {
    console.error('[DataQuality] リレーションデータ品質チェックエラー:', error);
    throw error;
  }
}

/**
 * トピックのデータ品質をチェック
 */
export async function checkTopicDataQuality(
  organizationId?: string
): Promise<{
  totalTopics: number;
  topicsWithEmbeddings: number;
  inconsistencies: Array<{
    type: string;
    topicId: string;
    details: string;
  }>;
}> {
  const inconsistencies: Array<{ type: string; topicId: string; details: string }> = [];

  try {
    // トピックの取得（topicsテーブルから）
    const conditions: any = {};
    if (organizationId) {
      conditions.organizationId = organizationId;
    }

    const topicsResult = await callTauriCommand('query_get', {
      collectionName: 'topics',
      conditions,
    });

    const topics = (topicsResult || []) as Array<{ id: string; data: any }>;
    const totalTopics = topics.length;

    // 埋め込みベクトルの有効性を確認
    let topicsWithEmbeddings = 0;
    for (const topic of topics) {
      const topicData = topic.data || topic;
      const combinedEmbedding = topicData.combinedEmbedding;

      if (combinedEmbedding) {
        try {
          // 埋め込みベクトルをパース
          const embedding = typeof combinedEmbedding === 'string' 
            ? JSON.parse(combinedEmbedding) 
            : combinedEmbedding;

          if (Array.isArray(embedding) && embedding.length === EXPECTED_EMBEDDING_DIMENSION) {
            topicsWithEmbeddings++;
          } else {
            inconsistencies.push({
              type: 'missing_embedding',
              topicId: topicData.topicId || topic.id,
              details: `埋め込みベクトルの次元数が不正です（期待値: ${EXPECTED_EMBEDDING_DIMENSION}, 実際: ${Array.isArray(embedding) ? embedding.length : 0}）`,
            });
          }
        } catch (error) {
          inconsistencies.push({
            type: 'missing_embedding',
            topicId: topicData.topicId || topic.id,
            details: `埋め込みベクトルのパースに失敗しました: ${error}`,
          });
        }
      } else {
        inconsistencies.push({
          type: 'missing_embedding',
          topicId: topicData.topicId || topic.id,
          details: '埋め込みベクトルが存在しません',
        });
      }
    }

    return {
      totalTopics,
      topicsWithEmbeddings,
      inconsistencies,
    };
  } catch (error) {
    console.error('[DataQuality] トピックデータ品質チェックエラー:', error);
    throw error;
  }
}

/**
 * 統合データ品質レポートを生成
 */
export async function generateComprehensiveQualityReport(
  organizationId?: string
): Promise<{
  entities: DataQualityReport;
  relations: Awaited<ReturnType<typeof checkRelationDataQuality>>;
  topics: Awaited<ReturnType<typeof checkTopicDataQuality>>;
  overallQualityScore: number;
}> {
  const [entitiesReport, relationsReport, topicsReport] = await Promise.all([
    checkDataQuality(organizationId),
    checkRelationDataQuality(organizationId),
    checkTopicDataQuality(organizationId),
  ]);

  // 全体の品質スコアを計算
  const entityQuality = entitiesReport.qualityScore;
  const relationQuality = relationsReport.totalRelations > 0
    ? (relationsReport.relationsWithEmbeddings / relationsReport.totalRelations) * 100
    : 100;
  const topicQuality = topicsReport.totalTopics > 0
    ? (topicsReport.topicsWithEmbeddings / topicsReport.totalTopics) * 100
    : 100;

  const overallQualityScore = (
    entityQuality * 0.5 + 
    relationQuality * 0.3 + 
    topicQuality * 0.2
  );

  return {
    entities: entitiesReport,
    relations: relationsReport,
    topics: topicsReport,
    overallQualityScore,
  };
}
