import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import { zoom, zoomIdentity } from 'd3-zoom';
import type { RelationshipNode, RelationshipLink } from '../types';
import type { TopicInfo } from '@/lib/orgApi';
import { DESIGN } from '../constants';
import { wrapText, getNodeRadius, getCollisionRadius } from '../utils';

interface UseGraphSimulationProps {
  svgRef: React.RefObject<SVGSVGElement>;
  filteredNodes: RelationshipNode[];
  filteredLinks: RelationshipLink[];
  width: number;
  height: number;
  onNodeClick?: (node: RelationshipNode) => void;
  selectedThemeId?: string;
  maxNodes: number;
  hoveredNodeId: string | null;
  setHoveredNodeId: (id: string | null) => void;
  setSelectedTopic: (topic: TopicInfo | null) => void;
}

export function useGraphSimulation({
  svgRef,
  filteredNodes,
  filteredLinks,
  width,
  height,
  onNodeClick,
  selectedThemeId,
  maxNodes,
  hoveredNodeId,
  setHoveredNodeId,
  setSelectedTopic,
}: UseGraphSimulationProps) {
  const router = useRouter();
  const simulationRef = useRef<ReturnType<typeof forceSimulation> | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);
  const zoomRef = useRef<ReturnType<typeof zoom> | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0) return;

    // 既存のシミュレーションがあれば停止
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    // マージン設定
    const margin = { top: 60, right: 60, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // ズーム可能なコンテナグループを作成
    const zoomContainer = svg
      .append('g')
      .attr('class', 'zoom-container');

    // メイングループを作成
    const g = zoomContainer
      .append('g')
      .attr('class', 'main-group')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // SVG定義（シャドウフィルター）
    const defs = svg.append('defs');
    const shadowFilter = defs
      .append('filter')
      .attr('id', 'diagramShadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    shadowFilter
      .append('feGaussianBlur')
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', '1.5')
      .attr('result', 'blur');
    shadowFilter
      .append('feOffset')
      .attr('in', 'blur')
      .attr('dx', '0')
      .attr('dy', '1')
      .attr('result', 'offsetBlur');
    const feMerge = shadowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'offsetBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // ノードとリンクのコピーを作成（シミュレーション用）
    // 階層構造に基づいた初期配置
    const centerX = innerWidth / 2;
    const centerY = innerHeight / 2;
    
    // ノードを階層ごとに分類
    const parentNodes = filteredNodes.filter(n => n.data?.isParent);
    const themeNodes = filteredNodes.filter(n => n.type === 'theme');
    const organizationNodes = filteredNodes.filter(n => n.type === 'organization');
    const initiativeNodes = filteredNodes.filter(n => n.type === 'initiative');
    const topicNodes = filteredNodes.filter(n => n.type === 'topic');
    
    // 階層ごとの半径設定
    const parentRadius = 0; // 親ノードは中心
    const themeRadius = 180; // テーマノードの半径
    const organizationRadius = 320; // 組織ノードの半径
    const initiativeRadius = 450; // 注力施策ノードの半径
    
    const simulationNodes: RelationshipNode[] = filteredNodes.map((node) => {
      // 既存の位置を保持（ドラッグで移動した位置を維持）
      let x: number;
      let y: number;
      
      if (node.x !== undefined && node.y !== undefined) {
        x = node.x;
        y = node.y;
      } else {
      // 階層に基づいた初期配置
        x = centerX;
        y = centerY;
      
      if (node.data?.isParent) {
        // 親ノードは中心に配置
        x = centerX;
        y = centerY;
      } else if (node.type === 'theme') {
        // テーマノードを円形に配置
        const index = themeNodes.findIndex(n => n.id === node.id);
        const angle = (index / themeNodes.length) * 2 * Math.PI - Math.PI / 2; // 上から開始
        x = centerX + themeRadius * Math.cos(angle);
        y = centerY + themeRadius * Math.sin(angle);
      } else if (node.type === 'organization') {
        // 組織ノードを円形に配置
        const index = organizationNodes.findIndex(n => n.id === node.id);
        const angle = (index / organizationNodes.length) * 2 * Math.PI - Math.PI / 2;
        x = centerX + organizationRadius * Math.cos(angle);
        y = centerY + organizationRadius * Math.sin(angle);
      } else if (node.type === 'initiative') {
        // 注力施策ノードを円形に配置
        const index = initiativeNodes.findIndex(n => n.id === node.id);
        const angle = (index / initiativeNodes.length) * 2 * Math.PI - Math.PI / 2;
        x = centerX + initiativeRadius * Math.cos(angle);
        y = centerY + initiativeRadius * Math.sin(angle);
        } else if (node.type === 'topic') {
          // トピックノードは注力施策ノードの近くに配置（後でforce simulationで調整）
          const index = topicNodes.findIndex(n => n.id === node.id);
          const angle = (index / Math.max(topicNodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
          x = centerX + (initiativeRadius + 50) * Math.cos(angle);
          y = centerY + (initiativeRadius + 50) * Math.sin(angle);
        }
      }
      
      // 新しいオブジェクトを作成し、D3.jsのプロパティを変更可能にする
      const simNode: RelationshipNode = {
        id: node.id,
        label: node.label,
        type: node.type,
        data: node.data,
        x: x,
        y: y,
        fx: node.data?.isParent ? centerX : undefined,
        fy: node.data?.isParent ? centerY : undefined,
      };
      
      return simNode;
    });
    
    // 親ノードを固定位置に設定（シミュレーション開始時に固定を解除）
    setTimeout(() => {
      parentNodes.forEach(parentNode => {
        const simNode = simulationNodes.find(n => n.id === parentNode.id);
        if (simNode) {
          simNode.fx = null;
          simNode.fy = null;
        }
      });
    }, 1000); // 1秒後に固定を解除して自然な配置に

    // リンクをシミュレーション用に変換（forceLinkがノードオブジェクトに変換する）
    interface SimulationLink {
      source: RelationshipNode;
      target: RelationshipNode;
      type: 'main' | 'branch' | 'topic';
    }
    
    const simulationLinks: SimulationLink[] = filteredLinks
      .map((link) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      const sourceNode = simulationNodes.find(n => n.id === sourceId);
      const targetNode = simulationNodes.find(n => n.id === targetId);
      if (!sourceNode || !targetNode) {
          console.warn(`⚠️ [RelationshipDiagram2D] リンクが存在しないノードを参照しています: ${sourceId} -> ${targetId}`, {
            sourceExists: !!sourceNode,
            targetExists: !!targetNode,
            sourceId,
            targetId,
            linkType: link.type,
            allNodeIds: simulationNodes.map(n => n.id).slice(0, 10),
          });
          return null; // 無効なリンクはnullを返す
      }
      return {
        source: sourceNode,
        target: targetNode,
          type: (link.type || 'main') as 'main' | 'branch' | 'topic',
      };
      })
      .filter((link): link is SimulationLink => link !== null); // nullを除外

    // フォースシミュレーションを作成（パフォーマンス最適化）
    // ノード数に応じてパラメータを調整
    const nodeCount = simulationNodes.length;
    const linkCount = simulationLinks.length;
    
    // ノード数が多い場合は、シミュレーションのパラメータを調整
    const baseChargeStrength = -200;
    const chargeStrengthMultiplier = nodeCount > 500 ? 0.7 : (nodeCount > 200 ? 0.85 : 1.0);
    const linkDistanceMultiplier = nodeCount > 500 ? 0.9 : 1.0;
    const alphaDecayValue = nodeCount > 500 ? 0.08 : (nodeCount > 200 ? 0.06 : 0.05);
    const maxIterations = nodeCount > 500 ? 150 : (nodeCount > 200 ? 200 : 300);
    
    const simulation = forceSimulation<RelationshipNode>(simulationNodes)
      .force('link', forceLink<RelationshipNode, SimulationLink>(simulationLinks)
        .id((d) => d.id)
        .distance((link) => {
          // リンクタイプ別の距離設定（ノードサイズに応じて調整）
          let baseDistance = 150;
          if (link.type === 'main') baseDistance = 200; // テーマ-組織間（大-中）
          else if (link.type === 'branch') baseDistance = 120; // 組織-注力施策間（中-小）
          else if (link.type === 'topic') baseDistance = 80; // 注力施策-個別トピック間（小-最小）
          return baseDistance * linkDistanceMultiplier;
        })
        .strength(0.8) // リンクの強度を上げて階層構造を維持
      )
      .force('charge', forceManyBody().strength((d: any) => {
        // ノードタイプ別の反発力（サイズに応じて調整）
        let baseStrength = -200;
        if (d.data?.isParent) baseStrength = -1000; // 親：非常に強い反発力
        else if (d.type === 'theme') baseStrength = -600; // 大：強い反発力
        else if (d.type === 'organization') baseStrength = -400; // 中：中程度の反発力
        else if (d.type === 'initiative') baseStrength = -250; // 小：弱い反発力
        else if (d.type === 'topic') baseStrength = -150; // 最小：弱い反発力
        return baseStrength * chargeStrengthMultiplier;
      }))
      .force('center', forceCenter(innerWidth / 2, innerHeight / 2).strength(0.1)) // 中心への引力を弱める
      .force('collision', forceCollide<RelationshipNode>().radius((d) => getCollisionRadius(d)))
      .alphaDecay(alphaDecayValue) // シミュレーションの減衰を調整（ノード数が多い場合は早く収束）
      .velocityDecay(0.6); // 速度の減衰を調整

    simulationRef.current = simulation as any;
    
    // ノード数が多い場合は、シミュレーションの最大反復回数を制限
    if (nodeCount > 200) {
      let iterations = 0;
      simulation.on('tick', () => {
        iterations++;
        if (iterations >= maxIterations) {
          simulation.stop();
        }
      });
    }

    // リンク（接続線）を描画
    const linkElements = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(simulationLinks)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        const isHovered = hoveredNodeId !== null && (
          sourceId === hoveredNodeId || targetId === hoveredNodeId
        );
        return isHovered ? DESIGN.colors.connection.hover : (d.type === 'main' ? DESIGN.colors.connection.main : DESIGN.colors.connection.branch);
      })
      .attr('stroke-width', (d) => d.type === 'main' ? DESIGN.stroke.main : DESIGN.stroke.branch)
      .attr('opacity', (d) => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        const isHovered = hoveredNodeId !== null && (
          sourceId === hoveredNodeId || targetId === hoveredNodeId
        );
        return isHovered ? 1.0 : (d.type === 'main' ? 0.7 : 0.6); // 不透明度を上げて見やすく（0.5→0.7, 0.4→0.6）
      })
      .attr('stroke-dasharray', (d) => d.type === 'branch' ? '3,3' : 'none')
      .lower();

    // ノードグループを作成
    const nodeGroups = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(simulationNodes)
      .enter()
      .append('g')
      .attr('class', (d) => `${d.type}-node`)
      .style('cursor', 'pointer');

    // シャドウレイヤー（ホバー時のみ表示、半径は固定）
    nodeGroups
      .append('circle')
      .attr('class', 'shadow-layer')
      .attr('r', (d) => getNodeRadius(d))
      .attr('fill', 'rgba(0, 0, 0, 0.1)')
      .attr('filter', 'url(#diagramShadow)')
      .attr('transform', 'translate(0, 1)')
      .attr('opacity', 0)
      .style('transition', `opacity ${DESIGN.animation.duration}ms ${DESIGN.animation.easing}`)
      .style('pointer-events', 'none');

    // メインのcircle（半径は固定、スケールのみ変更してホバー効果を出す）
    const circles = nodeGroups
      .append('circle')
      .attr('r', (d) => getNodeRadius(d))
      .attr('fill', (d) => {
        // 親ノードは灰色
        if (d.data?.isParent) return '#808080'; // 灰色
        if (d.type === 'theme') return DESIGN.colors.theme.fill;
        if (d.type === 'organization') return DESIGN.colors.organization.fill;
        if (d.type === 'initiative') return DESIGN.colors.initiative.fill;
        if (d.type === 'topic') return DESIGN.colors.topic.fill;
        return '#CCCCCC';
      })
      .attr('stroke', (d) => {
        // 親ノードは灰色
        if (d.data?.isParent) return '#666666'; // 濃い灰色
        if (d.type === 'theme') return DESIGN.colors.theme.stroke;
        if (d.type === 'organization') return DESIGN.colors.organization.stroke;
        if (d.type === 'initiative') return DESIGN.colors.initiative.stroke;
        if (d.type === 'topic') return DESIGN.colors.topic.stroke;
        return '#999999';
      })
      .attr('stroke-width', DESIGN.stroke.node)
      .style('transition', `fill ${DESIGN.animation.duration}ms ${DESIGN.animation.easing}, transform ${DESIGN.animation.duration}ms ${DESIGN.animation.easing}`)
      .style('pointer-events', 'all')
      .attr('transform', 'scale(1)');

    // テキスト
    const texts = nodeGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => {
        // 親ノードのテキストは白（灰色背景のため）
        if (d.data?.isParent) return '#FFFFFF'; // 白
        if (d.type === 'theme') return DESIGN.colors.theme.text;
        if (d.type === 'organization') return DESIGN.colors.organization.text;
        if (d.type === 'initiative') return DESIGN.colors.initiative.text;
        if (d.type === 'topic') return DESIGN.colors.topic.text;
        return '#000000';
      })
      .attr('font-size', (d) => {
        if (d.type === 'theme') return DESIGN.typography.theme.fontSize;
        if (d.type === 'organization') return DESIGN.typography.organization.fontSize;
        if (d.type === 'initiative') return DESIGN.typography.initiative.fontSize;
        if (d.type === 'topic') return DESIGN.typography.topic.fontSize;
        return '14px';
      })
      .attr('font-weight', (d) => {
        if (d.type === 'theme') return DESIGN.typography.theme.fontWeight;
        if (d.type === 'organization') return DESIGN.typography.organization.fontWeight;
        if (d.type === 'initiative') return DESIGN.typography.initiative.fontWeight;
        if (d.type === 'topic') return DESIGN.typography.topic.fontWeight;
        return '500';
      })
      .attr('font-family', 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
      .attr('pointer-events', 'none')
      .each(function(d) {
        const textElement = select(this);
        const radius = getNodeRadius(d);
        const fontSize = d.type === 'theme' 
          ? parseFloat(DESIGN.typography.theme.fontSize) 
          : d.type === 'organization' 
          ? parseFloat(DESIGN.typography.organization.fontSize)
          : d.type === 'initiative'
          ? parseFloat(DESIGN.typography.initiative.fontSize)
          : d.type === 'topic'
          ? parseFloat(DESIGN.typography.topic.fontSize)
          : 14;
        // 注力施策の場合は8文字を上限として省略表示
        let displayLabel = d.label;
        if (d.type === 'initiative' && d.label.length > 8) {
          displayLabel = d.label.substring(0, 8) + '...';
        }
        const lines = wrapText(displayLabel, radius * 2, fontSize, d.type);
        const lineHeight = fontSize * 1.2;
        
        // 複数行の場合、垂直位置を中央に調整
        const totalHeight = (lines.length - 1) * lineHeight;
        const dyOffset = -totalHeight / 2 + fontSize * 0.35;
        
        // 各行をtspanで追加
        lines.forEach((line, i) => {
          const tspan = textElement
            .append('tspan')
            .attr('x', 0)
            .attr('dy', i === 0 ? `${dyOffset}px` : `${lineHeight}px`)
            .text(line);
        });
      });

    // ダブルクリック処理関数
    const handleDoubleClick = (d: RelationshipNode) => {
      console.log('🔍 [2D関係性図] ダブルクリック検出:', {
        type: d.type,
        id: d.id,
        label: d.label,
        data: d.data,
        organizationId: d.data?.organizationId,
        originalId: d.data?.originalId,
      });
      // 個別トピックのノードの場合、モーダルを表示
      if (d.type === 'topic') {
        // ノードのdataからTopicInfoを取得
        const topicData = d.data as TopicInfo;
        if (topicData) {
          setSelectedTopic(topicData);
        } else {
          console.warn('⚠️ [2D関係性図] トピックデータが見つかりません:', d);
        }
      } else if (d.type === 'initiative') {
        const organizationId = d.data?.organizationId;
        // テーマごとに独立したノードの場合、originalIdを使用
        const initiativeId = d.data?.originalId || d.id;
        console.log('🔍 [2D関係性図] 注力施策ノードを検出:', {
          organizationId,
          initiativeId,
          nodeId: d.id,
          hasOrgId: !!organizationId,
          hasInitId: !!initiativeId,
        });
        if (organizationId && initiativeId) {
          const path = `/organization/initiative?organizationId=${organizationId}&initiativeId=${initiativeId}`;
          console.log('🔍 [2D関係性図] ページ遷移:', path);
          router.push(path);
        } else {
          console.warn('⚠️ [2D関係性図] 組織IDまたは施策IDが不足:', {
            organizationId,
            initiativeId,
          });
        }
      }
    };

    // ドラッグ機能（ノードドラッグ中はズームを無効化）
    const nodeDrag = drag<SVGGElement, RelationshipNode>()
      .on('start', function(event, d) {
        // ドラッグ開始位置を記録
        dragStartPosRef.current = { x: event.x, y: event.y };
        // ドラッグ開始時にズームを無効化
        if (zoomRef.current) {
          svg.on('.zoom', null);
        }
        event.sourceEvent.stopPropagation(); // ズームイベントの伝播を停止
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        select(this).raise();
      })
      .on('drag', function(event, d) {
        event.sourceEvent.stopPropagation(); // ズームイベントの伝播を停止
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', function(event, d) {
        event.sourceEvent.stopPropagation(); // ズームイベントの伝播を停止
        
        // ドラッグ開始位置と終了位置の距離を計算
        if (dragStartPosRef.current) {
          const dx = event.x - dragStartPosRef.current.x;
          const dy = event.y - dragStartPosRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // 移動距離が小さい場合（5px未満）、クリックとして扱う
          if (distance < 5) {
            const now = Date.now();
            const timeSinceLastClick = now - lastClickTimeRef.current;
            
            // ダブルクリック判定（300ms以内の2回目のクリック）
            if (timeSinceLastClick < 300 && clickTimerRef.current) {
              // シングルクリックのタイマーをクリア
              clearTimeout(clickTimerRef.current);
              clickTimerRef.current = null;
              lastClickTimeRef.current = 0;
              // ダブルクリックとして処理
              handleDoubleClick(d);
            } else {
              // シングルクリックのタイマーを設定
              lastClickTimeRef.current = now;
              clickTimerRef.current = setTimeout(() => {
                onNodeClick?.(d);
                clickTimerRef.current = null;
                lastClickTimeRef.current = 0;
              }, 300);
            }
          }
        }
        
        // ドラッグ終了時にズームを再有効化
        if (zoomRef.current) {
          svg.call(zoomRef.current as any);
        }
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        dragStartPosRef.current = null;
      });

    nodeGroups.call(nodeDrag);

    // ホバーイベント
    nodeGroups
      .on('mouseenter', (event, d) => {
        // ホバー状態を更新（シミュレーションの再計算を防ぐため、refも更新）
        hoveredNodeIdRef.current = d.id;
        setHoveredNodeId(d.id);
        // ホバー時に視覚的なスケールと色を変更（シミュレーションには影響しない）
        const nodeGroup = select(event.currentTarget);
        const circle = nodeGroup.select('circle:not(.shadow-layer)');
        circle
          .attr('transform', 'scale(1.1)');
        // 色も変更
        if (d.data?.isParent) circle.attr('fill', '#666666'); // 親ノードのホバー色（濃いグレー）
        else if (d.type === 'theme') circle.attr('fill', DESIGN.colors.theme.hover);
        else if (d.type === 'organization') circle.attr('fill', DESIGN.colors.organization.hover);
        else if (d.type === 'initiative') circle.attr('fill', DESIGN.colors.initiative.hover);
        else if (d.type === 'topic') circle.attr('fill', DESIGN.colors.topic.hover);
        nodeGroup
          .select('.shadow-layer')
          .attr('opacity', 1);
      })
      .on('mouseleave', (event, d) => {
        // ホバー状態をクリア
        hoveredNodeIdRef.current = null;
        setHoveredNodeId(null);
        // ホバー解除時にスケールと色を戻す
        const nodeGroup = select(event.currentTarget);
        const circle = nodeGroup.select('circle:not(.shadow-layer)');
        circle
          .attr('transform', 'scale(1)');
        // 色も戻す
        if (d.data?.isParent) circle.attr('fill', '#808080'); // 親ノードの通常色（灰色）
        else if (d.type === 'theme') circle.attr('fill', DESIGN.colors.theme.fill);
        else if (d.type === 'organization') circle.attr('fill', DESIGN.colors.organization.fill);
        else if (d.type === 'initiative') circle.attr('fill', DESIGN.colors.initiative.fill);
        else if (d.type === 'topic') circle.attr('fill', DESIGN.colors.topic.fill);
        nodeGroup
          .select('.shadow-layer')
          .attr('opacity', 0);
      });

    // シミュレーションのtickイベントでノードとリンクを更新
    simulation.on('tick', () => {
      // リンクを更新（ノードの円周上で接続、半径は固定）
      linkElements.each(function(d: any) {
        const source = typeof d.source === 'object' ? d.source : simulationNodes.find((n: any) => n.id === d.source);
        const target = typeof d.target === 'object' ? d.target : simulationNodes.find((n: any) => n.id === d.target);
        
        if (!source || !target) return;
        
        // 半径は固定（ホバー時も変わらない）
        const sourceRadius = getNodeRadius(source);
        const targetRadius = getNodeRadius(target);
        
        // ノード間の距離と角度を計算
        const dx = target.x! - source.x!;
        const dy = target.y! - source.y!;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        // 単位ベクトル
        const ux = dx / distance;
        const uy = dy / distance;
        
        // 円周上の接続点
        const x1 = source.x! + ux * sourceRadius;
        const y1 = source.y! + uy * sourceRadius;
        const x2 = target.x! - ux * targetRadius;
        const y2 = target.y! - uy * targetRadius;
        
        select(this)
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2);
      });

      // ノードを更新（位置のみ、スケールはCSS transformで制御）
      nodeGroups.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // ズーム機能を設定
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4]) // ズーム範囲: 0.1倍～4倍
      .on('zoom', (event) => {
        zoomContainer.attr('transform', event.transform.toString());
      });

    // SVGにズーム機能を適用
    svg.call(zoomBehavior);
    zoomRef.current = zoomBehavior as any;

    // 初期ズーム位置を中央に設定
    const initialTransform = zoomIdentity
      .translate(width / 2, height / 2)
      .scale(0.8) // 初期スケール80%
      .translate(-width / 2, -height / 2);
    
    svg.call(zoomBehavior.transform, initialTransform);

    // クリーンアップ
    return () => {
      simulation.stop();
      simulationRef.current = null;
      zoomRef.current = null;
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    };
  }, [filteredNodes, filteredLinks, width, height, onNodeClick, selectedThemeId, maxNodes, hoveredNodeId, setHoveredNodeId, setSelectedTopic, router]);

  return {
    simulationRef,
    zoomRef,
  };
}

