'use client';

interface ViewModeSwitcherProps {
  viewMode: 'list' | 'graph2d' | 'graph3d';
  setViewMode: (mode: 'list' | 'graph2d' | 'graph3d') => void;
  isCheckingVersion: boolean;
  onCheckVersion: () => void;
  isRegeneratingEmbeddings: boolean;
  regenerationProgress: {
    current: number;
    total: number;
  };
  onOpenRegenerationModal: () => void;
}

export default function ViewModeSwitcher({
  viewMode,
  setViewMode,
  isCheckingVersion,
  onCheckVersion,
  isRegeneratingEmbeddings,
  regenerationProgress,
  onOpenRegenerationModal,
}: ViewModeSwitcherProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setViewMode('list')}
          style={{
            padding: '8px 16px',
            backgroundColor: viewMode === 'list' ? '#3B82F6' : '#F3F4F6',
            color: viewMode === 'list' ? '#FFFFFF' : '#6B7280',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          リスト
        </button>
        {/* 2Dグラフタブをコメントアウト */}
        {/* <button
          onClick={() => setViewMode('graph2d')}
          style={{
            padding: '8px 16px',
            backgroundColor: viewMode === 'graph2d' ? '#3B82F6' : '#F3F4F6',
            color: viewMode === 'graph2d' ? '#FFFFFF' : '#6B7280',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          2Dグラフ
        </button> */}
        <button
          onClick={() => setViewMode('graph3d')}
          style={{
            padding: '8px 16px',
            backgroundColor: viewMode === 'graph3d' ? '#3B82F6' : '#F3F4F6',
            color: viewMode === 'graph3d' ? '#FFFFFF' : '#6B7280',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          3Dグラフ
        </button>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onCheckVersion}
          disabled={isCheckingVersion}
          style={{
            padding: '8px 16px',
            backgroundColor: isCheckingVersion ? '#D1D5DB' : '#3B82F6',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: isCheckingVersion ? 'not-allowed' : 'pointer',
            fontWeight: 500,
          }}
        >
          {isCheckingVersion ? 'チェック中...' : '🔍 バージョンチェック'}
        </button>
        <button
          onClick={onOpenRegenerationModal}
          disabled={isRegeneratingEmbeddings}
          style={{
            padding: '8px 16px',
            backgroundColor: isRegeneratingEmbeddings ? '#D1D5DB' : '#10B981',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: isRegeneratingEmbeddings ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {isRegeneratingEmbeddings ? (
            <>
              <span>再生成中...</span>
              <span style={{ fontSize: '12px' }}>
                ({regenerationProgress.current}/{regenerationProgress.total})
              </span>
            </>
          ) : (
            '🔧 埋め込み再生成'
          )}
        </button>
      </div>
    </div>
  );
}
