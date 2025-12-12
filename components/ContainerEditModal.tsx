'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { callTauriCommand, auth } from '@/lib/localFirebase';
import { getContainerById, updateContainer, getConceptContainerById, updateConceptContainer } from '@/lib/containerGeneration';
import { editContainerCodeWithAI } from '@/lib/containerCodeEditing';
import { getUserTemplates, PageTemplate } from '@/lib/pageTemplates';
import { stripHtml } from '@/lib/pageMetadataUtils';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import '@/components/pages/component-test/test-concept/pageStyles.css';

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

// DiffEditorを動的インポート
const DiffEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.DiffEditor),
  { 
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
        Diffエディターを読み込み中...
      </div>
    ),
  }
) as any;

// DynamicPageを動的インポート（SSRを回避）
const DynamicPage = dynamic(
  () => import('@/components/pages/component-test/test-concept/DynamicPage'),
  { ssr: false }
);

interface ContainerEditModalProps {
  isOpen: boolean;
  containerId: string;
  planId: string;
  subMenuId: string;
  onClose: () => void;
  onSaved: () => void;
  modelType?: 'gpt' | 'local' | 'cursor';
  selectedModel?: string;
  fixedPageContainers?: Array<{ id: string; title: string; content: string; keyMessage?: string; subMessage?: string; order: number }>;
  onSaveContainers?: (containers: Array<{ id: string; title: string; content: string; keyMessage?: string; subMessage?: string; order: number }>) => Promise<void>;
}

export default function ContainerEditModal({
  isOpen,
  containerId,
  planId,
  subMenuId,
  onClose,
  onSaved,
  modelType = 'gpt',
  selectedModel = 'gpt-4.1-mini',
  fixedPageContainers = [],
  onSaveContainers,
}: ContainerEditModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [subMessage, setSubMessage] = useState('');
  const [pageIdInput, setPageIdInput] = useState('');
  const [editingInstruction, setEditingInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [useCodeEditor, setUseCodeEditor] = useState(true); // デフォルトでコードエディタを使用
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit'); // 編集/プレビューモード
  const [originalContent, setOriginalContent] = useState<string>(''); // AI編集前のコード
  const [editedContent, setEditedContent] = useState<string | null>(null); // AI編集後のコード
  const [showDiff, setShowDiff] = useState(false); // diff表示モード
  const [showFavoriteSelector, setShowFavoriteSelector] = useState(false); // お気に入り選択モーダル
  const [favoriteTemplates, setFavoriteTemplates] = useState<PageTemplate[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplate | null>(null); // 選択されたテンプレート
  const [isFullscreen, setIsFullscreen] = useState(false); // モーダル全体の全画面表示モード
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false); // プレビュー部分だけの全画面表示モード
  const [isContentFullscreen, setIsContentFullscreen] = useState(false); // コンテンツ（HTML）エディタ部分だけの全画面表示モード
  const monacoEditorRef = useRef<any>(null);
  const diffEditorRef = useRef<any>(null);

  // コンテナデータを読み込む
  useEffect(() => {
    if (isOpen && containerId) {
      loadContainer();
      // モーダルを開く際にdiff表示をリセット
      setShowDiff(false);
      setEditedContent(null);
      setOriginalContent('');
    }
  }, [isOpen, containerId, planId, subMenuId, fixedPageContainers]);

  // お気に入りテンプレートを読み込む
  const loadFavoriteTemplates = async () => {
    if (!auth?.currentUser) return;
    
    try {
      setLoadingFavorites(true);
      const templates = await getUserTemplates(planId, undefined);
      setFavoriteTemplates(templates);
    } catch (error) {
      console.error('お気に入りテンプレートの読み込みエラー:', error);
    } finally {
      setLoadingFavorites(false);
    }
  };

  // お気に入り選択モーダルを開く
  const handleOpenFavoriteSelector = async () => {
    await loadFavoriteTemplates();
    setSelectedTemplate(null); // モーダルを開く際に選択をリセット
    setShowFavoriteSelector(true);
  };

  // お気に入りスライドを選択（一時的に選択状態にするだけ）
  const handleSelectFavoriteSlide = (template: PageTemplate) => {
    setSelectedTemplate(template);
  };

  // 選択したスライドの内容を反映
  const handleApplySelectedSlide = async () => {
    if (!selectedTemplate) return;
    
    setPageIdInput(selectedTemplate.pageId);
    setShowFavoriteSelector(false);
    setSelectedTemplate(null); // 選択をリセット
    // ページIDを直接渡して読み込む
    await handleLoadPageById(selectedTemplate.pageId);
  };

  const loadContainer = async () => {
    try {
      setIsLoading(true);
      // まずローカルのfixedPageContainersから検索
      let container: { id: string; title: string; content: string; keyMessage?: string; subMessage?: string; order?: number } | null = fixedPageContainers.find(c => c.id === containerId) || null;
      
      // ローカルで見つからない場合は、Firestoreから読み込む
      if (!container) {
        // まず事業計画として試す
        try {
          container = await getContainerById(planId, containerId, subMenuId);
        } catch (error) {
          console.error('事業計画コンテナの読み込みエラー:', error);
        }
        
        // 事業計画で見つからない場合は構想として試す
        if (!container) {
          try {
            container = await getConceptContainerById(planId, containerId, subMenuId);
          } catch (conceptError) {
            console.error('構想コンテナの読み込みエラー:', conceptError);
          }
        }
      }
      
      if (container) {
        setContent(container.content || '');
        setTitle(container.title || '');
        setKeyMessage(container.keyMessage || '');
        setSubMessage(container.subMessage || '');
      } else {
        alert('コンテナが見つかりませんでした');
        onClose();
      }
    } catch (error) {
      console.error('コンテナの読み込みエラー:', error);
      alert('コンテナの読み込みに失敗しました');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  // ページIDでページを検索してコンテンツに反映
  const handleLoadPageById = async (pageId?: string) => {
    const targetPageId = pageId || pageIdInput.trim();
    
    if (!targetPageId || !auth?.currentUser) {
      alert('ページIDを入力してください');
      return;
    }

    setLoadingPage(true);
    try {
      const currentUser = await callTauriCommand('get_current_user', {});
      if (!currentUser) {
        alert('ログインが必要です');
        setLoadingPage(false);
        return;
      }
      const userId = currentUser.uid;
      let foundPage = null;

      // companyBusinessPlanコレクションから検索（userIdでフィルタ）
      try {
        const conditions = {
          field: 'userId',
          operator: '==',
          value: userId
        };
        const plansResults = await callTauriCommand('query_get', {
          collectionName: 'companyBusinessPlan',
          conditions
        });
        for (const planItem of plansResults || []) {
          const planData = planItem.data || planItem;
          const pagesBySubMenu = planData.pagesBySubMenu || {};
          
          for (const pages of Object.values(pagesBySubMenu)) {
            if (Array.isArray(pages)) {
              const page = pages.find((p: any) => p.id === targetPageId.trim());
              if (page) {
                foundPage = page;
                break;
              }
            }
          }
          if (foundPage) break;
        }
      } catch (error) {
        console.error('companyBusinessPlan検索エラー:', error);
      }

      // conceptsコレクションから検索（userIdでフィルタ）
      if (!foundPage) {
        try {
          const conditions = {
            field: 'userId',
            operator: '==',
            value: userId
          };
          const conceptsResults = await callTauriCommand('query_get', {
            collectionName: 'concepts',
            conditions
          });
          for (const conceptItem of conceptsResults || []) {
            const conceptData = conceptItem.data || conceptItem;
            const pagesBySubMenu = conceptData.pagesBySubMenu || {};
            
            for (const pages of Object.values(pagesBySubMenu)) {
              if (Array.isArray(pages)) {
                const page = pages.find((p: any) => p.id === targetPageId.trim());
                if (page) {
                  foundPage = page;
                  break;
                }
              }
            }
            if (foundPage) break;
          }
        } catch (error) {
          console.error('concepts検索エラー:', error);
        }
      }

      if (foundPage) {
        setContent(foundPage.content || '');
        setTitle(foundPage.title || title);
        setKeyMessage(foundPage.keyMessage || keyMessage);
        setSubMessage(foundPage.subMessage || subMessage);
        alert('ページの内容を読み込みました');
        if (!pageId) {
          setPageIdInput('');
        }
      } else {
        alert('ページが見つかりませんでした');
      }
    } catch (error) {
      console.error('ページ読み込みエラー:', error);
      alert('ページの読み込みに失敗しました');
    } finally {
      setLoadingPage(false);
    }
  };

  // AIでコードを編集
  const handleEditWithAI = async () => {
    if (!editingInstruction.trim()) {
      alert('編集指示を入力してください');
      return;
    }

    try {
      setIsEditing(true);
      // 編集前のコードを保存
      setOriginalContent(content);
      const edited = await editContainerCodeWithAI(
        content,
        editingInstruction,
        modelType,
        selectedModel
      );
      setEditedContent(edited);
      // diff表示モードに切り替え
      setShowDiff(true);
      setEditingInstruction('');
    } catch (error) {
      console.error('コード編集エラー:', error);
      alert('コードの編集に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsEditing(false);
    }
  };

  // 変更を適用（Keep）
  const handleAcceptChanges = () => {
    if (editedContent !== null) {
      setContent(editedContent);
      setShowDiff(false);
      setOriginalContent('');
      setEditedContent(null);
    }
  };

  // 変更を拒否（Udon/元に戻す）
  const handleRejectChanges = () => {
    setShowDiff(false);
    setEditedContent(null);
    // 元のコードに戻す（originalContentは既にcontentと同じなので変更不要）
  };

  // 保存
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // 親コンポーネントのonSaveContainersが提供されている場合は、それを使用
      if (onSaveContainers) {
        const updatedContainers = fixedPageContainers.length > 0 
          ? fixedPageContainers.map((container) => {
              if (container.id === containerId) {
                return {
                  ...container,
                  title,
                  content,
                  keyMessage,
                  subMessage,
                };
              }
              return container;
            })
          : [];
        
        // コンテナが見つからない場合は新規追加
        const existingContainer = updatedContainers.find(c => c.id === containerId);
        if (!existingContainer) {
          updatedContainers.push({
            id: containerId,
            title,
            content,
            order: fixedPageContainers.length,
            keyMessage,
            subMessage,
          });
        }
        
        await onSaveContainers(updatedContainers);
        // onSaveContainers内で既に状態が更新されているので、onSaved()は呼び出さない
        alert('保存しました');
        onClose();
        return;
      } else {
        // 従来の方法（Firestoreから直接更新）
        try {
          await updateContainer(planId, containerId, subMenuId, {
            title,
            content,
            keyMessage,
            subMessage,
          });
        } catch (error) {
          // 事業計画で失敗した場合は構想として試す
          await updateConceptContainer(planId, containerId, subMenuId, {
            title,
            content,
            keyMessage,
            subMessage,
          });
        }
      }
      
      alert('保存しました');
      onSaved();
      onClose();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSaving(false);
    }
  };

  // プレビュー用のHTMLを生成（元のコード用）
  const originalPreviewHTML = useMemo(() => {
    let html = '';
    
    // タイトル
    if (title) {
      html += `<h3 data-pdf-title-h3="true" style="font-size: 16px; font-weight: 600; color: var(--color-text); border-left: 3px solid var(--color-primary); padding-left: 8px; margin: 0 0 16px 0;">${title}</h3>`;
    }
    
    // キーメッセージとサブメッセージ
    if (keyMessage || subMessage) {
      html += `<div class="key-message-container" style="margin-bottom: ${keyMessage && subMessage ? '32px' : '48px'}">`;
      if (keyMessage) {
        html += `<h2 class="key-message-title" style="margin: 0 0 ${subMessage ? '12px' : '16px'} 0; line-height: 1.4">${keyMessage}</h2>`;
      }
      if (subMessage) {
        html += `<p class="key-message-subtitle">${subMessage}</p>`;
      }
      html += `</div>`;
    }
    
    // コンテンツ（元のコード）
    const contentToUse = showDiff && originalContent ? originalContent : content;
    html += `<div class="page-section-content">${contentToUse}</div>`;
    
    return html;
  }, [title, keyMessage, subMessage, content, originalContent, showDiff]);

  // プレビュー用のHTMLを生成（変更後のコード用）
  const editedPreviewHTML = useMemo(() => {
    if (!showDiff || !editedContent) return null;
    
    let html = '';
    
    // タイトル
    if (title) {
      html += `<h3 data-pdf-title-h3="true" style="font-size: 16px; font-weight: 600; color: var(--color-text); border-left: 3px solid var(--color-primary); padding-left: 8px; margin: 0 0 16px 0;">${title}</h3>`;
    }
    
    // キーメッセージとサブメッセージ
    if (keyMessage || subMessage) {
      html += `<div class="key-message-container" style="margin-bottom: ${keyMessage && subMessage ? '32px' : '48px'}">`;
      if (keyMessage) {
        html += `<h2 class="key-message-title" style="margin: 0 0 ${subMessage ? '12px' : '16px'} 0; line-height: 1.4">${keyMessage}</h2>`;
      }
      if (subMessage) {
        html += `<p class="key-message-subtitle">${subMessage}</p>`;
      }
      html += `</div>`;
    }
    
    // コンテンツ（変更後のコード）
    html += `<div class="page-section-content">${editedContent}</div>`;
    
    return html;
  }, [title, keyMessage, subMessage, editedContent, showDiff]);

  if (!isOpen) return null;

  return (
    <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isFullscreen ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: isFullscreen ? 'stretch' : 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: isFullscreen ? '0' : '20px',
        }}
        onClick={onClose}
      >
      <div
        style={{
          backgroundColor: '#fff',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: isFullscreen ? '100%' : '1200px',
          width: isFullscreen ? '100%' : '90%',
          maxHeight: isFullscreen ? '100vh' : '90vh',
          height: isFullscreen ? '100vh' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            コンテナを編集
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                background: 'none',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                color: 'var(--color-text)',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={isFullscreen ? '通常サイズに戻す' : '全画面表示'}
            >
              {isFullscreen ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
              <span style={{ fontSize: '13px' }}>{isFullscreen ? '縮小' : '全画面'}</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* スクロール可能なコンテンツエリア */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* コンテナIDとページID読み込み */}
        <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flexShrink: 0 }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
              コンテナID
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={containerId}
                readOnly
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#f9fafb',
                  color: '#6b7280',
                  fontFamily: 'monospace',
                }}
              />
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(containerId);
                    alert('IDをコピーしました: ' + containerId);
                  } catch (err) {
                    const textArea = document.createElement('textarea');
                    textArea.value = containerId;
                    textArea.style.position = 'fixed';
                    textArea.style.opacity = '0';
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                      document.execCommand('copy');
                      alert('IDをコピーしました: ' + containerId);
                    } catch (err) {
                      alert('コピーに失敗しました');
                    }
                    document.body.removeChild(textArea);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                }}
                title="IDをクリップボードにコピー"
              >
                コピー
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
              ページIDで読み込み
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={pageIdInput}
                onChange={(e) => setPageIdInput(e.target.value)}
                placeholder="例: page-1764877594132-0-aj40liws8"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLoadPageById();
                  }
                }}
              />
              <button
                onClick={handleOpenFavoriteSelector}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(59, 130, 246, 0.8)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.2s ease, color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.8)';
                }}
                title="お気に入り登録したスライドから選択"
              >
                ⭐ 選択
              </button>
              <button
                onClick={() => handleLoadPageById(pageIdInput.trim() || undefined)}
                disabled={loadingPage || !pageIdInput.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: loadingPage || !pageIdInput.trim() ? '#d1d5db' : 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loadingPage || !pageIdInput.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  opacity: loadingPage || !pageIdInput.trim() ? 0.6 : 1,
                }}
                title="ページIDでページの内容を読み込む"
              >
                {loadingPage ? '読み込み中...' : '読み込む'}
              </button>
            </div>
          </div>
        </div>
        <p style={{ marginTop: '-8px', marginBottom: '16px', fontSize: '12px', color: 'var(--color-text-light)', flexShrink: 0 }}>
          ページIDを入力して「読み込む」をクリックすると、そのページの内容がコンテンツ（HTML）に反映されます。
        </p>

        {/* タイトル */}
        <div style={{ marginBottom: '16px', flexShrink: 0 }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
            タイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        {/* キーメッセージ */}
        <div style={{ marginBottom: '16px', flexShrink: 0 }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
            キーメッセージ
          </label>
          <input
            type="text"
            value={keyMessage}
            onChange={(e) => setKeyMessage(e.target.value)}
            placeholder="例: 未来の働き方を創造する"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        {/* サブメッセージ */}
        <div style={{ marginBottom: '16px', flexShrink: 0 }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
            サブメッセージ
          </label>
          <textarea
            value={subMessage}
            onChange={(e) => setSubMessage(e.target.value)}
            placeholder="例: AIと人間の協働により、より創造的で価値ある仕事に集中できる環境を実現します"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* タブ切り替え（編集/プレビュー） */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', borderBottom: '2px solid #e5e7eb', flexShrink: 0 }}>
          <button
            onClick={() => setViewMode('edit')}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: viewMode === 'edit' ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: viewMode === 'edit' ? 'var(--color-primary)' : 'var(--color-text-light)',
              fontSize: '14px',
              fontWeight: viewMode === 'edit' ? 600 : 400,
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            編集
          </button>
          <button
            onClick={() => setViewMode('preview')}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: viewMode === 'preview' ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: viewMode === 'preview' ? 'var(--color-primary)' : 'var(--color-text-light)',
              fontSize: '14px',
              fontWeight: viewMode === 'preview' ? 600 : 400,
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            プレビュー
          </button>
        </div>

        {/* エディタ切り替え（編集モードのみ） */}
        {viewMode === 'edit' && (
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useCodeEditor}
                onChange={(e) => setUseCodeEditor(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              コードエディタを使用（Monaco Editor）
            </label>
          </div>
        )}

        {viewMode === 'edit' ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* AI編集指示 */}
            {useCodeEditor && (
              <div style={{ marginBottom: '16px', flexShrink: 0 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
                  AI編集指示（Vibeコーディング）
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={editingInstruction}
                    onChange={(e) => setEditingInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleEditWithAI();
                      }
                    }}
                    placeholder="例: このコードをより読みやすくリファクタリングして"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                  <button
                    onClick={handleEditWithAI}
                    disabled={isEditing || !editingInstruction.trim()}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: isEditing ? '#ccc' : 'var(--color-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: isEditing ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isEditing ? '編集中...' : 'AI編集 (⌘+Enter)'}
                  </button>
                </div>
                <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-text-light)' }}>
                  AIにコード編集の指示を出せます。Cmd+Enter（Mac）または Ctrl+Enter（Windows）で実行できます。
                </p>
              </div>
            )}

            {/* Diff表示または通常のエディタ */}
            {showDiff && editedContent !== null ? (
              <div style={{ marginBottom: '16px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600 }}>
                    AI編集結果の差分表示
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleRejectChanges}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f3f4f6',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border-color)',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Udon（元に戻す）
                    </button>
                    <button
                      onClick={handleAcceptChanges}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--color-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Keep（変更を適用）
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    minHeight: '400px',
                  }}
                >
                  <div style={{ height: '400px' }}>
                    <DiffEditor
                      language="html"
                      original={originalContent}
                      modified={editedContent}
                      onMount={(editor: any) => {
                        diffEditorRef.current = editor;
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        readOnly: false,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        renderSideBySide: true,
                        enableSplitViewResizing: true,
                        ignoreTrimWhitespace: false,
                        renderIndicators: true,
                        originalEditable: false,
                        modifiedEditable: true,
                      }}
                    />
                  </div>
                </div>
                <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-light)' }}>
                  <strong>左側（元のコード）</strong>と<strong>右側（AI編集後のコード）</strong>を比較できます。緑色は追加、赤色は削除、黄色は変更された行を示します。
                </p>
              </div>
            ) : (
              /* 通常のコンテンツエディタ */
              <div style={{ marginBottom: '16px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600 }}>
                    コンテンツ（HTML）
                  </label>
                  <button
                    onClick={() => setIsContentFullscreen(true)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      color: 'var(--color-text)',
                      padding: '4px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title="コンテンツエディタを全画面表示"
                  >
                    <FiMaximize2 size={14} />
                    <span>全画面</span>
                  </button>
                </div>
                {isLoading ? (
                  <div style={{
                    height: '400px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '6px',
                    backgroundColor: '#f9fafb',
                  }}>
                    読み込み中...
                  </div>
                ) : useCodeEditor ? (
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
                      onMount={(editor: any) => {
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
                        wordWrap: 'off',
                        formatOnPaste: true,
                        formatOnType: false,
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
                ) : (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      minHeight: '400px',
                      resize: 'vertical',
                    }}
                  />
                )}
                {useCodeEditor && (
                  <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-text-light)', flexShrink: 0 }}>
                    HTMLタグを使用できます（例: &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;など）。タグの自動補完とシンタックスハイライトが有効です。
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* プレビューモード */
          <div style={{ marginBottom: '16px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600 }}>
                プレビュー{showDiff && editedContent ? '（比較表示）' : ''}
              </label>
              <button
                onClick={() => setIsPreviewFullscreen(true)}
                style={{
                  background: 'none',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="プレビューを全画面表示"
              >
                <FiMaximize2 size={14} />
                <span>全画面</span>
              </button>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {showDiff && editedContent ? (
                /* 変更前後の比較プレビュー */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
                  {/* 元のコードのプレビュー */}
                  <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-light)' }}>
                        元のコード
                      </span>
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '2px 6px', 
                        backgroundColor: '#f3f4f6', 
                        borderRadius: '4px',
                        color: 'var(--color-text-light)'
                      }}>
                        変更前
                      </span>
                    </div>
                    <div
                      style={{
                        border: '2px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '24px',
                        backgroundColor: '#fff',
                        flex: 1,
                        overflow: 'auto',
                        color: 'var(--color-text)',
                        lineHeight: '1.8',
                        fontSize: '14px',
                        minHeight: 0,
                      }}
                      className="page-content"
                      dangerouslySetInnerHTML={{ __html: originalPreviewHTML }}
                    />
                  </div>
                  {/* 変更後のコードのプレビュー */}
                  <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-light)' }}>
                        AI編集後
                      </span>
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '2px 6px', 
                        backgroundColor: '#dbeafe', 
                        borderRadius: '4px',
                        color: '#1e40af'
                      }}>
                        変更後
                      </span>
                    </div>
                    <div
                      style={{
                        border: '2px solid #3b82f6',
                        borderRadius: '6px',
                        padding: '24px',
                        backgroundColor: '#fff',
                        flex: 1,
                        overflow: 'auto',
                        color: 'var(--color-text)',
                        lineHeight: '1.8',
                        fontSize: '14px',
                        minHeight: 0,
                      }}
                      className="page-content"
                      dangerouslySetInnerHTML={{ __html: editedPreviewHTML || '' }}
                    />
                  </div>
                </div>
              ) : (
                /* 通常のプレビュー */
                <div
                  style={{
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '6px',
                    padding: '24px',
                    backgroundColor: '#fff',
                    flex: 1,
                    overflow: 'auto',
                    color: 'var(--color-text)',
                    lineHeight: '1.8',
                    fontSize: '14px',
                    minHeight: 0,
                  }}
                  className="page-content"
                  dangerouslySetInnerHTML={{ __html: originalPreviewHTML }}
                />
              )}
            </div>
            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-light)', flexShrink: 0 }}>
              {showDiff && editedContent 
                ? '左右のプレビューを比較して、Keep（変更を適用）またはUdon（元に戻す）を選択してください。'
                : '実際の表示をプレビューしています。キーメッセージ、サブメッセージ、HTMLコンテンツが統合されて表示されます。'}
            </p>
          </div>
        )}

        </div>
        {/* ボタン（固定位置） */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexShrink: 0, paddingTop: '16px', borderTop: '1px solid #e5e7eb', marginTop: '16px' }}>
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
            disabled={isSaving || isEditing}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.6 : 1,
            }}
            disabled={isSaving || isEditing}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* お気に入りスライド選択モーダル */}
      {showFavoriteSelector && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 3000,
            padding: '20px',
          }}
          onClick={() => setShowFavoriteSelector(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '1400px',
              maxHeight: '90vh',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* ヘッダー */}
            <div
              style={{
                padding: '24px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
                ⭐ お気に入りスライドから選択
              </h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {selectedTemplate && (
                  <button
                    onClick={handleApplySelectedSlide}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.8)';
                    }}
                  >
                    選択
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowFavoriteSelector(false);
                    setSelectedTemplate(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#F3F4F6',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  閉じる
                </button>
              </div>
            </div>

            {/* コンテンツエリア */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '24px',
              }}
            >
              {loadingFavorites ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  読み込み中...
                </div>
              ) : favoriteTemplates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-light)' }}>
                  お気に入り登録されたスライドがありません
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                    gap: '20px',
                  }}
                >
                  {favoriteTemplates.map((template) => {
                    const isSelected = selectedTemplate?.id === template.id;
                    return (
                    <div
                      key={template.id}
                      onClick={() => handleSelectFavoriteSlide(template)}
                      style={{
                        border: isSelected ? '2px solid rgba(59, 130, 246, 1)' : '2px solid #E5E7EB',
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: isSelected ? '#EFF6FF' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#8B5CF6';
                          e.currentTarget.style.backgroundColor = '#FAF5FF';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#E5E7EB';
                          e.currentTarget.style.backgroundColor = '#fff';
                        }
                      }}
                    >
                      {/* テンプレート名と説明 */}
                      <div style={{ marginBottom: '12px' }}>
                        <h3
                          style={{
                            margin: 0,
                            marginBottom: '4px',
                            fontSize: '16px',
                            fontWeight: 600,
                            color: 'var(--color-text)',
                          }}
                        >
                          {template.name}
                        </h3>
                        {template.description && (
                          <p
                            style={{
                              margin: 0,
                              fontSize: '12px',
                              color: 'var(--color-text-light)',
                            }}
                          >
                            {template.description}
                          </p>
                        )}
                      </div>

                      {/* 元のページ情報 */}
                      <div
                        style={{
                          marginBottom: '12px',
                          padding: '8px',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: 'var(--color-text-light)',
                        }}
                      >
                        <div>元のページ: {template.pageTitle}</div>
                        <div>ページID: {template.pageId}</div>
                      </div>

                      {/* プレビュー */}
                      <div
                        style={{
                          flex: 1,
                          minHeight: 0,
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            color: 'var(--color-text-light)',
                            marginBottom: '8px',
                          }}
                        >
                          プレビュー:
                        </div>
                        <div
                          style={{
                            width: '100%',
                            aspectRatio: '16 / 9',
                            position: 'relative',
                            overflow: 'hidden',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '6px',
                            border: '1px solid #E5E7EB',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s',
                          }}
                        >
                          <div style={{
                            width: '100%',
                            height: '100%',
                            overflow: 'hidden',
                            position: 'relative',
                          }}>
                            <div style={{
                              width: '100%',
                              height: '100%',
                              padding: '12px',
                              backgroundColor: '#FFFFFF',
                              transform: 'scale(0.25)',
                              transformOrigin: 'top left',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                            }}>
                              <div style={{
                                width: '400%',
                                height: '400%',
                              }}>
                                <DynamicPage
                                  pageId={template.pageId}
                                  pageNumber={1}
                                  title={template.pageTitle}
                                  content={template.pageContent}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* コンテンツエディタ全画面表示モーダル */}
      {isContentFullscreen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 3000,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
          }}
          onClick={() => setIsContentFullscreen(false)}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#fff' }}>
              コンテンツ（HTML）エディタ全画面表示
            </h3>
            <button
              onClick={() => setIsContentFullscreen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#fff',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <FiMinimize2 size={16} />
              <span>閉じる</span>
            </button>
          </div>
          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '24px',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 120px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {showDiff && editedContent !== null ? (
              /* Diff表示 */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <label style={{ fontSize: '14px', fontWeight: 600 }}>
                    AI編集結果の差分表示
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleRejectChanges}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f3f4f6',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border-color)',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Udon（元に戻す）
                    </button>
                    <button
                      onClick={handleAcceptChanges}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--color-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Keep（変更を適用）
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    flex: 1,
                    minHeight: 0,
                    height: 'calc(100% - 50px)',
                  }}
                >
                  <div style={{ height: '100%' }}>
                    <DiffEditor
                      language="html"
                      original={originalContent}
                      modified={editedContent}
                      onMount={(editor: any) => {
                        diffEditorRef.current = editor;
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        readOnly: false,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        renderSideBySide: true,
                        enableSplitViewResizing: true,
                        ignoreTrimWhitespace: false,
                        renderIndicators: true,
                        originalEditable: false,
                        modifiedEditable: true,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : useCodeEditor ? (
              /* Monaco Editor */
              <div
                style={{
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  flex: 1,
                  minHeight: 0,
                  height: '100%',
                }}
              >
                <MonacoEditor
                  height="calc(100vh - 120px)"
                  language="html"
                  value={content}
                  onChange={(value) => setContent(value || '')}
                  onMount={(editor: any) => {
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
                    wordWrap: 'off',
                    formatOnPaste: true,
                    formatOnType: false,
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
            ) : (
              /* textarea */
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  resize: 'none',
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* プレビュー全画面表示モーダル */}
      {isPreviewFullscreen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 3000,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
          }}
          onClick={() => setIsPreviewFullscreen(false)}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#fff' }}>
              プレビュー全画面表示{showDiff && editedContent ? '（比較表示）' : ''}
            </h3>
            <button
              onClick={() => setIsPreviewFullscreen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#fff',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <FiMinimize2 size={16} />
              <span>閉じる</span>
            </button>
          </div>
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '24px',
              minHeight: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {showDiff && editedContent ? (
              /* 変更前後の比較プレビュー */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%' }}>
                {/* 元のコードのプレビュー */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-light)' }}>
                      元のコード
                    </span>
                    <span style={{ 
                      fontSize: '11px', 
                      padding: '2px 6px', 
                      backgroundColor: '#f3f4f6', 
                      borderRadius: '4px',
                      color: 'var(--color-text-light)'
                    }}>
                      変更前
                    </span>
                  </div>
                  <div
                    style={{
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '24px',
                      backgroundColor: '#fff',
                      flex: 1,
                      overflow: 'auto',
                      color: 'var(--color-text)',
                      lineHeight: '1.8',
                      fontSize: '14px',
                      minHeight: 0,
                    }}
                    className="page-content"
                    dangerouslySetInnerHTML={{ __html: originalPreviewHTML }}
                  />
                </div>
                {/* 変更後のコードのプレビュー */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-light)' }}>
                      AI編集後
                    </span>
                    <span style={{ 
                      fontSize: '11px', 
                      padding: '2px 6px', 
                      backgroundColor: '#dbeafe', 
                      borderRadius: '4px',
                      color: '#1e40af'
                    }}>
                      変更後
                    </span>
                  </div>
                  <div
                    style={{
                      border: '2px solid #3b82f6',
                      borderRadius: '6px',
                      padding: '24px',
                      backgroundColor: '#fff',
                      flex: 1,
                      overflow: 'auto',
                      color: 'var(--color-text)',
                      lineHeight: '1.8',
                      fontSize: '14px',
                      minHeight: 0,
                    }}
                    className="page-content"
                    dangerouslySetInnerHTML={{ __html: editedPreviewHTML || '' }}
                  />
                </div>
              </div>
            ) : (
              /* 通常のプレビュー */
              <div
                style={{
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  padding: '24px',
                  backgroundColor: '#fff',
                  minHeight: '100%',
                  color: 'var(--color-text)',
                  lineHeight: '1.8',
                  fontSize: '14px',
                }}
                className="page-content"
                dangerouslySetInnerHTML={{ __html: originalPreviewHTML }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
