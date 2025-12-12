/**
 * AIページ生成コンポーネント（刷新版）
 * モダンなUIとエビデンス参照機能を追加
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { generatePageFromSimilar, generatePageFromTemplate, getAvailableOllamaModels, generateCursorPrompt, CursorPromptConfig } from '@/lib/pageGeneration';
import { getUserTemplates, PageTemplate } from '@/lib/pageTemplates';
import PageTemplateManager from './PageTemplateManager';
import TemplateSelector from './TemplateSelector';
import dynamic from 'next/dynamic';
import { ref, uploadBytes, getDownloadURL } from '@/lib/localFirebase';
import { auth } from '@/lib/localFirebase';

// DynamicPageを動的インポート（SSRを回避）
const DynamicPage = dynamic(
  () => import('./DynamicPage'),
  { ssr: false }
);

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

interface EvidenceItem {
  id: string;
  type: 'url' | 'markdown' | 'image' | 'text';
  content: string;
  file?: File;
  fileName?: string;
}

interface GeneratePageFromSimilarProps {
  serviceId?: string;
  conceptId?: string;
  planId?: string;
  subMenuId: string;
  onClose: () => void;
  onPageGenerated: (title: string, content: string) => void;
}

export default function GeneratePageFromSimilar({
  serviceId,
  conceptId,
  planId,
  subMenuId,
  onClose,
  onPageGenerated,
}: GeneratePageFromSimilarProps) {
  const [query, setQuery] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [referencePages, setReferencePages] = useState<Array<{ pageId: string; similarity: number; title?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplate | null>(null);
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // エビデンス関連の状態
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'evidence'>('basic');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markdownInputRef = useRef<HTMLInputElement>(null);
  
  // ページ生成用の画像（生成されたページに配置される画像）
  const [pageImages, setPageImages] = useState<Array<{ id: string; file: File; preview: string; uploadedUrl?: string }>>([]);
  const pageImageInputRef = useRef<HTMLInputElement>(null);
  
  // 詳細テキスト（基本設定で直接入力）
  const [detailText, setDetailText] = useState('');
  
  // モデルタイプ選択（GPT/ローカル/Cursor）
  const [modelType, setModelType] = useState<'gpt' | 'local' | 'cursor'>('gpt');
  
  // Cursor用プロンプト
  const [cursorPrompt, setCursorPrompt] = useState<string>('');
  const [showCursorPrompt, setShowCursorPrompt] = useState(false);
  
  // AIモデル選択（デフォルト: gpt-4.1-mini）
  const [selectedModel, setSelectedModel] = useState('gpt-4.1-mini');
  
  // GPTモデルリスト
  const gptModels = [
    { value: 'gpt-5.1', label: 'gpt-5.1', inputPrice: '$1.25', outputPrice: '$10.00' },
    { value: 'gpt-5', label: 'gpt-5', inputPrice: '$1.25', outputPrice: '$10.00' },
    { value: 'gpt-5-mini', label: 'gpt-5-mini', inputPrice: '$0.25', outputPrice: '$2.00' },
    { value: 'gpt-5-nano', label: 'gpt-5-nano', inputPrice: '$0.05', outputPrice: '$0.40' },
    { value: 'gpt-5.1-chat-latest', label: 'gpt-5.1-chat-latest', inputPrice: '$1.25', outputPrice: '$10.00' },
    { value: 'gpt-5-chat-latest', label: 'gpt-5-chat-latest', inputPrice: '$1.25', outputPrice: '$10.00' },
    { value: 'gpt-5.1-codex', label: 'gpt-5.1-codex', inputPrice: '$1.25', outputPrice: '$10.00' },
    { value: 'gpt-5-codex', label: 'gpt-5-codex', inputPrice: '$1.25', outputPrice: '$10.00' },
    { value: 'gpt-5-pro', label: 'gpt-5-pro', inputPrice: '$15.00', outputPrice: '$120.00' },
    { value: 'gpt-4.1', label: 'gpt-4.1', inputPrice: '$2.00', outputPrice: '$8.00' },
    { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini', inputPrice: '$0.40', outputPrice: '$1.60' },
    { value: 'gpt-4.1-nano', label: 'gpt-4.1-nano', inputPrice: '$0.10', outputPrice: '$0.40' },
    { value: 'gpt-4o', label: 'gpt-4o', inputPrice: '$2.50', outputPrice: '$10.00' },
  ];
  
  // ローカルモデルリスト（Ollamaから動的に取得）
  const [localModels, setLocalModels] = useState<Array<{ value: string; label: string; inputPrice: string; outputPrice: string }>>([]);
  const [loadingLocalModels, setLoadingLocalModels] = useState(false);
  
  // 現在選択されているモデルリスト
  const availableModels = modelType === 'gpt' ? gptModels : localModels;
  
  // モデルタイプが変更されたら、デフォルトモデルを設定
  useEffect(() => {
    if (modelType === 'gpt') {
      setSelectedModel('gpt-4.1-mini');
    } else if (modelType === 'local') {
      // ローカルモデルが読み込まれたら最初のモデルを選択
      if (localModels.length > 0) {
        setSelectedModel(localModels[0].value);
      }
    }
    // Cursorモードの場合はモデル選択は不要
  }, [modelType, localModels]);
  
  // ローカルモデルタイプが選択されたときに、Ollamaから利用可能なモデルを取得
  useEffect(() => {
    if (modelType === 'local') {
      loadAvailableLocalModels();
    }
  }, [modelType]);
  
  // Ollamaから利用可能なモデル一覧を取得
  const loadAvailableLocalModels = async () => {
    setLoadingLocalModels(true);
    try {
      const models = await getAvailableOllamaModels();
      if (models.length > 0) {
        const formattedModels = models.map(model => {
          // モデル名をフォーマット（例: "qwen2.5:7b" -> "Qwen 2.5 7B"）
          let label = model.name;
          if (model.name.includes(':')) {
            const [name, tag] = model.name.split(':');
            // 名前の最初の文字を大文字に
            const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
            // 数字の前にスペースを追加（例: "qwen2.5" -> "Qwen 2.5"）
            const spacedName = formattedName.replace(/([a-z])(\d)/g, '$1 $2');
            if (tag === 'latest') {
              label = `${spacedName} (Latest)`;
            } else {
              // タグを大文字に（例: "7b" -> "7B"）
              const formattedTag = tag.replace(/(\d)([a-z])/g, (match, num, letter) => `${num}${letter.toUpperCase()}`);
              label = `${spacedName} ${formattedTag}`;
            }
          } else {
            // コロンがない場合は最初の文字を大文字に
            label = model.name.charAt(0).toUpperCase() + model.name.slice(1);
          }
          
          return {
            value: model.name,
            label: label,
            inputPrice: '無料',
            outputPrice: '無料',
          };
        });
        setLocalModels(formattedModels);
        // 最初のモデルを選択
        if (formattedModels.length > 0) {
          setSelectedModel(formattedModels[0].value);
        }
      } else {
        // モデルが見つからない場合は空配列を設定
        setLocalModels([]);
      }
    } catch (error) {
      console.error('ローカルモデルの取得エラー:', error);
      setLocalModels([]);
    } finally {
      setLoadingLocalModels(false);
    }
  };

  // テンプレート一覧を読み込む
  useEffect(() => {
    if (useTemplate) {
      loadTemplates();
    }
  }, [useTemplate, planId, conceptId]);

  // 選択されたテンプレートの情報を取得
  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      setSelectedTemplate(template || null);
    } else {
      setSelectedTemplate(null);
    }
  }, [selectedTemplateId, templates]);

  const loadTemplates = async () => {
    try {
      const loadedTemplates = await getUserTemplates(planId, conceptId);
      setTemplates(loadedTemplates);
    } catch (err) {
      console.error('テンプレート読み込みエラー:', err);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setShowTemplateSelector(false);
  };

  // エビデンス追加
  const addEvidence = (type: EvidenceItem['type']) => {
    const newItem: EvidenceItem = {
      id: `evidence-${Date.now()}-${Math.random()}`,
      type,
      content: '',
    };
    setEvidenceItems([...evidenceItems, newItem]);
  };

  // エビデンス削除
  const removeEvidence = (id: string) => {
    setEvidenceItems(evidenceItems.filter(item => item.id !== id));
  };

  // エビデンス更新
  const updateEvidence = (id: string, updates: Partial<EvidenceItem>) => {
    setEvidenceItems(evidenceItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  // ファイル選択ハンドラ
  const handleFileSelect = (type: 'markdown' | 'image', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const newItem: EvidenceItem = {
        id: `evidence-${Date.now()}-${Math.random()}`,
        type,
        content: type === 'markdown' ? content : '',
        file,
        fileName: file.name,
      };
      setEvidenceItems([...evidenceItems, newItem]);
    };
    
    if (type === 'markdown') {
      reader.readAsText(file);
    } else {
      // 画像の場合はURLを生成
      const imageUrl = URL.createObjectURL(file);
      const newItem: EvidenceItem = {
        id: `evidence-${Date.now()}-${Math.random()}`,
        type: 'image',
        content: imageUrl,
        file,
        fileName: file.name,
      };
      setEvidenceItems([...evidenceItems, newItem]);
    }
  };

  // 画像アップロード処理
  const uploadImage = async (file: File): Promise<string> => {
    if (!auth?.currentUser) {
      throw new Error('認証が必要です');
    }
    // Tauri環境ではFirebase Storageは使用できないため、エラーメッセージを表示
    throw new Error('Tauri環境では画像のアップロード機能は使用できません。ローカルファイルシステムを使用してください。');
  };

  // エビデンスをGPT用のテキストに変換
  const formatEvidenceForGPT = async (): Promise<string> => {
    const evidenceTexts: string[] = [];
    
    // 基本設定の詳細テキストを追加
    if (detailText.trim()) {
      evidenceTexts.push(`【詳細情報】\n${detailText.trim()}`);
    }
    
    // エビデンス参照タブのエビデンスを追加
    for (const item of evidenceItems) {
      switch (item.type) {
        case 'url':
          evidenceTexts.push(`【参照URL】\n${item.content}`);
          break;
        case 'markdown':
          evidenceTexts.push(`【Markdownファイル: ${item.fileName || '無題'}】\n${item.content}`);
          break;
        case 'image':
          let imageUrl = item.content;
          if (item.file) {
            try {
              imageUrl = await uploadImage(item.file);
            } catch (err) {
              console.error('画像アップロードエラー:', err);
              evidenceTexts.push(`【画像: ${item.fileName || '無題'}】\n（画像のアップロードに失敗しました）`);
              continue;
            }
          }
          evidenceTexts.push(`【画像: ${item.fileName || '無題'}】\n画像URL: ${imageUrl}`);
          break;
        case 'text':
          // 基本設定に移動したため、エビデンス参照タブのテキストは無視
          break;
      }
    }

    return evidenceTexts.length > 0 
      ? `\n\n【参照エビデンス】\n${evidenceTexts.join('\n\n---\n\n')}`
      : '';
  };

  // ページ生成用の画像をアップロード
  const uploadPageImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const pageImage of pageImages) {
      if (pageImage.uploadedUrl) {
        uploadedUrls.push(pageImage.uploadedUrl);
        continue;
      }
      
      try {
        const url = await uploadImage(pageImage.file);
        uploadedUrls.push(url);
        // アップロード済みURLを保存
        setPageImages(prev => prev.map(img => 
          img.id === pageImage.id ? { ...img, uploadedUrl: url } : img
        ));
      } catch (err) {
        console.error('画像アップロードエラー:', err);
        throw new Error(`画像「${pageImage.file.name}」のアップロードに失敗しました`);
      }
    }
    
    return uploadedUrls;
  };

  // 生成されたコンテンツに画像を挿入
  // 不要なコードブロック記号を削除
  const cleanContent = (content: string): string => {
    return content
      .replace(/^```html\s*/gm, '')
      .replace(/^```\s*$/gm, '')
      .replace(/```html/g, '')
      .replace(/```/g, '')
      .trim();
  };

  const insertImagesIntoContent = (content: string, imageUrls: string[]): string => {
    if (imageUrls.length === 0) return content;
    
    // 画像を適切な位置に挿入（段落の後やセクションの終わりなど）
    let modifiedContent = content;
    
    // 各画像をimgタグとして生成
    const imageTags = imageUrls.map((url, index) => 
      `\n<img src="${url}" alt="画像${index + 1}" style="max-width: 100%; height: auto; display: block; margin: 16px 0;" />\n`
    ).join('');
    
    // 最初の</p>タグの後に画像を挿入（なければ最後に追加）
    const firstParagraphEnd = modifiedContent.indexOf('</p>');
    if (firstParagraphEnd !== -1) {
      modifiedContent = modifiedContent.slice(0, firstParagraphEnd + 4) + imageTags + modifiedContent.slice(firstParagraphEnd + 4);
    } else {
      // </p>タグがない場合は最後に追加
      modifiedContent = modifiedContent + imageTags;
    }
    
    return modifiedContent;
  };

  const handleGenerate = async () => {
    if (!query.trim()) {
      setError('ページのテーマを入力してください');
      return;
    }

    if (useTemplate && !selectedTemplateId) {
      setError('テンプレートを選択してください');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedTitle('');
    setGeneratedContent('');
    setReferencePages([]);

    try {
      // Cursorモードの場合はプロンプトを生成して表示
      if (modelType === 'cursor') {
        const evidenceText = await formatEvidenceForGPT();
        
        // 既存ページの情報を取得（参考用）
        const existingPages: Array<{ title: string; content: string }> = [];
        // TODO: 既存ページの情報を取得して追加
        
        const promptConfig: CursorPromptConfig = {
          theme: query,
          evidenceText: evidenceText || undefined,
          templateId: useTemplate ? (selectedTemplateId || undefined) : undefined,
          subMenuId,
          serviceId,
          conceptId,
          planId,
          existingPages,
        };
        
        const prompt = generateCursorPrompt(promptConfig);
        setCursorPrompt(prompt);
        setShowCursorPrompt(true);
        setGenerating(false);
        return;
      }
      
      // エビデンスをフォーマット（テーマとは分離）
      const evidenceText = await formatEvidenceForGPT();
      
      // ページ生成用の画像をアップロード
      let imageUrls: string[] = [];
      if (pageImages.length > 0) {
        imageUrls = await uploadPageImages();
      }

      if (useTemplate && selectedTemplateId) {
        const result = await generatePageFromTemplate(
          query, // テーマのみを渡す
          selectedTemplateId,
          subMenuId,
          selectedModel,
          evidenceText // エビデンスは別パラメータで渡す
        );

        // 不要なコードブロック記号を削除してから画像を挿入
        const cleanedContent = cleanContent(result.content);
        const contentWithImages = insertImagesIntoContent(cleanedContent, imageUrls);
        
        setGeneratedTitle(result.title);
        setGeneratedContent(contentWithImages);
        setReferencePages([{
          pageId: result.template.pageId,
          similarity: 1,
          title: result.template.pageTitle,
        }]);
      } else {
        const result = await generatePageFromSimilar(
          query, // テーマのみを渡す
          subMenuId,
          planId,
          conceptId,
          undefined,
          selectedModel,
          evidenceText // エビデンスは別パラメータで渡す
        );

        // 不要なコードブロック記号を削除してから画像を挿入
        const cleanedContent = cleanContent(result.content);
        const contentWithImages = insertImagesIntoContent(cleanedContent, imageUrls);

        setGeneratedTitle(result.title);
        setGeneratedContent(contentWithImages);
        setReferencePages(result.referencePages);
      }
      
      // 生成完了後、プレビューモーダルを表示
      setShowPreviewModal(true);
    } catch (err) {
      console.error('ページ生成エラー:', err);
      setError(err instanceof Error ? err.message : 'ページの生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  const handleUseGenerated = () => {
    if (generatedTitle && generatedContent) {
      onPageGenerated(generatedTitle, generatedContent);
      onClose();
    }
  };

  return (
    <div 
      data-generate-page-form
      style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      {/* ヘッダー */}
      <div style={{
        background: 'linear-gradient(135deg, #0066CC 0%, #00D9A5 100%)',
        padding: '24px 32px',
        color: '#fff',
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '28px', 
          fontWeight: 700, 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          letterSpacing: '0.5px',
        }}>
          <span style={{ fontSize: '32px', filter: 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.2))' }}>🤖</span>
          AIでページを生成
        </h2>
        <p style={{ 
          margin: '8px 0 0', 
          fontSize: '16px', 
          fontWeight: 500,
          opacity: 1,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
          color: '#FFFFFF',
          letterSpacing: '0.3px',
        }}>
          過去のページやフォーマットを参考に、新しいページを自動生成します
        </p>
      </div>

      {/* タブ */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #E5E7EB',
        backgroundColor: '#F9FAFB',
      }}>
        <button
          onClick={() => setActiveTab('basic')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            backgroundColor: activeTab === 'basic' ? '#fff' : 'transparent',
            color: activeTab === 'basic' ? '#0066CC' : '#6B7280',
            fontSize: '14px',
            fontWeight: activeTab === 'basic' ? 600 : 400,
            cursor: 'pointer',
            borderBottom: activeTab === 'basic' ? '2px solid #0066CC' : '2px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          📝 基本設定
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            backgroundColor: activeTab === 'evidence' ? '#fff' : 'transparent',
            color: activeTab === 'evidence' ? '#0066CC' : '#6B7280',
            fontSize: '14px',
            fontWeight: activeTab === 'evidence' ? 600 : 400,
            cursor: 'pointer',
            borderBottom: activeTab === 'evidence' ? '2px solid #0066CC' : '2px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          📎 エビデンス参照 {evidenceItems.length > 0 && `(${evidenceItems.length})`}
        </button>
      </div>

      {/* コンテンツエリア */}
      <div style={{ padding: '32px' }}>
        {/* 基本設定タブ */}
        {activeTab === 'basic' && (
          <div>
            {/* ページのテーマ */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '16px',
                marginBottom: '8px',
                flexWrap: 'wrap',
              }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#374151',
                }}>
                  ページのテーマ <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontSize: '14px', 
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: '#374151',
                }}>
                  <input
                    type="checkbox"
                    checked={useTemplate}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseTemplate(checked);
                      if (checked) {
                        // チェックしたら自動的にテンプレート選択モーダルを開く
                        setShowTemplateSelector(true);
                      } else {
                        setSelectedTemplateId(null);
                        setSelectedTemplate(null);
                      }
                    }}
                    style={{ 
                      width: '18px', 
                      height: '18px', 
                      cursor: 'pointer',
                      accentColor: '#0066CC',
                    }}
                  />
                  <span>テンプレートを使用する</span>
                </label>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !generating) {
                    handleGenerate();
                  }
                }}
                placeholder="例: AIファーストカンパニーとは"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '15px',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0066CC';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
                disabled={generating}
              />
              
              {/* 詳細テキスト入力 */}
              <div style={{ marginTop: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#374151',
                }}>
                  詳細内容（任意）
                </label>
                <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                  ページ生成時に参照する詳細な情報を入力できます
                </p>
                <textarea
                  value={detailText}
                  onChange={(e) => setDetailText(e.target.value)}
                  placeholder="例: このページでは、AIファーストカンパニーの定義、特徴、実現方法について詳しく説明します..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0066CC';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                  }}
                  disabled={generating}
                />
              </div>
              
              {/* モデルタイプ選択 */}
              <div style={{ marginTop: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#374151',
                }}>
                  🔧 モデルタイプ
                </label>
                <div style={{ 
                  display: 'flex', 
                  gap: '12px',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    border: `2px solid ${modelType === 'gpt' ? '#0066CC' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    backgroundColor: modelType === 'gpt' ? '#E6F2FF' : '#fff',
                    cursor: generating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    flex: 1,
                    minWidth: '120px',
                  }}>
                    <input
                      type="radio"
                      name="modelType"
                      value="gpt"
                      checked={modelType === 'gpt'}
                      onChange={(e) => setModelType(e.target.value as 'gpt' | 'local' | 'cursor')}
                      disabled={generating}
                      style={{ cursor: generating ? 'not-allowed' : 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>GPT（クラウド）</span>
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    border: `2px solid ${modelType === 'local' ? '#0066CC' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    backgroundColor: modelType === 'local' ? '#E6F2FF' : '#fff',
                    cursor: generating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    flex: 1,
                    minWidth: '120px',
                  }}>
                    <input
                      type="radio"
                      name="modelType"
                      value="local"
                      checked={modelType === 'local'}
                      onChange={(e) => setModelType(e.target.value as 'gpt' | 'local' | 'cursor')}
                      disabled={generating}
                      style={{ cursor: generating ? 'not-allowed' : 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>ローカル（Ollama）</span>
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    border: `2px solid ${modelType === 'cursor' ? '#0066CC' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    backgroundColor: modelType === 'cursor' ? '#E6F2FF' : '#fff',
                    cursor: generating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    flex: 1,
                    minWidth: '120px',
                  }}>
                    <input
                      type="radio"
                      name="modelType"
                      value="cursor"
                      checked={modelType === 'cursor'}
                      onChange={(e) => setModelType(e.target.value as 'gpt' | 'local' | 'cursor')}
                      disabled={generating}
                      style={{ cursor: generating ? 'not-allowed' : 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Cursor（AIアシスタント）</span>
                  </label>
                </div>
                {modelType === 'local' && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#FFF4E6',
                    border: '1px solid #FFD700',
                    borderRadius: '8px',
                    marginBottom: '12px',
                  }}>
                    <p style={{ fontSize: '12px', color: '#856404', margin: 0 }}>
                      ⚠️ ローカルモデルを使用するには、Ollamaが起動している必要があります（デフォルト: http://localhost:11434）
                    </p>
                  </div>
                )}
                {modelType === 'cursor' && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#E6F2FF',
                    border: '1px solid #0066CC',
                    borderRadius: '8px',
                    marginBottom: '12px',
                  }}>
                    <p style={{ fontSize: '12px', color: '#003D7A', margin: 0 }}>
                      💡 Cursorモードでは、既存のコンポーネント構造を理解したプロンプトを生成します。生成されたプロンプトをCursorにコピーして、ページコンポーネントを作成・更新してください。
                    </p>
                  </div>
                )}
              </div>
              
              {/* AIモデル選択（Cursorモードの場合は非表示） */}
              {modelType !== 'cursor' && (
              <div style={{ marginTop: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#374151',
                }}>
                  🤖 使用するAIモデル
                </label>
                <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                  {modelType === 'gpt' 
                    ? 'ページ生成に使用するAIモデルを選択できます（価格は100万トークンあたり）'
                    : 'ローカルで実行するAIモデルを選択できます（Ollamaで利用可能なモデル）'}
                </p>
                {modelType === 'local' && loadingLocalModels && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#F0F9FF',
                    border: '1px solid #3B82F6',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    textAlign: 'center',
                  }}>
                    <p style={{ fontSize: '12px', color: '#1E40AF', margin: 0 }}>
                      🔄 利用可能なモデルを取得中...
                    </p>
                  </div>
                )}
                {modelType === 'local' && !loadingLocalModels && availableModels.length === 0 && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #EF4444',
                    borderRadius: '8px',
                    marginBottom: '12px',
                  }}>
                    <p style={{ fontSize: '12px', color: '#991B1B', margin: 0 }}>
                      ⚠️ 利用可能なローカルモデルが見つかりませんでした。Ollamaが起動しているか確認してください。
                    </p>
                  </div>
                )}
                {availableModels.length > 0 && (
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={generating || loadingLocalModels}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#fff',
                      color: '#374151',
                      cursor: (generating || loadingLocalModels) ? 'not-allowed' : 'pointer',
                      transition: 'border-color 0.2s',
                      opacity: loadingLocalModels ? 0.6 : 1,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0066CC';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB';
                    }}
                  >
                    {availableModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label} (入力: {model.inputPrice} / 出力: {model.outputPrice})
                      </option>
                    ))}
                  </select>
                )}
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px 12px', 
                  backgroundColor: '#F0F9FF', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#0369A1',
                }}>
                  💡 <strong>入力</strong>: プロンプト（質問や指示）のトークン / <strong>出力</strong>: 生成されたテキストのトークン
                </div>
                {/* 概算金額表示 */}
                {(() => {
                  const selectedModelData = availableModels.find(m => m.value === selectedModel);
                  if (!selectedModelData) return null;
                  
                  // ローカルモデルの場合は「無料」と表示
                  if (modelType === 'local') {
                    return (
                      <div style={{ 
                        marginTop: '12px', 
                        padding: '12px 16px', 
                        backgroundColor: '#F0FDF4', 
                        border: '1px solid #86EFAC',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                        }}>
                          <span style={{ color: '#374151', fontWeight: 600 }}>1ページ生成の概算金額:</span>
                          <span style={{ color: '#059669', fontWeight: 700, fontSize: '18px' }}>
                            無料
                          </span>
                        </div>
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#6B7280',
                          marginTop: '4px',
                        }}>
                          ローカルモデルは無料で使用できます
                        </div>
                      </div>
                    );
                  }
                  
                  // 概算トークン数（入力: 2000トークン、出力: 2000トークン）
                  const estimatedInputTokens = 2000;
                  const estimatedOutputTokens = 2000;
                  
                  // 価格から数値を抽出（$記号とカンマを除去）
                  const inputPriceNum = parseFloat(selectedModelData.inputPrice.replace(/[$,]/g, ''));
                  const outputPriceNum = parseFloat(selectedModelData.outputPrice.replace(/[$,]/g, ''));
                  
                  // コスト計算（100万トークンあたりの価格）
                  const inputCost = (estimatedInputTokens / 1000000) * inputPriceNum;
                  const outputCost = (estimatedOutputTokens / 1000000) * outputPriceNum;
                  const totalCost = inputCost + outputCost;
                  
                  return (
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '12px 16px', 
                      backgroundColor: '#F9FAFB', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}>
                        <span style={{ color: '#374151', fontWeight: 600 }}>1ページ生成の概算金額:</span>
                        <span style={{ color: '#059669', fontWeight: 700, fontSize: '18px' }}>
                          ${totalCost < 0.01 ? totalCost.toFixed(6) : totalCost.toFixed(4)}
                        </span>
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#6B7280',
                        marginTop: '4px',
                        lineHeight: '1.5',
                      }}>
                        <div>入力: {estimatedInputTokens.toLocaleString()}トークン × {selectedModelData.inputPrice}/100万 = ${inputCost.toFixed(6)}</div>
                        <div>出力: {estimatedOutputTokens.toLocaleString()}トークン × {selectedModelData.outputPrice}/100万 = ${outputCost.toFixed(6)}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              )}

              {/* ページ生成用の画像アップロード */}
              <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#374151',
                }}>
                  📸 ページに配置する画像（任意）
                </label>
                <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                  生成されたページのコンテンツ内に配置される画像をアップロードできます（複数選択可能）
                </p>
                
                <button
                  onClick={() => pageImageInputRef.current?.click()}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#fff',
                    border: '2px dashed #0066CC',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#0066CC',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E0F2FE';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                  }}
                >
                  🖼️ 画像を追加
                </button>
                
                {/* アップロード済み画像のプレビュー */}
                {pageImages.length > 0 && (
                  <div style={{ 
                    marginTop: '16px', 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                    gap: '12px' 
                  }}>
                    {pageImages.map((img) => (
                      <div
                        key={img.id}
                        style={{
                          position: 'relative',
                          padding: '8px',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                        }}
                      >
                        <img
                          src={img.preview}
                          alt={img.file.name}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            marginBottom: '8px',
                          }}
                        />
                        <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {img.file.name}
                        </div>
                        {img.uploadedUrl && (
                          <div style={{ fontSize: '10px', color: '#10B981', marginBottom: '4px' }}>
                            ✓ アップロード済み
                          </div>
                        )}
                        <button
                          onClick={() => setPageImages(pageImages.filter(i => i.id !== img.id))}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            padding: '4px 8px',
                            backgroundColor: 'rgba(239, 68, 68, 0.9)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '10px',
                            cursor: 'pointer',
                          }}
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* テンプレート使用 */}
            {useTemplate && (
              <div style={{ 
                marginBottom: '24px', 
                padding: '20px', 
                backgroundColor: '#F9FAFB', 
                borderRadius: '8px', 
                border: '1px solid #E5E7EB' 
              }}>
                {!selectedTemplate && (
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <button
                      onClick={() => setShowTemplateSelector(true)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: '#fff',
                        color: '#374151',
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      📋 テンプレートを選択
                    </button>
                    <button
                      onClick={() => setShowTemplateManager(!showTemplateManager)}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: showTemplateManager ? '#0066CC' : '#fff',
                        color: showTemplateManager ? '#fff' : '#374151',
                        border: `2px solid ${showTemplateManager ? '#0066CC' : '#E5E7EB'}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      ⚙️ 管理
                    </button>
                  </div>
                )}
                
                {selectedTemplate && (
                  <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'center',
                  }}>
                    {/* 左側：プレビュー */}
                    <div style={{
                      flex: '0 0 200px',
                      width: '200px',
                    }}>
                      <div style={{
                        width: '100%',
                        aspectRatio: '16 / 9',
                        position: 'relative',
                        overflow: 'hidden',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '6px',
                        border: '1px solid #E5E7EB',
                      }}>
                        <div style={{
                          width: '100%',
                          height: '100%',
                          overflow: 'hidden',
                          position: 'relative',
                        }}>
                          <div style={{
                            width: '100%',
                            height: '100%',
                            padding: '8px',
                            backgroundColor: '#FFFFFF',
                            transform: 'scale(0.2)',
                            transformOrigin: 'top left',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                          }}>
                            <div style={{
                              width: '500%',
                              height: '500%',
                            }}>
                              <DynamicPage
                                pageId={selectedTemplate.pageId}
                                pageNumber={1}
                                title={selectedTemplate.pageTitle}
                                content={selectedTemplate.pageContent}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 中央：解説 */}
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0066CC', marginBottom: '4px' }}>
                        {selectedTemplate.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.5' }}>
                        {selectedTemplate.pageTitle}
                      </div>
                      {selectedTemplate.description && (
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px', lineHeight: '1.4' }}>
                          {selectedTemplate.description}
                        </div>
                      )}
                    </div>
                    
                    {/* 右端：変更ボタン */}
                    <div style={{
                      flex: '0 0 auto',
                    }}>
                      <button
                        onClick={() => setShowTemplateSelector(true)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#fff',
                          color: '#0066CC',
                          border: '1px solid #0066CC',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#E0F2FE';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#fff';
                        }}
                      >
                        変更
                      </button>
                    </div>
                  </div>
                )}

                {showTemplateManager && (
                  <div style={{ marginTop: '16px' }}>
                    <PageTemplateManager
                      planId={planId}
                      conceptId={conceptId}
                      onTemplateSelected={(templateId) => {
                        setSelectedTemplateId(templateId);
                        setShowTemplateManager(false);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* エビデンス参照タブ */}
        {activeTab === 'evidence' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                ページ生成時に参照するエビデンスを追加できます。URL、Markdownファイル、画像、テキストを追加可能です。
              </p>
            </div>

            {/* エビデンス追加ボタン */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '12px',
              marginBottom: '24px',
            }}>
              <button
                onClick={() => addEvidence('url')}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#fff',
                  border: '2px dashed #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0066CC';
                  e.currentTarget.style.backgroundColor = '#E0F2FE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
              >
                🔗 URLを追加
              </button>
              <button
                onClick={() => markdownInputRef.current?.click()}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#fff',
                  border: '2px dashed #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0066CC';
                  e.currentTarget.style.backgroundColor = '#E0F2FE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
              >
                📄 MDファイルを追加
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#fff',
                  border: '2px dashed #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0066CC';
                  e.currentTarget.style.backgroundColor = '#E0F2FE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
              >
                🖼️ 画像を追加
              </button>
            </div>

            {/* エビデンス一覧 */}
            {evidenceItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {evidenceItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '16px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                        {item.type === 'url' && '🔗 URL'}
                        {item.type === 'markdown' && '📄 Markdown'}
                        {item.type === 'image' && '🖼️ 画像'}
                        {item.type === 'text' && '📝 テキスト'}
                        {item.fileName && ` - ${item.fileName}`}
                      </div>
                      <button
                        onClick={() => removeEvidence(item.id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#FEE2E2',
                          color: '#991B1B',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        削除
                      </button>
                    </div>
                    
                    {item.type === 'url' && (
                      <input
                        type="url"
                        value={item.content}
                        onChange={(e) => updateEvidence(item.id, { content: e.target.value })}
                        placeholder="https://example.com"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    )}
                    
                    {item.type === 'text' && (
                      <textarea
                        value={item.content}
                        onChange={(e) => updateEvidence(item.id, { content: e.target.value })}
                        placeholder="詳細な情報を入力してください..."
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                        }}
                      />
                    )}
                    
                    {item.type === 'markdown' && (
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                          ファイル: {item.fileName || '未選択'}
                        </div>
                        <textarea
                          value={item.content}
                          onChange={(e) => updateEvidence(item.id, { content: e.target.value })}
                          placeholder="Markdownコンテンツ..."
                          rows={8}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            resize: 'vertical',
                          }}
                        />
                      </div>
                    )}
                    
                    {item.type === 'image' && (
                      <div>
                        {item.content && (
                          <div style={{ marginBottom: '12px' }}>
                            <img
                              src={item.content}
                              alt={item.fileName || '画像プレビュー'}
                              style={{
                                maxWidth: '100%',
                                maxHeight: '200px',
                                borderRadius: '6px',
                                border: '1px solid #E5E7EB',
                              }}
                            />
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                          ファイル: {item.fileName || '未選択'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            color: '#991B1B',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* 生成されたページのプレビュー */}
        {generatedTitle && generatedContent && (
          <div style={{ marginTop: '32px', padding: '24px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <h4 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
              ✨ 生成されたページ
            </h4>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                タイトル
              </label>
              <input
                type="text"
                value={generatedTitle}
                onChange={(e) => setGeneratedTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                コンテンツ（HTML形式）
              </label>
              <div style={{
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                overflow: 'hidden',
                minHeight: '400px',
              }}>
                <MonacoEditor
                  height="400px"
                  language="html"
                  value={generatedContent}
                  onChange={(value) => setGeneratedContent(value || '')}
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
                  }}
                />
              </div>
            </div>

            {/* 参考ページ表示 */}
            {referencePages.length > 0 && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#E0F2FE', borderRadius: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#0369A1' }}>
                  参考にしたページ ({referencePages.length}件):
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#075985' }}>
                  {referencePages.map((ref, idx) => (
                    <li key={idx}>
                      {ref.title || ref.pageId} (類似度: {(ref.similarity * 100).toFixed(1)}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ファイル入力（非表示） */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileSelect('image', file);
            }
            e.target.value = '';
          }}
        />
        <input
          ref={markdownInputRef}
          type="file"
          accept=".md,.markdown"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileSelect('markdown', file);
            }
            e.target.value = '';
          }}
        />
        <input
          ref={pageImageInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            const newImages = files.map((file, index) => {
              const preview = URL.createObjectURL(file);
              return {
                id: `page-image-${Date.now()}-${index}-${Math.random()}`,
                file,
                preview,
              };
            });
            setPageImages(prev => [...prev, ...newImages]);
            e.target.value = '';
          }}
        />
      </div>

      {/* フッター */}
      <div style={{
        padding: '24px 32px',
        backgroundColor: '#F9FAFB',
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '12px 24px',
            backgroundColor: '#fff',
            color: '#374151',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          disabled={generating}
          onMouseEnter={(e) => {
            if (!generating) {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
          }}
        >
          キャンセル
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!(generatedTitle && generatedContent) && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !query.trim() || (useTemplate && !selectedTemplateId)}
              style={{
                padding: '12px 24px',
                background: generating ? '#9CA3AF' : 'linear-gradient(135deg, #0066CC 0%, #00D9A5 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
            >
              {generating ? '⏳ 生成中...' : '🤖 ページを生成'}
            </button>
          )}
          {generatedTitle && generatedContent && (
            <button
              type="button"
              onClick={handleUseGenerated}
              style={{
                padding: '12px 24px',
                backgroundColor: '#10B981',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#059669';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#10B981';
              }}
            >
              ✅ このページを使用
            </button>
          )}
        </div>
      </div>

      {/* テンプレート選択モーダル */}
      {showTemplateSelector && (
        <TemplateSelector
          planId={planId}
          conceptId={conceptId}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}

      {/* プレビューモーダル */}
      {showPreviewModal && generatedTitle && generatedContent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={() => setShowPreviewModal(false)}
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
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            {/* ヘッダー */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                ✨ 生成されたページのプレビュー
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ×
              </button>
            </div>

            {/* プレビューコンテンツ */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '40px',
              backgroundColor: '#F9FAFB',
            }}>
              <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                backgroundColor: '#fff',
                borderRadius: '8px',
                padding: '40px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}>
                <DynamicPage
                  pageId="preview"
                  pageNumber={1}
                  title={generatedTitle}
                  content={generatedContent}
                />
              </div>
            </div>

            {/* フッター */}
            <div style={{
              padding: '20px 24px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#fff',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
              >
                閉じる
              </button>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  // 生成済みの状態をクリアして「ページを生成」ボタンを再表示
                  setGeneratedTitle('');
                  setGeneratedContent('');
                  setReferencePages([]);
                  // フォームの先頭にスクロール
                  setTimeout(() => {
                    const formElement = document.querySelector('[data-generate-page-form]');
                    if (formElement) {
                      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3B82F6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }}
              >
                🔄 再度作り直す
              </button>
              <button
                onClick={handleUseGenerated}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#10B981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#10B981';
                }}
              >
                ✅ このページを使用
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Cursorプロンプト表示モーダル */}
      {showCursorPrompt && (
        <div style={{
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
          padding: '20px',
        }}
        onClick={() => setShowCursorPrompt(false)}
        >
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 700,
                color: '#111827',
              }}>
                📋 Cursor用プロンプト
              </h2>
              <button
                onClick={() => setShowCursorPrompt(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280',
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
            
            <div style={{
              padding: '24px',
              overflow: 'auto',
              flex: 1,
            }}>
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#E6F2FF',
                border: '1px solid #0066CC',
                borderRadius: '8px',
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#003D7A' }}>
                  💡 以下のプロンプトをCursorにコピーして、ページコンポーネントを作成・更新してください。
                </p>
              </div>
              
              <textarea
                value={cursorPrompt}
                readOnly
                style={{
                  width: '100%',
                  minHeight: '400px',
                  padding: '16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  lineHeight: '1.6',
                  resize: 'vertical',
                  backgroundColor: '#F9FAFB',
                }}
              />
            </div>
            
            <div style={{
              padding: '24px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(cursorPrompt);
                  alert('プロンプトをクリップボードにコピーしました！');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0066CC',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0052A3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#0066CC';
                }}
              >
                📋 コピー
              </button>
              <button
                onClick={() => setShowCursorPrompt(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
