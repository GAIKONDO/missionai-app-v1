'use client';

import { useRef, useState } from 'react';
import type { RelationshipNode, RelationshipLink } from './RelationshipDiagram2D';
import type { TopicInfo, FocusInitiative } from '@/lib/orgApi';
import { useHierarchyData } from './RelationshipBubbleChart/hooks/useHierarchyData';
import { usePackedData } from './RelationshipBubbleChart/hooks/usePackedData';
import { useBubbleChartRendering } from './RelationshipBubbleChart/hooks/useBubbleChartRendering';
import BubbleChartControls from './RelationshipBubbleChart/components/BubbleChartControls';
import Tooltip from './RelationshipBubbleChart/components/Tooltip';
import TopicDetailModal from './RelationshipBubbleChart/components/TopicDetailModal';
import InitiativeDetailModal from './RelationshipBubbleChart/components/InitiativeDetailModal';

interface RelationshipBubbleChartProps {
  nodes: RelationshipNode[];
  links: RelationshipLink[];
  width?: number;
  height?: number;
  onNodeClick?: (node: RelationshipNode) => void;
}

export default function RelationshipBubbleChart({
  nodes,
  links,
  width = 1200,
  height = 800,
  onNodeClick,
}: RelationshipBubbleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showTopics, setShowTopics] = useState(false); // 個別トピックの表示/非表示（デフォルト: 非表示）
  const [selectedTopic, setSelectedTopic] = useState<TopicInfo | null>(null); // 選択されたトピック
  const [selectedInitiative, setSelectedInitiative] = useState<FocusInitiative | null>(null); // 選択された注力施策
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);

  // 階層構造を構築
  const hierarchyData = useHierarchyData(nodes, links, showTopics);

  // Packレイアウトを計算
  const packedData = usePackedData(hierarchyData, width, height);

  // D3.jsのレンダリング
  useBubbleChartRendering({
    svgRef,
    containerRef,
    packedData,
    hoveredNodeId,
    showTopics,
    width,
    height,
    onNodeClick,
    setHoveredNodeId,
    setTooltip,
    setSelectedTopic,
    setSelectedInitiative,
  });

  if (nodes.length === 0) {
    return (
      <div style={{ 
        padding: '60px', 
        textAlign: 'center', 
        color: '#808080',
        fontSize: '14px',
        backgroundColor: '#FAFAFA',
        borderRadius: '8px',
        border: '1px dashed #E0E0E0',
      }}>
        表示するデータがありません
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#F8FAFC', overflow: 'auto' }}>
      <BubbleChartControls
        showTopics={showTopics}
        onToggleTopics={() => setShowTopics(!showTopics)}
      />
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
        <Tooltip tooltip={tooltip} />
      </div>

      {selectedTopic && (
        <TopicDetailModal
          topic={selectedTopic}
          onClose={() => setSelectedTopic(null)}
        />
      )}

      {selectedInitiative && (
        <InitiativeDetailModal
          initiative={selectedInitiative}
          onClose={() => setSelectedInitiative(null)}
        />
      )}
    </div>
  );
}
