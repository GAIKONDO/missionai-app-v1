/**
 * エンティティ埋め込みのChromaDB管理
 * ChromaDBを使用した高速ベクトル検索
 */

import { callTauriCommand } from './localFirebase';
import { generateEmbedding, generateMetadataEmbedding } from './embeddings';
import type { EntityEmbedding } from '@/types/entityEmbedding';
import type { Entity } from '@/types/entity';

/**
 * エンティティ埋め込みをChromaDBに保存
 */
export async function saveEntityEmbeddingToChroma(
  entityId: string,
  organizationId: string,
  entity: Entity
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('エンティティ埋め込みの保存はクライアント側でのみ実行可能です');
  }

  try {
    const now = new Date().toISOString();

    // 埋め込みを生成
    const nameEmbedding = await generateEmbedding(entity.name);
    
    // エイリアスとメタデータを含む統合埋め込み
    const combinedParts: string[] = [entity.name];
    if (entity.aliases && entity.aliases.length > 0) {
      combinedParts.push(...entity.aliases);
    }
    if (entity.metadata && Object.keys(entity.metadata).length > 0) {
      combinedParts.push(JSON.stringify(entity.metadata));
    }
    const combinedText = combinedParts.join('\n\n');
    const combinedEmbedding = await generateEmbedding(combinedText);

    // 埋め込みベクトルの次元数をチェック
    if (combinedEmbedding.length !== 1536) {
      throw new Error(`埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${combinedEmbedding.length}`);
    }

    // メタデータ埋め込み（メタデータがある場合のみ）
    let metadataEmbedding: number[] | undefined;
    if (entity.metadata && Object.keys(entity.metadata).length > 0) {
      try {
        const metadataForEmbedding = {
          keywords: entity.aliases || [],
          semanticCategory: entity.type,
          summary: JSON.stringify(entity.metadata),
        };
        metadataEmbedding = await generateMetadataEmbedding(metadataForEmbedding);
        
        if (metadataEmbedding && metadataEmbedding.length !== 1536) {
          metadataEmbedding = undefined;
        }
      } catch (error) {
        console.warn('メタデータ埋め込みの生成に失敗しました:', error);
      }
    }

    // メタデータを準備
    const metadata: Record<string, any> = {
      entityId,
      organizationId,
      companyId: entity.companyId || '',
      name: entity.name,
      type: entity.type,
      aliases: entity.aliases ? JSON.stringify(entity.aliases) : '',
      metadata: entity.metadata ? JSON.stringify(entity.metadata) : '',
      createdAt: now,
      updatedAt: now,
    };

    // Rust側のTauriコマンドを呼び出し
    await Promise.race([
      callTauriCommand('chromadb_save_entity_embedding', {
        entityId,
        organizationId,
        combinedEmbedding,
        metadata,
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('ChromaDBへの埋め込み保存がタイムアウトしました（60秒）')), 60000)
      )
    ]);
  } catch (error) {
    console.error('ChromaDBへのエンティティ埋め込み保存エラー:', error);
    throw error;
  }
}

/**
 * ChromaDBからエンティティ埋め込みを取得
 */
export async function getEntityEmbeddingFromChroma(
  entityId: string,
  organizationId: string
): Promise<EntityEmbedding | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const result = await Promise.race([
      callTauriCommand('chromadb_get_entity_embedding', {
        entityId,
        organizationId,
      }) as Promise<Record<string, any> | null>,
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('ChromaDBからの埋め込み取得がタイムアウトしました（30秒）')), 30000)
      )
    ]) as Record<string, any> | null;

    if (!result) {
      return null;
    }

    const combinedEmbedding = result.combinedEmbedding as number[] | undefined;
    if (!combinedEmbedding || !Array.isArray(combinedEmbedding) || combinedEmbedding.length === 0) {
      return null;
    }

    const nameEmbeddingStr = result.nameEmbedding as string | undefined;
    const metadataEmbeddingStr = result.metadataEmbedding as string | undefined;
    
    let nameEmbedding: number[] | undefined;
    let metadataEmbedding: number[] | undefined;

    if (nameEmbeddingStr) {
      try {
        nameEmbedding = JSON.parse(nameEmbeddingStr);
      } catch (e) {
        console.warn('nameEmbeddingのパースに失敗しました:', e);
      }
    }

    if (metadataEmbeddingStr) {
      try {
        metadataEmbedding = JSON.parse(metadataEmbeddingStr);
      } catch (e) {
        console.warn('metadataEmbeddingのパースに失敗しました:', e);
      }
    }

    const embedding: EntityEmbedding = {
      id: entityId,
      entityId,
      organizationId,
      combinedEmbedding,
      nameEmbedding,
      metadataEmbedding,
      embeddingModel: (result.embeddingModel as string) || 'text-embedding-3-small',
      embeddingVersion: (result.embeddingVersion as string) || '1.0',
      createdAt: (result.createdAt as string) || new Date().toISOString(),
      updatedAt: (result.updatedAt as string) || new Date().toISOString(),
    };

    return embedding;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('タイムアウト') || errorMessage.includes('timeout')) {
      console.warn(`ChromaDBからの埋め込み取得がタイムアウトしました: ${entityId}`);
    } else {
      console.error('ChromaDBからのエンティティ埋め込み取得エラー:', error);
    }
    return null;
  }
}

/**
 * ChromaDBを使用した類似エンティティ検索
 */
export async function findSimilarEntitiesChroma(
  queryText: string,
  limit: number = 5,
  organizationId?: string
): Promise<Array<{ entityId: string; similarity: number }>> {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    // クエリの埋め込みを生成
    const queryEmbedding = await generateEmbedding(queryText);

    // 埋め込みベクトルの次元数をチェック
    if (queryEmbedding.length !== 1536) {
      throw new Error(`埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${queryEmbedding.length}`);
    }

    // Rust側のTauriコマンドを呼び出し
    const results = await callTauriCommand('chromadb_find_similar_entities', {
      queryEmbedding,
      limit,
      organizationId: organizationId || undefined,
    }) as Array<[string, number]>;

    // 結果を変換
    return results.map(([entityId, similarity]) => ({
      entityId,
      similarity,
    }));
  } catch (error) {
    console.error('ChromaDBでの類似エンティティ検索エラー:', error);
    throw error;
  }
}

/**
 * ChromaDBのエンティティコレクションの件数を取得
 */
export async function countEntitiesInChroma(organizationId: string): Promise<number> {
  if (typeof window === 'undefined') {
    return 0;
  }

  try {
    const count = await callTauriCommand('chromadb_count_entities', {
      organizationId,
    }) as number;
    return count;
  } catch (error) {
    console.error('ChromaDBのエンティティコレクション件数取得エラー:', error);
    return 0;
  }
}

/**
 * ChromaDBからエンティティ埋め込みを削除
 */
export async function deleteEntityEmbeddingFromChroma(entityId: string, organizationId: string): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    await callTauriCommand('chromadb_delete_entity_embedding', {
      entityId,
      organizationId,
    });
  } catch (error) {
    console.error('ChromaDBからのエンティティ埋め込み削除エラー:', error);
    throw error;
  }
}
