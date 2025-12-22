import { useMemo } from 'react';
import type { RelationshipNode, RelationshipLink } from '@/components/RelationshipDiagram2D';
import type { Theme, FocusInitiative, TopicInfo } from '@/lib/orgApi';
import type { OrgNodeData } from '@/lib/orgApi';
import { devLog, devWarn } from '../utils/devLog';

const isDev = process.env.NODE_ENV === 'development';

export function useRelationshipDiagramData({
  selectedThemeId,
  themes,
  initiatives,
  orgData,
  topics,
  selectedTypeFilter,
}: {
  selectedThemeId: string | null;
  themes: Theme[];
  initiatives: FocusInitiative[];
  orgData: OrgNodeData | null;
  topics: TopicInfo[];
  selectedTypeFilter: 'all' | 'organization' | 'company' | 'person';
}) {
  const { nodes, links } = useMemo(() => {
    devLog('🔍 [2D関係性図] useMemo実行:', {
      selectedThemeId,
      selectedTypeFilter,
      hasOrgData: !!orgData,
      themesCount: themes.length,
      initiativesCount: initiatives.length,
      topicsCount: topics.length,
    });

    if (!orgData && themes.length === 0) {
      devLog('🔍 [2D関係性図] 組織データなし、かつテーマが存在しない');
      return { nodes: [], links: [] };
    }

    const diagramNodes: RelationshipNode[] = [];
    const diagramLinks: RelationshipLink[] = [];

    const parentNodeId = 'parent-department';
    if (orgData) {
      diagramNodes.push({
        id: parentNodeId,
        label: '情報・通信部門',
        type: 'organization',
        data: { id: parentNodeId, name: '情報・通信部門', isParent: true },
      });
    }

    const themesToShow = selectedThemeId
      ? themes.filter((t) => t.id === selectedThemeId)
      : themes;

    devLog('🔍 [2D関係性図] 表示するテーマ数:', themesToShow.length);
    
    if (themesToShow.length === 0) {
      devLog('🔍 [2D関係性図] 表示するテーマがありません');
      return { nodes: [], links: [] };
    }

    const getOrgName = (orgId: string, orgTree: OrgNodeData | null): string => {
      if (!orgTree) return orgId;
      
      const findOrg = (node: OrgNodeData): OrgNodeData | null => {
        if (node.id === orgId) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findOrg(child);
            if (found) return found;
          }
        }
        return null;
      };

      const found = findOrg(orgTree);
      const orgName = found ? (found.name || found.title || orgId) : orgId;
      
      return orgName;
    };

    themesToShow.forEach((theme) => {
      diagramNodes.push({
        id: theme.id,
        label: theme.title,
        type: 'theme',
        data: theme,
      });

      if (orgData) {
        diagramLinks.push({
          source: parentNodeId,
          target: theme.id,
          type: 'main',
        });
      }

      const relatedInitiatives = initiatives.filter((init) => 
        theme.initiativeIds?.includes(init.id) || 
        init.themeId === theme.id || 
        (Array.isArray(init.themeIds) && init.themeIds.includes(theme.id))
      );

      const organizationIds = new Set<string>();
      relatedInitiatives.forEach((init) => {
        if (init.organizationId) {
          organizationIds.add(init.organizationId);
        }
        if (Array.isArray((init as any).relatedOrganizations)) {
          (init as any).relatedOrganizations.forEach((orgId: string) => {
            if (orgId) {
              organizationIds.add(orgId);
            }
          });
        }
      });

      organizationIds.forEach((orgId) => {
        const findOrg = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
          if (node.id === targetId) return node;
          if (node.children) {
            for (const child of node.children) {
              const found = findOrg(child, targetId);
              if (found) return found;
            }
          }
          return null;
        };
        const actualOrg = orgData ? findOrg(orgData, orgId) : null;
        const orgType = actualOrg ? ((actualOrg as any).type || 'organization') : 'organization';
        
        if (selectedTypeFilter !== 'all' && orgType !== selectedTypeFilter) {
          return;
        }
        
        const orgNodeId = `${theme.id}_${orgId}`;
        const orgName = getOrgName(orgId, orgData);
        
        diagramNodes.push({
          id: orgNodeId,
          label: orgName,
          type: orgType === 'company' ? 'company' : 'organization',
          data: { id: orgId, name: orgName, originalId: orgId, themeId: theme.id, type: orgType },
        });

        diagramLinks.push({
          source: theme.id,
          target: orgNodeId,
          type: 'main',
        });
      });

      relatedInitiatives.forEach((initiative) => {
        const initiativeNodeId = `${theme.id}_${initiative.id}`;
        
        diagramNodes.push({
          id: initiativeNodeId,
          label: initiative.title,
          type: 'initiative',
          data: { ...initiative, originalId: initiative.id, themeId: theme.id },
        });

        if (initiative.organizationId) {
          const orgNodeId = `${theme.id}_${initiative.organizationId}`;
          const orgNodeExists = diagramNodes.find(n => n.id === orgNodeId);
          if (orgNodeExists) {
            diagramLinks.push({
              source: orgNodeId,
              target: initiativeNodeId,
              type: 'branch',
            });
          }
        }
        
        let parsedTopicIds: string[] = [];
        if (initiative.topicIds) {
          if (Array.isArray(initiative.topicIds)) {
            parsedTopicIds = initiative.topicIds;
          } else if (typeof initiative.topicIds === 'string') {
            try {
              const parsed = JSON.parse(initiative.topicIds);
              parsedTopicIds = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              devWarn('⚠️ [2D関係性図] topicIdsのパースエラー:', e, 'value:', initiative.topicIds);
              parsedTopicIds = [];
            }
          }
        }
        
        if (parsedTopicIds.length > 0) {
          devLog('🔍 [2D関係性図] 注力施策に紐づけられたトピック:', {
            initiativeId: initiative.id,
            initiativeTitle: initiative.title,
            topicIdsCount: parsedTopicIds.length,
            availableTopicsCount: topics.length,
          });
          
          const missingTopicIds = new Set<string>();
          
          parsedTopicIds.forEach((topicId) => {
            const matchingTopics = topics.filter(t => {
              const matches = t.id === topicId;
              if (!matches && t.id && topicId && isDev) {
                const idStr = String(t.id);
                const searchStr = String(topicId);
                if (idStr.includes(searchStr) || searchStr.includes(idStr)) {
                  devWarn('⚠️ [2D関係性図] トピックIDの部分一致を検出:', {
                    topicId: topicId,
                    foundId: t.id,
                    topicTitle: t.title,
                  });
                }
              }
              return matches;
            });
            
            const topic = matchingTopics.length > 0 ? matchingTopics[0] : null;
            
            if (topic) {
              const topicNodeId = `${theme.id}_${initiative.id}_${topic.id}`;
              
              diagramNodes.push({
                id: topicNodeId,
                label: topic.title,
                type: 'topic',
                data: { ...topic, originalId: topic.id, initiativeId: initiative.id, themeId: theme.id },
              });
              
              diagramLinks.push({
                source: initiativeNodeId,
                target: topicNodeId,
                type: 'topic',
              });
            } else {
              missingTopicIds.add(topicId);
              devWarn('⚠️ [2D関係性図] トピックが見つかりませんでした:', {
                topicId,
                initiativeId: initiative.id,
                initiativeTitle: initiative.title,
              });
            }
          });
          
          if (missingTopicIds.size > 0) {
            devWarn('⚠️ [2D関係性図] 一部のトピックが見つかりませんでした（データの不整合の可能性）:', {
              missingTopicIdsCount: missingTopicIds.size,
              initiativeId: initiative.id,
              initiativeTitle: initiative.title,
            });
          }
        }
      });
    });

    const topicNodes = diagramNodes.filter(n => n.type === 'topic');
    const topicLinks = diagramLinks.filter(l => l.type === 'topic');
    
    const nodeIds = new Set(diagramNodes.map(n => n.id));
    const invalidLinks: Array<{ source: string; target: string; type?: string }> = [];
    diagramLinks.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) {
        invalidLinks.push({
          source: sourceId,
          target: targetId,
          type: link.type,
        });
      }
    });
    
    if (invalidLinks.length > 0) {
      console.error('❌ [2D関係性図] 無効なリンクが検出されました:', {
        invalidLinksCount: invalidLinks.length,
        missingSourceNodesCount: invalidLinks.filter(l => !nodeIds.has(l.source)).length,
        missingTargetNodesCount: invalidLinks.filter(l => !nodeIds.has(l.target)).length,
      });
    }
    
    devLog('🔍 [2D関係性図] 最終結果:', {
      totalNodes: diagramNodes.length,
      totalLinks: diagramLinks.length,
      topicNodesCount: topicNodes.length,
      topicLinksCount: topicLinks.length,
      invalidLinksCount: invalidLinks.length,
    });

    const validLinks = diagramLinks.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { nodes: diagramNodes, links: validLinks };
  }, [selectedThemeId, themes, initiatives, orgData, topics, selectedTypeFilter]);

  return { nodes, links };
}

