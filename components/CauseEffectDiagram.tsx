'use client';

import { useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { line, curveBasis } from 'd3-shape';

export interface CauseEffectNode {
  id: string;
  label: string;
  type: 'theme' | 'organization' | 'initiative' | 'element';
  data?: any;
}

export interface CauseEffectLink {
  source: string | CauseEffectNode;
  target: string | CauseEffectNode;
  type?: 'main' | 'branch';
}

interface CauseEffectDiagramProps {
  width?: number;
  height?: number;
  nodes: CauseEffectNode[];
  links: CauseEffectLink[];
  selectedThemeId?: string;
  onNodeClick?: (node: CauseEffectNode) => void;
}

// Miro/Figma風デザインシステム
const MIRO_DESIGN = {
  colors: {
    // フラットなカラー（グラデーションなし）
    theme: {
      fill: '#1A1A1A',           // ダークグレー（最重要）
      stroke: '#000000',         // 黒のボーダー
      text: '#FFFFFF',
      hover: '#2D2D2D',
    },
    organization: {
      fill: '#10B981',           // 緑（組織）
      stroke: '#059669',
      text: '#FFFFFF',
      hover: '#34D399',
    },
    initiative: {
      fill: '#4262FF',           // Miroブルー
      stroke: '#2E4ED8',
      text: '#FFFFFF',
      hover: '#5C7AFF',
    },
    element: {
      fill: '#FFFFFF',           // 白背景
      stroke: '#E0E0E0',         // ライトグレーのボーダー
      text: '#1A1A1A',           // ダークテキスト
      hover: '#F5F5F5',
    },
    // 接続線
    connection: {
      main: '#C4C4C4',           // ミディアムグレー
      branch: '#E0E0E0',         // ライトグレー
      hover: '#808080',          // ダークグレー（ホバー時）
    },
    // 背景
    background: {
      base: '#FFFFFF',           // 純白
      grid: '#F8F8F8',           // グリッド用（オプション）
    },
  },
  // タイポグラフィ（Miro/Figma風）
  typography: {
    theme: {
      fontSize: '16px',
      fontWeight: '600',
      lineHeight: 1.5,
      letterSpacing: '-0.01em',
    },
    organization: {
      fontSize: '14px',
      fontWeight: '600',
      lineHeight: 1.5,
      letterSpacing: '0',
    },
    initiative: {
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: 1.5,
      letterSpacing: '0',
    },
    element: {
      fontSize: '12px',
      fontWeight: '400',
      lineHeight: 1.4,
      letterSpacing: '0',
    },
  },
  // スペーシング
  spacing: {
    nodePadding: {
      theme: { x: 20, y: 10 },
      organization: { x: 16, y: 8 },
      initiative: { x: 16, y: 8 },
      element: { x: 12, y: 6 },
    },
    radius: {
      theme: 6,                  // 控えめな角丸
      organization: 6,
      initiative: 6,
      element: 4,
    },
  },
  // シャドウ（Miro/Figma風：非常に控えめ）
  shadows: {
    default: '0 1px 3px rgba(0, 0, 0, 0.1)',
    hover: '0 2px 8px rgba(0, 0, 0, 0.15)',
    selected: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  // 線の太さ
  stroke: {
    main: 2,                     // メイン接続線
    branch: 1.5,                 // ブランチ線
    node: 1.5,                   // ノードボーダー
  },
  // アニメーション
  animation: {
    duration: 150,               // 150ms（スナッピー）
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export default function CauseEffectDiagram({
  width = 1200,
  height = 800,
  nodes,
  links,
  selectedThemeId,
  onNodeClick,
}: CauseEffectDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    // マージン設定
    const margin = { top: 60, right: 60, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // メイングループを作成
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // SVG定義（シャドウフィルターのみ、グラデーションなし）
    const defs = svg.append('defs');

    // 控えめなシャドウフィルター
    const shadowFilter = defs
      .append('filter')
      .attr('id', 'miroShadow')
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

    // テーマノード（中心）を探す
    const themeNode = nodes.find((n) => n.type === 'theme');
    if (!themeNode) return;

    const centerX = innerWidth / 2;
    const centerY = innerHeight / 2;

    // メインの骨（水平線）を描画（細い線）
    const mainBoneLength = Math.min(innerWidth * 0.3, innerHeight * 0.3);
    g.append('line')
      .attr('x1', centerX - mainBoneLength)
      .attr('y1', centerY)
      .attr('x2', centerX)
      .attr('y2', centerY)
      .attr('stroke', MIRO_DESIGN.colors.connection.main)
      .attr('stroke-width', MIRO_DESIGN.stroke.main)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.6);

    // テーマノードを描画（中心・最重要）
    const themeGroup = g
      .append('g')
      .attr('class', 'theme-node')
      .attr('transform', `translate(${centerX},${centerY})`);

    const isThemeHovered = hoveredNodeId === themeNode.id;
    const themePadding = MIRO_DESIGN.spacing.nodePadding.theme;
    const themeWidth = Math.max(themeNode.label.length * 9 + themePadding.x * 2, 160);
    const themeHeight = 48;

    // シャドウレイヤー（控えめ）
    if (isThemeHovered) {
      themeGroup
        .append('rect')
        .attr('x', -themeWidth / 2)
        .attr('y', -themeHeight / 2)
        .attr('width', themeWidth)
        .attr('height', themeHeight)
        .attr('rx', MIRO_DESIGN.spacing.radius.theme)
        .attr('fill', 'rgba(0, 0, 0, 0.1)')
        .attr('filter', 'url(#miroShadow)')
        .attr('transform', 'translate(0, 1)');
    }

    // メインのrect（フラットな色）
    themeGroup
      .append('rect')
      .attr('x', -themeWidth / 2)
      .attr('y', -themeHeight / 2)
      .attr('width', themeWidth)
      .attr('height', themeHeight)
      .attr('rx', MIRO_DESIGN.spacing.radius.theme)
      .attr('fill', isThemeHovered ? MIRO_DESIGN.colors.theme.hover : MIRO_DESIGN.colors.theme.fill)
      .attr('stroke', MIRO_DESIGN.colors.theme.stroke)
      .attr('stroke-width', MIRO_DESIGN.stroke.node)
      .style('cursor', 'pointer')
      .style('transition', `all ${MIRO_DESIGN.animation.duration}ms ${MIRO_DESIGN.animation.easing}`)
      .attr('transform', `scale(${isThemeHovered ? 1.02 : 1})`);

    // テキスト
    themeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', MIRO_DESIGN.colors.theme.text)
      .attr('font-size', MIRO_DESIGN.typography.theme.fontSize)
      .attr('font-weight', MIRO_DESIGN.typography.theme.fontWeight)
      .attr('font-family', 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
      .attr('letter-spacing', MIRO_DESIGN.typography.theme.letterSpacing)
      .attr('pointer-events', 'none')
      .text(themeNode.label.length > 22 ? themeNode.label.substring(0, 22) + '...' : themeNode.label);

    themeGroup
      .on('click', () => onNodeClick?.(themeNode))
      .on('mouseenter', () => setHoveredNodeId(themeNode.id))
      .on('mouseleave', () => setHoveredNodeId(null));

    // 組織ノードを配置（テーマから放射状に）
    const organizationNodes = nodes.filter((n) => n.type === 'organization');
    const orgAngleStep = organizationNodes.length > 0 ? (Math.PI * 2) / organizationNodes.length : 0;
    const orgRadius = Math.min(innerWidth * 0.25, innerHeight * 0.25);

    // 組織ノードの位置を保存（注力施策から参照するため）
    const orgPositions = new Map<string, { x: number; y: number }>();

    organizationNodes.forEach((orgNode, index) => {
      const angle = (index * orgAngleStep) - Math.PI / 2; // 上から開始
      const x = centerX + Math.cos(angle) * orgRadius;
      const y = centerY + Math.sin(angle) * orgRadius;
      orgPositions.set(orgNode.id, { x, y });

      // テーマから組織への接続線
      const isOrgLinkHovered = hoveredNodeId === orgNode.id || hoveredNodeId === themeNode.id;
      g.append('line')
        .attr('x1', centerX)
        .attr('y1', centerY)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', isOrgLinkHovered ? MIRO_DESIGN.colors.connection.hover : MIRO_DESIGN.colors.connection.main)
        .attr('stroke-width', MIRO_DESIGN.stroke.main)
        .attr('opacity', isOrgLinkHovered ? 0.8 : 0.5)
        .style('transition', `stroke ${MIRO_DESIGN.animation.duration}ms ${MIRO_DESIGN.animation.easing}`);

      // 組織ノードを描画
      const orgGroup = g
        .append('g')
        .attr('class', 'organization-node')
        .attr('transform', `translate(${x},${y})`);

      const isOrgHovered = hoveredNodeId === orgNode.id;
      const orgPadding = MIRO_DESIGN.spacing.nodePadding.organization;
      const orgWidth = Math.max(orgNode.label.length * 7.5 + orgPadding.x * 2, 120);
      const orgHeight = 36;

      // シャドウレイヤー（ホバー時のみ）
      if (isOrgHovered) {
        orgGroup
          .append('rect')
          .attr('x', -orgWidth / 2)
          .attr('y', -orgHeight / 2)
          .attr('width', orgWidth)
          .attr('height', orgHeight)
          .attr('rx', MIRO_DESIGN.spacing.radius.organization)
          .attr('fill', 'rgba(0, 0, 0, 0.08)')
          .attr('filter', 'url(#miroShadow)')
          .attr('transform', 'translate(0, 1)');
      }

      // メインのrect
      orgGroup
        .append('rect')
        .attr('x', -orgWidth / 2)
        .attr('y', -orgHeight / 2)
        .attr('width', orgWidth)
        .attr('height', orgHeight)
        .attr('rx', MIRO_DESIGN.spacing.radius.organization)
        .attr('fill', isOrgHovered ? MIRO_DESIGN.colors.organization.hover : MIRO_DESIGN.colors.organization.fill)
        .attr('stroke', MIRO_DESIGN.colors.organization.stroke)
        .attr('stroke-width', MIRO_DESIGN.stroke.node)
        .style('cursor', 'pointer')
        .style('transition', `all ${MIRO_DESIGN.animation.duration}ms ${MIRO_DESIGN.animation.easing}`)
        .attr('transform', `scale(${isOrgHovered ? 1.03 : 1})`);

      // テキスト
      orgGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 4)
        .attr('fill', MIRO_DESIGN.colors.organization.text)
        .attr('font-size', MIRO_DESIGN.typography.organization.fontSize)
        .attr('font-weight', MIRO_DESIGN.typography.organization.fontWeight)
        .attr('font-family', 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
        .attr('letter-spacing', MIRO_DESIGN.typography.organization.letterSpacing)
        .attr('pointer-events', 'none')
        .text(orgNode.label.length > 16 ? orgNode.label.substring(0, 16) + '...' : orgNode.label);

      orgGroup
        .on('click', () => onNodeClick?.(orgNode))
        .on('mouseenter', () => setHoveredNodeId(orgNode.id))
        .on('mouseleave', () => setHoveredNodeId(null));
    });

    // 注力施策ノードを配置（各組織から放射状に）
    const initiativeNodes = nodes.filter((n) => n.type === 'initiative');
    
    // 組織ごとに注力施策をグループ化
    const initiativesByOrg = new Map<string, typeof initiativeNodes>();
    initiativeNodes.forEach((initNode) => {
      const link = links.find(
        (l) => (typeof l.target === 'string' ? l.target : l.target.id) === initNode.id
      );
      if (link) {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const sourceNode = nodes.find(n => n.id === sourceId);
        if (sourceNode?.type === 'organization') {
          if (!initiativesByOrg.has(sourceId)) {
            initiativesByOrg.set(sourceId, []);
          }
          initiativesByOrg.get(sourceId)!.push(initNode);
        }
      }
    });

    initiativesByOrg.forEach((initNodes, orgId) => {
      const orgPos = orgPositions.get(orgId);
      if (!orgPos) return;

      const angleStep = initNodes.length > 0 ? (Math.PI * 2) / initNodes.length : 0;
      const initRadius = 80; // 組織からの距離

      initNodes.forEach((node, index) => {
        const angle = (index * angleStep) - Math.PI / 2; // 上から開始
        const x = orgPos.x + Math.cos(angle) * initRadius;
        const y = orgPos.y + Math.sin(angle) * initRadius;

        // 組織から注力施策への接続線
        const isLinkHovered = hoveredNodeId === node.id || hoveredNodeId === orgId;
        g.append('line')
          .attr('x1', orgPos.x)
          .attr('y1', orgPos.y)
          .attr('x2', x)
          .attr('y2', y)
          .attr('stroke', isLinkHovered ? MIRO_DESIGN.colors.connection.hover : MIRO_DESIGN.colors.connection.branch)
          .attr('stroke-width', MIRO_DESIGN.stroke.branch)
          .attr('opacity', isLinkHovered ? 0.7 : 0.4)
          .attr('stroke-dasharray', '3,3')
          .style('transition', `stroke ${MIRO_DESIGN.animation.duration}ms ${MIRO_DESIGN.animation.easing}`);

        // 注力施策ノードを描画
        const nodeGroup = g
          .append('g')
          .attr('class', 'initiative-node')
          .attr('transform', `translate(${x},${y})`);

        const isHovered = hoveredNodeId === node.id;
        const initiativePadding = MIRO_DESIGN.spacing.nodePadding.initiative;
        const initiativeWidth = Math.max(node.label.length * 7.5 + initiativePadding.x * 2, 130);
        const initiativeHeight = 40;

        // シャドウレイヤー（ホバー時のみ）
        if (isHovered) {
          nodeGroup
            .append('rect')
            .attr('x', -initiativeWidth / 2)
            .attr('y', -initiativeHeight / 2)
            .attr('width', initiativeWidth)
            .attr('height', initiativeHeight)
            .attr('rx', MIRO_DESIGN.spacing.radius.initiative)
            .attr('fill', 'rgba(0, 0, 0, 0.08)')
            .attr('filter', 'url(#miroShadow)')
            .attr('transform', 'translate(0, 1)');
        }

        // メインのrect（フラットな色）
        nodeGroup
          .append('rect')
          .attr('x', -initiativeWidth / 2)
          .attr('y', -initiativeHeight / 2)
          .attr('width', initiativeWidth)
          .attr('height', initiativeHeight)
          .attr('rx', MIRO_DESIGN.spacing.radius.initiative)
          .attr('fill', isHovered ? MIRO_DESIGN.colors.initiative.hover : MIRO_DESIGN.colors.initiative.fill)
          .attr('stroke', MIRO_DESIGN.colors.initiative.stroke)
          .attr('stroke-width', MIRO_DESIGN.stroke.node)
          .style('cursor', 'pointer')
          .style('transition', `all ${MIRO_DESIGN.animation.duration}ms ${MIRO_DESIGN.animation.easing}`)
          .attr('transform', `scale(${isHovered ? 1.03 : 1})`);

        // テキスト
        nodeGroup
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', 4)
          .attr('fill', MIRO_DESIGN.colors.initiative.text)
          .attr('font-size', MIRO_DESIGN.typography.initiative.fontSize)
          .attr('font-weight', MIRO_DESIGN.typography.initiative.fontWeight)
          .attr('font-family', 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
          .attr('letter-spacing', MIRO_DESIGN.typography.initiative.letterSpacing)
          .attr('pointer-events', 'none')
          .text(node.label.length > 18 ? node.label.substring(0, 18) + '...' : node.label);

        nodeGroup
          .on('click', () => onNodeClick?.(node))
          .on('mouseenter', () => setHoveredNodeId(node.id))
          .on('mouseleave', () => setHoveredNodeId(null));
      });
    });
  }, [nodes, links, width, height, hoveredNodeId, onNodeClick, selectedThemeId]);

  return (
    <div style={{ 
      width: '100%', 
      overflow: 'auto',
      background: MIRO_DESIGN.colors.background.base,
      borderRadius: '8px',
      padding: '32px',
      border: `1px solid ${MIRO_DESIGN.colors.connection.branch}`,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: 'block', margin: '0 auto' }}
      />
    </div>
  );
}
