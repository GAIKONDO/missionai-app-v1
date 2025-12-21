import React from 'react';

interface ResizeHandleProps {
  isResizing: boolean;
  onResizeStart: (e: React.MouseEvent) => void;
}

export function ResizeHandle({ isResizing, onResizeStart }: ResizeHandleProps) {
  return (
    <div
      onMouseDown={onResizeStart}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '6px',
        cursor: 'ew-resize',
        backgroundColor: isResizing ? 'rgba(59, 130, 246, 0.6)' : 'transparent',
        zIndex: 1001,
        transition: isResizing ? 'none' : 'background-color 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={(e) => {
        if (!isResizing) {
          e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isResizing) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
      title="ドラッグして幅を調整"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          alignItems: 'center',
          opacity: isResizing ? 1 : 0.5,
          transition: 'opacity 0.2s ease',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '3px',
              height: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              borderRadius: '50%',
            }}
          />
        ))}
      </div>
    </div>
  );
}

