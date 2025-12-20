/**
 * 事業会社データを階層構造に変換
 * 
 * ⚠️ Companiesテーブル削除のため、この関数は無効化されています
 */

// import type { Company } from './companiesApi'; // Companiesテーブル削除のためコメントアウト
import type { CompanyNodeData } from '@/components/CompanyChart';

/**
 * 事業会社データを階層構造に変換
 * 階層: 主管カンパニー -> 主管部門 -> 主管部 -> 事業会社
 * 
 * ⚠️ Companiesテーブル削除のため、この関数は空の階層を返します
 */
export function buildCompanyHierarchy(companies: any[]): CompanyNodeData {
  // Companiesテーブル削除のため、空の階層を返す
  return {
    id: 'root',
    name: '統合会社',
    title: '事業会社一覧',
    children: [],
  };
  
  /* 以下は無効化されたコード
  // 階層構造を構築
  const hierarchy: {
    [companyKey: string]: {
      [divisionKey: string]: {
        [departmentKey: string]: Company[];
      };
    };
  } = {};

  companies.forEach((company) => {
    const companyKey = company.company || 'その他';
    const divisionKey = company.division || 'その他';
    // 「*」を削除（「B2：*情報産業ビジネス部」のような形式にも対応）
    const departmentKey = (company.department || 'その他')
      .replace(/：\*+/g, '：') // 「：*」を「：」に置換
      .replace(/^\*+/, '') // 先頭の「*」を削除
      .trim();

    if (!hierarchy[companyKey]) {
      hierarchy[companyKey] = {};
    }
    if (!hierarchy[companyKey][divisionKey]) {
      hierarchy[companyKey][divisionKey] = {};
    }
    if (!hierarchy[companyKey][divisionKey][departmentKey]) {
      hierarchy[companyKey][divisionKey][departmentKey] = [];
    }

    hierarchy[companyKey][divisionKey][departmentKey].push(company);
  });

  // CompanyNodeDataに変換
  const root: CompanyNodeData = {
    id: 'root',
    name: '統合会社',
    title: '事業会社一覧',
    children: [],
  };

  // 主管カンパニーごとに処理
  Object.keys(hierarchy).forEach((companyKey) => {
    const companyNode: CompanyNodeData = {
      id: `company-${companyKey}`,
      name: companyKey,
      title: '主管カンパニー',
      children: [],
    };

    // 主管部門ごとに処理
    Object.keys(hierarchy[companyKey]).forEach((divisionKey) => {
      const divisionNode: CompanyNodeData = {
        id: `division-${companyKey}-${divisionKey}`,
        name: divisionKey,
        title: '主管部門',
        children: [],
      };

      // 主管部ごとに処理
      Object.keys(hierarchy[companyKey][divisionKey]).forEach((departmentKey) => {
        const departmentCompanies = hierarchy[companyKey][divisionKey][departmentKey];
        const departmentNode: CompanyNodeData = {
          id: `department-${companyKey}-${divisionKey}-${departmentKey}`,
          name: departmentKey,
          title: '主管部',
          companies: departmentCompanies,
        };

        divisionNode.children!.push(departmentNode);
      });

      companyNode.children!.push(divisionNode);
    });

    root.children!.push(companyNode);
  });

  return root;
  */
}
