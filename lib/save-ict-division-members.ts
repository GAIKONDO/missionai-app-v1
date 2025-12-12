/**
 * 情報・通信部門のメンバー情報をデータベースに保存するスクリプト
 */

import { callTauriCommand } from './localFirebase';
import { addOrgMember, getOrgMembers, deleteOrgMember } from './orgApi';
import type { MemberInfo } from '@/components/OrgChart';

// 情報・通信部門のメンバー情報
const ictDivisionMembers: MemberInfo[] = [
  {
    name: '堀内 真人',
    nameRomaji: 'ホリウチ マサト',
    title: '部門長',
    department: '情報・通信部門',
    extension: '9313625',
    companyPhone: '08095532647',
    email: '0334973625',
    itochuEmail: 'horiuchi-m@itochu.co.jp',
    teams: 'Teams',
    employeeType: '執行役員 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門長',
    indicator: 'TOKKU',
    location: '東京都港区北青山2-5-1　〒１０７-8077 / 5-1,Kita-Aoyama 2-chome,Minatoku,Tokyo 107-8077,Japan',
    floorDoorNo: '17S',
    previousName: undefined,
  },
  {
    name: '太田 英利',
    nameRomaji: 'オオタ ヒデトシ',
    title: '部門長代行',
    department: '情報・通信部門',
    extension: '9317117',
    companyPhone: '08092065151',
    email: '0334977117',
    mobilePhone: '08092065151',
    itochuEmail: 'oota-hid@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門長代行',
    indicator: 'TOKIC',
    location: '東京都港区北青山2-5-1 / 5-1, Kita-Aoyama 2-chome, Minato-ku, Tokyo 107-8077 Japan',
    floorDoorNo: '17',
    previousName: undefined,
  },
  {
    name: '金児 真利',
    nameRomaji: 'カネコ マサトシ',
    title: '部門長補佐',
    department: '情報・通信部門',
    extension: '9317696',
    companyPhone: '08095532621',
    email: '0334977696',
    itochuEmail: 'kaneko-masat@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門長補佐',
    indicator: 'TOKOH',
    location: 'Tokyo / Tokyo',
    floorDoorNo: '17FS',
    previousName: undefined,
  },
];

/**
 * 情報・通信部門の組織IDを取得
 */
async function getIctDivisionId(): Promise<string> {
  try {
    // まず組織ツリーを取得して情報・通信部門を探す
    const tree = await callTauriCommand('get_org_tree', { rootId: null });
    
    if (!tree || tree.length === 0) {
      throw new Error('組織データが見つかりません。まず組織構造を作成してください。');
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
    
    let ictDivision: any = null;
    for (const root of tree) {
      ictDivision = findIctDivision(root);
      if (ictDivision) break;
    }
    
    if (!ictDivision) {
      throw new Error('情報・通信部門が見つかりません。まず組織構造を作成してください。');
    }
    
    const orgData = ictDivision.organization || ictDivision;
    console.log('情報・通信部門が見つかりました:', orgData.id);
    return orgData.id;
  } catch (error) {
    console.error('情報・通信部門の取得に失敗しました:', error);
    throw error;
  }
}

/**
 * メンバー情報を保存
 */
export async function saveIctDivisionMembers() {
  try {
    console.log('情報・通信部門のメンバー情報を保存します...');
    
    // 情報・通信部門の組織IDを取得
    const organizationId = await getIctDivisionId();
    
    // 既存のメンバーを取得
    try {
      const existingMembers = await getOrgMembers(organizationId);
      console.log(`既存のメンバー数: ${existingMembers.length}`);
      
      // 既存のメンバーを削除
      for (const member of existingMembers) {
        try {
          await deleteOrgMember(member.id);
          console.log(`既存メンバー ${member.name} を削除しました`);
        } catch (error: any) {
          console.warn(`既存メンバー ${member.name} の削除に失敗しました:`, error.message);
        }
      }
    } catch (error: any) {
      console.warn('既存メンバーの取得に失敗しました（初回実行の可能性があります）:', error.message);
    }
    
    // 各メンバーを保存
    for (const member of ictDivisionMembers) {
      try {
        await addOrgMember(organizationId, member);
        console.log(`✅ ${member.name} を保存しました`);
      } catch (error: any) {
        console.error(`❌ ${member.name} の保存に失敗しました:`, error.message);
      }
    }
    
    console.log('✅ 全てのメンバー情報の保存が完了しました');
  } catch (error: any) {
    console.error('❌ メンバー情報の保存に失敗しました:', error);
    throw error;
  }
}

// スクリプトとして実行する場合
if (typeof window === 'undefined') {
  // Node.js環境での実行
  saveIctDivisionMembers().catch(console.error);
}
