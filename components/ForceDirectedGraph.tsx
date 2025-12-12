'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import { scaleOrdinal } from 'd3-scale';
import { callTauriCommand, onAuthStateChanged } from '@/lib/localFirebase';
import dynamic from 'next/dynamic';
import { SUB_MENU_ITEMS } from '@/components/ConceptSubMenu';

// ページコンテンツチェックのキャッシュ（メモリキャッシュ）
interface PageContentCache {
  hasContent: boolean;
  timestamp: number;
}

const pageContentCache = new Map<string, PageContentCache>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分

// キャッシュからページコンテンツの有無を取得
const getCachedPageContent = (pageUrl: string): boolean | null => {
  const cached = pageContentCache.get(pageUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.hasContent;
  }
  return null;
};

// ページコンテンツの有無をキャッシュに保存
const setCachedPageContent = (pageUrl: string, hasContent: boolean): void => {
  pageContentCache.set(pageUrl, {
    hasContent,
    timestamp: Date.now(),
  });
};

// キャッシュをクリア（ページ保存時に呼び出す）
export const clearPageContentCache = (pageUrl?: string): void => {
  if (pageUrl) {
    pageContentCache.delete(pageUrl);
  } else {
    pageContentCache.clear();
  }
};

// DynamicPageを動的インポート（SSRを回避）
const DynamicPage = dynamic(
  () => import('@/components/pages/component-test/test-concept/DynamicPage'),
  { ssr: false }
);

// 固定サービス（事業企画）の定義
const SPECIAL_SERVICES = [
  { id: 'own-service', name: '自社開発・自社サービス事業', description: '自社開発のサービス事業に関する計画', hasConcepts: true },
  { id: 'education-training', name: 'AI導入ルール設計・人材育成・教育事業', description: '人材育成、教育、AI導入ルール設計に関する計画', hasConcepts: true },
  { id: 'consulting', name: 'プロセス可視化・業務コンサル事業', description: '業務コンサルティングとプロセス改善に関する計画', hasConcepts: true },
  { id: 'ai-dx', name: 'AI駆動開発・DX支援SI事業', description: 'AI技術を活用した開発・DX支援に関する計画', hasConcepts: true },
];

// 固定構想の定義
const FIXED_CONCEPTS: { [key: string]: Array<{ id: string; name: string; description: string }> } = {
  'own-service': [
    { id: 'maternity-support', name: '出産支援パーソナルApp', description: '出産前後のママとパパをサポートするパーソナルアプリケーション' },
    { id: 'care-support', name: '介護支援パーソナルApp', description: '介護を必要とする方とその家族をサポートするパーソナルアプリケーション' },
  ],
  'ai-dx': [
    { id: 'medical-dx', name: '医療法人向けDX', description: '助成金を活用したDX：電子カルテなどの導入支援' },
    { id: 'sme-dx', name: '中小企業向けDX', description: '内部データ管理やHP作成、Invoice制度の対応など' },
  ],
  'consulting': [
    { id: 'sme-process', name: '中小企業向け業務プロセス可視化・改善', description: '中小企業の業務プロセス可視化、効率化、経営課題の解決支援、助成金活用支援' },
    { id: 'medical-care-process', name: '医療・介護施設向け業務プロセス可視化・改善', description: '医療・介護施設の業務フロー可視化、記録業務の効率化、コンプライアンス対応支援' },
  ],
  'education-training': [
    { id: 'corporate-ai-training', name: '大企業向けAI人材育成・教育', description: '企業内AI人材の育成、AI活用スキル研修、AI導入教育プログラムの提供' },
    { id: 'ai-governance', name: 'AI導入ルール設計・ガバナンス支援', description: '企業のAI導入におけるルール設計、ガバナンス構築、コンプライアンス対応支援' },
    { id: 'sme-ai-education', name: '中小企業向けAI導入支援・教育', description: '中小企業向けのAI導入支援、実践的なAI教育、導入ルール設計支援、助成金活用支援' },
  ],
};

// 各構想から獲得できる強みの定義
const CONCEPT_STRENGTHS: { [key: string]: string[] } = {
  'maternity-support': [
    '妊婦・育児データの蓄積',
    'パーソナライズドヘルスケアのノウハウ',
    '医療機関との連携実績'
  ],
  'care-support': [
    '介護データの蓄積',
    '家族支援のノウハウ',
    '介護施設との連携実績'
  ],
  'medical-dx': [
    '医療機関との信頼関係',
    '電子カルテ導入の実績',
    'コンプライアンス対応の経験'
  ],
  'sme-dx': [
    '中小企業向けDXの実績',
    'コスト効率的なソリューション提供',
    '助成金活用のサポート実績'
  ],
  'sme-process': [
    '業務プロセス可視化の技術',
    '中小企業の経営課題理解',
    '経営コンサルティングの実績'
  ],
  'medical-care-process': [
    '医療・介護施設の業務理解',
    '記録業務効率化の実績',
    'コンプライアンス対応の経験'
  ],
  'corporate-ai-training': [
    '大企業向け研修プログラムの実績',
    'AI人材育成のノウハウ',
    'AI導入戦略のコンサル実績'
  ],
  'ai-governance': [
    'AIガバナンス設計の実績',
    'コンプライアンス対応の経験',
    'AI導入ルール策定のノウハウ'
  ],
  'sme-ai-education': [
    '中小企業向けAI教育の実績',
    '実践的なAI活用のノウハウ',
    '助成金活用支援の経験'
  ]
};

export interface GraphNode {
  id: string;
  label: string;
  type: 'company' | 'project' | 'concept' | 'servicePlan' | 'page' | 'subMenu';
  data?: any;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
}

interface ForceDirectedGraphProps {
  width?: number;
  height?: number;
  title?: string;
}

export default function ForceDirectedGraph({
  width = 1200,
  height = 800,
  title = '会社・事業企画・構想の関係性',
}: ForceDirectedGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAdditionalNodes, setLoadingAdditionalNodes] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: GraphNode } | null>(null);
  const simulationRef = useRef<any>(null);
  const [filterMode, setFilterMode] = useState<'fixed' | 'componentized'>('componentized');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false); // お気に入りフィルター
  const [nodeTypeFilters, setNodeTypeFilters] = useState<{
    company: boolean;
    project: boolean;
    concept: boolean;
    servicePlan: boolean;
    subMenu: boolean;
    page: boolean;
    companySubMenu: boolean;
    companyPage: boolean;
  }>({
    company: true,
    project: true,
    concept: true,
    servicePlan: true,
    subMenu: false,
    page: false,
    companySubMenu: false,
    companyPage: false,
  });
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [selectedConceptIds, setSelectedConceptIds] = useState<Set<string>>(new Set());
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [selectedSubMenuIds, setSelectedSubMenuIds] = useState<Set<string>>(new Set());
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [modalPage, setModalPage] = useState<{
    title: string;
    content: string;
    pageId: string;
    pageNumber: number;
  } | null>(null);
  const [modalSubMenuPages, setModalSubMenuPages] = useState<Array<{
    title: string;
    content: string;
    pageId: string;
    pageNumber: number;
  }> | null>(null);
  const [modalFixedPage, setModalFixedPage] = useState<{
    serviceId: string;
    conceptId: string;
    subMenuId: string;
    subMenuLabel: string;
    planId?: string;
    isCompanyPlan?: boolean;
  } | null>(null);
  const [modalFixedConcept, setModalFixedConcept] = useState<{
    serviceId: string;
    conceptId: string;
    conceptLabel: string;
  } | null>(null);
  const [modalCompanyPlan, setModalCompanyPlan] = useState<{
    planId: string;
    planLabel: string;
  } | null>(null);

  // ノードタイプごとの色を設定
  const colorScale = useMemo(() => {
    return scaleOrdinal<string>()
      .domain(['company', 'project', 'concept', 'servicePlan', 'subMenu', 'page'])
      .range(['#4A90E2', '#50C878', '#FF6B6B', '#FFA500', '#E67E22', '#9B59B6']); // 青、緑、赤、オレンジ、オレンジ系、紫
  }, []);

  // ローカルデータベースからデータを取得
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(null, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userId = user.uid;

        // 並列でデータを取得
        const conditions = {
          field: 'userId',
          operator: '==',
          value: userId
        };
        
        const [companyPlansResults, projectsResults, conceptsResults, servicePlansResults] = await Promise.all([
          callTauriCommand('query_get', { collectionName: 'companyBusinessPlan', conditions }),
          callTauriCommand('query_get', { collectionName: 'businessProjects', conditions }),
          callTauriCommand('query_get', { collectionName: 'concepts', conditions }),
          callTauriCommand('query_get', { collectionName: 'servicePlans', conditions }),
        ]);
        
        // 結果をFirestore形式に変換
        const companyPlansSnapshot = {
          forEach: (callback: (doc: any) => void) => {
            (companyPlansResults || []).forEach((item: any) => {
              const data = item.data || item;
              callback({
                id: item.id || data.id,
                data: () => data
              });
            });
          }
        };
        const projectsSnapshot = {
          forEach: (callback: (doc: any) => void) => {
            (projectsResults || []).forEach((item: any) => {
              const data = item.data || item;
              callback({
                id: item.id || data.id,
                data: () => data
              });
            });
          }
        };
        const conceptsSnapshot = {
          forEach: (callback: (doc: any) => void) => {
            (conceptsResults || []).forEach((item: any) => {
              const data = item.data || item;
              callback({
                id: item.id || data.id,
                data: () => data
              });
            });
          }
        };
        const servicePlansSnapshot = {
          forEach: (callback: (doc: any) => void) => {
            (servicePlansResults || []).forEach((item: any) => {
              const data = item.data || item;
              callback({
                id: item.id || data.id,
                data: () => data
              });
            });
          }
        };

        // ノードを作成
        const nodesMap = new Map<string, GraphNode>();

        // 会社ノードを追加
        const companyPlanPromises: Promise<void>[] = [];
        companyPlansSnapshot.forEach((doc: any) => {
          const companyPlanPromise = (async () => {
          const data = doc.data();
          const nodeId = `company-${doc.id}`;
            const pagesBySubMenu = data.pagesBySubMenu;
            const isComponentized = pagesBySubMenu && 
              typeof pagesBySubMenu === 'object' && 
              Object.keys(pagesBySubMenu).length > 0 &&
              Object.values(pagesBySubMenu).some((pages: any) => Array.isArray(pages) && pages.length > 0);
          nodesMap.set(nodeId, {
            id: nodeId,
            label: data.title || '会社事業計画',
            type: 'company',
              data: { ...data, docId: doc.id, isComponentized },
          });

            // コンポーネント形式の場合、サブメニューノードとページコンテナをノードとして追加
            if (isComponentized && pagesBySubMenu) {
              Object.entries(pagesBySubMenu).forEach(([subMenuId, pages]) => {
                if (Array.isArray(pages) && pages.length > 0) {
                  // サブメニューノードを追加（会社の事業計画にもサブメニューがある場合）
                  const subMenuItem = SUB_MENU_ITEMS.find(item => item.id === subMenuId);
                  if (subMenuItem) {
                    const subMenuNodeId = `subMenu-company-${doc.id}-${subMenuId}`;
                    nodesMap.set(subMenuNodeId, {
                      id: subMenuNodeId,
                      label: subMenuItem.label,
                      type: 'subMenu',
                      data: {
                        planId: doc.id,
                        subMenuId: subMenuId,
                        subMenuLabel: subMenuItem.label,
                        pages: pages.map((page: any) => ({
                          id: page.id,
                          title: page.title,
                          content: page.content,
                          pageNumber: page.pageNumber,
                        })),
                        isComponentized: true,
                        isCompanyPlan: true,
                      },
                    });
                  }
                  
                  // ページコンテナをノードとして追加
                  pages.forEach((page: any) => {
                    if (page && page.id && page.title) {
                      const pageNodeId = `page-company-${doc.id}-${subMenuId}-${page.id}`;
                      nodesMap.set(pageNodeId, {
                        id: pageNodeId,
                        label: page.title || `ページ ${page.pageNumber || ''}`,
                        type: 'page',
                        data: {
                          planId: doc.id,
                          subMenuId: subMenuId,
                          pageId: page.id,
                          pageNumber: page.pageNumber,
                          pageTitle: page.title,
                          pageContent: page.content,
                          isComponentized: true,
                          isCompanyPlan: true,
                        },
                      });
                    }
                  });
                }
              });
            } else {
              // 固定ページ形式の場合でも、サブメニューノードを追加
              // ただし、ページの内容をチェックして、デフォルトのプレースホルダーのみの場合は除外
              const companyPlanSubMenuPromises = SUB_MENU_ITEMS.map(async (subMenuItem) => {
                const subMenuNodeId = `subMenu-company-fixed-${doc.id}-${subMenuItem.id}`;
                const pageUrl = `/business-plan/company/${doc.id}/${subMenuItem.id}`;
                
                // キャッシュから取得を試みる
                const cachedResult = getCachedPageContent(pageUrl);
                if (cachedResult !== null) {
                  // キャッシュに結果がある場合
                  if (!cachedResult) {
                    return null; // コンテンツなし
                  }
                  // コンテンツありの場合のみノードを作成
                  return {
                    id: subMenuNodeId,
                    label: subMenuItem.label,
                    type: 'subMenu' as const,
                    data: {
                      planId: doc.id,
                      subMenuId: subMenuItem.id,
                      subMenuLabel: subMenuItem.label,
                      pages: [],
                      isComponentized: false,
                      isCompanyPlan: true,
                    },
                  };
                }
                
                // ページの内容をチェック（非同期）
                try {
                  const response = await fetch(pageUrl);
                  if (!response || !response.ok) {
                    // ページが存在しない場合は除外
                    setCachedPageContent(pageUrl, false);
                    return null;
                  }
                  
                  const html = await response.text();
                  // デフォルトのプレースホルダーテキストのパターンをチェック
                  const placeholderPatterns = [
                    `${subMenuItem.label}の内容をここに表示します`,
                    `この事業計画の${subMenuItem.label}ページは現在準備中です。`,
                    'の内容をここに表示します',
                    'は現在準備中です。',
                  ];
                  
                  // HTMLから実際のコンテンツがあるかチェック
                  // デフォルトのプレースホルダーテキストのみの場合は除外
                  const hasRealContent = !placeholderPatterns.some(pattern => 
                    html.includes(pattern) && html.split(pattern).length === 2
                  );
                  
                  // cardクラス内にプレースホルダーテキストのみの場合は除外
                  const cardMatch = html.match(/<div[^>]*class="card"[^>]*>([\s\S]*?)<\/div>/);
                  if (cardMatch) {
                    const cardContent = cardMatch[1];
                    const isOnlyPlaceholder = placeholderPatterns.some(pattern => 
                      cardContent.includes(pattern) && cardContent.trim().length < 200
                    );
                    if (isOnlyPlaceholder) {
                      setCachedPageContent(pageUrl, false);
                      return null;
                    }
                  }
                  
                  if (!hasRealContent) {
                    setCachedPageContent(pageUrl, false);
                    return null;
                  }
                  
                  // コンテンツありをキャッシュに保存
                  setCachedPageContent(pageUrl, true);
                  
                  // ページが存在し、コンテンツがある場合のみノードを作成
                  return {
                    id: subMenuNodeId,
                    label: subMenuItem.label,
                    type: 'subMenu' as const,
                    data: {
                      planId: doc.id,
                      subMenuId: subMenuItem.id,
                      subMenuLabel: subMenuItem.label,
                      pages: [],
                      isComponentized: false,
                      isCompanyPlan: true,
                    },
                  };
                } catch (error) {
                  // エラーの場合は表示対象外にする（ページが存在しない場合など）
                  console.log('会社事業計画のページ内容のチェックエラー:', pageUrl, error);
                  setCachedPageContent(pageUrl, false);
                  return null;
                }
              });
              
              // すべてのサブメニューのチェックを並列実行
              const companyPlanSubMenuNodes = await Promise.all(companyPlanSubMenuPromises);
              companyPlanSubMenuNodes.forEach(node => {
                if (node) {
                  nodesMap.set(node.id, node);
                }
              });
            }
          })();
          companyPlanPromises.push(companyPlanPromise);
        });
        
        // すべての会社ノードの処理を待つ
        await Promise.all(companyPlanPromises);

        // 固定サービス（事業企画）ノードを追加
        SPECIAL_SERVICES.forEach((service) => {
          const nodeId = `project-${service.id}`;
          nodesMap.set(nodeId, {
            id: nodeId,
            label: service.name,
            type: 'project',
            data: { serviceId: service.id, description: service.description, isFixed: true },
          });
        });

        // 事業企画ノードを追加（Firebaseから取得）
        // isFixed: trueのプロジェクトは除外（固定サービスはSPECIAL_SERVICESとして表示されるため）
        projectsSnapshot.forEach((doc: any) => {
          const data = doc.data();
          // isFixed: trueのプロジェクトは除外
          if (data.isFixed) {
            return;
          }
          const nodeId = `project-${doc.id}`;
          nodesMap.set(nodeId, {
            id: nodeId,
            label: data.name || '事業企画',
            type: 'project',
            data: { ...data, docId: doc.id, serviceId: data.serviceId },
          });
        });

        // 構想ノードを追加（Firebaseから取得した構想）
        const addedConceptIds = new Set<string>();
        const conceptNodesPromises: Promise<void>[] = [];
        
        // conceptsResultsを配列に変換
        const conceptsArray = (conceptsResults || []).map((item: any) => {
          const data = item.data || item;
          return {
            id: item.id || data.id,
            data: () => data
          };
        });
        
        for (const doc of conceptsArray) {
          const conceptPromise = (async () => {
          const data = doc.data();
          const nodeId = `concept-${doc.id}`;
          const conceptId = data.conceptId || doc.id;
          addedConceptIds.add(conceptId);
            const pagesBySubMenu = data.pagesBySubMenu;
            const isComponentized = pagesBySubMenu && 
              typeof pagesBySubMenu === 'object' && 
              Object.keys(pagesBySubMenu).length > 0 &&
              Object.values(pagesBySubMenu).some((pages: any) => Array.isArray(pages) && pages.length > 0);
          nodesMap.set(nodeId, {
            id: nodeId,
            label: data.name || '構想',
            type: 'concept',
              data: { ...data, docId: doc.id, serviceId: data.serviceId, conceptId: conceptId, isComponentized },
          });

          // コンポーネント形式の場合、サブメニューノードとページコンテナをノードとして追加
          if (isComponentized && pagesBySubMenu) {
            Object.entries(pagesBySubMenu).forEach(([subMenuId, pages]) => {
              if (Array.isArray(pages) && pages.length > 0) {
                // サブメニューノードを追加
                const subMenuItem = SUB_MENU_ITEMS.find(item => item.id === subMenuId);
                if (subMenuItem) {
                  const subMenuNodeId = `subMenu-${doc.id}-${subMenuId}`;
                  nodesMap.set(subMenuNodeId, {
                    id: subMenuNodeId,
                    label: subMenuItem.label,
                    type: 'subMenu',
                    data: {
                      conceptId: conceptId,
                      conceptDocId: doc.id,
                      subMenuId: subMenuId,
                      subMenuLabel: subMenuItem.label,
                      pages: pages.map((page: any) => ({
                        id: page.id,
                        title: page.title,
                        content: page.content,
                        pageNumber: page.pageNumber,
                      })),
                      isComponentized: true,
                    },
                  });
                }
                
                // ページコンテナをノードとして追加
                pages.forEach((page: any) => {
                  if (page && page.id && page.title) {
                    const pageNodeId = `page-${doc.id}-${subMenuId}-${page.id}`;
                    nodesMap.set(pageNodeId, {
                      id: pageNodeId,
                      label: page.title || `ページ ${page.pageNumber || ''}`,
                      type: 'page',
                      data: {
                        conceptId: conceptId,
                        conceptDocId: doc.id,
                        subMenuId: subMenuId,
                        pageId: page.id,
                        pageNumber: page.pageNumber,
                        pageTitle: page.title,
                        pageContent: page.content,
                        isComponentized: true,
                      },
                    });
                  }
                });
              }
            });
          } else {
            // 固定ページ形式の場合でも、すべてのサブメニューノードを追加
            // ただし、ページの内容をチェックして、デフォルトのプレースホルダーのみの場合は除外
            const subMenuPromises = SUB_MENU_ITEMS.map(async (subMenuItem) => {
              const subMenuNodeId = `subMenu-${doc.id}-${subMenuItem.id}`;
              const pageUrl = `/business-plan/services/${data.serviceId}/${conceptId}/${subMenuItem.id}`;
              
              // キャッシュから取得を試みる
              const cachedResult = getCachedPageContent(pageUrl);
              if (cachedResult !== null) {
                // キャッシュに結果がある場合
                if (!cachedResult) {
                  return null; // コンテンツなし
                }
                // コンテンツありの場合のみノードを作成
                return {
                  id: subMenuNodeId,
                  label: subMenuItem.label,
                  type: 'subMenu' as const,
                  data: {
                    conceptId: conceptId,
                    conceptDocId: doc.id,
                    serviceId: data.serviceId,
                    subMenuId: subMenuItem.id,
                    subMenuLabel: subMenuItem.label,
                    pages: [],
                    isComponentized: false,
                  },
                };
              }
              
              // ページの内容をチェック（非同期）
              try {
                const response = await fetch(pageUrl);
                if (!response || !response.ok) {
                  // ページが存在しない場合は除外
                  setCachedPageContent(pageUrl, false);
                  return null;
                }
                
                const html = await response.text();
                // デフォルトのプレースホルダーテキストのパターンをチェック
                const placeholderPatterns = [
                  `${subMenuItem.label}の内容をここに表示します`,
                  `この構想の${subMenuItem.label}ページは現在準備中です。`,
                  'の内容をここに表示します',
                  'は現在準備中です。',
                ];
                
                // HTMLから実際のコンテンツがあるかチェック
                // デフォルトのプレースホルダーテキストのみの場合は除外
                const hasRealContent = !placeholderPatterns.some(pattern => 
                  html.includes(pattern) && html.split(pattern).length === 2
                );
                
                // cardクラス内にプレースホルダーテキストのみの場合は除外
                const cardMatch = html.match(/<div[^>]*class="card"[^>]*>([\s\S]*?)<\/div>/);
                if (cardMatch) {
                  const cardContent = cardMatch[1];
                  const isOnlyPlaceholder = placeholderPatterns.some(pattern => 
                    cardContent.includes(pattern) && cardContent.trim().length < 200
                  );
                  if (isOnlyPlaceholder) {
                    setCachedPageContent(pageUrl, false);
                    return null;
                  }
                }
                
                if (!hasRealContent) {
                  setCachedPageContent(pageUrl, false);
                  return null;
                }
                
                // コンテンツありをキャッシュに保存
                setCachedPageContent(pageUrl, true);
                
                // ページが存在し、コンテンツがある場合のみノードを作成
                return {
                  id: subMenuNodeId,
                  label: subMenuItem.label,
                  type: 'subMenu' as const,
                  data: {
                    conceptId: conceptId,
                    conceptDocId: doc.id,
                    serviceId: data.serviceId,
                    subMenuId: subMenuItem.id,
                    subMenuLabel: subMenuItem.label,
                    pages: [],
                    isComponentized: false,
                  },
                };
              } catch (error) {
                // エラーの場合は表示対象外にする（ページが存在しない場合など）
                console.log('ページ内容のチェックエラー:', pageUrl, error);
                setCachedPageContent(pageUrl, false);
                return null;
              }
            });
            
            // すべてのサブメニューのチェックを並列実行
            const subMenuNodes = await Promise.all(subMenuPromises);
            subMenuNodes.forEach(node => {
              if (node) {
                nodesMap.set(node.id, node);
              }
            });
          }
          })();
          conceptNodesPromises.push(conceptPromise);
        }
        
        // すべての構想ノードの処理を待つ
        await Promise.all(conceptNodesPromises);

        // 固定構想ノードを追加（Firebaseに存在しない場合）
        const fixedConceptPromises: Promise<void>[] = [];
        for (const [serviceId, concepts] of Object.entries(FIXED_CONCEPTS)) {
          for (const concept of concepts) {
            // 既に追加されている構想はスキップ
            if (!addedConceptIds.has(concept.id)) {
              const fixedConceptPromise = (async () => {
              const nodeId = `fixed-concept-${serviceId}-${concept.id}`;
              nodesMap.set(nodeId, {
                id: nodeId,
                label: concept.name,
                type: 'concept',
                data: { 
                  serviceId: serviceId, 
                  conceptId: concept.id, 
                  description: concept.description,
                    isFixed: true,
                    isComponentized: false // 固定構想は固定ページ形式
                },
              });
                
                // 固定ページ形式でも、すべてのサブメニューノードを追加
                // ただし、ページの内容をチェックして、デフォルトのプレースホルダーのみの場合は除外
                const subMenuPromises = SUB_MENU_ITEMS.map(async (subMenuItem) => {
                  const subMenuNodeId = `subMenu-fixed-${serviceId}-${concept.id}-${subMenuItem.id}`;
                  const pageUrl = `/business-plan/services/${serviceId}/${concept.id}/${subMenuItem.id}`;
                  
                  // キャッシュから取得を試みる
                  const cachedResult = getCachedPageContent(pageUrl);
                  if (cachedResult !== null) {
                    // キャッシュに結果がある場合
                    if (!cachedResult) {
                      return null; // コンテンツなし
                    }
                    // コンテンツありの場合のみノードを作成
                    return {
                      id: subMenuNodeId,
                      label: subMenuItem.label,
                      type: 'subMenu' as const,
                      data: {
                        conceptId: concept.id,
                        serviceId: serviceId,
                        subMenuId: subMenuItem.id,
                        subMenuLabel: subMenuItem.label,
                        pages: [],
                        isComponentized: false,
                        isFixed: true,
                      },
                    };
                  }
                  
                  // ページの内容をチェック（非同期）
                  try {
                    const response = await fetch(pageUrl);
                    if (!response || !response.ok) {
                      // ページが存在しない場合は除外
                      setCachedPageContent(pageUrl, false);
                      return null;
                    }
                    
                    const html = await response.text();
                    // デフォルトのプレースホルダーテキストのパターンをチェック
                    const placeholderPatterns = [
                      `${subMenuItem.label}の内容をここに表示します`,
                      `この構想の${subMenuItem.label}ページは現在準備中です。`,
                      'の内容をここに表示します',
                      'は現在準備中です。',
                    ];
                    
                    // HTMLから実際のコンテンツがあるかチェック
                    // デフォルトのプレースホルダーテキストのみの場合は除外
                    const hasRealContent = !placeholderPatterns.some(pattern => 
                      html.includes(pattern) && html.split(pattern).length === 2
                    );
                    
                    // cardクラス内にプレースホルダーテキストのみの場合は除外
                    const cardMatch = html.match(/<div[^>]*class="card"[^>]*>([\s\S]*?)<\/div>/);
                    if (cardMatch) {
                      const cardContent = cardMatch[1];
                      const isOnlyPlaceholder = placeholderPatterns.some(pattern => 
                        cardContent.includes(pattern) && cardContent.trim().length < 200
                      );
                      if (isOnlyPlaceholder) {
                        setCachedPageContent(pageUrl, false);
                        return null;
                      }
                    }
                    
                    if (!hasRealContent) {
                      setCachedPageContent(pageUrl, false);
                      return null;
                    }
                    
                    // コンテンツありをキャッシュに保存
                    setCachedPageContent(pageUrl, true);
                    
                    // ページが存在し、コンテンツがある場合のみノードを作成
                    return {
                      id: subMenuNodeId,
                      label: subMenuItem.label,
                      type: 'subMenu' as const,
                      data: {
                        conceptId: concept.id,
                        serviceId: serviceId,
                        subMenuId: subMenuItem.id,
                        subMenuLabel: subMenuItem.label,
                        pages: [],
                        isComponentized: false,
                        isFixed: true,
                      },
                    };
                  } catch (error) {
                    // エラーの場合は表示対象外にする（ページが存在しない場合など）
                    console.log('ページ内容のチェックエラー:', pageUrl, error);
                    setCachedPageContent(pageUrl, false);
                    return null;
                  }
                });
                
                // すべてのサブメニューのチェックを並列実行
                const subMenuNodes = await Promise.all(subMenuPromises);
                subMenuNodes.forEach(node => {
                  if (node) {
                    nodesMap.set(node.id, node);
                  }
                });
              })();
              fixedConceptPromises.push(fixedConceptPromise);
            }
          }
        }
        
        // すべての固定構想ノードの処理を待つ
        await Promise.all(fixedConceptPromises);

        // サービス計画ノードを追加
        servicePlansSnapshot.forEach((doc: any) => {
          const data = doc.data();
          const nodeId = `servicePlan-${doc.id}`;
          nodesMap.set(nodeId, {
            id: nodeId,
            label: data.title || 'サービス計画',
            type: 'servicePlan',
            data: { ...data, docId: doc.id, serviceId: data.serviceId, conceptId: data.conceptId },
          });
        });


        // リンクを作成
        const linksList: GraphLink[] = [];

        // 会社と事業企画のリンク（linkedPlanIdsで関連）
        const companyNodes = Array.from(nodesMap.values()).filter((n) => n.type === 'company');
        const projectNodes = Array.from(nodesMap.values()).filter((n) => n.type === 'project');

        // 動的に追加された事業企画の場合、linkedPlanIdsを使用してリンクを作成
        // isFixed: trueのプロジェクトは除外（固定サービスは別途処理されるため）
        projectsSnapshot.forEach((projectDoc: any) => {
          const projectData = projectDoc.data();
          // isFixed: trueのプロジェクトは除外
          if (projectData.isFixed) {
            return;
          }
          const projectId = `project-${projectDoc.id}`;
          const linkedPlanIds = projectData.linkedPlanIds;
          
          if (linkedPlanIds && Array.isArray(linkedPlanIds) && linkedPlanIds.length > 0) {
            linkedPlanIds.forEach((planId: string) => {
              const companyNodeId = `company-${planId}`;
              if (nodesMap.has(companyNodeId)) {
                linksList.push({
                  source: companyNodeId,
                  target: projectId,
                  type: 'company-project',
                });
              }
            });
          }
        });

        // 固定サービス（事業企画）の場合、linkedPlanIdsを使用してリンクを作成
        // 固定サービスのデータをFirestoreから取得
        projectsSnapshot.forEach((projectDoc: any) => {
          const projectData = projectDoc.data();
          if (projectData.isFixed && projectData.serviceId) {
            const serviceId = projectData.serviceId;
            const projectId = `project-${serviceId}`;
            const linkedPlanIds = projectData.linkedPlanIds;
            
            if (linkedPlanIds && Array.isArray(linkedPlanIds) && linkedPlanIds.length > 0) {
              // linkedPlanIdsが設定されている場合、それを使用
              linkedPlanIds.forEach((planId: string) => {
                const companyNodeId = `company-${planId}`;
                if (nodesMap.has(companyNodeId)) {
                  linksList.push({
                    source: companyNodeId,
                    target: projectId,
                    type: 'company-project',
                  });
                }
              });
            } else {
              // linkedPlanIdsが設定されていない場合、すべての会社にリンク（既存の動作を維持）
        companyNodes.forEach((companyNode) => {
            linksList.push({
              source: companyNode.id,
                  target: projectId,
              type: 'company-project',
            });
          });
            }
          }
        });
        
        // Firestoreに存在しない固定サービスは、すべての会社にリンク（既存の動作を維持）
        SPECIAL_SERVICES.forEach((service) => {
          const projectId = `project-${service.id}`;
          // 既にリンクが作成されているかチェック
          const linkExists = linksList.some(
            link => (typeof link.target === 'string' ? link.target : link.target.id) === projectId
          );
          if (!linkExists) {
            companyNodes.forEach((companyNode) => {
              linksList.push({
                source: companyNode.id,
                target: projectId,
                type: 'company-project',
              });
            });
          }
        });

        // 事業企画と構想のリンク（serviceIdで関連）
        // 固定サービス（事業企画）と構想のリンク
        SPECIAL_SERVICES.forEach((service) => {
          const projectId = `project-${service.id}`;
          const serviceId = service.id;

          // Firebaseから取得した構想（コンポーネント形式も含む）
          conceptsSnapshot.forEach((conceptDoc: any) => {
            const conceptData = conceptDoc.data();
            if (conceptData.serviceId === serviceId) {
              const conceptId = `concept-${conceptDoc.id}`;
              const pagesBySubMenu = conceptData.pagesBySubMenu;
              const isComponentized = pagesBySubMenu && 
                typeof pagesBySubMenu === 'object' && 
                Object.keys(pagesBySubMenu).length > 0 &&
                Object.values(pagesBySubMenu).some((pages: any) => Array.isArray(pages) && pages.length > 0);
              
              // コンポーネント形式の構想も事業企画にリンク
              linksList.push({
                source: projectId,
                target: conceptId,
                type: 'project-concept',
              });
              
              console.log('構想と事業企画のリンク作成:', {
                projectId,
                conceptId,
                serviceId,
                isComponentized,
              });
            }
          });
          // 固定構想
          const fixedConcepts = FIXED_CONCEPTS[serviceId] || [];
          fixedConcepts.forEach((concept) => {
            const conceptId = `fixed-concept-${serviceId}-${concept.id}`;
            if (nodesMap.has(conceptId)) {
              linksList.push({
                source: projectId,
                target: conceptId,
                type: 'project-concept',
              });
            }
          });
        });

        // Firebaseから取得した事業企画と構想のリンク
        // isFixed: trueのプロジェクトは除外（固定サービスはSPECIAL_SERVICESとして処理されるため）
        projectsSnapshot.forEach((projectDoc: any) => {
          const projectData = projectDoc.data();
          // isFixed: trueのプロジェクトは除外
          if (projectData.isFixed) {
            return;
          }
          const projectId = `project-${projectDoc.id}`;
          const serviceId = projectData.serviceId;

          if (serviceId) {
            // Firebaseから取得した構想（コンポーネント形式も含む）
            conceptsSnapshot.forEach((conceptDoc: any) => {
              const conceptData = conceptDoc.data();
              if (conceptData.serviceId === serviceId) {
                const conceptId = `concept-${conceptDoc.id}`;
                const pagesBySubMenu = conceptData.pagesBySubMenu;
                const isComponentized = pagesBySubMenu && 
                  typeof pagesBySubMenu === 'object' && 
                  Object.keys(pagesBySubMenu).length > 0 &&
                  Object.values(pagesBySubMenu).some((pages: any) => Array.isArray(pages) && pages.length > 0);
                
                // コンポーネント形式の構想も事業企画にリンク
                linksList.push({
                  source: projectId,
                  target: conceptId,
                  type: 'project-concept',
                });
                
                console.log('構想と事業企画のリンク作成:', {
                  projectId,
                  conceptId,
                  serviceId,
                  isComponentized,
                });
              }
            });
            // 固定構想
            const fixedConcepts = FIXED_CONCEPTS[serviceId] || [];
            fixedConcepts.forEach((concept) => {
              const conceptId = `fixed-concept-${serviceId}-${concept.id}`;
              if (nodesMap.has(conceptId)) {
                linksList.push({
                  source: projectId,
                  target: conceptId,
                  type: 'project-concept',
                });
              }
            });
          }
        });

        // 会社とページコンテナのリンク（コンポーネント形式と固定ページ形式の両方）
        companyPlansSnapshot.forEach((planDoc: any) => {
          const planData = planDoc.data();
          const companyId = `company-${planDoc.id}`;
          const pagesBySubMenu = planData.pagesBySubMenu;
          const isComponentized = pagesBySubMenu && 
            typeof pagesBySubMenu === 'object' && 
            Object.keys(pagesBySubMenu).length > 0 &&
            Object.values(pagesBySubMenu).some((pages: any) => Array.isArray(pages) && pages.length > 0);

          if (isComponentized && pagesBySubMenu) {
            // コンポーネント形式の場合
            Object.entries(pagesBySubMenu).forEach(([subMenuId, pages]) => {
              if (Array.isArray(pages) && pages.length > 0) {
                // サブメニューノードへのリンク
                const subMenuNodeId = `subMenu-company-${planDoc.id}-${subMenuId}`;
                linksList.push({
                  source: companyId,
                  target: subMenuNodeId,
                  type: 'company-subMenu',
                });
                
                // サブメニューからページへのリンク
                pages.forEach((page: any) => {
                  if (page && page.id && page.title) {
                    const pageNodeId = `page-company-${planDoc.id}-${subMenuId}-${page.id}`;
                    linksList.push({
                      source: subMenuNodeId,
                      target: pageNodeId,
                      type: 'subMenu-page',
                    });
                  }
                });
              }
            });
          } else {
            // 固定ページ形式の場合でも、サブメニューノードへのリンクを作成
            SUB_MENU_ITEMS.forEach((subMenuItem) => {
              const subMenuNodeId = `subMenu-company-fixed-${planDoc.id}-${subMenuItem.id}`;
              if (nodesMap.has(subMenuNodeId)) {
                linksList.push({
                  source: companyId,
                  target: subMenuNodeId,
                  type: 'company-subMenu',
                });
              }
            });
          }
        });

        // 構想とサブメニューのリンク、サブメニューとページのリンク
        conceptsSnapshot.forEach((conceptDoc: any) => {
          const conceptData = conceptDoc.data();
          const conceptId = `concept-${conceptDoc.id}`;
          const pagesBySubMenu = conceptData.pagesBySubMenu;
          const isComponentized = pagesBySubMenu && 
            typeof pagesBySubMenu === 'object' && 
            Object.keys(pagesBySubMenu).length > 0 &&
            Object.values(pagesBySubMenu).some((pages: any) => Array.isArray(pages) && pages.length > 0);

          if (isComponentized && pagesBySubMenu) {
            // コンポーネント形式の場合
            Object.entries(pagesBySubMenu).forEach(([subMenuId, pages]) => {
              if (Array.isArray(pages) && pages.length > 0) {
                // サブメニューノードへのリンク
                const subMenuNodeId = `subMenu-${conceptDoc.id}-${subMenuId}`;
                linksList.push({
                  source: conceptId,
                  target: subMenuNodeId,
                  type: 'concept-subMenu',
                });
                
                // サブメニューからページへのリンク
                pages.forEach((page: any) => {
                  if (page && page.id && page.title) {
                    const pageNodeId = `page-${conceptDoc.id}-${subMenuId}-${page.id}`;
                    linksList.push({
                      source: subMenuNodeId,
                      target: pageNodeId,
                      type: 'subMenu-page',
                    });
                  }
                });
              }
            });
          } else {
            // 固定ページ形式の場合でも、すべてのサブメニューにリンク
            SUB_MENU_ITEMS.forEach((subMenuItem) => {
              const subMenuNodeId = `subMenu-${conceptDoc.id}-${subMenuItem.id}`;
              linksList.push({
                source: conceptId,
                target: subMenuNodeId,
                type: 'concept-subMenu',
              });
            });
          }
        });
        
        // 固定構想とサブメニューのリンク
        Object.entries(FIXED_CONCEPTS).forEach(([serviceId, concepts]) => {
          concepts.forEach((concept) => {
            const conceptId = `fixed-concept-${serviceId}-${concept.id}`;
            if (nodesMap.has(conceptId)) {
              SUB_MENU_ITEMS.forEach((subMenuItem) => {
                const subMenuNodeId = `subMenu-fixed-${serviceId}-${concept.id}-${subMenuItem.id}`;
                if (nodesMap.has(subMenuNodeId)) {
                  linksList.push({
                    source: conceptId,
                    target: subMenuNodeId,
                    type: 'concept-subMenu',
                  });
                }
              });
            }
          });
        });

        // 構想とサービス計画のリンク（conceptIdで関連）
        conceptsSnapshot.forEach((conceptDoc: any) => {
          const conceptData = conceptDoc.data();
          const conceptId = `concept-${conceptDoc.id}`;
          const conceptConceptId = conceptData.conceptId;

          if (conceptConceptId) {
            servicePlansSnapshot.forEach((planDoc: any) => {
              const planData = planDoc.data();
              if (planData.conceptId === conceptConceptId) {
                const planId = `servicePlan-${planDoc.id}`;
                linksList.push({
                  source: conceptId,
                  target: planId,
                  type: 'concept-servicePlan',
                });
              }
            });
          }
        });

        // 構想と会社の直接リンクは削除（事業企画経由のみ）

        // 事業企画とサービス計画のリンク（serviceIdで関連、conceptIdがない場合も含む）
        // 固定サービス（事業企画）とサービス計画のリンク
        SPECIAL_SERVICES.forEach((service) => {
          const projectId = `project-${service.id}`;
          const serviceId = service.id;

          servicePlansSnapshot.forEach((planDoc: any) => {
            const planData = planDoc.data();
            if (planData.serviceId === serviceId) {
              const planId = `servicePlan-${planDoc.id}`;
              // 既にconcept-servicePlanリンクが存在する場合はスキップ（構想経由の方が優先）
              const conceptLinkExists = linksList.some(
                (link) =>
                  (link.target === planId || (typeof link.target === 'object' && link.target.id === planId)) &&
                  link.type === 'concept-servicePlan'
              );
              if (!conceptLinkExists) {
                linksList.push({
                  source: projectId,
                  target: planId,
                  type: 'project-servicePlan',
                });
              }
            }
          });
        });

        // Firebaseから取得した事業企画とサービス計画のリンク
        // isFixed: trueのプロジェクトは除外（固定サービスはSPECIAL_SERVICESとして処理されるため）
        projectsSnapshot.forEach((projectDoc: any) => {
          const projectData = projectDoc.data();
          // isFixed: trueのプロジェクトは除外
          if (projectData.isFixed) {
            return;
          }
          const projectId = `project-${projectDoc.id}`;
          const serviceId = projectData.serviceId;

          if (serviceId) {
            servicePlansSnapshot.forEach((planDoc: any) => {
              const planData = planDoc.data();
              if (planData.serviceId === serviceId) {
                const planId = `servicePlan-${planDoc.id}`;
                // 既にconcept-servicePlanリンクが存在する場合はスキップ（構想経由の方が優先）
                const conceptLinkExists = linksList.some(
                  (link) =>
                    (link.target === planId || (typeof link.target === 'object' && link.target.id === planId)) &&
                    link.type === 'concept-servicePlan'
                );
                if (!conceptLinkExists) {
                  linksList.push({
                    source: projectId,
                    target: planId,
                    type: 'project-servicePlan',
                  });
                }
              }
            });
          }
        });


        // 基本ノード（会社、事業企画、構想）とリンクを先に表示
        const basicNodes = Array.from(nodesMap.values()).filter(node => 
          node.type === 'company' || node.type === 'project' || node.type === 'concept'
        );
        const additionalNodes = Array.from(nodesMap.values()).filter(node => 
          node.type === 'subMenu' || node.type === 'page'
        );

        console.log('基本ノード数:', basicNodes.length);
        console.log('追加ノード数:', additionalNodes.length);
        console.log('リンク数:', linksList.length);

        // 基本ノードとリンクを先に表示
        setNodes(basicNodes);
        setLinks(linksList);
        setLoading(false);

        // 追加ノード（サブメニューとページ）を後から追加（プログレッシブローディング）
        if (additionalNodes.length > 0) {
          setLoadingAdditionalNodes(true);
          
          // バッチ処理で100msごとにまとめて追加
          const batchSize = 50; // 一度に追加するノード数
          const delay = 100; // 100msごとに追加
          
          for (let i = 0; i < additionalNodes.length; i += batchSize) {
            const batch = additionalNodes.slice(i, i + batchSize);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            setNodes(prevNodes => {
              const existingIds = new Set(prevNodes.map(n => n.id));
              const newNodes = batch.filter(n => !existingIds.has(n.id));
              return [...prevNodes, ...newNodes];
            });
          }
          
          setLoadingAdditionalNodes(false);
          console.log('追加ノードの読み込みが完了しました');
        }
      } catch (error) {
        console.error('データ取得エラー:', error);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // フィルタリングされたノードとリンクを計算
  const filteredNodes = useMemo(() => {
    let filtered = nodes;
    
    // お気に入りフィルター（最初に適用）
    if (showFavoritesOnly) {
      // お気に入りの会社・構想に関連するノードを収集（nodes全体を参照）
      const favoriteCompanyIds = new Set<string>();
      const favoriteConceptIds = new Set<string>();
      const relatedProjectIds = new Set<string>();
      const relatedSubMenuIds = new Set<string>();
      const relatedPageIds = new Set<string>();
      
      // お気に入りの会社と構想を収集（nodes全体から）
      nodes.forEach(node => {
        if (node.type === 'company' && node.data?.isFavorite === true) {
          favoriteCompanyIds.add(node.id);
        }
        if (node.type === 'concept' && node.data?.isFavorite === true) {
          favoriteConceptIds.add(node.id);
        }
      });
      
      // お気に入りの構想に関連する事業企画を収集
      links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        
        if (link.type === 'project-concept' && favoriteConceptIds.has(targetId)) {
          relatedProjectIds.add(sourceId);
        }
        if (link.type === 'company-project' && relatedProjectIds.has(targetId)) {
          favoriteCompanyIds.add(sourceId);
        }
        if (link.type === 'concept-subMenu' && favoriteConceptIds.has(sourceId)) {
          relatedSubMenuIds.add(targetId);
        }
        if (link.type === 'subMenu-page' && relatedSubMenuIds.has(sourceId)) {
          relatedPageIds.add(targetId);
        }
        if (link.type === 'company-subMenu' && favoriteCompanyIds.has(sourceId)) {
          relatedSubMenuIds.add(targetId);
        }
        if (link.type === 'subMenu-page') {
          const sourceNode = nodes.find(n => n.id === sourceId);
          if (sourceNode && sourceNode.data?.isCompanyPlan && relatedSubMenuIds.has(sourceId)) {
            relatedPageIds.add(targetId);
          }
        }
      });
      
      // お気に入りに関連するノードのみを表示
      filtered = filtered.filter(node => {
        if (node.type === 'company') {
          return favoriteCompanyIds.has(node.id);
        }
        if (node.type === 'concept') {
          return favoriteConceptIds.has(node.id);
        }
        if (node.type === 'project') {
          return relatedProjectIds.has(node.id);
        }
        if (node.type === 'subMenu') {
          return relatedSubMenuIds.has(node.id);
        }
        if (node.type === 'page') {
          return relatedPageIds.has(node.id);
        }
        return true;
      });
    }
    
    // 形式フィルター（固定ページ形式/コンポーネント形式）
    // 事業企画ノードは形式の区別がないので常に表示
    filtered = filtered.filter(node => {
      // 事業企画ノードは常に表示
      if (node.type === 'project') {
        return true;
      }
      
      const isComponentized = node.data?.isComponentized ?? false;
      if (filterMode === 'componentized') {
        return isComponentized;
      } else { // filterMode === 'fixed'
        return !isComponentized;
      }
    });
    
    // 階層フィルター（ノードタイプ）
    filtered = filtered.filter(node => {
      // 会社の事業計画のサブメニューとページは別のフィルターで制御
      if (node.type === 'subMenu' && node.data?.isCompanyPlan) {
        return nodeTypeFilters.companySubMenu ?? true;
      }
      if (node.type === 'page' && node.data?.isCompanyPlan) {
        return nodeTypeFilters.companyPage ?? true;
      }
      // 構想のサブメニューとページは既存のフィルターで制御
      if (node.type === 'subMenu' && !node.data?.isCompanyPlan) {
        return nodeTypeFilters.subMenu ?? true;
      }
      if (node.type === 'page' && !node.data?.isCompanyPlan) {
        return nodeTypeFilters.page ?? true;
      }
      // その他のノードタイプ
      const nodeType = node.type as keyof typeof nodeTypeFilters;
      return nodeTypeFilters[nodeType] ?? true;
    });
    
    // 事業企画フィルター
    if (selectedProjectIds.size > 0) {
      const projectNodeIds = new Set<string>();
      const relatedConceptIds = new Set<string>();
      const relatedSubMenuIds = new Set<string>();
      const relatedPageIds = new Set<string>();
      const relatedCompanyIds = new Set<string>();
      
      // 選択された事業企画ノードIDを収集
      nodes.forEach(node => {
        if (node.type === 'project') {
          const projectId = node.id.replace('project-', '');
          if (selectedProjectIds.has(projectId) || selectedProjectIds.has(node.id)) {
            projectNodeIds.add(node.id);
          }
        }
      });
      
      // 選択された事業企画に関連する構想ノードを収集
      links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        
        if (link.type === 'project-concept' && projectNodeIds.has(sourceId)) {
          relatedConceptIds.add(targetId);
        }
        if (link.type === 'concept-subMenu' && relatedConceptIds.has(sourceId)) {
          // 構想のサブメニューのみを追加（会社の事業計画のサブメニューは除外）
          const subMenuNode = nodes.find(n => n.id === targetId);
          if (subMenuNode && !subMenuNode.data?.isCompanyPlan) {
            relatedSubMenuIds.add(targetId);
          }
        }
        if (link.type === 'subMenu-page' && relatedSubMenuIds.has(sourceId)) {
          // 構想のページのみを追加（会社の事業計画のページは除外）
          const pageNode = nodes.find(n => n.id === targetId);
          if (pageNode && !pageNode.data?.isCompanyPlan) {
            relatedPageIds.add(targetId);
          }
        }
        // 会社の事業計画のサブメニューとページも追加
        if (link.type === 'company-subMenu' && relatedCompanyIds.has(sourceId)) {
          const subMenuNode = nodes.find(n => n.id === targetId);
          if (subMenuNode && subMenuNode.data?.isCompanyPlan) {
            relatedSubMenuIds.add(targetId);
          }
        }
        if (link.type === 'subMenu-page') {
          const sourceNode = nodes.find(n => n.id === sourceId);
          const pageNode = nodes.find(n => n.id === targetId);
          if (sourceNode && sourceNode.data?.isCompanyPlan && pageNode && pageNode.data?.isCompanyPlan) {
            relatedPageIds.add(targetId);
          }
        }
        if (link.type === 'company-project' && projectNodeIds.has(targetId)) {
          relatedCompanyIds.add(sourceId);
        }
      });
      
      // 選択された事業企画に関連するノードのみを表示
      filtered = filtered.filter(node => {
        if (node.type === 'project') {
          return projectNodeIds.has(node.id);
        }
        if (node.type === 'concept') {
          return relatedConceptIds.has(node.id);
        }
        if (node.type === 'subMenu') {
          return relatedSubMenuIds.has(node.id);
        }
        if (node.type === 'page') {
          return relatedPageIds.has(node.id);
        }
        if (node.type === 'company') {
          return relatedCompanyIds.has(node.id);
        }
        return false;
      });
    }
    
    // 構想フィルター
    if (selectedConceptIds.size > 0) {
      const conceptNodeIds = new Set<string>();
      const relatedSubMenuIds = new Set<string>();
      const relatedPageIds = new Set<string>();
      const relatedProjectIds = new Set<string>();
      const relatedCompanyIds = new Set<string>();
      
      // 選択された構想ノードIDを収集
      nodes.forEach(node => {
        if (node.type === 'concept') {
          const conceptDocId = node.data?.docId;
          const conceptId = node.data?.conceptId || node.id.replace('concept-', '').replace('fixed-concept-', '');
          if (selectedConceptIds.has(node.id) || selectedConceptIds.has(conceptId) || (conceptDocId && selectedConceptIds.has(conceptDocId))) {
            conceptNodeIds.add(node.id);
          }
        }
      });
      
      // 選択された構想に関連するノードを収集
      links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        
        if (link.type === 'concept-subMenu' && conceptNodeIds.has(sourceId)) {
          // 構想のサブメニューのみを追加（会社の事業計画のサブメニューは除外）
          const subMenuNode = nodes.find(n => n.id === targetId);
          if (subMenuNode && !subMenuNode.data?.isCompanyPlan) {
            relatedSubMenuIds.add(targetId);
          }
        }
        if (link.type === 'subMenu-page' && relatedSubMenuIds.has(sourceId)) {
          // 構想のページのみを追加（会社の事業計画のページは除外）
          const pageNode = nodes.find(n => n.id === targetId);
          if (pageNode && !pageNode.data?.isCompanyPlan) {
            relatedPageIds.add(targetId);
          }
        }
        if (link.type === 'project-concept' && conceptNodeIds.has(targetId)) {
          relatedProjectIds.add(sourceId);
        }
        if (link.type === 'company-project' && relatedProjectIds.has(targetId)) {
          relatedCompanyIds.add(sourceId);
        }
      });
      
      // 選択された構想に関連するノードのみを表示
      filtered = filtered.filter(node => {
        if (node.type === 'concept') {
          return conceptNodeIds.has(node.id);
        }
        if (node.type === 'subMenu') {
          return relatedSubMenuIds.has(node.id);
        }
        if (node.type === 'page') {
          return relatedPageIds.has(node.id);
        }
        if (node.type === 'project') {
          return relatedProjectIds.has(node.id);
        }
        if (node.type === 'company') {
          return relatedCompanyIds.has(node.id);
        }
        return false;
      });
    }
    
    // サブメニューフィルター
    if (selectedSubMenuIds.size > 0) {
      const subMenuNodeIds = new Set<string>();
      const relatedPageIds = new Set<string>();
      const relatedConceptIds = new Set<string>();
      const relatedProjectIds = new Set<string>();
      const relatedCompanyIds = new Set<string>();
      
      // 選択されたサブメニューノードIDを収集
      nodes.forEach(node => {
        if (node.type === 'subMenu' && selectedSubMenuIds.has(node.id)) {
          subMenuNodeIds.add(node.id);
        }
      });
      
      // 選択されたサブメニューに関連するノードを収集
      links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        
        if (link.type === 'subMenu-page' && subMenuNodeIds.has(sourceId)) {
          relatedPageIds.add(targetId);
        }
        if (link.type === 'concept-subMenu' && subMenuNodeIds.has(targetId)) {
          relatedConceptIds.add(sourceId);
        }
        if (link.type === 'company-subMenu' && subMenuNodeIds.has(targetId)) {
          relatedCompanyIds.add(sourceId);
        }
        if (link.type === 'project-concept' && relatedConceptIds.has(targetId)) {
          relatedProjectIds.add(sourceId);
        }
        if (link.type === 'company-project' && relatedProjectIds.has(targetId)) {
          relatedCompanyIds.add(sourceId);
        }
      });
      
      // 選択されたサブメニューに関連するノードのみを表示
      filtered = filtered.filter(node => {
        if (node.type === 'subMenu') {
          return subMenuNodeIds.has(node.id);
        }
        if (node.type === 'page') {
          return relatedPageIds.has(node.id);
        }
        if (node.type === 'concept') {
          return relatedConceptIds.has(node.id);
        }
        if (node.type === 'project') {
          return relatedProjectIds.has(node.id);
        }
        if (node.type === 'company') {
          return relatedCompanyIds.has(node.id);
        }
        return false;
      });
    }
    
    // 会社フィルター
    if (selectedCompanyIds.size > 0) {
      const companyNodeIds = new Set<string>();
      const relatedProjectIds = new Set<string>();
      const relatedConceptIds = new Set<string>();
      const relatedSubMenuIds = new Set<string>();
      const relatedPageIds = new Set<string>();
      
      // 選択された会社ノードIDを収集
      nodes.forEach(node => {
        if (node.type === 'company') {
          const companyId = node.id.replace('company-', '');
          if (selectedCompanyIds.has(companyId) || selectedCompanyIds.has(node.id)) {
            companyNodeIds.add(node.id);
          }
        }
      });
      
      // 選択された会社に関連するノードを収集
      links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        
        if (link.type === 'company-project' && companyNodeIds.has(sourceId)) {
          relatedProjectIds.add(targetId);
        }
        if (link.type === 'project-concept' && relatedProjectIds.has(sourceId)) {
          relatedConceptIds.add(targetId);
        }
        if (link.type === 'concept-subMenu' && relatedConceptIds.has(sourceId)) {
          relatedSubMenuIds.add(targetId);
        }
        if (link.type === 'subMenu-page' && relatedSubMenuIds.has(sourceId)) {
          relatedPageIds.add(targetId);
        }
        if (link.type === 'company-subMenu' && companyNodeIds.has(sourceId)) {
          relatedSubMenuIds.add(targetId);
        }
        if (link.type === 'subMenu-page' && relatedSubMenuIds.has(sourceId)) {
          relatedPageIds.add(targetId);
        }
      });
      
      // 選択された会社に関連するノードのみを表示
      filtered = filtered.filter(node => {
        if (node.type === 'company') {
          return companyNodeIds.has(node.id);
        }
        if (node.type === 'project') {
          return relatedProjectIds.has(node.id);
        }
        if (node.type === 'concept') {
          return relatedConceptIds.has(node.id);
        }
        if (node.type === 'subMenu') {
          return relatedSubMenuIds.has(node.id);
        }
        if (node.type === 'page') {
          return relatedPageIds.has(node.id);
        }
        return false;
      });
    }
    
    return filtered;
  }, [nodes, filterMode, nodeTypeFilters, selectedProjectIds, selectedConceptIds, selectedCompanyIds, selectedSubMenuIds, links, showFavoritesOnly]);

  const filteredLinks = useMemo(() => {
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    return links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });
  }, [links, filteredNodes]);

  // フィルターされたノードの統計情報を計算
  const filteredStats = useMemo(() => {
    const stats = {
      project: 0,
      concept: 0,
      subMenu: 0,
      page: 0,
      companySubMenu: 0,
      companyPage: 0,
    };
    
    filteredNodes.forEach(node => {
      if (node.type === 'project') {
        stats.project++;
      } else if (node.type === 'concept') {
        stats.concept++;
      } else if (node.type === 'subMenu') {
        if (node.data?.isCompanyPlan) {
          stats.companySubMenu++;
        } else {
          stats.subMenu++;
        }
      } else if (node.type === 'page') {
        if (node.data?.isCompanyPlan) {
          stats.companyPage++;
        } else {
          stats.page++;
        }
      }
    });
    
    return stats;
  }, [filteredNodes]);

  // Force simulationの実行
  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0 || loading) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    // リンクの描画用グループ
    const linkGroup = svg.append('g').attr('class', 'links');
    // ノードの描画用グループ
    const nodeGroup = svg.append('g').attr('class', 'nodes');

    // リンクのsource/targetをノードオブジェクトに変換（描画用）
    const linksWithNodes = filteredLinks.map((link) => {
      const sourceNode = filteredNodes.find((n) => n.id === (typeof link.source === 'string' ? link.source : link.source.id));
      const targetNode = filteredNodes.find((n) => n.id === (typeof link.target === 'string' ? link.target : link.target.id));
      return {
        source: sourceNode || link.source,
        target: targetNode || link.target,
        type: link.type,
      };
    }).filter((link) => link.source && link.target);

    // グラデーション定義を追加
    const defs = svg.append('defs');
    
    // リンク用のグラデーション
    const linkGradients = {
      'company-project': defs.append('linearGradient').attr('id', 'grad-company-project'),
      'project-concept': defs.append('linearGradient').attr('id', 'grad-project-concept'),
      'concept-servicePlan': defs.append('linearGradient').attr('id', 'grad-concept-servicePlan'),
      'project-servicePlan': defs.append('linearGradient').attr('id', 'grad-project-servicePlan'),
      'concept-subMenu': defs.append('linearGradient').attr('id', 'grad-concept-subMenu'),
      'company-subMenu': defs.append('linearGradient').attr('id', 'grad-company-subMenu'),
      'subMenu-page': defs.append('linearGradient').attr('id', 'grad-subMenu-page'),
    };
    
    Object.entries(linkGradients).forEach(([type, gradient]) => {
      const colors: { [key: string]: [string, string] } = {
        'company-project': ['#4A90E2', '#6BA3F0'],
        'project-concept': ['#50C878', '#6FD88F'],
        'concept-servicePlan': ['#FF6B6B', '#FF8E8E'],
        'project-servicePlan': ['#FFA500', '#FFB84D'],
        'concept-subMenu': ['#FF7B7B', '#E67E22'],
        'company-subMenu': ['#5BA0F2', '#E67E22'],
        'subMenu-page': ['#E67E22', '#9B59B6'],
      };
      gradient
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '0%');
      gradient.append('stop').attr('offset', '0%').attr('stop-color', colors[type][0]).attr('stop-opacity', 0.6);
      gradient.append('stop').attr('offset', '100%').attr('stop-color', colors[type][1]).attr('stop-opacity', 0.3);
    });
    
    // ノード用のグラデーション
    const nodeGradients = {
      company: defs.append('radialGradient').attr('id', 'grad-company'),
      project: defs.append('radialGradient').attr('id', 'grad-project'),
      concept: defs.append('radialGradient').attr('id', 'grad-concept'),
      servicePlan: defs.append('radialGradient').attr('id', 'grad-servicePlan'),
    };
    
    Object.entries(nodeGradients).forEach(([type, gradient]) => {
      const colors: { [key: string]: [string, string] } = {
        company: ['#5BA0F2', '#3A7BC8'],
        project: ['#60D88A', '#40B86A'],
        concept: ['#FF7B7B', '#E55A5A'],
        servicePlan: ['#FFB84D', '#E5951F'],
      };
      gradient
        .attr('cx', '30%')
        .attr('cy', '30%')
        .attr('r', '70%');
      gradient.append('stop').attr('offset', '0%').attr('stop-color', colors[type][0]);
      gradient.append('stop').attr('offset', '100%').attr('stop-color', colors[type][1]);
    });
    
    // フィルター（シャドウ）は一旦削除（色が正しく表示されることを確認）
    
    // リンクを描画（パスとして描画してグラデーションを適用）
    const linkElements = linkGroup
      .selectAll('line')
      .data(linksWithNodes)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        if (d.type === 'company-project') return 'url(#grad-company-project)';
        if (d.type === 'project-concept') return 'url(#grad-project-concept)';
        if (d.type === 'concept-servicePlan') return 'url(#grad-concept-servicePlan)';
        if (d.type === 'project-servicePlan') return 'url(#grad-project-servicePlan)';
        if (d.type === 'concept-subMenu') return 'url(#grad-concept-subMenu)';
        if (d.type === 'company-subMenu') return 'url(#grad-company-subMenu)';
        if (d.type === 'subMenu-page') return 'url(#grad-subMenu-page)';
        return '#999';
      })
      .attr('stroke-opacity', 0.7)
      .attr('stroke-width', (d) => {
        if (d.type === 'company-project') return 3;
        if (d.type === 'project-concept') return 2.5;
        if (d.type === 'concept-servicePlan') return 2;
        if (d.type === 'project-servicePlan') return 1.5;
        if (d.type === 'concept-subMenu') return 2;
        if (d.type === 'company-subMenu') return 2;
        if (d.type === 'subMenu-page') return 1.5;
        return 1.5;
      })
      .style('transition', 'all 0.3s ease')
      .on('mouseenter', function() {
        select(this).attr('stroke-width', (d: any) => {
          if (d.type === 'company-project') return 4;
          if (d.type === 'project-concept') return 3.5;
          if (d.type === 'concept-servicePlan') return 3;
          if (d.type === 'project-servicePlan') return 2.5;
          if (d.type === 'concept-subMenu') return 3;
          if (d.type === 'company-subMenu') return 3;
          if (d.type === 'subMenu-page') return 2.5;
          return 2;
        }).attr('stroke-opacity', 1);
      })
      .on('mouseleave', function() {
        select(this).attr('stroke-width', (d: any) => {
          if (d.type === 'company-project') return 3;
          if (d.type === 'project-concept') return 2.5;
          if (d.type === 'concept-servicePlan') return 2;
          if (d.type === 'project-servicePlan') return 1.5;
          if (d.type === 'concept-subMenu') return 2;
          if (d.type === 'company-subMenu') return 2;
          if (d.type === 'subMenu-page') return 1.5;
          return 1.5;
        }).attr('stroke-opacity', 0.7);
      });

    // ノードを描画（構想ノードは初期状態で非表示）
    const nodeElements = nodeGroup
      .selectAll('circle')
      .data(filteredNodes)
      .enter()
      .append('circle')
      .attr('r', (d) => {
        if (d.type === 'company') return 32;
        if (d.type === 'project') return 22;
        if (d.type === 'concept') return 14;
        if (d.type === 'servicePlan') return 12;
        if (d.type === 'subMenu') return 12;
        if (d.type === 'page') return 10;
        return 12;
      })
      .attr('fill', (d) => {
        // より鮮やかな色を直接使用
        if (d.type === 'company') return '#5BA0F2';
        if (d.type === 'project') return '#60D88A';
        if (d.type === 'concept') return '#FF7B7B';
        if (d.type === 'servicePlan') return '#FFB84D';
        if (d.type === 'subMenu') return '#E67E22';
        if (d.type === 'page') return '#9B59B6';
        return colorScale(d.type);
      })
      .attr('fill-opacity', 1)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', (d) => {
        if (d.type === 'company') return 3;
        if (d.type === 'project') return 2.5;
        return 2;
      })
      // フィルターは一旦無効化（色が正しく表示されることを確認）
      .style('cursor', 'pointer')
      .style('transition', 'all 0.3s ease')
      .call(
        (selection: any) =>
          (selection as any).on('mouseover', function (this: SVGCircleElement, event: MouseEvent, d: GraphNode) {
            const node = select(this);
            if (d.type === 'company') {
              node.attr('stroke-width', 4).attr('r', 38);
            } else if (d.type === 'project') {
              node.attr('stroke-width', 3.5).attr('r', 26);
            } else if (d.type === 'concept') {
              node.attr('stroke-width', 3).attr('r', 17);
            } else if (d.type === 'servicePlan') {
              node.attr('stroke-width', 3).attr('r', 15);
            } else if (d.type === 'subMenu') {
              node.attr('stroke-width', 2.5).attr('r', 14);
            } else if (d.type === 'page') {
              node.attr('stroke-width', 2.5).attr('r', 12);
            } else {
              node.attr('stroke-width', 3).attr('r', 15);
            }
            // node.attr('filter', 'url(#node-shadow)'); // フィルター無効化
            // ツールチップを表示
            const svgRect = svgRef.current?.getBoundingClientRect();
            if (svgRect) {
              setTooltip({
                x: event.clientX - svgRect.left,
                y: event.clientY - svgRect.top - 10,
                data: d,
              });
            }
          }) as any
      )
      .call(
        (selection: any) =>
          (selection as any).on('mouseout', function (this: SVGCircleElement, event: MouseEvent, d: GraphNode) {
            const node = select(this);
            if (d.type === 'company') {
              node.attr('stroke-width', 3).attr('r', 32);
            } else if (d.type === 'project') {
              node.attr('stroke-width', 2.5).attr('r', 22);
            } else if (d.type === 'concept') {
              node.attr('stroke-width', 2).attr('r', 14);
            } else if (d.type === 'servicePlan') {
              node.attr('stroke-width', 2).attr('r', 12);
            } else if (d.type === 'subMenu') {
              node.attr('stroke-width', 2).attr('r', 12);
            } else if (d.type === 'page') {
              node.attr('stroke-width', 2).attr('r', 10);
            } else {
              node.attr('stroke-width', 2).attr('r', 12);
            }
            // ツールチップを非表示
            setTooltip(null);
          }) as any
      );

    // ラベルを描画（構想ノードのラベルは初期状態で非表示）
    const labelElements = nodeGroup
      .selectAll('text')
      .data(filteredNodes)
      .enter()
      .append('text')
      .text((d) => d.label)
      .attr('dx', (d) => {
        if (d.type === 'company') return 35;
        if (d.type === 'project') return 24;
        if (d.type === 'concept') return 15;
        if (d.type === 'servicePlan') return 13;
        if (d.type === 'subMenu') return 13;
        if (d.type === 'page') return 12;
        return 15;
      })
      .attr('font-size', (d) => {
        if (d.type === 'company') return '18px';
        if (d.type === 'project') return '16px';
        if (d.type === 'subMenu') return '12px';
        if (d.type === 'page') return '11px';
        return '13px';
      })
      .attr('dy', 4)
      .attr('fill', '#1a1a1a')
      .attr('font-weight', (d) => {
        if (d.type === 'company') return '600';
        if (d.type === 'project') return '500';
        return '400';
      })
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .style('font-family', "'Inter', 'Noto Sans JP', -apple-system, sans-serif");

    // Force simulationを設定（リンクのsource/targetをノードオブジェクトに変換）
    const simulationLinks = linksWithNodes.map((link) => ({
      source: typeof link.source === 'string' 
        ? filteredNodes.find((n) => n.id === link.source) || link.source
        : link.source,
      target: typeof link.target === 'string'
        ? filteredNodes.find((n) => n.id === link.target) || link.target
        : link.target,
      type: link.type,
    })).filter((link) => link.source && link.target);

    // マージンを設定
    const margin = 50;
    const boundsWidth = width - margin * 2;
    const boundsHeight = height - margin * 2;

    const simulation = forceSimulation(filteredNodes as any)
      .force(
        'link',
        forceLink(simulationLinks as any)
          .id((d: any) => d.id)
          .distance((link: any) => {
            if (link.type === 'company-project') return 150;
            if (link.type === 'project-concept') return 100;
            if (link.type === 'concept-servicePlan') return 70;
            if (link.type === 'project-servicePlan') return 90;
            if (link.type === 'concept-subMenu') return 80;
            if (link.type === 'company-subMenu') return 80;
            if (link.type === 'subMenu-page') return 60;
            return 80;
          })
      )
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collision', forceCollide().radius((d: any) => {
        if (d.type === 'company') return 35;
        if (d.type === 'project') return 24;
        if (d.type === 'concept') return 15;
        if (d.type === 'servicePlan') return 13;
        if (d.type === 'subMenu') return 13;
        if (d.type === 'page') return 11;
        return 12;
      }));

    // シミュレーションの更新
    simulation.on('tick', () => {
      // ノードの位置を境界内に制限
      filteredNodes.forEach((node: any) => {
        if (node.x < margin) node.x = margin;
        if (node.x > width - margin) node.x = width - margin;
        if (node.y < margin) node.y = margin;
        if (node.y > height - margin) node.y = height - margin;
      });

      linkElements
        .attr('x1', (d: any) => {
          const source = typeof d.source === 'object' ? d.source : filteredNodes.find(n => n.id === d.source);
          return source?.x || 0;
        })
        .attr('y1', (d: any) => {
          const source = typeof d.source === 'object' ? d.source : filteredNodes.find(n => n.id === d.source);
          return source?.y || 0;
        })
        .attr('x2', (d: any) => {
          const target = typeof d.target === 'object' ? d.target : filteredNodes.find(n => n.id === d.target);
          return target?.x || 0;
        })
        .attr('y2', (d: any) => {
          const target = typeof d.target === 'object' ? d.target : filteredNodes.find(n => n.id === d.target);
          return target?.y || 0;
        });

      nodeElements.attr('cx', (d: any) => d.x || 0).attr('cy', (d: any) => d.y || 0);

      labelElements.attr('x', (d: any) => d.x || 0).attr('y', (d: any) => d.y || 0);
    });

    // クリックイベントを追加（企画ノードをクリックすると構想ノードを表示）
    nodeElements.on('click', function (event: MouseEvent, d: GraphNode) {
      if (d.type === 'project') {
        const projectId = d.id;
        const relatedConcepts = links
          .filter(link => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            return (sourceId === projectId && link.type === 'project-concept') ||
                   (targetId === projectId && link.type === 'project-concept');
          })
          .map(link => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            return sourceId === projectId ? targetId : sourceId;
          });
        
        // 構想ノードは常に表示されているため、クリックイベントは不要
        // シミュレーションを再起動してノードを再配置
        simulation.alpha(1).restart();
      } else if (d.type === 'concept' && !d.data?.isComponentized) {
        // 固定ページ形式の構想ノードをクリックしたときに、その構想のoverviewページをモーダルで表示
        const serviceId = d.data?.serviceId;
        const conceptId = d.data?.conceptId || d.id.replace('concept-', '').replace('fixed-concept-', '');
        const conceptLabel = d.label;
        
        if (serviceId && conceptId) {
          setModalFixedConcept({
            serviceId,
            conceptId,
            conceptLabel,
          });
        }
      }
    });

    // ダブルクリックイベントを追加（ページノード、サブメニューノード、構想ノード、会社ノードをダブルクリックするとモーダルで表示）
    nodeElements.on('dblclick', function (event: MouseEvent, d: GraphNode) {
      if (d.type === 'page' && d.data?.pageContent) {
        setModalPage({
          title: d.data.pageTitle || d.label,
          content: d.data.pageContent,
          pageId: d.data.pageId,
          pageNumber: d.data.pageNumber || 0,
        });
      } else if (d.type === 'company') {
        // 会社の事業計画ノードをダブルクリックしたときに、その事業計画のページをモーダルで表示
        const planId = d.data?.docId || d.id.replace('company-', '');
        const planLabel = d.label;
        
        if (planId) {
          setModalCompanyPlan({
            planId,
            planLabel,
          });
        }
      } else if (d.type === 'concept') {
        // 構想ノードをダブルクリックしたときに、その構想のページをモーダルで表示
        const serviceId = d.data?.serviceId;
        const conceptId = d.data?.conceptId || d.id.replace('concept-', '').replace('fixed-concept-', '');
        const conceptLabel = d.label;
        const isComponentized = d.data?.isComponentized ?? false;
        
        if (serviceId && conceptId) {
          if (isComponentized) {
            // コンポーネント形式の構想の場合、overviewページをモーダルで表示
            setModalFixedConcept({
              serviceId,
              conceptId,
              conceptLabel,
            });
          } else {
            // 固定ページ形式の構想の場合、overviewページをモーダルで表示
            setModalFixedConcept({
              serviceId,
              conceptId,
              conceptLabel,
            });
          }
        }
      } else if (d.type === 'subMenu') {
        if (d.data?.isComponentized && d.data?.pages && Array.isArray(d.data.pages) && d.data.pages.length > 0) {
          // コンポーネント形式のサブメニューノードをダブルクリックすると、そのサブメニューに属するページをモーダルで表示
          const pages = d.data.pages.map((page: any) => ({
            title: page.title || `ページ ${page.pageNumber || ''}`,
            content: page.content || '',
            pageId: page.id,
            pageNumber: page.pageNumber || 0,
          }));
          setModalSubMenuPages(pages);
        } else if (!d.data?.isComponentized) {
          // 固定ページ形式のサブメニューノードをダブルクリックすると、そのページをモーダルで表示
          const isCompanyPlan = d.data?.isCompanyPlan;
          
          if (isCompanyPlan) {
            // 会社の事業計画のサブメニューの場合
            const planId = d.data?.planId;
            const subMenuId = d.data?.subMenuId;
            const subMenuLabel = d.data?.subMenuLabel || d.label;
            
            if (planId && subMenuId) {
              setModalFixedPage({
                serviceId: '', // 会社の事業計画の場合は空
                conceptId: '', // 会社の事業計画の場合は空
                subMenuId: subMenuId,
                subMenuLabel: subMenuLabel,
                planId: planId, // 会社の事業計画のIDを追加
                isCompanyPlan: true,
              });
            }
          } else {
            // 構想のサブメニューの場合
            const serviceId = d.data?.serviceId;
            const conceptId = d.data?.conceptId;
            const subMenuId = d.data?.subMenuId;
            const subMenuLabel = d.data?.subMenuLabel || d.label;
            
            if (serviceId && conceptId && subMenuId) {
              setModalFixedPage({
                serviceId,
                conceptId,
                subMenuId,
                subMenuLabel,
              });
            }
          }
        }
      }
    });

    // ドラッグ機能を追加
    const dragHandler = drag<SVGCircleElement, GraphNode>()
      .on('start', function (event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on('drag', function (event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on('end', function (event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      });

    nodeElements.call(dragHandler);

    simulationRef.current = simulation;

    // クリーンアップ
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [filteredNodes, filteredLinks, width, height, colorScale, loading]);

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '40px', textAlign: 'center' }}>
        <p>データを読み込み中...</p>
      </div>
    );
  }

  // 追加ノードの読み込み中のインジケーター
  const additionalNodesLoadingIndicator = loadingAdditionalNodes ? (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '8px 16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        fontSize: '14px',
        color: '#666',
        zIndex: 1000,
      }}
    >
      詳細ノードを読み込み中...
    </div>
  ) : null;

  if (nodes.length === 0) {
    return (
      <div style={{ width: '100%', padding: '40px', textAlign: 'center' }}>
        <p>データがありません。会社、事業企画、構想を作成してください。</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', overflow: 'hidden', padding: '20px' }}>
      {title && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600',
          color: '#1a1a1a',
          fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
                letterSpacing: '-0.02em',
                margin: 0,
                marginBottom: '8px'
        }}>
          {title}
        </h2>
              {/* フィルター統計情報 */}
              <div style={{ 
                display: 'flex', 
                gap: '16px', 
                fontSize: '12px', 
                color: 'rgba(107, 114, 128, 0.8)',
                fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif"
              }}>
                {filteredStats.project > 0 && (
                  <span>事業企画: <strong style={{ color: '#50C878', fontWeight: 600 }}>{filteredStats.project}</strong></span>
                )}
                {filteredStats.concept > 0 && (
                  <span>構想: <strong style={{ color: '#FF6B6B', fontWeight: 600 }}>{filteredStats.concept}</strong></span>
                )}
                {filteredStats.subMenu > 0 && (
                  <span>サブメニュー（構想）: <strong style={{ color: '#E67E22', fontWeight: 600 }}>{filteredStats.subMenu}</strong></span>
                )}
                {filteredStats.page > 0 && (
                  <span>ページ（構想）: <strong style={{ color: '#9B59B6', fontWeight: 600 }}>{filteredStats.page}</strong></span>
                )}
                {filteredStats.companySubMenu > 0 && (
                  <span>サブメニュー（会社事業計画）: <strong style={{ color: '#E67E22', fontWeight: 600 }}>{filteredStats.companySubMenu}</strong></span>
                )}
                {filteredStats.companyPage > 0 && (
                  <span>ページ（会社事業計画）: <strong style={{ color: '#9B59B6', fontWeight: 600 }}>{filteredStats.companyPage}</strong></span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setFilterMode('fixed')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: filterMode === 'fixed' ? '#4A90E2' : '#f0f0f0',
                  color: filterMode === 'fixed' ? '#fff' : '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >
                固定ページ形式
              </button>
              <button
                onClick={() => setFilterMode('componentized')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: filterMode === 'componentized' ? '#4A90E2' : '#f0f0f0',
                  color: filterMode === 'componentized' ? '#fff' : '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >
                コンポーネント形式
              </button>
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: showFavoritesOnly ? '#F59E0B' : '#f0f0f0',
                  color: showFavoritesOnly ? '#fff' : '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title={showFavoritesOnly ? 'お気に入りフィルターを解除' : 'お気に入りのみ表示'}
              >
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill={showFavoritesOnly ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                お気に入り
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginRight: '4px' }}>表示する階層:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={nodeTypeFilters.company}
                onChange={(e) => setNodeTypeFilters(prev => ({ ...prev, company: e.target.checked }))}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#333' }}>会社</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={nodeTypeFilters.project}
                onChange={(e) => setNodeTypeFilters(prev => ({ ...prev, project: e.target.checked }))}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#333' }}>事業企画</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={nodeTypeFilters.concept}
                onChange={(e) => setNodeTypeFilters(prev => ({ ...prev, concept: e.target.checked }))}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#333' }}>構想</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: nodeTypeFilters.companyPage ? 'not-allowed' : 'pointer' }}>
              <input
                type="checkbox"
                checked={nodeTypeFilters.companySubMenu}
                onChange={(e) => {
                  // 会社の事業計画のページが選択されている場合は、サブメニューを外せない
                  if (nodeTypeFilters.companyPage) {
                    return;
                  }
                  const isCompanySubMenuChecked = e.target.checked;
                  setNodeTypeFilters(prev => ({ 
                    ...prev, 
                    companySubMenu: isCompanySubMenuChecked,
                    // サブメニューが外されたら、ページも外す
                    companyPage: isCompanySubMenuChecked ? prev.companyPage : false
                  }));
                }}
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  cursor: nodeTypeFilters.companyPage ? 'not-allowed' : 'pointer'
                }}
              />
              <span style={{ fontSize: '14px', color: '#333' }}>サブメニュー（会社事業計画）</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={nodeTypeFilters.companyPage}
                onChange={(e) => {
                  const isCompanyPageChecked = e.target.checked;
                  setNodeTypeFilters(prev => ({ 
                    ...prev, 
                    companyPage: isCompanyPageChecked,
                    // ページが選択されたら、サブメニューも必須で選択
                    companySubMenu: isCompanyPageChecked ? true : prev.companySubMenu
                  }));
                }}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#333' }}>ページ（会社事業計画）</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: nodeTypeFilters.page ? 'not-allowed' : 'pointer' }}>
              <input
                type="checkbox"
                checked={nodeTypeFilters.subMenu}
                onChange={(e) => {
                  // ページが選択されている場合は、サブメニューを外せない
                  if (nodeTypeFilters.page) {
                    return;
                  }
                  const isSubMenuChecked = e.target.checked;
                  setNodeTypeFilters(prev => ({ 
                    ...prev, 
                    subMenu: isSubMenuChecked,
                    // サブメニューが外されたら、ページも外す
                    page: isSubMenuChecked ? prev.page : false
                  }));
                }}
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  cursor: nodeTypeFilters.page ? 'not-allowed' : 'pointer'
                }}
              />
              <span style={{ fontSize: '14px', color: '#333' }}>サブメニュー（構想）</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={nodeTypeFilters.page}
                onChange={(e) => {
                  const isPageChecked = e.target.checked;
                  setNodeTypeFilters(prev => ({ 
                    ...prev, 
                    page: isPageChecked,
                    // ページが選択されたら、サブメニューも必須で選択
                    subMenu: isPageChecked ? true : prev.subMenu
                  }));
                }}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#333' }}>ページ（構想）</span>
            </label>
          </div>
          {/* フィルターセクション（折りたたみ可能） */}
          <div style={{ marginTop: '12px', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: '#f9f9f9' }}>
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              style={{
                width: '100%',
                padding: '10px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                color: '#333',
              }}
            >
              <span>詳細フィルター</span>
              <span style={{ fontSize: '12px', color: '#666' }}>{isFilterExpanded ? '▼' : '▶'}</span>
            </button>
            {isFilterExpanded && (
              <div style={{ padding: '12px', borderTop: '1px solid #e0e0e0' }}>
                {/* 会社フィルター */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginRight: '4px', minWidth: '100px' }}>会社で絞り込み:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: '#fff', flex: 1 }}>
                    {nodes.filter(n => {
                      if (n.type !== 'company') return false;
                      const isComponentized = n.data?.isComponentized ?? false;
                      if (filterMode === 'componentized') return isComponentized;
                      if (filterMode === 'fixed') return !isComponentized;
                      return false;
                    }).map(companyNode => {
                      const companyId = companyNode.id.replace('company-', '');
                      const isSelected = selectedCompanyIds.has(companyId) || selectedCompanyIds.has(companyNode.id);
                      return (
                        <label key={companyNode.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSet = new Set(selectedCompanyIds);
                              if (e.target.checked) {
                                newSet.add(companyId);
                                newSet.add(companyNode.id);
                              } else {
                                newSet.delete(companyId);
                                newSet.delete(companyNode.id);
                              }
                              setSelectedCompanyIds(newSet);
                            }}
                            style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                          />
                          <span style={{ color: '#333' }}>{companyNode.label}</span>
                        </label>
                      );
                    })}
                    {nodes.filter(n => {
                      if (n.type !== 'company') return false;
                      const isComponentized = n.data?.isComponentized ?? false;
                      if (filterMode === 'componentized') return isComponentized;
                      if (filterMode === 'fixed') return !isComponentized;
                      return false;
                    }).length === 0 && (
                      <span style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>会社がありません</span>
                    )}
                  </div>
                </div>
                {/* 事業企画フィルター */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginRight: '4px', minWidth: '100px' }}>事業企画で絞り込み:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: '#fff', flex: 1 }}>
                    {nodes.filter(n => n.type === 'project').map(projectNode => {
                      const projectId = projectNode.id.replace('project-', '');
                      const isSelected = selectedProjectIds.has(projectId) || selectedProjectIds.has(projectNode.id);
                      return (
                        <label key={projectNode.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSet = new Set(selectedProjectIds);
                              if (e.target.checked) {
                                newSet.add(projectId);
                                newSet.add(projectNode.id);
                              } else {
                                newSet.delete(projectId);
                                newSet.delete(projectNode.id);
                              }
                              setSelectedProjectIds(newSet);
                            }}
                            style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                          />
                          <span style={{ color: '#333' }}>{projectNode.label}</span>
                        </label>
                      );
                    })}
                    {nodes.filter(n => n.type === 'project').length === 0 && (
                      <span style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>事業企画がありません</span>
                    )}
                  </div>
                </div>
                {/* 構想フィルター */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginRight: '4px', minWidth: '100px' }}>構想で絞り込み:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: '#fff', flex: 1 }}>
                    {nodes.filter(n => {
                      if (n.type !== 'concept') return false;
                      const isComponentized = n.data?.isComponentized ?? false;
                      if (filterMode === 'componentized') return isComponentized;
                      if (filterMode === 'fixed') return !isComponentized;
                      return false;
                    }).map(conceptNode => {
                      const conceptDocId = conceptNode.data?.docId;
                      const conceptId = conceptNode.data?.conceptId || conceptNode.id.replace('concept-', '').replace('fixed-concept-', '');
                      const isSelected = selectedConceptIds.has(conceptNode.id) || selectedConceptIds.has(conceptId) || (conceptDocId && selectedConceptIds.has(conceptDocId));
                      return (
                        <label key={conceptNode.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSet = new Set(selectedConceptIds);
                              if (e.target.checked) {
                                newSet.add(conceptNode.id);
                                newSet.add(conceptId);
                                if (conceptDocId) newSet.add(conceptDocId);
                              } else {
                                newSet.delete(conceptNode.id);
                                newSet.delete(conceptId);
                                if (conceptDocId) newSet.delete(conceptDocId);
                              }
                              setSelectedConceptIds(newSet);
                            }}
                            style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                          />
                          <span style={{ color: '#333' }}>{conceptNode.label}</span>
                        </label>
                      );
                    })}
                    {nodes.filter(n => {
                      if (n.type !== 'concept') return false;
                      const isComponentized = n.data?.isComponentized ?? false;
                      if (filterMode === 'componentized') return isComponentized;
                      if (filterMode === 'fixed') return !isComponentized;
                      return false;
                    }).length === 0 && (
                      <span style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>構想がありません</span>
                    )}
                  </div>
                </div>
                {/* サブメニューフィルター */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginRight: '4px', minWidth: '100px' }}>サブメニューで絞り込み:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: '#fff', flex: 1 }}>
                    {nodes.filter(n => {
                      if (n.type !== 'subMenu') return false;
                      const isComponentized = n.data?.isComponentized ?? false;
                      if (filterMode === 'componentized') return isComponentized;
                      if (filterMode === 'fixed') return !isComponentized;
                      return false;
                    }).map(subMenuNode => {
                      const subMenuId = subMenuNode.id;
                      const isSelected = selectedSubMenuIds.has(subMenuId);
                      return (
                        <label key={subMenuNode.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSet = new Set(selectedSubMenuIds);
                              if (e.target.checked) {
                                newSet.add(subMenuId);
                              } else {
                                newSet.delete(subMenuId);
                              }
                              setSelectedSubMenuIds(newSet);
                            }}
                            style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                          />
                          <span style={{ color: '#333' }}>{subMenuNode.label}</span>
                        </label>
                      );
                    })}
                    {nodes.filter(n => {
                      if (n.type !== 'subMenu') return false;
                      const isComponentized = n.data?.isComponentized ?? false;
                      if (filterMode === 'componentized') return isComponentized;
                      if (filterMode === 'fixed') return !isComponentized;
                      return false;
                    }).length === 0 && (
                      <span style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>サブメニューがありません</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ width: '100%', maxWidth: `${width}px`, margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
        {additionalNodesLoadingIndicator}
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', border: 'none', borderRadius: '12px', backgroundColor: '#ffffff', overflow: 'visible', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}
          xmlns="http://www.w3.org/2000/svg"
        />
        {tooltip && (
          <div
            style={{
              position: 'absolute',
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: 'translate(-50%, -100%)',
              background: 'rgba(26, 26, 26, 0.95)',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              pointerEvents: 'none',
              zIndex: 1000,
              maxWidth: '280px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(10px)',
              fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
              lineHeight: '1.5',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: colorScale(tooltip.data.type) }}>
              {tooltip.data.type === 'company' && '会社'}
              {tooltip.data.type === 'project' && '事業企画'}
              {tooltip.data.type === 'concept' && '構想'}
              {tooltip.data.type === 'servicePlan' && 'サービス計画'}
              {tooltip.data.type === 'subMenu' && 'サブメニュー'}
              {tooltip.data.type === 'page' && 'ページ'}
            </div>
            <div style={{ marginBottom: '4px' }}>{tooltip.data.label}</div>
            {tooltip.data.data?.description && (
              <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '4px' }}>
                {tooltip.data.data.description.substring(0, 100)}
                {tooltip.data.data.description.length > 100 ? '...' : ''}
              </div>
            )}
            {tooltip.data.data?.serviceId && (
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                サービスID: {tooltip.data.data.serviceId}
              </div>
            )}
            {tooltip.data.data?.conceptId && (
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                構想ID: {tooltip.data.data.conceptId}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
        <div style={{ display: 'inline-flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #5BA0F2, #3A7BC8)',
                boxShadow: '0 2px 4px rgba(58, 123, 200, 0.3)',
              }}
            />
            <span style={{ fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif", fontWeight: '500' }}>会社</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #60D88A, #40B86A)',
                boxShadow: '0 2px 4px rgba(64, 184, 106, 0.3)',
              }}
            />
            <span style={{ fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif", fontWeight: '500' }}>事業企画</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #FF7B7B, #E55A5A)',
                boxShadow: '0 2px 4px rgba(229, 90, 90, 0.3)',
              }}
            />
            <span style={{ fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif", fontWeight: '500' }}>構想</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #E67E22, #D35400)',
                boxShadow: '0 2px 4px rgba(230, 126, 34, 0.3)',
              }}
            />
            <span style={{ fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif", fontWeight: '500' }}>サブメニュー</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #9B59B6, #8E44AD)',
                boxShadow: '0 2px 4px rgba(155, 89, 182, 0.3)',
              }}
            />
            <span style={{ fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif", fontWeight: '500' }}>ページ</span>
          </div>
          </div>
        <p style={{ marginTop: '12px', fontSize: '13px', color: '#888', fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif" }}>
          ノードをドラッグして移動できます。会社ノード、構想ノード、サブメニューノード、ページノードをダブルクリックすると詳細を表示します。
        </p>
      </div>
      
      {/* ページモーダル */}
      {modalPage && (
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
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalPage(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '1600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                {modalPage.title}
              </h3>
              <button
                onClick={() => setModalPage(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '4px 8px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
              <DynamicPage
                pageId={modalPage.pageId}
                pageNumber={modalPage.pageNumber}
                title={modalPage.title}
                content={modalPage.content}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* サブメニューページモーダル */}
      {modalSubMenuPages && modalSubMenuPages.length > 0 && (
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
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalSubMenuPages(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '1600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                サブメニューのページ一覧 ({modalSubMenuPages.length}件)
              </h3>
              <button
                onClick={() => setModalSubMenuPages(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '4px 8px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
              {modalSubMenuPages.map((page, index) => (
                <div key={page.pageId} style={{ marginBottom: index < modalSubMenuPages.length - 1 ? '40px' : 0 }}>
                  <DynamicPage
                    pageId={page.pageId}
                    pageNumber={page.pageNumber}
                    title={page.title}
                    content={page.content}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* サブメニューページモーダル */}
      {modalSubMenuPages && modalSubMenuPages.length > 0 && (
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
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalSubMenuPages(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '1600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                サブメニューのページ一覧 ({modalSubMenuPages.length}件)
              </h3>
              <button
                onClick={() => setModalSubMenuPages(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '4px 8px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
              {modalSubMenuPages.map((page, index) => (
                <div key={page.pageId} style={{ marginBottom: index < modalSubMenuPages.length - 1 ? '40px' : 0 }}>
                  <DynamicPage
                    pageId={page.pageId}
                    pageNumber={page.pageNumber}
                    title={page.title}
                    content={page.content}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* 固定ページ形式のサブメニューモーダル */}
      {modalFixedPage && (
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
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalFixedPage(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '1600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                {modalFixedPage.subMenuLabel}
              </h3>
              <button
                onClick={() => setModalFixedPage(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '4px 8px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
              <iframe
                src={modalFixedPage.isCompanyPlan && modalFixedPage.planId
                  ? `/business-plan/company/${modalFixedPage.planId}/${modalFixedPage.subMenuId}?modal=true&hideSidebar=true`
                  : `/business-plan/services/${modalFixedPage.serviceId}/${modalFixedPage.conceptId}/${modalFixedPage.subMenuId}?modal=true&hideSidebar=true`}
                style={{
                  width: '100%',
                  height: '70vh',
                  border: 'none',
                  borderRadius: '8px',
                }}
                title={modalFixedPage.subMenuLabel}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* 固定ページ形式の構想モーダル */}
      {modalFixedConcept && (
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
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalFixedConcept(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '1600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                {modalFixedConcept.conceptLabel}
              </h3>
              <button
                onClick={() => setModalFixedConcept(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '4px 8px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
              <iframe
                src={`/business-plan/services/${modalFixedConcept.serviceId}/${modalFixedConcept.conceptId}/overview?modal=true`}
                style={{
                  width: '100%',
                  height: '70vh',
                  border: 'none',
                  borderRadius: '8px',
                }}
                title={modalFixedConcept.conceptLabel}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* 会社の事業計画モーダル */}
      {modalCompanyPlan && (
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
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalCompanyPlan(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '1600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                {modalCompanyPlan.planLabel}
              </h3>
              <button
                onClick={() => setModalCompanyPlan(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '4px 8px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
              <iframe
                src={`/business-plan/company/${modalCompanyPlan.planId}/overview?modal=true`}
                style={{
                  width: '100%',
                  height: '70vh',
                  border: 'none',
                  borderRadius: '8px',
                }}
                title={modalCompanyPlan.planLabel}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

