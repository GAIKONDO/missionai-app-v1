'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1分間はキャッシュを有効
            gcTime: 5 * 60 * 1000, // 5分間キャッシュを保持（旧cacheTime）
            refetchOnWindowFocus: false, // ウィンドウフォーカス時の自動再取得を無効化
            refetchOnReconnect: false, // 再接続時の自動再取得を無効化
            retry: 1, // リトライ回数を1回に制限
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

