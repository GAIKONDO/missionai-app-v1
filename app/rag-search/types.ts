export interface SearchHistory {
  query: string;
  timestamp: string;
  resultCount: number;
  filters?: {
    organizationId?: string;
    entityType?: string;
    relationType?: string;
  };
}

export interface FilterPreset {
  name: string;
  filters: {
    organizationId?: string;
    entityType?: string;
    relationType?: string;
    dateFilterType?: 'none' | 'created' | 'updated';
    dateRangeStart?: string;
    dateRangeEnd?: string;
    filterLogic?: 'AND' | 'OR';
  };
}

export interface CacheStats {
  memoryCacheSize: number;
  localStorageCacheSize: number;
  totalSize: number;
}

