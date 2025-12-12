/**
 * 営業サポートチームのメンバー情報をデータベースに保存するスクリプト
 */

import { callTauriCommand } from './localFirebase';
import { addOrgMember, getOrgMembers, deleteOrgMember } from './orgApi';
import type { MemberInfo } from '@/components/OrgChart';

// 営業サポートチームのメンバー情報
const businessSupportMembers: MemberInfo[] = [
  {
    name: '長澤 英郎',
    nameRomaji: 'ナガサワ ヒデオ',
    title: 'チーム長',
    department: '営業サポートチーム',
    extension: '9313220',
    companyPhone: '08092065328',
    email: '0334973220',
    itochuEmail: 'nagasawa-h@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門営業サポートチーム長',
    indicator: 'TOKIW',
    location: '東京 / Tokyo',
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '森川 哲',
    nameRomaji: 'モリカワ サトシ',
    title: 'チーム長代行',
    department: '営業サポートチーム',
    extension: '9312856',
    email: '0334972856',
    mobilePhone: '08058961387',
    itochuEmail: 's.morikawa@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門営業サポートチーム長代行',
    indicator: 'TOKIW',
    location: '17階南側 / 17F South',
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '菅井 桃子',
    nameRomaji: 'スガイ モモコ',
    department: '営業サポートチーム',
    extension: '931',
    email: '09088179825',
    itochuEmail: 'tokuda-m@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '(兼)情報・通信部門営業サポートチーム',
    indicator: 'TOKIW',
    location: '東京 / Tokyo',
    floorDoorNo: '17S7',
    previousName: '德田・徳田 / トクダ / TOKUDA',
  },
  {
    name: '早川 誠人',
    nameRomaji: 'ハヤカワ マサト',
    department: '営業サポートチーム',
    extension: '92417',
    companyPhone: '08092065156',
    email: '0334972417',
    itochuEmail: 'hayakawa@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '(兼)情報・通信部門営業サポートチーム',
    indicator: 'TOKKU',
    location: '東京都港区北青山2-5-1 / 2-5-1, Kita-Aoyama, Minato-ku, Tokyo',
    floorDoorNo: '８F',
    previousName: undefined,
  },
  {
    name: '池田 美香',
    nameRomaji: 'イケダ ミカ',
    department: '営業サポートチーム',
    extension: '9313168',
    companyPhone: '08095532632',
    email: '0334973168',
    itochuEmail: 'ikeda-mik@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門営業サポートチーム',
    indicator: 'TOKIW',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '小川 優華',
    nameRomaji: 'オガワ ユカ',
    department: '営業サポートチーム',
    extension: '9312356',
    companyPhone: '08095532625',
    email: '0334972356',
    itochuEmail: 'ogawa-y@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門営業サポートチーム',
    indicator: 'TOKIW',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '片柳 優貴子',
    nameRomaji: 'カタヤナギ ユキコ',
    department: '営業サポートチーム',
    extension: '9314845',
    companyPhone: '09080285120',
    email: '0334974845',
    itochuEmail: 'katayanagi-y@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門営業サポートチーム',
    indicator: 'TOKIW',
    location: '東京 / TOKYO',
    floorDoorNo: '17FS',
    previousName: undefined,
  },
  {
    name: '満田 千裕',
    nameRomaji: 'ミツダ チヒロ',
    department: '営業サポートチーム',
    extension: '9313176',
    companyPhone: '08092065329',
    email: '0334973176',
    itochuEmail: 'mitsuda-c@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '情報・通信部門営業サポートチーム',
    indicator: 'TOKIW',
    location: '東京 / -',
    floorDoorNo: '17F S7',
    previousName: '渡辺 / ワタナベ /',
  },
  {
    name: '上間 卓巳',
    nameRomaji: 'ウエマ タクミ',
    department: '営業サポートチーム',
    extension: '9312614',
    companyPhone: '09080285115',
    email: '0334972614',
    mobilePhone: '09014349971',
    itochuEmail: 'uema-t@itochu.co.jp',
    teams: 'Teams',
    employeeType: '嘱託(継続雇用) /社員 / ITOCHU Employee',
    roleName: '情報・通信部門営業サポートチーム',
    indicator: 'TOKIW',
    location: '東京本社 / HQ, Tokyo',
    floorDoorNo: '19S7',
    previousName: undefined,
  },
  {
    name: '青木 美和',
    nameRomaji: 'アオキ ミワ',
    department: '営業サポートチーム',
    extension: '9314299',
    companyPhone: '09080285117',
    email: '0334974299',
    itochuEmail: 'aoki-miwa1@itochu.co.jp',
    teams: 'Teams',
    employeeType: '社員外 /派遣社員 / Temp Staff',
    roleName: '営業サポートチーム',
    indicator: 'TOKIW',
    location: '東京 / -',
    floorDoorNo: '17　S7',
    previousName: undefined,
  },
  {
    name: '工藤 美樹',
    nameRomaji: 'クドウ ミキ',
    department: '営業サポートチーム',
    extension: '3274',
    companyPhone: '08095532634',
    email: '0334973274',
    itochuEmail: 'kudo-miki1@itochu.co.jp',
    teams: 'Teams',
    employeeType: '社員外 /派遣社員 / Temp Staff',
    roleName: '情報・通信部門　営業サポートチーム',
    indicator: 'TOKIW',
    location: '外苑前 / Gaienmae',
    floorDoorNo: '8F',
    previousName: undefined,
  },
  {
    name: '齋藤 裕紀',
    nameRomaji: 'サイトウ ユキ',
    department: '営業サポートチーム',
    extension: '2077',
    companyPhone: '08095532629',
    email: '0',
    itochuEmail: 'saitou-yuki@itochu.co.jp',
    teams: 'Teams',
    employeeType: '社員外 /派遣社員 / Temp Staff',
    roleName: '営業サポートチーム',
    indicator: '0',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '林 眞希',
    nameRomaji: 'ハヤシ マキ',
    department: '営業サポートチーム',
    extension: '9311342',
    email: '0334971342',
    itochuEmail: 'hayashi-maki@itochu.co.jp',
    teams: 'Teams',
    employeeType: '社員外 /派遣社員 / Temp Staff',
    roleName: '営業サポートチーム',
    indicator: 'TOKIX',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
];

/**
 * 営業サポートチームの組織IDを取得（存在しない場合は作成）
 */
async function getOrCreateBusinessSupportTeam(): Promise<string> {
  try {
    // まず組織ツリーを取得して営業サポートチームを探す
    const tree = await callTauriCommand('get_org_tree', { rootId: null });
    
    if (!tree || tree.length === 0) {
      throw new Error('組織データが見つかりません。まず組織構造を作成してください。');
    }
    
    // 営業サポートチームを探す（再帰的に検索）
    function findBusinessSupportTeam(org: any): any {
      const orgData = org.organization || org;
      if (!orgData || !orgData.name) {
        return null;
      }
      if (orgData.name === '営業サポートチーム' || orgData.name.includes('営業サポート')) {
        return org;
      }
      if (org.children) {
        for (const child of org.children) {
          const found = findBusinessSupportTeam(child);
          if (found) return found;
        }
      }
      return null;
    }
    
    let businessSupportTeam: any = null;
    for (const root of tree) {
      businessSupportTeam = findBusinessSupportTeam(root);
      if (businessSupportTeam) break;
    }
    
    if (businessSupportTeam) {
      const orgData = businessSupportTeam.organization || businessSupportTeam;
      console.log('営業サポートチームが見つかりました:', orgData.id);
      return orgData.id;
    }
    
    // 見つからない場合は作成
    console.log('営業サポートチームが見つかりませんでした。作成します...');
    
    // 適切な親組織を探す（情報・通信部門、ICT Division、または最初のルート組織）
    let parentOrg: any = null;
    const possibleNames = ['情報・通信部門', 'ICT Division', '情報通信部門', '情報通信'];
    
    for (const root of tree) {
      function findOrgByName(org: any, name: string): any {
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
      
      for (const name of possibleNames) {
        parentOrg = findOrgByName(root, name);
        if (parentOrg) break;
      }
      if (parentOrg) break;
      
      // 名前で見つからない場合は、最初のルート組織を使用
      if (!parentOrg && root.organization?.level === 0) {
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
    
    // 営業サポートチームを作成
    const parentOrgData = parentOrg.organization || parentOrg;
    const result = await callTauriCommand('create_org', {
      parentId: parentOrgData.id,
      name: '営業サポートチーム',
      title: 'Business Process Operation Team',
      description: 'チーム長：長澤 英郎',
      level: (parentOrgData.level || 0) + 1,
      levelName: 'チーム',
      position: 2,
    });
    
    console.log('営業サポートチームを作成しました:', result.id);
    return result.id;
  } catch (error) {
    console.error('営業サポートチームの取得/作成に失敗しました:', error);
    throw error;
  }
}

/**
 * メンバー情報を保存
 */
export async function saveBusinessSupportMembers() {
  try {
    console.log('営業サポートチームのメンバー情報を保存します...');
    
    // 営業サポートチームの組織IDを取得
    const organizationId = await getOrCreateBusinessSupportTeam();
    
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
    for (const member of businessSupportMembers) {
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
  saveBusinessSupportMembers().catch(console.error);
}
