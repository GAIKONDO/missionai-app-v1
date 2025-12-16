'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Layout from '@/components/Layout';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getOrgTreeFromDb, getAllOrganizationsFromTree, type OrgNodeData } from '@/lib/orgApi';
import { getThemes, getFocusInitiatives, type Theme, type FocusInitiative } from '@/lib/orgApi';
import { getAllCompanies, getCompanyFocusInitiatives, updateCompany, type Company, type CompanyFocusInitiative } from '@/lib/companiesApi';
import dynamic from 'next/dynamic';
import html2canvas from 'html2canvas';

// 開発環境でのみログを有効化するヘルパー関数（パフォーマンス最適化）
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};
const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

// VegaChartを動的インポート（SSRを回避）
const DynamicVegaChart = dynamic(() => import('@/components/VegaChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      グラフを読み込み中...
    </div>
  ),
});

// 組織の階層レベル情報
interface OrgWithDepth {
  id: string;
  name: string;
  depth: number;
  path: string[]; // ルートから現在の組織までのパス
}

// 階層レベルごとの組織グループ
interface HierarchyLevel {
  level: number;
  orgs: OrgWithDepth[];
}

// 表示モードの型定義
type DashboardViewMode = 'organization' | 'company';

/**
 * 組織ツリーから階層レベルごとの組織を抽出
 */
function extractOrganizationsByDepth(orgTree: OrgNodeData | null): HierarchyLevel[] {
  if (!orgTree) return [];

  const orgsByDepth = new Map<number, OrgWithDepth[]>();

  function traverse(node: OrgNodeData, depth: number, path: string[]) {
    if (!node.id) return;

    const orgWithDepth: OrgWithDepth = {
      id: node.id,
      name: node.name || node.title || node.id,
      depth,
      path: [...path, node.name || node.title || node.id],
    };

    if (!orgsByDepth.has(depth)) {
      orgsByDepth.set(depth, []);
    }
    orgsByDepth.get(depth)!.push(orgWithDepth);

    if (node.children) {
      for (const child of node.children) {
        traverse(child, depth + 1, orgWithDepth.path);
      }
    }
  }

  traverse(orgTree, 0, []);

  // Mapを配列に変換してソート
  return Array.from(orgsByDepth.entries())
    .map(([level, orgs]) => ({ level, orgs }))
    .sort((a, b) => a.level - b.level);
}

/**
 * 組織ツリーから指定された組織IDの子孫組織IDをすべて取得（再帰的）
 */
function getDescendantOrgIds(orgTree: OrgNodeData | null, orgId: string): string[] {
  if (!orgTree) return [];

  const descendantIds: string[] = [];

  function findAndCollect(node: OrgNodeData, targetId: string, collecting: boolean) {
    if (!node.id) return false;

    const isTarget = node.id === targetId;
    const shouldCollect = collecting || isTarget;

    if (shouldCollect && !isTarget) {
      // ターゲット組織自体は除外（子孫のみ）
      descendantIds.push(node.id);
    }

    if (node.children) {
      for (const child of node.children) {
        findAndCollect(child, targetId, shouldCollect);
      }
    }

    return isTarget;
  }

  findAndCollect(orgTree, orgId, false);
  return descendantIds;
}

/**
 * 組織ツリーから指定された階層レベルの組織とその子孫組織IDをすべて取得
 */
function getOrgIdsWithDescendants(
  orgTree: OrgNodeData | null,
  selectedLevelOrgs: OrgWithDepth[]
): Map<string, string[]> {
  const orgIdsMap = new Map<string, string[]>();

  selectedLevelOrgs.forEach(org => {
    const descendantIds = getDescendantOrgIds(orgTree, org.id);
    // 自分自身も含める
    orgIdsMap.set(org.id, [org.id, ...descendantIds]);
  });

  return orgIdsMap;
}

/**
 * 事業会社を組織の階層レベルごとにグループ化
 */
function extractCompaniesByOrganizationDepth(
  orgTree: OrgNodeData | null,
  companies: Company[]
): HierarchyLevel[] {
  if (!orgTree) return [];

  // 組織IDから階層レベル（depth）を取得する関数
  function getOrgDepth(orgId: string, node: OrgNodeData, depth: number): number | null {
    if (node.id === orgId) return depth;
    if (node.children) {
      for (const child of node.children) {
        const result = getOrgDepth(orgId, child, depth + 1);
        if (result !== null) return result;
      }
    }
    return null;
  }

  // 事業会社を階層レベルごとにグループ化
  const companiesByDepth = new Map<number, Array<{ company: Company; orgDepth: number }>>();

  companies.forEach(company => {
    const orgDepth = getOrgDepth(company.organizationId, orgTree, 0);
    if (orgDepth === null) return; // 組織が見つからない場合はスキップ

    if (!companiesByDepth.has(orgDepth)) {
      companiesByDepth.set(orgDepth, []);
    }
    companiesByDepth.get(orgDepth)!.push({ company, orgDepth });
  });

  // Mapを配列に変換してソート
  return Array.from(companiesByDepth.entries())
    .map(([level, items]) => ({
      level,
      orgs: items.map(item => ({
        id: item.company.id,
        name: item.company.name,
        depth: item.orgDepth,
        path: [], // 必要に応じて組織のパスを設定
      })),
    }))
    .sort((a, b) => a.level - b.level);
}

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<DashboardViewMode>('organization');
  const [orgTree, setOrgTree] = useState<OrgNodeData | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [initiatives, setInitiatives] = useState<FocusInitiative[]>([]);
  const [hierarchyLevels, setHierarchyLevels] = useState<HierarchyLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filteredOrgIds, setFilteredOrgIds] = useState<Set<string>>(new Set());
  const [filteredThemeIds, setFilteredThemeIds] = useState<Set<string>>(new Set());
  
  // 事業会社関連の状態
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyInitiatives, setCompanyInitiatives] = useState<CompanyFocusInitiative[]>([]);
  const [companyHierarchyLevels, setCompanyHierarchyLevels] = useState<HierarchyLevel[]>([]);
  const [filteredCompanyIds, setFilteredCompanyIds] = useState<Set<string>>(new Set());

  // グラフと注力施策一覧を含むコンテナの参照
  const chartAndInitiativesRef = useRef<HTMLDivElement>(null);

  // グローバルデバッグ関数を設定（ブラウザコンソールで使用可能）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 最新のデータを取得する関数（開発環境でのみログ出力）
      (window as any).debugCompanyOrgMatching = async () => {
        try {
          devLog('🔍 [デバッグ] 事業会社と組織のIDマッチングを確認します...\n');
          
          const [orgTreeData, allCompaniesData] = await Promise.all([
            getOrgTreeFromDb(),
            getAllCompanies(),
          ]);
          
          if (!orgTreeData) {
            devLog('⚠️ 組織データが取得できませんでした');
            return;
          }
          
          const allOrgs = getAllOrganizationsFromTree(orgTreeData);
          const communicationsOrgs = allOrgs.filter(org => 
            org.name.includes('通信') && 
            (org.name.includes('モバイル') || org.name.includes('ビジネス'))
          );
          
          // 通信ビジネス部を特定
          const communicationsBusinessDept = allOrgs.find(org => 
            org.name === '通信ビジネス部' || org.name.includes('通信ビジネス部')
          );
          
          const tsujimotoCompany = allCompaniesData.find(c => 
            c.name.includes('辻本') || c.name.includes('コンサルティング')
          );
          
          const itochuInteractiveCompany = allCompaniesData.find(c => 
            c.name.includes('インタラクティブ')
          );
          
          devLog('📊 事業会社数:', allCompaniesData.length);
          devLog('📊 組織数:', allOrgs.length);
          devLog('📊 通信関連組織数:', communicationsOrgs.length);
          
          if (communicationsBusinessDept) {
            devLog(`\n✅ 通信ビジネス部を発見: ${communicationsBusinessDept.name} (ID: ${communicationsBusinessDept.id})`);
          } else {
            devWarn('\n⚠️ 通信ビジネス部が見つかりませんでした');
          }
          
          // 辻本郷コンサルティングの確認
          if (tsujimotoCompany) {
            devLog('\n✅ 辻本郷コンサルティング:', {
              id: tsujimotoCompany.id,
              name: tsujimotoCompany.name,
              organizationId: tsujimotoCompany.organizationId
            });
            
            const matchedOrg = allOrgs.find(org => org.id === tsujimotoCompany.organizationId);
            if (matchedOrg) {
              devLog(`\n✅ 紐づいている組織: ${matchedOrg.name} (ID: ${matchedOrg.id}, level: (matchedOrg as any).level)`);
            } else {
              devWarn(`\n⚠️ organizationId "${tsujimotoCompany.organizationId}" に該当する組織が見つかりません`);
            }
            
            if (communicationsBusinessDept) {
              const isMatch = communicationsBusinessDept.id === tsujimotoCompany.organizationId;
              devLog(`\n🔗 通信ビジネス部とのIDマッチング: ${isMatch ? '✅ 一致' : '❌ 不一致'}`);
            }
          }
          
          // 伊藤忠インタラクティブの確認
          if (itochuInteractiveCompany) {
            devLog('\n✅ 伊藤忠インタラクティブ（株）:', {
              id: itochuInteractiveCompany.id,
              name: itochuInteractiveCompany.name,
              organizationId: itochuInteractiveCompany.organizationId,
              department: itochuInteractiveCompany.department || '未設定'
            });
            
            const matchedOrg = allOrgs.find(org => org.id === itochuInteractiveCompany.organizationId);
            if (matchedOrg) {
              devLog(`\n✅ 紐づいている組織: ${matchedOrg.name} (ID: ${matchedOrg.id}, level: (matchedOrg as any).level)`);
            } else {
              devWarn(`\n⚠️ organizationId "${itochuInteractiveCompany.organizationId}" に該当する組織が見つかりません`);
            }
            
            if (communicationsBusinessDept) {
              const isMatch = communicationsBusinessDept.id === itochuInteractiveCompany.organizationId;
              devLog(`\n🔗 通信ビジネス部とのIDマッチング: ${isMatch ? '✅ 一致' : '❌ 不一致'}`);
              
              if (!isMatch) {
                devWarn(`\n⚠️ 問題: 伊藤忠インタラクティブのorganizationIdが通信ビジネス部のIDと一致していません！`);
                devWarn(`   修正が必要です。正しいorganizationIdは: ${communicationsBusinessDept.id}`);
              }
            }
          } else {
            devLog('\n❌ 伊藤忠インタラクティブ（株）が見つかりませんでした');
            devLog('   登録されている事業会社数:', allCompaniesData.length);
          }
          
          if (!tsujimotoCompany && !itochuInteractiveCompany) {
            devLog('\n❌ 対象の事業会社が見つかりませんでした');
          }
          
          // ループ内のログを簡略化（パフォーマンス最適化）
          const level1And2Orgs = allOrgs.filter(org => (org as any).level === 0 || (org as any).level === 1);
          const orgsWithCompanies = level1And2Orgs.filter(org => {
            const linkedCompanies = allCompaniesData.filter(c => c.organizationId === org.id);
            return linkedCompanies.length > 0;
          });
          devLog('\n📋 レベル1とレベル2の組織で、事業会社に紐づいているもの:', orgsWithCompanies.length, '件');
          
          const orgsWithoutCompanies = level1And2Orgs.filter(org => {
            const linkedCompanies = allCompaniesData.filter(c => c.organizationId === org.id);
            return linkedCompanies.length === 0;
          });
          devLog('\n📋 レベル1とレベル2の組織で、事業会社に紐づいていないもの:', orgsWithoutCompanies.length, '件');
          
          // 通信ビジネス部に紐づくべき事業会社を確認
          if (communicationsBusinessDept) {
            const shouldBeLinked = allCompaniesData.filter(c => {
              return c.department === '通信ビジネス部' || 
                     c.department?.includes('通信ビジネス') ||
                     c.name.includes('インタラクティブ') ||
                     c.name.includes('辻本');
            });
            
            const linkedCount = shouldBeLinked.filter(c => c.organizationId === communicationsBusinessDept.id).length;
            const unlinkedCount = shouldBeLinked.length - linkedCount;
            devLog(`\n📋 通信ビジネス部 (ID: ${communicationsBusinessDept.id}) に紐づくべき事業会社:`, {
              total: shouldBeLinked.length,
              linked: linkedCount,
              unlinked: unlinkedCount
            });
          }
          
          devLog('\n✅ デバッグ完了');
        } catch (error: any) {
          console.error('❌ エラー:', error);
          console.error('エラーの詳細:', error?.stack || error?.message || error);
        }
      };
      
      // 一括修正関数を設定（開発環境でのみログ出力）
      (window as any).fixCommunicationsBusinessCompanies = async () => {
        try {
          devLog('🔧 [修正] 通信ビジネス部に紐づく事業会社のorganizationIdを一括修正します...\n');
          
          const [orgTreeData, allCompaniesData] = await Promise.all([
            getOrgTreeFromDb(),
            getAllCompanies(),
          ]);
          
          if (!orgTreeData) {
            devLog('⚠️ 組織データが取得できませんでした');
            return;
          }
          
          const allOrgs = getAllOrganizationsFromTree(orgTreeData);
          const communicationsBusinessDept = allOrgs.find(org => 
            org.name === '通信ビジネス部' || org.name.includes('通信ビジネス部')
          );
          
          if (!communicationsBusinessDept) {
            devWarn('⚠️ 通信ビジネス部が見つかりませんでした');
            return;
          }
          
          const correctOrgId = communicationsBusinessDept.id;
          devLog(`✅ 通信ビジネス部のID: ${correctOrgId}\n`);
          
          // 修正対象の事業会社を特定
          const companiesToFix = allCompaniesData.filter(c => {
            return (c.department === '通信ビジネス部' || 
                    c.department?.includes('通信ビジネス') ||
                    c.name.includes('インタラクティブ') ||
                    c.name.includes('辻本') ||
                    c.name.includes('マイボイスコム') ||
                    c.name.includes('アシュリオン') ||
                    c.name.includes('ベルシステム') ||
                    c.name.includes('Ｂｅｌｏｎｇ') ||
                    c.name.includes('ジーアイクラウド') ||
                    c.name.includes('ＡＫＱＡ')) &&
                   c.organizationId !== correctOrgId;
          });
          
          if (companiesToFix.length === 0) {
            devLog('✅ 修正対象の事業会社はありませんでした');
            return;
          }
          
          devLog(`📋 修正対象: ${companiesToFix.length}件の事業会社\n`);
          
          let successCount = 0;
          let errorCount = 0;
          
          for (const company of companiesToFix) {
            try {
              devLog(`🔄 修正中: ${company.name} (ID: ${company.id})`);
              
              await updateCompany(company.id, undefined, undefined, undefined, undefined, correctOrgId);
              
              devLog(`   ✅ 修正完了: ${company.name}\n`);
              successCount++;
            } catch (error: any) {
              console.error(`   ❌ エラー: ${company.name}`, error);
              errorCount++;
            }
          }
          
          devLog('\n📊 修正結果:');
          devLog(`   ✅ 成功: ${successCount}件`);
          devLog(`   ❌ 失敗: ${errorCount}件`);
          devLog('\n✅ 修正処理が完了しました。ページをリロードして確認してください。');
        } catch (error: any) {
          console.error('❌ エラー:', error);
          console.error('エラーの詳細:', error?.stack || error?.message || error);
        }
      };
      
      devLog('✅ デバッグ関数を設定しました。コンソールで await debugCompanyOrgMatching() を実行してください。');
      devLog('✅ 修正関数を設定しました。コンソールで await fixCommunicationsBusinessCompanies() を実行してください。');
    }
  }, []);

  // データ取得関数
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      devLog('📖 [ダッシュボード] データ読み込み開始', { viewMode });

      // 組織ツリーとテーマは常に取得（事業会社モードでも階層レベル判定に必要）
      const [orgTreeData, themesData] = await Promise.all([
        getOrgTreeFromDb(),
        getThemes(),
      ]);

      if (!orgTreeData) {
        setError('組織データが取得できませんでした');
        setLoading(false);
        return;
      }

      setOrgTree(orgTreeData);
      setThemes(themesData);

      // 階層レベルは組織ツリーから計算（組織モードと事業会社モードで共通）
      const levels = extractOrganizationsByDepth(orgTreeData);
      setHierarchyLevels(levels);

      if (viewMode === 'organization') {
        // 組織モード: 組織データを取得
        // 選択された階層レベルが存在しない場合、最初の階層レベルを選択
        if (selectedLevel === null || !levels.find(l => l.level === selectedLevel)) {
      if (levels.length > 0) {
        setSelectedLevel(levels[0].level);
          }
      }

      // 全組織の注力施策を取得
      const allOrgs = getAllOrganizationsFromTree(orgTreeData);
        devLog('📖 [ダッシュボード] 全組織数:', allOrgs.length);

      // 並列で各組織の施策を取得（パフォーマンス向上）
      const initiativePromises = allOrgs.map(org => getFocusInitiatives(org.id));
      const initiativeResults = await Promise.allSettled(initiativePromises);

      const allInitiatives: FocusInitiative[] = [];
      initiativeResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allInitiatives.push(...result.value);
        } else {
            devWarn(`⚠️ [ダッシュボード] 組織「${allOrgs[index].name}」の施策取得エラー:`, result.reason);
        }
      });

      setInitiatives(allInitiatives);
        devLog('✅ [ダッシュボード] 組織モード データ読み込み完了:', {
        themes: themesData.length,
        initiatives: allInitiatives.length,
        hierarchyLevels: levels.length,
      });
      } else {
        // 事業会社モード: 事業会社データを取得
        const allCompanies = await getAllCompanies();
        setCompanies(allCompanies);

        // 各事業会社の注力施策を取得
        const initiativePromises = allCompanies.map(company => 
          getCompanyFocusInitiatives(company.id)
        );
        const initiativeResults = await Promise.allSettled(initiativePromises);

        const allCompanyInitiatives: CompanyFocusInitiative[] = [];
        initiativeResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allCompanyInitiatives.push(...result.value);
          } else {
            devWarn(`⚠️ [ダッシュボード] 事業会社「${allCompanies[index].name}」の施策取得エラー:`, result.reason);
          }
        });

        setCompanyInitiatives(allCompanyInitiatives);

        // 事業会社を組織の階層レベルでグループ化（表示用）
        const companyLevels = extractCompaniesByOrganizationDepth(orgTreeData, allCompanies);
        setCompanyHierarchyLevels(companyLevels);

        // デバッグ: 通信モバイル部と辻本郷コンサルティングのIDマッチング確認（開発環境のみ）
        if (isDev) {
          const allOrgs = getAllOrganizationsFromTree(orgTreeData);
          const communicationsOrgs = allOrgs.filter(org => 
            org.name.includes('通信') && 
            (org.name.includes('モバイル') || org.name.includes('ビジネス'))
          );
          const tsujimotoCompany = allCompanies.find(c => 
            c.name.includes('辻本') || c.name.includes('コンサルティング')
          );
          
          devLog('🔍 [デバッグ] 通信関連組織数:', communicationsOrgs.length);
          
          if (tsujimotoCompany) {
            devLog('🔍 [デバッグ] 辻本郷コンサルティング:', {
              name: tsujimotoCompany.name,
              id: tsujimotoCompany.id,
              organizationId: tsujimotoCompany.organizationId
            });
            
            const matchedOrg = allOrgs.find(org => org.id === tsujimotoCompany.organizationId);
            if (matchedOrg) {
              devLog('🔍 [デバッグ] 紐づいている組織:', {
                name: matchedOrg.name,
                id: matchedOrg.id,
                level: (matchedOrg as any).level
              });
            } else {
              devWarn('⚠️ [デバッグ] organizationId', tsujimotoCompany.organizationId, 'に該当する組織が見つかりません');
            }
            
            // 通信モバイル部とのマッチング確認（ループ内のログを削除）
            communicationsOrgs.forEach(org => {
              const isMatch = org.id === tsujimotoCompany.organizationId;
              // ループ内のログを削除（パフォーマンス最適化）
            });
          }
        }

        devLog('✅ [ダッシュボード] 事業会社モード データ読み込み完了:', {
          themes: themesData.length,
          companies: allCompanies.length,
          companyInitiatives: allCompanyInitiatives.length,
          hierarchyLevels: levels.length,
        });
      }
    } catch (err: any) {
      console.error('❌ [ダッシュボード] データ読み込みエラー:', err);
      setError(`データの読み込みに失敗しました: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  // データ取得（viewMode変更時）
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ページがフォーカスされたときにデータを再取得
  useEffect(() => {
    const handleFocus = () => {
      devLog('🔄 [ダッシュボード] ページがフォーカスされました。データを再取得します。');
      loadData();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadData]);

  // 選択された階層レベルの組織を取得（組織モード）
  const selectedLevelOrgs = useMemo(() => {
    if (viewMode !== 'organization' || selectedLevel === null) return [];
    const levelData = hierarchyLevels.find(l => l.level === selectedLevel);
    const orgs = levelData?.orgs || [];
    
    // フィルター適用
    if (filteredOrgIds.size > 0) {
      return orgs.filter(org => filteredOrgIds.has(org.id));
    }
    
    return orgs;
  }, [viewMode, selectedLevel, hierarchyLevels, filteredOrgIds]);

  // 表示する事業会社を取得（事業会社モード）- すべての事業会社を表示
  const selectedLevelCompanies = useMemo(() => {
    if (viewMode !== 'company') return [];
    
    // すべての事業会社を取得
    const allCompaniesAtLevel = companyHierarchyLevels.flatMap(level => level.orgs);
    
    // フィルター適用
    let filtered = allCompaniesAtLevel;
    
    // 組織フィルター（事業会社に紐づけられている組織でフィルター）
    if (filteredOrgIds.size > 0) {
      filtered = filtered.filter(company => {
        const companyData = companies.find(c => c.id === company.id);
        return companyData && filteredOrgIds.has(companyData.organizationId);
      });
    }
    
    // 事業会社名フィルター
    if (filteredCompanyIds.size > 0) {
      filtered = filtered.filter(company => filteredCompanyIds.has(company.id));
    }
    
    return filtered;
  }, [viewMode, companyHierarchyLevels, companies, filteredOrgIds, filteredCompanyIds]);

  // レベル1とレベル2の組織を取得（事業会社モードのフィルターボタン用）
  const level1And2Orgs = useMemo(() => {
    if (viewMode !== 'company') return [];
    
    const level1Orgs = hierarchyLevels.find(l => l.level === 0)?.orgs || [];
    const level2Orgs = hierarchyLevels.find(l => l.level === 1)?.orgs || [];
    
    // 各組織に紐づく事業会社が存在するかチェック
    return [...level1Orgs, ...level2Orgs].filter(org => {
      return companies.some(c => c.organizationId === org.id);
    });
  }, [viewMode, hierarchyLevels, companies]);

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

  // テーマ×組織の施策件数を集計（子組織の施策も含める）- 組織モード
  const chartDataOrganization = useMemo(() => {
    if (viewMode !== 'organization' || filteredThemes.length === 0 || selectedLevelOrgs.length === 0) {
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
  }, [viewMode, filteredThemes, selectedLevelOrgs, initiatives, orgIdsWithDescendants]);

  // テーマ×事業会社の施策件数を集計 - 事業会社モード
  const chartDataCompany = useMemo(() => {
    if (viewMode !== 'company' || filteredThemes.length === 0 || selectedLevelCompanies.length === 0) {
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
        const relatedInitiatives = companyInitiatives.filter(init => {
          if (init.companyId !== company.id) return false;
          if (Array.isArray(init.themeIds) && init.themeIds.includes(theme.id)) return true;
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
  }, [viewMode, filteredThemes, selectedLevelCompanies, companyInitiatives]);

  // 表示モードに応じて適切なデータを返す
  const chartData = useMemo(() => {
    return viewMode === 'organization' ? chartDataOrganization : chartDataCompany;
  }, [viewMode, chartDataOrganization, chartDataCompany]);

  // Vega-Liteのグラフ仕様を生成（メモ化でパフォーマンス向上）
  const chartSpec = useMemo(() => {
    if (chartData.length === 0) return null;

    // 組織ごとの色を自動生成（Vega-Liteのカテゴリカラースキームを使用）
    const organizations = Array.from(new Set(chartData.map(d => d.organization)));
    const maxColors = 20; // Vega-Liteのcategory20スキームは20色

    // レスポンシブ対応: 画面幅に応じて高さを調整
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const chartHeight = isMobile ? 400 : 500;

      return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      description: 'テーマごとの施策件数を組織別に積み上げて表示',
      width: 'container',
      height: chartHeight,
      padding: { top: 20, right: 20, bottom: 60, left: 60 },
      data: {
        values: chartData,
      },
      layer: [
        // 1. 積み上げ棒グラフ
        {
          mark: {
            type: 'bar',
            tooltip: true,
            cursor: 'pointer',
            cornerRadiusTopLeft: 4,
            cornerRadiusTopRight: 4,
            stroke: '#FFFFFF',
            strokeWidth: 1,
          },
          encoding: {
            x: {
              field: 'theme',
              type: 'ordinal',
              title: 'テーマ',
              scale: {
                // テーマは0件でも表示するため、すべてのテーマをdomainに含める
                domain: filteredThemes.map(t => t.title),
              },
              axis: {
                labelAngle: isMobile ? -90 : -45,
                labelLimit: isMobile ? 50 : 120,
                labelFontSize: isMobile ? 11 : 13,
                labelColor: '#4B5563',
                labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titleFontSize: isMobile ? 12 : 14,
                titleFontWeight: '600',
                titleColor: '#1A1A1A',
                titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titlePadding: 12,
                domain: true,
                domainColor: '#E5E7EB',
                domainWidth: 1,
                tickSize: 0,
              },
            },
            y: {
              field: 'count',
              type: 'quantitative',
              title: '施策件数',
              axis: {
                grid: false,
                labelFontSize: isMobile ? 11 : 13,
                labelColor: '#6B7280',
                labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titleFontSize: isMobile ? 12 : 14,
                titleFontWeight: '600',
                titleColor: '#1A1A1A',
                titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titlePadding: 12,
                domain: true,
                domainColor: '#E5E7EB',
                domainWidth: 1,
                tickSize: 0,
              },
              stack: 'zero', // 積み上げグラフ
            },
            color: {
              field: 'organization',
              type: 'nominal',
              title: viewMode === 'organization' ? '組織' : '事業会社',
              scale: {
                scheme: organizations.length <= maxColors ? 'category20' : 'category20b',
              },
              legend: {
                orient: isMobile ? 'bottom' : 'right',
                columns: isMobile ? 2 : 1,
                symbolLimit: organizations.length > 20 ? 50 : undefined,
                labelFontSize: isMobile ? 11 : 13,
                labelColor: '#4B5563',
                labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titleFontSize: isMobile ? 12 : 14,
                titleFontWeight: '600',
                titleColor: '#1A1A1A',
                titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titlePadding: 8,
                symbolType: 'circle',
                symbolSize: 80,
                padding: 8,
                offset: isMobile ? 0 : 20,
              },
            },
            tooltip: [
              { field: 'theme', type: 'nominal', title: 'テーマ' },
              { field: 'organization', type: 'nominal', title: '組織' },
              { field: 'count', type: 'quantitative', title: '件数', format: 'd' },
            ],
          },
        },
        // 2. テーマごとの合計値を表示するテキストレイヤー
        {
          mark: {
            type: 'text',
            align: 'center',
            baseline: 'bottom',
            dy: -8,
            fontSize: isMobile ? 12 : 14,
            fontWeight: '600',
            fill: '#1A1A1A',
            font: 'var(--font-inter), var(--font-noto), sans-serif',
          },
          encoding: {
            x: {
              field: 'theme',
              type: 'ordinal',
            },
            y: {
              aggregate: 'sum',
              field: 'count',
              type: 'quantitative',
            },
            text: {
              aggregate: 'sum',
              field: 'count',
              type: 'quantitative',
              format: 'd',
            },
            tooltip: [
              { field: 'theme', type: 'nominal', title: 'テーマ' },
              {
                aggregate: 'sum',
                field: 'count',
                type: 'quantitative',
                title: '合計件数',
                format: 'd',
              },
            ],
          },
        },
      ],
      config: {
        view: {
          stroke: 'transparent',
        },
        background: 'transparent',
        axis: {
          labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
          titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
        },
        style: {
          'bar': {
            stroke: '#FFFFFF',
            strokeWidth: 1,
          },
        },
      },
    };
  }, [chartData, viewMode, filteredThemes]);

  // 階層レベル選択ハンドラー（組織モード用）
  const handleLevelChange = useCallback((level: number) => {
    setSelectedLevel(level);
    setSelectedThemeId(null); // 階層レベル変更時に選択をリセット
  }, []);

  // 組織フィルターボタンのハンドラー（事業会社モード用）
  const handleOrgFilterToggle = useCallback((orgId: string) => {
    const newFilteredOrgIds = new Set(filteredOrgIds);
    const isAdding = !newFilteredOrgIds.has(orgId);
    
    if (isAdding) {
      newFilteredOrgIds.add(orgId);
    } else {
      newFilteredOrgIds.delete(orgId);
    }
    
    setFilteredOrgIds(newFilteredOrgIds);
    
    // 事業会社モードの場合、組織に紐づく事業会社も自動的に選択/解除
    if (viewMode === 'company') {
      const linkedCompanyIds = companies
        .filter(c => c.organizationId === orgId)
        .map(c => c.id);
      
      const newFilteredCompanyIds = new Set(filteredCompanyIds);
      if (isAdding) {
        // 組織を選択した場合、その組織に紐づく事業会社も選択
        linkedCompanyIds.forEach(companyId => {
          newFilteredCompanyIds.add(companyId);
        });
      } else {
        // 組織を解除した場合、その組織に紐づく事業会社も解除
        linkedCompanyIds.forEach(companyId => {
          newFilteredCompanyIds.delete(companyId);
        });
      }
      setFilteredCompanyIds(newFilteredCompanyIds);
    }
    
    setSelectedThemeId(null); // フィルター変更時に選択をリセット
  }, [viewMode, filteredOrgIds, filteredCompanyIds, companies]);

  // グラフのクリックイベントハンドラー
  const handleChartSignal = useCallback((signalName: string, value: any) => {
    if (signalName === 'clicked_theme' && value && value.themeId) {
      setSelectedThemeId(value.themeId);
    }
  }, []);

  // 選択されたテーマに関連する注力施策を取得（組織モード）
  const selectedThemeInitiatives = useMemo(() => {
    if (viewMode !== 'organization' || !selectedThemeId) return [];

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
  }, [viewMode, selectedThemeId, initiatives, orgIdsWithDescendants]);

  // 選択されたテーマに関連する事業会社の注力施策を取得（事業会社モード）
  const selectedThemeCompanyInitiatives = useMemo(() => {
    if (viewMode !== 'company' || !selectedThemeId) return [];
    
    return companyInitiatives.filter(init => {
      if (Array.isArray(init.themeIds) && init.themeIds.includes(selectedThemeId)) {
        return true;
      }
      return false;
    });
  }, [viewMode, selectedThemeId, companyInitiatives]);

  // 選択されたテーマの情報を取得
  const selectedTheme = useMemo(() => {
    if (!selectedThemeId) return null;
    return themes.find(t => t.id === selectedThemeId);
  }, [selectedThemeId, themes]);

  // フィルター適用後の施策総数を計算
  const filteredInitiativeCount = useMemo(() => {
    if (viewMode === 'organization') {
      // 組織モード
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
      // 事業会社モード
      const filteredThemeIdsArray = filteredThemeIds.size > 0
        ? Array.from(filteredThemeIds)
        : filteredThemes.map(t => t.id);
      
      let filteredInitiatives = companyInitiatives;
      
      // 組織フィルター
      if (filteredOrgIds.size > 0) {
        filteredInitiatives = filteredInitiatives.filter(init => {
          const company = companies.find(c => c.id === init.companyId);
          return company && filteredOrgIds.has(company.organizationId);
        });
      }
      
      // 事業会社名フィルター
      if (filteredCompanyIds.size > 0) {
        filteredInitiatives = filteredInitiatives.filter(init => 
          filteredCompanyIds.has(init.companyId)
        );
      }
      
      // テーマフィルター
      return filteredInitiatives.filter(init => {
        return filteredThemeIdsArray.some(themeId => {
          if (Array.isArray(init.themeIds) && init.themeIds.includes(themeId)) return true;
          return false;
        });
      }).length;
    }
  }, [viewMode, initiatives, orgIdsWithDescendants, filteredOrgIds, filteredThemeIds, filteredThemes, companyInitiatives, companies, filteredCompanyIds]);

  // フィルターが適用されているかチェック
  const hasActiveFilters = useMemo(() => {
    if (viewMode === 'organization') {
      return filteredOrgIds.size > 0 || filteredThemeIds.size > 0;
    } else {
      return filteredOrgIds.size > 0 || filteredCompanyIds.size > 0 || filteredThemeIds.size > 0;
    }
  }, [viewMode, filteredOrgIds, filteredCompanyIds, filteredThemeIds]);

  // フィルター数の計算
  const filterCount = useMemo(() => {
    if (viewMode === 'organization') {
      return filteredOrgIds.size + filteredThemeIds.size;
    } else {
      return filteredOrgIds.size + filteredCompanyIds.size + filteredThemeIds.size;
    }
  }, [viewMode, filteredOrgIds, filteredCompanyIds, filteredThemeIds]);

  // フィルタークリア関数
  const handleClearFilters = useCallback(() => {
    setFilteredOrgIds(new Set());
    setFilteredThemeIds(new Set());
    if (viewMode === 'company') {
      setFilteredCompanyIds(new Set());
    }
  }, [viewMode]);

  // グラフと注力施策一覧を画像としてダウンロード
  const handleDownloadImage = useCallback(async () => {
    if (!chartAndInitiativesRef.current) {
      alert('ダウンロードするコンテンツが見つかりません。');
      return;
    }

    // ローディング表示（オプション）
    const originalCursor = document.body.style.cursor;
    
    try {
      document.body.style.cursor = 'wait';

      // html2canvasでキャプチャ
      const canvas = await html2canvas(chartAndInitiativesRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 高解像度
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
      });

      // PNGとしてダウンロード
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('画像の生成に失敗しました。');
          document.body.style.cursor = originalCursor;
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const themeTitle = selectedTheme?.title || 'ダッシュボード';
        const sanitizedTitle = themeTitle.replace(/[<>:"/\\|?*]/g, '_'); // ファイル名に使えない文字を置換
        link.href = url;
        link.download = `${sanitizedTitle}_グラフと注力施策一覧_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);

        document.body.style.cursor = originalCursor;
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('画像ダウンロードエラー:', error);
      alert('画像のダウンロードに失敗しました。');
      document.body.style.cursor = originalCursor;
    }
  }, [selectedTheme]);

  if (loading) {
    return (
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>データを読み込み中...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ marginBottom: '8px' }}>ダッシュボード</h2>
          <div style={{
            padding: '16px',
            backgroundColor: '#FEF2F2',
            border: '1.5px solid #FCA5A5',
            borderRadius: '8px',
            color: '#991B1B',
            fontSize: '14px',
          }}>
            <strong>エラー:</strong> {error}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="card" style={{ padding: '32px' }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            marginBottom: '8px',
            fontSize: '24px',
            fontWeight: '600',
            color: '#1A1A1A',
          }}>
            ダッシュボード
          </h2>
          <p style={{
            marginBottom: 0,
            fontSize: '14px',
            color: '#808080',
          }}>
            テーマごとの施策件数を{viewMode === 'organization' ? '組織' : '事業会社'}別に分析します
          </p>
        </div>

        {/* 表示モード選択ボタン */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}>
            <button
              type="button"
              onClick={() => setViewMode('organization')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: viewMode === 'organization' ? '600' : '400',
                color: viewMode === 'organization' ? '#4262FF' : '#1A1A1A',
                backgroundColor: viewMode === 'organization' ? '#F0F4FF' : '#FFFFFF',
                border: viewMode === 'organization' ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              組織
            </button>
            <button
              type="button"
              onClick={() => setViewMode('company')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: viewMode === 'company' ? '600' : '400',
                color: viewMode === 'company' ? '#4262FF' : '#1A1A1A',
                backgroundColor: viewMode === 'company' ? '#F0F4FF' : '#FFFFFF',
                border: viewMode === 'company' ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              事業会社
            </button>
          </div>
        </div>

        {/* 事業会社モード: 組織フィルターボタン（レベル1とレベル2） */}
        {viewMode === 'company' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px',
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#1A1A1A',
              }}>
                組織でフィルター（事業会社に紐づけられている組織）
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: hasActiveFilters ? '#4262FF' : '#6B7280',
                    backgroundColor: hasActiveFilters ? '#F0F4FF' : '#FFFFFF',
                    border: hasActiveFilters ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 4h12M4 8h8M6 12h4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  フィルター
                  {hasActiveFilters && (
                    <span style={{
                      backgroundColor: '#4262FF',
                      color: '#FFFFFF',
                      borderRadius: '10px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      minWidth: '18px',
                      textAlign: 'center',
                    }}>
                      {filterCount}
                    </span>
                  )}
                </button>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#6B7280',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #E0E0E0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#C4C4C4';
                      e.currentTarget.style.backgroundColor = '#FAFAFA';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E0E0E0';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M12 4L4 12M4 4l8 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    クリア
                  </button>
                )}
              </div>
            </div>
            {level1And2Orgs.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                {level1And2Orgs.map(org => {
                  const isSelected = filteredOrgIds.has(org.id);
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => handleOrgFilterToggle(org.id)}
                      style={{
                        padding: '10px 16px',
                        fontSize: '14px',
                        fontWeight: isSelected ? '600' : '400',
                        color: isSelected ? '#4262FF' : '#1A1A1A',
                        backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
                        border: isSelected ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                      }}
                    >
                      {org.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 組織モード: 階層レベル選択とフィルター */}
        {viewMode === 'organization' && hierarchyLevels.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px',
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#1A1A1A',
              }}>
                階層レベルを選択
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: hasActiveFilters ? '#4262FF' : '#6B7280',
                    backgroundColor: hasActiveFilters ? '#F0F4FF' : '#FFFFFF',
                    border: hasActiveFilters ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 4h12M4 8h8M6 12h4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  フィルター
                  {hasActiveFilters && (
                    <span style={{
                      backgroundColor: '#4262FF',
                      color: '#FFFFFF',
                      borderRadius: '10px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      minWidth: '18px',
                      textAlign: 'center',
                    }}>
                      {filterCount}
                    </span>
                  )}
                </button>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#6B7280',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #E0E0E0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#C4C4C4';
                      e.currentTarget.style.backgroundColor = '#FAFAFA';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E0E0E0';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M12 4L4 12M4 4l8 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    クリア
                  </button>
                )}
              </div>
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              {hierarchyLevels.map(levelData => (
                <button
                  key={levelData.level}
                  type="button"
                  onClick={() => handleLevelChange(levelData.level)}
                  style={{
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: selectedLevel === levelData.level ? '600' : '400',
                    color: selectedLevel === levelData.level ? '#4262FF' : '#1A1A1A',
                    backgroundColor: selectedLevel === levelData.level ? '#F0F4FF' : '#FFFFFF',
                    border: selectedLevel === levelData.level ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  レベル{levelData.level} ({levelData.orgs.length}組織)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* エラーメッセージ */}
        {themes.length === 0 && (
          <div style={{
            padding: '16px',
            backgroundColor: '#FFFBF0',
            border: '1.5px solid #FCD34D',
            borderRadius: '8px',
            color: '#92400E',
            fontSize: '14px',
            marginBottom: '24px',
          }}>
            テーマが登録されていません。テーマを追加してください。
          </div>
        )}

        {viewMode === 'organization' && selectedLevelOrgs.length === 0 && selectedLevel !== null && (
          <div style={{
            padding: '16px',
            backgroundColor: '#FFFBF0',
            border: '1.5px solid #FCD34D',
            borderRadius: '8px',
            color: '#92400E',
            fontSize: '14px',
            marginBottom: '24px',
          }}>
            選択された階層レベルに組織が存在しません。
          </div>
        )}

        {viewMode === 'company' && selectedLevelCompanies.length === 0 && (
          <div style={{
            padding: '16px',
            backgroundColor: '#FFFBF0',
            border: '1.5px solid #FCD34D',
            borderRadius: '8px',
            color: '#92400E',
            fontSize: '14px',
            marginBottom: '24px',
          }}>
            事業会社が存在しません。
          </div>
        )}

        {/* 統計情報カード（グラフの上） */}
        {chartData.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
              ? '1fr' 
              : 'repeat(3, 1fr)',
            gap: typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '20px',
            marginBottom: '32px',
          }}>
            {/* テーマ数カード */}
            <div style={{
              padding: '24px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #F0F4FF 0%, #E0E8FF 100%)',
                borderRadius: '0 12px 0 60px',
                opacity: 0.5,
              }} />
              <div style={{
                fontSize: '13px',
                color: '#6B7280',
                marginBottom: '12px',
                fontWeight: '500',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                position: 'relative',
                zIndex: 1,
              }}>
                テーマ数
              </div>
              <div style={{
                fontSize: '40px',
                fontWeight: '700',
                color: '#1A1A1A',
                lineHeight: '1',
                marginBottom: '4px',
                position: 'relative',
                zIndex: 1,
                fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
              }}>
                {filteredThemes.length}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#9CA3AF',
                fontWeight: '400',
                position: 'relative',
                zIndex: 1,
              }}>
                件のテーマ
                {filteredThemeIds.size > 0 && (
                  <span style={{
                    fontSize: '11px',
                    color: '#4262FF',
                    marginLeft: '4px',
                  }}>
                    (フィルター適用中)
                  </span>
                )}
              </div>
            </div>

            {/* 組織数/事業会社数カード */}
            <div style={{
              padding: '24px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                borderRadius: '0 12px 0 60px',
                opacity: 0.5,
              }} />
              <div style={{
                fontSize: '13px',
                color: '#6B7280',
                marginBottom: '12px',
                fontWeight: '500',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                position: 'relative',
                zIndex: 1,
              }}>
                {viewMode === 'organization' ? '組織数' : '事業会社数'}
              </div>
              <div style={{
                fontSize: '40px',
                fontWeight: '700',
                color: '#1A1A1A',
                lineHeight: '1',
                marginBottom: '4px',
                position: 'relative',
                zIndex: 1,
                fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
              }}>
                {viewMode === 'organization' ? selectedLevelOrgs.length : selectedLevelCompanies.length}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#9CA3AF',
                fontWeight: '400',
                position: 'relative',
                zIndex: 1,
              }}>
                件の{viewMode === 'organization' ? '組織' : '事業会社'}
                {(filteredOrgIds.size > 0 || (viewMode === 'company' && filteredCompanyIds.size > 0)) && (
                  <span style={{
                    fontSize: '11px',
                    color: '#4262FF',
                    marginLeft: '4px',
                  }}>
                    (フィルター適用中)
                  </span>
                )}
              </div>
            </div>

            {/* 施策総数カード */}
            <div style={{
              padding: '24px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #FEF3F2 0%, #FEE2E2 100%)',
                borderRadius: '0 12px 0 60px',
                opacity: 0.5,
              }} />
              <div style={{
                fontSize: '13px',
                color: '#6B7280',
                marginBottom: '12px',
                fontWeight: '500',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                position: 'relative',
                zIndex: 1,
              }}>
                施策総数
              </div>
              <div style={{
                fontSize: '40px',
                fontWeight: '700',
                color: '#1A1A1A',
                lineHeight: '1',
                marginBottom: '4px',
                position: 'relative',
                zIndex: 1,
                fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
              }}>
                {filteredInitiativeCount}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#9CA3AF',
                fontWeight: '400',
                position: 'relative',
                zIndex: 1,
              }}>
                件の施策
                {(filteredOrgIds.size > 0 || filteredThemeIds.size > 0) && (
                  <span style={{
                    fontSize: '11px',
                    color: '#4262FF',
                    marginLeft: '4px',
                  }}>
                    (フィルター適用中)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* グラフと注力施策一覧を含むコンテナ（画像ダウンロード用） */}
        <div ref={chartAndInitiativesRef}>
          {/* グラフ */}
          {chartSpec && chartData.length > 0 ? (
            <div style={{
              marginBottom: '32px',
              width: '100%',
              overflowX: 'auto',
            }}>
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                padding: '24px',
                overflow: 'hidden',
              }}>
                <div style={{
                  marginBottom: '20px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #F3F4F6',
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1A1A1A',
                    margin: 0,
                    fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                  }}>
                    テーマ別施策件数
                  </h3>
                  <p style={{
                    fontSize: '13px',
                    color: '#6B7280',
                    margin: '4px 0 0 0',
                    fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                  }}>
                    {viewMode === 'company' ? '事業会社別' : `階層レベル${selectedLevel}`}
                  </p>
                </div>
                <DynamicVegaChart
                  spec={chartSpec}
                  language="vega-lite"
                  onSignal={handleChartSignal}
                  chartData={chartData}
                  noBorder={true}
                />
              </div>
            </div>
          ) : (
            themes.length > 0 && 
            ((viewMode === 'organization' && selectedLevelOrgs.length > 0) || 
             (viewMode === 'company' && selectedLevelCompanies.length > 0)) && (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: '#808080',
                fontSize: '14px',
                backgroundColor: '#FAFAFA',
                borderRadius: '8px',
                border: '1px dashed #E0E0E0',
              }}>
                施策が登録されていません。
              </div>
            )
          )}

          {/* 選択されたテーマの注力施策カード */}
          {chartData.length > 0 && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              fontSize: '14px',
            }}>
            {/* 選択されたテーマの注力施策カード - 組織モード */}
            {viewMode === 'organization' && selectedTheme && selectedThemeInitiatives.length > 0 && (
              <div style={{ marginTop: '24px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '16px', color: '#1A1A1A' }}>
                  「{selectedTheme.title}」の注力施策 ({selectedThemeInitiatives.length}件)
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px',
                }}>
                  {selectedThemeInitiatives.map(initiative => {
                    // 組織名を取得
                    const orgName = selectedLevelOrgs.find(o => {
                      const orgIds = orgIdsWithDescendants.get(o.id) || [];
                      return initiative.organizationId && orgIds.includes(initiative.organizationId);
                    })?.name || '不明な組織';

                    return (
                      <div
                        key={initiative.id}
                        style={{
                          padding: '16px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 150ms',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#4262FF';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(66, 98, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#E5E7EB';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => {
                          // 注力施策詳細ページに遷移
                          window.location.href = `/organization/initiative?organizationId=${initiative.organizationId}&initiativeId=${initiative.id}`;
                        }}
                      >
                        <div style={{
                          fontSize: '12px',
                          color: '#6B7280',
                          marginBottom: '8px',
                        }}>
                          {orgName}
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1A1A1A',
                          marginBottom: '8px',
                          lineHeight: '1.4',
                        }}>
                          {initiative.title}
                        </div>
                        {initiative.description && (
                          <div style={{
                            fontSize: '11px',
                            color: '#4B5563',
                            lineHeight: '1.4',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]} 
                              components={{
                                a: ({ node, ...props }: any) => (
                                  <a
                                    {...props}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#4262FF', textDecoration: 'underline', fontSize: 'inherit' }}
                                  />
                                ),
                                p: ({ node, ...props }: any) => (
                                  <p {...props} style={{ margin: 0, marginBottom: 0, fontSize: 'inherit', display: 'inline' }} />
                                ),
                                h1: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                                ),
                                h2: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                                ),
                                h3: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                                ),
                                h4: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                                ),
                                h5: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                                ),
                                h6: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                                ),
                                strong: ({ node, ...props }: any) => (
                                  <strong {...props} style={{ fontSize: 'inherit', fontWeight: 600 }} />
                                ),
                                em: ({ node, ...props }: any) => (
                                  <em {...props} style={{ fontSize: 'inherit', fontStyle: 'italic' }} />
                                ),
                                ul: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit' }} />
                                ),
                                ol: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit' }} />
                                ),
                                li: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit' }} />
                                ),
                                code: ({ node, ...props }: any) => (
                                  <code {...props} style={{ fontSize: 'inherit', backgroundColor: '#F3F4F6', padding: '2px 4px', borderRadius: '3px' }} />
                                ),
                                blockquote: ({ node, ...props }: any) => (
                                  <span {...props} style={{ fontSize: 'inherit' }} />
                                ),
                              }}
                            >
                              {initiative.description.replace(/\n/g, ' ').replace(/\s+/g, ' ')}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 選択されたテーマの注力施策カード - 事業会社モード */}
            {viewMode === 'company' && selectedTheme && selectedThemeCompanyInitiatives.length > 0 && (
              <div style={{ marginTop: '24px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '16px', color: '#1A1A1A' }}>
                  「{selectedTheme.title}」の注力施策 ({selectedThemeCompanyInitiatives.length}件)
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px',
                }}>
                  {selectedThemeCompanyInitiatives.map(initiative => {
                    // 事業会社名を取得
                    const companyName = companies.find(c => c.id === initiative.companyId)?.name || '不明な事業会社';

                    return (
                      <div
                        key={initiative.id}
                        style={{
                          padding: '16px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 150ms',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#4262FF';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(66, 98, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#E5E7EB';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => {
                          // 事業会社の注力施策詳細ページに遷移（/organization/initiativeページを使用）
                          window.location.href = `/organization/initiative?companyId=${initiative.companyId}&initiativeId=${initiative.id}`;
                        }}
                      >
                        <div style={{
                          fontSize: '12px',
                          color: '#6B7280',
                          marginBottom: '8px',
                        }}>
                          {companyName}
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1A1A1A',
                          lineHeight: '1.4',
                        }}>
                          {initiative.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedTheme && 
             ((viewMode === 'organization' && selectedThemeInitiatives.length === 0) ||
              (viewMode === 'company' && selectedThemeCompanyInitiatives.length === 0)) && (
              <div style={{
                marginTop: '24px',
                borderTop: '1px solid #E5E7EB',
                paddingTop: '16px',
                color: '#6B7280',
                fontSize: '14px',
              }}>
                「{selectedTheme.title}」に関連する注力施策はありません。
              </div>
            )}
          </div>
          )}

          {/* ダウンロードボタン（テーマが選択されている時のみ表示） */}
          {selectedTheme && (
            <div style={{
              marginTop: '16px',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                type="button"
                onClick={handleDownloadImage}
                title="グラフと注力施策一覧を画像としてダウンロード"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  fontSize: '14px',
                  color: '#6B7280',
                  backgroundColor: 'transparent',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.color = '#6B7280';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 2.5V12.5M10 12.5L6.25 8.75M10 12.5L13.75 8.75M2.5 15V16.25C2.5 16.913 3.037 17.5 3.75 17.5H16.25C16.963 17.5 17.5 16.913 17.5 16.25V15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* フィルターモーダル */}
        {showFilterModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowFilterModal(false)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '32px',
                width: '95%',
                maxWidth: '1200px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  margin: 0,
                }}>
                  フィルター設定
                </h3>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M15 5L5 15M5 5l10 10"
                      stroke="#6B7280"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              {/* 組織フィルター（階層ごと、ボタン形式） */}
              {viewMode === 'organization' && (
              <div style={{ marginBottom: '32px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '20px',
                }}>
                  組織でフィルター
                </label>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                }}>
                  {hierarchyLevels.map(levelData => (
                    <div key={levelData.level}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#4262FF',
                        marginBottom: '12px',
                        paddingBottom: '8px',
                        borderBottom: '1px solid #F3F4F6',
                      }}>
                        レベル{levelData.level} ({levelData.orgs.length}組織)
                      </div>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        padding: '16px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        backgroundColor: '#FAFAFA',
                      }}>
                        {levelData.orgs.map(org => {
                          const isSelected = filteredOrgIds.has(org.id);
                          return (
                            <button
                              key={org.id}
                              type="button"
                              onClick={() => {
                                const newFilteredOrgIds = new Set(filteredOrgIds);
                                if (isSelected) {
                                  newFilteredOrgIds.delete(org.id);
                                } else {
                                  newFilteredOrgIds.add(org.id);
                                }
                                setFilteredOrgIds(newFilteredOrgIds);
                              }}
                              style={{
                                padding: '12px 20px',
                                fontSize: '14px',
                                fontWeight: isSelected ? '600' : '400',
                                color: isSelected ? '#4262FF' : '#1A1A1A',
                                backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
                                border: isSelected ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 150ms',
                                whiteSpace: 'nowrap',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = '#C4C4C4';
                                  e.currentTarget.style.backgroundColor = '#FAFAFA';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = '#E0E0E0';
                                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                                }
                              }}
                            >
                              {org.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {/* 事業会社モード: 組織フィルター（事業会社に紐づけられている組織） */}
              {viewMode === 'company' && (
                <div style={{ marginBottom: '32px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1A1A1A',
                    marginBottom: '20px',
                  }}>
                    組織でフィルター（事業会社に紐づけられている組織）
                  </label>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                  }}>
                    {hierarchyLevels.map(levelData => (
                      <div key={levelData.level}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#4262FF',
                          marginBottom: '12px',
                          paddingBottom: '8px',
                          borderBottom: '1px solid #F3F4F6',
                        }}>
                          レベル{levelData.level} ({levelData.orgs.length}組織)
                        </div>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '12px',
                          maxHeight: '300px',
                          overflowY: 'auto',
                          padding: '16px',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          backgroundColor: '#FAFAFA',
                        }}>
                          {levelData.orgs.map(org => {
                            // この組織に紐づく事業会社が存在するかチェック
                            const hasCompanies = companies.some(c => c.organizationId === org.id);
                            if (!hasCompanies) return null;

                            const isSelected = filteredOrgIds.has(org.id);
                            return (
                              <button
                                key={org.id}
                                type="button"
                                onClick={() => {
                                  const newFilteredOrgIds = new Set(filteredOrgIds);
                                  const isAdding = !isSelected;
                                  
                                  if (isAdding) {
                                    newFilteredOrgIds.add(org.id);
                                  } else {
                                    newFilteredOrgIds.delete(org.id);
                                  }
                                  setFilteredOrgIds(newFilteredOrgIds);
                                  
                                  // 組織に紐づく事業会社も自動的に選択/解除
                                  const linkedCompanyIds = companies
                                    .filter(c => c.organizationId === org.id)
                                    .map(c => c.id);
                                  
                                  const newFilteredCompanyIds = new Set(filteredCompanyIds);
                                  if (isAdding) {
                                    // 組織を選択した場合、その組織に紐づく事業会社も選択
                                    linkedCompanyIds.forEach(companyId => {
                                      newFilteredCompanyIds.add(companyId);
                                    });
                                  } else {
                                    // 組織を解除した場合、その組織に紐づく事業会社も解除
                                    linkedCompanyIds.forEach(companyId => {
                                      newFilteredCompanyIds.delete(companyId);
                                    });
                                  }
                                  setFilteredCompanyIds(newFilteredCompanyIds);
                                }}
                                style={{
                                  padding: '12px 20px',
                                  fontSize: '14px',
                                  fontWeight: isSelected ? '600' : '400',
                                  color: isSelected ? '#4262FF' : '#1A1A1A',
                                  backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
                                  border: isSelected ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 150ms',
                                  whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.borderColor = '#C4C4C4';
                                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.borderColor = '#E0E0E0';
                                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                                  }
                                }}
                              >
                                {org.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 事業会社名フィルター（事業会社モードのみ） */}
              {viewMode === 'company' && (
                <div style={{ marginBottom: '32px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1A1A1A',
                    marginBottom: '20px',
                  }}>
                    事業会社名でフィルター
                  </label>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: '#FAFAFA',
                  }}>
                    {companies.length === 0 ? (
                      <p style={{
                        fontSize: '13px',
                        color: '#6B7280',
                        width: '100%',
                        textAlign: 'center',
                        padding: '20px',
                      }}>
                        事業会社が登録されていません
                      </p>
                    ) : (
                      companies.map(company => {
                        const isSelected = filteredCompanyIds.has(company.id);
                        return (
                          <button
                            key={company.id}
                            type="button"
                            onClick={() => {
                              const newFilteredCompanyIds = new Set(filteredCompanyIds);
                              if (isSelected) {
                                newFilteredCompanyIds.delete(company.id);
                              } else {
                                newFilteredCompanyIds.add(company.id);
                              }
                              setFilteredCompanyIds(newFilteredCompanyIds);
                            }}
                            style={{
                              padding: '12px 20px',
                              fontSize: '14px',
                              fontWeight: isSelected ? '600' : '400',
                              color: isSelected ? '#4262FF' : '#1A1A1A',
                              backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
                              border: isSelected ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 150ms',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = '#C4C4C4';
                                e.currentTarget.style.backgroundColor = '#FAFAFA';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = '#E0E0E0';
                                e.currentTarget.style.backgroundColor = '#FFFFFF';
                              }
                            }}
                          >
                            {company.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* テーマフィルター（ボタン形式） */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '20px',
                }}>
                  テーマでフィルター
                </label>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  padding: '16px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  backgroundColor: '#FAFAFA',
                }}>
                  {themes.length === 0 ? (
                    <p style={{
                      fontSize: '13px',
                      color: '#6B7280',
                      width: '100%',
                      textAlign: 'center',
                      padding: '20px',
                    }}>
                      テーマが登録されていません
                    </p>
                  ) : (
                    themes.map(theme => {
                      const isSelected = filteredThemeIds.has(theme.id);
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            const newFilteredThemeIds = new Set(filteredThemeIds);
                            if (isSelected) {
                              newFilteredThemeIds.delete(theme.id);
                            } else {
                              newFilteredThemeIds.add(theme.id);
                            }
                            setFilteredThemeIds(newFilteredThemeIds);
                          }}
                          style={{
                            padding: '12px 20px',
                            fontSize: '14px',
                            fontWeight: isSelected ? '600' : '400',
                            color: isSelected ? '#4262FF' : '#1A1A1A',
                            backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
                            border: isSelected ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 150ms',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = '#C4C4C4';
                              e.currentTarget.style.backgroundColor = '#FAFAFA';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = '#E0E0E0';
                              e.currentTarget.style.backgroundColor = '#FFFFFF';
                            }
                          }}
                        >
                          {theme.title}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* アクションボタン */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid #E5E7EB',
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setFilteredOrgIds(new Set());
                    setFilteredThemeIds(new Set());
                    if (viewMode === 'company') {
                      setFilteredCompanyIds(new Set());
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6B7280',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #E0E0E0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#C4C4C4';
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E0E0E0';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  リセット
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#FFFFFF',
                    backgroundColor: '#4262FF',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#3151CC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#4262FF';
                  }}
                >
                  適用
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

