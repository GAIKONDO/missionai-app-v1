'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs, doc, updateDoc, getTimestamp } from '@/lib/localFirebase';
import { onAuthStateChanged, auth } from '@/lib/localFirebase';
import { pageConfigs, PageConfig } from './pageConfig';
import PageOrderManager from './PageOrderManager';
import { useComponentizedPage } from './ComponentizedPageContext';
import { usePresentationMode } from '@/components/PresentationModeContext';
// テンプレートアプリでは、useConceptは存在しないため、デフォルトの実装を使用
// 必要に応じて、後で追加できます
const useConcept = (serviceId?: string, conceptId?: string) => ({ concept: null, loading: false, error: null, reloadConcept: () => {} });
import AddPageForm from './AddPageForm';
import { pageAutoUpdateConfigs, PageAutoUpdateConfig } from './pageAutoUpdateConfig';
import dynamic from 'next/dynamic';
import './pageStyles.css';

const Page0 = dynamic(() => import('./Page0'), { ssr: false });

export default function ComponentizedOverview() {
  const params = useParams();
  const serviceId = params?.serviceId as string | undefined;
  const conceptId = params?.conceptId as string | undefined;
  const { isPresentationMode } = usePresentationMode();
  const { orderedConfigs, currentPageIndex, totalPages, setCurrentPageIndex, refreshPages, subMenuId } = useComponentizedPage();
  const { concept, reloadConcept } = useConcept();
  const [showOrderManager, setShowOrderManager] = useState(false);
  const [showAddPageForm, setShowAddPageForm] = useState(false);
  const [showLogoEditor, setShowLogoEditor] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [deleteLogoConfirmModal, setDeleteLogoConfirmModal] = useState(false);

  // すべてのHooksを早期リターンの前に呼び出す（React Hooksのルール）
  // すべてのページコンポーネントの自動更新機能（設定ファイルベース）
  useEffect(() => {
    const autoUpdatePages = async () => {
      if (!serviceId || !conceptId) {
        return;
      }

      if (!auth?.currentUser) {
        return;
      }

      // 現在のserviceId/conceptId/subMenuIdに該当する設定をフィルタリング
      const relevantConfigs = pageAutoUpdateConfigs.filter(config => {
        if (config.serviceId && config.serviceId !== serviceId) {
          return false;
        }
        if (config.conceptId && config.conceptId !== conceptId) {
          return false;
        }
        if (config.subMenuId && config.subMenuId !== subMenuId) {
          return false;
        }
        return true;
      });

      // 各設定をチェックして、自動更新が必要な場合は実行
      for (const config of relevantConfigs) {
        const pageConfig = orderedConfigs.find(c => c.id === config.pageId);
        if (pageConfig && config.shouldUpdate && typeof config.shouldUpdate === 'function' && (config.shouldUpdate as any)(concept)) {
          // 自動更新が必要な場合は、ページを再読み込み
          if (refreshPages) {
            refreshPages();
          }
        }
      }
    };

    autoUpdatePages();
  }, [serviceId, conceptId, subMenuId, orderedConfigs, concept, refreshPages]);

  // serviceIdまたはconceptIdが存在しない場合はエラーを表示
  if (!serviceId || !conceptId) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--color-text-light)', fontSize: '14px' }}>
          ページ情報が正しく読み込まれていません。
        </p>
      </div>
    );
  }

  const handleOrderChange = (newOrder: PageConfig[]) => {
    // ComponentizedPageContextで管理されているため、ここでは何もしない
    console.log('ページ順序が変更されました:', newOrder.map(c => c.id));
  };

  const handlePageAdded = () => {
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
    if (!auth?.currentUser || !serviceId || !conceptId) {
      alert('認証が必要です。');
      return;
    }
    // Tauri環境ではFirebase Storageは使用できないため、エラーメッセージを表示
    alert('Tauri環境ではロゴのアップロード機能は使用できません。ローカルファイルシステムを使用してください。');
    setLogoUploading(false);
  };

  const handleLogoDelete = () => {
    if (!conceptId) return;
    setDeleteLogoConfirmModal(true);
  };

  const executeDeleteLogo = async () => {
    if (!conceptId) return;

    try {
      const conceptRef = doc(null, 'concepts', conceptId);
      await updateDoc(conceptRef, {
        keyVisualLogoUrl: null,
        updatedAt: getTimestamp()
      });

      await reloadConcept();
      setShowLogoEditor(false);
      alert('ロゴを削除しました。');
    } catch (error) {
      console.error('ロゴ削除エラー:', error);
      alert(`ロゴの削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

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
                minWidth: '180px', // 「ページ順序を変更」のテキスト幅に合わせる
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
              serviceId={serviceId}
              conceptId={conceptId}
              subMenuId={subMenuId}
              onClose={() => setShowAddPageForm(false)}
              onPageAdded={handlePageAdded}
            />
          )}

          {/* ページ順序管理UI */}
          {showOrderManager && (
            <div style={{ marginBottom: '32px', padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <PageOrderManager
                serviceId={serviceId}
                conceptId={conceptId}
                subMenuId={subMenuId}
                onOrderChange={handleOrderChange}
                onPageDeleted={handlePageDeleted}
                onPageUpdated={handlePageUpdated}
              />
            </div>
          )}

          {/* PDFロゴ設定モーダル */}
          {showLogoEditor && (
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
                  setShowLogoEditor(false);
                }
              }}
            >
              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  padding: '24px',
                  maxWidth: '500px',
                  width: '90%',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', fontWeight: 600 }}>
                  PDFロゴ設定
                </h2>

                {concept && (concept as any).keyVisualLogoUrl && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>現在のロゴ:</p>
                    <img
                      src={(concept as any).keyVisualLogoUrl}
                      alt="現在のロゴ"
                      style={{
                        maxWidth: '200px',
                        maxHeight: '100px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
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
                      padding: '10px 20px',
                      backgroundColor: logoUploading ? '#9CA3AF' : 'var(--color-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: logoUploading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      width: '100%',
                      marginBottom: '12px',
                    }}
                  >
                    {logoUploading ? 'アップロード中...' : (concept && (concept as any).keyVisualLogoUrl) ? 'ロゴを変更' : 'ロゴをアップロード'}
                  </button>
                </div>

                {concept && (concept as any).keyVisualLogoUrl && (
                  <button
                    onClick={handleLogoDelete}
                    disabled={logoUploading}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: logoUploading ? '#9CA3AF' : '#EF4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: logoUploading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      width: '100%',
                      marginBottom: '12px',
                    }}
                  >
                    ロゴを削除
                  </button>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowLogoEditor(false)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ページコンポーネントの表示 */}
      {orderedConfigs.length > 0 ? (
        isPresentationMode ? (
          // プレゼンテーションモードの場合は、現在のページのみを表示
          (() => {
            const currentConfig = orderedConfigs[currentPageIndex];
            if (!currentConfig) return null;
            const PageComponent = currentConfig.component;
            return (
              <div 
                key={`${currentConfig.id}-${currentPageIndex}`}
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
                  p.{String(currentPageIndex + 1).padStart(2, '0')}
                </div>
                <PageComponent />
              </div>
            );
          })()
        ) : (
          // 通常モードの場合は、すべてのページを表示（ページ番号付き）
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
        )
      ) : (
        // orderedConfigsが空の場合は、Page0を表示（フォールバック）
        <div style={{ position: 'relative' }}>
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
            p.01
          </div>
          <Page0 />
        </div>
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

