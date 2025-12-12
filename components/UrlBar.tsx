'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTabs } from './TabProvider';

interface UrlBarProps {
  sidebarOpen?: boolean;
  user?: any;
}

export default function UrlBar({ sidebarOpen = false, user }: UrlBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeTabId, navigateTab } = useTabs();
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
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
    
    console.log('UrlBar: 環境チェック', {
      isElectron,
      isTauri,
      hasUser: !!user,
      hasWindow: typeof window !== 'undefined',
      willRender: (isElectron || isTauri) && !!user,
      ...tauriCheck,
    });
  }, [isElectron, isTauri, user]);
  
  // Electron環境またはTauri環境でない場合は表示しない
  if ((!isElectron && !isTauri) || !user) {
    console.log('UrlBar: 環境が検出されない、またはユーザーが存在しないため非表示', {
      isElectron,
      isTauri,
      hasUser: !!user,
    });
    return null;
  }
  
  console.log('UrlBar: レンダリングします', { isElectron, isTauri, hasUser: !!user });

  // パス名が変更されたら入力値を更新
  useEffect(() => {
    if (!isEditing) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      setInputValue(`${baseUrl}${pathname}`);
    }
  }, [pathname, isEditing]);

  // サイドバーの幅を計算
  const sidebarWidth = useMemo(() => {
    return user ? (sidebarOpen ? 350 : 70) : 0;
  }, [sidebarOpen, user]);

  // URLからID情報を抽出
  const urlInfo = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const info: { [key: string]: string } = {};

    // パスからIDを抽出
    if (segments.includes('company') && segments.length > 2) {
      const planIdIndex = segments.indexOf('company') + 1;
      if (planIdIndex < segments.length) {
        info.planId = segments[planIdIndex];
      }
    }

    if (segments.includes('services') && segments.length > 2) {
      const serviceIdIndex = segments.indexOf('services') + 1;
      if (serviceIdIndex < segments.length) {
        info.serviceId = segments[serviceIdIndex];
      }
      if (serviceIdIndex + 1 < segments.length) {
        info.conceptId = segments[serviceIdIndex + 1];
      }
    }

    if (segments.includes('project') && segments.length > 1) {
      const projectIdIndex = segments.indexOf('project') + 1;
      if (projectIdIndex < segments.length) {
        info.projectId = segments[projectIdIndex];
      }
    }

    return info;
  }, [pathname]);

  // ID情報の表示用配列
  const idParts = useMemo(() => {
    const parts: string[] = [];
    if (urlInfo.planId) {
      parts.push(`Plan: ${urlInfo.planId}`);
    }
    if (urlInfo.serviceId) {
      parts.push(`Service: ${urlInfo.serviceId}`);
    }
    if (urlInfo.conceptId) {
      parts.push(`Concept: ${urlInfo.conceptId}`);
    }
    if (urlInfo.projectId) {
      parts.push(`Project: ${urlInfo.projectId}`);
    }
    return parts;
  }, [urlInfo]);

  // URL入力の処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Enterキーでナビゲーション
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNavigate();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      setInputValue(`${baseUrl}${pathname}`);
    }
  };

  // ナビゲーション処理
  const handleNavigate = () => {
    if (!inputValue.trim()) return;

    try {
      let targetUrl = inputValue.trim();
      
      // 完全なURLの場合
      if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
        const url = new URL(targetUrl);
        const path = url.pathname + url.search + url.hash;
        
        // アクティブなタブのURLを更新
        if (activeTabId && (isElectron || isTauri)) {
          navigateTab(activeTabId, targetUrl);
        }
        
        // Next.jsのルーターでナビゲート
        router.push(path);
      } 
      // パスのみの場合（/で始まる）
      else if (targetUrl.startsWith('/')) {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const fullUrl = `${baseUrl}${targetUrl}`;
        
        // アクティブなタブのURLを更新
        if (activeTabId && (isElectron || isTauri)) {
          navigateTab(activeTabId, fullUrl);
        }
        
        // Next.jsのルーターでナビゲート
        router.push(targetUrl);
      }
      // 相対パスの場合
      else {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const currentPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
        const fullPath = `${currentPath}/${targetUrl}`;
        const fullUrl = `${baseUrl}${fullPath}`;
        
        // アクティブなタブのURLを更新
        if (activeTabId && (isElectron || isTauri)) {
          navigateTab(activeTabId, fullUrl);
        }
        
        // Next.jsのルーターでナビゲート
        router.push(fullPath);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('URLナビゲーションエラー:', error);
      // エラー時は現在のURLに戻す
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      setInputValue(`${baseUrl}${pathname}`);
      setIsEditing(false);
    }
  };

  // 入力フィールドをクリックしたら編集モードに
  const handleInputClick = () => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  // フォーカスが外れたら編集モードを終了
  const handleBlur = () => {
    // 少し遅延させて、ボタンクリックを処理できるようにする
    setTimeout(() => {
      setIsEditing(false);
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      setInputValue(`${baseUrl}${pathname}`);
    }, 200);
  };

  // 戻るボタン
  const handleGoBack = () => {
    router.back();
  };

  // 進むボタン
  const handleGoForward = () => {
    router.forward();
  };

  // 更新ボタン
  const handleRefresh = () => {
    router.refresh();
  };

  // ブックマークの切り替え
  const handleBookmarkToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
  };

  return (
    <div 
      style={{ 
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#2d2d2d',
        height: '40px',
        padding: '0 8px',
        position: 'fixed',
        left: 0,
        right: 0,
        top: '36px',
        zIndex: 999,
        WebkitAppRegion: 'no-drag',
        gap: '8px',
      } as React.CSSProperties & { WebkitAppRegion?: string }}
    >
      {/* ナビゲーションコントロール（左側） */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px',
        flexShrink: 0,
      }}>
        {/* 戻るボタン */}
        <button
          onClick={handleGoBack}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#9ca3af',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3d3d3d';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#9ca3af';
          }}
          title="戻る"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 進むボタン */}
        <button
          onClick={handleGoForward}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#9ca3af',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3d3d3d';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#9ca3af';
          }}
          title="進む"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        {/* 更新ボタン */}
        <button
          onClick={handleRefresh}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#9ca3af',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3d3d3d';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#9ca3af';
          }}
          title="更新"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 8v5M21 8h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M3 16v-5M3 16h5" />
          </svg>
        </button>
      </div>

      {/* URL入力フィールド（中央） */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        flex: 1,
        minWidth: 0,
        position: 'relative',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          backgroundColor: '#1e1e1e',
          borderRadius: '24px',
          padding: '0 16px',
          height: '32px',
          border: isEditing ? '1px solid #3b82f6' : '1px solid transparent',
          transition: 'border-color 0.2s ease',
          gap: '8px',
        }}>
          {/* ロックアイコン（HTTPS表示） */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#9ca3af', flexShrink: 0 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>

          {/* URL入力 */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={handleInputClick}
            onBlur={handleBlur}
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              outline: 'none',
            }}
            placeholder="URLを入力"
          />

          {/* ブックマークアイコン */}
          <button
            onClick={handleBookmarkToggle}
            style={{
              width: '20px',
              height: '20px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              flexShrink: 0,
            }}
            title={isBookmarked ? 'ブックマークを削除' : 'ブックマークに追加'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isBookmarked ? '#3b82f6' : 'none'} stroke={isBookmarked ? '#3b82f6' : '#9ca3af'} strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 右側のユーティリティ */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        flexShrink: 0,
      }}>
        {/* ID情報表示（コンパクト） */}
        {idParts.length > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            padding: '4px 8px',
            backgroundColor: '#1e1e1e',
            borderRadius: '16px',
            fontSize: '11px',
          }}>
            {idParts.map((part, index) => (
              <span
                key={index}
                style={{
                  color: '#60a5fa',
                  fontWeight: 500,
                }}
              >
                {part}
                {index < idParts.length - 1 && <span style={{ color: '#6b7280', margin: '0 4px' }}>•</span>}
              </span>
            ))}
          </div>
        )}

        {/* その他のメニュー */}
        <button
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#9ca3af',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3d3d3d';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#9ca3af';
          }}
          title="その他"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
