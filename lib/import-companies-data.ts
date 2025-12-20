/**
 * 事業会社のサンプルデータをインポートするスクリプト
 * 
 * ⚠️ Companiesテーブル削除のため、このスクリプトは無効化されています
 */

// import { createCompany } from './companiesApi'; // Companiesテーブル削除のためコメントアウト
import { callTauriCommand } from './localFirebase';

// 提供されたデータをパース
const companiesData = `B02465	エヌシーアイ総合システム（株）	関連B	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	国内
B05477	伊藤忠テクノソリューションズ（株）	子会社A	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	国内
B10747	伊藤忠ケーブルシステム（株）	子会社B	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	国内
B11297	日本テレマティーク（株）	関連B	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	国内
B16192	ＣＴＣテクノロジー（株）	孫（事業）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	国内
B16193	ＣＴＣエスピー（株）	孫（事業）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	国内
B34546	ITOCHU TECHNO-SOLUTIONS AMERICA, INC. (CTCA)	孫（事業）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	海外
B34889	NHK COSMOMEDIA AMERICA, INC. (NCMA)	孫（事業）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	海外
B47438	ADVANCED MEDIA TECHNOLOGIES, INC. (AMT)	子会社・海外	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	海外
B76022	ＣＴＣビジネスサービス（株）	孫（事業）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	国内
B82264	ＣＴＣファシリティーズ（株）	孫（事業）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	国内
B89554	アサヒビジネスソリューションズ（株）	孫（事業）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	国内
C11569	ＣＴＣシステムマネジメント（株）	孫（事業）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	国内
C21386	CTC GLOBAL (THAILAND) LTD. (CTCTH)	孫（事業）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	海外
C22154	AVIDEX INDUSTRIES, L.L.C. (AVIDEX)	子会社・海外	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	海外
C22512	CTC GLOBAL PTE. LTD. (CTCSG)	孫（事業）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	海外
C22513	CTC GLOBAL SDN. BHD. (CTCMY)	孫（事業）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	海外
C32726	ＣＴＣビジネスエキスパート（株）	孫（事業）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	国内
C34168	ウイングアーク１ｓｔ（株）	孫（上場）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	国内
C35958	PT. NUSANTARA COMPNET INTEGRATOR (NUSANTARA COMPNET INTEGRATOR)	孫（事業）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	海外
C35959	PT. PRO SISTIMATIKA AUTOMASI (PRO SISTIMATIKA AUTOMASI)	孫（事業）	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	海外
C36108	ＩＷ．ＤＸパートナーズ（株）	子会社B	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	国内
C42359	Ｉ＆Ｂコンサルティング（株）	子会社B	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	国内
C44115	THOMAS GALLAWAY COMPANY, LLC (TGT)	関連・海外	C0S：情金	8N： 情報・通信部門	B2：*情報産業ビジネス部	海外
B05459	伊藤忠インタラクティブ（株）	子会社B	C0S：情金	8N： 情報・通信部門	B3：*通信ビジネス部	国内
B76529	マイボイスコム（株）	孫（事業）	C0S：情金	8N： 情報・通信部門	B3：*通信ビジネス部	国内
B97523	アシュリオン・ジャパン（株）	関連B	C0S：情金	8N： 情報・通信部門	B3：*通信ビジネス部	国内
C11491	FERNANDO CAPITAL COMPANY LTD. (FERNANDO)	子会社・海外	C0S：情金	8N： 情報・通信部門	B3：*通信ビジネス部	海外
C25983	（株）ベルシステム２４ホールディングス	関連・上場	C0S：情金	8N： 情報・通信部門	B3：*通信ビジネス部	国内
C29679	WE SELL CELLULAR LLC (WE SELL CELLULAR LLC)	子会社・海外	C0S：情金	8N： 情報・通信部門	B3：*通信ビジネス部	海外
C35006	（株）Ｂｅｌｏｎｇ	子会社B	C0S：情金	8N： 情報・通信部門	B3：*通信ビジネス部	国内
C38045	ジーアイクラウド（株）	孫（事業）	C0S：情金	8N： 情報・通信部門	B3：*通信ビジネス部	国内
C40184	ＡＫＱＡ　ＵＫＡ（株）	孫（事業）	C0S：情金	8N： 情報・通信部門	B3：*通信ビジネス部	国内
C42202	辻・本郷ＩＴコンサルティング（株）	関連B	C0S：情金	8N： 情報・通信部門	B3：*通信ビジネス部	国内
B13519	（株）パスコ	孫（事業）	C0S：情金	8N：*情報・通信部門	B5： フロンティアビジネス部	国内
B15233	センチュリーメディカル（株）	子会社B	C0S：情金	8N： 情報・通信部門	B5：*フロンティアビジネス部	国内
B78011	伊藤忠テクノロジーベンチャーズ（株）	子会社B	C0S：情金	8N： 情報・通信部門	B5：*フロンティアビジネス部	国内
B92485	エイツーヘルスケア（株）	子会社B	C0S：情金	8N： 情報・通信部門	B5：*フロンティアビジネス部	国内
C07393	（株）スカパーＪＳＡＴホールディングス	孫（上場）	C0S：情金	8N： 情報・通信部門	B5：*フロンティアビジネス部	国内
C12764	ITC VENTURES XI, INC. (ITC VENTURES XI, INC.)	子会社・海外	C0S：情金	8N： 情報・通信部門	B5：*フロンティアビジネス部	海外
C14335	東洋メディック（株）	子会社B	C0S：情金	8N：*情報・通信部門	B5： フロンティアビジネス部	国内
C25335	A2 HEALTHCARE TAIWAN CORPORATION (A2TW)	孫（事業）	C0S：情金	8N： 情報・通信部門	B5：*フロンティアビジネス部	海外
C25534	伊藤忠・フジ・パートナーズ（株）	子会社B	C0S：情金	8N： 情報・通信部門	B5：*フロンティアビジネス部	国内
C34823	DOCQUITY HOLDINGS PTE. LTD. (DOCQUITY HOLDINGS PTE. LTD.)	関連・海外	C0S：情金	8N： 情報・通信部門	B5：*フロンティアビジネス部	海外
C38727	RIGHTS & BRANDS ASIA LIMITED (RBA)	関連・海外	C0S：情金	8N： 情報・通信部門	B5：*フロンティアビジネス部	海外
C39469	ＴＸＰ　Ｍｅｄｉｃａｌ（株）	関連B	C0S：情金	8N： 情報・通信部門	B5：*フロンティアビジネス部	国内
C42733	ＩＳフロンティアパートナーズ（株）	子会社B	C0S：情金	8N： 情報・通信部門	B5：*フロンティアビジネス部	国内
C43867	ITC VENTURE PARTNERS, INC (IVP)	子会社・海外	C0S：情金	8N：*情報・通信部門	B5： フロンティアビジネス部	海外
C44490	（株）アイライツポート	子会社B	C0S：情金	8N：*情報・通信部門	B5： フロンティアビジネス部	国内
B44413	ITOCHU FINANCE (ASIA) LTD. (IFA)	子会社・海外	C0S：情金	8T： 金融・保険部門	M2：*金融ビジネス部	海外
B58769	ポケットカード（株）	孫（事業）	C0S：情金	8T： 金融・保険部門	M2：*金融ビジネス部	国内
B62650	UNITED ASIA FINANCE LIMITED (UAF)	孫（事業）	C0S：情金	8T： 金融・保険部門	M2：*金融ビジネス部	海外
B75554	FIRST RESPONSE FINANCE LIMITED (FRF)	子会社・海外	C0S：情金	8T： 金融・保険部門	M2：*金融ビジネス部	海外
B85858	EASY BUY PUBLIC CO., LTD. (EASY BUY PCL)	孫（事業）	C0S：情金	8T： 金融・保険部門	M2：*金融ビジネス部	海外
C19232	GCT MANAGEMENT (THAILAND) LTD. (GCT)	子会社・海外	C0S：情金	8T： 金融・保険部門	M2：*金融ビジネス部	海外
C26223	（株）ＰＣＨ	子会社B	C0S：情金	8T： 金融・保険部門	M2：*金融ビジネス部	国内
C31965	ACOM CONSUMER FINANCE CORPORATION (ACF)	関連・海外	C0S：情金	8T： 金融・保険部門	M2：*金融ビジネス部	海外
C39004	（株）外為どっとコム	関連B	C0S：情金	8T： 金融・保険部門	M2：*金融ビジネス部	国内
C43436	EASTERN COMMERCIAL LEASING PUBLIC COMPANY LIMITED (EAST)	孫（上場）	C0S：情金	8T： 金融・保険部門	M2：*金融ビジネス部	海外
B07713	伊藤忠オリコ保険サービス（株）	子会社B	C0S：情金	8T： 金融・保険部門	M3：*保険ビジネス部	国内
B24084	COSMOS SERVICES CO., LTD. (COSMOS/HKG)	孫（事業）	C0S：情金	8T： 金融・保険部門	M3：*保険ビジネス部	海外
B25618	SIAM COSMOS SERVICES CO.,LTD. (COSMOS/THAILAND)	孫（事業）	C0S：情金	8T： 金融・保険部門	M3：*保険ビジネス部	海外
B64822	ＣＯＳＭＯＳリスクソリューションズ（株）	子会社B	C0S：情金	8T： 金融・保険部門	M3：*保険ビジネス部	国内
C24833	ほけんの窓口グループ（株）	子会社A	C0S：情金	8T： 金融・保険部門	M3：*保険ビジネス部	国内
C35253	Ｇａｒｄｉａ（株）	孫（事業）	C0S：情金	8T： 金融・保険部門	M3：*保険ビジネス部	国内
C40154	ＦＭ保険サービス（株）	孫（事業）	C0S：情金	8T： 金融・保険部門	M3：*保険ビジネス部	国内
C42152	GR MANAGEMENT (THAILAND) LTD. (GMT)	孫（事業）	C0S：情金	8T：*金融・保険部門	M3： 保険ビジネス部	海外
C43413	THAIVIVAT INSURANCE PUBLIC COMPANY LIMITED (TVI)	孫（事業）	C0S：情金	8T： 金融・保険部門	M3：*保険ビジネス部	海外
C43915	IM HORIZON CORP. (IM HORIZON CORP.)	子会社・海外	C0S：情金	8T： 金融・保険部門	M3：*保険ビジネス部	海外
C43983	CHURCHILL INNOVATIVE HOLDINGS LLC (CHURCHILL INNOVATIVE HOLDINGS LLC)	孫（事業）	C0S：情金	8T： 金融・保険部門	M3：*保険ビジネス部	海外`;

interface ParsedCompanyData {
  code: string;
  name: string;
  nameShort: string | null;
  category: string;
  company: string; // 主管カンパニー
  division: string; // 主管部門
  department: string; // 主管部
  region: string;
}

/**
 * データをパース
 */
function parseCompaniesData(data: string): ParsedCompanyData[] {
  const lines = data.trim().split('\n');
  return lines.map((line) => {
    const parts = line.split('\t');
    if (parts.length < 7) {
      throw new Error(`Invalid data line: ${line}`);
    }
    
    // 略称を抽出（括弧内のテキスト）
    const nameWithShort = parts[1];
    const shortMatch = nameWithShort.match(/\(([^)]+)\)$/);
    const nameShort = shortMatch ? shortMatch[1] : null;
    const name = nameShort ? nameWithShort.replace(`(${nameShort})`, '').trim() : nameWithShort.trim();
    
    return {
      code: parts[0].trim(),
      name: name,
      nameShort: nameShort,
      category: parts[2].trim(),
      company: parts[3].trim(),
      division: parts[4].trim(),
      department: parts[5].trim(),
      region: parts[6].trim(),
    };
  });
}

/**
 * 組織名から組織IDを取得
 */
async function findOrganizationIdByName(
  orgTree: any[],
  targetName: string
): Promise<string | null> {
  for (const node of orgTree) {
    const org = node.organization;
    // 完全一致または部分一致をチェック
    if (org.name === targetName || org.name.includes(targetName) || targetName.includes(org.name)) {
      return org.id;
    }
    // 子組織を再帰的に検索
    if (node.children && node.children.length > 0) {
      const found = await findOrganizationIdByName(node.children, targetName);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 主管部の名前から組織IDを取得
 * 例: "B2：*情報産業ビジネス部" -> "情報産業ビジネス部" または "B2"
 */
function findDepartmentIdByName(
  orgNode: any,
  departmentName: string
): string | null {
  // "B2：*情報産業ビジネス部" から "情報産業ビジネス部" を抽出
  const cleanName = departmentName.replace(/^[^：]*：\*?/, '').trim();
  
  // 検索キーワードのリストを作成
  const searchKeywords = [
    cleanName,
    cleanName.replace(/ビジネス部$/, '部'), // "情報産業ビジネス部" -> "情報産業部"
    cleanName.replace(/部$/, ''), // "情報産業ビジネス部" -> "情報産業ビジネス"
  ];
  
  // 再帰的に組織を検索
  function findOrganization(org: any): any {
    const orgData = org.organization || org;
    if (!orgData || !orgData.name) {
      return null;
    }
    
    // 各キーワードでマッチング
    for (const keyword of searchKeywords) {
      if (
        orgData.name === keyword ||
        orgData.name.includes(keyword) ||
        keyword.includes(orgData.name) ||
        orgData.name.replace(/ビジネス部$/, '部') === keyword ||
        orgData.name.replace(/部$/, '') === keyword
      ) {
        return org;
      }
    }
    
    // 子組織を再帰的に検索
    if (org.children && org.children.length > 0) {
      for (const child of org.children) {
        const found = findOrganization(child);
        if (found) return found;
      }
    }
    return null;
  }
  
  // ルートノードから検索
  const foundOrg = findOrganization(orgNode);
  if (foundOrg) {
    const orgData = foundOrg.organization || foundOrg;
    return orgData.id;
  }
  
  return null;
}

/**
 * 事業会社データをインポート
 */
export async function importCompaniesData() {
  console.warn('⚠️ Companiesテーブルが削除されたため、このインポートスクリプトは使用できません');
  return { created: 0, skipped: 0, errors: 0 };
  
  /* 以下は無効化されたコード
  try {
    console.log('=== 事業会社データのインポートを開始します ===\n');

    // 組織データを取得（生の配列データ）
    const orgTreeArray = await callTauriCommand('get_org_tree', { rootId: null });
    if (!orgTreeArray || orgTreeArray.length === 0) {
      throw new Error('組織データが見つかりません。先に組織構造を作成してください。');
    }

    // 最初のルートノードを使用
    const orgTree = orgTreeArray[0];

    // データをパース
    const parsedData = parseCompaniesData(companiesData);
    console.log(`パースされた事業会社数: ${parsedData.length}`);

    // 既存の事業会社を確認
    const { getAllCompanies } = await import('./companiesApi');
    const existingCompanies = await getAllCompanies();
    const existingCodes = new Set(existingCompanies.map(c => c.code));
    
    let created = 0;
    let skipped = 0;
    let errors = 0;

    // 各事業会社をインポート
    for (const companyData of parsedData) {
      try {
        // 既に存在する場合はスキップ
        if (existingCodes.has(companyData.code)) {
          console.log(`⏭️  スキップ: ${companyData.code} - ${companyData.name} (既に存在)`);
          skipped++;
          continue;
        }

        // 主管部の組織IDを取得
        let organizationId = findDepartmentIdByName(orgTree, companyData.department);
        
        // 見つからない場合は、より柔軟な検索を試みる
        if (!organizationId) {
          // 部門名からも検索を試みる
          const divisionCleanName = companyData.division.replace(/^[^：]*：\*?/, '').trim();
          organizationId = findDepartmentIdByName(orgTree, divisionCleanName);
        }
        
        if (!organizationId) {
          console.warn(`⚠️  組織が見つかりません: ${companyData.department} (${companyData.name})`);
          console.warn(`   主管部門: ${companyData.division}`);
          // 組織が見つからない場合はスキップ（エラーとして扱う）
          errors++;
          continue;
        }

        // 事業会社を作成
        await createCompany(
          companyData.code,
          companyData.name,
          companyData.nameShort,
          companyData.category,
          organizationId,
          companyData.company,
          companyData.division,
          companyData.department,
          companyData.region,
          0 // position
        );

        console.log(`✅ 作成: ${companyData.code} - ${companyData.name}`);
        created++;
      } catch (error: any) {
        console.error(`❌ エラー: ${companyData.code} - ${companyData.name}:`, error.message);
        errors++;
      }
    }

    console.log(`\n=== インポート完了 ===`);
    console.log(`作成: ${created}件`);
    console.log(`スキップ: ${skipped}件`);
    console.log(`エラー: ${errors}件`);

    return { created, skipped, errors };
  } catch (error: any) {
    console.error('❌ 事業会社データのインポートに失敗しました:', error);
    throw error;
  }
  */
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  (window as any).importCompaniesData = importCompaniesData;
}
