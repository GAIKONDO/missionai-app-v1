/**
 * トピックAPI
 * トピック情報の取得と管理
 */

import { callTauriCommand } from './localFirebase';
import type { TopicInfo } from './orgApi';

/**
 * トピック情報（RAG検索用）
 */
export interface TopicSearchInfo {
  topicId: string;
  meetingNoteId: string;
  title: string;
  content: string;
  summary?: string;
  semanticCategory?: string;
  keywords?: string[];
  importance?: string;
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
  searchCount?: number;
}

/**
 * トピックIDでトピック情報を取得
 */
export async function getTopicById(
  topicId: string,
  meetingNoteId: string
): Promise<TopicSearchInfo | null> {
  try {
    // まず、議事録からトピック情報を取得
    const { getTopicsByMeetingNote } = await import('./orgApi');
    const topics = await getTopicsByMeetingNote(meetingNoteId);
    
    console.log(`[getTopicById] 取得したトピック数: ${topics.length}, topicId=${topicId}, meetingNoteId=${meetingNoteId}`);
    if (topics.length > 0) {
      console.log(`[getTopicById] トピックIDのサンプル:`, topics.slice(0, 3).map(t => t.id));
    }
    
    const topic = topics.find(t => t.id === topicId);
    if (!topic) {
      console.warn(`[getTopicById] トピックが見つかりません: topicId=${topicId}, meetingNoteId=${meetingNoteId}`);
      console.warn(`[getTopicById] 利用可能なトピックID:`, topics.map(t => t.id));
      return null;
    }
    
    // TopicInfoをTopicSearchInfoに変換
    return {
      topicId: topic.id,
      meetingNoteId: topic.meetingNoteId,
      title: topic.title,
      content: topic.content,
      summary: topic.summary,
      semanticCategory: topic.semanticCategory,
      importance: topic.importance,
      organizationId: topic.organizationId,
      keywords: [], // キーワードはメタデータから取得する必要がある
      createdAt: topic.topicDate || undefined,
      updatedAt: topic.topicDate || undefined,
      searchCount: 0, // デフォルト値
    };
  } catch (error) {
    console.error(`[getTopicById] エラー:`, error);
    return null;
  }
}

/**
 * 複数のトピックIDでトピック情報を一括取得（N+1問題の解決）
 */
export async function getTopicsByIds(
  topicIdsWithMeetingNoteIds: Array<{ topicId: string; meetingNoteId: string }>,
  concurrencyLimit: number = 5
): Promise<TopicSearchInfo[]> {
  if (topicIdsWithMeetingNoteIds.length === 0) {
    return [];
  }

  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(concurrencyLimit);

  try {
    const results = await Promise.allSettled(
      topicIdsWithMeetingNoteIds.map(({ topicId, meetingNoteId }) =>
        limit(async () => {
          try {
            return await getTopicById(topicId, meetingNoteId);
          } catch (error: any) {
            console.error(`[getTopicsByIds] トピック取得エラー (${topicId}, ${meetingNoteId}):`, error);
            return null;
          }
        })
      )
    );

    const topics: TopicSearchInfo[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        topics.push(result.value);
      }
    }

    return topics;
  } catch (error) {
    console.error('[getTopicsByIds] エラー:', error);
    return [];
  }
}

