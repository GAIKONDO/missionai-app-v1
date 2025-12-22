'use client';

interface AddInitiativeModalProps {
  isOpen: boolean;
  newInitiativeId: string;
  newInitiativeTitle: string;
  newInitiativeDescription: string;
  savingInitiative: boolean;
  onClose: () => void;
  onSave: () => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
}

export default function AddInitiativeModal({
  isOpen,
  newInitiativeId,
  newInitiativeTitle,
  newInitiativeDescription,
  savingInitiative,
  onClose,
  onSave,
  onTitleChange,
  onDescriptionChange,
}: AddInitiativeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={() => {
        if (!savingInitiative) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px',
          width: '90%',
          maxWidth: '560px',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div style={{ marginBottom: '28px', paddingBottom: '20px', borderBottom: '2px solid #F3F4F6' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#111827',
          }}>
            新しい注力施策を追加
          </h3>
          <p style={{ 
            margin: '8px 0 0 0', 
            fontSize: '14px', 
            color: '#6B7280',
          }}>
            注力施策の情報を入力してください
          </p>
        </div>

        {/* ユニークIDセクション */}
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px', 
          backgroundColor: '#F9FAFB',
          borderRadius: '12px', 
          border: '1px solid #E5E7EB',
        }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#6B7280',
          }}>
            ユニークID
          </label>
          <div style={{ 
            fontSize: '14px', 
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace', 
            color: '#111827', 
            fontWeight: '600',
            wordBreak: 'break-all',
          }}>
            {newInitiativeId || '生成中...'}
          </div>
        </div>

        {/* タイトル入力 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'flex',
            alignItems: 'center',
            marginBottom: '10px', 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#374151',
          }}>
            <span>タイトル</span>
            <span style={{ 
              marginLeft: '6px',
              color: '#EF4444',
              fontSize: '16px',
            }}>*</span>
          </label>
          <input
            type="text"
            value={newInitiativeTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="注力施策のタイトルを入力"
            autoFocus
            disabled={savingInitiative}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #E5E7EB',
              borderRadius: '10px',
              fontSize: '15px',
              color: '#111827',
              backgroundColor: savingInitiative ? '#F3F4F6' : '#FFFFFF',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              if (!savingInitiative) {
                e.target.style.borderColor = 'var(--color-primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E5E7EB';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* 説明入力 */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '10px', 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#374151',
          }}>
            説明
          </label>
          <textarea
            value={newInitiativeDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="注力施策の説明を入力（任意）"
            disabled={savingInitiative}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #E5E7EB',
              borderRadius: '10px',
              fontSize: '15px',
              color: '#111827',
              backgroundColor: savingInitiative ? '#F3F4F6' : '#FFFFFF',
              minHeight: '100px',
              resize: 'vertical',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => {
              if (!savingInitiative) {
                e.target.style.borderColor = 'var(--color-primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E5E7EB';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* フッター */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={savingInitiative}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6B7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: savingInitiative ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: savingInitiative ? 0.5 : 1,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={onSave}
            disabled={savingInitiative || !newInitiativeTitle.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: savingInitiative || !newInitiativeTitle.trim() ? '#9CA3AF' : '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: savingInitiative || !newInitiativeTitle.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {savingInitiative ? '保存中...' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
}

