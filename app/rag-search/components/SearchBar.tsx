'use client';

import { RAGSearchIcon } from '@/components/Icons';
import type { SearchHistory } from '../types';

interface SearchBarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  showHistory: boolean;
  onShowHistoryChange: (show: boolean) => void;
  searchHistory: SearchHistory[];
  favoriteSearches: SearchHistory[];
  onExecuteHistorySearch: (item: SearchHistory) => void;
  onToggleFavorite: (item: SearchHistory) => void;
  onDeleteHistoryItem: (item: SearchHistory) => void;
  onClearAllHistory: (e?: React.MouseEvent) => void;
  onClearAllFavorites: () => void;
  onShowFiltersToggle: () => void;
  showFilters: boolean;
  onShowEmbeddingStats: () => void;
  onShowAnalytics: () => void;
  onShowEvaluationPanel: () => void;
}

export default function SearchBar({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  isSearching,
  showHistory,
  onShowHistoryChange,
  searchHistory,
  favoriteSearches,
  onExecuteHistorySearch,
  onToggleFavorite,
  onDeleteHistoryItem,
  onClearAllHistory,
  onClearAllFavorites,
  onShowFiltersToggle,
  showFilters,
  onShowEmbeddingStats,
  onShowAnalytics,
  onShowEvaluationPanel,
}: SearchBarProps) {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSearching) {
      onSearch();
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#FFFFFF', 
      borderRadius: '12px', 
      padding: '24px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="検索クエリを入力（例: 自動車メーカーとの提携、AI技術の活用など）"
            disabled={isSearching}
            style={{
              width: '100%',
              padding: '12px 16px',
              paddingLeft: '44px',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '16px',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
              onShowHistoryChange(true);
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              setTimeout(() => onShowHistoryChange(false), 200);
            }}
          />
          <div style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}>
            <RAGSearchIcon size={20} color="#9CA3AF" />
          </div>
          
          {/* 検索履歴ドロップダウン */}
          {showHistory && (searchHistory.length > 0 || favoriteSearches.length > 0) && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              zIndex: 1000,
              maxHeight: '400px',
              overflowY: 'auto',
            }}>
              {favoriteSearches.length > 0 && (
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }}>お気に入り</div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (window.confirm('すべてのお気に入りを削除しますか？')) {
                          onClearAllFavorites();
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: '#EF4444',
                        borderRadius: '4px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#FEE2E2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="すべてのお気に入りを削除"
                    >
                      すべて削除
                    </button>
                  </div>
                  {favoriteSearches.map((item, index) => (
                    <div
                      key={`favorite-${index}`}
                      onClick={() => onExecuteHistorySearch(item)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F3F4F6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '14px', color: '#1F2937', flex: 1 }}>{item.query}</span>
                      <span style={{ fontSize: '12px', color: '#9CA3AF', marginRight: '8px' }}>
                        {item.resultCount}件
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(item);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: '#F59E0B',
                          marginRight: '4px',
                        }}
                        title="お気に入りから削除"
                      >
                        ★
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteHistoryItem(item);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: '#9CA3AF',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#EF4444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#9CA3AF';
                        }}
                        title="履歴から削除"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {searchHistory.length > 0 && (
                <div style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }}>最近の検索</div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onClearAllHistory(e);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: '#EF4444',
                        borderRadius: '4px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#FEE2E2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="すべての履歴を削除"
                    >
                      すべて削除
                    </button>
                  </div>
                  {searchHistory.slice(0, 10).map((item, index) => {
                    const isFavorite = favoriteSearches.some(f => f.query === item.query && f.timestamp === item.timestamp);
                    return (
                      <div
                        key={`history-${index}`}
                        onClick={() => onExecuteHistorySearch(item)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F3F4F6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span style={{ fontSize: '14px', color: '#1F2937', flex: 1 }}>{item.query}</span>
                        <span style={{ fontSize: '12px', color: '#9CA3AF', marginRight: '8px' }}>
                          {item.resultCount}件
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(item);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: isFavorite ? '#F59E0B' : '#D1D5DB',
                            marginRight: '4px',
                          }}
                          title={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
                        >
                          {isFavorite ? '★' : '☆'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteHistoryItem(item);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#9CA3AF',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#EF4444';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#9CA3AF';
                          }}
                          title="履歴から削除"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={onSearch}
            disabled={isSearching || !searchQuery.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: isSearching || !searchQuery.trim() ? '#D1D5DB' : '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 500,
              cursor: isSearching || !searchQuery.trim() ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            {isSearching ? '検索中...' : '検索'}
          </button>
          
          {/* 評価・テストボタン */}
          <button
            onClick={onShowEvaluationPanel}
            style={{
              padding: '12px 16px',
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FDE68A',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FDE68A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FEF3C7';
            }}
            title="評価・テストシステムを開く"
          >
            📊 評価・テスト
          </button>
          <button
            onClick={onShowFiltersToggle}
            style={{
              padding: '12px 16px',
              backgroundColor: showFilters ? '#3B82F6' : '#F3F4F6',
              color: showFilters ? '#FFFFFF' : '#6B7280',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            フィルター
          </button>
          <button
            onClick={onShowEmbeddingStats}
            style={{
              padding: '12px 16px',
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
            title="埋め込みベクトルの次元数と存在を確認"
          >
            📊 埋め込み統計
          </button>
          <button
            onClick={onShowAnalytics}
            style={{
              padding: '12px 16px',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            📊 分析
          </button>
        </div>
      </div>
    </div>
  );
}

