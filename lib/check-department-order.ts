/**
 * 情報・通信部門の配下の部門の順序を確認するスクリプト
 */

import { callTauriCommand } from './localFirebase';

/**
 * 組織IDを取得（汎用関数）
 */
async function getOrganizationId(orgName: string | string[]): Promise<string | null> {
  try {
    const tree = await callTauriCommand('get_org_tree', { rootId: null });
    
    if (!tree || tree.length === 0) {
      return null;
    }
    
    const searchNames = Array.isArray(orgName) ? orgName : [orgName];
    
    // 組織を探す（再帰的に検索）
    function findOrganization(org: any): any {
      const orgData = org.organization || org;
      if (!orgData || !orgData.name) {
        return null;
      }
      
      for (const name of searchNames) {
        if (orgData.name === name || orgData.name.includes(name) || name.includes(orgData.name)) {
          return org;
        }
      }
      
      if (org.children) {
        for (const child of org.children) {
          const found = findOrganization(child);
          if (found) return found;
        }
      }
      return null;
    }
    
    for (const root of tree) {
      const foundOrg = findOrganization(root);
      if (foundOrg) {
        const orgData = foundOrg.organization || foundOrg;
        return orgData.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`組織「${Array.isArray(orgName) ? orgName.join(' / ') : orgName}」の取得に失敗しました:`, error);
    return null;
  }
}

/**
 * 情報・通信部門の配下の部門の順序を確認
 */
export async function checkDepartmentOrder() {
  try {
    console.log('=== 情報・通信部門の配下の部門の順序を確認します ===\n');
    
    // 情報・通信部門の組織IDを取得
    const divisionId = await getOrganizationId(['情報・通信部門', 'ICT Division']);
    if (!divisionId) {
      throw new Error('情報・通信部門が見つかりません');
    }
    console.log(`✅ 情報・通信部門の組織ID: ${divisionId}\n`);
    
    // 組織ツリーを取得
    const tree = await callTauriCommand('get_org_tree', { rootId: divisionId });
    
    if (!tree || tree.length === 0) {
      console.log('❌ 部門が見つかりませんでした');
      return [];
    }
    
    const division = tree[0];
    const children = division.children || [];
    
    console.log(`📊 部門数: ${children.length}個\n`);
    
    // 各部門の情報を表示
    const departments = children.map((child: any) => {
      const orgData = child.organization || child;
      return {
        id: orgData.id,
        name: orgData.name,
        position: orgData.position || 0,
        title: orgData.title || '',
      };
    });
    
    // positionでソート
    departments.sort((a: { position: number }, b: { position: number }) => a.position - b.position);
    
    console.log('=== 部門の順序（position順） ===\n');
    departments.forEach((dept: { id: string; name: string; position: number; title: string }, index: number) => {
      console.log(`${index + 1}. ${dept.name}`);
      console.log(`   ID: ${dept.id}`);
      console.log(`   Position: ${dept.position}`);
      console.log(`   Title: ${dept.title}`);
      console.log('');
    });
    
    console.log('=== 表示順序の説明 ===');
    console.log('組織図では、positionの値が小さい順（左から右）に表示されます。');
    console.log('positionが同じ場合は、データベースの登録順になります。\n');
    
    return departments;
  } catch (error: any) {
    console.error('❌ 順序確認に失敗しました:', error);
    throw error;
  }
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  (window as any).checkDepartmentOrder = checkDepartmentOrder;
}
