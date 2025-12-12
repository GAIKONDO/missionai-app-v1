/**
 * エンティティ埋め込みのChromaDB管理
 * ChromaDBを使用した高速ベクトル検索
 * 
 * Rust側のChromaDB Serverを使用（Tauriコマンド経由）
 */

import { callTauriCommand } from './localFirebase';
import { generateEmbedding, generateEnhancedEmbedding, generateMetadataEmbedding } from './embeddings';
import type { EntityEmbedding } from '@/types/entityEmbedding';
import type { Entity } from '@/types/entity';

/**
 * エンティティ埋め込みをChromaDBに保存（Rust側経由）
 */
export async function saveEntityEmbeddingToChroma(
  entityId: string,
  organizationId: string,
  entity: Entity
): Promise<void> {
  // クライアント側でのみ実行
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

    // 埋め込みベクトルの次元数をチェック（text-embedding-3-smallは1536次元）
    if (combinedEmbedding.length !== 1536) {
      const errorMessage = `埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${combinedEmbedding.length}。OpenAIのtext-embedding-3-smallモデルを使用してください。`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // メタデータ埋め込み（メタデータがある場合のみ）
    let metadataEmbedding: number[] | undefined;
    if (entity.metadata && Object.keys(entity.metadata).length > 0) {
      // EntityMetadataをgenerateMetadataEmbeddingが期待する形式に変換
      const metadataForEmbedding = {
        keywords: entity.aliases || [],
        semanticCategory: entity.type,
        summary: JSON.stringify(entity.metadata),
      };
      metadataEmbedding = await generateMetadataEmbedding(metadataForEmbedding);
      
      // メタデータ埋め込みの次元数もチェック
      if (metadataEmbedding && metadataEmbedding.length !== 1536) {
        console.warn(`メタデータ埋め込みの次元数が一致しません。期待値: 1536, 実際: ${metadataEmbedding.length}。スキップします。`);
        metadataEmbedding = undefined;
      }
    }

    // メタデータを準備
    const metadata: Record<string, any> = {
      name: entity.name,
      type: entity.type,
      aliases: entity.aliases ? JSON.stringify(entity.aliases) : '',
      metadata: entity.metadata ? JSON.stringify(entity.metadata) : '',
      nameEmbedding: JSON.stringify(nameEmbedding),
      metadataEmbedding: metadataEmbedding ? JSON.stringify(metadataEmbedding) : '',
      embeddingModel: 'text-embedding-3-small',
      embeddingVersion: '1.0',
      createdAt: now,
      updatedAt: now,
    };

    // Rust側のTauriコマンドを呼び出し（パラメータ名はcamelCase）
    await callTauriCommand('chromadb_save_entity_embedding', {
      entityId,
      organizationId,
      combinedEmbedding,
      metadata,
    });

    console.log(`✅ ChromaDBにエンティティ埋め込みを保存しました: ${entityId}`);
  } catch (error) {
    console.error('ChromaDBへのエンティティ埋め込み保存エラー:', error);
    throw error;
  }
}

/**
 * ChromaDBからエンティティ埋め込みを取得
 * 注意: Rust側の実装では、IDから直接取得する機能は未実装のため、
 * SQLiteフォールバックを使用することを推奨
 */
export async function getEntityEmbeddingFromChroma(entityId: string): Promise<EntityEmbedding | null> {
  // Rust側のChromaDB実装では、IDから直接取得する機能が未実装のため、
  // SQLiteフォールバックを使用
  console.warn('getEntityEmbeddingFromChroma: Rust側のChromaDB実装では未対応。SQLiteフォールバックを使用してください。');
  return null;
}

/**
 * ChromaDBを使用した類似エンティティ検索（Rust側経由）
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
    console.log(`[findSimilarEntitiesChroma] 検索開始: queryText="${queryText}", organizationId="${organizationId || '未指定（組織横断検索）'}", limit=${limit}`);
    
    // organizationIdが未指定の場合は組織横断検索を実行（Rust側で対応済み）

    // クエリの埋め込みを生成
    console.log(`[findSimilarEntitiesChroma] クエリの埋め込みベクトルを生成中...`);
    const queryEmbedding = await generateEmbedding(queryText);
    console.log(`[findSimilarEntitiesChroma] 埋め込みベクトル生成完了: ${queryEmbedding.length}次元`);

    // 埋め込みベクトルの次元数をチェック（text-embedding-3-smallは1536次元）
    if (queryEmbedding.length !== 1536) {
      const errorMessage = `埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${queryEmbedding.length}。OpenAIのtext-embedding-3-smallモデルを使用してください。`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Rust側のTauriコマンドを呼び出し（パラメータ名はcamelCase）
    // organizationIdが未指定の場合はundefinedを渡して組織横断検索を実行
    console.log(`[findSimilarEntitiesChroma] ChromaDB検索を実行中...`);
    const results = await callTauriCommand('chromadb_find_similar_entities', {
      queryEmbedding,
      limit,
      organizationId: organizationId || undefined, // undefinedの場合は組織横断検索
    }) as Array<[string, number]>;

    console.log(`[findSimilarEntitiesChroma] ChromaDB検索完了: ${results.length}件の結果を取得`);
    if (results.length > 0) {
      console.log(`[findSimilarEntitiesChroma] 検索結果トップ5:`, results.slice(0, 5).map(([id, sim]) => ({ entityId: id, similarity: sim.toFixed(4) })));
    } else {
      console.warn(`[findSimilarEntitiesChroma] 検索結果が空です。コレクション entities_${organizationId} にデータが存在しない可能性があります。`);
    }

    // 結果を変換
    return results.map(([entityId, similarity]) => ({
      entityId,
      similarity,
    }));
  } catch (error) {
    console.error('[findSimilarEntitiesChroma] ChromaDBでの類似エンティティ検索エラー:', error);
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
 * 注意: Rust側の実装では、削除機能は未実装のため、
 * SQLiteフォールバックを使用することを推奨
 */
export async function deleteEntityEmbeddingFromChroma(entityId: string): Promise<void> {
  // Rust側のChromaDB実装では、削除機能が未実装のため、
  // SQLiteフォールバックを使用
  console.warn('deleteEntityEmbeddingFromChroma: Rust側のChromaDB実装では未対応。SQLiteフォールバックを使用してください。');
}
