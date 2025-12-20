/**
 * フロンティアビジネス部のデータを削除して再作成するスクリプト
 * 1. フロンティアビジネス部の組織を削除（子組織とメンバーも含む）
 * 2. フロンティアビジネス部に関連する事業会社を削除
 * 3. 正しい名前でフロンティアビジネス部の組織を再作成
 * 4. 事業会社データを再インポート
 */

import { searchOrgsByName, deleteOrg, createOrg } from './orgApi';
// import { getAllCompanies, deleteCompany, getCompaniesByOrganizationId, createCompany } from './companiesApi'; // Companiesテーブル削除のためコメントアウト
import { callTauriCommand } from './localFirebase';

/**
 * UIスレッドを解放するためのヘルパー関数
 */
function yieldToUI(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * 名前の正規化（空白と*を除去）
 */
function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, '').replace(/[：*]/g, '：');
}

/**
 * 名前が一致するかチェック（正規化後）
 */
function isNameMatch(orgName: string, searchName: string): boolean {
  const normalizedOrg = normalizeName(orgName);
  const normalizedSearch = normalizeName(searchName);
  
  return (
    orgName === searchName ||
    normalizedOrg === normalizedSearch ||
    (orgName.includes('フロンティアビジネス部') && searchName.includes('フロンティアビジネス部'))
  );
}

/**
 * フロンティアビジネス部のデータを削除して再作成
 */
export async function resetFrontierBusinessDepartment() {
  console.warn('⚠️ Companiesテーブルが削除されたため、この関数は使用できません');
  return { deletedCompanies: 0, importedCompanies: 0 };
  
  /* 以下は無効化されたコード
  console.log('resetFrontierBusinessDepartment関数が呼び出されました');
  try {
    console.log('=== フロンティアビジネス部のデータを削除して再作成します ===\n');

    await yieldToUI();

    // 1. 情報・通信部門を検索
    console.log('情報・通信部門を検索中...');
    const divisionCandidates = await searchOrgsByName('情報・通信部門');
    
    await yieldToUI();
    
    const divisionOrg = divisionCandidates.find((org: any) => 
      org.name.includes('情報・通信部門') || org.name.includes('8N')
    );
    
    if (!divisionOrg) {
      throw new Error('情報・通信部門が見つかりません');
    }
    console.log(`✅ 情報・通信部門の組織ID: ${divisionOrg.id}, 名前: ${divisionOrg.name}\n`);

    // 2. フロンティアビジネス部の組織を検索
    console.log('フロンティアビジネス部の組織を検索中...');
    const frontierCandidates = await searchOrgsByName('フロンティアビジネス部');
    
    await yieldToUI();
    
    const frontierVariations = [
      'B5： フロンティアビジネス部',
      'B5：*フロンティアビジネス部',
      'B5：フロンティアビジネス部',
      'フロンティアビジネス部',
    ];
    
    const foundFrontierOrgs = frontierCandidates.filter((org: any) =>
      frontierVariations.some(variation => isNameMatch(org.name, variation))
    );

    // 3. フロンティアビジネス部に関連する事業会社を取得
    console.log('フロンティアビジネス部に関連する事業会社を検索中...');
    const allCompanies = await getAllCompanies();
    
    await yieldToUI();
    
    const frontierCompanies: any[] = [];
    for (const frontierOrg of foundFrontierOrgs) {
      const companies = await getCompaniesByOrganizationId(frontierOrg.id);
      frontierCompanies.push(...companies);
      await yieldToUI();
    }
    
    // 部門名でフィルタリング（念のため）
    const companiesByDepartment = allCompanies.filter((company: any) =>
      company.department && (
        company.department.includes('フロンティアビジネス部') ||
        frontierVariations.some(v => isNameMatch(company.department, v))
      )
    );
    
    // 重複を除去
    const allFrontierCompanies = [
      ...frontierCompanies,
      ...companiesByDepartment
    ].filter((company: any, index: number, self: any[]) =>
      index === self.findIndex((c: any) => c.id === company.id)
    );

    console.log(`見つかったフロンティアビジネス部の組織: ${foundFrontierOrgs.length}件`);
    foundFrontierOrgs.forEach((org: any, index: number) => {
      console.log(`  ${index + 1}. ID: ${org.id}, 名前: ${org.name}`);
    });
    
    console.log(`見つかった関連事業会社: ${allFrontierCompanies.length}件`);
    allFrontierCompanies.forEach((company: any, index: number) => {
      console.log(`  ${index + 1}. ${company.code}: ${company.name}`);
    });
    console.log('');

    // 4. 事業会社を削除
    if (allFrontierCompanies.length > 0) {
      console.log('事業会社を削除中...');
      for (const company of allFrontierCompanies) {
        try {
          await deleteCompany(company.id);
          await yieldToUI();
        } catch (err: any) {
          console.warn(`事業会社 ${company.code} の削除に失敗:`, err.message);
        }
      }
      console.log(`✅ ${allFrontierCompanies.length}件の事業会社を削除しました\n`);
    }

    // 5. フロンティアビジネス部の組織を削除（子組織とメンバーも自動的に削除される）
    if (foundFrontierOrgs.length > 0) {
      console.log('フロンティアビジネス部の組織を削除中...');
      for (const org of foundFrontierOrgs) {
        try {
          await deleteOrg(org.id);
          await yieldToUI();
        } catch (err: any) {
          console.warn(`組織 ${org.name} の削除に失敗:`, err.message);
        }
      }
      console.log(`✅ ${foundFrontierOrgs.length}件の組織を削除しました\n`);
    }

    // 6. 正しい名前でフロンティアビジネス部の組織を再作成
    console.log('フロンティアビジネス部の組織を再作成中...');
    const targetName = 'B5：フロンティアビジネス部';
    const level = 3; // 部レベル
    const levelName = '部';
    
    // 情報・通信部門の配下の部門の数を取得してpositionを決定
    const children = await callTauriCommand('get_orgs_by_parent', { parentId: divisionOrg.id });
    const maxPosition = children.length > 0 
      ? Math.max(...children.map((c: any) => c.position || 0)) + 1
      : 0;
    
    await yieldToUI();
    
    const newFrontierOrg = await createOrg(
      divisionOrg.id, // 親ID
      targetName,
      null, // title
      null, // description
      level,
      levelName,
      maxPosition
    );
    
    console.log(`✅ フロンティアビジネス部の組織を再作成しました: ID: ${newFrontierOrg.id}\n`);

    await yieldToUI();

    // 7. フロンティアビジネス部に関連する事業会社データを再インポート
    console.log('フロンティアビジネス部に関連する事業会社データを再インポート中...');
    
    // フロンティアビジネス部に関連する事業会社データ（import-companies-data.tsから）
    const frontierCompaniesData = [
      { code: 'B13519', name: '（株）パスコ', nameShort: null, category: '孫（事業）', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'B15233', name: 'センチュリーメディカル（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'B78011', name: '伊藤忠テクノロジーベンチャーズ（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'B92485', name: 'エイツーヘルスケア（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'C07393', name: '（株）スカパーＪＳＡＴホールディングス', nameShort: null, category: '孫（上場）', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'C12764', name: 'ITC VENTURES XI, INC. (ITC VENTURES XI, INC.)', nameShort: null, category: '子会社・海外', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
      { code: 'C14335', name: '東洋メディック（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'C25335', name: 'A2 HEALTHCARE TAIWAN CORPORATION (A2TW)', nameShort: null, category: '孫（事業）', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
      { code: 'C25534', name: '伊藤忠・フジ・パートナーズ（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'C34823', name: 'DOCQUITY HOLDINGS PTE. LTD. (DOCQUITY HOLDINGS PTE. LTD.)', nameShort: null, category: '関連・海外', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
      { code: 'C38727', name: 'RIGHTS & BRANDS ASIA LIMITED (RBA)', nameShort: null, category: '関連・海外', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
      { code: 'C39469', name: 'ＴＸＰ　Ｍｅｄｉｃａｌ（株）', nameShort: null, category: '関連B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'C42733', name: 'ＩＳフロンティアパートナーズ（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'C43867', name: 'ITC VENTURE PARTNERS, INC (IVP)', nameShort: null, category: '子会社・海外', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
      { code: 'C44490', name: '（株）アイライツポート', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
    ];

    // 新しく作成した組織のIDを直接使用（get_org_treeを呼び出す必要がない）
    const frontierOrgId = newFrontierOrg.id;

    let importedCount = 0;
    for (let i = 0; i < frontierCompaniesData.length; i++) {
      const companyData = frontierCompaniesData[i];
      try {
        await createCompany(
          companyData.code,
          companyData.name,
          companyData.nameShort,
          companyData.category,
          frontierOrgId, // 新しく作成した組織のIDを直接使用
          companyData.company,
          companyData.division,
          companyData.department,
          companyData.region,
          i // position
        );
        
        importedCount++;
        
        // 5件ごとにUIスレッドを解放
        if ((i + 1) % 5 === 0) {
          await yieldToUI();
        }
      } catch (err: any) {
        console.warn(`事業会社 ${companyData.code} のインポートに失敗:`, err.message);
      }
    }

    console.log(`✅ ${importedCount}件の事業会社を再インポートしました\n`);

    console.log('=== リセットと再インポートが完了しました ===');
    
    return {
      success: true,
      deletedOrgs: foundFrontierOrgs.length,
      deletedCompanies: allFrontierCompanies.length,
      newOrgId: newFrontierOrg.id,
      newOrgName: targetName,
      parentOrgId: divisionOrg.id,
      importedCompanies: importedCount,
    };
  } catch (error: any) {
    console.error('❌ フロンティアビジネス部のリセットに失敗しました:', error);
    throw error;
  }
}

/**
 * フロンティアビジネス部のデータを再作成する（削除は行わない）
 * 既に削除済みの場合に使用
 */
export async function recreateFrontierBusinessDepartment() {
  console.log('recreateFrontierBusinessDepartment関数が呼び出されました');
  try {
    console.log('=== フロンティアビジネス部のデータを再作成します ===\n');

    await yieldToUI();

    // 1. 情報・通信部門を検索
    console.log('情報・通信部門を検索中...');
    const divisionCandidates = await searchOrgsByName('情報・通信部門');
    
    await yieldToUI();
    
    const divisionOrg = divisionCandidates.find((org: any) => 
      org.name.includes('情報・通信部門') || org.name.includes('8N')
    );
    
    if (!divisionOrg) {
      throw new Error('情報・通信部門が見つかりません');
    }
    console.log(`✅ 情報・通信部門の組織ID: ${divisionOrg.id}, 名前: ${divisionOrg.name}\n`);

    // 2. 既存のフロンティアビジネス部の組織を確認（削除は行わない）
    console.log('既存のフロンティアビジネス部の組織を確認中...');
    const frontierCandidates = await searchOrgsByName('フロンティアビジネス部');
    
    await yieldToUI();
    
    const frontierVariations = [
      'B5： フロンティアビジネス部',
      'B5：*フロンティアビジネス部',
      'B5：フロンティアビジネス部',
      'フロンティアビジネス部',
    ];
    
    const existingFrontierOrgs = frontierCandidates.filter((org: any) =>
      frontierVariations.some(variation => isNameMatch(org.name, variation))
    );

    if (existingFrontierOrgs.length > 0) {
      console.log(`✅ 既存のフロンティアビジネス部の組織が見つかりました: ${existingFrontierOrgs.length}件`);
      existingFrontierOrgs.forEach((org: any, index: number) => {
        console.log(`  ${index + 1}. ID: ${org.id}, 名前: ${org.name}`);
      });
      // 既存の組織がある場合は、そのIDを使用して事業会社を追加
      const existingOrgId = existingFrontierOrgs[0].id;
      console.log(`既存の組織に事業会社を追加します: ${existingOrgId}\n`);
      
      // 既存の組織に事業会社を追加する処理に進む
      // （後続の処理で既存の組織IDを使用）
      const newFrontierOrg = { id: existingOrgId, name: existingFrontierOrgs[0].name };
      
      // 既存の事業会社を確認
      const existingCompanies = await getCompaniesByOrganizationId(existingOrgId);
      await yieldToUI();
      
      const existingCompanyCodes = new Set(existingCompanies.map((c: any) => c.code));
      
      // フロンティアビジネス部に関連する事業会社データ
      const frontierCompaniesData = [
        { code: 'B13519', name: '（株）パスコ', nameShort: null, category: '孫（事業）', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
        { code: 'B15233', name: 'センチュリーメディカル（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
        { code: 'B78011', name: '伊藤忠テクノロジーベンチャーズ（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
        { code: 'B92485', name: 'エイツーヘルスケア（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
        { code: 'C07393', name: '（株）スカパーＪＳＡＴホールディングス', nameShort: null, category: '孫（上場）', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
        { code: 'C12764', name: 'ITC VENTURES XI, INC. (ITC VENTURES XI, INC.)', nameShort: null, category: '子会社・海外', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
        { code: 'C14335', name: '東洋メディック（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
        { code: 'C25335', name: 'A2 HEALTHCARE TAIWAN CORPORATION (A2TW)', nameShort: null, category: '孫（事業）', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
        { code: 'C25534', name: '伊藤忠・フジ・パートナーズ（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
        { code: 'C34823', name: 'DOCQUITY HOLDINGS PTE. LTD. (DOCQUITY HOLDINGS PTE. LTD.)', nameShort: null, category: '関連・海外', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
        { code: 'C38727', name: 'RIGHTS & BRANDS ASIA LIMITED (RBA)', nameShort: null, category: '関連・海外', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
        { code: 'C39469', name: 'ＴＸＰ　Ｍｅｄｉｃａｌ（株）', nameShort: null, category: '関連B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
        { code: 'C42733', name: 'ＩＳフロンティアパートナーズ（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
        { code: 'C43867', name: 'ITC VENTURE PARTNERS, INC (IVP)', nameShort: null, category: '子会社・海外', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
        { code: 'C44490', name: '（株）アイライツポート', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      ];

      console.log('既存の組織に事業会社データを追加中...');
      
      let importedCount = 0;
      for (let i = 0; i < frontierCompaniesData.length; i++) {
        const companyData = frontierCompaniesData[i];
        
        // 既に存在する場合はスキップ
        if (existingCompanyCodes.has(companyData.code)) {
          console.log(`⏭️  スキップ: ${companyData.code} - ${companyData.name} (既に存在)`);
          continue;
        }
        
        try {
          await createCompany(
            companyData.code,
            companyData.name,
            companyData.nameShort,
            companyData.category,
            existingOrgId,
            companyData.company,
            companyData.division,
            companyData.department,
            companyData.region,
            existingCompanies.length + importedCount // position
          );
          
          importedCount++;
          console.log(`✅ 作成: ${companyData.code} - ${companyData.name}`);
          
          // 5件ごとにUIスレッドを解放
          if (importedCount % 5 === 0) {
            await yieldToUI();
          }
        } catch (err: any) {
          console.warn(`事業会社 ${companyData.code} の追加に失敗:`, err.message);
        }
      }

      console.log(`✅ ${importedCount}件の事業会社を追加しました`);
      if (frontierCompaniesData.length - importedCount > 0) {
        console.log(`⏭️  ${frontierCompaniesData.length - importedCount}件は既に存在していたためスキップしました`);
      }
      console.log('\n=== 追加が完了しました ===');
      
      return {
        success: true,
        newOrgId: existingOrgId,
        newOrgName: existingFrontierOrgs[0].name,
        parentOrgId: divisionOrg.id,
        importedCompanies: importedCount,
        skippedCompanies: frontierCompaniesData.length - importedCount,
      };
    }

    // 3. 正しい名前でフロンティアビジネス部の組織を再作成
    console.log('フロンティアビジネス部の組織を再作成中...');
    const targetName = 'B5：フロンティアビジネス部';
    const level = 3; // 部レベル
    const levelName = '部';
    
    // 情報・通信部門の配下の部門の数を取得してpositionを決定
    const children = await callTauriCommand('get_orgs_by_parent', { parentId: divisionOrg.id });
    const maxPosition = children.length > 0 
      ? Math.max(...children.map((c: any) => c.position || 0)) + 1
      : 0;
    
    await yieldToUI();
    
    const newFrontierOrg = await createOrg(
      divisionOrg.id, // 親ID
      targetName,
      null, // title
      null, // description
      level,
      levelName,
      maxPosition
    );
    
    console.log(`✅ フロンティアビジネス部の組織を再作成しました: ID: ${newFrontierOrg.id}\n`);

    await yieldToUI();

    // 4. フロンティアビジネス部に関連する事業会社データを再インポート
    console.log('フロンティアビジネス部に関連する事業会社データを再インポート中...');
    
    // フロンティアビジネス部に関連する事業会社データ
    const frontierCompaniesData = [
      { code: 'B13519', name: '（株）パスコ', nameShort: null, category: '孫（事業）', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'B15233', name: 'センチュリーメディカル（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'B78011', name: '伊藤忠テクノロジーベンチャーズ（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'B92485', name: 'エイツーヘルスケア（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'C07393', name: '（株）スカパーＪＳＡＴホールディングス', nameShort: null, category: '孫（上場）', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'C12764', name: 'ITC VENTURES XI, INC. (ITC VENTURES XI, INC.)', nameShort: null, category: '子会社・海外', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
      { code: 'C14335', name: '東洋メディック（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'C25335', name: 'A2 HEALTHCARE TAIWAN CORPORATION (A2TW)', nameShort: null, category: '孫（事業）', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
      { code: 'C25534', name: '伊藤忠・フジ・パートナーズ（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'C34823', name: 'DOCQUITY HOLDINGS PTE. LTD. (DOCQUITY HOLDINGS PTE. LTD.)', nameShort: null, category: '関連・海外', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
      { code: 'C38727', name: 'RIGHTS & BRANDS ASIA LIMITED (RBA)', nameShort: null, category: '関連・海外', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
      { code: 'C39469', name: 'ＴＸＰ　Ｍｅｄｉｃａｌ（株）', nameShort: null, category: '関連B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'C42733', name: 'ＩＳフロンティアパートナーズ（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
      { code: 'C43867', name: 'ITC VENTURE PARTNERS, INC (IVP)', nameShort: null, category: '子会社・海外', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '海外' },
      { code: 'C44490', name: '（株）アイライツポート', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8N： 情報・通信部門', department: 'B5：フロンティアビジネス部', region: '国内' },
    ];

    // 新しく作成した組織のIDを直接使用
    const frontierOrgId = newFrontierOrg.id;

    let importedCount = 0;
    for (let i = 0; i < frontierCompaniesData.length; i++) {
      const companyData = frontierCompaniesData[i];
      try {
        await createCompany(
          companyData.code,
          companyData.name,
          companyData.nameShort,
          companyData.category,
          frontierOrgId,
          companyData.company,
          companyData.division,
          companyData.department,
          companyData.region,
          i // position
        );
        
        importedCount++;
        console.log(`✅ 作成: ${companyData.code} - ${companyData.name}`);
        
        // 5件ごとにUIスレッドを解放
        if ((i + 1) % 5 === 0) {
          await yieldToUI();
        }
      } catch (err: any) {
        console.warn(`事業会社 ${companyData.code} のインポートに失敗:`, err.message);
      }
    }

    console.log(`✅ ${importedCount}件の事業会社を再インポートしました\n`);

    console.log('=== 再作成が完了しました ===');
    
    return {
      success: true,
      newOrgId: newFrontierOrg.id,
      newOrgName: targetName,
      parentOrgId: divisionOrg.id,
      importedCompanies: importedCount,
    };
  } catch (error: any) {
    console.error('❌ フロンティアビジネス部の再作成に失敗しました:', error);
    throw error;
  }
  */
}

/**
 * 金融・保険部門の会社データを追加する
 * 既存の組織がある場合は追加、ない場合は新規作成
 * 
 * ⚠️ Companiesテーブル削除のため、この関数は無効化されています
 */
export async function addFinanceInsuranceCompanies() {
  console.warn('⚠️ Companiesテーブルが削除されたため、この関数は使用できません');
  return { importedCompanies: 0, skippedCompanies: 0 };
  
  /* 以下は無効化されたコード
  console.log('addFinanceInsuranceCompanies関数が呼び出されました');
  try {
    console.log('=== 金融・保険部門の会社データを追加します ===\n');

    await yieldToUI();

    // 1. 情報・通信部門を検索して、その親組織を取得
    console.log('情報・通信部門を検索中...');
    const ictDivisionCandidates = await searchOrgsByName('情報・通信部門');
    await yieldToUI();
    
    const ictDivision = ictDivisionCandidates.find((org: any) => 
      org.name.includes('情報・通信部門') || org.name.includes('8N')
    );
    
    if (!ictDivision) {
      throw new Error('情報・通信部門が見つかりません。情報・通信部門が存在することを確認してください。');
    }
    console.log(`✅ 情報・通信部門の組織ID: ${ictDivision.id}, 名前: ${ictDivision.name}`);
    console.log(`   親組織ID: ${ictDivision.parentId || 'なし（ルート）'}\n`);

    // 2. 金融・保険部門を検索
    console.log('金融・保険部門を検索中...');
    let divisionCandidates = await searchOrgsByName('金融・保険部門');
    await yieldToUI();
    
    if (divisionCandidates.length === 0) {
      divisionCandidates = await searchOrgsByName('8T');
      await yieldToUI();
    }
    
    let divisionOrg = divisionCandidates.find((org: any) => 
      org.name.includes('金融・保険部門') || 
      (org.name.includes('金融') && org.name.includes('保険')) ||
      org.name.includes('8T')
    );
    
    // 金融・保険部門が見つからない場合は新規作成
    if (!divisionOrg) {
      console.log('金融・保険部門が見つかりません。新規作成します...');
      
      // 情報・通信部門と同じ親組織の下に作成
      const parentId = ictDivision.parentId;
      
      // 親組織の配下の組織を取得してpositionを決定
      const siblings = parentId 
        ? await callTauriCommand('get_orgs_by_parent', { parentId })
        : await callTauriCommand('get_org_tree', { rootId: null });
      await yieldToUI();
      
      // 情報・通信部門のpositionを確認
      const ictPosition = ictDivision.position || 0;
      // 情報・通信部門の次のpositionを使用
      const newPosition = ictPosition + 1;
      
      // 金融・保険部門を作成
      divisionOrg = await createOrg(
        parentId,
        '8T： 金融・保険部門',
        null, // title
        null, // description
        2, // level（情報・通信部門と同じレベル）
        '部門', // levelName
        newPosition
      );
      
      console.log(`✅ 金融・保険部門を新規作成しました: ID: ${divisionOrg.id}, 名前: ${divisionOrg.name}\n`);
    } else {
      console.log(`✅ 既存の金融・保険部門が見つかりました: ID: ${divisionOrg.id}, 名前: ${divisionOrg.name}\n`);
    }

    // 2. 金融ビジネス部と保険ビジネス部を検索または作成
    const financeDeptName = 'M2：金融ビジネス部';
    const insuranceDeptName = 'M3：保険ビジネス部';
    
    // 金融ビジネス部を検索
    console.log('金融ビジネス部を検索中...');
    const financeCandidates = await searchOrgsByName('金融ビジネス部');
    await yieldToUI();
    
    const financeDeptVariations = ['M2： 金融ビジネス部', 'M2：*金融ビジネス部', 'M2：金融ビジネス部', '金融ビジネス部'];
    const existingFinanceDept = financeCandidates.find((org: any) =>
      financeDeptVariations.some(variation => isNameMatch(org.name, variation))
    );

    let financeDeptId: string;
    if (existingFinanceDept) {
      console.log(`✅ 既存の金融ビジネス部が見つかりました: ID: ${existingFinanceDept.id}, 名前: ${existingFinanceDept.name}\n`);
      financeDeptId = existingFinanceDept.id;
    } else {
      console.log('金融ビジネス部を新規作成中...');
      const children = await callTauriCommand('get_orgs_by_parent', { parentId: divisionOrg.id });
      const maxPosition = children.length > 0 
        ? Math.max(...children.map((c: any) => c.position || 0)) + 1
        : 0;
      await yieldToUI();
      
      const newFinanceDept = await createOrg(
        divisionOrg.id,
        financeDeptName,
        null,
        null,
        3, // level
        '部',
        maxPosition
      );
      financeDeptId = newFinanceDept.id;
      console.log(`✅ 金融ビジネス部を新規作成しました: ID: ${financeDeptId}\n`);
    }

    // 保険ビジネス部を検索
    console.log('保険ビジネス部を検索中...');
    const insuranceCandidates = await searchOrgsByName('保険ビジネス部');
    await yieldToUI();
    
    const insuranceDeptVariations = ['M3： 保険ビジネス部', 'M3：*保険ビジネス部', 'M3：保険ビジネス部', '保険ビジネス部'];
    const existingInsuranceDept = insuranceCandidates.find((org: any) =>
      insuranceDeptVariations.some(variation => isNameMatch(org.name, variation))
    );

    let insuranceDeptId: string;
    if (existingInsuranceDept) {
      console.log(`✅ 既存の保険ビジネス部が見つかりました: ID: ${existingInsuranceDept.id}, 名前: ${existingInsuranceDept.name}\n`);
      insuranceDeptId = existingInsuranceDept.id;
    } else {
      console.log('保険ビジネス部を新規作成中...');
      const children = await callTauriCommand('get_orgs_by_parent', { parentId: divisionOrg.id });
      const maxPosition = children.length > 0 
        ? Math.max(...children.map((c: any) => c.position || 0)) + 1
        : 0;
      await yieldToUI();
      
      const newInsuranceDept = await createOrg(
        divisionOrg.id,
        insuranceDeptName,
        null,
        null,
        3, // level
        '部',
        maxPosition
      );
      insuranceDeptId = newInsuranceDept.id;
      console.log(`✅ 保険ビジネス部を新規作成しました: ID: ${insuranceDeptId}\n`);
    }

    // 3. 金融ビジネス部の会社データを追加
    const financeCompaniesData = [
      { code: 'B44413', name: 'ITOCHU FINANCE (ASIA) LTD.', nameShort: '(IFA)', category: '子会社・海外', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M2：金融ビジネス部', region: '海外' },
      { code: 'B58769', name: 'ポケットカード（株）', nameShort: null, category: '孫（事業）', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M2：金融ビジネス部', region: '国内' },
      { code: 'B62650', name: 'UNITED ASIA FINANCE LIMITED', nameShort: '(UAF)', category: '孫（事業）', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M2：金融ビジネス部', region: '海外' },
      { code: 'B75554', name: 'FIRST RESPONSE FINANCE LIMITED', nameShort: '(FRF)', category: '子会社・海外', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M2：金融ビジネス部', region: '海外' },
      { code: 'B85858', name: 'EASY BUY PUBLIC CO., LTD.', nameShort: '(EASY BUY PCL)', category: '孫（事業）', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M2：金融ビジネス部', region: '海外' },
      { code: 'C19232', name: 'GCT MANAGEMENT (THAILAND) LTD.', nameShort: '(GCT)', category: '子会社・海外', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M2：金融ビジネス部', region: '海外' },
      { code: 'C26223', name: '（株）ＰＣＨ', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M2：金融ビジネス部', region: '国内' },
      { code: 'C31965', name: 'ACOM CONSUMER FINANCE CORPORATION', nameShort: '(ACF)', category: '関連・海外', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M2：金融ビジネス部', region: '海外' },
      { code: 'C39004', name: '（株）外為どっとコム', nameShort: null, category: '関連B', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M2：金融ビジネス部', region: '国内' },
      { code: 'C43436', name: 'EASTERN COMMERCIAL LEASING PUBLIC COMPANY LIMITED', nameShort: '(EAST)', category: '孫（上場）', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M2：金融ビジネス部', region: '海外' },
    ];

    // 既存の事業会社を確認
    const existingFinanceCompanies = await getCompaniesByOrganizationId(financeDeptId);
    await yieldToUI();
    const existingFinanceCodes = new Set(existingFinanceCompanies.map((c: any) => c.code));

    console.log('金融ビジネス部の会社データを追加中...');
    let financeImportedCount = 0;
    for (let i = 0; i < financeCompaniesData.length; i++) {
      const companyData = financeCompaniesData[i];
      
      if (existingFinanceCodes.has(companyData.code)) {
        console.log(`⏭️  スキップ: ${companyData.code} - ${companyData.name} (既に存在)`);
        continue;
      }
      
      try {
        await createCompany(
          companyData.code,
          companyData.name,
          companyData.nameShort,
          companyData.category,
          financeDeptId,
          companyData.company,
          companyData.division,
          companyData.department,
          companyData.region,
          existingFinanceCompanies.length + financeImportedCount
        );
        
        financeImportedCount++;
        console.log(`✅ 作成: ${companyData.code} - ${companyData.name}`);
        
        if (financeImportedCount % 5 === 0) {
          await yieldToUI();
        }
      } catch (err: any) {
        console.warn(`事業会社 ${companyData.code} の追加に失敗:`, err.message);
      }
    }

    console.log(`✅ 金融ビジネス部: ${financeImportedCount}件の会社を追加しました`);
    if (financeCompaniesData.length - financeImportedCount > 0) {
      console.log(`⏭️  ${financeCompaniesData.length - financeImportedCount}件は既に存在していたためスキップしました`);
    }
    console.log('');

    // 4. 保険ビジネス部の会社データを追加
    const insuranceCompaniesData = [
      { code: 'B07713', name: '伊藤忠オリコ保険サービス（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M3：保険ビジネス部', region: '国内' },
      { code: 'B24084', name: 'COSMOS SERVICES CO., LTD.', nameShort: '(COSMOS/HKG)', category: '孫（事業）', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M3：保険ビジネス部', region: '海外' },
      { code: 'B25618', name: 'SIAM COSMOS SERVICES CO.,LTD.', nameShort: '(COSMOS/THAILAND)', category: '孫（事業）', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M3：保険ビジネス部', region: '海外' },
      { code: 'B64822', name: 'ＣＯＳＭＯＳリスクソリューションズ（株）', nameShort: null, category: '子会社B', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M3：保険ビジネス部', region: '国内' },
      { code: 'C24833', name: 'ほけんの窓口グループ（株）', nameShort: null, category: '子会社A', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M3：保険ビジネス部', region: '国内' },
      { code: 'C35253', name: 'Ｇａｒｄｉａ（株）', nameShort: null, category: '孫（事業）', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M3：保険ビジネス部', region: '国内' },
      { code: 'C40154', name: 'ＦＭ保険サービス（株）', nameShort: null, category: '孫（事業）', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M3：保険ビジネス部', region: '国内' },
      { code: 'C42152', name: 'GR MANAGEMENT (THAILAND) LTD.', nameShort: '(GMT)', category: '孫（事業）', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M3：保険ビジネス部', region: '海外' },
      { code: 'C43413', name: 'THAIVIVAT INSURANCE PUBLIC COMPANY LIMITED', nameShort: '(TVI)', category: '孫（事業）', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M3：保険ビジネス部', region: '海外' },
      { code: 'C43915', name: 'IM HORIZON CORP.', nameShort: '(IM HORIZON CORP.)', category: '子会社・海外', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M3：保険ビジネス部', region: '海外' },
      { code: 'C43983', name: 'CHURCHILL INNOVATIVE HOLDINGS LLC', nameShort: '(CHURCHILL INNOVATIVE HOLDINGS LLC)', category: '孫（事業）', company: 'C0S：情金', division: '8T： 金融・保険部門', department: 'M3：保険ビジネス部', region: '海外' },
    ];

    // 既存の事業会社を確認
    const existingInsuranceCompanies = await getCompaniesByOrganizationId(insuranceDeptId);
    await yieldToUI();
    const existingInsuranceCodes = new Set(existingInsuranceCompanies.map((c: any) => c.code));

    console.log('保険ビジネス部の会社データを追加中...');
    let insuranceImportedCount = 0;
    for (let i = 0; i < insuranceCompaniesData.length; i++) {
      const companyData = insuranceCompaniesData[i];
      
      if (existingInsuranceCodes.has(companyData.code)) {
        console.log(`⏭️  スキップ: ${companyData.code} - ${companyData.name} (既に存在)`);
        continue;
      }
      
      try {
        await createCompany(
          companyData.code,
          companyData.name,
          companyData.nameShort,
          companyData.category,
          insuranceDeptId,
          companyData.company,
          companyData.division,
          companyData.department,
          companyData.region,
          existingInsuranceCompanies.length + insuranceImportedCount
        );
        
        insuranceImportedCount++;
        console.log(`✅ 作成: ${companyData.code} - ${companyData.name}`);
        
        if (insuranceImportedCount % 5 === 0) {
          await yieldToUI();
        }
      } catch (err: any) {
        console.warn(`事業会社 ${companyData.code} の追加に失敗:`, err.message);
      }
    }

    console.log(`✅ 保険ビジネス部: ${insuranceImportedCount}件の会社を追加しました`);
    if (insuranceCompaniesData.length - insuranceImportedCount > 0) {
      console.log(`⏭️  ${insuranceCompaniesData.length - insuranceImportedCount}件は既に存在していたためスキップしました`);
    }
    console.log('');

    console.log('=== 金融・保険部門の会社データ追加が完了しました ===');
    
    return {
      success: true,
      financeDeptId,
      financeDeptName,
      insuranceDeptId,
      insuranceDeptName,
      financeImportedCount,
      insuranceImportedCount,
      financeSkipped: financeCompaniesData.length - financeImportedCount,
      insuranceSkipped: insuranceCompaniesData.length - insuranceImportedCount,
    };
  } catch (error: any) {
    console.error('❌ 金融・保険部門の会社データ追加に失敗しました:', error);
    throw error;
  }
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  (window as any).resetFrontierBusinessDepartment = resetFrontierBusinessDepartment;
  (window as any).recreateFrontierBusinessDepartment = recreateFrontierBusinessDepartment;
  (window as any).addFinanceInsuranceCompanies = addFinanceInsuranceCompanies;
}
