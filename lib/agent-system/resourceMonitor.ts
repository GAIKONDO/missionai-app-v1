/**
 * リソース監視機能
 * CPU/メモリ使用率を監視し、同時実行数を動的調整
 */

/**
 * リソース使用状況
 */
export interface ResourceUsage {
  cpuUsage: number;        // CPU使用率（0-1）
  memoryUsage: number;     // メモリ使用率（0-1）
  timestamp: number;        // 測定時刻
}

/**
 * リソース監視設定
 */
export interface ResourceMonitorConfig {
  enableDynamicAdjustment: boolean;  // 動的調整を有効化
  cpuThreshold: number;               // CPU使用率の閾値（0-1）
  memoryThreshold: number;            // メモリ使用率の閾値（0-1）
  adjustmentInterval: number;         // 調整間隔（ミリ秒）
  minConcurrentTasks: number;         // 最小同時実行数
  maxConcurrentTasks: number;         // 最大同時実行数
}

/**
 * リソース監視器
 */
export class ResourceMonitor {
  private config: ResourceMonitorConfig;
  private currentUsage: ResourceUsage | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private onResourceChange?: (usage: ResourceUsage) => void;

  constructor(config: Partial<ResourceMonitorConfig> = {}) {
    this.config = {
      enableDynamicAdjustment: config.enableDynamicAdjustment !== false,
      cpuThreshold: config.cpuThreshold ?? 0.8,
      memoryThreshold: config.memoryThreshold ?? 0.8,
      adjustmentInterval: config.adjustmentInterval ?? 5000, // 5秒
      minConcurrentTasks: config.minConcurrentTasks ?? 1,
      maxConcurrentTasks: config.maxConcurrentTasks ?? 20,
    };
  }

  /**
   * リソース監視を開始
   */
  startMonitoring(onResourceChange?: (usage: ResourceUsage) => void): void {
    this.onResourceChange = onResourceChange;
    
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    // 初回測定（非同期）
    this.measureResources().catch(error => {
      console.error('[ResourceMonitor] 初回リソース測定エラー:', error);
    });

    // 定期的に測定（非同期）
    this.monitoringInterval = setInterval(() => {
      this.measureResources().catch(error => {
        console.error('[ResourceMonitor] リソース測定エラー:', error);
      });
    }, this.config.adjustmentInterval);
  }

  /**
   * リソース監視を停止
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * リソース使用状況を測定（Tauriコマンドを使用）
   */
  private async measureResources(): Promise<void> {
    try {
      // Tauri環境かどうかを判定
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;
      
      if (isTauri) {
        // Tauri環境では、Rust側のコマンドを使用
        await this.measureResourcesTauri();
      } else {
        // ブラウザ環境では、簡易的な実装を使用
        this.measureResourcesBrowser();
      }
    } catch (error) {
      console.error('[ResourceMonitor] リソース測定エラー:', error);
      // エラー時はデフォルト値を設定
      this.currentUsage = {
        cpuUsage: 0,
        memoryUsage: 0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Tauri環境でのリソース測定（Rust側のコマンドを使用）
   */
  private async measureResourcesTauri(): Promise<void> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      // プロセス（アプリケーション）のリソース使用状況を取得
      const resources: {
        cpu_usage: number;
        memory_usage: number;
        memory_used: number;
        memory_total: number;
        timestamp: number;
      } = await invoke('get_process_resources');

      // Rust側から取得した値を0-1の範囲に変換
      const usage: ResourceUsage = {
        cpuUsage: resources.cpu_usage / 100.0, // 0-100から0-1に変換
        memoryUsage: resources.memory_usage / 100.0, // 0-100から0-1に変換
        timestamp: resources.timestamp,
      };

      this.currentUsage = usage;

      // コールバックを呼び出し
      if (this.onResourceChange) {
        this.onResourceChange(usage);
      }
    } catch (error) {
      console.error('[ResourceMonitor] Tauriリソース測定エラー:', error);
      // エラー時はブラウザ実装にフォールバック
      this.measureResourcesBrowser();
    }
  }

  /**
   * ブラウザ環境でのリソース測定（簡易実装）
   */
  private measureResourcesBrowser(): void {
    // ブラウザ環境では、performance.memory（Chrome/Edgeのみ）を使用
    let memoryPercent = 0;
    
    if (typeof (performance as any).memory !== 'undefined') {
      const memory = (performance as any).memory;
      const totalMemory = memory.totalJSHeapSize;
      const usedMemory = memory.usedJSHeapSize;
      memoryPercent = totalMemory > 0 ? usedMemory / totalMemory : 0;
    }

    // CPU使用率はブラウザ環境では正確に測定できないため、0を返す
    const cpuPercent = 0;

    const usage: ResourceUsage = {
      cpuUsage: cpuPercent,
      memoryUsage: memoryPercent,
      timestamp: Date.now(),
    };

    this.currentUsage = usage;

    // コールバックを呼び出し
    if (this.onResourceChange) {
      this.onResourceChange(usage);
    }
  }


  /**
   * 現在のリソース使用状況を取得
   */
  getCurrentUsage(): ResourceUsage | null {
    return this.currentUsage;
  }

  /**
   * リソース使用率に基づいて推奨同時実行数を計算
   */
  getRecommendedConcurrentTasks(currentMax: number): number {
    if (!this.config.enableDynamicAdjustment || !this.currentUsage) {
      return currentMax;
    }

    const { cpuUsage, memoryUsage } = this.currentUsage;
    const { cpuThreshold, memoryThreshold, minConcurrentTasks, maxConcurrentTasks } = this.config;

    // CPUまたはメモリが閾値を超えている場合、同時実行数を減らす
    if (cpuUsage > cpuThreshold || memoryUsage > memoryThreshold) {
      // 使用率が高いほど、同時実行数を減らす
      const reductionFactor = Math.max(
        cpuUsage / cpuThreshold,
        memoryUsage / memoryThreshold
      );
      const recommended = Math.max(
        minConcurrentTasks,
        Math.floor(currentMax / reductionFactor)
      );
      return Math.min(recommended, maxConcurrentTasks);
    }

    // リソースに余裕がある場合、同時実行数を増やす（ただし上限まで）
    if (cpuUsage < cpuThreshold * 0.7 && memoryUsage < memoryThreshold * 0.7) {
      const increaseFactor = 1.2; // 20%増加
      const recommended = Math.min(
        maxConcurrentTasks,
        Math.ceil(currentMax * increaseFactor)
      );
      return Math.max(recommended, minConcurrentTasks);
    }

    // 現状維持
    return currentMax;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<ResourceMonitorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * グローバルリソース監視器インスタンス
 */
let globalMonitor: ResourceMonitor | null = null;

/**
 * リソース監視器を取得（シングルトン）
 */
export function getResourceMonitor(): ResourceMonitor {
  if (!globalMonitor) {
    globalMonitor = new ResourceMonitor();
  }
  return globalMonitor;
}

