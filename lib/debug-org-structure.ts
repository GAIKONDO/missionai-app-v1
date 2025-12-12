/**
 * データベースの組織構造を確認するデバッグ用スクリプト
 */

import { callTauriCommand } from './localFirebase';

/**
 * 組織構造を再帰的に表示
 */
function printOrgStructure(org: any, depth: number = 0): void {
  const indent = '  '.repeat(depth);
  const orgData = org.organization || org;
  if (!orgData || !orgData.name) {
    console.log(`${indent}[無効な組織データ]`);
    return;
  }
  console.log(`${indent}${orgData.name} (${orgData.levelName || '不明'}) - ID: ${orgData.id}`);
  
  if (org.members && org.members.length > 0) {
    console.log(`${indent}  📊 メンバー数: ${org.members.length}名`);
  }
  
  if (org.children && org.children.length > 0) {
    org.children.forEach((child: any) => {
      printOrgStructure(child, depth + 1);
    });
  }
}

/**
 * データベースの組織構造を確認
 */
export async function debugOrgStructure() {
  try {
    console.log('=== データベースの組織構造確認 ===\n');
    
    const tree = await callTauriCommand('get_org_tree', { rootId: null });
    
    if (!tree || tree.length === 0) {
      console.log('❌ 組織データが見つかりません');
      return;
    }
    
    console.log(`✅ ルート組織数: ${tree.length}\n`);
    
    tree.forEach((root: any, index: number) => {
      console.log(`\n--- ルート組織 ${index + 1} ---`);
      printOrgStructure(root);
    });
    
    console.log('\n=== 確認完了 ===');
    
    return tree;
  } catch (error: any) {
    console.error('❌ 確認中にエラーが発生しました:', error);
    console.error('エラー詳細:', error);
    return null;
  }
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  (window as any).debugOrgStructure = debugOrgStructure;
}
