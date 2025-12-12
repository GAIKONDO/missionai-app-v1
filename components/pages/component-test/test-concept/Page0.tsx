'use client';

import { useState, useEffect, useRef, useContext, createContext, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, updateDoc, serverTimestamp, getFirestore } from '@/lib/localFirebase';
import { ref, uploadBytes, getDownloadURL, auth, getStorage } from '@/lib/localFirebase';
import KeyVisualPDFMetadataEditor from '@/components/KeyVisualPDFMetadataEditor';

// デフォルトのコンテキスト（コンテキストが存在しない場合に使用）
const DefaultContainerVisibilityContext = createContext<{ showContainers: boolean } | undefined>(undefined);
const DefaultConceptContext = createContext<{ concept: any; reloadConcept: () => Promise<void> } | undefined>(undefined);
const DefaultPlanContext = createContext<{ plan: any; reloadPlan: () => Promise<void> } | undefined>(undefined);

// オプショナルなコンテキストをモジュールレベルでインポート
let ContainerVisibilityContext: any = DefaultContainerVisibilityContext;
let ConceptContext: any = DefaultConceptContext;
let PlanContext: any = DefaultPlanContext;

try {
  const serviceLayout = require('@/app/business-plan/services/[serviceId]/[conceptId]/layout');
  ConceptContext = serviceLayout.ConceptContext || DefaultConceptContext;
  ContainerVisibilityContext = serviceLayout.ContainerVisibilityContext || DefaultContainerVisibilityContext;
} catch {
  // インポートに失敗した場合はデフォルトコンテキストを使用
}

try {
  // ConceptContextを直接インポート
  const conceptHook = require('@/app/business-plan/services/[serviceId]/[conceptId]/hooks/useConcept');
  ConceptContext = conceptHook.ConceptContext || ConceptContext;
} catch {
  // インポートに失敗した場合は既存のConceptContextを使用
}

try {
  // PlanContextを直接インポート
  const planHook = require('@/app/business-plan/company/[planId]/hooks/usePlan');
  PlanContext = planHook.PlanContext || DefaultPlanContext;
  
  // ContainerVisibilityContextもlayoutから取得を試みる
  try {
    const companyLayout = require('@/app/business-plan/company/[planId]/layout');
    if (ContainerVisibilityContext === DefaultContainerVisibilityContext) {
      ContainerVisibilityContext = companyLayout.ContainerVisibilityContext || DefaultContainerVisibilityContext;
    }
  } catch {
    // ContainerVisibilityContextの取得に失敗しても続行
  }
} catch {
  // インポートに失敗した場合はデフォルトコンテキストを使用
}

export default function Page0() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.serviceId as string | undefined;
  const conceptId = params.conceptId as string | undefined;
  const planId = params.planId as string | undefined;
  
  // React Hooksのルールに準拠するため、すべてのHooksを常に呼び出す
  const containerVisibilityValue = useContext(ContainerVisibilityContext);
  const conceptValue = useContext(ConceptContext);
  const planValue = useContext(PlanContext);
  
  // useContainerVisibilityはオプショナル（コンテキストが存在しない場合があるため）
  const showContainers = (containerVisibilityValue as { showContainers?: boolean } | undefined)?.showContainers ?? false;
  
  // useConceptもオプショナル
  // 会社本体の事業計画の場合はusePlanを使用
  // useMemoを使ってconceptオブジェクトをメモ化し、planValue.planの変更を監視
  const concept = useMemo(() => {
    const typedConceptValue = conceptValue as { concept?: any; reloadConcept?: () => Promise<void> } | undefined;
    const typedPlanValue = planValue as { plan?: any; reloadPlan?: () => Promise<void> } | undefined;
    if (serviceId && conceptId && typedConceptValue) {
      return typedConceptValue.concept;
    } else if (planId && typedPlanValue?.plan) {
      // 会社本体の事業計画の場合
      // planをconcept形式に変換
      return {
        id: typedPlanValue.plan.id,
        keyVisualUrl: typedPlanValue.plan.keyVisualUrl || '',
        keyVisualHeight: typedPlanValue.plan.keyVisualHeight || 56.25,
        keyVisualScale: typedPlanValue.plan.keyVisualScale || 100,
        keyVisualLogoUrl: typedPlanValue.plan.keyVisualLogoUrl || null,
        keyVisualLogoSize: typedPlanValue.plan.keyVisualLogoSize || 15,
        keyVisualMetadata: typedPlanValue.plan.keyVisualMetadata || undefined,
        titlePositionX: typedPlanValue.plan.titlePositionX || 5,
        titlePositionY: typedPlanValue.plan.titlePositionY || -3,
        titleFontSize: typedPlanValue.plan.titleFontSize || 12,
        titleBorderEnabled: typedPlanValue.plan.titleBorderEnabled !== undefined ? typedPlanValue.plan.titleBorderEnabled : true,
        footerText: typedPlanValue.plan.footerText || 'AI assistant company, Inc - All Rights Reserved',
      };
    }
    return null;
  }, [serviceId, conceptId, conceptValue, planId, planValue]);
  
  const reloadConcept = useMemo(() => {
    const typedConceptValue = conceptValue as { concept?: any; reloadConcept?: () => Promise<void> } | undefined;
    const typedPlanValue = planValue as { plan?: any; reloadPlan?: () => Promise<void> } | undefined;
    if (serviceId && conceptId && typedConceptValue) {
      return typedConceptValue.reloadConcept;
    } else if (planId && typedPlanValue) {
      return async () => {
        // planの再読み込みを実行
        if (typedPlanValue?.reloadPlan) {
          await typedPlanValue.reloadPlan();
        }
      };
    }
    return undefined;
  }, [serviceId, conceptId, conceptValue, planId, planValue]);
  
  // デバッグ: planValueとconceptの状態を確認
  useEffect(() => {
    console.log('Page0: planId:', planId);
    const typedPlanValue = planValue as { plan?: any; reloadPlan?: () => Promise<void> } | undefined;
    console.log('Page0: planValue:', planValue);
    console.log('Page0: planValue?.plan:', typedPlanValue?.plan);
    console.log('Page0: planValue?.plan?.keyVisualUrl:', typedPlanValue?.plan?.keyVisualUrl);
    console.log('Page0: concept:', concept);
    console.log('Page0: concept?.keyVisualUrl:', concept?.keyVisualUrl);
  }, [planId, planValue, concept]);
  
  const imgRef = useRef<HTMLImageElement>(null);

  const keyVisualUrl = concept?.keyVisualUrl || '';
  const [keyVisualHeight, setKeyVisualHeight] = useState<number>(56.25);
  const [keyVisualScale, setKeyVisualScale] = useState<number>(100); // スケール（%）
  const [originalAspectRatio, setOriginalAspectRatio] = useState<number | null>(null);
  const [showSizeControl, setShowSizeControl] = useState(false);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [showLogoEditor, setShowLogoEditor] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoSize, setLogoSize] = useState<number>(15); // ロゴの高さ（mm）- デフォルト15mm
  const [showTitleEditor, setShowTitleEditor] = useState(false);
  const [titlePositionX, setTitlePositionX] = useState<number>(5); // タイトルのX位置（mm）- デフォルト5mm
  const [titlePositionY, setTitlePositionY] = useState<number>(-3); // タイトルのY位置（mm）- デフォルト-3mm
  const [titleFontSize, setTitleFontSize] = useState<number>(12); // タイトルのフォントサイズ（px）- デフォルト12px
  const [titleBorderEnabled, setTitleBorderEnabled] = useState<boolean>(true); // タイトルのボーダー（縦棒）の有無 - デフォルト有り
  const [footerText, setFooterText] = useState<string>('AI assistant company, Inc - All Rights Reserved'); // フッターテキスト - デフォルト値
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [deleteLogoConfirmModal, setDeleteLogoConfirmModal] = useState(false);

  useEffect(() => {
    console.log('Page0: conceptが変更されました:', concept);
    console.log('Page0: keyVisualUrl:', concept?.keyVisualUrl);
    if (concept?.keyVisualHeight !== undefined) {
      setKeyVisualHeight(concept.keyVisualHeight);
    }
    // スケール値も読み込む（存在する場合）
    if (concept?.keyVisualScale !== undefined) {
      setKeyVisualScale(concept.keyVisualScale);
    }
    // ロゴサイズを読み込む（存在する場合）
    if (concept?.keyVisualLogoSize !== undefined) {
      setLogoSize(concept.keyVisualLogoSize);
    }
    // タイトル設定を読み込む（存在する場合）
    if (concept?.titlePositionX !== undefined) {
      setTitlePositionX(concept.titlePositionX);
    }
    if (concept?.titlePositionY !== undefined) {
      setTitlePositionY(concept.titlePositionY);
    }
    if (concept?.titleFontSize !== undefined) {
      setTitleFontSize(concept.titleFontSize);
    }
    if (concept?.titleBorderEnabled !== undefined) {
      setTitleBorderEnabled(concept.titleBorderEnabled);
    }
    // フッターテキストを読み込む（存在する場合）
    if (concept?.footerText !== undefined) {
      setFooterText(concept.footerText);
    }
  }, [concept?.keyVisualHeight, concept?.keyVisualScale, concept?.keyVisualUrl, concept?.keyVisualLogoSize, concept?.titlePositionX, concept?.titlePositionY, concept?.titleFontSize, concept?.titleBorderEnabled, concept?.footerText]);

  // メタデータはconceptから直接取得（ローカル状態ではなく）
  const keyVisualMetadata = concept?.keyVisualMetadata || null;
  
  // デバッグ: keyVisualMetadataの状態を確認
  useEffect(() => {
    console.log('Page0: concept?.keyVisualMetadata:', concept?.keyVisualMetadata);
    console.log('Page0: keyVisualMetadata:', keyVisualMetadata);
  }, [concept?.keyVisualMetadata, keyVisualMetadata]);

  // 画像が読み込まれたときにアスペクト比を取得
  useEffect(() => {
    if (keyVisualUrl && imgRef.current) {
      const img = imgRef.current;
      const checkAspectRatio = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          setOriginalAspectRatio(aspectRatio);
        }
      };
      
      if (img.complete) {
        checkAspectRatio();
      } else {
        img.onload = checkAspectRatio;
        img.onerror = () => {
          // エラー時はデフォルトのアスペクト比を使用
          setOriginalAspectRatio(16 / 9);
        };
      }
    } else {
      setOriginalAspectRatio(null);
    }
  }, [keyVisualUrl]);

  const handleScaleChange = (newScale: number) => {
    setKeyVisualScale(newScale);
  };

  const handleSaveKeyVisualScale = async (newScale: number) => {
    const db = getFirestore();
    if (!concept?.id || !db) return;
    
    try {
      // 事業企画の場合はconceptsコレクション、会社本体の事業計画の場合はcompanyBusinessPlanコレクション
      if (serviceId && conceptId) {
        const conceptRef = doc(null, 'concepts', concept.id);
        await updateDoc(conceptRef, { 
          keyVisualScale: newScale,
          updatedAt: serverTimestamp() 
        });
      } else if (planId) {
        const planRef = doc(null, 'companyBusinessPlan', planId);
        await updateDoc(planRef, { 
          keyVisualScale: newScale,
          updatedAt: serverTimestamp() 
        });
      }
      setKeyVisualScale(newScale);
      if (reloadConcept) {
        await reloadConcept();
      }
    } catch (error) {
      console.error('キービジュアルのスケール保存エラー:', error);
    }
  };

  const handleSaveKeyVisualHeight = async (newHeight: number) => {
    const db = getFirestore();
    if (!concept?.id || !db) return;
    
    try {
      // 事業企画の場合はconceptsコレクション、会社本体の事業計画の場合はcompanyBusinessPlanコレクション
      if (serviceId && conceptId) {
        const conceptRef = doc(null, 'concepts', concept.id);
        await updateDoc(conceptRef, { 
          keyVisualHeight: newHeight,
          updatedAt: serverTimestamp() 
        });
      } else if (planId) {
        const planRef = doc(null, 'companyBusinessPlan', planId);
        await updateDoc(planRef, { 
          keyVisualHeight: newHeight,
          updatedAt: serverTimestamp() 
        });
      }
      
      if (reloadConcept) {
        await reloadConcept();
      }
    } catch (error) {
      console.error('キービジュアルの高さ保存エラー:', error);
    }
  };

  const handleImageChange = () => {
    if (serviceId && conceptId) {
      router.push(`/business-plan/services/${serviceId}/${conceptId}/overview/upload-key-visual`);
    } else if (planId) {
      // 会社本体の事業計画の場合もアップロードページに遷移
      router.push(`/business-plan/company/${planId}/overview/upload-key-visual`);
    }
  };

  const handleMetadataSave = async (metadata: {
    title: string;
    signature: string;
    date: string;
    position: { x: number; y: number; align: 'left' | 'center' | 'right' };
    titleFontSize?: number;
    signatureFontSize?: number;
    dateFontSize?: number;
  }) => {
    const db = getFirestore();
    if (!concept?.id || !db) return;
    
    try {
      console.log('メタデータを保存します:', metadata);
      // 事業企画の場合はconceptsコレクション、会社本体の事業計画の場合はcompanyBusinessPlanコレクション
      if (serviceId && conceptId) {
        const conceptRef = doc(null, 'concepts', concept.id);
        await updateDoc(conceptRef, {
          keyVisualMetadata: metadata,
          updatedAt: serverTimestamp()
        });
      } else if (planId) {
        const planRef = doc(null, 'companyBusinessPlan', planId);
        await updateDoc(planRef, {
          keyVisualMetadata: metadata,
          updatedAt: serverTimestamp()
        });
      }
      console.log('Firestoreへの保存が完了しました');
      // Firestoreに保存後、conceptを再読み込み
      setShowMetadataEditor(false);
      if (reloadConcept) {
        await reloadConcept();
      }
      console.log('conceptの再読み込みが完了しました。keyVisualMetadata:', concept?.keyVisualMetadata);
    } catch (error) {
      console.error('キービジュアルメタデータの保存エラー:', error);
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
    const db = getFirestore();
    const storage = getStorage();
    if (!concept?.id || !storage || !auth?.currentUser || !db) {
      alert('Firebaseが初期化されていません。');
      return;
    }

    setLogoUploading(true);
    try {
      // Firebase Storageにアップロード
      let storageRef;
      if (serviceId && conceptId) {
        storageRef = ref(storage, `concepts/${serviceId}/${conceptId}/logo.png`);
      } else if (planId) {
        storageRef = ref(storage, `companyBusinessPlan/${planId}/logo.png`);
      } else {
        throw new Error('必要な情報が不足しています。');
      }
      
      await uploadBytes(storageRef, file);
      
      // ダウンロードURLを取得
      const downloadURL = await getDownloadURL(storageRef);

      // Firestoreに保存
      if (serviceId && conceptId) {
        const conceptRef = doc(null, 'concepts', concept.id);
        await updateDoc(conceptRef, {
          keyVisualLogoUrl: downloadURL,
          updatedAt: serverTimestamp()
        });
      } else if (planId) {
        const planRef = doc(null, 'companyBusinessPlan', planId);
        await updateDoc(planRef, {
          keyVisualLogoUrl: downloadURL,
          updatedAt: serverTimestamp()
        });
      }

      // conceptを再読み込み
      if (reloadConcept) {
        await reloadConcept();
      }
      setShowLogoEditor(false);
      alert('ロゴのアップロードが完了しました。');
    } catch (error) {
      console.error('ロゴアップロードエラー:', error);
      alert(`ロゴのアップロードに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoDelete = () => {
    const db = getFirestore();
    if (!concept?.id || !db) return;
    setDeleteLogoConfirmModal(true);
  };

  const executeDeleteLogo = async () => {
    const db = getFirestore();
    if (!concept?.id || !db) return;

    try {
      // 事業企画の場合はconceptsコレクション、会社本体の事業計画の場合はcompanyBusinessPlanコレクション
      if (serviceId && conceptId) {
        const conceptRef = doc(null, 'concepts', concept.id);
        await updateDoc(conceptRef, {
          keyVisualLogoUrl: null,
          updatedAt: serverTimestamp()
        });
      } else if (planId) {
        const planRef = doc(null, 'companyBusinessPlan', planId);
        await updateDoc(planRef, {
          keyVisualLogoUrl: null,
          updatedAt: serverTimestamp()
        });
      }

      if (reloadConcept) {
        await reloadConcept();
      }
      setShowLogoEditor(false);
      alert('ロゴを削除しました。');
    } catch (error) {
      console.error('ロゴ削除エラー:', error);
      alert(`ロゴの削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSaveLogoSize = async (newSize: number) => {
    const db = getFirestore();
    if (!concept?.id || !db) return;
    
    try {
      // 事業企画の場合はconceptsコレクション、会社本体の事業計画の場合はcompanyBusinessPlanコレクション
      if (serviceId && conceptId) {
        const conceptRef = doc(null, 'concepts', concept.id);
        await updateDoc(conceptRef, { 
          keyVisualLogoSize: newSize,
          updatedAt: serverTimestamp() 
        });
      } else if (planId) {
        const planRef = doc(null, 'companyBusinessPlan', planId);
        await updateDoc(planRef, { 
          keyVisualLogoSize: newSize,
          updatedAt: serverTimestamp() 
        });
      }
      setLogoSize(newSize);
      if (reloadConcept) {
        await reloadConcept();
      }
    } catch (error) {
      console.error('ロゴサイズの保存エラー:', error);
    }
  };

  const handleSaveTitleSettings = async (x: number, y: number, fontSize: number, borderEnabled: boolean) => {
    const db = getFirestore();
    if (!concept?.id || !db) return;
    
    try {
      // 事業企画の場合はconceptsコレクション、会社本体の事業計画の場合はcompanyBusinessPlanコレクション
      if (serviceId && conceptId) {
        const conceptRef = doc(null, 'concepts', concept.id);
        await updateDoc(conceptRef, {
          titlePositionX: x,
          titlePositionY: y,
          titleFontSize: fontSize,
          titleBorderEnabled: borderEnabled,
          updatedAt: serverTimestamp()
        });
      } else if (planId) {
        const planRef = doc(null, 'companyBusinessPlan', planId);
        await updateDoc(planRef, {
          titlePositionX: x,
          titlePositionY: y,
          titleFontSize: fontSize,
          titleBorderEnabled: borderEnabled,
          updatedAt: serverTimestamp()
        });
      }
      setTitlePositionX(x);
      setTitlePositionY(y);
      setTitleFontSize(fontSize);
      setTitleBorderEnabled(borderEnabled);
      if (reloadConcept) {
        await reloadConcept();
      }
    } catch (error) {
      console.error('タイトル設定の保存エラー:', error);
    }
  };

  const handleSaveFooterText = async (text: string) => {
    const db = getFirestore();
    if (!concept?.id || !db) return;
    
    try {
      // 事業企画の場合はconceptsコレクション、会社本体の事業計画の場合はcompanyBusinessPlanコレクション
      if (serviceId && conceptId) {
        const conceptRef = doc(null, 'concepts', concept.id);
        await updateDoc(conceptRef, {
          footerText: text,
          updatedAt: serverTimestamp()
        });
      } else if (planId) {
        const planRef = doc(null, 'companyBusinessPlan', planId);
        await updateDoc(planRef, {
          footerText: text,
          updatedAt: serverTimestamp()
        });
      }
      setFooterText(text);
      if (reloadConcept) {
        await reloadConcept();
      }
    } catch (error) {
      console.error('フッターテキストの保存エラー:', error);
    }
  };

  // スケールに基づいてコンテナの高さを計算（縦横比を維持）
  // 元のアスペクト比が取得できている場合は、それを使用して高さを計算
  const displayAspectRatio = originalAspectRatio || 16 / 9; // デフォルトは16:9
  // 基準の高さ（keyVisualHeight）にスケールを適用して、コンテナの高さを調整
  const calculatedHeight = keyVisualHeight * (keyVisualScale / 100);

  return (
    <div
      data-page-container="0"
      style={{
        marginBottom: '32px',
        position: 'relative',
        ...(showContainers ? {
          border: '4px dashed #000000',
          borderRadius: '8px',
          padding: '16px',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          backgroundColor: 'transparent',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
        } : {}),
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingBottom: `${calculatedHeight}%`,
          backgroundColor: keyVisualUrl ? 'transparent' : '#f0f0f0',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-light)',
          fontSize: '14px',
        }}
      >
        {keyVisualUrl ? (
          <>
            <img
              ref={imgRef}
              src={keyVisualUrl}
              alt="Key Visual"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) scale(${keyVisualScale / 100})`,
                width: `${100 / displayAspectRatio}%`,
                height: '100%',
                objectFit: 'contain',
                maxWidth: 'none',
                maxHeight: 'none',
              }}
            />
            {/* タイトル、署名、作成日を表示 */}
            {keyVisualMetadata && (keyVisualMetadata.title || keyVisualMetadata.signature || keyVisualMetadata.date) && (
              <div
                data-key-visual-metadata="true"
                style={{
                  position: 'absolute',
                  right: `${((254 - keyVisualMetadata.position.x) / 254) * 100}%`,
                  bottom: `${((143 - keyVisualMetadata.position.y) / 143) * 100}%`,
                  textAlign: keyVisualMetadata.position.align,
                  color: '#666',
                  lineHeight: '1.5',
                  zIndex: 5,
                  pointerEvents: 'none',
                }}
              >
                {keyVisualMetadata.title && (
                  <div style={{ fontSize: `${(keyVisualMetadata.titleFontSize || 6) * 1.33}px` }}>
                    {keyVisualMetadata.title}
                  </div>
                )}
                {keyVisualMetadata.signature && (
                  <div style={{ fontSize: `${(keyVisualMetadata.signatureFontSize || 6) * 1.33}px` }}>
                    {keyVisualMetadata.signature}
                  </div>
                )}
                {keyVisualMetadata.date && (
                  <div style={{ fontSize: `${(keyVisualMetadata.dateFontSize || 6) * 1.33}px` }}>
                    {keyVisualMetadata.date}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            キービジュアルが設定されていません
          </div>
        )}
      </div>
      
      {/* コントロールボタン（固定ページ形式と同じ仕様） */}
      {keyVisualUrl && auth?.currentUser && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowSizeControl(!showSizeControl)}
            style={{
              padding: '6px 12px',
              backgroundColor: showSizeControl ? 'var(--color-primary)' : '#f3f4f6',
              color: showSizeControl ? '#fff' : 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            サイズ調整
          </button>
          <button
            onClick={() => setShowMetadataEditor(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f3f4f6',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            メタデータ編集
          </button>
          <button
            onClick={handleImageChange}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f3f4f6',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            画像変更
          </button>
          <button
            onClick={() => setShowLogoEditor(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f3f4f6',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            ロゴ設定
          </button>
          <button
            onClick={() => setShowTitleEditor(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f3f4f6',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            タイトル設定
          </button>
        </div>
      )}

      {/* サイズ調整コントロール */}
      {showSizeControl && keyVisualUrl && (
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
              高さ: {keyVisualHeight.toFixed(2)}%
            </label>
            <input
              type="range"
              min="20"
              max="100"
              step="0.1"
              value={keyVisualHeight}
              onChange={(e) => {
                const newHeight = parseFloat(e.target.value);
                setKeyVisualHeight(newHeight);
                handleSaveKeyVisualHeight(newHeight);
              }}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
              スケール: {keyVisualScale}%
            </label>
            <input
              type="range"
              min="50"
              max="150"
              step="1"
              value={keyVisualScale}
              onChange={(e) => {
                const newScale = parseInt(e.target.value);
                setKeyVisualScale(newScale);
                handleSaveKeyVisualScale(newScale);
              }}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}
      
      {/* PDFメタデータ編集モーダル */}
      {showMetadataEditor && (
        <KeyVisualPDFMetadataEditor
          isOpen={showMetadataEditor}
          onClose={() => setShowMetadataEditor(false)}
          onSave={handleMetadataSave}
          initialMetadata={keyVisualMetadata || undefined}
          pageWidth={254}
          pageHeight={143}
        />
      )}

      {/* ロゴ設定エディタ */}
      {showLogoEditor && (
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>ロゴ設定</h4>
            {concept?.keyVisualLogoUrl && (
              <div style={{ marginBottom: '12px' }}>
                <img
                  src={concept.keyVisualLogoUrl}
                  alt="現在のロゴ"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '100px',
                    objectFit: 'contain',
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '4px',
                    padding: '8px',
                    backgroundColor: '#fff',
                  }}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <label
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: logoUploading ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  opacity: logoUploading ? 0.6 : 1,
                }}
              >
                {logoUploading ? 'アップロード中...' : 'ロゴを選択'}
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileSelect}
                  disabled={logoUploading}
                  style={{ display: 'none' }}
                />
              </label>
              {concept?.keyVisualLogoUrl && (
                <button
                  onClick={handleLogoDelete}
                  disabled={logoUploading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: logoUploading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    opacity: logoUploading ? 0.6 : 1,
                  }}
                >
                  ロゴを削除
                </button>
              )}
              <button
                onClick={() => setShowLogoEditor(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                閉じる
              </button>
            </div>
            {concept?.keyVisualLogoUrl && (
              <div style={{ marginTop: '16px', marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
                  PDF表示サイズ（高さ）: {logoSize.toFixed(1)}mm
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="0.5"
                  value={logoSize}
                  onChange={(e) => {
                    const newSize = parseFloat(e.target.value);
                    setLogoSize(newSize);
                    handleSaveLogoSize(newSize);
                  }}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>
                  <span>5mm</span>
                  <span>30mm</span>
                </div>
              </div>
            )}
            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-light)' }}>
              PDF出力時に各ページの右上にロゴが表示されます。
            </p>
          </div>
        </div>
      )}

      {/* タイトル設定エディタ */}
      {showTitleEditor && (
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>タイトル設定</h4>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
                X位置（左からの距離）: {titlePositionX.toFixed(1)}mm
              </label>
              <input
                type="range"
                min="-10"
                max="100"
                step="0.5"
                value={titlePositionX}
                onChange={(e) => {
                  const newX = parseFloat(e.target.value);
                  setTitlePositionX(newX);
                  handleSaveTitleSettings(newX, titlePositionY, titleFontSize, titleBorderEnabled);
                }}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>
                <span>-10mm</span>
                <span>100mm</span>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
                Y位置（上からの距離）: {titlePositionY.toFixed(1)}mm
              </label>
              <input
                type="range"
                min="-20"
                max="50"
                step="0.5"
                value={titlePositionY}
                onChange={(e) => {
                  const newY = parseFloat(e.target.value);
                  setTitlePositionY(newY);
                  handleSaveTitleSettings(titlePositionX, newY, titleFontSize, titleBorderEnabled);
                }}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>
                <span>-20mm</span>
                <span>50mm</span>
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
                フォントサイズ: {titleFontSize}px
              </label>
              <input
                type="range"
                min="8"
                max="24"
                step="1"
                value={titleFontSize}
                onChange={(e) => {
                  const newFontSize = parseInt(e.target.value);
                  setTitleFontSize(newFontSize);
                  handleSaveTitleSettings(titlePositionX, titlePositionY, newFontSize, titleBorderEnabled);
                }}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>
                <span>8px</span>
                <span>24px</span>
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={titleBorderEnabled}
                  onChange={(e) => {
                    const newBorderEnabled = e.target.checked;
                    setTitleBorderEnabled(newBorderEnabled);
                    handleSaveTitleSettings(titlePositionX, titlePositionY, titleFontSize, newBorderEnabled);
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                ボーダー（縦棒）を表示
              </label>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
                フッターテキスト（ページ下部）
              </label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => {
                  const newText = e.target.value;
                  setFooterText(newText);
                }}
                onBlur={() => {
                  handleSaveFooterText(footerText);
                }}
                placeholder="AI assistant company, Inc - All Rights Reserved"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                }}
              />
              <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-text-light)' }}>
                PDF出力時に各ページの下部中央に表示されます。
              </p>
            </div>
            <button
              onClick={() => setShowTitleEditor(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              閉じる
            </button>
            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-light)' }}>
              PDF出力時に各ページの左上にタイトルが表示されます。
            </p>
          </div>
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

