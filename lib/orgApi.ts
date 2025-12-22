import { callTauriCommand } from './localFirebase';
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { OrgNodeData, MemberInfo } from '@/components/OrgChart';
import { sortMembersByPosition } from './memberSort';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from './firestore';
import type { TopicSemanticCategory } from '@/types/topicMetadata';
import * as path from 'path';

// OrgNodeDataを再エクスポート（他のファイルから使用できるように）
export type { OrgNodeData, MemberInfo };

/**
 * JSONファイルのパスを取得するヘルパー関数
 */
async function getInitiativeJsonPath(initiativeId: string): Promise<string> {
  try {
    // アプリデータディレクトリのパスを取得
    const appDataPath = await callTauriCommand('get_path', {}) as string;
    const initiativesDir = path.join(appDataPath, 'focusInitiatives');
    return path.join(initiativesDir, `${initiativeId}.json`);
  } catch (error) {
    console.error('アプリデータディレクトリの取得に失敗しました:', error);
    throw error;
  }
}

/**
 * JSONファイルに保存
 */
export async function saveInitiativeToJson(initiative: FocusInitiative): Promise<void> {
  try {
    const filePath = await getInitiativeJsonPath(initiative.id);
    
    // JSON文字列に変換
    const jsonString = JSON.stringify(initiative, null, 2);
    
    // ファイルに書き込み（write_fileコマンドが親ディレクトリを自動的に作成する）
    // Tauri 2.0では引数名が自動的にキャメルケースに変換されるため、filePathとdataを使用
    const result = await callTauriCommand('write_file', {
      filePath: filePath,
      data: jsonString,
    });
    
    if (!result.success) {
      throw new Error(result.error || 'JSONファイルの保存に失敗しました');
    }
    
    console.log('✅ [saveInitiativeToJson] JSONファイルに保存成功:', filePath);
  } catch (error: any) {
    console.error('❌ [saveInitiativeToJson] JSONファイルの保存に失敗しました:', error);
    throw error;
  }
}

/**
 * JSONファイルから読み込み
 */
async function loadInitiativeFromJson(initiativeId: string): Promise<FocusInitiative | null> {
  try {
    const filePath = await getInitiativeJsonPath(initiativeId);
    
    // ファイルが存在するか確認
    // Tauri 2.0では引数名が自動的にキャメルケースに変換されるため、filePathを使用
    const exists = await callTauriCommand('file_exists', { filePath: filePath });
    if (!exists.exists) {
      console.log('📖 [loadInitiativeFromJson] JSONファイルが存在しません:', filePath);
      return null;
    }
    
    // ファイルを読み込み
    const result = await callTauriCommand('read_file', { filePath: filePath });
    
    if (!result.success) {
      console.error('❌ [loadInitiativeFromJson] JSONファイルの読み込みに失敗しました:', result.error);
      return null;
    }
    
    // JSON文字列をパース
    const data = JSON.parse(result.data);
    
    console.log('✅ [loadInitiativeFromJson] JSONファイルから読み込み成功:', {
      id: data.id,
      title: data.title,
      assignee: data.assignee,
      description: data.description,
    });
    
    return data as FocusInitiative;
  } catch (error: any) {
    console.error('❌ [loadInitiativeFromJson] JSONファイルの読み込みに失敗しました:', error);
    return null;
  }
}

/**
 * データベースから組織データを取得してOrgNodeData形式に変換
 */
export async function getOrgTreeFromDb(rootId?: string): Promise<OrgNodeData | null> {
  try {
    // Tauriコマンド経由で直接取得（APIサーバー経由ではなく）
    console.log('🔍 [getOrgTreeFromDb] Tauriコマンド経由で組織ツリーを取得します');
    const tree = await callTauriCommand('get_org_tree', { rootId: rootId || null });
    
    if (!tree || tree.length === 0) {
      return null;
    }

      // デバッグ: Tauriコマンドが返すデータを確認
      console.log('🔍 [getOrgTreeFromDb] Tauriコマンドが返すデータ:', {
        treeLength: tree.length,
        rootOrgs: tree.map((org: any, index: number) => {
          const orgData = org.organization || org;
          const finalId = orgData.id || org.id;
          console.log(`🔍 [getOrgTreeFromDb] ルート組織 #${index + 1} の詳細:`, {
            finalId,
            orgName: orgData.name || org.name,
            hasOrganization: !!org.organization,
            dbOrgId: org.id,
            orgId: orgData.id,
            keys: Object.keys(org),
            orgKeys: org.organization ? Object.keys(org.organization) : [],
            rawOrgString: JSON.stringify(org).substring(0, 1000), // 生データの最初の1000文字
            parentId: orgData.parent_id || org.parent_id || org.parentId,
          });
          return {
            id: finalId,
            name: orgData.name || org.name,
            hasOrganization: !!org.organization,
            keys: Object.keys(org),
            rawOrg: org, // 生データも確認
          };
        }),
      });

    // rootIdが指定されている場合は、該当する組織を返す
    if (rootId) {
      const found = tree.find((org: any) => {
        const orgData = org.organization || org;
        return orgData.id === rootId;
      });
      if (found) {
        return convertToOrgNodeData(found);
      }
      // 見つからない場合は最初の1つを返す
      return convertToOrgNodeData(tree[0]);
    }

    // 複数のルート組織がある場合、全てを子ノードとして持つ仮想的なルートノードを作成
    if (tree.length > 1) {
      console.log(`⚠️ [getOrgTreeFromDb] 複数のルート組織が見つかりました (${tree.length}件)。全て表示します。`);
      const convertedRoots = tree.map((org: any) => convertToOrgNodeData(org));
      
      // 仮想的なルートノードを作成（重複を識別しやすくするため）
      const virtualRoot: OrgNodeData = {
        id: 'virtual-root',
        name: `全組織 (${tree.length}件のルート組織)`,
        title: `All Organizations (${tree.length} root organizations)`,
        description: '複数のルート組織が存在します。重複している可能性があります。',
        children: convertedRoots,
        members: [],
      };
      
      // 重複している組織名をログに出力
      const orgNames = convertedRoots.map((org: OrgNodeData) => org.name);
      const duplicateNames = orgNames.filter((name: string, index: number) => orgNames.indexOf(name) !== index);
      if (duplicateNames.length > 0) {
        console.warn(`⚠️ [getOrgTreeFromDb] 重複している組織名:`, [...new Set(duplicateNames)]);
      }
      
      return virtualRoot;
    }

    // 1つだけの場合はそのまま返す
    return convertToOrgNodeData(tree[0]);
  } catch (error) {
    // フォールバック: Tauriコマンド経由
    console.warn('Rust API経由の取得に失敗、Tauriコマンドにフォールバック:', error);
    try {
      const tree = await callTauriCommand('get_org_tree', { rootId: rootId || null });
      
      if (!tree || tree.length === 0) {
        return null;
      }

      // デバッグ: Tauriコマンドが返すデータを確認
      console.log('🔍 [getOrgTreeFromDb] Tauriコマンドが返すデータ:', {
        treeLength: tree.length,
        rootOrgs: tree.map((org: any) => {
          const orgData = org.organization || org;
          const finalId = orgData.id || org.id;
          console.log('🔍 [getOrgTreeFromDb] ルート組織の詳細:', {
            finalId,
            orgName: orgData.name || org.name,
            hasOrganization: !!org.organization,
            dbOrgId: org.id,
            orgId: orgData.id,
            keys: Object.keys(org),
            orgKeys: Object.keys(orgData),
            rawOrg: JSON.stringify(org).substring(0, 500), // 生データの最初の500文字
          });
          return {
            id: finalId,
            name: orgData.name || org.name,
            hasOrganization: !!org.organization,
            keys: Object.keys(org),
            rawOrg: org, // 生データも確認
          };
        }),
      });

      // rootIdが指定されている場合は、該当する組織を返す
      if (rootId) {
        const found = tree.find((org: any) => {
          const orgData = org.organization || org;
          return orgData.id === rootId;
        });
        if (found) {
          return convertToOrgNodeData(found);
        }
        // 見つからない場合は最初の1つを返す
        return convertToOrgNodeData(tree[0]);
      }

      // 複数のルート組織がある場合、全てを子ノードとして持つ仮想的なルートノードを作成
      if (tree.length > 1) {
        console.log(`⚠️ [getOrgTreeFromDb] 複数のルート組織が見つかりました (${tree.length}件)。全て表示します。`);
        const convertedRoots = tree.map((org: any) => convertToOrgNodeData(org));
        
        // 仮想的なルートノードを作成（重複を識別しやすくするため）
        const virtualRoot: OrgNodeData = {
          id: 'virtual-root',
          name: `全組織 (${tree.length}件のルート組織)`,
          title: `All Organizations (${tree.length} root organizations)`,
          description: '複数のルート組織が存在します。重複している可能性があります。',
          children: convertedRoots,
          members: [],
        };
        
        // 重複している組織名をログに出力
        const orgNames = convertedRoots.map((org: OrgNodeData) => org.name);
        const duplicateNames = orgNames.filter((name: string, index: number) => orgNames.indexOf(name) !== index);
        if (duplicateNames.length > 0) {
          console.warn(`⚠️ [getOrgTreeFromDb] 重複している組織名:`, [...new Set(duplicateNames)]);
        }
        
        return virtualRoot;
      }

      // 1つだけの場合はそのまま返す
      return convertToOrgNodeData(tree[0]);
    } catch (fallbackError) {
      console.error('組織データの取得に失敗しました:', fallbackError);
      return null;
    }
  }
}

/**
 * 組織ツリーからすべての組織をフラットなリストとして取得
 */
export function getAllOrganizationsFromTree(orgTree: OrgNodeData | null): Array<{ id: string; name: string; title?: string }> {
  if (!orgTree) return [];
  
  const organizations: Array<{ id: string; name: string; title?: string }> = [];
  
  function traverse(node: OrgNodeData) {
    if (!node.id) return;
    organizations.push({
      id: node.id,
      name: node.name || node.title || node.id, // nameが日本語、titleが英語
      title: node.title, // 英語名を保持
    });
    
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }
  
  traverse(orgTree);
  return organizations;
}

/**
 * 組織ツリーから指定されたIDの組織を検索
 */
export function findOrganizationById(orgTree: OrgNodeData | null, orgId: string): OrgNodeData | null {
  if (!orgTree) return null;
  
  function traverse(node: OrgNodeData): OrgNodeData | null {
    if (node.id === orgId) {
      return node;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const found = traverse(child);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  return traverse(orgTree);
}

/**
 * データベースのOrganizationWithMembers形式をOrgNodeData形式に変換
 */
function convertToOrgNodeData(dbOrg: any): OrgNodeData {
  // データ構造を確認（organizationプロパティがある場合とない場合の両方に対応）
  // #[serde(flatten)]により、organizationのフィールドがトップレベルにフラット化されている可能性がある
  const org = dbOrg.organization || dbOrg;
  
  // IDを取得（トップレベルとorganizationオブジェクトの両方を確認）
  const orgId = dbOrg.id || org.id || org.name;
  
  // デバッグ: ID取得の過程をログ出力
  if (!dbOrg.id && !org.id) {
    console.warn('⚠️ [convertToOrgNodeData] IDが存在しないため、nameをIDとして使用:', {
      orgName: org.name || dbOrg.name,
      dbOrgKeys: Object.keys(dbOrg),
      orgKeys: Object.keys(org),
      hasDbOrgId: !!dbOrg.id,
      hasOrgId: !!org.id,
      finalOrgId: orgId,
    });
  } else {
    console.log('✅ [convertToOrgNodeData] IDを取得:', {
      dbOrgId: dbOrg.id,
      orgId: org.id,
      finalOrgId: orgId,
      orgName: org.name || dbOrg.name,
    });
  }
  
  // IDが存在しない場合のデバッグログ
  if (!dbOrg.id && !org.id) {
    console.warn('⚠️ [convertToOrgNodeData] 組織IDが存在しません:', {
      orgName: org.name || dbOrg.name,
      dbOrgKeys: Object.keys(dbOrg),
      orgKeys: Object.keys(org),
      hasDbOrgId: !!dbOrg.id,
      hasOrgId: !!org.id,
      dbOrgSample: {
        id: dbOrg.id,
        name: dbOrg.name,
        hasOrganization: !!dbOrg.organization,
      },
    });
  }
  
  // childrenをpositionでソート
  const sortedChildren = (dbOrg.children || []).sort((a: any, b: any) => {
    const orgA = a.organization || a;
    const orgB = b.organization || b;
    const posA = orgA.position || 0;
    const posB = orgB.position || 0;
    return posA - posB;
  });
  const children: OrgNodeData[] = sortedChildren.map((child: any) => convertToOrgNodeData(child));
  
  const members: MemberInfo[] = (dbOrg.members || []).map((member: any): MemberInfo => ({
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
  
  // メンバーを役職順にソート（情報・通信部門の場合は部門長を最上位にする）
  const sortedMembers = sortMembersByPosition(members, org.name);
  
  return {
    id: orgId,
    name: org.name,
    title: org.title || '',
    description: org.description || undefined,
    level: org.level !== undefined ? org.level : (org.levelName ? parseInt(org.levelName.replace('階層レベル ', '')) || 0 : 0),
    levelName: org.levelName || undefined,
    position: org.position !== undefined ? org.position : 0,
    type: org.org_type || org.type || dbOrg.org_type || dbOrg.type || 'organization', // type情報を追加（Rust側ではorg_typeとして返される）
    members: sortedMembers.length > 0 ? sortedMembers : undefined,
    children: children.length > 0 ? children : undefined,
  };
}

/**
 * 組織を作成
 */
export async function createOrg(
  parentId: string | null,
  name: string,
  title: string | null,
  description: string | null,
  level: number,
  levelName: string,
  position: number,
  orgType?: string
): Promise<any> {
  try {
    // Rust API経由で作成
    const payload: any = {
      parent_id: parentId,
      name,
      title: title || null,
      description: description || null,
      level,
      level_name: levelName,
      position,
    };
    if (orgType) {
      payload.type = orgType;
    }
    return await apiPost<any>('/api/organizations', payload);
  } catch (error) {
    // フォールバック: Tauriコマンド経由
    console.warn('Rust API経由の作成に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('create_org', {
      parentId: parentId,
      name,
      title,
      description,
      level,
      levelName,
      position,
      orgType: orgType || null,
    });
  }
}

/**
 * 組織を更新
 */
export async function updateOrg(
  id: string,
  name?: string,
  title?: string,
  description?: string,
  position?: number
): Promise<any> {
  try {
    // Rust API経由で更新
    return await apiPut<any>(`/api/organizations/${id}`, {
      name: name || null,
      title: title || null,
      description: description || null,
      position: position || null,
    });
  } catch (error) {
    // フォールバック: Tauriコマンド経由
    console.warn('Rust API経由の更新に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('update_org', {
      id,
      name: name || null,
      title: title || null,
      description: description || null,
      position: position || null,
    });
  }
}

/**
 * 組織の親IDを更新
 */
export async function updateOrgParent(
  id: string,
  parentId: string | null
): Promise<any> {
  return callTauriCommand('update_org_parent', {
    id,
    parentId: parentId || null,
  });
}

/**
 * 名前で組織を検索（部分一致）
 */
export async function searchOrgsByName(namePattern: string): Promise<any[]> {
  try {
    // Rust API経由で検索
    return await apiGet<any[]>('/api/organizations/search', { name: namePattern });
  } catch (error) {
    // フォールバック: Tauriコマンド経由
    console.warn('Rust API経由の検索に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('search_orgs_by_name', {
      namePattern,
    });
  }
}

/**
 * 組織を削除
 */
/**
 * 削除対象の子組織とメンバーを取得
 */
export async function getDeletionTargets(organizationId: string): Promise<{
  childOrganizations: Array<{ id: string; name: string; title?: string; level: number; levelName: string; type?: string }>;
  members: Array<{ id: string; name: string; position?: string; organizationId: string }>;
}> {
  try {
    const result = await callTauriCommand('get_deletion_targets_cmd', {
      organizationId,
    }) as {
      childOrganizations: Array<{ id: string; name: string; title?: string; level: number; levelName: string }>;
      members: Array<{ id: string; name: string; position?: string; organizationId: string }>;
    };
    return result;
  } catch (error: any) {
    console.error('❌ [getDeletionTargets] 削除対象の取得に失敗しました:', error);
    throw new Error(`削除対象の取得に失敗しました: ${error.message || error}`);
  }
}

export async function deleteOrg(id: string): Promise<void> {
  console.log('🗑️ [deleteOrg] 削除開始:', id);
  
  // 削除前に、該当する組織が存在するか確認
  try {
    try {
      const orgCheck = await callTauriCommand('doc_get', {
        collectionName: 'organizations',
        docId: id,
      });
      console.log('🔍 [deleteOrg] 削除前の組織確認:', {
        id,
        exists: orgCheck?.exists || false,
        data: orgCheck?.data || null,
      });
      
      if (!orgCheck || !orgCheck.exists) {
        console.warn('⚠️ [deleteOrg] 削除対象の組織が存在しません:', id);
        // 組織が存在しない場合は、エラーを投げずに成功として扱う（既に削除されている）
        return;
      }
    } catch (docGetError: any) {
      // doc_getがエラーを返す場合（「Query returned no rows」）は、組織が存在しないことを意味する
      if (docGetError?.message?.includes('Query returned no rows') || 
          docGetError?.message?.includes('ドキュメント取得エラー')) {
        console.warn('⚠️ [deleteOrg] 削除対象の組織が存在しません（doc_getが行を返さない）:', id);
        // 組織が存在しない場合は、エラーを投げずに成功として扱う（既に削除されている）
        return;
      } else {
        // その他のエラーの場合は再スロー
        throw docGetError;
      }
    }
  } catch (checkError: any) {
    console.warn('⚠️ [deleteOrg] 削除前の確認でエラーが発生しました（続行します）:', checkError);
  }
  
  // Tauri環境では直接Tauriコマンドを使用（APIサーバーが起動していない可能性があるため）
  try {
    console.log('🗑️ [deleteOrg] Tauriコマンド経由で削除を試みます');
    await callTauriCommand('delete_org', { id });
    console.log('✅ [deleteOrg] Tauriコマンド経由の削除が成功しました');
    
    // 削除処理は同期的に実行されるため、ポーリングは不要
    // 念のため、削除が完了したことを確認（1回だけ）
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms待機してから確認
      
      const allOrgs = await callTauriCommand('collection_get', {
        collectionName: 'organizations',
      }) as any[];
      
      const orgStillExists = allOrgs?.some((org: any) => {
        const orgId = org.id || org.data?.id;
        return orgId === id;
      }) || false;
      
      if (orgStillExists) {
        console.warn('⚠️ [deleteOrg] 削除後も組織が存在しています。データベースの更新が反映されていない可能性があります。');
        // エラーを投げない（削除処理自体は成功している可能性があるため）
      } else {
        console.log('✅ [deleteOrg] 削除が確認されました。組織はデータベースから削除されています。');
      }
    } catch (verifyError: any) {
      // 削除後の確認で予期しないエラーが発生した場合でも、削除処理自体は成功している可能性がある
      console.warn('⚠️ [deleteOrg] 削除後の確認でエラーが発生しました（削除処理自体は成功している可能性があります）:', verifyError);
      // エラーを再スローしない（削除処理は成功している可能性があるため）
    }
  } catch (error: any) {
    console.error('❌ [deleteOrg] Tauriコマンド経由の削除が失敗しました:', error);
    throw error;
  }
  
  // ChromaDBのコレクションを削除（非同期、エラーは無視）
  (async () => {
    try {
      const { callTauriCommand: chromaCallTauriCommand } = await import('./localFirebase');
      await chromaCallTauriCommand('chromadb_delete_organization_collections', {
        organizationId: id,
      });
      console.log(`✅ [deleteOrg] ChromaDBコレクション削除成功: ${id}`);
    } catch (error: any) {
      console.warn(`⚠️ [deleteOrg] ChromaDBコレクション削除エラー（続行します）: ${id}`, error);
    }
  })();
}

/**
 * メンバーを追加（詳細情報対応）
 */
export async function addOrgMember(
  organizationId: string,
  memberInfo: MemberInfo
): Promise<any> {
  try {
    // Rust API経由で追加
    return await apiPost<any>(`/api/organizations/${organizationId}/members`, {
      name: memberInfo.name,
      position: memberInfo.title || null,
      name_romaji: memberInfo.nameRomaji || null,
      department: memberInfo.department || null,
      extension: memberInfo.extension || null,
      company_phone: memberInfo.companyPhone || null,
      mobile_phone: memberInfo.mobilePhone || null,
      email: memberInfo.email || null,
      itochu_email: memberInfo.itochuEmail || null,
      teams: memberInfo.teams || null,
      employee_type: memberInfo.employeeType || null,
      role_name: memberInfo.roleName || null,
      indicator: memberInfo.indicator || null,
      location: memberInfo.location || null,
      floor_door_no: memberInfo.floorDoorNo || null,
      previous_name: memberInfo.previousName || null,
    });
  } catch (error) {
    // フォールバック: Tauriコマンド経由
    console.warn('Rust API経由の追加に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('add_org_member', {
      organizationId,
      name: memberInfo.name,
      position: memberInfo.title || null,
      nameRomaji: memberInfo.nameRomaji || null,
      department: memberInfo.department || null,
      extension: memberInfo.extension || null,
      companyPhone: memberInfo.companyPhone || null,
      mobilePhone: memberInfo.mobilePhone || null,
      email: memberInfo.email || null,
      itochuEmail: memberInfo.itochuEmail || null,
      teams: memberInfo.teams || null,
      employeeType: memberInfo.employeeType || null,
      roleName: memberInfo.roleName || null,
      indicator: memberInfo.indicator || null,
      location: memberInfo.location || null,
      floorDoorNo: memberInfo.floorDoorNo || null,
      previousName: memberInfo.previousName || null,
    });
  }
}

/**
 * メンバーを更新（詳細情報対応）
 */
export async function updateOrgMember(
  id: string,
  memberInfo: Partial<MemberInfo>
): Promise<any> {
  try {
    // Rust API経由で更新（organizationIdとmemberIdが必要）
    // idは "orgId:memberId" の形式を想定、または別途organizationIdを取得する必要がある
    // 暫定的にTauriコマンドにフォールバック
    const orgId = (memberInfo as any).organizationId || (id.includes(':') ? id.split(':')[0] : '');
    if (!orgId) {
      // フォールバック: Tauriコマンド経由
      console.warn('Rust API経由の更新に失敗、Tauriコマンドにフォールバック（organizationId不明）');
      return await callTauriCommand('update_org_member', { id, ...memberInfo });
    }
    const memberId = id.includes(':') ? id.split(':')[1] : id;
    return await apiPut<any>(`/api/organizations/${orgId}/members/${memberId}`, {
      name: memberInfo.name || null,
      position: memberInfo.title || null,
      name_romaji: memberInfo.nameRomaji || null,
      department: memberInfo.department || null,
      extension: memberInfo.extension || null,
      company_phone: memberInfo.companyPhone || null,
      mobile_phone: memberInfo.mobilePhone || null,
      email: memberInfo.email || null,
      itochu_email: memberInfo.itochuEmail || null,
      teams: memberInfo.teams || null,
      employee_type: memberInfo.employeeType || null,
      role_name: memberInfo.roleName || null,
      indicator: memberInfo.indicator || null,
      location: memberInfo.location || null,
      floor_door_no: memberInfo.floorDoorNo || null,
      previous_name: memberInfo.previousName || null,
    });
  } catch (error) {
    // フォールバック: Tauriコマンド経由
    console.warn('Rust API経由の更新に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('update_org_member', {
      id,
      name: memberInfo.name || null,
      position: memberInfo.title || null,
      nameRomaji: memberInfo.nameRomaji || null,
      department: memberInfo.department || null,
      extension: memberInfo.extension || null,
      companyPhone: memberInfo.companyPhone || null,
      mobilePhone: memberInfo.mobilePhone || null,
      email: memberInfo.email || null,
      itochuEmail: memberInfo.itochuEmail || null,
      teams: memberInfo.teams || null,
      employeeType: memberInfo.employeeType || null,
      roleName: memberInfo.roleName || null,
      indicator: memberInfo.indicator || null,
      location: memberInfo.location || null,
      floorDoorNo: memberInfo.floorDoorNo || null,
      previousName: memberInfo.previousName || null,
    });
  }
}

/**
 * メンバーを削除
 */
export async function deleteOrgMember(id: string): Promise<void> {
  try {
    // Rust API経由で削除（organizationIdが必要）
    // 暫定的にTauriコマンドにフォールバック
    // TODO: organizationIdを取得する方法を実装する必要がある
    throw new Error('organizationId is required for Rust API');
  } catch (error) {
    // フォールバック: Tauriコマンド経由
    console.warn('Rust API経由の削除に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('delete_org_member', { id });
  }
}

/**
 * 組織のメンバー一覧を取得（idを含む）
 */
export async function getOrgMembers(organizationId: string): Promise<any[]> {
  console.log('🔍 [getOrgMembers] メンバー取得開始:', { organizationId });
  
  // virtual-rootは仮想組織なので、メンバーを取得しない
  if (organizationId === 'virtual-root') {
    console.log('⚠️ [getOrgMembers] virtual-rootは仮想組織のため、メンバーを返しません');
    return [];
  }
  
  try {
    // Rust API経由で取得
    const result = await apiGet<any[]>(`/api/organizations/${organizationId}/members`);
    console.log('✅ [getOrgMembers] メンバー取得成功:', { 
      organizationId, 
      count: result?.length || 0,
      result 
    });
    return result || [];
  } catch (error: any) {
    // ネットワークエラーやCORSエラー、TypeError（fetch失敗）の場合はTauriコマンドにフォールバック
    const isNetworkError = 
      error instanceof TypeError || 
      error?.message?.includes('network') || 
      error?.message?.includes('CORS') || 
      error?.message?.includes('access control') ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('network connection was lost');
    
    if (isNetworkError) {
      console.warn('⚠️ [getOrgMembers] Rust APIサーバーへの接続失敗、Tauriコマンドにフォールバック:', { organizationId, error: error?.message });
    } else {
      console.warn('⚠️ [getOrgMembers] Rust API経由の取得に失敗、Tauriコマンドにフォールバック:', { organizationId, error: error?.message });
    }
    
    // フォールバック: Tauriコマンド経由
    try {
      const result = await callTauriCommand('get_org_members', { organizationId });
      console.log('✅ [getOrgMembers] Tauriコマンド経由でメンバー取得成功:', { 
        organizationId, 
        count: result?.length || 0,
        result 
      });
      return result || [];
    } catch (fallbackError: any) {
      // フォールバックも失敗した場合は警告のみ（エラーを無視）
      console.warn('⚠️ [getOrgMembers] メンバー取得エラー（無視します）:', { 
        organizationId, 
        error: fallbackError?.message
      });
      return [];
    }
  }
}

/**
 * 組織コンテンツの型定義
 */
export interface OrganizationContent {
  organizationId: string;
  introduction?: string; // 組織紹介
  focusAreas?: string; // 注力領域
  meetingNotes?: string; // 議事録アーカイブ
  createdAt?: any;
  updatedAt?: any;
}

/**
 * テーマの型定義
 */
export interface Theme {
  id: string;
  title: string;
  description?: string;
  initiativeIds?: string[]; // 関連する注力施策のIDリスト
  position?: number; // 表示順序
  createdAt?: any;
  updatedAt?: any;
}

/**
 * 注力施策の型定義
 */
export interface FocusInitiative {
  id: string;
  organizationId?: string;
  companyId?: string;
  title: string;
  description?: string;
  content?: string; // 詳細コンテンツ（マークダウン）
  assignee?: string; // 担当者
  method?: string[]; // 手法（複数選択可能）
  methodOther?: string; // 手法（その他）
  methodDetails?: Record<string, any>; // 手法の詳細情報（各手法ごとのテーブルデータ）
  means?: string[]; // 手段（複数選択可能）
  meansOther?: string; // 手段（その他）
  objective?: string; // 目標
  considerationPeriod?: string; // 検討期間
  executionPeriod?: string; // 実行期間
  monetizationPeriod?: string; // 収益化期間
  relatedOrganizations?: string[]; // 関連組織
  relatedGroupCompanies?: string[]; // 関連グループ会社
  monetizationDiagram?: string; // マネタイズ図（Mermaid図）
  monetizationDiagramId?: string; // マネタイズ図のユニークID
  relationDiagram?: string; // 相関図（Mermaid図）
  relationDiagramId?: string; // 相関図のユニークID
  causeEffectDiagramId?: string; // 特性要因図のユニークID
  themeId?: string; // 関連するテーマID（後方互換性のため残す）
  themeIds?: string[]; // 関連するテーマIDの配列（複数のテーマにリンク可能）
  topicIds?: string[]; // 関連する個別トピックIDの配列（複数のトピックにリンク可能）
  createdAt?: any;
  updatedAt?: any;
}

/**
 * ユニークIDを生成
 */
export function generateUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `init_${timestamp}_${randomPart}`;
}

/**
 * 注力施策のユニークIDを生成（エクスポート）
 */
export function generateUniqueInitiativeId(): string {
  return generateUniqueId();
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
 * 議事録のユニークIDを生成（エクスポート）
 */
export function generateUniqueMeetingNoteId(): string {
  return generateMeetingNoteId();
}

/**
 * 議事録の型定義
 */
export interface MeetingNote {
  id: string;
  organizationId: string;
  companyId?: string; // 事業会社ID（事業会社の議事録の場合）
  title: string;
  description?: string;
  content?: string; // 詳細コンテンツ（マークダウン）
  createdAt?: any;
  updatedAt?: any;
}

/**
 * 注力施策を取得
 */
export async function getFocusInitiatives(organizationId: string): Promise<FocusInitiative[]> {
  try {
    console.log('📖 [getFocusInitiatives] 開始:', { organizationId });
    
    // Tauriコマンドを直接使用してデータを取得
    const { callTauriCommand } = await import('./localFirebase');
    
    try {
      // collection_getコマンドを使用
      const result = await callTauriCommand('collection_get', {
        collectionName: 'focusInitiatives',
      });
      
      console.log('📖 [getFocusInitiatives] collection_get結果:', result);
      
      const allInitiatives = Array.isArray(result) ? result : [];
      console.log('📖 [getFocusInitiatives] 全データ数:', allInitiatives.length);
      
      // デバッグ: データベースから取得した生データをログ出力
      if (allInitiatives.length > 0) {
        console.log('📖 [getFocusInitiatives] 生データサンプル (最初の1件):', JSON.stringify(allInitiatives[0], null, 2));
      }
      
      const filtered = allInitiatives
        .filter((item: any) => {
          const data = item.data || item;
          const matches = data.organizationId === organizationId;
          if (!matches) {
            console.log('📖 [getFocusInitiatives] フィルタ除外:', { 
              itemId: data.id || item.id, 
              itemOrgId: data.organizationId, 
              targetOrgId: organizationId 
            });
          }
          return matches;
        })
        .map((item: any) => {
          const data = item.data || item;
          
          // JSON文字列を配列にパースするヘルパー関数
          const parseJsonArray = (value: any): string[] => {
            if (Array.isArray(value)) {
              return value;
            }
            if (typeof value === 'string') {
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                console.warn('⚠️ [getFocusInitiatives] JSONパースエラー:', e, 'value:', value);
                return [];
              }
            }
            return [];
          };
          
          // デバッグ: 各注力施策の生データをログ出力
          console.log(`📖 [getFocusInitiatives] 注力施策「${data.title || data.id}」の生データ:`, {
            id: data.id || item.id,
            themeId: data.themeId,
            themeIds: data.themeIds,
            themeIdsType: typeof data.themeIds,
            topicIds: data.topicIds,
            topicIdsType: typeof data.topicIds,
            relatedOrganizations: data.relatedOrganizations,
            organizationId: data.organizationId,
          });
          
          return {
            id: data.id || item.id,
            organizationId: data.organizationId,
            title: data.title || '',
            description: data.description || '',
            content: data.content || '',
            assignee: data.assignee || '',
            method: data.method || [],
            methodOther: data.methodOther || '',
            methodDetails: data.methodDetails || {},
            means: data.means || [],
            meansOther: data.meansOther || '',
            objective: data.objective || '',
            considerationPeriod: data.considerationPeriod || '',
            executionPeriod: data.executionPeriod || '',
            monetizationPeriod: data.monetizationPeriod || '',
            relatedOrganizations: Array.isArray(data.relatedOrganizations) ? data.relatedOrganizations : (data.relatedOrganizations ? [data.relatedOrganizations] : []),
            relatedGroupCompanies: Array.isArray(data.relatedGroupCompanies) ? data.relatedGroupCompanies : [],
            monetizationDiagram: data.monetizationDiagram || '',
            relationDiagram: data.relationDiagram || '',
            causeEffectDiagramId: data.causeEffectDiagramId,
            themeId: data.themeId,
            themeIds: parseJsonArray(data.themeIds) || (data.themeId ? [data.themeId] : []),
            topicIds: parseJsonArray(data.topicIds) || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as FocusInitiative;
        });
      
      console.log('📖 [getFocusInitiatives] フィルタ後:', filtered.length, '件');
      
      // createdAtでソート（新しい順）
      const sorted = filtered.sort((a, b) => {
        const aTime = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt.toMillis ? a.createdAt.toMillis() : 0)) : 0;
        const bTime = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt.toMillis ? b.createdAt.toMillis() : 0)) : 0;
        return bTime - aTime;
      });
      
      console.log('📖 [getFocusInitiatives] 最終結果:', sorted);
      return sorted;
    } catch (collectionError: any) {
      console.error('📖 [getFocusInitiatives] collection_getエラー:', collectionError);
      // フォールバック: 空配列を返す
      return [];
    }
  } catch (error) {
    console.error('❌ [getFocusInitiatives] エラー:', error);
    return [];
  }
}

/**
 * 特性要因図IDで注力施策を取得
 */
export async function getFocusInitiativeByCauseEffectDiagramId(causeEffectDiagramId: string): Promise<FocusInitiative | null> {
  try {
    console.log('📖 [getFocusInitiativeByCauseEffectDiagramId] 開始:', { causeEffectDiagramId });
    
    const { callTauriCommand } = await import('./localFirebase');
    
    try {
      const result = await callTauriCommand('collection_get', {
        collectionName: 'focusInitiatives',
      });
      
      const allInitiatives = Array.isArray(result) ? result : [];
      
      const found = allInitiatives.find((item: any) => {
        const data = item.data || item;
        return data.causeEffectDiagramId === causeEffectDiagramId;
      });
      
      if (found) {
        const data = found.data || found;
        
        // JSON文字列を配列にパースするヘルパー関数
        const parseJsonArray = (value: any): string[] => {
          if (Array.isArray(value)) {
            return value;
          }
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.warn('⚠️ [getFocusInitiativeByCauseEffectDiagramId] JSONパースエラー:', e, 'value:', value);
              return [];
            }
          }
          return [];
        };
        
        const initiative: FocusInitiative = {
          id: data.id || found.id,
          organizationId: data.organizationId,
          title: data.title || '',
          description: data.description || '',
          content: data.content || '',
          assignee: data.assignee || '',
          method: data.method || [],
          methodOther: data.methodOther || '',
          methodDetails: data.methodDetails || {},
          means: data.means || [],
          meansOther: data.meansOther || '',
          objective: data.objective || '',
          considerationPeriod: data.considerationPeriod || '',
          executionPeriod: data.executionPeriod || '',
          monetizationPeriod: data.monetizationPeriod || '',
          relatedOrganizations: data.relatedOrganizations || [],
          relatedGroupCompanies: data.relatedGroupCompanies || [],
          monetizationDiagram: data.monetizationDiagram || '',
          relationDiagram: data.relationDiagram || '',
          causeEffectDiagramId: data.causeEffectDiagramId,
          themeId: data.themeId,
          themeIds: parseJsonArray(data.themeIds) || [],
          topicIds: parseJsonArray(data.topicIds) || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        
        console.log('✅ [getFocusInitiativeByCauseEffectDiagramId] 見つかりました:', initiative.id);
        return initiative;
      }
      
      console.warn('⚠️ [getFocusInitiativeByCauseEffectDiagramId] 見つかりませんでした');
      return null;
    } catch (error: any) {
      console.error('❌ [getFocusInitiativeByCauseEffectDiagramId] エラー:', error);
      return null;
    }
  } catch (error: any) {
    console.error('❌ [getFocusInitiativeByCauseEffectDiagramId] エラー:', error);
    return null;
  }
}

/**
 * 注力施策を取得（ID指定）
 */
export async function getFocusInitiativeById(initiativeId: string): Promise<FocusInitiative | null> {
  try {
    console.log('📖 [getFocusInitiativeById] 開始:', { initiativeId });
    
    // まずJSONファイルから読み込みを試みる
    const jsonData = await loadInitiativeFromJson(initiativeId);
    if (jsonData) {
      console.log('✅ [getFocusInitiativeById] JSONファイルから読み込み成功:', {
        hasCompanyId: !!jsonData.companyId,
        hasOrganizationId: !!jsonData.organizationId,
        companyId: jsonData.companyId,
        organizationId: jsonData.organizationId,
      });
      // JSONファイルにcompanyIdまたはorganizationIdが含まれていない場合は、データベースから再取得
      // （古いJSONファイルの可能性があるため）
      if (!jsonData.companyId && !jsonData.organizationId) {
        console.warn('⚠️ [getFocusInitiativeById] JSONファイルにcompanyId/organizationIdが含まれていません。データベースから再取得します。');
        // データベースから再取得するために続行
      } else {
        return jsonData;
      }
    }
    
    // JSONファイルがない場合、データベースから読み込みを試みる
    const { callTauriCommand } = await import('./localFirebase');
    
    try {
      // doc_getコマンドを使用
      const result = await callTauriCommand('doc_get', {
        collectionName: 'focusInitiatives',
        docId: initiativeId,
      });
      
      console.log('📖 [getFocusInitiativeById] doc_get結果:', result);
      console.log('📖 [getFocusInitiativeById] doc_get結果の型:', typeof result, 'keys:', result ? Object.keys(result) : []);
      
      // result.existsをチェック
      if (result && (result.exists === false || (result.exists === undefined && !result.data))) {
        console.warn('📖 [getFocusInitiativeById] ドキュメントが存在しません:', { initiativeId, exists: result.exists });
        return null;
      }
      
      // 結果の構造を確認（result.data または result 自体がデータ）
      const data = (result && result.data) ? result.data : result;
      
      // dataが存在しない場合はnullを返す
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        console.warn('📖 [getFocusInitiativeById] データが存在しません:', { initiativeId, result });
        return null;
      }
      console.log('📖 [getFocusInitiativeById] データ構造確認:', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        organizationId: data?.organizationId,
        companyId: data?.companyId,
        topicIds: data?.topicIds,
        topicIdsType: typeof data?.topicIds,
        themeIds: data?.themeIds,
        themeIdsType: typeof data?.themeIds,
        fullData: JSON.stringify(data, null, 2),
      });
      
      // JSON文字列を配列にパースするヘルパー関数
      const parseJsonArray = (value: any): string[] => {
        if (Array.isArray(value)) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.warn('⚠️ [getFocusInitiativeById] JSONパースエラー:', e, 'value:', value);
            return [];
          }
        }
        return [];
      };
      
      if (data && (data.id || data.title || data.organizationId || data.companyId)) {
        // データをFocusInitiative形式に変換
        // companyIdとorganizationIdの処理を改善
        // nullは有効な値として扱う（事業会社の注力施策の場合、organizationIdはnull）
        // undefinedや空文字列の場合のみundefinedに変換
        const processedOrganizationId = (data.organizationId !== undefined && data.organizationId !== '') 
          ? data.organizationId 
          : undefined;
        const processedCompanyId = (data.companyId !== undefined && data.companyId !== '') 
          ? data.companyId 
          : undefined;
        
        console.log('📖 [getFocusInitiativeById] ID処理:', {
          rawOrganizationId: data.organizationId,
          rawCompanyId: data.companyId,
          rawOrganizationIdType: typeof data.organizationId,
          rawCompanyIdType: typeof data.companyId,
          rawOrganizationIdIsNull: data.organizationId === null,
          rawCompanyIdIsNull: data.companyId === null,
          processedOrganizationId,
          processedCompanyId,
          allDataKeys: Object.keys(data),
        });
        
        const initiative: FocusInitiative = {
          id: data.id || initiativeId,
          organizationId: processedOrganizationId,
          companyId: processedCompanyId,
          title: data.title || '',
          description: data.description || '',
          content: data.content || '',
          assignee: data.assignee || '',
          method: Array.isArray(data.method) ? data.method : (data.method ? [data.method] : []),
          methodOther: data.methodOther || '',
          methodDetails: data.methodDetails || {},
          means: Array.isArray(data.means) ? data.means : (data.means ? [data.means] : []),
          meansOther: data.meansOther || '',
          objective: data.objective || '',
          considerationPeriod: data.considerationPeriod || '',
          executionPeriod: data.executionPeriod || '',
          monetizationPeriod: data.monetizationPeriod || '',
          relatedOrganizations: Array.isArray(data.relatedOrganizations) ? data.relatedOrganizations : [],
          relatedGroupCompanies: Array.isArray(data.relatedGroupCompanies) ? data.relatedGroupCompanies : [],
          monetizationDiagram: data.monetizationDiagram || '',
          relationDiagram: data.relationDiagram || '',
          causeEffectDiagramId: data.causeEffectDiagramId,
          themeId: data.themeId,
          themeIds: parseJsonArray(data.themeIds) || (data.themeId ? [data.themeId] : []),
          topicIds: parseJsonArray(data.topicIds) || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        
        console.log('📖 [getFocusInitiativeById] 変換後:', {
          id: initiative.id,
          title: initiative.title,
          organizationId: initiative.organizationId,
          companyId: initiative.companyId,
          assignee: initiative.assignee,
          description: initiative.description,
          contentLength: initiative.content?.length || 0,
          method: initiative.method,
          means: initiative.means,
          objective: initiative.objective,
          considerationPeriod: initiative.considerationPeriod,
          executionPeriod: initiative.executionPeriod,
          monetizationPeriod: initiative.monetizationPeriod,
          monetizationDiagram: initiative.monetizationDiagram,
          relationDiagram: initiative.relationDiagram,
        });
        return initiative;
    }
      
      console.warn('📖 [getFocusInitiativeById] データが見つかりませんでした。result:', result);
    return null;
    } catch (docError: any) {
      console.error('📖 [getFocusInitiativeById] doc_getエラー:', docError);
      // フォールバック: nullを返す
      return null;
    }
  } catch (error: any) {
    console.error('❌ [getFocusInitiativeById] エラー:', error);
    return null;
  }
}

/**
 * 注力施策を保存
 */
export async function saveFocusInitiative(initiative: Partial<FocusInitiative>): Promise<string> {
  try {
    // ユニークIDを生成（既存のIDがない場合）
    const initiativeId = initiative.id || generateUniqueId();
    console.log('💾 [saveFocusInitiative] 開始:', { 
      initiativeId, 
      organizationId: initiative.organizationId,
      title: initiative.title,
      hasId: !!initiative.id 
    });
    
    // organizationIdまたはcompanyIdが指定されている必要がある
    if (!initiative.organizationId && !initiative.companyId) {
      throw new Error('organizationIdまたはcompanyIdが指定されていません');
    }
    
    // organizationIdが指定されている場合、organizationsテーブルに存在するか確認
    if (initiative.organizationId) {
      try {
        const orgDocRef = doc(null, 'organizations', initiative.organizationId);
        const orgDoc = await getDoc(orgDocRef);
        if (!orgDoc.exists()) {
          throw new Error(`組織ID "${initiative.organizationId}" がorganizationsテーブルに存在しません`);
        }
        console.log('✅ [saveFocusInitiative] 組織IDの存在確認成功:', initiative.organizationId);
      } catch (orgCheckError: any) {
        const errorMessage = orgCheckError?.message || String(orgCheckError || '');
        if (errorMessage.includes('存在しません')) {
          throw new Error(`組織ID "${initiative.organizationId}" がorganizationsテーブルに存在しません。組織一覧ページから正しい組織を選択してください。`);
        }
        // その他のエラーは警告のみ（組織が存在しない可能性があるが、続行を試みる）
        console.warn('⚠️ [saveFocusInitiative] 組織IDの存在確認でエラー（続行します）:', errorMessage);
      }
    }
    
    // companyIdが指定されている場合、companiesテーブルに存在するか確認（Tauri環境の場合）
    if (initiative.companyId && typeof window !== 'undefined' && '__TAURI__' in window) {
      try {
        const { callTauriCommand } = await import('./localFirebase');
        const result = await callTauriCommand('doc_get', {
          collectionName: 'companies',
          docId: initiative.companyId,
        });
        if (!result || !(result as any).exists) {
          throw new Error(`事業会社ID "${initiative.companyId}" がcompaniesテーブルに存在しません`);
        }
        console.log('✅ [saveFocusInitiative] 事業会社IDの存在確認成功:', initiative.companyId);
      } catch (companyCheckError: any) {
        const errorMessage = companyCheckError?.message || String(companyCheckError || '');
        if (errorMessage.includes('存在しません') || errorMessage.includes('no rows')) {
          throw new Error(`事業会社ID "${initiative.companyId}" がcompaniesテーブルに存在しません。`);
        }
        console.warn('⚠️ [saveFocusInitiative] 事業会社IDの存在確認でエラー（続行します）:', errorMessage);
      }
    }
    
    const docRef = doc(null, 'focusInitiatives', initiativeId);
    console.log('💾 [saveFocusInitiative] docRef作成:', { 
      collectionName: 'focusInitiatives', 
      docId: initiativeId 
    });
    
    // 既存ドキュメントの確認（エラーハンドリング付き）
    let existingData: FocusInitiative | null = null;
    let isNew = true;
    
    try {
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        existingData = existingDoc.data() as FocusInitiative;
        isNew = false;
        console.log('💾 [saveFocusInitiative] 既存ドキュメント確認: 存在します', { 
          id: existingDoc.id,
          title: existingData.title
        });
      } else {
        console.log('💾 [saveFocusInitiative] 既存ドキュメント確認: 存在しません（新規作成）');
      }
    } catch (getDocError: any) {
      // ドキュメントが存在しない場合はエラーではなく、新規作成として扱う
      const errorMessage = getDocError?.message || getDocError?.error || String(getDocError || '');
      const isNoRowsError = errorMessage.includes('no rows') || 
                           errorMessage.includes('Query returned no rows') ||
                           errorMessage.includes('ドキュメント取得エラー');
      
      if (isNoRowsError) {
        console.log('💾 [saveFocusInitiative] 既存ドキュメント確認: 存在しません（新規作成） - エラーは無視します', {
          errorMessage
        });
        isNew = true;
      } else {
        // その他のエラーは再スロー
        console.error('💾 [saveFocusInitiative] 既存ドキュメント確認エラー:', {
          error: getDocError,
          errorMessage,
          errorType: typeof getDocError
        });
        throw getDocError;
      }
    }
    
    // serverTimestamp()は特殊なオブジェクトを返すため、Tauriコマンドに渡す前に文字列に変換
    const now = new Date().toISOString();
    
    const data: any = {
      id: initiativeId,
      organizationId: initiative.organizationId || null,
      companyId: initiative.companyId || null,
      title: initiative.title || '',
      description: initiative.description || '',
      content: initiative.content || '',
      assignee: initiative.assignee || '',
      method: initiative.method || [],
      methodOther: initiative.methodOther || '',
      methodDetails: initiative.methodDetails || {},
      means: initiative.means || [],
      meansOther: initiative.meansOther || '',
      objective: initiative.objective || '',
      considerationPeriod: initiative.considerationPeriod || '',
      executionPeriod: initiative.executionPeriod || '',
      monetizationPeriod: initiative.monetizationPeriod || '',
      relatedOrganizations: initiative.relatedOrganizations || [],
      relatedGroupCompanies: initiative.relatedGroupCompanies || [],
      monetizationDiagram: initiative.monetizationDiagram || '',
      relationDiagram: initiative.relationDiagram || '',
      themeId: initiative.themeId || '',
      themeIds: Array.isArray(initiative.themeIds) ? initiative.themeIds : (initiative.themeIds ? [initiative.themeIds] : []),
      topicIds: Array.isArray(initiative.topicIds) ? initiative.topicIds : (initiative.topicIds ? [initiative.topicIds] : []),
      updatedAt: now,
    };
    
    // 特性要因図IDを設定（存在しない場合は自動生成）
    if (initiative.causeEffectDiagramId) {
      // 明示的に設定されている場合はそれを使用
      data.causeEffectDiagramId = initiative.causeEffectDiagramId;
    } else if (existingData?.causeEffectDiagramId) {
      // 既存データがある場合は保持
      data.causeEffectDiagramId = existingData.causeEffectDiagramId;
    } else {
      // 新規作成時は自動生成
      data.causeEffectDiagramId = `ced_${generateUniqueId()}`;
    }
    
    if (isNew) {
      // 新規作成の場合
      data.createdAt = now;
      console.log('📝 [saveFocusInitiative] 新規作成:', initiativeId, { data });
    } else {
      // 更新の場合
      if (existingData?.createdAt) {
        // createdAtは既存の値を保持
        data.createdAt = typeof existingData.createdAt === 'string' 
          ? existingData.createdAt 
          : (existingData.createdAt.toMillis ? new Date(existingData.createdAt.toMillis()).toISOString() : now);
      } else {
        data.createdAt = now;
      }
      console.log('🔄 [saveFocusInitiative] 更新:', initiativeId, { data });
    }
    
    console.log('💾 [saveFocusInitiative] setDoc呼び出し前:', { 
      collectionName: 'focusInitiatives', 
      docId: initiativeId, 
      dataKeys: Object.keys(data),
      topicIds: data.topicIds,
      themeIds: data.themeIds,
      data: JSON.stringify(data)
    });
    
    // setDocを呼び出す
    // Tauri環境ではcallTauriCommandを使用
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('./localFirebase');
      
      // themeIdsとtopicIdsをJSON文字列に変換
      const dataForDb: any = {
        ...data,
        themeIds: Array.isArray(data.themeIds) && data.themeIds.length > 0 ? JSON.stringify(data.themeIds) : null,
        topicIds: Array.isArray(data.topicIds) && data.topicIds.length > 0 ? JSON.stringify(data.topicIds) : null,
        method: Array.isArray(data.method) && data.method.length > 0 ? JSON.stringify(data.method) : null,
        means: Array.isArray(data.means) && data.means.length > 0 ? JSON.stringify(data.means) : null,
        relatedOrganizations: Array.isArray(data.relatedOrganizations) && data.relatedOrganizations.length > 0 ? JSON.stringify(data.relatedOrganizations) : null,
        relatedGroupCompanies: Array.isArray(data.relatedGroupCompanies) && data.relatedGroupCompanies.length > 0 ? JSON.stringify(data.relatedGroupCompanies) : null,
        methodDetails: data.methodDetails && Object.keys(data.methodDetails).length > 0 ? JSON.stringify(data.methodDetails) : null,
      };
      
      await callTauriCommand('doc_set', {
        collectionName: 'focusInitiatives',
        docId: initiativeId,
        data: dataForDb,
      });
      console.log('✅ [saveFocusInitiative] データベース保存成功（Tauri）:', initiativeId, {
        title: data.title,
        organizationId: data.organizationId,
        companyId: data.companyId,
        topicIds: data.topicIds,
        themeIds: data.themeIds,
      });
    } else {
      // フォールバック: Firestoreを使用
      await setDoc(docRef, data);
      console.log('✅ [saveFocusInitiative] データベース保存成功（Firestore）:', initiativeId, {
        title: data.title,
        topicIds: data.topicIds,
        themeIds: data.themeIds,
      });
    }
    
    // 保存後に確認のため再取得
    try {
      const { callTauriCommand } = await import('./localFirebase');
      const verifyResult = await callTauriCommand('doc_get', {
        collectionName: 'focusInitiatives',
        docId: initiativeId,
      });
      const verifyData = (verifyResult && verifyResult.data) ? verifyResult.data : verifyResult;
      console.log('🔍 [saveFocusInitiative] 保存後の確認:', {
        savedTopicIds: verifyData?.topicIds,
        savedThemeIds: verifyData?.themeIds,
        verifyDataKeys: verifyData ? Object.keys(verifyData) : [],
        fullVerifyData: JSON.stringify(verifyData, null, 2),
      });
    } catch (verifyError) {
      console.warn('⚠️ [saveFocusInitiative] 保存後の確認に失敗:', verifyError);
    }
    
    // テーマ側のinitiativeIdsも更新（双方向の関連付けを維持）
    if (data.themeIds && Array.isArray(data.themeIds) && data.themeIds.length > 0) {
      console.log('🔄 [saveFocusInitiative] テーマ側のinitiativeIdsを更新中...', { 
        themeIds: data.themeIds,
        initiativeId,
        existingDataExists: !!existingData,
        existingThemeIds: existingData?.themeIds 
      });
      
      // 既存のテーマデータを取得して更新
      const existingThemeIds = Array.isArray(existingData?.themeIds) ? existingData.themeIds : [];
      const newThemeIds = Array.isArray(data.themeIds) ? data.themeIds.filter((id: any) => id && typeof id === 'string') : [];
      
      // 削除されたテーマからこの注力施策IDを削除
      const removedThemeIds = existingThemeIds.filter(id => !newThemeIds.includes(id));
      for (const themeId of removedThemeIds) {
        try {
          if (!themeId) continue;
          const themeDocRef = doc(null, 'themes', themeId);
          const themeDoc = await getDoc(themeDocRef);
          if (themeDoc && typeof themeDoc.exists === 'function' && themeDoc.exists()) {
            const themeData = themeDoc.data();
            if (themeData) {
              const updatedInitiativeIds = Array.isArray(themeData.initiativeIds) 
                ? themeData.initiativeIds.filter((id: string) => id !== initiativeId)
                : [];
              
              await setDoc(themeDocRef, {
                ...themeData,
                initiativeIds: updatedInitiativeIds,
                updatedAt: new Date().toISOString(),
              });
              console.log(`✅ [saveFocusInitiative] テーマ「${themeId}」から注力施策IDを削除しました`);
            }
          }
        } catch (error: any) {
          console.warn(`⚠️ [saveFocusInitiative] テーマ「${themeId}」の更新に失敗しました:`, error);
        }
      }
      
      // 追加されたテーマにこの注力施策IDを追加
      for (const themeId of newThemeIds) {
        try {
          if (!themeId || typeof themeId !== 'string') {
            console.warn(`⚠️ [saveFocusInitiative] 無効なテーマIDをスキップ:`, themeId);
            continue;
          }
          
          console.log(`🔄 [saveFocusInitiative] テーマ「${themeId}」を更新中...`);
          const themeDocRef = doc(null, 'themes', themeId);
          
          if (!themeDocRef) {
            console.warn(`⚠️ [saveFocusInitiative] テーマDocRefの作成に失敗:`, themeId);
            continue;
          }
          
          const themeDoc = await getDoc(themeDocRef);
          
          if (!themeDoc) {
            console.warn(`⚠️ [saveFocusInitiative] テーマドキュメントの取得に失敗:`, themeId);
            continue;
          }
          
          if (typeof themeDoc.exists === 'function' && themeDoc.exists()) {
            const themeData = themeDoc.data();
            if (themeData && typeof themeData === 'object') {
              const existingInitiativeIds = Array.isArray(themeData.initiativeIds) ? themeData.initiativeIds : [];
              
              if (!existingInitiativeIds.includes(initiativeId)) {
                await setDoc(themeDocRef, {
                  ...themeData,
                  initiativeIds: [...existingInitiativeIds, initiativeId],
                  updatedAt: new Date().toISOString(),
                });
                console.log(`✅ [saveFocusInitiative] テーマ「${themeId}」に注力施策IDを追加しました`);
              } else {
                console.log(`ℹ️ [saveFocusInitiative] テーマ「${themeId}」には既に注力施策IDが含まれています`);
              }
            } else {
              console.warn(`⚠️ [saveFocusInitiative] テーマデータが無効です:`, themeId, themeData);
            }
          } else {
            console.warn(`⚠️ [saveFocusInitiative] テーマ「${themeId}」が見つかりません`);
          }
        } catch (error: any) {
          console.error(`❌ [saveFocusInitiative] テーマ「${themeId}」の更新に失敗しました:`, {
            errorMessage: error?.message,
            errorName: error?.name,
            errorStack: error?.stack,
            error: error
          });
        }
      }
    } else if (existingData?.themeIds && Array.isArray(existingData.themeIds) && existingData.themeIds.length > 0) {
      // themeIdsが空になった場合、既存のテーマからこの注力施策IDを削除
      console.log('🔄 [saveFocusInitiative] テーマ関連が削除されました。既存のテーマから注力施策IDを削除中...');
      for (const themeId of existingData.themeIds) {
        try {
          if (!themeId) continue;
          const themeDocRef = doc(null, 'themes', themeId);
          const themeDoc = await getDoc(themeDocRef);
          if (themeDoc && typeof themeDoc.exists === 'function' && themeDoc.exists()) {
            const themeData = themeDoc.data();
            if (themeData) {
              const updatedInitiativeIds = Array.isArray(themeData.initiativeIds) 
                ? themeData.initiativeIds.filter((id: string) => id !== initiativeId)
                : [];
              
              await setDoc(themeDocRef, {
                ...themeData,
                initiativeIds: updatedInitiativeIds,
                updatedAt: new Date().toISOString(),
              });
              console.log(`✅ [saveFocusInitiative] テーマ「${themeId}」から注力施策IDを削除しました`);
            }
          }
        } catch (error: any) {
          console.warn(`⚠️ [saveFocusInitiative] テーマ「${themeId}」の更新に失敗しました:`, error);
        }
      }
    }
    
    // JSONファイルにも保存
    try {
      const fullInitiative: FocusInitiative = {
        id: initiativeId,
        organizationId: data.organizationId,
        companyId: data.companyId,
        title: data.title,
        description: data.description,
        content: data.content,
        assignee: data.assignee,
        method: data.method,
        methodOther: data.methodOther,
        methodDetails: data.methodDetails,
        means: data.means,
        meansOther: data.meansOther,
        objective: data.objective,
        considerationPeriod: data.considerationPeriod,
        executionPeriod: data.executionPeriod,
        monetizationPeriod: data.monetizationPeriod,
        relatedOrganizations: data.relatedOrganizations,
        relatedGroupCompanies: data.relatedGroupCompanies,
        monetizationDiagram: data.monetizationDiagram,
        relationDiagram: data.relationDiagram,
        causeEffectDiagramId: data.causeEffectDiagramId,
        themeId: data.themeId,
        themeIds: data.themeIds,
        topicIds: data.topicIds,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      
      await saveInitiativeToJson(fullInitiative);
      console.log('✅ [saveFocusInitiative] JSONファイル保存成功:', initiativeId);
    } catch (jsonError: any) {
      // JSONファイルの保存に失敗しても、データベースへの保存は成功しているので警告のみ
      console.warn('⚠️ [saveFocusInitiative] JSONファイルの保存に失敗しました（データベースへの保存は成功）:', jsonError);
    }
    
    return initiativeId;
  } catch (error: any) {
    console.error('❌ [saveFocusInitiative] 保存失敗:', {
      errorMessage: error?.message,
      errorName: error?.name,
      errorStack: error?.stack,
      error: error,
      initiativeId: initiative.id || '未生成',
      organizationId: initiative.organizationId,
    });
    throw error;
  }
}

/**
 * Tauriダイアログを使用した確認
 * Tauri環境では、window.confirmを直接使用します（Tauriのネイティブダイアログは設定が必要なため）
 */
export async function tauriConfirm(message: string, title: string = '確認'): Promise<boolean> {
  try {
    console.log('🔔 [tauriConfirm] 開始:', { title, message: message.substring(0, 100) });
    
    // Tauri環境かどうかを確認
    const isTauri = typeof window !== 'undefined' && (
      '__TAURI__' in window || 
      window.location.port === '3010' ||
      (window.location.hostname === 'localhost' && window.location.port === '3010')
    );

    console.log('🔔 [tauriConfirm] 環境確認:', { isTauri, hasWindow: typeof window !== 'undefined' });

    // window.confirmは同期的な関数なので、Promiseでラップする必要はありませんが、
    // 非同期関数として扱うためにPromiseでラップします
    const fullMessage = `${title}\n\n${message}`;
    
    // Promiseでラップして、確実にbooleanを返すようにします
    return new Promise<boolean>((resolve) => {
      try {
        console.log('🔔 [tauriConfirm] window.confirmを呼び出します');
        const result = window.confirm(fullMessage);
        console.log('🔔 [tauriConfirm] window.confirmの結果:', result);
        resolve(result);
      } catch (error) {
        console.error('❌ [tauriConfirm] window.confirmでエラー:', error);
        // エラーが発生した場合は、デフォルトでfalseを返す
        resolve(false);
      }
    });
  } catch (error) {
    console.error('❌ [tauriConfirm] 確認ダイアログの表示に失敗しました:', error);
    // エラーが発生した場合は、デフォルトでfalseを返す
    return false;
  }
}

/**
 * Tauriダイアログを使用したアラート
 * Tauri環境では、window.alertを直接使用します（Tauriのネイティブダイアログは設定が必要なため）
 */
export async function tauriAlert(message: string, title: string = 'お知らせ'): Promise<void> {
  try {
    const isTauri = typeof window !== 'undefined' && (
      '__TAURI__' in window || 
      window.location.port === '3010' ||
      (window.location.hostname === 'localhost' && window.location.port === '3010')
    );

    if (isTauri) {
      // Tauri環境では、window.alertを直接使用
      // Tauriのネイティブダイアログを使用する場合は、プラグインの設定が必要です
      window.alert(`${title}\n\n${message}`);
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } catch (error) {
    console.warn('⚠️ [tauriAlert] アラートダイアログの表示に失敗しました。フォールバックを使用します。', error);
    window.alert(message);
  }
}

/**
 * 注力施策を削除
 */
export async function deleteFocusInitiative(initiativeId: string): Promise<void> {
  try {
    console.log('🗑️ [deleteFocusInitiative] 開始:', initiativeId);
    
    const docRef = doc(null, 'focusInitiatives', initiativeId);
    console.log('🗑️ [deleteFocusInitiative] docRef作成:', {
      collectionName: 'focusInitiatives', 
      docId: initiativeId 
    });
    
    // deleteDocを直接呼び出す
    console.log('🗑️ [deleteFocusInitiative] docRef.delete()を呼び出します...');
    const result = await docRef.delete();
    console.log('✅ [deleteFocusInitiative] docRef.delete()成功:', result);
    console.log('✅ [deleteFocusInitiative] 削除成功:', initiativeId);
  } catch (error: any) {
    console.error('❌ [deleteFocusInitiative] 削除失敗:', {
      initiativeId,
      errorMessage: error?.message,
      errorName: error?.name,
      errorCode: error?.errorCode,
      errorStack: error?.stack,
      error: error,
    });
    throw error;
  }
}

/**
 * すべての議事録を取得（組織ID指定なし）
 */
export async function getAllMeetingNotes(): Promise<MeetingNote[]> {
  try {
    console.log('📖 [getAllMeetingNotes] 開始');
    
    const { callTauriCommand } = await import('./localFirebase');
    
    try {
      const result = await callTauriCommand('collection_get', {
        collectionName: 'meetingNotes',
      });
      
      console.log('📖 [getAllMeetingNotes] collection_get結果:', result);
      
      const allNotes = Array.isArray(result) ? result : [];
      console.log('📖 [getAllMeetingNotes] 全データ数:', allNotes.length);
      
      const meetingNotes = allNotes.map((item: any) => {
        const data = item.data || item;
        return {
          id: data.id || item.id,
          organizationId: data.organizationId,
          companyId: data.companyId || undefined, // 事業会社IDも含める
          title: data.title || '',
          description: data.description || '',
          content: data.content || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as MeetingNote & { companyId?: string };
      });
      
      // createdAtでソート（新しい順）
      const sorted = meetingNotes.sort((a, b) => {
        const aTime = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt.toMillis ? a.createdAt.toMillis() : 0)) : 0;
        const bTime = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt.toMillis ? b.createdAt.toMillis() : 0)) : 0;
        return bTime - aTime;
      });
      
      console.log('✅ [getAllMeetingNotes] 取得成功:', sorted.length, '件');
      return sorted;
    } catch (collectionError: any) {
      console.error('📖 [getAllMeetingNotes] collection_getエラー:', collectionError);
      return [];
    }
  } catch (error) {
    console.error('❌ [getAllMeetingNotes] エラー:', error);
    return [];
  }
}

/**
 * 議事録を取得
 */
export async function getMeetingNotes(organizationId: string): Promise<MeetingNote[]> {
  try {
    console.log('📖 [getMeetingNotes] 開始:', { organizationId });
    
    const { callTauriCommand } = await import('./localFirebase');
    
    try {
      console.log('📖 [getMeetingNotes] collection_get呼び出し前:', { collectionName: 'meetingNotes' });
      const result = await callTauriCommand('collection_get', {
        collectionName: 'meetingNotes',
      });
      
      console.log('📖 [getMeetingNotes] collection_get結果:', {
        resultType: typeof result,
        isArray: Array.isArray(result),
        resultLength: Array.isArray(result) ? result.length : 'N/A',
        resultPreview: Array.isArray(result) ? result.slice(0, 3) : result,
      });
      
      const allNotes = Array.isArray(result) ? result : [];
      console.log('📖 [getMeetingNotes] 全データ数:', allNotes.length);
      
      if (allNotes.length > 0) {
        console.log('📖 [getMeetingNotes] サンプルデータ:', {
          firstNote: allNotes[0],
          sampleIds: allNotes.slice(0, 5).map((item: any) => ({
            id: item.id || item.data?.id,
            organizationId: item.data?.organizationId || item.organizationId,
            title: item.data?.title || item.title,
          })),
        });
      }
      
      const filtered = allNotes
        .filter((item: any) => {
          const data = item.data || item;
          const matches = data.organizationId === organizationId;
          if (!matches && allNotes.length > 0) {
            console.log('📖 [getMeetingNotes] フィルタ除外:', {
              itemId: data.id || item.id,
              itemOrganizationId: data.organizationId,
              targetOrganizationId: organizationId,
              match: matches,
            });
          }
          return matches;
        })
        .map((item: any) => {
          const data = item.data || item;
          return {
            id: data.id || item.id,
            organizationId: data.organizationId,
            title: data.title || '',
            description: data.description || '',
            content: data.content || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as MeetingNote;
        });
      
      console.log('📖 [getMeetingNotes] フィルタ後:', {
        filteredCount: filtered.length,
        filteredIds: filtered.map(n => n.id),
      });
      
      // createdAtでソート（新しい順）
      const sorted = filtered.sort((a, b) => {
        const aTime = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt.toMillis ? a.createdAt.toMillis() : 0)) : 0;
        const bTime = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt.toMillis ? b.createdAt.toMillis() : 0)) : 0;
        return bTime - aTime;
      });
      
      console.log('📖 [getMeetingNotes] 最終結果:', {
        count: sorted.length,
        notes: sorted.map(n => ({ id: n.id, title: n.title, organizationId: n.organizationId })),
      });
      return sorted;
    } catch (collectionError: any) {
      console.error('📖 [getMeetingNotes] collection_getエラー:', {
        error: collectionError,
        errorMessage: collectionError?.message,
        errorStack: collectionError?.stack,
        collectionName: 'meetingNotes',
      });
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getMeetingNotes] エラー:', {
      error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      organizationId,
    });
    return [];
  }
}

/**
 * 議事録を保存
 */
/**
 * 議事録のJSONファイルパスを取得するヘルパー関数
 */
async function getMeetingNoteJsonPath(noteId: string): Promise<string> {
  try {
    // アプリデータディレクトリのパスを取得
    const appDataPath = await callTauriCommand('get_path', {}) as string;
    const meetingNotesDir = path.join(appDataPath, 'meetingNotes');
    return path.join(meetingNotesDir, `${noteId}.json`);
  } catch (error) {
    console.error('アプリデータディレクトリの取得に失敗しました:', error);
    throw error;
  }
}

/**
 * JSONファイルに保存
 */
async function saveMeetingNoteToJson(note: MeetingNote): Promise<void> {
  try {
    const filePath = await getMeetingNoteJsonPath(note.id);
    
    // JSON文字列に変換
    const jsonString = JSON.stringify(note, null, 2);
    
    // ファイルに書き込み（write_fileコマンドが親ディレクトリを自動的に作成する）
    const result = await callTauriCommand('write_file', {
      filePath: filePath,
      data: jsonString,
    });
    
    if (!result.success) {
      throw new Error(result.error || 'JSONファイルの保存に失敗しました');
    }
    
    console.log('✅ [saveMeetingNoteToJson] JSONファイルに保存成功:', filePath);
  } catch (error: any) {
    console.error('❌ [saveMeetingNoteToJson] JSONファイルの保存に失敗しました:', error);
    throw error;
  }
}

export async function saveMeetingNote(note: Partial<MeetingNote>): Promise<string> {
  try {
    const noteId = note.id || generateMeetingNoteId();
    console.log('💾 [saveMeetingNote] 開始:', { noteId, organizationId: note.organizationId, title: note.title });
    
    // organizationIdがorganizationsテーブルに存在するか確認
    if (note.organizationId) {
      try {
        const orgDocRef = doc(null, 'organizations', note.organizationId);
        const orgDoc = await getDoc(orgDocRef);
        if (!orgDoc.exists()) {
          throw new Error(`組織ID "${note.organizationId}" がorganizationsテーブルに存在しません`);
        }
        console.log('✅ [saveMeetingNote] 組織IDの存在確認成功:', note.organizationId);
      } catch (orgCheckError: any) {
        const errorMessage = orgCheckError?.message || String(orgCheckError || '');
        if (errorMessage.includes('存在しません')) {
          throw new Error(`組織ID "${note.organizationId}" がorganizationsテーブルに存在しません。組織一覧ページから正しい組織を選択してください。`);
        }
        // その他のエラーは警告のみ（組織が存在しない可能性があるが、続行を試みる）
        console.warn('⚠️ [saveMeetingNote] 組織IDの存在確認でエラー（続行します）:', errorMessage);
      }
    } else {
      throw new Error('organizationIdが指定されていません');
    }
    
    const docRef = doc(null, 'meetingNotes', noteId);
    
    const now = new Date().toISOString();
    
    const data: any = {
      id: noteId,
      organizationId: note.organizationId!,
      title: note.title || '',
      description: note.description || '',
      content: note.content || '',
      updatedAt: now,
    };
    
    // 既存ドキュメントの確認
    try {
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        const existingData = existingDoc.data() as MeetingNote;
        if (existingData?.createdAt) {
          data.createdAt = typeof existingData.createdAt === 'string' 
            ? existingData.createdAt 
            : (existingData.createdAt.toMillis ? new Date(existingData.createdAt.toMillis()).toISOString() : now);
        } else {
          data.createdAt = now;
        }
        console.log('💾 [saveMeetingNote] 既存ドキュメントを更新:', noteId);
      } else {
        data.createdAt = now;
        console.log('💾 [saveMeetingNote] 新規ドキュメントを作成:', noteId);
      }
    } catch (getDocError: any) {
      console.warn('⚠️ [saveMeetingNote] 既存ドキュメント確認エラー（新規作成として続行）:', getDocError?.message || getDocError);
      data.createdAt = now;
    }
    
    console.log('💾 [saveMeetingNote] setDoc呼び出し前:', { 
      collectionName: 'meetingNotes', 
      docId: noteId, 
      data: {
        id: data.id,
        organizationId: data.organizationId,
        title: data.title,
        description: data.description ? data.description.substring(0, 50) + '...' : '',
        content: data.content ? data.content.substring(0, 50) + '...' : '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
    });
    
    try {
      await setDoc(docRef, data);
      console.log('✅ [saveMeetingNote] データベース保存成功:', noteId);
    } catch (setDocError: any) {
      console.error('❌ [saveMeetingNote] setDoc呼び出しエラー:', {
        error: setDocError,
        errorMessage: setDocError?.message,
        errorStack: setDocError?.stack,
        collectionName: 'meetingNotes',
        docId: noteId,
        dataKeys: Object.keys(data),
      });
      throw new Error(`議事録の保存に失敗しました: ${setDocError?.message || '不明なエラー'}`);
    }
    
    // JSONファイルにも保存
    try {
      const fullNote: MeetingNote = {
        id: data.id,
        organizationId: data.organizationId,
        title: data.title,
        description: data.description,
        content: data.content,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      await saveMeetingNoteToJson(fullNote);
    } catch (jsonError) {
      console.warn('⚠️ [saveMeetingNote] JSONファイルの保存に失敗しましたが、データベースには保存済み:', jsonError);
      // JSONファイルの保存失敗は警告のみで続行
    }
    
    return noteId;
  } catch (error: any) {
    console.error('❌ [saveMeetingNote] 保存失敗:', error);
    throw error;
  }
}

/**
 * 議事録を取得（ID指定）
 */
export async function getMeetingNoteById(noteId: string): Promise<MeetingNote | null> {
  try {
    console.log('📖 [getMeetingNoteById] 開始:', { noteId });
    
    const { callTauriCommand } = await import('./localFirebase');
    
    try {
      const result = await callTauriCommand('doc_get', {
        collectionName: 'meetingNotes',
        docId: noteId,
      });
      
      console.log('📖 [getMeetingNoteById] doc_get結果:', result);
      
      const data = (result && result.data) ? result.data : result;
      
      if (data && (data.id || data.title || data.organizationId)) {
        const note: MeetingNote = {
          id: data.id || noteId,
          organizationId: data.organizationId || '',
          companyId: data.companyId || undefined, // 事業会社IDも含める
          title: data.title || '',
          description: data.description || '',
          content: data.content || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        
        console.log('📖 [getMeetingNoteById] 変換後:', {
          id: note.id,
          title: note.title,
          description: note.description,
          contentLength: note.content?.length || 0,
          companyId: note.companyId,
        });
        return note;
      }
      
      console.warn('📖 [getMeetingNoteById] データが見つかりませんでした。result:', result);
      return null;
    } catch (docError: any) {
      console.error('📖 [getMeetingNoteById] doc_getエラー:', docError);
      return null;
    }
  } catch (error: any) {
    console.error('❌ [getMeetingNoteById] エラー:', error);
    return null;
  }
}

/**
 * データベース操作のリトライ関数
 */
async function retryDbOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  delayMs: number = 200
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || String(error || '');
      const errorString = String(error || '');
      const isLocked = errorMessage.includes('database is locked') || errorString.includes('database is locked');
      
      if (isLocked && i < maxRetries - 1) {
        // 指数バックオフ: 200ms, 400ms, 800ms, 1600ms, 3200ms
        const waitTime = delayMs * Math.pow(2, i);
        console.log(`⚠️ [retryDbOperation] データベースロック検出、${waitTime}ms後にリトライ... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * 議事録を削除
 * 関連するtopics、relationsも削除する
 * バッチ削除を使用して1つのトランザクションで実行（データベースロックを最小化）
 */
export async function deleteMeetingNote(noteId: string): Promise<void> {
  console.log('🗑️ [deleteMeetingNote] 開始（バッチ削除）:', noteId);
  
  const { callTauriCommand } = await import('./localFirebase');
  
  // ChromaDB削除用にtopicsを事前取得
  let topicEmbeddings: any[] = [];
  try {
    const result = await callTauriCommand('query_get', {
      collectionName: 'topics',
      conditions: {
        meetingNoteId: noteId,
      },
    });
    topicEmbeddings = Array.isArray(result) ? result : (result?.data ? [result.data] : []);
    console.log(`📊 [deleteMeetingNote] 関連するtopics: ${topicEmbeddings.length}件（ChromaDB削除用）`);
  } catch (error: any) {
    console.warn('⚠️ [deleteMeetingNote] topicsの取得エラー（ChromaDB削除用、続行します）:', error);
  }
  
  // 議事録情報を取得（ChromaDB削除用）
  let meetingNote: MeetingNote | null = null;
  try {
    meetingNote = await getMeetingNoteById(noteId);
  } catch (error: any) {
    console.warn('⚠️ [deleteMeetingNote] 議事録情報の取得エラー（ChromaDB削除用、続行します）:', error);
  }
  
  try {
    // バッチ削除コマンドを使用（1つのトランザクションで全て削除）
    console.log('🗑️ [deleteMeetingNote] バッチ削除コマンドを呼び出します:', noteId);
    await retryDbOperation(async () => {
      const result = await callTauriCommand('delete_meeting_note_with_relations', {
        noteId: noteId,
      });
      console.log('✅ [deleteMeetingNote] バッチ削除成功:', noteId, result);
      return result;
    }, 5, 300);
    
    console.log(`✅ [deleteMeetingNote] 削除成功: ${noteId}`);
  } catch (error: any) {
    // エラーメッセージを詳細に取得
    const errorMessage = error?.message || 
                        error?.error || 
                        error?.errorString || 
                        (typeof error === 'string' ? error : String(error || ''));
    
    console.error('❌ [deleteMeetingNote] バッチ削除失敗:', {
      error,
      errorMessage,
      errorType: typeof error,
      errorKeys: error ? Object.keys(error) : [],
      noteId,
    });
    
    // エラーが発生した場合は再試行
    if (errorMessage.includes('database is locked') || errorMessage.includes('locked')) {
      console.log('🔄 [deleteMeetingNote] データベースロック検出、1秒待機後に再試行...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        await retryDbOperation(async () => {
          const result = await callTauriCommand('delete_meeting_note_with_relations', {
            noteId: noteId,
          });
          console.log('✅ [deleteMeetingNote] バッチ削除成功（再試行）:', noteId, result);
          return result;
        }, 5, 300);
        console.log('✅ [deleteMeetingNote] 削除成功（再試行後）:', noteId);
      } catch (retryError: any) {
        const retryErrorMessage = retryError?.message || 
                                 retryError?.error || 
                                 String(retryError || '');
        console.error('❌ [deleteMeetingNote] 再試行も失敗:', {
          retryError,
          retryErrorMessage,
          noteId,
        });
        throw new Error(`議事録の削除に失敗しました（データベースロック）: ${retryErrorMessage || '不明なエラー'}`);
      }
    } else {
      throw new Error(`議事録の削除に失敗しました: ${errorMessage || '不明なエラー'}`);
    }
  }
  
  // ChromaDBからも削除（非同期、エラーは無視）
  if (meetingNote && topicEmbeddings.length > 0) {
    (async () => {
      try {
        const { callTauriCommand: chromaCallTauriCommand } = await import('./localFirebase');
        
        for (const topicEmbedding of topicEmbeddings) {
          const topicEmbeddingData = topicEmbedding.data || topicEmbedding;
          const topicId = topicEmbeddingData.topicId;
          if (!topicId) continue;
          
          try {
            await chromaCallTauriCommand('chromadb_delete_topic_embedding', {
              topicId: topicId,
              organizationId: meetingNote.organizationId,
            });
            console.log(`✅ [deleteMeetingNote] ChromaDBトピック埋め込み削除: ${topicId}`);
          } catch (error: any) {
            console.warn(`⚠️ [deleteMeetingNote] ChromaDBトピック埋め込み削除エラー（続行します）: ${topicId}`, error);
          }
        }
      } catch (error: any) {
        console.warn('⚠️ [deleteMeetingNote] ChromaDB削除エラー（続行します）:', error);
      }
    })();
  }
}

/**
 * 組織コンテンツを取得
 */
export async function getOrganizationContent(organizationId: string): Promise<OrganizationContent | null> {
  try {
    const docRef = doc(null, 'organizationContents', organizationId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as OrganizationContent;
    }
    return null;
  } catch (error) {
    console.error('組織コンテンツの取得に失敗しました:', error);
    return null;
  }
}

/**
 * 組織コンテンツを保存
 */
export async function saveOrganizationContent(
  organizationId: string,
  content: Partial<Omit<OrganizationContent, 'organizationId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    console.log('💾 [saveOrganizationContent] 開始:', { organizationId, content });
    
    const docRef = doc(null, 'organizationContents', organizationId);
    
    // 既存データを取得
    let existingData: OrganizationContent | null = null;
    try {
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        existingData = existingDoc.data() as OrganizationContent;
        console.log('📖 [saveOrganizationContent] 既存データを取得:', existingData);
      } else {
        console.log('📝 [saveOrganizationContent] 新規作成');
      }
    } catch (getError: any) {
      console.warn('⚠️ [saveOrganizationContent] 既存データ取得エラー（続行します）:', getError);
      // テーブルが存在しない可能性があるが、続行
    }
    
    let data: any;
    
    if (existingData) {
      // 既存データを取得してマージ
      data = {
        ...existingData,
        ...content,
        organizationId, // organizationIdを確実に設定
        updatedAt: serverTimestamp(),
      };
      // createdAtは既存のものを保持
      if (existingData.createdAt) {
        data.createdAt = existingData.createdAt;
      }
    } else {
      // 新規作成
      data = {
        id: organizationId,
        organizationId,
        introduction: content.introduction || '',
        focusAreas: content.focusAreas || '',
        meetingNotes: content.meetingNotes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
    }
    
    console.log('💾 [saveOrganizationContent] 保存するデータ:', data);
    
    await setDoc(docRef, data);
    console.log('✅ [saveOrganizationContent] 組織コンテンツを保存しました:', organizationId);
  } catch (error: any) {
    console.error('❌ [saveOrganizationContent] 組織コンテンツの保存に失敗しました:', error);
    console.error('❌ [saveOrganizationContent] エラー詳細:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      error: error,
    });
    throw error;
  }
}

/**
 * テーマのユニークIDを生成
 */
export function generateUniqueThemeId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `theme_${timestamp}_${randomPart}`;
}

/**
 * 全テーマを取得（SQLiteから取得）
 */
export async function getThemes(): Promise<Theme[]> {
  try {
    console.log('📖 [getThemes] 開始（SQLiteから取得）');
    
    // Tauri環境では直接Tauriコマンドを使用（CORSエラーを回避）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('./localFirebase');
      
      try {
        // SQLiteから直接取得するコマンドを使用
        const result = await callTauriCommand('get_themes_cmd', {});
        
        if (!result || !Array.isArray(result)) {
          console.log('⚠️ [getThemes] 結果が配列ではありません:', result);
          return [];
        }
        
        const themes: Theme[] = result.map((item: any) => {
          // initiativeIdsを配列に変換
          let initiativeIds: string[] = [];
          if (item.initiativeIds) {
            if (Array.isArray(item.initiativeIds)) {
              initiativeIds = item.initiativeIds;
            } else if (typeof item.initiativeIds === 'string') {
              try {
                initiativeIds = JSON.parse(item.initiativeIds);
              } catch (e) {
                console.warn('⚠️ [getThemes] initiativeIdsのパースエラー:', e);
                initiativeIds = [];
              }
            }
          }
          
          return {
            id: item.id,
            title: item.title || '',
            description: item.description || '',
            initiativeIds: initiativeIds,
            position: item.position ?? null,
            createdAt: item.createdAt || null,
            updatedAt: item.updatedAt || null,
          };
        }).filter((theme: Theme) => theme.id && theme.title);
        
        console.log('✅ [getThemes] 取得成功（SQLiteから直接取得）:', themes.length, '件');
        console.log('📊 [getThemes] position一覧:', themes.map(t => `${t.id}:${t.position ?? 'null'}`).join(', '));
        return themes;
      } catch (error: any) {
        console.error('❌ [getThemes] Tauriコマンドエラー:', error);
        return [];
      }
    }
    
    // フォールバック: Rust API経由
    const { apiGet } = await import('./apiClient');
    
    try {
      const result = await apiGet<Theme[]>('/api/themes');
      
      console.log('📖 [getThemes] API結果:', result);
      
      const themes = Array.isArray(result) ? result : [];
      console.log('📖 [getThemes] 全データ数:', themes.length);
      
      // デバッグ: データベースから取得した生データをログ出力
      if (themes.length > 0) {
        console.log('📖 [getThemes] 生データサンプル (最初の1件):', JSON.stringify(themes[0], null, 2));
      }
      
      // initiativeIdsが配列でない場合は配列に変換
      const normalizedThemes = themes.map((theme: any) => ({
        ...theme,
        initiativeIds: Array.isArray(theme.initiativeIds) 
          ? theme.initiativeIds 
          : (theme.initiativeIds ? [theme.initiativeIds].filter(Boolean) : []),
      })).filter((theme: Theme) => theme.id && theme.title);
      
      console.log('✅ [getThemes] 取得成功:', normalizedThemes.length, '件');
      return normalizedThemes;
    } catch (error: any) {
      console.error('❌ [getThemes] APIエラー:', error);
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getThemes] エラー:', error);
    return [];
  }
}

/**
 * テーマを取得（ID指定、SQLiteから取得）
 */
export async function getThemeById(themeId: string): Promise<Theme | null> {
  try {
    console.log('📖 [getThemeById] 開始（SQLiteから取得）:', { themeId });
    
    const { apiGet } = await import('./apiClient');
    
    try {
      const result = await apiGet<Theme>(`/api/themes/${themeId}`);
      
      console.log('📖 [getThemeById] API結果:', result);
      
      if (result && (result.id || result.title)) {
        const theme: Theme = {
          ...result,
          initiativeIds: Array.isArray(result.initiativeIds) 
            ? result.initiativeIds 
            : (result.initiativeIds ? [result.initiativeIds].filter(Boolean) : []),
        };
        
        console.log('✅ [getThemeById] 取得成功');
        return theme;
      }
      
      console.log('⚠️ [getThemeById] データが見つかりませんでした');
      return null;
    } catch (error: any) {
      // 404エラーの場合はnullを返す
      if (error.message && error.message.includes('404')) {
        console.log('⚠️ [getThemeById] テーマが見つかりませんでした');
        return null;
      }
      console.error('❌ [getThemeById] APIエラー:', error);
      return null;
    }
  } catch (error: any) {
    console.error('❌ [getThemeById] エラー:', error);
    return null;
  }
}

/**
 * テーマを保存（SQLiteに保存）
 */
export async function saveTheme(theme: Partial<Theme>): Promise<string> {
  try {
    const themeId = theme.id || generateUniqueThemeId();
    console.log('💾 [saveTheme] 開始（SQLiteに保存）:', { 
      themeId, 
      title: theme.title,
      hasId: !!theme.id 
    });
    
    // Tauri環境では直接Tauriコマンドを使用（CORSエラーを回避）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('./localFirebase');
      
      const themeData: any = {
        id: themeId,
        title: theme.title || '',
        description: theme.description || '',
        initiativeIds: Array.isArray(theme.initiativeIds) ? theme.initiativeIds : (theme.initiativeIds ? [theme.initiativeIds].filter(Boolean) : []),
        createdAt: theme.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // initiativeIdsをJSON文字列に変換
      if (Array.isArray(themeData.initiativeIds)) {
        themeData.initiativeIds = JSON.stringify(themeData.initiativeIds);
      }
      
      await callTauriCommand('doc_set', {
        collectionName: 'themes',
        docId: themeId,
        data: themeData,
      });
      
      console.log('✅ [saveTheme] テーマを保存しました（Tauriコマンド経由）:', themeId);
      return themeId;
    }
    
    // フォールバック: Rust API経由
    const { apiPost, apiPut } = await import('./apiClient');
    
    const themeData: any = {
      title: theme.title || '',
      description: theme.description || '',
      initiativeIds: Array.isArray(theme.initiativeIds) ? theme.initiativeIds : [],
    };
    
    let savedTheme: Theme;
    
    if (theme.id) {
      // 更新
      console.log('📝 [saveTheme] 既存テーマを更新:', themeId);
      savedTheme = await apiPut<Theme>(`/api/themes/${themeId}`, themeData);
    } else {
      // 新規作成
      console.log('📝 [saveTheme] 新規テーマを作成');
      savedTheme = await apiPost<Theme>('/api/themes', themeData);
    }
    
    console.log('✅ [saveTheme] テーマを保存しました:', savedTheme.id);
    return savedTheme.id;
  } catch (error: any) {
    console.error('❌ [saveTheme] テーマの保存に失敗しました:', error);
    throw error;
  }
}

/**
 * テーマを削除（SQLiteから削除）
 */
export async function deleteTheme(themeId: string): Promise<void> {
  try {
    console.log('🗑️ [deleteTheme] 開始（SQLiteから削除）:', { themeId });
    
    // Tauri環境では直接Tauriコマンドを使用（CORSエラーを回避）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('./localFirebase');
      
      await callTauriCommand('doc_delete', {
        collectionName: 'themes',
        docId: themeId,
      });
      
      console.log('✅ [deleteTheme] テーマを削除しました（Tauriコマンド経由）:', themeId);
      return;
    }
    
    // フォールバック: Rust API経由
    const { apiDelete } = await import('./apiClient');
    
    await apiDelete(`/api/themes/${themeId}`);
    
    console.log('✅ [deleteTheme] テーマを削除しました:', themeId);
  } catch (error: any) {
    console.error('❌ [deleteTheme] テーマの削除に失敗しました:', error);
    throw error;
  }
}

/**
 * 複数のテーマのpositionを一括更新
 */
export async function updateThemePositions(
  updates: Array<{ themeId: string; position: number }>
): Promise<void> {
  try {
    console.log('🔄 [updateThemePositions] 開始:', updates.length, '件');
    
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('./localFirebase');
      
      // Tauriコマンド経由で更新
      // updatesをタプルの配列に変換
      const updatesArray: Array<[string, number]> = updates.map(u => [u.themeId, u.position]);
      await callTauriCommand('update_theme_positions_cmd', {
        updates: updatesArray,
      });
      
      console.log('✅ [updateThemePositions] 更新完了');
    } else {
      // フォールバック: Rust API経由
      const { apiPost } = await import('./apiClient');
      await apiPost('/api/themes/positions', { updates });
    }
  } catch (error: any) {
    console.error('❌ [updateThemePositions] 更新に失敗しました:', error);
    throw error;
  }
}

/**
 * すべての個別トピックを取得
 * すべての議事録から個別トピックを抽出して返す
 */
export interface TopicInfo {
  id: string;
  title: string;
  content: string;
  meetingNoteId: string;
  meetingNoteTitle: string;
  itemId: string;
  organizationId: string;
  companyId?: string; // 事業会社ID（事業会社の議事録の場合）
  topicDate?: string | null; // トピックの日時（isAllPeriodsがtrueの場合は無視される）
  isAllPeriods?: boolean; // 全期間に反映するかどうか（trueの場合は日付に関係なく全期間に表示）
  // メタデータ
  semanticCategory?: TopicSemanticCategory;
  importance?: 'high' | 'medium' | 'low';
  keywords?: string[];
  summary?: string;
}

/**
 * 指定された議事録の個別トピックを取得
 */
export async function getTopicsByMeetingNote(meetingNoteId: string): Promise<TopicInfo[]> {
  try {
    console.log('📖 [getTopicsByMeetingNote] 開始:', { meetingNoteId });
    
    const meetingNote = await getMeetingNoteById(meetingNoteId);
    if (!meetingNote) {
      console.warn('⚠️ [getTopicsByMeetingNote] 議事録が見つかりません:', meetingNoteId);
      return [];
    }
    
    if (!meetingNote.content) {
      console.warn('⚠️ [getTopicsByMeetingNote] 議事録のcontentが空です:', meetingNoteId);
      return [];
    }
    
    const topics: TopicInfo[] = [];
    
    try {
      const parsed = JSON.parse(meetingNote.content) as Record<string, {
        summary?: string;
        summaryId?: string;
        items?: Array<{
          id: string;
          title: string;
          content: string;
          date?: string;
          topics?: Array<{
            id: string;
            title: string;
            content: string;
            mentionedDate?: string | null;
            isAllPeriods?: boolean;
          }>;
        }>;
      }>;
      
      console.log('📖 [getTopicsByMeetingNote] パース成功。タブ数:', Object.keys(parsed).length);
      
      let totalItems = 0;
      let totalTopicsInItems = 0;
      
      for (const [tabId, tabData] of Object.entries(parsed)) {
        if (!tabData.items || !Array.isArray(tabData.items)) {
          console.log(`📖 [getTopicsByMeetingNote] タブ ${tabId} にitemsがありません`);
          continue;
        }
        
        totalItems += tabData.items.length;
        
        for (const item of tabData.items) {
          if (!item.topics || !Array.isArray(item.topics)) {
            continue;
          }
          
          totalTopicsInItems += item.topics.length;
          
          for (const topic of item.topics) {
            if (!topic.id || !topic.title) {
              console.warn(`⚠️ [getTopicsByMeetingNote] トピックにidまたはtitleがありません:`, { topicId: topic.id, title: topic.title });
              continue;
            }
            
            // topicDateの優先順位: topic.mentionedDate > item.date > undefined
            const topicDate = topic.mentionedDate !== undefined 
              ? topic.mentionedDate 
              : (item.date || undefined);
            
            // isAllPeriodsは明示的に設定されている場合のみ使用（デフォルトはfalse）
            const isAllPeriods = topic.isAllPeriods === true;
            
            topics.push({
              id: topic.id,
              title: topic.title,
              content: topic.content || '',
              meetingNoteId: meetingNote.id,
              meetingNoteTitle: meetingNote.title,
              itemId: item.id,
              organizationId: meetingNote.organizationId,
              companyId: (meetingNote as any).companyId || undefined, // 事業会社IDも含める
              topicDate: topicDate,
              isAllPeriods: isAllPeriods,
            });
          }
        }
      }
      
      console.log(`📖 [getTopicsByMeetingNote] 処理完了: items=${totalItems}, topics in items=${totalTopicsInItems}, 抽出したtopics=${topics.length}`);
      
      if (topics.length === 0 && totalTopicsInItems > 0) {
        console.warn('⚠️ [getTopicsByMeetingNote] トピックが存在するのに抽出できませんでした。構造を確認してください。');
      }
    } catch (parseError) {
      console.error('❌ [getTopicsByMeetingNote] 議事録のパースエラー:', {
        meetingNoteId,
        error: parseError,
        contentPreview: meetingNote.content?.substring(0, 200),
      });
    }
    
    console.log('✅ [getTopicsByMeetingNote] 取得成功:', topics.length, '件');
    if (topics.length > 0) {
      console.log('📖 [getTopicsByMeetingNote] トピックIDのサンプル:', topics.slice(0, 3).map(t => t.id));
    }
    return topics;
  } catch (error: any) {
    console.error('❌ [getTopicsByMeetingNote] エラー:', error);
    return [];
  }
}

export async function getAllTopics(organizationId: string): Promise<TopicInfo[]> {
  try {
    console.log('📖 [getAllTopics] 開始:', { organizationId });
    
    // すべての議事録を取得
    const meetingNotes = await getMeetingNotes(organizationId);
    console.log('📖 [getAllTopics] 議事録数:', meetingNotes.length);
    
    const allTopics: TopicInfo[] = [];
    
    // 各議事録から個別トピックを抽出
    for (const note of meetingNotes) {
      if (!note.content) continue;
      
      try {
        // contentをJSONとしてパース
        const parsed = JSON.parse(note.content) as Record<string, {
          summary?: string;
          summaryId?: string;
          items?: Array<{
            id: string;
            title: string;
            content: string;
            date?: string;
            topics?: Array<{
              id: string;
              title: string;
              content: string;
              semanticCategory?: string;
              importance?: string;
              keywords?: string | string[];
              summary?: string;
              mentionedDate?: string | null;
              isAllPeriods?: boolean;
            }>;
          }>;
        }>;
        
        // 各月・総括タブのitemsからトピックを抽出
        for (const [tabId, tabData] of Object.entries(parsed)) {
          if (!tabData.items || !Array.isArray(tabData.items)) continue;
          
          for (const item of tabData.items) {
            if (!item.topics || !Array.isArray(item.topics)) continue;
            
            for (const topic of item.topics) {
              if (!topic.id || !topic.title) continue;
              
              // キーワードを配列に変換（文字列の場合はカンマ区切りで分割）
              let keywords: string[] | undefined;
              if (topic.keywords) {
                if (Array.isArray(topic.keywords)) {
                  keywords = topic.keywords;
                } else if (typeof topic.keywords === 'string') {
                  keywords = topic.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
                }
              }
              
              // topicDateの優先順位: topic.mentionedDate > item.date > undefined
              const topicDate = topic.mentionedDate !== undefined 
                ? topic.mentionedDate 
                : (item.date || undefined);
              
              // isAllPeriodsは明示的に設定されている場合のみ使用（デフォルトはfalse）
              const isAllPeriods = topic.isAllPeriods === true;
              
              allTopics.push({
                id: topic.id,
                title: topic.title,
                content: topic.content || '',
                meetingNoteId: note.id,
                meetingNoteTitle: note.title,
                itemId: item.id,
                organizationId: note.organizationId,
                companyId: (note as any).companyId || undefined, // 事業会社IDも含める
                topicDate: topicDate,
                isAllPeriods: isAllPeriods,
                semanticCategory: topic.semanticCategory as TopicInfo['semanticCategory'],
                importance: topic.importance as TopicInfo['importance'],
                keywords,
                summary: topic.summary,
              });
            }
          }
        }
      } catch (parseError) {
        console.warn('⚠️ [getAllTopics] 議事録のパースエラー:', {
          noteId: note.id,
          error: parseError,
        });
        continue;
      }
    }
    
    console.log('✅ [getAllTopics] 取得成功:', allTopics.length, '件');
    return allTopics;
  } catch (error: any) {
    console.error('❌ [getAllTopics] エラー:', error);
    return [];
  }
}

/**
 * 全組織のトピックを一括取得（パフォーマンス最適化版）
 * 組織ごとに個別にAPI呼び出しするのではなく、全議事録を一度に取得して処理
 */
export async function getAllTopicsBatch(): Promise<TopicInfo[]> {
  try {
    console.log('📖 [getAllTopicsBatch] 開始: 全組織のトピックを一括取得');
    
    // すべての議事録を一度に取得
    const allMeetingNotes = await getAllMeetingNotes();
    console.log('📖 [getAllTopicsBatch] 全議事録数:', allMeetingNotes.length);
    
    const allTopics: TopicInfo[] = [];
    
    // 各議事録から個別トピックを抽出
    for (const note of allMeetingNotes) {
      if (!note.content) continue;
      
      try {
        // contentをJSONとしてパース
        const parsed = JSON.parse(note.content) as Record<string, {
          summary?: string;
          summaryId?: string;
          items?: Array<{
            id: string;
            title: string;
            content: string;
            date?: string;
            topics?: Array<{
              id: string;
              title: string;
              content: string;
              semanticCategory?: string;
              importance?: string;
              keywords?: string | string[];
              summary?: string;
              mentionedDate?: string | null;
              isAllPeriods?: boolean;
            }>;
          }>;
        }>;
        
        // 各月・総括タブのitemsからトピックを抽出
        for (const [tabId, tabData] of Object.entries(parsed)) {
          if (!tabData.items || !Array.isArray(tabData.items)) continue;
          
          for (const item of tabData.items) {
            if (!item.topics || !Array.isArray(item.topics)) continue;
            
            for (const topic of item.topics) {
              if (!topic.id || !topic.title) continue;
              
              // キーワードを配列に変換（文字列の場合はカンマ区切りで分割）
              let keywords: string[] | undefined;
              if (topic.keywords) {
                if (Array.isArray(topic.keywords)) {
                  keywords = topic.keywords;
                } else if (typeof topic.keywords === 'string') {
                  keywords = topic.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
                }
              }
              
              // topicDateの優先順位: topic.mentionedDate > item.date > undefined
              const topicDate = topic.mentionedDate !== undefined 
                ? topic.mentionedDate 
                : (item.date || undefined);
              
              // isAllPeriodsは明示的に設定されている場合のみ使用（デフォルトはfalse）
              const isAllPeriods = topic.isAllPeriods === true;
              
              allTopics.push({
                id: topic.id,
                title: topic.title,
                content: topic.content || '',
                meetingNoteId: note.id,
                meetingNoteTitle: note.title,
                itemId: item.id,
                organizationId: note.organizationId,
                companyId: (note as any).companyId || undefined, // 事業会社IDも含める
                topicDate: topicDate,
                isAllPeriods: isAllPeriods,
                semanticCategory: topic.semanticCategory as TopicInfo['semanticCategory'],
                importance: topic.importance as TopicInfo['importance'],
                keywords,
                summary: topic.summary,
              });
            }
          }
        }
      } catch (parseError) {
        console.warn('⚠️ [getAllTopicsBatch] 議事録のパースエラー:', {
          noteId: note.id,
          error: parseError,
        });
        continue;
      }
    }
    
    console.log('✅ [getAllTopicsBatch] 取得成功:', allTopics.length, '件');
    return allTopics;
  } catch (error: any) {
    console.error('❌ [getAllTopicsBatch] エラー:', error);
    return [];
  }
}

/**
 * 全組織のメンバーを一括取得（パフォーマンス最適化版）
 * 組織IDのリストを受け取り、並列で取得
 */
export async function getAllMembersBatch(organizationIds: string[]): Promise<Array<{ id: string; name: string; position?: string; organizationId: string }>> {
  try {
    console.log('📖 [getAllMembersBatch] 開始:', { organizationCount: organizationIds.length });
    
    // 並列で全組織のメンバーを取得（エラーは個別に処理）
    const memberPromises = organizationIds.map(async (orgId) => {
      try {
        const members = await getOrgMembers(orgId);
        return members.map(m => ({
          id: m.id,
          name: m.name,
          position: m.position,
          organizationId: orgId,
        }));
      } catch (error) {
        // エラーは警告のみ（処理は続行）
        console.warn('⚠️ [getAllMembersBatch] 組織のメンバー取得エラー（無視します）:', { orgId, error });
        return [];
      }
    });
    
    // Promise.allSettledを使用して、一部のリクエストが失敗しても続行
    const results = await Promise.allSettled(memberPromises);
    const allMembersArrays = results
      .filter((result) => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<Array<{ id: string; name: string; position?: string; organizationId: string }>>).value);
    const allMembers = allMembersArrays.flat();
    
    console.log('✅ [getAllMembersBatch] 取得成功:', allMembers.length, '件');
    return allMembers;
  } catch (error: any) {
    // 予期しないエラーでも空配列を返して処理を続行
    console.warn('⚠️ [getAllMembersBatch] エラー（無視します）:', error);
    return [];
  }
}

// 注意: importOrganizationMasterFromCSV関数は削除されました（organization_masterテーブルが削除されたため）
