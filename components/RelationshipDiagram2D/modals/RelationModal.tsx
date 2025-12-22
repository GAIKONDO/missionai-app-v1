'use client';

import { useState } from 'react';
import type { Relation, RelationType } from '@/types/relation';
import type { Entity } from '@/types/entity';
import { RELATION_TYPE_LABELS } from '../constants';

interface RelationModalProps {
  relation: Relation | null;
  organizationId: string;
  topicId: string;
  existingRelations: Relation[];
  availableEntities: Entity[];
  onClose: () => void;
  onSave: (data: { sourceEntityId: string; targetEntityId: string; relationType: RelationType; description?: string }) => Promise<void>;
}

export default function RelationModal({
  relation,
  organizationId,
  topicId,
  existingRelations,
  availableEntities,
  onClose,
  onSave,
}: RelationModalProps) {
  const [sourceEntityId, setSourceEntityId] = useState(relation?.sourceEntityId || '');
  const [targetEntityId, setTargetEntityId] = useState(relation?.targetEntityId || '');
  const [relationType, setRelationType] = useState<RelationType>(relation?.relationType || 'related-to');
  const [description, setDescription] = useState(relation?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  // バリデーション実行
  const handleValidate = async () => {
    if (!sourceEntityId || !targetEntityId) {
      alert('起点エンティティと終点エンティティを選択してください');
      return;
    }
    
    setIsValidating(true);
    try {
      const { validateRelation } = await import('@/lib/relationApi');
      const relationToValidate: Relation = {
        id: relation?.id || '',
        topicId: topicId,
        organizationId: organizationId,
        sourceEntityId,
        targetEntityId,
        relationType,
        description: description || undefined,
        confidence: relation?.confidence,
        metadata: relation?.metadata,
        createdAt: relation?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const result = await validateRelation(relationToValidate);
      setValidationResult(result);
      
      if (!result.isValid) {
        alert(`バリデーションエラー:\n${result.errors.join('\n')}`);
      } else if (result.warnings.length > 0) {
        alert(`警告:\n${result.warnings.join('\n')}`);
      } else {
        alert('バリデーション成功: エラーはありません');
      }
    } catch (error: any) {
      console.error('❌ バリデーションエラー:', error);
      alert(`バリデーションに失敗しました: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!sourceEntityId || !targetEntityId) {
      alert('起点エンティティと終点エンティティを選択してください');
      return;
    }

    if (sourceEntityId === targetEntityId) {
      alert('起点エンティティと終点エンティティは異なるものを選択してください');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        sourceEntityId,
        targetEntityId,
        relationType,
        description: description.trim() || undefined,
      });
    } finally {
      setIsSaving(false);
    }
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
        zIndex: 3000,
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
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
          {relation ? 'リレーション編集' : 'リレーション追加'}
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
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
            {availableEntities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name} ({entity.type === 'person' ? '👤' : entity.type === 'company' ? '🏢' : entity.type === 'product' ? '📦' : '📌'})
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
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
            {Object.entries(RELATION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
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
            {availableEntities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name} ({entity.type === 'person' ? '👤' : entity.type === 'company' ? '🏢' : entity.type === 'product' ? '📦' : '📌'})
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            説明（オプション）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical',
            }}
            placeholder="例: トヨタ自動車はCTCと提携している"
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
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
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

