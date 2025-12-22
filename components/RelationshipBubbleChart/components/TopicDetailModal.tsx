import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TopicInfo } from '@/lib/orgApi';
import { markdownComponents } from '../utils/markdownComponents';

interface TopicDetailModalProps {
  topic: TopicInfo;
  onClose: () => void;
}

export default function TopicDetailModal({ topic, onClose }: TopicDetailModalProps) {
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
        zIndex: 2000,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            {topic.title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px 8px',
              lineHeight: 1,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6B7280';
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
          {/* 議事録アーカイブ情報 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
              議事録アーカイブ
            </div>
            <div style={{ fontSize: '16px', color: '#1a1a1a', fontWeight: 500 }}>
              {topic.meetingNoteTitle}
            </div>
          </div>
          
          {/* トピック内容 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600, marginBottom: '12px' }}>
              内容
            </div>
            {topic.content ? (
              <div className="markdown-content" style={{ 
                padding: '20px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                fontSize: '15px',
                lineHeight: '1.8',
                color: '#374151',
                wordBreak: 'break-word',
              }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {topic.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div style={{ 
                padding: '20px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                fontSize: '15px',
                color: '#9CA3AF',
                fontStyle: 'italic',
                textAlign: 'center',
              }}>
                （内容なし）
              </div>
            )}
          </div>

          {/* メタデータ情報 */}
          {(topic.semanticCategory || topic.importance || topic.keywords?.length || topic.summary) && (
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>
                メタデータ
              </h3>
              
              {topic.semanticCategory && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                    セマンティックカテゴリ
                  </div>
                  <div style={{ fontSize: '15px', color: '#374151' }}>
                    {topic.semanticCategory}
                  </div>
                </div>
              )}
              
              {topic.importance && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                    重要度
                  </div>
                  <div style={{ fontSize: '15px', color: '#374151' }}>
                    {topic.importance}
                  </div>
                </div>
              )}
              
              {topic.keywords && topic.keywords.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                    キーワード
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {topic.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#EFF6FF',
                          color: '#1E40AF',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {topic.summary && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 600, marginBottom: '8px' }}>
                    サマリー
                  </div>
                  <div className="markdown-content" style={{ 
                    fontSize: '15px', 
                    color: '#374151', 
                    lineHeight: '1.8',
                    padding: '16px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    wordBreak: 'break-word',
                  }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {topic.summary}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

