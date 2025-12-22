import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TabType, MonthTab, SummaryTab, MonthContent } from '../../types';
import type { Topic } from '@/types/topicMetadata';
import { MONTHS, SUMMARY_TABS } from '../../constants';
import { markdownComponents } from '../../utils';

interface AIGenerationModalProps {
  isOpen: boolean;
  activeTab: TabType;
  monthContents: Record<string, MonthContent>;
  aiModelType: 'gpt' | 'local';
  aiSelectedModel: string;
  availableAiModels: Array<{ value: string; label: string }>;
  loadingAiLocalModels: boolean;
  aiGenerationInput: string;
  selectedTopicIdsForAI: string[];
  selectedSummaryIdsForAI: string[];
  aiSummaryFormat: 'auto' | 'bullet' | 'paragraph' | 'custom';
  aiSummaryLength: number;
  aiCustomPrompt: string;
  isAIGenerating: boolean;
  aiGeneratedContent: string | null;
  originalContent: string | null;
  onSetAiModelType: (type: 'gpt' | 'local') => void;
  onSetAiSelectedModel: (model: string) => void;
  onSetAIGenerationInput: (input: string) => void;
  onSetSelectedTopicIdsForAI: (ids: string[]) => void;
  onSetSelectedSummaryIdsForAI: (ids: string[]) => void;
  onSetAiSummaryFormat: (format: 'auto' | 'bullet' | 'paragraph' | 'custom') => void;
  onSetAiSummaryLength: (length: number) => void;
  onSetAiCustomPrompt: (prompt: string) => void;
  onSetAiGeneratedContent: (content: string | null) => void;
  onSetOriginalContent: (content: string | null) => void;
  onGenerate: () => Promise<void>;
  onApply: () => void;
  onCancel: () => void;
}

export default function AIGenerationModal({
  isOpen,
  activeTab,
  monthContents,
  aiModelType,
  aiSelectedModel,
  availableAiModels,
  loadingAiLocalModels,
  aiGenerationInput,
  selectedTopicIdsForAI,
  selectedSummaryIdsForAI,
  aiSummaryFormat,
  aiSummaryLength,
  aiCustomPrompt,
  isAIGenerating,
  aiGeneratedContent,
  originalContent,
  onSetAiModelType,
  onSetAiSelectedModel,
  onSetAIGenerationInput,
  onSetSelectedTopicIdsForAI,
  onSetSelectedSummaryIdsForAI,
  onSetAiSummaryFormat,
  onSetAiSummaryLength,
  onSetAiCustomPrompt,
  onSetAiGeneratedContent,
  onSetOriginalContent,
  onGenerate,
  onApply,
  onCancel,
}: AIGenerationModalProps) {
  if (!isOpen) {
    return null;
  }

  // 対象の月で作成されている個別トピックを取得
  const currentTabData = monthContents[activeTab] as MonthContent | undefined;
  const isSummaryTab = SUMMARY_TABS.some(t => t.id === activeTab);
  
  let allTopicsInMonth: Topic[] = [];
  
  if (isSummaryTab) {
    // 総括タブの場合、対応する月のトピックを取得
    const summaryTabId = activeTab as SummaryTab;
    let targetMonths: MonthTab[] = [];
    
    switch (summaryTabId) {
      case 'q1-summary':
        targetMonths = ['april', 'may', 'june'];
        break;
      case 'q2-summary':
        targetMonths = ['july', 'august', 'september'];
        break;
      case 'first-half-summary':
        targetMonths = ['april', 'may', 'june', 'july', 'august', 'september'];
        break;
      case 'q3-summary':
        targetMonths = ['october', 'november', 'december'];
        break;
      case 'q1-q3-summary':
        targetMonths = ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        break;
      case 'q4-summary':
        targetMonths = ['january', 'february', 'march'];
        break;
      case 'annual-summary':
        targetMonths = ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march'];
        break;
    }
    
    // 対象の月のトピックを収集
    targetMonths.forEach(monthId => {
      const monthData = monthContents[monthId] as MonthContent | undefined;
      if (monthData?.items) {
        monthData.items.forEach(item => {
          if (item.topics && item.topics.length > 0) {
            allTopicsInMonth.push(...item.topics);
          }
        });
      }
    });
  } else {
    // 月タブの場合、その月のトピックを取得
    if (currentTabData?.items) {
      currentTabData.items.forEach(item => {
        if (item.topics && item.topics.length > 0) {
          allTopicsInMonth.push(...item.topics);
        }
      });
    }
  }

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
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '95%',
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
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
            AIで作文 - サマリ
          </h2>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#6B7280',
              cursor: 'pointer',
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
        
        {/* コンテンツ */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* AIモデル選択 */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
              AIモデル選択
            </label>
            
            {/* モデルタイプ選択 */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {(['gpt', 'local'] as const).map((type) => (
                  <label
                    key={type}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      border: `2px solid ${aiModelType === type ? '#3B82F6' : '#D1D5DB'}`,
                      borderRadius: '6px',
                      backgroundColor: aiModelType === type ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '13px',
                    }}
                  >
                    <input
                      type="radio"
                      name="aiModelType"
                      value={type}
                      checked={aiModelType === type}
                      onChange={(e) => onSetAiModelType(e.target.value as 'gpt' | 'local')}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{type === 'gpt' ? 'GPT' : 'ローカル'}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* モデル選択 */}
            {aiModelType === 'local' && loadingAiLocalModels && (
              <div style={{ padding: '8px', fontSize: '12px', color: '#6B7280' }}>
                🔄 利用可能なモデルを取得中...
              </div>
            )}
            {aiModelType === 'local' && !loadingAiLocalModels && availableAiModels.length === 0 && (
              <div style={{ padding: '8px', fontSize: '12px', color: '#DC2626' }}>
                ⚠️ 利用可能なローカルモデルが見つかりませんでした
              </div>
            )}
            {availableAiModels.length > 0 && (
              <select
                value={aiSelectedModel}
                onChange={(e) => onSetAiSelectedModel(e.target.value)}
                disabled={loadingAiLocalModels}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  cursor: loadingAiLocalModels ? 'not-allowed' : 'pointer',
                }}
              >
                {availableAiModels.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          {/* 要約形式選択 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
              要約形式
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {[
                { value: 'auto', label: 'おまかせ' },
                { value: 'bullet', label: '箇条書き' },
                { value: 'paragraph', label: '説明文' },
                { value: 'custom', label: 'カスタム' },
              ].map((format) => (
                <button
                  key={format.value}
                  type="button"
                  onClick={() => onSetAiSummaryFormat(format.value as 'auto' | 'bullet' | 'paragraph' | 'custom')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: aiSummaryFormat === format.value ? '#111827' : '#FFFFFF',
                    color: aiSummaryFormat === format.value ? '#FFFFFF' : '#374151',
                    border: `1px solid ${aiSummaryFormat === format.value ? '#111827' : '#D1D5DB'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (aiSummaryFormat !== format.value) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (aiSummaryFormat !== format.value) {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }
                  }}
                >
                  {format.label}
                </button>
              ))}
            </div>
            
            {/* 文字数選択（おまかせ、箇条書き、説明文の場合） */}
            {aiSummaryFormat !== 'custom' && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#6B7280' }}>
                  文字数: {aiSummaryLength}文字
                </label>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="100"
                  value={aiSummaryLength}
                  onChange={(e) => onSetAiSummaryLength(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    backgroundColor: '#E5E7EB',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', color: '#9CA3AF' }}>
                  <span>200文字</span>
                  <span>2000文字</span>
                </div>
              </div>
            )}
            
            {/* カスタムプロンプト入力（カスタム選択時） */}
            {aiSummaryFormat === 'custom' && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                  カスタム指示（プロンプト）
                </label>
                <textarea
                  value={aiCustomPrompt}
                  onChange={(e) => onSetAiCustomPrompt(e.target.value)}
                  placeholder="例: 3つの主要なポイントを箇条書きで、各ポイントは2-3文で説明してください。"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>
            )}
          </div>
          
          {/* 概要入力 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
              概要（任意）
            </label>
            <textarea
              value={aiGenerationInput}
              onChange={(e) => onSetAIGenerationInput(e.target.value)}
              placeholder="要約したい内容を入力してください（任意）"
              rows={6}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>
          
          {/* 月のサマリを選択（総括タブの場合のみ） */}
          {isSummaryTab && (() => {
            const summaryTabId = activeTab as SummaryTab;
            let targetMonths: MonthTab[] = [];
            
            switch (summaryTabId) {
              case 'q1-summary':
                targetMonths = ['april', 'may', 'june'];
                break;
              case 'q2-summary':
                targetMonths = ['july', 'august', 'september'];
                break;
              case 'first-half-summary':
                targetMonths = ['april', 'may', 'june', 'july', 'august', 'september'];
                break;
              case 'q3-summary':
                targetMonths = ['october', 'november', 'december'];
                break;
              case 'q1-q3-summary':
                targetMonths = ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
                break;
              case 'q4-summary':
                targetMonths = ['january', 'february', 'march'];
                break;
              case 'annual-summary':
                targetMonths = ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march'];
                break;
            }
            
            const availableSummaries = targetMonths
              .map(monthId => {
                const monthData = monthContents[monthId] as MonthContent | undefined;
                const monthLabel = MONTHS.find(m => m.id === monthId)?.label || monthId;
                return {
                  monthId,
                  summary: monthData?.summary || '',
                  summaryId: monthData?.summaryId || '',
                  label: monthLabel,
                };
              })
              .filter(s => s.summary && s.summary.trim().length > 0);
            
            return availableSummaries.length > 0 ? (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                  月のサマリを選択（任意）
                </label>
                <div
                  style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    padding: '12px',
                  }}
                >
                  {availableSummaries.map((summary) => (
                    <label
                      key={summary.summaryId}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: '12px',
                        marginBottom: '8px',
                        border: selectedSummaryIdsForAI.includes(summary.summaryId) ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                        borderRadius: '6px',
                        backgroundColor: selectedSummaryIdsForAI.includes(summary.summaryId) ? '#EFF6FF' : '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSummaryIdsForAI.includes(summary.summaryId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onSetSelectedSummaryIdsForAI([...selectedSummaryIdsForAI, summary.summaryId]);
                          } else {
                            onSetSelectedSummaryIdsForAI(selectedSummaryIdsForAI.filter(id => id !== summary.summaryId));
                          }
                        }}
                        style={{ marginRight: '12px', marginTop: '2px', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                          {summary.label}サマリ
                        </div>
                        <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
                          {summary.summary.substring(0, 200)}{summary.summary.length > 200 ? '...' : ''}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '6px', color: '#6B7280', fontSize: '14px' }}>
                対象の月にサマリがありません
              </div>
            );
          })()}
          
          {/* 対象の月で作成されている個別トピック選択 */}
          {allTopicsInMonth.length > 0 ? (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                個別トピックを選択（任意）
              </label>
              <div
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  padding: '12px',
                }}
              >
                {allTopicsInMonth.map((topic) => (
                  <label
                    key={topic.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      marginBottom: '8px',
                      border: selectedTopicIdsForAI.includes(topic.id) ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                      borderRadius: '6px',
                      backgroundColor: selectedTopicIdsForAI.includes(topic.id) ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTopicIdsForAI.includes(topic.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onSetSelectedTopicIdsForAI([...selectedTopicIdsForAI, topic.id]);
                        } else {
                          onSetSelectedTopicIdsForAI(selectedTopicIdsForAI.filter(id => id !== topic.id));
                        }
                      }}
                      style={{ marginRight: '12px', marginTop: '2px', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                        {topic.title}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
                        {topic.content.substring(0, 200)}{topic.content.length > 200 ? '...' : ''}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '6px', color: '#6B7280', fontSize: '14px' }}>
              この月には個別トピックがありません
            </div>
          )}
          
          {/* AI生成結果のプレビュー */}
          {aiGeneratedContent && originalContent != null && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
              <div style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                AI生成結果のプレビュー
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
                {/* 既存の内容 */}
                <div>
                  <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#6B7280' }}>
                    既存の内容
                  </div>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '6px',
                      maxHeight: '400px',
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
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
                  <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                    AI生成結果
                  </div>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      maxHeight: '400px',
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
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {aiGeneratedContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    onSetAiGeneratedContent(null);
                    onSetOriginalContent(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={onApply}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#111827',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#374151';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#111827';
                  }}
                >
                  適用する
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* フッター */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          {!aiGeneratedContent && (
            <button
              onClick={onGenerate}
              disabled={isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0 && selectedSummaryIdsForAI.length === 0)}
              style={{
                padding: '10px 20px',
                backgroundColor: isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0 && selectedSummaryIdsForAI.length === 0) ? '#9CA3AF' : '#3B82F6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0 && selectedSummaryIdsForAI.length === 0) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isAIGenerating ? (
                <>
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <span>🤖</span>
                  <span>要約を生成</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

