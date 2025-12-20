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
import { getRelationById, getAllRelations, getRelationsByIds } from './relationApi';
import { shouldUseChroma } from './chromaConfig';
import { calculateRelationScore, adjustWeightsForQuery } from './ragSearchScoring';
import { handleRAGSearchError, safeHandleRAGSearchError } from './ragSearchErrors';
import pLimit from 'p-limit';

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
  
  // companyIdがある場合はそれを使用、なければorganizationIdを使用
  const orgOrCompanyId = relation.companyId || organizationId || relation.organizationId || '';
  
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
      organizationId: orgOrCompanyId,
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
        await saveRelationEmbeddingToChroma(relationId, topicId, orgOrCompanyId, relation);
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
    
    // companyIdがある場合はそれを使用、なければorganizationIdを使用
    const orgOrCompanyId = relation.companyId || organizationId || relation.organizationId || '';
    
    console.log(`🔄 [埋め込み生成] 開始: ${relation.relationType} (${relationId})`);
    
    // 埋め込みを生成
    await saveRelationEmbedding(relationId, topicId, orgOrCompanyId, relation);
    
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
 * @param organizationId 組織ID（オプション、指定されない場合はリレーションから取得を試みる）
 * @returns リレーション埋め込みデータ、またはnull
 */
export async function getRelationEmbedding(
  relationId: string,
  organizationId?: string
): Promise<RelationEmbedding | null> {
  // ChromaDBを使用する場合（動的インポート）
  if (shouldUseChroma()) {
    try {
      let orgId = organizationId;
      if (!orgId) {
        try {
          const relation = await getRelationById(relationId);
          orgId = relation?.companyId || relation?.organizationId; // companyIdも考慮
        } catch (e) {
          console.debug(`⚠️ [getRelationEmbedding] リレーション取得エラー: ${relationId}`, e);
        }
      }

      if (orgId) {
        try {
          const { getRelationEmbeddingFromChroma } = await import('./relationEmbeddingsChroma');
          const embedding = await getRelationEmbeddingFromChroma(relationId, orgId);
          if (embedding) {
            return embedding;
          }
        } catch (chromaError: any) {
          const errorMessage = chromaError?.message || String(chromaError);
          if (errorMessage.includes('ChromaDBサーバーの起動に失敗しました') || 
              errorMessage.includes('ChromaDBクライアントが初期化されていません')) {
            console.debug(`ChromaDBサーバーが起動していないため、埋め込みの存在確認をスキップ: ${relationId}`);
            return null;
          }
          console.debug(`ChromaDBからの埋め込み取得エラー（無視）: ${relationId}`, errorMessage);
        }
      } else {
        console.debug(`⚠️ [getRelationEmbedding] organizationIdまたはcompanyIdが取得できません: ${relationId}`);
      }
      return null;
    } catch (chromaError: any) {
      console.error('❌ ChromaDBからの取得に失敗しました:', chromaError?.message || chromaError);
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
 * キーワードマッチスコアを計算（SQLiteのキーワード検索用）
 * リレーションタイプ、説明、メタデータなどを考慮
 */
function calculateRelationKeywordMatchScore(
  queryText: string,
  relation: Relation
): number {
  const queryLower = queryText.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  
  let score = 0;
  const relationTypeLower = relation.relationType.toLowerCase();
  const descriptionLower = (relation.description || '').toLowerCase();
  
  // 1. リレーションタイプ完全一致
  if (relationTypeLower === queryLower) {
    score = 0.9;
  }
  // 2. リレーションタイプ部分一致
  else if (relationTypeLower.includes(queryLower)) {
    score = 0.7;
  }
  // 3. 説明テキスト一致
  else if (descriptionLower.includes(queryLower)) {
    score = 0.6;
  }
  // 4. 単語レベルの一致
  else {
    let matchedWords = 0;
    for (const word of queryWords) {
      if (relationTypeLower.includes(word) || descriptionLower.includes(word)) {
        matchedWords++;
      }
    }
    if (matchedWords > 0) {
      score = 0.4 * (matchedWords / queryWords.length);
    }
  }
  
  // 5. メタデータ一致（軽い追加スコア）
  if (relation.metadata && Object.keys(relation.metadata).length > 0) {
    const metadataText = JSON.stringify(relation.metadata).toLowerCase();
    if (metadataText.includes(queryLower)) {
      score = Math.min(1.0, score + 0.1);
    }
  }
  
  return Math.min(1.0, score);
}

/**
 * SQLiteキーワード検索を実行（リレーション）
 */
async function searchRelationsByKeywords(
  queryText: string,
  limit: number,
  filters?: {
    organizationId?: string;
    relationType?: string;
  }
): Promise<Array<{ relationId: string; keywordScore: number }>> {
  try {
    const { getAllRelations } = await import('./relationApi');
    
    // SQLiteから全リレーションを取得してフィルタリング
    const allRelations = await getAllRelations();
    const searchLower = queryText.toLowerCase();
    
    let keywordRelations = allRelations.filter(relation => {
      // 組織IDでフィルタリング
      if (filters?.organizationId && relation.organizationId !== filters.organizationId) {
        return false;
      }
      
      // リレーションタイプでフィルタリング
      if (filters?.relationType && relation.relationType !== filters.relationType) {
        return false;
      }
      
      // キーワードマッチング
      if (relation.relationType.toLowerCase().includes(searchLower)) {
        return true;
      }
      if (relation.description && relation.description.toLowerCase().includes(searchLower)) {
        return true;
      }
      return false;
    });
    
    // キーワードマッチスコアを計算
    const keywordResults = keywordRelations.map(relation => ({
      relationId: relation.id,
      keywordScore: calculateRelationKeywordMatchScore(queryText, relation),
    }));
    
    // スコアでソート
    keywordResults.sort((a, b) => b.keywordScore - a.keywordScore);
    
    return keywordResults.slice(0, limit);
  } catch (error: any) {
    console.warn(`[searchRelationsByKeywords] SQLiteキーワード検索エラー:`, error?.message || error);
    return [];
  }
}

/**
 * ハイブリッド検索: ChromaDBベクトル検索 + SQLiteキーワード検索 + 統合スコアリング
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
    console.log(`[findSimilarRelationsHybrid] 🔍 ハイブリッド検索開始: queryText="${queryText}", limit=${limit}`);
    
    // 1. ChromaDBベクトル検索とSQLiteキーワード検索を並列実行
    const [vectorResults, keywordResults] = await Promise.all([
      findSimilarRelations(
        queryText,
        limit * 2,
        filters?.organizationId
      ).catch(error => {
        console.warn(`[findSimilarRelationsHybrid] ベクトル検索エラー:`, error);
        return [];
      }),
      searchRelationsByKeywords(
        queryText,
        limit * 2,
        filters
      ).catch(error => {
        console.warn(`[findSimilarRelationsHybrid] キーワード検索エラー:`, error);
        return [];
      }),
    ]);

    console.log(`[findSimilarRelationsHybrid] ベクトル検索結果: ${vectorResults.length}件, キーワード検索結果: ${keywordResults.length}件`);
    
    // ベクトル検索とキーワード検索の両方が空の場合は早期リターン
    if (vectorResults.length === 0 && keywordResults.length === 0) {
      return [];
    }
    
    // キーワード検索のみで結果がある場合でも続行
    if (vectorResults.length === 0 && keywordResults.length > 0) {
      console.log(`[findSimilarRelationsHybrid] ベクトル検索は0件ですが、キーワード検索で${keywordResults.length}件の結果があります。`);
    }

    // 2. ベクトル検索とキーワード検索の結果を統合
    const vectorMap = new Map<string, number>();
    const keywordMap = new Map<string, number>();
    
    // ベクトル検索結果のデバッグログ
    if (vectorResults.length > 0) {
      console.log(`[findSimilarRelationsHybrid] 📊 ベクトル検索結果のサンプル（最初の5件）:`, vectorResults.slice(0, 5).map(r => ({
        relationId: r.relationId,
        similarity: typeof r.similarity === 'number' ? r.similarity.toFixed(4) : String(r.similarity),
        similarityType: typeof r.similarity,
        isNaN: typeof r.similarity === 'number' ? isNaN(r.similarity) : 'N/A',
      })));
    } else {
      console.warn(`[findSimilarRelationsHybrid] ⚠️ ベクトル検索結果が空です。ChromaDBに埋め込みが存在しない可能性があります。`);
    }
    
    for (const result of vectorResults) {
      // similarityが有効な数値であることを確認
      if (typeof result.similarity === 'number' && !isNaN(result.similarity)) {
        vectorMap.set(result.relationId, result.similarity);
      } else {
        console.warn(`[findSimilarRelationsHybrid] ⚠️ リレーション ${result.relationId} のsimilarityが無効です:`, result.similarity);
      }
    }
    
    for (const result of keywordResults) {
      keywordMap.set(result.relationId, result.keywordScore);
    }
    
    // すべてのユニークなリレーションIDを収集
    const allRelationIds = new Set<string>();
    vectorMap.forEach((_, id) => allRelationIds.add(id));
    keywordMap.forEach((_, id) => allRelationIds.add(id));
    
    console.log(`[findSimilarRelationsHybrid] 統合対象リレーション数: ${allRelationIds.size}件（ベクトル: ${vectorMap.size}件, キーワード: ${keywordMap.size}件）`);

    // 3. リレーションデータを一括取得
    const relationIds = Array.from(allRelationIds);
    const relations = await getRelationsByIds(relationIds, 5);
    const relationMap = new Map(relations.map(r => [r.id, r]));

    // 4. 統合スコアリング: ベクトル類似度とキーワードスコアを組み合わせ
    const weights = adjustWeightsForQuery(queryText);
    const enhancedResults: Array<{ relationId: string; similarity: number; score: number }> = [];
    
    // 重み付け: ベクトル類似度60%、キーワードスコア40%
    const VECTOR_WEIGHT = 0.6;
    const KEYWORD_WEIGHT = 0.4;
    
    for (const relationId of allRelationIds) {
      try {
        const relation = relationMap.get(relationId);
        if (!relation) {
          // リレーションが見つからない場合でも、ベクトルまたはキーワードスコアがあれば含める
          const vectorSim = vectorMap.get(relationId) || 0;
          const keywordScore = keywordMap.get(relationId) || 0;
          const combinedScore = vectorSim * VECTOR_WEIGHT + keywordScore * KEYWORD_WEIGHT;
          
          if (combinedScore > 0) {
            enhancedResults.push({
              relationId,
              similarity: vectorSim,
              score: combinedScore,
            });
          }
          continue;
        }

        // ベクトル類似度とキーワードスコアを取得
        const vectorSim = vectorMap.get(relationId) || 0;
        const keywordScore = keywordMap.get(relationId) || calculateRelationKeywordMatchScore(queryText, relation);
        
        // デバッグログ: ベクトル類似度が0の場合に警告
        if (vectorSim === 0 && vectorMap.size > 0) {
          console.warn(`[findSimilarRelationsHybrid] ⚠️ リレーション ${relationId} (${relation.relationType}) のベクトル類似度が0です。ベクトル検索結果に含まれていない可能性があります。`);
        }
        
        // ベーススコア: ベクトル類似度とキーワードスコアの重み付け平均
        let score = vectorSim * VECTOR_WEIGHT + keywordScore * KEYWORD_WEIGHT;
        
        // キーワード完全一致の場合は大幅にブースト
        if (keywordScore >= 0.9) {
          score = Math.min(1.0, score + 0.2);
        } else if (keywordScore >= 0.7) {
          score = Math.min(1.0, score + 0.1);
        }
        
        // メタデータスコアリング（既存のロジック）
        score = calculateRelationScore(score, relation, weights);
        
        // リレーションタイプが一致する場合は追加ブースト
        if (filters?.relationType && relation.relationType === filters.relationType) {
          score = Math.min(1.0, score + 0.1);
        }

        // トピックIDが一致する場合は追加ブースト
        if (filters?.topicId && relation.topicId === filters.topicId) {
          score = Math.min(1.0, score + 0.08);
        }
        
        // NaNチェック: スコアがNaNの場合は0に設定
        if (typeof score !== 'number' || isNaN(score)) {
          console.warn(`[findSimilarRelationsHybrid] リレーション ${relationId} のスコアがNaNです。0に設定します。`);
          score = 0;
        }
        
        // NaNチェック: 類似度がNaNの場合は0に設定
        const safeSimilarity = (typeof vectorSim === 'number' && !isNaN(vectorSim)) ? vectorSim : 0;

        enhancedResults.push({
          relationId,
          similarity: safeSimilarity,
          score,
        });
      } catch (error) {
        console.warn(`リレーション ${relationId} の処理エラー:`, error);
      }
    }

    // 5. スコアでソートして上位を返す
    const sortedResults = enhancedResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    console.log(`[findSimilarRelationsHybrid] 統合検索完了: ${sortedResults.length}件の結果を返します`);
    
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
  onProgress?: (current: number, total: number, relationId: string, status: 'processing' | 'skipped' | 'error' | 'success') => void,
  shouldCancel?: () => boolean
): Promise<{ success: number; skipped: number; errors: number }> {
  console.log(`📊 ${relationIds.length}件のリレーション埋め込みを一括${forceRegenerate ? '再生成' : '生成'}します...`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let processedCount = 0;

  // 並列数を3〜5に制限（メモリ使用量を抑えるため）
  const limit = pLimit(5);
  
  // 各リレーションの処理を並列実行（同時実行数制限付き）
  const promises = relationIds.map((relationId, index) => 
    limit(async () => {
      // 停止チェック
      if (shouldCancel && shouldCancel()) {
        return { status: 'cancelled' as const };
      }
      
      try {
        // リレーションを取得してtopicIdとorganizationIdまたはcompanyIdを取得
        const relation = await getRelationById(relationId);
        if (!relation) {
          console.warn(`⚠️ リレーションが見つかりません: ${relationId}`);
          const current = ++processedCount;
          errorCount++;
          onProgress?.(current, relationIds.length, relationId, 'error');
          return { status: 'error' as const };
        }
        
        const orgOrCompanyId = relation.companyId || relation.organizationId || organizationId || '';
        
        // SQLiteのchromaSyncedフラグをチェック（高速）
        if (!forceRegenerate) {
          try {
            const relationDoc = await callTauriCommand('doc_get', {
              collectionName: 'relations',
              docId: relationId,
            });
            
            if (relationDoc?.exists && relationDoc?.data) {
              const chromaSynced = relationDoc.data.chromaSynced;
              if (chromaSynced === 1) {
                // SQLiteフラグが1の場合、ChromaDBに実際に存在するかを確認
                try {
                  const existing = await getRelationEmbedding(relationId);
                  if (existing) {
                    console.log(`⏭️  リレーション ${relationId} は既に埋め込みが存在するためスキップ（SQLiteフラグ + ChromaDB確認）`);
                    const current = ++processedCount;
                    skippedCount++;
                    onProgress?.(current, relationIds.length, relationId, 'skipped');
                    return { status: 'skipped' as const };
                  } else {
                    // SQLiteフラグは1だが、ChromaDBに存在しない → 不整合を検出
                    console.warn(`⚠️  リレーション ${relationId} はSQLiteでchromaSynced=1ですが、ChromaDBに存在しません。再生成します。`);
                    // フラグをリセットして再生成
                    try {
                      await callTauriCommand('update_chroma_sync_status', {
                        entityType: 'relation',
                        entityId: relationId,
                        synced: false,
                        error: 'ChromaDBに存在しないため再生成',
                      });
                    } catch (resetError) {
                      console.warn(`chromaSyncedフラグのリセットエラー:`, resetError);
                    }
                  }
                } catch (chromaCheckError) {
                  // ChromaDB確認エラーは無視して続行（再生成を試みる）
                  console.warn(`ChromaDB確認エラー（続行）: ${relationId}`, chromaCheckError);
                }
              }
            }
          } catch (sqliteError: any) {
            // SQLiteからの取得に失敗した場合は続行（ChromaDBから確認を試みる）
            console.debug(`SQLiteからのフラグ取得エラー（続行）: ${relationId}`, sqliteError?.message || sqliteError);
          }
        }
        
        // SQLiteで確認できない場合、ChromaDBから確認（フォールバック）
        if (!forceRegenerate) {
          try {
            const existing = await getRelationEmbedding(relationId);
            if (existing) {
              console.log(`⏭️  リレーション ${relationId} は既に埋め込みが存在するためスキップ（ChromaDB確認）`);
              const current = ++processedCount;
              skippedCount++;
              onProgress?.(current, relationIds.length, relationId, 'skipped');
              return { status: 'skipped' as const };
            }
          } catch (chromaCheckError) {
            // ChromaDB確認エラーは無視して続行（再生成を試みる）
            console.debug(`ChromaDB確認エラー（続行）: ${relationId}`, chromaCheckError);
          }
        }

        const result = await saveRelationEmbeddingAsync(relationId, relation.topicId, orgOrCompanyId);
        const current = ++processedCount;
        
        if (result) {
          successCount++;
          onProgress?.(current, relationIds.length, relationId, 'success');
          return { status: 'success' as const };
        } else {
          // saveRelationEmbeddingAsyncがfalseを返した場合（リレーションが見つからない、既に生成中など）
          errorCount++;
          onProgress?.(current, relationIds.length, relationId, 'error');
          console.warn(`⚠️ リレーション ${relationId} の埋め込み生成がスキップされました`);
          return { status: 'error' as const };
        }
      } catch (error) {
        const current = ++processedCount;
        console.error(`リレーション ${relationId} の埋め込み生成エラー:`, error);
        errorCount++;
        onProgress?.(current, relationIds.length, relationId, 'error');
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
