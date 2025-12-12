/**
 * フロンティアビジネス部を通信ビジネス部の右側に移動するスクリプト
 */

import { callTauriCommand } from './localFirebase';
import { updateOrg } from './orgApi';

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
 * 情報・通信部門の配下の部門の順序を取得（直接データベースから取得）
 */
async function getDepartmentOrder(divisionId: string): Promise<{ id: string; name: string; position: number }[]> {
  try {
    // get_orgs_by_parentを使用して直接取得（より軽量、再帰的ではない）
    const children = await callTauriCommand('get_orgs_by_parent', { parentId: divisionId });
    
    console.log(`取得した部門数: ${children.length}`);
    
    const departments = children.map((org: any) => {
      // organizationプロパティがある場合とない場合の両方に対応
      const orgData = org.organization || org;
      return {
        id: orgData.id,
        name: orgData.name,
        position: orgData.position || 0,
      };
    });
    
    console.log('取得した部門（ソート前）:');
    departments.forEach((dept: { id: string; name: string; position: number; title: string }, index: number) => {
      console.log(`  ${index + 1}. ${dept.name} (position: ${dept.position})`);
    });
    
    const sorted = departments.sort((a: any, b: any) => a.position - b.position);
    
    console.log('ソート後の部門:');
    sorted.forEach((dept: { id: string; name: string; position: number; title: string }, index: number) => {
      console.log(`  ${index + 1}. ${dept.name} (position: ${dept.position})`);
    });
    
    return sorted;
  } catch (error) {
    console.error('部門の順序取得に失敗しました:', error);
    return [];
  }
}

/**
 * フロンティアビジネス部を一番右に移動
 */
export async function reorderFrontierBusiness() {
  try {
    console.log('=== フロンティアビジネス部を一番右に移動します ===\n');
    
    // 情報・通信部門の組織IDを取得
    const divisionId = await getOrganizationId(['情報・通信部門', 'ICT Division']);
    if (!divisionId) {
      throw new Error('情報・通信部門が見つかりません');
    }
    console.log(`✅ 情報・通信部門の組織ID: ${divisionId}\n`);
    
    // フロンティアビジネス部の組織IDを取得
    const frontierDeptId = await getOrganizationId(['フロンティアビジネス部', 'Frontier Business Department']);
    if (!frontierDeptId) {
      throw new Error('フロンティアビジネス部が見つかりません');
    }
    console.log(`✅ フロンティアビジネス部の組織ID: ${frontierDeptId}\n`);
    
    // 情報・通信部門の配下の部門の順序を取得
    console.log('部門の順序を取得中...');
    const departments = await getDepartmentOrder(divisionId);
    
    if (departments.length === 0) {
      throw new Error('部門が見つかりませんでした');
    }
    
    console.log('現在の部門順序:');
    departments.forEach((dept, index) => {
      console.log(`  ${index + 1}. ${dept.name} (position: ${dept.position})`);
    });
    
    // フロンティアビジネス部以外の部門の最大positionを取得
    const otherDepartments = departments.filter(d => d.id !== frontierDeptId);
    if (otherDepartments.length === 0) {
      throw new Error('フロンティアビジネス部以外の部門が見つかりませんでした');
    }
    
    const maxPosition = Math.max(...otherDepartments.map(d => d.position || 0));
    
    // フロンティアビジネス部のpositionを最大値+1に設定（一番右に配置）
    const newPosition = maxPosition + 1;
    console.log(`\nフロンティアビジネス部のpositionを${newPosition}に設定します（一番右に配置）\n`);
    
    // フロンティアビジネス部の現在のpositionを確認
    const currentFrontierDept = departments.find(d => d.id === frontierDeptId);
    if (currentFrontierDept) {
      console.log(`フロンティアビジネス部の現在のposition: ${currentFrontierDept.position}`);
    }
    
    // フロンティアビジネス部のpositionを更新
    console.log(`positionを${newPosition}に更新中...`);
    const updateResult = await updateOrg(frontierDeptId, undefined, undefined, undefined, newPosition);
    console.log('更新結果:', updateResult);
    console.log(`✅ フロンティアビジネス部のpositionを${newPosition}に更新しました\n`);
    
    // 更新後の順序を確認（軽量な方法で）
    console.log('更新後の順序を確認中...');
    const updatedDepartments = await getDepartmentOrder(divisionId);
    console.log('\n更新後の部門順序:');
    updatedDepartments.forEach((dept, index) => {
      const marker = dept.id === frontierDeptId ? ' 👈 フロンティアビジネス部' : '';
      console.log(`  ${index + 1}. ${dept.name} (position: ${dept.position})${marker}`);
    });
    
    // フロンティアビジネス部が一番右にあるか確認
    const frontierIndex = updatedDepartments.findIndex(d => d.id === frontierDeptId);
    const isLast = frontierIndex === updatedDepartments.length - 1;
    
    if (isLast) {
      console.log('\n✅ フロンティアビジネス部は一番右に配置されました！');
    } else {
      console.log(`\n⚠️ フロンティアビジネス部は${frontierIndex + 1}番目です。一番右にするにはpositionをさらに大きくする必要があります。`);
    }
    
    const result = { success: true, newPosition, isLast, frontierIndex: frontierIndex + 1, totalDepartments: updatedDepartments.length };
    console.log('\n=== 実行結果 ===');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ 順序変更に失敗しました:', error);
    throw error;
  }
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  (window as any).reorderFrontierBusiness = reorderFrontierBusiness;
}
