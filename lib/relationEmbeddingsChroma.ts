/**
 * リレーション埋め込みのChromaDB管理
 * ChromaDBを使用した高速ベクトル検索
 */

import { callTauriCommand } from './localFirebase';
import { generateEmbedding } from './embeddings';
import type { RelationEmbedding } from '@/types/relationEmbedding';
import type { Relation } from '@/types/relation';
import { getEntityById } from './entityApi';

/**
 * リレーション埋め込みをChromaDBに保存
 */
export async function saveRelationEmbeddingToChroma(
  relationId: string,
  topicId: string,
  organizationId: string,
  relation: Relation
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('リレーション埋め込みの保存はクライアント側でのみ実行可能です');
  }

  try {
    const now = new Date().toISOString();

    // 関連エンティティ名を取得
    let sourceEntityName = '';
    let targetEntityName = '';
    
    if (relation.sourceEntityId) {
      try {
        const sourceEntity = await getEntityById(relation.sourceEntityId);
        sourceEntityName = sourceEntity?.name || relation.sourceEntityId;
      } catch (error) {
        sourceEntityName = relation.sourceEntityId;
      }
    }
    
    if (relation.targetEntityId) {
      try {
        const targetEntity = await getEntityById(relation.targetEntityId);
        targetEntityName = targetEntity?.name || relation.targetEntityId;
      } catch (error) {
        targetEntityName = relation.targetEntityId;
      }
    }

    // メタデータからテキストを構築
    const metadataParts: string[] = [];
    if (relation.metadata) {
      const metadata = relation.metadata;
      if (metadata.date) metadataParts.push(`日付: ${metadata.date}`);
      if (metadata.amount) metadataParts.push(`金額: ${metadata.amount}`);
      if (metadata.percentage) metadataParts.push(`割合: ${metadata.percentage}%`);
      if (metadata.description) metadataParts.push(`詳細: ${metadata.description}`);
      if (metadata.source) metadataParts.push(`情報源: ${metadata.source}`);
    }
    const metadataText = metadataParts.join(', ');

    // 統合埋め込みを生成
    const descriptionText = relation.description || '';
    const relationTypeText = relation.relationType;

    const combinedParts: string[] = [];
    
    // リレーションタイプを3回繰り返して重要度を上げる
    combinedParts.push(relationTypeText);
    combinedParts.push(relationTypeText);
    combinedParts.push(relationTypeText);
    
    if (sourceEntityName && targetEntityName) {
      combinedParts.push(`${sourceEntityName} と ${targetEntityName} の関係`);
    } else if (sourceEntityName) {
      combinedParts.push(`${sourceEntityName} に関連`);
    } else if (targetEntityName) {
      combinedParts.push(`${targetEntityName} に関連`);
    }
    
    if (descriptionText) {
      combinedParts.push(descriptionText);
    }
    
    if (metadataText) {
      combinedParts.push(metadataText);
    }
    
    const combinedText = combinedParts.join('\n\n');
    const combinedEmbedding = await generateEmbedding(combinedText);

    // 埋め込みベクトルの次元数をチェック
    if (combinedEmbedding.length !== 1536) {
      throw new Error(`埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${combinedEmbedding.length}`);
    }

    // メタデータを準備
    const metadata: Record<string, any> = {
      relationId,
      topicId,
      organizationId,
      companyId: relation.companyId || '',
      relationType: relation.relationType,
      sourceEntityId: relation.sourceEntityId || '',
      targetEntityId: relation.targetEntityId || '',
      sourceEntityName,
      targetEntityName,
      description: descriptionText,
      metadata: relation.metadata ? JSON.stringify(relation.metadata) : '',
      createdAt: now,
      updatedAt: now,
    };

    // Rust側のTauriコマンドを呼び出し
    await Promise.race([
      callTauriCommand('chromadb_save_relation_embedding', {
        relationId,
        organizationId,
        combinedEmbedding,
        metadata,
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('ChromaDBへの埋め込み保存がタイムアウトしました（60秒）')), 60000)
      )
    ]);
  } catch (error) {
    console.error('ChromaDBへのリレーション埋め込み保存エラー:', error);
    throw error;
  }
}

/**
 * ChromaDBからリレーション埋め込みを取得
 */
export async function getRelationEmbeddingFromChroma(
  relationId: string,
  organizationId: string
): Promise<RelationEmbedding | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const result = await Promise.race([
      callTauriCommand('chromadb_get_relation_embedding', {
        relationId,
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

    const topicId = result.topicId as string | undefined;
    const descriptionEmbeddingStr = result.descriptionEmbedding as string | undefined;
    const relationTypeEmbeddingStr = result.relationTypeEmbedding as string | undefined;
    
    let descriptionEmbedding: number[] | undefined;
    let relationTypeEmbedding: number[] | undefined;

    if (descriptionEmbeddingStr) {
      try {
        descriptionEmbedding = JSON.parse(descriptionEmbeddingStr);
      } catch (e) {
        console.warn('descriptionEmbeddingのパースに失敗しました:', e);
      }
    }

    if (relationTypeEmbeddingStr) {
      try {
        relationTypeEmbedding = JSON.parse(relationTypeEmbeddingStr);
      } catch (e) {
        console.warn('relationTypeEmbeddingのパースに失敗しました:', e);
      }
    }
    
    const embedding: RelationEmbedding = {
      id: relationId,
      relationId,
      topicId: topicId || '',
      organizationId: organizationId,
      combinedEmbedding,
      descriptionEmbedding,
      relationTypeEmbedding,
      embeddingModel: (result.embeddingModel as string) || 'text-embedding-3-small',
      embeddingVersion: (result.embeddingVersion as string) || '1.0',
      createdAt: (result.createdAt as string) || new Date().toISOString(),
      updatedAt: (result.updatedAt as string) || new Date().toISOString(),
    };

    return embedding;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('タイムアウト') || errorMessage.includes('timeout')) {
      console.warn(`ChromaDBからの埋め込み取得がタイムアウトしました: ${relationId}`);
    } else {
      console.error('ChromaDBからのリレーション埋め込み取得エラー:', error);
    }
    return null;
  }
}

/**
 * ChromaDBを使用した類似リレーション検索
 */
export async function findSimilarRelationsChroma(
  queryText: string,
  limit: number = 5,
  organizationId?: string,
  relationType?: string
): Promise<Array<{ relationId: string; similarity: number }>> {
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
    const results = await callTauriCommand('chromadb_find_similar_relations', {
      queryEmbedding,
      limit,
      organizationId: organizationId || undefined,
    }) as Array<[string, number]>;

    // 結果を変換
    let similarities = results.map(([relationId, similarity]) => {
      if (typeof similarity !== 'number' || isNaN(similarity)) {
        console.warn(`リレーション ${relationId} のsimilarityが無効です:`, similarity);
        return {
          relationId,
          similarity: 0,
        };
      }
      return {
        relationId,
        similarity,
      };
    });

    // relationTypeでフィルタリング（Rust側で未対応のため、JavaScript側でフィルタリング）
    if (relationType) {
      console.warn('relationTypeでのフィルタリングはRust側で未対応のため、全ての結果を返します');
    }

    return similarities.slice(0, limit);
  } catch (error) {
    console.error('ChromaDBでの類似リレーション検索エラー:', error);
    throw error;
  }
}

/**
 * ChromaDBからリレーション埋め込みを削除
 */
export async function deleteRelationEmbeddingFromChroma(relationId: string, organizationId: string): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    await callTauriCommand('chromadb_delete_relation_embedding', {
      relationId,
      organizationId,
    });
  } catch (error) {
    console.error('ChromaDBからのリレーション埋め込み削除エラー:', error);
    throw error;
  }
}
