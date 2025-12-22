'use client';

interface DeleteInitiativeModalProps {
  isOpen: boolean;
  initiativeTitle: string;
  savingInitiative: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteInitiativeModal({
  isOpen,
  initiativeTitle,
  savingInitiative,
  onClose,
  onConfirm,
}: DeleteInitiativeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#111827' }}>
          注力施策を削除
        </h3>
        <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px', lineHeight: '1.6' }}>
          {initiativeTitle || 'この注力施策'}を削除しますか？
          <br />
          この操作は取り消せません。
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={savingInitiative}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6B7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: savingInitiative ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={savingInitiative}
            style={{
              padding: '8px 16px',
              backgroundColor: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: savingInitiative ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            {savingInitiative ? '削除中...' : '削除'}
          </button>
        </div>
      </div>
    </div>
  );
}

