/**
 * 情報・通信部門の重複メンバーを削除するスクリプト
 */

import { callTauriCommand } from './localFirebase';
import { getOrgMembers, deleteOrgMember } from './orgApi';

/**
 * 情報・通信部門の組織IDを取得
 */
async function getIctDivisionId(): Promise<string | null> {
  try {
    const tree = await callTauriCommand('get_org_tree', { rootId: null });
    
    if (!tree || tree.length === 0) {
      return null;
    }
    
    // 情報・通信部門を探す（再帰的に検索）
    function findIctDivision(org: any): any {
      const orgData = org.organization || org;
      if (!orgData || !orgData.name) {
        return null;
      }
      const name = orgData.name;
      if (name === '情報・通信部門' || name === 'ICT Division' || name.includes('情報・通信') || name.includes('情報通信')) {
        return org;
      }
      if (org.children) {
        for (const child of org.children) {
          const found = findIctDivision(child);
          if (found) return found;
        }
      }
      return null;
    }
    
    for (const root of tree) {
      const foundOrg = findIctDivision(root);
      if (foundOrg) {
        const orgData = foundOrg.organization || foundOrg;
        return orgData.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('情報・通信部門の取得に失敗しました:', error);
    return null;
  }
}

/**
 * 情報・通信部門の重複メンバーを削除
 */
export async function removeIctDivisionDuplicates() {
  try {
    console.log('=== 情報・通信部門の重複メンバーを削除します ===\n');
    
    // 情報・通信部門の組織IDを取得
    const organizationId = await getIctDivisionId();
    
    if (!organizationId) {
      console.log('❌ 情報・通信部門が見つかりませんでした');
      return { removed: 0, kept: 0 };
    }
    
    console.log(`✅ 情報・通信部門の組織ID: ${organizationId}\n`);
    
    // メンバー情報を取得
    const members = await getOrgMembers(organizationId);
    console.log(`📊 現在のメンバー数: ${members.length}名\n`);
    
    if (members.length === 0) {
      console.log('⚠️ メンバーが登録されていません');
      return { removed: 0, kept: 0 };
    }
    
    // 名前でグループ化
    const membersByName: { [key: string]: any[] } = {};
    for (const member of members) {
      const name = member.name;
      if (!membersByName[name]) {
        membersByName[name] = [];
      }
      membersByName[name].push(member);
    }
    
    // 重複を検出して削除
    let removedCount = 0;
    let keptCount = 0;
    
    for (const [name, duplicates] of Object.entries(membersByName)) {
      if (duplicates.length > 1) {
        console.log(`⚠️ 「${name}」が${duplicates.length}件見つかりました`);
        
        // 作成日時でソート（古いものを残す）
        duplicates.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });
        
        // 最初の1つを残して、残りを削除
        const toKeep = duplicates[0];
        const toRemove = duplicates.slice(1);
        
        console.log(`  ✅ 保持: ${toKeep.id} (作成日時: ${toKeep.createdAt || '不明'})`);
        
        for (const member of toRemove) {
          try {
            await deleteOrgMember(member.id);
            console.log(`  ❌ 削除: ${member.id} (作成日時: ${member.createdAt || '不明'})`);
            removedCount++;
          } catch (error: any) {
            console.error(`  ❌ 削除失敗: ${member.id} - ${error.message}`);
          }
        }
        
        keptCount++;
      } else {
        keptCount++;
      }
    }
    
    console.log(`\n✅ 重複削除が完了しました`);
    console.log(`   削除: ${removedCount}名`);
    console.log(`   保持: ${keptCount}名`);
    
    // 削除後のメンバー数を確認
    const remainingMembers = await getOrgMembers(organizationId);
    console.log(`\n📊 削除後のメンバー数: ${remainingMembers.length}名`);
    
    return { removed: removedCount, kept: keptCount };
  } catch (error: any) {
    console.error('❌ 重複削除に失敗しました:', error);
    throw error;
  }
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  (window as any).removeIctDivisionDuplicates = removeIctDivisionDuplicates;
}
