/**
 * メンバーのソート関数
 * 役職者が先に来るようにソート
 */

import type { MemberInfo } from '@/components/OrgChart';

/**
 * 役職の優先順位を取得
 * @param title 役職名
 * @param organizationName 組織名（情報・通信部門の場合は部門長を最上位にする）
 */
function getPositionPriority(title: string | undefined, organizationName?: string): number {
  if (!title) return 999; // 役職なしは最後
  
  const titleLower = title.toLowerCase();
  const orgName = organizationName || '';
  
  // 情報・通信部門の場合は部門長関連を特別に処理
  // 注意: より具体的な条件を先にチェックする必要がある
  if (orgName.includes('情報・通信部門') || orgName.includes('情報通信部門')) {
    // 部門長代行を最初にチェック（部門長を含むため）
    if (titleLower.includes('部門長代行')) {
      return 1; // 部門長代行が次
    }
    // 部門長補佐を次にチェック（部門長を含むため）
    if (titleLower.includes('部門長補佐')) {
      return 2; // 部門長補佐がその次
    }
    // 最後に部門長をチェック（単独の部門長のみ）
    if (titleLower.includes('部門長') && !titleLower.includes('代行') && !titleLower.includes('補佐')) {
      return 0; // 部門長が最上位
    }
  }
  
  // 役職の階層を定義（数字が小さいほど上位）
  // 部長関連
  if (titleLower.includes('部長') && !titleLower.includes('代行') && !titleLower.includes('補佐')) {
    return 10; // 部長
  }
  if (titleLower.includes('部長代行')) {
    return 11; // 部長代行（部長より下）
  }
  if (titleLower.includes('部長補佐')) {
    return 12; // 部長補佐（部長より下）
  }
  
  // 課長関連
  if (titleLower.includes('課長') && !titleLower.includes('代行') && !titleLower.includes('補佐')) {
    return 20; // 課長
  }
  if (titleLower.includes('課長代行')) {
    return 21; // 課長代行（課長より下）
  }
  if (titleLower.includes('課長補佐')) {
    return 22; // 課長補佐（課長より下）
  }
  
  // その他の「長」関連（部長、課長以外）
  if (titleLower.includes('長') && !titleLower.includes('部長') && !titleLower.includes('課長')) {
    // 代行や補佐をチェック
    if (titleLower.includes('代行')) {
      return 31; // 〇〇長代行
    }
    if (titleLower.includes('補佐')) {
      return 32; // 〇〇長補佐
    }
    return 30; // その他の長
  }
  
  // 代行や補佐が単独で含まれている場合（長が含まれていない）
  if (titleLower.includes('代行') && !titleLower.includes('長')) {
    return 40;
  }
  if (titleLower.includes('補佐') && !titleLower.includes('長')) {
    return 41;
  }
  
  // その他の役職（主任、リーダーなど）
  if (titleLower.includes('主任') || titleLower.includes('リーダー')) {
    return 50;
  }
  
  // 役職あり（その他）
  return 60;
}

/**
 * メンバーを役職順にソート
 * @param members メンバー配列
 * @param organizationName 組織名（情報・通信部門の場合は部門長を最上位にする）
 */
export function sortMembersByPosition(members: MemberInfo[], organizationName?: string): MemberInfo[] {
  const sorted = [...members].sort((a, b) => {
    const priorityA = getPositionPriority(a.title, organizationName);
    const priorityB = getPositionPriority(b.title, organizationName);
    
    // まず役職の優先順位でソート
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // 同じ優先順位の場合は名前でソート
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB, 'ja');
  });
  
  // デバッグログ（情報・通信部門の場合のみ）
  if (organizationName && (organizationName.includes('情報・通信部門') || organizationName.includes('情報通信部門'))) {
    console.log('🔍 [sortMembersByPosition] 情報・通信部門のメンバーソート:', {
      organizationName,
      members: sorted.map(m => ({ name: m.name, title: m.title, priority: getPositionPriority(m.title, organizationName) }))
    });
  }
  
  return sorted;
}
