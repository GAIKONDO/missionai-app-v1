'use client';

import { useEffect, useRef, useMemo } from 'react';
import { scaleOrdinal } from 'd3-scale';
import { select } from 'd3-selection';
import { line, curveBasis } from 'd3-shape';

export interface AlluvialNode {
  id: string;
  label: string;
  value: number;
  category?: string;
}

export interface AlluvialLink {
  source: string;
  target: string;
  value: number;
}

export interface AlluvialDiagramData {
  nodes: {
    left: AlluvialNode[];
    right: AlluvialNode[];
  };
  links: AlluvialLink[];
}

interface AlluvialDiagramProps {
  data: AlluvialDiagramData;
  width?: number;
  height?: number;
  title?: string;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export default function AlluvialDiagram({
  data,
  width = 1000,
  height = 600,
  title,
  margin = { top: 60, right: 150, bottom: 60, left: 150 },
}: AlluvialDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // カテゴリごとの色を設定
  const colorScale = useMemo(() => {
    const categories = Array.from(
      new Set([
        ...data.nodes.left.map(n => n.category || 'default'),
        ...data.nodes.right.map(n => n.category || 'default'),
      ])
    );
    return scaleOrdinal<string>()
      .domain(categories)
      .range([
        '#4A90E2', // 青
        '#50C878', // 緑
        '#FF6B6B', // 赤
        '#FFA500', // オレンジ
        '#9B59B6', // 紫
        '#1ABC9C', // ティール
        '#E74C3C', // ダークレッド
        '#3498DB', // ライトブルー
        '#2ECC71', // ダークグリーン
        '#F39C12', // ダークオレンジ
      ]);
  }, [data]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // メイングループを作成
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // データの正規化
    const totalValue = Math.max(
      data.nodes.left.reduce((sum, n) => sum + n.value, 0),
      data.nodes.right.reduce((sum, n) => sum + n.value, 0)
    );

    // 左側のノードの位置を計算
    const leftNodes = data.nodes.left;
    const leftNodePositions: Map<string, { y0: number; y1: number; y: number; height: number }> = new Map();
    let leftY = 0;

    leftNodes.forEach((node) => {
      const nodeHeight = (node.value / totalValue) * chartHeight;
      const y0 = leftY;
      const y1 = leftY + nodeHeight;
      const y = (y0 + y1) / 2;
      leftNodePositions.set(node.id, { y0, y1, y, height: nodeHeight });
      leftY += nodeHeight;
    });

    // 右側のノードの位置を計算
    const rightNodes = data.nodes.right;
    const rightNodePositions: Map<string, { y0: number; y1: number; y: number; height: number }> = new Map();
    let rightY = 0;

    rightNodes.forEach((node) => {
      const nodeHeight = (node.value / totalValue) * chartHeight;
      const y0 = rightY;
      const y1 = rightY + nodeHeight;
      const y = (y0 + y1) / 2;
      rightNodePositions.set(node.id, { y0, y1, y, height: nodeHeight });
      rightY += nodeHeight;
    });

    // リンクの位置を計算（Sankeyアルゴリズム）
    // ソースノードごとにリンクをグループ化して配置
    const sourceLinkGroups: Map<string, AlluvialLink[]> = new Map();
    data.links.forEach((link) => {
      if (!sourceLinkGroups.has(link.source)) {
        sourceLinkGroups.set(link.source, []);
      }
      sourceLinkGroups.get(link.source)!.push(link);
    });

    // ターゲットノードごとにリンクをグループ化
    const targetLinkGroups: Map<string, AlluvialLink[]> = new Map();
    data.links.forEach((link) => {
      if (!targetLinkGroups.has(link.target)) {
        targetLinkGroups.set(link.target, []);
      }
      targetLinkGroups.get(link.target)!.push(link);
    });

    // リンクの位置を計算
    const linkPositions: Map<string, { sourceY0: number; sourceY1: number; targetY0: number; targetY1: number }> = new Map();

    // ソース側からリンクを配置
    sourceLinkGroups.forEach((links, sourceId) => {
      const sourcePos = leftNodePositions.get(sourceId);
      if (!sourcePos) return;

      // ターゲットのy位置でソート
      const sortedLinks = [...links].sort((a, b) => {
        const targetA = rightNodePositions.get(a.target)?.y || 0;
        const targetB = rightNodePositions.get(b.target)?.y || 0;
        return targetA - targetB;
      });

      let currentY = sourcePos.y0;
      sortedLinks.forEach((link) => {
        const linkHeight = (link.value / totalValue) * chartHeight;
        const linkKey = `${link.source}-${link.target}`;
        linkPositions.set(linkKey, {
          sourceY0: currentY,
          sourceY1: currentY + linkHeight,
          targetY0: 0, // 後で計算
          targetY1: 0, // 後で計算
        });
        currentY += linkHeight;
      });
    });

    // ターゲット側からリンクを配置
    targetLinkGroups.forEach((links, targetId) => {
      const targetPos = rightNodePositions.get(targetId);
      if (!targetPos) return;

      // ソースのy位置でソート
      const sortedLinks = [...links].sort((a, b) => {
        const sourceA = leftNodePositions.get(a.source)?.y || 0;
        const sourceB = leftNodePositions.get(b.source)?.y || 0;
        return sourceA - sourceB;
      });

      let currentY = targetPos.y0;
      sortedLinks.forEach((link) => {
        const linkHeight = (link.value / totalValue) * chartHeight;
        const linkKey = `${link.source}-${link.target}`;
        const pos = linkPositions.get(linkKey);
        if (pos) {
          pos.targetY0 = currentY;
          pos.targetY1 = currentY + linkHeight;
        }
        currentY += linkHeight;
      });
    });

    // リンクを描画
    data.links.forEach((link) => {
      const linkKey = `${link.source}-${link.target}`;
      const pos = linkPositions.get(linkKey);
      if (!pos) return;

      const x0 = 0;
      const x1 = chartWidth;
      const sourceY0 = pos.sourceY0;
      const sourceY1 = pos.sourceY1;
      const targetY0 = pos.targetY0;
      const targetY1 = pos.targetY1;

      // カーブの制御点
      const controlX0 = x0 + chartWidth * 0.2;
      const controlX1 = x1 - chartWidth * 0.2;

      // パスを作成（Sankeyスタイル）
      const pathData = [
        `M ${x0} ${sourceY0}`,
        `C ${controlX0} ${sourceY0}, ${controlX1} ${targetY0}, ${x1} ${targetY0}`,
        `L ${x1} ${targetY1}`,
        `C ${controlX1} ${targetY1}, ${controlX0} ${sourceY1}, ${x0} ${sourceY1}`,
        'Z',
      ].join(' ');

      const path = g.append('path')
        .attr('d', pathData)
        .attr('fill', colorScale(leftNodes.find(n => n.id === link.source)?.category || 'default'))
        .attr('fill-opacity', 0.6)
        .attr('stroke', colorScale(leftNodes.find(n => n.id === link.source)?.category || 'default'))
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseenter', function() {
          select(this)
            .attr('fill-opacity', 0.8)
            .attr('stroke-width', 2);
        })
        .on('mouseleave', function() {
          select(this)
            .attr('fill-opacity', 0.6)
            .attr('stroke-width', 1);
        });

      // ツールチップ
      path.on('mouseenter', function(event) {
        const tooltip = g.append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${chartWidth / 2}, ${(sourceY0 + targetY1) / 2})`);

        const tooltipBg = tooltip.append('rect')
          .attr('x', -60)
          .attr('y', -20)
          .attr('width', 120)
          .attr('height', 40)
          .attr('fill', 'rgba(0, 0, 0, 0.8)')
          .attr('rx', 4);

        tooltip.append('text')
          .attr('x', 0)
          .attr('y', -5)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .attr('fill', '#fff')
          .text(`${(link.value / 1000).toFixed(0)}K`);

        tooltip.append('text')
          .attr('x', 0)
          .attr('y', 10)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('fill', '#fff')
          .text(`${((link.value / totalValue) * 100).toFixed(1)}%`);
      })
      .on('mouseleave', function() {
        g.selectAll('.tooltip').remove();
      });
    });

    // 左側のノードを描画
    leftNodes.forEach((node) => {
      const pos = leftNodePositions.get(node.id);
      if (!pos) return;

      // ノードの矩形
      const rect = g.append('rect')
        .attr('x', -80)
        .attr('y', pos.y0)
        .attr('width', 60)
        .attr('height', pos.height)
        .attr('fill', colorScale(node.category || 'default'))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseenter', function() {
          select(this)
            .attr('stroke-width', 3)
            .attr('opacity', 0.9);
        })
        .on('mouseleave', function() {
          select(this)
            .attr('stroke-width', 2)
            .attr('opacity', 1);
        });

      // ラベル
      const labelLines = node.label.split('\n');
      labelLines.forEach((line, i) => {
        g.append('text')
          .attr('x', -90)
          .attr('y', pos.y + (i - (labelLines.length - 1) / 2) * 14)
          .attr('text-anchor', 'end')
          .attr('font-size', '14px')
          .attr('font-weight', '500')
          .attr('fill', '#333')
          .text(line);
      });

      // 値のラベル
      g.append('text')
        .attr('x', -90)
        .attr('y', pos.y + pos.height / 2 + 20)
        .attr('text-anchor', 'end')
        .attr('font-size', '11px')
        .attr('fill', '#666')
        .text(`${(node.value / 1000).toFixed(0)}K`);
    });

    // 右側のノードを描画
    rightNodes.forEach((node) => {
      const pos = rightNodePositions.get(node.id);
      if (!pos) return;

      // ノードの矩形
      const rect = g.append('rect')
        .attr('x', chartWidth + 20)
        .attr('y', pos.y0)
        .attr('width', 60)
        .attr('height', pos.height)
        .attr('fill', colorScale(node.category || 'default'))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseenter', function() {
          select(this)
            .attr('stroke-width', 3)
            .attr('opacity', 0.9);
        })
        .on('mouseleave', function() {
          select(this)
            .attr('stroke-width', 2)
            .attr('opacity', 1);
        });

      // ラベル
      const labelLines = node.label.split('\n');
      labelLines.forEach((line, i) => {
        g.append('text')
          .attr('x', chartWidth + 90)
          .attr('y', pos.y + (i - (labelLines.length - 1) / 2) * 14)
          .attr('text-anchor', 'start')
          .attr('font-size', '14px')
          .attr('font-weight', '500')
          .attr('fill', '#333')
          .text(line);
      });

      // 値のラベル
      g.append('text')
        .attr('x', chartWidth + 90)
        .attr('y', pos.y + pos.height / 2 + 20)
        .attr('text-anchor', 'start')
        .attr('font-size', '11px')
        .attr('fill', '#666')
        .text(`${(node.value / 1000).toFixed(0)}K`);
    });

    // タイトルを追加
    if (title) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .attr('font-weight', '600')
        .attr('fill', '#333')
        .text(title);
    }
  }, [data, width, height, title, margin, colorScale]);

  return (
    <div style={{ width: '100%', overflow: 'hidden', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: `${width}px`, margin: '0 auto' }}>
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}
          xmlns="http://www.w3.org/2000/svg"
        />
      </div>
    </div>
  );
}

