'use client';

import type { Entity } from '@/types/entity';

interface EntityDetailModalProps {
  entity: Entity | null;
  entityTypeLabels: Record<string, string>;
  onClose: () => void;
}

export default function EntityDetailModal({
  entity,
  entityTypeLabels,
  onClose,
}: EntityDetailModalProps) {
  if (!entity) return null;

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
      onClick={onClose}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937' }}>
            詳細情報
          </h2>
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

        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>
            {entity.name}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>タイプ: </span>
              <span style={{ fontSize: '14px', color: '#1F2937' }}>
                {entityTypeLabels[entity.type] || entity.type}
              </span>
            </div>
            {entity.aliases && entity.aliases.length > 0 && (
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>別名: </span>
                <span style={{ fontSize: '14px', color: '#1F2937' }}>
                  {entity.aliases.join(', ')}
                </span>
              </div>
            )}
            {entity.metadata && Object.keys(entity.metadata).length > 0 && (
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>メタデータ: </span>
                <pre style={{ fontSize: '12px', color: '#1F2937', margin: '8px 0', padding: '8px', backgroundColor: '#F9FAFB', borderRadius: '4px', overflow: 'auto' }}>
                  {JSON.stringify(entity.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
