import { callTauriCommand } from './localFirebase';
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

/**
 * 組織と事業会社の表示関係の型定義
 */
export interface OrganizationCompanyDisplay {
  id: string;
  organizationId: string;
  companyId: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 組織と事業会社の表示関係を作成
 */
export async function createOrganizationCompanyDisplay(
  organizationId: string,
  companyId: string,
  displayOrder?: number
): Promise<OrganizationCompanyDisplay> {
  try {
    const result = await apiPost<OrganizationCompanyDisplay>('/api/organization-company-displays', {
      organizationId,
      companyId,
      displayOrder: displayOrder ?? 0,
    });
    return result;
  } catch (error: any) {
    // フォールバック: Tauriコマンド経由
    const result = await callTauriCommand('create_org_company_display', {
      organizationId,
      companyId,
      displayOrder: displayOrder ?? 0,
    });
    return result as OrganizationCompanyDisplay;
  }
}

/**
 * 組織IDで表示される事業会社のリストを取得
 */
export async function getCompaniesByOrganizationDisplay(
  organizationId: string
): Promise<OrganizationCompanyDisplay[]> {
  try {
    const result = await apiGet<OrganizationCompanyDisplay[]>(
      `/api/organization-company-displays/organization/${organizationId}`
    );
    return result || [];
  } catch (error: any) {
    // フォールバック: Tauriコマンド経由
    const result = await callTauriCommand('get_companies_by_org_display', {
      organizationId,
    });
    return (result as OrganizationCompanyDisplay[]) || [];
  }
}

/**
 * 事業会社IDで表示される組織のリストを取得
 */
export async function getOrganizationsByCompanyDisplay(
  companyId: string
): Promise<OrganizationCompanyDisplay[]> {
  try {
    const result = await apiGet<OrganizationCompanyDisplay[]>(
      `/api/organization-company-displays/company/${companyId}`
    );
    return result || [];
  } catch (error: any) {
    // フォールバック: Tauriコマンド経由
    const result = await callTauriCommand('get_organizations_by_company_display_cmd', {
      companyId,
    });
    return (result as OrganizationCompanyDisplay[]) || [];
  }
}

/**
 * すべての表示関係を取得
 */
export async function getAllOrganizationCompanyDisplays(): Promise<OrganizationCompanyDisplay[]> {
  try {
    const result = await apiGet<OrganizationCompanyDisplay[]>('/api/organization-company-displays');
    return result || [];
  } catch (error: any) {
    // フォールバック: Tauriコマンド経由
    const result = await callTauriCommand('get_all_org_company_displays', {});
    return (result as OrganizationCompanyDisplay[]) || [];
  }
}

/**
 * 表示順序を更新
 */
export async function updateOrganizationCompanyDisplayOrder(
  id: string,
  displayOrder: number
): Promise<void> {
  try {
    await apiPut(`/api/organization-company-displays/${id}/order`, {
      displayOrder,
    });
  } catch (error: any) {
    // フォールバック: Tauriコマンド経由
    await callTauriCommand('update_org_company_display_order', {
      id,
      displayOrder,
    });
  }
}

/**
 * 組織と事業会社の表示関係を削除
 */
export async function deleteOrganizationCompanyDisplay(id: string): Promise<void> {
  try {
    await apiDelete(`/api/organization-company-displays/${id}`);
  } catch (error: any) {
    // フォールバック: Tauriコマンド経由
    await callTauriCommand('delete_org_company_display', { id });
  }
}

/**
 * 組織IDと事業会社IDで表示関係を削除
 */
export async function deleteOrganizationCompanyDisplayByIds(
  organizationId: string,
  companyId: string
): Promise<void> {
  try {
    await apiDelete(
      `/api/organization-company-displays/organization/${organizationId}/company/${companyId}`
    );
  } catch (error: any) {
    // フォールバック: Tauriコマンド経由
    await callTauriCommand('delete_org_company_display_by_ids', {
      organizationId,
      companyId,
    });
  }
}
