/**
 * 企画統括課のメンバー情報がデータベースに登録されているか確認するスクリプト
 */

import { callTauriCommand } from './localFirebase';
import { getOrgMembers } from './orgApi';

/**
 * 企画統括課の組織IDを取得
 */
async function getPlanningSectionId(): Promise<string | null> {
  try {
    const tree = await callTauriCommand('get_org_tree', { rootId: null });
    
    if (tree && tree.length > 0) {
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
      if (planningSection) {
        const orgData = planningSection.organization || planningSection;
        return orgData.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('企画統括課の取得に失敗しました:', error);
    return null;
  }
}

/**
 * データベースに登録されているメンバー情報を確認
 */
export async function checkPlanningMembers(): Promise<{ count: number; members: any[]; organizationId: string | null } | null> {
  try {
    console.log('=== 企画統括課のメンバー情報確認 ===\n');
    
    // 企画統括課の組織IDを取得
    const organizationId = await getPlanningSectionId();
    
    if (!organizationId) {
      console.log('❌ 企画統括課が見つかりませんでした');
      return { count: 0, members: [], organizationId: null };
    }
    
    console.log(`✅ 企画統括課の組織ID: ${organizationId}\n`);
    
    // メンバー情報を取得
    const members = await getOrgMembers(organizationId);
    
    console.log(`📊 登録されているメンバー数: ${members.length}名\n`);
    
    if (members.length === 0) {
      console.log('⚠️ メンバーが登録されていません');
      return { count: 0, members: [], organizationId };
    }
    
    // メンバー情報を表示
    console.log('=== 登録されているメンバー一覧 ===\n');
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
      if (member.email) {
        console.log(`   電話: ${member.email}`);
      }
      if (member.mobilePhone) {
        console.log(`   携帯: ${member.mobilePhone}`);
      }
      if (member.itochuEmail) {
        console.log(`   伊藤忠メール: ${member.itochuEmail}`);
      }
      if (member.employeeType) {
        console.log(`   社員区分: ${member.employeeType}`);
      }
      if (member.roleName) {
        console.log(`   役割名: ${member.roleName}`);
      }
      if (member.indicator) {
        console.log(`   インディケータ: ${member.indicator}`);
      }
      if (member.location) {
        console.log(`   勤務地: ${member.location}`);
      }
      if (member.floorDoorNo) {
        console.log(`   フロア: ${member.floorDoorNo}`);
      }
      if (member.previousName) {
        console.log(`   旧姓: ${member.previousName}`);
      }
      console.log('');
    });
    
    console.log('=== 確認完了 ===');
    return { count: members.length, members, organizationId };
  } catch (error: any) {
    console.error('❌ 確認中にエラーが発生しました:', error);
    console.error('エラー詳細:', error);
    return null;
  }
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  // グローバルに公開
  (window as any).checkPlanningMembers = checkPlanningMembers;
}
