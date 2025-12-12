'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, getTimestamp } from '@/lib/localFirebase';
import { onAuthStateChanged, auth } from '@/lib/localFirebase';
import { pageConfigs, PageConfig } from './pageConfig';
import PageOrderManager from './PageOrderManager';
import { useComponentizedCompanyPlanPage } from './ComponentizedCompanyPlanPageContext';
import { usePresentationMode } from '@/components/PresentationModeContext';
// テンプレートアプリでは、usePlanは存在しないため、デフォルトの実装を使用
// 必要に応じて、後で追加できます
const usePlan = (planId?: string) => ({ plan: null, loading: false, error: null, reloadPlan: () => {} });
import AddPageForm from './AddPageForm';
import { pageAutoUpdateConfigs, PageAutoUpdateConfig } from './pageAutoUpdateConfig';
import DynamicPage from './DynamicPage';
import './pageStyles.css';

export default function ComponentizedCompanyPlanOverview() {
  const params = useParams();
  const planId = params.planId as string | undefined;
  const { isPresentationMode } = usePresentationMode();
  const { orderedConfigs, currentPageIndex, totalPages, setCurrentPageIndex, setOrderedConfigs, refreshPages, subMenuId } = useComponentizedCompanyPlanPage();
  const { plan, loading: planLoading, reloadPlan } = usePlan();
  const [showOrderManager, setShowOrderManager] = useState(false);
  const [showAddPageForm, setShowAddPageForm] = useState(false);
  const [showLogoEditor, setShowLogoEditor] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [deleteLogoConfirmModal, setDeleteLogoConfirmModal] = useState(false);

  // すべてのHooksを早期リターンの前に呼び出す（React Hooksのルール）
  // デバッグログ
  useEffect(() => {
    console.log('ComponentizedCompanyPlanOverview - orderedConfigs:', orderedConfigs);
    console.log('ComponentizedCompanyPlanOverview - orderedConfigs.length:', orderedConfigs.length);
    console.log('ComponentizedCompanyPlanOverview - orderedConfigs.map(c => c.id):', orderedConfigs.map(c => c.id));
    console.log('ComponentizedCompanyPlanOverview - isPresentationMode:', isPresentationMode);
    console.log('ComponentizedCompanyPlanOverview - currentPageIndex:', currentPageIndex);
  }, [orderedConfigs, isPresentationMode, currentPageIndex]);

  // 自動更新が必要なページをチェック
  useEffect(() => {
    const currentPageConfig = orderedConfigs[currentPageIndex];
    if (!currentPageConfig || !plan || plan === null) return;

    const autoUpdateConfig = pageAutoUpdateConfigs.find(config => config.pageId === currentPageConfig.id);
    if (autoUpdateConfig && autoUpdateConfig.shouldUpdate) {
      // planから現在のページのコンテンツを取得
      const pagesBySubMenu = (plan as any).pagesBySubMenu as { [key: string]: Array<{
        id: string;
        pageNumber: number;
        title: string;
        content: string;
      }> } | undefined;
      const currentSubMenuPages = pagesBySubMenu?.[subMenuId || 'overview'] || [];
      const currentPage = currentSubMenuPages.find(page => page.id === currentPageConfig.id);
      const currentContent = currentPage?.content || '';
      
      if (autoUpdateConfig.shouldUpdate(currentContent)) {
      // 自動更新が必要な場合は、ページを再読み込み
      if (refreshPages) {
        refreshPages();
      }
    }
    }
  }, [orderedConfigs, currentPageIndex, plan, refreshPages, subMenuId]);

  // planIdが存在しない場合はエラーを表示
  if (!planId) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--color-text-light)', fontSize: '14px' }}>
          ページ情報が正しく読み込まれていません。
        </p>
      </div>
    );
  }

  const handleOrderChange = (newOrder: PageConfig[]) => {
    // ComponentizedCompanyPlanPageContextで管理されているため、ここでは何もしない
    console.log('ページ順序が変更されました:', newOrder.map(c => c.id));
  };

  const handlePageAdded = async () => {
    // 注意: refreshPages()は呼び出さない
    // Firestoreから最新のページデータを取得してコンテキストを直接更新するため、
    // リロードなしでUIが更新される
    if (planId && setOrderedConfigs) {
      try {
        const planDoc = await getDoc(doc(null, 'companyBusinessPlan', planId));
        if (planDoc.exists()) {
          const planData = planDoc.data();
          const pagesBySubMenu = planData.pagesBySubMenu || {};
          const pageOrderBySubMenu = planData.pageOrderBySubMenu || {};
          const currentSubMenuPages = pagesBySubMenu[subMenuId] || [];
          const currentSubMenuPageOrder = pageOrderBySubMenu[subMenuId] || [];
          
          // 動的ページをPageConfigに変換
          const refreshPagesCallback = () => {
            // 何もしない（コンテキストのorderedConfigsを直接更新しているため）
          };
          
          const dynamicPageConfigs: PageConfig[] = (currentSubMenuPages || []).map((page: any) => ({
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
          
          // overviewの場合は固定ページも含める
          let allConfigs: PageConfig[];
          if (subMenuId === 'overview') {
            allConfigs = [...pageConfigs, ...dynamicPageConfigs];
          } else {
            allConfigs = dynamicPageConfigs;
          }
          
          // 保存された順序に基づいてページを並び替え
          let finalOrderedConfigs: PageConfig[];
          if (currentSubMenuPageOrder && currentSubMenuPageOrder.length > 0) {
              const ordered = currentSubMenuPageOrder
                .map((pageId: string) => allConfigs.find((config: PageConfig) => config.id === pageId))
                .filter((config: PageConfig | undefined): config is PageConfig => config !== undefined);
            
            const missingPages = allConfigs.filter(
              (config) => !currentSubMenuPageOrder.includes(config.id)
            );
            
            finalOrderedConfigs = [...ordered, ...missingPages];
          } else {
            finalOrderedConfigs = [...allConfigs].sort((a, b) => a.pageNumber - b.pageNumber);
          }
          
          // コンテキストのorderedConfigsを更新
          setOrderedConfigs(finalOrderedConfigs);
        }
      } catch (error) {
        console.error('ページ追加後のコンテキスト更新エラー:', error);
      }
    }
    // ページ順序管理UIも更新するために、一度閉じて再度開く
    if (showOrderManager) {
      setShowOrderManager(false);
      setTimeout(() => {
        setShowOrderManager(true);
      }, 100);
    }
  };

  const handlePageDeleted = () => {
    if (refreshPages) {
      refreshPages();
    }
    // ページ順序管理UIも更新するために、一度閉じて再度開く
    if (showOrderManager) {
      setShowOrderManager(false);
      setTimeout(() => {
        setShowOrderManager(true);
      }, 100);
    }
  };

  const handlePageUpdated = () => {
    if (refreshPages) {
      refreshPages();
    }
    // ページ順序管理UIも更新するために、一度閉じて再度開く
    if (showOrderManager) {
      setShowOrderManager(false);
      setTimeout(() => {
        setShowOrderManager(true);
      }, 100);
    }
  };

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください。');
      return;
    }

    handleLogoUpload(file);
  };

  const handleLogoUpload = async (file: File) => {
    if (!planId || !auth?.currentUser) {
      alert('認証が必要です。');
      return;
    }

    // Tauri環境ではFirebase Storageは使用できないため、エラーメッセージを表示
    alert('Tauri環境ではロゴのアップロード機能は使用できません。ローカルファイルシステムを使用してください。');
    setLogoUploading(false);
  };

  const handleLogoDelete = () => {
    if (!planId) return;
    setDeleteLogoConfirmModal(true);
  };

  const executeDeleteLogo = async () => {
    if (!planId) return;

    try {
      const planRef = doc(null, 'companyBusinessPlan', planId);
      await updateDoc(planRef, {
        keyVisualLogoUrl: null,
        updatedAt: getTimestamp()
      });

      // planを再読み込み
      if (reloadPlan) {
        await reloadPlan();
      }
      setShowLogoEditor(false);
      alert('ロゴを削除しました。');
    } catch (error) {
      console.error('ロゴ削除エラー:', error);
      alert(`ロゴの削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 現在のページコンポーネントを取得
  const currentPageConfig = orderedConfigs[currentPageIndex];
  const CurrentPageComponent = currentPageConfig?.component;

  if (planLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--color-text-light)', fontSize: '14px' }}>
          読み込み中...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ページ管理ボタン（プレゼンテーションモードでは非表示） */}
      {!isPresentationMode && (
        <>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => setShowAddPageForm(!showAddPageForm)}
              style={{
                padding: '8px 16px',
                backgroundColor: showAddPageForm ? '#F3F4F6' : '#10B981',
                color: showAddPageForm ? 'var(--color-text)' : '#fff',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {showAddPageForm ? '×' : '+'}
              <span>{showAddPageForm ? '閉じる' : 'ページを追加'}</span>
            </button>
            <button
              onClick={() => setShowOrderManager(!showOrderManager)}
              style={{
                padding: '8px 16px',
                backgroundColor: showOrderManager ? '#F3F4F6' : 'var(--color-primary)',
                color: showOrderManager ? 'var(--color-text)' : '#fff',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '180px',
                justifyContent: 'center',
              }}
            >
              {showOrderManager ? '×' : '⚙️'}
              <span>{showOrderManager ? '閉じる' : 'ページ順序を変更'}</span>
            </button>
            <button
              onClick={() => setShowLogoEditor(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#8B5CF6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              🖼️
              <span>PDFロゴ設定</span>
            </button>
          </div>

          {/* ページ追加フォーム */}
          {showAddPageForm && (
            <AddPageForm
              planId={planId}
              subMenuId={subMenuId}
              onClose={() => setShowAddPageForm(false)}
              onPageAdded={handlePageAdded}
            />
          )}

          {/* ページ順序管理UI */}
          {showOrderManager && (
            <div style={{ marginBottom: '32px', padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <PageOrderManager
                planId={planId}
                subMenuId={subMenuId}
                onOrderChange={handleOrderChange}
                onPageDeleted={handlePageDeleted}
                onPageUpdated={handlePageUpdated}
              />
            </div>
          )}

          {/* PDFロゴ設定モーダル */}
          {showLogoEditor && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setShowLogoEditor(false)}
            >
              <div onClick={(e) => e.stopPropagation()} style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px' }}>PDFロゴ設定</h3>
                
                {plan && (plan as any).keyVisualLogoUrl && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ marginBottom: '8px', fontSize: '14px' }}>現在のロゴ:</p>
                    <img 
                      src={(plan as any).keyVisualLogoUrl} 
                      alt="PDFロゴ" 
                      style={{ maxWidth: '200px', maxHeight: '100px', border: '1px solid #E5E7EB', borderRadius: '4px' }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                    新しいロゴをアップロード
                  </label>
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileSelect}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => logoFileInputRef.current?.click()}
                    disabled={logoUploading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: logoUploading ? '#94A3B8' : '#3B82F6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: logoUploading ? 'not-allowed' : 'pointer',
                      marginRight: '8px',
                    }}
                  >
                    {logoUploading ? 'アップロード中...' : 'ファイルを選択'}
                  </button>
                </div>

                {plan && (plan as any).keyVisualLogoUrl && (
                  <button
                    onClick={handleLogoDelete}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#EF4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      marginRight: '8px',
                    }}
                  >
                    ロゴを削除
                  </button>
                )}

                <button
                  onClick={() => setShowLogoEditor(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#F3F4F6',
                    color: 'var(--color-text)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  閉じる
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ページコンテンツ */}
      {isPresentationMode ? (
        // プレゼンテーションモードの場合は、現在のページのみ表示
        CurrentPageComponent ? (
          <CurrentPageComponent />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--color-text-light)', fontSize: '14px' }}>
              ページが読み込まれていません。
            </p>
          </div>
        )
      ) : (
        // 通常モードの場合は、すべてのページを表示（ページ番号付き）
        orderedConfigs.length > 0 ? (
          orderedConfigs.map((config, index) => {
            const PageComponent = config.component;
            return (
              <div 
                key={`${config.id}-${index}`}
                style={{
                  position: 'relative',
                }}
              >
                {/* ページ番号表示 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--color-text-light)',
                    zIndex: 10,
                    pointerEvents: 'none',
                  }}
                >
                  p.{String(index + 1).padStart(2, '0')}
                </div>
                <PageComponent />
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--color-text-light)', fontSize: '14px' }}>
              ページが読み込まれていません。
            </p>
          </div>
        )
      )}

      {/* ロゴ削除確認モーダル */}
      {deleteLogoConfirmModal && (
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
            zIndex: 10000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteLogoConfirmModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              削除の確認
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6B7280', lineHeight: '1.6' }}>
              ロゴを削除しますか？
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setDeleteLogoConfirmModal(false);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                キャンセル
              </button>
              <button
                onClick={async () => {
                  await executeDeleteLogo();
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#EF4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

