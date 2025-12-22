import type { Relation, Entity } from '@/types/relation';

interface DeleteRelationsConfirmModalProps {
  isOpen: boolean;
  relations: Relation[];
  entities: Entity[];
  onConfirm: () => void;
  onCancel: () => void;
}

const relationTypeLabels: Record<string, string> = {
  'subsidiary': '子会社',
  'uses': '使用',
  'invests': '出資',
  'employs': '雇用',
  'partners': '提携',
  'competes': '競合',
  'supplies': '供給',
  'owns': '所有',
  'located-in': '所在',
  'works-for': '勤務',
  'manages': '管理',
  'reports-to': '報告',
  'related-to': '関連',
  'other': 'その他',
};

export default function DeleteRelationsConfirmModal({
  isOpen,
  relations,
  entities,
  onConfirm,
  onCancel,
}: DeleteRelationsConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

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
        zIndex: 2002,
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
          ⚠️ リレーションの一括削除
        </h3>
        <p style={{ marginBottom: '16px', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
          削除操作は取り消せません
        </p>
        <p style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
          このトピックに関連するすべてのリレーションを削除しますか？
        </p>
        <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '500', color: '#991B1B' }}>
            この操作により、以下のデータが完全に削除されます：
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#7F1D1D' }}>
            <li>リレーション数: {relations.length}件</li>
            {relations.slice(0, 5).map((relation) => {
              const sourceEntity = entities.find(e => e.id === relation.sourceEntityId);
              const targetEntity = entities.find(e => e.id === relation.targetEntityId);
              const sourceName = sourceEntity?.name || relation.sourceEntityId || '不明';
              const targetName = targetEntity?.name || relation.targetEntityId || '不明';
              return (
                <li key={relation.id}>
                  {sourceName} - {relationTypeLabels[relation.relationType] || relation.relationType} - {targetName}
                </li>
              );
            })}
            {relations.length > 5 && (
              <li>...他 {relations.length - 5}件</li>
            )}
          </ul>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
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

