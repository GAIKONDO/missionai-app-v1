'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { BusinessPlanData } from './BusinessPlanForm';

// DynamicPageを動的にインポート（SSRを無効化）
const DynamicPage = dynamic(
  () => import('./pages/component-test/test-concept/DynamicPage'),
  { ssr: false }
);

interface BusinessPlanCardProps {
  plan: BusinessPlanData & { id: string; createdAt?: Date; updatedAt?: Date };
  onEdit: () => void;
  onDelete: () => void;
  type: 'company' | 'project';
  onToggleFavorite?: (planId: string, currentFavorite: boolean) => void;
}

export default function BusinessPlanCard({ plan, onEdit, onDelete, type, onToggleFavorite }: BusinessPlanCardProps) {
  const router = useRouter();
  const [firstPageData, setFirstPageData] = useState<{ id: string; pageNumber: number; title: string; content: string } | null>(null);

  // コンポーネント化版かどうかを判定
  // pagesBySubMenuが存在し、かつ空でないオブジェクトで、少なくとも1つのサブメニューにページが存在する場合のみコンポーネント化版と判定
  const pagesBySubMenu = (plan as any).pagesBySubMenu;
  const isComponentized = pagesBySubMenu && 
    typeof pagesBySubMenu === 'object' && 
    Object.keys(pagesBySubMenu).length > 0 &&
    Object.values(pagesBySubMenu).some((pages: any) => Array.isArray(pages) && pages.length > 0);
  
  // 最初のページのデータを取得（コンポーネント形式の場合）
  useEffect(() => {
    if (!isComponentized || !pagesBySubMenu) {
      console.log('BusinessPlanCard - カバー表示スキップ:', { isComponentized, hasPagesBySubMenu: !!pagesBySubMenu });
      setFirstPageData(null);
      return;
    }

    try {
      console.log('BusinessPlanCard - カバーページデータ取得開始:', {
        planId: plan.id,
        planTitle: plan.title,
        pagesBySubMenuKeys: Object.keys(pagesBySubMenu),
      });

      // 概要・コンセプト（overview）サブメニューを優先的に取得
      const pageOrderBySubMenu = (plan as any).pageOrderBySubMenu;
      let targetSubMenuId = 'overview';
      let pages = pagesBySubMenu[targetSubMenuId];
      
      console.log('BusinessPlanCard - overviewサブメニュー確認:', {
        hasOverview: !!pages,
        overviewPagesCount: Array.isArray(pages) ? pages.length : 0,
      });
      
      // overviewが存在しない場合は最初のサブメニューを使用
      if (!pages || !Array.isArray(pages) || pages.length === 0) {
        const subMenuKeys = Object.keys(pagesBySubMenu);
        console.log('BusinessPlanCard - overviewが見つからない、最初のサブメニューを使用:', subMenuKeys);
        if (subMenuKeys.length === 0) {
          setFirstPageData(null);
          return;
        }
        targetSubMenuId = subMenuKeys[0];
        pages = pagesBySubMenu[targetSubMenuId];
      }
      
      if (!Array.isArray(pages) || pages.length === 0) {
        console.log('BusinessPlanCard - ページが見つかりません:', { targetSubMenuId, pages });
        setFirstPageData(null);
        return;
      }

      console.log('BusinessPlanCard - ページデータ:', {
        targetSubMenuId,
        pagesCount: pages.length,
        firstPage: pages[0],
        pageOrderBySubMenu: pageOrderBySubMenu?.[targetSubMenuId],
      });

      // 順序がある場合はそれを使用、なければ最初のページ
      let firstPage;
      if (pageOrderBySubMenu && pageOrderBySubMenu[targetSubMenuId] && pageOrderBySubMenu[targetSubMenuId].length > 0) {
        const firstPageId = pageOrderBySubMenu[targetSubMenuId][0];
        firstPage = pages.find((p: any) => p.id === firstPageId) || pages[0];
        console.log('BusinessPlanCard - 順序から取得:', { firstPageId, foundPage: !!firstPage });
      } else {
        firstPage = pages[0];
        console.log('BusinessPlanCard - 最初のページを使用:', firstPage);
      }

      if (!firstPage) {
        console.log('BusinessPlanCard - 最初のページが見つかりません');
        setFirstPageData(null);
        return;
      }

      // 1ページ目がキービジュアルのコンテナかどうかを判定
      // キービジュアルのコンテナは以下のいずれかに該当：
      // 1. pageIdが'0'または'page-0'
      // 2. pageNumberが0
      // 3. コンテンツにdata-page-container="0"が含まれる
      // 4. タイトルやコンテンツにキービジュアル関連の文字列が含まれる
      const firstPageContent = firstPage.content || '';
      const firstPageId = firstPage.id || '';
      const firstPageTitle = (firstPage.title || '').toLowerCase();
      
      const isKeyVisualContainer = 
        firstPageId === '0' ||
        firstPageId === 'page-0' ||
        firstPageId.includes('page-0') ||
        firstPage.pageNumber === 0 ||
        firstPageContent.includes('data-page-container="0"') ||
        firstPageContent.includes("data-page-container='0'") ||
        firstPageTitle.includes('キービジュアル') ||
        firstPageTitle.includes('keyvisual') ||
        firstPageContent.includes('keyVisual') ||
        (firstPage.pageNumber === 1 && firstPageContent.includes('<img') && firstPageContent.length < 500); // 短いコンテンツで画像のみの場合はキービジュアルの可能性が高い

      console.log('BusinessPlanCard - 1ページ目がキービジュアルか:', {
        isKeyVisualContainer,
        pageId: firstPageId,
        pageNumber: firstPage.pageNumber,
        title: firstPage.title,
        hasDataPageContainer0: firstPageContent.includes('data-page-container="0"'),
        hasImage: firstPageContent.includes('<img'),
        contentLength: firstPageContent.length,
      });

      // キービジュアルの場合は2ページ目を使用
      let targetPage = firstPage;
      if (isKeyVisualContainer && pages.length > 1) {
        // 順序がある場合は2番目のページIDを使用
        if (pageOrderBySubMenu && pageOrderBySubMenu[targetSubMenuId] && pageOrderBySubMenu[targetSubMenuId].length > 1) {
          const secondPageId = pageOrderBySubMenu[targetSubMenuId][1];
          targetPage = pages.find((p: any) => p.id === secondPageId) || pages[1];
          console.log('BusinessPlanCard - キービジュアル検出、2ページ目を使用（順序から）:', { secondPageId, foundPage: !!targetPage });
        } else {
          targetPage = pages[1];
          console.log('BusinessPlanCard - キービジュアル検出、2ページ目を使用:', targetPage);
        }
      }

      if (!targetPage) {
        console.log('BusinessPlanCard - カバー用のページが見つかりません');
        setFirstPageData(null);
        return;
      }

      console.log('BusinessPlanCard - カバーページデータ設定:', {
        id: targetPage.id,
        pageNumber: targetPage.pageNumber,
        title: targetPage.title,
        contentLength: (targetPage.content || '').length,
        isKeyVisualSkipped: isKeyVisualContainer,
      });

      setFirstPageData({
        id: targetPage.id,
        pageNumber: targetPage.pageNumber || 1,
        title: targetPage.title || '',
        content: targetPage.content || '',
      });
    } catch (error) {
      console.error('最初のページデータ取得エラー:', error);
      setFirstPageData(null);
    }
  }, [isComponentized, pagesBySubMenu, plan]);
  
  // デバッグログ（開発時のみ）
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('BusinessPlanCard - plan.id:', plan.id);
    console.log('BusinessPlanCard - plan.title:', plan.title);
    console.log('BusinessPlanCard - pagesBySubMenu:', pagesBySubMenu);
    console.log('BusinessPlanCard - pagesBySubMenu keys:', pagesBySubMenu ? Object.keys(pagesBySubMenu) : []);
    console.log('BusinessPlanCard - pagesBySubMenu values:', pagesBySubMenu ? Object.values(pagesBySubMenu).map((v: any) => Array.isArray(v) ? v.length : 'not array') : []);
    console.log('BusinessPlanCard - isComponentized:', isComponentized);
  }

  const formatDate = (date?: Date) => {
    if (!date) return '';
    // Dateオブジェクトでない場合は変換を試みる
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // ボタンクリック時はカードのクリックイベントを無視
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    if (type === 'company') {
      router.push(`/business-plan/company/${plan.id}`);
    } else {
      router.push(`/business-plan/project/${plan.id}`);
    }
  };

  return (
    <div 
      className="card"
      onClick={handleCardClick}
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        backgroundColor: isComponentized ? '#F0F9FF' : '#FFFFFF', // コンポーネント化版は薄い青、固定版は白
        border: isComponentized ? '1px solid #BFDBFE' : '1px solid var(--color-border-color)', // コンポーネント化版は青い枠線
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.03)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* カバーエリア（コンポーネント形式の場合） */}
      {isComponentized && firstPageData && (
        <div style={{
          width: '100%',
          aspectRatio: '16 / 9',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              padding: '12px',
              backgroundColor: '#FFFFFF',
              transform: 'scale(0.25)',
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
            }}>
              <div style={{
                width: '400%',
                height: '400%',
              }}>
                <DynamicPage
                  pageId={firstPageData.id}
                  pageNumber={firstPageData.pageNumber}
                  title={firstPageData.title}
                  content={firstPageData.content}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: '12px', 
        padding: isComponentized && firstPageData ? '12px 12px 0' : '12px 12px 0' 
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: 600, 
            color: 'var(--color-text)', 
            marginBottom: '4px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: '1.4',
          }}>
            {plan.title}
          </h3>
          {type === 'project' && (
            <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>事業企画</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {type === 'company' && onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(plan.id, (plan as any).isFavorite || false);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: (plan as any).isFavorite ? '#F59E0B' : '#9CA3AF',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#F59E0B';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = (plan as any).isFavorite ? '#F59E0B' : '#9CA3AF';
              }}
              title={(plan as any).isFavorite ? 'お気に入りを解除' : 'お気に入りに追加'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={(plan as any).isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
          )}
          {type !== 'company' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                style={{
                  background: 'rgba(31, 41, 51, 0.05)',
                  border: '1px solid rgba(31, 41, 51, 0.1)',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(31, 41, 51, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(31, 41, 51, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(31, 41, 51, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(31, 41, 51, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.03)';
                }}
              title="編集"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            {/* 固定形式の場合はゴミ箱アイコンを表示しない */}
            {isComponentized && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={{
                  background: 'rgba(220, 53, 69, 0.08)',
                  border: '1px solid rgba(220, 53, 69, 0.2)',
                  color: '#dc3545',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(220, 53, 69, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(220, 53, 69, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(220, 53, 69, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 53, 69, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(220, 53, 69, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(220, 53, 69, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(220, 53, 69, 0.1)';
                }}
                title="削除"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            )}
            </>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '12px', padding: '0 12px' }}>
        <p style={{ 
          marginTop: '4px', 
          color: 'var(--color-text)', 
          lineHeight: '1.5', 
          fontSize: '13px',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {plan.description}
        </p>
      </div>

      {plan.createdAt && (
        <div style={{ 
          marginTop: '12px', 
          paddingTop: '12px', 
          paddingLeft: '12px', 
          paddingRight: '12px', 
          paddingBottom: '12px', 
          borderTop: '1px solid var(--color-border-color)', 
          fontSize: '10px', 
          color: 'var(--color-text-light)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          作成日: {formatDate(plan.createdAt)}
          {plan.updatedAt && (() => {
            try {
              const createdAtDate = plan.createdAt instanceof Date ? plan.createdAt : new Date(plan.createdAt);
              const updatedAtDate = plan.updatedAt instanceof Date ? plan.updatedAt : new Date(plan.updatedAt);
              if (!isNaN(createdAtDate.getTime()) && !isNaN(updatedAtDate.getTime()) && updatedAtDate.getTime() !== createdAtDate.getTime()) {
                return <> | 更新日: {formatDate(plan.updatedAt)}</>;
              }
            } catch (e) {
              // エラーが発生した場合は更新日を表示しない
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
}

