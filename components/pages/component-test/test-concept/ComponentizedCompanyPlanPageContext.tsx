'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { callTauriCommand, onAuthStateChanged, doc, getDoc, updateDoc, serverTimestamp, auth } from '@/lib/localFirebase';
import { pageConfigs, PageConfig } from './pageConfig';
import DynamicPage from './DynamicPage';
import { generatePageMetadata } from '@/lib/pageMetadataUtils';
import { PageMetadata } from '@/types/pageMetadata';
import { savePageEmbeddingAsync } from '@/lib/pageEmbeddings';
import { SUB_MENU_ITEMS } from '@/components/ConceptSubMenu';

interface ComponentizedCompanyPlanPageContextType {
  orderedConfigs: PageConfig[];
  currentPageIndex: number;
  totalPages: number;
  setCurrentPageIndex: (index: number) => void;
  setOrderedConfigs: (configs: PageConfig[]) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  loading: boolean;
  refreshPages: () => void;
  subMenuId: string;
}

const ComponentizedCompanyPlanPageContext = createContext<ComponentizedCompanyPlanPageContextType | undefined>(undefined);

export const useComponentizedCompanyPlanPage = () => {
  const context = useContext(ComponentizedCompanyPlanPageContext);
  if (context === undefined) {
    throw new Error('useComponentizedCompanyPlanPage must be used within a ComponentizedCompanyPlanPageProvider');
  }
  return context;
};

// オプショナル版：コンテキストが存在しない場合はnullを返す
export const useComponentizedCompanyPlanPageOptional = (): ComponentizedCompanyPlanPageContextType | null => {
  const context = useContext(ComponentizedCompanyPlanPageContext);
  return context ?? null;
};

interface ComponentizedCompanyPlanPageProviderProps {
  children: ReactNode;
}

export function ComponentizedCompanyPlanPageProvider({ children }: ComponentizedCompanyPlanPageProviderProps) {
  const params = useParams();
  const pathname = usePathname();
  const planId = params?.planId as string | undefined;
  
  // 現在のサブメニューIDを取得
  const getCurrentSubMenuId = () => {
    const pathSegments = pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    if (lastSegment === planId) {
      return 'overview';
    }
    return SUB_MENU_ITEMS.find(item => item.path === lastSegment)?.id || 'overview';
  };
  
  const subMenuId = getCurrentSubMenuId();
  
  const [orderedConfigs, setOrderedConfigs] = useState<PageConfig[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 認証状態を監視
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(!!user);
      if (!user) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Firestoreから順序と動的ページを読み込む（サブメニューごと）
  useEffect(() => {
    // 会社本体の事業計画かどうかを判定
    if (!planId) {
      setLoading(false);
      return;
    }

    const loadPageOrder = async () => {
      if (!authReady || !auth?.currentUser) {
        if (!authReady) {
          return;
        }
        setLoading(false);
        return;
      }

      try {
        // planIdで直接ドキュメントを取得
        const planDoc = await getDoc(doc(null, 'companyBusinessPlan', planId));
        
        if (planDoc.exists()) {
          const data = planDoc.data();
            
            // サブメニューごとのページデータを取得
            let pagesBySubMenu = data.pagesBySubMenu as { [key: string]: Array<PageMetadata> } | undefined;
            
            const pageOrderBySubMenu = data.pageOrderBySubMenu as { [key: string]: string[] } | undefined;
            
            // デバッグログ
            console.log('ComponentizedCompanyPlanPageContext - planId:', planId);
            console.log('ComponentizedCompanyPlanPageContext - subMenuId:', subMenuId);
            console.log('ComponentizedCompanyPlanPageContext - pagesBySubMenu:', pagesBySubMenu);
            console.log('ComponentizedCompanyPlanPageContext - pageOrderBySubMenu:', pageOrderBySubMenu);
            
            // 現在のサブメニューのページデータを取得
            let currentSubMenuPages = (pagesBySubMenu?.[subMenuId] || []) as PageMetadata[];
            const currentSubMenuPageOrder = pageOrderBySubMenu?.[subMenuId];
            
            // 既存のページにメタデータがない場合は自動生成して保存
            if (currentSubMenuPages && currentSubMenuPages.length > 0) {
              const totalPages = Object.values(pagesBySubMenu || {}).reduce((sum, pages) => sum + pages.length, 0);
              let needsUpdate = false;
              const updatedPages = currentSubMenuPages.map((page) => {
                // メタデータがない場合は生成
                if (!page.tags && !page.contentType && !page.semanticCategory) {
                  needsUpdate = true;
                  return generatePageMetadata({
                    id: page.id,
                    pageNumber: page.pageNumber,
                    title: page.title,
                    content: page.content,
                    createdAt: page.createdAt || new Date().toISOString(),
                  }, subMenuId, totalPages);
                }
                return page;
              });
              
              // メタデータを更新する必要がある場合はデータベースに保存
              if (needsUpdate && planDoc) {
                try {
                  const updatedPagesBySubMenu = {
                    ...pagesBySubMenu,
                    [subMenuId]: updatedPages,
                  };
                  
                  const planDocRef = doc(null, 'companyBusinessPlan', planId);
                  await updateDoc(planDocRef, {
                    pagesBySubMenu: updatedPagesBySubMenu,
                    updatedAt: serverTimestamp(),
                  });
                  console.log('✅ 既存ページにメタデータを自動付与しました（会社計画）:', updatedPages.length, 'ページ');
                  
                  // ベクトル埋め込みも非同期で生成（メタデータを含む）
                  for (const page of updatedPages) {
                    savePageEmbeddingAsync(
                      page.id, 
                      page.title, 
                      page.content, 
                      planId,
                      undefined,
                      {
                        keywords: page.keywords,
                        semanticCategory: page.semanticCategory,
                        tags: page.tags,
                        summary: page.summary,
                      }
                    );
                  }
                  
                  // 更新後のデータを使用
                  currentSubMenuPages = updatedPages;
                  pagesBySubMenu = updatedPagesBySubMenu;
                } catch (error) {
                  console.error('メタデータ自動付与エラー（会社計画）:', error);
                }
              }
            }
            
            console.log('ComponentizedCompanyPlanPageContext - currentSubMenuPages:', currentSubMenuPages);
            console.log('ComponentizedCompanyPlanPageContext - currentSubMenuPageOrder:', currentSubMenuPageOrder);
            
            // 動的ページをPageConfigに変換
            const dynamicPageConfigs: PageConfig[] = (currentSubMenuPages || []).map((page) => ({
              id: page.id,
              pageNumber: page.pageNumber,
              title: page.title,
              content: page.content, // プレビュー用にcontentを追加
              component: () => (
                <DynamicPage
                  pageId={page.id}
                  pageNumber={page.pageNumber}
                  title={page.title}
                  content={page.content}
                />
              ),
            }));
            
            console.log('ComponentizedCompanyPlanPageContext - dynamicPageConfigs:', dynamicPageConfigs);
            console.log('ComponentizedCompanyPlanPageContext - dynamicPageConfigs.length:', dynamicPageConfigs.length);
            
            // overviewの場合は固定ページも含める
            let allConfigs: PageConfig[];
            if (subMenuId === 'overview') {
              allConfigs = [...pageConfigs, ...dynamicPageConfigs];
            } else {
              allConfigs = dynamicPageConfigs;
            }
            
            console.log('ComponentizedCompanyPlanPageContext - allConfigs:', allConfigs);
            console.log('ComponentizedCompanyPlanPageContext - allConfigs.length:', allConfigs.length);
            
            let finalOrderedConfigs: PageConfig[];
            if (currentSubMenuPageOrder && currentSubMenuPageOrder.length > 0) {
              // 保存された順序に基づいてページを並び替え
              const ordered = currentSubMenuPageOrder
                .map((pageId) => allConfigs.find((config) => config.id === pageId))
                .filter((config): config is PageConfig => config !== undefined);
              
              // 保存されていないページを末尾に追加
              const missingPages = allConfigs.filter(
                (config) => !currentSubMenuPageOrder.includes(config.id)
              );
              
              finalOrderedConfigs = [...ordered, ...missingPages];
            } else {
              // ページ番号でソート
              finalOrderedConfigs = [...allConfigs].sort((a, b) => a.pageNumber - b.pageNumber);
            }
            
            console.log('ComponentizedCompanyPlanPageContext - finalOrderedConfigs:', finalOrderedConfigs);
            console.log('ComponentizedCompanyPlanPageContext - finalOrderedConfigs.length:', finalOrderedConfigs.length);
            
            setOrderedConfigs(finalOrderedConfigs);
        } else {
          // データが存在しない場合は、overviewの場合は固定ページを、それ以外は空配列を設定
          if (subMenuId === 'overview') {
            setOrderedConfigs(pageConfigs);
          } else {
            setOrderedConfigs([]);
          }
        }
      } catch (error) {
        console.error('ページ順序の読み込みエラー:', error);
        // エラーが発生してもデフォルト順序を使用して続行
        if (subMenuId === 'overview') {
          setOrderedConfigs(pageConfigs);
        } else {
          setOrderedConfigs([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadPageOrder();
  }, [planId, subMenuId, authReady, refreshTrigger]);

  const goToNextPage = () => {
    setCurrentPageIndex((prev) => Math.min(prev + 1, orderedConfigs.length - 1));
  };

  const goToPreviousPage = () => {
    setCurrentPageIndex((prev) => Math.max(prev - 1, 0));
  };

  const refreshPages = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <ComponentizedCompanyPlanPageContext.Provider
      value={{
        orderedConfigs,
        currentPageIndex,
        totalPages: orderedConfigs.length,
        setCurrentPageIndex,
        setOrderedConfigs,
        goToNextPage,
        goToPreviousPage,
        loading,
        refreshPages,
        subMenuId,
      }}
    >
      {children}
    </ComponentizedCompanyPlanPageContext.Provider>
  );
}

