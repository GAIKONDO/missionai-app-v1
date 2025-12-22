'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AIGenerationComparisonView from './AIGenerationComparisonView';

interface DescriptionSectionProps {
  localDescription: string;
  setLocalDescription: (description: string) => void;
  descriptionTextareaId: string;
  isEditingDescription: boolean;
  setIsEditingDescription: (editing: boolean) => void;
  setAIGenerationTarget: (target: 'description' | 'objective' | null) => void;
  setAIGenerationInput: (input: string) => void;
  setSelectedTopicIdsForAI: (ids: string[]) => void;
  setAiSummaryFormat: (format: 'auto' | 'bullet' | 'paragraph' | 'custom') => void;
  setAiSummaryLength: (length: number) => void;
  setAiCustomPrompt: (prompt: string) => void;
  setIsAIGenerationModalOpen: (open: boolean) => void;
  isAIGenerationModalOpen: boolean;
  aiGeneratedTarget: 'description' | 'objective' | null;
  aiGeneratedContent: string | null;
  originalContent: string | null;
  setAiGeneratedContent: (content: string | null) => void;
  setAiGeneratedTarget: (target: 'description' | 'objective' | null) => void;
  setOriginalContent: (content: string | null) => void;
}

export default function DescriptionSection({
  localDescription,
  setLocalDescription,
  descriptionTextareaId,
  isEditingDescription,
  setIsEditingDescription,
  setAIGenerationTarget,
  setAIGenerationInput,
  setSelectedTopicIdsForAI,
  setAiSummaryFormat,
  setAiSummaryLength,
  setAiCustomPrompt,
  setIsAIGenerationModalOpen,
  isAIGenerationModalOpen,
  aiGeneratedTarget,
  aiGeneratedContent,
  originalContent,
  setAiGeneratedContent,
  setAiGeneratedTarget,
  setOriginalContent,
}: DescriptionSectionProps) {
  const handleOpenAIModal = () => {
    setAIGenerationTarget('description');
    setAIGenerationInput('');
    setSelectedTopicIdsForAI([]);
    setAiSummaryFormat('auto');
    setAiSummaryLength(500);
    setAiCustomPrompt('');
    setIsAIGenerationModalOpen(true);
  };

  const handleUndo = () => {
    setLocalDescription(originalContent || '');
    setAiGeneratedContent(null);
    setAiGeneratedTarget(null);
    setOriginalContent(null);
  };

  const handleKeep = () => {
    setAiGeneratedContent(null);
    setAiGeneratedTarget(null);
    setOriginalContent(null);
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontWeight: '600', color: '#374151' }}>
            説明
          </label>
          <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'monospace', backgroundColor: '#F3F4F6', padding: '2px 8px', borderRadius: '4px' }}>
            ID: {descriptionTextareaId}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!isEditingDescription && (
            <button
              onClick={handleOpenAIModal}
              style={{
                padding: '6px 12px',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🤖</span>
              <span>AIで作文</span>
            </button>
          )}
          <button
            onClick={() => {
              setIsEditingDescription(!isEditingDescription);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: isEditingDescription ? '#10B981' : '#6B7280',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {isEditingDescription ? '✓ 完了' : '✏️ 編集'}
          </button>
        </div>
      </div>
      
      {/* AI生成結果の比較ビュー（モーダルが閉じている時のみ表示） */}
      {!isAIGenerationModalOpen && aiGeneratedTarget === 'description' && (
        <AIGenerationComparisonView
          aiGeneratedContent={aiGeneratedContent}
          originalContent={originalContent}
          onUndo={handleUndo}
          onKeep={handleKeep}
        />
      )}
      
      {isEditingDescription ? (
        <textarea
          id={descriptionTextareaId}
          value={localDescription}
          onChange={(e) => setLocalDescription(e.target.value)}
          placeholder="施策の説明を入力（マークダウン記法対応）"
          rows={8}
          style={{
            width: '100%',
            padding: '12px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'monospace',
            resize: 'vertical',
            lineHeight: '1.6',
          }}
        />
      ) : (
        <div
          style={{
            padding: '16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            minHeight: '100px',
          }}
        >
          {localDescription ? (
            <div
              className="markdown-content"
              style={{
                fontSize: '15px',
                lineHeight: '1.8',
                color: '#374151',
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {localDescription}
              </ReactMarkdown>
            </div>
          ) : (
            <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>
              説明が入力されていません。「編集」ボタンから追加してください。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

