import { useMemo } from 'react';
import type { RelationshipNode, RelationshipLink } from '../../RelationshipDiagram2D';

export function useHierarchyData(
  nodes: RelationshipNode[],
  links: RelationshipLink[],
  showTopics: boolean
) {
  return useMemo(() => {
    // テーマノードを取得
    const themeNodes = nodes.filter(node => node.type === 'theme');
    
    // ノードIDからノードを取得するマップを作成
    const nodeMap = new Map<string, RelationshipNode>();
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });
    
    // リンクから親子関係を構築
    const childrenMap = new Map<string, RelationshipNode[]>();
    
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      if (!childrenMap.has(sourceId)) {
        childrenMap.set(sourceId, []);
      }
      const targetNode = nodeMap.get(targetId);
      if (targetNode) {
        childrenMap.get(sourceId)!.push(targetNode);
      }
    });

    // 階層構造を再帰的に構築
    const buildHierarchy = (node: RelationshipNode, depth: number): any => {
      const children = childrenMap.get(node.id) || [];
      
      // 子ノードをタイプごとに分類
      const orgChildren = children.filter(n => n.type === 'organization' || n.type === 'company');
      const initiativeChildren = children.filter(n => n.type === 'initiative');
      const topicChildren = children.filter(n => n.type === 'topic');
      
      // 組織/事業会社ノードの子として注力施策を配置
      const orgNodesWithInitiatives = orgChildren.map(orgNode => {
        const orgChildren = childrenMap.get(orgNode.id) || [];
        const initiativeChildren = orgChildren.filter(n => n.type === 'initiative');
        
        // 各注力施策の子としてトピックを配置
        const initiativesWithTopics = initiativeChildren.map(initNode => {
          const initChildren = childrenMap.get(initNode.id) || [];
          const topicChildren = showTopics ? initChildren.filter(n => n.type === 'topic') : [];
          
          return {
            name: initNode.label,
            id: initNode.id,
            value: 1, // 注力施策の基本値
            depth: depth + 2,
            nodeType: initNode.type,
            originalData: initNode,
            children: topicChildren.length > 0 ? topicChildren.map(topicNode => ({
              name: topicNode.label,
              id: topicNode.id,
              value: 1, // トピックの基本値
              depth: depth + 3,
              nodeType: topicNode.type,
              originalData: topicNode,
            })) : undefined,
          };
        });
        
        return {
          name: orgNode.label,
          id: orgNode.id,
          value: 1, // 組織の基本値
          depth: depth + 1,
          nodeType: orgNode.type,
          originalData: orgNode,
          children: initiativesWithTopics.length > 0 ? initiativesWithTopics : undefined,
        };
      });
      
      return {
        name: node.label,
        id: node.id,
        value: 1, // テーマの基本値
        depth: depth,
        nodeType: node.type,
        originalData: node,
        children: orgNodesWithInitiatives.length > 0 ? orgNodesWithInitiatives : undefined,
      };
    };

    return {
      name: 'root',
      children: themeNodes.map(themeNode => buildHierarchy(themeNode, 1)),
    };
  }, [nodes, links, showTopics]);
}

