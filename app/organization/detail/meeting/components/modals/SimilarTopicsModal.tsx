import type { MonthContent } from '../../types';
import type { Topic } from '@/types/topicMetadata';

interface SimilarTopicsModalProps {
  isOpen: boolean;
  searchingTopicId: string | null;
  similarTopics: Array<{ topicId: string; meetingNoteId: string; similarity: number }>;
  isSearchingSimilarTopics: boolean;
  monthContents: Record<string, MonthContent>;
  onClose: () => void;
}

export default function SimilarTopicsModal({
  isOpen,
  searchingTopicId,
  similarTopics,
  isSearchingSimilarTopics,
  monthContents,
  onClose,
}: SimilarTopicsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(44, 62, 80, 0.4) 0%, rgba(30, 41, 59, 0.35) 100%)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2002,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          maxWidth: '800px',
          width: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '0',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div style={{
          background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
          padding: '24px 32px',
          borderRadius: '16px 16px 0 0',
          borderBottom: '3px solid #6D28D9',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '24px',
                fontWeight: '700',
                color: '#FFFFFF',
              }}>
                🔍 類似トピック検索結果
              </h3>
              <p style={{
                margin: '0',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
              }}>
                {searchingTopicId ? `トピックID: ${searchingTopicId}` : '検索中...'}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                fontSize: '20px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              &times;
            </button>
          </div>
        </div>
        
        {/* コンテンツ */}
        <div style={{ padding: '32px' }}>
          {isSearchingSimilarTopics ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#64748B',
            }}>
              <div style={{
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '4px solid #E2E8F0',
                borderTopColor: '#8B5CF6',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '16px',
              }} />
              <p>類似トピックを検索中...</p>
            </div>
          ) : similarTopics.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#64748B',
            }}>
              <p style={{ fontSize: '18px', marginBottom: '8px' }}>🔍</p>
              <p>類似トピックが見つかりませんでした。</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                トピックの埋め込みが生成されていない可能性があります。
              </p>
            </div>
          ) : (
            <div>
              <p style={{
                marginBottom: '20px',
                fontSize: '14px',
                color: '#64748B',
              }}>
                {similarTopics.length}件の類似トピックが見つかりました
              </p>
              {similarTopics.map((result) => {
                // トピックを検索（monthContentsから）
                let foundTopic: Topic | null = null;
                let foundItemTitle = '';
                
                (Object.values(monthContents) as MonthContent[]).forEach((monthData) => {
                  if (monthData && typeof monthData === 'object' && 'items' in monthData) {
                    if (monthData.items) {
                      monthData.items.forEach((item) => {
                        const topic = item.topics?.find(t => t.id === result.topicId);
                        if (topic) {
                          foundTopic = topic;
                          foundItemTitle = item.title;
                        }
                      });
                    }
                  }
                });
                
                return (
                  <div
                    key={result.topicId}
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '12px',
                          color: '#64748B',
                          marginBottom: '4px',
                        }}>
                          {foundItemTitle || '議事録アイテム'}
                        </div>
                        <h4 style={{
                          margin: 0,
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1E293B',
                        }}>
                          {(foundTopic as Topic | null)?.title || 'トピックが見つかりません'}
                        </h4>
                        {foundTopic && (foundTopic as Topic).summary && (
                          <p style={{
                            marginTop: '8px',
                            fontSize: '14px',
                            color: '#64748B',
                            fontStyle: 'italic',
                          }}>
                            {(foundTopic as Topic).summary}
                          </p>
                        )}
                      </div>
                      <div style={{
                        padding: '8px 12px',
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        minWidth: '80px',
                        textAlign: 'center',
                      }}>
                        {Math.round(result.similarity * 100)}%
                      </div>
                    </div>
                    {foundTopic && (
                      <div style={{
                        fontSize: '12px',
                        color: '#64748B',
                        marginTop: '8px',
                      }}>
                        ID: {result.topicId}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

