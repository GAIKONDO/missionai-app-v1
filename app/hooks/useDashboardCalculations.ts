'use client';

import { useMemo } from 'react';
import type { OrgNodeData } from '@/lib/orgApi';
import type { Theme, FocusInitiative } from '@/lib/orgApi';
import { getOrgIdsWithDescendants, type OrgWithDepth, type HierarchyLevel } from '../utils/organizationUtils';

interface UseDashboardCalculationsProps {
  selectedTypeFilter: 'all' | 'organization' | 'company' | 'person';
  hierarchyLevels: HierarchyLevel[];
  selectedLevel: number | null;
  orgTree: OrgNodeData | null;
  filteredOrgIds: Set<string>;
  themes: Theme[];
  filteredThemeIds: Set<string>;
  initiatives: FocusInitiative[];
  selectedThemeId: string | null;
}

export function useDashboardCalculations({
  selectedTypeFilter,
  hierarchyLevels,
  selectedLevel,
  orgTree,
  filteredOrgIds,
  themes,
  filteredThemeIds,
  initiatives,
  selectedThemeId,
}: UseDashboardCalculationsProps) {
  // 選択された階層レベルの組織を取得（組織モード）
  const selectedLevelOrgs = useMemo(() => {
    if (selectedLevel === null) return [];
    const levelData = hierarchyLevels.find(l => l.level === selectedLevel);
    const orgs = levelData?.orgs || [];
    
    // フィルター適用
    if (filteredOrgIds.size > 0) {
      return orgs.filter(org => filteredOrgIds.has(org.id));
    }
    
    return orgs;
  }, [selectedTypeFilter, selectedLevel, hierarchyLevels, filteredOrgIds]);

  // 表示する事業会社を取得（type='company'の組織を表示）
  const selectedLevelCompanies = useMemo(() => {
    if (selectedTypeFilter !== 'company') return [];
    
    // 選択された階層レベルの組織から、type='company'のものを取得
    const levelData = hierarchyLevels.find(l => l.level === selectedLevel);
    const orgs = levelData?.orgs || [];
    const companies = orgs.filter(org => {
      // orgTreeから実際のtypeを取得
      const findOrg = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
        if (node.id === targetId) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findOrg(child, targetId);
            if (found) return found;
          }
        }
        return null;
      };
      const actualOrg = orgTree ? findOrg(orgTree, org.id) : null;
      return actualOrg && (actualOrg as any).type === 'company';
    });
    
    // フィルター適用（組織フィルター）
    if (filteredOrgIds.size > 0) {
      return companies.filter(company => {
        return filteredOrgIds.has(company.id);
      });
    }
    
    return companies;
  }, [selectedTypeFilter, hierarchyLevels, selectedLevel, orgTree, filteredOrgIds]);

  // レベル1とレベル2の組織を取得（フィルターボタン用）
  const level1And2Orgs = useMemo(() => {
    const level1Orgs = hierarchyLevels.find(l => l.level === 0)?.orgs || [];
    const level2Orgs = hierarchyLevels.find(l => l.level === 1)?.orgs || [];
    return [...level1Orgs, ...level2Orgs];
  }, [hierarchyLevels]);

  // 選択された階層レベルの組織とその子孫組織IDのマップを取得
  const orgIdsWithDescendants = useMemo(() => {
    if (selectedLevelOrgs.length === 0) return new Map<string, string[]>();
    return getOrgIdsWithDescendants(orgTree, selectedLevelOrgs);
  }, [orgTree, selectedLevelOrgs]);

  // フィルター適用後のテーマリスト
  const filteredThemes = useMemo(() => {
    let result = filteredThemeIds.size === 0 
      ? themes 
      : themes.filter(theme => filteredThemeIds.has(theme.id));
    
    // positionでソート（positionがnullの場合は最後に）
    result = [...result].sort((a, b) => {
      const posA = a.position ?? 999999;
      const posB = b.position ?? 999999;
      if (posA !== posB) return posA - posB;
      // positionが同じ場合は既存のソート順を使用
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA; // DESC
      return (a.title || '').localeCompare(b.title || ''); // ASC
    });
    
    return result;
  }, [themes, filteredThemeIds]);

  // テーマ×組織の施策件数を集計（子組織の施策も含める）
  const chartDataOrganization = useMemo(() => {
    if (selectedTypeFilter === 'company' || filteredThemes.length === 0 || selectedLevelOrgs.length === 0) {
      return [];
    }

    const data: Array<{
      theme: string;
      themeId: string;
      organization: string;
      organizationId: string;
      count: number;
    }> = [];

    // 各テーマと各組織の組み合わせで集計
    filteredThemes.forEach(theme => {
      selectedLevelOrgs.forEach(org => {
        // この組織とその子孫組織のIDを取得
        const orgIdsToInclude = orgIdsWithDescendants.get(org.id) || [org.id];

        // この組織とその子孫組織の施策で、このテーマに関連するものをカウント
        const relatedInitiatives = initiatives.filter(init => {
          // 組織IDが対象組織またはその子孫組織に含まれるかチェック
          if (!init.organizationId || !orgIdsToInclude.includes(init.organizationId)) return false;

          // themeId（単一）またはthemeIds（配列）でチェック
          if (theme.id && init.themeId === theme.id) return true;
          if (theme.id && Array.isArray(init.themeIds) && init.themeIds.includes(theme.id)) return true;
          return false;
        });

        data.push({
          theme: theme.title,
          themeId: theme.id,
          organization: org.name,
          organizationId: org.id,
          count: relatedInitiatives.length,
        });
      });
    });

    return data;
  }, [selectedTypeFilter, filteredThemes, selectedLevelOrgs, initiatives, orgIdsWithDescendants]);

  // テーマ×事業会社の施策件数を集計（type='company'の組織用）
  const chartDataCompany = useMemo(() => {
    if (selectedTypeFilter !== 'company' || filteredThemes.length === 0 || selectedLevelCompanies.length === 0) {
      return [];
    }

    const data: Array<{
      theme: string;
      themeId: string;
      organization: string;
      organizationId: string;
      count: number;
    }> = [];

    filteredThemes.forEach(theme => {
      selectedLevelCompanies.forEach(company => {
        // 事業会社の管理はorganizationsテーブルのtypeカラムで行うため、initiativesから取得
        const relatedInitiatives = initiatives.filter(init => {
          if (init.organizationId !== company.id) return false;
          if (Array.isArray(init.themeIds) && init.themeIds.includes(theme.id)) return true;
          if (init.themeId === theme.id) return true;
          return false;
        });

        const count = relatedInitiatives.length;
        
        // 施策が0件の事業会社は凡例に表示しないため、データから除外
        // テーマは0件でも表示される（X軸のdomain設定で対応）
        if (count > 0) {
          data.push({
            theme: theme.title,
            themeId: theme.id,
            organization: company.name,
            organizationId: company.id,
            count: count,
          });
        }
      });
    });

    return data;
  }, [selectedTypeFilter, filteredThemes, selectedLevelCompanies, initiatives]);

  // 表示モードに応じて適切なデータを返す
  const chartData = useMemo(() => {
    return selectedTypeFilter === 'company' ? chartDataCompany : chartDataOrganization;
  }, [selectedTypeFilter, chartDataOrganization, chartDataCompany]);

  // 選択されたテーマに関連する注力施策を取得（組織モード）
  const selectedThemeInitiatives = useMemo(() => {
    if (selectedTypeFilter === 'company' || !selectedThemeId) return [];

    // 選択された階層レベルの組織とその子孫組織IDを取得
    const orgIdsToInclude = Array.from(orgIdsWithDescendants.values()).flat();

    return initiatives.filter(init => {
      // 組織IDが対象組織またはその子孫組織に含まれるかチェック
      if (!init.organizationId || !orgIdsToInclude.includes(init.organizationId)) return false;

      // themeId（単一）またはthemeIds（配列）でチェック
      if (selectedThemeId && init.themeId === selectedThemeId) return true;
      if (selectedThemeId && Array.isArray(init.themeIds) && init.themeIds.includes(selectedThemeId)) return true;
      return false;
    });
  }, [selectedTypeFilter, selectedThemeId, initiatives, orgIdsWithDescendants]);

  // 選択されたテーマに関連する事業会社の注力施策を取得（事業会社モード）
  const selectedThemeCompanyInitiatives = useMemo(() => {
    if (selectedTypeFilter !== 'company' || !selectedThemeId) return [];
    
    // 事業会社の管理はorganizationsテーブルのtypeカラムで行うため、companyInitiativesは使用しない
    // 代わりに、initiativesからtype='company'の組織の施策を取得
    return initiatives.filter(init => {
      // 組織IDからtypeを確認
      const findOrg = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
        if (node.id === targetId) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findOrg(child, targetId);
            if (found) return found;
          }
        }
        return null;
      };
      const org = orgTree ? findOrg(orgTree, init.organizationId || '') : null;
      if (!org || (org as any).type !== 'company') return false;
      
      if (Array.isArray(init.themeIds) && init.themeIds.includes(selectedThemeId)) {
        return true;
      }
      return false;
    });
  }, [selectedTypeFilter, selectedThemeId, initiatives, orgTree]);

  // 選択されたテーマの情報を取得
  const selectedTheme = useMemo(() => {
    if (!selectedThemeId) return null;
    return themes.find(t => t.id === selectedThemeId);
  }, [selectedThemeId, themes]);

  // フィルター適用後の施策総数を計算
  const filteredInitiativeCount = useMemo(() => {
    if (selectedTypeFilter !== 'company') {
      // 組織/個人/すべてモード
      const orgIdsToInclude = Array.from(orgIdsWithDescendants.values()).flat();
      const filteredOrgIdsArray = filteredOrgIds.size > 0 
        ? Array.from(filteredOrgIds)
        : orgIdsToInclude;
      
      const filteredThemeIdsArray = filteredThemeIds.size > 0
        ? Array.from(filteredThemeIds)
        : filteredThemes.map(t => t.id);
      
      return initiatives.filter(i => {
        if (!i.organizationId) return false;
        const orgMatch = filteredOrgIdsArray.includes(i.organizationId);
        if (!orgMatch) return false;
        
        const themeMatch = filteredThemeIdsArray.some(themeId => {
          if (i.themeId === themeId) return true;
          if (Array.isArray(i.themeIds) && i.themeIds.includes(themeId)) return true;
          return false;
        });
        
        return themeMatch;
      }).length;
    } else {
      // 事業会社モード（type='company'の組織の施策を取得）
      const filteredThemeIdsArray = filteredThemeIds.size > 0
        ? Array.from(filteredThemeIds)
        : filteredThemes.map(t => t.id);

      // 事業会社の管理はorganizationsテーブルのtypeカラムで行うため、initiativesからtype='company'の組織の施策を取得
      let filteredInitiatives = initiatives.filter(init => {
        const findOrg = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
          if (node.id === targetId) return node;
          if (node.children) {
            for (const child of node.children) {
              const found = findOrg(child, targetId);
              if (found) return found;
            }
          }
          return null;
        };
        const org = orgTree ? findOrg(orgTree, init.organizationId || '') : null;
        return org && (org as any).type === 'company';
      });
      
      // 組織フィルター
      if (filteredOrgIds.size > 0) {
        filteredInitiatives = filteredInitiatives.filter(init => {
          return init.organizationId && filteredOrgIds.has(init.organizationId);
        });
      }
      
      // テーマフィルター
      return filteredInitiatives.filter(init => {
        return filteredThemeIdsArray.some(themeId => {
          if (Array.isArray(init.themeIds) && init.themeIds.includes(themeId)) return true;
          return false;
        });
      }).length;
    }
  }, [selectedTypeFilter, initiatives, orgIdsWithDescendants, filteredOrgIds, filteredThemeIds, filteredThemes, orgTree]);

  return {
    selectedLevelOrgs,
    selectedLevelCompanies,
    level1And2Orgs,
    orgIdsWithDescendants,
    filteredThemes,
    chartDataOrganization,
    chartDataCompany,
    chartData,
    selectedTheme,
    selectedThemeInitiatives,
    selectedThemeCompanyInitiatives,
    filteredInitiativeCount,
  };
}

