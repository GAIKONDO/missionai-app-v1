'use client';

import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';

interface DeleteEntityModalProps {
  isOpen: boolean;
  entityId: string | null;
  entities: Entity[];
  relations: Relation[];
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteEntityModal({
  isOpen,
  entityId,
  entities,
  relations,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteEntityModalProps) {
  if (!isOpen || !entityId) return null;

  const entity = entities.find(e => e.id === entityId);
  const relatedRelations = relations.filter(r => 
    r.sourceEntityId === entityId || r.targetEntityId === entityId
  );

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
        zIndex: 1000,
      }}
      onClick={() => {
        if (!isDeleting) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#EF4444' }}>
          ⚠️ エンティティの削除
        </h2>
        
        {!entity ? (
          <div>
            <p style={{ marginBottom: '16px', color: '#6B7280' }}>
              エンティティが見つかりません。
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#6B7280',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: '16px', color: '#6B7280' }}>
              エンティティ「<strong style={{ color: '#1F2937' }}>{entity.name}</strong>」を削除しますか？
            </p>
            
            {relatedRelations.length > 0 && (
              <div style={{
                padding: '12px',
                backgroundColor: '#FEF3C7',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#92400E',
              }}>
                <strong>⚠️ 注意:</strong> このエンティティに関連する{relatedRelations.length}件のリレーションも同時に削除されます。
              </div>
            )}
            
            <div style={{
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '12px',
              color: '#6B7280',
            }}>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>削除されるデータ:</div>
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                <li>エンティティ: {entity.name}</li>
                {relatedRelations.length > 0 && (
                  <li>リレーション: {relatedRelations.length}件</li>
                )}
                <li>エンティティ埋め込みデータ（SQLite / ChromaDB）</li>
                {relatedRelations.length > 0 && (
                  <li>リレーション埋め込みデータ（SQLite / ChromaDB）</li>
                )}
              </ul>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#6B7280',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.5 : 1,
                }}
              >
                キャンセル
              </button>
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  opacity: isDeleting ? 0.5 : 1,
                }}
              >
                {isDeleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
