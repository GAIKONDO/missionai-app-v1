/**
 * BPOビジネス課のメンバーのみを保存するスクリプト（組織は削除しない）
 */

import { callTauriCommand } from './localFirebase';
import { getOrgMembers, deleteOrgMember, addOrgMember } from './orgApi';
import type { MemberInfo } from '@/components/OrgChart';
import { bpoBusinessSectionMembers } from './save-communications-business-members';

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
 * BPOビジネス課のメンバーのみを保存（組織は削除しない）
 */
export async function saveBpoMembersOnly() {
  try {
    console.log('=== BPOビジネス課のメンバーを保存します ===\n');
    
    // BPOビジネス課の組織IDを取得（全角・半角の両方を試す）
    const bpoId1 = await getOrganizationId(['BPOビジネス課', 'BPO Business Section']);
    const bpoId2 = await getOrganizationId(['ＢＰＯビジネス課', 'BPO Business Section']);
    const bpoId = bpoId1 || bpoId2;
    
    if (!bpoId) {
      throw new Error('BPOビジネス課が見つかりません。まず組織を作成してください。');
    }
    
    console.log(`✅ BPOビジネス課の組織ID: ${bpoId}\n`);
    
    // 既存のメンバーを取得
    let existingMembers: any[] = [];
    try {
      existingMembers = await getOrgMembers(bpoId);
      console.log(`既存のメンバー数: ${existingMembers.length}名`);
    } catch (error: any) {
      console.warn('既存メンバーの取得に失敗しました（初回実行の可能性があります）:', error.message);
    }
    
    // 既存のメンバーを削除
    if (existingMembers.length > 0) {
      console.log('\n既存のメンバーを削除中...');
      for (const member of existingMembers) {
        try {
          await deleteOrgMember(member.id);
          console.log(`  - メンバー ${member.name} を削除しました`);
        } catch (error: any) {
          console.warn(`  - メンバー ${member.name} の削除に失敗しました:`, error.message);
        }
      }
      console.log('✅ 既存メンバーの削除が完了しました\n');
    }
    
    // メンバーを保存
    console.log(`メンバー ${bpoBusinessSectionMembers.length}名を保存中...`);
    let successCount = 0;
    let failCount = 0;
    
    for (const member of bpoBusinessSectionMembers) {
      try {
        await addOrgMember(bpoId, member);
        console.log(`  ✅ ${member.name} を保存しました`);
        successCount++;
      } catch (error: any) {
        console.error(`  ❌ ${member.name} の保存に失敗しました:`, error.message);
        failCount++;
      }
    }
    
    // 保存後の確認
    const savedMembers = await getOrgMembers(bpoId);
    console.log(`\n✅ 保存完了`);
    console.log(`   成功: ${successCount}名`);
    console.log(`   失敗: ${failCount}名`);
    console.log(`   データベース内のメンバー数: ${savedMembers.length}名`);
    
    const result = { organizationId: bpoId, memberCount: savedMembers.length, successCount, failCount };
    console.log('\n=== 実行結果 ===');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ BPOビジネス課のメンバー保存に失敗しました:', error);
    console.error('エラー詳細:', error);
    throw error;
  }
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  (window as any).saveBpoMembersOnly = saveBpoMembersOnly;
}
