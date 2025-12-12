'use client';

import { useMemo, useEffect, useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { scaleOrdinal } from 'd3-scale';

export interface ScatterBubbleData {
  name: string;
  x: number; // 汎用性（0=汎用的、1=パーソナル化）
  y: number; // 1契約の金額規模
  size: number; // バブルのサイズ（ビジネス規模など）
  category?: string;
  description?: string;
}

interface ScatterBubbleChartProps {
  data: ScatterBubbleData[];
  width?: number;
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  title?: string;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export default function ScatterBubbleChart({
  data,
  width = 800,
  height = 600,
  xAxisLabel = '汎用性（左：汎用的 → 右：パーソナル化）',
  yAxisLabel = '1契約の金額規模',
  title,
  margin = { top: 60, right: 40, bottom: 80, left: 100 },
}: ScatterBubbleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

    // カテゴリごとの色を設定
  const colorScale = useMemo(() => {
    const categories = Array.from(new Set(data.map(d => d.category || 'default')));
    // traditional（従来から可能な領域）= 青、ai-enabled（AI導入で可能になった領域）= 緑（サチュレーションを下げた高級感のある緑）
    const colorMap: Record<string, string> = {
      'traditional': '#4A90E2', // 青
      'ai-enabled': '#4DB368', // 緑（サチュレーション-12%で高級感を向上）
    };
    return scaleOrdinal<string>()
      .domain(categories)
      .range(categories.map(cat => colorMap[cat] || '#999999'));
  }, [data]);

  // スケールを計算
  const scales = useMemo(() => {
    const xMin = 0; // 0%に固定
    const xMax = 1; // 100%に固定
    const yMin = 0; // 固定範囲（各円の位置を独立させるため）
    const yMax = 1; // 固定範囲（各円の位置を独立させるため）

    // チャート領域を正方形にする（小さい方のサイズに合わせる）
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const chartSize = Math.min(chartWidth, chartHeight);
    const chartSizeX = chartSize * 1.15; // 横軸を15%長くする

    const xScale = scaleLinear()
      .domain([xMin, xMax]) // 0から1（0%から100%）に固定
      .range([0, chartSizeX])
      .nice();

    const yScale = scaleLinear()
      .domain([yMax, yMin]) // Y軸は上から下なので反転、固定範囲[0, 1]を使用
      .range([0, chartSize])
      .nice();

    // サイズスケールを固定範囲に設定（各円のサイズを独立させるため）
    const sizeScale = scaleLinear()
      .domain([0, 100]) // 固定のドメイン範囲
      .range([8, 50]); // バブルの最小・最大サイズ

    return { xScale, yScale, sizeScale, chartSize, chartSizeX };
  }, [data, width, height, margin]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove(); // 既存の要素をクリア

    // メイングループを作成
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X軸を描画（グリッドなし）
    const xAxis = axisBottom(scales.xScale)
      .tickSize(0) // グリッド線を非表示
      .tickFormat((d: any) => {
        // 0-1の範囲をパーセンテージで表示
        return `${Math.round(d * 100)}%`;
      });

    // チャート領域を正方形にする（小さい方のサイズに合わせる）
    const chartSize = scales.chartSize;
    const chartSizeX = scales.chartSizeX;

    g.append('g')
      .attr('transform', `translate(0,${chartSize})`)
      .call(xAxis)
      .select('.domain')
      .attr('stroke', '#333');

    // X軸ラベル
    g.append('text')
      .attr('x', chartSizeX / 2)
      .attr('y', chartSize + margin.bottom - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#333')
      .text(xAxisLabel);

    // Y軸を描画（グリッドなし）
    const yAxis = axisLeft(scales.yScale)
      .tickSize(0) // グリッド線を非表示
      .tickFormat((d: any) => {
        // 0-1の範囲をパーセンテージで表示
        return `${Math.round(d * 100)}%`;
      });

    g.append('g')
      .call(yAxis)
      .select('.domain')
      .attr('stroke', '#333');

    // Y軸ラベル
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 20)
      .attr('x', -chartSize / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#333')
      .text(yAxisLabel);

    // 50%を中心に4象限を作成（太線）
    // X軸の50%の位置（0.5）を計算
    const xMidValue = 0.5;
    const xMidPosition = scales.xScale(xMidValue);
    
    // Y軸の50%の位置（0.5）を固定
    const yMidValue = 0.5;
    const yMidPosition = scales.yScale(yMidValue);
    
    // 縦の太線（X軸50%）- 淡グレーで上品に
    g.append('line')
      .attr('x1', xMidPosition)
      .attr('x2', xMidPosition)
      .attr('y1', 0)
      .attr('y2', chartSize)
      .attr('stroke', '#E5E5E5')
      .attr('stroke-width', 2)
      .attr('opacity', 1);
    
    // 横の太線（Y軸50%）- 淡グレーで上品に
    g.append('line')
      .attr('x1', 0)
      .attr('x2', chartSizeX)
      .attr('y1', yMidPosition)
      .attr('y2', yMidPosition)
      .attr('stroke', '#E5E5E5')
      .attr('stroke-width', 2)
      .attr('opacity', 1);

    // バブルを描画
    const bubbles = g.selectAll('g.bubble')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'bubble')
      .attr('transform', (d) => `translate(${scales.xScale(d.x)},${scales.yScale(d.y)})`);

    // 円を追加
    bubbles.append('circle')
      .attr('r', (d) => scales.sizeScale(d.size))
      .attr('fill', (d) => colorScale(d.category || 'default'))
      .attr('fill-opacity', 0.7)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        select(this)
          .attr('fill-opacity', 1)
          .attr('stroke-width', 3);

        // ツールチップを表示
        const tooltip = g.append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${scales.xScale(d.x)},${scales.yScale(d.y)})`);

        const tooltipRect = tooltip.append('rect')
          .attr('x', -60)
          .attr('y', -scales.sizeScale(d.size) - 50)
          .attr('width', 120)
          .attr('height', 45)
          .attr('fill', 'rgba(0, 0, 0, 0.8)')
          .attr('rx', 4);

        tooltip.append('text')
          .attr('x', 0)
          .attr('y', -scales.sizeScale(d.size) - 35)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .attr('fill', '#fff')
          .text(d.name);

        tooltip.append('text')
          .attr('x', 0)
          .attr('y', -scales.sizeScale(d.size) - 20)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('fill', '#fff')
          .text(`¥${d.y.toLocaleString()}`);
      })
      .on('mouseleave', function() {
        select(this)
          .attr('fill-opacity', 0.7)
          .attr('stroke-width', 2);

        // ツールチップを削除
        g.selectAll('.tooltip').remove();
      });

    // ラベルを追加（すべてのバブルに表示）
    bubbles.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '14px')
      .attr('fill', '#333')
      .attr('font-weight', '500')
      .style('pointer-events', 'none')
      .text((d) => d.name);

    // タイトルを追加
    if (title) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', '600')
        .attr('fill', '#333')
        .text(title);
    }

    // 凡例は図の外側に配置するため、ここでは描画しない
  }, [data, scales, colorScale, width, height, margin, xAxisLabel, yAxisLabel, title]);

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

