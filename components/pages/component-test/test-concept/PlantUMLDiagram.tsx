'use client';

import { useEffect, useRef, useState } from 'react';
import { encode } from 'plantuml-encoder';

interface PlantUMLDiagramProps {
  diagramCode: string;
  diagramId: string;
  format?: 'svg' | 'png'; // 出力形式（デフォルトはSVG）
  serverUrl?: string; // PlantUMLサーバーのURL（オフライン時のみ使用、デフォルトは公式サーバー）
  useOffline?: boolean; // オフライン実装を使用するか（デフォルト: Tauri環境を自動検出）
}

export default function PlantUMLDiagram({
  diagramCode,
  diagramId,
  format = 'svg',
  serverUrl = 'https://www.plantuml.com/plantuml',
  useOffline,
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
