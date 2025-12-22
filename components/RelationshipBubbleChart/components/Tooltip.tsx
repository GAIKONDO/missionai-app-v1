interface TooltipProps {
  tooltip: { x: number; y: number; content: string } | null;
}

export default function Tooltip({ tooltip }: TooltipProps) {
  if (!tooltip) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${tooltip.x}px`,
        top: `${tooltip.y}px`,
        transform: 'translate(-50%, -100%)',
        background: 'rgba(26, 26, 26, 0.95)',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        pointerEvents: 'none',
        zIndex: 1000,
        maxWidth: '280px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
        whiteSpace: 'pre-line',
        fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
        lineHeight: '1.5',
      }}
    >
      {tooltip.content}
    </div>
  );
}

