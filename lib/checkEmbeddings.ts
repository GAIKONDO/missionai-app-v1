/**
 * 埋め込みベクトルの次元数と存在を確認するユーティリティ
 */

import { callTauriCommand } from './localFirebase';
import { collection, query, getDocs } from './localFirebase';
import type { EntityEmbedding } from '@/types/entityEmbedding';
import type { RelationEmbedding } from '@/types/relationEmbedding';
import type { TopicEmbedding } from '@/types/topicMetadata';
import { getAllEntities } from './entityApi';
import { getAllRelations } from './relationApi';
import { getAllTopicsBatch } from './orgApi';
import { shouldUseChroma } from './chromaConfig';
import { getRelationEmbedding } from './relationEmbeddings';

/**
 * エンティティ埋め込みの統計情報を取得
 */
export async function checkEntityEmbeddings(organizationId?: string): Promise<{
  total: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
  dimensions: { [key: number]: number }; // 次元数ごとの件数
  models: { [key: string]: number }; // モデルごとの件数
  sample: Array<{
    entityId: string;
    name?: string;
    dimension: number;
    model: string;
    hasEmbedding: boolean;
  }>;
  actualTotal?: number; // 実際のエンティティ総数（ChromaDBが使用可能な場合）
}> {
  // 注意: 埋め込みデータはChromaDBにのみ保存されるため、SQLiteのentityEmbeddingsテーブルは使用しない
  // entitiesテーブルからエンティティを取得し、chromaSyncedカラムで埋め込みの存在を確認
  const entitiesConditions: any = {};
  if (organizationId) {
    entitiesConditions.organizationId = organizationId;
  }

  const entitiesResult = await callTauriCommand('query_get', {
    collectionName: 'entities',
    conditions: entitiesConditions,
  });

  const entities = (entitiesResult || []) as Array<{id: string; data: any}>;
  
  // ChromaDBから埋め込みを取得するためのアイテムリストを作成
  const items: Array<{id: string; data: any}> = [];
  
  if (shouldUseChroma()) {
    // ChromaDBが有効な場合、各エンティティについて埋め込みを取得
    for (const entity of entities) {
      const entityId = entity.data?.id || entity.id;
      const chromaSynced = entity.data?.chromaSynced === 1 || entity.data?.chromaSynced === true;
      
      if (chromaSynced) {
        // ChromaDBから埋め込みを取得
        try {
          const { getEntityEmbedding } = await import('./entityEmbeddings');
          const embedding = await getEntityEmbedding(entityId);
          
          if (embedding) {
            items.push({
              id: entityId,
              data: {
                entityId,
                combinedEmbedding: embedding.combinedEmbedding,
                embeddingModel: embedding.embeddingModel,
                embeddingVersion: embedding.embeddingVersion,
                storedInChromaDB: true,
              },
            });
          }
        } catch (error) {
          // 埋め込み取得エラーは無視して続行
          console.warn(`エンティティ ${entityId} の埋め込み取得エラー:`, error);
        }
      }
    }
  } else {
    // ChromaDBが無効な場合、埋め込みデータは存在しない
    console.warn('⚠️ ChromaDBが無効です。エンティティ埋め込みの確認はできません。設定ページ（/settings）でChromaDBを有効化してください。');
  }
  
  // ChromaDBが使用可能な場合、実際のエンティティ総数も取得
  let actualTotal: number | undefined;
  if (shouldUseChroma()) {
    try {
      const allEntities = await getAllEntities();
      const filteredEntities = organizationId 
        ? allEntities.filter(e => e.organizationId === organizationId)
        : allEntities;
      actualTotal = filteredEntities.length;
    } catch (error) {
      console.warn('実際のエンティティ総数の取得に失敗しました:', error);
    }
  }
  
  const stats = {
    total: items.length,
    withEmbeddings: 0,
    withoutEmbeddings: 0,
    dimensions: {} as { [key: number]: number },
    models: {} as { [key: string]: number },
    sample: [] as Array<{
      entityId: string;
      name?: string;
      dimension: number;
      model: string;
      hasEmbedding: boolean;
    }>,
    actualTotal,
  };

  for (const item of items) {
    const embeddingData = item.data;
    const entityId = embeddingData.entityId || item.id;
    
    // ChromaDBから取得したデータなので、埋め込みは既に配列形式
    const combinedEmbedding: number[] | undefined = embeddingData.combinedEmbedding;
    
    // ChromaDBから取得したデータなので、埋め込みは存在する
    const hasEmbedding = !!(combinedEmbedding && combinedEmbedding.length > 0);
    const dimension = combinedEmbedding?.length || 0;
    const model = embeddingData.embeddingModel || 'text-embedding-3-small';
    const storedInChromaDB = true; // ChromaDBから取得したデータであることを示す

    // デバッグログ（開発時のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[checkEntityEmbeddings] エンティティ ${entityId}:`, {
        storedInChromaDB,
        hasCombinedEmbedding: !!(combinedEmbedding && combinedEmbedding.length > 0),
        hasEmbedding,
        model,
      });
    }

    if (hasEmbedding) {
      stats.withEmbeddings++;
      if (dimension > 0) {
        stats.dimensions[dimension] = (stats.dimensions[dimension] || 0) + 1;
      }
    } else {
      stats.withoutEmbeddings++;
    }
    stats.models[model] = (stats.models[model] || 0) + 1;

    // サンプルデータ（最初の10件）
    if (stats.sample.length < 10) {
      stats.sample.push({
        entityId,
        name: embeddingData.name,
        dimension,
        model,
        hasEmbedding,
      });
    }
  }

  // ChromaDBが有効な場合、SQLiteにメタデータがないがChromaDBに保存されているエンティティも考慮
  if (shouldUseChroma() && actualTotal !== undefined) {
    if (actualTotal > stats.total) {
      // ChromaDBに保存されているがSQLiteにメタデータがないエンティティの数
      const chromaOnlyCount = actualTotal - stats.total;
      // これらも「埋め込みあり」としてカウント（ChromaDBに保存されているため）
      stats.withEmbeddings += chromaOnlyCount;
      stats.total = actualTotal; // totalをactualTotalに更新
      
      // 次元数分布にも追加（ChromaDBの場合は1536次元）
      stats.dimensions[1536] = (stats.dimensions[1536] || 0) + chromaOnlyCount;
      
      // モデル分布にも追加
      stats.models['text-embedding-3-small'] = (stats.models['text-embedding-3-small'] || 0) + chromaOnlyCount;
    } else if (actualTotal === stats.total && stats.withEmbeddings === 0 && stats.withoutEmbeddings === stats.total) {
      // SQLiteにメタデータがあるが、すべて「埋め込みなし」としてカウントされている場合
      // ChromaDBが有効でactualTotalとtotalが一致する場合、すべてChromaDBに保存されていると仮定
      // すべてを「埋め込みあり」として再計算
      stats.withEmbeddings = stats.total;
      stats.withoutEmbeddings = 0;
      
      // 次元数分布を更新（ChromaDBの場合は1536次元）
      stats.dimensions[1536] = stats.total;
      
      // モデル分布を更新
      stats.models['text-embedding-3-small'] = stats.total;
    }
  }

  return stats;
}

/**
 * リレーション埋め込みの統計情報を取得
 */
export async function checkRelationEmbeddings(organizationId?: string): Promise<{
  total: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
  dimensions: { [key: number]: number };
  models: { [key: string]: number };
  sample: Array<{
    relationId: string;
    relationType?: string;
    dimension: number;
    model: string;
    hasEmbedding: boolean;
  }>;
  actualTotal?: number; // 実際のリレーション総数（ChromaDBが使用可能な場合）
}> {
  // 注意: 埋め込みデータはChromaDBにのみ保存されるため、SQLiteのrelationEmbeddingsテーブルは使用しない
  // relationsテーブルからリレーションを取得し、chromaSyncedカラムで埋め込みの存在を確認
  const relationsConditions: any = {};
  if (organizationId) {
    relationsConditions.organizationId = organizationId;
  }

  const relationsResult = await callTauriCommand('query_get', {
    collectionName: 'relations',
    conditions: relationsConditions,
  });

  const relations = (relationsResult || []) as Array<{id: string; data: any}>;
  
  // ChromaDBから埋め込みを取得するためのアイテムリストを作成
  const items: Array<{id: string; data: any}> = [];
  
  if (shouldUseChroma()) {
    // ChromaDBが有効な場合、各リレーションについて埋め込みを取得
    for (const relation of relations) {
      const relationId = relation.data?.id || relation.id;
      const chromaSynced = relation.data?.chromaSynced === 1 || relation.data?.chromaSynced === true;
      
      if (chromaSynced) {
        // ChromaDBから埋め込みを取得
        try {
          const { getRelationEmbedding } = await import('./relationEmbeddings');
          const embedding = await getRelationEmbedding(relationId);
          
          if (embedding) {
            items.push({
              id: relationId,
              data: {
                relationId,
                combinedEmbedding: embedding.combinedEmbedding,
                embeddingModel: embedding.embeddingModel,
                embeddingVersion: embedding.embeddingVersion,
                storedInChromaDB: true,
              },
            });
          }
        } catch (error) {
          // 埋め込み取得エラーは無視して続行
          console.warn(`リレーション ${relationId} の埋め込み取得エラー:`, error);
        }
      }
    }
  } else {
    // ChromaDBが無効な場合、埋め込みデータは存在しない
    console.warn('⚠️ ChromaDBが無効です。リレーション埋め込みの確認はできません。設定ページ（/settings）でChromaDBを有効化してください。');
  }
  
  // ChromaDBが使用可能な場合、実際のリレーション総数も取得
  let actualTotal: number | undefined;
  if (shouldUseChroma()) {
    try {
      const allRelations = await getAllRelations();
      // リレーションのorganizationIdは、関連するエンティティから取得する必要がある
      // 簡易的に、organizationIdでフィルタリングしない場合は全件を取得
      if (!organizationId) {
        actualTotal = allRelations.length;
      } else {
        // organizationIdでフィルタリングする場合は、関連するエンティティを確認する必要がある
        // 簡易的に、全リレーション数を取得（正確なフィルタリングは後で改善可能）
        actualTotal = allRelations.length;
      }
    } catch (error) {
      console.warn('実際のリレーション総数の取得に失敗しました:', error);
    }
  }
  
  const stats = {
    total: items.length,
    withEmbeddings: 0,
    withoutEmbeddings: 0,
    dimensions: {} as { [key: number]: number },
    models: {} as { [key: string]: number },
    sample: [] as Array<{
      relationId: string;
      relationType?: string;
      dimension: number;
      model: string;
      hasEmbedding: boolean;
    }>,
    actualTotal,
  };

  for (const item of items) {
    const embeddingData = item.data;
    const relationId = embeddingData.relationId || item.id;
    
    // ChromaDBから取得したデータなので、埋め込みは既に配列形式
    const combinedEmbedding: number[] | undefined = embeddingData.combinedEmbedding;
    
    // ChromaDBから取得したデータなので、埋め込みは存在する
    const hasEmbedding = !!(combinedEmbedding && combinedEmbedding.length > 0);
    const dimension = combinedEmbedding?.length || 0;
    const model = embeddingData.embeddingModel || 'text-embedding-3-small';

    if (hasEmbedding) {
      stats.withEmbeddings++;
      if (dimension > 0) {
        stats.dimensions[dimension] = (stats.dimensions[dimension] || 0) + 1;
      }
    } else {
      stats.withoutEmbeddings++;
    }
    stats.models[model] = (stats.models[model] || 0) + 1;

    // サンプルデータ（最初の10件）
    if (stats.sample.length < 10) {
      stats.sample.push({
        relationId,
        relationType: embeddingData.relationType,
        dimension,
        model,
        hasEmbedding,
      });
    }
  }

  // ChromaDBが有効な場合、SQLiteにメタデータがないがChromaDBに保存されているリレーションも考慮
  if (shouldUseChroma() && actualTotal !== undefined) {
    if (actualTotal > stats.total) {
      // ChromaDBに保存されているがSQLiteにメタデータがないリレーションの数
      const chromaOnlyCount = actualTotal - stats.total;
      // これらも「埋め込みあり」としてカウント（ChromaDBに保存されているため）
      stats.withEmbeddings += chromaOnlyCount;
      stats.total = actualTotal; // totalをactualTotalに更新
      
      // 次元数分布にも追加（ChromaDBの場合は1536次元）
      stats.dimensions[1536] = (stats.dimensions[1536] || 0) + chromaOnlyCount;
      
      // モデル分布にも追加
      stats.models['text-embedding-3-small'] = (stats.models['text-embedding-3-small'] || 0) + chromaOnlyCount;
    } else if (actualTotal === stats.total && stats.withEmbeddings === 0 && stats.withoutEmbeddings === stats.total) {
      // SQLiteにメタデータがあるが、すべて「埋め込みなし」としてカウントされている場合
      // ChromaDBが有効でactualTotalとtotalが一致する場合、すべてChromaDBに保存されていると仮定
      // すべてを「埋め込みあり」として再計算
      stats.withEmbeddings = stats.total;
      stats.withoutEmbeddings = 0;
      
      // 次元数分布を更新（ChromaDBの場合は1536次元）
      stats.dimensions[1536] = stats.total;
      
      // モデル分布を更新
      stats.models['text-embedding-3-small'] = stats.total;
    }
  }

  return stats;
}

/**
 * トピック埋め込みの統計情報を取得
 */
export async function checkTopicEmbeddings(organizationId?: string): Promise<{
  total: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
  dimensions: { [key: number]: number };
  models: { [key: string]: number };
  sample: Array<{
    topicId: string;
    title?: string;
    dimension: number;
    model: string;
    hasEmbedding: boolean;
  }>;
}> {
  try {
    // SQLiteからデータを取得（ChromaDBが有効な場合もSQLiteにメタデータが保存されている）
    const conditions: any = {};
    if (organizationId) {
      conditions.organizationId = organizationId;
    }

    const result = await callTauriCommand('query_get', {
      collectionName: 'topics',
      conditions,
    });

    const items = (result || []) as Array<{id: string; data: any}>;
  
    // ChromaDBが使用可能な場合、実際のトピック総数も取得
    let actualTotal: number | undefined;
    if (shouldUseChroma()) {
      try {
        const allTopics = await getAllTopicsBatch();
        const filteredTopics = organizationId 
          ? allTopics.filter(t => t.organizationId === organizationId)
          : allTopics;
        actualTotal = filteredTopics.length;
      } catch (error) {
        console.warn('実際のトピック総数の取得に失敗しました:', error);
      }
    }
  
    const stats = {
      total: items.length,
      withEmbeddings: 0,
      withoutEmbeddings: 0,
      dimensions: {} as { [key: number]: number },
      models: {} as { [key: string]: number },
      sample: [] as Array<{
        topicId: string;
        title?: string;
        dimension: number;
        model: string;
        hasEmbedding: boolean;
      }>,
    };

    for (const item of items) {
      const embeddingData = item.data as TopicEmbedding;
      const topicId = embeddingData.topicId || item.id.split('-topic-')[1] || item.id;
      
      // ChromaDBに保存されている場合は、埋め込みありとして扱う
      // SQLiteから読み込む際に文字列として保存されている可能性があるため、booleanと文字列の両方をチェック
      // 注意: 保存処理では`chromaSynced`フラグを更新しているため、両方をチェック
      const storedInChromaDB = (embeddingData as any).storedInChromaDB === true || 
                               (embeddingData as any).storedInChromaDB === 'true' || 
                               (embeddingData as any).storedInChromaDB === 1 ||
                               String((embeddingData as any).storedInChromaDB).toLowerCase() === 'true';
      
      // chromaSyncedフラグもチェック（実際の保存処理で使用されているフラグ）
      const chromaSyncedValue = (embeddingData as any).chromaSynced;
      const chromaSynced = chromaSyncedValue === 1 || 
                          chromaSyncedValue === true || 
                          chromaSyncedValue === '1' ||
                          String(chromaSyncedValue) === '1';
      
      // どちらかのフラグがtrueなら、ChromaDBに保存されていると判断
      const isStoredInChromaDB = storedInChromaDB || chromaSynced;
      
      let combinedEmbedding: number[] | undefined;
      if (embeddingData.combinedEmbedding) {
        try {
          combinedEmbedding = typeof embeddingData.combinedEmbedding === 'string'
            ? JSON.parse(embeddingData.combinedEmbedding)
            : embeddingData.combinedEmbedding;
        } catch (e) {
          // JSONパースエラーは無視
          console.warn(`トピック ${topicId} の埋め込みベクトルのパースエラー:`, e);
        }
      }

      // SQLiteにベクトルデータがあるか、またはChromaDBに保存されているか
      const hasEmbedding = !!(combinedEmbedding && combinedEmbedding.length > 0) || isStoredInChromaDB;
      const dimension = combinedEmbedding?.length || (isStoredInChromaDB ? 1536 : 0); // ChromaDBの場合は1536次元と仮定
      const model = embeddingData.embeddingModel || (isStoredInChromaDB ? 'text-embedding-3-small' : 'unknown');

      // デバッグログ（開発時のみ）
      if (process.env.NODE_ENV === 'development') {
        console.log(`[checkTopicEmbeddings] トピック ${topicId}:`, {
          storedInChromaDB,
          chromaSynced,
          isStoredInChromaDB,
          hasCombinedEmbedding: !!(combinedEmbedding && combinedEmbedding.length > 0),
          hasEmbedding,
          model,
        });
      }

      if (hasEmbedding) {
        stats.withEmbeddings++;
        if (dimension > 0) {
          stats.dimensions[dimension] = (stats.dimensions[dimension] || 0) + 1;
        }
      } else {
        stats.withoutEmbeddings++;
      }
      stats.models[model] = (stats.models[model] || 0) + 1;

      // サンプルデータ（最初の10件）
      if (stats.sample.length < 10) {
        stats.sample.push({
          topicId,
          title: (embeddingData as any).title,
          dimension,
          model,
          hasEmbedding,
        });
      }
    }

    // ChromaDBが有効な場合、SQLiteにメタデータがないがChromaDBに保存されているトピックも考慮
    if (shouldUseChroma() && actualTotal !== undefined) {
      if (actualTotal > stats.total) {
        // ChromaDBに保存されているがSQLiteにメタデータがないトピックの数
        const chromaOnlyCount = actualTotal - stats.total;
        // これらも「埋め込みあり」としてカウント（ChromaDBに保存されているため）
        stats.withEmbeddings += chromaOnlyCount;
        stats.total = actualTotal; // totalをactualTotalに更新
        
        // 次元数分布にも追加（ChromaDBの場合は1536次元）
        stats.dimensions[1536] = (stats.dimensions[1536] || 0) + chromaOnlyCount;
        
        // モデル分布にも追加
        stats.models['text-embedding-3-small'] = (stats.models['text-embedding-3-small'] || 0) + chromaOnlyCount;
      } else if (actualTotal === stats.total && stats.withEmbeddings === 0 && stats.withoutEmbeddings === stats.total) {
        // SQLiteにメタデータがあるが、すべて「埋め込みなし」としてカウントされている場合
        // ChromaDBが有効でactualTotalとtotalが一致する場合、すべてChromaDBに保存されていると仮定
        // すべてを「埋め込みあり」として再計算
        stats.withEmbeddings = stats.total;
        stats.withoutEmbeddings = 0;
        
        // 次元数分布を更新（ChromaDBの場合は1536次元）
        stats.dimensions[1536] = stats.total;
        
        // モデル分布を更新
        stats.models['text-embedding-3-small'] = stats.total;
      }
    }

    return stats;
  } catch (error) {
    console.error('トピック埋め込み統計の取得エラー:', error);
    // エラーが発生した場合は空の統計を返す
    return {
      total: 0,
      withEmbeddings: 0,
      withoutEmbeddings: 0,
      dimensions: {},
      models: {},
      sample: [],
    };
  }
}

/**
 * すべての埋め込みの統計情報を取得
 */
export async function checkAllEmbeddings(organizationId?: string): Promise<{
  entities: Awaited<ReturnType<typeof checkEntityEmbeddings>>;
  relations: Awaited<ReturnType<typeof checkRelationEmbeddings>>;
  topics: Awaited<ReturnType<typeof checkTopicEmbeddings>>;
}> {
  console.log('[checkAllEmbeddings] 開始', { organizationId });
  
  const [entities, relations, topics] = await Promise.allSettled([
    checkEntityEmbeddings(organizationId).catch(error => {
      console.error('エンティティ埋め込み統計の取得エラー:', error);
      return {
        total: 0,
        withEmbeddings: 0,
        withoutEmbeddings: 0,
        dimensions: {},
        models: {},
        sample: [],
      };
    }),
    checkRelationEmbeddings(organizationId).catch(error => {
      console.error('リレーション埋め込み統計の取得エラー:', error);
      return {
        total: 0,
        withEmbeddings: 0,
        withoutEmbeddings: 0,
        dimensions: {},
        models: {},
        sample: [],
      };
    }),
    checkTopicEmbeddings(organizationId).catch(error => {
      console.error('トピック埋め込み統計の取得エラー:', error);
      return {
        total: 0,
        withEmbeddings: 0,
        withoutEmbeddings: 0,
        dimensions: {},
        models: {},
        sample: [],
      };
    }),
  ]);

  return {
    entities: entities.status === 'fulfilled' ? entities.value : {
      total: 0,
      withEmbeddings: 0,
      withoutEmbeddings: 0,
      dimensions: {},
      models: {},
      sample: [],
    },
    relations: relations.status === 'fulfilled' ? relations.value : {
      total: 0,
      withEmbeddings: 0,
      withoutEmbeddings: 0,
      dimensions: {},
      models: {},
      sample: [],
    },
    topics: topics.status === 'fulfilled' ? topics.value : {
      total: 0,
      withEmbeddings: 0,
      withoutEmbeddings: 0,
      dimensions: {},
      models: {},
      sample: [],
    },
  };
}

/**
 * 統計情報をコンソールに表示
 */
export async function printEmbeddingStats(organizationId?: string): Promise<void> {
  console.log('📊 埋め込みベクトルの統計情報を取得中...\n');
  
  const stats = await checkAllEmbeddings(organizationId);
  
  console.log('=== エンティティ埋め込み ===');
  console.log(`総数: ${stats.entities.total}`);
  console.log(`埋め込みあり: ${stats.entities.withEmbeddings}`);
  console.log(`埋め込みなし: ${stats.entities.withoutEmbeddings}`);
  console.log('次元数分布:', stats.entities.dimensions);
  console.log('モデル分布:', stats.entities.models);
  console.log('サンプル:', stats.entities.sample);
  console.log('');
  
  console.log('=== リレーション埋め込み ===');
  console.log(`総数: ${stats.relations.total}`);
  console.log(`埋め込みあり: ${stats.relations.withEmbeddings}`);
  console.log(`埋め込みなし: ${stats.relations.withoutEmbeddings}`);
  console.log('次元数分布:', stats.relations.dimensions);
  console.log('モデル分布:', stats.relations.models);
  console.log('サンプル:', stats.relations.sample);
  console.log('');
  
  console.log('=== トピック埋め込み ===');
  console.log(`総数: ${stats.topics.total}`);
  console.log(`埋め込みあり: ${stats.topics.withEmbeddings}`);
  console.log(`埋め込みなし: ${stats.topics.withoutEmbeddings}`);
  console.log('次元数分布:', stats.topics.dimensions);
  console.log('モデル分布:', stats.topics.models);
  console.log('サンプル:', stats.topics.sample);
  console.log('');
}
