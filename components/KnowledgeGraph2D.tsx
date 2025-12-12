'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import { zoom, zoomIdentity } from 'd3-zoom';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';

interface KnowledgeGraph2DProps {
  entities: Entity[];
  relations: Relation[];
  isLoading: boolean;
  onEntityClick?: (entity: Entity) => void;
  maxNodes?: number; // 最大ノード数（パフォーマンス最適化用）
  highlightedEntityId?: string | null; // ハイライト表示するエンティティID
  highlightedRelationId?: string | null; // ハイライト表示するリレーションID
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: GraphNode;
  target: GraphNode;
  type: string;
  description?: string;
}

export default function KnowledgeGraph2D({ entities, relations, isLoading, onEntityClick, maxNodes = 1000, highlightedEntityId, highlightedRelationId }: KnowledgeGraph2DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<any>(null);
  const zoomRef = useRef<any>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const onEntityClickRef = useRef(onEntityClick);
  const [hoveredEntity, setHoveredEntity] = useState<Entity | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  
  // onEntityClickの最新値を保持
  useEffect(() => {
    onEntityClickRef.current = onEntityClick;
  }, [onEntityClick]);

  // ノード数制限チェック（パフォーマンス最適化）
  const displayEntities = useMemo(() => {
    const nodeCount = entities.length;
    const shouldLimitNodes = maxNodes > 0 && nodeCount > maxNodes;
    return shouldLimitNodes ? entities.slice(0, maxNodes) : entities;
  }, [entities, maxNodes]);

  const displayEntityIds = useMemo(() => {
    return new Set(displayEntities.map(e => e.id));
  }, [displayEntities]);

  const displayRelations = useMemo(() => {
    return relations.filter(r => 
      displayEntityIds.has(r.sourceEntityId || '') && 
      displayEntityIds.has(r.targetEntityId || '')
    );
  }, [relations, displayEntityIds]);

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

  // エンティティタイプに応じたアイコン
  const getEntityIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'person': '👤',
      'company': '🏢',
      'product': '📦',
      'project': '📋',
      'organization': '🏛️',
      'location': '📍',
      'technology': '💻',
      'other': '📌',
    };
    return icons[type] || icons['other'];
  };

  useEffect(() => {
    if (isLoading || !svgRef.current || !containerRef.current || displayEntities.length === 0) {
      return;
    }

    const width = containerRef.current.clientWidth;
    const height = 600; // 固定の高さ

    // SVGをクリア
    select(svgRef.current).selectAll('*').remove();

    // SVG設定
    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // ズーム設定
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);
    zoomRef.current = zoomBehavior;

    // グループ要素（ズーム用）
    const g = svg.append('g');

    // ノードとリンクのデータ準備（制限されたエンティティを使用）
    const nodes: GraphNode[] = displayEntities.map(entity => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      color: getEntityColor(entity.type),
      icon: getEntityIcon(entity.type),
    }));

    // エンティティIDからノードへのマッピング
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    const links: GraphLink[] = [];
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
      });
    }

    // リンク（エッジ）
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        // ハイライトされたリレーションかチェック
        if (highlightedRelationId) {
          const relation = relations.find(r => 
            (r.sourceEntityId === (d.source as GraphNode).id && r.targetEntityId === (d.target as GraphNode).id) ||
            (r.sourceEntityId === (d.target as GraphNode).id && r.targetEntityId === (d.source as GraphNode).id)
          );
          if (relation && relation.id === highlightedRelationId) {
            return '#3B82F6'; // ハイライト色
          }
        }
        return '#999';
      })
      .attr('stroke-opacity', (d) => {
        if (highlightedRelationId) {
          const relation = relations.find(r => 
            (r.sourceEntityId === (d.source as GraphNode).id && r.targetEntityId === (d.target as GraphNode).id) ||
            (r.sourceEntityId === (d.target as GraphNode).id && r.targetEntityId === (d.source as GraphNode).id)
          );
          if (relation && relation.id === highlightedRelationId) {
            return 1.0; // ハイライト時は不透明
          }
          return 0.3; // その他は半透明
        }
        return 0.6;
      })
      .attr('stroke-width', (d) => {
        if (highlightedRelationId) {
          const relation = relations.find(r => 
            (r.sourceEntityId === (d.source as GraphNode).id && r.targetEntityId === (d.target as GraphNode).id) ||
            (r.sourceEntityId === (d.target as GraphNode).id && r.targetEntityId === (d.source as GraphNode).id)
          );
          if (relation && relation.id === highlightedRelationId) {
            return 4; // ハイライト時は太く
          }
        }
        return 2;
      })
      .attr('marker-end', 'url(#arrowhead)');

    // 矢印マーカー
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');

    // ノード（円）
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulationRef.current?.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // ノードの円
    const circle = node.append('circle')
      .attr('r', (d) => highlightedEntityId === d.id ? 25 : 20) // ハイライト時は大きく
      .attr('fill', (d) => d.color)
      .attr('stroke', (d) => highlightedEntityId === d.id ? '#3B82F6' : '#fff') // ハイライト時は青い枠
      .attr('stroke-width', (d) => highlightedEntityId === d.id ? 4 : 2) // ハイライト時は太い枠
      .style('cursor', 'pointer')
      .style('opacity', (d) => {
        // ハイライトがある場合、該当しないノードは半透明に
        if (highlightedEntityId && highlightedEntityId !== d.id) {
          return 0.3;
        }
        return 1.0;
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        const entity = displayEntities.find(e => e.id === d.id);
        if (entity && onEntityClickRef.current) {
          onEntityClickRef.current(entity);
        }
      })
      .on('mouseover', (event, d) => {
        const entity = displayEntities.find(e => e.id === d.id);
        if (entity) {
          setHoveredEntity(entity);
          setTooltipPosition({ x: event.pageX, y: event.pageY });
        }
      })
      .on('mousemove', (event) => {
        setTooltipPosition({ x: event.pageX, y: event.pageY });
      })
      .on('mouseout', () => {
        setHoveredEntity(null);
        setTooltipPosition(null);
      });

    // ノードのラベル
    node.append('text')
      .text((d) => d.icon + ' ' + d.name)
      .attr('dx', 25)
      .attr('dy', 5)
      .attr('font-size', '12px')
      .attr('fill', '#1a1a1a')
      .attr('font-weight', '500')
      .style('pointer-events', 'none');

    // フォースシミュレーション（パフォーマンス最適化）
    // ノード数に応じてパラメータを調整
    const nodeCount = nodes.length;
    const linkCount = links.length;
    
    // ノード数が多い場合は、シミュレーションのパラメータを調整
    const chargeStrength = nodeCount > 500 ? -200 : (nodeCount > 200 ? -250 : -300);
    const linkDistance = nodeCount > 500 ? 80 : 100;
    const collisionRadius = nodeCount > 500 ? 25 : 30;
    
    // シミュレーションのアルファ値を調整（ノード数が多い場合は早期収束）
    const alpha = nodeCount > 500 ? 0.3 : (nodeCount > 200 ? 0.5 : 1);
    const alphaDecay = nodeCount > 500 ? 0.05 : 0.0228; // デフォルトは0.0228
    
    const simulation = forceSimulation<GraphNode>(nodes)
      .force('link', forceLink<GraphNode, GraphLink>(links).distance(linkDistance))
      .force('charge', forceManyBody<GraphNode>().strength(chargeStrength))
      .force('center', forceCenter<GraphNode>(width / 2, height / 2))
      .force('collision', forceCollide<GraphNode>().radius(collisionRadius))
      .alpha(alpha)
      .alphaDecay(alphaDecay);

    simulationRef.current = simulation;
    
    // ノード数が多い場合は、シミュレーションの最大反復回数を制限
    if (nodeCount > 500) {
      simulation.stop(); // 一度停止してから再開（初期位置から開始）
      setTimeout(() => {
        simulation.alpha(alpha).restart();
        // 最大反復回数を制限（デフォルトは300）
        let iterations = 0;
        const maxIterations = 150;
        simulation.on('tick', () => {
          iterations++;
          if (iterations >= maxIterations) {
            simulation.stop();
          }
        });
      }, 0);
    }

    // シミュレーションの更新
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // 初期ズーム設定
    const initialTransform = zoomIdentity
      .translate(width / 2, height / 2)
      .scale(0.8)
      .translate(-width / 2, -height / 2);
    svg.call(zoomBehavior.transform, initialTransform);

    return () => {
      simulation.stop();
    };
  }, [displayEntities, displayRelations, isLoading]);

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

  // ノード数制限の警告表示
  const nodeCount = entities.length;
  const shouldLimitNodes = maxNodes > 0 && nodeCount > maxNodes;
  const displayCount = shouldLimitNodes ? maxNodes : nodeCount;

  // 凡例用のエンティティタイプリスト
  const entityTypes = [
    { type: 'person', label: '人', color: getEntityColor('person'), icon: getEntityIcon('person') },
    { type: 'company', label: '会社', color: getEntityColor('company'), icon: getEntityIcon('company') },
    { type: 'product', label: '製品', color: getEntityColor('product'), icon: getEntityIcon('product') },
    { type: 'project', label: 'プロジェクト', color: getEntityColor('project'), icon: getEntityIcon('project') },
    { type: 'organization', label: '組織', color: getEntityColor('organization'), icon: getEntityIcon('organization') },
    { type: 'location', label: '場所', color: getEntityColor('location'), icon: getEntityIcon('location') },
    { type: 'technology', label: '技術', color: getEntityColor('technology'), icon: getEntityIcon('technology') },
    { type: 'other', label: 'その他', color: getEntityColor('other'), icon: getEntityIcon('other') },
  ];

  const entityTypeLabels: Record<string, string> = {
    'person': '👤 人',
    'company': '🏢 会社',
    'product': '📦 製品',
    'project': '📋 プロジェクト',
    'organization': '🏛️ 組織',
    'location': '📍 場所',
    'technology': '💻 技術',
    'other': '📌 その他',
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* ノード数制限の警告 */}
      {shouldLimitNodes && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: '6px',
            marginBottom: '8px',
            fontSize: '12px',
            color: '#92400E',
          }}
        >
          ⚠️ パフォーマンス最適化のため、表示ノード数を{maxNodes}件に制限しています（全{nodeCount}件中）
        </div>
      )}
      
      {/* 凡例 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px',
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '8px 8px 0 0',
          marginBottom: '0',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginRight: '8px' }}>
          凡例:
        </div>
        {entityTypes.map((item) => (
          <div
            key={item.type}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#1a1a1a',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: item.color,
                border: '1px solid #fff',
                flexShrink: 0,
              }}
            />
            <span>{item.icon} {item.label}</span>
          </div>
        ))}
      </div>
      {/* グラフ */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '600px',
          border: '1px solid #E5E7EB',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
        }}
      >
        <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab' }} />
      </div>
      
      {/* ツールチップ */}
      {hoveredEntity && tooltipPosition && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y + 10}px`,
            backgroundColor: '#1a1a1a',
            color: '#FFFFFF',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            maxWidth: '250px',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            {entityTypeLabels[hoveredEntity.type] || '📌 その他'} {hoveredEntity.name}
          </div>
          {hoveredEntity.aliases && hoveredEntity.aliases.length > 0 && (
            <div style={{ fontSize: '11px', color: '#D1D5DB', marginTop: '4px' }}>
              別名: {hoveredEntity.aliases.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
