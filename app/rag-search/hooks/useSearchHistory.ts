import { useState, useEffect } from 'react';
import type { SearchHistory } from '../types';

export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [favoriteSearches, setFavoriteSearches] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // 検索履歴の読み込み
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedHistory = localStorage.getItem('ragSearchHistory');
      if (savedHistory) {
        const history = JSON.parse(savedHistory) as SearchHistory[];
        setSearchHistory(history);
      }
      const savedFavorites = localStorage.getItem('ragSearchFavorites');
      if (savedFavorites) {
        const favorites = JSON.parse(savedFavorites) as SearchHistory[];
        setFavoriteSearches(favorites);
      }
    } catch (error) {
      console.error('検索履歴の読み込みエラー:', error);
    }
  }, []);

  // 検索履歴の保存
  const saveSearchHistory = (
    query: string,
    resultCount: number,
    filters?: {
      organizationId?: string;
      entityType?: string;
      relationType?: string;
    }
  ) => {
    if (typeof window === 'undefined') return;
    try {
      const newHistoryItem: SearchHistory = {
        query,
        timestamp: new Date().toISOString(),
        resultCount,
        filters,
      };

      const updatedHistory = [newHistoryItem, ...searchHistory.filter(h => h.query !== query)].slice(0, 20); // 最新20件
      setSearchHistory(updatedHistory);
      localStorage.setItem('ragSearchHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('検索履歴の保存エラー:', error);
    }
  };

  // お気に入り検索の追加/削除
  const toggleFavorite = (historyItem: SearchHistory) => {
    if (typeof window === 'undefined') return;
    try {
      const isFavorite = favoriteSearches.some(f => f.query === historyItem.query && f.timestamp === historyItem.timestamp);
      let updatedFavorites: SearchHistory[];
      
      if (isFavorite) {
        updatedFavorites = favoriteSearches.filter(f => !(f.query === historyItem.query && f.timestamp === historyItem.timestamp));
      } else {
        updatedFavorites = [...favoriteSearches, historyItem].slice(0, 10); // 最大10件
      }
      
      setFavoriteSearches(updatedFavorites);
      localStorage.setItem('ragSearchFavorites', JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('お気に入りの保存エラー:', error);
    }
  };

  // お気に入りをすべて削除
  const clearAllFavorites = () => {
    if (typeof window === 'undefined') return;
    try {
      setFavoriteSearches([]);
      localStorage.setItem('ragSearchFavorites', JSON.stringify([]));
    } catch (error) {
      console.error('お気に入りの全削除エラー:', error);
    }
  };

  // 検索履歴の削除（個別）
  const deleteHistoryItem = (historyItem: SearchHistory) => {
    if (typeof window === 'undefined') return;
    try {
      const updatedHistory = searchHistory.filter(
        h => !(h.query === historyItem.query && h.timestamp === historyItem.timestamp)
      );
      setSearchHistory(updatedHistory);
      localStorage.setItem('ragSearchHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('検索履歴の削除エラー:', error);
    }
  };

  // 検索履歴の全削除
  const clearAllHistory = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (typeof window === 'undefined') return;
    if (window.confirm('すべての検索履歴を削除しますか？')) {
      try {
        setSearchHistory([]);
        localStorage.setItem('ragSearchHistory', JSON.stringify([]));
      } catch (error) {
        console.error('検索履歴の全削除エラー:', error);
      }
    }
  };

  return {
    searchHistory,
    favoriteSearches,
    showHistory,
    setShowHistory,
    saveSearchHistory,
    toggleFavorite,
    clearAllFavorites,
    deleteHistoryItem,
    clearAllHistory,
  };
}

