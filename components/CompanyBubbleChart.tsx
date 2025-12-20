'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { hierarchy, pack } from 'd3-hierarchy';
// import type { Company } from '@/lib/companiesApi'; // Companiesテーブル削除のためコメントアウト
type Company = any; // Companiesテーブル削除のため、一時的な型定義
import type { CompanyNodeData } from './CompanyChart';

interface CompanyBubbleChartProps {
  data: CompanyNodeData;
  width?: number;
  height?: number;
  onNodeClick?: (node: CompanyNodeData, event: MouseEvent) => void;
}

// SaaS × 戦略UI向けカラーパレット
const PROFESSIONAL_COLORS = {
  company: '#0F172A',      // 主管カンパニー（最外円）
  division: '#1E40AF',     // 主管部門（大きい青円）
  department: '#10B981',   // 主管部（中の緑円）
  businessCompany: '#F59E0B', // 事業会社（小さいオレンジ円）
};

export default function CompanyBubbleChart({
  data,
  width,
  height,
  onNodeClick,
}: CompanyBubbleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);
  // デフォルトサイズを設定（事業会社ページのレイアウトに基づく）
  // flex: 0 0 60% で、height: 80vh を想定
  const getDefaultDimensions = () => {
    if (typeof window !== 'undefined') {
      // ウィンドウサイズに基づいてデフォルトサイズを計算
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      // バブルチャートは60%の幅、80vhの高さを想定（サイズを大きく）
      const defaultWidth = Math.max((viewportWidth * 0.6) - 20, 1000);
      const defaultHeight = Math.max((viewportHeight * 0.8) - 20, 750);
      return {
        width: width || defaultWidth,
        height: height || defaultHeight,
      };
    }
    return {
      width: width || 1200,
      height: height || 900,
    };
  };

  const [dimensions, setDimensions] = useState(getDefaultDimensions());
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = useRef(true);
  const previousDataRef = useRef<string | null>(null);

  // データが変更されたかチェック（ページ遷移の検出）
  const dataKey = useMemo(() => {
    return data?.id || data?.name || JSON.stringify(data);
  }, [data]);

  useEffect(() => {
    // データが変更された場合（ページ遷移など）、初期マウントフラグをリセット
    if (previousDataRef.current !== null && previousDataRef.current !== dataKey) {
      isInitialMountRef.current = true;
    }
    previousDataRef.current = dataKey;
  }, [dataKey]);

  useEffect(() => {
    const updateDimensions = (forceUpdate = false) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // コンテナのサイズが有効な場合のみ更新
        if (rect.width > 0 && rect.height > 0) {
          // コンテナの実際のサイズに基づいて調整
          const availableWidth = rect.width - 20; // padding分を減らしてサイズを確保
          const availableHeight = rect.height - 20; // padding分を減らしてサイズを確保
          
          // サイズが実際に変わった場合のみ更新
          setDimensions(prev => {
            const newWidth = Math.max(availableWidth, 900); // 最小幅を大きく
            const newHeight = Math.max(availableHeight, 700); // 最小高さを大きく
            
            // 初回マウント時または強制更新時は必ず更新
            if (forceUpdate || isInitialMountRef.current) {
              isInitialMountRef.current = false;
              return { width: newWidth, height: newHeight };
            }
            
            // サイズが10px以上変わった場合のみ更新（リサイズの頻度を減らす）
            if (Math.abs(prev.width - newWidth) > 10 || Math.abs(prev.height - newHeight) > 10) {
              return { width: newWidth, height: newHeight };
            }
            return prev;
          });
        }
      }
    };

    // デバウンス関数
    const debouncedUpdateDimensions = (forceUpdate = false) => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => updateDimensions(forceUpdate), 150);
    };

    // リサイズハンドラー（同じ参照を保持するため）
    const handleResize = () => debouncedUpdateDimensions(false);

    // 初回サイズ設定：コンテナのサイズが確定するまで待つ
    // 複数回チェックして、コンテナのサイズが確定するまで待機
    const checkAndUpdateSize = (attempt = 0) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // コンテナのサイズが有効で、十分な大きさがある場合
        if (rect.width > 100 && rect.height > 100) {
          updateDimensions(true); // 初回は強制更新
        } else if (attempt < 15) {
          // 最大15回まで再試行（約1.5秒間）- ページ遷移後のレイアウト確定を待つ
          setTimeout(() => checkAndUpdateSize(attempt + 1), 100);
        }
      } else if (attempt < 15) {
        // コンテナがまだ存在しない場合も再試行
        setTimeout(() => checkAndUpdateSize(attempt + 1), 100);
      }
    };

    // requestAnimationFrameで次のフレームまで待機してから開始
    requestAnimationFrame(() => {
      checkAndUpdateSize();
    });

    // ウィンドウリサイズ時のみ監視（ResizeObserverは削除）
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [dataKey]); // dataKeyが変更された時にも再実行

  // 事業会社データを階層構造に変換
  const hierarchyData = useMemo(() => {
    const convertToHierarchy = (node: CompanyNodeData, depth: number = 0): any => {
      // 事業会社数を計算
      const companyCount = node.companies?.length || 0;
      const childrenCompanyCount = node.children?.reduce(
        (sum, child) => sum + (child.companies?.length || 0),
        0
      ) || 0;
      const totalCompanyCount = companyCount + childrenCompanyCount;

      // ノードのサイズは事業会社数に基づく（最小値は10）
      const value = Math.max(totalCompanyCount || 1, 10);

      const result: any = {
        name: node.name,
        title: node.title,
        id: node.id || node.name,
        companies: node.companies || [],
        value: value,
        depth: depth,
        originalData: node,
      };

      // 子ノードを追加
      const children: any[] = [];
      
      // 通常の子ノードを追加
      if (node.children && node.children.length > 0) {
        children.push(...node.children.map((child) =>
          convertToHierarchy(child, depth + 1)
        ));
      }

      // 事業会社を個別の子ノードとして追加（主管部レベルの場合）
      if (node.companies && node.companies.length > 0 && depth >= 2) {
        node.companies.forEach((company) => {
          children.push({
            name: company.name,
            title: company.nameShort || company.category,
            id: `company-${company.id}`,
            companies: [],
            value: 1, // 各事業会社はサイズ1
            depth: depth + 1,
            originalData: {
              id: company.id,
              name: company.name,
              title: company.category,
              companies: [company],
            },
            company: company, // 事業会社データを保持
          });
        });
      }

      if (children.length > 0) {
        result.children = children;
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

  // Packレイアウトを計算（右側にポップアップがあるため、左側に配置）
  const packLayout = useMemo(() => {
    // 左側に配置しつつ、サイズを大きくする
    const chartWidth = dimensions.width * 0.85; // 幅を85%に拡大（左側に配置）
    const chartHeight = dimensions.height - 60; // マージンを減らして高さを確保
    return pack()
      .size([chartWidth, chartHeight])
      .padding(5);
  }, [dimensions.width, dimensions.height]);

  const packedData = useMemo(() => {
    return packLayout(root as any);
  }, [packLayout, root]);

  // 深さに応じた色を取得
  const getColorByDepth = (depth: number, isHovered: boolean, isCompany: boolean = false): string => {
    // 事業会社の場合は常に事業会社の色を使用
    if (isCompany) {
      return isHovered ? '#FBBF24' : PROFESSIONAL_COLORS.businessCompany;
    }
    
    switch (depth) {
      case 0: // 主管カンパニー
        return isHovered ? '#1E293B' : PROFESSIONAL_COLORS.company;
      case 1: // 主管部門
        return isHovered ? '#2563EB' : PROFESSIONAL_COLORS.division;
      case 2: // 主管部
        return isHovered ? '#059669' : PROFESSIONAL_COLORS.department;
      default: // 事業会社（深さ3以上）
        return isHovered ? '#FBBF24' : PROFESSIONAL_COLORS.businessCompany;
    }
  };

  // SVGを描画
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

    // オフセットを計算（左側に配置するため、Xオフセットを増やす）
    const offsetX = 60; // 左側のマージンを増やす
    const offsetY = 40;

    // ノードを描画（最上位の統合会社は表示しない）
    const nodes = packedData.descendants().filter((node: any) => node.depth > 0);
    
    nodes.forEach((node: any) => {
      if (!node.r) return;

      const nodeData = node.data;
      const depth = nodeData.depth;
      const isHovered = hoveredNodeId === nodeData.id;
      const isCompany = !!nodeData.company; // 事業会社かどうか
      const color = getColorByDepth(depth, isHovered, isCompany);
      
      // 円を描画
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(node.x + offsetX));
      circle.setAttribute('cy', String(node.y + offsetY));
      circle.setAttribute('r', String(node.r));
      
      // 最上位の統合会社は表示しないため、depth=1は主管部門として扱う
      if (depth === 1) {
        // 主管部門（事業単位）- 鮮やかな青
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.85' : '0.75');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5'); // 細い白フチ
        circle.setAttribute('filter', 'url(#bubble-shadow)'); // 半透明シャドウ
      } else if (depth === 2) {
        // 主管部（実務単位）- 鮮やかな緑
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.8' : '0.7');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5'); // 細い白フチ
        circle.setAttribute('filter', 'url(#bubble-shadow)'); // 半透明シャドウ
      } else {
        // 事業会社（重要ポイント）- オレンジ
        circle.setAttribute('fill', color);
        circle.setAttribute('fill-opacity', isHovered ? '0.85' : '0.75');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5'); // 細い白フチ
        circle.setAttribute('filter', 'url(#bubble-shadow)'); // 半透明シャドウ
      }
      
      circle.style.cursor = 'pointer';
      circle.setAttribute('data-node-id', nodeData.id);
      
      // ツールチップの内容を構築
      let tooltipContent = nodeData.name;
      if (nodeData.title) {
        tooltipContent += `\n${nodeData.title}`;
      }
      if (isCompany && nodeData.company) {
        const company = nodeData.company;
        tooltipContent += `\nコード: ${company.code}`;
        tooltipContent += `\n区分: ${company.category}`;
        tooltipContent += `\n地域: ${company.region}`;
      } else if (nodeData.value) {
        tooltipContent += `\n${nodeData.value}社`;
      }
      
      // ホバーエフェクト
      circle.addEventListener('mouseenter', (e) => {
        setHoveredNodeId(nodeData.id);
        
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
      
      circle.addEventListener('click', (e) => {
        if (onNodeClick && nodeData.originalData) {
          // 事業会社の場合は、companies配列にその事業会社を含める
          if (nodeData.company) {
            const companyNode: CompanyNodeData = {
              ...nodeData.originalData,
              companies: [nodeData.company],
            };
            onNodeClick(companyNode, e as unknown as MouseEvent);
          } else {
            onNodeClick(nodeData.originalData, e as unknown as MouseEvent);
          }
        }
      });
      
      svg.appendChild(circle);

      // 組織名のラベルを追加（十分なサイズの場合）
      if (node.r > 30) {
        // 深さに応じたフォントサイズとウェイトを設定
        // 最上位の統合会社は表示しないため、depth=1は主管部門として扱う
        let fontSize: number;
        let fontWeight: string;
        
        if (depth === 1) {
          // 主管部門名: 18px, weight 700
          fontSize = 18;
          fontWeight = '700';
        } else if (depth === 2) {
          // 主管部名: 16px, weight 600
          fontSize = 16;
          fontWeight = '600';
        } else {
          // 事業会社名: 12px, weight 500
          fontSize = 12;
          fontWeight = '500';
        }
        
        // ラベルを円の内側の上部に配置
        const labelY = node.y + offsetY - node.r * 0.85; // 円の中心から上部85%の位置（さらに上に）
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(node.x + offsetX));
        text.setAttribute('y', String(labelY));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'baseline'); // 上部基準に変更
        text.setAttribute('font-size', fontSize + 'px');
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('font-weight', fontWeight);
        text.style.pointerEvents = 'none';
        text.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
        
        // テキストを複数行に分割（長い場合のみ）
        const name = nodeData.name;
        // 深さに応じた最大文字数を設定
        const maxCharsPerLine = depth === 1 ? 8 : depth === 2 ? 10 : 12;
        let isMultiLine = false;
        
        if (name.length > maxCharsPerLine && node.r > 50 && !isCompany) {
          isMultiLine = true;
          // 2行に分割
          const mid = Math.ceil(name.length / 2);
          let splitPoint = mid;
          
          // 適切な分割点を探す（スペースや句読点の前）
          for (let i = mid; i < name.length && i < mid + 5; i++) {
            if (name[i] === ' ' || name[i] === '・' || name[i] === '部' || name[i] === 'ビジネス') {
              splitPoint = i + 1;
              break;
            }
          }
          
          const line1 = name.substring(0, splitPoint);
          const line2 = name.substring(splitPoint);
          
          const tspan1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          tspan1.setAttribute('x', String(node.x + offsetX));
          tspan1.setAttribute('dy', '0');
          tspan1.textContent = line1;
          text.appendChild(tspan1);
          
          const tspan2 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          tspan2.setAttribute('x', String(node.x + offsetX));
          tspan2.setAttribute('dy', '1.2em');
          tspan2.textContent = line2;
          text.appendChild(tspan2);
        } else {
          // 事業会社の場合は略称または短縮名を表示
          let displayText = name;
          if (isCompany && nodeData.company?.nameShort) {
            displayText = nodeData.company.nameShort;
          } else if (isCompany && name.length > 12) {
            displayText = name.substring(0, 12) + '...';
          }
          text.textContent = displayText;
        }
        
        svg.appendChild(text);

        // 英語名または補助情報を表示（補助情報として小さく、日本語名の下に配置）
        if (nodeData.title && node.r > 50 && !isCompany) {
          const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          // 日本語名の下に配置（2行の場合は2行目の下）
          const titleY = isMultiLine
            ? labelY + fontSize * 1.2 + 11
            : labelY + fontSize * 0.6 + 11;
          titleText.setAttribute('x', String(node.x + offsetX));
          titleText.setAttribute('y', String(titleY));
          titleText.setAttribute('text-anchor', 'middle');
          titleText.setAttribute('dominant-baseline', 'baseline');
          titleText.setAttribute('font-size', '11px'); // 英語: 11px
          titleText.setAttribute('fill', '#ffffff');
          titleText.setAttribute('font-weight', '400');
          titleText.setAttribute('opacity', '0.7');
          titleText.style.pointerEvents = 'none';
          titleText.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
          titleText.textContent = nodeData.title;
          svg.appendChild(titleText);
        }

        // 事業会社数のバッジを表示（十分なサイズの場合）
        if (!isCompany && nodeData.value && node.r > 60) {
          const companyCount = nodeData.value;
          
          // 左下：事業会社数（見やすく改善）
          const textX = node.x + offsetX - node.r * 0.35;
          const textY = node.y + offsetY + node.r * 0.6; // 少し上に移動
          const textContent = `${companyCount}社`;
          
          // テキストの長さに応じてバッジの幅を調整（概算）
          const estimatedWidth = textContent.length * 9 + 12; // 文字数 × 9px + パディング
          const badgeWidth = Math.max(estimatedWidth, 40);
          const badgeHeight = 24;
          
          // 背景バッジ（半透明の黒、角丸）
          const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          badgeRect.setAttribute('x', String(textX - badgeWidth / 2));
          badgeRect.setAttribute('y', String(textY - badgeHeight / 2));
          badgeRect.setAttribute('width', String(badgeWidth));
          badgeRect.setAttribute('height', String(badgeHeight));
          badgeRect.setAttribute('rx', '6');
          badgeRect.setAttribute('ry', '6');
          badgeRect.setAttribute('fill', 'rgba(0, 0, 0, 0.7)'); // より濃い背景で見やすく
          badgeRect.style.pointerEvents = 'none';
          svg.appendChild(badgeRect);
          
          // 事業会社数のテキスト
          const countText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          countText.setAttribute('x', String(textX));
          countText.setAttribute('y', String(textY));
          countText.setAttribute('text-anchor', 'middle');
          countText.setAttribute('dominant-baseline', 'middle');
          countText.setAttribute('font-size', '15px'); // 会社数: 15px（大きく）
          countText.setAttribute('fill', '#FFFFFF'); // 白色で見やすく
          countText.setAttribute('font-weight', '700'); // 太字で見やすく
          countText.style.pointerEvents = 'none';
          countText.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
          countText.textContent = textContent;
          svg.appendChild(countText);
        }
      }
    });
  }, [packedData, hoveredNodeId, onNodeClick]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '600px',
        position: 'relative',
        backgroundColor: '#F8FAFC',
        borderRadius: '12px',
        padding: '20px',
        overflow: 'auto', // スクロール可能にする
      }}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
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
  );
}
