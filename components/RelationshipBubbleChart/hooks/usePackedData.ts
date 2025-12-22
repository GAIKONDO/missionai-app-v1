import { useMemo } from 'react';
import { hierarchy, pack } from 'd3-hierarchy';

export function usePackedData(
  hierarchyData: any,
  width: number,
  height: number
) {
  // 階層データを作成
  const root = useMemo(() => {
    return hierarchy(hierarchyData)
      .sum((d: any) => {
        // 子ノードがある場合は子ノードの合計値を使用
        if (d.children && d.children.length > 0) {
          return d.children.reduce((sum: number, child: any) => sum + (child.value || 1), 0);
        }
        return d.value || 1;
      })
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
  }, [hierarchyData]);

  // Packレイアウトを計算
  const packLayout = useMemo(() => {
    return pack()
      .size([width - 80, height - 80])
      .padding(10); // paddingを増やしてテーマ間の距離を確保
  }, [width, height]);

  const packedData = useMemo(() => {
    const packed = packLayout(root as any);
    
    // 組織ノードとその注力施策バブルを収集
    const organizationNodes: any[] = [];
    const initiativeNodesByOrg = new Map<any, any[]>();
    
    packed.descendants().forEach((node: any) => {
      const nodeData = node.data;
      const nodeType = nodeData.nodeType;
      const depth = nodeData.depth || node.depth;
      
      if (nodeType === 'organization' || nodeType === 'company') {
        organizationNodes.push(node);
      } else if (nodeType === 'initiative') {
        // この注力施策が属する組織/事業会社を特定（直接の親が組織/事業会社）
        const parentOrg = node.parent;
        if (parentOrg && parentOrg.data && (parentOrg.data.nodeType === 'organization' || parentOrg.data.nodeType === 'company')) {
          if (!initiativeNodesByOrg.has(parentOrg)) {
            initiativeNodesByOrg.set(parentOrg, []);
          }
          initiativeNodesByOrg.get(parentOrg)!.push(node);
        }
      }
    });
    
    // 各組織のバブルの内側に注力施策のバブルを配置
    organizationNodes.forEach(orgNode => {
      const initiatives = initiativeNodesByOrg.get(orgNode) || [];
      if (initiatives.length === 0 || !orgNode.r) return;
      
      // 組織のバブルの半径
      const orgRadius = orgNode.r;
      
      // 注力施策のバブルの最大半径を計算
      const maxInitiativeRadius = Math.max(...initiatives.map(init => init.r || 15));
      
      // 組織のバブルの内側に配置するための最大半径（組織の半径の70%程度を確保）
      const maxDistanceFromOrgCenter = orgRadius * 0.7 - maxInitiativeRadius;
      
      // 注力施策が1つの場合
      if (initiatives.length === 1) {
        const initNode = initiatives[0];
        if (initNode.r) {
          // 組織の中心に配置
          initNode.x = orgNode.x;
          initNode.y = orgNode.y;
        }
      } else if (initiatives.length > 1) {
        // 複数の注力施策を組織のバブルの内側に円形に配置
        initiatives.forEach((initNode, index) => {
          if (!initNode.r) return;
          
          // 角度を計算（均等に配置）
          const angle = (index / initiatives.length) * 2 * Math.PI;
          
          // 組織の中心からの距離（組織のバブルの内側に収まるように）
          // 注力施策のバブルが組織のバブルの外に出ないようにする
          const availableRadius = Math.max(0, maxDistanceFromOrgCenter - initNode.r);
          const distanceFromCenter = Math.max(initNode.r + 5, availableRadius * 0.8);
          
          // 新しい位置を計算
          initNode.x = orgNode.x + Math.cos(angle) * distanceFromCenter;
          initNode.y = orgNode.y + Math.sin(angle) * distanceFromCenter;
          
          // 組織のバブルの外に出ていないか確認し、必要に応じて調整
          const distFromOrgCenter = Math.sqrt(
            (initNode.x - orgNode.x) ** 2 + (initNode.y - orgNode.y) ** 2
          );
          const maxAllowedDist = orgRadius - initNode.r - 5; // 5pxのマージン
          
          if (distFromOrgCenter > maxAllowedDist) {
            // 組織のバブルの内側に収まるようにスケールダウン
            const scale = maxAllowedDist / distFromOrgCenter;
            initNode.x = orgNode.x + (initNode.x - orgNode.x) * scale;
            initNode.y = orgNode.y + (initNode.y - orgNode.y) * scale;
          }
        });
      }
    });
    
    // 同じ組織内の注力施策バブルの重なりを解消
    organizationNodes.forEach(orgNode => {
      const initiatives = initiativeNodesByOrg.get(orgNode) || [];
      if (initiatives.length <= 1 || !orgNode.r) return;
      
      const orgRadius = orgNode.r;
      
      // 重なりを解消するための反復処理
      for (let iteration = 0; iteration < 30; iteration++) {
        let hasOverlap = false;
        
        for (let i = 0; i < initiatives.length; i++) {
          const node1 = initiatives[i];
          if (!node1.r) continue;
          
          for (let j = i + 1; j < initiatives.length; j++) {
            const node2 = initiatives[j];
            if (!node2.r) continue;
            
            // 距離を計算
            const dx = node2.x - node1.x;
            const dy = node2.y - node1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDist = node1.r + node2.r + 5; // 5pxの間隔
            
            // 重なっている場合、位置を調整
            if (distance < minDist && distance > 0.1) {
              hasOverlap = true;
              
              // 反発方向を計算
              const angle = Math.atan2(dy, dx);
              const separation = (minDist - distance) / 2;
              
              // 各バブルを組織の中心方向に移動しながら反発
              const dir1x = orgNode.x - node1.x;
              const dir1y = orgNode.y - node1.y;
              const dir1len = Math.sqrt(dir1x * dir1x + dir1y * dir1y);
              
              const dir2x = orgNode.x - node2.x;
              const dir2y = orgNode.y - node2.y;
              const dir2len = Math.sqrt(dir2x * dir2x + dir2y * dir2y);
              
              if (dir1len > 0 && dir2len > 0) {
                // 反発力と組織中心への引力を組み合わせ
                node1.x += (-Math.cos(angle) * separation + (dir1x / dir1len) * separation * 0.3);
                node1.y += (-Math.sin(angle) * separation + (dir1y / dir1len) * separation * 0.3);
                node2.x += (Math.cos(angle) * separation + (dir2x / dir2len) * separation * 0.3);
                node2.y += (Math.sin(angle) * separation + (dir2y / dir2len) * separation * 0.3);
              } else {
                // フォールバック: 単純に反発
                node1.x -= Math.cos(angle) * separation;
                node1.y -= Math.sin(angle) * separation;
                node2.x += Math.cos(angle) * separation;
                node2.y += Math.sin(angle) * separation;
              }
              
              // 組織のバブルの外に出ていないか確認
              [node1, node2].forEach(node => {
                const distFromOrgCenter = Math.sqrt(
                  (node.x - orgNode.x) ** 2 + (node.y - orgNode.y) ** 2
                );
                const maxAllowedDist = orgRadius - node.r - 5;
                
                if (distFromOrgCenter > maxAllowedDist) {
                  const scale = maxAllowedDist / distFromOrgCenter;
                  node.x = orgNode.x + (node.x - orgNode.x) * scale;
                  node.y = orgNode.y + (node.y - orgNode.y) * scale;
                }
              });
            }
          }
        }
        
        if (!hasOverlap) break;
      }
    });
    
    // 注力施策ノードとそのトピックバブルを収集
    const initiativeNodes: any[] = [];
    const topicNodesByInitiative = new Map<any, any[]>();
    
    packed.descendants().forEach((node: any) => {
      const nodeData = node.data;
      const nodeType = nodeData.nodeType;
      
      if (nodeType === 'initiative') {
        initiativeNodes.push(node);
      } else if (nodeType === 'topic') {
        // このトピックが属する注力施策を特定（直接の親が注力施策）
        const parentInitiative = node.parent;
        if (parentInitiative && parentInitiative.data && parentInitiative.data.nodeType === 'initiative') {
          if (!topicNodesByInitiative.has(parentInitiative)) {
            topicNodesByInitiative.set(parentInitiative, []);
          }
          topicNodesByInitiative.get(parentInitiative)!.push(node);
        }
      }
    });
    
    // 各注力施策のバブルの内側にトピックのバブルを配置
    initiativeNodes.forEach(initNode => {
      const topics = topicNodesByInitiative.get(initNode) || [];
      if (topics.length === 0 || !initNode.r) return;
      
      // 注力施策のバブルの半径
      const initRadius = initNode.r;
      
      // トピックのバブルの最大半径を計算
      const maxTopicRadius = Math.max(...topics.map(topic => topic.r || 10));
      
      // 注力施策のバブルの内側に配置するための最大半径（注力施策の半径の70%程度を確保）
      const maxDistanceFromInitCenter = initRadius * 0.7 - maxTopicRadius;
      
      // トピックが1つの場合
      if (topics.length === 1) {
        const topicNode = topics[0];
        if (topicNode.r) {
          // 注力施策の中心に配置
          topicNode.x = initNode.x;
          topicNode.y = initNode.y;
        }
      } else if (topics.length > 1) {
        // 複数のトピックを注力施策のバブルの内側に円形に配置
        topics.forEach((topicNode, index) => {
          if (!topicNode.r) return;
          
          // 角度を計算（均等に配置）
          const angle = (index / topics.length) * 2 * Math.PI;
          
          // 注力施策の中心からの距離（注力施策のバブルの内側に収まるように）
          // トピックのバブルが注力施策のバブルの外に出ないようにする
          const availableRadius = Math.max(0, maxDistanceFromInitCenter - topicNode.r);
          const distanceFromCenter = Math.max(topicNode.r + 3, availableRadius * 0.8);
          
          // 新しい位置を計算
          topicNode.x = initNode.x + Math.cos(angle) * distanceFromCenter;
          topicNode.y = initNode.y + Math.sin(angle) * distanceFromCenter;
          
          // 注力施策のバブルの外に出ていないか確認し、必要に応じて調整
          const distFromInitCenter = Math.sqrt(
            (topicNode.x - initNode.x) ** 2 + (topicNode.y - initNode.y) ** 2
          );
          const maxAllowedDist = initRadius - topicNode.r - 3; // 3pxのマージン
          
          if (distFromInitCenter > maxAllowedDist) {
            // 注力施策のバブルの内側に収まるようにスケールダウン
            const scale = maxAllowedDist / distFromInitCenter;
            topicNode.x = initNode.x + (topicNode.x - initNode.x) * scale;
            topicNode.y = initNode.y + (topicNode.y - initNode.y) * scale;
          }
        });
      }
    });
    
    // 同じ注力施策内のトピックバブルの重なりを解消
    initiativeNodes.forEach(initNode => {
      const topics = topicNodesByInitiative.get(initNode) || [];
      if (topics.length <= 1 || !initNode.r) return;
      
      const initRadius = initNode.r;
      
      // 重なりを解消するための反復処理
      for (let iteration = 0; iteration < 30; iteration++) {
        let hasOverlap = false;
        
        for (let i = 0; i < topics.length; i++) {
          const node1 = topics[i];
          if (!node1.r) continue;
          
          for (let j = i + 1; j < topics.length; j++) {
            const node2 = topics[j];
            if (!node2.r) continue;
            
            // 距離を計算
            const dx = node2.x - node1.x;
            const dy = node2.y - node1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDist = node1.r + node2.r + 3; // 3pxの間隔
            
            // 重なっている場合、位置を調整
            if (distance < minDist && distance > 0.1) {
              hasOverlap = true;
              
              // 反発方向を計算
              const angle = Math.atan2(dy, dx);
              const separation = (minDist - distance) / 2;
              
              // 各バブルを注力施策の中心方向に移動しながら反発
              const dir1x = initNode.x - node1.x;
              const dir1y = initNode.y - node1.y;
              const dir1len = Math.sqrt(dir1x * dir1x + dir1y * dir1y);
              
              const dir2x = initNode.x - node2.x;
              const dir2y = initNode.y - node2.y;
              const dir2len = Math.sqrt(dir2x * dir2x + dir2y * dir2y);
              
              if (dir1len > 0 && dir2len > 0) {
                // 反発力と注力施策中心への引力を組み合わせ
                node1.x += (-Math.cos(angle) * separation + (dir1x / dir1len) * separation * 0.3);
                node1.y += (-Math.sin(angle) * separation + (dir1y / dir1len) * separation * 0.3);
                node2.x += (Math.cos(angle) * separation + (dir2x / dir2len) * separation * 0.3);
                node2.y += (Math.sin(angle) * separation + (dir2y / dir2len) * separation * 0.3);
              } else {
                // フォールバック: 単純に反発
                node1.x -= Math.cos(angle) * separation;
                node1.y -= Math.sin(angle) * separation;
                node2.x += Math.cos(angle) * separation;
                node2.y += Math.sin(angle) * separation;
              }
              
              // 注力施策のバブルの外に出ていないか確認
              [node1, node2].forEach(node => {
                const distFromInitCenter = Math.sqrt(
                  (node.x - initNode.x) ** 2 + (node.y - initNode.y) ** 2
                );
                const maxAllowedDist = initRadius - node.r - 3;
                
                if (distFromInitCenter > maxAllowedDist) {
                  const scale = maxAllowedDist / distFromInitCenter;
                  node.x = initNode.x + (node.x - initNode.x) * scale;
                  node.y = initNode.y + (node.y - initNode.y) * scale;
                }
              });
            }
          }
        }
        
        if (!hasOverlap) break;
      }
    });
    
    return packed;
  }, [packLayout, root]);

  return packedData;
}

