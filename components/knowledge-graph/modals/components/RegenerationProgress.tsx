import { devLog } from '../utils/devLog';

interface RegenerationProgressProps {
  regenerationProgress: {
    current: number;
    total: number;
    status: 'idle' | 'processing' | 'completed' | 'cancelled';
    logs: Array<{ type: 'info' | 'success' | 'error' | 'skip'; message: string; timestamp: Date }>;
    stats: { success: number; skipped: number; errors: number };
  };
  setRegenerationProgress: React.Dispatch<React.SetStateAction<{
    current: number;
    total: number;
    status: 'idle' | 'processing' | 'completed' | 'cancelled';
    logs: Array<{ type: 'info' | 'success' | 'error' | 'skip'; message: string; timestamp: Date }>;
    stats: { success: number; skipped: number; errors: number };
  }>>;
  isCancelledRef: React.MutableRefObject<boolean>;
  setIsRegeneratingEmbeddings: (value: boolean) => void;
  cancelRegeneration: () => void;
}

export default function RegenerationProgress({
  regenerationProgress,
  setRegenerationProgress,
  isCancelledRef,
  setIsRegeneratingEmbeddings,
  cancelRegeneration,
}: RegenerationProgressProps) {
  if (regenerationProgress.status === 'idle') {
    return null;
  }

  return (
    <>
      {(regenerationProgress.status === 'processing' || regenerationProgress.status === 'completed') && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                進捗: {regenerationProgress.current} / {regenerationProgress.total}
              </span>
              <span style={{ fontSize: '14px', color: '#6B7280' }}>
                {regenerationProgress.total > 0
                  ? `${Math.round((regenerationProgress.current / regenerationProgress.total) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${regenerationProgress.total > 0 ? (regenerationProgress.current / regenerationProgress.total) * 100 : 0}%`,
                  height: '100%',
                  backgroundColor: regenerationProgress.status === 'completed' ? '#10B981' : '#3B82F6',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {regenerationProgress.status === 'processing' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  devLog('🛑 生成を中止ボタンがクリックされました');
                  isCancelledRef.current = true;
                  setRegenerationProgress(prev => ({
                    ...prev,
                    status: 'cancelled',
                  }));
                  setIsRegeneratingEmbeddings(false);
                  cancelRegeneration();
                  // ログに追加
                  setRegenerationProgress(prev => ({
                    ...prev,
                    logs: [
                      ...prev.logs,
                      {
                        type: 'info',
                        message: '処理が中止されました',
                        timestamp: new Date(),
                      },
                    ],
                  }));
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#DC2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#EF4444';
                }}
              >
                生成を中止
              </button>
            </div>
          )}

          {regenerationProgress.status === 'completed' && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>完了</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                成功: {regenerationProgress.stats.success}件 | 
                スキップ: {regenerationProgress.stats.skipped}件 | 
                エラー: {regenerationProgress.stats.errors}件
              </div>
            </div>
          )}
        </div>
      )}

      {regenerationProgress.status === 'cancelled' && (
        <div>
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#991B1B' }}>中止されました</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              処理が中止されました。一部のデータは既に処理されている可能性があります。
            </div>
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
            {regenerationProgress.logs.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                ログがありません
              </div>
            ) : (
              regenerationProgress.logs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    marginBottom: '4px',
                    backgroundColor: log.type === 'success' ? '#F0FDF4' : log.type === 'error' ? '#FEF2F2' : '#F9FAFB',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: log.type === 'success' ? '#065F46' : log.type === 'error' ? '#991B1B' : '#6B7280',
                  }}
                >
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}

