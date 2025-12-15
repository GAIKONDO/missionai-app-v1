'use client';

import { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  diagramCode: string;
  diagramId: string;
  centerNodeFontSize?: number;
  childNodeFontSize?: number;
}

export default function MermaidDiagram({
  diagramCode,
  diagramId,
  centerNodeFontSize = 32,
  childNodeFontSize = 18,
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const renderedRef = useRef(false);
  const previousDiagramCodeRef = useRef<string>('');

  // Mermaidの読み込み状態をチェック
  useEffect(() => {
    const checkMermaid = () => {
      if (typeof window !== 'undefined' && (window as any).mermaid) {
        const mermaid = (window as any).mermaid;
        if (typeof mermaid.initialize === 'function') {
          mermaid.initialize({ 
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontSize: 18,
            fontFamily: 'inherit',
            themeVariables: {
              fontSize: '18px',
              fontFamily: 'inherit',
              primaryTextColor: '#1F2937',
              primaryBorderColor: '#6366f1',
              lineColor: '#6366f1',
              secondaryTextColor: '#4B5563',
              tertiaryColor: '#F9FAFB',
              nodeBkg: '#e0e7ff',
              nodeBorder: '#6366f1',
              clusterBkg: '#ffffde', // subgraphの背景色（薄い黄色、Mermaidデフォルト）
              clusterBorder: '#aaaa33', // subgraphのボーダー色（Mermaidデフォルト）
              defaultLinkColor: '#6366f1',
              titleColor: '#1F2937',
              edgeLabelBackground: '#FFFFFF',
            },
            flowchart: {
              nodeSpacing: 80,
              rankSpacing: 100,
              padding: 20, // パディングを増やす
              useMaxWidth: true,
              htmlLabels: true,
              wrap: true,
              paddingX: 20, // 横方向のパディング
              paddingY: 20, // 縦方向のパディング
              curve: 'stepAfter', // 直角（ステップ）な線を使用
            }
          });
        }
        if (!mermaidLoaded) {
          setMermaidLoaded(true);
        }
        return true;
      }
      return false;
    };

    const handleMermaidLoaded = () => {
      if (checkMermaid()) {
        setMermaidLoaded(true);
      }
    };

    if (checkMermaid()) {
      setMermaidLoaded(true);
    } else {
      // Mermaidが読み込まれていない場合は、スクリプトを動的に読み込む
      if (typeof window !== 'undefined' && !document.querySelector('script[src*="mermaid.min.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          window.dispatchEvent(new Event('mermaidloaded'));
          handleMermaidLoaded();
        };
        document.head.appendChild(script);
      } else {
        if (typeof window !== 'undefined') {
          window.addEventListener('mermaidloaded', handleMermaidLoaded);
        }
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mermaidloaded', handleMermaidLoaded);
      }
    };
  }, [mermaidLoaded]);

  // Mermaid図のレンダリング
  useEffect(() => {
    if (!mermaidLoaded || !containerRef.current || !diagramCode || !diagramCode.trim()) {
      // コードが空の場合はコンテナをクリア
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      renderedRef.current = false;
      previousDiagramCodeRef.current = '';
      return;
    }

    // diagramCodeが変更された場合は、renderedRefをリセットしてコンテナをクリア
    if (previousDiagramCodeRef.current !== diagramCode) {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      renderedRef.current = false;
      previousDiagramCodeRef.current = diagramCode;
    }

    if (renderedRef.current) return;

    const renderDiagram = async () => {
      // Mermaidが利用可能になるまで待つ
      let retries = 0;
      const maxRetries = 50;
      while (retries < maxRetries && (!(window as any).mermaid || typeof (window as any).mermaid.render !== 'function')) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }

      const mermaid = (window as any).mermaid;
      if (!mermaid || typeof mermaid.render !== 'function') {
        console.warn('⚠️ [MermaidDiagram] Mermaidが利用できません', {
          mermaidExists: !!mermaid,
          renderExists: mermaid ? typeof mermaid.render : 'N/A'
        });
        return;
      }

      console.log('📊 [MermaidDiagram] レンダリング開始:', {
        diagramId,
        codeLength: diagramCode.length,
        codePreview: diagramCode.substring(0, 100)
      });

      try {
        // Mermaidコードをクリーンアップ（前後の空白のみ削除、HTMLタグは保持）
        let cleanCode = diagramCode.trim();
        
        // 前後の空白行を削除
        cleanCode = cleanCode.replace(/^\s*\n+|\n+\s*$/g, '');
        
        // コードの各行を確認して、不正な文字がないかチェック
        const lines = cleanCode.split('\n');
        const validLines: string[] = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();
          
          // 空行は保持（Mermaidでは空行は無視されるが、可読性のために保持）
          if (trimmed.length === 0) {
            validLines.push('');
            continue;
          }
          
          // HTMLタグを含む行は有効（MermaidのhtmlLabelsで使用）
          if (trimmed.includes('<') && trimmed.includes('>')) {
            validLines.push(line);
            continue;
          }
          
          // Mermaid構文の行をチェック
          // --> や ==> などのMermaid構文を許可
          // subgraph、classDef、classなどのキーワードも許可
          // ノード定義（例: E2["企業の従業員"]）も許可
          // 不正な文字（制御文字など）が含まれていないか確認
          if (trimmed.match(/^[a-zA-Z0-9\s\-_\[\](){}"':;=,.#<>\/→💰]+$/) || 
              trimmed.includes('-->') || 
              trimmed.includes('==>') ||
              trimmed.includes('---') ||
              trimmed.includes('graph') ||
              trimmed.includes('direction') ||
              trimmed.includes('subgraph') ||
              trimmed === 'end' ||
              trimmed.includes('classDef') ||
              trimmed.startsWith('class ') ||
              // ノード定義のパターン（例: E2["企業の従業員"]、G2["自治体の住民"]）
              /^[A-Z0-9]+\[/.test(trimmed) ||
              // ノード定義のパターン（例: P1["パートナー企業<br/>..."]）
              /^[A-Z0-9]+\["/.test(trimmed)) {
            validLines.push(line);
          } else {
            console.warn('不正な行をスキップ:', trimmed);
          }
        }
        
        cleanCode = validLines.join('\n');
        
        // デバッグ用：コード全体をログに出力（最初の500文字と最後の200文字）
        const previewLength = 500;
        const tailLength = 200;
        if (cleanCode.length > previewLength + tailLength) {
          console.log('Mermaidコード（最初の500文字）:', cleanCode.substring(0, previewLength));
          console.log('Mermaidコード（最後の200文字）:', cleanCode.substring(cleanCode.length - tailLength));
        } else {
          console.log('Mermaidコード（全体）:', cleanCode);
        }
        console.log('Mermaidコード（全体の長さ）:', cleanCode.length);
        console.log('Mermaidコード（行数）:', cleanCode.split('\n').length);
        
        const id = `mermaid-${diagramId}-${Date.now()}`;
        console.log('📊 [MermaidDiagram] render呼び出し:', { id, codeLength: cleanCode.length });
        const result = await mermaid.render(id, cleanCode);
        const svg = typeof result === 'string' ? result : result.svg;
        console.log('✅ [MermaidDiagram] render成功:', { svgLength: svg?.length || 0 });

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          console.log('✅ [MermaidDiagram] SVGをコンテナに設定しました');

          // SVGがDOMに挿入された後にフォントサイズを変更
          setTimeout(() => {
            const svgElement = containerRef.current?.querySelector('svg');
            if (!svgElement) {
              console.warn('SVG要素が見つかりません');
              return;
            }

            // SVGのサイズを調整
            svgElement.style.maxWidth = '100%';
            svgElement.style.width = '100%';
            svgElement.style.height = 'auto';

            // foreignObject内のHTMLテキストを処理
            const foreignObjects = svgElement.querySelectorAll('foreignObject');
            let foundCenterNode = false;

            foreignObjects.forEach((fo) => {
              const divs = fo.querySelectorAll('div');
              const spans = fo.querySelectorAll('span');
              const allElements = Array.from(divs).concat(Array.from(spans) as any);

              allElements.forEach((el) => {
                const textContent = el.textContent || '';

                // 中央ノードの判定（"AIネイティブ設計"を含む）
                if (!foundCenterNode && textContent.includes('AIネイティブ設計')) {
                  el.style.fontSize = `${centerNodeFontSize}px`;
                  foundCenterNode = true;
                } else if (textContent.trim().length > 0) {
                  el.style.fontSize = `${childNodeFontSize}px`;
                }
              });
            });

            // ノードのサイズを調整（foreignObjectの実際のサイズに基づいて）
            setTimeout(() => {
              const nodes = svgElement.querySelectorAll('.node');
              nodes.forEach((node) => {
                const rect = node.querySelector('rect');
                const fo = node.querySelector('foreignObject');
                if (rect && fo) {
                  // foreignObject内のdivの実際のサイズを取得
                  const div = fo.querySelector('div');
                  if (div) {
                    // 一時的に表示してサイズを測定
                    const tempDiv = div.cloneNode(true) as HTMLElement;
                    tempDiv.style.visibility = 'hidden';
                    tempDiv.style.position = 'absolute';
                    tempDiv.style.width = 'auto';
                    tempDiv.style.height = 'auto';
                    tempDiv.style.whiteSpace = 'nowrap';
                    document.body.appendChild(tempDiv);
                    
                    const contentWidth = tempDiv.scrollWidth;
                    const contentHeight = tempDiv.scrollHeight;
                    document.body.removeChild(tempDiv);

                    // パディングを考慮（上下左右8pxずつ）
                    const padding = 16;
                    const minWidth = contentWidth + padding;
                    const minHeight = contentHeight + padding;

                    const currentWidth = parseFloat(rect.getAttribute('width') || '0');
                    const currentHeight = parseFloat(rect.getAttribute('height') || '0');

                    // 現在のサイズより大きい場合は更新
                    if (minWidth > currentWidth) {
                      rect.setAttribute('width', minWidth.toString());
                      fo.setAttribute('width', minWidth.toString());
                    }
                    if (minHeight > currentHeight) {
                      rect.setAttribute('height', minHeight.toString());
                      fo.setAttribute('height', minHeight.toString());
                    }
                  }
                }
              });
            }, 100);

            // SVGのtext要素も処理（念のため）
            const textElements = svgElement.querySelectorAll('text');
            textElements.forEach((textEl, index) => {
              const textContent = textEl.textContent || '';

              if (!foundCenterNode && (textContent.includes('AIネイティブ設計') || index === 0)) {
                textEl.setAttribute('font-size', centerNodeFontSize.toString());
                (textEl as SVGTextElement).style.fontSize = `${centerNodeFontSize}px`;
                foundCenterNode = true;

                const tspanElements = textEl.querySelectorAll('tspan');
                tspanElements.forEach((tspanEl) => {
                  tspanEl.setAttribute('font-size', centerNodeFontSize.toString());
                  (tspanEl as SVGTSpanElement).style.fontSize = `${centerNodeFontSize}px`;
                });
              } else {
                textEl.setAttribute('font-size', childNodeFontSize.toString());
                (textEl as SVGTextElement).style.fontSize = `${childNodeFontSize}px`;

                const tspanElements = textEl.querySelectorAll('tspan');
                tspanElements.forEach((tspanEl) => {
                  tspanEl.setAttribute('font-size', childNodeFontSize.toString());
                  (tspanEl as SVGTSpanElement).style.fontSize = `${childNodeFontSize}px`;
                });
              }
            });

            renderedRef.current = true;
          }, 200);
        }
      } catch (err) {
        console.error('❌ [MermaidDiagram] Mermaidレンダリングエラー:', err);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div style="padding: 20px; color: #EF4444;">Mermaid図のレンダリングに失敗しました: ${err instanceof Error ? err.message : String(err)}</div>`;
        }
      }
    };

    renderDiagram();
  }, [mermaidLoaded, diagramCode, diagramId, centerNodeFontSize, childNodeFontSize]);

  return (
    <div
      ref={containerRef}
      className="mermaid-diagram-container"
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid var(--color-border-color)',
        marginBottom: '32px',
      }}
    />
  );
}

