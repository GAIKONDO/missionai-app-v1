'use client';

import { useRouter } from 'next/navigation';
import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';
import { getMeetingNoteById } from '@/lib/orgApi';

interface SearchResultItemProps {
  result: KnowledgeGraphSearchResult;
  index: number;
  isSelected: boolean;
  onSelect: (result: KnowledgeGraphSearchResult) => void;
  onFeedback: (resultId: string, resultType: 'entity' | 'relation' | 'topic', relevant: boolean) => void;
  feedbackRating?: boolean;
  entityTypeLabels: Record<string, string>;
  relationTypeLabels: Record<string, string>;
  searchResults: KnowledgeGraphSearchResult[];
}

export default function SearchResultItem({
  result,
  index,
  isSelected,
  onSelect,
  onFeedback,
  feedbackRating,
  entityTypeLabels,
  relationTypeLabels,
  searchResults,
}: SearchResultItemProps) {
  const router = useRouter();

  const handleShowInGraph = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 検索結果のすべてのエンティティIDとリレーションIDを取得
    const entityIds = searchResults
      .filter((r: KnowledgeGraphSearchResult) => r.type === 'entity' && r.entity)
      .map((r: KnowledgeGraphSearchResult) => r.entity!.id);
    const relationIds = searchResults
      .filter((r: KnowledgeGraphSearchResult) => r.type === 'relation' && r.relation)
      .map((r: KnowledgeGraphSearchResult) => r.relation!.id);
    const topicIds = searchResults
      .filter((r: KnowledgeGraphSearchResult) => r.type === 'topic' && r.topicId)
      .map((r: KnowledgeGraphSearchResult) => r.topicId!);
    
    // クエリパラメータを構築
    const params = new URLSearchParams();
    if (entityIds.length > 0) {
      params.append('entityIds', entityIds.join(','));
    }
    if (relationIds.length > 0) {
      params.append('relationIds', relationIds.join(','));
    }
    if (topicIds.length > 0) {
      params.append('topicIds', topicIds.join(','));
    }
    params.append('fromSearch', 'true');
    
    router.push(`/knowledge-graph?${params.toString()}`);
  };

  const handleShowInMeeting = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (result.meetingNoteId) {
      try {
        // 議事録から組織IDを取得
        const meetingNote = await getMeetingNoteById(result.meetingNoteId);
        if (meetingNote && meetingNote.organizationId) {
          router.push(`/organization/meeting?organizationId=${meetingNote.organizationId}&meetingId=${result.meetingNoteId}`);
        } else {
          alert('議事録の組織IDが取得できませんでした');
        }
      } catch (error) {
        console.error('議事録の取得エラー:', error);
        alert('議事録の取得に失敗しました');
      }
    }
  };

  return (
    <div
      key={`${result.type}-${result.id}-${index}`}
      onClick={() => onSelect(result)}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        padding: '16px',
        border: isSelected ? '2px solid #3B82F6' : '1px solid #E5E7EB',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#9CA3AF';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#E5E7EB';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: result.type === 'entity' ? '#DBEAFE' : result.type === 'relation' ? '#E9D5FF' : '#D1FAE5',
              color: result.type === 'entity' ? '#1E40AF' : result.type === 'relation' ? '#6B21A8' : '#065F46',
            }}>
              {result.type === 'entity' ? 'エンティティ' : result.type === 'relation' ? 'リレーション' : 'トピック'}
            </span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              スコア: {typeof result.score === 'number' && !isNaN(result.score) 
                ? (result.score * 100).toFixed(1) + '%'
                : '計算中...'}
            </span>
          </div>
          {result.entity && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                  {result.entity.name}
                </h3>
                <button
                  onClick={handleShowInGraph}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                  title="ナレッジグラフで表示"
                >
                  グラフで表示
                </button>
              </div>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                {entityTypeLabels[result.entity.type] || result.entity.type}
              </p>
            </div>
          )}
          {result.relation && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                  {relationTypeLabels[result.relation.relationType] || result.relation.relationType}
                </h3>
                <button
                  onClick={handleShowInGraph}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                  title="ナレッジグラフで表示"
                >
                  グラフで表示
                </button>
              </div>
              {result.relation.description && (
                <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                  {result.relation.description}
                </p>
              )}
            </div>
          )}
          {result.type === 'topic' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                  {result.topic?.title || 'トピック'}
                </h3>
                {result.meetingNoteId && (
                  <button
                    onClick={handleShowInMeeting}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                    title="議事録ページで表示"
                  >
                    議事録で表示
                  </button>
                )}
              </div>
              {result.topic?.contentSummary && (
                <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0', lineHeight: '1.5' }}>
                  {result.topic.contentSummary}
                </p>
              )}
              {result.topic?.semanticCategory && (
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0 0' }}>
                  カテゴリ: {result.topic.semanticCategory}
                </p>
              )}
            </div>
          )}
          
          {/* フィードバックボタン */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #E5E7EB',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onFeedback(result.id, result.type, true)}
              style={{
                background: feedbackRating === true 
                  ? '#D1FAE5' 
                  : '#F3F4F6',
                border: `1px solid ${feedbackRating === true 
                  ? '#10B981' 
                  : '#D1D5DB'}`,
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                color: feedbackRating === true 
                  ? '#065F46' 
                  : '#6B7280',
                fontSize: '12px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (feedbackRating !== true) {
                  e.currentTarget.style.background = '#E5F7F0';
                  e.currentTarget.style.borderColor = '#10B981';
                }
              }}
              onMouseLeave={(e) => {
                if (feedbackRating !== true) {
                  e.currentTarget.style.background = '#F3F4F6';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                }
              }}
              title="関連性が高い"
            >
              ✓ 関連
            </button>
            <button
              onClick={() => onFeedback(result.id, result.type, false)}
              style={{
                background: feedbackRating === false 
                  ? '#FEE2E2' 
                  : '#F3F4F6',
                border: `1px solid ${feedbackRating === false 
                  ? '#EF4444' 
                  : '#D1D5DB'}`,
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                color: feedbackRating === false 
                  ? '#991B1B' 
                  : '#6B7280',
                fontSize: '12px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (feedbackRating !== false) {
                  e.currentTarget.style.background = '#FEE2E2';
                  e.currentTarget.style.borderColor = '#EF4444';
                }
              }}
              onMouseLeave={(e) => {
                if (feedbackRating !== false) {
                  e.currentTarget.style.background = '#F3F4F6';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                }
              }}
              title="関連性が低い"
            >
              ✗ 無関係
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

