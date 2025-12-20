'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface Tab {
  id: string;
  url: string;
  title: string;
  active: boolean;
  isMainWindow?: boolean;
}

interface TabContextType {
  tabs: Tab[];
  activeTabId: string | null;
  createTab: (url?: string) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
  switchTab: (tabId: string) => Promise<void>;
  navigateTab: (tabId: string, url: string) => Promise<void>;
  loading: boolean;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export function useTabs() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabs must be used within TabProvider');
  }
  return context;
}

interface TabProviderProps {
  children: React.ReactNode;
}

export function TabProvider({ children }: TabProviderProps) {
  const router = useRouter();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false); // ナビゲーション中フラグ

  // Electron APIが利用可能かチェック
  const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
  // Tauri環境の検出（複数の方法を試す）
  const isTauri = typeof window !== 'undefined' && (
    '__TAURI__' in window ||
    '__TAURI_INTERNALS__' in window ||
    '__TAURI_METADATA__' in window ||
    (window as any).__TAURI__ !== undefined ||
    (window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI_METADATA__ !== undefined ||
    // ポート3007で実行されている場合もTauri環境と判断（開発環境）
    (window.location.port === '3007' || window.location.href.includes(':3007'))
  );

  // Tauri環境用の簡易タブ管理（ローカルストレージベース）
  useEffect(() => {
    if (!isTauri || isElectron) {
      // Electron環境の場合は後続の処理に任せる
      if (!isElectron) {
        setLoading(false);
      }
      return;
    }

    // Tauri環境の場合、簡易的なタブ管理を実装
    const initializeTauriTabs = () => {
      try {
        // ローカルストレージからタブを読み込む
        const savedTabs = localStorage.getItem('tauri_tabs');
        if (savedTabs) {
          const parsedTabs = JSON.parse(savedTabs) as Tab[];
          // アクティブなタブを設定
          const activeTab = parsedTabs.find(tab => tab.active) || parsedTabs[0];
          if (activeTab) {
            parsedTabs.forEach(tab => {
              tab.active = tab.id === activeTab.id;
            });
          }
          setTabs(parsedTabs);
        } else {
          // 初期タブを作成
          const initialTab: Tab = {
            id: 'tab-1',
            url: typeof window !== 'undefined' ? window.location.href : '/',
            title: '新しいタブ',
            active: true,
            isMainWindow: true,
          };
          setTabs([initialTab]);
          localStorage.setItem('tauri_tabs', JSON.stringify([initialTab]));
        }
        setLoading(false);
      } catch (error) {
        console.error('Tauriタブの初期化に失敗しました:', error);
        // エラー時はデフォルトタブを作成
        const defaultTab: Tab = {
          id: 'tab-1',
          url: typeof window !== 'undefined' ? window.location.href : '/',
          title: '新しいタブ',
          active: true,
          isMainWindow: true,
        };
        setTabs([defaultTab]);
        setLoading(false);
      }
    };

    initializeTauriTabs();
  }, [isTauri, isElectron]);

  // タブ更新イベントをリッスン（Electron環境のみ）
  useEffect(() => {
    if (!isElectron) {
      return;
    }

    let mounted = true;

    // electronAPIが利用可能になるまで待つ
    const waitForElectronAPI = () => {
      return new Promise<void>((resolve) => {
        const checkAPI = () => {
          const electronAPI = (window as any).electronAPI;
          if (electronAPI && electronAPI.tabs) {
            resolve();
          } else {
            setTimeout(checkAPI, 50);
          }
        };
        checkAPI();
      });
    };

    const initialize = async () => {
      await waitForElectronAPI();
      
      if (!mounted) return;

      const electronAPI = (window as any).electronAPI;
      
      // 初期タブ一覧を取得
      try {
        const allTabs = await electronAPI.tabs.getAll();
        console.log('タブ一覧を取得しました:', allTabs);
        
        if (mounted) {
          setTabs(allTabs);
          setLoading(false);
        }
      } catch (error) {
        console.error('タブ一覧の取得に失敗しました:', error);
        if (mounted) {
          setLoading(false);
          // エラー時でも空のタブ配列を設定
          setTabs([]);
        }
      }

      // タブ更新イベントをリッスン（初期化後に設定）
      const unsubscribe = electronAPI.tabs.onUpdated((updatedTabs: Tab[]) => {
        console.log('タブ更新イベントを受信しました:', updatedTabs);
        if (mounted) {
          setTabs(updatedTabs);
        }
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    };

    let cleanup: (() => void) | undefined;
    initialize().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      mounted = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, [isElectron]);

  // アクティブなタブIDを計算
  const activeTabId = useMemo(() => {
    return tabs.find(tab => tab.active)?.id || null;
  }, [tabs]);

  // 新しいタブを作成
  const createTab = useCallback(async (url?: string) => {
    console.log('TabProvider: createTabが呼び出されました', { url, isElectron, isTauri, tabsCount: tabs.length });
    
    if (isElectron) {
      try {
        console.log('TabProvider: Electron環境でタブを作成します');
        const electronAPI = (window as any).electronAPI;
        const result = await electronAPI.tabs.create(url);
        setTabs(result.tabs);
        console.log('TabProvider: Electron環境でタブを作成しました', result.tabs);
      } catch (error) {
        console.error('TabProvider: タブの作成に失敗しました:', error);
      }
    } else if (isTauri) {
      // Tauri環境の場合、ローカルストレージベースでタブを作成
      try {
        console.log('TabProvider: Tauri環境でタブを作成します');
        setIsNavigating(true);
        
        // 現在のタブのURLを保存（新しいタブを作成する前に）
        let tabsToUpdate = [...tabs];
        const currentActiveTab = tabsToUpdate.find(tab => tab.active);
        if (currentActiveTab && typeof window !== 'undefined') {
          const currentUrl = window.location.href;
          tabsToUpdate = tabsToUpdate.map(tab => 
            tab.id === currentActiveTab.id ? { ...tab, url: currentUrl } : tab
          );
          console.log('TabProvider: 現在のタブのURLを保存しました', { tabId: currentActiveTab.id, url: currentUrl });
        }
        
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const targetUrl = url || `${baseUrl}/newtab`;
        console.log('TabProvider: 新しいタブのURL', { targetUrl, baseUrl });
        
        const newTab: Tab = {
          id: `tab-${Date.now()}`,
          url: targetUrl,
          title: '新しいタブ',
          active: true,
          isMainWindow: true,
        };
        console.log('TabProvider: 新しいタブオブジェクト', newTab);
        
        // 既存のタブを非アクティブにして、新しいタブを追加
        const updatedTabs = tabsToUpdate.map(tab => ({ ...tab, active: false }));
        updatedTabs.push(newTab);
        console.log('TabProvider: 更新後のタブ一覧', updatedTabs);
        
        setTabs(updatedTabs);
        localStorage.setItem('tauri_tabs', JSON.stringify(updatedTabs));
        console.log('TabProvider: ローカルストレージに保存しました');
        
        // 新しいタブページにナビゲート
        if (typeof window !== 'undefined') {
          const targetPath = url ? new URL(url).pathname : '/newtab';
          console.log('TabProvider: ナビゲートします', { targetPath });
          router.push(targetPath);
          // ナビゲーション完了を待つ
          setTimeout(() => {
            console.log('TabProvider: ナビゲーション完了、isNavigatingをfalseにします');
            setIsNavigating(false);
          }, 2000);
        } else {
          setIsNavigating(false);
        }
      } catch (error) {
        console.error('TabProvider: タブの作成に失敗しました:', error);
        setIsNavigating(false);
      }
    } else {
      console.warn('TabProvider: Electron環境でもTauri環境でもありません', { isElectron, isTauri });
    }
  }, [isElectron, isTauri, tabs]);

  // タブを閉じる
  const closeTab = useCallback(async (tabId: string) => {
    if (isElectron) {
      try {
        const electronAPI = (window as any).electronAPI;
        const result = await electronAPI.tabs.close(tabId);
        setTabs(result.tabs);
      } catch (error) {
        console.error('タブの閉鎖に失敗しました:', error);
      }
    } else if (isTauri) {
      // Tauri環境の場合、ローカルストレージベースでタブを閉じる
      try {
        const updatedTabs = tabs.filter(tab => tab.id !== tabId);
        // タブが1つも残らない場合は、新しいタブを作成
        if (updatedTabs.length === 0) {
          const newTab: Tab = {
            id: `tab-${Date.now()}`,
            url: typeof window !== 'undefined' ? window.location.href : '/',
            title: '新しいタブ',
            active: true,
            isMainWindow: true,
          };
          setTabs([newTab]);
          localStorage.setItem('tauri_tabs', JSON.stringify([newTab]));
        } else {
          // 閉じたタブがアクティブだった場合、最初のタブをアクティブにする
          const closedTab = tabs.find(tab => tab.id === tabId);
          if (closedTab?.active && updatedTabs.length > 0) {
            updatedTabs[0].active = true;
          }
          setTabs(updatedTabs);
          localStorage.setItem('tauri_tabs', JSON.stringify(updatedTabs));
        }
      } catch (error) {
        console.error('タブの閉鎖に失敗しました:', error);
      }
    }
  }, [isElectron, isTauri, tabs]);

  // タブを切り替え
  const switchTab = useCallback(async (tabId: string) => {
    if (isNavigating) return; // ナビゲーション中はスキップ

    if (isElectron) {
      try {
        setIsNavigating(true);
        const electronAPI = (window as any).electronAPI;
        const result = await electronAPI.tabs.switch(tabId);
        setTabs(result.tabs);
        
        // BrowserViewのタブの場合は、BrowserViewが自動的に切り替わるのでナビゲーション不要
        // メインウィンドウのタブの場合のみ、URLが異なる場合にナビゲート
        const activeTab = result.tabs.find((tab: Tab) => tab.active);
        if (activeTab && typeof window !== 'undefined' && activeTab.isMainWindow !== false) {
          // メインウィンドウのタブの場合のみナビゲート
          try {
            const url = new URL(activeTab.url);
            const currentPath = window.location.pathname + window.location.search + window.location.hash;
            const targetPath = url.pathname + url.search + url.hash;
            
            // URLが異なる場合のみナビゲート（無限ループを防ぐ）
            if (currentPath !== targetPath && activeTab.url.includes(window.location.origin)) {
              window.location.href = targetPath;
            }
          } catch (urlError) {
            console.error('URL解析エラー:', urlError);
          }
        }
      } catch (error) {
        console.error('タブの切り替えに失敗しました:', error);
      } finally {
        // ナビゲーション完了後にフラグをリセット
        setTimeout(() => {
          setIsNavigating(false);
        }, 500);
      }
    } else if (isTauri) {
      // Tauri環境の場合、ローカルストレージベースでタブを切り替え
      try {
        console.log('TabProvider: Tauri環境でタブを切り替えます', { tabId, currentTabs: tabs });
        setIsNavigating(true);
        
        // 切り替え先のタブを取得（URLを保存する前に）
        const targetTab = tabs.find(tab => tab.id === tabId);
        if (!targetTab) {
          console.error('TabProvider: 切り替え先のタブが見つかりません', { tabId });
          setIsNavigating(false);
          return;
        }
        
        // 現在のタブのURLを保存（切り替え前に、切り替え先のタブのURLは変更しない）
        let tabsToUpdate = [...tabs];
        const currentActiveTab = tabsToUpdate.find(tab => tab.active);
        if (currentActiveTab && currentActiveTab.id !== tabId && typeof window !== 'undefined') {
          const currentUrl = window.location.href;
          tabsToUpdate = tabsToUpdate.map(tab => 
            tab.id === currentActiveTab.id ? { ...tab, url: currentUrl } : tab
          );
          console.log('TabProvider: 現在のタブのURLを保存しました', { tabId: currentActiveTab.id, url: currentUrl });
        }
        
        // 切り替え先のタブのURLを取得（更新前の状態から）
        const targetTabUrl = targetTab.url;
        
        // 新しいタブをアクティブにする（切り替え先のタブのURLは変更しない）
        const updatedTabs = tabsToUpdate.map(tab => ({
          ...tab,
          active: tab.id === tabId,
        }));
        console.log('TabProvider: 更新後のタブ一覧', updatedTabs);
        console.log('TabProvider: 切り替え先のタブのURL', targetTabUrl);
        setTabs(updatedTabs);
        localStorage.setItem('tauri_tabs', JSON.stringify(updatedTabs));
        
        // アクティブなタブのURLにナビゲート
        if (targetTab && typeof window !== 'undefined') {
          try {
            const url = new URL(targetTabUrl);
            const currentPath = window.location.pathname + window.location.search + window.location.hash;
            const targetPath = url.pathname + url.search + url.hash;
            
            console.log('TabProvider: ナビゲーション比較', {
              currentPath,
              targetPath,
              activeTabUrl: targetTabUrl,
              willNavigate: currentPath !== targetPath && targetTabUrl.includes(window.location.origin),
            });
            
            // URLが異なる場合のみナビゲート（無限ループを防ぐ）
            if (currentPath !== targetPath && targetTabUrl.includes(window.location.origin)) {
              console.log('TabProvider: Next.jsルーターでナビゲートします', targetPath);
              // Next.jsのルーターを使用してクライアントサイドナビゲーション
              router.push(targetPath);
              // ナビゲーション完了を待つ（URL変更を監視するuseEffectが動作する前に完了させる）
              setTimeout(() => {
                console.log('TabProvider: ナビゲーション完了、isNavigatingをfalseにします');
                setIsNavigating(false);
              }, 2000); // ナビゲーション完了まで少し長めに待つ
            } else {
              console.log('TabProvider: ナビゲーションをスキップしました', {
                reason: currentPath === targetPath ? '同じパス' : 'origin不一致',
              });
              setIsNavigating(false);
            }
          } catch (urlError) {
            console.error('TabProvider: URL解析エラー:', urlError, { activeTabUrl: targetTabUrl });
            setIsNavigating(false);
          }
        } else {
          setIsNavigating(false);
        }
      } catch (error) {
        console.error('TabProvider: タブの切り替えに失敗しました:', error);
        setIsNavigating(false);
      }
    }
  }, [isElectron, isTauri, isNavigating, tabs, router]);

  // タブのURLを更新
  const navigateTab = useCallback(async (tabId: string, url: string) => {
    if (isElectron) {
      try {
        const electronAPI = (window as any).electronAPI;
        const result = await electronAPI.tabs.navigate(tabId, url);
        setTabs(result.tabs);
      } catch (error) {
        console.error('タブのナビゲーションに失敗しました:', error);
      }
    } else if (isTauri) {
      // Tauri環境の場合、ローカルストレージベースでタブのURLを更新
      try {
        const updatedTabs = tabs.map(tab => 
          tab.id === tabId ? { ...tab, url } : tab
        );
        setTabs(updatedTabs);
        localStorage.setItem('tauri_tabs', JSON.stringify(updatedTabs));
      } catch (error) {
        console.error('タブのナビゲーションに失敗しました:', error);
      }
    }
  }, [isElectron, isTauri, tabs]);

  // URLからタイトルを生成する関数
  const getTitleFromUrl = useCallback((url: string): string => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      // 新規タブページの場合は「新しいタブ」を返す
      if (path.includes('/newtab')) {
        return '新しいタブ';
      }
      
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
    } catch {
      return '新しいタブ';
    }
  }, []);

  // URL変更を監視してアクティブなタブのURLを更新（無限ループを防ぐ）
  // メインウィンドウのタブがアクティブな場合のみ実行
  useEffect(() => {
    if ((!isElectron && !isTauri) || !activeTabId || isNavigating) return; // ナビゲーション中はスキップ

    // アクティブなタブがメインウィンドウのタブでない場合はスキップ
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (!activeTab || activeTab.isMainWindow === false) {
      return; // BrowserViewのタブがアクティブな場合は監視しない
    }

    let isUpdating = false; // 更新中フラグ
    let lastPathname = window.location.pathname; // 最後に更新したパス名
    let lastSearch = window.location.search;
    let lastHash = window.location.hash;

    const updateActiveTabUrl = async () => {
      if (isUpdating || isNavigating) return; // 既に更新中またはナビゲーション中はスキップ
      
      // 最新のtabs状態を取得（クロージャーを避けるため）
      const currentTabs = JSON.parse(localStorage.getItem('tauri_tabs') || '[]') as Tab[];
      const currentActiveTab = currentTabs.find(tab => tab.id === activeTabId);
      if (!currentActiveTab || currentActiveTab.isMainWindow === false) {
        return;
      }
      
      const currentPathname = window.location.pathname;
      const currentSearch = window.location.search;
      const currentHash = window.location.hash;
      const currentUrl = window.location.href;
      
      // パス、クエリ、ハッシュが変更されていない場合はスキップ
      if (
        currentPathname === lastPathname &&
        currentSearch === lastSearch &&
        currentHash === lastHash
      ) {
        return;
      }
      
      // 更新前にlastPathname等を更新して、重複チェックを防ぐ
      lastPathname = currentPathname;
      lastSearch = currentSearch;
      lastHash = currentHash;
      
      // アクティブなタブの現在のURLを取得
      if (currentActiveTab) {
        try {
          const tabUrl = new URL(currentActiveTab.url);
          const currentUrlObj = new URL(currentUrl);
          
          // タブのURLと現在のURLが一致している場合は更新不要
          if (
            tabUrl.pathname === currentUrlObj.pathname &&
            tabUrl.search === currentUrlObj.search &&
            tabUrl.hash === currentUrlObj.hash
          ) {
            console.log('TabProvider: タブのURLと現在のURLが一致しているため更新をスキップ', {
              tabUrl: tabUrl.pathname,
              currentUrl: currentUrlObj.pathname,
            });
            return;
          }
          
          // タブのURLと現在のURLが異なる場合
          // pathnameが異なる場合は、タブ切り替え中の可能性があるので更新をスキップ
          // ただし、pathnameが同じでsearchパラメータだけが異なる場合は、タブ内のタブ切り替えなので更新する
          if (currentUrlObj.pathname !== tabUrl.pathname) {
            // デバッグログを削減（開発環境のみ）
            if (process.env.NODE_ENV === 'development') {
              console.log('TabProvider: タブ切り替え中の可能性があるため更新をスキップ', {
                tabUrl: tabUrl.pathname,
                currentUrl: currentUrlObj.pathname,
                lastPathname,
              });
            }
            return;
          }
          
          // pathnameが同じでsearchパラメータだけが異なる場合は、タブ内のタブ切り替えなので更新する
          // この場合は更新を続行
          
          console.log('TabProvider: タブのURLと現在のURLが異なります（手動ナビゲーションの可能性）', {
            tabUrl: tabUrl.pathname,
            currentUrl: currentUrlObj.pathname,
            willUpdate: true,
          });
        } catch (e) {
          // URL解析エラーは無視
        }
      }
      
      isUpdating = true;
      
      try {
        const newTitle = getTitleFromUrl(currentUrl);
        console.log('TabProvider: アクティブなタブのURLとタイトルを更新します', {
          activeTabId,
          currentUrl,
          currentPathname,
          newTitle,
          currentActiveTabUrl: currentActiveTab?.url,
        });
        
        if (isElectron) {
          const electronAPI = (window as any).electronAPI;
          // アクティブなタブのURLを更新
          await electronAPI.tabs.navigate(activeTabId, currentUrl);
        } else if (isTauri) {
          // Tauri環境の場合、ローカルストレージベースでタブのURLとタイトルを更新
          // 最新のtabs状態を取得するために、関数形式のsetTabsを使用
          setTabs((prevTabs) => {
            const updatedTabs = prevTabs.map(tab => 
              tab.id === activeTabId ? { ...tab, url: currentUrl, title: newTitle } : tab
            );
            console.log('TabProvider: URLとタイトル更新後のタブ一覧', updatedTabs);
            localStorage.setItem('tauri_tabs', JSON.stringify(updatedTabs));
            return updatedTabs;
          });
        }
      } catch (error) {
        console.error('タブのURL更新に失敗しました:', error);
      } finally {
        // 少し遅延させてからフラグをリセット（無限ループを防ぐ）
        setTimeout(() => {
          isUpdating = false;
        }, 300);
      }
    };

    // 初期URLを更新（遅延させて実行）
    const timeoutId = setTimeout(() => {
      console.log('TabProvider: 初期URL更新を実行します', {
        activeTabId,
        currentPathname: window.location.pathname,
      });
      updateActiveTabUrl();
    }, 500);

    // popstateイベント（ブラウザの戻る/進む）を監視
    window.addEventListener('popstate', updateActiveTabUrl);
    
    // Next.jsのルーター変更を監視（pathnameの変更を監視）
    // 注意: lastPathname等はupdateActiveTabUrl内で更新されるため、ここでは比較のみ
    const intervalId = setInterval(() => {
      const currentPathname = window.location.pathname;
      const currentSearch = window.location.search;
      const currentHash = window.location.hash;
      
      if (
        currentPathname !== lastPathname ||
        currentSearch !== lastSearch ||
        currentHash !== lastHash
      ) {
        // デバッグログを削減（開発環境のみ、かつ実際に変更があった場合のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log('TabProvider: URL変更を検出しました', {
            lastPathname,
            currentPathname,
            lastSearch,
            currentSearch,
            lastHash,
            currentHash,
          });
        }
        updateActiveTabUrl();
      }
    }, 100); // 100msごとにチェック

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      window.removeEventListener('popstate', updateActiveTabUrl);
    };
  }, [isElectron, isTauri, activeTabId, isNavigating, getTitleFromUrl]);

  const value: TabContextType = {
    tabs,
    activeTabId,
    createTab,
    closeTab,
    switchTab,
    navigateTab,
    loading,
  };

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}
