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
import { getEntityById, getAllEntities, getEntitiesByIds } from './entityApi';
import { shouldUseChroma } from './chromaConfig';
import { calculateEntityScore, adjustWeightsForQuery } from './ragSearchScoring';
import { handleRAGSearchError, safeHandleRAGSearchError, RAGSearchErrorType } from './ragSearchErrors';
import pLimit from 'p-limit';
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
  entityId: string,
  organizationId?: string
): Promise<EntityEmbedding | null> {
  // ChromaDBを使用する場合（動的インポート）
  if (shouldUseChroma()) {
    try {
      // organizationIdが必要な場合は、エンティティから取得を試みる
      let orgId = organizationId;
      if (!orgId) {
        try {
          const entity = await getEntityById(entityId);
          orgId = entity?.organizationId;
        } catch (e) {
          // エンティティの取得に失敗した場合は続行
        }
      }

      if (orgId) {
        try {
          const { getEntityEmbeddingFromChroma } = await import('./entityEmbeddingsChroma');
          const embedding = await getEntityEmbeddingFromChroma(entityId, orgId);
          if (embedding) {
            return embedding;
          }
        } catch (chromaError: any) {
          // ChromaDBサーバーが起動していない場合など、エラーは無視してnullを返す
          // エラーメッセージに「ChromaDBサーバーの起動に失敗しました」が含まれている場合は、サーバーが起動していないと判断
          const errorMessage = chromaError?.message || String(chromaError);
          if (errorMessage.includes('ChromaDBサーバーの起動に失敗しました') || 
              errorMessage.includes('ChromaDBクライアントが初期化されていません')) {
            // ChromaDBサーバーが起動していない場合は、埋め込みが存在しないと判断
            console.debug(`ChromaDBサーバーが起動していないため、埋め込みの存在確認をスキップ: ${entityId}`);
            return null;
          }
          // その他のエラーも無視（埋め込みが存在しない可能性）
          console.debug(`ChromaDBからの埋め込み取得エラー（無視）: ${entityId}`, errorMessage);
        }
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
      
      // デバッグ: ChromaDBのコレクション件数を確認
      try {
        const { countEntitiesInChroma } = await import('./entityEmbeddingsChroma');
        if (organizationId) {
          const chromaCount = await countEntitiesInChroma(organizationId);
          console.log(`[findSimilarEntities] ChromaDBコレクション entities_${organizationId} の件数: ${chromaCount}件`);
          if (chromaCount === 0) {
            console.warn(`[findSimilarEntities] ⚠️ ChromaDBコレクションが空です。エンティティがChromaDBに保存されていない可能性があります。`);
          }
        } else {
          // organizationIdが未指定の場合、すべての組織のコレクション件数を確認
          try {
            const { getAllOrganizationsFromTree } = await import('./orgApi');
            const orgs = await getAllOrganizationsFromTree();
            let totalCount = 0;
            for (const org of orgs) {
              try {
                const count = await countEntitiesInChroma(org.id);
                totalCount += count;
                if (count > 0) {
                  console.log(`[findSimilarEntities] 組織「${org.name}」(${org.id}): ${count}件のエンティティ埋め込み`);
                }
              } catch (e) {
                // エラーは無視
              }
            }
            console.log(`[findSimilarEntities] 全組織のエンティティ埋め込み合計: ${totalCount}件`);
            if (totalCount === 0) {
              console.warn(`[findSimilarEntities] ⚠️ すべての組織のChromaDBコレクションが空です。エンティティの埋め込みが生成されていない可能性があります。`);
            }
          } catch (orgError: any) {
            console.warn(`[findSimilarEntities] 組織一覧の取得に失敗しました:`, orgError?.message || orgError);
          }
        }
      } catch (countError: any) {
        console.warn(`[findSimilarEntities] ChromaDBコレクション件数の取得に失敗しました:`, countError?.message || countError);
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
 * キーワードマッチスコアを計算（SQLiteのキーワード検索用）
 * 完全一致、部分一致、エイリアス一致、メタデータ（役職など）一致などを考慮
 */
function calculateKeywordMatchScore(
  queryText: string,
  entity: Entity
): number {
  const queryLower = queryText.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  
  let score = 0;
  const entityNameLower = entity.name.toLowerCase();
  
  // 1. 完全一致（最高スコア）
  if (entityNameLower === queryLower) {
    score = 1.0;
  }
  // 2. 名前の完全一致（クエリがエンティティ名の一部、またはエンティティ名がクエリの一部）
  else if (entityNameLower.includes(queryLower) || queryLower.includes(entityNameLower)) {
    // クエリがエンティティ名の先頭にある場合は高スコア
    if (entityNameLower.startsWith(queryLower) || queryLower.startsWith(entityNameLower)) {
      score = 0.9;
    } else {
      score = 0.7;
    }
  }
  // 3. 単語レベルの一致（名前とメタデータの両方をチェック）
  else {
    let nameMatchedWords = 0;
    let metadataMatchedWords = 0;
    
    // 名前でのマッチング
    for (const word of queryWords) {
      if (entityNameLower.includes(word)) {
        nameMatchedWords++;
      }
    }
    
    // メタデータでのマッチング（役職、部署など）
    if (entity.metadata && Object.keys(entity.metadata).length > 0) {
      const metadataText = JSON.stringify(entity.metadata).toLowerCase();
      for (const word of queryWords) {
        if (metadataText.includes(word)) {
          metadataMatchedWords++;
        }
      }
    }
    
    // 名前とメタデータの両方でマッチした場合は高スコア
    if (nameMatchedWords > 0 && metadataMatchedWords > 0) {
      score = 0.8; // 「太田部長」→名前「太田」+メタデータ「部長」の場合
    } else if (nameMatchedWords > 0) {
      score = 0.5 * (nameMatchedWords / queryWords.length);
    } else if (metadataMatchedWords > 0) {
      score = 0.4 * (metadataMatchedWords / queryWords.length);
    }
  }
  
  // 4. エイリアス一致（追加スコア）
  if (entity.aliases && entity.aliases.length > 0) {
    for (const alias of entity.aliases) {
      const aliasLower = alias.toLowerCase();
      if (aliasLower === queryLower) {
        score = Math.max(score, 0.95); // エイリアス完全一致は高スコア
        break;
      } else if (aliasLower.includes(queryLower) || queryLower.includes(aliasLower)) {
        score = Math.max(score, score + 0.2); // エイリアス部分一致は追加スコア
        break;
      }
    }
  }
  
  // 5. メタデータ一致（役職、部署など）- 既に単語レベルでチェック済みだが、完全一致の場合は追加スコア
  if (entity.metadata && Object.keys(entity.metadata).length > 0) {
    const metadataText = JSON.stringify(entity.metadata).toLowerCase();
    if (metadataText.includes(queryLower)) {
      score = Math.min(1.0, score + 0.15); // メタデータ完全一致は追加スコア
    }
  }
  
  return Math.min(1.0, score);
}

/**
 * SQLiteキーワード検索を実行
 * 名前、エイリアス、メタデータ（役職、部署など）を検索対象に含める
 * 
 * @internal デバッグ用にエクスポート（通常は非公開）
 */
export async function searchEntitiesByKeywords(
  queryText: string,
  limit: number,
  filters?: {
    organizationId?: string;
    entityType?: string;
  }
): Promise<Array<{ entityId: string; keywordScore: number }>> {
  try {
    const { getAllEntities } = await import('./entityApi');
    
    console.log(`[searchEntitiesByKeywords] 🔍 キーワード検索開始: queryText="${queryText}", organizationId="${filters?.organizationId || '全組織'}"`);
    
    // 全エンティティを取得（organizationIdでフィルタリングする場合でも、まず全件取得してからフィルタリング）
    // これにより、メタデータ検索も確実に実行できる
    const allEntities = await getAllEntities();
    console.log(`[searchEntitiesByKeywords] 全エンティティ取得: ${allEntities.length}件`);
    
    // クエリを単語に分割（「太田部長」→「太田」「部長」）
    const queryLower = queryText.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    
    // キーワードマッチング（名前、エイリアス、メタデータのすべてをチェック）
    let keywordEntities = allEntities.filter(entity => {
      // 組織IDでフィルタリング
      if (filters?.organizationId && entity.organizationId !== filters.organizationId) {
        return false;
      }
      
      // エンティティタイプでフィルタリング
      if (filters?.entityType && entity.type !== filters.entityType) {
        return false;
      }
      
      const entityNameLower = entity.name.toLowerCase();
      const metadataText = entity.metadata && Object.keys(entity.metadata).length > 0
        ? JSON.stringify(entity.metadata).toLowerCase()
        : '';
      
      // 1. 名前でのマッチング（完全一致または部分一致）
      if (entityNameLower.includes(queryLower) || queryLower.includes(entityNameLower)) {
        return true;
      }
      
      // 2. 単語レベルでのマッチング（名前）
      for (const word of queryWords) {
        if (entityNameLower.includes(word)) {
          return true;
        }
      }
      
      // 3. エイリアスでのマッチング
      if (entity.aliases && entity.aliases.length > 0) {
        for (const alias of entity.aliases) {
          const aliasLower = alias.toLowerCase();
          if (aliasLower.includes(queryLower) || queryLower.includes(aliasLower)) {
            return true;
          }
          for (const word of queryWords) {
            if (aliasLower.includes(word)) {
              return true;
            }
          }
        }
      }
      
      // 4. メタデータでのマッチング（役職、部署など）
      // 「太田部長」→名前「太田」+メタデータ「部長」の場合を検出
      if (metadataText) {
        if (metadataText.includes(queryLower)) {
          return true;
        }
        for (const word of queryWords) {
          if (metadataText.includes(word)) {
            // 名前でもマッチしている場合は確実に含める
            if (entityNameLower.includes(queryWords.find(w => w !== word) || '')) {
              return true;
            }
            // メタデータのみのマッチでも含める（役職などで検索する場合）
            return true;
          }
        }
      }
      
      return false;
    });
    
    console.log(`[searchEntitiesByKeywords] キーワードマッチ: ${keywordEntities.length}件`);
    
    // キーワードマッチスコアを計算
    const keywordResults = keywordEntities.map(entity => ({
      entityId: entity.id,
      keywordScore: calculateKeywordMatchScore(queryText, entity),
    }));
    
    // スコアでソート
    keywordResults.sort((a, b) => b.keywordScore - a.keywordScore);
    
    console.log(`[searchEntitiesByKeywords] キーワード検索完了: ${keywordResults.length}件（上位${Math.min(limit, keywordResults.length)}件を返す）`);
    if (keywordResults.length > 0) {
      console.log(`[searchEntitiesByKeywords] トップ5のスコア:`, keywordResults.slice(0, 5).map(r => ({
        entityId: r.entityId,
        keywordScore: r.keywordScore.toFixed(4),
      })));
    }
    
    return keywordResults.slice(0, limit);
  } catch (error: any) {
    console.warn(`[searchEntitiesByKeywords] SQLiteキーワード検索エラー:`, error?.message || error);
    return [];
  }
}

/**
 * ハイブリッド検索: ChromaDBベクトル検索 + SQLiteキーワード検索 + 統合スコアリング
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
    console.log(`[findSimilarEntitiesHybrid] 🔍 ハイブリッド検索開始: queryText="${queryText}", limit=${limit}, organizationId="${filters?.organizationId || '未指定（組織横断検索）'}"`);
    
    // 1. ChromaDBベクトル検索とSQLiteキーワード検索を並列実行
    const [vectorResults, keywordResults] = await Promise.all([
      findSimilarEntities(
        queryText,
        limit * 2,
        filters?.organizationId
      ).catch(error => {
        console.warn(`[findSimilarEntitiesHybrid] ベクトル検索エラー:`, error);
        return [];
      }),
      searchEntitiesByKeywords(
        queryText,
        limit * 2,
        filters
      ).catch(error => {
        console.warn(`[findSimilarEntitiesHybrid] キーワード検索エラー:`, error);
        return [];
      }),
    ]);

    console.log(`[findSimilarEntitiesHybrid] ベクトル検索結果: ${vectorResults.length}件, キーワード検索結果: ${keywordResults.length}件`);
    
    // ベクトル検索とキーワード検索の両方が空の場合は早期リターン
    if (vectorResults.length === 0 && keywordResults.length === 0) {
      console.warn(`[findSimilarEntitiesHybrid] ⚠️ ベクトル検索とキーワード検索の両方で0件の結果が返されました。`);
      return [];
    }
    
    // キーワード検索のみで結果がある場合でも続行（ベクトル検索が失敗した場合のフォールバック）
    if (vectorResults.length === 0 && keywordResults.length > 0) {
      console.log(`[findSimilarEntitiesHybrid] ベクトル検索は0件ですが、キーワード検索で${keywordResults.length}件の結果があります。キーワード検索結果を使用します。`);
    }

    // 2. ベクトル検索とキーワード検索の結果を統合
    // エンティティIDをキーとして、ベクトル類似度とキーワードスコアをマージ
    const vectorMap = new Map<string, number>();
    const keywordMap = new Map<string, number>();
    
    for (const result of vectorResults) {
      vectorMap.set(result.entityId, result.similarity);
    }
    
    for (const result of keywordResults) {
      keywordMap.set(result.entityId, result.keywordScore);
    }
    
    // すべてのユニークなエンティティIDを収集
    const allEntityIds = new Set<string>();
    vectorMap.forEach((_, id) => allEntityIds.add(id));
    keywordMap.forEach((_, id) => allEntityIds.add(id));
    
    console.log(`[findSimilarEntitiesHybrid] 統合対象エンティティ数: ${allEntityIds.size}件（ベクトル: ${vectorMap.size}件, キーワード: ${keywordMap.size}件）`);

    // 3. エンティティデータを一括取得（パフォーマンス最適化）
    const entityIds = Array.from(allEntityIds);
    console.log(`[findSimilarEntitiesHybrid] エンティティ一括取得開始: ${entityIds.length}件`);
    let entities: Entity[] = [];
    let entityMap = new Map<string, Entity>();
    
    try {
      entities = await getEntitiesByIds(entityIds, 5);
      entityMap = new Map(entities.map(e => [e.id, e]));
      console.log(`[findSimilarEntitiesHybrid] エンティティ一括取得完了: ${entities.length}件取得（${entityIds.length}件中）`);
    } catch (error: any) {
      console.error(`[findSimilarEntitiesHybrid] ❌ エンティティ一括取得エラー:`, error?.message || error);
    }

    // 4. 統合スコアリング: ベクトル類似度とキーワードスコアを組み合わせ
    const weights = adjustWeightsForQuery(queryText);
    const enhancedResults: Array<{ entityId: string; similarity: number; score: number }> = [];
    
    // 重み付け: ベクトル類似度60%、キーワードスコア40%（キーワード完全一致の場合はさらにブースト）
    const VECTOR_WEIGHT = 0.6;
    const KEYWORD_WEIGHT = 0.4;
    
    for (const entityId of allEntityIds) {
      try {
        const entity = entityMap.get(entityId);
        if (!entity) {
          // エンティティが見つからない場合でも、ベクトルまたはキーワードスコアがあれば含める
          const vectorSim = vectorMap.get(entityId) || 0;
          const keywordScore = keywordMap.get(entityId) || 0;
          const combinedScore = vectorSim * VECTOR_WEIGHT + keywordScore * KEYWORD_WEIGHT;
          
          if (combinedScore > 0) {
            enhancedResults.push({
              entityId,
              similarity: vectorSim,
              score: combinedScore,
            });
          }
          continue;
        }

        // ベクトル類似度とキーワードスコアを取得
        const vectorSim = vectorMap.get(entityId) || 0;
        const keywordScore = keywordMap.get(entityId) || calculateKeywordMatchScore(queryText, entity);
        
        // キーワード完全一致または高スコアの場合は、ベクトル類似度よりも優先
        let score: number;
        if (keywordScore >= 0.9) {
          // 完全一致（名前完全一致、エイリアス完全一致など）の場合は、ベクトル類似度に関係なく最上位に
          score = 0.95 + (keywordScore - 0.9) * 0.5; // 0.95〜1.0の範囲
          score = Math.min(1.0, score);
        } else if (keywordScore >= 0.7) {
          // 高スコア（名前部分一致など）の場合は、キーワードスコアを重視
          score = keywordScore * 0.7 + vectorSim * 0.3; // キーワード70%、ベクトル30%
          score = Math.min(1.0, score + 0.15); // 追加ブースト
        } else {
          // 通常の場合は、ベクトル類似度とキーワードスコアの重み付け平均
          score = vectorSim * VECTOR_WEIGHT + keywordScore * KEYWORD_WEIGHT;
        }
        
        // メタデータスコアリング（既存のロジック）
        score = calculateEntityScore(score, entity, weights);
        
        // エンティティタイプが一致する場合は追加ブースト
        if (filters?.entityType && entity.type === filters.entityType) {
          score = Math.min(1.0, score + 0.1);
        }

        enhancedResults.push({
          entityId,
          similarity: vectorSim,
          score,
        });
      } catch (error) {
        // エンティティ取得エラーは無視して続行
        console.warn(`エンティティ ${entityId} の処理エラー:`, error);
      }
    }

    // 5. スコアでソートして上位を返す
    const sortedResults = enhancedResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    console.log(`[findSimilarEntitiesHybrid] 統合検索完了: ${sortedResults.length}件の結果を返します`);
    if (sortedResults.length > 0) {
      console.log(`[findSimilarEntitiesHybrid] トップ5のスコア:`, sortedResults.slice(0, 5).map(r => ({
        entityId: r.entityId,
        score: r.score.toFixed(4),
        similarity: r.similarity.toFixed(4),
      })));
    }
    
    return sortedResults;
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
  onProgress?: (current: number, total: number, entityId: string, status: 'processing' | 'skipped' | 'error' | 'success') => void,
  shouldCancel?: () => boolean
): Promise<{ success: number; skipped: number; errors: number }> {
  console.log(`📊 ${entityIds.length}件のエンティティ埋め込みを一括${forceRegenerate ? '再生成' : '生成'}します...`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let processedCount = 0;

  // 並列数を3〜5に制限（メモリ使用量を抑えるため）
  const limit = pLimit(5);
  
  // 各エンティティの処理を並列実行（同時実行数制限付き）
  const promises = entityIds.map((entityId, index) => 
    limit(async () => {
      // 停止チェック
      if (shouldCancel && shouldCancel()) {
        return { status: 'cancelled' as const };
      }
      
      try {
        // SQLiteのchromaSyncedフラグをチェック（高速）
        if (!forceRegenerate) {
          try {
            const entityDoc = await callTauriCommand('doc_get', {
              collectionName: 'entities',
              docId: entityId,
            });
            
            if (entityDoc?.exists && entityDoc?.data) {
              const chromaSynced = entityDoc.data.chromaSynced;
              if (chromaSynced === 1) {
                console.log(`⏭️  エンティティ ${entityId} は既に埋め込みが存在するためスキップ（SQLiteフラグ確認）`);
                const current = ++processedCount;
                skippedCount++;
                onProgress?.(current, entityIds.length, entityId, 'skipped');
                return { status: 'skipped' as const };
              }
            }
          } catch (sqliteError: any) {
            // SQLiteからの取得に失敗した場合は続行（ChromaDBから確認を試みる）
            console.debug(`SQLiteからのフラグ取得エラー（続行）: ${entityId}`, sqliteError?.message || sqliteError);
          }
        }
        
        // SQLiteで確認できない場合、ChromaDBから確認（フォールバック）
        if (!forceRegenerate) {
          const existing = await getEntityEmbedding(entityId, organizationId);
          if (existing) {
            console.log(`⏭️  エンティティ ${entityId} は既に埋め込みが存在するためスキップ（ChromaDB確認）`);
            const current = ++processedCount;
            skippedCount++;
            onProgress?.(current, entityIds.length, entityId, 'skipped');
            return { status: 'skipped' as const };
          }
        }

        const result = await saveEntityEmbeddingAsync(entityId, organizationId);
        const current = ++processedCount;
        
        if (result) {
          successCount++;
          onProgress?.(current, entityIds.length, entityId, 'success');
          return { status: 'success' as const };
        } else {
          // saveEntityEmbeddingAsyncがfalseを返した場合（エンティティが見つからない、既に生成中など）
          errorCount++;
          onProgress?.(current, entityIds.length, entityId, 'error');
          console.warn(`⚠️ エンティティ ${entityId} の埋め込み生成がスキップされました`);
          return { status: 'error' as const };
        }
      } catch (error) {
        const current = ++processedCount;
        console.error(`エンティティ ${entityId} の埋め込み生成エラー:`, error);
        errorCount++;
        onProgress?.(current, entityIds.length, entityId, 'error');
        return { status: 'error' as const };
      } finally {
        // 200件ごとにメモリを解放（ガベージコレクションを促す）
        if (processedCount % 200 === 0 && typeof global !== 'undefined' && (global as any).gc) {
          (global as any).gc();
          console.log(`🧹 [メモリ解放] ${processedCount}件処理完了時点でガベージコレクションを実行`);
        }
      }
    })
  );

  // すべての処理を待機
  await Promise.allSettled(promises);

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
