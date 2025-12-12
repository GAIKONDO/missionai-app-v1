'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { scaleOrdinal } from 'd3-scale';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';

export interface EcosystemNode {
  id: string;
  label: string;
  value: number;
  category?: string;
  layer: number; // レイヤー番号（0から始まる）
}

export interface EcosystemLink {
  source: string;
  target: string;
  value: number;
}

export interface EcosystemAlluvialData {
  layers: string[]; // レイヤー名の配列（例: ['顧客', '課題', 'ソリューション', '収益']）
  nodes: EcosystemNode[];
  links: EcosystemLink[];
}

interface EcosystemAlluvialDiagramProps {
  data: EcosystemAlluvialData;
  width?: number;
  height?: number;
  title?: string;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export default function EcosystemAlluvialDiagram({
  data,
  width = 1400,
  height = 700,
  title,
  margin = { top: 120, right: 100, bottom: 100, left: 100 }, // タイトルと図の間を開けるためtopを増やす
}: EcosystemAlluvialDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  // 編集モードの状態管理
  const [isEditMode, setIsEditMode] = useState(false);
  
  // データの一意のキーを生成（タイトルとノードIDのリストから）
  const storageKey = useMemo(() => {
    const nodeIds = data.nodes.map(n => n.id).sort().join(',');
    const titleHash = title ? title.replace(/\s+/g, '-') : 'diagram';
    return `ecosystem-alluvial-${titleHash}-${nodeIds.slice(0, 50)}`;
  }, [data.nodes, title]);
  
  // localStorageからノードの位置オフセットを読み込む
  const loadNodeOffsets = (): Map<string, { x: number; y: number }> => {
    if (typeof window === 'undefined') return new Map();
    try {
      const saved = localStorage.getItem(`${storageKey}-offsets`);
      if (saved) {
        const data = JSON.parse(saved);
        return new Map(data);
      }
    } catch (e) {
      console.error('ノードオフセットの読み込みエラー:', e);
    }
    return new Map();
  };
  
  // localStorageからノードのサイズを読み込む
  const loadNodeSizes = (): Map<string, { width: number; height: number }> => {
    if (typeof window === 'undefined') return new Map();
    try {
      const saved = localStorage.getItem(`${storageKey}-sizes`);
      if (saved) {
        const data = JSON.parse(saved);
        return new Map(data);
      }
    } catch (e) {
      console.error('ノードサイズの読み込みエラー:', e);
    }
    return new Map();
  };
  
  // localStorageからLayerごとの枠線設定を読み込む
  const loadLayerBorders = (): Map<number, boolean> => {
    if (typeof window === 'undefined') return new Map();
    try {
      const saved = localStorage.getItem(`${storageKey}-layer-borders`);
      if (saved) {
        const data = JSON.parse(saved);
        return new Map(data.map(([k, v]: [string, any]) => [parseInt(k), v]));
      }
    } catch (e) {
      console.error('Layer枠線設定の読み込みエラー:', e);
    }
    return new Map();
  };
  
  // localStorageからLayerごとの矩形の表示設定を読み込む
  const loadLayerRectVisibility = (): Map<number, boolean> => {
    if (typeof window === 'undefined') return new Map();
    try {
      const saved = localStorage.getItem(`${storageKey}-layer-rect-visibility`);
      if (saved) {
        const data = JSON.parse(saved);
        return new Map(data.map(([k, v]: [string, any]) => [parseInt(k), v]));
      }
    } catch (e) {
      console.error('Layer矩形表示設定の読み込みエラー:', e);
    }
    return new Map();
  };
  
  // localStorageからLayerラベルの位置を読み込む
  const loadLayerLabelPositions = (): Map<number, { x: number; y: number }> => {
    if (typeof window === 'undefined') return new Map();
    try {
      const saved = localStorage.getItem(`${storageKey}-layer-labels`);
      if (saved) {
        const data = JSON.parse(saved);
        return new Map(data.map(([k, v]: [string, any]) => [parseInt(k), v]));
      }
    } catch (e) {
      console.error('Layerラベル位置の読み込みエラー:', e);
    }
    return new Map();
  };
  
  // localStorageからLayerごとのテキスト表示設定を読み込む
  const loadLayerTextVisibility = (): Map<number, boolean> => {
    if (typeof window === 'undefined') return new Map();
    try {
      const saved = localStorage.getItem(`${storageKey}-layer-text-visibility`);
      if (saved) {
        const data = JSON.parse(saved);
        return new Map(data.map(([k, v]: [string, any]) => [parseInt(k), v]));
      }
    } catch (e) {
      console.error('Layerテキスト表示設定の読み込みエラー:', e);
    }
    return new Map();
  };
  
  // ノードの位置オフセットを管理（ドラッグで調整した位置を保持）
  const [nodeOffsets, setNodeOffsets] = useState<Map<string, { x: number; y: number }>>(loadNodeOffsets);
  // ノードのサイズを管理（リサイズで調整したサイズを保持）
  const [nodeSizes, setNodeSizes] = useState<Map<string, { width: number; height: number }>>(loadNodeSizes);
  // Layerごとの枠線の有無を管理（true: 表示, false: 非表示）
  const [layerBorders, setLayerBorders] = useState<Map<number, boolean>>(loadLayerBorders);
  // Layerごとの矩形の表示/非表示を管理（true: 表示, false: 非表示）
  const [layerRectVisibility, setLayerRectVisibility] = useState<Map<number, boolean>>(loadLayerRectVisibility);
  // Layerごとのテキストの表示/非表示を管理（true: 表示, false: 非表示）
  const [layerTextVisibility, setLayerTextVisibility] = useState<Map<number, boolean>>(loadLayerTextVisibility);
  // Layerラベルの位置を管理（ドラッグで調整した位置を保持）
  const [layerLabelPositions, setLayerLabelPositions] = useState<Map<number, { x: number; y: number }>>(loadLayerLabelPositions);
  const [resetConfirmModal, setResetConfirmModal] = useState(false);
  
  // nodeOffsetsが変更されたときにlocalStorageに保存
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const data = Array.from(nodeOffsets.entries());
      localStorage.setItem(`${storageKey}-offsets`, JSON.stringify(data));
    } catch (e) {
      console.error('ノードオフセットの保存エラー:', e);
    }
  }, [nodeOffsets, storageKey]);
  
  // nodeSizesが変更されたときにlocalStorageに保存
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const data = Array.from(nodeSizes.entries());
      localStorage.setItem(`${storageKey}-sizes`, JSON.stringify(data));
    } catch (e) {
      console.error('ノードサイズの保存エラー:', e);
    }
  }, [nodeSizes, storageKey]);
  
  // layerBordersが変更されたときにlocalStorageに保存
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const data = Array.from(layerBorders.entries());
      localStorage.setItem(`${storageKey}-layer-borders`, JSON.stringify(data));
    } catch (e) {
      console.error('Layer枠線設定の保存エラー:', e);
    }
  }, [layerBorders, storageKey]);
  
  // layerRectVisibilityが変更されたときにlocalStorageに保存
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const data = Array.from(layerRectVisibility.entries());
      localStorage.setItem(`${storageKey}-layer-rect-visibility`, JSON.stringify(data));
    } catch (e) {
      console.error('Layer矩形表示設定の保存エラー:', e);
    }
  }, [layerRectVisibility, storageKey]);
  
  // layerTextVisibilityが変更されたときにlocalStorageに保存
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const data = Array.from(layerTextVisibility.entries());
      localStorage.setItem(`${storageKey}-layer-text-visibility`, JSON.stringify(data));
    } catch (e) {
      console.error('Layerテキスト表示設定の保存エラー:', e);
    }
  }, [layerTextVisibility, storageKey]);
  
  // layerLabelPositionsが変更されたときにlocalStorageに保存
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const data = Array.from(layerLabelPositions.entries());
      localStorage.setItem(`${storageKey}-layer-labels`, JSON.stringify(data));
    } catch (e) {
      console.error('Layerラベル位置の保存エラー:', e);
    }
  }, [layerLabelPositions, storageKey]);

  // 完全モノトーン配色（Hashed研究スタイル）- さらに背景化
  const colorScale = useMemo(() => {
    const categories = Array.from(new Set(data.nodes.map(n => n.category || 'default')));
    // 背景に近い色（さらに背景化：Nodes disappear, flows speak）
    const backgroundColors = ['#FAFAFA', '#F8F8F8', '#F5F5F5', '#F3F3F3', '#F0F0F0', '#EEEEEE'];
    
    return scaleOrdinal<string>()
      .domain(categories)
      .range(backgroundColors.slice(0, categories.length));
  }, [data]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    // defsグループを作成（グラデーション用）
    const defs = svg.append('defs');

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const numLayers = data.layers.length;
    
    // レイヤー間の距離を調整（密度を上げる、コンテナ内に収まるように）
    const nodeWidth = 100;
    const nodePadding = 15; // ノード左右の余白（少し削る）
    
    // 利用可能な幅を計算（マージンとノード幅を考慮）
    const totalNodeWidth = nodeWidth * numLayers;
    const availableWidth = chartWidth - totalNodeWidth;
    
    // レイヤー間の距離を計算（密度を上げるため、最小間隔を少し削る）
    const minLayerSpacing = 130; // 最小レイヤー間距離（150→130、密度を上げる）
    const idealLayerSpacing = availableWidth / (numLayers - 1);
    const layerSpacing = Math.max(idealLayerSpacing, minLayerSpacing);
    
    // レイヤーの位置を計算（完全に中央揃え）
    // 最初のノードの中心から最後のノードの中心までの距離
    const totalSpacing = (numLayers - 1) * layerSpacing;
    // 全体の中心位置
    const centerX = chartWidth / 2;
    // 最初のノードの中心位置を計算（完全に中央揃え）
    // 全体の中心から、最初と最後のノードの中心間距離の半分を引く
    const startX = centerX - totalSpacing / 2;
    
    // メイングループを作成
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // データの正規化
    const totalValue = Math.max(
      ...data.layers.map((_, layerIndex) => {
        const layerNodes = data.nodes.filter(n => n.layer === layerIndex);
        return layerNodes.reduce((sum, n) => sum + n.value, 0);
      })
    );

    // 各レイヤーのノード位置を計算
    const nodePositions: Map<string, { x: number; y0: number; y1: number; y: number; height: number }> = new Map();
    const originalNodePositions: Map<string, { x: number; y0: number; y1: number; y: number; height: number }> = new Map();
    const layerNodeGroups: Map<number, EcosystemNode[]> = new Map();

    // レイヤーごとにノードをグループ化
    data.nodes.forEach(node => {
      if (!layerNodeGroups.has(node.layer)) {
        layerNodeGroups.set(node.layer, []);
      }
      layerNodeGroups.get(node.layer)!.push(node);
    });

    // 各レイヤーでノードを配置（ノード間に余白を追加）
    layerNodeGroups.forEach((nodes, layerIndex) => {
      const x = startX + layerIndex * layerSpacing;
      let currentY = 0;
      // 技術キーワードレイヤー（layer 0）は間隔を狭める
      // 技術カテゴリレイヤー（layer 1）は間隔を広げる
      let nodeSpacing = 5;
      if (layerIndex === 0) {
        nodeSpacing = 4; // 技術キーワードは4px
      } else if (layerIndex === 1) {
        nodeSpacing = 50; // 技術カテゴリは50px（30px → 50px）
      }
      // 技術キーワードレイヤーは最小高さを設定
      const minNodeHeight = layerIndex === 0 ? 20 : 0; // 技術キーワードは最小20px

      nodes.forEach((node, nodeIndex) => {
        let nodeHeight = (node.value / totalValue) * chartHeight * 0.95;
        // 技術キーワードレイヤーは高さを小さく、最小高さを確保
        if (layerIndex === 0) {
          nodeHeight = Math.max(nodeHeight * 0.6, minNodeHeight); // 60%の高さ、最小20px
        }
        // 技術カテゴリレイヤー（layer 1）は高さを調整
        if (layerIndex === 1) {
          nodeHeight = nodeHeight * 0.7; // 70%の高さに調整
          // クラウドのノードはさらに半分に
          if (node.id === 'tech-cloud') {
            nodeHeight = nodeHeight * 0.5; // さらに50%に（合計35%）
          }
          // AI技術のノードは元の高さに戻す（広くする）
          if (node.id === 'tech-ai') {
            nodeHeight = nodeHeight / 0.7; // 70%の調整を元に戻す（100%）
          }
        }
        // サービスレイヤー（layer 2）も高さを調整（縦幅を狭くする）
        let adjustedNodeHeight = nodeHeight;
        if (layerIndex === 2) {
          adjustedNodeHeight = nodeHeight * 0.5; // 50%の高さに調整（さらに狭く）
        }
        // 産業レイヤー（layer 3）も高さを調整
        if (layerIndex === 3) {
          adjustedNodeHeight = nodeHeight * 0.65; // 65%の高さに調整（さらに低く）
        }
        let y0 = currentY + (nodeIndex > 0 ? nodeSpacing : 0);
        // クラウドのノードを上に150pxずらす（200px上から50px下に調整）
        if (node.id === 'tech-cloud') {
          y0 = y0 - 150;
        }
        // データ分析のノードを上に30pxずらす
        if (node.id === 'tech-data') {
          y0 = y0 - 30;
        }
        // システム統合のノードを上に60pxずらす（50px + 10px）
        if (node.id === 'tech-integration') {
          y0 = y0 - 60;
        }
        // SIサービスのノードをさらに50px下げる（-50px + 50px = 0px、元の位置）
        if (node.id === 'service-si') {
          // 現在-50pxなので、さらに50px下げると元の位置に戻る
          y0 = y0 + 50;
        }
        // コンサルティングのノードを100px下げる
        if (node.id === 'service-consulting') {
          y0 = y0 + 100;
        }
        // プラットフォームのノードを30px下げる
        if (node.id === 'service-platform') {
          y0 = y0 + 30;
        }
        
        // サービスレイヤーの場合、ノードの高さを狭くするが、テキストの位置は変えない
        let finalY0 = y0;
        let finalY1 = y0 + adjustedNodeHeight;
        let finalY = (finalY0 + finalY1) / 2;
        
        if (layerIndex === 2) {
          // 元のテキスト位置を計算
          const originalY = (y0 + (y0 + nodeHeight)) / 2;
          // テキスト位置を維持しつつ、ノードの高さだけを狭くする
          finalY0 = originalY - adjustedNodeHeight / 2;
          finalY1 = originalY + adjustedNodeHeight / 2;
          finalY = originalY;
        } else {
          finalY0 = y0;
          finalY1 = y0 + adjustedNodeHeight;
          finalY = (finalY0 + finalY1) / 2;
        }

        // 元の位置を保存（オフセットなし）
        originalNodePositions.set(node.id, { 
          x, 
          y0: finalY0, 
          y1: finalY1, 
          y: finalY, 
          height: adjustedNodeHeight 
        });
        
        // ドラッグで調整されたオフセットを適用
        const offset = nodeOffsets.get(node.id) || { x: 0, y: 0 };
        nodePositions.set(node.id, { 
          x: x + offset.x, 
          y0: finalY0 + offset.y, 
          y1: finalY1 + offset.y, 
          y: finalY + offset.y, 
          height: adjustedNodeHeight 
        });
        // currentYは元のnodeHeightベースで計算
        // サービスレイヤー（layer 2）のノード間隔をさらに半分にする（0.25倍）
        const spacingForCurrentLayer = layerIndex === 2 ? nodeSpacing * 0.25 : nodeSpacing;
        currentY = y0 + nodeHeight + spacingForCurrentLayer;
      });
    });

    // リンクの位置を計算（Sankeyアルゴリズム）
    // すべてのレイヤー間のリンクを処理（隣接レイヤーだけでなく、スキップするリンクも含む）
    // まず、すべてのリンクをレイヤーペアごとにグループ化
    const layerPairs: Array<{ sourceLayer: number; targetLayer: number }> = [];
    data.links.forEach((link) => {
      const sourceNode = data.nodes.find(n => n.id === link.source);
      const targetNode = data.nodes.find(n => n.id === link.target);
      if (sourceNode && targetNode && sourceNode.layer < targetNode.layer) {
        const pair = { sourceLayer: sourceNode.layer, targetLayer: targetNode.layer };
        if (!layerPairs.some(p => p.sourceLayer === pair.sourceLayer && p.targetLayer === pair.targetLayer)) {
          layerPairs.push(pair);
        }
      }
    });
    
    // レイヤーペアをソート（sourceLayer, targetLayerの順）
    layerPairs.sort((a, b) => {
      if (a.sourceLayer !== b.sourceLayer) return a.sourceLayer - b.sourceLayer;
      return a.targetLayer - b.targetLayer;
    });

    // リンクの位置を計算（すべてのレイヤーペアで共有）
    const linkPositions: Map<string, { sourceY0: number; sourceY1: number; targetY0: number; targetY1: number }> = new Map();

    // 各レイヤーペアごとにリンクを処理
    layerPairs.forEach(({ sourceLayer, targetLayer }) => {

      // ソースレイヤーのノードごとにリンクをグループ化
      const sourceLinkGroups: Map<string, EcosystemLink[]> = new Map();
      data.links.forEach((link) => {
        const sourceNode = data.nodes.find(n => n.id === link.source);
        const targetNode = data.nodes.find(n => n.id === link.target);
        if (sourceNode?.layer === sourceLayer && targetNode?.layer === targetLayer) {
          if (!sourceLinkGroups.has(link.source)) {
            sourceLinkGroups.set(link.source, []);
          }
          sourceLinkGroups.get(link.source)!.push(link);
        }
      });

      // ターゲットレイヤーのノードごとにリンクをグループ化
      const targetLinkGroups: Map<string, EcosystemLink[]> = new Map();
      data.links.forEach((link) => {
        const sourceNode = data.nodes.find(n => n.id === link.source);
        const targetNode = data.nodes.find(n => n.id === link.target);
        if (sourceNode?.layer === sourceLayer && targetNode?.layer === targetLayer) {
          if (!targetLinkGroups.has(link.target)) {
            targetLinkGroups.set(link.target, []);
          }
          targetLinkGroups.get(link.target)!.push(link);
        }
      });

      // ソース側からリンクを配置
      sourceLinkGroups.forEach((links, sourceId) => {
        const sourcePos = nodePositions.get(sourceId);
        if (!sourcePos) return;

        // ターゲットのy位置でソート
        const sortedLinks = [...links].sort((a, b) => {
          const targetA = nodePositions.get(a.target)?.y || 0;
          const targetB = nodePositions.get(b.target)?.y || 0;
          return targetA - targetB;
        });

        let currentY = sourcePos.y0;
        sortedLinks.forEach((link) => {
          const linkHeight = (link.value / totalValue) * chartHeight;
          const linkKey = `${link.source}-${link.target}`;
          linkPositions.set(linkKey, {
            sourceY0: currentY,
            sourceY1: currentY + linkHeight,
            targetY0: 0,
            targetY1: 0,
          });
          currentY += linkHeight;
        });
      });

      // ターゲット側からリンクを配置（重ね合わせを許可）
      targetLinkGroups.forEach((links, targetId) => {
        const targetPos = nodePositions.get(targetId);
        if (!targetPos) return;

        // ターゲットノードの中央位置を計算
        const targetCenter = (targetPos.y0 + targetPos.y1) / 2;

        // 重ね合わせを許可：すべてのリンクをターゲットノードの中央に集約
        links.forEach((link) => {
          const linkKey = `${link.source}-${link.target}`;
          const pos = linkPositions.get(linkKey);
          if (pos) {
            // ソース側のリンクの高さを維持しつつ、ターゲット側は中央に集約
            const linkHeight = pos.sourceY1 - pos.sourceY0;
            pos.targetY0 = targetCenter - linkHeight / 2;
            pos.targetY1 = targetCenter + linkHeight / 2;
          }
        });
      });

      // リンクを描画（交差部分を検出して薄くする）
      // まず、同じレイヤー間のリンクを収集
      const layerLinks = data.links.filter(link => {
        const sourceNode = data.nodes.find(n => n.id === link.source);
        const targetNode = data.nodes.find(n => n.id === link.target);
        return sourceNode?.layer === sourceLayer && targetNode?.layer === targetLayer;
      });

      // リンクの交差を検出する関数
      const checkLinkOverlap = (link1: EcosystemLink, link2: EcosystemLink): boolean => {
        const pos1 = linkPositions.get(`${link1.source}-${link1.target}`);
        const pos2 = linkPositions.get(`${link2.source}-${link2.target}`);
        if (!pos1 || !pos2) return false;
        
        // Y座標の範囲が重なっているかチェック
        const link1YMin = Math.min(pos1.sourceY0, pos1.targetY0);
        const link1YMax = Math.max(pos1.sourceY1, pos1.targetY1);
        const link2YMin = Math.min(pos2.sourceY0, pos2.targetY0);
        const link2YMax = Math.max(pos2.sourceY1, pos2.targetY1);
        
        return !(link1YMax < link2YMin || link2YMax < link1YMin);
      };

      data.links.forEach((link) => {
        const sourceNode = data.nodes.find(n => n.id === link.source);
        const targetNode = data.nodes.find(n => n.id === link.target);
        if (sourceNode?.layer !== sourceLayer || targetNode?.layer !== targetLayer) return;

        const linkKey = `${link.source}-${link.target}`;
        const pos = linkPositions.get(linkKey);
        if (!pos) return;

        const sourcePos = nodePositions.get(link.source);
        const targetPos = nodePositions.get(link.target);
        if (!sourcePos || !targetPos) return;

        const x0 = sourcePos.x;
        const x1 = targetPos.x;
        let sourceY0 = pos.sourceY0;
        let sourceY1 = pos.sourceY1;
        let targetY0 = pos.targetY0;
        let targetY1 = pos.targetY1;

        // 技術キーワード（layer 0）から技術カテゴリ（layer 1）へのリンクを集約
        if (sourceNode.layer === 0 && targetNode.layer === 1) {
          // リンクの接続位置をより中央に集約（幅を狭める）
          const sourceCenter = (sourceY0 + sourceY1) / 2;
          const targetCenter = (targetY0 + targetY1) / 2;
          const linkWidth = (sourceY1 - sourceY0) * 0.7; // 幅を70%に縮小
          const targetLinkWidth = (targetY1 - targetY0) * 0.7; // 幅を70%に縮小
          
          sourceY0 = sourceCenter - linkWidth / 2;
          sourceY1 = sourceCenter + linkWidth / 2;
          targetY0 = targetCenter - targetLinkWidth / 2;
          targetY1 = targetCenter + targetLinkWidth / 2;
        }
        
        // 技術キーワード（layer 0）からサービス（layer 2）への直接リンクは太くする
        if (sourceNode.layer === 0 && targetNode.layer === 2) {
          // リンクの幅を広げる（太くする）
          const sourceCenter = (sourceY0 + sourceY1) / 2;
          const targetCenter = (targetY0 + targetY1) / 2;
          const linkWidth = (sourceY1 - sourceY0) * 1.2; // 幅を120%に拡大（太くする）
          const targetLinkWidth = (targetY1 - targetY0) * 1.2; // 幅を120%に拡大
          
          sourceY0 = sourceCenter - linkWidth / 2;
          sourceY1 = sourceCenter + linkWidth / 2;
          targetY0 = targetCenter - targetLinkWidth / 2;
          targetY1 = targetCenter + targetLinkWidth / 2;
        }
        
        // 技術カテゴリ（layer 1）からサービス（layer 2）へのリンクも細くする
        if (sourceNode.layer === 1 && targetNode.layer === 2) {
          // ソースノードの実際の位置を取得
          const sourceNodeY0 = sourcePos.y0;
          const sourceNodeY1 = sourcePos.y1;
          const sourceNodeCenter = (sourceNodeY0 + sourceNodeY1) / 2;
          
          // リンクの接続位置をソースノードの中央に合わせる（起点側をより細く）
          const linkWidth = (sourceY1 - sourceY0) * 0.5; // 起点側は50%に縮小（より細く）
          const targetCenter = (targetY0 + targetY1) / 2;
          const targetLinkWidth = (targetY1 - targetY0) * 0.7; // ターゲット側は70%に縮小
          
          // ソース側の接続位置をソースノードの中央に合わせる
          sourceY0 = sourceNodeCenter - linkWidth / 2;
          sourceY1 = sourceNodeCenter + linkWidth / 2;
          targetY0 = targetCenter - targetLinkWidth / 2;
          targetY1 = targetCenter + targetLinkWidth / 2;
        }

        // カーブの制御点（直線寄りだが曲線感を残す）
        const linkDistance = x1 - x0;
        const layerDiff = targetNode.layer - sourceNode.layer;
        
        // スキップするリンク（複数レイヤーを跨ぐ）の場合は、より滑らかなカーブに
        let curveFactor = 0.08;
        if (sourceNode.layer === 0 && targetNode.layer === 1) {
          curveFactor = 0.12; // 技術キーワードから技術カテゴリへのリンクはより集約的に
        } else if (layerDiff > 1) {
          curveFactor = 0.15; // スキップするリンクはより滑らかに
        }
        
        const controlX0 = x0 + linkDistance * curveFactor;
        const controlX1 = x1 - linkDistance * curveFactor;
        // Y方向の動きも小さく（より直線寄り）
        const controlY0 = (sourceY0 + targetY0) / 2 + (linkDistance * 0.03);
        const controlY1 = (sourceY1 + targetY1) / 2 - (linkDistance * 0.03);

        // パスを作成（より有機的なカーブ）
        const pathData = [
          `M ${x0} ${sourceY0}`,
          `C ${controlX0} ${controlY0}, ${controlX1} ${controlY0}, ${x1} ${targetY0}`,
          `L ${x1} ${targetY1}`,
          `C ${controlX1} ${controlY1}, ${controlX0} ${controlY1}, ${x0} ${sourceY1}`,
          'Z',
        ].join(' ');

        // リンクの色：モノトーン（霧のように軽く・曖昧）
        const linkColor = '#999999';
        // 交差しているリンクの数をカウント
        const overlappingLinks = layerLinks.filter(l => 
          l !== link && checkLinkOverlap(link, l)
        ).length;
        // 技術カテゴリからサービスへのリンクはより見やすく
        const isTechToService = sourceNode.layer === 1 && targetNode.layer === 2;
        // 技術キーワードからサービスへの直接リンクは太くする
        const isKeywordToService = sourceNode.layer === 0 && targetNode.layer === 2;
        // 技術キーワードからサービスへのリンクはより濃く、太くする
        let baseOpacity = 0.35;
        if (isKeywordToService) {
          baseOpacity = 0.6; // 技術キーワード→サービスは0.6（より濃く）
        } else if (isTechToService) {
          baseOpacity = 0.5; // 技術カテゴリ→サービスは0.5
        }
        const overlapPenalty = overlappingLinks * 0.05; // 交差1つにつき5%薄く
        const linkOpacity = Math.max(baseOpacity - overlapPenalty, isKeywordToService ? 0.4 : (isTechToService ? 0.25 : 0.15)); // 技術キーワード→サービスは最小40%
        // 技術キーワードからサービスへの直接リンクは太くする（Layer 0→2）
        const baseStrokeWidth = isKeywordToService ? 0.5 : 0.15; // 技術キーワード→サービスは0.5、他は0.15
        // リンクの太さに±20%のランダム性を追加（ムラ・ゆらぎ）
        const randomVariation = (Math.random() - 0.5) * 0.2; // -0.1 から +0.1 の範囲
        const linkStrokeWidth = Math.max(0.05, baseStrokeWidth * (1 + randomVariation)); // 最小0.05を確保
        
        // opacityに±0.1の揺らぎを追加
        const opacityVariation = (Math.random() - 0.5) * 0.2; // -0.1 から +0.1 の範囲
        const finalLinkOpacity = Math.max(0.05, Math.min(0.9, linkOpacity + opacityVariation)); // 0.05-0.9の範囲に制限
        
        // グラデーション定義（前＝濃い / 後＝薄い）
        const gradientId = `gradient-${link.source}-${link.target}`;
        
        // 既に存在するかチェック
        let gradient = defs.select(`#${gradientId}`);
        if (gradient.empty()) {
          gradient = (defs.append('linearGradient')
            .attr('id', gradientId)
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%') as any);
          
        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', linkColor)
          .attr('stop-opacity', finalLinkOpacity * 1.5); // 始点は濃く（流れの始まり）
          
          gradient.append('stop')
            .attr('offset', '50%')
            .attr('stop-color', linkColor)
            .attr('stop-opacity', finalLinkOpacity * 0.8); // 中間
          
          gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', linkColor)
            .attr('stop-opacity', finalLinkOpacity * 0.4); // 終点は薄く
        }
        
        const path = g.append('path')
          .attr('d', pathData)
          .attr('fill', `url(#${gradientId})`)
          .attr('stroke', linkColor)
          .attr('stroke-width', linkStrokeWidth)
          .attr('stroke-opacity', finalLinkOpacity)
          .attr('fill-opacity', finalLinkOpacity)
          .style('cursor', 'pointer')
          .on('mouseenter', function() {
            // ホバー時は少し濃く（モノトーン維持）
            select(this)
              .attr('fill-opacity', finalLinkOpacity * 2)
              .attr('stroke-opacity', finalLinkOpacity * 1.5)
              .attr('stroke-width', linkStrokeWidth * 2);
          })
          .on('mouseleave', function() {
            select(this)
              .attr('fill-opacity', finalLinkOpacity)
              .attr('stroke-opacity', finalLinkOpacity)
              .attr('stroke-width', linkStrokeWidth);
          });
        
        // ツールチップ
        path.on('mouseenter', function() {
          const tooltip = g.append('g')
            .attr('class', 'tooltip')
            .attr('transform', `translate(${(x0 + x1) / 2}, ${(sourceY0 + targetY1) / 2})`);

          const tooltipBg = tooltip.append('rect')
            .attr('x', -70)
            .attr('y', -25)
            .attr('width', 140)
            .attr('height', 50)
            .attr('fill', 'rgba(0, 0, 0, 0.85)')
            .attr('rx', 4);

          tooltip.append('text')
            .attr('x', 0)
            .attr('y', -8)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px') // 12px → 14px
            .attr('font-weight', '500') // Regular
            .attr('font-family', "'Inter', 'Noto Sans JP', -apple-system, sans-serif")
            .attr('fill', '#fff')
            .text(`${sourceNode.label} → ${targetNode.label}`);

          tooltip.append('text')
            .attr('x', 0)
            .attr('y', 8)
            .attr('text-anchor', 'middle')
            .attr('font-size', '13px') // 11px → 13px
            .attr('font-weight', '300') // Light
            .attr('font-family', "'Inter', 'Noto Sans JP', -apple-system, sans-serif")
            .attr('fill', '#fff')
            .text(`値: ${(link.value / 1000).toFixed(0)}K (${((link.value / totalValue) * 100).toFixed(1)}%)`);
        })
        .on('mouseleave', function() {
          g.selectAll('.tooltip').remove();
        });
      });
    }); // layerPairs.forEachの閉じ括弧

    // ノードを描画（ドラッグ可能にするためグループ化）
    data.nodes.forEach((node) => {
      const pos = nodePositions.get(node.id);
      if (!pos) return;

      // ノードの矩形を一時的に表示（位置確認用）
      const isKeywordLayer = node.layer === 0;
      const defaultNodeWidth = isKeywordLayer ? 80 : 100;
      const nodeSize = nodeSizes.get(node.id) || { width: defaultNodeWidth, height: pos.height };
      const nodeWidth = nodeSize.width;
      const nodeHeight = nodeSize.height;
      // 角丸を大きくしてカプセル型に近づける（ノードの高さの半分、最小24px、最大32px）
      const borderRadius = Math.min(Math.max(nodeHeight / 2, 24), 32);
      
      // ノードとテキストをグループ化してドラッグ可能にする
      const nodeGroup = g.append('g')
        .attr('class', `node-group-${node.id}`)
        .attr('transform', `translate(${pos.x}, ${pos.y})`)
        .style('cursor', isEditMode ? 'move' : 'default');

      // Layerごとの枠線の有無を取得（デフォルトはtrue）
      // Mapに値がない場合はtrue、falseの場合はfalse、trueの場合はtrue
      const borderValue = layerBorders.get(node.layer);
      const showBorder = borderValue === undefined ? true : borderValue !== false;
      // Layerごとの矩形の表示/非表示を取得（デフォルトはtrue）
      const rectValue = layerRectVisibility.get(node.layer);
      const showRect = rectValue === undefined ? true : rectValue !== false;
      // Layerごとのテキストの表示/非表示を取得（デフォルトはtrue）
      const textValue = layerTextVisibility.get(node.layer);
      const showText = textValue === undefined ? true : textValue !== false;
      
      // 矩形を描画（位置確認用の塗りつぶし）
      const rect = nodeGroup.append('rect')
        .attr('x', -nodeWidth / 2)
        .attr('y', pos.y0 - pos.y)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', borderRadius)
        .attr('ry', borderRadius)
        .attr('class', `node-rect-${node.id}`)
        .style('cursor', 'pointer');
      
      // 矩形の表示/非表示を設定
      if (showRect) {
        rect
          .attr('fill', '#E0E0E0')
          .attr('fill-opacity', 0.5)
          .attr('stroke', showBorder ? '#999999' : 'none')
          .attr('stroke-width', showBorder ? 1 : 0)
          .attr('stroke-opacity', showBorder ? 0.5 : 0)
          .style('display', 'block')
          .style('pointer-events', 'auto');
      } else {
        rect
          .attr('fill', 'none')
          .attr('fill-opacity', 0)
          .attr('stroke', 'none')
          .attr('stroke-width', 0)
          .attr('stroke-opacity', 0)
          .style('display', 'none')
          .style('pointer-events', 'none');
      }

      // リサイズハンドルを追加（右下の角）- 矩形が表示されていて編集モードの場合のみ
      let resizeHandle: any = null;
      if (showRect && isEditMode) {
        const handleSize = 8;
        resizeHandle = nodeGroup.append('rect')
          .attr('x', nodeWidth / 2 - handleSize)
          .attr('y', pos.y0 - pos.y + nodeHeight - handleSize)
          .attr('width', handleSize)
          .attr('height', handleSize)
          .attr('fill', '#666666')
          .attr('stroke', '#333333')
          .attr('stroke-width', 1)
          .attr('cursor', 'nwse-resize')
          .attr('class', `resize-handle-${node.id}`)
          .style('opacity', 0.7);
      }

      // リサイズハンドルのドラッグ機能（矩形が表示されていて編集モードの場合のみ）
      if (resizeHandle && isEditMode) {
        const handleSize = 8;
        const resizeDragHandler = drag<SVGRectElement, unknown>()
          .on('start', function(event) {
            event.sourceEvent.stopPropagation();
            select(this).attr('opacity', 1);
          })
          .on('drag', function(event) {
            event.sourceEvent.stopPropagation();
            const currentRect = nodeGroup.select(`.node-rect-${node.id}`);
            const currentWidth = parseFloat(currentRect.attr('width'));
            const currentHeight = parseFloat(currentRect.attr('height'));
            
            const newWidth = Math.max(40, currentWidth + event.dx * 2); // 最小幅40px
            const newHeight = Math.max(20, currentHeight + event.dy * 2); // 最小高さ20px
            
            // 矩形のサイズを更新
            currentRect
              .attr('width', newWidth)
              .attr('x', -newWidth / 2)
              .attr('height', newHeight);
            
            // リサイズハンドルの位置を更新
            resizeHandle
              .attr('x', newWidth / 2 - handleSize)
              .attr('y', pos.y0 - pos.y + newHeight - handleSize);
            
            // テキストの位置をノードの中央に調整
            const rectTop = pos.y0 - pos.y;
            const rectCenter = rectTop + newHeight / 2;
            const labelLines = node.label.split('\n');
            const lineHeight = isKeywordLayer ? 12 : 14;
            
            nodeGroup.selectAll('text').each(function(d, i) {
              const yOffset = (i - (labelLines.length - 1) / 2) * lineHeight;
              select(this).attr('x', 0).attr('y', rectCenter + yOffset);
            });
          })
          .on('end', function(event) {
            event.sourceEvent.stopPropagation();
            select(this).attr('opacity', 0.7);
            
            const currentRect = nodeGroup.select(`.node-rect-${node.id}`);
            const finalWidth = parseFloat(currentRect.attr('width'));
            const finalHeight = parseFloat(currentRect.attr('height'));
            
            // テキストの位置を最終的なノードの中央に調整
            const rectTop = pos.y0 - pos.y;
            const rectCenter = rectTop + finalHeight / 2;
            const labelLines = node.label.split('\n');
            const lineHeight = isKeywordLayer ? 12 : 14;
            
            nodeGroup.selectAll('text').each(function(d, i) {
              const yOffset = (i - (labelLines.length - 1) / 2) * lineHeight;
              select(this).attr('x', 0).attr('y', rectCenter + yOffset);
            });
            
            setNodeSizes(prev => {
              const newMap = new Map(prev);
              newMap.set(node.id, { width: finalWidth, height: finalHeight });
              return newMap;
            });
          });

        resizeHandle.call(resizeDragHandler);
      }

      // ラベル（モノトーン配色、フォント設定、余白追加）
      const labelLines = node.label.split('\n');
      // 技術キーワードレイヤーはフォントサイズと余白を小さく
      const labelPadding = isKeywordLayer ? 4 : 12; // 技術キーワードは4px、他は12px
      // フォントサイズ調整：タイトル28px、見出し20px、ノード12-16px、AI技術は18px
      let fontSize = isKeywordLayer ? '12px' : '16px'; // 技術キーワードは12px、他は16px
      if (node.id === 'tech-ai') {
        fontSize = '18px'; // AI技術は少し大きく
      }
      const lineHeight = isKeywordLayer ? 12 : 14; // 行間は変更なし
      
      // テキストの位置をノードの矩形の中央に配置（nodeSizesを考慮）
      const rectTop = pos.y0 - pos.y;
      const rectCenter = rectTop + nodeHeight / 2;
      
      labelLines.forEach((line, i) => {
        // 技術キーワード以外は太字にする
        const fontWeight = isKeywordLayer ? '400' : '600'; // 技術キーワードはRegular、他はSemiBold
        // すべてのノードのテキストを中央に配置
        const yOffset = (i - (labelLines.length - 1) / 2) * lineHeight;
        const textElement = nodeGroup.append('text')
          .attr('x', 0)
          .attr('y', rectCenter + yOffset)
          .attr('text-anchor', 'middle')
          .attr('font-size', fontSize)
          .attr('font-weight', fontWeight)
          .attr('font-family', "'Inter', 'Noto Sans JP', -apple-system, sans-serif")
          .attr('fill', '#111111') // 濃いグレー
          .attr('pointer-events', 'none') // テキストはドラッグを妨げない
          .text(line);
        
        // テキストの表示/非表示を設定
        if (!showText) {
          textElement.style('display', 'none');
        }
      });

      // ドラッグ機能を追加（編集モードの場合のみ）
      const originalPos = originalNodePositions.get(node.id);
      if (originalPos && isEditMode) {
        const dragHandler = drag<SVGGElement, unknown>()
          .on('start', function(event) {
            select(this).raise().attr('opacity', 0.8);
          })
          .on('drag', function(event) {
            const currentTransform = select(this).attr('transform');
            const match = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (match) {
              const currentX = parseFloat(match[1]);
              const currentY = parseFloat(match[2]);
              const newX = currentX + event.dx;
              const newY = currentY + event.dy;
              select(this).attr('transform', `translate(${newX}, ${newY})`);
            }
          })
          .on('end', function(event) {
            select(this).attr('opacity', 1);
            
            // 最終位置を取得してstateを更新
            const currentTransform = select(this).attr('transform');
            const match = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (match) {
              const newX = parseFloat(match[1]);
              const newY = parseFloat(match[2]);
              
              // 元の位置からの相対的な移動量を計算
              const offsetX = newX - originalPos.x;
              const offsetY = newY - originalPos.y;
              
              setNodeOffsets(prev => {
                const newMap = new Map(prev);
                newMap.set(node.id, { x: offsetX, y: offsetY });
                return newMap;
              });
            }
          });

        nodeGroup.call(dragHandler);
      }

      // 値のラベルはすべて非表示
      // （以前は表示していたが、デザインの統一性のため削除）
    });

    // レイヤーラベルを追加（モノトーン配色、フォント設定、余白追加、ドラッグ可能）
    data.layers.forEach((layerName, layerIndex) => {
      const defaultX = startX + layerIndex * layerSpacing;
      const defaultY = -30;
      const labelOffset = layerLabelPositions.get(layerIndex) || { x: 0, y: 0 };
      const x = defaultX + labelOffset.x;
      const y = defaultY + labelOffset.y;
      
      const labelGroup = g.append('g')
        .attr('class', `layer-label-${layerIndex}`)
        .attr('transform', `translate(${x}, ${y})`)
        .style('cursor', isEditMode ? 'move' : 'default');
      
      labelGroup.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .attr('font-size', '20px') // 見出し20px
        .attr('font-weight', '600') // SemiBold
        .attr('font-family', "'Inter', 'Noto Sans JP', -apple-system, sans-serif")
        .attr('fill', '#111111') // 濃いグレー
        .attr('pointer-events', 'none')
        .text(layerName);
      
      // Layerラベルのドラッグ機能（編集モードの場合のみ）
      if (isEditMode) {
        // ドラッグ可能な領域を追加（テキストの周りに透明な矩形を配置）
        const labelBounds = labelGroup.append('rect')
          .attr('x', -60)
          .attr('y', -15)
          .attr('width', 120)
          .attr('height', 30)
          .attr('fill', 'transparent')
          .style('cursor', 'move')
          .style('pointer-events', 'all');
        
        const labelDragHandler = drag<SVGGElement, unknown>()
          .on('start', function(event) {
            select(this).attr('opacity', 0.8);
          })
          .on('drag', function(event) {
            const currentTransform = select(this).attr('transform');
            const match = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (match) {
              const currentX = parseFloat(match[1]);
              const currentY = parseFloat(match[2]);
              const newX = currentX + event.dx;
              const newY = currentY + event.dy;
              select(this).attr('transform', `translate(${newX}, ${newY})`);
            }
          })
          .on('end', function(event) {
            select(this).attr('opacity', 1);
            
            const currentTransform = select(this).attr('transform');
            const match = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (match) {
              const newX = parseFloat(match[1]);
              const newY = parseFloat(match[2]);
              
              // 元の位置からの相対的な移動量を計算
              const offsetX = newX - defaultX;
              const offsetY = newY - defaultY;
              
              setLayerLabelPositions(prev => {
                const newMap = new Map(prev);
                newMap.set(layerIndex, { x: offsetX, y: offsetY });
                return newMap;
              });
            }
          });
        
        labelGroup.call(labelDragHandler);
      }
    });

    // タイトルを追加（モノトーン配色、フォント設定）
    if (title) {
      const titleGroup = svg.append('g')
        .attr('class', 'title-group');
      
      const titleText = titleGroup.append('text')
        .attr('x', width / 2)
        .attr('y', 45) // タイトルの位置
        .attr('text-anchor', 'middle')
        .attr('font-size', '28px') // タイトル28px
        .attr('font-weight', '600') // SemiBold
        .attr('font-family', "'Inter', 'Noto Sans JP', -apple-system, sans-serif")
        .attr('fill', '#111111') // 濃いグレー
        .attr('letter-spacing', '0.02em')
        .text(title);
      
      // サブタイトルを追加
      titleGroup.append('text')
        .attr('x', width / 2)
        .attr('y', 72) // タイトルの下に27pxの間隔（1〜2px下げて余白を増やす）
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px') // サブタイトル14px
        .attr('font-weight', '400') // Regular
        .attr('font-family', "'Inter', 'Noto Sans JP', -apple-system, sans-serif")
        .attr('fill', '#666666') // 薄いグレー
        .attr('letter-spacing', '0.01em')
        .text('From Technology to Industry');
      
      // 編集モード切り替えボタン（+ボタン）- タイトルの右側に配置
      // タイトルの幅を取得（SVGのgetBBox()を使用）
      setTimeout(() => {
        const textNode = titleText.node() as SVGTextElement;
        if (textNode) {
          const titleBBox = textNode.getBBox();
          const titleWidth = titleBBox.width;
          const buttonX = width / 2 + titleWidth / 2 + 20; // タイトルの右側に20pxの余白
          const buttonY = 45;
          
          const editButton = titleGroup.append('circle')
            .attr('cx', buttonX)
            .attr('cy', buttonY - 10) // タイトルのベースラインに合わせて調整
            .attr('r', 10)
            .attr('fill', isEditMode ? '#666666' : '#cccccc')
            .attr('stroke', '#999999')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .style('opacity', 0.6)
            .on('mouseenter', function() {
              select(this).attr('opacity', 1).attr('fill', '#888888');
            })
            .on('mouseleave', function() {
              select(this).attr('opacity', 0.6).attr('fill', isEditMode ? '#666666' : '#cccccc');
            })
            .on('click', function() {
              setIsEditMode(prev => !prev);
            });
          
          // +アイコンを追加
          titleGroup.append('text')
            .attr('x', buttonX)
            .attr('y', buttonY - 10)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-size', '14px')
            .attr('font-weight', '400')
            .attr('font-family', "'Inter', 'Noto Sans JP', -apple-system, sans-serif")
            .attr('fill', '#ffffff')
            .attr('pointer-events', 'none')
            .attr('class', 'edit-mode-icon')
            .text(isEditMode ? '−' : '+');
        }
      }, 0);
    }
  }, [data, width, height, title, margin, colorScale, nodeOffsets, nodeSizes, layerBorders, layerRectVisibility, layerTextVisibility, layerLabelPositions, isEditMode]);
  
  // 編集モードアイコンの更新
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    svg.selectAll('.edit-mode-icon').text(isEditMode ? '−' : '+');
    svg.selectAll('.title-group circle').attr('fill', isEditMode ? '#666666' : '#cccccc');
  }, [isEditMode]);

  // リセット機能（位置とサイズを元に戻す）
  const handleReset = () => {
    if (typeof window === 'undefined') return;
    setResetConfirmModal(true);
  };

  const executeReset = () => {
    setNodeOffsets(new Map());
    setNodeSizes(new Map());
    setLayerLabelPositions(new Map());
    setLayerBorders(new Map());
    setLayerRectVisibility(new Map());
    setLayerTextVisibility(new Map());
    localStorage.removeItem(`${storageKey}-offsets`);
    localStorage.removeItem(`${storageKey}-sizes`);
    localStorage.removeItem(`${storageKey}-layer-labels`);
    localStorage.removeItem(`${storageKey}-layer-borders`);
    localStorage.removeItem(`${storageKey}-layer-rect-visibility`);
    localStorage.removeItem(`${storageKey}-layer-text-visibility`);
  };
  
  // すべてのLayerの枠線を一括で表示/非表示に切り替える
  const handleToggleAllBorders = () => {
    // すべてのLayerの枠線が表示されているか確認
    const allVisible = data.layers.every((_, layerIndex) => {
      const value = layerBorders.get(layerIndex);
      return value === undefined || value !== false;
    });
    
    const newBorders = new Map<number, boolean>();
    data.layers.forEach((_, layerIndex) => {
      newBorders.set(layerIndex, !allVisible);
    });
    setLayerBorders(newBorders);
  };
  
  // すべてのLayerの矩形を一括で表示/非表示に切り替える
  const handleToggleAllRects = () => {
    // すべてのLayerの矩形が表示されているか確認
    const allVisible = data.layers.every((_, layerIndex) => {
      const value = layerRectVisibility.get(layerIndex);
      return value === undefined || value !== false;
    });
    
    const newRects = new Map<number, boolean>();
    data.layers.forEach((_, layerIndex) => {
      newRects.set(layerIndex, !allVisible);
    });
    setLayerRectVisibility(newRects);
  };
  
  // すべてのLayerのテキストを一括で表示/非表示に切り替える
  const handleToggleAllTexts = () => {
    // すべてのLayerのテキストが表示されているか確認
    const allVisible = data.layers.every((_, layerIndex) => {
      const value = layerTextVisibility.get(layerIndex);
      return value === undefined || value !== false;
    });
    
    const newTexts = new Map<number, boolean>();
    data.layers.forEach((_, layerIndex) => {
      newTexts.set(layerIndex, !allVisible);
    });
    setLayerTextVisibility(newTexts);
  };
  

  // PNGダウンロード機能
  const handleDownloadPNG = () => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const svgSelection = select(svgRef.current);
    
    // 編集モードのUI要素を一時的に非表示にする
    const editModeElements: Array<{ element: any; display: string }> = [];
    
    // リサイズハンドルを非表示
    svgSelection.selectAll('[class^="resize-handle-"]').each(function() {
      const element = select(this);
      const originalDisplay = element.style('display') || 'block';
      editModeElements.push({ element: this, display: originalDisplay });
      element.style('display', 'none');
    });
    
    // 編集モード切り替えボタン（円とアイコン）を非表示
    svgSelection.selectAll('.title-group circle').each(function() {
      const element = select(this);
      const originalDisplay = element.style('display') || 'block';
      editModeElements.push({ element: this, display: originalDisplay });
      element.style('display', 'none');
    });
    
    svgSelection.selectAll('.edit-mode-icon').each(function() {
      const element = select(this);
      const originalDisplay = element.style('display') || 'block';
      editModeElements.push({ element: this, display: originalDisplay });
      element.style('display', 'none');
    });
    
    // SVGをシリアライズ（編集UI要素を除外した状態）
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // 背景を白に設定
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // SVGを描画
        ctx.drawImage(img, 0, 0);
        
        // PNGとしてダウンロード
        canvas.toBlob(function(blob) {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `${title || 'diagram'}-${Date.now()}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
          }
          
          // 編集モードのUI要素を再度表示
          editModeElements.forEach(function(item) {
            select(item.element).style('display', item.display);
          });
        }, 'image/png');
      }
      
      URL.revokeObjectURL(svgUrl);
    };
    
    img.src = svgUrl;
  };

  return (
    <div style={{ width: '100%', overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      {isEditMode && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={handleDownloadPNG}
          style={{
            padding: '10px 20px',
            backgroundColor: '#111111',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#333333';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#111111';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          PNGでダウンロード
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '10px 20px',
            backgroundColor: '#666666',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#888888';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#666666';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          リセット
        </button>
        <button
          onClick={handleToggleAllBorders}
          style={{
            padding: '10px 20px',
            backgroundColor: '#666666',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#888888';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#666666';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          枠線一括切替
        </button>
        <button
          onClick={handleToggleAllRects}
          style={{
            padding: '10px 20px',
            backgroundColor: '#666666',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#888888';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#666666';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          箱一括切替
        </button>
        <button
          onClick={handleToggleAllTexts}
          style={{
            padding: '10px 20px',
            backgroundColor: '#666666',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#888888';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#666666';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          テキスト一括切替
        </button>
        </div>
      )}
      {isEditMode && (
        <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666666', textAlign: 'center' }}>
          ボタンで全てのLayerの枠線、箱、テキストを一括で表示/非表示に切り替えられます
        </div>
      )}
      <div style={{ width: '100%', maxWidth: `${width}px`, margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', maxWidth: '100%', height: 'auto', margin: '0 auto' }}
          xmlns="http://www.w3.org/2000/svg"
        />
      </div>

      {/* リセット確認モーダル */}
      {resetConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setResetConfirmModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              リセットの確認
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6B7280', lineHeight: '1.6' }}>
              ノードの位置とサイズ、Layerラベルの位置をリセットしますか？
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setResetConfirmModal(false);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  setResetConfirmModal(false);
                  executeReset();
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4A90E2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                リセットする
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

