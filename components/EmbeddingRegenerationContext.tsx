'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * 埋め込み再生成の進捗情報
 */
export interface EmbeddingRegenerationProgress {
  current: number;
  total: number;
  status: 'idle' | 'processing' | 'completed' | 'cancelled';
  logs: Array<{ type: 'info' | 'success' | 'error' | 'skip'; message: string; timestamp: Date }>;
  stats: { success: number; skipped: number; errors: number };
}

/**
 * 埋め込み再生成のContext型定義
 */
interface EmbeddingRegenerationContextType {
  isRegenerating: boolean;
  progress: EmbeddingRegenerationProgress;
  startRegeneration: () => void;
  updateProgress: (progress: Partial<EmbeddingRegenerationProgress>) => void;
  completeRegeneration: () => void;
  cancelRegeneration: () => void;
  openModal: () => void;
}

const EmbeddingRegenerationContext = createContext<EmbeddingRegenerationContextType | undefined>(undefined);

/**
 * 埋め込み再生成のProvider
 */
export function EmbeddingRegenerationProvider({ children }: { children: ReactNode }) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [progress, setProgress] = useState<EmbeddingRegenerationProgress>({
    current: 0,
    total: 0,
    status: 'idle',
    logs: [],
    stats: { success: 0, skipped: 0, errors: 0 },
  });
  const [shouldOpenModal, setShouldOpenModal] = useState(false);

  const startRegeneration = useCallback(() => {
    setIsRegenerating(true);
    setProgress({
      current: 0,
      total: 0,
      status: 'processing',
      logs: [],
      stats: { success: 0, skipped: 0, errors: 0 },
    });
  }, []);

  const updateProgress = useCallback((updates: Partial<EmbeddingRegenerationProgress>) => {
    setProgress((prev) => ({
      ...prev,
      ...updates,
      // logsとstatsはマージする
      logs: updates.logs !== undefined ? updates.logs : prev.logs,
      stats: updates.stats !== undefined ? updates.stats : prev.stats,
    }));
  }, []);

  const completeRegeneration = useCallback(() => {
    setIsRegenerating(false);
    setProgress((prev) => {
      // 既にcompletedの場合は更新しない（無限ループを防ぐ）
      if (prev.status === 'completed') {
        return prev;
      }
      return {
        ...prev,
        status: 'completed',
      };
    });
  }, []);

  const cancelRegeneration = useCallback(() => {
    setIsRegenerating(false);
    setProgress((prev) => {
      // 既にcancelledの場合は更新しない（無限ループを防ぐ）
      if (prev.status === 'cancelled') {
        return prev;
      }
      return {
        ...prev,
        status: 'cancelled',
      };
    });
  }, []);

  const openModal = () => {
    setShouldOpenModal(true);
    // イベントを発火して、ナレッジグラフページでモーダルを開く
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('openEmbeddingRegenerationModal'));
    }
    // すぐにリセット（複数回クリックに対応）
    setTimeout(() => setShouldOpenModal(false), 100);
  };

  return (
    <EmbeddingRegenerationContext.Provider
      value={{
        isRegenerating,
        progress,
        startRegeneration,
        updateProgress,
        completeRegeneration,
        cancelRegeneration,
        openModal,
      }}
    >
      {children}
    </EmbeddingRegenerationContext.Provider>
  );
}

/**
 * 埋め込み再生成のContextを使用するフック
 */
export function useEmbeddingRegeneration() {
  const context = useContext(EmbeddingRegenerationContext);
  if (context === undefined) {
    throw new Error('useEmbeddingRegeneration must be used within an EmbeddingRegenerationProvider');
  }
  return context;
}

