'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Topic } from '@/types/topicMetadata';
import { markdownComponents } from '../utils';
import { findSimilarTopics } from '@/lib/topicEmbeddings';

interface TopicCardProps {
  topic: Topic;
  itemId: string;
  expandedTopics: Set<string>;
  onSetExpandedTopics: (topics: Set<string>) => void;
  onSetEditingTopicItemId: (itemId: string | null) => void;
  onSetEditingTopicId: (topicId: string | null) => void;
  onSetTopicTitle: (title: string) => void;
  onSetTopicContent: (content: string) => void;
  onSetTopicSemanticCategory: (category: string) => void;
  onSetTopicKeywords: (keywords: string) => void;
  onSetTopicSummary: (summary: string) => void;
  onSetTopicImportance: (importance: string) => void;
  onSetShowTopicModal: (show: boolean) => void;
  onSetSearchingTopicId: (topicId: string | null) => void;
  onSetIsSearchingSimilarTopics: (isSearching: boolean) => void;
  onSetShowSimilarTopicsModal: (show: boolean) => void;
  onSetSimilarTopics: (topics: Array<{ topicId: string; meetingNoteId: string; similarity: number }>) => void;
  onDeleteTopic: (itemId: string, topicId: string) => void;
  onFindSimilarTopics: (queryText: string, limit: number, meetingId: string, organizationId: string) => Promise<Array<{ topicId: string; meetingNoteId: string; similarity: number }>>;
  meetingId: string;
  organizationId: string;
}

export default function TopicCard({
  topic,
  itemId,
  expandedTopics,
  onSetExpandedTopics,
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
  meetingId,
  organizationId,
}: TopicCardProps) {
  const topicKey = `${itemId}-topic-${topic.id}`;
  const isExpanded = expandedTopics.has(topicKey);
  
  return (
    <div
      key={topic.id}
      id={topicKey}
      style={{
        backgroundColor: '#F8FAFD',
        border: '1px solid #E0E0E0',
        borderRadius: '8px',
        padding: '18px 20px',
        marginBottom: '15px',
        position: 'relative',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: isExpanded ? '12px' : '0',
      }}>
        <div 
          style={{ 
            flex: 1,
            cursor: 'pointer',
          }}
          onClick={() => {
            const newExpanded = new Set(expandedTopics);
            if (isExpanded) {
              newExpanded.delete(topicKey);
            } else {
              newExpanded.add(topicKey);
            }
            onSetExpandedTopics(newExpanded);
          }}
        >
          <h5 style={{
            fontSize: '1.1em',
            fontWeight: 'bold',
            color: '#1E293B',
            margin: 0,
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              fontSize: '14px',
              transition: 'transform 0.2s ease',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              display: 'inline-block',
            }}>
              ▶
            </span>
            {topic.title}
            <span style={{
              fontSize: '0.85em',
              color: '#888',
              marginLeft: '10px',
              fontWeight: 'normal',
            }}>
              ID: {itemId}-topic-{topic.id}
            </span>
          </h5>
          {/* メタデータ表示 */}
          {(topic.semanticCategory || topic.importance || topic.keywords?.length || topic.summary) && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginTop: '8px',
            }}>
              {topic.semanticCategory && (
                <span style={{
                  padding: '4px 10px',
                  backgroundColor: '#EFF6FF',
                  color: '#0066CC',
                  borderRadius: '12px',
                  fontSize: '0.75em',
                  fontWeight: '600',
                }}>
                  📂 {topic.semanticCategory === 'action-item' ? 'アクションアイテム' :
                      topic.semanticCategory === 'decision' ? '決定事項' :
                      topic.semanticCategory === 'discussion' ? '議論・討議' :
                      topic.semanticCategory === 'issue' ? '課題・問題' :
                      topic.semanticCategory === 'risk' ? 'リスク' :
                      topic.semanticCategory === 'opportunity' ? '機会' :
                      topic.semanticCategory === 'question' ? '質問・疑問' :
                      topic.semanticCategory === 'summary' ? 'サマリー' :
                      topic.semanticCategory === 'follow-up' ? 'フォローアップ' :
                      topic.semanticCategory === 'reference' ? '参照情報' : 'その他'}
                </span>
              )}
              {topic.importance && (
                <span style={{
                  padding: '4px 10px',
                  backgroundColor: topic.importance === 'high' ? '#FEF2F2' :
                                 topic.importance === 'medium' ? '#FEF3C7' : '#F0FDF4',
                  color: topic.importance === 'high' ? '#DC2626' :
                         topic.importance === 'medium' ? '#D97706' : '#16A34A',
                  borderRadius: '12px',
                  fontSize: '0.75em',
                  fontWeight: '600',
                }}>
                  {topic.importance === 'high' ? '🔴 高' :
                   topic.importance === 'medium' ? '🟡 中' : '🟢 低'}
                </span>
              )}
              {topic.keywords && topic.keywords.length > 0 && (
                <span style={{
                  padding: '4px 10px',
                  backgroundColor: '#F3F4F6',
                  color: '#475569',
                  borderRadius: '12px',
                  fontSize: '0.75em',
                }}>
                  🏷️ {topic.keywords.slice(0, 3).join(', ')}
                  {topic.keywords.length > 3 && ` +${topic.keywords.length - 3}`}
                </span>
              )}
            </div>
          )}
          {topic.summary && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              backgroundColor: '#F8FAFC',
              borderRadius: '6px',
              fontSize: '0.85em',
              color: '#475569',
              fontStyle: 'italic',
            }}>
              📝 {topic.summary}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => {
              onSetEditingTopicItemId(itemId);
              onSetEditingTopicId(topic.id);
              onSetTopicTitle(topic.title);
              onSetTopicContent(topic.content);
              // メタデータも読み込む
              onSetTopicSemanticCategory(topic.semanticCategory || '');
              onSetTopicKeywords(topic.keywords?.join(', ') || '');
              onSetTopicSummary(topic.summary || '');
              onSetTopicImportance(topic.importance || '');
              onSetShowTopicModal(true);
            }}
            style={{
              padding: '4px 10px',
              background: '#27ae60',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.85em',
              cursor: 'pointer',
            }}
          >
            編集
          </button>
          <button
            onClick={async () => {
              onSetSearchingTopicId(topic.id);
              onSetIsSearchingSimilarTopics(true);
              onSetShowSimilarTopicsModal(true);
              
              try {
                const queryText = `${topic.title} ${topic.content}`;
                const results = await onFindSimilarTopics(
                  queryText,
                  10,
                  meetingId,
                  organizationId
                );
                
                // 自分自身を除外
                const filteredResults = results.filter(r => r.topicId !== topic.id);
                onSetSimilarTopics(filteredResults);
              } catch (error: any) {
                console.error('類似トピック検索エラー:', error);
                alert(`類似トピックの検索に失敗しました: ${error?.message || '不明なエラー'}`);
                onSetSimilarTopics([]);
              } finally {
                onSetIsSearchingSimilarTopics(false);
              }
            }}
            style={{
              padding: '4px 10px',
              background: '#8B5CF6',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.85em',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#7C3AED';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(139, 92, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#8B5CF6';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(139, 92, 246, 0.3)';
            }}
          >
            🔍 類似検索
          </button>
          <button
            onClick={() => onDeleteTopic(itemId, topic.id)}
            style={{
              padding: '4px 10px',
              background: '#e74c3c',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.85em',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#c0392b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#e74c3c';
            }}
          >
            削除
          </button>
        </div>
      </div>
      {isExpanded && (
        <div
          className="markdown-content"
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #E2E8F0',
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {topic.content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

