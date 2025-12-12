/**
 * BPOビジネス課の組織を削除して再作成するスクリプト
 */

import { callTauriCommand } from './localFirebase';
import { deleteOrg, createOrg, getOrgMembers, deleteOrgMember, addOrgMember } from './orgApi';
import type { MemberInfo } from '@/components/OrgChart';
import { bpoBusinessSectionMembers } from './save-communications-business-members';
import { sortMembersByPosition } from './memberSort';

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
 * BPOビジネス課の組織を削除して再作成
 */
export async function recreateBpoSection() {
  try {
    console.log('=== BPOビジネス課の組織を削除して再作成します ===\n');
    
    // 既存のBPOビジネス課の組織IDを取得（全角・半角の両方を試す）
    const existingBpoId1 = await getOrganizationId(['BPOビジネス課', 'BPO Business Section']);
    const existingBpoId2 = await getOrganizationId(['ＢＰＯビジネス課', 'BPO Business Section']);
    const existingBpoId = existingBpoId1 || existingBpoId2;
    
    if (existingBpoId) {
      console.log(`既存のBPOビジネス課の組織ID: ${existingBpoId}`);
      
      // 既存のメンバーを削除
      try {
        const existingMembers = await getOrgMembers(existingBpoId);
        console.log(`既存のメンバー数: ${existingMembers.length}名`);
        for (const member of existingMembers) {
          try {
            await deleteOrgMember(member.id);
            console.log(`  - メンバー ${member.name} を削除しました`);
          } catch (error: any) {
            console.warn(`  - メンバー ${member.name} の削除に失敗しました:`, error.message);
          }
        }
      } catch (error: any) {
        console.warn('既存メンバーの取得に失敗しました:', error.message);
      }
      
      // 組織を削除
      try {
        await deleteOrg(existingBpoId);
        console.log('✅ 既存のBPOビジネス課の組織を削除しました\n');
      } catch (error: any) {
        console.error('❌ 組織の削除に失敗しました:', error);
        throw error;
      }
    } else {
      console.log('既存のBPOビジネス課が見つかりませんでした（新規作成します）\n');
    }
    
    // 通信ビジネス部の組織IDを取得
    const communicationsDeptId = await getOrganizationId(['通信ビジネス部', 'Communications Business Department']);
    if (!communicationsDeptId) {
      throw new Error('通信ビジネス部が見つかりません');
    }
    console.log(`通信ビジネス部の組織ID: ${communicationsDeptId}\n`);
    
    // BPOビジネス課を再作成
    console.log('BPOビジネス課を再作成中...');
    const newBpoOrg = await createOrg(
      communicationsDeptId,
      'BPOビジネス課',
      'BPO Business Section',
      '課長：松下 祐生',
      2, // level: 2（通信ビジネス部がlevel 1なので、その配下はlevel 2）
      '課', // levelName: 課
      2 // position: 2番目（デジタルマーケティングビジネス課の後）
    );
    
    const newBpoId = newBpoOrg.id || newBpoOrg;
    console.log(`✅ BPOビジネス課を再作成しました。組織ID: ${newBpoId}\n`);
    
    // メンバーを保存
    console.log(`メンバー ${bpoBusinessSectionMembers.length}名を保存中...`);
    for (const member of bpoBusinessSectionMembers) {
      try {
        await addOrgMember(newBpoId, member);
        console.log(`  ✅ ${member.name} を保存しました`);
      } catch (error: any) {
        console.error(`  ❌ ${member.name} の保存に失敗しました:`, error.message);
      }
    }
    
    // 保存後の確認
    const savedMembers = await getOrgMembers(newBpoId);
    console.log(`\n✅ 保存完了。メンバー数: ${savedMembers.length}名`);
    
    return { organizationId: newBpoId, memberCount: savedMembers.length };
  } catch (error: any) {
    console.error('❌ BPOビジネス課の再作成に失敗しました:', error);
    throw error;
  }
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  (window as any).recreateBpoSection = recreateBpoSection;
}
