'use client';

import { CURRENT_EMBEDDING_VERSION as ENTITY_EMBEDDING_VERSION, CURRENT_EMBEDDING_MODEL as ENTITY_EMBEDDING_MODEL } from '@/lib/entityEmbeddings';
import { CURRENT_EMBEDDING_VERSION as RELATION_EMBEDDING_VERSION, CURRENT_EMBEDDING_MODEL as RELATION_EMBEDDING_MODEL } from '@/lib/relationEmbeddings';

interface VersionCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  outdatedEntities: Array<{ entityId: string; currentVersion: string; expectedVersion: string; model: string }>;
  outdatedRelations: Array<{ relationId: string; currentVersion: string; expectedVersion: string; model: string }>;
  onOpenRegenerationModal: () => void;
}

export default function VersionCheckModal({
  isOpen,
  onClose,
  outdatedEntities,
  outdatedRelations,
  onOpenRegenerationModal,
}: VersionCheckModalProps) {
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
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '700px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
          埋め込みバージョンチェック
        </h2>
        
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#F0F9FF', borderRadius: '6px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>現在のバージョン情報</div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            エンティティ: バージョン {ENTITY_EMBEDDING_VERSION}, モデル {ENTITY_EMBEDDING_MODEL}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            リレーション: バージョン {RELATION_EMBEDDING_VERSION}, モデル {RELATION_EMBEDDING_MODEL}
          </div>
        </div>

        {outdatedEntities.length === 0 && outdatedRelations.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#10B981' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
            <div style={{ fontSize: '16px', fontWeight: 500 }}>すべての埋め込みが最新バージョンです</div>
          </div>
        ) : (
          <div>
            {outdatedEntities.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#F59E0B' }}>
                  ⚠️ エンティティ: {outdatedEntities.length}件のバージョン不一致
                </h3>
                <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '12px', color: '#6B7280' }}>
                  {outdatedEntities.slice(0, 10).map((item, index) => (
                    <div key={index} style={{ padding: '4px 0' }}>
                      {item.entityId} (現在: v{item.currentVersion}, {item.model} → 期待: v{item.expectedVersion}, {ENTITY_EMBEDDING_MODEL})
                    </div>
                  ))}
                  {outdatedEntities.length > 10 && (
                    <div style={{ padding: '4px 0', color: '#9CA3AF' }}>
                      ...他 {outdatedEntities.length - 10}件
                    </div>
                  )}
                </div>
              </div>
            )}

            {outdatedRelations.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#F59E0B' }}>
                  ⚠️ リレーション: {outdatedRelations.length}件のバージョン不一致
                </h3>
                <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '12px', color: '#6B7280' }}>
                  {outdatedRelations.slice(0, 10).map((item, index) => (
                    <div key={index} style={{ padding: '4px 0' }}>
                      {item.relationId} (現在: v{item.currentVersion}, {item.model} → 期待: v{item.expectedVersion}, {RELATION_EMBEDDING_MODEL})
                    </div>
                  ))}
                  {outdatedRelations.length > 10 && (
                    <div style={{ padding: '4px 0', color: '#9CA3AF' }}>
                      ...他 {outdatedRelations.length - 10}件
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
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
              <button
                onClick={() => {
                  onClose();
                  onOpenRegenerationModal();
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F59E0B',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                再生成モーダルを開く
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
