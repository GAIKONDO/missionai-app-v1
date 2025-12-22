import { useState, useEffect } from 'react';
import type { Entity, EntityType } from '@/types/entity';

interface AddEntityModalProps {
  isOpen: boolean;
  editingEntity: Entity | null;
  onSave: (name: string, type: EntityType) => Promise<void>;
  onCancel: () => void;
}

export default function AddEntityModal({
  isOpen,
  editingEntity,
  onSave,
  onCancel,
}: AddEntityModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<EntityType>('other');

  useEffect(() => {
    if (editingEntity) {
      setName(editingEntity.name);
      setType(editingEntity.type);
    } else {
      setName('');
      setType('other');
    }
  }, [editingEntity, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = async () => {
    if (!name.trim()) {
      alert('名前を入力してください');
      return;
    }
    await onSave(name.trim(), type);
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
          {editingEntity ? 'エンティティ編集' : 'エンティティ追加'}
        </h3>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
            名前 *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="エンティティ名を入力"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
            タイプ *
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EntityType)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="person">👤 人</option>
            <option value="company">🏢 会社</option>
            <option value="product">📦 製品</option>
            <option value="project">📋 プロジェクト</option>
            <option value="organization">🏛️ 組織</option>
            <option value="location">📍 場所</option>
            <option value="technology">💻 技術</option>
            <option value="other">📌 その他</option>
          </select>
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
            {editingEntity ? '更新' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
}

