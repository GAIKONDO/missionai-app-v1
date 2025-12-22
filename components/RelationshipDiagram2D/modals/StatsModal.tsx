'use client';

import { useState } from 'react';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import type { TopicInfo } from '@/lib/orgApi';
import { ENTITY_TYPE_LABELS, RELATION_TYPE_LABELS } from '../constants';

interface StatsModalProps {
  isOpen: boolean;
  topicEntities: Entity[];
  pendingEntities: Entity[] | null;
  topicRelations: Relation[];
  pendingRelations: Relation[] | null;
  selectedTopic: TopicInfo | null;
  isExporting: boolean;
  exportSuccess: boolean;
  onClose: () => void;
  onExport: () => Promise<void>;
}

export default function StatsModal({
  isOpen,
  topicEntities,
  pendingEntities,
  topicRelations,
  pendingRelations,
  selectedTopic,
  isExporting,
  exportSuccess,
  onClose,
  onExport,
}: StatsModalProps) {
  if (!isOpen) return null;

  const allEntities = (pendingEntities && pendingEntities.length > 0) ? pendingEntities : (topicEntities || []);
  const allRelations = (pendingRelations && pendingRelations.length > 0) ? pendingRelations : (topicRelations || []);
  
  // エンティティタイプ別の集計
  const entityTypeCounts: Record<string, number> = {};
  allEntities.forEach(e => {
    entityTypeCounts[e.type] = (entityTypeCounts[e.type] || 0) + 1;
  });
  
  // リレーションタイプ別の集計
  const relationTypeCounts: Record<string, number> = {};
  allRelations.forEach(r => {
    relationTypeCounts[r.relationType] = (relationTypeCounts[r.relationType] || 0) + 1;
  });
  
  // 最も関連が多いエンティティ
  const entityRelationCounts: Record<string, number> = {};
  allRelations.forEach(r => {
    if (r.sourceEntityId) entityRelationCounts[r.sourceEntityId] = (entityRelationCounts[r.sourceEntityId] || 0) + 1;
    if (r.targetEntityId) entityRelationCounts[r.targetEntityId] = (entityRelationCounts[r.targetEntityId] || 0) + 1;
  });
  const topEntities = Object.entries(entityRelationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const entity = allEntities.find(e => e.id === id);
      return { name: entity?.name || id, count };
    });

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
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>
            📊 ナレッジグラフ統計情報
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6B7280',
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* エンティティ統計 */}
          <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>
              【エンティティ】
            </div>
            <div style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
              総数: <strong>{allEntities.length}件</strong>
            </div>
            {Object.entries(entityTypeCounts).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {Object.entries(entityTypeCounts).map(([type, count]) => (
                  <div key={type} style={{ fontSize: '13px', color: '#6B7280', paddingLeft: '12px' }}>
                    {ENTITY_TYPE_LABELS[type] || type}: {count}件
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>
                エンティティがありません
              </div>
            )}
          </div>
          
          {/* リレーション統計 */}
          <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>
              【リレーション】
            </div>
            <div style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
              総数: <strong>{allRelations.length}件</strong>
            </div>
            {Object.entries(relationTypeCounts).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {Object.entries(relationTypeCounts).map(([type, count]) => (
                  <div key={type} style={{ fontSize: '13px', color: '#6B7280', paddingLeft: '12px' }}>
                    {RELATION_TYPE_LABELS[type] || type}: {count}件
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>
                リレーションがありません
              </div>
            )}
          </div>
          
          {/* 最も関連が多いエンティティ */}
          {topEntities.length > 0 && (
            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>
                【最も関連が多いエンティティ（上位5件）】
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {topEntities.map((e, i) => (
                  <div key={i} style={{ fontSize: '13px', color: '#6B7280', paddingLeft: '12px' }}>
                    {i + 1}. {e.name} (<strong>{e.count}件</strong>のリレーション)
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* グラフ密度 */}
          <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a' }}>
              【グラフ密度】
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              平均リレーション数/エンティティ: <strong>{allEntities.length > 0 ? (allRelations.length / allEntities.length).toFixed(2) : '0'}</strong>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          <button
            onClick={onExport}
            disabled={isExporting}
            style={{
              padding: '8px 16px',
              backgroundColor: isExporting ? '#9CA3AF' : (exportSuccess ? '#10B981' : '#F59E0B'),
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.7 : 1,
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isExporting ? (
              <>
                <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                エクスポート中...
              </>
            ) : exportSuccess ? (
              <>
                ✅ CSVエクスポート完了
              </>
            ) : (
              <>
                📥 CSVエクスポート
              </>
            )}
          </button>
          <button
            onClick={onClose}
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
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

