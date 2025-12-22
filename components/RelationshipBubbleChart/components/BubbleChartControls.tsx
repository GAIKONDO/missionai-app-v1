interface BubbleChartControlsProps {
  showTopics: boolean;
  onToggleTopics: () => void;
}

export default function BubbleChartControls({ showTopics, onToggleTopics }: BubbleChartControlsProps) {
  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      {/* 個別トピックの表示/非表示ボタン */}
      <button
        onClick={onToggleTopics}
        style={{
          width: '36px',
          height: '36px',
          backgroundColor: showTopics ? '#3B82F6' : '#FFFFFF',
          border: `1px solid ${showTopics ? '#2563EB' : '#E0E0E0'}`,
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: showTopics ? '#FFFFFF' : '#1A1A1A',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
        title={showTopics ? '個別トピックを非表示' : '個別トピックを表示'}
      >
        {showTopics ? '📋' : '📄'}
      </button>
    </div>
  );
}

