'use client';

import { useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp } from '@/lib/localFirebase';
import { auth } from '@/lib/localFirebase';
import dynamic from 'next/dynamic';
import { generatePageMetadata } from '@/lib/pageMetadataUtils';
import { PageMetadata } from '@/types/pageMetadata';
import { savePageEmbeddingAsync } from '@/lib/pageEmbeddings';
import { savePageStructureAsync } from '@/lib/pageStructure';

// Monaco Editorを動的インポート（SSRを回避）
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { 
  ssr: false,
  loading: () => (
    <div style={{ 
      height: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid var(--color-border-color)',
      borderRadius: '6px',
      backgroundColor: '#f9fafb',
      color: 'var(--color-text-light)',
    }}>
      エディターを読み込み中...
    </div>
  ),
});

interface AddPageFormProps {
  serviceId?: string;
  conceptId?: string;
  planId?: string; // 会社本体の事業計画用
  subMenuId: string;
  onClose: () => void;
  onPageAdded: () => void;
}

export default function AddPageForm({ serviceId, conceptId, planId, subMenuId, onClose, onPageAdded }: AddPageFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  
  // 会社本体の事業計画かどうかを判定
  const isCompanyPlan = !!planId && !serviceId && !conceptId;

  const handleCompanyPlanAddPage = async (planId: string) => {
    if (!auth?.currentUser) return;
    
    try {
      // 事業計画ドキュメントを取得
      const planDoc = await getDoc(doc(null, 'companyBusinessPlan', planId));
      
      if (!planDoc.exists()) {
        alert('事業計画が見つかりませんでした。');
        setSaving(false);
        return;
      }

      const planData = planDoc.data();
      
      // サブメニューごとのページデータを取得
      const pagesBySubMenu = planData.pagesBySubMenu as { [key: string]: Array<PageMetadata> } | undefined || {};
      
      const pageOrderBySubMenu = planData.pageOrderBySubMenu as { [key: string]: string[] } | undefined || {};
      
      // 現在のサブメニューのページデータを取得
      const currentSubMenuPages = pagesBySubMenu[subMenuId] || [];
      
      // 新しいページIDを生成
      const newPageId = `page-${Date.now()}`;
      const pageNumber = currentSubMenuPages.length;
      
      // 基本ページデータを作成
      const basePage = {
        id: newPageId,
        pageNumber: pageNumber,
        title: title.trim(),
        content: content.trim() || '<p>コンテンツを入力してください。</p>',
        createdAt: new Date().toISOString(),
      };
      
      // メタデータを自動生成
      const totalPages = Object.values(pagesBySubMenu).reduce((sum, pages) => sum + pages.length, 0) + 1;
      const newPage = generatePageMetadata(basePage, subMenuId, totalPages);
      
      // メタデータをコンソールに出力（デバッグ用）
      console.log('📝 ページ作成（会社計画） - 生成されたメタデータ:', {
        pageId: newPage.id,
        title: newPage.title,
        metadata: {
          tags: newPage.tags,
          contentType: newPage.contentType,
          semanticCategory: newPage.semanticCategory,
          keywords: newPage.keywords,
          sectionType: newPage.sectionType,
          importance: newPage.importance,
        }
      });
      
      // ベクトル埋め込みを非同期で生成・保存（メタデータを含む）
      savePageEmbeddingAsync(
        newPage.id, 
        newPage.title, 
        newPage.content, 
        planId,
        undefined,
        {
          keywords: newPage.keywords,
          semanticCategory: newPage.semanticCategory,
          tags: newPage.tags,
          summary: newPage.summary,
        }
      );
      
      // 構造データを非同期で生成・保存
      const allPages = Object.values(pagesBySubMenu).flat().map(p => ({
        id: p.id,
        pageNumber: p.pageNumber,
        subMenuId: Object.keys(pagesBySubMenu).find(key => pagesBySubMenu[key].some(page => page.id === p.id)) || subMenuId,
      }));
      savePageStructureAsync(
        newPage.id,
        newPage.content,
        newPage.title,
        allPages,
        subMenuId,
        newPage.semanticCategory,
        newPage.keywords
      );
      
      const updatedPages = [...currentSubMenuPages, newPage];
      
      // ページ順序にも追加
      let currentSubMenuPageOrder = pageOrderBySubMenu[subMenuId] || [];
      
      // overviewの場合は、固定ページ（page-0）が存在する場合は最初に配置
      if (subMenuId === 'overview') {
        // 固定ページ（page-0）が順序に含まれていない場合は追加
        if (!currentSubMenuPageOrder.includes('page-0')) {
          currentSubMenuPageOrder = ['page-0', ...currentSubMenuPageOrder];
        }
      }
      
      const updatedPageOrder = [...currentSubMenuPageOrder, newPageId];
      
      // 更新データを準備
      const updatedPagesBySubMenu = {
        ...pagesBySubMenu,
        [subMenuId]: updatedPages,
      };
      
      const updatedPageOrderBySubMenu = {
        ...pageOrderBySubMenu,
        [subMenuId]: updatedPageOrder,
      };
      
      // Firestoreに保存
      await setDoc(
        doc(null, 'companyBusinessPlan', planId),
        {
          ...planData,
          pagesBySubMenu: updatedPagesBySubMenu,
          pageOrderBySubMenu: updatedPageOrderBySubMenu,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      
      console.log('ページを追加しました:', newPageId);
      console.log('サブメニューID:', subMenuId);
      console.log('更新されたページ順序:', updatedPageOrder);
      console.log('更新されたページデータ:', updatedPages);
      
      // 少し待ってからページをリフレッシュ（Firestoreの反映を待つ）
      setTimeout(() => {
        onPageAdded();
      }, 300);
      
      onClose();
      setSaving(false);
    } catch (error: any) {
      console.error('ページ追加エラー:', error);
      const errorMessage = error?.message || '不明なエラーが発生しました';
      alert(`ページの追加に失敗しました: ${errorMessage}`);
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.currentUser) return;
    if (!title.trim()) {
      alert('タイトルを入力してください');
      return;
    }

    try {
      setSaving(true);

      // 会社本体の事業計画の場合の処理
      if (isCompanyPlan && planId) {
        await handleCompanyPlanAddPage(planId);
        return;
      }

      // 事業企画の場合の処理
      if (!serviceId || !conceptId) {
        alert('必要な情報が不足しています。');
        setSaving(false);
        return;
      }

      // 構想ドキュメントを検索
      const conceptsQuery = query(
        collection(null, 'concepts'),
        where('userId', '==', auth.currentUser.uid),
        where('serviceId', '==', serviceId),
        where('conceptId', '==', conceptId)
      );
      
      const conceptsSnapshot = await getDocs(conceptsQuery);
      
      let conceptDocId: string;
      
      if (!conceptsSnapshot.empty) {
        conceptDocId = conceptsSnapshot.docs[0].id;
      } else {
        // 構想ドキュメントが存在しない場合は作成
        const fixedConcepts: { [key: string]: { [key: string]: string } } = {
          'component-test': {
            'test-concept': 'テスト構想',
          },
          'own-service': {
            'maternity-support-componentized': '出産支援パーソナルApp（コンポーネント化版）',
            'care-support-componentized': '介護支援パーソナルApp（コンポーネント化版）',
          },
        };
        const conceptName = fixedConcepts[serviceId]?.[conceptId] || conceptId;
        
        const newDocRef = await addDoc(collection(null, 'concepts'), {
          name: conceptName,
          description: 'コンポーネント化のテスト用構想',
          conceptId: conceptId,
          serviceId: serviceId,
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        conceptDocId = newDocRef.id;
      }

      // ページ設定を取得（構想ドキュメントが存在する場合）
      let conceptData;
      if (!conceptsSnapshot.empty) {
        conceptData = conceptsSnapshot.docs[0].data();
      } else {
        // 構想ドキュメントが存在しない場合は空のデータを使用
        conceptData = {};
      }
      
      // サブメニューごとのページデータを取得
      const pagesBySubMenu = conceptData.pagesBySubMenu as { [key: string]: Array<PageMetadata> } | undefined || {};
      
      const pageOrderBySubMenu = conceptData.pageOrderBySubMenu as { [key: string]: string[] } | undefined || {};
      
      // 現在のサブメニューのページデータを取得
      const currentSubMenuPages = pagesBySubMenu[subMenuId] || [];
      
      // 新しいページIDを生成
      const newPageId = `page-${Date.now()}`;
      const pageNumber = currentSubMenuPages.length;
      
      // 基本ページデータを作成
      const basePage = {
        id: newPageId,
        pageNumber: pageNumber,
        title: title.trim(),
        content: content.trim() || '<p>コンテンツを入力してください。</p>',
        createdAt: new Date().toISOString(),
      };
      
      // メタデータを自動生成
      const totalPages = Object.values(pagesBySubMenu).reduce((sum, pages) => sum + pages.length, 0) + 1;
      const newPage = generatePageMetadata(basePage, subMenuId, totalPages);
      
      // メタデータをコンソールに出力（デバッグ用）
      console.log('📝 ページ作成（構想） - 生成されたメタデータ:', {
        pageId: newPage.id,
        title: newPage.title,
        metadata: {
          tags: newPage.tags,
          contentType: newPage.contentType,
          semanticCategory: newPage.semanticCategory,
          keywords: newPage.keywords,
          sectionType: newPage.sectionType,
          importance: newPage.importance,
        }
      });
      
      // ベクトル埋め込みを非同期で生成・保存（メタデータを含む）
      savePageEmbeddingAsync(
        newPage.id, 
        newPage.title, 
        newPage.content, 
        undefined, 
        conceptId,
        {
          keywords: newPage.keywords,
          semanticCategory: newPage.semanticCategory,
          tags: newPage.tags,
          summary: newPage.summary,
        }
      );
      
      // 構造データを非同期で生成・保存
      const allPages = Object.values(pagesBySubMenu).flat().map(p => ({
        id: p.id,
        pageNumber: p.pageNumber,
        subMenuId: Object.keys(pagesBySubMenu).find(key => pagesBySubMenu[key].some(page => page.id === p.id)) || subMenuId,
      }));
      savePageStructureAsync(
        newPage.id,
        newPage.content,
        newPage.title,
        allPages,
        subMenuId,
        newPage.semanticCategory,
        newPage.keywords
      );
      
      const updatedPages = [...currentSubMenuPages, newPage];
      
      // ページ順序にも追加
      const currentSubMenuPageOrder = pageOrderBySubMenu[subMenuId] || [];
      const updatedPageOrder = [...currentSubMenuPageOrder, newPageId];
      
      // 更新データを準備（オブジェクト全体を更新する必要がある）
      const updatedPagesBySubMenu = {
        ...pagesBySubMenu,
        [subMenuId]: updatedPages,
      };
      
      const updatedPageOrderBySubMenu = {
        ...pageOrderBySubMenu,
        [subMenuId]: updatedPageOrder,
      };
      
      const updateData: any = {
        pagesBySubMenu: updatedPagesBySubMenu,
        pageOrderBySubMenu: updatedPageOrderBySubMenu,
        updatedAt: serverTimestamp(),
      };
      
      // overviewの場合は後方互換性のために古い形式も更新
      if (subMenuId === 'overview') {
        const oldPages = conceptData.pages || [];
        const oldPageOrder = conceptData.pageOrder as string[] | undefined;
        
        if (oldPageOrder) {
          updateData.pageOrder = [...oldPageOrder, newPageId];
      } else {
          const fixedPageIds = ['page-0'];
        updateData.pageOrder = [...fixedPageIds, newPageId];
        }
        updateData.pages = [...oldPages, newPage];
      }
      
      // Firestoreに保存
      await setDoc(
        doc(null, 'concepts', conceptDocId),
        updateData,
        { merge: true }
      );
      
      console.log('ページを追加しました:', newPageId);
      console.log('サブメニューID:', subMenuId);
      console.log('更新データ:', updateData);
      
      // 少し待ってからページをリフレッシュ（Firestoreの反映を待つ）
      setTimeout(() => {
      onPageAdded();
      }, 300);
      
      onClose();
    } catch (error: any) {
      console.error('ページ追加エラー:', error);
      const errorMessage = error?.message || '不明なエラーが発生しました';
      console.error('エラー詳細:', {
        code: error?.code,
        message: errorMessage,
        stack: error?.stack,
      });
      alert(`ページの追加に失敗しました: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      border: '1px solid var(--color-border-color)',
      marginBottom: '24px',
    }}>
      <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
        新しいページを追加
      </h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="pageTitle" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            ページタイトル *
          </label>
          <input
            id="pageTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: はじめに"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              fontSize: '14px',
            }}
            required
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="pageContent" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            コンテンツ（HTML形式）
          </label>
          <div style={{
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            overflow: 'hidden',
            minHeight: '400px',
          }}>
            <MonacoEditor
              height="400px"
              language="html"
              value={content}
              onChange={(value) => setContent(value || '')}
              theme="vs"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'off', // 改行を保持するためoffに
                formatOnPaste: true,
                formatOnType: false, // 自動フォーマットを無効化（改行が消えるのを防ぐ）
                autoIndent: 'full',
                bracketPairColorization: { enabled: true },
                colorDecorators: true,
                insertSpaces: true,
                detectIndentation: true,
                suggest: {
                  showKeywords: true,
                  showSnippets: true,
                },
              }}
            />
          </div>
          <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-text-light)' }}>
            HTMLタグを使用できます（例: &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;など）。タグの自動補完とシンタックスハイライトが有効です。
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
            disabled={saving}
          >
            キャンセル
          </button>
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
            disabled={saving}
          >
            {saving ? '保存中...' : 'ページを追加'}
          </button>
        </div>
      </form>
    </div>
  );
}

