import { useState, useEffect, useRef } from 'react';
import { DEFAULT_PANEL_WIDTH, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH } from '../constants';

export function usePanelResize() {
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiAssistantPanelWidth');
      return saved ? parseInt(saved, 10) : DEFAULT_PANEL_WIDTH;
    }
    return DEFAULT_PANEL_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const resizeStartXRef = useRef<number>(0);
  const resizeStartWidthRef = useRef<number>(DEFAULT_PANEL_WIDTH);

  // パネル幅をlocalStorageに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aiAssistantPanelWidth', panelWidth.toString());
      window.dispatchEvent(new CustomEvent('aiAssistantWidthChanged', { detail: panelWidth }));
    }
  }, [panelWidth]);

  // リサイズ開始
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = panelWidth;
  };

  // リサイズ中
  useEffect(() => {
    if (!isResizing) return;
    
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = resizeStartXRef.current - e.clientX;
      const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, resizeStartWidthRef.current + deltaX));
      setPanelWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, panelWidth]);

  return {
    panelWidth,
    isResizing,
    handleResizeStart,
  };
}

