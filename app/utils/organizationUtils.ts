import type { OrgNodeData } from '@/lib/orgApi';

// 組織の階層レベル情報
export interface OrgWithDepth {
  id: string;
  name: string;
  depth: number;
  path: string[]; // ルートから現在の組織までのパス
}

// 階層レベルごとの組織グループ
export interface HierarchyLevel {
  level: number;
  orgs: OrgWithDepth[];
}

/**
 * 組織ツリーから階層レベルごとの組織を抽出（typeフィルター対応）
 */
export function extractOrganizationsByDepth(
  orgTree: OrgNodeData | null,
  typeFilter?: 'all' | 'organization' | 'company' | 'person'
): HierarchyLevel[] {
  if (!orgTree) return [];

  const orgsByDepth = new Map<number, OrgWithDepth[]>();

  function traverse(node: OrgNodeData, depth: number, path: string[]) {
    if (!node.id) return;

    // typeフィルターを適用
    const nodeType = (node as any).type || 'organization';
    if (typeFilter && typeFilter !== 'all' && nodeType !== typeFilter) {
      // フィルターに一致しない場合はスキップ（子ノードは確認する）
      if (node.children) {
        for (const child of node.children) {
          traverse(child, depth + 1, path);
        }
      }
      return;
    }

    const orgWithDepth: OrgWithDepth = {
      id: node.id,
      name: node.name || node.title || node.id,
      depth,
      path: [...path, node.name || node.title || node.id],
    };

    if (!orgsByDepth.has(depth)) {
      orgsByDepth.set(depth, []);
    }
    orgsByDepth.get(depth)!.push(orgWithDepth);

    if (node.children) {
      for (const child of node.children) {
        traverse(child, depth + 1, orgWithDepth.path);
      }
    }
  }

  traverse(orgTree, 0, []);

  // Mapを配列に変換してソート
  return Array.from(orgsByDepth.entries())
    .map(([level, orgs]) => ({ level, orgs }))
    .sort((a, b) => a.level - b.level);
}

/**
 * 組織ツリーから指定された組織IDの子孫組織IDをすべて取得（再帰的）
 */
export function getDescendantOrgIds(orgTree: OrgNodeData | null, orgId: string): string[] {
  if (!orgTree) return [];

  const descendantIds: string[] = [];

  function findAndCollect(node: OrgNodeData, targetId: string, collecting: boolean) {
    if (!node.id) return false;

    const isTarget = node.id === targetId;
    const shouldCollect = collecting || isTarget;

    if (shouldCollect && !isTarget) {
      // ターゲット組織自体は除外（子孫のみ）
      descendantIds.push(node.id);
    }

    if (node.children) {
      for (const child of node.children) {
        findAndCollect(child, targetId, shouldCollect);
      }
    }

    return isTarget;
  }

  findAndCollect(orgTree, orgId, false);
  return descendantIds;
}

/**
 * 組織ツリーから指定された階層レベルの組織とその子孫組織IDをすべて取得
 */
export function getOrgIdsWithDescendants(
  orgTree: OrgNodeData | null,
  selectedLevelOrgs: OrgWithDepth[]
): Map<string, string[]> {
  const orgIdsMap = new Map<string, string[]>();

  selectedLevelOrgs.forEach(org => {
    const descendantIds = getDescendantOrgIds(orgTree, org.id);
    // 自分自身も含める
    orgIdsMap.set(org.id, [org.id, ...descendantIds]);
  });

  return orgIdsMap;
}

