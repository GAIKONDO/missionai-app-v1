'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { onAuthStateChanged, signOut, type User } from '@/lib/localFirebase';
import { callTauriCommand } from '@/lib/localFirebase';
import { usePathname } from 'next/navigation';
import Login from './Login';
import Header from './Header';
import Sidebar from './Sidebar';
import ErrorBoundary from './ErrorBoundary';
import AIAssistantPanel from './AIAssistantPanel';
import { TabProvider, useTabs } from './TabProvider';
import TabBar from './TabBar';
import UrlBar from './UrlBar';
import { FiMessageSquare } from 'react-icons/fi';
import { useEmbeddingRegeneration } from './EmbeddingRegenerationContext';

const ADMIN_UID = 'PktGlRBWVZc9E0Y3OLSQ4TeRg0P2';

// ユーザー承認状態のキャッシュ（セッション中のみ有効）
const userApprovalCache = new Map<string, { approved: boolean; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  // Tauri環境を検出（Tauriアプリ内では__TAURI__が存在する）
  const isTauri = typeof window !== 'undefined' && (
    '__TAURI__' in window || 
    '__TAURI_INTERNALS__' in window ||
    '__TAURI_METADATA__' in window ||
    (window as any).__TAURI__ !== undefined ||
    (window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI_METADATA__ !== undefined
  );
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Tauri環境ではFirebaseエラーを表示しないため、初期値をnullに設定
  const [firebaseError, setFirebaseError] = useState<string | null>(isTauri ? null : null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  
  // body要素のdata属性を監視してプレゼンテーションモードの状態を取得
  useEffect(() => {
    const checkPresentationMode = () => {
      if (typeof document !== 'undefined') {
        const isPresentation = document.body.hasAttribute('data-presentation-mode') && 
                               document.body.getAttribute('data-presentation-mode') === 'true';
        setIsPresentationMode(isPresentation);
      }
    };
    
    // 初期チェック
    checkPresentationMode();
    
    // MutationObserverでdata属性の変更を監視
    const observer = new MutationObserver(checkPresentationMode);
    if (typeof document !== 'undefined') {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-presentation-mode'],
      });
    }
    
    // フルスクリーン状態も監視（念のため）
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        // フルスクリーンが終了したら、data属性も削除
        if (typeof document !== 'undefined') {
          document.body.removeAttribute('data-presentation-mode');
        }
        checkPresentationMode();
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      observer.disconnect();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // localStorageからサイドメニューの開閉状態を読み込む
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen');
      return saved === 'true';
    }
    return false;
  });

  // AIアシスタントパネルの開閉状態
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  
  const pathname = usePathname();
  
  // 新規タブページの場合は特別なレイアウトを使用
  const isNewTabPage = pathname === '/newtab';

  // サイドメニューの開閉状態をlocalStorageに保存
  const handleToggleSidebar = useCallback(() => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', String(newState));
      // カスタムイベントを発火してサブメニューに通知
      window.dispatchEvent(new Event('sidebarToggle'));
    }
  }, [sidebarOpen]);

  // サイドバー幅: 70px, サイドメニュー幅: 280px
  const sidebarWidth = useMemo(() => user ? (sidebarOpen ? 350 : 70) : 0, [user, sidebarOpen]);
  
  // AIアシスタントパネル幅（localStorageから読み込み、デフォルトは480px）
  const [aiAssistantWidth, setAiAssistantWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiAssistantPanelWidth');
      return saved ? parseInt(saved, 10) : 480;
    }
    return 480;
  });
  
  // カスタムイベントをリッスンしてリアルタイムで幅を更新
  useEffect(() => {
    const handleWidthChange = (e: CustomEvent<number>) => {
      setAiAssistantWidth(e.detail);
    };
    
    window.addEventListener('aiAssistantWidthChanged', handleWidthChange as EventListener);
    
    return () => {
      window.removeEventListener('aiAssistantWidthChanged', handleWidthChange as EventListener);
    };
  }, []);
  
  // 開閉状態に応じて幅を設定
  const effectiveAiAssistantWidth = aiAssistantOpen ? aiAssistantWidth : 0;
  
  // タブバーの高さ: 36px、URLバーの高さ: 40px、Headerの高さ: 60px
  const tabBarHeight = useMemo(() => {
    const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
    return (isElectron || isTauri) && user ? 36 : 0;
  }, [user]);
  
  const urlBarHeight = useMemo(() => {
    const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
    return (isElectron || isTauri) && user ? 40 : 0;
  }, [user]);
  
  const headerHeight = 60; // Headerの高さ
  const totalTopOffset = tabBarHeight + urlBarHeight + headerHeight; // タブバー + URLバー + ヘッダーの合計高さ
  
  // コンテナを中央配置するためのスタイル
  const containerStyle = useMemo(() => ({
    marginLeft: `${sidebarWidth}px`,
    marginRight: `${effectiveAiAssistantWidth}px`,
    marginTop: `${totalTopOffset}px`,
    width: `calc(100% - ${sidebarWidth}px - ${effectiveAiAssistantWidth}px)`,
    maxWidth: '1800px', // 1400pxから1800pxに拡大
    transition: 'margin-left 0.3s ease, margin-right 0.3s ease, width 0.3s ease, margin-top 0.3s ease',
  }), [sidebarWidth, effectiveAiAssistantWidth, totalTopOffset]);

  // 現在のページを判定
  const currentPage = useMemo(() => {
    if (pathname === '/') return 'dashboard';
    return pathname.replace('/', '') || 'dashboard';
  }, [pathname]);

  // AIアシスタントパネルの開閉ハンドラー（Hooksのルールに従って早期リターンの前に定義）
  const handleAIAssistantToggle = useCallback(() => {
    setAiAssistantOpen((prev) => !prev);
  }, []);

  const handleAIAssistantClose = useCallback(() => {
    setAiAssistantOpen(false);
  }, []);

  // Tauri環境では常にfirebaseErrorをクリア（useEffectの外で実行）
  useEffect(() => {
    // ポート3010で実行されている場合はTauri環境とみなす
    const checkIsTauri = typeof window !== 'undefined' && (
      '__TAURI__' in window || 
      window.location.port === '3010' ||
      (window.location.hostname === 'localhost' && window.location.port === '3010')
    );
    
    if (checkIsTauri) {
      console.log('Layout: Tauri環境を検出、firebaseErrorをクリア', {
        hasTAURI: '__TAURI__' in window,
        port: window.location.port,
        hostname: window.location.hostname,
      });
      setFirebaseError(null);
    }
  }, [isTauri]); // isTauriが変更されたときに実行
  
  useEffect(() => {
    // Tauri環境ではFirebaseエラーをクリア（最初に実行）
    if (isTauri) {
      console.log('Layout: Tauri環境を検出、firebaseErrorをクリア（2回目）');
      setFirebaseError(null);
    }
    
    // 環境の検出（Electron、Tauri、または通常のWebブラウザ）
    const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
    // ポート3010で実行されている場合はTauri環境とみなす
    const detectedTauri = typeof window !== 'undefined' && (
      '__TAURI__' in window || 
      window.location.port === '3010' ||
      (window.location.hostname === 'localhost' && window.location.port === '3010')
    );
    
    // Electron環境の場合、window.electronAPIが利用可能になるまで待つ
    const waitForElectronAPI = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        // electronAPIが既に利用可能
        return true;
      }
      
      // electronAPIが利用可能になるまで待つ（最大5秒）
      const maxWaitTime = 5000;
      const checkInterval = 100;
      let elapsed = 0;
      
      while (elapsed < maxWaitTime) {
        if (typeof window !== 'undefined' && window.electronAPI) {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        elapsed += checkInterval;
      }
      
      return false;
    };

    const initializeAuth = async () => {
      // Tauri環境の場合はログを出力（デバッグ用）
      // 最初にTauri環境をチェックして、Firebaseエラーを表示しないようにする
      if (detectedTauri) {
        console.log('Layout: Tauri環境で実行中');
        // Tauri環境ではFirebaseは使用しないため、localFirebaseのonAuthStateChangedを使用
        // firebaseErrorをクリア（Tauri環境ではFirebaseエラーを表示しない）
        setFirebaseError(null);
        const unsubscribe = onAuthStateChanged(null, async (user) => {
          if (user) {
            // 管理者の場合は承認チェックをスキップ
            if (user.uid === ADMIN_UID) {
              console.log('Layout: 管理者としてログイン');
              setUser(user);
              setLoading(false);
              return;
            }
            
            // ユーザーの承認状態を確認（キャッシュを活用）
            let isApproved = false;
            try {
              // キャッシュをチェック
              const cached = userApprovalCache.get(user.uid);
              const now = Date.now();
              
              if (cached && (now - cached.timestamp) < CACHE_DURATION) {
                // キャッシュが有効な場合はそれを使用
                isApproved = cached.approved;
                console.log('Layout: キャッシュから承認状態を取得:', { approved: isApproved });
              } else {
                // キャッシュが無効または存在しない場合はローカルデータベースから取得
                const userDocResult = await callTauriCommand('doc_get', {
                  collectionName: 'users',
                  docId: user.uid
                });
                const userDoc = userDocResult && userDocResult.data ? {
                  exists: () => true,
                  data: () => userDocResult.data
                } : {
                  exists: () => false,
                  data: () => undefined
                };
                
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  
                  // デバッグログ
                  console.log('Layout: ユーザーデータ確認:', {
                    approved: userData.approved,
                  });
                  
                  // 承認されていない場合はログアウト
                  // approvedがfalse、0、または明示的にfalseと設定されている場合
                  if (userData.approved === false || userData.approved === 0) {
                    console.log('Layout: 承認されていないためログアウト');
                    userApprovalCache.set(user.uid, { approved: false, timestamp: now });
                    await signOut(null);
                    setUser(null);
                    setLoading(false);
                    return;
                  }
                  
                  // approvedがtrue、1、またはundefined（既存ユーザー）の場合は承認済み
                  // 数値の1もtruthyな値として承認済みとみなす
                  if (userData.approved === true || userData.approved === 1 || userData.approved === undefined || Boolean(userData.approved)) {
                    isApproved = true;
                    // キャッシュに保存
                    userApprovalCache.set(user.uid, { approved: true, timestamp: now });
                  } else {
                    // その他の値（nullなど）の場合は未承認として扱う
                    console.log('Layout: 承認状態が不明なためログアウト', { approved: userData.approved });
                    userApprovalCache.set(user.uid, { approved: false, timestamp: now });
                    await signOut(null);
                    setUser(null);
                    setLoading(false);
                    return;
                  }
                } else {
                  // ユーザードキュメントが存在しない場合
                  // 新規登録直後の可能性があるため、安全側に倒してログアウト
                  // （新規登録時は必ずユーザードキュメントが作成される）
                  console.log('Layout: ユーザードキュメントが存在しないため、安全のためログアウト');
                  userApprovalCache.set(user.uid, { approved: false, timestamp: now });
                  await signOut(null);
                  setUser(null);
                  setLoading(false);
                  return;
                }
              }
            } catch (err: any) {
              console.error('承認状態の確認エラー:', err);
              // エラーが発生した場合は、安全側に倒してログアウト
              // 承認状態が確認できない場合はログインを許可しない
              console.log('Layout: 承認状態が確認できないため、安全のためログアウト');
              await signOut(null);
              setUser(null);
              setLoading(false);
              return;
            }
            
            // 承認チェックが成功した場合のみユーザーを設定
            if (isApproved) {
              setUser(user);
              setLoading(false);
            } else {
              // 承認されていない場合はログアウト
              await signOut(null);
              setUser(null);
              setLoading(false);
            }
          } else {
            // ログアウト時はキャッシュをクリア
            setUser(null);
            setLoading(false);
          }
        });
        return () => {
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        };
      }
      
      // Electron環境の場合のみ、electronAPIが利用可能かチェック
      // Tauri環境や通常のWebブラウザの場合はチェックをスキップ
      if (isElectron && typeof window !== 'undefined') {
        const electronAPIAvailable = await waitForElectronAPI();
        if (!electronAPIAvailable) {
          console.warn('Layout: window.electronAPIが利用できません。Electron環境で実行していることを確認してください。');
          setFirebaseError('Electron APIが利用できません。アプリケーションを再起動してください。');
          setLoading(false);
          return;
        }
      }

      // Tauri環境でない場合（通常のWebブラウザ環境）
      if (!detectedTauri && !isElectron) {
        setFirebaseError('Firebaseが設定されていません。.env.localファイルにFirebase設定を追加してください。');
        setLoading(false);
        return;
      }

      // Electron環境の場合の処理（必要に応じて実装）
      // 現在はTauri環境のみをサポート
      setLoading(false);
    };

    initializeAuth();
  }, [isTauri]); // isTauriが変更されたときに再実行

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'var(--color-text-light)',
        fontSize: '14px'
      }}>
        読み込み中...
      </div>
    );
  }

  // Tauri環境ではFirebaseエラーを表示しない
  // コンポーネントのレンダリング時に再度チェック（ポート3010でも判定）
  const renderIsTauri = typeof window !== 'undefined' && (
    '__TAURI__' in window || 
    window.location.port === '3010' ||
    (window.location.hostname === 'localhost' && window.location.port === '3010')
  );
  
  // デバッグ用ログ
  if (typeof window !== 'undefined') {
    console.log('Layout render:', {
      hasTAURI: '__TAURI__' in window,
      windowTAURI: (window as any).__TAURI__,
      port: window.location.port,
      hostname: window.location.hostname,
      firebaseError,
      renderIsTauri,
      isTauri,
    });
  }
  
  // Tauri環境ではfirebaseErrorを無視
  if (firebaseError && !renderIsTauri) {
    return (
      <main>
        <Header user={null} />
        <div className="container">
          <div className="card" style={{ maxWidth: '600px', margin: '50px auto', textAlign: 'center' }}>
            <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>Firebase設定エラー</h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>{firebaseError}</p>
            <div style={{ textAlign: 'left', background: '#f8f9fa', padding: '20px', borderRadius: '4px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>設定手順:</h3>
              <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                <li>Firebase Console (https://console.firebase.google.com/) にアクセス</li>
                <li>プロジェクト「ai-assistant-company」を選択</li>
                <li>プロジェクト設定 &gt; 全般 &gt; マイアプリ &gt; Webアプリの設定から設定値を取得</li>
                <li>.env.localファイルに設定値を入力</li>
                <li>開発サーバーを再起動</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <TabProvider>
      <LayoutContent
        user={user}
        loading={loading}
        firebaseError={firebaseError}
        isPresentationMode={isPresentationMode}
        sidebarOpen={sidebarOpen}
        handleToggleSidebar={handleToggleSidebar}
        currentPage={currentPage}
        containerStyle={containerStyle}
        aiAssistantOpen={aiAssistantOpen}
        handleAIAssistantToggle={handleAIAssistantToggle}
        handleAIAssistantClose={handleAIAssistantClose}
        pathname={pathname}
        isNewTabPage={isNewTabPage}
        totalTopOffset={totalTopOffset}
      >
        {children}
      </LayoutContent>
    </TabProvider>
  );
}

// 内側のコンポーネント（useTabsフックを使用可能）
function LayoutContent({
  user,
  loading,
  firebaseError,
  isPresentationMode,
  sidebarOpen,
  handleToggleSidebar,
  currentPage,
  containerStyle,
  aiAssistantOpen,
  handleAIAssistantToggle,
  handleAIAssistantClose,
  pathname,
  isNewTabPage,
  totalTopOffset,
  children,
}: {
  user: User | null;
  loading: boolean;
  firebaseError: string | null;
  isPresentationMode: boolean;
  sidebarOpen: boolean;
  handleToggleSidebar: () => void;
  currentPage: string;
  containerStyle: any;
  aiAssistantOpen: boolean;
  handleAIAssistantToggle: () => void;
  handleAIAssistantClose: () => void;
  pathname: string;
  isNewTabPage: boolean;
  totalTopOffset: number;
  children: React.ReactNode;
}) {
  // アクティブなタブの情報を取得
  const { tabs, activeTabId, loading: tabsLoading } = useTabs();
  const activeTab = tabs.find(tab => tab.id === activeTabId);
  
  // 埋め込み再生成の状態を取得
  const { isRegenerating, progress, openModal } = useEmbeddingRegeneration();
  
  // BrowserViewのタブがアクティブな場合を判定
  const isBrowserViewTab = activeTab?.isMainWindow === false;
  
  // メインウィンドウのタブがアクティブな場合のみコンテンツを表示
  // BrowserViewのタブがアクティブな場合は、メインウィンドウのコンテンツを完全に非表示にする（Obsidianのような動作）
  const isMainWindowTab = activeTab?.isMainWindow !== false; // undefinedの場合はtrueとみなす（初期状態）
  const shouldShowContent = (isMainWindowTab || !activeTabId) && !isBrowserViewTab;
  
  // TabBarとUrlBarは、メインウィンドウのタブがアクティブな場合のみ表示
  // Tauri環境では、タブが初期化される前でも表示する
  const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
  // Tauri環境では常に表示、Electron環境では条件に従う
  const shouldShowTabBarAndUrlBar = isTauri ? true : shouldShowContent;
  
  // デバッグ用ログ
  useEffect(() => {
    console.log('Layout: タブバー/URLバー表示条件', {
      shouldShowTabBarAndUrlBar,
      shouldShowContent,
      isMainWindowTab,
      isBrowserViewTab,
      activeTabId,
      tabsLength: tabs.length,
      tabsLoading,
      isElectron,
      isTauri,
      hasUser: !!user,
      isPresentationMode,
      willShowTabBar: shouldShowTabBarAndUrlBar && !isPresentationMode && !!user,
    });
  }, [shouldShowTabBarAndUrlBar, shouldShowContent, isMainWindowTab, isBrowserViewTab, activeTabId, tabs.length, tabsLoading, isElectron, isTauri, user, isPresentationMode]);

  // 新規タブページの場合は特別なレイアウト
  if (isNewTabPage) {
    // BrowserViewのタブがアクティブな場合は、何も表示しない（BrowserViewが表示される）
    if (isBrowserViewTab) {
      return <main style={{ display: 'none' }} />;
    }
    
    return (
      <main style={{ backgroundColor: '#202124' }}>
        {shouldShowTabBarAndUrlBar && user && <TabBar sidebarOpen={sidebarOpen} user={user} />}
        {shouldShowTabBarAndUrlBar && user && <UrlBar sidebarOpen={sidebarOpen} user={user} />}
        {shouldShowContent && (
          <div style={{ 
            marginTop: user ? (shouldShowTabBarAndUrlBar ? '76px' : '0') : '0',
            width: '100%',
            height: user ? (shouldShowTabBarAndUrlBar ? 'calc(100vh - 76px)' : '100vh') : '100vh',
            backgroundColor: '#202124',
          }}>
            <ErrorBoundary resetKeys={[pathname]}>
              {user ? children : <Login />}
            </ErrorBoundary>
          </div>
        )}
      </main>
    );
  }

  // BrowserViewのタブがアクティブな場合は、メインウィンドウのコンテンツを完全に非表示にする（Obsidianのような動作）
  if (isBrowserViewTab) {
    return <main style={{ display: 'none' }} />;
  }

  return (
    <main>
      {shouldShowTabBarAndUrlBar && !isPresentationMode && user && <TabBar sidebarOpen={sidebarOpen} user={user} />}
      {shouldShowTabBarAndUrlBar && !isPresentationMode && user && <UrlBar sidebarOpen={sidebarOpen} user={user} />}
      {shouldShowContent && !isPresentationMode && user && (
        <Sidebar isOpen={sidebarOpen} onToggle={handleToggleSidebar} currentPage={currentPage} />
      )}
      {shouldShowContent && !isPresentationMode && (
        <Header 
          user={user} 
          sidebarOpen={sidebarOpen}
        />
      )}
      {shouldShowContent && (
        <div className="container" style={isPresentationMode ? { margin: 0, width: '100%', maxWidth: '100%' } : containerStyle}>
          <ErrorBoundary resetKeys={[pathname]}>
            {user ? children : <Login />}
          </ErrorBoundary>
        </div>
      )}
      {/* 埋め込み再生成中のポップアップ（右上）- Portalでbody直下に配置 */}
      {shouldShowContent && !isPresentationMode && user && isRegenerating && progress.status === 'processing' && typeof window !== 'undefined' 
        ? createPortal(
            <div
              onClick={openModal}
              style={{
                position: 'fixed',
                top: `${totalTopOffset + 16}px`,
                right: '24px',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                padding: '12px 20px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
                zIndex: 1000, // z-indexを下げる（モーダルより低く、通常のコンテンツより高く）
                display: 'inline-flex', // inline-flexに変更してサイズを最小限に
                alignItems: 'center',
                gap: '12px',
                width: 'fit-content', // コンテンツに合わせたサイズ
                maxWidth: '400px', // 最大幅を制限
                animation: 'pulse 2s ease-in-out infinite',
                pointerEvents: 'auto', // クリック可能にする
                cursor: 'pointer', // カーソルをポインターに
                userSelect: 'none', // テキスト選択を無効化
                isolation: 'isolate', // 新しいスタッキングコンテキストを作成
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                  埋め込み再生成中
                </div>
                {progress.total > 0 && (
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    {progress.current} / {progress.total} 件処理中
                    {progress.stats.success > 0 && ` (成功: ${progress.stats.success})`}
                    {progress.stats.errors > 0 && ` (エラー: ${progress.stats.errors})`}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
      {shouldShowContent && !isPresentationMode && user && (
        <>

          {/* AIアシスタント固定ボタン（右下） */}
          <button
            onClick={handleAIAssistantToggle}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: aiAssistantOpen ? 'rgba(59, 130, 246, 0.9)' : 'rgba(59, 130, 246, 1)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease',
              zIndex: 998,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)';
            }}
            title="AIアシスタント"
          >
            <FiMessageSquare size={24} />
          </button>

          <AIAssistantPanel 
            isOpen={aiAssistantOpen} 
            onClose={handleAIAssistantClose}
          />
        </>
      )}
    </main>
  );
}

