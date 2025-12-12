/**
 * ChromaDB設定管理
 * 単一のソースから設定を管理し、変更を通知
 */

class ChromaConfigManager {
  private useChroma: boolean = false;
  private listeners: Set<() => void> = new Set();
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage();
      // localStorageの変更を監視（他のタブでの変更を検知）
      window.addEventListener('storage', (e) => {
        if (e.key === 'useChromaDB') {
          this.loadFromLocalStorage();
          this.notifyListeners();
        }
      });
    }
  }
  
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') {
      this.useChroma = false;
      return;
    }
    
    try {
      const useChroma = localStorage.getItem('useChromaDB');
      this.useChroma = useChroma === 'true';
    } catch (error) {
      console.warn('ChromaDB設定の読み込みエラー:', error);
      this.useChroma = false;
    }
  }
  
  /**
   * ChromaDBを使用するかどうか
   * 常にtrueを返す（ChromaDBは常に使用される）
   */
  shouldUseChroma(): boolean {
    return true; // ChromaDBは常に使用される
  }
  
  /**
   * ChromaDB設定を変更
   */
  setUseChroma(useChroma: boolean): void {
    this.useChroma = useChroma;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('useChromaDB', String(useChroma));
      } catch (error) {
        console.warn('ChromaDB設定の保存エラー:', error);
      }
    }
    this.notifyListeners();
  }
  
  /**
   * 設定変更のリスナーを追加
   */
  addListener(listener: () => void): void {
    this.listeners.add(listener);
  }
  
  /**
   * 設定変更のリスナーを削除
   */
  removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('ChromaDB設定変更リスナーのエラー:', error);
      }
    });
  }
}

// シングルトンインスタンス
export const chromaConfig = new ChromaConfigManager();

// 後方互換性のためのエクスポート
// ChromaDBは常に使用される
export function shouldUseChroma(): boolean {
  return true; // ChromaDBは常に使用される
}
