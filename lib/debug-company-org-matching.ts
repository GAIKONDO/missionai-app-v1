/**
 * 事業会社と組織のIDマッチングを確認するデバッグスクリプト
 * 
 * ⚠️ Companiesテーブル削除のため、このスクリプトは無効化されています
 */

// import { getAllCompanies } from './companiesApi'; // Companiesテーブル削除のためコメントアウト
import { getOrgTreeFromDb, getAllOrganizationsFromTree } from './orgApi';

/**
 * 通信モバイル部（通信ビジネス部）と辻本郷コンサルティングのIDを確認
 * 
 * ⚠️ Companiesテーブル削除のため、この関数は無効化されています
 */
export async function debugCompanyOrgMatching() {
  console.warn('⚠️ Companiesテーブルが削除されたため、このデバッグスクリプトは使用できません');
  return;
  
  /* 以下は無効化されたコード
  try {
    console.log('🔍 [デバッグ] 事業会社と組織のIDマッチングを確認します...\n');

    // 事業会社データを取得
    const companies = await getAllCompanies();
    console.log(`📊 事業会社数: ${companies.length}件\n`);

    // 辻本郷コンサルティングを検索
    const tsujimotoCompany = companies.find(c => 
      c.name.includes('辻本') || c.name.includes('コンサルティング')
    );

    if (tsujimotoCompany) {
      console.log('✅ 辻本郷コンサルティングを発見:');
      console.log(`   ID: ${tsujimotoCompany.id}`);
      console.log(`   名前: ${tsujimotoCompany.name}`);
      console.log(`   organizationId: ${tsujimotoCompany.organizationId}`);
      console.log(`   カテゴリ: ${tsujimotoCompany.category}`);
      console.log('');
    } else {
      console.log('❌ 辻本郷コンサルティングが見つかりませんでした');
      console.log('   登録されている事業会社名:');
      companies.forEach(c => console.log(`   - ${c.name}`));
      console.log('');
    }

    // 組織ツリーを取得
    const orgTree = await getOrgTreeFromDb();
    if (!orgTree) {
      console.log('❌ 組織ツリーが取得できませんでした');
      return;
    }

    // すべての組織を取得
    const allOrgs = getAllOrganizationsFromTree(orgTree);
    console.log(`📊 組織数: ${allOrgs.length}件\n`);

    // 通信モバイル部/通信ビジネス部を検索
    const communicationsOrgs = allOrgs.filter(org => 
      org.name.includes('通信') && 
      (org.name.includes('モバイル') || org.name.includes('ビジネス'))
    );

    console.log('🔍 通信関連の組織:');
    communicationsOrgs.forEach(org => {
      console.log(`   - ${org.name} (ID: ${org.id}, level: ${(org as any).level})`);
    });
    console.log('');

    // 通信ビジネス部を検索（より広範囲に）
    const communicationsBusinessDept = allOrgs.find(org => 
      org.name === '通信ビジネス部' || 
      org.name.includes('通信ビジネス部') ||
      org.name === '通信モバイル部' ||
      org.name.includes('通信モバイル部')
    );

    if (communicationsBusinessDept) {
      console.log('✅ 通信ビジネス部/通信モバイル部を発見:');
      console.log(`   名前: ${communicationsBusinessDept.name}`);
      console.log(`   ID: ${communicationsBusinessDept.id}`);
      console.log(`   レベル: ${(communicationsBusinessDept as any).level}`);
      console.log('');
    } else {
      console.log('❌ 通信ビジネス部/通信モバイル部が見つかりませんでした');
      console.log('   レベル1とレベル2の組織:');
      const level1And2Orgs = allOrgs.filter(org => (org as any).level === 0 || (org as any).level === 1);
      level1And2Orgs.forEach(org => {
        console.log(`   - ${org.name} (ID: ${org.id}, level: ${(org as any).level})`);
      });
      console.log('');
    }

    // IDマッチングを確認
    if (tsujimotoCompany && communicationsBusinessDept) {
      console.log('🔗 IDマッチング確認:');
      console.log(`   辻本郷コンサルティングのorganizationId: ${tsujimotoCompany.organizationId}`);
      console.log(`   通信ビジネス部/通信モバイル部のID: ${communicationsBusinessDept.id}`);
      
      if (tsujimotoCompany.organizationId === communicationsBusinessDept.id) {
        console.log('   ✅ IDが一致しています！');
      } else {
        console.log('   ❌ IDが一致していません！');
        console.log('   ⚠️ これが問題の原因です。');
        
        // 実際に紐づいている組織を探す
        const actualOrg = allOrgs.find(org => org.id === tsujimotoCompany.organizationId);
        if (actualOrg) {
          console.log(`   📌 実際に紐づいている組織: ${actualOrg.name} (ID: ${actualOrg.id})`);
        } else {
          console.log(`   ⚠️ organizationId "${tsujimotoCompany.organizationId}" に該当する組織が見つかりませんでした`);
        }
      }
    }

    // レベル1とレベル2の組織で、事業会社に紐づいているものを確認
    console.log('\n📋 レベル1とレベル2の組織で、事業会社に紐づいているもの:');
    const level1And2Orgs = allOrgs.filter(org => (org as any).level === 0 || (org as any).level === 1);
    level1And2Orgs.forEach(org => {
      const linkedCompanies = companies.filter(c => c.organizationId === org.id);
      if (linkedCompanies.length > 0) {
        console.log(`   ✅ ${org.name} (ID: ${org.id}) - ${linkedCompanies.length}件の事業会社`);
        linkedCompanies.forEach(c => console.log(`      - ${c.name}`));
      }
    });

    console.log('\n📋 レベル1とレベル2の組織で、事業会社に紐づいていないもの:');
    level1And2Orgs.forEach(org => {
      const linkedCompanies = companies.filter(c => c.organizationId === org.id);
      if (linkedCompanies.length === 0) {
        console.log(`   ⚠️ ${org.name} (ID: ${org.id}) - 事業会社なし`);
      }
    });

  } catch (error: any) {
    console.error('❌ エラー:', error);
  }
  */
}
