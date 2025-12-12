/**
 * 本番環境の組織の所属メンバーデータを開発環境のデータベースにコピーするスクリプト
 */

/**
 * 本番環境のデータベースから組織とメンバーデータを取得して開発環境にコピー
 */
export async function copyOrgMembersFromProduction() {
  try {
    console.log('本番環境の組織とメンバーデータを開発環境にコピーします...\n');

    // 本番環境のデータベースパス
    const prodDbPath = '/Users/gaikondo/Library/Application Support/com.missionai.app/ai-assistant-business-plan-local/app.db';
    // 開発環境のデータベースパス
    const devDbPath = '/Users/gaikondo/Library/Application Support/com.missionai.app/ai-assistant-business-plan-local-dev/app.db';

    // SQLite3を使用して本番環境のデータを取得
    const { execSync } = require('child_process');
    const fs = require('fs');

    // 本番環境のデータベースが存在するか確認
    if (!fs.existsSync(prodDbPath)) {
      throw new Error(`本番環境のデータベースが見つかりません: ${prodDbPath}`);
    }

    // 開発環境のデータベースが存在するか確認
    if (!fs.existsSync(devDbPath)) {
      throw new Error(`開発環境のデータベースが見つかりません: ${devDbPath}`);
    }

    console.log('✅ データベースファイルを確認しました');

    // 本番環境から組織データを取得
    console.log('本番環境から組織データを取得中...');
    const organizationsJson = execSync(
      `sqlite3 "${prodDbPath}" "SELECT json_group_array(json_object('id', id, 'parentId', parentId, 'name', name, 'title', title, 'description', description, 'level', level, 'levelName', levelName, 'position', position, 'createdAt', createdAt, 'updatedAt', updatedAt)) FROM organizations"`,
      { encoding: 'utf-8' }
    );

    const organizations: any[] = JSON.parse(organizationsJson);
    console.log(`✅ ${organizations.length}件の組織データを取得しました`);

    // 本番環境からメンバーデータを取得
    console.log('本番環境からメンバーデータを取得中...');
    const membersJson = execSync(
      `sqlite3 "${prodDbPath}" "SELECT json_group_array(json_object('id', id, 'organizationId', organizationId, 'name', name, 'position', position, 'nameRomaji', nameRomaji, 'department', department, 'extension', extension, 'companyPhone', companyPhone, 'mobilePhone', mobilePhone, 'email', email, 'itochuEmail', itochuEmail, 'teams', teams, 'employeeType', employeeType, 'roleName', roleName, 'indicator', indicator, 'location', location, 'floorDoorNo', floorDoorNo, 'previousName', previousName, 'createdAt', createdAt, 'updatedAt', updatedAt)) FROM organizationMembers"`,
      { encoding: 'utf-8' }
    );

    const members: any[] = JSON.parse(membersJson);
    console.log(`✅ ${members.length}件のメンバーデータを取得しました`);

    if (organizations.length === 0 && members.length === 0) {
      console.log('⚠️  コピーするデータがありません');
      return { success: true, copiedOrgCount: 0, copiedMemberCount: 0 };
    }

    // 開発環境の既存データを確認
    console.log('開発環境の既存データを確認中...');
    const existingOrgsJson = execSync(
      `sqlite3 "${devDbPath}" "SELECT json_group_array(json_object('id', id)) FROM organizations"`,
      { encoding: 'utf-8' }
    );
    const existingOrgIds: string[] = JSON.parse(existingOrgsJson).map((o: any) => o.id).filter(Boolean);
    console.log(`✅ 開発環境に既に ${existingOrgIds.length}件の組織データが存在します`);

    const existingMembersJson = execSync(
      `sqlite3 "${devDbPath}" "SELECT json_group_array(json_object('id', id)) FROM organizationMembers"`,
      { encoding: 'utf-8' }
    );
    const existingMemberIds: string[] = JSON.parse(existingMembersJson).map((m: any) => m.id).filter(Boolean);
    console.log(`✅ 開発環境に既に ${existingMemberIds.length}件のメンバーデータが存在します`);

    // 開発環境に組織データをコピー（重複をスキップ）
    let copiedOrgCount = 0;
    let skippedOrgCount = 0;

    console.log('\n組織データをコピー中...');
    for (const org of organizations) {
      if (existingOrgIds.includes(org.id)) {
        console.log(`⏭️  スキップ: ${org.name} (既に存在)`);
        skippedOrgCount++;
        continue;
      }

      try {
        // SQLインジェクション対策: シングルクォートをエスケープ
        const escapeSql = (str: string | null | undefined): string => {
          if (!str) return 'NULL';
          return `'${str.replace(/'/g, "''")}'`;
        };

        const insertSql = `
          INSERT INTO organizations (
            id, parentId, name, title, description, level, levelName, position, createdAt, updatedAt
          ) VALUES (
            ${escapeSql(org.id)},
            ${org.parentId ? escapeSql(org.parentId) : 'NULL'},
            ${escapeSql(org.name)},
            ${org.title ? escapeSql(org.title) : 'NULL'},
            ${org.description ? escapeSql(org.description) : 'NULL'},
            ${org.level || 0},
            ${escapeSql(org.levelName)},
            ${org.position || 0},
            ${escapeSql(org.createdAt)},
            ${escapeSql(org.updatedAt)}
          )
        `;

        execSync(`sqlite3 "${devDbPath}" "${insertSql}"`, { encoding: 'utf-8' });
        console.log(`✅ コピー完了: ${org.name}`);
        copiedOrgCount++;
      } catch (error: any) {
        console.error(`❌ エラー: ${org.name}: ${error.message}`);
      }
    }

    // 開発環境にメンバーデータをコピー（重複をスキップ）
    let copiedMemberCount = 0;
    let skippedMemberCount = 0;

    console.log('\nメンバーデータをコピー中...');
    for (const member of members) {
      if (existingMemberIds.includes(member.id)) {
        console.log(`⏭️  スキップ: ${member.name} (既に存在)`);
        skippedMemberCount++;
        continue;
      }

      try {
        // SQLインジェクション対策: シングルクォートをエスケープ
        const escapeSql = (str: string | null | undefined): string => {
          if (!str) return 'NULL';
          return `'${str.replace(/'/g, "''")}'`;
        };

        const insertSql = `
          INSERT INTO organizationMembers (
            id, organizationId, name, position, nameRomaji, department, extension,
            companyPhone, mobilePhone, email, itochuEmail, teams, employeeType,
            roleName, indicator, location, floorDoorNo, previousName, createdAt, updatedAt
          ) VALUES (
            ${escapeSql(member.id)},
            ${escapeSql(member.organizationId)},
            ${escapeSql(member.name)},
            ${member.position ? escapeSql(member.position) : 'NULL'},
            ${member.nameRomaji ? escapeSql(member.nameRomaji) : 'NULL'},
            ${member.department ? escapeSql(member.department) : 'NULL'},
            ${member.extension ? escapeSql(member.extension) : 'NULL'},
            ${member.companyPhone ? escapeSql(member.companyPhone) : 'NULL'},
            ${member.mobilePhone ? escapeSql(member.mobilePhone) : 'NULL'},
            ${member.email ? escapeSql(member.email) : 'NULL'},
            ${member.itochuEmail ? escapeSql(member.itochuEmail) : 'NULL'},
            ${member.teams ? escapeSql(member.teams) : 'NULL'},
            ${member.employeeType ? escapeSql(member.employeeType) : 'NULL'},
            ${member.roleName ? escapeSql(member.roleName) : 'NULL'},
            ${member.indicator ? escapeSql(member.indicator) : 'NULL'},
            ${member.location ? escapeSql(member.location) : 'NULL'},
            ${member.floorDoorNo ? escapeSql(member.floorDoorNo) : 'NULL'},
            ${member.previousName ? escapeSql(member.previousName) : 'NULL'},
            ${escapeSql(member.createdAt)},
            ${escapeSql(member.updatedAt)}
          )
        `;

        execSync(`sqlite3 "${devDbPath}" "${insertSql}"`, { encoding: 'utf-8' });
        console.log(`✅ コピー完了: ${member.name}`);
        copiedMemberCount++;
      } catch (error: any) {
        console.error(`❌ エラー: ${member.name}: ${error.message}`);
      }
    }

    console.log(`\n✅ コピーが完了しました`);
    console.log(`   組織データ:`);
    console.log(`     コピーした件数: ${copiedOrgCount}件`);
    console.log(`     スキップした件数: ${skippedOrgCount}件`);
    console.log(`   メンバーデータ:`);
    console.log(`     コピーした件数: ${copiedMemberCount}件`);
    console.log(`     スキップした件数: ${skippedMemberCount}件`);

    return {
      success: true,
      copiedOrgCount,
      skippedOrgCount,
      copiedMemberCount,
      skippedMemberCount,
      totalOrgCount: organizations.length,
      totalMemberCount: members.length,
    };
  } catch (error: any) {
    console.error('❌ 組織とメンバーデータのコピーに失敗しました:', error);
    throw error;
  }
}

// スクリプトとして直接実行された場合
if (require.main === module) {
  copyOrgMembersFromProduction()
    .then((result) => {
      console.log('\n✅ 処理が正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 処理中にエラーが発生しました:', error);
      process.exit(1);
    });
}
