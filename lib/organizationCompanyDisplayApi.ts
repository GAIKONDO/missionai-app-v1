/**
 * 組織と事業会社の表示関係管理API
 * 注意: organizationCompanyDisplayテーブルは削除されました。
 * このAPIは互換性のために残されていますが、常にエラーを返します。
 */

import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

export interface OrganizationCompanyDisplay {
  id: string;
  organizationId: string;
  companyId: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * すべての組織と事業会社の表示関係を取得
 * 注意: この機能は削除されました。空の配列を返します。
 */
export async function getAllOrganizationCompanyDisplays(): Promise<OrganizationCompanyDisplay[]> {
  try {
    const result = await apiGet<OrganizationCompanyDisplay[] | { error: string }>(
      '/api/organization-company-displays'
    );
    
    // エラーが返された場合は空の配列を返す
    if (result && typeof result === 'object' && 'error' in result) {
      console.warn('organizationCompanyDisplay APIは削除されました:', result.error);
      return [];
    }
    
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.warn('organizationCompanyDisplay APIの取得に失敗しました（機能は削除されています）:', error);
    return [];
  }
}

/**
 * 組織と事業会社の表示関係を作成
 * 注意: この機能は削除されました。エラーをスローします。
 */
export async function createOrganizationCompanyDisplay(
  organizationId: string,
  companyId: string
): Promise<OrganizationCompanyDisplay> {
  try {
    const result = await apiPost<OrganizationCompanyDisplay | { error: string }>(
      '/api/organization-company-displays',
      { organizationId, companyId }
    );
    
    if (result && typeof result === 'object' && 'error' in result) {
      throw new Error(result.error);
    }
    
    return result as OrganizationCompanyDisplay;
  } catch (error: any) {
    throw new Error(
      error?.message || 'organizationCompanyDisplayテーブルは削除されました。この機能は使用できません。'
    );
  }
}

/**
 * 組織と事業会社の表示関係を削除
 * 注意: この機能は削除されました。エラーをスローします。
 */
export async function deleteOrganizationCompanyDisplay(id: string): Promise<void> {
  try {
    const result = await apiDelete<{ success?: boolean; error?: string }>(
      `/api/organization-company-displays/${id}`
    );
    
    if (result && typeof result === 'object' && 'error' in result) {
      throw new Error(result.error);
    }
  } catch (error: any) {
    throw new Error(
      error?.message || 'organizationCompanyDisplayテーブルは削除されました。この機能は使用できません。'
    );
  }
}

/**
 * 組織と事業会社の表示関係の表示順序を更新
 * 注意: この機能は削除されました。エラーをスローします。
 */
export async function updateOrganizationCompanyDisplayOrder(
  id: string,
  displayOrder: number
): Promise<void> {
  try {
    const result = await apiPut<{ success?: boolean; error?: string }>(
      `/api/organization-company-displays/${id}/order`,
      { displayOrder }
    );
    
    if (result && typeof result === 'object' && 'error' in result) {
      throw new Error(result.error);
    }
  } catch (error: any) {
    throw new Error(
      error?.message || 'organizationCompanyDisplayテーブルは削除されました。この機能は使用できません。'
    );
  }
}

