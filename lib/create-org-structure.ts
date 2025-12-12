/**
 * サンプルデータから組織構造をデータベースに作成するスクリプト
 */

import { kuOrgData } from './orgData';
import { createOrg } from './orgApi';
import type { OrgNodeData } from '@/components/OrgChart';

/**
 * 組織構造を再帰的に作成
 */
async function createOrgRecursive(
  orgData: OrgNodeData,
  parentId: string | null = null,
  level: number = 0
): Promise<string> {
  // 組織を作成
  const result = await createOrg(
    parentId,
    orgData.name,
    orgData.title || null,
    orgData.description || null,
    level,
    getLevelName(level),
    1
  );

  const orgId = result.id;

  // 子組織を再帰的に作成
  if (orgData.children && orgData.children.length > 0) {
    for (let i = 0; i < orgData.children.length; i++) {
      await createOrgRecursive(orgData.children[i], orgId, level + 1);
    }
  }

  return orgId;
}

/**
 * レベルに応じたレベル名を取得
 */
function getLevelName(level: number): string {
  switch (level) {
    case 0:
      return '部門';
    case 1:
      return '課';
    case 2:
      return 'チーム';
    default:
      return '組織';
  }
}

/**
 * サンプルデータから組織構造を作成
 */
export async function createOrgStructureFromSample() {
  try {
    console.log('=== 組織構造の作成を開始します ===\n');

    // 既存の組織構造を確認
    const { callTauriCommand } = await import('./localFirebase');
    const existingTree = await callTauriCommand('get_org_tree', { rootId: null });

    if (existingTree && existingTree.length > 0) {
      console.log('⚠️ 既存の組織構造が見つかりました。スキップします。');
      console.log(`既存の組織数: ${existingTree.length}`);
      return existingTree[0].organization.id;
    }

    // サンプルデータから組織構造を作成
    const rootOrgId = await createOrgRecursive(kuOrgData, null, 0);

    console.log(`✅ 組織構造の作成が完了しました`);
    console.log(`ルート組織ID: ${rootOrgId}`);

    return rootOrgId;
  } catch (error: any) {
    console.error('❌ 組織構造の作成に失敗しました:', error);
    throw error;
  }
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  (window as any).createOrgStructureFromSample = createOrgStructureFromSample;
}
