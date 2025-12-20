import type { OrgNodeData, MemberInfo } from '@/components/OrgChart';

// メンバー情報をMemberInfo形式に変換する共通関数
export const mapMembersToMemberInfo = (members: any[]): (MemberInfo & { id?: string })[] => {
  return members.map((member: any): MemberInfo & { id?: string } => ({
    id: member.id,
    name: member.name,
    title: member.position || undefined,
    nameRomaji: member.nameRomaji || undefined,
    department: member.department || undefined,
    extension: member.extension || undefined,
    companyPhone: member.companyPhone || undefined,
    mobilePhone: member.mobilePhone || undefined,
    email: member.email || undefined,
    itochuEmail: member.itochuEmail || undefined,
    teams: member.teams || undefined,
    employeeType: member.employeeType || undefined,
    roleName: member.roleName || undefined,
    indicator: member.indicator || undefined,
    location: member.location || undefined,
    floorDoorNo: member.floorDoorNo || undefined,
    previousName: member.previousName || undefined,
  }));
};

// 組織ツリーから特定の組織を検索する共通関数
export const findOrgInTree = (tree: OrgNodeData, targetId: string): OrgNodeData | null => {
  if (tree.id === targetId) return tree;
  if (tree.children) {
    for (const child of tree.children) {
      const found = findOrgInTree(child, targetId);
      if (found) return found;
    }
  }
  return null;
};

// レーベンシュタイン距離を計算する関数
export const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // 削除
          matrix[i][j - 1] + 1,     // 挿入
          matrix[i - 1][j - 1] + 1  // 置換
        );
      }
    }
  }

  return matrix[len1][len2];
};

// 類似度を計算する関数（0-1の範囲、1が完全一致）
export const calculateSimilarity = (str1: string, str2: string): number => {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - (distance / maxLen);
};
