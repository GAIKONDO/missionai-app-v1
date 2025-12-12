'use client';

import { useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import type { FocusInitiative } from '@/lib/orgApi';

interface InitiativeCauseEffectDiagramProps {
  width?: number;
  height?: number;
  initiative: FocusInitiative;
  onElementClick?: (element: { type: string; label: string; value: string }) => void;
}

export default function InitiativeCauseEffectDiagram({
  width = 1000,
  height = 600,
  initiative,
  onElementClick,
}: InitiativeCauseEffectDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const zoomRef = useRef<any>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    // マージン設定（上下を広めに）
    const margin = { top: 100, right: 180, bottom: 100, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // メイングループを作成（ズーム用のコンテナ）
    const container = svg.append('g').attr('class', 'zoom-container');
    
    // メイングループを作成
    const g = container
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // ズーム機能を設定
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4]) // ズーム範囲: 0.1倍〜4倍
      .on('zoom', (event) => {
        container.attr('transform', event.transform.toString());
      });

    svg.call(zoomBehavior);
    zoomRef.current = zoomBehavior;

    // フィッシュボーンのレイアウト設定
    const spineY = innerHeight / 2; // 中央

    // タイトルノードを左端に配置
    const titleText = initiative.title || '特性要因図';
    const titleNodeSize = 80;
    const titleNodeX = -titleNodeSize - 20; // 左端に配置（マージンを考慮）
    const titleNodeY = spineY;

    // タイトルノードを描画
    const titleGroup = g
      .append('g')
      .attr('class', 'title-node')
      .attr('transform', `translate(${titleNodeX},${titleNodeY})`);

    titleGroup
      .append('circle')
      .attr('r', titleNodeSize)
      .attr('fill', '#10B981')
      .attr('stroke', '#059669')
      .attr('stroke-width', 3);

    // タイトルテキスト（複数行対応）
    const maxCharsPerLine = 10;
    const titleLines: string[] = [];
    for (let i = 0; i < titleText.length; i += maxCharsPerLine) {
      titleLines.push(titleText.substring(i, i + maxCharsPerLine));
    }

    titleLines.forEach((line, idx) => {
      titleGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', (idx - (titleLines.length - 1) / 2) * 13 + 5)
        .attr('fill', '#FFFFFF')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text(line);
    });

    // スパインの開始位置をタイトルノードの右側に設定
    const spineStartX = titleNodeX + titleNodeSize + 20;

    // 中央線（スパイン）の定義 - データ構造に明示的に存在
    const spine = {
      id: 'spine',
      label: initiative.title || '特性要因図',
      startX: spineStartX,
      endX: innerWidth - 100, // スパインの終点（目標ノードのスペースを確保）
      y: spineY,
      type: 'spine' as const,
    };

    // 要素をカテゴリごとに分類
    const categories: { name: string; elements: string[]; color: string; strokeColor: string }[] = [];

    if (initiative.method && initiative.method.length > 0) {
      categories.push({
        name: '手法',
        elements: initiative.method,
        color: '#3B82F6',
        strokeColor: '#1E40AF',
      });
    }

    if (initiative.means && initiative.means.length > 0) {
      categories.push({
        name: '手段',
        elements: initiative.means,
        color: '#8B5CF6',
        strokeColor: '#6D28D9',
      });
    }

    if (initiative.objective) {
      categories.push({
        name: '目標',
        elements: [initiative.objective],
        color: '#F59E0B',
        strokeColor: '#D97706',
      });
    }

    // 中央スパイン（太く・グラデーション付き）- 目標の有無に関わらず常に描画
    const spineGradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'spineGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    spineGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#1F2937')
      .attr('stop-opacity', 0.6);

    spineGradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', '#374151')
      .attr('stop-opacity', 1);

    spineGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#1F2937')
      .attr('stop-opacity', 0.6);

    // 中央スパイン（水平線）- データ構造に明示的に定義された中央線を描画
    // 目標の有無に関わらず常に描画される（spine.endXまで）
    g.append('line')
      .attr('class', 'spine-line')
      .attr('data-spine-id', spine.id)
      .attr('x1', spine.startX)
      .attr('y1', spine.y)
      .attr('x2', spine.endX) // spine.endXまで確実に描画
      .attr('y2', spine.y)
      .attr('stroke', 'url(#spineGradient)')
      .attr('stroke-width', 5)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 1)
      .attr('title', spine.label); // ツールチップにラベルを表示

    // 目標ノードの位置を計算（存在する場合）- 線の右側に配置
    const objectiveCategory = categories.find(cat => cat.name === '目標');
    const objectiveSize = 80; // 1.5〜2倍サイズ
    const objectiveX = objectiveCategory ? spine.endX + objectiveSize + 10 : spine.endX; // 目標は線の右側に配置

    // 目標ノードを右端に配置（存在する場合のみ）
    if (objectiveCategory) {
      const objectiveY = spineY;

      // タイトルノードから目標ノードへのリンクを描画
      g.append('line')
        .attr('x1', titleNodeX + titleNodeSize) // タイトルノードの右端
        .attr('y1', titleNodeY)
        .attr('x2', objectiveX - objectiveSize) // 目標ノードの左端
        .attr('y2', objectiveY)
        .attr('stroke', '#10B981')
        .attr('stroke-width', 4)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.7)
        .attr('stroke-dasharray', '8,4'); // 点線スタイル

      // 目標ノード（大きく、右端）
      const objectiveGroup = g
        .append('g')
        .attr('class', 'objective-node')
        .attr('transform', `translate(${objectiveX},${objectiveY})`);

      objectiveGroup
        .append('circle')
        .attr('r', objectiveSize)
        .attr('fill', objectiveCategory.color)
        .attr('stroke', objectiveCategory.strokeColor)
        .attr('stroke-width', 3);

      // 目標テキスト（複数行対応）
      const objectiveText = objectiveCategory.elements[0];
      const maxCharsPerLine = 18;
      const lines: string[] = [];
      for (let i = 0; i < objectiveText.length; i += maxCharsPerLine) {
        lines.push(objectiveText.substring(i, i + maxCharsPerLine));
      }

      lines.forEach((line, idx) => {
        objectiveGroup
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', (idx - (lines.length - 1) / 2) * 13 + 5)
          .attr('fill', '#FFFFFF')
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .text(line);
      });
    }

    // methodとmeansを左に倒す角度で配置
    const boneLength = innerWidth * 0.35;
    const boneAngle = Math.PI / 4; // 45度
    const categoryVerticalSpacing = 160;

    categories.forEach((category, categoryIndex) => {
      // 目標はスキップ（既に処理済み）
      if (category.name === '目標') return;

      // methodは左斜め上（135度）、meansは左斜め下（-135度）
      const isMethod = category.name === '手法';
      const boneAngleDirection = isMethod ? (Math.PI * 3 / 4) : (-Math.PI * 3 / 4); // 左上は135度、左下は-135度（左に倒す）

      // 骨の開始位置（スパイン上、左側に配置）- 手法と手段を左右にずらす
      // spineオブジェクトのy座標を使用してスパインに接続
      const spineSegment = innerWidth * 0.4;
      const offsetX = isMethod ? -180 : 180; // 手法は左に、手段は右にずらす（180px）
      const boneStartX = spine.startX + spineSegment + offsetX;
      const boneStartY = spine.y; // スパインのy座標を使用

      // 骨の終了位置
      const boneEndX = boneStartX + Math.cos(boneAngleDirection) * boneLength;
      const boneEndY = boneStartY + Math.sin(boneAngleDirection) * boneLength;

      // 骨を描画（中央スパインからカテゴリノードまで）
      g.append('line')
        .attr('x1', boneStartX)
        .attr('y1', boneStartY)
        .attr('x2', boneEndX)
        .attr('y2', boneEndY)
        .attr('stroke', category.strokeColor)
        .attr('stroke-width', 4)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.9);

      // カテゴリラベル（円形）
      const labelRadius = 38;
      const labelGroup = g
        .append('g')
        .attr('class', 'category-label')
        .attr('transform', `translate(${boneEndX},${boneEndY})`);

      labelGroup
        .append('circle')
        .attr('r', labelRadius)
        .attr('fill', category.color)
        .attr('stroke', category.strokeColor)
        .attr('stroke-width', 2.5);

      labelGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 5)
        .attr('fill', '#FFFFFF')
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .text(category.name);

      // 各要素を骨の途中に均等に配置
      const subBoneLength = boneLength * 0.4; // 小骨の長さ
      const totalElements = category.elements.length;
      
      // 骨の長さに沿って要素を均等配置（骨の開始から終了まで）
      const boneSegmentLength = boneLength / (totalElements + 1); // 要素間の間隔

      category.elements.forEach((element, elementIndex) => {
        // 骨の途中のポイントを計算（均等に配置）
        const segmentRatio = (elementIndex + 1) / (totalElements + 1); // 0.0 〜 1.0
        const subBoneStartX = boneStartX + Math.cos(boneAngleDirection) * (boneLength * segmentRatio);
        const subBoneStartY = boneStartY + Math.sin(boneAngleDirection) * (boneLength * segmentRatio);

        // 小骨の角度（骨に対して垂直方向に左右に振る）
        const isLeftSide = elementIndex % 2 === 0;
        const perpendicularAngle = boneAngleDirection + (isLeftSide ? Math.PI / 2 : -Math.PI / 2);
        
        // 小骨の終了位置
        const subBoneEndX = subBoneStartX + Math.cos(perpendicularAngle) * subBoneLength;
        const subBoneEndY = subBoneStartY + Math.sin(perpendicularAngle) * subBoneLength;

        drawElement(g, element, category, elementIndex, subBoneStartX, subBoneStartY, subBoneEndX, subBoneEndY, perpendicularAngle, hoveredElementId, setHoveredElementId, onElementClick);
      });
    });
  }, [initiative, width, height, hoveredElementId, onElementClick]);

  const handleResetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      const svg = select(svgRef.current) as any;
      svg.transition().duration(300).call(
        zoomRef.current.transform,
        zoomIdentity
      );
    }
  };

  return (
    <div style={{ width: '100%', overflow: 'auto', position: 'relative' }}>
      <button
        onClick={handleResetZoom}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          padding: '8px 12px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F9FAFB';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#FFFFFF';
        }}
      >
        🔍 リセット
      </button>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: 'block', margin: '0 auto', cursor: 'grab' }}
      />
    </div>
  );
}

// 要素を描画するヘルパー関数
function drawElement(
  g: any,
  element: string,
  category: { name: string; elements: string[]; color: string; strokeColor: string },
  elementIndex: number,
  subBoneStartX: number,
  subBoneStartY: number,
  subBoneEndX: number,
  subBoneEndY: number,
  subBoneAngle: number,
  hoveredElementId: string | null,
  setHoveredElementId: (id: string | null) => void,
  onElementClick?: (element: { type: string; label: string; value: string }) => void
) {
  // 小骨を描画
  g.append('line')
    .attr('x1', subBoneStartX)
    .attr('y1', subBoneStartY)
    .attr('x2', subBoneEndX)
    .attr('y2', subBoneEndY)
    .attr('stroke', '#E5E7EB')
    .attr('stroke-width', 1.5)
    .attr('stroke-linecap', 'round')
    .attr('stroke-dasharray', '3,3');

  // 要素ノードを描画（小要因：囲いなし、文字色は中要因と合わせる）
  const elementId = `${category.name}_${elementIndex}`;
  const isHovered = hoveredElementId === elementId;

  const elementGroup = g
    .append('g')
    .attr('class', 'element-node')
    .attr('transform', `translate(${subBoneEndX},${subBoneEndY})`);

  // テキストの長さに応じて表示を調整
  const maxTextLength = 24;
  const displayText = element.length > maxTextLength ? element.substring(0, maxTextLength) + '...' : element;

  // 要素テキスト（囲いなし、文字色は中要因の色に合わせる）
  elementGroup
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', 5)
    .attr('fill', category.color) // 中要因（カテゴリ）の色に合わせる
    .attr('font-size', '11px')
    .attr('font-weight', isHovered ? '600' : '400')
    .style('cursor', 'pointer')
    .style('opacity', isHovered ? 0.8 : 1)
    .text(displayText);

  // クリックとホバーイベント
  elementGroup
    .on('click', () => {
      onElementClick?.({
        type: category.name,
        label: element,
        value: element,
      });
    })
    .on('mouseenter', () => setHoveredElementId(elementId))
    .on('mouseleave', () => setHoveredElementId(null));
}
