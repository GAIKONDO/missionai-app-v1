import { useEffect } from 'react';
import type { RelationshipNode } from '../../RelationshipDiagram2D';
import type { TopicInfo, FocusInitiative } from '@/lib/orgApi';
import { getColorByDepth } from '../utils/nodeColors';

interface UseBubbleChartRenderingProps {
  svgRef: React.RefObject<SVGSVGElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  packedData: any;
  hoveredNodeId: string | null;
  showTopics: boolean;
  width: number;
  height: number;
  onNodeClick?: (node: RelationshipNode) => void;
  setHoveredNodeId: (id: string | null) => void;
  setTooltip: (tooltip: { x: number; y: number; content: string } | null) => void;
  setSelectedTopic: (topic: TopicInfo | null) => void;
  setSelectedInitiative: (initiative: FocusInitiative | null) => void;
}

export function useBubbleChartRendering({
  svgRef,
  containerRef,
  packedData,
  hoveredNodeId,
  showTopics,
  width,
  height,
  onNodeClick,
  setHoveredNodeId,
  setTooltip,
  setSelectedTopic,
  setSelectedInitiative,
}: UseBubbleChartRenderingProps) {
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
      } else if (nodeType === 'organization' || nodeType === 'company') {
        // 組織/事業会社ノード
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
        } else if (nodeType === 'company') {
          tooltipContent = `事業会社: ${nodeData.name}`;
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
      const minRadiusForLabel = nodeType === 'theme' ? 50 : (nodeType === 'organization' || nodeType === 'company') ? 30 : nodeType === 'initiative' ? 20 : 12;
      
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
        } else if (nodeType === 'organization' || nodeType === 'company') {
          fontSize = 16;
          fontWeight = '600';
          fillColor = color;
          // 組織/事業会社はバブルの上に配置（外側）
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
  }, [packedData, hoveredNodeId, showTopics, width, height, onNodeClick, setHoveredNodeId, setTooltip, setSelectedTopic, setSelectedInitiative, svgRef, containerRef]);
}

