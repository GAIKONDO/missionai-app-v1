'use client';

import { useState } from 'react';
import { getAllEntities } from '@/lib/entityApi';
import { getAllRelations } from '@/lib/relationApi';
import { checkAllEmbeddings } from '@/lib/checkEmbeddings';

interface EmbeddingStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  embeddingStats: any;
  selectedOrganizationId: string;
  onStatsUpdate: (stats: any) => void;
  actualEntityCount: number | null;
  actualRelationCount: number | null;
  onCountsUpdate: (entityCount: number | null, relationCount: number | null) => void;
}

export default function EmbeddingStatsModal({
  isOpen,
  onClose,
  embeddingStats,
  selectedOrganizationId,
  onStatsUpdate,
  actualEntityCount,
  actualRelationCount,
  onCountsUpdate,
}: EmbeddingStatsModalProps) {
  if (!isOpen || !embeddingStats) return null;

  const handleShowAllOrganizations = async () => {
    try {
      const [entities, relations] = await Promise.all([
        getAllEntities(),
        getAllRelations(),
      ]);
      onCountsUpdate(entities.length, relations.length);
      
      const stats = await checkAllEmbeddings(undefined);
      onStatsUpdate(stats);
    } catch (error) {
      console.error('埋め込みベクトル統計の取得に失敗しました:', error);
      alert('埋め込みベクトル統計の取得に失敗しました。コンソールを確認してください。');
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
          maxWidth: '900px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
            埋め込みベクトル統計
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleShowAllOrganizations}
              style={{
                padding: '6px 12px',
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
              title="すべての組織の埋め込みを確認"
            >
              全組織表示
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '4px 8px',
                backgroundColor: '#F3F4F6',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>
        {selectedOrganizationId && (
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#EFF6FF', 
            borderRadius: '6px', 
            marginBottom: '16px',
            fontSize: '12px',
            color: '#1E40AF'
          }}>
            ⚠️ 現在、組織ID「{selectedOrganizationId}」でフィルタリングされています。「全組織表示」ボタンをクリックすると、すべての組織の埋め込みを確認できます。
          </div>
        )}

        {/* エンティティ埋め込み */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>エンティティ埋め込み</h3>
          {(actualEntityCount !== null || embeddingStats.entities.actualTotal !== undefined) && (
            <div style={{ 
              padding: '8px 12px', 
              backgroundColor: (actualEntityCount ?? embeddingStats.entities.actualTotal ?? 0) > embeddingStats.entities.total ? '#FEF3C7' : '#F0FDF4', 
              borderRadius: '6px', 
              marginBottom: '12px',
              fontSize: '12px',
              color: (actualEntityCount ?? embeddingStats.entities.actualTotal ?? 0) > embeddingStats.entities.total ? '#92400E' : '#065F46'
            }}>
              {(actualEntityCount ?? embeddingStats.entities.actualTotal ?? 0) > embeddingStats.entities.total ? (
                <>⚠️ 実際のエンティティ総数: {actualEntityCount ?? embeddingStats.entities.actualTotal ?? 0}件（埋め込みが生成されていないエンティティ: {(actualEntityCount ?? embeddingStats.entities.actualTotal ?? 0) - embeddingStats.entities.total}件）</>
              ) : (
                <>✅ 実際のエンティティ総数: {actualEntityCount ?? embeddingStats.entities.actualTotal ?? 0}件（すべて埋め込み済み）</>
              )}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みテーブル総数</div>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>{embeddingStats.entities.total}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みあり</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#16A34A' }}>{embeddingStats.entities.withEmbeddings}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みなし</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#DC2626' }}>{embeddingStats.entities.withoutEmbeddings}</div>
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>次元数分布:</div>
            <pre style={{ fontSize: '12px', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(embeddingStats.entities.dimensions, null, 2)}
            </pre>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>モデル分布:</div>
            <pre style={{ fontSize: '12px', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(embeddingStats.entities.models, null, 2)}
            </pre>
          </div>
        </div>

        {/* リレーション埋め込み */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>リレーション埋め込み</h3>
          {(actualRelationCount !== null || embeddingStats.relations.actualTotal !== undefined) && (
            <div style={{ 
              padding: '8px 12px', 
              backgroundColor: (actualRelationCount ?? embeddingStats.relations.actualTotal ?? 0) > embeddingStats.relations.total ? '#FEF3C7' : '#F0FDF4', 
              borderRadius: '6px', 
              marginBottom: '12px',
              fontSize: '12px',
              color: (actualRelationCount ?? embeddingStats.relations.actualTotal ?? 0) > embeddingStats.relations.total ? '#92400E' : '#065F46'
            }}>
              {(actualRelationCount ?? embeddingStats.relations.actualTotal ?? 0) > embeddingStats.relations.total ? (
                <>⚠️ 実際のリレーション総数: {actualRelationCount ?? embeddingStats.relations.actualTotal ?? 0}件（埋め込みが生成されていないリレーション: {(actualRelationCount ?? embeddingStats.relations.actualTotal ?? 0) - embeddingStats.relations.total}件）</>
              ) : (
                <>✅ 実際のリレーション総数: {actualRelationCount ?? embeddingStats.relations.actualTotal ?? 0}件（すべて埋め込み済み）</>
              )}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みテーブル総数</div>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>{embeddingStats.relations.total}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みあり</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#16A34A' }}>{embeddingStats.relations.withEmbeddings}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みなし</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#DC2626' }}>{embeddingStats.relations.withoutEmbeddings}</div>
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>次元数分布:</div>
            <pre style={{ fontSize: '12px', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(embeddingStats.relations.dimensions, null, 2)}
            </pre>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>モデル分布:</div>
            <pre style={{ fontSize: '12px', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(embeddingStats.relations.models, null, 2)}
            </pre>
          </div>
        </div>

        {/* トピック埋め込み */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>トピック埋め込み</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>総数</div>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>{embeddingStats.topics.total}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みあり</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#16A34A' }}>{embeddingStats.topics.withEmbeddings}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>埋め込みなし</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#DC2626' }}>{embeddingStats.topics.withoutEmbeddings}</div>
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>次元数分布:</div>
            <pre style={{ fontSize: '12px', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(embeddingStats.topics.dimensions, null, 2)}
            </pre>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>モデル分布:</div>
            <pre style={{ fontSize: '12px', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(embeddingStats.topics.models, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

