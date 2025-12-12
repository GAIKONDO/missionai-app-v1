'use client';

import { useMemo, useEffect, useRef } from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';
import { arc } from 'd3-shape';

export interface Band {
  id: string;
  label: string;
}

export interface Segment {
  id: string;
  label: string;
}

export interface Company {
  name: string;
  logoUrl?: string;
  description?: string;
}

export interface Cell {
  bandId: string;
  segmentId: string;
  companies: Company[];
}

export interface ChaosMapData {
  bands: Band[];
  segments: Segment[];
  cells: Cell[];
  title?: string;
}

interface ChaosMapProps {
  data: ChaosMapData;
  width?: number;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  backgroundImageUrl?: string; // 背景画像のURL
}

// 極座標をXY座標に変換
function polarToCartesian(angle: number, radius: number, centerX: number, centerY: number) {
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

// 角度をラジアンに変換
function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export default function ChaosMap({
  data,
  width = 800,
  height = 600,
  innerRadius = 80,
  outerRadius = 280,
  startAngle = -180, // 左方向から開始
  endAngle = 0, // 右方向まで（180度の半円）
  backgroundImageUrl,
}: ChaosMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // 原点を左下に配置して半円をきれいに表示
  // 半円全体が画面内に収まるように、原点を適切な位置に配置
  const centerX = outerRadius + 100;
  const centerY = height - 50; // 下に配置

  // 角度と半径のスケールを設定
  const angleScale = useMemo(() => {
    const startRad = degToRad(startAngle);
    const endRad = degToRad(endAngle);
    return scaleBand()
      .domain(data.segments.map((s) => s.id))
      .range([startRad, endRad])
      .padding(0.05);
  }, [data.segments, startAngle, endAngle]);

  const radiusScale = useMemo(() => {
    return scaleBand()
      .domain(data.bands.map((b) => b.id))
      .range([innerRadius, outerRadius])
      .padding(0.1);
  }, [data.bands, innerRadius, outerRadius]);

  // 各セルのパスを生成（内側から外側へ順番に並べる）
  const cellPaths = useMemo(() => {
    const paths = data.cells.map((cell) => {
      const segment = data.segments.find((s) => s.id === cell.segmentId);
      const band = data.bands.find((b) => b.id === cell.bandId);
      
      if (!segment || !band) return null;

      const angleBand = angleScale(segment.id);
      const radiusBand = radiusScale(band.id);

      if (angleBand === undefined || radiusBand === undefined) return null;

      const startAngle = angleBand;
      const endAngle = startAngle + angleScale.bandwidth();
      const innerRadius = radiusBand;
      const outerRadius = innerRadius + radiusScale.bandwidth();

      const arcGenerator = arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .startAngle(startAngle)
        .endAngle(endAngle);

      // arcGeneratorにデータオブジェクトを渡す（d3-shapeのarcはデータオブジェクトを受け取る）
      const path = arcGenerator({
        innerRadius,
        outerRadius,
        startAngle,
        endAngle,
      } as any);
      
      // デバッグ: pathが正しく生成されているか確認
      if (!path) {
        console.warn(`[ChaosMap] pathが生成されませんでした:`, {
          innerRadius,
          outerRadius,
          startAngle,
          endAngle,
        });
      }
      const centerAngle = (startAngle + endAngle) / 2;
      const centerRadius = (innerRadius + outerRadius) / 2;
      const center = polarToCartesian(centerAngle, centerRadius, centerX, centerY);

      // バンドのインデックスを取得（内側から外側への順序）
      const bandIndex = data.bands.findIndex((b) => b.id === band.id);

      return {
        cell,
        path,
        centerAngle,
        centerRadius,
        center,
        innerRadius,
        outerRadius,
        startAngle,
        endAngle,
        segment,
        band,
        bandIndex,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
    
    // 内側から外側へ、左から右へ順番にソート
    return paths.sort((a, b) => {
      if (a.bandIndex !== b.bandIndex) {
        return a.bandIndex - b.bandIndex; // 内側から外側へ
      }
      return a.startAngle - b.startAngle; // 左から右へ
    });
  }, [data.cells, data.segments, data.bands, angleScale, radiusScale, centerX, centerY]);

  // バンドラベル用の位置を計算（各バンドの中央に配置）
  const bandLabels = useMemo(() => {
    const middleAngle = degToRad((startAngle + endAngle) / 2);
    return data.bands.map((band) => {
      const radiusBand = radiusScale(band.id);
      if (radiusBand === undefined) return null;
      const radius = radiusBand + radiusScale.bandwidth() / 2;
      const pos = polarToCartesian(middleAngle, radius, centerX, centerY);
      return { band, pos, radius };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }, [data.bands, radiusScale, startAngle, endAngle, centerX, centerY]);

  // セグメントラベル用の位置を計算
  const segmentLabels = useMemo(() => {
    return data.segments.map((segment) => {
      const angleBand = angleScale(segment.id);
      if (angleBand === undefined) return null;
      const angle = angleBand + angleScale.bandwidth() / 2;
      const radius = outerRadius + 30;
      const pos = polarToCartesian(angle, radius, centerX, centerY);
      return { segment, pos, angle };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }, [data.segments, angleScale, outerRadius, centerX, centerY]);

  // グラデーション定義（青系統、エリアごとに異なる色合い）
  const gradientColors = useMemo(() => {
    const colors: { [key: string]: { start: string; end: string } } = {};
    data.segments.forEach((segment, segIdx) => {
      // 各セグメントごとに異なる青系統のグラデーション
      const hue = 200 + (segIdx * 20) % 40; // 200-240の範囲で青系統
      const saturation = 70 + (segIdx * 3) % 15; // 70-85%
      // 内側は明るく、外側は濃く（グラデーションを明確に）
      // より明確なコントラストで設定（RGB形式で確認しやすいように）
      // デバッグ: より濃い色で確実に表示されるように
      colors[segment.id] = {
        start: `hsl(${hue}, ${saturation}%, 80%)`, // 内側：明るい青
        end: `hsl(${hue}, ${saturation}%, 40%)`,   // 外側：濃い青（より濃く）
      };
    });
    console.log('[ChaosMap] グラデーション色定義:', colors);
    return colors;
  }, [data.segments]);

  // DOMレンダリング後にグラデーションの存在を確認
  useEffect(() => {
    if (!svgRef.current) return;
    
    console.log('[ChaosMap] SVG要素がレンダリングされました');
    
    // 最初のセルのグラデーションIDを確認
    if (cellPaths.length > 0) {
      const firstGradientId = `gradient-${cellPaths[0].cell.bandId}-${cellPaths[0].cell.segmentId}`;
      const gradientElement = svgRef.current.querySelector(`#${firstGradientId}`);
      
      console.log('[ChaosMap] グラデーション要素の確認:', {
        gradientId: firstGradientId,
        found: !!gradientElement,
        element: gradientElement,
      });
      
      // セルのpath要素を確認（背景のrectやパターンのpathを除外）
      // セルのpathはdefsの後に描画されるので、defsの後の最初のpathがセルのpath
      const defsElement = svgRef.current.querySelector('defs');
      if (defsElement) {
        const allPaths = Array.from(svgRef.current.querySelectorAll('path'));
        // defsの後のpath要素を取得
        const defsPath = defsElement.querySelector('path') as SVGPathElement | null;
        const cellPathElements = allPaths.filter((p) => {
          const defsIndex = defsPath ? allPaths.indexOf(defsPath) : -1;
          return allPaths.indexOf(p) > defsIndex || !defsElement.contains(p);
        }).filter((p) => !defsElement.contains(p));
        
        console.log('[ChaosMap] セルのpath要素の数:', cellPathElements.length);
        
        if (cellPathElements.length > 0) {
          const firstCellPath = cellPathElements[0] as SVGPathElement;
          const fillValue = firstCellPath.getAttribute('fill');
          const dValue = firstCellPath.getAttribute('d');
          console.log('[ChaosMap] 最初のセルpath要素:', {
            fill: fillValue,
            d: dValue ? dValue.substring(0, 50) + '...' : 'なし',
          });
          
          // 計算されたスタイルも確認
          const computedStyle = window.getComputedStyle(firstCellPath);
          console.log('[ChaosMap] 計算されたfillスタイル:', computedStyle.fill);
        }
      }
      
      // グラデーション要素が存在するか確認
      const gradientExists = svgRef.current.querySelector(`#${firstGradientId}`);
      console.log('[ChaosMap] グラデーション要素の存在確認:', {
        gradientId: firstGradientId,
        exists: !!gradientExists,
        element: gradientExists,
      });
      
      // すべてのpath要素を確認（デバッグ用）
      const allPaths = svgRef.current.querySelectorAll('path');
      console.log('[ChaosMap] すべてのpath要素:', Array.from(allPaths).map((p, i) => ({
        index: i,
        fill: p.getAttribute('fill'),
        d: p.getAttribute('d') ? p.getAttribute('d')!.substring(0, 30) + '...' : 'なし',
        isInDefs: svgRef.current?.querySelector('defs')?.contains(p) || false,
      })));
    }
  }, [cellPaths]);

  return (
    <div style={{ width: '100%', overflow: 'hidden', padding: '20px', position: 'relative' }}>
      {/* 背景画像とロゴを配置するコンテナ */}
      <div style={{ position: 'relative', width: '100%', maxWidth: `${width}px`, height: `${height}px`, margin: '0 auto' }}>
        {/* 背景画像 */}
        {backgroundImageUrl && (
          <img
            src={backgroundImageUrl}
            alt="カオスマップ背景"
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 1,
              objectFit: 'contain',
            }}
          />
        )}
        
        {/* 企業ロゴを配置するレイヤー（絶対位置） */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none' }}>
        {cellPaths.map((cellPath) => {
          if (cellPath.cell.companies.length === 0) return null;
          
          return cellPath.cell.companies.map((company, companyIdx) => {
            const logoAngle = cellPath.centerAngle;
            const logoRadius = cellPath.centerRadius;
            const logoSpacing = 20;
            const logoOffset = (companyIdx - (cellPath.cell.companies.length - 1) / 2) * logoSpacing;
            
            // ロゴの位置を計算（SVG座標系で）
            const logoPos = polarToCartesian(
              logoAngle,
              logoRadius + logoOffset,
              centerX,
              centerY
            );

            const logoSize = 30;
            // 相対位置を計算（パーセンテージ）
            const leftPercent = (logoPos.x / width) * 100;
            const topPercent = (logoPos.y / height) * 100;

            return (
              <div
                key={`logo-${cellPath.cell.bandId}-${cellPath.cell.segmentId}-${companyIdx}`}
                style={{
                  position: 'absolute',
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${logoSize}px`,
                  height: `${logoSize}px`,
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                }}
              >
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      backgroundColor: '#90caf9',
                      border: '1px solid #1976d2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: '#1976d2',
                    }}
                  >
                    {company.name.substring(0, 2)}
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    top: `${logoSize + 4}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '10px',
                    color: '#424242',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}
                >
                  {company.name}
                </div>
              </div>
            );
          });
        })}
        </div>
      </div>
    </div>
  );
}

