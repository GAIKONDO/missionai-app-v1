/**
 * トピック埋め込みのChromaDB管理
 * ChromaDBを使用した高速ベクトル検索
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
  if (typeof window === 'undefined') {
    throw new Error('トピック埋め込みの保存はクライアント側でのみ実行可能です');
  }

  try {
    const now = new Date().toISOString();
    const embeddingVersion = metadata ? '2.0' : '1.0';

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
          console.warn('メタデータ埋め込みの生成に失敗しました:', error);
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
        combinedEmbedding = await generateCombinedEmbedding(title, content);
      }
    } else {
      // メタデータがない場合: 従来の方法
      combinedEmbedding = await generateCombinedEmbedding(title, content);
    }

    // 埋め込みベクトルの次元数をチェック
    if (combinedEmbedding && combinedEmbedding.length !== 1536) {
      throw new Error(`埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${combinedEmbedding.length}`);
    }

    // 議事録タイトルを取得
    let meetingNoteTitle = '';
    try {
      const meetingNote = await getMeetingNoteById(meetingNoteId);
      if (meetingNote && meetingNote.title) {
        meetingNoteTitle = meetingNote.title;
      }
    } catch (error) {
      console.warn('議事録タイトルの取得に失敗しました:', error);
    }

    // contentSummaryを生成
    const contentSummary = content && content.length > 0 
      ? content.substring(0, 200)
      : '';

    // メタデータを準備
    const embeddingMetadata: Record<string, any> = {
      topicId,
      meetingNoteId,
      organizationId,
      title,
      contentSummary,
      semanticCategory: metadata?.semanticCategory || '',
      keywords: metadata?.keywords ? JSON.stringify(metadata.keywords) : '',
      tags: metadata?.tags ? JSON.stringify(metadata.tags) : '',
      summary: metadata?.summary || '',
      importance: metadata?.importance || '',
      meetingNoteTitle,
      createdAt: now,
      updatedAt: now,
    };

    // Rust側のTauriコマンドを呼び出し
    await callTauriCommand('chromadb_save_topic_embedding', {
      topicId,
      meetingNoteId,
      organizationId,
      combinedEmbedding: combinedEmbedding || [],
      metadata: embeddingMetadata,
    });
  } catch (error) {
    console.error('ChromaDBへのトピック埋め込み保存エラー:', error);
    throw error;
  }
}

/**
 * ChromaDBからトピック埋め込みを取得
 */
export async function getTopicEmbeddingFromChroma(
  topicId: string,
  organizationId: string
): Promise<TopicEmbedding | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const result = await callTauriCommand('chromadb_get_topic_embedding', {
      topicId,
      organizationId,
    }) as Record<string, any> | null;

    if (!result) {
      return null;
    }

    const combinedEmbedding = result.combinedEmbedding as number[] | undefined;
    if (!combinedEmbedding || !Array.isArray(combinedEmbedding) || combinedEmbedding.length === 0) {
      return null;
    }

    const meetingNoteId = result.meetingNoteId as string | undefined || '';
    const title = result.title as string | undefined || '';
    const content = result.content as string | undefined || '';
    
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
 * ChromaDBを使用した類似トピック検索
 */
export async function findSimilarTopicsChroma(
  queryText: string,
  limit: number = 5,
  organizationId?: string,
  semanticCategory?: string
): Promise<Array<{ topicId: string; meetingNoteId: string; similarity: number; title?: string; contentSummary?: string; organizationId?: string }>> {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    // クエリの埋め込みを生成
    const { generateEmbedding } = await import('./embeddings');
    const queryEmbedding = await generateEmbedding(queryText);

    // 埋め込みベクトルの次元数をチェック
    if (queryEmbedding.length !== 1536) {
      throw new Error(`埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${queryEmbedding.length}`);
    }

    // Rust側のTauriコマンドを呼び出し
    const results = await callTauriCommand('chromadb_find_similar_topics', {
      queryEmbedding,
      limit,
      organizationId: organizationId || undefined,
    }) as Array<{
      topic_id: string;
      meeting_note_id: string;
      similarity: number;
      title: string;
      content_summary: string;
      organization_id?: string | null;
    }>;

    // 結果を変換
    let similarities = results.map((result) => {
      if (typeof result.similarity !== 'number' || isNaN(result.similarity)) {
        console.warn(`トピック ${result.topic_id} のsimilarityが無効です:`, result.similarity);
        return {
          topicId: result.topic_id,
          meetingNoteId: result.meeting_note_id,
          similarity: 0,
          title: result.title,
          contentSummary: result.content_summary,
          organizationId: result.organization_id || undefined,
        };
      }
      return {
        topicId: result.topic_id,
        meetingNoteId: result.meeting_note_id,
        similarity: result.similarity,
        title: result.title,
        contentSummary: result.content_summary,
        organizationId: result.organization_id || undefined,
      };
    });

    // semanticCategoryでフィルタリング（Rust側で未対応のため、JavaScript側でフィルタリング）
    if (semanticCategory) {
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
 */
export async function deleteTopicEmbeddingFromChroma(
  topicId: string,
  organizationId: string
): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    await callTauriCommand('chromadb_delete_topic_embedding', {
      topicId,
      organizationId,
    });
  } catch (error) {
    console.error('ChromaDBからのトピック埋め込み削除エラー:', error);
    throw error;
  }
}
