/**
 * ユーザーフィードバック機能
 * AI回答の品質と検索結果の関連性を評価
 */

// AIアシスタントのフィードバック
export interface AIFeedback {
  messageId: string;
  query: string;
  response: string;
  rating: 'positive' | 'negative' | 'neutral';
  feedback?: string; // 自由記述フィードバック
  timestamp: Date;
  model?: string;
  ragContextUsed?: boolean;
}

// 検索結果のフィードバック
export interface SearchFeedback {
  query: string;
  resultId: string;
  resultType: 'entity' | 'relation' | 'topic';
  relevant: boolean;
  timestamp: Date;
  comment?: string; // 自由記述コメント
}

// フィードバックのストレージキー
const AI_FEEDBACK_KEY = 'feedback_ai_feedback';
const SEARCH_FEEDBACK_KEY = 'feedback_search_feedback';
const MAX_FEEDBACK_COUNT = 500; // 最大保持件数

/**
 * AIアシスタントのフィードバックを保存
 */
export function saveAIFeedback(feedback: Omit<AIFeedback, 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  try {
    const feedbackHistory = JSON.parse(
      localStorage.getItem(AI_FEEDBACK_KEY) || '[]'
    ) as AIFeedback[];

    const newFeedback: AIFeedback = {
      ...feedback,
      timestamp: new Date(),
    };

    feedbackHistory.push(newFeedback);

    // 最新MAX_FEEDBACK_COUNT件のみ保持
    const recentFeedback = feedbackHistory.slice(-MAX_FEEDBACK_COUNT);
    localStorage.setItem(AI_FEEDBACK_KEY, JSON.stringify(recentFeedback));

    console.log('[Feedback] AIフィードバックを保存:', {
      messageId: feedback.messageId,
      rating: feedback.rating,
    });
  } catch (error) {
    console.error('[Feedback] AIフィードバックの保存エラー:', error);
  }
}

/**
 * 検索結果のフィードバックを保存
 */
export function saveSearchFeedback(feedback: Omit<SearchFeedback, 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  try {
    const feedbackHistory = JSON.parse(
      localStorage.getItem(SEARCH_FEEDBACK_KEY) || '[]'
    ) as SearchFeedback[];

    const newFeedback: SearchFeedback = {
      ...feedback,
      timestamp: new Date(),
    };

    feedbackHistory.push(newFeedback);

    // 最新MAX_FEEDBACK_COUNT件のみ保持
    const recentFeedback = feedbackHistory.slice(-MAX_FEEDBACK_COUNT);
    localStorage.setItem(SEARCH_FEEDBACK_KEY, JSON.stringify(recentFeedback));

    console.log('[Feedback] 検索フィードバックを保存:', {
      query: feedback.query.substring(0, 50),
      resultId: feedback.resultId,
      relevant: feedback.relevant,
    });
  } catch (error) {
    console.error('[Feedback] 検索フィードバックの保存エラー:', error);
  }
}

/**
 * AIフィードバックを取得
 */
export function getAIFeedback(limit: number = 100): AIFeedback[] {
  if (typeof window === 'undefined') return [];

  try {
    const feedbackHistory = JSON.parse(
      localStorage.getItem(AI_FEEDBACK_KEY) || '[]'
    ) as AIFeedback[];

    return feedbackHistory.slice(-limit).map(f => ({
      ...f,
      timestamp: new Date(f.timestamp),
    }));
  } catch (error) {
    console.error('[Feedback] AIフィードバックの取得エラー:', error);
    return [];
  }
}

/**
 * 検索フィードバックを取得
 */
export function getSearchFeedback(limit: number = 100): SearchFeedback[] {
  if (typeof window === 'undefined') return [];

  try {
    const feedbackHistory = JSON.parse(
      localStorage.getItem(SEARCH_FEEDBACK_KEY) || '[]'
    ) as SearchFeedback[];

    return feedbackHistory.slice(-limit).map(f => ({
      ...f,
      timestamp: new Date(f.timestamp),
    }));
  } catch (error) {
    console.error('[Feedback] 検索フィードバックの取得エラー:', error);
    return [];
  }
}

/**
 * AIフィードバック統計を計算
 */
export interface AIFeedbackStats {
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  positiveRate: number; // 0-1
  averageRating: number; // 1-3 (positive=3, neutral=2, negative=1)
}

export function calculateAIFeedbackStats(
  timeRange?: { start: Date; end: Date }
): AIFeedbackStats {
  const feedback = getAIFeedback(MAX_FEEDBACK_COUNT);
  
  let filteredFeedback = feedback;
  if (timeRange) {
    filteredFeedback = feedback.filter(
      f => f.timestamp >= timeRange.start && f.timestamp <= timeRange.end
    );
  }

  if (filteredFeedback.length === 0) {
    return {
      totalFeedback: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      positiveRate: 0,
      averageRating: 0,
    };
  }

  const positiveCount = filteredFeedback.filter(f => f.rating === 'positive').length;
  const negativeCount = filteredFeedback.filter(f => f.rating === 'negative').length;
  const neutralCount = filteredFeedback.filter(f => f.rating === 'neutral').length;
  const positiveRate = positiveCount / filteredFeedback.length;
  
  // 平均評価: positive=3, neutral=2, negative=1
  const totalRating = positiveCount * 3 + neutralCount * 2 + negativeCount * 1;
  const averageRating = totalRating / filteredFeedback.length;

  return {
    totalFeedback: filteredFeedback.length,
    positiveCount,
    negativeCount,
    neutralCount,
    positiveRate,
    averageRating,
  };
}

/**
 * 検索フィードバック統計を計算
 */
export interface SearchFeedbackStats {
  totalFeedback: number;
  relevantCount: number;
  irrelevantCount: number;
  relevanceRate: number; // 0-1
  feedbackByType: {
    entity: { relevant: number; irrelevant: number };
    relation: { relevant: number; irrelevant: number };
    topic: { relevant: number; irrelevant: number };
  };
}

export function calculateSearchFeedbackStats(
  timeRange?: { start: Date; end: Date }
): SearchFeedbackStats {
  const feedback = getSearchFeedback(MAX_FEEDBACK_COUNT);
  
  let filteredFeedback = feedback;
  if (timeRange) {
    filteredFeedback = feedback.filter(
      f => f.timestamp >= timeRange.start && f.timestamp <= timeRange.end
    );
  }

  if (filteredFeedback.length === 0) {
    return {
      totalFeedback: 0,
      relevantCount: 0,
      irrelevantCount: 0,
      relevanceRate: 0,
      feedbackByType: {
        entity: { relevant: 0, irrelevant: 0 },
        relation: { relevant: 0, irrelevant: 0 },
        topic: { relevant: 0, irrelevant: 0 },
      },
    };
  }

  const relevantCount = filteredFeedback.filter(f => f.relevant).length;
  const irrelevantCount = filteredFeedback.filter(f => !f.relevant).length;
  const relevanceRate = relevantCount / filteredFeedback.length;

  const feedbackByType = {
    entity: {
      relevant: filteredFeedback.filter(f => f.resultType === 'entity' && f.relevant).length,
      irrelevant: filteredFeedback.filter(f => f.resultType === 'entity' && !f.relevant).length,
    },
    relation: {
      relevant: filteredFeedback.filter(f => f.resultType === 'relation' && f.relevant).length,
      irrelevant: filteredFeedback.filter(f => f.resultType === 'relation' && !f.relevant).length,
    },
    topic: {
      relevant: filteredFeedback.filter(f => f.resultType === 'topic' && f.relevant).length,
      irrelevant: filteredFeedback.filter(f => f.resultType === 'topic' && !f.relevant).length,
    },
  };

  return {
    totalFeedback: filteredFeedback.length,
    relevantCount,
    irrelevantCount,
    relevanceRate,
    feedbackByType,
  };
}

/**
 * すべてのフィードバックをクリア
 */
export function clearAllFeedback(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(AI_FEEDBACK_KEY);
    localStorage.removeItem(SEARCH_FEEDBACK_KEY);
    console.log('[Feedback] すべてのフィードバックをクリアしました');
  } catch (error) {
    console.error('[Feedback] フィードバックのクリアエラー:', error);
  }
}
