/**
 * テスト用組織データの作成・削除機能
 * 
 * 使用方法（ブラウザコンソールから）:
 * 1. テストデータの作成:
 *    window.createTestOrgs()
 * 
 * 2. テストデータの削除:
 *    window.deleteTestOrgs()
 * 
 * 3. テストデータの確認:
 *    window.listTestOrgs()
 */

import { createOrg, deleteOrg, getOrgTreeFromDb } from './orgApi';
import { callTauriCommand } from './localFirebase';

// テスト用の組織データ定義
const TEST_ORG_DATA = {
  name: '[テスト] テスト部門',
  title: 'テスト部門',
  description: '動作確認用のテスト組織です。テスト終了後に削除予定です。',
  children: [
    {
      name: '[テスト] テスト課A',
      title: 'テスト課A',
      description: 'テスト用の課A',
      children: [
        {
          name: '[テスト] テストチーム1',
          title: 'テストチーム1',
          description: 'テスト用のチーム1',
        },
        {
          name: '[テスト] テストチーム2',
          title: 'テストチーム2',
          description: 'テスト用のチーム2',
        },
      ],
    },
    {
      name: '[テスト] テスト課B',
      title: 'テスト課B',
      description: 'テスト用の課B',
      children: [
        {
          name: '[テスト] テストチーム3',
          title: 'テストチーム3',
          description: 'テスト用のチーム3',
        },
      ],
    },
  ],
};

// 作成されたテスト組織のIDを保存するファイルパス
const TEST_ORG_IDS_FILE = 'test-org-ids.json';

/**
 * テスト組織IDをファイルに保存
 */
async function saveTestOrgIds(orgIds: string[]): Promise<void> {
  try {
    const appDataPath = await callTauriCommand('get_path', {}) as string;
    const filePath = `${appDataPath}/${TEST_ORG_IDS_FILE}`;
    const jsonString = JSON.stringify(orgIds, null, 2);
    
    await callTauriCommand('write_file', {
      filePath: filePath,
      data: jsonString,
    });
    
    console.log(`✅ テスト組織IDを保存しました: ${filePath}`);
  } catch (error: any) {
    console.error('❌ テスト組織IDの保存に失敗しました:', error);
    throw error;
  }
}

/**
 * テスト組織IDをファイルから読み込み
 */
async function loadTestOrgIds(): Promise<string[]> {
  try {
    const appDataPath = await callTauriCommand('get_path', {}) as string;
    const filePath = `${appDataPath}/${TEST_ORG_IDS_FILE}`;
    
    const result = await callTauriCommand('read_file', {
      filePath: filePath,
    });
    
    if (result && result.data) {
      return JSON.parse(result.data);
    }
    
    return [];
  } catch (error: any) {
    // ファイルが存在しない場合は空配列を返す
    if (error?.message?.includes('ファイルが見つかりません') || 
        error?.message?.includes('not found')) {
      return [];
    }
    console.error('❌ テスト組織IDの読み込みに失敗しました:', error);
    throw error;
  }
}

/**
 * 組織を再帰的に作成
 */
async function createOrgRecursive(
  orgData: any,
  parentId: string | null = null,
  level: number = 0,
  orgIds: string[] = []
): Promise<string[]> {
  // 組織を作成
  const result = await createOrg(
    parentId,
    orgData.name,
    orgData.title || null,
    orgData.description || null,
    level,
    getLevelName(level),
    0
  );

  const orgId = result.id;
  orgIds.push(orgId);
  
  console.log(`✅ 組織を作成しました: ${orgData.name} (ID: ${orgId})`);

  // 子組織を再帰的に作成
  if (orgData.children && orgData.children.length > 0) {
    for (let i = 0; i < orgData.children.length; i++) {
      await createOrgRecursive(orgData.children[i], orgId, level + 1, orgIds);
    }
  }

  return orgIds;
}

/**
 * レベルに応じたレベル名を取得
 */
function getLevelName(level: number): string {
  switch (level) {
    case 0:
      return '部門';
    case 1:
      return '課';
    case 2:
      return 'チーム';
    default:
      return '組織';
  }
}

/**
 * テスト組織を作成
 */
export async function createTestOrgs(): Promise<void> {
  try {
    console.log('=== テスト組織データの作成を開始します ===\n');
    
    // 既存のテスト組織を確認
    const existingIds = await loadTestOrgIds();
    if (existingIds.length > 0) {
      console.log('⚠️ 既存のテスト組織が見つかりました:');
      existingIds.forEach((id, index) => {
        console.log(`  ${index + 1}. ${id}`);
      });
      console.log('\n先に削除してください: window.deleteTestOrgs()\n');
      return;
    }
    
    // テスト組織を作成
    const orgIds = await createOrgRecursive(TEST_ORG_DATA, null, 0, []);
    
    // 作成された組織IDを保存
    await saveTestOrgIds(orgIds);
    
    console.log(`\n✅ テスト組織データの作成が完了しました`);
    console.log(`作成された組織数: ${orgIds.length}件`);
    console.log(`ルート組織ID: ${orgIds[0]}`);
    console.log('\nテスト終了後は以下のコマンドで削除できます:');
    console.log('window.deleteTestOrgs()\n');
  } catch (error: any) {
    console.error('❌ テスト組織データの作成に失敗しました:', error);
    throw error;
  }
}

/**
 * テスト組織を削除
 */
export async function deleteTestOrgs(): Promise<void> {
  try {
    console.log('=== テスト組織データの削除を開始します ===\n');
    
    // テスト組織IDを読み込み
    const orgIds = await loadTestOrgIds();
    
    if (orgIds.length === 0) {
      console.log('⚠️ 削除対象のテスト組織が見つかりませんでした。');
      return;
    }
    
    console.log(`削除対象の組織数: ${orgIds.length}件\n`);
    
    // 子組織から順に削除（親組織を先に削除するとエラーになるため）
    // 逆順で削除することで、子組織から親組織の順に削除できる
    const reversedIds = [...orgIds].reverse();
    
    for (let i = 0; i < reversedIds.length; i++) {
      const orgId = reversedIds[i];
      try {
        await deleteOrg(orgId);
        console.log(`✅ 組織を削除しました: ${orgId}`);
      } catch (error: any) {
        console.error(`❌ 組織の削除に失敗しました (ID: ${orgId}):`, error);
        // エラーが発生しても続行
      }
    }
    
    // テスト組織IDファイルを削除
    try {
      const appDataPath = await callTauriCommand('get_path', {}) as string;
      const filePath = `${appDataPath}/${TEST_ORG_IDS_FILE}`;
      await callTauriCommand('delete_file', { filePath });
      console.log(`✅ テスト組織IDファイルを削除しました`);
    } catch (error: any) {
      console.warn('⚠️ テスト組織IDファイルの削除に失敗しました（無視します）:', error);
    }
    
    console.log(`\n✅ テスト組織データの削除が完了しました`);
  } catch (error: any) {
    console.error('❌ テスト組織データの削除に失敗しました:', error);
    throw error;
  }
}

/**
 * テスト組織の一覧を表示
 */
export async function listTestOrgs(): Promise<void> {
  try {
    console.log('=== テスト組織データの一覧 ===\n');
    
    // テスト組織IDを読み込み
    const orgIds = await loadTestOrgIds();
    
    if (orgIds.length === 0) {
      console.log('⚠️ テスト組織が見つかりませんでした。');
      console.log('作成するには: window.createTestOrgs()\n');
      return;
    }
    
    console.log(`テスト組織数: ${orgIds.length}件\n`);
    
    // 組織ツリーを取得して表示
    const tree = await getOrgTreeFromDb(undefined);
    
    if (!tree) {
      console.log('⚠️ 組織ツリーが見つかりませんでした。');
      return;
    }
    
    // テスト組織をフィルタリング（[テスト]で始まる組織）
    function findTestOrgs(node: any, result: any[] = []): any[] {
      if (node.organization && node.organization.name && node.organization.name.includes('[テスト]')) {
        result.push({
          id: node.organization.id,
          name: node.organization.name,
          level: node.organization.level,
          levelName: node.organization.levelName,
        });
      }
      
      if (node.children) {
        for (const child of node.children) {
          findTestOrgs(child, result);
        }
      }
      
      return result;
    }
    
    const testOrgs: any[] = [];
    findTestOrgs(tree, testOrgs);
    
    if (testOrgs.length === 0) {
      console.log('⚠️ テスト組織が見つかりませんでした（既に削除されている可能性があります）。');
      return;
    }
    
    testOrgs.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   レベル: ${org.level} (${org.levelName})`);
      console.log('');
    });
    
    console.log('削除するには: window.deleteTestOrgs()\n');
  } catch (error: any) {
    console.error('❌ テスト組織データの一覧取得に失敗しました:', error);
    throw error;
  }
}

// 関数はエクスポートのみ（windowへの追加はTestOrgDataHelperコンポーネントで行う）
