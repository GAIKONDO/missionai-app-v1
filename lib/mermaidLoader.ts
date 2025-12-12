/**
 * Mermaid読み込み統一管理ユーティリティ
 * 
 * Mermaidライブラリの重複読み込みを防ぎ、統一された方法で読み込みと初期化を行います。
 */

// Mermaidの型定義
interface MermaidConfig {
  startOnLoad?: boolean;
  theme?: string;
  securityLevel?: 'strict' | 'loose' | 'antiscript' | 'sandbox';
  fontFamily?: string;
  htmlLabels?: boolean;
  flowchart?: {
    useMaxWidth?: boolean;
    htmlLabels?: boolean;
    curve?: string;
    padding?: number;
    nodeSpacing?: number;
    rankSpacing?: number;
    defaultRenderer?: string;
    paddingX?: number;
    paddingY?: number;
  };
  themeVariables?: Record<string, string>;
}

interface MermaidAPI {
  initialize: (config: MermaidConfig) => void;
  render: (id: string, diagram: string) => Promise<{ svg: string }>;
  parse: (diagram: string) => Promise<boolean>;
  run?: (options?: { nodes?: Node[] }) => Promise<void>;
  contentLoaded?: () => void;
}

declare global {
  interface Window {
    mermaid?: MermaidAPI;
  }
}

// シングルトンインスタンス
let mermaidPromise: Promise<MermaidAPI> | null = null;
let mermaidInstance: MermaidAPI | null = null;
let isInitialized = false;

// デフォルト設定
const DEFAULT_CONFIG: MermaidConfig = {
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  htmlLabels: true,
};

/**
 * Mermaidライブラリを読み込む
 * 
 * @param config - Mermaidの初期化設定（オプション）
 * @returns Promise<MermaidAPI> - Mermaid APIインスタンス
 * @throws Error - 読み込みに失敗した場合
 */
export function loadMermaid(config?: MermaidConfig): Promise<MermaidAPI> {
  // サーバーサイドではエラー
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Mermaid can only be loaded on the client side'));
  }

  // 既に読み込まれている場合は即座に返す
  if (mermaidInstance) {
    return Promise.resolve(mermaidInstance);
  }

  // 既に読み込み中の場合はそのPromiseを返す
  if (mermaidPromise) {
    return mermaidPromise;
  }

  // 既にスクリプトタグが存在するかチェック
  const existingScript = document.querySelector('script[src*="mermaid.min.js"]');
  if (existingScript && window.mermaid) {
    mermaidInstance = window.mermaid;
    if (!isInitialized && config) {
      mermaidInstance.initialize({ ...DEFAULT_CONFIG, ...config });
      isInitialized = true;
    } else if (!isInitialized) {
      mermaidInstance.initialize(DEFAULT_CONFIG);
      isInitialized = true;
    }
    return Promise.resolve(mermaidInstance);
  }

  // 新しい読み込みを開始
  mermaidPromise = new Promise<MermaidAPI>((resolve, reject) => {
    // スクリプトタグを作成
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    script.async = true;
    script.crossOrigin = 'anonymous';

    // 読み込み成功時の処理
    script.onload = () => {
      try {
        if (!window.mermaid) {
          reject(new Error('Mermaid library loaded but window.mermaid is not available'));
          return;
        }

        mermaidInstance = window.mermaid;
        const finalConfig = config ? { ...DEFAULT_CONFIG, ...config } : DEFAULT_CONFIG;

        // 初期化
        if (typeof mermaidInstance.initialize === 'function') {
          mermaidInstance.initialize(finalConfig);
          isInitialized = true;
        }

        // カスタムイベントを発火
        window.dispatchEvent(new Event('mermaidloaded'));

        resolve(mermaidInstance);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to initialize Mermaid'));
      }
    };

    // 読み込み失敗時の処理
    script.onerror = () => {
      mermaidPromise = null;
      reject(new Error('Failed to load Mermaid script'));
    };

    // スクリプトタグを追加
    document.head.appendChild(script);
  });

  return mermaidPromise;
}

/**
 * Mermaidが既に読み込まれているかチェック
 * 
 * @returns boolean - 読み込まれている場合true
 */
export function isMermaidLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.mermaid;
}

/**
 * Mermaidインスタンスを取得
 * 
 * @returns MermaidAPI | null - Mermaidインスタンス、読み込まれていない場合はnull
 */
export function getMermaidInstance(): MermaidAPI | null {
  return mermaidInstance || (typeof window !== 'undefined' ? window.mermaid || null : null);
}

/**
 * Mermaidを再初期化する
 * 
 * @param config - 新しい設定
 */
export function reinitializeMermaid(config: MermaidConfig): void {
  if (typeof window === 'undefined' || !window.mermaid) {
    throw new Error('Mermaid is not loaded');
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  window.mermaid.initialize(finalConfig);
  isInitialized = true;
}

/**
 * Mermaid図をレンダリングする
 * 
 * @param diagramCode - Mermaid図のコード
 * @param id - 図のID（オプション、指定しない場合は自動生成）
 * @returns Promise<string> - レンダリングされたSVG文字列
 */
export async function renderMermaidDiagram(
  diagramCode: string,
  id?: string
): Promise<string> {
  const mermaid = await loadMermaid();
  
  if (typeof mermaid.render !== 'function') {
    throw new Error('Mermaid render function is not available');
  }

  const diagramId = id || `mermaid-diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const result = await mermaid.render(diagramId, diagramCode);
  
  return typeof result === 'string' ? result : result.svg;
}

/**
 * Mermaidが読み込まれるまで待つ
 * 
 * @param timeout - タイムアウト時間（ミリ秒、デフォルト: 10000）
 * @returns Promise<MermaidAPI> - Mermaid APIインスタンス
 */
export function waitForMermaid(timeout: number = 10000): Promise<MermaidAPI> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Cannot wait for Mermaid on server side'));
      return;
    }

    // 既に読み込まれている場合
    if (window.mermaid) {
      resolve(window.mermaid);
      return;
    }

    // イベントリスナーで待つ
    const timeoutId = setTimeout(() => {
      window.removeEventListener('mermaidloaded', handleLoad);
      reject(new Error(`Timeout waiting for Mermaid (${timeout}ms)`));
    }, timeout);

    const handleLoad = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mermaidloaded', handleLoad);
      
      if (window.mermaid) {
        resolve(window.mermaid);
      } else {
        reject(new Error('Mermaid loaded event fired but window.mermaid is not available'));
      }
    };

    window.addEventListener('mermaidloaded', handleLoad);

    // 既に読み込み中の場合はそのPromiseを待つ
    if (mermaidPromise) {
      mermaidPromise
        .then(resolve)
        .catch(reject)
        .finally(() => {
          clearTimeout(timeoutId);
          window.removeEventListener('mermaidloaded', handleLoad);
        });
    }
  });
}

