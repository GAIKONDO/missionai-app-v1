import { callTauriCommand } from './localFirebase';
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

export interface Company {
  id: string;
  code: string;
  name: string;
  nameShort?: string;
  category: string;
  organizationId: string;
  company?: string; // 主管カンパニー
  division?: string; // 主管部門
  department?: string; // 主管部
  region: string; // 国内/海外
  position: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 事業会社を作成（Rust API経由）
 */
export async function createCompany(
  code: string,
  name: string,
  nameShort: string | null,
  category: string,
  organizationId: string,
  company: string | null,
  division: string | null,
  department: string | null,
  region: string,
  position: number
): Promise<Company> {
  try {
    // Rust API経由で作成
    return await apiPost<Company>('/api/companies', {
      code,
      name,
      name_short: nameShort || null,
      category,
      organization_id: organizationId,
      company: company || null,
      division: division || null,
      department: department || null,
      region,
      position,
    });
  } catch (error) {
    // フォールバック: Tauriコマンド経由
    console.warn('Rust API経由の作成に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('create_company_cmd', {
      code,
      name,
      nameShort: nameShort || null,
      category,
      organizationId,
      company: company || null,
      division: division || null,
      department: department || null,
      region,
      position,
    });
  }
}

/**
 * 事業会社を更新（Rust API経由）
 */
export async function updateCompany(
  id: string,
  code?: string,
  name?: string,
  nameShort?: string,
  category?: string,
  organizationId?: string,
  company?: string,
  division?: string,
  department?: string,
  region?: string,
  position?: number
): Promise<Company> {
  try {
    // Rust API経由で更新
    return await apiPut<Company>(`/api/companies/${id}`, {
      code: code || null,
      name: name || null,
      name_short: nameShort || null,
      category: category || null,
      organization_id: organizationId || null,
      company: company || null,
      division: division || null,
      department: department || null,
      region: region || null,
      position: position || null,
    });
  } catch (error) {
    // フォールバック: Tauriコマンド経由
    console.warn('Rust API経由の更新に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('update_company_cmd', {
      id,
      code: code || null,
      name: name || null,
      nameShort: nameShort || null,
      category: category || null,
      organizationId: organizationId || null,
      company: company || null,
      division: division || null,
      department: department || null,
      region: region || null,
      position: position || null,
    });
  }
}

/**
 * IDで事業会社を取得（Rust API経由）
 */
export async function getCompanyById(id: string): Promise<Company> {
  try {
    return await apiGet<Company>(`/api/companies/${id}`);
  } catch (error) {
    console.warn('Rust API経由の取得に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('get_company', { id });
  }
}

/**
 * コードで事業会社を取得（Rust API経由）
 */
export async function getCompanyByCode(code: string): Promise<Company> {
  try {
    return await apiGet<Company>(`/api/companies/code/${code}`);
  } catch (error) {
    console.warn('Rust API経由の取得に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('get_company_by_code_cmd', { code });
  }
}

/**
 * 組織IDで事業会社を取得（Rust API経由）
 */
export async function getCompaniesByOrganizationId(organizationId: string): Promise<Company[]> {
  try {
    return await apiGet<Company[]>(`/api/companies/organization/${organizationId}`);
  } catch (error) {
    console.warn('Rust API経由の取得に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('get_companies_by_org', { organizationId });
  }
}

/**
 * すべての事業会社を取得（Rust API経由）
 */
export async function getAllCompanies(): Promise<Company[]> {
  try {
    return await apiGet<Company[]>('/api/companies');
  } catch (error) {
    console.warn('Rust API経由の取得に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('get_all_companies_cmd', {});
  }
}

/**
 * 事業会社を削除（Rust API経由）
 */
export async function deleteCompany(id: string): Promise<void> {
  try {
    await apiDelete(`/api/companies/${id}`);
  } catch (error) {
    console.warn('Rust API経由の削除に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('delete_company_cmd', { id });
  }
}

/**
 * 事業会社のデータをCSV形式でエクスポート
 * @param filename 保存するファイル名（オプション、デフォルト: companies-YYYY-MM-DD.csv）
 */
export async function exportCompaniesToCSV(filename?: string): Promise<void> {
  try {
    console.log('📤 [exportCompaniesToCSV] CSVエクスポートを開始します...');
    
    // デフォルトのファイル名を生成
    const defaultFilename = filename || `companies-${new Date().toISOString().split('T')[0]}.csv`;
    
    // Tauriコマンドを呼び出してCSVコンテンツを取得（export_pathを指定しない）
    const csvContent = await callTauriCommand('export_companies_csv', {
      exportPath: null
    }) as string;
    
    console.log('✅ [exportCompaniesToCSV] CSVコンテンツを取得しました（長さ:', csvContent.length, '文字）');
    
    // BOM付きCSVをBlobとして作成（CSVコンテンツには既にBOMが含まれている）
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ [exportCompaniesToCSV] CSVエクスポートが完了しました');
  } catch (error: any) {
    console.error('❌ [exportCompaniesToCSV] CSVエクスポートエラー:', error);
    throw error;
  }
}
