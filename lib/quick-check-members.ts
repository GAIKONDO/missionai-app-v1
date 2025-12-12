/**
 * 企画統括課のメンバー数を素早く確認するスクリプト
 */

import { callTauriCommand } from './localFirebase';
import { getOrgMembers } from './orgApi';

/**
 * 企画統括課のメンバー数を確認
 */
export async function quickCheckMemberCount(): Promise<number> {
  try {
    // 組織ツリーを取得して企画統括課を探す
    const tree = await callTauriCommand('get_org_tree', { rootId: null });
    
    if (!tree || tree.length === 0) {
      console.log('❌ 組織データが見つかりません');
      return 0;
    }
    
    const root = tree[0];
    
    // 企画統括課を探す（再帰的に検索）
    function findPlanningSection(org: any): any {
      const orgData = org.organization || org;
      if (!orgData || !orgData.name) {
        return null;
      }
      if (orgData.name === '企画統轄課' || orgData.name === '企画統括課') {
        return org;
      }
      if (org.children) {
        for (const child of org.children) {
          const found = findPlanningSection(child);
          if (found) return found;
        }
      }
      return null;
    }
    
    const planningSection = findPlanningSection(root);
    
    if (!planningSection) {
      console.log('❌ 企画統括課が見つかりません');
      return 0;
    }
    
    const orgData = planningSection.organization || planningSection;
    const organizationId = orgData.id;
    const members = await getOrgMembers(organizationId);
    
    return members.length;
  } catch (error: any) {
    console.error('❌ 確認中にエラーが発生しました:', error);
    return 0;
  }
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  // グローバルに公開
  (window as any).quickCheckMemberCount = quickCheckMemberCount;
}
