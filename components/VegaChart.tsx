'use client';

import { useEffect, useRef, useMemo, memo } from 'react';

interface VegaChartProps {
  spec: any; // VegaまたはVega-Liteの仕様
  language?: 'vega' | 'vega-lite';
  title?: string;
  noBorder?: boolean; // 枠線なしオプション
  onSignal?: (signalName: string, value: any) => void; // シグナルイベントのコールバック
  chartData?: any[]; // チャートデータ（クリックイベント処理用）
}

// vega-embedモジュールを一度だけインポートしてキャッシュ
let vegaEmbedPromise: Promise<any> | null = null;

const getVegaEmbed = () => {
  if (!vegaEmbedPromise) {
    vegaEmbedPromise = import('vega-embed');
  }
  return vegaEmbedPromise;
};

const VegaChart = memo(function VegaChart({ spec, language = 'vega-lite', title, noBorder = false, onSignal, chartData }: VegaChartProps) {
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
          
          // クリックイベントのリスナーを追加
          if (onSignal) {
            // Vega-Liteのviewに直接クリックイベントを追加
            try {
              // Vega-LiteのviewのaddEventListenerを使用（推奨方法）
              viewRef.current.addEventListener('click', (event: any, item: any) => {
                try {
                  if (item && item.datum) {
                    // クリックされたデータからテーマIDを取得
                    const themeId = item.datum.themeId;
                    if (themeId) {
                      onSignal('clicked_theme', { themeId });
                      return;
                    }
                  }
                } catch (e) {
                  console.warn('Failed to get clicked item from Vega view:', e);
                }
              });
            } catch (e) {
              // addEventListenerが利用できない場合は、DOM要素にイベントリスナーを追加
              const viewElement = viewRef.current.container();
              if (viewElement) {
                const clickHandler = (event: MouseEvent) => {
                  try {
                    // クリック位置を取得
                    const rect = viewElement.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const y = event.clientY - rect.top;
                    
                    // Vega-Liteのviewからクリック位置のデータを取得
                    if (chartData && chartData.length > 0) {
                      // Vega-Liteのviewのsceneからクリック位置のデータを取得
                      try {
                        const scene = viewRef.current.scene();
                        if (scene && scene.items) {
                          // クリック位置に最も近い棒グラフのアイテムを探す
                          let closestItem: any = null;
                          let minXDistance = Infinity;
                          
                          // 再帰的にシーンのアイテムを探索
                          const findClosestItem = (items: any[]): void => {
                            items.forEach((item: any) => {
                              if (item.items) {
                                // ネストされたアイテムがある場合は再帰的に探索
                                findClosestItem(item.items);
                              } else if (item.mark && item.mark.marktype === 'rect' && item.datum) {
                                // 棒グラフのx座標範囲を計算
                                const itemX1 = item.x1 || item.x || 0;
                                const itemX2 = item.x2 || item.x || 0;
                                const itemXCenter = (itemX1 + itemX2) / 2;
                                
                                // クリック位置がこの棒グラフの範囲内かチェック
                                const xDistance = Math.abs(x - itemXCenter);
                                
                                // より近いアイテムを記録（x座標が最も近いもの）
                                if (xDistance < minXDistance) {
                                  minXDistance = xDistance;
                                  closestItem = item;
                                }
                              }
                            });
                          };
                          
                          findClosestItem(scene.items);
                          
                          if (closestItem && closestItem.datum && closestItem.datum.themeId) {
                            onSignal('clicked_theme', { themeId: closestItem.datum.themeId });
                            return;
                          }
                        }
                      } catch (sceneError) {
                        console.log('Scene access failed, using fallback method:', sceneError);
                      }
                      
                      // フォールバック: Vega-Liteのviewのscaleを使用
                      try {
                        const xScale = viewRef.current.scale('x');
                        if (xScale && typeof xScale.invert === 'function') {
                          // クリック位置をVega-Liteの座標系に変換
                          const paddingLeft = 60;
                          const adjustedX = x - paddingLeft;
                          
                          // scaleを使ってテーマ名を取得
                          const clickedTheme = xScale.invert(adjustedX);
                          
                          if (clickedTheme !== undefined && clickedTheme !== null) {
                            const themeName = String(clickedTheme);
                            const themeData = chartData.find((d: any) => d.theme === themeName);
                            if (themeData && themeData.themeId) {
                              onSignal('clicked_theme', { themeId: themeData.themeId });
                              return;
                            }
                          }
                        }
                      } catch (scaleError) {
                        console.log('Scale access failed, using coordinate calculation:', scaleError);
                      }
                      
                      // 最終フォールバック: x座標からテーマを特定（より正確な計算）
                      const uniqueThemes = Array.from(new Set(chartData.map((d: any) => d.theme)));
                      if (uniqueThemes.length > 0) {
                        // グラフの実際の描画領域を計算（パディングを考慮）
                        const paddingLeft = 60;
                        const paddingRight = 20;
                        const chartWidth = rect.width - paddingLeft - paddingRight;
                        const themeWidth = chartWidth / uniqueThemes.length;
                        
                        // クリック位置からテーマのインデックスを計算（中心点で判定）
                        const adjustedX = x - paddingLeft;
                        const clickedThemeIndex = Math.round(adjustedX / themeWidth);
                        
                        if (clickedThemeIndex >= 0 && clickedThemeIndex < uniqueThemes.length) {
                          const clickedTheme = uniqueThemes[clickedThemeIndex];
                          const themeData = chartData.find((d: any) => d.theme === clickedTheme);
                          if (themeData && themeData.themeId) {
                            onSignal('clicked_theme', { themeId: themeData.themeId });
                          }
                        }
                      }
                    }
                  } catch (e) {
                    console.warn('Failed to get clicked item:', e);
                  }
                };
                
                viewElement.addEventListener('click', clickHandler);
                
                // クリーンアップ時にイベントリスナーを削除するための参照を保存
                (viewRef.current as any)._clickHandler = clickHandler;
                (viewRef.current as any)._viewElement = viewElement;
              }
            }
          }
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
          // イベントリスナーを削除
          const viewElement = (viewRef.current as any)._viewElement;
          const clickHandler = (viewRef.current as any)._clickHandler;
          if (viewElement && clickHandler) {
            viewElement.removeEventListener('click', clickHandler);
          }
          
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

