/**
 * トピック埋め込みのChromaDB管理
 * ChromaDBを使用した高速ベクトル検索
 * 
 * Rust側のChromaDB Serverを使用（Tauriコマンド経由）
 */

import { callTauriCommand } from './localFirebase';
import { 
  generateCombinedEmbedding, 
  generateSeparatedEmbeddings,
  generateEnhancedEmbedding,
  generateMetadataEmbedding,
} from './embeddings';
import { getMeetingNoteById } from './orgApi';
import type { TopicEmbedding, TopicMetadata } from '@/types/topicMetadata';

/**
 * トピック埋め込みをChromaDBに保存
 */
export async function saveTopicEmbeddingToChroma(
  topicId: string,
  meetingNoteId: string,
  organizationId: string,
  title: string,
  content: string,
  metadata?: Partial<Pick<TopicMetadata, 'keywords' | 'semanticCategory' | 'tags' | 'summary' | 'importance'>>
): Promise<void> {
  // クライアント側でのみ実行
  if (typeof window === 'undefined') {
    throw new Error('トピック埋め込みの保存はクライアント側でのみ実行可能です');
  }

  try {
    const now = new Date().toISOString();
    const embeddingVersion = metadata ? '2.0' : '1.0'; // メタデータがある場合はバージョン2.0
    
    // 埋め込みID（meetingNoteId-topic-topicId形式）
    const embeddingId = `${meetingNoteId}-topic-${topicId}`;

    // 埋め込みを生成
    let combinedEmbedding: number[] | undefined;
    let titleEmbedding: number[] | undefined;
    let contentEmbedding: number[] | undefined;
    let metadataEmbedding: number[] | undefined;

    if (metadata && (metadata.keywords || metadata.semanticCategory || metadata.tags)) {
      // メタデータがある場合: 分離埋め込み + メタデータ埋め込みを生成
      try {
        const separated = await generateSeparatedEmbeddings(title, content);
        titleEmbedding = separated.titleEmbedding;
        contentEmbedding = separated.contentEmbedding;
        
        // メタデータの埋め込みを生成
        try {
          metadataEmbedding = await generateMetadataEmbedding({
            keywords: metadata.keywords,
            semanticCategory: metadata.semanticCategory,
            tags: metadata.tags,
            summary: metadata.summary,
          });
        } catch (error) {
          console.warn('メタデータ埋め込みの生成に失敗しました（続行します）:', error);
        }
        
        // 後方互換性のため、combinedEmbeddingも生成
        combinedEmbedding = await generateEnhancedEmbedding(
          title,
          content,
          {
            keywords: metadata.keywords,
            semanticCategory: metadata.semanticCategory,
            tags: metadata.tags,
            summary: metadata.summary,
          }
        );
      } catch (error) {
        console.warn('分離埋め込みの生成に失敗しました。従来の方法を使用します:', error);
        // フォールバック: 従来の方法
        combinedEmbedding = await generateCombinedEmbedding(title, content);
      }
    } else {
      // メタデータがない場合: 従来の方法
      combinedEmbedding = await generateCombinedEmbedding(title, content);
    }

    // 埋め込みベクトルの次元数をチェック（text-embedding-3-smallは1536次元）
    if (combinedEmbedding && combinedEmbedding.length !== 1536) {
      const errorMessage = `埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${combinedEmbedding.length}。OpenAIのtext-embedding-3-smallモデルを使用してください。`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // 議事録タイトルを取得（出典情報としてメタデータに追加）
    let meetingNoteTitle = '';
    try {
      const meetingNote = await getMeetingNoteById(meetingNoteId);
      if (meetingNote && meetingNote.title) {
        meetingNoteTitle = meetingNote.title;
      }
    } catch (error) {
      // 議事録取得エラーは警告のみ（埋め込み保存は続行）
      console.warn('議事録タイトルの取得に失敗しました（続行します）:', error);
    }

    // contentSummaryを生成（contentの最初の200文字、SQLiteのトリガーと同じロジック）
    const contentSummary = content && content.length > 0 
      ? content.substring(0, 200)
      : '';

    // メタデータを準備（検索に必要な情報のみを保存、メタデータサイズを削減）
    const embeddingMetadata: Record<string, any> = {
      topicId, // SQLite参照用
      meetingNoteId, // SQLite参照用
      organizationId, // 組織ID
      title,
      contentSummary, // contentの代わりにcontentSummaryを使用（メタデータサイズ削減）
      semanticCategory: metadata?.semanticCategory || '',
      keywords: metadata?.keywords ? JSON.stringify(metadata.keywords) : '',
      tags: metadata?.tags ? JSON.stringify(metadata.tags) : '',
      summary: metadata?.summary || '',
      importance: metadata?.importance || '',
      meetingNoteTitle: meetingNoteTitle, // 出典情報として追加
      // 不要なフィールドを削除（メタデータサイズ削減）:
      // - titleEmbedding, contentEmbedding, metadataEmbedding（未使用の埋め込みベクトル）
      // - embeddingModel, embeddingVersion（検索に不要な管理用情報）
      createdAt: now,
      updatedAt: now,
    };

    // Rust側のTauriコマンドを呼び出し（パラメータ名はcamelCase）
    await callTauriCommand('chromadb_save_topic_embedding', {
      topicId,
      meetingNoteId,
      organizationId,
      combinedEmbedding: combinedEmbedding || [],
      metadata: embeddingMetadata,
    });

    console.log(`✅ ChromaDBにトピック埋め込みを保存しました: ${topicId} (version: ${embeddingVersion})`);
  } catch (error) {
    console.error('ChromaDBへのトピック埋め込み保存エラー:', error);
    throw error;
  }
}

/**
 * ChromaDBからトピック埋め込みを取得
 * 注意: Rust側の実装では、IDから直接取得する機能は未実装のため、
 * SQLiteフォールバックを使用することを推奨
 */
export async function getTopicEmbeddingFromChroma(
  topicId: string,
  organizationId: string
): Promise<TopicEmbedding | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Rust側のTauriコマンドを呼び出し
    const result = await callTauriCommand('chromadb_get_topic_embedding', {
      topicId,
      organizationId,
    }) as Record<string, any> | null;

    if (!result) {
      return null;
    }

    // 埋め込みベクトルを取得
    const combinedEmbedding = result.combinedEmbedding as number[] | undefined;
    if (!combinedEmbedding || !Array.isArray(combinedEmbedding) || combinedEmbedding.length === 0) {
      return null;
    }

    // メタデータから情報を取得
    const meetingNoteId = result.meetingNoteId as string | undefined || '';
    const title = result.title as string | undefined || '';
    const content = result.content as string | undefined || '';
    
    // TopicEmbeddingオブジェクトを構築
    const embedding: TopicEmbedding = {
      id: `${meetingNoteId}-topic-${topicId}`,
      topicId,
      meetingNoteId,
      organizationId,
      title,
      content,
      combinedEmbedding,
      embeddingModel: (result.embeddingModel as string) || 'text-embedding-3-small',
      embeddingVersion: (result.embeddingVersion as string) || '1.0',
      createdAt: (result.createdAt as string) || new Date().toISOString(),
      updatedAt: (result.updatedAt as string) || new Date().toISOString(),
      metadata: result.metadata || {},
    };

    return embedding;
  } catch (error) {
    console.error('ChromaDBからのトピック埋め込み取得エラー:', error);
    return null;
  }
}

/**
 * ChromaDBを使用した類似トピック検索（Rust側経由）
 */
export async function findSimilarTopicsChroma(
  queryText: string,
  limit: number = 5,
  organizationId?: string,
  semanticCategory?: string
): Promise<Array<{ topicId: string; meetingNoteId: string; similarity: number; title?: string; contentSummary?: string }>> {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    // クエリの埋め込みを生成
    const { generateEmbedding } = await import('./embeddings');
    const queryEmbedding = await generateEmbedding(queryText);

    // 埋め込みベクトルの次元数をチェック（text-embedding-3-smallは1536次元）
    if (queryEmbedding.length !== 1536) {
      const errorMessage = `埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${queryEmbedding.length}。OpenAIのtext-embedding-3-smallモデルを使用してください。`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Rust側のTauriコマンドを呼び出し（パラメータ名はcamelCase）
    // organizationIdが未指定の場合はundefinedを渡して組織横断検索を実行
    console.log(`[findSimilarTopicsChroma] ChromaDB検索を実行中... (organizationId: ${organizationId || 'undefined'})`);
    const results = await callTauriCommand('chromadb_find_similar_topics', {
      queryEmbedding,
      limit,
      organizationId: organizationId || undefined, // undefinedの場合は組織横断検索
    }) as Array<{
      topic_id: string;
      meeting_note_id: string;
      similarity: number;
      title: string;
      content_summary: string;
    }>;

    console.log(`[findSimilarTopicsChroma] ChromaDB検索完了: ${results.length}件の結果を取得`);
    if (results.length > 0) {
      console.log(`[findSimilarTopicsChroma] 検索結果トップ5:`, results.slice(0, 5).map((r) => ({
        topicId: r.topic_id,
        meetingNoteId: r.meeting_note_id,
        title: r.title,
        contentSummary: r.content_summary,
        similarity: typeof r.similarity === 'number' ? r.similarity.toFixed(4) : String(r.similarity),
      })));
    } else {
      if (organizationId) {
        console.warn(`[findSimilarTopicsChroma] 検索結果が空です。コレクション topics_${organizationId} にデータが存在しない可能性があります。`);
      } else {
        console.warn(`[findSimilarTopicsChroma] 検索結果が空です。すべての組織のコレクションを検索しましたが、データが見つかりませんでした。`);
      }
    }

    // 結果を変換（Rust側から返されるTopicSearchResult構造体を変換）
    let similarities = results.map((result) => {
      // similarityが有効な数値であることを確認
      if (typeof result.similarity !== 'number' || isNaN(result.similarity)) {
        console.warn(`[findSimilarTopicsChroma] ⚠️ トピック ${result.topic_id} (${result.meeting_note_id}) のsimilarityが無効です:`, result.similarity);
        return {
          topicId: result.topic_id,
          meetingNoteId: result.meeting_note_id,
          similarity: 0, // 無効な場合は0に設定
          title: result.title,
          contentSummary: result.content_summary,
        };
      }
      return {
        topicId: result.topic_id,
        meetingNoteId: result.meeting_note_id,
        similarity: result.similarity,
        title: result.title,
        contentSummary: result.content_summary,
      };
    });

    // semanticCategoryでフィルタリング（Rust側で未対応のため、JavaScript側でフィルタリング）
    if (semanticCategory) {
      // 注意: Rust側の実装ではsemanticCategoryでのフィルタリングは未対応のため、
      // ここでは全ての結果を返す（将来的にRust側で実装予定）
      console.warn('semanticCategoryでのフィルタリングはRust側で未対応のため、全ての結果を返します');
    }

    return similarities.slice(0, limit);
  } catch (error) {
    console.error('ChromaDBでの類似トピック検索エラー:', error);
    throw error;
  }
}

/**
 * ChromaDBからトピック埋め込みを削除
 * 注意: Rust側の実装では、削除機能は未実装のため、
 * SQLiteフォールバックを使用することを推奨
 */
export async function deleteTopicEmbeddingFromChroma(
  topicId: string,
  meetingNoteId: string
): Promise<void> {
  // Rust側のChromaDB実装では、削除機能が未実装のため、
  // SQLiteフォールバックを使用
  console.warn('deleteTopicEmbeddingFromChroma: Rust側のChromaDB実装では未対応。SQLiteフォールバックを使用してください。');
}
