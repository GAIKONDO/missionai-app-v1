/**
 * 企画統括課のメンバー情報をデータベースに保存するスクリプト
 * 
 * 使用方法:
 * 1. このファイルを実行する前に、組織構造がデータベースに存在することを確認してください
 * 2. 企画統括課の組織IDを取得する必要があります
 */

import { callTauriCommand } from './localFirebase';
import { addOrgMember, getOrgMembers, deleteOrgMember } from './orgApi';
import { createOrgStructureFromSample } from './create-org-structure';
import type { MemberInfo } from '@/components/OrgChart';

// 企画統括課のメンバー情報（提供されたデータに基づく）
const planningMembers: MemberInfo[] = [
  {
    name: '三谷 恭介',
    nameRomaji: 'ミタニ キヨウスケ',
    title: '課長',
    department: '企画統轄課',
    extension: '7866',
    companyPhone: '08095532643',
    email: '0334977866',
    itochuEmail: 'mitani-k@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門企画統轄課長',
    indicator: 'TOKKU',
    location: '東京 / Tokyo',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '堀内 勇輝',
    nameRomaji: 'ホリウチ ユウキ',
    title: '課長代行',
    department: '企画統轄課',
    extension: '3687',
    companyPhone: '09080285314',
    email: '0334973687',
    itochuEmail: 'horiuchi-yu@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門企画統轄課長代行',
    indicator: 'TOKKU',
    location: '東京 / Tokyo',
    floorDoorNo: '17F',
    previousName: '堀内勇輝 / ホリウチユウキ / HORIUCHI YUKI',
  },
  {
    name: '石岡 稜司',
    nameRomaji: 'イシオカ リヨウジ',
    department: '企画統轄課',
    extension: '3555',
    companyPhone: '09080285311',
    email: '0334973555',
    itochuEmail: 'ishioka-r@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門企画統轄課',
    indicator: 'TOKKU',
    location: '東京都港区北青山2-5-1 / 5-1, Kita-Aoyama 2-chome, Minato-ku, Tokyo',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '上信 陽太郎',
    nameRomaji: 'ウエノブ ヨウタロウ',
    department: '企画統轄課',
    companyPhone: '09080285310',
    itochuEmail: 'uenobu-y@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門企画統轄課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '窪田 隆平',
    nameRomaji: 'クボタ リュウヘイ',
    department: '企画統轄課',
    companyPhone: '09080285315',
    itochuEmail: 'kubota-ry@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門企画統轄課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '髙原 諒',
    nameRomaji: 'タカハラ リヨウ',
    department: '企画統轄課',
    extension: '2436',
    companyPhone: '09080285309',
    email: '0334972436',
    mobilePhone: '08032506041',
    itochuEmail: 'takahara-r@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門企画統轄課',
    indicator: 'TOKKF',
    location: '伊藤忠商事　東京本社 / Itochu Corporation',
    floorDoorNo: '17FS7',
    previousName: undefined,
  },
  {
    name: '沼尻 真司',
    nameRomaji: 'ヌマジリ シンジ',
    department: '企画統轄課',
    companyPhone: '08095532638',
    itochuEmail: 'numajiri-s@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '(兼)情報・通信部門企画統轄課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '松本 英司',
    nameRomaji: 'マツモト エイジ',
    department: '企画統轄課',
    companyPhone: '08095532636',
    itochuEmail: 'matsumoto.eiji@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '(兼)情報・通信部門企画統轄課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '山内 雅道',
    nameRomaji: 'ヤマウチ マサミチ',
    department: '企画統轄課',
    companyPhone: '08092065154',
    itochuEmail: 'yamauchi-masam@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '(兼)情報・通信部門企画統轄課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '蜂須賀 栞',
    nameRomaji: 'ハチスカ シオリ',
    department: '企画統轄課',
    extension: '9314296',
    companyPhone: '08095532641',
    email: '0334974296',
    itochuEmail: 'hachisuka-s@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門企画統轄課',
    indicator: 'TOKKU',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '前田 葉子',
    nameRomaji: 'マエダ ヨウコ',
    department: '企画統轄課',
    extension: '7330',
    email: '0334977330',
    itochuEmail: 'maeda-yok@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門企画統轄課(育児休業)',
    indicator: 'TOKKU',
    location: '東京本社 / tokyo',
    floorDoorNo: '17S5',
    previousName: undefined,
  },
  {
    name: '前平 恵子',
    nameRomaji: 'マエヒラ ケイコ',
    department: '企画統轄課',
    extension: '9312453',
    companyPhone: '08095532635',
    email: '0334972453',
    itochuEmail: 'maehira-k@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門企画統轄課',
    indicator: 'TOKKU',
    location: '東京 / TOKYO',
    floorDoorNo: '17S5',
    previousName: undefined,
  },
  {
    name: '豊原 法幸',
    nameRomaji: 'トヨハラ ノリユキ',
    department: '企画統轄課',
    companyPhone: '08095532639',
    itochuEmail: undefined,
    teams: 'Teams',
    employeeType: '嘱託(継続雇用) /社員 / ITOCHU Employee',
    roleName: '(兼)情報・通信部門企画統轄課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
];

/**
 * 組織を再帰的に検索
 */
function findOrgByName(org: any, name: string): any {
  // データ構造を確認（organizationプロパティがある場合とない場合の両方に対応）
  const orgData = org.organization || org;
  if (!orgData || !orgData.name) {
    return null;
  }
  
  if (orgData.name === name || orgData.name.includes(name) || name.includes(orgData.name)) {
    return org;
  }
  if (org.children) {
    for (const child of org.children) {
      const found = findOrgByName(child, name);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 企画統括課の組織IDを取得（存在しない場合は作成）
 */
async function getOrCreatePlanningSection(): Promise<string> {
  try {
    // まず組織ツリーを取得して企画統括課を探す
    const tree = await callTauriCommand('get_org_tree', { rootId: null });
    
    if (!tree || tree.length === 0) {
      throw new Error('組織データが見つかりません。まず組織構造を作成してください。');
    }
    
    // 企画統括課を探す（再帰的に検索）
    let planningSection: any = null;
    for (const root of tree) {
      planningSection = findOrgByName(root, '企画統轄課') || findOrgByName(root, '企画統括課');
      if (planningSection) break;
    }
    
    if (planningSection) {
      const orgData = planningSection.organization || planningSection;
      console.log('企画統括課が見つかりました:', orgData.id);
      return orgData.id;
    }
    
    // 見つからない場合は作成
    console.log('企画統括課が見つかりませんでした。作成します...');
    
    // 適切な親組織を探す（情報・通信部門、ICT Division、または最初のルート組織）
    let parentOrg: any = null;
    const possibleNames = ['情報・通信部門', 'ICT Division', '情報通信部門', '情報通信'];
    
    for (const root of tree) {
      for (const name of possibleNames) {
        parentOrg = findOrgByName(root, name);
        if (parentOrg) break;
      }
      if (parentOrg) break;
      
      // 名前で見つからない場合は、最初のルート組織を使用
      if (!parentOrg && root.organization.level === 0) {
        parentOrg = root;
      }
    }
    
    if (!parentOrg) {
      // それでも見つからない場合は、最初のルート組織を使用
      parentOrg = tree[0];
      const parentOrgData = parentOrg.organization || parentOrg;
      console.log(`⚠️ 親組織が見つからないため、ルート組織を使用: ${parentOrgData.name}`);
    } else {
      const parentOrgData = parentOrg.organization || parentOrg;
      console.log(`✅ 親組織を見つけました: ${parentOrgData.name}`);
    }
    
    // 企画統括課を作成
    const parentOrgData = parentOrg.organization || parentOrg;
    const result = await callTauriCommand('create_org', {
      parentId: parentOrgData.id,
      name: '企画統轄課',
      title: 'Planning & Administration Section',
      description: '課長：三谷 恭介',
      level: (parentOrgData.level || 0) + 1,
      levelName: '課',
      position: 1,
    });
    
    console.log('企画統括課を作成しました:', result.id);
    return result.id;
  } catch (error) {
    console.error('企画統括課の取得/作成に失敗しました:', error);
    throw error;
  }
}

/**
 * メンバー情報を保存
 */
export async function savePlanningMembers() {
  try {
    console.log('企画統括課のメンバー情報を保存します...');
    
    // まず組織構造が存在するか確認
    const tree = await callTauriCommand('get_org_tree', { rootId: null });
    if (!tree || tree.length === 0) {
      console.log('組織構造が見つかりません。サンプルデータから作成します...');
      await createOrgStructureFromSample();
    }
    
    // 企画統括課の組織IDを取得
    const organizationId = await getOrCreatePlanningSection();
    
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
    for (const member of planningMembers) {
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
  savePlanningMembers().catch(console.error);
}
