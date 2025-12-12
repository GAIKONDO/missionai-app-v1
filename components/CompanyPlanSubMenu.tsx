'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { SUB_MENU_ITEMS } from './ConceptSubMenu';
import { BusinessPlanData } from './BusinessPlanForm';

interface CompanyPlanSubMenuProps {
  planId: string;
  currentSubMenuId: string;
  plan: BusinessPlanData | null; // 事業計画データ
}

export default function CompanyPlanSubMenu({ planId, currentSubMenuId, plan }: CompanyPlanSubMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subMenuOpen, setSubMenuOpen] = useState(true); // サブメニューの表示状態

  // localStorageからサイドバーの開閉状態を読み込む
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen');
      setSidebarOpen(saved === 'true');
      
      // サブメニューの表示状態を読み込む
      const savedSubMenuOpen = localStorage.getItem('subMenuOpen');
      if (savedSubMenuOpen !== null) {
        setSubMenuOpen(savedSubMenuOpen === 'true');
      }
      
      // localStorageの変更を監視（異なるタブ間の同期用）
      const handleStorageChange = () => {
        const saved = localStorage.getItem('sidebarOpen');
        setSidebarOpen(saved === 'true');
        
        const savedSubMenuOpen = localStorage.getItem('subMenuOpen');
        if (savedSubMenuOpen !== null) {
          setSubMenuOpen(savedSubMenuOpen === 'true');
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      // カスタムイベントでサイドバーの変更を監視（同じウィンドウ内）
      const handleSidebarToggle = () => {
        const saved = localStorage.getItem('sidebarOpen');
        setSidebarOpen(saved === 'true');
      };
      
      window.addEventListener('sidebarToggle', handleSidebarToggle);
      
      // サブメニューの表示状態変更イベントを監視
      const handleSubMenuToggle = () => {
        const savedSubMenuOpen = localStorage.getItem('subMenuOpen');
        if (savedSubMenuOpen !== null) {
          setSubMenuOpen(savedSubMenuOpen === 'true');
        }
      };
      
      window.addEventListener('subMenuToggle', handleSubMenuToggle);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('sidebarToggle', handleSidebarToggle);
        window.removeEventListener('subMenuToggle', handleSubMenuToggle);
      };
    }
  }, []);

  const handleSubMenuClick = (item: typeof SUB_MENU_ITEMS[0]) => {
    startTransition(() => {
      router.push(`/business-plan/company/${planId}/${item.path}`);
    });
  };

  const handleToggleSubMenu = () => {
    const newState = !subMenuOpen;
    setSubMenuOpen(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('subMenuOpen', String(newState));
      // カスタムイベントを発火してメインコンテンツに通知
      window.dispatchEvent(new Event('subMenuToggle'));
    }
  };

  // サイドバーの開閉状態に応じてleft位置を計算
  const sidebarWidth = sidebarOpen ? 350 : 70;
  const containerPadding = 48;
  const leftPosition = sidebarWidth + containerPadding;

  // 表示するサブメニューをフィルタリング
  // visibleSubMenuIdsが設定されている場合はそれに基づいてフィルタリング
  // 未設定の場合は全サブメニューを表示（後方互換性）
  const visibleSubMenuItems = plan?.visibleSubMenuIds && plan.visibleSubMenuIds.length > 0
    ? SUB_MENU_ITEMS.filter(item => plan.visibleSubMenuIds!.includes(item.id))
    : SUB_MENU_ITEMS;

  // カスタムラベルを取得する関数
  const getDisplayLabel = (item: typeof SUB_MENU_ITEMS[0]) => {
    if (plan?.customSubMenuLabels && plan.customSubMenuLabels[item.id]) {
      return plan.customSubMenuLabels[item.id];
    }
    return item.label;
  };

  return (
    <>
      {/* 事業計画に戻るボタン（サブメニューが開いている時のみ表示） */}
      {subMenuOpen && (
        <button
          onClick={() => router.push('/business-plan')}
          style={{
            position: 'fixed',
            top: '150px',
            left: `${leftPosition}px`,
            background: 'var(--color-background)',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            color: 'var(--color-primary)',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '8px 12px',
            zIndex: 102,
            transition: 'left 0.3s ease, opacity 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(31, 41, 51, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-background)';
          }}
        >
          ← 事業計画に戻る
        </button>
      )}

      {/* サブメニューのトグルボタン */}
      <button
        onClick={handleToggleSubMenu}
        style={{
          position: 'fixed',
          top: '190px',
          left: `${leftPosition - 40}px`,
          width: '32px',
          height: '32px',
          background: 'var(--color-background)',
          border: '1px solid var(--color-border-color)',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 101,
          transition: 'left 0.3s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(31, 41, 51, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-background)';
        }}
        aria-label={subMenuOpen ? 'サブメニューを非表示' : 'サブメニューを表示'}
      >
        <span style={{ fontSize: '16px', color: 'var(--color-text)' }}>
          {subMenuOpen ? '◀' : '▶'}
        </span>
      </button>

      {/* サブメニュー */}
      <div style={{ 
        width: '240px', 
        flexShrink: 0,
        display: subMenuOpen ? 'block' : 'none', // CSSで表示/非表示を制御
      }}>
        <div style={{ 
          background: 'var(--color-background)',
          border: '1px solid var(--color-border-color)',
          borderRadius: '6px',
          padding: '16px 0',
          position: 'fixed',
          top: '190px',
          left: `${leftPosition}px`,
          width: '240px',
          maxHeight: 'calc(100vh - 210px)',
          overflowY: 'auto',
          zIndex: 100,
          transition: 'left 0.3s ease, opacity 0.3s ease',
          opacity: subMenuOpen ? 1 : 0, // フェードアウト効果
          pointerEvents: subMenuOpen ? 'auto' : 'none', // 非表示時はクリックイベントを無効化
        }}>
            <nav>
              {visibleSubMenuItems.map((item, index) => {
                const isActive = currentSubMenuId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSubMenuClick(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 24px',
                      width: '100%',
                      color: isActive ? 'var(--color-text)' : 'var(--color-text-light)',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      borderTop: 'none',
                      borderRight: 'none',
                      borderBottom: 'none',
                      borderLeft: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                      backgroundColor: isActive ? 'rgba(31, 41, 51, 0.05)' : 'transparent',
                      fontSize: '14px',
                      fontWeight: isActive ? 500 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(31, 41, 51, 0.03)';
                        e.currentTarget.style.borderLeftColor = 'rgba(31, 41, 51, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderLeftColor = 'transparent';
                      }
                    }}
                  >
                    <span style={{ marginRight: '12px', fontSize: '12px', color: 'var(--color-text-light)', minWidth: '24px' }}>
                      {index + 1}.
                    </span>
                    <span>{getDisplayLabel(item)}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
    </>
  );
}

