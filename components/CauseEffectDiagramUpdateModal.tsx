'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { updateCauseEffectDiagramWithText } from '@/lib/causeEffectDiagramUpdate';
import { saveFocusInitiative, getFocusInitiativeByCauseEffectDiagramId } from '@/lib/orgApi';
import type { FocusInitiative } from '@/lib/orgApi';
import InitiativeCauseEffectDiagram from '@/components/InitiativeCauseEffectDiagram';

// Monaco Editorを動的インポート（SSRを回避）
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { 
  ssr: false,
  loading: () => (
    <div style={{ 
      height: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #E5E7EB',
      borderRadius: '6px',
      backgroundColor: '#f9fafb',
      color: '#6B7280',
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
        border: '1px solid #E5E7EB',
        borderRadius: '6px',
        backgroundColor: '#f9fafb',
        color: '#6B7280',
      }}>
        Diffエディターを読み込み中...
      </div>
    ),
  }
) as any;

interface CauseEffectDiagramUpdateModalProps {
  isOpen: boolean;
  causeEffectDiagramId: string;
  initiative: FocusInitiative;
  onClose: () => void;
  onUpdated: () => void;
  modelType?: 'gpt' | 'local' | 'cursor';
  selectedModel?: string;
}

export default function CauseEffectDiagramUpdateModal({
  isOpen,
  causeEffectDiagramId,
  initiative,
  onClose,
  onUpdated,
  modelType = 'gpt',
  selectedModel = 'gpt-4.1-mini',
}: CauseEffectDiagramUpdateModalProps) {
  const [meetingNoteText, setMeetingNoteText] = useState('');
  const [originalCode, setOriginalCode] = useState('');
  const [updatedCode, setUpdatedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const monacoEditorRef = useRef<any>(null);

  // 特性要因図のデータ構造をJSONコードとして生成（中央スパインを明示的に含める）
  const generateDiagramCode = (init: FocusInitiative): string => {
    try {
      const code = JSON.stringify({
        // 中央線（スパイン）- データ構造に明示的に定義
        spine: {
          id: 'spine',
          label: init.title || '特性要因図',
          type: 'spine',
        },
        // 手法（左側の枝）
        method: init.method || [],
        // 手段（右側の枝）
        means: init.means || [],
        // 目標（右端のノード）
        objective: init.objective || '',
        // メタデータ
        title: init.title || '',
        description: init.description || '',
      }, null, 2);
      console.log('✅ [generateDiagramCode] コード生成成功（中央スパイン含む）:', code);
      return code;
    } catch (error) {
      console.error('❌ [generateDiagramCode] エラー:', error);
      return JSON.stringify({
        spine: {
          id: 'spine',
          label: '特性要因図',
          type: 'spine',
        },
        method: [],
        means: [],
        objective: '',
        title: '',
        description: '',
      }, null, 2);
    }
  };

  // コードから注力施策オブジェクトを生成
  const parseCodeToInitiative = (code: string): FocusInitiative | null => {
    try {
      const parsed = JSON.parse(code);
      return {
        ...initiative,
        method: parsed.method || [],
        means: parsed.means || [],
        objective: parsed.objective || '',
      };
    } catch (error) {
      console.error('コードパースエラー:', error);
      return null;
    }
  };

  // モーダルが開いたときに初期コードを設定
  useEffect(() => {
    if (isOpen && initiative) {
      console.log('🔍 [CauseEffectDiagramUpdateModal] 初期化:', { initiative, causeEffectDiagramId });
      const code = generateDiagramCode(initiative);
      console.log('📝 [CauseEffectDiagramUpdateModal] 生成されたコード:', code);
      setOriginalCode(code);
      setUpdatedCode(code);
      setMeetingNoteText('');
      setShowDiff(false);
      setHasUpdate(false);
      setViewMode('code');
    }
  }, [isOpen, initiative, causeEffectDiagramId]);

  // AI更新を実行
  const handleAIUpdate = async () => {
    if (!meetingNoteText.trim()) {
      alert('議事録の内容を入力してください。');
      return;
    }

    setIsLoading(true);
    try {
      // AIを使って特性要因図を更新
      const updateResult = await updateCauseEffectDiagramWithText(
        causeEffectDiagramId,
        meetingNoteText,
        modelType,
        selectedModel,
        initiative
      );

      // 更新結果をコードに変換
      const updatedInitiative = {
        ...initiative,
        method: updateResult.method,
        means: updateResult.means,
        objective: updateResult.objective,
      };
      const newCode = generateDiagramCode(updatedInitiative);
      setUpdatedCode(newCode);
      setShowDiff(true);
      setHasUpdate(true);
    } catch (error: any) {
      console.error('AI更新エラー:', error);
      alert(`更新に失敗しました: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Keep（更新を保持）
  const handleKeep = async () => {
    try {
      // 更新されたコードをパースして注力施策を更新
      const updatedData = JSON.parse(updatedCode);
      
      await saveFocusInitiative({
        ...initiative,
        method: updatedData.method,
        means: updatedData.means,
        objective: updatedData.objective,
      });

      onUpdated();
      onClose();
    } catch (error: any) {
      console.error('保存エラー:', error);
      alert(`保存に失敗しました: ${error.message || error}`);
    }
  };

  // Undo（元に戻す）
  const handleUndo = () => {
    setUpdatedCode(originalCode);
    setShowDiff(false);
    setHasUpdate(false);
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
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '1400px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#111827' }}>
              特性要因図を更新
            </h2>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#6B7280' }}>
              ユニークID: <code style={{ backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>{causeEffectDiagramId}</code>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#6B7280',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* 議事録入力 */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
              議事録の内容
            </label>
            <textarea
              value={meetingNoteText}
              onChange={(e) => setMeetingNoteText(e.target.value)}
              placeholder="議事録の内容を入力してください。この内容を分析して特性要因図を更新します。"
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
            <button
              onClick={handleAIUpdate}
              disabled={isLoading || !meetingNoteText.trim()}
              style={{
                marginTop: '12px',
                padding: '10px 20px',
                backgroundColor: isLoading || !meetingNoteText.trim() ? '#D1D5DB' : '#3B82F6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isLoading || !meetingNoteText.trim() ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              {isLoading ? '更新中...' : 'AIで更新'}
            </button>
          </div>

          {/* コードエディター / Diff表示 / プレビュー */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* 表示モード切り替えタブ */}
                {!showDiff && (
                  <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '6px' }}>
                    <button
                      onClick={() => setViewMode('code')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: viewMode === 'code' ? '#FFFFFF' : 'transparent',
                        color: viewMode === 'code' ? '#111827' : '#6B7280',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: viewMode === 'code' ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: viewMode === 'code' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                      }}
                    >
                      コード
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: viewMode === 'preview' ? '#FFFFFF' : 'transparent',
                        color: viewMode === 'preview' ? '#111827' : '#6B7280',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: viewMode === 'preview' ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: viewMode === 'preview' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                      }}
                    >
                      プレビュー
                    </button>
                  </div>
                )}
                {showDiff && (
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                    更新前と更新後の比較
                  </label>
                )}
              </div>
              {hasUpdate && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleUndo}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#F3F4F6',
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Undo
                  </button>
                  <button
                    onClick={handleKeep}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Keep
                  </button>
                </div>
              )}
            </div>
            
            <div style={{ flex: 1, minHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
              {showDiff ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* タブ切り替え */}
                  <div style={{ display: 'flex', gap: '4px', padding: '12px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                    <button
                      onClick={() => setViewMode('code')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: viewMode === 'code' ? '#FFFFFF' : 'transparent',
                        color: viewMode === 'code' ? '#111827' : '#6B7280',
                        border: viewMode === 'code' ? '1px solid #E5E7EB' : '1px solid transparent',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: viewMode === 'code' ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      コード比較
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: viewMode === 'preview' ? '#FFFFFF' : 'transparent',
                        color: viewMode === 'preview' ? '#111827' : '#6B7280',
                        border: viewMode === 'preview' ? '1px solid #E5E7EB' : '1px solid transparent',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: viewMode === 'preview' ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      プレビュー比較
                    </button>
                  </div>
                  {/* コンテンツ */}
                  {viewMode === 'code' ? (
                    <DiffEditor
                      height="500px"
                      language="json"
                      original={originalCode}
                      modified={updatedCode}
                      theme="vs"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        readOnly: true,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        renderSideBySide: true,
                      }}
                    />
                  ) : (
                    <div style={{ display: 'flex', gap: '16px', padding: '20px', height: '500px', overflow: 'auto' }}>
                      <div style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: '6px', padding: '16px', backgroundColor: '#F9FAFB' }}>
                        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>更新前</div>
                        {(() => {
                          const previewInitiative = parseCodeToInitiative(originalCode);
                          if (previewInitiative) {
                            return (
                              <InitiativeCauseEffectDiagram
                                width={1000}
                                height={600}
                                initiative={previewInitiative}
                              />
                            );
                          } else {
                            return (
                              <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
                                特性要因図がありません
                              </div>
                            );
                          }
                        })()}
                      </div>
                      <div style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: '6px', padding: '16px', backgroundColor: '#F9FAFB' }}>
                        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>更新後</div>
                        {(() => {
                          const previewInitiative = parseCodeToInitiative(updatedCode);
                          if (previewInitiative) {
                            return (
                              <InitiativeCauseEffectDiagram
                                width={1000}
                                height={600}
                                initiative={previewInitiative}
                              />
                            );
                          } else {
                            return (
                              <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
                                特性要因図がありません
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : viewMode === 'code' ? (
                <>
                  {updatedCode ? (
                    <MonacoEditor
                      height="500px"
                      language="json"
                      value={updatedCode}
                      onChange={(value) => setUpdatedCode(value || '')}
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
                        wordWrap: 'on',
                        formatOnPaste: true,
                        formatOnType: false,
                        autoIndent: 'full',
                        bracketPairColorization: { enabled: true },
                        colorDecorators: true,
                        insertSpaces: true,
                        detectIndentation: true,
                      }}
                    />
                  ) : (
                    <div style={{
                      height: '500px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6B7280',
                      fontSize: '14px',
                    }}>
                      {isOpen && initiative ? 'コードを読み込み中...' : 'データがありません'}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '20px', height: '500px', overflow: 'auto' }}>
                  {(() => {
                    const previewInitiative = parseCodeToInitiative(updatedCode);
                    if (previewInitiative) {
                      return (
                        <InitiativeCauseEffectDiagram
                          width={1000}
                          height={600}
                          initiative={previewInitiative}
                        />
                      );
                    } else {
                      return (
                        <div style={{
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#EF4444',
                          fontSize: '14px',
                        }}>
                          コードの形式が正しくありません。JSON形式で入力してください。
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
