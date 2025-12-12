/**
 * BPOビジネス課のメンバーをデータベースから直接確認するスクリプト
 */

import { callTauriCommand } from './localFirebase';
import { getOrgMembers } from './orgApi';

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
 * データベースから直接BPOビジネス課のメンバーを確認
 */
export async function checkBpoMembersInDb() {
  try {
    console.log('=== データベースからBPOビジネス課のメンバーを確認 ===\n');
    
    // BPOビジネス課の組織IDを取得（全角・半角の両方を試す）
    const bpoId1 = await getOrganizationId(['BPOビジネス課', 'BPO Business Section']);
    const bpoId2 = await getOrganizationId(['ＢＰＯビジネス課', 'BPO Business Section']);
    const bpoId = bpoId1 || bpoId2;
    
    if (!bpoId) {
      console.log('❌ BPOビジネス課が見つかりませんでした');
      console.log('全角版を検索中...');
      const bpoIdFull = await getOrganizationId(['ＢＰＯビジネス課']);
      if (bpoIdFull) {
        console.log(`✅ 全角版のBPOビジネス課が見つかりました: ${bpoIdFull}`);
        return await checkMembersByOrgId(bpoIdFull);
      }
      const result = { organizationId: null, memberCount: 0, members: [] };
      console.log('\n=== 実行結果 ===');
      console.log(JSON.stringify(result, null, 2));
      return result;
    }
    
    console.log(`✅ BPOビジネス課の組織ID: ${bpoId}\n`);
    
    return await checkMembersByOrgId(bpoId);
  } catch (error: any) {
    console.error('❌ 確認中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * 組織IDでメンバーを確認
 */
async function checkMembersByOrgId(organizationId: string) {
  try {
    // データベースから直接メンバーを取得
    const members = await getOrgMembers(organizationId);
    
    console.log(`📊 データベースに保存されているメンバー数: ${members.length}名\n`);
    
    if (members.length === 0) {
      console.log('⚠️ メンバーがデータベースに保存されていません');
      return { organizationId, memberCount: 0, members: [] };
    }
    
    console.log('=== 保存されているメンバー一覧 ===\n');
    members.forEach((member: any, index: number) => {
      console.log(`${index + 1}. ${member.name}${member.nameRomaji ? ` (${member.nameRomaji})` : ''}`);
      if (member.position) {
        console.log(`   役職: ${member.position}`);
      }
      if (member.department) {
        console.log(`   部署: ${member.department}`);
      }
      if (member.extension) {
        console.log(`   内線: ${member.extension}`);
      }
      if (member.companyPhone) {
        console.log(`   会社電話: ${member.companyPhone}`);
      }
      if (member.itochuEmail) {
        console.log(`   伊藤忠メール: ${member.itochuEmail}`);
      }
      console.log(`   ID: ${member.id}`);
      console.log(`   組織ID: ${member.organizationId}`);
      console.log('');
    });
    
    console.log('=== 確認完了 ===');
    const result = { organizationId, memberCount: members.length, members };
    console.log('\n=== 実行結果 ===');
    console.log(JSON.stringify({ organizationId, memberCount: members.length }, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ メンバーの取得に失敗しました:', error);
    console.error('エラー詳細:', error);
    throw error;
  }
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  (window as any).checkBpoMembersInDb = checkBpoMembersInDb;
}
