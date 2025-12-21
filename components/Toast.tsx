/**
 * トースト通知コンポーネント
 */

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration || 3000;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getToastStyle = () => {
    switch (toast.type) {
      case 'success':
        return {
          background: '#e8f5e9',
          color: '#2e7d32',
          borderColor: '#4caf50',
        };
      case 'error':
        return {
          background: '#ffebee',
          color: '#c62828',
          borderColor: '#f44336',
        };
      case 'warning':
        return {
          background: '#fff9c4',
          color: '#f57f17',
          borderColor: '#ff9800',
        };
      case 'info':
      default:
        return {
          background: '#e3f2fd',
          color: '#1565c0',
          borderColor: '#2196f3',
        };
    }
  };

  const style = getToastStyle();

  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        border: `1px solid ${style.borderColor}`,
        background: style.background,
        color: style.color,
        fontSize: '14px',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        minWidth: '300px',
        maxWidth: '500px',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <span>{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: style.color,
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: '1',
          padding: '0',
          opacity: 0.7,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.7';
        }}
      >
        ×
      </button>
    </div>
  );
}

let toastIdCounter = 0;
const toastListeners: Set<(toasts: Toast[]) => void> = new Set();
let toasts: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach(listener => listener([...toasts]));
}

export function showToast(message: string, type: ToastType = 'info', duration?: number) {
  const id = `toast-${++toastIdCounter}`;
  const toast: Toast = { id, message, type, duration };
  toasts.push(toast);
  notifyListeners();

  // 最大5個まで表示
  if (toasts.length > 5) {
    toasts.shift();
    notifyListeners();
  }
}

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setCurrentToasts(newToasts);
    };
    toastListeners.add(listener);
    setCurrentToasts([...toasts]);

    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const handleClose = (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    notifyListeners();
  };

  if (currentToasts.length === 0 || typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none',
      }}
    >
      {currentToasts.map(toast => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={toast} onClose={handleClose} />
        </div>
      ))}
    </div>,
    document.body
  );
}

// CSSアニメーション（グローバルスタイルに追加する必要がある場合）
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  if (!document.head.querySelector('style[data-toast-animations]')) {
    style.setAttribute('data-toast-animations', 'true');
    document.head.appendChild(style);
  }
}

