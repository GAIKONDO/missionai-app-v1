/**
 * 検索履歴の分析機能
 * よく検索されるキーワードやパターンを分析
 */

interface SearchHistoryItem {
  query: string;
  timestamp: string;
  resultCount: number;
  filters?: {
    organizationId?: string;
    entityType?: string;
    relationType?: string;
  };
}

interface SearchAnalytics {
  totalSearches: number;
  uniqueQueries: number;
  averageResultCount: number;
  topQueries: Array<{ query: string; count: number; avgResults: number }>;
  topOrganizations: Array<{ organizationId: string; count: number }>;
  topEntityTypes: Array<{ entityType: string; count: number }>;
  topRelationTypes: Array<{ relationType: string; count: number }>;
  timeDistribution: Array<{ hour: number; count: number }>;
  recentTrends: Array<{ date: string; count: number }>;
}

/**
 * 検索履歴から統計情報を分析
 */
export function analyzeSearchHistory(history: SearchHistoryItem[]): SearchAnalytics {
  if (history.length === 0) {
    return {
      totalSearches: 0,
      uniqueQueries: 0,
      averageResultCount: 0,
      topQueries: [],
      topOrganizations: [],
      topEntityTypes: [],
      topRelationTypes: [],
      timeDistribution: [],
      recentTrends: [],
    };
  }

  // クエリの集計
  const queryCounts = new Map<string, { count: number; totalResults: number }>();
  history.forEach(item => {
    const existing = queryCounts.get(item.query) || { count: 0, totalResults: 0 };
    queryCounts.set(item.query, {
      count: existing.count + 1,
      totalResults: existing.totalResults + item.resultCount,
    });
  });

  const topQueries = Array.from(queryCounts.entries())
    .map(([query, data]) => ({
      query,
      count: data.count,
      avgResults: data.totalResults / data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 組織の集計
  const orgCounts = new Map<string, number>();
  history.forEach(item => {
    if (item.filters?.organizationId) {
      const count = orgCounts.get(item.filters.organizationId) || 0;
      orgCounts.set(item.filters.organizationId, count + 1);
    }
  });

  const topOrganizations = Array.from(orgCounts.entries())
    .map(([organizationId, count]) => ({ organizationId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // エンティティタイプの集計
  const entityTypeCounts = new Map<string, number>();
  history.forEach(item => {
    if (item.filters?.entityType) {
      const count = entityTypeCounts.get(item.filters.entityType) || 0;
      entityTypeCounts.set(item.filters.entityType, count + 1);
    }
  });

  const topEntityTypes = Array.from(entityTypeCounts.entries())
    .map(([entityType, count]) => ({ entityType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // リレーションタイプの集計
  const relationTypeCounts = new Map<string, number>();
  history.forEach(item => {
    if (item.filters?.relationType) {
      const count = relationTypeCounts.get(item.filters.relationType) || 0;
      relationTypeCounts.set(item.filters.relationType, count + 1);
    }
  });

  const topRelationTypes = Array.from(relationTypeCounts.entries())
    .map(([relationType, count]) => ({ relationType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 時間分布（時間帯別）
  const hourCounts = new Map<number, number>();
  history.forEach(item => {
    const date = new Date(item.timestamp);
    const hour = date.getHours();
    const count = hourCounts.get(hour) || 0;
    hourCounts.set(hour, count + 1);
  });

  const timeDistribution = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: hourCounts.get(i) || 0,
  }));

  // 最近のトレンド（日別）
  const dateCounts = new Map<string, number>();
  history.forEach(item => {
    const date = new Date(item.timestamp);
    const dateStr = date.toISOString().split('T')[0];
    const count = dateCounts.get(dateStr) || 0;
    dateCounts.set(dateStr, count + 1);
  });

  const recentTrends = Array.from(dateCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // 直近30日

  // 平均結果数
  const totalResults = history.reduce((sum, item) => sum + item.resultCount, 0);
  const averageResultCount = totalResults / history.length;

  return {
    totalSearches: history.length,
    uniqueQueries: queryCounts.size,
    averageResultCount,
    topQueries,
    topOrganizations,
    topEntityTypes,
    topRelationTypes,
    timeDistribution,
    recentTrends,
  };
}

/**
 * 検索履歴を取得（localStorageから）
 */
export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const saved = localStorage.getItem('ragSearchHistory');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('検索履歴の読み込みエラー:', error);
  }

  return [];
}

/**
 * キーワードの頻出度を分析
 */
export function analyzeKeywords(history: SearchHistoryItem[]): Array<{ keyword: string; count: number }> {
  const keywordCounts = new Map<string, number>();

  history.forEach(item => {
    // クエリを単語に分割
    const words = item.query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    words.forEach(word => {
      const count = keywordCounts.get(word) || 0;
      keywordCounts.set(word, count + 1);
    });
  });

  return Array.from(keywordCounts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}
