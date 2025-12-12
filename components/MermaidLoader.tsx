'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { loadMermaid, isMermaidLoaded } from '@/lib/mermaidLoader';

interface MermaidLoaderProps {
  /**
   * Mermaidの初期化設定
   */
  config?: {
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
  };
  /**
   * 読み込み戦略（Next.js Scriptのstrategy）
   * @default 'afterInteractive'
   */
  strategy?: 'afterInteractive' | 'lazyOnload' | 'beforeInteractive' | 'worker';
  /**
   * 読み込み完了時のコールバック
   */
  onLoad?: () => void;
  /**
   * エラー発生時のコールバック
   */
  onError?: (error: Error) => void;
}

/**
 * Mermaid読み込みコンポーネント
 * 
 * Next.jsのScriptコンポーネントを使用してMermaidライブラリを読み込み、
 * 統一管理された方法で初期化します。
 * 
 * @example
 * ```tsx
 * <MermaidLoader
 *   config={{
 *     theme: 'default',
 *     securityLevel: 'loose',
 *   }}
 *   onLoad={() => console.log('Mermaid loaded')}
 * />
 * ```
 */
export default function MermaidLoader({
  config,
  strategy = 'afterInteractive',
  onLoad,
  onError,
}: MermaidLoaderProps) {
  // 既に読み込まれている場合は即座にコールバックを実行
  useEffect(() => {
    if (isMermaidLoaded() && onLoad) {
      onLoad();
    }
  }, [onLoad]);

  // 既にスクリプトタグが存在する場合は初期化のみ行う
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const existingScript = document.querySelector('script[src*="mermaid.min.js"]');
    if (existingScript && window.mermaid) {
      // 既に読み込まれている場合は、初期化を確実に行う
      loadMermaid(config)
        .then(() => {
          if (onLoad) {
            onLoad();
          }
        })
        .catch((error) => {
          console.error('MermaidLoader: Failed to initialize existing Mermaid', error);
          if (onError) {
            onError(error instanceof Error ? error : new Error('Failed to initialize Mermaid'));
          }
        });
    }
  }, [config, onLoad, onError]);

  const handleLoad = async () => {
    try {
      // 統一管理された読み込み関数を使用
      await loadMermaid(config);
      
      if (onLoad) {
        onLoad();
      }
    } catch (error) {
      console.error('MermaidLoader: Failed to load Mermaid', error);
      
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to load Mermaid'));
      }
    }
  };

  const handleError = () => {
    const error = new Error('Failed to load Mermaid script');
    console.error('MermaidLoader: Script load error', error);
    
    if (onError) {
      onError(error);
    }
  };

  // 既にスクリプトタグが存在する場合はScriptコンポーネントを返さない
  if (typeof window !== 'undefined') {
    const existingScript = document.querySelector('script[src*="mermaid.min.js"]');
    if (existingScript) {
      return null;
    }
  }

  return (
    <Script
      src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"
      strategy={strategy}
      onLoad={handleLoad}
      onError={handleError}
      crossOrigin="anonymous"
    />
  );
}

