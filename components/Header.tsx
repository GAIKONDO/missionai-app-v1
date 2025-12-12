'use client';

import { signOut, type User } from '@/lib/localFirebase';

interface HeaderProps {
  user: User | null | undefined;
  sidebarOpen?: boolean;
  onAIAssistantToggle?: () => void;
}

export default function Header({ user, sidebarOpen = false, onAIAssistantToggle }: HeaderProps) {
  const handleSignOut = async () => {
    try {
      await signOut(null);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  // サイドバー幅: 70px, サイドメニュー幅: 280px
  // AIアシスタントパネル幅: 480px（開いている場合）
  const sidebarWidth = user ? (sidebarOpen ? 350 : 70) : 0;
  const aiAssistantWidth = 0; // HeaderではAIアシスタントパネルの幅は考慮しない（固定位置のため）
  
  const headerMarginLeft = user 
    ? `${sidebarWidth}px`
    : '0';
  
  const headerWidth = user 
    ? `calc(100% - ${sidebarWidth}px)`
    : '100%';

  // Electron環境でタブバーとURLバーがある場合は、その下に配置
  const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
  const tabBarHeight = isElectron ? 36 : 0;
  const urlBarHeight = isElectron ? 40 : 0;
  const topOffset = tabBarHeight + urlBarHeight;

  return (
    <header style={{
      background: 'linear-gradient(180deg, #1F2933 0%, #18222D 100%)',
      color: 'white',
      padding: 0,
      marginBottom: 0,
      marginLeft: headerMarginLeft,
      marginTop: 0,
      width: headerWidth,
      boxShadow: 'none',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      borderTop: 'none',
      transition: 'margin-left 0.3s ease, width 0.3s ease',
      position: 'fixed',
      top: `${topOffset}px`,
      zIndex: 90,
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '20px 48px' }}>
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 400, letterSpacing: '0.5px', color: 'white' }}>
          株式会社<span style={{ fontWeight: 600 }}>AI</span>アシスタント
        </h1>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>{user.email}</span>
            <button 
              onClick={handleSignOut} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'rgba(255, 255, 255, 0.7)', 
                cursor: 'pointer',
                fontSize: '14px',
                padding: '4px 0',
                transition: 'color 0.2s ease',
                fontWeight: 400
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

