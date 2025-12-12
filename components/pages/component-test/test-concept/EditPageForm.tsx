'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, setDoc, serverTimestamp } from '@/lib/localFirebase';
import { auth } from '@/lib/localFirebase';
import dynamic from 'next/dynamic';
import { generatePageMetadata } from '@/lib/pageMetadataUtils';
import { PageMetadata } from '@/types/pageMetadata';
import { savePageEmbeddingAsync } from '@/lib/pageEmbeddings';
import { savePageStructureAsync } from '@/lib/pageStructure';

/**
 * オブジェクトからundefinedの値を再帰的に削除する
 */
function removeUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      if (Array.isArray(obj[key])) {
        // 配列の各要素を再帰的に処理
        cleaned[key] = obj[key].map((item: any) => 
          typeof item === 'object' && item !== null ? removeUndefinedFields(item) : item
        ) as T[Extract<keyof T, string>];
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        // オブジェクトの場合、再帰的に処理
        const cleanedObj = removeUndefinedFields(obj[key]);
        if (Object.keys(cleanedObj).length > 0) {
          cleaned[key] = cleanedObj as T[Extract<keyof T, string>];
        }
      } else {
        cleaned[key] = obj[key];
      }
    }
  }
  return cleaned;
}

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

interface EditPageFormProps {
  serviceId?: string;
  conceptId?: string;
  planId?: string; // 会社本体の事業計画用
  subMenuId: string;
  pageId: string;
  initialTitle: string;
  initialContent: string;
  initialKeyMessage?: string;
  initialSubMessage?: string;
  onClose: () => void;
  onPageUpdated: () => void;
}

export default function EditPageForm({ 
  serviceId, 
  conceptId,
  planId,
  subMenuId,
  pageId, 
  initialTitle, 
  initialContent,
  initialKeyMessage,
  initialSubMessage,
  onClose, 
  onPageUpdated 
}: EditPageFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  // initialKeyMessageとinitialSubMessageがundefinedの場合は空文字列を初期値とする
  // 値が存在する場合はuseEffectで設定される
  const [keyMessage, setKeyMessage] = useState(initialKeyMessage ?? '');
  const [subMessage, setSubMessage] = useState(initialSubMessage ?? '');
  const [saving, setSaving] = useState(false);
  const monacoEditorRef = useRef<any>(null);

  // 既存のコンテンツからキーメッセージとサブメッセージを抽出
  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
    
    console.log('[EditPageForm] useEffect実行:', {
      initialKeyMessage,
      initialSubMessage,
      hasInitialKeyMessage: initialKeyMessage !== undefined,
      hasInitialSubMessage: initialSubMessage !== undefined,
    });
    
    // まず、propsから直接渡されたキーメッセージとサブメッセージを使用（undefinedでない場合）
    // 空文字列も有効な値として扱う（明示的に空文字列が渡された場合はそれを使用）
    if (initialKeyMessage !== undefined) {
      setKeyMessage(initialKeyMessage);
      console.log('[EditPageForm] initialKeyMessageを設定:', initialKeyMessage);
    }
    if (initialSubMessage !== undefined) {
      setSubMessage(initialSubMessage);
      console.log('[EditPageForm] initialSubMessageを設定:', initialSubMessage);
    }
    
    // propsで渡されていない場合（undefined）のみ、HTMLから抽出を試みる
    if (initialKeyMessage === undefined && initialSubMessage === undefined) {
      console.log('[EditPageForm] HTMLから抽出を試みます');
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = initialContent;
      
      // key-message-containerまたはkey-message-titleクラスを持つ要素を探す
      const keyMessageContainer = tempDiv.querySelector('.key-message-container');
      if (keyMessageContainer) {
        const titleElement = keyMessageContainer.querySelector('.key-message-title');
        const subtitleElement = keyMessageContainer.querySelector('.key-message-subtitle');
        
        if (titleElement) {
          setKeyMessage(titleElement.textContent || '');
        }
        if (subtitleElement) {
          setSubMessage(subtitleElement.textContent || '');
        }
      } else {
        // クラスがない場合、h2とpの組み合わせを探す
        const h2Element = tempDiv.querySelector('h2');
        const pElement = tempDiv.querySelector('p');
        
        if (h2Element && pElement) {
          // グラデーションスタイルが含まれているかチェック
          const h2Style = h2Element.getAttribute('style') || '';
          if (h2Style.includes('linear-gradient') || h2Style.includes('background-clip')) {
            setKeyMessage(h2Element.textContent || '');
            setSubMessage(pElement.textContent || '');
          }
        }
      }
    }
  }, [initialTitle, initialContent, initialKeyMessage, initialSubMessage]);

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
      const isCompanyPlan = !!planId && !serviceId && !conceptId;
      if (isCompanyPlan && planId) {
        // 事業計画ドキュメントを取得
        const planDoc = await getDoc(doc(null, 'companyBusinessPlan', planId));
        
        if (!planDoc.exists()) {
          alert('事業計画が見つかりませんでした。');
          setSaving(false);
          return;
        }

        const planData = planDoc.data();
        const pagesBySubMenu = (planData.pagesBySubMenu || {}) as { [key: string]: Array<PageMetadata> };
        const pageOrderBySubMenu = planData.pageOrderBySubMenu || {};
        
        // 現在のサブメニューのページデータを取得
        const currentSubMenuPages = pagesBySubMenu[subMenuId] || [];
        
        // キーメッセージとサブメッセージをHTMLにフォーマット
        let formattedContent = content.trim();
        
        // キーメッセージまたはサブメッセージが入力されている場合
        if (keyMessage.trim() || subMessage.trim()) {
          const keyMessageHTML = `
  <!-- キーメッセージ - 最大化 -->
  <div class="key-message-container" style="margin-bottom: ${keyMessage.trim() && subMessage.trim() ? '32px' : '48px'}">
    ${keyMessage.trim() ? `<h2 class="key-message-title" style="margin: 0 0 ${subMessage.trim() ? '12px' : '16px'} 0; line-height: 1.4">
      ${keyMessage.trim()}
    </h2>` : ''}
    ${subMessage.trim() ? `<p class="key-message-subtitle">
      ${subMessage.trim()}
    </p>` : ''}
  </div>`;
          
          // 既存のコンテンツからキーメッセージ部分を削除
          // まず、HTMLコメントを削除（正規表現で）
          formattedContent = formattedContent.replace(/<!--\s*キーメッセージ\s*-?\s*最大化\s*-->\s*/gi, '');
          
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = formattedContent;
          
          // key-message-containerを削除
          const existingKeyMessageContainer = tempDiv.querySelector('.key-message-container');
          if (existingKeyMessageContainer) {
            existingKeyMessageContainer.remove();
          } else {
            // クラスがない場合、h2とpの組み合わせを削除
            const h2Element = tempDiv.querySelector('h2');
            const pElement = tempDiv.querySelector('p');
            if (h2Element && pElement) {
              const h2Style = h2Element.getAttribute('style') || '';
              if (h2Style.includes('linear-gradient') || h2Style.includes('background-clip')) {
                h2Element.remove();
                pElement.remove();
              }
            }
          }
          
          // キーメッセージを先頭に追加
          formattedContent = keyMessageHTML + '\n' + tempDiv.innerHTML.trim();
        }
        
        // ページを更新（メタデータも再生成）
        const totalPages = Object.values(pagesBySubMenu).reduce((sum, pages) => sum + pages.length, 0);
        const updatedPages = currentSubMenuPages.map((page: PageMetadata) => {
          if (page.id === pageId) {
            const basePage = {
              ...page,
              title: title.trim(),
              content: formattedContent || '<p>コンテンツを入力してください。</p>',
              updatedAt: new Date().toISOString(),
              // キーメッセージとサブメッセージを保存（空文字列の場合はundefinedを設定しない）
              ...(keyMessage.trim() && { keyMessage: keyMessage.trim() }),
              ...(subMessage.trim() && { subMessage: subMessage.trim() }),
            };
            // メタデータを再生成
            const updatedPage = generatePageMetadata(basePage, subMenuId, totalPages);
            
            // キーメッセージとサブメッセージを保持（generatePageMetadataで失われる可能性があるため）
            if (keyMessage.trim()) {
              (updatedPage as any).keyMessage = keyMessage.trim();
            }
            if (subMessage.trim()) {
              (updatedPage as any).subMessage = subMessage.trim();
            }
            
            // undefinedの値を削除
            const cleanedPage = removeUndefinedFields(updatedPage as any);
            
            // メタデータをコンソールに出力（デバッグ用）
            console.log('✏️ ページ更新（会社計画） - 再生成されたメタデータ:', {
              pageId: updatedPage.id,
              title: updatedPage.title,
              metadata: {
                tags: updatedPage.tags,
                contentType: updatedPage.contentType,
                semanticCategory: updatedPage.semanticCategory,
                keywords: updatedPage.keywords,
                sectionType: updatedPage.sectionType,
                importance: updatedPage.importance,
              }
            });
            
            // ベクトル埋め込みを非同期で再生成・保存（メタデータを含む）
            savePageEmbeddingAsync(
              cleanedPage.id, 
              cleanedPage.title, 
              cleanedPage.content, 
              planId,
              undefined,
              {
                keywords: cleanedPage.keywords,
                semanticCategory: cleanedPage.semanticCategory,
                tags: cleanedPage.tags,
                summary: cleanedPage.summary,
              }
            );
            
            // 構造データを非同期で再生成・保存
            const allPages = Object.values(pagesBySubMenu).flat().map(p => ({
              id: p.id,
              pageNumber: p.pageNumber,
              subMenuId: Object.keys(pagesBySubMenu).find(key => pagesBySubMenu[key].some(page => page.id === p.id)) || subMenuId,
            }));
            savePageStructureAsync(
              cleanedPage.id,
              cleanedPage.content,
              cleanedPage.title,
              allPages,
              subMenuId,
              cleanedPage.semanticCategory,
              cleanedPage.keywords
            );
            
            return cleanedPage as PageMetadata;
          }
          return page;
        });
        
        // 更新データを準備
        const updatedPagesBySubMenu = {
          ...pagesBySubMenu,
          [subMenuId]: updatedPages,
        };
        
        // Firestoreに保存する前にundefinedを削除
        const updateData = removeUndefinedFields({
          ...planData,
          pagesBySubMenu: updatedPagesBySubMenu,
          updatedAt: serverTimestamp(),
        });
        
        // Firestoreに保存
        await setDoc(
          doc(null, 'companyBusinessPlan', planId),
          updateData,
          { merge: true }
        );
        
        setSaving(false);
        onPageUpdated();
        onClose();
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
      
      if (conceptsSnapshot.empty) {
        alert('構想ドキュメントが見つかりません');
        setSaving(false);
        return;
      }

      const conceptDoc = conceptsSnapshot.docs[0];
      const conceptData = conceptDoc.data();
      
      // サブメニューごとのページデータを取得
      const pagesBySubMenu = (conceptData.pagesBySubMenu as { [key: string]: Array<PageMetadata> }) || {};
      
      // 現在のサブメニューのページデータを取得
      const currentSubMenuPages = pagesBySubMenu[subMenuId] || [];
      
      // overviewの場合は後方互換性のために古い形式もチェック
      let pages: Array<PageMetadata>;
      
      if (subMenuId === 'overview') {
        const oldPages = (conceptData.pages as Array<PageMetadata>) || [];
        pages = currentSubMenuPages.length > 0 ? currentSubMenuPages : oldPages;
      } else {
        pages = currentSubMenuPages;
      }

      // 編集対象のページを検索
      const pageIndex = pages.findIndex((page: PageMetadata) => page.id === pageId);
      if (pageIndex === -1) {
        alert('ページが見つかりません');
        return;
      }

      // キーメッセージとサブメッセージをHTMLにフォーマット
      let formattedContent = content.trim();
      
      // キーメッセージまたはサブメッセージが入力されている場合
      if (keyMessage.trim() || subMessage.trim()) {
        const keyMessageHTML = `
  <!-- キーメッセージ - 最大化 -->
  <div class="key-message-container" style="margin-bottom: ${keyMessage.trim() && subMessage.trim() ? '32px' : '48px'}">
    ${keyMessage.trim() ? `<h2 class="key-message-title" style="margin: 0 0 ${subMessage.trim() ? '12px' : '16px'} 0; line-height: 1.4">
      ${keyMessage.trim()}
    </h2>` : ''}
    ${subMessage.trim() ? `<p class="key-message-subtitle">
      ${subMessage.trim()}
    </p>` : ''}
  </div>`;
        
        // 既存のコンテンツからキーメッセージ部分を削除
        // まず、HTMLコメントを削除（正規表現で）
        formattedContent = formattedContent.replace(/<!--\s*キーメッセージ\s*-?\s*最大化\s*-->\s*/gi, '');
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = formattedContent;
        
        // key-message-containerを削除
        const existingKeyMessageContainer = tempDiv.querySelector('.key-message-container');
        if (existingKeyMessageContainer) {
          existingKeyMessageContainer.remove();
        } else {
          // クラスがない場合、h2とpの組み合わせを削除
          const h2Element = tempDiv.querySelector('h2');
          const pElement = tempDiv.querySelector('p');
          if (h2Element && pElement) {
            const h2Style = h2Element.getAttribute('style') || '';
            if (h2Style.includes('linear-gradient') || h2Style.includes('background-clip')) {
              h2Element.remove();
              pElement.remove();
            }
          }
        }
        
        // キーメッセージを先頭に追加
        formattedContent = keyMessageHTML + '\n' + tempDiv.innerHTML.trim();
      }
      
      // ページのコンテンツを更新（メタデータも再生成）
      const totalPages = Object.values(pagesBySubMenu).reduce((sum, pages) => sum + pages.length, 0);
      const updatedPages = [...pages];
      const basePage = {
        ...updatedPages[pageIndex],
        title: title.trim(),
        content: formattedContent || '<p>コンテンツを入力してください。</p>',
        updatedAt: new Date().toISOString(),
        // キーメッセージとサブメッセージを保存（空文字列の場合はundefinedを設定しない）
        ...(keyMessage.trim() && { keyMessage: keyMessage.trim() }),
        ...(subMessage.trim() && { subMessage: subMessage.trim() }),
      };
      // メタデータを再生成
      const updatedPage = generatePageMetadata(basePage, subMenuId, totalPages);
      
      // キーメッセージとサブメッセージを保持（generatePageMetadataで失われる可能性があるため）
      if (keyMessage.trim()) {
        (updatedPage as any).keyMessage = keyMessage.trim();
      }
      if (subMessage.trim()) {
        (updatedPage as any).subMessage = subMessage.trim();
      }
      
      // undefinedの値を削除
      const cleanedPage = removeUndefinedFields(updatedPage as any);
      
      // メタデータをコンソールに出力（デバッグ用）
      console.log('✏️ ページ更新（構想） - 再生成されたメタデータ:', {
        pageId: cleanedPage.id,
        title: cleanedPage.title,
        metadata: {
          tags: cleanedPage.tags,
          contentType: cleanedPage.contentType,
          semanticCategory: cleanedPage.semanticCategory,
          keywords: cleanedPage.keywords,
          sectionType: cleanedPage.sectionType,
          importance: cleanedPage.importance,
        }
      });
      
      // ベクトル埋め込みを非同期で再生成・保存（メタデータを含む）
      savePageEmbeddingAsync(
        cleanedPage.id, 
        cleanedPage.title, 
        cleanedPage.content, 
        undefined, 
        conceptId,
        {
          keywords: cleanedPage.keywords,
          semanticCategory: cleanedPage.semanticCategory,
          tags: cleanedPage.tags,
          summary: cleanedPage.summary,
        }
      );
      
      // 構造データを非同期で再生成・保存
      const allPages = Object.values(pagesBySubMenu).flat().map(p => ({
        id: p.id,
        pageNumber: p.pageNumber,
        subMenuId: Object.keys(pagesBySubMenu).find(key => pagesBySubMenu[key].some(page => page.id === p.id)) || subMenuId,
      }));
      savePageStructureAsync(
        cleanedPage.id,
        cleanedPage.content,
        cleanedPage.title,
        allPages,
        subMenuId,
        cleanedPage.semanticCategory,
        cleanedPage.keywords
      );
      
      updatedPages[pageIndex] = cleanedPage as PageMetadata;

      // 更新データを準備
      const updatedPagesBySubMenu = {
        ...pagesBySubMenu,
        [subMenuId]: updatedPages,
      };
      
      const updateData: any = {
        pagesBySubMenu: updatedPagesBySubMenu,
        updatedAt: serverTimestamp(),
      };
      
      // overviewの場合は後方互換性のために古い形式も更新
      if (subMenuId === 'overview') {
        updateData.pages = updatedPages;
      }

      // Firestoreに保存する前にundefinedを削除
      const cleanedUpdateData = removeUndefinedFields(updateData);

      // Firestoreに保存
      await updateDoc(doc(null, 'concepts', conceptDoc.id), cleanedUpdateData);
      
      // キャッシュを無効化（2Dグラフのページコンテンツチェック用）
      if (typeof window !== 'undefined') {
        const pageUrl = `/business-plan/services/${serviceId}/${conceptId}/${subMenuId}`;
        // 動的にインポートしてキャッシュクリア関数を呼び出す
        import('@/components/ForceDirectedGraph').then((module) => {
          if (module.clearPageContentCache) {
            module.clearPageContentCache(pageUrl);
          }
        }).catch(() => {
          // インポートエラーは無視（キャッシュクリアはオプショナル）
        });
      }
      
      onPageUpdated();
      onClose();
    } catch (error: any) {
      console.error('ページ更新エラー:', error);
      alert(`ページの更新に失敗しました: ${error.message}`);
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
        ページを編集
      </h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="editPageTitle" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            ページタイトル *
          </label>
          <input
            id="editPageTitle"
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
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="editKeyMessage" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            キーメッセージ（任意）
          </label>
          <input
            id="editKeyMessage"
            type="text"
            value={keyMessage}
            onChange={(e) => setKeyMessage(e.target.value)}
            placeholder="例: 必要な支援を見逃さない、安心の出産・育児を。"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-text-light)' }}>
            グラデーションスタイルが自動的に適用されます
          </p>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="editSubMessage" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            サブメッセージ（任意）
          </label>
          <input
            id="editSubMessage"
            type="text"
            value={subMessage}
            onChange={(e) => setSubMessage(e.target.value)}
            placeholder="例: 妊娠・出産・育児を、もっとスマートに、もっと確実に。"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label htmlFor="editPageContent" style={{ fontSize: '14px', fontWeight: 500 }}>
              コンテンツ（HTML形式）
            </label>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(content);
                  alert('コンテンツをクリップボードにコピーしました');
                } catch (err) {
                  // フォールバック: 古いブラウザ対応
                  const textArea = document.createElement('textarea');
                  textArea.value = content;
                  textArea.style.position = 'fixed';
                  textArea.style.opacity = '0';
                  document.body.appendChild(textArea);
                  textArea.select();
                  try {
                    document.execCommand('copy');
                    alert('コンテンツをクリップボードにコピーしました');
                  } catch (err) {
                    alert('コピーに失敗しました');
                  }
                  document.body.removeChild(textArea);
                }
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f3f4f6',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              📋 全文コピー
            </button>
          </div>
          <div 
            style={{
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              overflow: 'hidden',
              minHeight: '400px',
            }}
          >
            <MonacoEditor
              height="400px"
              language="html"
              value={content}
              onChange={(value) => setContent(value || '')}
              onMount={(editor) => {
                monacoEditorRef.current = editor;
              }}
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
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}

