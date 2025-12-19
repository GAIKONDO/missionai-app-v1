'use client';

import { useEffect, useRef, useState } from 'react';
import { encode } from 'plantuml-encoder';

interface PlantUMLDiagramProps {
  diagramCode: string;
  diagramId: string;
  format?: 'svg' | 'png'; // 出力形式（デフォルトはSVG）
  serverUrl?: string; // PlantUMLサーバーのURL（オフライン時のみ使用、デフォルトは公式サーバー）
  useOffline?: boolean; // オフライン実装を使用するか（デフォルト: Tauri環境を自動検出）
  onNodeClick?: (nodeId: string, event: MouseEvent) => void; // ノードクリック時のコールバック（組織IDを渡す）
  selectedNodeId?: string | null; // 選択されたノードのID（このノードを青く表示する）
  orgNameToIdMap?: Map<string, string>; // 組織名からIDへのマッピング（rect要素にIDを保存するために使用）
}

export default function PlantUMLDiagram({
  diagramCode,
  diagramId,
  format = 'svg',
  serverUrl = 'https://www.plantuml.com/plantuml',
  useOffline,
  onNodeClick,
  selectedNodeId,
  orgNameToIdMap,
}: PlantUMLDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const renderedRef = useRef(false);
  const previousDiagramCodeRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // PlantUML図のレンダリング
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!diagramCode || !diagramCode.trim()) {
      // コードが空の場合はクリア
      renderedRef.current = false;
      previousDiagramCodeRef.current = '';
      setSvgContent('');
      setImageUrl('');
      setError(null);
      return;
    }

    // diagramCodeが変更された場合は、renderedRefをリセットしてクリア
    if (previousDiagramCodeRef.current !== diagramCode) {
      renderedRef.current = false;
      previousDiagramCodeRef.current = diagramCode;
      setSvgContent('');
      setImageUrl('');
      setError(null);
    }

    if (renderedRef.current) return;

    const renderDiagram = async () => {
      // コンポーネントがアンマウントされている場合は処理を中断
      if (!isMountedRef.current || !containerRef.current) {
        return;
      }
      setLoading(true);
      setError(null);

      try {
        // Tauri環境かどうかを検出
        const isTauri = typeof window !== 'undefined' && 
                       (window as any).__TAURI__ !== undefined;
        const shouldUseOffline = useOffline !== undefined ? useOffline : isTauri;

        console.log('📊 [PlantUMLDiagram] レンダリング開始:', {
          diagramId,
          codeLength: diagramCode.length,
          codePreview: diagramCode.substring(0, 100),
          format,
          serverUrl,
          isTauri,
          shouldUseOffline,
        });

        // PlantUMLコードをクリーンアップ
        let cleanCode = diagramCode.trim();
        
        // 前後の空白行を削除
        cleanCode = cleanCode.replace(/^\s*\n+|\n+\s*$/g, '');

        let imageData: Uint8Array | string;

        if (shouldUseOffline && isTauri) {
          // Tauri環境: オフライン実装を使用
          console.log('🖥️ [PlantUMLDiagram] Tauriコマンドを使用（オフライン）');
          
          const { invoke } = await import('@tauri-apps/api/core');
          const imageBytes = await invoke<number[]>('render_plantuml', {
            code: cleanCode,
            format: format,
          });
          
          imageData = new Uint8Array(imageBytes);
          console.log('✅ [PlantUMLDiagram] Tauriコマンドから画像データを取得:', {
            dataLength: imageData.length,
          });
        } else {
          // ブラウザ環境: 外部サーバーを使用
          console.log('🌐 [PlantUMLDiagram] 外部サーバーを使用');
          
          // PlantUMLコードをエンコード
          const encoded = encode(cleanCode);
          console.log('✅ [PlantUMLDiagram] エンコード完了:', {
            encodedLength: encoded.length,
            encodedPreview: encoded.substring(0, 50),
          });

          // PlantUMLサーバーのURLを生成
          const imageUrl = `${serverUrl}/${format}/${encoded}`;
          console.log('📡 [PlantUMLDiagram] 画像URL生成:', imageUrl);
          imageData = imageUrl;
        }

        if (format === 'svg') {
          let svgText: string;
          
          if (shouldUseOffline && isTauri && imageData instanceof Uint8Array) {
            // Tauri環境: バイト配列からSVGテキストを取得
            if (imageData.length === 0) {
              throw new Error('PlantUMLから空のデータが返されました。Javaがインストールされているか、PlantUMLコードに問題がある可能性があります。');
            }
            
            const decoder = new TextDecoder('utf-8');
            svgText = decoder.decode(imageData);
            
            if (!svgText || svgText.trim().length === 0) {
              throw new Error('PlantUMLから空のSVGが返されました。PlantUMLコードに問題がある可能性があります。');
            }
            
            console.log('✅ [PlantUMLDiagram] SVGテキストをデコード:', {
              svgLength: svgText.length,
              svgPreview: svgText.substring(0, 200),
            });
          } else {
            // ブラウザ環境: fetchで取得
            const imageUrl = imageData as string;
            const response = await fetch(imageUrl, {
              method: 'GET',
              headers: {
                'Accept': 'image/svg+xml,text/plain,*/*',
              },
            });
            
            if (!response.ok) {
              const errorText = await response.text().catch(() => '');
              console.error('❌ [PlantUMLDiagram] HTTPエラー:', {
                status: response.status,
                statusText: response.statusText,
                errorText: errorText.substring(0, 500),
              });
              throw new Error(`PlantUMLサーバーからの応答エラー: ${response.status} ${response.statusText}${errorText ? `\n${errorText.substring(0, 200)}` : ''}`);
            }

            svgText = await response.text();
            console.log('✅ [PlantUMLDiagram] SVG取得完了:', {
              svgLength: svgText.length,
              svgPreview: svgText.substring(0, 500),
            });
          }

          // SVGがエラーメッセージを含む場合をチェック
          if (svgText.includes('Error') || 
              svgText.includes('error') || 
              svgText.includes('The object can not be found') ||
              svgText.includes('Syntax Error') ||
              svgText.includes('syntax error')) {
            // PlantUMLサーバーがエラーを返した場合、エラーメッセージを抽出
            let errorMessage = 'PlantUMLサーバーがエラーを返しました';
            
            // SVG内のエラーメッセージを抽出（複数のパターンを試す）
            const errorPatterns = [
              /<text[^>]*>([^<]*(?:Error|error|The object can not be found)[^<]*)<\/text>/i,
              /<text[^>]*x="[^"]*"[^>]*y="[^"]*"[^>]*>([^<]*(?:Error|error|The object can not be found)[^<]*)<\/text>/i,
              /(Error[^<]*|error[^<]*|The object can not be found[^<]*)/i,
            ];
            
            for (const pattern of errorPatterns) {
              const match = svgText.match(pattern);
              if (match && match[1]) {
                errorMessage = match[1].trim();
                break;
              }
            }
            
            // SVG全体からエラーメッセージを探す
            if (errorMessage === 'PlantUMLサーバーがエラーを返しました') {
              const textMatches = svgText.matchAll(/<text[^>]*>([^<]+)<\/text>/gi);
              for (const match of textMatches) {
                const text = match[1].trim();
                if (text && (text.includes('Error') || text.includes('error') || text.includes('not be found'))) {
                  errorMessage = text;
                  break;
                }
              }
            }
            
            console.error('❌ [PlantUMLDiagram] PlantUMLサーバーエラー:', {
              errorMessage,
              svgText: svgText.substring(0, 1000),
            });
            
            throw new Error(`PlantUMLエラー: ${errorMessage}`);
          }
          
          // SVGが有効かどうかをチェック（SVGタグが含まれているか）
          if (!svgText.includes('<svg') && !svgText.includes('<?xml')) {
            console.error('❌ [PlantUMLDiagram] 無効なSVGレスポンス:', {
              svgText: svgText.substring(0, 500),
            });
            throw new Error('PlantUMLサーバーから無効なレスポンスが返されました');
          }

          // SVGコンテンツをstateに設定（Reactのレンダリングサイクルに従う）
          if (isMountedRef.current) {
            setSvgContent(svgText);
            setImageUrl('');
            console.log('✅ [PlantUMLDiagram] SVGコンテンツを設定しました');
            
            // 既存のタイマーをクリア
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            
            timeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                renderedRef.current = true;
                setLoading(false);
              }
            }, 100);
          }
        } else {
          // PNGの場合は、URLをstateに設定
          if (isMountedRef.current) {
            if (shouldUseOffline && isTauri && imageData instanceof Uint8Array) {
              // Tauri環境: バイト配列からBlob URLを作成
              const blob = new Blob([imageData as BlobPart], { type: 'image/png' });
              const blobUrl = URL.createObjectURL(blob);
              setImageUrl(blobUrl);
              setSvgContent('');
              
              // クリーンアップ用のrefを保存（必要に応じて）
              setTimeout(() => {
                if (isMountedRef.current) {
                  renderedRef.current = true;
                  setLoading(false);
                }
              }, 100);
            } else {
              // ブラウザ環境: URLを使用
              setImageUrl(imageData as string);
              setSvgContent('');
              
              setTimeout(() => {
                if (isMountedRef.current) {
                  renderedRef.current = true;
                  setLoading(false);
                }
              }, 100);
            }
          }
        }
      } catch (err) {
        console.error('❌ [PlantUMLDiagram] レンダリングエラー:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        
        // エラーの詳細情報をログに出力
        console.error('❌ [PlantUMLDiagram] エラー詳細:', {
          error: err,
          errorMessage,
          diagramCode: diagramCode.substring(0, 200),
          diagramId,
          format,
          serverUrl,
          containerExists: !!containerRef.current,
        });
        
        // エラー時はコンテンツをクリア
        if (isMountedRef.current) {
          setSvgContent('');
          setImageUrl('');
        }
        
        if (isMountedRef.current) {
          setLoading(false);
        }
        renderedRef.current = false; // エラー時は再レンダリング可能にする
      }
    };

    renderDiagram();
    
    // クリーンアップ関数
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [diagramCode, diagramId, format, serverUrl]);

  // SVGにクリック選択効果を追加
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    // 選択効果を適用する関数
    function applyClickSelection() {
      const svgElement = containerRef.current?.querySelector('svg');
      if (!svgElement) {
        console.log('❌ [PlantUMLDiagram] SVG要素が見つかりません（applyClickSelection）');
        return;
      }

      // pointer-eventsを有効にする
      svgElement.style.pointerEvents = 'all';
      
      // SVG内のすべての要素を取得
      const rects = svgElement.querySelectorAll('rect');
      const texts = svgElement.querySelectorAll('text');

      // rect要素に組織IDをdata属性として保存（組織名からIDを逆引き）
      if (orgNameToIdMap) {
        rects.forEach((rect, index) => {
          const rectBox = rect.getBBox();
          // このrect内のすべてのtext要素を取得
          const allTexts = Array.from(texts);
          const textsInRect = allTexts.filter((t) => {
            const textBox = t.getBBox();
            return (
              textBox.x >= rectBox.x - 5 &&
              textBox.x + textBox.width <= rectBox.x + rectBox.width + 5 &&
              textBox.y >= rectBox.y - 5 &&
              textBox.y + textBox.height <= rectBox.y + rectBox.height + 5
            );
          });
          
          // すべてのtext要素の内容を結合（組織名を取得）
          const fullText = textsInRect
            .map((t) => t.textContent?.trim() || '')
            .join(' ')
            .trim();
          
          // 組織名からIDを取得
          const orgId = orgNameToIdMap.get(fullText);
          if (orgId) {
            rect.setAttribute('data-org-id', orgId);
            console.log('✅ [PlantUMLDiagram] rect要素にIDを保存:', { index, orgName: fullText, orgId });
          } else {
            // 省略された名前の場合も試す
            if (fullText.endsWith('...')) {
              const prefix = fullText.substring(0, fullText.length - 3);
              for (const [name, id] of orgNameToIdMap.entries()) {
                if (name.startsWith(prefix)) {
                  rect.setAttribute('data-org-id', id);
                  console.log('✅ [PlantUMLDiagram] rect要素にIDを保存（省略名）:', { index, orgName: fullText, orgId: id });
                  break;
                }
              }
            }
          }
        });
      }

      console.log('🔍 [PlantUMLDiagram] SVG要素の検出:', {
        rects: rects.length,
        texts: texts.length,
      });

      const cleanupFunctions: Array<() => void> = [];
      let selectedRect: SVGRectElement | null = null;
      let selectedText: SVGTextElement | null = null;

      // 各rectとtextのペアを見つけて、個別にクリック選択効果を適用
      rects.forEach((rect, index) => {
        // このrectに対応するtext要素を見つける（より正確な方法）
        let text: SVGTextElement | null = null;
        
        const rectParent = rect.parentElement;
        if (rectParent) {
          const rectBox = rect.getBBox();
          const rectCenterX = rectBox.x + rectBox.width / 2;
          const rectCenterY = rectBox.y + rectBox.height / 2;
          
          // すべてのtext要素を取得して、rectの中心に最も近いものを探す
          const allTexts = svgElement.querySelectorAll('text');
          let minDistance = Infinity;
          let closestText: SVGTextElement | null = null;
          
          for (let i = 0; i < allTexts.length; i++) {
            const textBox = allTexts[i].getBBox();
            const textCenterX = textBox.x + textBox.width / 2;
            const textCenterY = textBox.y + textBox.height / 2;
            
            // rectの中心とtextの中心の距離を計算
            const distance = Math.sqrt(
              Math.pow(textCenterX - rectCenterX, 2) + 
              Math.pow(textCenterY - rectCenterY, 2)
            );
            
            // rectの範囲内にあるtext要素を優先的に探す
            const isInsideRect = 
              textCenterX >= rectBox.x && 
              textCenterX <= rectBox.x + rectBox.width &&
              textCenterY >= rectBox.y && 
              textCenterY <= rectBox.y + rectBox.height;
            
            // rectの範囲内にあるtext要素で、距離が最小のものを選択
            if (isInsideRect && distance < minDistance) {
              minDistance = distance;
              closestText = allTexts[i] as SVGTextElement;
            }
          }
          
          // rectの範囲内にtextが見つからなかった場合、近いものを探す（フォールバック）
          if (!closestText) {
            for (let i = 0; i < allTexts.length; i++) {
              const textBox = allTexts[i].getBBox();
              const textCenterX = textBox.x + textBox.width / 2;
              const textCenterY = textBox.y + textBox.height / 2;
              
              const distance = Math.sqrt(
                Math.pow(textCenterX - rectCenterX, 2) + 
                Math.pow(textCenterY - rectCenterY, 2)
              );
              
              // rectのサイズを考慮した閾値（rectの対角線の長さの半分以内）
              const threshold = Math.sqrt(rectBox.width * rectBox.width + rectBox.height * rectBox.height) / 2;
              
              if (distance < threshold && distance < minDistance) {
                minDistance = distance;
                closestText = allTexts[i] as SVGTextElement;
              }
            }
          }
          
          text = closestText;
          
          // デバッグログ（開発環境のみ）
          if (process.env.NODE_ENV === 'development' && text) {
            console.log(`🔍 [PlantUMLDiagram] rect[${index}]とtextの対応:`, {
              rectIndex: index,
              textContent: text.textContent?.trim(),
              distance: minDistance,
              rectCenter: { x: rectCenterX, y: rectCenterY },
              textCenter: { x: text.getBBox().x + text.getBBox().width / 2, y: text.getBBox().y + text.getBBox().height / 2 },
            });
          }
        }
        
        // 元のスタイルを保存
        const originalStrokeWidth = rect.getAttribute('stroke-width') || '1';
        rect.setAttribute('data-original-stroke-width', originalStrokeWidth);
        const originalFill = rect.getAttribute('fill') || '';
        rect.setAttribute('data-original-fill', originalFill);
        const originalStroke = rect.getAttribute('stroke') || '';
        rect.setAttribute('data-original-stroke', originalStroke);
        rect.style.pointerEvents = 'all';
        rect.style.cursor = 'pointer';
        
        if (text) {
          const originalFill = text.getAttribute('fill') || '';
          text.setAttribute('data-original-fill', originalFill);
          text.style.pointerEvents = 'all';
          text.style.cursor = 'pointer';
        }

        // rect要素から組織IDを取得する関数（data属性から取得）
        const extractNodeId = (rectElement: SVGRectElement): string => {
          // data属性からIDを取得
          const orgId = rectElement.getAttribute('data-org-id');
          if (orgId) {
            return orgId;
          }
          
          // data属性がない場合、組織名からIDを逆引き
          if (orgNameToIdMap) {
            const rectBox = rectElement.getBBox();
            const allTexts = Array.from(svgElement.querySelectorAll('text'));
            const textsInRect = allTexts.filter((t) => {
              const textBox = t.getBBox();
              return (
                textBox.x >= rectBox.x - 5 &&
                textBox.x + textBox.width <= rectBox.x + rectBox.width + 5 &&
                textBox.y >= rectBox.y - 5 &&
                textBox.y + textBox.height <= rectBox.y + rectBox.height + 5
              );
            });
            
            const fullText = textsInRect
              .map((t) => t.textContent?.trim() || '')
              .join(' ')
              .trim();
            
            const id = orgNameToIdMap.get(fullText);
            if (id) {
              return id;
            }
            
            // 省略された名前の場合も試す
            if (fullText.endsWith('...')) {
              const prefix = fullText.substring(0, fullText.length - 3);
              for (const [name, mapId] of orgNameToIdMap.entries()) {
                if (name.startsWith(prefix)) {
                  return mapId;
                }
              }
            }
          }
          
          return '';
        };

        // rectにクリック効果を適用
        const handleRectClick = (e: Event) => {
          e.stopPropagation();
          console.log('🖱️ [PlantUMLDiagram] rectクリック:', { index });
          
          // 前の選択を解除（元のスタイルを復元）
          if (selectedRect && selectedRect !== rect) {
            const prevOriginalFill = selectedRect.getAttribute('data-original-fill');
            const prevOriginalStroke = selectedRect.getAttribute('data-original-stroke');
            const prevOriginalStrokeWidth = selectedRect.getAttribute('data-original-stroke-width');
            
            // 元のスタイルが保存されている場合のみ復元
            if (prevOriginalFill !== null) {
              selectedRect.setAttribute('fill', prevOriginalFill);
            }
            if (prevOriginalStroke !== null) {
              selectedRect.setAttribute('stroke', prevOriginalStroke);
            }
            if (prevOriginalStrokeWidth !== null) {
              selectedRect.setAttribute('stroke-width', prevOriginalStrokeWidth);
            }
          }
          if (selectedText && selectedText !== text) {
            const prevOriginalFill = selectedText.getAttribute('data-original-fill');
            if (prevOriginalFill !== null) {
              selectedText.setAttribute('fill', prevOriginalFill);
            }
          }
          
          // 同じノードがクリックされた場合は選択解除
          if (selectedRect === rect) {
            // 元のスタイルを復元
            rect.setAttribute('fill', originalFill);
            if (originalStroke) {
              rect.setAttribute('stroke', originalStroke);
            }
            rect.setAttribute('stroke-width', originalStrokeWidth);
            if (text) {
              const textOriginalFill = text.getAttribute('data-original-fill');
              if (textOriginalFill !== null) {
                text.setAttribute('fill', textOriginalFill);
              }
            }
            selectedRect = null;
            selectedText = null;
            return;
          }
          
          // 新しいノードを選択する前に、元のスタイルを再保存（念のため）
          // 既に選択済みのノードが再度選択される場合に備える
          if (!rect.hasAttribute('data-original-fill') || rect.getAttribute('data-original-fill') === '#1976D2') {
            // 現在のfillが選択色の場合は、元の色を再取得
            const currentFill = rect.getAttribute('fill');
            if (currentFill && currentFill !== '#1976D2') {
              rect.setAttribute('data-original-fill', currentFill);
            } else {
              rect.setAttribute('data-original-fill', originalFill);
            }
          }
          
          // 新しいノードを選択
          selectedRect = rect;
          selectedText = text;
          
          // 選択状態のスタイルを適用（濃い青系統の背景色）
          rect.setAttribute('stroke', '#1976D2'); // 濃い青の枠線
          rect.setAttribute('stroke-width', String(parseFloat(originalStrokeWidth) + 3));
          
          // 背景色を濃い青系統に変更
          rect.setAttribute('fill', '#1976D2'); // 濃い青の背景
          
          // textの色を白に変更（濃い青背景の上で見やすくするため）
          // rect内のすべてのtext要素を白にする
          const rectBox = rect.getBBox();
          const allTexts = Array.from(svgElement.querySelectorAll('text'));
          allTexts.forEach((t) => {
            const textBox = t.getBBox();
            const isInRect = (
              textBox.x >= rectBox.x - 5 &&
              textBox.x + textBox.width <= rectBox.x + rectBox.width + 5 &&
              textBox.y >= rectBox.y - 5 &&
              textBox.y + textBox.height <= rectBox.y + rectBox.height + 5
            );
            if (isInRect) {
              if (!t.hasAttribute('data-original-fill') || t.getAttribute('data-original-fill') === '#FFFFFF') {
                const currentTextFill = t.getAttribute('fill');
                if (currentTextFill && currentTextFill !== '#FFFFFF') {
                  t.setAttribute('data-original-fill', currentTextFill);
                }
              }
              t.setAttribute('fill', '#FFFFFF'); // 白のテキスト
            }
          });
          
          // onNodeClickコールバックを呼び出す（組織IDを渡す）
          if (onNodeClick) {
            const nodeId = extractNodeId(rect);
            console.log('🔗 [PlantUMLDiagram] onNodeClick呼び出し:', { nodeId, hasOnNodeClick: !!onNodeClick });
            if (nodeId) {
              onNodeClick(nodeId, e as MouseEvent);
            } else {
              console.warn('⚠️ [PlantUMLDiagram] nodeIdが空です');
            }
          } else {
            console.warn('⚠️ [PlantUMLDiagram] onNodeClickがありません');
          }
        };

        rect.addEventListener('click', handleRectClick);

        cleanupFunctions.push(() => {
          rect.removeEventListener('click', handleRectClick);
        });
      });
      
      // text要素にもクリック効果を適用（rectが見つからなかった場合のフォールバック）
      texts.forEach((text) => {
        if (text.hasAttribute('data-click-applied')) return;
        
        text.setAttribute('data-click-applied', 'true');
        const originalFill = text.getAttribute('fill') || '';
        text.setAttribute('data-original-fill', originalFill);
        text.style.pointerEvents = 'all';
        text.style.cursor = 'pointer';

        const handleTextClick = (e: Event) => {
          e.stopPropagation();
          // 対応するrectを探す（より正確な方法）
          const textBox = text.getBBox();
          const textCenterX = textBox.x + textBox.width / 2;
          const textCenterY = textBox.y + textBox.height / 2;
          
          const allRects = svgElement.querySelectorAll('rect');
          let minDistance = Infinity;
          let closestRect: SVGRectElement | null = null;
          
          for (let i = 0; i < allRects.length; i++) {
            const rectBox = allRects[i].getBBox();
            const rectCenterX = rectBox.x + rectBox.width / 2;
            const rectCenterY = rectBox.y + rectBox.height / 2;
            
            // textの中心とrectの中心の距離を計算
            const distance = Math.sqrt(
              Math.pow(textCenterX - rectCenterX, 2) + 
              Math.pow(textCenterY - rectCenterY, 2)
            );
            
            // textがrectの範囲内にある場合を優先
            const isInsideRect = 
              textCenterX >= rectBox.x && 
              textCenterX <= rectBox.x + rectBox.width &&
              textCenterY >= rectBox.y && 
              textCenterY <= rectBox.y + rectBox.height;
            
            if (isInsideRect && distance < minDistance) {
              minDistance = distance;
              closestRect = allRects[i] as SVGRectElement;
            }
          }
          
          // rectの範囲内にtextが見つからなかった場合、近いものを探す
          if (!closestRect) {
            for (let i = 0; i < allRects.length; i++) {
              const rectBox = allRects[i].getBBox();
              const rectCenterX = rectBox.x + rectBox.width / 2;
              const rectCenterY = rectBox.y + rectBox.height / 2;
              
              const distance = Math.sqrt(
                Math.pow(textCenterX - rectCenterX, 2) + 
                Math.pow(textCenterY - rectCenterY, 2)
              );
              
              const threshold = Math.sqrt(rectBox.width * rectBox.width + rectBox.height * rectBox.height) / 2;
              
              if (distance < threshold && distance < minDistance) {
                minDistance = distance;
                closestRect = allRects[i] as SVGRectElement;
              }
            }
          }
          
          if (closestRect) {
            closestRect.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        };

        text.addEventListener('click', handleTextClick);

        cleanupFunctions.push(() => {
          text.removeEventListener('click', handleTextClick);
        });
      });
      
      console.log(`✅ [PlantUMLDiagram] ${rects.length}個のrectと${texts.length}個のtextにクリック選択効果を追加しました`);

      // クリーンアップ関数を保存
      (svgElement as any).__cleanupFunctions = cleanupFunctions;
    }

    // SVGが完全にレンダリングされるまで待つ
    const checkAndApplySelection = () => {
      const svgElement = containerRef.current?.querySelector('svg');
      if (!svgElement) {
        console.log('⏳ [PlantUMLDiagram] SVG要素を待機中...');
        return false;
      }
      
      console.log('✅ [PlantUMLDiagram] SVG要素が見つかりました');
      return true;
    };

    // まず即座にチェック
    if (!checkAndApplySelection()) {
      // 見つからない場合は、MutationObserverで監視
      const observer = new MutationObserver((mutations, obs) => {
        if (checkAndApplySelection()) {
          obs.disconnect();
          applyClickSelection();
        }
      });

      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
      });

      // タイムアウトも設定（フォールバック）
      const timeoutId = setTimeout(() => {
        observer.disconnect();
        if (checkAndApplySelection()) {
          applyClickSelection();
        }
      }, 1000);

      return () => {
        observer.disconnect();
        clearTimeout(timeoutId);
        const svgElement = containerRef.current?.querySelector('svg');
        if (svgElement && (svgElement as any).__cleanupFunctions) {
          (svgElement as any).__cleanupFunctions.forEach((cleanup: () => void) => cleanup());
          (svgElement as any).__cleanupFunctions = [];
        }
      };
    } else {
      // 見つかった場合は即座に適用
      applyClickSelection();
    }

    // クリーンアップ関数を返す
    return () => {
      const svgElement = containerRef.current?.querySelector('svg');
      if (svgElement && (svgElement as any).__cleanupFunctions) {
        (svgElement as any).__cleanupFunctions.forEach((cleanup: () => void) => cleanup());
        (svgElement as any).__cleanupFunctions = [];
      }
    };
  }, [svgContent, onNodeClick, orgNameToIdMap]);

  // selectedNodeIdが変更されたときに、該当するノードを青くする
  useEffect(() => {
    if (!selectedNodeId || !svgContent || !containerRef.current) {
      // selectedNodeIdがnullの場合は、すべての選択を解除
      const svgElement = containerRef.current?.querySelector('svg');
      if (svgElement) {
        const rects = svgElement.querySelectorAll('rect');
        const texts = svgElement.querySelectorAll('text');
        
        rects.forEach((rect) => {
          const originalFill = rect.getAttribute('data-original-fill');
          const originalStroke = rect.getAttribute('data-original-stroke');
          const originalStrokeWidth = rect.getAttribute('data-original-stroke-width');
          
          if (originalFill !== null && originalFill !== '#1976D2') {
            rect.setAttribute('fill', originalFill);
          }
          if (originalStroke !== null) {
            rect.setAttribute('stroke', originalStroke);
          }
          if (originalStrokeWidth !== null) {
            rect.setAttribute('stroke-width', originalStrokeWidth);
          }
        });
        
        texts.forEach((text) => {
          const originalFill = text.getAttribute('data-original-fill');
          if (originalFill !== null && originalFill !== '#FFFFFF') {
            text.setAttribute('fill', originalFill);
          }
        });
      }
      return;
    }

    const svgElement = containerRef.current?.querySelector('svg');
    if (!svgElement) return;

    // すべてのrectとtextを取得
    const rects = svgElement.querySelectorAll('rect');
    const texts = svgElement.querySelectorAll('text');


    // まず、すべての選択を解除
    rects.forEach((rect) => {
      const originalFill = rect.getAttribute('data-original-fill');
      const originalStroke = rect.getAttribute('data-original-stroke');
      const originalStrokeWidth = rect.getAttribute('data-original-stroke-width');
      
      if (originalFill !== null && originalFill !== '#1976D2') {
        rect.setAttribute('fill', originalFill);
      }
      if (originalStroke !== null) {
        rect.setAttribute('stroke', originalStroke);
      }
      if (originalStrokeWidth !== null) {
        rect.setAttribute('stroke-width', originalStrokeWidth);
      }
    });
    
    texts.forEach((text) => {
      const originalFill = text.getAttribute('data-original-fill');
      if (originalFill !== null && originalFill !== '#FFFFFF') {
        text.setAttribute('fill', originalFill);
      }
    });

    // selectedNodeIdに一致するノードを探す（data属性からIDを取得）
    let targetRect: SVGRectElement | null = null;
    let targetTexts: SVGTextElement[] = [];

    // 各rectについて、data属性からIDを取得して比較
    rects.forEach((rect) => {
      const rectOrgId = rect.getAttribute('data-org-id');
      
      // IDが一致するか確認（完全一致、部分一致、省略されたIDなど）
      const isMatch = rectOrgId === selectedNodeId ||
        (rectOrgId && rectOrgId.endsWith('...') && selectedNodeId.startsWith(rectOrgId.substring(0, rectOrgId.length - 3))) ||
        (selectedNodeId.endsWith('...') && rectOrgId && rectOrgId.startsWith(selectedNodeId.substring(0, selectedNodeId.length - 3))) ||
        (rectOrgId && (rectOrgId.includes(selectedNodeId) || selectedNodeId.includes(rectOrgId)));
      
      if (isMatch && rectOrgId) {
        targetRect = rect;
        
        // このrect内のすべてのtext要素を取得
        const rectBox = rect.getBBox();
        targetTexts = Array.from(texts).filter((text) => {
          const textBox = text.getBBox();
          return (
            textBox.x >= rectBox.x - 5 &&
            textBox.x + textBox.width <= rectBox.x + rectBox.width + 5 &&
            textBox.y >= rectBox.y - 5 &&
            textBox.y + textBox.height <= rectBox.y + rectBox.height + 5
          );
        });
      }
    });

    // 見つかったノードを青くする
    if (targetRect && targetTexts.length > 0) {
      // 元のスタイルを保存（まだ保存されていない場合）
      if (!targetRect.hasAttribute('data-original-fill')) {
        const originalFill = targetRect.getAttribute('fill') || '';
        const originalStroke = targetRect.getAttribute('stroke') || '';
        const originalStrokeWidth = targetRect.getAttribute('stroke-width') || '1';
        targetRect.setAttribute('data-original-fill', originalFill);
        targetRect.setAttribute('data-original-stroke', originalStroke);
        targetRect.setAttribute('data-original-stroke-width', originalStrokeWidth);
      }
      
      // すべてのtext要素の元のスタイルを保存
      targetTexts.forEach((text) => {
        if (!text.hasAttribute('data-original-fill')) {
          const originalFill = text.getAttribute('fill') || '';
          text.setAttribute('data-original-fill', originalFill);
        }
      });

      // 選択状態のスタイルを適用
      targetRect.setAttribute('stroke', '#1976D2');
      targetRect.setAttribute('stroke-width', String(parseFloat(targetRect.getAttribute('data-original-stroke-width') || '1') + 3));
      targetRect.setAttribute('fill', '#1976D2');
      
      // すべてのtext要素を白にする
      targetTexts.forEach((text) => {
        text.setAttribute('fill', '#FFFFFF');
      });
      
      console.log('✅ [PlantUMLDiagram] ノードを選択状態にしました:', selectedNodeId);
    } else {
      console.warn('⚠️ [PlantUMLDiagram] 選択されたノードが見つかりませんでした:', selectedNodeId);
    }
  }, [selectedNodeId, svgContent]);

  return (
    <div
      ref={containerRef}
      className="plantuml-diagram-container"
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid var(--color-border-color)',
        marginBottom: '32px',
        minHeight: loading ? '200px' : 'auto',
        display: 'flex',
        alignItems: loading ? 'center' : 'flex-start',
        justifyContent: loading ? 'center' : 'flex-start',
      }}
    >
      {loading && !error && (
        <div style={{
          color: '#6B7280',
          fontSize: '14px',
          textAlign: 'center',
        }}>
          読み込み中...
        </div>
      )}
      
      {error && (
        <div style={{
          padding: '20px',
          color: '#EF4444',
          border: '1px solid #EF4444',
          borderRadius: '6px',
          backgroundColor: '#FEE2E2',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            PlantUML図のレンダリングに失敗しました
          </div>
          <div style={{ fontSize: '14px', marginBottom: '12px', wordBreak: 'break-word' }}>
            {error}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #FCA5A5' }}>
            <div style={{ marginBottom: '4px' }}><strong>対処法:</strong></div>
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              <li>PlantUMLコードの構文を確認してください</li>
              <li>@startuml と @enduml が正しく記述されているか確認してください</li>
              <li>ブラウザのコンソール（F12）で詳細なエラー情報を確認してください</li>
            </ul>
          </div>
        </div>
      )}
      
      {!loading && !error && svgContent && (
        <div
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{
            width: '100%',
            maxWidth: '100%',
          }}
        />
      )}
      
      {!loading && !error && imageUrl && (
        <img
          src={imageUrl}
          alt="PlantUML Diagram"
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
          }}
          onLoad={() => {
            if (isMountedRef.current) {
              renderedRef.current = true;
              setLoading(false);
            }
          }}
          onError={() => {
            if (isMountedRef.current) {
              setError('PlantUML図の読み込みに失敗しました');
              setLoading(false);
            }
          }}
        />
      )}
    </div>
  );
}
