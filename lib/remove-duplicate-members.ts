/**
 * 組織の重複メンバーを削除するスクリプト
 */

import { callTauriCommand } from './localFirebase';
import { getOrgMembers, deleteOrgMember } from './orgApi';

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
 * 重複メンバーを削除（汎用関数）
 */
export async function removeDuplicateMembers(orgName: string | string[] = ['企画統轄課', '企画統括課']) {
  try {
    const orgNameDisplay = Array.isArray(orgName) ? orgName.join(' / ') : orgName;
    console.log(`=== ${orgNameDisplay}の重複メンバー削除 ===\n`);
    
    // 組織IDを取得
    const organizationId = await getOrganizationId(orgName);
    
    if (!organizationId) {
      console.log(`❌ ${orgNameDisplay}が見つかりませんでした`);
      return { removed: 0, duplicates: [] };
    }
    
    console.log(`✅ ${orgNameDisplay}の組織ID: ${organizationId}\n`);
    
    // メンバー情報を取得
    const members = await getOrgMembers(organizationId);
    
    console.log(`📊 現在のメンバー数: ${members.length}名\n`);
    
    if (members.length === 0) {
      console.log('⚠️ メンバーが登録されていません');
      return { removed: 0, duplicates: [] };
    }
    
    // 重複を検出（名前で判定）
    const nameMap = new Map<string, any[]>();
    
    members.forEach((member: any) => {
      const name = member.name?.trim();
      if (name) {
        if (!nameMap.has(name)) {
          nameMap.set(name, []);
        }
        nameMap.get(name)!.push(member);
      }
    });
    
    // 重複しているメンバーを特定
    const duplicates: any[] = [];
    const toRemove: any[] = [];
    
    nameMap.forEach((memberList, name) => {
      if (memberList.length > 1) {
        console.log(`⚠️ 重複検出: ${name} (${memberList.length}件)`);
        
        // 最初の1件を残し、残りを削除対象にする
        // より詳細な情報がある方を残す（createdAtが古い方を残す）
        memberList.sort((a, b) => {
          const aDate = a.createdAt || '';
          const bDate = b.createdAt || '';
          return aDate.localeCompare(bDate);
        });
        
        // 最初の1件を残し、残りを削除
        for (let i = 1; i < memberList.length; i++) {
          toRemove.push(memberList[i]);
          duplicates.push({
            name: name,
            keep: memberList[0],
            remove: memberList[i],
          });
        }
      }
    });
    
    if (duplicates.length === 0) {
      console.log('✅ 重複メンバーは見つかりませんでした');
      return { removed: 0, duplicates: [] };
    }
    
    console.log(`\n📋 削除対象: ${toRemove.length}名\n`);
    
    // 重複メンバーを削除
    let removedCount = 0;
    for (const member of toRemove) {
      try {
        await deleteOrgMember(member.id);
        console.log(`✅ 削除: ${member.name} (ID: ${member.id})`);
        removedCount++;
      } catch (error: any) {
        console.error(`❌ 削除失敗: ${member.name} - ${error.message}`);
      }
    }
    
    console.log(`\n✅ 重複メンバーの削除が完了しました`);
    console.log(`削除数: ${removedCount}名`);
    
    // 削除後のメンバー数を確認
    const remainingMembers = await getOrgMembers(organizationId);
    console.log(`\n📊 削除後のメンバー数: ${remainingMembers.length}名`);
    
    return { removed: removedCount, duplicates };
  } catch (error: any) {
    console.error('❌ 重複メンバーの削除中にエラーが発生しました:', error);
    console.error('エラー詳細:', error);
    return { removed: 0, duplicates: [] };
  }
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  (window as any).removeDuplicateMembers = removeDuplicateMembers;
}
