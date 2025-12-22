'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIGenerationComparisonViewProps {
  aiGeneratedContent: string | null;
  originalContent: string | null;
  onUndo: () => void;
  onKeep: () => void;
}

export default function AIGenerationComparisonView({
  aiGeneratedContent,
  originalContent,
  onUndo,
  onKeep,
}: AIGenerationComparisonViewProps) {
  if (!aiGeneratedContent || originalContent == null) {
    return null;
  }

  return (
    <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#F0F9FF', border: '2px solid #3B82F6', borderRadius: '8px' }}>
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF' }}>
          🔄 AI生成結果の比較
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onUndo}
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
            ↶ Undo（元に戻す）
          </button>
          <button
            onClick={onKeep}
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
            ✓ Keep（保持）
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* 既存の内容 */}
        <div>
          <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#6B7280' }}>
            既存の内容
          </div>
          <div
            style={{
              padding: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {originalContent ? (
              <div
                className="markdown-content"
                style={{
                  fontSize: '14px',
                  lineHeight: '1.8',
                  color: '#374151',
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {originalContent}
                </ReactMarkdown>
              </div>
            ) : (
              <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>
                内容がありません
              </p>
            )}
          </div>
        </div>
        {/* AI生成結果 */}
        <div>
          <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#3B82F6' }}>
            AI生成結果
          </div>
          <div
            style={{
              padding: '12px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #3B82F6',
              borderRadius: '6px',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            <div
              className="markdown-content"
              style={{
                fontSize: '14px',
                lineHeight: '1.8',
                color: '#374151',
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {aiGeneratedContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

