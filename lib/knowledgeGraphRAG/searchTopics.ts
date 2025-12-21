/**
 * トピック検索
 */

import type { KnowledgeGraphSearchResult, SearchFilters, TopicSummary } from './types';
import { findSimilarTopicsChroma } from '../topicEmbeddingsChroma';
import { getTopicsByIds } from '../topicApi';
import { normalizeSimilarity, calculateTopicScore, adjustWeightsForQuery, DEFAULT_WEIGHTS, type ScoringWeights } from '../ragSearchScoring';

/**
 * トピックを検索
 */
export async function searchTopics(
  queryText: string,
  limit: number,
  filters?: SearchFilters,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): Promise<KnowledgeGraphSearchResult[]> {
  // organizationIdが未指定の場合、Rust側で全組織横断検索が実行される
  try {
    console.log('[searchTopics] 検索開始:', { queryText, limit, filters, weights });
    
    // ChromaDBで類似トピックを検索
    const chromaResults = await findSimilarTopicsChroma(
      queryText,
      limit * 2, // フィルタリングで減る可能性があるため多めに取得
      filters?.organizationId,
      filters?.topicSemanticCategory
    );

    console.log('[searchTopics] ChromaDB検索結果:', chromaResults.length, '件');
    if (chromaResults.length > 0) {
      console.log('[searchTopics] ChromaDB検索結果のサンプル:', chromaResults.slice(0, 2).map(r => ({
        topicId: r.topicId,
        meetingNoteId: r.meetingNoteId,
        title: r.title,
        similarity: r.similarity,
      })));
    }

    if (chromaResults.length === 0) {
      console.log('[searchTopics] ChromaDB検索結果が空のため、空の配列を返します');
      return [];
    }

    // トピックIDとmeetingNoteIdのペアを抽出
    const topicIdsWithMeetingNoteIds = chromaResults.map(r => ({
      topicId: r.topicId,
      meetingNoteId: r.meetingNoteId,
    }));

    // バッチでトピックの詳細情報を取得（N+1問題を回避）
    const topics = await getTopicsByIds(topicIdsWithMeetingNoteIds);

    // トピックIDとmeetingNoteIdの複合キーでマップを作成
    const topicMap = new Map(topics.map(t => [`${t.topicId}-${t.meetingNoteId}`, t]));

    // 結果を構築
    const results: KnowledgeGraphSearchResult[] = [];

    for (const { topicId, meetingNoteId, similarity, title, contentSummary, organizationId: chromaOrgId } of chromaResults) {
      let topic = topicMap.get(`${topicId}-${meetingNoteId}`);
      
      // トピックが見つからない場合、ChromaDBから取得した情報を直接使用
      if (!topic) {
        console.warn(`[searchTopics] トピックID ${topicId} (会議メモID: ${meetingNoteId}) の詳細情報が見つかりませんでした。ChromaDBの情報を使用します。`);
        
        // ChromaDBから取得した情報から最小限のTopicSearchInfoを作成
        topic = {
          topicId: topicId,
          meetingNoteId: meetingNoteId,
          title: title || 'タイトル不明',
          content: contentSummary || '',
          summary: contentSummary,
          semanticCategory: undefined,
          importance: undefined,
          organizationId: chromaOrgId || '', // ChromaDBのメタデータから取得
          keywords: [],
          createdAt: undefined,
          updatedAt: undefined,
          searchCount: 0,
        };
      } else if (!topic.organizationId && chromaOrgId) {
        // トピックが見つかったがorganizationIdが空の場合、ChromaDBから取得した値を設定
        topic.organizationId = chromaOrgId;
      }

      // フィルタリング
      if (filters?.topicSemanticCategory && topic.semanticCategory !== filters.topicSemanticCategory) {
        continue;
      }
      
      // 日付フィルタリング（Firestoreタイムスタンプ形式も処理）
      let createdAtForFilter: string | undefined = topic.createdAt;
      let updatedAtForFilter: string | undefined = topic.updatedAt;
      
      if (createdAtForFilter && typeof createdAtForFilter === 'object' && createdAtForFilter !== null && 'seconds' in createdAtForFilter) {
        const timestamp = createdAtForFilter as { seconds: number; nanoseconds?: number };
        createdAtForFilter = new Date(timestamp.seconds * 1000).toISOString();
      }
      if (updatedAtForFilter && typeof updatedAtForFilter === 'object' && updatedAtForFilter !== null && 'seconds' in updatedAtForFilter) {
        const timestamp = updatedAtForFilter as { seconds: number; nanoseconds?: number };
        updatedAtForFilter = new Date(timestamp.seconds * 1000).toISOString();
      }
      
      if (filters?.createdAfter && createdAtForFilter && createdAtForFilter < filters.createdAfter) {
        continue;
      }
      if (filters?.createdBefore && createdAtForFilter && createdAtForFilter > filters.createdBefore) {
        continue;
      }
      if (filters?.updatedAfter && updatedAtForFilter && updatedAtForFilter < filters.updatedAfter) {
        continue;
      }
      if (filters?.updatedBefore && updatedAtForFilter && updatedAtForFilter > filters.updatedBefore) {
        continue;
      }

      // 類似度を正規化
      const normalizedSimilarity = normalizeSimilarity(similarity);
      
      console.log('[searchTopics] 類似度処理:', {
        topicId,
        meetingNoteId,
        rawSimilarity: similarity,
        normalizedSimilarity,
        similarityType: typeof similarity,
      });

      // スコア計算（updatedAtがFirestoreタイムスタンプ形式の場合も処理）
      let updatedAtForScore: string | undefined = updatedAtForFilter || topic.updatedAt;
      if (updatedAtForScore && typeof updatedAtForScore === 'object' && updatedAtForScore !== null && 'seconds' in updatedAtForScore) {
        // FirestoreタイムスタンプをISO文字列に変換
        const timestamp = updatedAtForScore as { seconds: number; nanoseconds?: number };
        const milliseconds = timestamp.seconds * 1000;
        updatedAtForScore = new Date(milliseconds).toISOString();
      }
      
      const score = calculateTopicScore(
        normalizedSimilarity,
        {
          importance: topic.importance,
          updatedAt: updatedAtForScore,
          keywords: topic.keywords,
          semanticCategory: topic.semanticCategory,
          title: topic.title,
        },
        weights,
        filters,
        topic.searchCount || 0,
        queryText
      );

      console.log('[searchTopics] スコア計算結果:', {
        topicId,
        meetingNoteId,
        normalizedSimilarity,
        score,
        scoreType: typeof score,
        isNaN: isNaN(score),
        isFinite: isFinite(score),
      });

      results.push({
        type: 'topic',
        id: topicId, // トピックのIDとしてtopicIdを使用
        score: typeof score === 'number' && !isNaN(score) ? score : 0,
        similarity: normalizedSimilarity,
        topicId: topicId,
        meetingNoteId: meetingNoteId,
        topic: {
          topicId: topic.topicId,
          title: topic.title || title || '',
          contentSummary: topic.summary || contentSummary || topic.content?.substring(0, 200) || '',
          semanticCategory: topic.semanticCategory,
          keywords: topic.keywords,
          meetingNoteId: topic.meetingNoteId,
          organizationId: topic.organizationId,
        },
      });
    }

    // スコアでソート
    results.sort((a, b) => b.score - a.score);

    console.log(`[searchTopics] トピック検索結果 (${results.length}件):`, results);
    return results.slice(0, limit);
  } catch (error) {
    console.error('[searchTopics] トピック検索エラー:', error);
    return [];
  }
}

