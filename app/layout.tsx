import type { Metadata } from 'next';
import { Inter, Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/components/QueryProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import TauriTestHelper from '@/components/TauriTestHelper';
import TestOrgDataHelper from '@/components/TestOrgDataHelper';
import { EmbeddingRegenerationProvider } from '@/components/EmbeddingRegenerationContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const notoSansJP = Noto_Sans_JP({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto',
  preload: false,
  adjustFontFallback: true,
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});

export const metadata: Metadata = {
  title: '株式会社AIアシスタント - 事業計画策定',
  description: '事業計画の作成・管理・共有ができるアプリケーション',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* Tauriスクリプトを読み込む（withGlobalTauriが有効な場合） */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Tauriコマンドを呼び出すヘルパー関数をグローバルに公開
              if (typeof window !== 'undefined') {
                window.testTauri = async function(command, args) {
                  try {
                    // まず、window.__TAURI__を確認
                    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
                      console.log('[testTauri] window.__TAURI__.core.invokeを使用', { command, args });
                      const result = await window.__TAURI__.core.invoke(command, args || {});
                      console.log('[testTauri] ✅ 成功:', result);
                      return result;
                    }
                    // 次に、window.__TAURI__.tauri.invokeを確認
                    if (window.__TAURI__ && window.__TAURI__.tauri && typeof window.__TAURI__.tauri.invoke === 'function') {
                      console.log('[testTauri] window.__TAURI__.tauri.invokeを使用', { command, args });
                      const result = await window.__TAURI__.tauri.invoke(command, args || {});
                      console.log('[testTauri] ✅ 成功:', result);
                      return result;
                    }
                    throw new Error('Tauri APIが見つかりません。window.__TAURI__: ' + (window.__TAURI__ ? '存在する' : 'undefined'));
                  } catch (error) {
                    console.error('[testTauri] ❌ エラー:', error);
                    throw error;
                  }
                };
                console.log('✅ testTauri関数が利用可能になりました');
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${notoSansJP.variable} ${notoSansJP.className}`} suppressHydrationWarning>
        <TauriTestHelper />
        <TestOrgDataHelper />
        <ErrorBoundary>
          <QueryProvider>
            <EmbeddingRegenerationProvider>
              {children}
            </EmbeddingRegenerationProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

