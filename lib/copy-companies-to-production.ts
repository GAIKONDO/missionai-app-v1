/**
 * 開発環境の事業会社データを本番環境のデータベースにコピーするスクリプト
 * 
 * ⚠️ Companiesテーブル削除のため、このスクリプトは無効化されています
 */

import { callTauriCommand } from './localFirebase';
// import { getAllCompanies, createCompany } from './companiesApi'; // Companiesテーブル削除のためコメントアウト
// import type { Company } from './companiesApi'; // Companiesテーブル削除のためコメントアウト

/**
 * 開発環境のデータベースから事業会社データを取得して本番環境にコピー
 * 
 * ⚠️ Companiesテーブル削除のため、この関数は無効化されています
 */
export async function copyCompaniesToProduction() {
  console.warn('⚠️ Companiesテーブルが削除されたため、このスクリプトは使用できません');
  return;
  
  /* 以下は無効化されたコード
  try {
    console.log('事業会社データを本番環境にコピーします...\n');

    // 開発環境のデータベースパス
    const devDbPath = '/Users/gaikondo/Library/Application Support/com.missionai.app/ai-assistant-business-plan-local-dev/app.db';
    // 本番環境のデータベースパス
    const prodDbPath = '/Users/gaikondo/Library/Application Support/com.missionai.app/ai-assistant-business-plan-local/app.db';

    // SQLite3を使用して開発環境のデータを取得
    const { execSync } = require('child_process');
    const fs = require('fs');

    // 開発環境のデータベースが存在するか確認
    if (!fs.existsSync(devDbPath)) {
      throw new Error(`開発環境のデータベースが見つかりません: ${devDbPath}`);
    }

    // 本番環境のデータベースが存在するか確認
    if (!fs.existsSync(prodDbPath)) {
      throw new Error(`本番環境のデータベースが見つかりません: ${prodDbPath}`);
    }

    console.log('✅ データベースファイルを確認しました');

    // 開発環境から事業会社データを取得
    console.log('開発環境から事業会社データを取得中...');
    const companiesJson = execSync(
      `sqlite3 "${devDbPath}" "SELECT json_group_array(json_object('id', id, 'code', code, 'name', name, 'nameShort', nameShort, 'category', category, 'organizationId', organizationId, 'company', company, 'division', division, 'department', department, 'region', region, 'position', position, 'createdAt', createdAt, 'updatedAt', updatedAt)) FROM companies"`,
      { encoding: 'utf-8' }
    );

    const companies: Company[] = JSON.parse(companiesJson);
    console.log(`✅ ${companies.length}件の事業会社データを取得しました`);

    if (companies.length === 0) {
      console.log('⚠️  コピーするデータがありません');
      return { success: true, copiedCount: 0 };
    }

    // 本番環境の既存データを確認
    console.log('本番環境の既存データを確認中...');
    const existingJson = execSync(
      `sqlite3 "${prodDbPath}" "SELECT json_group_array(json_object('code', code)) FROM companies"`,
      { encoding: 'utf-8' }
    );
    const existingCodes: string[] = JSON.parse(existingJson).map((c: any) => c.code).filter(Boolean);
    console.log(`✅ 本番環境に既に ${existingCodes.length}件の事業会社データが存在します`);

    // 本番環境にデータをコピー（重複をスキップ）
    let copiedCount = 0;
    let skippedCount = 0;

    for (const company of companies) {
      if (existingCodes.includes(company.code)) {
        console.log(`⏭️  スキップ: ${company.code} - ${company.name} (既に存在)`);
        skippedCount++;
        continue;
      }

      try {
        // 本番環境のデータベースに直接挿入
        const insertSql = `
          INSERT INTO companies (
            id, code, name, nameShort, category, organizationId, 
            company, division, department, region, position, createdAt, updatedAt
          ) VALUES (
            '${company.id.replace(/'/g, "''")}',
            '${company.code.replace(/'/g, "''")}',
            '${company.name.replace(/'/g, "''")}',
            ${company.nameShort ? `'${company.nameShort.replace(/'/g, "''")}'` : 'NULL'},
            '${company.category.replace(/'/g, "''")}',
            '${company.organizationId.replace(/'/g, "''")}',
            ${company.company ? `'${company.company.replace(/'/g, "''")}'` : 'NULL'},
            ${company.division ? `'${company.division.replace(/'/g, "''")}'` : 'NULL'},
            ${company.department ? `'${company.department.replace(/'/g, "''")}'` : 'NULL'},
            '${company.region.replace(/'/g, "''")}',
            ${company.position || 0},
            '${company.createdAt}',
            '${company.updatedAt}'
          )
        `;

        execSync(`sqlite3 "${prodDbPath}" "${insertSql}"`, { encoding: 'utf-8' });
        console.log(`✅ コピー完了: ${company.code} - ${company.name}`);
        copiedCount++;
      } catch (error: any) {
        console.error(`❌ エラー: ${company.code} - ${company.name}: ${error.message}`);
      }
    }

    console.log(`\n✅ コピーが完了しました`);
    console.log(`   コピーした件数: ${copiedCount}件`);
    console.log(`   スキップした件数: ${skippedCount}件`);

    return {
      success: true,
      copiedCount,
      skippedCount,
      totalCount: companies.length,
    };
  } catch (error: any) {
    console.error('❌ 事業会社データのコピーに失敗しました:', error);
    throw error;
  }
}
