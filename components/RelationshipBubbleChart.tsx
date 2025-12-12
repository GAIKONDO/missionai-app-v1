'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { hierarchy, pack } from 'd3-hierarchy';
import type { RelationshipNode, RelationshipLink } from './RelationshipDiagram2D';

interface RelationshipBubbleChartProps {
  nodes: RelationshipNode[];
  links: RelationshipLink[];
  width?: number;
  height?: number;
  onNodeClick?: (node: RelationshipNode) => void;
}

// ノードタイプごとの色設定
const NODE_COLORS = {
  theme: '#1A1A1A',
  organization: '#10B981',
  initiative: '#4262FF',
  topic: '#F59E0B',
};

export default function RelationshipBubbleChart({
  nodes,
  links,
  width = 1200,
  height = 800,
  onNodeClick,
}: RelationshipBubbleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);

  // 階層構造を構築
  const hierarchyData = useMemo(() => {
    // テーマノードを取得
    const themeNodes = nodes.filter(node => node.type === 'theme');
    
    // ノードIDからノードを取得するマップを作成
    const nodeMap = new Map<string, RelationshipNode>();
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });
    
    // リンクから親子関係を構築
    const childrenMap = new Map<string, RelationshipNode[]>();
    
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      if (!childrenMap.has(sourceId)) {
        childrenMap.set(sourceId, []);
      }
      const targetNode = nodeMap.get(targetId);
      if (targetNode) {
        childrenMap.get(sourceId)!.push(targetNode);
      }
    });

    // 階層構造を再帰的に構築
    const buildHierarchy = (node: RelationshipNode, depth: number): any => {
      const children = childrenMap.get(node.id) || [];
      
      // 子ノードをタイプごとに分類
      const orgChildren = children.filter(n => n.type === 'organization');
      const initiativeChildren = children.filter(n => n.type === 'initiative');
      const topicChildren = children.filter(n => n.type === 'topic');
      
      // 組織ノードの子として注力施策を配置
      const orgNodesWithInitiatives = orgChildren.map(orgNode => {
        const orgChildren = childrenMap.get(orgNode.id) || [];
        const initiativeChildren = orgChildren.filter(n => n.type === 'initiative');
        
        // 各注力施策の子としてトピックを配置
        const initiativesWithTopics = initiativeChildren.map(initNode => {
          const initChildren = childrenMap.get(initNode.id) || [];
          const topicChildren = initChildren.filter(n => n.type === 'topic');
          
          return {
            name: initNode.label,
            id: initNode.id,
            value: 1, // 注力施策の基本値
            depth: depth + 2,
            nodeType: initNode.type,
            originalData: initNode,
            children: topicChildren.length > 0 ? topicChildren.map(topicNode => ({
              name: topicNode.label,
              id: topicNode.id,
              value: 1, // トピックの基本値
              depth: depth + 3,
              nodeType: topicNode.type,
              originalData: topicNode,
            })) : undefined,
          };
        });
        
        return {
          name: orgNode.label,
          id: orgNode.id,
          value: 1, // 組織の基本値
          depth: depth + 1,
          nodeType: orgNode.type,
          originalData: orgNode,
          children: initiativesWithTopics.length > 0 ? initiativesWithTopics : undefined,
        };
      });
      
      return {
        name: node.label,
        id: node.id,
        value: 1, // テーマの基本値
        depth: depth,
        nodeType: node.type,
        originalData: node,
        children: orgNodesWithInitiatives.length > 0 ? orgNodesWithInitiatives : undefined,
      };
    };

    return {
      name: 'root',
      children: themeNodes.map(themeNode => buildHierarchy(themeNode, 1)),
    };
  }, [nodes, links]);

  // 階層データを作成
  const root = useMemo(() => {
    return hierarchy(hierarchyData)
      .sum((d: any) => {
        // 子ノードがある場合は子ノードの合計値を使用
        if (d.children && d.children.length > 0) {
          return d.children.reduce((sum: number, child: any) => sum + (child.value || 1), 0);
        }
        return d.value || 1;
      })
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
  }, [hierarchyData]);

  // Packレイアウトを計算
  const packLayout = useMemo(() => {
    return pack()
      .size([width - 80, height - 80])
      .padding(5);
  }, [width, height]);

  const packedData = useMemo(() => {
    return packLayout(root as any);
  }, [packLayout, root]);

  // 深さに応じた色を取得
  const getColorByDepth = (depth: number, nodeType: string): string => {
    if (nodeType === 'theme') {
      return NODE_COLORS.theme;
    } else if (nodeType === 'organization') {
      return NODE_COLORS.organization;
    } else if (nodeType === 'initiative') {
      return NODE_COLORS.initiative;
    } else if (nodeType === 'topic') {
      return NODE_COLORS.topic;
    }
    return '#808080';
  };

  useEffect(() => {
    if (!svgRef.current || !packedData) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    // シャドウフィルターを定義
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'bubble-shadow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');
    
    const feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
    feDropShadow.setAttribute('dx', '0');
    feDropShadow.setAttribute('dy', '2');
    feDropShadow.setAttribute('stdDeviation', '3');
    feDropShadow.setAttribute('flood-opacity', '0.15');
    feDropShadow.setAttribute('flood-color', '#000000');
    
    filter.appendChild(feDropShadow);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // オフセットを計算
    const offsetX = 40;
    const offsetY = 40;

    // ノードを描画
    packedData.descendants().forEach((node: any) => {
      if (!node.r) return;

      const nodeData = node.data;
      const depth = nodeData.depth || node.depth;
      const nodeType = nodeData.nodeType;
      const isHovered = hoveredNodeId === nodeData.id;
      const isLeaf = !node.children || node.children.length === 0;
      const isRoot = depth === 0;

      // ルートノードはスキップ
      if (isRoot) return;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(node.x + offsetX));
      circle.setAttribute('cy', String(node.y + offsetY));
      circle.setAttribute('r', String(node.r));
      
      const color = getColorByDepth(depth, nodeType);
      
      // テーマノード
      if (nodeType === 'theme') {
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.15' : '0.08');
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', isHovered ? '1.5' : '1');
        circle.setAttribute('stroke-dasharray', '8,4');
      } else if (nodeType === 'organization') {
        // 組織ノード
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.85' : '0.75');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('filter', 'url(#bubble-shadow)');
      } else if (nodeType === 'initiative') {
        // 注力施策ノード
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.8' : '0.7');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('filter', 'url(#bubble-shadow)');
      } else if (nodeType === 'topic') {
        // トピックノード
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.9' : '0.8');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('filter', 'url(#bubble-shadow)');
      }
      
      circle.style.cursor = 'pointer';
      circle.setAttribute('data-node-id', nodeData.id);

      // ホバーエフェクトとツールチップ
      circle.addEventListener('mouseenter', (e) => {
        setHoveredNodeId(nodeData.id);
        
        // ツールチップの内容を構築
        const nodeInfo = nodeData.originalData as RelationshipNode;
        let tooltipContent = nodeData.name || '';
        
        // ノードタイプに応じた追加情報を表示
        if (nodeType === 'theme') {
          tooltipContent = `テーマ: ${nodeData.name}`;
        } else if (nodeType === 'organization') {
          tooltipContent = `組織: ${nodeData.name}`;
        } else if (nodeType === 'initiative') {
          tooltipContent = `注力施策: ${nodeData.name}`;
          if (nodeInfo?.data?.description) {
            tooltipContent += `\n${nodeInfo.data.description.substring(0, 100)}${nodeInfo.data.description.length > 100 ? '...' : ''}`;
          }
        } else if (nodeType === 'topic') {
          tooltipContent = `トピック: ${nodeData.name}`;
          if (nodeInfo?.data?.description) {
            tooltipContent += `\n${nodeInfo.data.description.substring(0, 100)}${nodeInfo.data.description.length > 100 ? '...' : ''}`;
          }
        }
        
        // SVGの座標をDOM座標に変換
        if (svgRef.current && containerRef.current) {
          const svgPoint = svgRef.current.createSVGPoint();
          svgPoint.x = node.x + offsetX;
          svgPoint.y = node.y + offsetY - node.r - 10;
          
          setTooltip({
            x: svgPoint.x,
            y: svgPoint.y,
            content: tooltipContent,
          });
        } else {
          setTooltip({
            x: node.x + offsetX,
            y: node.y + offsetY - node.r - 10,
            content: tooltipContent,
          });
        }
      });

      circle.addEventListener('mouseleave', () => {
        setHoveredNodeId(null);
        setTooltip(null);
      });

      circle.addEventListener('click', () => {
        if (onNodeClick && nodeData.originalData) {
          onNodeClick(nodeData.originalData);
        }
      });

      svg.appendChild(circle);

      // ラベルを追加
      const name = nodeData.name || '';
      const minRadiusForLabel = nodeType === 'theme' ? 50 : nodeType === 'organization' ? 30 : nodeType === 'initiative' ? 20 : 12;
      
      if (node.r > minRadiusForLabel && name) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(node.x + offsetX));
        text.setAttribute('y', String(node.y + offsetY));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        
        let fontSize: number;
        let fontWeight: string;
        let fillColor: string;
        
        if (nodeType === 'theme') {
          fontSize = 20;
          fontWeight = '700';
          fillColor = color;
          // テーマはバブルの上に配置
          text.setAttribute('y', String(node.y + offsetY - node.r - 20));
        } else if (nodeType === 'organization') {
          fontSize = 16;
          fontWeight = '600';
          fillColor = color;
          // 組織はバブルの上に配置（外側）
          text.setAttribute('y', String(node.y + offsetY - node.r - 15));
        } else if (nodeType === 'initiative') {
          fontSize = 14;
          fontWeight = '600';
          fillColor = '#ffffff';
          // 注力施策はバブルの内側上部に少しかかる位置に配置
          text.setAttribute('y', String(node.y + offsetY - node.r * 0.7));
        } else {
          fontSize = 12;
          fontWeight = '500';
          fillColor = '#ffffff';
          text.setAttribute('stroke', 'rgba(0,0,0,0.3)');
          text.setAttribute('stroke-width', '0.5');
        }
        
        text.setAttribute('font-size', fontSize + 'px');
        text.setAttribute('font-weight', fontWeight);
        text.setAttribute('fill', fillColor);
        text.style.pointerEvents = 'none';
        text.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
        
        // テキストを適切に表示（長い場合は省略）
        const maxChars = Math.floor(node.r / (fontSize * 0.6));
        if (name.length > maxChars) {
          text.textContent = name.substring(0, maxChars - 1) + '...';
        } else {
          text.textContent = name;
        }
        
        svg.appendChild(text);
      }
    });
  }, [packedData, hoveredNodeId, onNodeClick, width, height]);

  if (nodes.length === 0) {
    return (
      <div style={{ 
        padding: '60px', 
        textAlign: 'center', 
        color: '#808080',
        fontSize: '14px',
        backgroundColor: '#FAFAFA',
        borderRadius: '8px',
        border: '1px dashed #E0E0E0',
      }}>
        表示するデータがありません
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#F8FAFC', overflow: 'auto' }}>
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px',
        minHeight: height,
        position: 'relative',
      }}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
          xmlns="http://www.w3.org/2000/svg"
        />
        {tooltip && svgRef.current && (
          <div
            style={{
              position: 'absolute',
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: 'translate(-50%, -100%)',
              background: 'rgba(26, 26, 26, 0.95)',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              pointerEvents: 'none',
              zIndex: 1000,
              maxWidth: '280px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              whiteSpace: 'pre-line',
              fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
              lineHeight: '1.5',
            }}
          >
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
}
