'use client';

import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';

interface BulkDeleteModalProps {
  isOpen: boolean;
  selectedEntityIds: Set<string>;
  entities: Entity[];
  relations: Relation[];
  entityTypeLabels: Record<string, string>;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function BulkDeleteModal({
  isOpen,
  selectedEntityIds,
  entities,
  relations,
  entityTypeLabels,
  isDeleting,
  onClose,
  onConfirm,
}: BulkDeleteModalProps) {
  if (!isOpen || selectedEntityIds.size === 0) return null;

  const selectedEntities = entities.filter(e => selectedEntityIds.has(e.id));
  const totalRelations = relations.filter(r => 
    (r.sourceEntityId && selectedEntityIds.has(r.sourceEntityId)) || (r.targetEntityId && selectedEntityIds.has(r.targetEntityId))
  ).length;

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
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#EF4444' }}>
          ⚠️ エンティティの一括削除
        </h2>
        
        <p style={{ marginBottom: '16px', color: '#6B7280' }}>
          <strong style={{ color: '#1F2937' }}>{selectedEntityIds.size}件</strong>のエンティティを削除しますか？
        </p>
        
        <div>
          <div style={{
            padding: '12px',
            backgroundColor: '#FEF3C7',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px',
            color: '#92400E',
          }}>
            <strong>⚠️ 注意:</strong> 選択されたエンティティに関連する<strong>{totalRelations}件</strong>のリレーションも同時に削除されます。
          </div>
          
          <div style={{
            padding: '12px',
            backgroundColor: '#F9FAFB',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '12px',
            color: '#6B7280',
          }}>
            <div style={{ fontWeight: 500, marginBottom: '8px' }}>削除されるデータ:</div>
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              <li>エンティティ: {selectedEntityIds.size}件</li>
              {totalRelations > 0 && (
                <li>リレーション: {totalRelations}件</li>
              )}
              <li>エンティティ埋め込みデータ（SQLite / ChromaDB）</li>
              {totalRelations > 0 && (
                <li>リレーション埋め込みデータ（SQLite / ChromaDB）</li>
              )}
            </ul>
          </div>
          
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '12px',
            backgroundColor: '#F9FAFB',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '12px',
            color: '#6B7280',
          }}>
            <div style={{ fontWeight: 500, marginBottom: '8px' }}>削除対象エンティティ:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {selectedEntities.slice(0, 20).map(entity => {
                const relatedCount = relations.filter(r => 
                  (r.sourceEntityId === entity.id || r.targetEntityId === entity.id)
                ).length;
                return (
                  <div key={entity.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>
                      {entityTypeLabels[entity.type] || '📌'}
                    </span>
                    <span style={{ fontWeight: 500 }}>{entity.name}</span>
                    {relatedCount > 0 && (
                      <span style={{ color: '#9CA3AF', fontSize: '11px' }}>
                        ({relatedCount}件のリレーション)
                      </span>
                    )}
                  </div>
                );
              })}
              {selectedEntities.length > 20 && (
                <div style={{ color: '#9CA3AF', fontSize: '11px', marginTop: '4px' }}>
                  ...他 {selectedEntities.length - 20}件
                </div>
              )}
            </div>
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
              {isDeleting ? '削除中...' : `削除する (${selectedEntityIds.size}件)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
