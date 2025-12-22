'use client';

import React, { useState } from 'react';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import { ENTITY_TYPE_LABELS, RELATION_TYPE_LABELS } from '../constants';

interface PathSearchModalProps {
  isOpen: boolean;
  topicEntities: Entity[];
  pendingEntities: Entity[] | null;
  topicRelations: Relation[];
  pendingRelations: Relation[] | null;
  onClose: () => void;
}

export default function PathSearchModal({
  isOpen,
  topicEntities,
  pendingEntities,
  topicRelations,
  pendingRelations,
  onClose,
}: PathSearchModalProps) {
  const [pathSearchSource, setPathSearchSource] = useState<Entity | null>(null);
  const [pathSearchTarget, setPathSearchTarget] = useState<Entity | null>(null);
  const [foundPaths, setFoundPaths] = useState<Array<{ path: Entity[]; relations: Relation[] }>>([]);
  const [isSearchingPath, setIsSearchingPath] = useState(false);

  if (!isOpen) return null;

  const allEntities = pendingEntities || topicEntities;
  const allRelations = pendingRelations || topicRelations;

  const handleSearch = async () => {
    if (!pathSearchSource || !pathSearchTarget) {
      alert('開始エンティティと終了エンティティを選択してください');
      return;
    }
    
    if (pathSearchSource.id === pathSearchTarget.id) {
      alert('開始エンティティと終了エンティティが同じです');
      return;
    }
    
    setIsSearchingPath(true);
    setFoundPaths([]);
    
    try {
      // BFS（幅優先探索）でパスを検索
      // グラフを構築
      const graph = new Map<string, Array<{ target: string; relation: Relation }>>();
      for (const relation of allRelations) {
        if (!relation.sourceEntityId || !relation.targetEntityId) continue;
        
        if (!graph.has(relation.sourceEntityId)) {
          graph.set(relation.sourceEntityId, []);
        }
        graph.get(relation.sourceEntityId)!.push({
          target: relation.targetEntityId,
          relation,
        });
      }
      
      // BFSでパスを探索（最大3ホップまで）
      const paths: Array<{ path: Entity[]; relations: Relation[] }> = [];
      const queue: Array<{ entityId: string; path: Entity[]; relations: Relation[]; visited: Set<string> }> = [
        {
          entityId: pathSearchSource.id,
          path: [pathSearchSource],
          relations: [],
          visited: new Set([pathSearchSource.id]),
        },
      ];
      
      while (queue.length > 0 && paths.length < 10) {
        const current = queue.shift()!;
        
        if (current.path.length > 4) continue; // 最大3ホップ
        
        if (current.entityId === pathSearchTarget.id && current.path.length > 1) {
          paths.push({
            path: current.path,
            relations: current.relations,
          });
          continue;
        }
        
        const neighbors = graph.get(current.entityId) || [];
        for (const neighbor of neighbors) {
          if (!current.visited.has(neighbor.target)) {
            const neighborEntity = allEntities.find(e => e.id === neighbor.target);
            if (neighborEntity) {
              queue.push({
                entityId: neighbor.target,
                path: [...current.path, neighborEntity],
                relations: [...current.relations, neighbor.relation],
                visited: new Set([...current.visited, neighbor.target]),
              });
            }
          }
        }
      }
      
      setFoundPaths(paths);
    } catch (error: any) {
      console.error('❌ パス検索エラー:', error);
      alert(`パス検索に失敗しました: ${error.message}`);
    } finally {
      setIsSearchingPath(false);
    }
  };

  const handleClose = () => {
    setPathSearchSource(null);
    setPathSearchTarget(null);
    setFoundPaths([]);
    onClose();
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
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '700px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
          🔍 エンティティ間の関係パス検索
        </h3>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
              開始エンティティ
            </label>
            <select
              value={pathSearchSource?.id || ''}
              onChange={(e) => {
                const entity = allEntities.find(ent => ent.id === e.target.value);
                setPathSearchSource(entity || null);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              <option value="">選択してください</option>
              {allEntities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {ENTITY_TYPE_LABELS[entity.type] || '📌 その他'} {entity.name}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
              終了エンティティ
            </label>
            <select
              value={pathSearchTarget?.id || ''}
              onChange={(e) => {
                const entity = allEntities.find(ent => ent.id === e.target.value);
                setPathSearchTarget(entity || null);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              <option value="">選択してください</option>
              {allEntities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {ENTITY_TYPE_LABELS[entity.type] || '📌 その他'} {entity.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            onClick={handleSearch}
            disabled={isSearchingPath || !pathSearchSource || !pathSearchTarget}
            style={{
              padding: '8px 16px',
              backgroundColor: isSearchingPath || !pathSearchSource || !pathSearchTarget ? '#D1D5DB' : '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: isSearchingPath || !pathSearchSource || !pathSearchTarget ? 'not-allowed' : 'pointer',
            }}
          >
            {isSearchingPath ? '検索中...' : 'パスを検索'}
          </button>
          
          <button
            onClick={handleClose}
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
        
        {foundPaths.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              見つかったパス: {foundPaths.length}件
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {foundPaths.map((pathData, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#6B7280' }}>
                    パス #{index + 1} ({pathData.path.length - 1}ホップ)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    {pathData.path.map((entity, entityIndex) => (
                      <React.Fragment key={`${entity.id}-${entityIndex}`}>
                        <div
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                        >
                          {ENTITY_TYPE_LABELS[entity.type] || '📌 その他'} {entity.name}
                        </div>
                        {entityIndex < pathData.path.length - 1 && pathData.relations[entityIndex] && (
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>
                            → [{RELATION_TYPE_LABELS[pathData.relations[entityIndex]?.relationType] || pathData.relations[entityIndex]?.relationType}]
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {foundPaths.length === 0 && !isSearchingPath && pathSearchSource && pathSearchTarget && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic' }}>
            パスが見つかりませんでした
          </div>
        )}
      </div>
    </div>
  );
}

