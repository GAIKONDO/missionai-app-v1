import { callTauriCommand } from './localFirebase';
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import { saveInitiativeToJson, generateUniqueId } from './orgApi';
import type { FocusInitiative } from './orgApi';

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
 * 事業会社コンテンツ
 */
export interface CompanyContent {
  id: string;
  companyId: string;
  introduction?: string;
  focusBusinesses?: string; // 注力事業
  capitalStructure?: string; // 資本構成（JSON文字列またはテーブルデータ）
  capitalStructureDiagram?: string; // 資本構成Mermaid図
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 事業会社の注力施策
 */
export interface CompanyFocusInitiative {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  content?: string;
  themeIds?: string | string[];
  topicIds?: string | string[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 事業会社の議事録
 */
export interface CompanyMeetingNote {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  content?: string;
  chromaSynced?: number;
  chromaSyncError?: string;
  lastChromaSyncAttempt?: string;
  createdAt?: string;
  updatedAt?: string;
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

/**
 * 議事録のユニークIDを生成
 */
function generateMeetingNoteId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `meeting_${timestamp}_${randomPart}`;
}

/**
 * 事業会社コンテンツを取得
 */
export async function getCompanyContent(companyId: string): Promise<CompanyContent | null> {
  try {
    console.log('📖 [getCompanyContent] 開始:', { companyId });
    
    const { callTauriCommand } = await import('./localFirebase');
    const { doc, getDoc } = await import('./firestore');
    
    const docRef = doc(null, 'companyContents', companyId);
    
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as CompanyContent;
        console.log('✅ [getCompanyContent] 取得成功:', data);
        return data;
      } else {
        console.log('📝 [getCompanyContent] データが存在しません（新規作成可能）');
        return null;
      }
    } catch (getError: any) {
      // Tauriコマンド経由で取得を試みる
      try {
        const result = await callTauriCommand('doc_get', {
          collectionName: 'companyContents',
          docId: companyId,
        });
        
        if (result && result.data) {
          return result.data as CompanyContent;
        }
        return null;
      } catch (tauriError: any) {
        console.warn('⚠️ [getCompanyContent] 取得エラー（続行します）:', tauriError);
        return null;
      }
    }
  } catch (error: any) {
    console.error('❌ [getCompanyContent] エラー:', error);
    return null;
  }
}

/**
 * 事業会社コンテンツを保存
 */
export async function saveCompanyContent(
  companyId: string,
  content: Partial<Omit<CompanyContent, 'companyId' | 'id' | 'createdAt' | 'updatedAt'>>
): Promise<string> {
  try {
    console.log('💾 [saveCompanyContent] 開始:', { companyId, content });
    
    const { doc, setDoc, getDoc, serverTimestamp } = await import('./firestore');
    const docRef = doc(null, 'companyContents', companyId);
    
    // 既存データを取得
    let existingData: CompanyContent | null = null;
    try {
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        existingData = existingDoc.data() as CompanyContent;
        console.log('📖 [saveCompanyContent] 既存データを取得:', existingData);
      } else {
        console.log('📝 [saveCompanyContent] 新規作成');
      }
    } catch (getError: any) {
      console.warn('⚠️ [saveCompanyContent] 既存データ取得エラー（続行します）:', getError);
    }
    
    const now = new Date().toISOString();
    let data: any;
    
    if (existingData) {
      // 既存データを取得してマージ
      data = {
        ...existingData,
        ...content,
        companyId,
        id: companyId,
        updatedAt: now,
      };
      if (existingData.createdAt) {
        data.createdAt = typeof existingData.createdAt === 'string' 
          ? existingData.createdAt 
          : ((existingData.createdAt as any)?.toMillis ? new Date((existingData.createdAt as any).toMillis()).toISOString() : now);
      }
    } else {
      // 新規作成
      data = {
        id: companyId,
        companyId,
        introduction: content.introduction || '',
        focusBusinesses: content.focusBusinesses || '',
        createdAt: now,
        updatedAt: now,
      };
    }
    
    console.log('💾 [saveCompanyContent] 保存するデータ:', data);
    
    await setDoc(docRef, data);
    console.log('✅ [saveCompanyContent] 事業会社コンテンツを保存しました:', companyId);
    return companyId;
  } catch (error: any) {
    console.error('❌ [saveCompanyContent] 事業会社コンテンツの保存に失敗しました:', error);
    throw error;
  }
}

/**
 * 事業会社の注力施策を取得
 */
export async function getCompanyFocusInitiatives(companyId: string): Promise<CompanyFocusInitiative[]> {
  try {
    console.log('📖 [getCompanyFocusInitiatives] 開始:', { companyId });
    
    const { callTauriCommand } = await import('./localFirebase');
    
    try {
      const result = await callTauriCommand('collection_get', {
        collectionName: 'focusInitiatives',
      });
      
      const allInitiatives = Array.isArray(result) ? result : [];
      
      const filtered = allInitiatives
        .filter((item: any) => {
          const data = item.data || item;
          return data.companyId === companyId && !data.organizationId;
        })
        .map((item: any) => {
          const data = item.data || item;
          
          const parseJsonArray = (value: any): string[] => {
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                return [];
              }
            }
            return [];
          };
          
          return {
            id: data.id || item.id,
            companyId: data.companyId,
            title: data.title || '',
            description: data.description || '',
            content: data.content || '',
            themeIds: parseJsonArray(data.themeIds) || [],
            topicIds: parseJsonArray(data.topicIds) || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as CompanyFocusInitiative;
        });
      
      console.log('✅ [getCompanyFocusInitiatives] 取得成功:', filtered.length, '件');
      return filtered;
    } catch (error: any) {
      console.error('❌ [getCompanyFocusInitiatives] エラー:', error);
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getCompanyFocusInitiatives] エラー:', error);
    return [];
  }
}

/**
 * 事業会社の注力施策を保存
 */
export async function saveCompanyFocusInitiative(initiative: Partial<CompanyFocusInitiative>): Promise<string> {
  try {
    const initiativeId = initiative.id || generateUniqueId();
    console.log('💾 [saveCompanyFocusInitiative] 開始:', { 
      initiativeId, 
      companyId: initiative.companyId,
      title: initiative.title,
    });
    
    if (!initiative.companyId) {
      throw new Error('companyIdが指定されていません');
    }
    
    // companyIdがcompaniesテーブルに存在するか確認（Tauri環境の場合）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      try {
        const result = await callTauriCommand('doc_get', {
          collectionName: 'companies',
          docId: initiative.companyId,
        });
        if (!result || !(result as any).exists) {
          throw new Error(`事業会社ID "${initiative.companyId}" がcompaniesテーブルに存在しません`);
        }
        console.log('✅ [saveCompanyFocusInitiative] 事業会社IDの存在確認成功:', initiative.companyId);
      } catch (companyCheckError: any) {
        const errorMessage = companyCheckError?.message || String(companyCheckError || '');
        if (errorMessage.includes('存在しません') || errorMessage.includes('no rows')) {
          throw new Error(`事業会社ID "${initiative.companyId}" がcompaniesテーブルに存在しません。`);
        }
        console.warn('⚠️ [saveCompanyFocusInitiative] 事業会社IDの存在確認でエラー（続行します）:', errorMessage);
      }
    }
    
    // 既存データの確認
    let existingData: any = null;
    let isNew = true;
    
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      try {
        const result = await callTauriCommand('doc_get', {
          collectionName: 'focusInitiatives',
          docId: initiativeId,
        });
        if (result && (result as any).exists) {
          existingData = (result as any).data;
          isNew = false;
        }
      } catch (getDocError: any) {
        // 新規作成として扱う
        isNew = true;
      }
    }
    
    const now = new Date().toISOString();
    
    const themeIdsArray = Array.isArray(initiative.themeIds) 
      ? initiative.themeIds 
      : (initiative.themeIds ? [initiative.themeIds] : []);
    const topicIdsArray = Array.isArray(initiative.topicIds) 
      ? initiative.topicIds 
      : (initiative.topicIds ? [initiative.topicIds] : []);
    
    const data: any = {
      id: initiativeId,
      companyId: initiative.companyId!,
      title: initiative.title || '',
      description: initiative.description || '',
      content: initiative.content || '',
      themeIds: themeIdsArray.length > 0 ? JSON.stringify(themeIdsArray) : null,
      topicIds: topicIdsArray.length > 0 ? JSON.stringify(topicIdsArray) : null,
      updatedAt: now,
    };
    
    // organizationIdを明示的にNULLに設定（事業会社用のデータなので）
    // 新規作成時も更新時も明示的にNULLを設定することで、マイグレーション前のテーブルでも動作する
    data.organizationId = null;
    
    if (isNew) {
      data.createdAt = now;
    } else if (existingData?.createdAt) {
      data.createdAt = typeof existingData.createdAt === 'string' 
        ? existingData.createdAt 
        : now;
    } else {
      data.createdAt = now;
    }
    
    // Tauri環境ではcallTauriCommandを使用
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      console.log('💾 [saveCompanyFocusInitiative] 保存データ確認:', {
        initiativeId,
        companyId: data.companyId,
        organizationId: data.organizationId,
        title: data.title,
        dataKeys: Object.keys(data),
      });
      await callTauriCommand('doc_set', {
        collectionName: 'focusInitiatives',
        docId: initiativeId,
        data: data,
      });
      console.log('✅ [saveCompanyFocusInitiative] 保存成功（Tauri）:', initiativeId);
      
      // 保存後に確認のため再取得
      try {
        const verifyResult = await callTauriCommand('doc_get', {
          collectionName: 'focusInitiatives',
          docId: initiativeId,
        });
        console.log('🔍 [saveCompanyFocusInitiative] 保存後の確認:', {
          exists: verifyResult?.exists,
          companyId: verifyResult?.data?.companyId,
          organizationId: verifyResult?.data?.organizationId,
          verifyDataKeys: verifyResult?.data ? Object.keys(verifyResult.data) : [],
        });
      } catch (verifyError) {
        console.warn('⚠️ [saveCompanyFocusInitiative] 保存後の確認エラー:', verifyError);
      }
    } else {
      // フォールバック: firestoreを使用
      const { doc, setDoc } = await import('./firestore');
      const docRef = doc(null, 'focusInitiatives', initiativeId);
      await setDoc(docRef, data);
      console.log('✅ [saveCompanyFocusInitiative] 保存成功（Firestore）:', initiativeId);
    }
    
    // JSONファイルにも保存
    try {
      // 既存データから追加のフィールドを取得（存在する場合）
      const parseJsonArray = (value: any): string[] => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };
      
      // データベースから取得したデータをFocusInitiative形式に変換
      const fullInitiative: FocusInitiative = {
        id: initiativeId,
        organizationId: data.organizationId || undefined,
        companyId: data.companyId || undefined,
        title: data.title,
        description: data.description,
        content: data.content,
        assignee: existingData?.assignee || '',
        method: existingData?.method ? parseJsonArray(existingData.method) : [],
        methodOther: existingData?.methodOther || '',
        methodDetails: existingData?.methodDetails ? (typeof existingData.methodDetails === 'string' ? JSON.parse(existingData.methodDetails) : existingData.methodDetails) : {},
        means: existingData?.means ? parseJsonArray(existingData.means) : [],
        meansOther: existingData?.meansOther || '',
        objective: existingData?.objective || '',
        considerationPeriod: existingData?.considerationPeriod || '',
        executionPeriod: existingData?.executionPeriod || '',
        monetizationPeriod: existingData?.monetizationPeriod || '',
        relatedOrganizations: existingData?.relatedOrganizations ? parseJsonArray(existingData.relatedOrganizations) : [],
        relatedGroupCompanies: existingData?.relatedGroupCompanies ? parseJsonArray(existingData.relatedGroupCompanies) : [],
        monetizationDiagram: existingData?.monetizationDiagram || '',
        relationDiagram: existingData?.relationDiagram || '',
        causeEffectDiagramId: existingData?.causeEffectDiagramId,
        themeId: existingData?.themeId,
        themeIds: themeIdsArray,
        topicIds: topicIdsArray,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      
      await saveInitiativeToJson(fullInitiative);
      console.log('✅ [saveCompanyFocusInitiative] JSONファイル保存成功:', initiativeId);
    } catch (jsonError: any) {
      // JSONファイルの保存に失敗しても、データベースへの保存は成功しているので警告のみ
      console.warn('⚠️ [saveCompanyFocusInitiative] JSONファイルの保存に失敗しました（データベースへの保存は成功）:', jsonError);
    }
    
    return initiativeId;
  } catch (error: any) {
    console.error('❌ [saveCompanyFocusInitiative] 保存に失敗しました:', error);
    throw error;
  }
}

/**
 * 事業会社の注力施策を削除
 */
export async function deleteCompanyFocusInitiative(initiativeId: string): Promise<void> {
  try {
    console.log('🗑️ [deleteCompanyFocusInitiative] 開始:', { initiativeId });
    
    const { callTauriCommand } = await import('./localFirebase');
    await callTauriCommand('doc_delete', {
      collectionName: 'focusInitiatives',
      docId: initiativeId,
    });
    
    console.log('✅ [deleteCompanyFocusInitiative] 削除成功:', initiativeId);
  } catch (error: any) {
    console.error('❌ [deleteCompanyFocusInitiative] 削除に失敗しました:', error);
    throw error;
  }
}

/**
 * 事業会社の注力施策のユニークIDを生成
 */
export function generateUniqueCompanyInitiativeId(): string {
  return generateUniqueId();
}

/**
 * 事業会社の議事録を取得
 */
export async function getCompanyMeetingNotes(companyId: string): Promise<CompanyMeetingNote[]> {
  try {
    console.log('📖 [getCompanyMeetingNotes] 開始:', { companyId });
    
    const { callTauriCommand } = await import('./localFirebase');
    
    try {
      const result = await callTauriCommand('collection_get', {
        collectionName: 'meetingNotes',
      });
      
      const allNotes = Array.isArray(result) ? result : [];
      
      const filtered = allNotes
        .filter((item: any) => {
          const data = item.data || item;
          return data.companyId === companyId && !data.organizationId;
        })
        .map((item: any) => {
          const data = item.data || item;
          return {
            id: data.id || item.id,
            companyId: data.companyId,
            title: data.title || '',
            description: data.description || '',
            content: data.content || '',
            chromaSynced: data.chromaSynced || 0,
            chromaSyncError: data.chromaSyncError || null,
            lastChromaSyncAttempt: data.lastChromaSyncAttempt || null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as CompanyMeetingNote;
        });
      
      console.log('✅ [getCompanyMeetingNotes] 取得成功:', filtered.length, '件');
      return filtered;
    } catch (error: any) {
      console.error('❌ [getCompanyMeetingNotes] エラー:', error);
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getCompanyMeetingNotes] エラー:', error);
    return [];
  }
}

/**
 * 事業会社の議事録を保存
 */
export async function saveCompanyMeetingNote(note: Partial<CompanyMeetingNote>): Promise<string> {
  try {
    const noteId = note.id || generateMeetingNoteId();
    console.log('💾 [saveCompanyMeetingNote] 開始:', { 
      noteId, 
      companyId: note.companyId,
      title: note.title,
    });
    
    if (!note.companyId) {
      throw new Error('companyIdが指定されていません');
    }
    
    // companyIdがcompaniesテーブルに存在するか確認
    try {
      const { doc, getDoc } = await import('./firestore');
      const companyDocRef = doc(null, 'companies', note.companyId);
      const companyDoc = await getDoc(companyDocRef);
      if (!companyDoc.exists()) {
        throw new Error(`事業会社ID "${note.companyId}" がcompaniesテーブルに存在しません`);
      }
      console.log('✅ [saveCompanyMeetingNote] 事業会社IDの存在確認成功:', note.companyId);
    } catch (companyCheckError: any) {
      const errorMessage = companyCheckError?.message || String(companyCheckError || '');
      if (errorMessage.includes('存在しません')) {
        throw new Error(`事業会社ID "${note.companyId}" がcompaniesテーブルに存在しません。`);
      }
      console.warn('⚠️ [saveCompanyMeetingNote] 事業会社IDの存在確認でエラー（続行します）:', errorMessage);
    }
    
    const { doc, setDoc, getDoc } = await import('./firestore');
    const docRef = doc(null, 'meetingNotes', noteId);
    
    let existingData: CompanyMeetingNote | null = null;
    let isNew = true;
    
    try {
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        existingData = existingDoc.data() as CompanyMeetingNote;
        isNew = false;
      }
    } catch (getDocError: any) {
      isNew = true;
    }
    
    const now = new Date().toISOString();
    
    const data: any = {
      id: noteId,
      companyId: note.companyId!,
      title: note.title || '',
      description: note.description || '',
      content: note.content || '',
      chromaSynced: note.chromaSynced || 0,
      chromaSyncError: note.chromaSyncError || null,
      lastChromaSyncAttempt: note.lastChromaSyncAttempt || null,
      updatedAt: now,
    };

    // organizationIdを明示的にNULLに設定（事業会社用のデータなので）
    // 新規作成時も更新時も明示的にNULLを設定することで、マイグレーション前のテーブルでも動作する
    data.organizationId = null;
    
    if (isNew) {
      data.createdAt = now;
    } else if (existingData?.createdAt) {
      data.createdAt = typeof existingData.createdAt === 'string' 
        ? existingData.createdAt 
        : ((existingData.createdAt as any)?.toMillis ? new Date((existingData.createdAt as any).toMillis()).toISOString() : now);
    } else {
      data.createdAt = now;
    }
    
    await setDoc(docRef, data);
    console.log('✅ [saveCompanyMeetingNote] 保存成功:', noteId);
    
    return noteId;
  } catch (error: any) {
    console.error('❌ [saveCompanyMeetingNote] 保存に失敗しました:', error);
    throw error;
  }
}

/**
 * 事業会社の議事録を削除
 */
export async function deleteCompanyMeetingNote(noteId: string): Promise<void> {
  try {
    console.log('🗑️ [deleteCompanyMeetingNote] 開始:', { noteId });
    
    const { callTauriCommand } = await import('./localFirebase');
    await callTauriCommand('doc_delete', {
      collectionName: 'meetingNotes',
      docId: noteId,
    });
    
    console.log('✅ [deleteCompanyMeetingNote] 削除成功:', noteId);
  } catch (error: any) {
    console.error('❌ [deleteCompanyMeetingNote] 削除に失敗しました:', error);
    throw error;
  }
}

/**
 * 事業会社の議事録のユニークIDを生成
 */
export function generateUniqueCompanyMeetingNoteId(): string {
  return generateMeetingNoteId();
}
