'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TabType, MonthContent, MeetingNoteData } from '../types';
import type { Topic, TopicImportance } from '@/types/topicMetadata';
import { EditIcon, DeleteIcon } from './Icons';
import { markdownComponents } from '../utils';
import { generateUniqueId } from '@/lib/orgApi';
import TopicCard from './TopicCard';
import { findSimilarTopics } from '@/lib/topicEmbeddings';

interface MeetingItemCardProps {
  item: {
    id: string;
    title: string;
    content: string;
    location?: string;
    date?: string;
    author?: string;
    topics?: Array<Topic>;
  };
  activeTab: TabType;
  editingMonth: TabType | null;
  editingSection: string | null;
  editingItemTitle: string;
  editingContent: string;
  editingItemDate: string;
  editingItemTime: string;
  expandedTopics: Set<string>;
  onSetEditingItemTitle: (title: string) => void;
  onSetEditingContent: (content: string) => void;
  onSetEditingItemDate: (date: string) => void;
  onSetEditingItemTime: (time: string) => void;
  onSetEditingMonth: (month: TabType | null) => void;
  onSetEditingSection: (section: string | null) => void;
  onSetExpandedTopics: (topics: Set<string>) => void;
  onStartEditItem: (tab: TabType, itemId: string) => void;
  onStartEditItemTitle: (tab: TabType, itemId: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteItem: (tab: TabType, itemId: string) => void;
  monthContents: MeetingNoteData;
  onSetMonthContents: (contents: MeetingNoteData) => void;
  onSetHasUnsavedChanges: (hasChanges: boolean) => void;
  organizationId: string;
  meetingId: string;
  onSetEditingTopicItemId: (itemId: string | null) => void;
  onSetEditingTopicId: (topicId: string | null) => void;
  onSetTopicTitle: (title: string) => void;
  onSetTopicContent: (content: string) => void;
  onSetTopicSemanticCategory: (category: string) => void;
  onSetTopicKeywords: (keywords: string) => void;
  onSetTopicSummary: (summary: string) => void;
  onSetTopicImportance: (importance: TopicImportance | '') => void;
  onSetShowTopicModal: (show: boolean) => void;
  onSetSearchingTopicId: (topicId: string | null) => void;
  onSetIsSearchingSimilarTopics: (isSearching: boolean) => void;
  onSetShowSimilarTopicsModal: (show: boolean) => void;
  onSetSimilarTopics: (topics: Array<{ topicId: string; meetingNoteId: string; similarity: number }>) => void;
  onDeleteTopic: (itemId: string, topicId: string) => void;
  onFindSimilarTopics: (queryText: string, limit: number, meetingId: string, organizationId: string) => Promise<Array<{ topicId: string; meetingNoteId: string; similarity: number }>>;
}

// 議事録アイテムカードの範囲を特定するためのヘルパー関数
export function getMeetingItemCardRange() {
  // この関数は使用されませんが、コードの範囲を明確にするために残します
  return { start: 1324, end: 3022 };
}

export default function MeetingItemCard({
  item,
  activeTab,
  editingMonth,
  editingSection,
  editingItemTitle,
  editingContent,
  editingItemDate,
  editingItemTime,
  expandedTopics,
  onSetEditingItemTitle,
  onSetEditingContent,
  onSetEditingItemDate,
  onSetEditingItemTime,
  onSetEditingMonth,
  onSetEditingSection,
  onSetExpandedTopics,
  onStartEditItem,
  onStartEditItemTitle,
  onSaveEdit,
  onCancelEdit,
  onDeleteItem,
  monthContents,
  onSetMonthContents,
  onSetHasUnsavedChanges,
  organizationId,
  meetingId,
  onSetEditingTopicItemId,
  onSetEditingTopicId,
  onSetTopicTitle,
  onSetTopicContent,
  onSetTopicSemanticCategory,
  onSetTopicKeywords,
  onSetTopicSummary,
  onSetTopicImportance,
  onSetShowTopicModal,
  onSetSearchingTopicId,
  onSetIsSearchingSimilarTopics,
  onSetShowSimilarTopicsModal,
  onSetSimilarTopics,
  onDeleteTopic,
  onFindSimilarTopics,
}: MeetingItemCardProps) {
  return (
    <div
      key={item.id}
      style={{
        marginBottom: '32px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        {editingMonth === activeTab && editingSection === `${item.id}-title` ? (
          <div style={{ flex: 1, marginRight: '8px' }}>
            <input
              type="text"
              value={editingItemTitle}
              onChange={(e) => onSetEditingItemTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #0066CC',
                borderRadius: '4px',
                fontSize: '1.35em',
                fontWeight: '700',
                color: '#0F172A',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSaveEdit();
                } else if (e.key === 'Escape') {
                  onCancelEdit();
                }
              }}
              autoFocus
            />
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: '#64748B',
              fontFamily: 'monospace',
              fontWeight: '500',
            }}>
              ID: {item.id}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
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
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <h3 
              style={{
                marginTop: 0,
                fontSize: '1.3em',
                color: '#0F172A',
                borderLeft: '5px solid #0066CC',
                paddingLeft: '20px',
                background: 'linear-gradient(90deg, #EFF6FF 0%, #F0F9FF 60%, transparent 100%)',
                cursor: 'pointer',
                fontWeight: '700',
                letterSpacing: '0.3px',
                lineHeight: '1.5',
                paddingTop: '6px',
                paddingBottom: '6px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
              }}
              onClick={() => onStartEditItemTitle(activeTab, item.id)}
              title="クリックしてタイトルを編集"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(90deg, #DBEAFE 0%, #E0F2FE 60%, transparent 100%)';
                e.currentTarget.style.color = '#0066CC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(90deg, #EFF6FF 0%, #F0F9FF 60%, transparent 100%)';
                e.currentTarget.style.color = '#1E293B';
              }}
            >
              {item.title}
            </h3>
            {editingMonth === activeTab && editingSection === item.id && (
              <p style={{
                margin: '4px 0 0 20px',
                fontSize: '12px',
                color: '#64748B',
                fontFamily: 'monospace',
                fontWeight: '500',
              }}>
                ID: {item.id}
              </p>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
          {editingMonth === activeTab && editingSection === item.id ? (
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
            <>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onStartEditItem(activeTab, item.id);
              }}
              type="button"
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
              title="コンテンツを編集"
            >
              <EditIcon size={18} color="currentColor" />
            </button>
              <button
                onClick={() => onDeleteItem(activeTab, item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'transparent',
                  color: '#DC2626',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  opacity: 0.7,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.color = '#DC2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.opacity = '0.7';
                  e.currentTarget.style.color = '#DC2626';
                }}
                title="削除"
              >
                <DeleteIcon size={18} color="currentColor" />
              </button>
            </>
          )}
        </div>
      </div>
      
      {(item.location || item.date || item.author) && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px 16px',
          backgroundColor: '#F8FAFC',
          borderRadius: '6px',
          border: '1px solid #E2E8F0',
        }}>
          <p style={{ margin: 0, color: '#475569', fontSize: '15px', lineHeight: '1.8', fontWeight: '500' }}>
            {item.location && <><strong style={{ color: '#0F172A', fontWeight: '700' }}>場所:</strong> {item.location}<br /></>}
            {item.date && <><strong style={{ color: '#0F172A', fontWeight: '700' }}>日時:</strong> {item.date}<br /></>}
            {item.author && <><strong style={{ color: '#0F172A', fontWeight: '700' }}>文責:</strong> {item.author}</>}
          </p>
        </div>
      )}
      
      {editingMonth === activeTab && editingSection === item.id ? (
        <div>
          <p style={{
            margin: '0 0 8px 0',
            fontSize: '12px',
            color: '#64748B',
            fontFamily: 'monospace',
            fontWeight: '500',
          }}>
            ID: {item.id}
          </p>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#1E293B',
              fontSize: '14px',
            }}>
              日時
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: '0 0 200px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  color: '#475569',
                  fontSize: '13px',
                }}>
                  日付
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={editingItemDate}
                    onChange={(e) => onSetEditingItemDate(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const year = today.getFullYear();
                      const month = String(today.getMonth() + 1).padStart(2, '0');
                      const day = String(today.getDate()).padStart(2, '0');
                      onSetEditingItemDate(`${year}-${month}-${day}`);
                    }}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#0066CC',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0051a8';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#0066CC';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    今日
                  </button>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  color: '#475569',
                  fontSize: '13px',
                }}>
                  時間（任意）
                </label>
                <input
                  type="text"
                  value={editingItemTime}
                  onChange={(e) => onSetEditingItemTime(e.target.value)}
                  placeholder="例: 14:00-16:00"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>
          <textarea
            value={editingContent}
            onChange={(e) => onSetEditingContent(e.target.value)}
            style={{
              width: '100%',
              minHeight: '300px',
              padding: '12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'monospace',
              resize: 'vertical',
              lineHeight: '1.6',
            }}
          />
        </div>
      ) : (
        <div>
          {item.content ? (
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {item.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p style={{ color: '#64748B', fontStyle: 'italic', fontSize: '16px', fontWeight: '500' }}>
              コンテンツがありません。編集ボタンから追加してください。
            </p>
          )}
        </div>
      )}
      
      {/* トピック一括追加ボタン */}
      {item.content && (
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => {
              try {
                // 内容を---で分割（行全体が---のパターンにマッチ）
                // 最初と最後の---は区切りとして扱う
                const content = item.content.trim();
                const sections = content.split(/\n\s*---\s*\n/).filter(section => section.trim().length > 0);
                
                // 最初と最後が---で始まる/終わる場合は除去
                const cleanedSections = sections.map(section => {
                  return section.replace(/^---\s*\n?/, '').replace(/\n?---\s*$/, '').trim();
                }).filter(section => section.length > 0);
                
                if (cleanedSections.length === 0) {
                  alert('---で区切られたセクションが見つかりませんでした。');
                  return;
                }
                
                const newTopics: Topic[] = [];
                
                cleanedSections.forEach((section) => {
                  const trimmedSection = section.trim();
                  if (trimmedSection.length === 0) return;
                  
                  // 最初の##見出しを探す
                  const headingMatch = trimmedSection.match(/^##\s+(.+)$/m);
                  let title = '無題のトピック';
                  
                  if (headingMatch && headingMatch[1]) {
                    title = headingMatch[1].trim();
                  } else {
                    // ##がない場合は最初の行をタイトルにする
                    const firstLine = trimmedSection.split('\n')[0].trim();
                    if (firstLine.length > 0) {
                      title = firstLine.replace(/^#+\s*/, '').trim() || '無題のトピック';
                    }
                  }
                  
                  // トピックIDを生成
                  const topicId = generateUniqueId();
                  
                  const now = new Date().toISOString();
                  
                  newTopics.push({
                    id: topicId,
                    title: title,
                    content: trimmedSection,
                    mentionedDate: item.date || undefined, // 親の議事録の日時を引き継ぐ
                    createdAt: now,
                    updatedAt: now,
                  });
                });
                
                if (newTopics.length === 0) {
                  alert('トピックを抽出できませんでした。');
                  return;
                }
                
                // 既存のトピックに追加
                const updatedContents = { ...monthContents };
                const tabData = updatedContents[activeTab];
                if (tabData) {
                  const itemIndex = tabData.items.findIndex(i => i.id === item.id);
                  if (itemIndex !== -1) {
                    const updatedItems = [...tabData.items];
                    const currentTopics = updatedItems[itemIndex].topics || [];
                    updatedItems[itemIndex] = {
                      ...updatedItems[itemIndex],
                      topics: [...currentTopics, ...newTopics],
                    };
                    updatedContents[activeTab] = {
                      ...tabData,
                      items: updatedItems,
                    };
                    onSetMonthContents(updatedContents);
                    onSetHasUnsavedChanges(true);
                    
                    alert(`${newTopics.length}個のトピックを追加しました。`);
                  }
                }
              } catch (error: any) {
                console.error('トピック一括追加エラー:', error);
                alert(`トピックの一括追加に失敗しました: ${error?.message || '不明なエラー'}`);
              }
            }}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9em',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.2)';
            }}
          >
            📋 トピック一括追加
          </button>
        </div>
      )}
      
      {/* 個別トピックセクション */}
      <div style={{
        marginTop: '30px',
        paddingTop: '20px',
        borderTop: '2px solid #E2E8F0',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <h4 style={{
            margin: 0,
            fontSize: '1.15em',
            color: '#0066CC',
            fontWeight: '600',
          }}>
            個別トピック
          </h4>
          <button
            onClick={() => {
              onSetEditingTopicItemId(item.id);
              onSetEditingTopicId(null);
              onSetTopicTitle('');
              onSetTopicContent('');
              onSetShowTopicModal(true);
            }}
            style={{
              padding: '8px 16px',
              background: '#0066CC',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.95em',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,102,204,0.15)',
              transition: 'background 0.2s, transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0051a8';
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0066CC';
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
            }}
          >
            + トピックを追加
          </button>
        </div>
        
        {item.topics && item.topics.length > 0 ? (
          <div>
            {item.topics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                itemId={item.id}
                expandedTopics={expandedTopics}
                onSetExpandedTopics={onSetExpandedTopics}
                onSetEditingTopicItemId={onSetEditingTopicItemId}
                onSetEditingTopicId={onSetEditingTopicId}
                onSetTopicTitle={onSetTopicTitle}
                onSetTopicContent={onSetTopicContent}
                onSetTopicSemanticCategory={onSetTopicSemanticCategory}
                onSetTopicKeywords={onSetTopicKeywords}
                onSetTopicSummary={onSetTopicSummary}
                onSetTopicImportance={onSetTopicImportance}
                onSetShowTopicModal={onSetShowTopicModal}
                onSetSearchingTopicId={onSetSearchingTopicId}
                onSetIsSearchingSimilarTopics={onSetIsSearchingSimilarTopics}
                onSetShowSimilarTopicsModal={onSetShowSimilarTopicsModal}
                onSetSimilarTopics={onSetSimilarTopics}
                onDeleteTopic={onDeleteTopic}
                onFindSimilarTopics={onFindSimilarTopics}
                meetingId={meetingId}
                organizationId={organizationId}
              />
            ))}
          </div>
        ) : (
          <p style={{
            color: '#888',
            fontStyle: 'italic',
            fontSize: '14px',
          }}>
            まだトピックが追加されていません。
          </p>
        )}
      </div>
    </div>
  );
}

