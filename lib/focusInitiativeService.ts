/**
 * 注力施策サービス
 * businessService.jsの構造を参考に、注力施策のデータ管理機能を提供
 */

import { 
  getFocusInitiatives,
  getFocusInitiativeById,
  saveFocusInitiative,
  deleteFocusInitiative,
  type FocusInitiative
} from './orgApi';

/**
 * 注力施策の統計情報を計算
 */
export const calculateInitiativeStats = (initiatives: FocusInitiative[]) => {
  return {
    total: initiatives.length,
    withAssignee: initiatives.filter(i => i.assignee).length,
    withMethod: initiatives.filter(i => i.method && i.method.length > 0).length,
    withPeriod: initiatives.filter(i => 
      i.considerationPeriod || i.executionPeriod || i.monetizationPeriod
    ).length,
  };
};

/**
 * 注力施策を取得（組織ID指定）
 */
export const getInitiativesByOrganization = async (organizationId: string): Promise<FocusInitiative[]> => {
  try {
    return await getFocusInitiatives(organizationId);
  } catch (error) {
    console.error('Error getting initiatives by organization:', error);
    return [];
  }
};

/**
 * 注力施策を取得（ID指定）
 */
export const getInitiativeById = async (initiativeId: string): Promise<FocusInitiative | null> => {
  try {
    return await getFocusInitiativeById(initiativeId);
  } catch (error) {
    console.error('Error getting initiative by id:', error);
    return null;
  }
};

/**
 * 注力施策を保存
 */
export const saveInitiative = async (initiative: Partial<FocusInitiative>): Promise<string> => {
  try {
    return await saveFocusInitiative(initiative);
  } catch (error) {
    console.error('Error saving initiative:', error);
    throw error;
  }
};

/**
 * 注力施策を削除
 */
export const removeInitiative = async (initiativeId: string): Promise<void> => {
  try {
    await deleteFocusInitiative(initiativeId);
  } catch (error) {
    console.error('Error deleting initiative:', error);
    throw error;
  }
};

/**
 * 注力施策を更新（部分更新対応）
 */
export const updateInitiative = async (
  initiativeId: string,
  updates: Partial<FocusInitiative>
): Promise<string> => {
  try {
    // 既存データを取得
    const existing = await getFocusInitiativeById(initiativeId);
    if (!existing) {
      throw new Error('注力施策が見つかりません');
    }

    // 既存データと更新データをマージ
    const updated: Partial<FocusInitiative> = {
      ...existing,
      ...updates,
      id: initiativeId, // IDは変更不可
      organizationId: existing.organizationId, // organizationIdも変更不可
    };

    return await saveFocusInitiative(updated);
  } catch (error) {
    console.error('Error updating initiative:', error);
    throw error;
  }
};

/**
 * 注力施策の期間情報を取得（ガントチャート用）
 */
export const getInitiativePeriods = (initiative: FocusInitiative) => {
  return {
    consideration: parsePeriod(initiative.considerationPeriod),
    execution: parsePeriod(initiative.executionPeriod),
    monetization: parsePeriod(initiative.monetizationPeriod),
  };
};

/**
 * 期間文字列をパース（例: "2024-01/2024-12"）
 */
function parsePeriod(periodString?: string): { start?: Date; end?: Date } | null {
  if (!periodString) return null;
  
  const parts = periodString.split('/');
  if (parts.length !== 2) return null;
  
  try {
    const start = parseDate(parts[0]);
    const end = parseDate(parts[1]);
    return { start, end };
  } catch {
    return null;
  }
}

/**
 * 日付文字列をパース（例: "2024-01"）
 */
function parseDate(dateString: string): Date | undefined {
  const parts = dateString.split('-');
  if (parts.length !== 2) return undefined;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 月は0ベース
  
  if (isNaN(year) || isNaN(month)) return undefined;
  
  return new Date(year, month, 1);
}
