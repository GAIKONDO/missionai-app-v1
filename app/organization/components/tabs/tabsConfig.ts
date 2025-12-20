/**
 * 組織編集モーダルのタブ設定
 * 将来、組織タイプに応じて表示するタブを動的に制御するために使用
 */

export type TabId = 'organization' | 'members';

export interface TabConfig {
  id: TabId;
  label: string;
  required: boolean; // 常に表示する必要があるか
  orgTypes?: string[]; // 特定の組織タイプでのみ表示する場合
}

export const tabsConfig: TabConfig[] = [
  {
    id: 'organization',
    label: '組織情報',
    required: true,
  },
  {
    id: 'members',
    label: 'メンバー',
    required: true,
  },
];

/**
 * 組織タイプに応じて表示するタブをフィルタリング
 * @param orgType 組織タイプ（将来の拡張用）
 * @returns 表示するタブの設定
 */
export function getAvailableTabs(orgType?: string): TabConfig[] {
  return tabsConfig.filter(tab => {
    // 必須タブは常に表示
    if (tab.required) {
      return true;
    }
    // 組織タイプが指定されている場合、そのタイプに対応するタブのみ表示
    if (orgType && tab.orgTypes) {
      return tab.orgTypes.includes(orgType);
    }
    // デフォルトでは必須でないタブは非表示
    return false;
  });
}
