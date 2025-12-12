'use client';

import { useEffect, useRef, useMemo, memo } from 'react';

interface VegaChartProps {
  spec: any; // VegaまたはVega-Liteの仕様
  language?: 'vega' | 'vega-lite';
  title?: string;
  noBorder?: boolean; // 枠線なしオプション
}

// vega-embedモジュールを一度だけインポートしてキャッシュ
let vegaEmbedPromise: Promise<any> | null = null;

const getVegaEmbed = () => {
  if (!vegaEmbedPromise) {
    vegaEmbedPromise = import('vega-embed');
  }
  return vegaEmbedPromise;
};

const VegaChart = memo(function VegaChart({ spec, language = 'vega-lite', title, noBorder = false }: VegaChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);

  // specをJSON文字列化して比較（オブジェクト参照の比較を避ける）
  const specKey = useMemo(() => {
    try {
      return JSON.stringify(spec);
    } catch {
      return String(spec);
    }
  }, [spec]);

  useEffect(() => {
    if (!chartRef.current || !spec) {
      return;
    }

    // 既存のチャートをクリア
    if (viewRef.current) {
      try {
        viewRef.current.finalize();
      } catch (e) {
        // エラーは無視
      }
      viewRef.current = null;
    }
    chartRef.current.innerHTML = '';

    // 動的にvega-embedをインポート（SSRを回避、キャッシュ済みの場合は高速）
    getVegaEmbed().then((vegaEmbedModule: any) => {
      // vega-embedのエクスポート構造を確認
      // vega-embedは名前付きエクスポートとしてembed関数を提供
      const embed = vegaEmbedModule.default || vegaEmbedModule.embed || vegaEmbedModule;
      
      if (typeof embed !== 'function') {
        console.error('vega-embed module structure:', Object.keys(vegaEmbedModule));
        console.error('vega-embed module:', vegaEmbedModule);
        throw new Error(`vega-embedのエクスポートが正しくありません。利用可能なキー: ${Object.keys(vegaEmbedModule).join(', ')}`);
      }

      // Vega-Embedでチャートをレンダリング
      return embed(chartRef.current!, spec, {
        mode: language === 'vega' ? 'vega' : 'vega-lite',
        actions: {
          export: true,
          source: false,
          compiled: false,
          editor: false,
        },
      }).then((result: any) => {
        // viewを保存してクリーンアップ時に使用
        if (result && result.view) {
          viewRef.current = result.view;
        }
        return result;
      });
    }).catch((error: any) => {
      console.error('Vega chart error:', error);
      console.error('Error stack:', error?.stack);
      if (chartRef.current) {
        const errorMessage = error?.message || '不明なエラーが発生しました';
        const errorDetails = error?.stack ? error.stack.split('\n').slice(0, 3).join('<br/>') : '';
        chartRef.current.innerHTML = `<div style="padding: 20px; color: #dc3545; border: 1px solid #dc3545; border-radius: 6px; background: rgba(220, 53, 69, 0.1);">
          <strong>グラフのレンダリングエラー:</strong><br/>
          ${errorMessage}<br/>
          ${errorDetails ? `<small style="font-size: 11px; margin-top: 8px; display: block; color: #991b1b;">${errorDetails}</small>` : ''}
          <small style="font-size: 11px; margin-top: 8px; display: block;">詳細はブラウザのコンソール（F12）を確認してください。</small>
        </div>`;
      }
    });

    return () => {
      // クリーンアップ
      if (viewRef.current) {
        try {
          viewRef.current.finalize();
        } catch (e) {
          // エラーは無視
        }
        viewRef.current = null;
      }
    };
  }, [specKey, language]);

  return (
    <div style={{ marginBottom: 0 }}>
      {title && (
        <div
          style={{
            background: 'rgba(31, 41, 51, 0.05)',
            border: '1px solid var(--color-border-color)',
            borderBottom: 'none',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text-light)',
          }}
        >
          {title}
        </div>
      )}
      <div
        ref={chartRef}
        style={{
          borderRadius: title ? '0 0 6px 6px' : (noBorder ? '0' : '6px'),
          padding: noBorder ? '0' : '16px',
          backgroundColor: noBorder ? 'transparent' : '#fff',
          overflow: 'auto',
        }}
      />
    </div>
  );
});

export default VegaChart;

