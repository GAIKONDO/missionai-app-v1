/**
 * 類似ページ検索コンポーネント
 * テキストクエリまたはページIDに基づいて類似ページを検索
 */

'use client';

import { useState } from 'react';
import { findSimilarPages, findSimilarPagesByPageId } from '@/lib/pageEmbeddings';
import { getDoc, doc, query, collection, where, getDocs, getFirestore } from '@/lib/localFirebase';
import { PageMetadata } from '@/types/pageMetadata';

interface SimilarPagesSearchProps {
  planId?: string;
  conceptId?: string;
  currentPageId?: string;
  onPageSelect?: (pageId: string) => void;
}

export default function SimilarPagesSearch({
  planId,
  conceptId,
  currentPageId,
  onPageSelect,
}: SimilarPagesSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Array<{
    pageId: string;
    similarity: number;
    title?: string;
    content?: string;
  }>>([]);
  const [error, setError] = useState<string | null>(null);

  // テキストクエリで検索
  const handleTextSearch = async () => {
    if (!searchQuery.trim()) {
      setError('検索クエリを入力してください');
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const firestoreDb = getFirestore();
      if (!firestoreDb) {
        throw new Error('Firestoreが初期化されていません');
      }

      const similarPages = await findSimilarPages(searchQuery, 10, planId, conceptId);
      
      // ページの詳細情報を取得
      const resultsWithDetails = await Promise.all(
        similarPages.map(async (page) => {
          try {
            // ページデータを取得
            let pageData: PageMetadata | null = null;
            
            if (planId) {
              const planDoc = await getDoc(doc(firestoreDb, 'companyBusinessPlan', planId));
              if (planDoc.exists()) {
                const planData = planDoc.data();
                const pagesBySubMenu = (planData.pagesBySubMenu || {}) as { [key: string]: Array<PageMetadata> };
                const allPages = Object.values(pagesBySubMenu).flat();
                pageData = allPages.find(p => p.id === page.pageId) || null;
              }
            } else if (conceptId) {
              // 構想のページを検索
              const conceptsQuery = query(
                collection(firestoreDb, 'concepts'),
                where('conceptId', '==', conceptId)
              );
              const conceptsSnapshot = await getDocs(conceptsQuery);
              if (!conceptsSnapshot.empty) {
                const conceptData = conceptsSnapshot.docs[0].data();
                const pagesBySubMenu = (conceptData.pagesBySubMenu || {}) as { [key: string]: Array<PageMetadata> };
                const allPages = Object.values(pagesBySubMenu).flat();
                pageData = allPages.find(p => p.id === page.pageId) || null;
              }
            }

            return {
              ...page,
              title: pageData?.title,
              content: pageData?.content?.substring(0, 200), // 最初の200文字のみ
            };
          } catch (err) {
            console.error(`ページ ${page.pageId} の詳細取得エラー:`, err);
            return page;
          }
        })
      );

      setResults(resultsWithDetails);
    } catch (err: any) {
      setError(err.message || '検索に失敗しました');
      console.error('類似ページ検索エラー:', err);
    } finally {
      setSearching(false);
    }
  };

  // 現在のページに類似するページを検索
  const handleSimilarToCurrentPage = async () => {
    if (!currentPageId) {
      setError('現在のページIDが設定されていません');
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const firestoreDb = getFirestore();
      if (!firestoreDb) {
        throw new Error('Firestoreが初期化されていません');
      }

      const similarPages = await findSimilarPagesByPageId(currentPageId, 10);
      
      // ページの詳細情報を取得
      const resultsWithDetails = await Promise.all(
        similarPages.map(async (page) => {
          try {
            let pageData: PageMetadata | null = null;
            
            if (planId) {
              const planDoc = await getDoc(doc(firestoreDb, 'companyBusinessPlan', planId));
              if (planDoc.exists()) {
                const planData = planDoc.data();
                const pagesBySubMenu = (planData.pagesBySubMenu || {}) as { [key: string]: Array<PageMetadata> };
                const allPages = Object.values(pagesBySubMenu).flat();
                pageData = allPages.find(p => p.id === page.pageId) || null;
              }
            } else if (conceptId) {
              const conceptsQuery = query(
                collection(firestoreDb, 'concepts'),
                where('conceptId', '==', conceptId)
              );
              const conceptsSnapshot = await getDocs(conceptsQuery);
              if (!conceptsSnapshot.empty) {
                const conceptData = conceptsSnapshot.docs[0].data();
                const pagesBySubMenu = (conceptData.pagesBySubMenu || {}) as { [key: string]: Array<PageMetadata> };
                const allPages = Object.values(pagesBySubMenu).flat();
                pageData = allPages.find(p => p.id === page.pageId) || null;
              }
            }

            return {
              ...page,
              title: pageData?.title,
              content: pageData?.content?.substring(0, 200),
            };
          } catch (err) {
            console.error(`ページ ${page.pageId} の詳細取得エラー:`, err);
            return page;
          }
        })
      );

      setResults(resultsWithDetails);
    } catch (err: any) {
      setError(err.message || '検索に失敗しました');
      console.error('類似ページ検索エラー:', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      border: '1px solid var(--color-border-color)',
      marginBottom: '24px',
    }}>
      <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
        類似ページ検索
      </h3>

      {/* テキスト検索 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !searching) {
                handleTextSearch();
              }
            }}
            placeholder="検索クエリを入力（例: AIファーストカンパニー）"
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              fontSize: '14px',
            }}
            disabled={searching}
          />
          <button
            onClick={handleTextSearch}
            disabled={searching || !searchQuery.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: searching ? '#9CA3AF' : 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: searching ? 'not-allowed' : 'pointer',
            }}
          >
            {searching ? '検索中...' : '検索'}
          </button>
        </div>
      </div>

      {/* 現在のページに類似するページを検索 */}
      {currentPageId && (
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={handleSimilarToCurrentPage}
            disabled={searching}
            style={{
              padding: '8px 16px',
              backgroundColor: searching ? '#9CA3AF' : '#8B5CF6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: searching ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {searching ? '検索中...' : 'このページに類似するページを検索'}
          </button>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '6px',
          color: '#991B1B',
          fontSize: '14px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* 検索結果 */}
      {results.length > 0 && (
        <div>
          <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
            検索結果 ({results.length}件)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {results.map((result, index) => (
              <div
                key={result.pageId}
                onClick={() => {
                  if (onPageSelect) {
                    onPageSelect(result.pageId);
                  }
                }}
                style={{
                  padding: '16px',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  cursor: onPageSelect ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (onPageSelect) {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (onPageSelect) {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                    e.currentTarget.style.borderColor = 'var(--color-border-color)';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
                      {result.title || `ページ ${index + 1}`}
                    </div>
                    {result.content && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-light)', lineHeight: '1.6' }}>
                        {result.content}...
                      </div>
                    )}
                  </div>
                  <div style={{
                    padding: '4px 8px',
                    backgroundColor: '#E3F2FD',
                    color: '#1976D2',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginLeft: '12px',
                  }}>
                    {(result.similarity * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '8px' }}>
                  ID: {result.pageId}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !searching && !error && (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--color-text-light)',
          fontSize: '14px',
        }}>
          検索結果がありません。検索クエリを入力して検索してください。
        </div>
      )}
    </div>
  );
}

