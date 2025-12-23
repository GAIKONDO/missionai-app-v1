'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: any) => void;
      run: (options: { nodes: HTMLElement[] }) => Promise<void>;
    };
  }
}

export function ZoomableMermaidDiagram({ 
  mermaidCode, 
  diagramId 
}: { 
  mermaidCode: string; 
  diagramId: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentDivRef = useRef<HTMLDivElement>(null);
  const mermaidContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const translateRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const isDraggingRef = useRef(false);
  const mermaidRenderedRef = useRef(false);
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenMermaidContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenScrollContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenContentDivRef = useRef<HTMLDivElement>(null);
  const [fullscreenZoom, setFullscreenZoom] = useState(3); // デフォルト300%（通常表示とは独立）

  // 最新の値をrefに同期
  useEffect(() => {
    translateRef.current = { x: translateX, y: translateY };
  }, [translateX, translateY]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const handleZoomIn = () => {
    if (isFullscreen) {
      // 全画面表示時はfullscreenZoomを独立して更新（最大1000%）
      setFullscreenZoom(prev => Math.min(prev + 0.1, 10));
    } else {
      setZoom(prev => Math.min(prev + 0.1, 3));
    }
  };

  const handleZoomOut = () => {
    if (isFullscreen) {
      // 全画面表示時はfullscreenZoomを独立して更新
      setFullscreenZoom(prev => Math.max(prev - 0.1, 0.5));
    } else {
      setZoom(prev => Math.max(prev - 0.1, 0.5));
    }
  };

  const handleReset = () => {
    if (isFullscreen) {
      // 全画面表示時は300%にリセット
      setFullscreenZoom(3);
    } else {
      setZoom(1);
    }
    setTranslateX(0);
    setTranslateY(0);
  };

  const handleFullscreen = () => {
    // 全画面表示を開く（ズームは独立して管理）
    setIsFullscreen(true);
  };

  const handleExitFullscreen = () => {
    setIsFullscreen(false);
    // 全画面表示を閉じた時に、元のズームレベルに戻す
    // fullscreenZoomは次回全画面表示時に再計算される
  };

  // ESCキーで全画面表示を閉じる
  useEffect(() => {
    if (!isFullscreen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleExitFullscreen();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isFullscreen]);

  // isDraggingの状態をrefに同期
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // 全画面表示時のカーソル更新
  useEffect(() => {
    if (!isFullscreen) return;
    const scrollContainer = fullscreenScrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.style.cursor = fullscreenZoom > 1 ? 'grab' : 'default';
    }
  }, [isFullscreen, fullscreenZoom]);

  // 全画面表示時のドラッグ処理
  useEffect(() => {
    if (!isFullscreen) return;

    const scrollContainer = fullscreenScrollContainerRef.current;
    if (!scrollContainer) return;

    let animationFrameId: number | null = null;

    const handleMouseDown = (e: MouseEvent) => {
      if (fullscreenZoom > 1) {
        isDraggingRef.current = true;
        setIsDragging(true);
        dragStartRef.current = {
          x: e.clientX - translateRef.current.x,
          y: e.clientY - translateRef.current.y,
        };
        scrollContainer.style.cursor = 'grabbing';
        scrollContainer.style.userSelect = 'none';
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current && fullscreenZoom > 1) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(() => {
          const contentDiv = fullscreenContentDivRef.current;
          if (!contentDiv) return;
          
          const newX = e.clientX - dragStartRef.current.x;
          const newY = e.clientY - dragStartRef.current.y;
          translateRef.current = { x: newX, y: newY };
          setTranslateX(newX);
          setTranslateY(newY);
          contentDiv.style.transform = `scale(${fullscreenZoom}) translate(${newX}px, ${newY}px)`;
          contentDiv.style.transition = 'none';
        });
        e.preventDefault();
      }
    };

    const handleMouseUp = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      isDraggingRef.current = false;
      setIsDragging(false);
      if (scrollContainer) {
        scrollContainer.style.cursor = fullscreenZoom > 1 ? 'grab' : 'default';
      }
      const contentDiv = fullscreenContentDivRef.current;
      if (contentDiv) {
        contentDiv.style.transition = 'transform 0.1s ease';
      }
    };

    scrollContainer.addEventListener('mousedown', handleMouseDown, { capture: true });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      scrollContainer.removeEventListener('mousedown', handleMouseDown, { capture: true });
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isFullscreen, fullscreenZoom]);

  // マウスドラッグ処理（isInViewportがtrueになってから実行）
  useEffect(() => {
    if (!isInViewport) {
      console.log('[ZoomableMermaidDiagram] Not in viewport, skipping drag setup');
      return;
    }

    const wrapper = wrapperRef.current;
    if (!wrapper) {
      console.log('[ZoomableMermaidDiagram] wrapper not found, will retry when in viewport');
      return;
    }

    console.log('[ZoomableMermaidDiagram] Setting up drag handlers', { zoom: zoomRef.current });

    let animationFrameId: number | null = null;

    const handleMouseDown = (e: MouseEvent) => {
      console.log('[ZoomableMermaidDiagram] handleMouseDown called', {
        zoom: zoomRef.current,
        target: (e.target as HTMLElement)?.tagName,
        currentTarget: (e.currentTarget as HTMLElement)?.tagName,
      });
      
      // ズームが1より大きい場合のみドラッグを有効化
      if (zoomRef.current > 1) {
        console.log('[ZoomableMermaidDiagram] Starting drag');
        isDraggingRef.current = true;
        setIsDragging(true);
        dragStartRef.current = {
          x: e.clientX - translateRef.current.x,
          y: e.clientY - translateRef.current.y,
        };
        wrapper.style.cursor = 'grabbing';
        wrapper.style.userSelect = 'none';
        e.preventDefault();
        e.stopPropagation();
        return false;
      } else {
        console.log('[ZoomableMermaidDiagram] Zoom is 1 or less, drag disabled', {
          zoomRef: zoomRef.current,
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current && zoomRef.current > 1) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(() => {
          const contentDiv = contentDivRef.current;
          if (!contentDiv) return;
          
          const newX = e.clientX - dragStartRef.current.x;
          const newY = e.clientY - dragStartRef.current.y;
          translateRef.current = { x: newX, y: newY };
          setTranslateX(newX);
          setTranslateY(newY);
          // DOMのスタイルも直接更新して即座に反映
          contentDiv.style.transform = `scale(${zoomRef.current}) translate(${newX}px, ${newY}px)`;
          contentDiv.style.transition = 'none';
        });
        e.preventDefault();
      }
    };

    const handleMouseUp = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      isDraggingRef.current = false;
      setIsDragging(false);
      if (wrapper) {
        wrapper.style.cursor = zoomRef.current > 1 ? 'grab' : 'default';
      }
      const contentDiv = contentDivRef.current;
      if (contentDiv) {
        contentDiv.style.transition = 'transform 0.1s ease';
      }
    };

    // capture phaseでイベントをキャプチャ（子要素より先に処理）
    wrapper.addEventListener('mousedown', handleMouseDown, { capture: true });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      wrapper.removeEventListener('mousedown', handleMouseDown, { capture: true });
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isInViewport]);

  // ズーム変更時にカーソルを更新
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapper.style.cursor = zoom > 1 ? 'grab' : 'default';
      console.log('[ZoomableMermaidDiagram] Zoom changed', { zoom, zoomRef: zoomRef.current });
    }
  }, [zoom]);

  // マウスホイールズーム（通常表示）
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isFullscreen) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isFullscreen]);

  // マウスホイールズーム（全画面表示）
  useEffect(() => {
    if (!isFullscreen || !fullscreenContainerRef.current) return;

    const container = fullscreenContainerRef.current;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        // 全画面表示時のズームは独立して管理（最大1000%）
        setFullscreenZoom(prev => Math.max(0.5, Math.min(10, prev + delta)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isFullscreen, fullscreenZoom]);

  // Intersection Observerでビューポートに入ったかチェック
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInViewport(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Mermaid.jsの読み込み
  useEffect(() => {
    if (window.mermaid) {
      setMermaidLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    script.async = true;
    script.onload = () => {
      if (window.mermaid) {
        window.mermaid.initialize({ 
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });
        setMermaidLoaded(true);
      }
    };
    document.head.appendChild(script);

    return () => {
      // クリーンアップはしない（他のページでも使用する可能性があるため）
    };
  }, []);

  // mermaidCodeの前回の値をrefで保持（無限ループを防ぐため）
  const previousMermaidCodeRef = useRef<string>('');

  // Mermaid図のレンダリング（このコンポーネント内で管理）
  useEffect(() => {
    if (!mermaidLoaded || !mermaidContainerRef.current || !isInViewport) return;

    // mermaidCodeが実際に変更された場合のみ処理を実行
    if (previousMermaidCodeRef.current === mermaidCode && mermaidRenderedRef.current) {
      return;
    }

    // mermaidCodeが変更された場合は、レンダリング済みフラグをリセット
    if (previousMermaidCodeRef.current !== mermaidCode) {
      const svg = mermaidContainerRef.current.querySelector('svg');
      if (svg) {
        svg.remove();
      }
      mermaidRenderedRef.current = false;
      previousMermaidCodeRef.current = mermaidCode;
    }

    if (mermaidRenderedRef.current) return;

    // レンダリング中フラグを設定（重複実行を防ぐ）
    if (mermaidContainerRef.current.dataset.rendering === 'true') {
      return;
    }
    mermaidContainerRef.current.dataset.rendering = 'true';

    const renderDiagram = async () => {
      try {
        // Mermaidが利用可能になるまで待つ
        let retries = 0;
        const maxRetries = 50;
        while (retries < maxRetries && (!window.mermaid || typeof window.mermaid.run !== 'function')) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        const mermaid = window.mermaid;
        if (!mermaid || typeof mermaid.run !== 'function') {
          console.warn('Mermaidが利用できません');
          return;
        }

        // コンテナがまだ存在することを確認
        if (!mermaidContainerRef.current) {
          return;
        }

        // 既にSVGが生成されている場合はスキップ
        if (mermaidContainerRef.current.querySelector('svg')) {
          mermaidRenderedRef.current = true;
          return;
        }

        // Mermaid図をレンダリング（このコンテナのみ）
        await mermaid.run({
          nodes: [mermaidContainerRef.current],
        });
        
        mermaidRenderedRef.current = true;
      } catch (error) {
        console.error('Mermaid図のレンダリングエラー:', error);
        mermaidRenderedRef.current = false;
      } finally {
        // レンダリング中フラグを解除
        if (mermaidContainerRef.current) {
          mermaidContainerRef.current.dataset.rendering = 'false';
        }
      }
    };

    renderDiagram();
  }, [isInViewport, mermaidLoaded, mermaidCode, diagramId]);

  // 全画面表示時のズームは独立して管理（通常表示のズームとは無関係）

  // 全画面表示時のMermaid図のレンダリング
  useEffect(() => {
    if (!isFullscreen || !mermaidLoaded || !fullscreenMermaidContainerRef.current) return;

    const renderFullscreenDiagram = async () => {
      try {
        const mermaid = window.mermaid;
        if (!mermaid || typeof mermaid.run !== 'function') {
          console.warn('Mermaidが利用できません（全画面表示）');
          return;
        }

        // コンテナがまだ存在することを確認
        if (!fullscreenMermaidContainerRef.current) {
          return;
        }

        // 既にSVGが生成されている場合はスキップ
        if (fullscreenMermaidContainerRef.current.querySelector('svg')) {
          return;
        }

        // レンダリング中フラグを設定
        if (fullscreenMermaidContainerRef.current.dataset.rendering === 'true') {
          return;
        }
        fullscreenMermaidContainerRef.current.dataset.rendering = 'true';

        // Mermaid図をレンダリング
        await mermaid.run({
          nodes: [fullscreenMermaidContainerRef.current],
        });
      } catch (error) {
        console.error('Mermaid図のレンダリングエラー（全画面表示）:', error);
      } finally {
        // レンダリング中フラグを解除
        if (fullscreenMermaidContainerRef.current) {
          fullscreenMermaidContainerRef.current.dataset.rendering = 'false';
        }
      }
    };

    // 少し遅延させてからレンダリング（DOMが確実に存在するように）
    const timer = setTimeout(() => {
      renderFullscreenDiagram();
    }, 100);

    return () => {
      clearTimeout(timer);
      // 全画面表示を閉じる際にSVGを削除
      if (fullscreenMermaidContainerRef.current) {
        const svg = fullscreenMermaidContainerRef.current.querySelector('svg');
        if (svg) {
          svg.remove();
        }
      }
    };
  }, [isFullscreen, mermaidLoaded, mermaidCode, diagramId]);

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      {!isInViewport && (
        <div style={{ 
          minHeight: '400px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'var(--color-background)',
          borderRadius: '8px',
          border: '1px solid var(--color-border-color)',
          color: 'var(--color-text-secondary)',
          fontSize: '14px'
        }}>
          読み込み中...
        </div>
      )}
      {isInViewport && (
        <>
          <div
            ref={wrapperRef}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '8px',
              minHeight: '200px',
              backgroundColor: '#f5f5f5',
              cursor: zoom > 1 ? 'grab' : 'default',
            }}
          >
            <div
              ref={contentDivRef}
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                transform: `scale(${zoom}) translate(${translateX}px, ${translateY}px)`,
                transformOrigin: 'top left',
                transition: isDragging ? 'none' : 'transform 0.1s ease',
                minHeight: '200px',
                userSelect: 'none',
              }}
            >
              <div 
                ref={mermaidContainerRef}
                className="mermaid" 
                data-diagram-id={diagramId}
              >
                {mermaidCode}
              </div>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              display: 'flex',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '8px',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              zIndex: 10,
            }}
          >
            <button
              onClick={handleZoomOut}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              −
            </button>
            <span
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                minWidth: '60px',
                justifyContent: 'center',
              }}
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              +
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                marginLeft: '4px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              リセット
            </button>
            <button
              onClick={handleFullscreen}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '4px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
              title="全画面表示"
            >
              <FiMaximize2 size={16} />
            </button>
          </div>
          <div
            style={{
              marginTop: '8px',
              fontSize: '12px',
              color: 'var(--color-text-light)',
              fontStyle: 'italic',
            }}
          >
            💡 Ctrl/Cmd + マウスホイールでズーム、拡大後はドラッグで移動できます
          </div>
        </>
      )}

      {/* 全画面表示モーダル */}
      {isFullscreen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
          }}
          onClick={handleExitFullscreen}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#fff' }}>
              Mermaid図 - 全画面表示
            </h3>
            <button
              onClick={handleExitFullscreen}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#fff',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <FiMinimize2 size={16} />
              <span>閉じる (ESC)</span>
            </button>
          </div>
          <div
            ref={fullscreenContainerRef}
            style={{
              flex: 1,
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={fullscreenScrollContainerRef}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'auto',
                cursor: fullscreenZoom > 1 ? 'grab' : 'default',
              }}
            >
              <div
                ref={fullscreenContentDivRef}
                style={{
                  backgroundColor: 'white',
                  padding: '40px',
                  borderRadius: '8px',
                  transform: `scale(${fullscreenZoom}) translate(${translateX}px, ${translateY}px)`,
                  transformOrigin: 'top left',
                  transition: isDragging ? 'none' : 'transform 0.1s ease',
                  minHeight: '200px',
                  userSelect: 'none',
                  display: 'inline-block',
                }}
              >
                <div 
                  ref={fullscreenMermaidContainerRef}
                  className="mermaid" 
                  data-diagram-id={`${diagramId}-fullscreen`}
                >
                  {mermaidCode}
                </div>
              </div>
            </div>
            {/* 全画面表示時のコントロール */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'flex',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: '8px',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 10,
              }}
            >
              <button
                onClick={handleZoomOut}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                −
              </button>
              <span
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: '60px',
                  justifyContent: 'center',
                }}
              >
                {Math.round(fullscreenZoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                +
              </button>
              <button
                onClick={handleReset}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginLeft: '4px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                リセット
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
