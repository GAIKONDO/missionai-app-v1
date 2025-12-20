'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import dynamic from 'next/dynamic';

// 3Dグラフは動的インポート（SSRを無効化）
const ForceGraph3D = dynamic(
  () => import('react-force-graph-3d'),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
        3Dグラフを読み込み中...
      </div>
    ),
  }
);

interface KnowledgeGraph3DProps {
  entities: Entity[];
  relations: Relation[];
  isLoading: boolean;
  onEntityClick?: (entity: Entity) => void;
  maxNodes?: number; // 最大ノード数（パフォーマンス最適化用）
  highlightedEntityId?: string | null; // ハイライト表示するエンティティID
  highlightedRelationId?: string | null; // ハイライト表示するリレーションID
}

export default function KnowledgeGraph3D({ entities, relations, isLoading, onEntityClick, maxNodes = 1000, highlightedEntityId, highlightedRelationId }: KnowledgeGraph3DProps) {
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  
  // 前回のエンティティIDとリレーションIDを保存（無限ループ防止）
  const prevEntityIdsRef = useRef<string>('');
  const prevRelationIdsRef = useRef<string>('');
  const prevHighlightedEntityIdRef = useRef<string | null | undefined>(undefined);
  const prevHighlightedRelationIdRef = useRef<string | null | undefined>(undefined);

  // エンティティタイプに応じた色
  const getEntityColor = (type: string): string => {
    const colors: Record<string, string> = {
      'person': '#3B82F6',      // 青
      'company': '#10B981',      // 緑
      'product': '#F59E0B',      // オレンジ
      'project': '#8B5CF6',      // 紫
      'organization': '#EC4899', // ピンク
      'location': '#06B6D4',     // シアン
      'technology': '#6366F1',   // インディゴ
      'other': '#6B7280',        // グレー
    };
    return colors[type] || colors['other'];
  };

  // エンティティIDとリレーションIDの文字列を生成（変更検知用）
  const entityIdsString = useMemo(() => {
    return entities.map(e => e.id).sort().join(',');
  }, [entities]);
  
  const relationIdsString = useMemo(() => {
    return relations.map(r => r.id).sort().join(',');
  }, [relations]);

  // グラフデータの準備（パフォーマンス最適化）
  useEffect(() => {
    if (isLoading || entities.length === 0) {
      setGraphData({ nodes: [], links: [] });
      prevEntityIdsRef.current = '';
      prevRelationIdsRef.current = '';
      prevHighlightedEntityIdRef.current = highlightedEntityId;
      prevHighlightedRelationIdRef.current = highlightedRelationId;
      return;
    }

    // 変更検知：ID文字列とハイライトIDが同じ場合はスキップ
    const entityIdsChanged = prevEntityIdsRef.current !== entityIdsString;
    const relationIdsChanged = prevRelationIdsRef.current !== relationIdsString;
    const highlightedEntityChanged = prevHighlightedEntityIdRef.current !== highlightedEntityId;
    const highlightedRelationChanged = prevHighlightedRelationIdRef.current !== highlightedRelationId;
    
    if (!entityIdsChanged && !relationIdsChanged && !highlightedEntityChanged && !highlightedRelationChanged) {
      // 変更がない場合はスキップ
      return;
    }

    // ノード数制限チェック
    const nodeCount = entities.length;
    const shouldLimitNodes = maxNodes > 0 && nodeCount > maxNodes;
    const displayEntities = shouldLimitNodes ? entities.slice(0, maxNodes) : entities;
    const displayEntityIds = new Set(displayEntities.map(e => e.id));
    const displayRelations = relations.filter(r => 
      displayEntityIds.has(r.sourceEntityId || '') && 
      displayEntityIds.has(r.targetEntityId || '')
    );

    const nodes = displayEntities.map(entity => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      color: highlightedEntityId === entity.id ? '#3B82F6' : getEntityColor(entity.type), // ハイライト時は青
      val: highlightedEntityId === entity.id ? 15 : 10, // ハイライト時は大きく
      opacity: highlightedEntityId && highlightedEntityId !== entity.id ? 0.3 : 1.0, // ハイライト時は他を半透明
    }));

    // エンティティIDからノードへのマッピング
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    // リンクデータの準備（source/targetをノードオブジェクトに変換）
    const links: any[] = [];
    for (const relation of displayRelations) {
      if (!relation.sourceEntityId || !relation.targetEntityId) {
        continue;
      }
      const sourceNode = nodeMap.get(relation.sourceEntityId);
      const targetNode = nodeMap.get(relation.targetEntityId);
      if (!sourceNode || !targetNode) {
        continue;
      }
      links.push({
        source: sourceNode,
        target: targetNode,
        type: relation.relationType,
        description: relation.description,
        color: highlightedRelationId === relation.id ? '#3B82F6' : '#999', // ハイライト時は青
        opacity: highlightedRelationId && highlightedRelationId !== relation.id ? 0.2 : 0.6, // ハイライト時は他を半透明
        width: highlightedRelationId === relation.id ? 4 : 2, // ハイライト時は太く
      });
    }

    // グラフデータを更新
    setGraphData({ nodes, links });
    
    // 参照を更新
    prevEntityIdsRef.current = entityIdsString;
    prevRelationIdsRef.current = relationIdsString;
    prevHighlightedEntityIdRef.current = highlightedEntityId;
    prevHighlightedRelationIdRef.current = highlightedRelationId;
  }, [entityIdsString, relationIdsString, isLoading, maxNodes, highlightedEntityId, highlightedRelationId]);

  // ノード数制限の警告表示
  const nodeCount = entities.length;
  const shouldLimitNodes = maxNodes > 0 && nodeCount > maxNodes;

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
        読み込み中...
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic' }}>
        エンティティが登録されていません
      </div>
    );
  }

  if (typeof window === 'undefined') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
        3Dグラフを読み込み中...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '600px',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        backgroundColor: '#000000',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ノード数制限の警告 */}
      {shouldLimitNodes && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            zIndex: 1000,
            padding: '8px 12px',
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#92400E',
          }}
        >
          ⚠️ パフォーマンス最適化のため、表示ノード数を{maxNodes}件に制限しています（全{nodeCount}件中）
        </div>
      )}
      
      {ForceGraph3D ? (
        <ForceGraph3D
          graphData={graphData}
          nodeLabel={(node: any) => `${node.name || '不明'} (${node.type || 'other'})`}
          nodeColor={(node: any) => node.color || '#6B7280'}
          nodeOpacity={1.0}
          linkColor={(link: any) => link.color || '#999'}
          linkOpacity={0.6}
          linkWidth={2}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={1}
          nodeVal={(node: any) => node.val || 10}
          onNodeClick={(node: any) => {
            // ノードクリック時の処理
            // graphDataのnodesには既に制限されたエンティティのみが含まれているため、
            // entitiesから直接検索する
            const entity = entities.find(e => e.id === node.id);
            if (entity && onEntityClick) {
              onEntityClick(entity);
            }
          }}
          onLinkClick={(link: any) => {
            // リンククリック時の処理（必要に応じて実装）
            console.log('リンククリック:', link);
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#F9FAFB',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#EF4444' }}>
            ⚠️ 3Dグラフの読み込みに失敗しました
          </div>
          <div style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center' }}>
            ページをリロードするか、2Dグラフ表示をご利用ください。
          </div>
        </div>
      )}
    </div>
  );
}
