'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIIcon, EditIcon } from './Icons';
import { markdownComponents } from '../utils';
import { MONTHS } from '../constants';
import type { MonthTab, MonthContent, TabType } from '../types';

interface MonthSummarySectionProps {
  activeTab: TabType;
  activeSection: string;
  currentSummaryId: string | undefined;
  currentTabData: MonthContent | undefined;
  customTabLabels: Record<TabType, string | undefined>;
  editingMonth: TabType | null;
  editingSection: string | null;
  editingContent: string;
  onSetEditingContent: (content: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEditSummary: (tab: MonthTab) => void;
  onOpenAIGenerationModal: () => void;
}

export default function MonthSummarySection({
  activeTab,
  activeSection,
  currentSummaryId,
  currentTabData,
  customTabLabels,
  editingMonth,
  editingSection,
  editingContent,
  onSetEditingContent,
  onSaveEdit,
  onCancelEdit,
  onStartEditSummary,
  onOpenAIGenerationModal,
}: MonthSummarySectionProps) {
  if (activeSection !== currentSummaryId) {
    return null;
  }

  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ 
            color: '#0066CC', 
            margin: 0,
            fontSize: '1.35em',
            fontWeight: '600',
            letterSpacing: '0.3px',
          }}>
            {(customTabLabels[activeTab] || MONTHS.find(m => m.id === activeTab)?.label)}サマリ
          </h3>
          {currentSummaryId && (
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: '#64748B',
              fontFamily: 'monospace',
              fontWeight: '500',
            }}>
              ID: {currentSummaryId}
            </p>
          )}
        </div>
        {editingMonth === activeTab && editingSection === currentSummaryId ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onSaveEdit}
              style={{
                padding: '4px 12px',
                backgroundColor: '#10B981',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              保存
            </button>
            <button
              onClick={onCancelEdit}
              style={{
                padding: '4px 12px',
                backgroundColor: '#F3F4F6',
                color: '#374151',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              キャンセル
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={onOpenAIGenerationModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: 'transparent',
                color: '#475569',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                opacity: 0.7,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.color = '#3B82F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.opacity = '0.7';
                e.currentTarget.style.color = '#475569';
              }}
              title="AIで作文"
            >
              <AIIcon size={18} color="currentColor" />
            </button>
            <button
              onClick={() => onStartEditSummary(activeTab as MonthTab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: 'transparent',
                color: '#475569',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                opacity: 0.7,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 102, 204, 0.1)';
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.color = '#0066CC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.opacity = '0.7';
                e.currentTarget.style.color = '#475569';
              }}
              title="編集"
            >
              <EditIcon size={18} color="currentColor" />
            </button>
          </div>
        )}
      </div>
      {editingMonth === activeTab && editingSection === currentSummaryId ? (
        <textarea
          value={editingContent}
          onChange={(e) => onSetEditingContent(e.target.value)}
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '12px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'monospace',
            resize: 'vertical',
            lineHeight: '1.6',
          }}
        />
      ) : (
        <div style={{ width: '100%', overflow: 'hidden' }}>
          {currentTabData?.summary ? (
            <div className="markdown-content" style={{ width: '100%', wordBreak: 'break-word' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {currentTabData.summary}
              </ReactMarkdown>
            </div>
          ) : (
            <p style={{ color: '#64748B', fontStyle: 'italic', fontSize: '16px', fontWeight: '500' }}>
              サマリがありません。編集ボタンから追加してください。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

