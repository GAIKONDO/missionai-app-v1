/**
 * 雛形データのエクスポート/インポート機能
 * コンソールから実行可能なヘルパー関数
 */

import { callTauriCommand } from './localFirebase';

/**
 * 組織とメンバーのみをエクスポートして雛形データファイルを作成（推奨）
 * @param exportPath エクスポート先のファイルパス（デフォルト: './template-data.json'）
 */
export async function exportOrganizationsAndMembers(exportPath: string = './template-data.json'): Promise<{ success: boolean; path: string; tables: string[] }> {
  try {
    console.log('📤 組織とメンバーのエクスポートを開始します...');
    console.log('📁 エクスポート先:', exportPath);
    console.log('📋 エクスポート対象テーブル: organizations, organizationMembers');
    
    const result = await callTauriCommand('export_organizations_and_members', {
      exportPath: exportPath
    });
    
    console.log('✅ エクスポートが完了しました:', result);
    return {
      success: true,
      path: exportPath,
      tables: ['organizations', 'organizationMembers']
    };
  } catch (error: any) {
    console.error('❌ エクスポートエラー:', error);
    throw error;
  }
}

/**
 * データベース全体をエクスポートして雛形データファイルを作成
 * @param exportPath エクスポート先のファイルパス（デフォルト: './template-data.json'）
 */
export async function exportTemplateData(exportPath: string = './template-data.json'): Promise<{ success: boolean; path: string }> {
  try {
    console.log('📤 雛形データのエクスポートを開始します...');
    console.log('📁 エクスポート先:', exportPath);
    
    const result = await callTauriCommand('export_database_data', {
      exportPath: exportPath
    });
    
    console.log('✅ エクスポートが完了しました:', result);
    return {
      success: true,
      path: exportPath
    };
  } catch (error: any) {
    console.error('❌ エクスポートエラー:', error);
    throw error;
  }
}

/**
 * データベースにデータをインポート
 * @param importPath インポート元のファイルパス
 */
export async function importTemplateData(importPath: string): Promise<{ success: boolean; path: string }> {
  try {
    console.log('📥 雛形データのインポートを開始します...');
    console.log('📁 インポート元:', importPath);
    
    const result = await callTauriCommand('import_database_data', {
      importPath: importPath
    });
    
    console.log('✅ インポートが完了しました:', result);
    return {
      success: true,
      path: importPath
    };
  } catch (error: any) {
    console.error('❌ インポートエラー:', error);
    throw error;
  }
}

// グローバルに公開（コンソールから実行可能にする）
if (typeof window !== 'undefined') {
  (window as any).exportOrganizationsAndMembers = exportOrganizationsAndMembers;
  (window as any).exportTemplateData = exportTemplateData;
  (window as any).importTemplateData = importTemplateData;
  
  console.log('✅ エクスポート/インポート関数が利用可能になりました:');
  console.log('   - window.exportOrganizationsAndMembers(exportPath?) ⭐ 推奨（組織とメンバーのみ）');
  console.log('   - window.exportTemplateData(exportPath?) （全データ）');
  console.log('   - window.importTemplateData(importPath)');
}
