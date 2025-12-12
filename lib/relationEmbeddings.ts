/**
 * リレーション埋め込みの管理ユーティリティ
 * ナレッジグラフRAG検索用のリレーション埋め込み機能を提供
 */

import { callTauriCommand } from './localFirebase';
import { 
  generateEmbedding,
  cosineSimilarity 
} from './embeddings';
import type { RelationEmbedding, CreateRelationEmbeddingInput } from '@/types/relationEmbedding';
import type { Relation } from '@/types/relation';
import { getRelationById, getAllRelations } from './relationApi';
import { shouldUseChroma } from './chromaConfig';
import { calculateRelationScore, adjustWeightsForQuery } from './ragSearchScoring';
import { handleRAGSearchError, safeHandleRAGSearchError } from './ragSearchErrors';

/**
 * 現在の埋め込みバージョン
 * 埋め込みモデルや生成ロジックが変更された場合はこの値を更新
 */
export const CURRENT_EMBEDDING_VERSION = '1.0';

/**
 * 現在の埋め込みモデル
 */
export const CURRENT_EMBEDDING_MODEL = 'text-embedding-3-small';

import { getEntityById } from './entityApi';

/**
 * リレーション埋め込みを保存
 * 
 * @param relationId リレーションID
 * @param topicId トピックID
 * @param organizationId 組織ID
 * @param relation リレーションデータ（埋め込み生成に使用）
 */
export async function saveRelationEmbedding(
  relationId: string,
  topicId: string,
  organizationId: string,
  relation: Relation
): Promise<void> {
  // クライアント側でのみ実行（サーバーサイドレンダリングを回避）
  if (typeof window === 'undefined') {
    throw new Error('リレーション埋め込みの保存はクライアント側でのみ実行可能です');
  }
  
  try {
    const now = new Date().toISOString();
    const embeddingVersion = CURRENT_EMBEDDING_VERSION;
    
    // リレーションの埋め込みテキストを構築
    const descriptionText = relation.description || '';
    const relationTypeText = relation.relationType;
    
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
    let combinedEmbedding: number[] | undefined;
    let descriptionEmbedding: number[] | undefined;
    let relationTypeEmbedding: number[] | undefined;

    try {
      // 説明の埋め込み
      if (descriptionText) {
        descriptionEmbedding = await generateEmbedding(descriptionText);
      }
      
      // リレーションタイプの埋め込み
      relationTypeEmbedding = await generateEmbedding(relationTypeText);
      
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
      combinedEmbedding = await generateEmbedding(combinedText);
    } catch (error) {
      console.error('リレーション埋め込みの生成に失敗しました:', error);
      throw error;
    }
    
    // 埋め込みデータを準備
    const embeddingData: RelationEmbedding = {
      id: relationId,
      relationId,
      topicId,
      organizationId,
      combinedEmbedding,
      descriptionEmbedding,
      relationTypeEmbedding,
      embeddingModel: CURRENT_EMBEDDING_MODEL,
      embeddingVersion,
      createdAt: now,
      updatedAt: now,
    };

    // ChromaDBを使用する場合（動的インポート）
    if (shouldUseChroma()) {
      try {
        const { saveRelationEmbeddingToChroma } = await import('./relationEmbeddingsChroma');
        await saveRelationEmbeddingToChroma(relationId, topicId, organizationId, relation);
        console.log(`✅ ChromaDBにリレーション埋め込みを保存しました: ${relationId}`);
        
        // ChromaDB同期状態を更新（relationsテーブルのchromaSyncedカラムを1に設定）
        try {
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'relation',
            entityId: relationId,
            synced: true,
            error: null,
          });
          console.log(`✅ リレーションのChromaDB同期状態を更新しました: ${relationId}`);
        } catch (syncStatusError: any) {
          console.warn(`⚠️ ChromaDB同期状態の更新に失敗しました（ChromaDBには保存済み）: ${relationId}`, syncStatusError?.message || syncStatusError);
          // エラーが発生しても続行（ChromaDBには保存されているため）
        }
      } catch (chromaError: any) {
        console.error('❌ ChromaDBへの保存に失敗しました:', chromaError?.message || chromaError);
        
        // 同期状態を失敗として更新
        try {
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'relation',
            entityId: relationId,
            synced: false,
            error: chromaError?.message || String(chromaError),
          });
        } catch (syncStatusError: any) {
          console.warn(`⚠️ ChromaDB同期状態の更新に失敗しました: ${relationId}`, syncStatusError?.message || syncStatusError);
        }
        
        // 埋め込みデータはChromaDBにのみ保存されるため、エラーをスロー
        throw new Error(`リレーション埋め込みの保存に失敗しました。ChromaDBが有効になっていることを確認してください: ${chromaError?.message || String(chromaError)}`);
      }
    } else {
      // ChromaDBが無効な場合、埋め込みデータは保存できない
      throw new Error('リレーション埋め込みの保存にはChromaDBが必要です。設定ページ（/settings）でChromaDBを有効化してください。');
    }
    
    console.log(`✅ リレーション埋め込みを保存しました: ${relationId}`);
  } catch (error) {
    console.error('リレーション埋め込みの保存エラー:', error);
    // エラーが発生しても処理を続行（埋め込みはオプショナル）
    throw error;
  }
}

// ⚠️ 注意: saveToSQLite関数は削除されました
// 埋め込みデータはChromaDBにのみ保存されます
// SQLiteには保存されません（relationEmbeddingsテーブルは存在しません）

// 埋め込み生成中のリレーションIDを追跡（重複実行を防ぐ）
const relationEmbeddingGenerationInProgress = new Set<string>();

/**
 * リレーション埋め込みを非同期で生成・保存
 * エラーが発生しても処理を続行する（オプショナルな機能のため）
 * 
 * @param relationId リレーションID
 * @param topicId トピックID
 * @param organizationId 組織ID
 * @returns 生成が成功したかどうか
 */
export async function saveRelationEmbeddingAsync(
  relationId: string,
  topicId: string,
  organizationId: string
): Promise<boolean> {
  // クライアント側でのみ実行
  if (typeof window === 'undefined') {
    console.warn('⚠️ リレーション埋め込みの保存はクライアント側でのみ実行可能です');
    return false;
  }

  // 既に生成中の場合はスキップ
  if (relationEmbeddingGenerationInProgress.has(relationId)) {
    console.log(`⏭️  リレーション ${relationId} の埋め込み生成は既に進行中です`);
    return false;
  }

  relationEmbeddingGenerationInProgress.add(relationId);
  
  try {
    // リレーションを取得
    const relation = await getRelationById(relationId);
    if (!relation) {
      console.warn(`⚠️ [埋め込み生成] リレーションが見つかりません: ${relationId}`);
      return false;
    }
    
    console.log(`🔄 [埋め込み生成] 開始: ${relation.relationType} (${relationId})`);
    
    // 埋め込みを生成
    await saveRelationEmbedding(relationId, topicId, organizationId, relation);
    
    console.log(`✅ [埋め込み生成] 完了: ${relation.relationType} (${relationId})`);
    return true;
  } catch (error: any) {
    // 詳細なエラー情報を記録
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || '';
    console.error(`❌ [埋め込み生成] エラー: ${relationId}`, {
      error: errorMessage,
      stack: errorStack,
      topicId,
      organizationId,
      timestamp: new Date().toISOString(),
    });
    return false;
  } finally {
    relationEmbeddingGenerationInProgress.delete(relationId);
  }
}

/**
 * リレーション埋め込みの生成状態を確認
 * 
 * @param relationId リレーションID
 * @returns 埋め込みが存在するか、生成中か、エラーが発生したか
 */
export async function checkRelationEmbeddingStatus(
  relationId: string
): Promise<{
  exists: boolean;
  isGenerating: boolean;
  embedding: RelationEmbedding | null;
}> {
  const isGenerating = relationEmbeddingGenerationInProgress.has(relationId);
  const embedding = await getRelationEmbedding(relationId);
  
  return {
    exists: embedding !== null && embedding.combinedEmbedding !== null,
    isGenerating,
    embedding,
  };
}

/**
 * リレーション埋め込みの生成を待機（リトライ付き）
 * 
 * @param relationId リレーションID
 * @param maxWaitTime 最大待機時間（ミリ秒、デフォルト: 30000）
 * @param checkInterval チェック間隔（ミリ秒、デフォルト: 1000）
 * @returns 埋め込みが生成されたかどうか
 */
export async function waitForRelationEmbedding(
  relationId: string,
  maxWaitTime: number = 30000,
  checkInterval: number = 1000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const status = await checkRelationEmbeddingStatus(relationId);
    
    if (status.exists) {
      return true;
    }
    
    if (!status.isGenerating && !status.exists) {
      // 生成中でもなく、埋め込みも存在しない場合は失敗とみなす
      return false;
    }
    
    // 次のチェックまで待機
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  return false;
}

/**
 * リレーション埋め込みを取得
 * 
 * @param relationId リレーションID
 * @returns リレーション埋め込みデータ、またはnull
 */
export async function getRelationEmbedding(
  relationId: string
): Promise<RelationEmbedding | null> {
  // ChromaDBを使用する場合（動的インポート）
  if (shouldUseChroma()) {
    try {
      const { getRelationEmbeddingFromChroma } = await import('./relationEmbeddingsChroma');
      const embedding = await getRelationEmbeddingFromChroma(relationId);
      if (embedding) {
        return embedding;
      }
      // 埋め込みが見つからない場合はnullを返す
      return null;
    } catch (chromaError: any) {
      console.error('❌ ChromaDBからの取得に失敗しました:', chromaError?.message || chromaError);
      // ChromaDBからの取得に失敗した場合はnullを返す（埋め込みが存在しない可能性）
      return null;
    }
  }

  // ChromaDBが無効な場合、埋め込みデータは取得できない
  console.warn('⚠️ ChromaDBが無効です。リレーション埋め込みを取得できません。設定ページ（/settings）でChromaDBを有効化してください。');
  return null;
}

/**
 * 類似リレーションを検索（ベクトル類似度検索）
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 返す結果の最大数（デフォルト: 5）
 * @param organizationId 組織IDでフィルタ（オプション）
 * @returns 類似リレーションの配列（relationIdとsimilarityを含む）
 */
export async function findSimilarRelations(
  queryText: string,
  limit: number = 5,
  organizationId?: string
): Promise<Array<{ relationId: string; similarity: number }>> {
  // ChromaDBを使用する場合（動的インポート）
  // organizationIdが未指定の場合は組織横断検索を実行（Rust側で対応済み）
  if (shouldUseChroma()) {
    try {
      const { findSimilarRelationsChroma } = await import('./relationEmbeddingsChroma');
      const results = await findSimilarRelationsChroma(queryText, limit, organizationId);
      console.log(`[findSimilarRelations] ChromaDB検索完了: ${results.length}件の結果を取得`);
        return results;
    } catch (chromaError: any) {
      console.error(`[findSimilarRelations] ChromaDBでの検索に失敗しました:`, chromaError?.message || chromaError);
      // ChromaDB検索が失敗した場合は空の結果を返す（SQLiteフォールバックは削除）
      return [];
    }
        } else {
    // ChromaDBが無効な場合：埋め込みベクトルはChromaDBにのみ保存されるため、検索結果は空
    console.warn(`[findSimilarRelations] ⚠️ ChromaDBが無効です。`);
    console.warn(`[findSimilarRelations] 💡 埋め込みベクトルはChromaDBにのみ保存されます。ChromaDBを有効にするには、設定ページでChromaDBを有効化するか、コンソールで以下を実行: localStorage.setItem('useChromaDB', 'true')`);
        return [];
  }
}

/**
 * ハイブリッド検索: ベクトル検索 + メタデータフィルタリング・ブースト
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 返す結果の最大数（デフォルト: 20）
 * @param filters フィルタリング条件（オプション）
 * @returns 類似リレーションの配列（relationId, similarity, scoreを含む）
 */
export async function findSimilarRelationsHybrid(
  queryText: string,
  limit: number = 20,
  filters?: {
    organizationId?: string;
    relationType?: string;
    topicId?: string;
  }
): Promise<Array<{ relationId: string; similarity: number; score: number }>> {
  try {
    // 1. ベクトル検索で候補を取得（多めに取得）
    const vectorResults = await findSimilarRelations(
      queryText,
      limit * 2,
      filters?.organizationId
    );

    if (vectorResults.length === 0) {
      return [];
    }

    // 2. クエリに基づいて重みを調整
    const weights = adjustWeightsForQuery(queryText);

    // 3. メタデータでフィルタリング・ブースト（新しいスコアリング関数を使用）
    const enhancedResults: Array<{ relationId: string; similarity: number; score: number }> = [];
    
    // クエリテキストを小文字に変換してキーワード抽出
    const queryLower = queryText.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2); // 2文字以上の単語のみ
    
    for (const result of vectorResults) {
      try {
        // リレーションデータを取得
        const relation = await getRelationById(result.relationId);
        if (!relation) {
          continue;
        }

        // 新しいスコアリング関数を使用
        let score = calculateRelationScore(result.similarity, relation, weights);

        // リレーションタイプが一致する場合は追加ブースト
        if (filters?.relationType && relation.relationType === filters.relationType) {
          score = Math.min(1.0, score + 0.1);
        }

        // トピックIDが一致する場合は追加ブースト
        if (filters?.topicId && relation.topicId === filters.topicId) {
          score = Math.min(1.0, score + 0.08);
        }

        // 説明テキストマッチのブースト
        if (relation.description) {
          const descriptionLower = relation.description.toLowerCase();
          let descriptionMatchCount = 0;
          for (const word of queryWords) {
            if (descriptionLower.includes(word)) {
              descriptionMatchCount++;
            }
          }
          if (descriptionMatchCount > 0) {
            score = Math.min(1.0, score + 0.05 * Math.min(descriptionMatchCount / queryWords.length, 1.0));
          }
        }

        // リレーションタイプ名マッチのブースト
        const relationTypeLower = relation.relationType.toLowerCase();
        for (const word of queryWords) {
          if (relationTypeLower.includes(word)) {
            score = Math.min(1.0, score + 0.05);
            break;
          }
        }

        // メタデータマッチのブースト
        if (relation.metadata && Object.keys(relation.metadata).length > 0) {
          const metadataText = JSON.stringify(relation.metadata).toLowerCase();
          for (const word of queryWords) {
            if (metadataText.includes(word)) {
              score = Math.min(1.0, score + 0.02);
              break;
            }
          }
        }

        enhancedResults.push({
          relationId: result.relationId,
          similarity: result.similarity,
          score,
        });
      } catch (error) {
        // リレーション取得エラーは無視して続行
        console.warn(`リレーション ${result.relationId} の取得エラー:`, error);
      }
    }

    // 4. スコアでソートして上位を返す
    return enhancedResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    const ragError = handleRAGSearchError(error, {
      queryText,
      limit,
      filters,
    });
    ragError.log();
    
    // エラーが発生した場合は従来の検索にフォールバック
    try {
      const fallbackResults = await findSimilarRelations(
        queryText,
        limit,
        filters?.organizationId
      );
      return fallbackResults.map(r => ({ ...r, score: r.similarity }));
    } catch (fallbackError) {
      // フォールバックも失敗した場合は空配列を返す
      return safeHandleRAGSearchError(fallbackError, [], {
        queryText,
        limit,
        filters,
      });
    }
  }
}

/**
 * 既存のリレーション埋め込みを一括更新
 * 
 * @param relationIds リレーションIDの配列
 * @param organizationId 組織ID
 * @param forceRegenerate 既存の埋め込みを強制的に再生成するか（デフォルト: false）
 * @param onProgress 進捗コールバック（current, total, relationId）
 */
export async function batchUpdateRelationEmbeddings(
  relationIds: string[],
  organizationId: string,
  forceRegenerate: boolean = false,
  onProgress?: (current: number, total: number, relationId: string, status: 'processing' | 'skipped' | 'error' | 'success') => void
): Promise<{ success: number; skipped: number; errors: number }> {
  console.log(`📊 ${relationIds.length}件のリレーション埋め込みを一括${forceRegenerate ? '再生成' : '生成'}します...`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < relationIds.length; i++) {
    const relationId = relationIds[i];
    try {
      // 既に埋め込みが存在するかチェック
      const existing = await getRelationEmbedding(relationId);
      if (existing && !forceRegenerate) {
        console.log(`⏭️  リレーション ${relationId} は既に埋め込みが存在するためスキップ`);
        skippedCount++;
        onProgress?.(i + 1, relationIds.length, relationId, 'skipped');
        continue;
      }

      // リレーションを取得してtopicIdを取得
      const relation = await getRelationById(relationId);
      if (!relation) {
        console.warn(`⚠️ リレーションが見つかりません: ${relationId}`);
        errorCount++;
        onProgress?.(i + 1, relationIds.length, relationId, 'error');
        continue;
      }

      const result = await saveRelationEmbeddingAsync(relationId, relation.topicId, organizationId);
      if (result) {
        successCount++;
        onProgress?.(i + 1, relationIds.length, relationId, 'success');
      } else {
        // saveRelationEmbeddingAsyncがfalseを返した場合（リレーションが見つからない、既に生成中など）
        errorCount++;
        onProgress?.(i + 1, relationIds.length, relationId, 'error');
        console.warn(`⚠️ リレーション ${relationId} の埋め込み生成がスキップされました`);
      }
      
      // APIレート制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`リレーション ${relationId} の埋め込み生成エラー:`, error);
      errorCount++;
      onProgress?.(i + 1, relationIds.length, relationId, 'error');
      // エラーが発生しても続行
    }
  }

  console.log(`✅ リレーション埋め込みの一括${forceRegenerate ? '再生成' : '生成'}が完了しました (成功: ${successCount}, スキップ: ${skippedCount}, エラー: ${errorCount})`);
  return { success: successCount, skipped: skippedCount, errors: errorCount };
}

/**
 * バージョン不一致のリレーション埋め込みを検出
 * 
 * @param organizationId 組織ID（オプション、指定しない場合は全組織）
 * @returns バージョン不一致のリレーションIDの配列
 */
export async function findOutdatedRelationEmbeddings(
  organizationId?: string
): Promise<Array<{ relationId: string; currentVersion: string; expectedVersion: string; model: string }>> {
  // ChromaDBを使用する場合（動的インポート）
  if (shouldUseChroma()) {
    try {
      const outdated: Array<{ relationId: string; currentVersion: string; expectedVersion: string; model: string }> = [];
      
      // ChromaDBからすべてのリレーション埋め込みを取得
      // 注意: ChromaDBから全件取得する機能が必要な場合は、relationEmbeddingsChroma.tsに実装が必要
      // 現在は空配列を返す（実装が必要な場合は後で追加）
      console.warn('⚠️ findOutdatedRelationEmbeddings: ChromaDBからの全件取得機能は未実装です。');
      
      return outdated;
    } catch (error) {
      console.error('バージョン不一致の検出エラー:', error);
      return [];
    }
  }

  // ChromaDBが無効な場合、埋め込みデータは存在しないため空配列を返す
  console.warn('⚠️ ChromaDBが無効です。リレーション埋め込みのバージョン確認はできません。設定ページ（/settings）でChromaDBを有効化してください。');
  return [];
}

/**
 * バージョン不一致のリレーション埋め込みを一括再生成
 * 
 * @param organizationId 組織ID（オプション）
 * @param onProgress 進捗コールバック
 */
export async function regenerateOutdatedRelationEmbeddings(
  organizationId?: string,
  onProgress?: (current: number, total: number, relationId: string, status: 'processing' | 'success' | 'error') => void
): Promise<{ regenerated: number; errors: number }> {
  try {
    const outdated = await findOutdatedRelationEmbeddings(organizationId);
    
    if (outdated.length === 0) {
      console.log('✅ バージョン不一致の埋め込みはありません');
      return { regenerated: 0, errors: 0 };
    }
    
    console.log(`🔄 ${outdated.length}件のバージョン不一致埋め込みを再生成します...`);
    
    let regenerated = 0;
    let errors = 0;
    
    for (let i = 0; i < outdated.length; i++) {
      const { relationId } = outdated[i];
      onProgress?.(i + 1, outdated.length, relationId, 'processing');
      
      try {
        // リレーションを取得
        const relation = await getRelationById(relationId);
        if (!relation || !relation.organizationId) {
          console.warn(`⚠️ リレーションが見つからないか、organizationIdが設定されていません: ${relationId}`);
          errors++;
          onProgress?.(i + 1, outdated.length, relationId, 'error');
          continue;
        }
        
        // 埋め込みを再生成
        await saveRelationEmbedding(relationId, relation.topicId, relation.organizationId, relation);
        regenerated++;
        onProgress?.(i + 1, outdated.length, relationId, 'success');
        
        // APIレート制限を考慮
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ リレーション ${relationId} の再生成エラー:`, error);
        errors++;
        onProgress?.(i + 1, outdated.length, relationId, 'error');
      }
    }
    
    console.log(`✅ バージョン不一致埋め込みの再生成が完了しました (成功: ${regenerated}, エラー: ${errors})`);
    return { regenerated, errors };
  } catch (error) {
    console.error('バージョン不一致埋め込みの再生成エラー:', error);
    throw error;
  }
}
