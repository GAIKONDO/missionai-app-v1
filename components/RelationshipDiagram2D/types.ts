export interface RelationshipNode {
  id: string;
  label: string;
  type: 'theme' | 'organization' | 'initiative' | 'topic' | 'company';
  data?: any;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface RelationshipLink {
  source: string | RelationshipNode;
  target: string | RelationshipNode;
  type?: 'main' | 'branch' | 'topic';
}

export interface RelationshipDiagram2DProps {
  width?: number;
  height?: number;
  nodes: RelationshipNode[];
  links: RelationshipLink[];
  selectedThemeId?: string;
  onNodeClick?: (node: RelationshipNode) => void;
  onTopicMetadataSaved?: () => void; // メタデータ保存後のコールバック
  maxNodes?: number; // 最大ノード数（パフォーマンス最適化用）
}

