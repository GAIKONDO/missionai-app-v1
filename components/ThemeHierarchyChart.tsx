'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hierarchy, pack } from 'd3-hierarchy';
import type { ThemeHierarchyConfig } from '@/lib/themeHierarchy';
import type { Theme, FocusInitiative } from '@/lib/orgApi';
// import type { CompanyFocusInitiative } from '@/lib/companiesApi'; // Companiesテーブル削除のためコメントアウト
type CompanyFocusInitiative = any; // Companiesテーブル削除のため、一時的な型定義

interface ThemeHierarchyChartProps {
  config: ThemeHierarchyConfig;
  themes: Theme[];
  initiatives: FocusInitiative[] | CompanyFocusInitiative[];
  width?: number;
  height?: number;
  onThemeClick?: (theme: Theme) => void;
  viewMode?: 'organization' | 'company';
}

// 注力施策がテーマに関連しているかチェックするヘルパー関数
function isInitiativeRelatedToTheme(
  initiative: FocusInitiative | CompanyFocusInitiative,
  themeId: string
): boolean {
  // 組織の注力施策の場合
  if ('organizationId' in initiative) {
    const orgInitiative = initiative as FocusInitiative;
    return (
      (orgInitiative.themeIds && orgInitiative.themeIds.includes(themeId)) ||
      orgInitiative.themeId === themeId
    );
  } else {
    // 事業会社の注力施策の場合
    const companyInitiative = initiative as CompanyFocusInitiative;
    const themeIds = Array.isArray(companyInitiative.themeIds)
      ? companyInitiative.themeIds
      : typeof companyInitiative.themeIds === 'string'
      ? JSON.parse(companyInitiative.themeIds)
      : [];
    return themeIds.includes(themeId);
  }
}

// 階層ごとの色設定
const LEVEL_COLORS = [
  '#1A1A1A', // 階層1（中心）- 黒
  '#4262FF', // 階層2 - 青
  '#10B981', // 階層3 - 緑
  '#F59E0B', // 階層4 - オレンジ
  '#8B5CF6', // 階層5 - 紫
  '#EC4899', // 階層6 - ピンク
  '#06B6D4', // 階層7 - シアン
  '#84CC16', // 階層8 - ライム
  '#F97316', // 階層9 - オレンジ
  '#6366F1', // 階層10 - インディゴ
];

export default function ThemeHierarchyChart({
  config,
  themes,
  initiatives,
  width = 1000,
  height = 1000,
  onThemeClick,
  viewMode = 'organization',
}: ThemeHierarchyChartProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredThemeId, setHoveredThemeId] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [actualSize, setActualSize] = useState({ width, height });

  // コンテナサイズに合わせてSVGサイズを調整
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight || window.innerHeight - 300;

      // コンテナサイズに合わせて調整（余白を考慮）
      const newWidth = Math.min(width, containerWidth - 20);
      const newHeight = Math.min(height, containerHeight - 20);

      setActualSize({ width: newWidth, height: newHeight });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [width, height]);

  // 階層データを構築（階層1を中心に、階層2以降をその子として配置）
  const hierarchyData = useMemo(() => {
    const levelMap = new Map<number, Theme[]>();
    
    // 各階層のテーマを取得
    config.levels.forEach(level => {
      const levelThemes = themes.filter(t => level.themeIds.includes(t.id));
      if (levelThemes.length > 0) {
        levelMap.set(level.level, levelThemes);
      }
    });

    // 階層1（中心）のテーマを取得
    const level1Themes = levelMap.get(1) || [];
    if (level1Themes.length === 0) {
      return {
        name: 'root',
        children: undefined,
      };
    }

    const level1Theme = level1Themes[0]; // 階層1は1つのみ
    const level1Initiatives = initiatives.filter(i => 
      isInitiativeRelatedToTheme(i, level1Theme.id)
    );

    // テーマに紐づく注力施策を子ノードとして追加する関数
    const addInitiativesToTheme = (theme: Theme, themeLevel: number): any[] => {
      const themeInitiatives = initiatives.filter(i => 
        isInitiativeRelatedToTheme(i, theme.id)
      );

      return themeInitiatives.map(initiative => ({
        name: initiative.title,
        id: `initiative_${initiative.id}`,
        level: themeLevel,
        initiative: initiative,
        isInitiative: true,
        value: 5, // 注力施策は小さめの値
      }));
    };

    // 階層2以降を階層1の子として構築
    const buildChildren = (parentLevel: number): any[] => {
      const children: any[] = [];
      const nextLevel = parentLevel + 1;

      if (nextLevel > config.maxLevels) {
        return children;
      }

      const levelThemes = levelMap.get(nextLevel) || [];
      levelThemes.forEach(theme => {
        const themeInitiatives = initiatives.filter(i => 
          isInitiativeRelatedToTheme(i, theme.id)
        );

        const childNode: any = {
          name: theme.title,
          id: theme.id,
          level: nextLevel,
          theme: theme,
          initiativeCount: themeInitiatives.length,
          value: Math.max(30 - (nextLevel - 2) * 5, 10), // 外側ほど小さく
        };

        // このテーマに紐づく注力施策を子として追加（テーマの直接の子として）
        const initiativeChildren = addInitiativesToTheme(theme, nextLevel);
        if (initiativeChildren.length > 0) {
          childNode.children = initiativeChildren;
        }

        // さらに下の階層がある場合は再帰的に追加
        // ただし、下位階層のテーマは、このテーマの子として追加するのではなく、
        // 階層1のテーマの子として追加する必要がある
        // しかし、階層構造を正しく保つために、下位階層のテーマもこのテーマの子として追加
        const grandchildren = buildChildren(nextLevel);
        if (grandchildren.length > 0) {
          if (childNode.children) {
            // 注力施策の後に下位階層のテーマを追加
            childNode.children = [...childNode.children, ...grandchildren];
          } else {
            childNode.children = grandchildren;
          }
        }

        children.push(childNode);
      });

      return children;
    };

    // 階層1のノードを作成
    const level1Node: any = {
      name: level1Theme.title,
      id: level1Theme.id,
      level: 1,
      theme: level1Theme,
      initiativeCount: level1Initiatives.length,
      value: 100, // 中心は大きめの値
    };

    // 階層1のテーマに紐づく注力施策を子として追加
    const level1InitiativeChildren = addInitiativesToTheme(level1Theme, 1);
    if (level1InitiativeChildren.length > 0) {
      level1Node.children = level1InitiativeChildren;
    }

    // 階層2以降を階層1の子として追加
    const level2AndBelow = buildChildren(1);
    if (level2AndBelow.length > 0) {
      if (level1Node.children) {
        level1Node.children = [...level1Node.children, ...level2AndBelow];
      } else {
        level1Node.children = level2AndBelow;
      }
    }

    return {
      name: 'root',
      children: [level1Node],
    };
  }, [config, themes, initiatives]);

  // D3階層データを作成
  const root = useMemo(() => {
    return hierarchy(hierarchyData)
      .sum((d: any) => d.value || 1)
      .sort((a: any, b: any) => {
        // 階層1を最初に、その後は階層順
        if (a.data.level !== b.data.level) {
          return a.data.level - b.data.level;
        }
        // 注力施策は後ろに
        if (a.data.isInitiative !== b.data.isInitiative) {
          return a.data.isInitiative ? 1 : -1;
        }
        return (b.value || 0) - (a.value || 0);
      });
  }, [hierarchyData]);

  // Packレイアウトを計算
  const packLayout = useMemo(() => {
    return pack()
      .size([actualSize.width - 80, actualSize.height - 80])
      .padding(5);
  }, [actualSize]);

  const packedData = useMemo(() => {
    return packLayout(root as any);
  }, [packLayout, root]);

  // SVGを描画（D3.jsのpackレイアウトを使用、組織のバブルチャートと同じ方式）
  useEffect(() => {
    if (!svgRef.current || !packedData) return;

    const svg = svgRef.current;
    const g = svg.querySelector('g') || document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // 既存の要素をクリア
    g.innerHTML = '';

    // シャドウフィルターを定義（組織のバブルチャートと同じ）
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'theme-bubble-shadow');
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
    g.appendChild(defs);

    const offsetX = 40;
    const offsetY = 40;

    // すべてのテーマノードを収集（階層構造を保持）
    const themeNodes: any[] = [];
    const collectThemeNodes = (node: any) => {
      if (node.data && node.r && !node.data.isInitiative) {
        themeNodes.push(node);
      }
      if (node.children) {
        node.children.forEach((child: any) => collectThemeNodes(child));
      }
    };

    if (packedData.children && packedData.children.length > 0) {
      packedData.children.forEach((child: any) => collectThemeNodes(child));
    }

    // すべてのテーマのバブルの底辺を一致させる
    // 最も下にあるバブルの底辺のy座標を取得
    let maxBottomY = 0;
    themeNodes.forEach((node: any) => {
      const bottomY = node.y + node.r;
      if (bottomY > maxBottomY) {
        maxBottomY = bottomY;
      }
    });
    
    // テーマノードとその調整後のy座標オフセットをマッピング
    const themeAdjustments = new Map<string, number>();
    
    // テーマのバブルを先に描画（背景として）
    // すべてのバブルの底辺を同じy座標に揃える
    themeNodes.forEach((node: any) => {
      const level = node.data.level || 0;
      const color = LEVEL_COLORS[level - 1] || '#808080';
      const isHovered = hoveredThemeId === node.data.id;
      const isSelected = selectedThemeId === node.data.id;

      // 底辺を一致させるためにy座標を調整
      const adjustedY = maxBottomY - node.r;
      const yOffset = adjustedY - node.y; // y座標の調整量を記録
      themeAdjustments.set(node.data.id, yOffset);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(node.x + offsetX));
      circle.setAttribute('cy', String(adjustedY + offsetY));
      circle.setAttribute('r', String(node.r));
      circle.setAttribute('fill', color);
      circle.setAttribute('fill-opacity', isHovered || isSelected ? '0.8' : level === 1 ? '0.7' : '0.5');
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', isHovered || isSelected ? '3' : '1.5');
      circle.setAttribute('filter', 'url(#theme-bubble-shadow)');
      circle.setAttribute('cursor', 'pointer');
      circle.setAttribute('data-theme-id', node.data.id);
      
      circle.addEventListener('mouseenter', () => {
        setHoveredThemeId(node.data.id);
      });
      
      circle.addEventListener('mouseleave', () => {
        setHoveredThemeId(null);
      });
      
      circle.addEventListener('click', () => {
        setSelectedThemeId(node.data.id);
        if (node.data.theme && onThemeClick) {
          onThemeClick(node.data.theme);
        }
      });

      g.appendChild(circle);

      // テーマ名を表示（バブルの上部のギリギリの内側）
      if (node.r > 15) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(node.x + offsetX));
        // バブルの上部のギリギリの内側に配置（調整後のy座標を使用）
        text.setAttribute('y', String(adjustedY + offsetY - node.r + 20));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'baseline'); // ベースラインを基準にする
        text.setAttribute('fill', '#FFFFFF');
        text.setAttribute('font-size', String(Math.min(node.r / 3, 14)));
        text.setAttribute('font-weight', '600');
        text.setAttribute('pointer-events', 'none');
        text.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
        
        let displayText = node.data.name;
        if (node.r < 40 && displayText.length > 10) {
          displayText = displayText.substring(0, 8) + '...';
        }
        
        text.textContent = displayText;
        g.appendChild(text);
      }

      // テーマの場合のみ注力施策数を表示
      if (node.data.initiativeCount > 0 && node.r > 40) {
        const countText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        countText.setAttribute('x', String(node.x + offsetX));
        countText.setAttribute('y', String(adjustedY + offsetY + node.r / 2 + 16));
        countText.setAttribute('text-anchor', 'middle');
        countText.setAttribute('dominant-baseline', 'middle');
        countText.setAttribute('fill', '#666666');
        countText.setAttribute('font-size', '12px');
        countText.setAttribute('pointer-events', 'none');
        countText.textContent = `${node.data.initiativeCount}件`;
        g.appendChild(countText);
      }
    });

    // 注力施策のバブルを後から描画（テーマの上に表示）
    // packレイアウトの階層構造を保持して、各テーマの子ノードとして描画
    const drawInitiatives = (parentNode: any, parentThemeId: string) => {
      if (!parentNode.children) return;
      
      // 親テーマのy座標調整量を取得
      const parentYOffset = themeAdjustments.get(parentThemeId) || 0;
      
      parentNode.children.forEach((childNode: any) => {
        if (childNode.data && childNode.data.isInitiative && childNode.r) {
          // 注力施策のバブルを描画（親テーマと同じだけy座標を調整）
          const color = '#F59E0B'; // 注力施策はオレンジ色
          const isHovered = hoveredThemeId === childNode.data.id;
          const isSelected = selectedThemeId === childNode.data.id;

          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', String(childNode.x + offsetX));
          // 親テーマと同じだけy座標を調整
          circle.setAttribute('cy', String(childNode.y + offsetY + parentYOffset));
          circle.setAttribute('r', String(childNode.r));
          circle.setAttribute('fill', color);
          circle.setAttribute('fill-opacity', isHovered || isSelected ? '0.7' : '0.5');
          circle.setAttribute('stroke', color);
          circle.setAttribute('stroke-width', isHovered || isSelected ? '2' : '1.5');
          circle.setAttribute('filter', 'url(#theme-bubble-shadow)');
          circle.setAttribute('cursor', 'pointer');
          circle.setAttribute('data-theme-id', childNode.data.id);
          
          circle.addEventListener('mouseenter', () => {
            setHoveredThemeId(childNode.data.id);
          });
          
          circle.addEventListener('mouseleave', () => {
            setHoveredThemeId(null);
          });
          
          // シングルクリックでは選択のみ
          circle.addEventListener('click', () => {
            setSelectedThemeId(childNode.data.id);
          });
          
          // ダブルクリックでページに移動
          circle.addEventListener('dblclick', () => {
            if (childNode.data.initiative) {
              if (viewMode === 'organization') {
                const orgInitiative = childNode.data.initiative as FocusInitiative;
                router.push(`/organization/initiative?organizationId=${orgInitiative.organizationId}&initiativeId=${orgInitiative.id}`);
              } else {
                const companyInitiative = childNode.data.initiative as CompanyFocusInitiative;
                router.push(`/companies/initiative?companyId=${companyInitiative.companyId}&initiativeId=${companyInitiative.id}`);
              }
            }
          });

          g.appendChild(circle);

          // 注力施策名を表示
          if (childNode.r > 12) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', String(childNode.x + offsetX));
            // 親テーマと同じだけy座標を調整
            text.setAttribute('y', String(childNode.y + offsetY + parentYOffset));
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', '#FFFFFF');
            text.setAttribute('font-size', String(Math.min(childNode.r / 3, 10)));
            text.setAttribute('font-weight', '400');
            text.setAttribute('pointer-events', 'none');
            text.style.fontFamily = "'Inter', 'Noto Sans JP', -apple-system, sans-serif";
            
            let displayText = childNode.data.name;
            if (childNode.r < 30 && displayText.length > 8) {
              displayText = displayText.substring(0, 6) + '...';
            }
            
            text.textContent = displayText;
            g.appendChild(text);
          }
        } else if (childNode.data && !childNode.data.isInitiative) {
          // 下位階層のテーマの場合は、そのテーマの注力施策も描画
          drawInitiatives(childNode, childNode.data.id);
        }
      });
    };

    // 各テーマの注力施策を描画
    themeNodes.forEach((node: any) => {
      drawInitiatives(node, node.data.id);
    });

    // SVGにグループを追加
    if (!svg.querySelector('g')) {
      svg.appendChild(g);
    }
  }, [packedData, hoveredThemeId, selectedThemeId, onThemeClick, router, viewMode]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
      }}
    >
      <svg
        ref={svgRef}
        width={actualSize.width}
        height={actualSize.height}
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto',
        }}
        viewBox={`0 0 ${actualSize.width} ${actualSize.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform={`translate(40, 40)`}></g>
      </svg>
    </div>
  );
}
