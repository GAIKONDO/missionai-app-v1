'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PresentationModeContextType {
  isPresentationMode: boolean;
  enterPresentationMode: () => void;
  exitPresentationMode: () => void;
}

const PresentationModeContext = createContext<PresentationModeContextType | undefined>(undefined);

export function PresentationModeProvider({ children }: { children: ReactNode }) {
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  const enterPresentationMode = () => {
    setIsPresentationMode(true);
    // body要素にdata属性を追加してプレゼンテーションモードを識別
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-presentation-mode', 'true');
      // フルスクリーンAPIを使用してブラウザをフルスクリーンにする
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen().catch((err) => {
          console.error('フルスクリーンエラー:', err);
        });
      }
    }
  };

  const exitPresentationMode = () => {
    setIsPresentationMode(false);
    // body要素からdata属性を削除
    if (typeof document !== 'undefined') {
      document.body.removeAttribute('data-presentation-mode');
      // フルスクリーンから抜ける
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.error('フルスクリーン終了エラー:', err);
        });
      }
    }
  };

  // ESCキーでプレゼンテーションモードを終了
  useEffect(() => {
    if (!isPresentationMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        exitPresentationMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPresentationMode]);

  // フルスクリーン終了イベントを監視
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isPresentationMode) {
        setIsPresentationMode(false);
        // body要素からdata属性を削除してサイドバーとメニューを表示
        if (typeof document !== 'undefined') {
          document.body.removeAttribute('data-presentation-mode');
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isPresentationMode]);

  return (
    <PresentationModeContext.Provider
      value={{
        isPresentationMode,
        enterPresentationMode,
        exitPresentationMode,
      }}
    >
      {children}
    </PresentationModeContext.Provider>
  );
}

export function usePresentationMode() {
  const context = useContext(PresentationModeContext);
  if (context === undefined) {
    throw new Error('usePresentationMode must be used within a PresentationModeProvider');
  }
  return context;
}

