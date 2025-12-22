'use client';

import { useState, useEffect } from 'react';
import type { Entity, EntityType } from '@/types/entity';
import type { Relation } from '@/types/relation';
import { ENTITY_TYPE_LABELS, RELATION_TYPE_LABELS } from '../constants';

interface EntityModalProps {
  entity: Entity | null;
  organizationId: string;
  existingEntities: Entity[];
  allRelations: Relation[];
  onClose: () => void;
  onSave: (data: { name: string; type: EntityType; aliases?: string[]; metadata?: any }) => Promise<void>;
}

export default function EntityModal({
  entity,
  organizationId,
  existingEntities,
  allRelations,
  onClose,
  onSave,
}: EntityModalProps) {
  const [name, setName] = useState(entity?.name || '');
  const [type, setType] = useState<EntityType>(entity?.type || 'other');
  const [aliases, setAliases] = useState<string>(entity?.aliases?.join(', ') || '');
  const [isSaving, setIsSaving] = useState(false);
  const [similarEntities, setSimilarEntities] = useState<Array<{ entity: Entity; similarity: number }>>([]);
  const [isCheckingSimilar, setIsCheckingSimilar] = useState(false);
  
  // エンティティに関連するリレーションを取得
  const relatedRelations = entity ? allRelations.filter(r => 
    r.sourceEntityId === entity.id || r.targetEntityId === entity.id
  ) : [];
  
  // エンティティ名が変更されたときに類似エンティティを検出（新規作成時のみ）
  useEffect(() => {
    if (!entity && name.trim().length >= 2) {
      const checkSimilar = async () => {
        setIsCheckingSimilar(true);
        try {
          const { findSimilarEntities } = await import('@/lib/entityApi');
          const similar = await findSimilarEntities(name.trim(), organizationId || undefined, undefined, 0.7);
          // 既存のエンティティリストから除外
          const filtered = similar.filter(s => 
            !existingEntities.some(e => e.id === s.entity.id)
          );
          setSimilarEntities(filtered.slice(0, 5)); // 最大5件まで表示
        } catch (error) {
          console.error('❌ 類似エンティティ検出エラー:', error);
          setSimilarEntities([]);
        } finally {
          setIsCheckingSimilar(false);
        }
      };
      
      // デバウンス処理（500ms待機）
      const timer = setTimeout(checkSimilar, 500);
      return () => clearTimeout(timer);
    } else {
      setSimilarEntities([]);
    }
  }, [name, entity, organizationId, existingEntities]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('エンティティ名を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        type,
        aliases: aliases.trim() ? aliases.split(',').map(a => a.trim()).filter(Boolean) : undefined,
        metadata: {},
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
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
          {entity ? 'エンティティ編集' : 'エンティティ追加'}
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            エンティティ名 *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
            }}
            placeholder="例: トヨタ自動車"
          />
          {isCheckingSimilar && (
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              🔍 類似エンティティを検索中...
            </div>
          )}
          {!entity && similarEntities.length > 0 && (
            <div style={{ 
              marginTop: '12px', 
              padding: '12px', 
              backgroundColor: '#FEF3C7', 
              border: '1px solid #FCD34D',
              borderRadius: '6px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400E', marginBottom: '8px' }}>
                ⚠️ 類似するエンティティが見つかりました
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {similarEntities.map(({ entity: similarEntity, similarity }) => (
                  <div
                    key={similarEntity.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 500 }}>
                        {ENTITY_TYPE_LABELS[similarEntity.type] || '📌 その他'} {similarEntity.name}
                      </span>
                      <span style={{ color: '#6B7280', marginLeft: '8px' }}>
                        (類似度: {Math.round(similarity * 100)}%)
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setName(similarEntity.name);
                        setType(similarEntity.type);
                        if (similarEntity.aliases && similarEntity.aliases.length > 0) {
                          setAliases(similarEntity.aliases.join(', '));
                        }
                        setSimilarEntities([]);
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#3B82F6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      使用
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
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
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500 }}>
              別名（エイリアス）
            </label>
            <button
              type="button"
              onClick={() => {
                const newAlias = prompt('新しい別名を入力してください:');
                if (newAlias && newAlias.trim()) {
                  const currentAliases = aliases.trim() 
                    ? aliases.split(',').map(a => a.trim()).filter(Boolean)
                    : [];
                  if (!currentAliases.includes(newAlias.trim())) {
                    setAliases([...currentAliases, newAlias.trim()].join(', '));
                  } else {
                    alert('この別名は既に登録されています');
                  }
                }
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              + 追加
            </button>
          </div>
          <div style={{ marginBottom: '8px' }}>
            {aliases.trim() ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {aliases.split(',').map(a => a.trim()).filter(Boolean).map((alias, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <span>{alias}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const currentAliases = aliases.split(',').map(a => a.trim()).filter(Boolean);
                        currentAliases.splice(index, 1);
                        setAliases(currentAliases.join(', '));
                      }}
                      style={{
                        padding: '0',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        fontSize: '14px',
                        lineHeight: '1',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', marginBottom: '8px' }}>
                別名が登録されていません
              </div>
            )}
          </div>
          <input
            type="text"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
            }}
            placeholder="例: トヨタ, Toyota（カンマ区切りで複数入力可能）"
          />
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            💡 ヒント: 別名は表記ゆれや略称を管理するために使用します。例: 「トヨタ自動車」の別名として「トヨタ」「Toyota」を登録
          </div>
        </div>
        
        {/* 関連リレーション表示（編集時のみ） */}
        {entity && relatedRelations.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>
              📊 関連リレーション ({relatedRelations.length}件)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {relatedRelations.map((relation) => {
                const sourceEntity = existingEntities.find(e => e.id === relation.sourceEntityId);
                const targetEntity = existingEntities.find(e => e.id === relation.targetEntityId);
                const sourceName = sourceEntity?.name || relation.sourceEntityId || '不明';
                const targetName = targetEntity?.name || relation.targetEntityId || '不明';
                const relationTypeLabel = RELATION_TYPE_LABELS[relation.relationType] || relation.relationType;
                const isSource = relation.sourceEntityId === entity.id;
                
                return (
                  <div
                    key={relation.id}
                    style={{
                      padding: '8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 500, color: '#1a1a1a' }}>
                      {isSource ? (
                        <>
                          <span style={{ color: '#3B82F6' }}>{entity.name}</span>
                          {' → '}
                          <span>{targetName}</span>
                        </>
                      ) : (
                        <>
                          <span>{sourceName}</span>
                          {' → '}
                          <span style={{ color: '#3B82F6' }}>{entity.name}</span>
                        </>
                      )}
                    </div>
                    <div style={{ color: '#6B7280', marginTop: '4px' }}>
                      タイプ: {relationTypeLabel}
                      {relation.description && ` - ${relation.description}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {entity && relatedRelations.length === 0 && (
          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center' }}>
            関連リレーションはありません
          </div>
        )}
        
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

