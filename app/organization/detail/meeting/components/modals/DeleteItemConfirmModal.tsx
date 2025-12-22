import type { TabType, MonthContent } from '../../types';
import { MONTHS, SUMMARY_TABS } from '../../constants';

interface DeleteItemConfirmModalProps {
  isOpen: boolean;
  deleteTargetTab: TabType | null;
  deleteTargetItemId: string | null;
  monthContents: Record<string, MonthContent>;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteItemConfirmModal({
  isOpen,
  deleteTargetTab,
  deleteTargetItemId,
  monthContents,
  onConfirm,
  onCancel,
}: DeleteItemConfirmModalProps) {
  if (!isOpen || !deleteTargetTab || !deleteTargetItemId) {
    return null;
  }

  const tabData = monthContents[deleteTargetTab] as MonthContent | undefined;
  const item = tabData?.items?.find(i => i.id === deleteTargetItemId);
  const itemTitle = item?.title || 'この議事録';
  const tabLabel = MONTHS.find(m => m.id === deleteTargetTab)?.label || 
                   SUMMARY_TABS.find(t => t.id === deleteTargetTab)?.label || 
                   deleteTargetTab;

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
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          padding: '24px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '20px', fontWeight: '600', color: '#DC2626' }}>
          ⚠️ 議事録の削除
        </h3>
        <p style={{ marginBottom: '16px', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
          削除操作は取り消せません
        </p>
        <p style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
          「{itemTitle}」を削除しますか？
        </p>
        <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '500', color: '#991B1B' }}>
            この操作により、以下のデータが完全に削除されます：
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#7F1D1D' }}>
            <li>タブ: {tabLabel}</li>
            <li>タイトル: {itemTitle}</li>
            <li>コンテンツ: {item?.content ? 'あり' : 'なし'}</li>
          </ul>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              backgroundColor: '#DC2626',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}

