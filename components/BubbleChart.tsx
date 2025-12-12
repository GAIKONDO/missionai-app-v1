'use client';

import { useMemo, useEffect, useRef } from 'react';
import { hierarchy, pack } from 'd3-hierarchy';
import { scaleOrdinal } from 'd3-scale';

export interface BubbleData {
  name: string;
  value: number;
  group?: string;
  description?: string;
}

interface BubbleChartProps {
  data: BubbleData[];
  width?: number;
  height?: number;
  title?: string;
}

export default function BubbleChart({
  data,
  width = 800,
  height = 600,
  title,
}: BubbleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // グループごとの色を設定
  const colorScale = useMemo(() => {
    const groups = Array.from(new Set(data.map(d => d.group || 'default')));
    return scaleOrdinal<string>()
      .domain(groups)
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

  // 階層データを作成
  const root = useMemo(() => {
    // グループごとにデータを整理
    const groupedData: { [key: string]: BubbleData[] } = {};
    data.forEach(d => {
      const group = d.group || 'default';
      if (!groupedData[group]) {
        groupedData[group] = [];
      }
      groupedData[group].push(d);
    });

    // 階層構造を作成
    const hierarchyData = {
      name: 'root',
      children: Object.entries(groupedData).map(([group, items]) => ({
        name: group,
        children: items.map(item => ({
          name: item.name,
          value: item.value,
          description: item.description,
        })),
      })),
    };

    return hierarchy(hierarchyData)
      .sum((d: any) => d.value || 0)
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
  }, [data]);

  // Packレイアウトを計算
  const packLayout = useMemo(() => {
    return pack()
      .size([width - 40, height - 40])
      .padding(3);
  }, [width, height]);

  const packedData = useMemo(() => {
    return packLayout(root as any);
  }, [packLayout, root]);

  useEffect(() => {
    if (!svgRef.current || !packedData) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    // オフセットを計算（SVGの中心に配置）
    const offsetX = 20;
    const offsetY = title ? 50 : 20;

    // グループごとの円を描画
    packedData.descendants().forEach((node: any, i: number) => {
      if (!node.r) return;

      const isLeaf = !node.children;
      const depth = node.depth;
      
      // ルートノードはスキップ
      if (depth === 0) return;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(node.x + offsetX));
      circle.setAttribute('cy', String(node.y + offsetY));
      circle.setAttribute('r', String(node.r));
      
      if (isLeaf) {
        // リーフノード（個別のデータ）
        const group = node.parent?.data?.name || 'default';
        circle.setAttribute('fill', colorScale(group));
        circle.setAttribute('fill-opacity', '0.8');
        circle.setAttribute('stroke', '#fff');
        circle.setAttribute('stroke-width', '2');
        circle.style.cursor = 'pointer';
        
        // ホバーエフェクト
        circle.addEventListener('mouseenter', () => {
          circle.setAttribute('fill-opacity', '1');
          circle.setAttribute('stroke-width', '3');
        });
        circle.addEventListener('mouseleave', () => {
          circle.setAttribute('fill-opacity', '0.8');
          circle.setAttribute('stroke-width', '2');
        });
      } else {
        // グループノード
        const group = node.data?.name || 'default';
        circle.setAttribute('fill', colorScale(group));
        circle.setAttribute('fill-opacity', '0.1');
        circle.setAttribute('stroke', colorScale(group));
        circle.setAttribute('stroke-width', '2');
        circle.setAttribute('stroke-dasharray', '5,5');
      }

      svg.appendChild(circle);

      // テキストラベルを追加（リーフノードのみ、サイズが十分な場合）
      if (isLeaf && node.r > 20) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(node.x + offsetX));
        text.setAttribute('y', String(node.y + offsetY));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-size', Math.min(node.r / 3, 14) + 'px');
        text.setAttribute('fill', '#333');
        text.setAttribute('font-weight', '500');
        text.style.pointerEvents = 'none';
        
        // テキストを2行に分割（長い場合）
        const name = node.data?.name || '';
        const words = name.split(' ');
        if (words.length > 2 && node.r > 30) {
          const mid = Math.ceil(words.length / 2);
          const line1 = words.slice(0, mid).join(' ');
          const line2 = words.slice(mid).join(' ');
          
          const tspan1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          tspan1.setAttribute('x', String(node.x + offsetX));
          tspan1.setAttribute('dy', '-0.3em');
          tspan1.textContent = line1;
          text.appendChild(tspan1);
          
          const tspan2 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          tspan2.setAttribute('x', String(node.x + offsetX));
          tspan2.setAttribute('dy', '1.2em');
          tspan2.textContent = line2;
          text.appendChild(tspan2);
        } else {
          text.textContent = name;
        }
        
        svg.appendChild(text);
      }
    });

    // グループラベルを追加
    packedData.descendants().forEach((node: any) => {
      if (node.depth === 1 && node.r) {
        // グループノードのラベル
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(node.x + offsetX));
        text.setAttribute('y', String(node.y + offsetY - node.r - 10));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '14px');
        text.setAttribute('font-weight', '600');
        text.setAttribute('fill', colorScale(node.data?.name || 'default'));
        text.style.pointerEvents = 'none';
        text.textContent = node.data?.name || '';
        svg.appendChild(text);
      }
    });

    // タイトルを追加
    if (title) {
      const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      titleText.setAttribute('x', String(width / 2));
      titleText.setAttribute('y', '20');
      titleText.setAttribute('text-anchor', 'middle');
      titleText.setAttribute('font-size', '16px');
      titleText.setAttribute('font-weight', '600');
      titleText.setAttribute('fill', '#333');
      titleText.textContent = title;
      svg.appendChild(titleText);
    }
  }, [packedData, colorScale, width, height, title]);

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

