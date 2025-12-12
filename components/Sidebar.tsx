'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { DashboardIcon, LineChartIcon, BarChartIcon, DocumentIcon, SettingsIcon, OrganizationIcon, CompanyIcon, KnowledgeGraphIcon, RAGSearchIcon, DesignIcon, MenuIcon, CloseIcon } from './Icons';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentPage?: string;
}

export default function Sidebar({ isOpen, onToggle, currentPage }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const menuItems = [
    { icon: DashboardIcon, label: 'ダッシュボード', id: 'dashboard', path: '/' },
    { icon: LineChartIcon, label: '分析', id: 'analytics', path: '/analytics' },
    { icon: KnowledgeGraphIcon, label: 'ナレッジグラフ', id: 'knowledge-graph', path: '/knowledge-graph' },
    { icon: RAGSearchIcon, label: 'RAG検索', id: 'rag-search', path: '/rag-search' },
    { icon: BarChartIcon, label: 'レポート', id: 'reports', path: '/reports' },
    { icon: OrganizationIcon, label: '組織', id: 'organization', path: '/organization' },
    { icon: CompanyIcon, label: '事業会社', id: 'companies', path: '/companies' },
    { icon: DesignIcon, label: '設計', id: 'design', path: '/design' },
    { icon: SettingsIcon, label: '設定', id: 'settings', path: '/settings' },
    { icon: SettingsIcon, label: 'テスト（ナレッジグラフ）', id: 'test-knowledge-graph', path: '/test-knowledge-graph' },
  ];

  // 現在のページを判定
  const getCurrentPage = () => {
    if (currentPage) {
      return currentPage;
    }
    if (pathname === '/') return 'dashboard';
    if (pathname.startsWith('/knowledge-graph')) return 'knowledge-graph';
    if (pathname.startsWith('/rag-search')) return 'rag-search';
    if (pathname.startsWith('/design')) return 'design';
    if (pathname.startsWith('/test-knowledge-graph')) return 'test-knowledge-graph';
    const pathWithoutSlash = pathname.replace('/', '');
    return pathWithoutSlash || 'dashboard';
  };

  const activePage = getCurrentPage();

  const handleNavigation = (path: string) => {
    startTransition(() => {
      router.push(path);
    });
  };

  return (
    <>
      {/* サイドバー（アイコン表示） - 常に表示 */}
      <aside
        style={{
          position: 'fixed',
          left: 0,
          top: '76px',
          width: '70px',
          height: 'calc(100vh - 76px)',
          background: 'linear-gradient(180deg, #1F2933 0%, #18222D 100%)',
          zIndex: 997,
          padding: '20px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
        }}
      >
        {/* ハンバーガーメニューボタン - サイドバーの一番上 */}
        <button
          onClick={onToggle}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            width: '50px',
            height: '50px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            transition: 'background-color 0.2s',
            opacity: 0.8,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.opacity = '0.8';
          }}
          aria-label="メニューを開く"
        >
          {isOpen ? <CloseIcon size={20} color="white" /> : <MenuIcon size={20} color="white" />}
        </button>

        {/* メニューアイテム */}
        {menuItems.map((item, index) => {
          const IconComponent = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              title={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '50px',
                height: '50px',
                marginBottom: index < menuItems.length - 1 ? '10px' : '0',
                borderRadius: '6px',
                color: 'white',
                textDecoration: 'none',
                transition: 'background-color 0.2s',
                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                opacity: isActive ? 1 : 0.7,
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.opacity = '1';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.opacity = '0.7';
                }
              }}
            >
              <IconComponent size={20} color="white" />
            </button>
          );
        })}
      </aside>

      {/* サイドメニュー - サイドバーの右側に表示 */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: '76px',
            left: '70px',
            width: '280px',
            height: 'calc(100vh - 76px)',
            background: 'var(--color-surface)',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
            zIndex: 998,
            padding: '16px 0',
            overflowY: 'auto',
            borderRight: `1px solid var(--color-border-color)`,
          }}
        >
          <div style={{ padding: '0 24px', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-light)', marginBottom: '0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              メニュー
            </h2>
          </div>
          <nav>
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 24px',
                    width: '100%',
                    color: isActive ? 'var(--color-text)' : 'var(--color-text-light)',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    borderLeft: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                    backgroundColor: isActive ? 'var(--color-background)' : 'transparent',
                    fontSize: '14px',
                    fontWeight: isActive ? 500 : 400,
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--color-background)';
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
                  <span style={{ marginRight: '12px', opacity: isActive ? 1 : 0.6 }}>
                    <IconComponent size={18} color={isActive ? 'var(--color-text)' : 'var(--color-text-light)'} />
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
