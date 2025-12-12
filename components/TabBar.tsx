'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useTabs } from './TabProvider';

interface TabBarProps {
  sidebarOpen?: boolean;
  user?: any;
}

export default function TabBar({ sidebarOpen = false, user }: TabBarProps) {
  const { tabs, activeTabId, createTab, closeTab, switchTab, loading } = useTabs();
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [pinnedTabs, setPinnedTabs] = useState<Set<string>>(new Set());
  const [localSidebarOpen, setLocalSidebarOpen] = useState(sidebarOpen);
  const pathname = usePathname();
  
  // 環境検出（クライアントサイドでのみ実行、同期的にチェック）
  const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
  // Tauri環境の検出（Tauriアプリ内では__TAURI__が存在する）
  const isTauri = typeof window !== 'undefined' && (
    '__TAURI__' in window ||
    '__TAURI_INTERNALS__' in window ||
    '__TAURI_METADATA__' in window ||
    (window as any).__TAURI__ !== undefined ||
    (window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI_METADATA__ !== undefined
  );
  
  // デバッグ用ログ
  useEffect(() => {
    const tauriCheck = typeof window !== 'undefined' ? {
      hasTAURI: '__TAURI__' in window,
      hasTAURI_INTERNALS: '__TAURI_INTERNALS__' in window,
      hasTAURI_METADATA: '__TAURI_METADATA__' in window,
      windowTAURI: (window as any).__TAURI__,
      windowTAURI_INTERNALS: (window as any).__TAURI_INTERNALS__,
      windowTAURI_METADATA: (window as any).__TAURI_METADATA__,
    } : {};
    
    console.log('TabBar: 環境チェック', {
      isElectron,
      isTauri,
      hasWindow: typeof window !== 'undefined',
      willRender: isElectron || isTauri,
      ...tauriCheck,
    });
  }, [isElectron, isTauri]);
  
  // Electron環境またはTauri環境でない場合は表示しない
  if (!isElectron && !isTauri) {
    console.log('TabBar: 環境が検出されないため非表示', { isElectron, isTauri });
    return null;
  }
  
  console.log('TabBar: レンダリングします', { isElectron, isTauri });

  // サイドバーの開閉状態を監視
  useEffect(() => {
    setLocalSidebarOpen(sidebarOpen);
  }, [sidebarOpen]);

  useEffect(() => {
    // 初期状態を読み込む
    const saved = localStorage.getItem('sidebarOpen');
    setLocalSidebarOpen(saved === 'true');

    // サイドバーの開閉イベントをリッスン
    const handleSidebarToggle = () => {
      const newState = localStorage.getItem('sidebarOpen') === 'true';
      setLocalSidebarOpen(newState);
    };

    window.addEventListener('sidebarToggle', handleSidebarToggle);
    return () => {
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
    };
  }, []);

  // サイドバーの幅を計算
  const sidebarWidth = useMemo(() => {
    return user ? (localSidebarOpen ? 350 : 70) : 0;
  }, [localSidebarOpen, user]);

  const handleCreateTab = () => {
    console.log('TabBar: 新しいタブボタンがクリックされました');
    console.log('TabBar: createTab関数を呼び出します', { createTab: typeof createTab });
    try {
      createTab();
      console.log('TabBar: createTab関数の呼び出しが完了しました');
    } catch (error) {
      console.error('TabBar: createTab関数の呼び出しでエラーが発生しました', error);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const handleSwitchTab = (tabId: string) => {
    switchTab(tabId);
  };

  const handlePinTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    setPinnedTabs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tabId)) {
        newSet.delete(tabId);
      } else {
        newSet.add(tabId);
      }
      return newSet;
    });
  };

  // URLからタイトルを生成する関数
  const getTitleFromPath = (path: string): string => {
    // 新規タブページの場合は「新しいタブ」を返す
    if (path.includes('/newtab')) {
      return '新しいタブ';
    }
    
    // パスから意味のあるタイトルを生成
    if (path === '/' || path === '') {
      return 'ダッシュボード';
    }
    
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      // 日本語のラベルに変換
      const labels: { [key: string]: string } = {
        'business-plan': '事業計画',
        'analytics': '分析',
        'reports': 'レポート',
        'settings': '設定',
        'visualizations': 'データ可視化',
        'specification': '仕様書',
        'markdown-demo': 'Markdownデモ',
      };
      
      return labels[lastSegment] || lastSegment;
    }
    
    return '新しいタブ';
  };

  // URLからタイトルを取得
  const getTabTitle = (tab: { id: string; url: string; title: string }) => {
    // アクティブなタブの場合は、現在のパス名からタイトルを生成
    if (tab.id === activeTabId && pathname) {
      return getTitleFromPath(pathname);
    }
    
    try {
      const url = new URL(tab.url);
      const path = url.pathname;
      return getTitleFromPath(path);
    } catch {
      // URL解析に失敗した場合は、タブのタイトルを使用
      return tab.title || '新しいタブ';
    }
  };

  // 固定タブと通常タブを分離
  const pinnedTabsList = tabs.filter(tab => pinnedTabs.has(tab.id));
  const normalTabsList = tabs.filter(tab => !pinnedTabs.has(tab.id));

  return (
    <div 
      style={{ 
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#2d2d2d',
        borderBottom: '1px solid #3d3d3d',
        height: '36px',
        overflowX: 'auto',
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 1000,
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties & { WebkitAppRegion?: string }}
    >
      {/* 固定タブ */}
      {pinnedTabsList.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', borderRight: '1px solid #3d3d3d' }}>
          {pinnedTabsList.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isHovered = hoveredTabId === tab.id;
            
            return (
              <div
                key={tab.id}
                onClick={() => handleSwitchTab(tab.id)}
                onMouseEnter={() => setHoveredTabId(tab.id)}
                onMouseLeave={() => setHoveredTabId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  width: '32px',
                  cursor: 'pointer',
                  borderRight: '1px solid #3d3d3d',
                  backgroundColor: isActive ? '#1e1e1e' : isHovered ? '#3d3d3d' : '#2d2d2d',
                  color: isActive ? '#ffffff' : '#d1d5db',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {/* 固定アイコン */}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{ color: '#9ca3af', cursor: 'pointer' }}
                  onClick={(e) => handlePinTab(e, tab.id)}
                >
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </div>
            );
          })}
        </div>
      )}

      {/* 通常タブリスト */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        {tabs.length === 0 && loading ? (
          <div style={{ padding: '8px 16px', color: '#9ca3af', fontSize: '12px' }}>タブを読み込み中...</div>
        ) : tabs.length === 0 ? (
          <div style={{ padding: '8px 16px', color: '#9ca3af', fontSize: '12px' }}>タブがありません</div>
        ) : (
          normalTabsList.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isHovered = hoveredTabId === tab.id;
            
            return (
              <div
                key={tab.id}
                onClick={() => handleSwitchTab(tab.id)}
                onMouseEnter={() => setHoveredTabId(tab.id)}
                onMouseLeave={() => setHoveredTabId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
                  minWidth: '120px',
                  maxWidth: '240px',
                  cursor: 'pointer',
                  borderRight: '1px solid #3d3d3d',
                  backgroundColor: isActive ? '#1e1e1e' : isHovered ? '#3d3d3d' : '#2d2d2d',
                  color: isActive ? '#ffffff' : '#d1d5db',
                  borderBottom: isActive ? '2px solid #3b82f6' : 'none',
                  transition: 'background-color 0.15s ease',
                  position: 'relative',
                }}
              >
                {/* タブタイトル */}
                <span 
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '12px',
                  }}
                  title={getTabTitle(tab)}
                >
                  {getTabTitle(tab)}
                </span>
                
                {/* 固定ボタン */}
                <button
                  onClick={(e) => handlePinTab(e, tab.id)}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: (isHovered || isActive) ? 1 : 0,
                    transition: 'opacity 0.15s ease, background-color 0.15s ease',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    e.currentTarget.style.backgroundColor = '#4d4d4d';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="タブを固定"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    style={{ color: '#9ca3af' }}
                  >
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                </button>
                
                {/* 閉じるボタン */}
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: (isHovered || isActive) ? 1 : 0,
                      transition: 'opacity 0.15s ease, background-color 0.15s ease',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      e.currentTarget.style.backgroundColor = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title="タブを閉じる"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: '#d1d5db' }}
                    >
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* 新しいタブボタン */}
      <button
        onClick={(e) => {
          console.log('TabBar: ボタンがクリックされました', { handleCreateTab: typeof handleCreateTab });
          e.preventDefault();
          e.stopPropagation();
          handleCreateTab();
        }}
        style={{
          padding: '6px 12px',
          color: '#9ca3af',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.15s ease, background-color 0.15s ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ffffff';
          e.currentTarget.style.backgroundColor = '#3d3d3d';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9ca3af';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="新しいタブを開く"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
