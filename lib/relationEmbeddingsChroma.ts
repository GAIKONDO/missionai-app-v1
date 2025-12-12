/**
 * リレーション埋め込みのChromaDB管理
 * ChromaDBを使用した高速ベクトル検索
 * 
 * Rust側のChromaDB Serverを使用（Tauriコマンド経由）
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
  // クライアント側でのみ実行
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
        if (sourceEntity) {
          sourceEntityName = sourceEntity.name;
        } else {
          // エンティティが見つからない場合は、エンティティIDを使用（警告は出力しない）
          sourceEntityName = relation.sourceEntityId;
        }
      } catch (error) {
        // エンティティ取得に失敗した場合は、エンティティIDを使用（警告は出力しない）
        sourceEntityName = relation.sourceEntityId;
      }
    }
    
    if (relation.targetEntityId) {
      try {
        const targetEntity = await getEntityById(relation.targetEntityId);
        if (targetEntity) {
          targetEntityName = targetEntity.name;
        } else {
          // エンティティが見つからない場合は、エンティティIDを使用（警告は出力しない）
          targetEntityName = relation.targetEntityId;
        }
      } catch (error) {
        // エンティティ取得に失敗した場合は、エンティティIDを使用（警告は出力しない）
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

    // 埋め込みを生成
    const descriptionText = relation.description || '';
    const relationTypeText = relation.relationType;

    // 説明の埋め込み
    const descriptionEmbedding = descriptionText ? await generateEmbedding(descriptionText) : undefined;
    
    // リレーションタイプの埋め込み
    const relationTypeEmbedding = await generateEmbedding(relationTypeText);
    
    // 統合埋め込みを生成（説明+リレーションタイプ+関連エンティティ名+メタデータ）
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

    // 埋め込みベクトルの次元数をチェック（text-embedding-3-smallは1536次元）
    if (combinedEmbedding.length !== 1536) {
      const errorMessage = `埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${combinedEmbedding.length}。OpenAIのtext-embedding-3-smallモデルを使用してください。`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // メタデータを準備
    const metadata: Record<string, any> = {
      topicId,
      relationType: relation.relationType,
      sourceEntityId: relation.sourceEntityId || '',
      targetEntityId: relation.targetEntityId || '',
      sourceEntityName,
      targetEntityName,
      description: descriptionText,
      metadata: relation.metadata ? JSON.stringify(relation.metadata) : '',
      descriptionEmbedding: descriptionEmbedding ? JSON.stringify(descriptionEmbedding) : '',
      relationTypeEmbedding: JSON.stringify(relationTypeEmbedding),
      embeddingModel: 'text-embedding-3-small',
      embeddingVersion: '1.0',
      createdAt: now,
      updatedAt: now,
    };

    // Rust側のTauriコマンドを呼び出し（パラメータ名はcamelCase）
    await callTauriCommand('chromadb_save_relation_embedding', {
      relationId,
      organizationId,
      combinedEmbedding,
      metadata,
    });

    console.log(`✅ ChromaDBにリレーション埋め込みを保存しました: ${relationId}`);
  } catch (error) {
    console.error('ChromaDBへのリレーション埋め込み保存エラー:', error);
    throw error;
  }
}

/**
 * ChromaDBからリレーション埋め込みを取得
 * 注意: Rust側の実装では、IDから直接取得する機能は未実装のため、
 * SQLiteフォールバックを使用することを推奨
 */
export async function getRelationEmbeddingFromChroma(relationId: string): Promise<RelationEmbedding | null> {
  // Rust側のChromaDB実装では、IDから直接取得する機能が未実装のため、
  // SQLiteフォールバックを使用
  console.warn('getRelationEmbeddingFromChroma: Rust側のChromaDB実装では未対応。SQLiteフォールバックを使用してください。');
  return null;
}

/**
 * ChromaDBを使用した類似リレーション検索（Rust側経由）
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

    // 埋め込みベクトルの次元数をチェック（text-embedding-3-smallは1536次元）
    if (queryEmbedding.length !== 1536) {
      const errorMessage = `埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${queryEmbedding.length}。OpenAIのtext-embedding-3-smallモデルを使用してください。`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Rust側のTauriコマンドを呼び出し（パラメータ名はcamelCase）
    // organizationIdが未指定の場合はundefinedを渡して組織横断検索を実行
    const results = await callTauriCommand('chromadb_find_similar_relations', {
      queryEmbedding,
      limit,
      organizationId: organizationId || undefined, // undefinedの場合は組織横断検索
    }) as Array<[string, number]>;

    // 結果を変換
    let similarities = results.map(([relationId, similarity]) => ({
      relationId,
      similarity,
    }));

    // relationTypeでフィルタリング（Rust側で未対応のため、JavaScript側でフィルタリング）
    if (relationType) {
      // 注意: Rust側の実装ではrelationTypeでのフィルタリングは未対応のため、
      // ここでは全ての結果を返す（将来的にRust側で実装予定）
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
 * 注意: Rust側の実装では、削除機能は未実装のため、
 * SQLiteフォールバックを使用することを推奨
 */
export async function deleteRelationEmbeddingFromChroma(relationId: string): Promise<void> {
  // Rust側のChromaDB実装では、削除機能が未実装のため、
  // SQLiteフォールバックを使用
  console.warn('deleteRelationEmbeddingFromChroma: Rust側のChromaDB実装では未対応。SQLiteフォールバックを使用してください。');
}
