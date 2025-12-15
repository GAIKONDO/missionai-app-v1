'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { hierarchy, pack } from 'd3-hierarchy';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';
import type { RelationshipNode, RelationshipLink } from './RelationshipDiagram2D';
import type { TopicInfo, FocusInitiative } from '@/lib/orgApi';

// ReactMarkdown用の共通コンポーネント設定（リンクを新しいタブで開くように）
const markdownComponents = {
  a: ({ node, ...props }: any) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
    />
  ),
};

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
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showTopics, setShowTopics] = useState(false); // 個別トピックの表示/非表示（デフォルト: 非表示）
  const [selectedTopic, setSelectedTopic] = useState<TopicInfo | null>(null); // 選択されたトピック
  const [selectedInitiative, setSelectedInitiative] = useState<FocusInitiative | null>(null); // 選択された注力施策
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
          const topicChildren = showTopics ? initChildren.filter(n => n.type === 'topic') : [];
          
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
  }, [nodes, links, showTopics]);

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
      .padding(10); // paddingを増やしてテーマ間の距離を確保
  }, [width, height]);

  const packedData = useMemo(() => {
    const packed = packLayout(root as any);
    
    // 組織ノードとその注力施策バブルを収集
    const organizationNodes: any[] = [];
    const initiativeNodesByOrg = new Map<any, any[]>();
    
    packed.descendants().forEach((node: any) => {
      const nodeData = node.data;
      const nodeType = nodeData.nodeType;
      const depth = nodeData.depth || node.depth;
      
      if (nodeType === 'organization') {
        organizationNodes.push(node);
      } else if (nodeType === 'initiative') {
        // この注力施策が属する組織を特定（直接の親が組織）
        const parentOrg = node.parent;
        if (parentOrg && parentOrg.data && parentOrg.data.nodeType === 'organization') {
          if (!initiativeNodesByOrg.has(parentOrg)) {
            initiativeNodesByOrg.set(parentOrg, []);
          }
          initiativeNodesByOrg.get(parentOrg)!.push(node);
        }
      }
    });
    
    // 各組織のバブルの内側に注力施策のバブルを配置
    organizationNodes.forEach(orgNode => {
      const initiatives = initiativeNodesByOrg.get(orgNode) || [];
      if (initiatives.length === 0 || !orgNode.r) return;
      
      // 組織のバブルの半径
      const orgRadius = orgNode.r;
      
      // 注力施策のバブルの最大半径を計算
      const maxInitiativeRadius = Math.max(...initiatives.map(init => init.r || 15));
      
      // 組織のバブルの内側に配置するための最大半径（組織の半径の70%程度を確保）
      const maxDistanceFromOrgCenter = orgRadius * 0.7 - maxInitiativeRadius;
      
      // 注力施策が1つの場合
      if (initiatives.length === 1) {
        const initNode = initiatives[0];
        if (initNode.r) {
          // 組織の中心に配置
          initNode.x = orgNode.x;
          initNode.y = orgNode.y;
        }
      } else if (initiatives.length > 1) {
        // 複数の注力施策を組織のバブルの内側に円形に配置
        initiatives.forEach((initNode, index) => {
          if (!initNode.r) return;
          
          // 角度を計算（均等に配置）
          const angle = (index / initiatives.length) * 2 * Math.PI;
          
          // 組織の中心からの距離（組織のバブルの内側に収まるように）
          // 注力施策のバブルが組織のバブルの外に出ないようにする
          const availableRadius = Math.max(0, maxDistanceFromOrgCenter - initNode.r);
          const distanceFromCenter = Math.max(initNode.r + 5, availableRadius * 0.8);
          
          // 新しい位置を計算
          initNode.x = orgNode.x + Math.cos(angle) * distanceFromCenter;
          initNode.y = orgNode.y + Math.sin(angle) * distanceFromCenter;
          
          // 組織のバブルの外に出ていないか確認し、必要に応じて調整
          const distFromOrgCenter = Math.sqrt(
            (initNode.x - orgNode.x) ** 2 + (initNode.y - orgNode.y) ** 2
          );
          const maxAllowedDist = orgRadius - initNode.r - 5; // 5pxのマージン
          
          if (distFromOrgCenter > maxAllowedDist) {
            // 組織のバブルの内側に収まるようにスケールダウン
            const scale = maxAllowedDist / distFromOrgCenter;
            initNode.x = orgNode.x + (initNode.x - orgNode.x) * scale;
            initNode.y = orgNode.y + (initNode.y - orgNode.y) * scale;
          }
        });
      }
    });
    
    // 同じ組織内の注力施策バブルの重なりを解消
    organizationNodes.forEach(orgNode => {
      const initiatives = initiativeNodesByOrg.get(orgNode) || [];
      if (initiatives.length <= 1 || !orgNode.r) return;
      
      const orgRadius = orgNode.r;
      
      // 重なりを解消するための反復処理
      for (let iteration = 0; iteration < 30; iteration++) {
        let hasOverlap = false;
        
        for (let i = 0; i < initiatives.length; i++) {
          const node1 = initiatives[i];
          if (!node1.r) continue;
          
          for (let j = i + 1; j < initiatives.length; j++) {
            const node2 = initiatives[j];
            if (!node2.r) continue;
            
            // 距離を計算
            const dx = node2.x - node1.x;
            const dy = node2.y - node1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDist = node1.r + node2.r + 5; // 5pxの間隔
            
            // 重なっている場合、位置を調整
            if (distance < minDist && distance > 0.1) {
              hasOverlap = true;
              
              // 反発方向を計算
              const angle = Math.atan2(dy, dx);
              const separation = (minDist - distance) / 2;
              
              // 各バブルを組織の中心方向に移動しながら反発
              const dir1x = orgNode.x - node1.x;
              const dir1y = orgNode.y - node1.y;
              const dir1len = Math.sqrt(dir1x * dir1x + dir1y * dir1y);
              
              const dir2x = orgNode.x - node2.x;
              const dir2y = orgNode.y - node2.y;
              const dir2len = Math.sqrt(dir2x * dir2x + dir2y * dir2y);
              
              if (dir1len > 0 && dir2len > 0) {
                // 反発力と組織中心への引力を組み合わせ
                node1.x += (-Math.cos(angle) * separation + (dir1x / dir1len) * separation * 0.3);
                node1.y += (-Math.sin(angle) * separation + (dir1y / dir1len) * separation * 0.3);
                node2.x += (Math.cos(angle) * separation + (dir2x / dir2len) * separation * 0.3);
                node2.y += (Math.sin(angle) * separation + (dir2y / dir2len) * separation * 0.3);
              } else {
                // フォールバック: 単純に反発
                node1.x -= Math.cos(angle) * separation;
                node1.y -= Math.sin(angle) * separation;
                node2.x += Math.cos(angle) * separation;
                node2.y += Math.sin(angle) * separation;
              }
              
              // 組織のバブルの外に出ていないか確認
              [node1, node2].forEach(node => {
                const distFromOrgCenter = Math.sqrt(
                  (node.x - orgNode.x) ** 2 + (node.y - orgNode.y) ** 2
                );
                const maxAllowedDist = orgRadius - node.r - 5;
                
                if (distFromOrgCenter > maxAllowedDist) {
                  const scale = maxAllowedDist / distFromOrgCenter;
                  node.x = orgNode.x + (node.x - orgNode.x) * scale;
                  node.y = orgNode.y + (node.y - orgNode.y) * scale;
                }
              });
            }
          }
        }
        
        if (!hasOverlap) break;
      }
    });
    
    // 注力施策ノードとそのトピックバブルを収集
    const initiativeNodes: any[] = [];
    const topicNodesByInitiative = new Map<any, any[]>();
    
    packed.descendants().forEach((node: any) => {
      const nodeData = node.data;
      const nodeType = nodeData.nodeType;
      
      if (nodeType === 'initiative') {
        initiativeNodes.push(node);
      } else if (nodeType === 'topic') {
        // このトピックが属する注力施策を特定（直接の親が注力施策）
        const parentInitiative = node.parent;
        if (parentInitiative && parentInitiative.data && parentInitiative.data.nodeType === 'initiative') {
          if (!topicNodesByInitiative.has(parentInitiative)) {
            topicNodesByInitiative.set(parentInitiative, []);
          }
          topicNodesByInitiative.get(parentInitiative)!.push(node);
        }
      }
    });
    
    // 各注力施策のバブルの内側にトピックのバブルを配置
    initiativeNodes.forEach(initNode => {
      const topics = topicNodesByInitiative.get(initNode) || [];
      if (topics.length === 0 || !initNode.r) return;
      
      // 注力施策のバブルの半径
      const initRadius = initNode.r;
      
      // トピックのバブルの最大半径を計算
      const maxTopicRadius = Math.max(...topics.map(topic => topic.r || 10));
      
      // 注力施策のバブルの内側に配置するための最大半径（注力施策の半径の70%程度を確保）
      const maxDistanceFromInitCenter = initRadius * 0.7 - maxTopicRadius;
      
      // トピックが1つの場合
      if (topics.length === 1) {
        const topicNode = topics[0];
        if (topicNode.r) {
          // 注力施策の中心に配置
          topicNode.x = initNode.x;
          topicNode.y = initNode.y;
        }
      } else if (topics.length > 1) {
        // 複数のトピックを注力施策のバブルの内側に円形に配置
        topics.forEach((topicNode, index) => {
          if (!topicNode.r) return;
          
          // 角度を計算（均等に配置）
          const angle = (index / topics.length) * 2 * Math.PI;
          
          // 注力施策の中心からの距離（注力施策のバブルの内側に収まるように）
          // トピックのバブルが注力施策のバブルの外に出ないようにする
          const availableRadius = Math.max(0, maxDistanceFromInitCenter - topicNode.r);
          const distanceFromCenter = Math.max(topicNode.r + 3, availableRadius * 0.8);
          
          // 新しい位置を計算
          topicNode.x = initNode.x + Math.cos(angle) * distanceFromCenter;
          topicNode.y = initNode.y + Math.sin(angle) * distanceFromCenter;
          
          // 注力施策のバブルの外に出ていないか確認し、必要に応じて調整
          const distFromInitCenter = Math.sqrt(
            (topicNode.x - initNode.x) ** 2 + (topicNode.y - initNode.y) ** 2
          );
          const maxAllowedDist = initRadius - topicNode.r - 3; // 3pxのマージン
          
          if (distFromInitCenter > maxAllowedDist) {
            // 注力施策のバブルの内側に収まるようにスケールダウン
            const scale = maxAllowedDist / distFromInitCenter;
            topicNode.x = initNode.x + (topicNode.x - initNode.x) * scale;
            topicNode.y = initNode.y + (topicNode.y - initNode.y) * scale;
          }
        });
      }
    });
    
    // 同じ注力施策内のトピックバブルの重なりを解消
    initiativeNodes.forEach(initNode => {
      const topics = topicNodesByInitiative.get(initNode) || [];
      if (topics.length <= 1 || !initNode.r) return;
      
      const initRadius = initNode.r;
      
      // 重なりを解消するための反復処理
      for (let iteration = 0; iteration < 30; iteration++) {
        let hasOverlap = false;
        
        for (let i = 0; i < topics.length; i++) {
          const node1 = topics[i];
          if (!node1.r) continue;
          
          for (let j = i + 1; j < topics.length; j++) {
            const node2 = topics[j];
            if (!node2.r) continue;
            
            // 距離を計算
            const dx = node2.x - node1.x;
            const dy = node2.y - node1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDist = node1.r + node2.r + 3; // 3pxの間隔
            
            // 重なっている場合、位置を調整
            if (distance < minDist && distance > 0.1) {
              hasOverlap = true;
              
              // 反発方向を計算
              const angle = Math.atan2(dy, dx);
              const separation = (minDist - distance) / 2;
              
              // 各バブルを注力施策の中心方向に移動しながら反発
              const dir1x = initNode.x - node1.x;
              const dir1y = initNode.y - node1.y;
              const dir1len = Math.sqrt(dir1x * dir1x + dir1y * dir1y);
              
              const dir2x = initNode.x - node2.x;
              const dir2y = initNode.y - node2.y;
              const dir2len = Math.sqrt(dir2x * dir2x + dir2y * dir2y);
              
              if (dir1len > 0 && dir2len > 0) {
                // 反発力と注力施策中心への引力を組み合わせ
                node1.x += (-Math.cos(angle) * separation + (dir1x / dir1len) * separation * 0.3);
                node1.y += (-Math.sin(angle) * separation + (dir1y / dir1len) * separation * 0.3);
                node2.x += (Math.cos(angle) * separation + (dir2x / dir2len) * separation * 0.3);
                node2.y += (Math.sin(angle) * separation + (dir2y / dir2len) * separation * 0.3);
              } else {
                // フォールバック: 単純に反発
                node1.x -= Math.cos(angle) * separation;
                node1.y -= Math.sin(angle) * separation;
                node2.x += Math.cos(angle) * separation;
                node2.y += Math.sin(angle) * separation;
              }
              
              // 注力施策のバブルの外に出ていないか確認
              [node1, node2].forEach(node => {
                const distFromInitCenter = Math.sqrt(
                  (node.x - initNode.x) ** 2 + (node.y - initNode.y) ** 2
                );
                const maxAllowedDist = initRadius - node.r - 3;
                
                if (distFromInitCenter > maxAllowedDist) {
                  const scale = maxAllowedDist / distFromInitCenter;
                  node.x = initNode.x + (node.x - initNode.x) * scale;
                  node.y = initNode.y + (node.y - initNode.y) * scale;
                }
              });
            }
          }
        }
        
        if (!hasOverlap) break;
      }
    });
    
    return packed;
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

      // 個別トピックの表示/非表示フィルター
      if (!showTopics && nodeType === 'topic') return;

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

      // トピックノードのダブルクリックでモーダルを表示
      if (nodeType === 'topic') {
        circle.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const topicData = nodeData.originalData as RelationshipNode;
          const topicInfo = topicData?.data as TopicInfo;
          
          if (topicInfo) {
            console.log('🔍 [バブルチャート] トピックダブルクリック:', {
              topicId: topicInfo.id,
              topicTitle: topicInfo.title,
              meetingNoteId: topicInfo.meetingNoteId,
              organizationId: topicInfo.organizationId,
            });
            setSelectedTopic(topicInfo);
          } else {
            console.warn('⚠️ [バブルチャート] トピックデータが見つかりません:', {
              topicId: nodeData.id,
              topicData,
            });
          }
        });
      }

      // 注力施策ノードのダブルクリックでモーダルを表示
      if (nodeType === 'initiative') {
        circle.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const initiativeData = nodeData.originalData as RelationshipNode;
          const initiativeInfo = initiativeData?.data as FocusInitiative;
          
          if (initiativeInfo) {
            console.log('🔍 [バブルチャート] 注力施策ダブルクリック:', {
              initiativeId: initiativeInfo.id,
              initiativeTitle: initiativeInfo.title,
              organizationId: initiativeInfo.organizationId,
            });
            setSelectedInitiative(initiativeInfo);
          } else {
            console.warn('⚠️ [バブルチャート] 注力施策データが見つかりません:', {
              initiativeId: nodeData.id,
              initiativeData,
            });
          }
        });
      }

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
      {/* コントロールボタン */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {/* 個別トピックの表示/非表示ボタン */}
        <button
          onClick={() => setShowTopics(!showTopics)}
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: showTopics ? '#3B82F6' : '#FFFFFF',
            border: `1px solid ${showTopics ? '#2563EB' : '#E0E0E0'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: showTopics ? '#FFFFFF' : '#1A1A1A',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
          title={showTopics ? '個別トピックを非表示' : '個別トピックを表示'}
        >
          {showTopics ? '📋' : '📄'}
        </button>
      </div>
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

      {/* 個別トピック詳細モーダル */}
      {selectedTopic && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(44, 62, 80, 0.4) 0%, rgba(30, 41, 59, 0.35) 100%)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => {
            setSelectedTopic(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '1200px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                {selectedTopic.title}
              </h2>
              <button
                onClick={() => {
                  setSelectedTopic(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '4px 8px',
                  lineHeight: 1,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#1a1a1a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#6B7280';
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
              {/* 議事録アーカイブ情報 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                  議事録アーカイブ
                </div>
                <div style={{ fontSize: '16px', color: '#1a1a1a', fontWeight: 500 }}>
                  {selectedTopic.meetingNoteTitle}
                </div>
              </div>
              
              {/* トピック内容 */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600, marginBottom: '12px' }}>
                  内容
                </div>
                {selectedTopic.content ? (
                  <div className="markdown-content" style={{ 
                    padding: '20px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '15px',
                    lineHeight: '1.8',
                    color: '#374151',
                    wordBreak: 'break-word',
                  }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {selectedTopic.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div style={{ 
                    padding: '20px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '15px',
                    color: '#9CA3AF',
                    fontStyle: 'italic',
                    textAlign: 'center',
                  }}>
                    （内容なし）
                  </div>
                )}
              </div>

              {/* メタデータ情報 */}
              {(selectedTopic.semanticCategory || selectedTopic.importance || selectedTopic.keywords?.length || selectedTopic.summary) && (
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>
                    メタデータ
                  </h3>
                  
                  {selectedTopic.semanticCategory && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                        セマンティックカテゴリ
                      </div>
                      <div style={{ fontSize: '15px', color: '#374151' }}>
                        {selectedTopic.semanticCategory}
                      </div>
                    </div>
                  )}
                  
                  {selectedTopic.importance && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                        重要度
                      </div>
                      <div style={{ fontSize: '15px', color: '#374151' }}>
                        {selectedTopic.importance}
                      </div>
                    </div>
                  )}
                  
                  {selectedTopic.keywords && selectedTopic.keywords.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                        キーワード
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedTopic.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: '#EFF6FF',
                              color: '#1E40AF',
                              borderRadius: '12px',
                              fontSize: '13px',
                              fontWeight: 500,
                            }}
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedTopic.summary && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 600, marginBottom: '8px' }}>
                        サマリー
                      </div>
                      <div className="markdown-content" style={{ 
                        fontSize: '15px', 
                        color: '#374151', 
                        lineHeight: '1.8',
                        padding: '16px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        wordBreak: 'break-word',
                      }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {selectedTopic.summary}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 注力施策詳細モーダル */}
      {selectedInitiative && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(44, 62, 80, 0.4) 0%, rgba(30, 41, 59, 0.35) 100%)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => {
            setSelectedInitiative(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '1200px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                {selectedInitiative.title}
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    router.push(`/organization/initiative?organizationId=${selectedInitiative.organizationId}&initiativeId=${selectedInitiative.id}`);
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    color: '#374151',
                    padding: '6px 12px',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                    e.currentTarget.style.borderColor = '#9CA3AF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = '#D1D5DB';
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  詳細を見る
                </button>
                <button
                  onClick={() => {
                    setSelectedInitiative(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '28px',
                    cursor: 'pointer',
                    color: '#6B7280',
                    padding: '4px 8px',
                    lineHeight: 1,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#1a1a1a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#6B7280';
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
              {/* 説明 */}
              {selectedInitiative.description ? (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600, marginBottom: '12px' }}>
                    説明
                  </div>
                  <div className="markdown-content" style={{ 
                    padding: '20px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '15px',
                    lineHeight: '1.8',
                    color: '#374151',
                    wordBreak: 'break-word',
                  }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {selectedInitiative.description}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600, marginBottom: '12px' }}>
                    説明
                  </div>
                  <div style={{ 
                    padding: '20px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '15px',
                    color: '#9CA3AF',
                    fontStyle: 'italic',
                    textAlign: 'center',
                  }}>
                    （説明なし）
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
