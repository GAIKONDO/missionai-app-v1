'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { hierarchy, pack } from 'd3-hierarchy';
import { scaleOrdinal } from 'd3-scale';
import type { OrgNodeData, MemberInfo } from './OrgChart';

interface OrgBubbleChartProps {
  data: OrgNodeData;
  width?: number;
  height?: number;
  onNodeClick?: (node: OrgNodeData, event: MouseEvent) => void;
}

// SaaS × 戦略UI向けカラーパレット
const PROFESSIONAL_COLORS = {
  division: '#0F172A',      // ICT全体（最外円）- 経営レイヤー
  department: '#1E40AF',   // 部（大きい青円）- 事業単位
  section: '#10B981',       // 課（中の緑円）- 実務単位
  member: '#94A3B8',        // サブ情報（人数・補足）
};

export default function OrgBubbleChart({
  data,
  width = 1200,
  height = 800,
  onNodeClick,
}: OrgBubbleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);

  // 組織データを階層構造に変換
  const hierarchyData = useMemo(() => {
    const convertToHierarchy = (node: OrgNodeData, depth: number = 0): any => {
      // メンバー数を計算（自分自身のメンバー + 子組織のメンバー）
      const memberCount = node.members?.length || 0;
      const childrenMemberCount = node.children?.reduce(
        (sum, child) => sum + (child.members?.length || 0),
        0
      ) || 0;
      const totalMemberCount = memberCount + childrenMemberCount;

      // 組織のサイズはメンバー数に基づく（最小値は10）
      const value = Math.max(totalMemberCount || 1, 10);

      const result: any = {
        name: node.name,
        title: node.title,
        id: node.id || node.name,
        description: node.description,
        members: node.members || [],
        value: value,
        depth: depth,
        originalData: node,
      };

      // 子組織を追加
      if (node.children && node.children.length > 0) {
        result.children = node.children.map((child) =>
          convertToHierarchy(child, depth + 1)
        );
      }

      return result;
    };

    return convertToHierarchy(data, 0);
  }, [data]);

  // 階層データを作成
  const root = useMemo(() => {
    return hierarchy(hierarchyData)
      .sum((d: any) => d.value || 1)
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

  // 深さに応じた色を取得（SaaS × 戦略UI向け）
  const getColorByDepth = (depth: number, isHovered: boolean): string => {
    switch (depth) {
      case 0: // Division（ICT全体 - 経営レイヤー）
        return PROFESSIONAL_COLORS.division; // #0F172A
      case 1: // Department（部 - 事業単位）
        return PROFESSIONAL_COLORS.department; // #1E40AF
      case 2: // Section（課 - 実務単位）
        return PROFESSIONAL_COLORS.section; // #10B981
      default:
        return PROFESSIONAL_COLORS.section; // #10B981
    }
  };

  useEffect(() => {
    if (!svgRef.current || !packedData) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    // シャドウフィルターを定義（高級感のある半透明シャドウ）
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
      const depth = nodeData.depth;
      const isHovered = hoveredNodeId === nodeData.id;
      const isLeaf = !node.children || node.children.length === 0;
      const hasMembers = nodeData.members && nodeData.members.length > 0;
      const isRoot = depth === 0;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(node.x + offsetX));
      circle.setAttribute('cy', String(node.y + offsetY));
      circle.setAttribute('r', String(node.r));
      
      const color = getColorByDepth(depth, isHovered);
      
      // ルートノード（ICT全体 - 経営レイヤー）は外側のバブルとして表示
      if (isRoot) {
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.15' : '0.08');
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', isHovered ? '3' : '2');
        circle.setAttribute('stroke-dasharray', '8,4');
        // シャドウは適用しない（点線なので）
      } else if (depth === 1) {
        // 部（事業単位）- 鮮やかな青
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.85' : '0.75');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5'); // 細い白フチ
        circle.setAttribute('filter', 'url(#bubble-shadow)'); // 半透明シャドウ
      } else {
        // 課（実務単位）- 鮮やかな緑
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.8' : '0.7');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5'); // 細い白フチ
        circle.setAttribute('filter', 'url(#bubble-shadow)'); // 半透明シャドウ
      }
      
      circle.style.cursor = 'pointer';
      circle.setAttribute('data-node-id', nodeData.id);

      // ホバーエフェクト
      circle.addEventListener('mouseenter', (e) => {
        setHoveredNodeId(nodeData.id);
        
        // ルートノードの場合
        if (isRoot) {
          if (nodeData.members && nodeData.members.length > 0) {
            const memberList = nodeData.members
              .slice(0, 5)
              .map((m: MemberInfo) => `${m.name}${m.title ? ` (${m.title})` : ''}`)
              .join('\n');
            const moreCount = nodeData.members.length > 5 ? `\n...他${nodeData.members.length - 5}名` : '';
            setTooltip({
              x: node.x + offsetX,
              y: node.y + offsetY - node.r - 30,
              content: `${nodeData.name}\n${memberList}${moreCount}`,
            });
          } else {
            setTooltip({
              x: node.x + offsetX,
              y: node.y + offsetY - node.r - 30,
              content: nodeData.name,
            });
          }
          return;
        }
        
        // 通常のノードの場合
        if (nodeData.members && nodeData.members.length > 0) {
          const memberList = nodeData.members
            .slice(0, 5)
            .map((m: MemberInfo) => `${m.name}${m.title ? ` (${m.title})` : ''}`)
            .join('\n');
          const moreCount = nodeData.members.length > 5 ? `\n...他${nodeData.members.length - 5}名` : '';
          
          // SVGの座標をDOM座標に変換
          if (svgRef.current && containerRef.current) {
            const svgRect = svgRef.current.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();
            const svgPoint = svgRef.current.createSVGPoint();
            svgPoint.x = node.x + offsetX;
            svgPoint.y = node.y + offsetY - node.r - 10;
            const domPoint = svgPoint.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
            
            setTooltip({
              x: svgPoint.x,
              y: svgPoint.y,
              content: `${nodeData.name}\n${memberList}${moreCount}`,
            });
          } else {
            setTooltip({
              x: node.x + offsetX,
              y: node.y + offsetY - node.r - 10,
              content: `${nodeData.name}\n${memberList}${moreCount}`,
            });
          }
        } else {
          if (svgRef.current) {
            const svgPoint = svgRef.current.createSVGPoint();
            svgPoint.x = node.x + offsetX;
            svgPoint.y = node.y + offsetY - node.r - 10;
            setTooltip({
              x: svgPoint.x,
              y: svgPoint.y,
              content: nodeData.name,
            });
          } else {
            setTooltip({
              x: node.x + offsetX,
              y: node.y + offsetY - node.r - 10,
              content: nodeData.name,
            });
          }
        }
      });

      circle.addEventListener('mouseleave', () => {
        setHoveredNodeId(null);
        setTooltip(null);
      });

      circle.addEventListener('click', (e) => {
        if (onNodeClick && nodeData.originalData) {
          onNodeClick(nodeData.originalData, e as unknown as MouseEvent);
        }
      });

      svg.appendChild(circle);

      // ルートノード（情報・通信部門）のラベルを追加
      if (isRoot && node.r > 50) {
        const rootText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        rootText.setAttribute('x', String(node.x + offsetX));
        rootText.setAttribute('y', String(node.y + offsetY - node.r - 20));
        rootText.setAttribute('text-anchor', 'middle');
        rootText.setAttribute('dominant-baseline', 'middle');
        rootText.setAttribute('font-size', '20px');
        rootText.setAttribute('fill', color);
        rootText.setAttribute('font-weight', '700');
        rootText.style.pointerEvents = 'none';
        rootText.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
        rootText.textContent = nodeData.name;
        svg.appendChild(rootText);
      }

      // 組織名のラベルを追加（十分なサイズの場合、ルートノード以外）
      if (!isRoot && node.r > 30) {
        // 深さに応じたフォントサイズとウェイトを設定
        let fontSize: number;
        let fontWeight: string;
        
        if (depth === 1) {
          // 部名（日本語）: 17-18px, weight 700
          fontSize = 18;
          fontWeight = '700';
        } else {
          // 課名（日本語）: 15-16px, weight 600
          fontSize = 16;
          fontWeight = '600';
        }
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(node.x + offsetX));
        text.setAttribute('y', String(node.y + offsetY));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-size', fontSize + 'px');
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('font-weight', fontWeight);
        text.style.pointerEvents = 'none';
        text.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
        
        // テキストを複数行に分割（長い場合のみ）
        const name = nodeData.name;
        // 深さに応じた最大文字数を設定
        const maxCharsPerLine = depth === 1 ? 8 : 10; // 部名は少し短め、課名は少し長め
        let isMultiLine = false;
        
        if (name.length > maxCharsPerLine && node.r > 50) {
          isMultiLine = true;
          // 2行に分割
          const mid = Math.ceil(name.length / 2);
          let splitPoint = mid;
          
          // 適切な分割点を探す（スペースや句読点の前）
          for (let i = mid; i < name.length && i < mid + 5; i++) {
            if (name[i] === ' ' || name[i] === '・' || name[i] === '課' || name[i] === '部' || name[i] === 'ビジネス') {
              splitPoint = i + 1;
              break;
            }
          }
          
          const line1 = name.substring(0, splitPoint);
          const line2 = name.substring(splitPoint);
          
          const tspan1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          tspan1.setAttribute('x', String(node.x + offsetX));
          tspan1.setAttribute('dy', '-0.35em');
          tspan1.textContent = line1;
          text.appendChild(tspan1);
          
          const tspan2 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          tspan2.setAttribute('x', String(node.x + offsetX));
          tspan2.setAttribute('dy', '1.1em');
          tspan2.textContent = line2;
          text.appendChild(tspan2);
        } else {
          text.textContent = name;
        }
        
        svg.appendChild(text);

        // 英語名を表示（補助情報として小さく）
        if (nodeData.title && node.r > 50) {
          const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          // 日本語名の下に配置（2行の場合は2行目の下）
          const titleY = isMultiLine
            ? node.y + offsetY + fontSize * 1.3
            : node.y + offsetY + fontSize * 0.6;
          titleText.setAttribute('x', String(node.x + offsetX));
          titleText.setAttribute('y', String(titleY));
          titleText.setAttribute('text-anchor', 'middle');
          titleText.setAttribute('dominant-baseline', 'middle');
          titleText.setAttribute('font-size', '11px'); // 英語: 11-12px
          titleText.setAttribute('fill', '#ffffff');
          titleText.setAttribute('font-weight', '400');
          titleText.setAttribute('opacity', '0.7');
          titleText.style.pointerEvents = 'none';
          titleText.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
          titleText.textContent = nodeData.title;
          svg.appendChild(titleText);
        }

        // 人数バッジを表示（十分なサイズの場合、ルートノード以外）
        if (!isRoot && hasMembers && node.r > 60) {
          const memberCount = nodeData.members.length;
          const previousYearCount = (nodeData.originalData as any)?.previousYearCount;
          const yearOverYearChange = previousYearCount !== undefined 
            ? memberCount - previousYearCount 
            : null;
          
          // 左下：在籍人数
          const memberCountText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          memberCountText.setAttribute('x', String(node.x + offsetX - node.r * 0.35));
          memberCountText.setAttribute('y', String(node.y + offsetY + node.r * 0.65));
          memberCountText.setAttribute('text-anchor', 'start');
          memberCountText.setAttribute('dominant-baseline', 'middle');
          memberCountText.setAttribute('font-size', '13px'); // 人数: 13px
          memberCountText.setAttribute('fill', PROFESSIONAL_COLORS.member); // #94A3B8
          memberCountText.setAttribute('font-weight', '500');
          memberCountText.style.pointerEvents = 'none';
          memberCountText.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
          memberCountText.textContent = `${memberCount}名`;
          svg.appendChild(memberCountText);

          // 右下：前年差分（増減）- データがある場合のみ表示
          if (yearOverYearChange !== null && yearOverYearChange !== 0) {
            const isIncrease = yearOverYearChange > 0;
            const absChange = Math.abs(yearOverYearChange);
            const changeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            changeText.setAttribute('x', String(node.x + offsetX + node.r * 0.35));
            changeText.setAttribute('y', String(node.y + offsetY + node.r * 0.65));
            changeText.setAttribute('text-anchor', 'end');
            changeText.setAttribute('dominant-baseline', 'middle');
            changeText.setAttribute('font-size', '11px');
            changeText.setAttribute('fill', isIncrease ? '#10B981' : '#EF4444'); // 増加: 緑、減少: 赤
            changeText.setAttribute('font-weight', '600');
            changeText.style.pointerEvents = 'none';
            changeText.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
            // 増加: ▲ +10、減少: ▼ -5 の形式
            changeText.textContent = `${isIncrease ? '▲' : '▼'} ${isIncrease ? '+' : ''}${absChange}`;
            svg.appendChild(changeText);
          } else if (yearOverYearChange === 0 && previousYearCount !== undefined) {
            // 変化なしの場合も表示（オプション）
            const changeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            changeText.setAttribute('x', String(node.x + offsetX + node.r * 0.35));
            changeText.setAttribute('y', String(node.y + offsetY + node.r * 0.65));
            changeText.setAttribute('text-anchor', 'end');
            changeText.setAttribute('dominant-baseline', 'middle');
            changeText.setAttribute('font-size', '11px');
            changeText.setAttribute('fill', PROFESSIONAL_COLORS.member);
            changeText.setAttribute('font-weight', '500');
            changeText.setAttribute('opacity', '0.6');
            changeText.style.pointerEvents = 'none';
            changeText.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
            changeText.textContent = '±0';
            svg.appendChild(changeText);
          }
        }
      }

      // メンバーを小さなバブルとして表示（リーフノードでメンバーがいる場合、ルートノード以外）
      if (!isRoot && isLeaf && hasMembers && node.r > 60) {
        const members = nodeData.members as MemberInfo[];
        // 表示するメンバー数を計算（バブルのサイズに応じて）
        const maxDisplayMembers = Math.min(
          members.length,
          Math.max(3, Math.floor((node.r - 20) / 18)) // 最小3名、最大はバブルのサイズに応じて
        );
        
        // メンバーを円形に配置（組織名の下に配置）
        const memberRadius = Math.min(node.r / 10, 10);
        const memberCircleRadius = node.r * 0.5; // 親バブルの内側に配置
        
        members.slice(0, maxDisplayMembers).forEach((member, index) => {
          const angle = (index / maxDisplayMembers) * Math.PI * 2 - Math.PI / 2; // 上から開始
          const memberX = node.x + offsetX + Math.cos(angle) * memberCircleRadius;
          const memberY = node.y + offsetY + Math.sin(angle) * memberCircleRadius + node.r * 0.2; // 少し下に配置

          const memberCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          memberCircle.setAttribute('cx', String(memberX));
          memberCircle.setAttribute('cy', String(memberY));
          memberCircle.setAttribute('r', String(memberRadius));
          memberCircle.setAttribute('fill', '#ffffff');
          memberCircle.setAttribute('fill-opacity', '0.95');
          memberCircle.setAttribute('stroke', PROFESSIONAL_COLORS.member); // #94A3B8
          memberCircle.setAttribute('stroke-width', '2');
          memberCircle.style.pointerEvents = 'none';
          svg.appendChild(memberCircle);

          // メンバー名のイニシャルを表示（サブ情報色を使用）
          if (memberRadius > 6) {
            const initial = member.name.charAt(0);
            const initialText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            initialText.setAttribute('x', String(memberX));
            initialText.setAttribute('y', String(memberY));
            initialText.setAttribute('text-anchor', 'middle');
            initialText.setAttribute('dominant-baseline', 'middle');
            initialText.setAttribute('font-size', String(Math.max(memberRadius * 0.6, 6)) + 'px');
            initialText.setAttribute('fill', PROFESSIONAL_COLORS.member); // #94A3B8
            initialText.setAttribute('font-weight', '600');
            initialText.style.pointerEvents = 'none';
            initialText.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
            initialText.textContent = initial;
            svg.appendChild(initialText);
          }
        });

        // 残りのメンバー数を表示（メンバー数の表示の下に）- サブ情報色を使用
        if (members.length > maxDisplayMembers) {
          const moreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          moreText.setAttribute('x', String(node.x + offsetX));
          moreText.setAttribute('y', String(node.y + offsetY + node.r * 0.85));
          moreText.setAttribute('text-anchor', 'middle');
          moreText.setAttribute('dominant-baseline', 'middle');
          moreText.setAttribute('font-size', Math.min(node.r / 10, 9) + 'px');
          moreText.setAttribute('fill', PROFESSIONAL_COLORS.member); // #94A3B8
          moreText.setAttribute('font-weight', '500');
          moreText.setAttribute('opacity', '0.85');
          moreText.style.pointerEvents = 'none';
          moreText.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
          moreText.textContent = `+${members.length - maxDisplayMembers}名`;
          svg.appendChild(moreText);
        }
      }
    });
  }, [packedData, hoveredNodeId, onNodeClick, width, height]);

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
