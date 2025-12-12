'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getContainerById, updateContainer, getConceptContainerById, updateConceptContainer } from '@/lib/containerGeneration';
import { editContainerCodeWithAI } from '@/lib/containerCodeEditing';

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

interface ContainerCodeEditorModalProps {
  isOpen: boolean;
  containerId: string;
  planId: string;
  subMenuId: string;
  onClose: () => void;
  onSaved: () => void;
  modelType: 'gpt' | 'local' | 'cursor';
  selectedModel: string;
}

export default function ContainerCodeEditorModal({
  isOpen,
  containerId,
  planId,
  subMenuId,
  onClose,
  onSaved,
  modelType,
  selectedModel,
}: ContainerCodeEditorModalProps) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [editingInstruction, setEditingInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const monacoEditorRef = useRef<any>(null);

  // コンテナデータを読み込む
  useEffect(() => {
    if (isOpen && containerId) {
      loadContainer();
    }
  }, [isOpen, containerId, planId, subMenuId]);

  const loadContainer = async () => {
    try {
      setIsLoading(true);
      // まず事業計画として試す
      let container = null;
      try {
        container = await getContainerById(planId, containerId, subMenuId);
      } catch (error) {
        // 事業計画で見つからない場合は構想として試す
        try {
          container = await getConceptContainerById(planId, containerId, subMenuId);
        } catch (conceptError) {
          console.error('構想コンテナの読み込みエラー:', conceptError);
        }
      }
      
      if (container) {
        setContent(container.content || '');
        setTitle(container.title || '');
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

  // AIでコードを編集
  const handleEditWithAI = async () => {
    if (!editingInstruction.trim()) {
      alert('編集指示を入力してください');
      return;
    }

    try {
      setIsEditing(true);
      const editedContent = await editContainerCodeWithAI(
        content,
        editingInstruction,
        modelType,
        selectedModel
      );
      setContent(editedContent);
      setEditingInstruction('');
    } catch (error) {
      console.error('コード編集エラー:', error);
      alert('コードの編集に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsEditing(false);
    }
  };

  // 保存
  const handleSave = async () => {
    try {
      setIsSaving(true);
      // まず事業計画として試す
      try {
        await updateContainer(planId, containerId, subMenuId, {
          title,
          content,
        });
      } catch (error) {
        // 事業計画で失敗した場合は構想として試す
        await updateConceptContainer(planId, containerId, subMenuId, {
          title,
          content,
        });
      }
      alert('保存しました');
      onSaved();
      onClose();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '1200px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            コンテナコードエディタ
          </h3>
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

        {/* コンテナID表示 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
            コンテナID
          </label>
          <input
            type="text"
            value={containerId}
            readOnly
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: '#f9fafb',
              color: '#6b7280',
              fontFamily: 'monospace',
            }}
          />
        </div>

        {/* タイトル編集 */}
        <div style={{ marginBottom: '16px' }}>
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

        {/* AI編集指示 */}
        <div style={{ marginBottom: '16px' }}>
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

        {/* コードエディタ */}
        <div style={{ marginBottom: '16px', flex: 1, minHeight: '400px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>
            HTMLコンテンツ
          </label>
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
          ) : (
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
          )}
        </div>

        {/* ボタン */}
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
    </div>
  );
}
