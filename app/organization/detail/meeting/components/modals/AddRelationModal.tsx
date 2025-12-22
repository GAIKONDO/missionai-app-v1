import { useState, useEffect } from 'react';
import type { Relation, RelationType, Entity } from '@/types/relation';

interface AddRelationModalProps {
  isOpen: boolean;
  editingRelation: Relation | null;
  entities: Entity[];
  onSave: (sourceEntityId: string, targetEntityId: string, relationType: RelationType, description?: string) => Promise<void>;
  onCancel: () => void;
}

export default function AddRelationModal({
  isOpen,
  editingRelation,
  entities,
  onSave,
  onCancel,
}: AddRelationModalProps) {
  const [sourceEntityId, setSourceEntityId] = useState('');
  const [targetEntityId, setTargetEntityId] = useState('');
  const [relationType, setRelationType] = useState<RelationType>('related-to');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editingRelation) {
      setSourceEntityId(editingRelation.sourceEntityId || '');
      setTargetEntityId(editingRelation.targetEntityId || '');
      setRelationType(editingRelation.relationType);
      setDescription(editingRelation.description || '');
    } else {
      setSourceEntityId('');
      setTargetEntityId('');
      setRelationType('related-to');
      setDescription('');
    }
  }, [editingRelation, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = async () => {
    if (!sourceEntityId || !targetEntityId) {
      alert('起点エンティティと終点エンティティを選択してください');
      return;
    }
    await onSave(sourceEntityId, targetEntityId, relationType, description.trim() || undefined);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
          {editingRelation ? 'リレーション編集' : 'リレーション追加'}
        </h3>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
            起点エンティティ *
          </label>
          <select
            value={sourceEntityId}
            onChange={(e) => setSourceEntityId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">選択してください</option>
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
            リレーションタイプ *
          </label>
          <select
            value={relationType}
            onChange={(e) => setRelationType(e.target.value as RelationType)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="subsidiary">子会社</option>
            <option value="uses">使用</option>
            <option value="invests">出資</option>
            <option value="employs">雇用</option>
            <option value="partners">提携</option>
            <option value="competes">競合</option>
            <option value="supplies">供給</option>
            <option value="owns">所有</option>
            <option value="located-in">所在</option>
            <option value="works-for">勤務</option>
            <option value="manages">管理</option>
            <option value="reports-to">報告</option>
            <option value="related-to">関連</option>
            <option value="other">その他</option>
          </select>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
            終点エンティティ *
          </label>
          <select
            value={targetEntityId}
            onChange={(e) => setTargetEntityId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">選択してください</option>
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
            説明
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="リレーションの説明を入力"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              minHeight: '80px',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onCancel}
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
            キャンセル
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {editingRelation ? '更新' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
}

