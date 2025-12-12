'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTabs } from './TabProvider';

interface Shortcut {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

export default function NewTabPage() {
  const router = useRouter();
  
  // TabProviderが利用可能な場合は使用（NewTabPageはTabProvider内で使用されることを前提）
  const tabsContext = useTabs();
  const navigateTab = tabsContext.navigateTab;
  const activeTabId = tabsContext.activeTabId;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isAddingShortcut, setIsAddingShortcut] = useState(false);
  const [newShortcutUrl, setNewShortcutUrl] = useState('');
  const [newShortcutTitle, setNewShortcutTitle] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ローカルストレージからショートカットを読み込む
  useEffect(() => {
    const savedShortcuts = localStorage.getItem('newTabShortcuts');
    if (savedShortcuts) {
      try {
        setShortcuts(JSON.parse(savedShortcuts));
      } catch (error) {
        console.error('ショートカットの読み込みエラー:', error);
      }
    } else {
      // デフォルトのショートカット
      const defaultShortcuts: Shortcut[] = [
        { id: '1', title: 'ダッシュボード', url: '/' },
        { id: '2', title: '事業計画', url: '/business-plan' },
        { id: '3', title: '分析', url: '/analytics' },
        { id: '4', title: 'レポート', url: '/reports' },
        { id: '5', title: '設定', url: '/settings' },
      ];
      setShortcuts(defaultShortcuts);
      localStorage.setItem('newTabShortcuts', JSON.stringify(defaultShortcuts));
    }
  }, []);

  // ショートカットを保存
  const saveShortcuts = (newShortcuts: Shortcut[]) => {
    setShortcuts(newShortcuts);
    localStorage.setItem('newTabShortcuts', JSON.stringify(newShortcuts));
  };

  // 検索処理
  const handleSearch = (query: string) => {
    if (!query.trim()) return;

    const trimmedQuery = query.trim();
    const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
    
    // URLの形式かチェック
    if (trimmedQuery.startsWith('http://') || trimmedQuery.startsWith('https://')) {
      // 完全なURLの場合
      if (activeTabId && navigateTab && isElectron) {
        navigateTab(activeTabId, trimmedQuery);
      } else {
        window.location.href = trimmedQuery;
      }
    } else if (trimmedQuery.startsWith('/')) {
      // パスの場合
      if (activeTabId && navigateTab && isElectron) {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const fullUrl = `${baseUrl}${trimmedQuery}`;
        navigateTab(activeTabId, fullUrl);
      }
      router.push(trimmedQuery);
    } else {
      // 検索クエリの場合（Google検索にリダイレクト）
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmedQuery)}`;
      if (activeTabId && navigateTab && isElectron) {
        navigateTab(activeTabId, googleSearchUrl);
      } else {
        window.open(googleSearchUrl, '_blank');
      }
    }
  };

  // Enterキーで検索
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  // ショートカットをクリック
  const handleShortcutClick = (shortcut: Shortcut) => {
    const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
    if (activeTabId && navigateTab && isElectron) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = shortcut.url.startsWith('http') ? shortcut.url : `${baseUrl}${shortcut.url}`;
      navigateTab(activeTabId, fullUrl);
    }
    router.push(shortcut.url);
  };

  // ショートカットを削除
  const handleDeleteShortcut = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newShortcuts = shortcuts.filter(s => s.id !== id);
    saveShortcuts(newShortcuts);
  };

  // 新しいショートカットを追加
  const handleAddShortcut = () => {
    if (newShortcutUrl.trim() && newShortcutTitle.trim()) {
      const newShortcut: Shortcut = {
        id: Date.now().toString(),
        title: newShortcutTitle.trim(),
        url: newShortcutUrl.trim(),
      };
      saveShortcuts([...shortcuts, newShortcut]);
      setNewShortcutUrl('');
      setNewShortcutTitle('');
      setIsAddingShortcut(false);
    }
  };

  // ショートカット追加フォームを開く
  const handleOpenAddShortcut = () => {
    setIsAddingShortcut(true);
    setTimeout(() => {
      const titleInput = document.getElementById('shortcut-title-input');
      if (titleInput) {
        (titleInput as HTMLInputElement).focus();
      }
    }, 100);
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#202124',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: '80px',
      position: 'relative',
      overflow: 'auto',
    }}>
      {/* Googleロゴ風のタイトル */}
      <div style={{
        marginBottom: '40px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <h1 style={{
          fontSize: '90px',
          fontWeight: 400,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: 0,
          letterSpacing: '-2px',
        }}>
          AIアシスタント
        </h1>
      </div>

      {/* 検索バー */}
      <div style={{
        width: '100%',
        maxWidth: '584px',
        marginBottom: '40px',
        position: 'relative',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#303134',
          borderRadius: '24px',
          border: '1px solid #5f6368',
          padding: '0 16px',
          height: '44px',
          transition: 'box-shadow 0.2s',
          boxShadow: '0 2px 5px 1px rgba(64,60,67,.16)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 8px 1px rgba(64,60,67,.24)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 5px 1px rgba(64,60,67,.16)';
        }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: '12px', flexShrink: 0 }}>
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="#9aa0a6"/>
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="検索またはURLを入力"
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e8eaed',
              fontSize: '16px',
              fontFamily: 'inherit',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                marginLeft: '8px',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="#9aa0a6"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ショートカットグリッド */}
      <div style={{
        width: '100%',
        maxWidth: '800px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '20px',
        padding: '0 20px',
      }}>
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.id}
            onClick={() => handleShortcutClick(shortcut)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '16px',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#5f6368',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              fontSize: '16px',
              color: '#e8eaed',
            }}>
              {shortcut.title.charAt(0)}
            </div>
            <span style={{
              color: '#e8eaed',
              fontSize: '14px',
              textAlign: 'center',
              wordBreak: 'break-word',
            }}>
              {shortcut.title}
            </span>
            <button
              onClick={(e) => handleDeleteShortcut(e, shortcut.id)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="#e8eaed"/>
              </svg>
            </button>
          </div>
        ))}

        {/* ショートカット追加ボタン */}
        {!isAddingShortcut && (
          <div
            onClick={handleOpenAddShortcut}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '16px',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#5f6368',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="#e8eaed"/>
              </svg>
            </div>
            <span style={{
              color: '#9aa0a6',
              fontSize: '14px',
            }}>
              ショートカットを追加
            </span>
          </div>
        )}

        {/* ショートカット追加フォーム */}
        {isAddingShortcut && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <input
              id="shortcut-title-input"
              type="text"
              value={newShortcutTitle}
              onChange={(e) => setNewShortcutTitle(e.target.value)}
              placeholder="タイトル"
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '8px',
                backgroundColor: '#303134',
                border: '1px solid #5f6368',
                borderRadius: '4px',
                color: '#e8eaed',
                fontSize: '14px',
              }}
            />
            <input
              type="text"
              value={newShortcutUrl}
              onChange={(e) => setNewShortcutUrl(e.target.value)}
              placeholder="URLまたはパス（例: /dashboard）"
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '8px',
                backgroundColor: '#303134',
                border: '1px solid #5f6368',
                borderRadius: '4px',
                color: '#e8eaed',
                fontSize: '14px',
              }}
            />
            <div style={{
              display: 'flex',
              gap: '8px',
              width: '100%',
            }}>
              <button
                onClick={handleAddShortcut}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: '#8ab4f8',
                  color: '#202124',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                追加
              </button>
              <button
                onClick={() => {
                  setIsAddingShortcut(false);
                  setNewShortcutUrl('');
                  setNewShortcutTitle('');
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: '#5f6368',
                  color: '#e8eaed',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
