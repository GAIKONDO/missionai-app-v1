/**
 * エンティティ埋め込みの管理ユーティリティ
 * ナレッジグラフRAG検索用のエンティティ埋め込み機能を提供
 */

import { callTauriCommand } from './localFirebase';
import { 
  generateEmbedding,
  generateEnhancedEmbedding,
  generateMetadataEmbedding,
  cosineSimilarity 
} from './embeddings';
import type { EntityEmbedding, CreateEntityEmbeddingInput } from '@/types/entityEmbedding';
import type { Entity, EntityMetadata } from '@/types/entity';
import { getEntityById, getAllEntities } from './entityApi';
import { shouldUseChroma } from './chromaConfig';
import { calculateEntityScore, adjustWeightsForQuery } from './ragSearchScoring';
import { handleRAGSearchError, safeHandleRAGSearchError, RAGSearchErrorType } from './ragSearchErrors';
// ChromaDB関連は動的インポート（ビルドエラーを回避）

/**
 * 現在の埋め込みバージョン
 * 埋め込みモデルや生成ロジックが変更された場合はこの値を更新
 */
export const CURRENT_EMBEDDING_VERSION = '1.0';

/**
 * 現在の埋め込みモデル
 */
export const CURRENT_EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * エンティティ埋め込みを保存
 * 
 * @param entityId エンティティID
 * @param organizationId 組織ID
 * @param entity エンティティデータ（埋め込み生成に使用）
 */
export async function saveEntityEmbedding(
  entityId: string,
  organizationId: string,
  entity: Entity
): Promise<void> {
  // クライアント側でのみ実行（サーバーサイドレンダリングを回避）
  if (typeof window === 'undefined') {
    throw new Error('エンティティ埋め込みの保存はクライアント側でのみ実行可能です');
  }
  
  try {
    const now = new Date().toISOString();
    const embeddingVersion = CURRENT_EMBEDDING_VERSION;
    
    // エンティティの埋め込みテキストを構築
    const nameText = entity.name;
    const aliasesText = entity.aliases && entity.aliases.length > 0 
      ? entity.aliases.join(', ') 
      : '';
    
    // メタデータからテキストを構築
    const metadataParts: string[] = [];
    if (entity.metadata) {
      const metadata = entity.metadata as EntityMetadata;
      if (metadata.role) metadataParts.push(`役割: ${metadata.role}`);
      if (metadata.department) metadataParts.push(`部署: ${metadata.department}`);
      if (metadata.position) metadataParts.push(`役職: ${metadata.position}`);
      if (metadata.industry) metadataParts.push(`業界: ${metadata.industry}`);
      if (metadata.email) metadataParts.push(`メール: ${metadata.email}`);
      if (metadata.website) metadataParts.push(`Webサイト: ${metadata.website}`);
    }
    const metadataText = metadataParts.join(', ');
    
    // 埋め込みを生成
    let combinedEmbedding: number[] | undefined;
    let nameEmbedding: number[] | undefined;
    let metadataEmbedding: number[] | undefined;

    try {
      // 名前の埋め込み
      nameEmbedding = await generateEmbedding(nameText);
      
      // メタデータの埋め込み（メタデータがある場合のみ）
      if (metadataText) {
        try {
          metadataEmbedding = await generateMetadataEmbedding({
            keywords: entity.aliases || [],
            semanticCategory: entity.type,
            summary: metadataText,
          });
        } catch (error) {
          console.warn('メタデータ埋め込みの生成に失敗しました（続行します）:', error);
        }
      }
      
      // 統合埋め込みを生成（名前+エイリアス+メタデータ）
      const combinedText = aliasesText 
        ? `${nameText}\n${nameText}\n${nameText}\n\n別名: ${aliasesText}\n\n${metadataText}`
        : `${nameText}\n${nameText}\n${nameText}\n\n${metadataText}`;
      
      combinedEmbedding = await generateEmbedding(combinedText.trim());
    } catch (error) {
      console.error('エンティティ埋め込みの生成に失敗しました:', error);
      throw error;
    }
    
    // 埋め込みデータを準備
    const embeddingData: EntityEmbedding = {
      id: entityId,
      entityId,
      organizationId,
      combinedEmbedding,
      nameEmbedding,
      metadataEmbedding,
      embeddingModel: CURRENT_EMBEDDING_MODEL,
      embeddingVersion,
      createdAt: now,
      updatedAt: now,
    };

    // ChromaDBを使用する場合（動的インポート）
    if (shouldUseChroma()) {
      try {
        const { saveEntityEmbeddingToChroma } = await import('./entityEmbeddingsChroma');
        await saveEntityEmbeddingToChroma(entityId, organizationId, entity);
        console.log(`✅ ChromaDBにエンティティ埋め込みを保存しました: ${entityId}`);
        
        // ChromaDB同期状態を更新（entitiesテーブルのchromaSyncedカラムを1に設定）
        try {
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'entity',
            entityId: entityId,
            synced: true,
            error: null,
          });
          console.log(`✅ エンティティのChromaDB同期状態を更新しました: ${entityId}`);
        } catch (syncStatusError: any) {
          console.warn(`⚠️ ChromaDB同期状態の更新に失敗しました（ChromaDBには保存済み）: ${entityId}`, syncStatusError?.message || syncStatusError);
          // エラーが発生しても続行（ChromaDBには保存されているため）
        }
      } catch (chromaError: any) {
        console.error('❌ ChromaDBへの保存に失敗しました:', chromaError?.message || chromaError);
        
        // 同期状態を失敗として更新
        try {
          await callTauriCommand('update_chroma_sync_status', {
            entityType: 'entity',
            entityId: entityId,
            synced: false,
            error: chromaError?.message || String(chromaError),
          });
        } catch (syncStatusError: any) {
          console.warn(`⚠️ ChromaDB同期状態の更新に失敗しました: ${entityId}`, syncStatusError?.message || syncStatusError);
        }
        
        // 埋め込みデータはChromaDBにのみ保存されるため、エラーをスロー
        throw new Error(`エンティティ埋め込みの保存に失敗しました。ChromaDBが有効になっていることを確認してください: ${chromaError?.message || String(chromaError)}`);
      }
    } else {
      // ChromaDBが無効な場合、埋め込みデータは保存できない
      throw new Error('エンティティ埋め込みの保存にはChromaDBが必要です。設定ページ（/settings）でChromaDBを有効化してください。');
    }
    
    console.log(`✅ エンティティ埋め込みを保存しました: ${entityId}`);
  } catch (error) {
    console.error('エンティティ埋め込みの保存エラー:', error);
    // エラーが発生しても処理を続行（埋め込みはオプショナル）
    throw error;
  }
}

/**
 * SQLiteに埋め込みを保存（ヘルパー関数）
 * 
 * ⚠️ レガシーコード: entityEmbeddingsテーブルは廃止されました
 * ChromaDBが無効な場合のフォールバックとしてのみ使用されます
 * 通常はChromaDBを使用し、entitiesテーブルのchromaSyncedカラムで同期状態を管理します
 */
async function saveToSQLite(
  embeddingData: EntityEmbedding,
  combinedEmbedding?: number[],
  nameEmbedding?: number[],
  metadataEmbedding?: number[]
): Promise<void> {
  // 注意: entityEmbeddingsテーブルは廃止されましたが、ChromaDBが無効な場合のフォールバックとして残しています
  await callTauriCommand('doc_set', {
    collectionName: 'entityEmbeddings',
    docId: embeddingData.id,
    data: {
      ...embeddingData,
      // ベクトルをJSON文字列に変換
      combinedEmbedding: combinedEmbedding ? JSON.stringify(combinedEmbedding) : null,
      nameEmbedding: nameEmbedding ? JSON.stringify(nameEmbedding) : null,
      metadataEmbedding: metadataEmbedding ? JSON.stringify(metadataEmbedding) : null,
    },
  });
}

// 埋め込み生成中のエンティティIDを追跡（重複実行を防ぐ）
const embeddingGenerationInProgress = new Set<string>();

/**
 * エンティティ埋め込みを非同期で生成・保存
 * エラーが発生しても処理を続行する（オプショナルな機能のため）
 * 
 * @param entityId エンティティID
 * @param organizationId 組織ID
 * @returns 生成が成功したかどうか
 */
export async function saveEntityEmbeddingAsync(
  entityId: string,
  organizationId: string
): Promise<boolean> {
  // クライアント側でのみ実行
  if (typeof window === 'undefined') {
    console.warn('⚠️ エンティティ埋め込みの保存はクライアント側でのみ実行可能です');
    return false;
  }

  // 既に生成中の場合はスキップ
  if (embeddingGenerationInProgress.has(entityId)) {
    console.log(`⏭️  エンティティ ${entityId} の埋め込み生成は既に進行中です`);
    return false;
  }

  embeddingGenerationInProgress.add(entityId);
  
  try {
    // エンティティを取得
    const entity = await getEntityById(entityId);
    if (!entity) {
      console.warn(`⚠️ [埋め込み生成] エンティティが見つかりません: ${entityId}`);
      return false;
    }
    
    console.log(`🔄 [埋め込み生成] 開始: ${entity.name} (${entityId})`);
    
    // 埋め込みを生成
    await saveEntityEmbedding(entityId, organizationId, entity);
    
    console.log(`✅ [埋め込み生成] 完了: ${entity.name} (${entityId})`);
    return true;
  } catch (error: any) {
    // 詳細なエラー情報を記録
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || '';
    console.error(`❌ [埋め込み生成] エラー: ${entityId}`, {
      error: errorMessage,
      stack: errorStack,
      organizationId,
      timestamp: new Date().toISOString(),
    });
    return false;
  } finally {
    embeddingGenerationInProgress.delete(entityId);
  }
}

/**
 * エンティティ埋め込みの生成状態を確認
 * 
 * @param entityId エンティティID
 * @returns 埋め込みが存在するか、生成中か、エラーが発生したか
 */
export async function checkEntityEmbeddingStatus(
  entityId: string
): Promise<{
  exists: boolean;
  isGenerating: boolean;
  embedding: EntityEmbedding | null;
}> {
  const isGenerating = embeddingGenerationInProgress.has(entityId);
  const embedding = await getEntityEmbedding(entityId);
  
  return {
    exists: embedding !== null && embedding.combinedEmbedding !== null,
    isGenerating,
    embedding,
  };
}

/**
 * エンティティ埋め込みの生成を待機（リトライ付き）
 * 
 * @param entityId エンティティID
 * @param maxWaitTime 最大待機時間（ミリ秒、デフォルト: 30000）
 * @param checkInterval チェック間隔（ミリ秒、デフォルト: 1000）
 * @returns 埋め込みが生成されたかどうか
 */
export async function waitForEntityEmbedding(
  entityId: string,
  maxWaitTime: number = 30000,
  checkInterval: number = 1000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const status = await checkEntityEmbeddingStatus(entityId);
    
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
 * エンティティ埋め込みを取得
 * 
 * @param entityId エンティティID
 * @returns エンティティ埋め込みデータ、またはnull
 */
export async function getEntityEmbedding(
  entityId: string
): Promise<EntityEmbedding | null> {
  // ChromaDBを使用する場合（動的インポート）
  if (shouldUseChroma()) {
    try {
      const { getEntityEmbeddingFromChroma } = await import('./entityEmbeddingsChroma');
      const embedding = await getEntityEmbeddingFromChroma(entityId);
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
  console.warn('⚠️ ChromaDBが無効です。エンティティ埋め込みを取得できません。設定ページ（/settings）でChromaDBを有効化してください。');
  return null;
}

/**
 * 類似エンティティを検索（ベクトル類似度検索）
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 返す結果の最大数（デフォルト: 5）
 * @param organizationId 組織IDでフィルタ（オプション）
 * @returns 類似エンティティの配列（entityIdとsimilarityを含む）
 */
export async function findSimilarEntities(
  queryText: string,
  limit: number = 5,
  organizationId?: string
): Promise<Array<{ entityId: string; similarity: number }>> {
  // ChromaDB設定とorganizationIdの状態をログ出力
  const useChroma = shouldUseChroma();
  const localStorageValue = typeof window !== 'undefined' ? localStorage.getItem('useChromaDB') : null;
  console.log(`[findSimilarEntities] 🔍 検索開始: queryText="${queryText}", organizationId="${organizationId || '未指定'}", shouldUseChroma()=${useChroma}, localStorage['useChromaDB']="${localStorageValue}"`);
  
  // ChromaDBを使用する場合（動的インポート）
  // organizationIdが未指定の場合は組織横断検索を実行（Rust側で対応済み）
  if (useChroma) {
    try {
      console.log(`[findSimilarEntities] ChromaDB検索を試行: organizationId="${organizationId || '未指定（組織横断検索）'}", queryText="${queryText}"`);
      
      // デバッグ: ChromaDBのコレクション件数を確認（organizationIdが指定されている場合のみ）
      if (organizationId) {
        try {
          const { countEntitiesInChroma } = await import('./entityEmbeddingsChroma');
          const chromaCount = await countEntitiesInChroma(organizationId);
          console.log(`[findSimilarEntities] ChromaDBコレクション entities_${organizationId} の件数: ${chromaCount}件`);
          if (chromaCount === 0) {
            console.warn(`[findSimilarEntities] ⚠️ ChromaDBコレクションが空です。エンティティがChromaDBに保存されていない可能性があります。`);
          }
        } catch (countError: any) {
          console.warn(`[findSimilarEntities] ChromaDBコレクション件数の取得に失敗しました:`, countError?.message || countError);
        }
      }
      
      const { findSimilarEntitiesChroma } = await import('./entityEmbeddingsChroma');
      const results = await findSimilarEntitiesChroma(queryText, limit, organizationId);
      console.log(`[findSimilarEntities] ChromaDB検索完了: ${results.length}件の結果を取得`);
        return results;
    } catch (chromaError: any) {
      console.error(`[findSimilarEntities] ChromaDBでの検索に失敗しました:`, chromaError?.message || chromaError);
      // ChromaDB検索が失敗した場合は空の結果を返す（SQLiteフォールバックは削除）
      return [];
    }
  } else {
    // ChromaDBが無効な場合：埋め込みベクトルはChromaDBにのみ保存されるため、検索結果は空
    console.warn(`[findSimilarEntities] ⚠️ ChromaDBが無効です（localStorage['useChromaDB']="${localStorageValue}"）。`);
    console.warn(`[findSimilarEntities] 💡 埋め込みベクトルはChromaDBにのみ保存されます。ChromaDBを有効にするには、設定ページでChromaDBを有効化するか、コンソールで以下を実行: localStorage.setItem('useChromaDB', 'true')`);
        return [];
  }
}

/**
 * ハイブリッド検索: ベクトル検索 + メタデータフィルタリング・ブースト
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 返す結果の最大数（デフォルト: 20）
 * @param filters フィルタリング条件（オプション）
 * @returns 類似エンティティの配列（entityId, similarity, scoreを含む）
 */
export async function findSimilarEntitiesHybrid(
  queryText: string,
  limit: number = 20,
  filters?: {
    organizationId?: string;
    entityType?: string;
  }
): Promise<Array<{ entityId: string; similarity: number; score: number }>> {
  try {
    // 1. ベクトル検索で候補を取得（多めに取得）
    const vectorResults = await findSimilarEntities(
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
    const enhancedResults: Array<{ entityId: string; similarity: number; score: number }> = [];
    
    // クエリテキストを小文字に変換してキーワード抽出
    const queryLower = queryText.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2); // 2文字以上の単語のみ
    
    for (const result of vectorResults) {
      try {
        // エンティティデータを取得
        const entity = await getEntityById(result.entityId);
        if (!entity) {
          continue;
        }

        // 新しいスコアリング関数を使用
        let score = calculateEntityScore(result.similarity, entity, weights);

        // エンティティタイプが一致する場合は追加ブースト
        if (filters?.entityType && entity.type === filters.entityType) {
          score = Math.min(1.0, score + 0.1);
        }

        // 名前マッチのブースト（クエリのキーワードがエンティティ名に含まれる場合）
        const entityNameLower = entity.name.toLowerCase();
        let nameMatchCount = 0;
        for (const word of queryWords) {
          if (entityNameLower.includes(word)) {
            nameMatchCount++;
          }
        }
        if (nameMatchCount > 0) {
          score = Math.min(1.0, score + 0.05 * Math.min(nameMatchCount / queryWords.length, 1.0));
        }

        // 別名マッチのブースト
        if (entity.aliases && entity.aliases.length > 0) {
          for (const alias of entity.aliases) {
            const aliasLower = alias.toLowerCase();
            for (const word of queryWords) {
              if (aliasLower.includes(word)) {
                score = Math.min(1.0, score + 0.03);
                break; // 1つの別名で1回だけブースト
              }
            }
          }
        }

        // メタデータマッチのブースト
        if (entity.metadata && Object.keys(entity.metadata).length > 0) {
          const metadataText = JSON.stringify(entity.metadata).toLowerCase();
          for (const word of queryWords) {
            if (metadataText.includes(word)) {
              score = Math.min(1.0, score + 0.02);
              break;
            }
          }
        }

        enhancedResults.push({
          entityId: result.entityId,
          similarity: result.similarity,
          score,
        });
      } catch (error) {
        // エンティティ取得エラーは無視して続行
        console.warn(`エンティティ ${result.entityId} の取得エラー:`, error);
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
      const fallbackResults = await findSimilarEntities(
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
 * 既存のエンティティ埋め込みを一括更新
 * 
 * @param entityIds エンティティIDの配列
 * @param organizationId 組織ID
 * @param forceRegenerate 既存の埋め込みを強制的に再生成するか（デフォルト: false）
 * @param onProgress 進捗コールバック（current, total, entityId）
 */
export async function batchUpdateEntityEmbeddings(
  entityIds: string[],
  organizationId: string,
  forceRegenerate: boolean = false,
  onProgress?: (current: number, total: number, entityId: string, status: 'processing' | 'skipped' | 'error' | 'success') => void
): Promise<{ success: number; skipped: number; errors: number }> {
  console.log(`📊 ${entityIds.length}件のエンティティ埋め込みを一括${forceRegenerate ? '再生成' : '生成'}します...`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < entityIds.length; i++) {
    const entityId = entityIds[i];
    try {
      // 既に埋め込みが存在するかチェック
      const existing = await getEntityEmbedding(entityId);
      if (existing && !forceRegenerate) {
        console.log(`⏭️  エンティティ ${entityId} は既に埋め込みが存在するためスキップ`);
        skippedCount++;
        onProgress?.(i + 1, entityIds.length, entityId, 'skipped');
        continue;
      }

      const result = await saveEntityEmbeddingAsync(entityId, organizationId);
      if (result) {
        successCount++;
        onProgress?.(i + 1, entityIds.length, entityId, 'success');
      } else {
        // saveEntityEmbeddingAsyncがfalseを返した場合（エンティティが見つからない、既に生成中など）
        errorCount++;
        onProgress?.(i + 1, entityIds.length, entityId, 'error');
        console.warn(`⚠️ エンティティ ${entityId} の埋め込み生成がスキップされました`);
      }
      
      // APIレート制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`エンティティ ${entityId} の埋め込み生成エラー:`, error);
      errorCount++;
      onProgress?.(i + 1, entityIds.length, entityId, 'error');
      // エラーが発生しても続行
    }
  }

  console.log(`✅ エンティティ埋め込みの一括${forceRegenerate ? '再生成' : '生成'}が完了しました (成功: ${successCount}, スキップ: ${skippedCount}, エラー: ${errorCount})`);
  return { success: successCount, skipped: skippedCount, errors: errorCount };
}

/**
 * バージョン不一致のエンティティ埋め込みを検出
 * 
 * @param organizationId 組織ID（オプション、指定しない場合は全組織）
 * @returns バージョン不一致のエンティティIDの配列
 */
export async function findOutdatedEntityEmbeddings(
  organizationId?: string
): Promise<Array<{ entityId: string; currentVersion: string; expectedVersion: string; model: string }>> {
  // ChromaDBを使用する場合（動的インポート）
  if (shouldUseChroma()) {
    try {
      const outdated: Array<{ entityId: string; currentVersion: string; expectedVersion: string; model: string }> = [];
      
      // ChromaDBからすべてのエンティティ埋め込みを取得
      // 注意: ChromaDBから全件取得する機能が必要な場合は、entityEmbeddingsChroma.tsに実装が必要
      // 現在は空配列を返す（実装が必要な場合は後で追加）
      console.warn('⚠️ findOutdatedEntityEmbeddings: ChromaDBからの全件取得機能は未実装です。');
      
      return outdated;
    } catch (error) {
      console.error('バージョン不一致の検出エラー:', error);
      return [];
    }
  }

  // ChromaDBが無効な場合、埋め込みデータは存在しないため空配列を返す
  console.warn('⚠️ ChromaDBが無効です。エンティティ埋め込みのバージョン確認はできません。設定ページ（/settings）でChromaDBを有効化してください。');
  return [];
}

/**
 * バージョン不一致のエンティティ埋め込みを一括再生成
 * 
 * @param organizationId 組織ID（オプション）
 * @param onProgress 進捗コールバック
 */
export async function regenerateOutdatedEntityEmbeddings(
  organizationId?: string,
  onProgress?: (current: number, total: number, entityId: string, status: 'processing' | 'success' | 'error') => void
): Promise<{ regenerated: number; errors: number }> {
  try {
    const outdated = await findOutdatedEntityEmbeddings(organizationId);
    
    if (outdated.length === 0) {
      console.log('✅ バージョン不一致の埋め込みはありません');
      return { regenerated: 0, errors: 0 };
    }
    
    console.log(`🔄 ${outdated.length}件のバージョン不一致埋め込みを再生成します...`);
    
    let regenerated = 0;
    let errors = 0;
    
    for (let i = 0; i < outdated.length; i++) {
      const { entityId } = outdated[i];
      onProgress?.(i + 1, outdated.length, entityId, 'processing');
      
      try {
        // エンティティを取得
        const entity = await getEntityById(entityId);
        if (!entity || !entity.organizationId) {
          console.warn(`⚠️ エンティティが見つからないか、organizationIdが設定されていません: ${entityId}`);
          errors++;
          onProgress?.(i + 1, outdated.length, entityId, 'error');
          continue;
        }
        
        // 埋め込みを再生成
        await saveEntityEmbedding(entityId, entity.organizationId, entity);
        regenerated++;
        onProgress?.(i + 1, outdated.length, entityId, 'success');
        
        // APIレート制限を考慮
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ エンティティ ${entityId} の再生成エラー:`, error);
        errors++;
        onProgress?.(i + 1, outdated.length, entityId, 'error');
      }
    }
    
    console.log(`✅ バージョン不一致埋め込みの再生成が完了しました (成功: ${regenerated}, エラー: ${errors})`);
    return { regenerated, errors };
  } catch (error) {
    console.error('バージョン不一致埋め込みの再生成エラー:', error);
    throw error;
  }
}
