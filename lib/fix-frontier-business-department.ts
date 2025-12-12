/**
 * フロンティアビジネス部の名前を統合し、階層関係を修正するスクリプト
 * - "B5： フロンティアビジネス部" と "B5：*フロンティアビジネス部" を統合して "B5：フロンティアビジネス部" にする
 * - "B5：フロンティアビジネス部" が "8N： 情報・通信部門" の傘下であることを確認/修正する
 */

import { updateOrg, updateOrgParent, searchOrgsByName } from './orgApi';

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
 * UIスレッドを解放するためのヘルパー関数
 */
function yieldToUI(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * フロンティアビジネス部の名前を統合し、階層関係を修正
 */
export async function fixFrontierBusinessDepartment() {
  try {
    console.log('=== フロンティアビジネス部の名前統合と階層関係の修正を開始します ===\n');

    // UIスレッドを解放
    await yieldToUI();

    // 1. 情報・通信部門を検索（名前で直接検索 - 高速）
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

    // 2. フロンティアビジネス部を検索（名前で直接検索 - 高速）
    console.log('フロンティアビジネス部を検索中...');
    const frontierCandidates = await searchOrgsByName('フロンティアビジネス部');
    
    await yieldToUI();
    
    // バリエーションに一致する組織をフィルタリング
    const frontierVariations = [
      'B5： フロンティアビジネス部',
      'B5：*フロンティアビジネス部',
      'B5：フロンティアビジネス部',
      'フロンティアビジネス部',
    ];
    
    const foundFrontierOrgs = frontierCandidates.filter((org: any) =>
      frontierVariations.some(variation => isNameMatch(org.name, variation))
    );

    // 重複を除去（IDで）
    const uniqueFrontierOrgs = foundFrontierOrgs.filter((org: any, index: number, self: any[]) =>
      index === self.findIndex((o: any) => o.id === org.id)
    );

    if (uniqueFrontierOrgs.length === 0) {
      throw new Error('フロンティアビジネス部が見つかりません');
    }

    console.log(`見つかったフロンティアビジネス部の組織:`);
    uniqueFrontierOrgs.forEach((org: any, index: number) => {
      console.log(`  ${index + 1}. ID: ${org.id}, 名前: ${org.name}, 親ID: ${org.parentId || '(なし)'}`);
    });
    console.log('');

    // 3. メインの組織を決定（最初に見つかったもの、または既に正しい親IDを持っているもの）
    let mainOrg = uniqueFrontierOrgs.find((org: any) => org.parentId === divisionOrg.id);
    if (!mainOrg) {
      mainOrg = uniqueFrontierOrgs[0];
    }

    console.log(`メインの組織として使用: ID: ${mainOrg.id}, 名前: ${mainOrg.name}\n`);

    await yieldToUI();

    // 4. メインの組織の名前を "B5：フロンティアビジネス部" に統一
    const targetName = 'B5：フロンティアビジネス部';
    if (mainOrg.name !== targetName) {
      console.log(`名前を「${mainOrg.name}」から「${targetName}」に変更します...`);
      await updateOrg(mainOrg.id, targetName, undefined, undefined, undefined);
      await yieldToUI();
      console.log(`✅ 名前を「${targetName}」に変更しました\n`);
    } else {
      console.log(`✅ 名前は既に「${targetName}」です\n`);
    }

    // 5. メインの組織の親IDを情報・通信部門に設定（必要に応じて）
    if (mainOrg.parentId !== divisionOrg.id) {
      console.log(`親組織を情報・通信部門（ID: ${divisionOrg.id}）に設定します...`);
      await updateOrgParent(mainOrg.id, divisionOrg.id);
      await yieldToUI();
      console.log(`✅ 親組織を情報・通信部門（ID: ${divisionOrg.id}）に設定しました\n`);
    } else {
      console.log(`✅ 親組織は既に情報・通信部門（ID: ${divisionOrg.id}）に設定されています\n`);
    }

    // 6. 他のフロンティアビジネス部の組織がある場合、それらをメインの組織に統合
    const otherOrgs = uniqueFrontierOrgs.filter((org: any) => org.id !== mainOrg.id);
    if (otherOrgs.length > 0) {
      console.log(`他のフロンティアビジネス部の組織が見つかりました（統合が必要）:`);
      otherOrgs.forEach((org: any, index: number) => {
        console.log(`  ${index + 1}. ID: ${org.id}, 名前: ${org.name}`);
      });
      console.warn(`⚠️  注意: これらの組織は手動で削除または統合する必要があります。`);
      console.warn(`   メインの組織ID: ${mainOrg.id}`);
      console.warn(`   統合対象の組織ID: ${otherOrgs.map((o: any) => o.id).join(', ')}\n`);
    }

    console.log('=== 修正完了 ===');
    return {
      success: true,
      mainOrgId: mainOrg.id,
      mainOrgName: targetName,
      parentOrgId: divisionOrg.id,
      parentOrgName: divisionOrg.name,
      otherOrgs: otherOrgs.map((o: any) => ({ id: o.id, name: o.name })),
    };
  } catch (error: any) {
    console.error('❌ フロンティアビジネス部の修正に失敗しました:', error);
    throw error;
  }
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  (window as any).fixFrontierBusinessDepartment = fixFrontierBusinessDepartment;
}
