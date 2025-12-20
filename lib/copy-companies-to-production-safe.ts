/**
 * 開発環境の事業会社データを本番環境のデータベースにコピーするスクリプト（安全版）
 * Tauriコマンドを使用してデータベースにアクセス
 * 
 * ⚠️ Companiesテーブル削除のため、このスクリプトは無効化されています
 */

// import { getAllCompanies, createCompany } from './companiesApi'; // Companiesテーブル削除のためコメントアウト
// import type { Company } from './companiesApi'; // Companiesテーブル削除のためコメントアウト

/**
 * 開発環境のデータベースから事業会社データを取得して本番環境にコピー
 * 注意: このスクリプトは開発環境で実行してください
 * 
 * ⚠️ Companiesテーブル削除のため、この関数は無効化されています
 */
export async function copyCompaniesToProductionSafe() {
  console.warn('⚠️ Companiesテーブルが削除されたため、このスクリプトは使用できません');
  return;
  
  /* 以下は無効化されたコード
  try {
    console.log('事業会社データを本番環境にコピーします...\n');
    console.log('⚠️  このスクリプトは開発環境で実行してください\n');

    // 開発環境から事業会社データを取得
    console.log('開発環境から事業会社データを取得中...');
    const companies = await getAllCompanies();
    console.log(`✅ ${companies.length}件の事業会社データを取得しました`);

    if (companies.length === 0) {
      console.log('⚠️  コピーするデータがありません');
      return { success: true, copiedCount: 0 };
    }

    // 本番環境のデータベースパスを直接指定してSQLiteにアクセス
    const prodDbPath = '/Users/gaikondo/Library/Application Support/com.missionai.app/ai-assistant-business-plan-local/app.db';
    const { execSync } = require('child_process');
    const fs = require('fs');

    // 本番環境のデータベースが存在するか確認
    if (!fs.existsSync(prodDbPath)) {
      throw new Error(`本番環境のデータベースが見つかりません: ${prodDbPath}`);
    }

    // 本番環境の既存データを確認
    console.log('本番環境の既存データを確認中...');
    let existingCodes: string[] = [];
    try {
      const existingJson = execSync(
        `sqlite3 "${prodDbPath}" "SELECT json_group_array(json_object('code', code)) FROM companies"`,
        { encoding: 'utf-8' }
      );
      existingCodes = JSON.parse(existingJson).map((c: any) => c.code).filter(Boolean);
    } catch (error) {
      // companiesテーブルが存在しない場合は空配列のまま
      console.log('⚠️  companiesテーブルが存在しないか、データがありません');
    }
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
        // SQLインジェクションを防ぐため、エスケープ処理
        const escapeSql = (str: string | null | undefined): string => {
          if (!str) return '';
          return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
        };

        const insertSql = `
          INSERT INTO companies (
            id, code, name, nameShort, category, organizationId, 
            company, division, department, region, position, createdAt, updatedAt
          ) VALUES (
            '${escapeSql(company.id)}',
            '${escapeSql(company.code)}',
            '${escapeSql(company.name)}',
            ${company.nameShort ? `'${escapeSql(company.nameShort)}'` : 'NULL'},
            '${escapeSql(company.category)}',
            '${escapeSql(company.organizationId)}',
            ${company.company ? `'${escapeSql(company.company)}'` : 'NULL'},
            ${company.division ? `'${escapeSql(company.division)}'` : 'NULL'},
            ${company.department ? `'${escapeSql(company.department)}'` : 'NULL'},
            '${escapeSql(company.region)}',
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
        // エラーが発生しても続行
      }
    }

    console.log(`\n✅ コピーが完了しました`);
    console.log(`   コピーした件数: ${copiedCount}件`);
    console.log(`   スキップした件数: ${skippedCount}件`);
    console.log(`   合計: ${companies.length}件`);

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
