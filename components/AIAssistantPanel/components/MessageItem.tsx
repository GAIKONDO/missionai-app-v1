import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FiCopy, FiCheck } from 'react-icons/fi';
import type { Message } from '../types';
import { markdownComponents } from '../markdownComponents';

interface MessageItemProps {
  message: Message;
  copiedMessageId: string | null;
  feedbackRatings: Record<string, 'positive' | 'negative' | 'neutral'>;
  onCopy: (messageId: string, content: string) => void;
  onFeedback: (messageId: string, rating: 'positive' | 'negative') => void;
}

export function MessageItem({
  message,
  copiedMessageId,
  feedbackRatings,
  onCopy,
  onFeedback,
}: MessageItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
      }}
      onMouseEnter={(e) => {
        const copyButton = e.currentTarget.querySelector('[data-copy-button]') as HTMLElement;
        if (copyButton) {
          copyButton.style.opacity = '1';
        }
      }}
      onMouseLeave={(e) => {
        const copyButton = e.currentTarget.querySelector('[data-copy-button]') as HTMLElement;
        if (copyButton && copiedMessageId !== message.id) {
          copyButton.style.opacity = '0';
        }
      }}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '85%',
          padding: '12px 16px',
          borderRadius: '12px',
          backgroundColor:
            message.role === 'user'
              ? 'rgba(59, 130, 246, 0.2)'
              : 'rgba(255, 255, 255, 0.05)',
          border:
            message.role === 'user'
              ? '1px solid rgba(59, 130, 246, 0.3)'
              : '1px solid rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          fontSize: '14px',
          lineHeight: '1.6',
          wordWrap: 'break-word',
        }}
      >
        {/* コピーボタン（アシスタントメッセージのみ） */}
        {message.role === 'assistant' && (
          <button
            data-copy-button
            onClick={() => onCopy(message.id, message.content)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.7)',
              transition: 'all 0.2s ease',
              opacity: copiedMessageId === message.id ? 1 : 0,
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              if (copiedMessageId !== message.id) {
                e.currentTarget.style.opacity = '0';
              }
            }}
            title={copiedMessageId === message.id ? 'コピーしました' : 'コピー'}
          >
            {copiedMessageId === message.id ? (
              <FiCheck size={14} style={{ color: '#10B981' }} />
            ) : (
              <FiCopy size={14} />
            )}
          </button>
        )}
        <div
          className="markdown-content"
          style={{
            wordBreak: 'break-word',
          }}
        >
          {message.role === 'assistant' ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </div>
          )}
        </div>
        
        {/* フィードバックボタン（アシスタントメッセージのみ） */}
        {message.role === 'assistant' && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <button
              onClick={() => onFeedback(message.id, 'positive')}
              style={{
                background: feedbackRatings[message.id] === 'positive' 
                  ? 'rgba(16, 185, 129, 0.2)' 
                  : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${feedbackRatings[message.id] === 'positive' 
                  ? 'rgba(16, 185, 129, 0.5)' 
                  : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                color: feedbackRatings[message.id] === 'positive' 
                  ? '#10B981' 
                  : 'rgba(255, 255, 255, 0.7)',
                fontSize: '12px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (feedbackRatings[message.id] !== 'positive') {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (feedbackRatings[message.id] !== 'positive') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              title="良い回答"
            >
              👍 良い
            </button>
            <button
              onClick={() => onFeedback(message.id, 'negative')}
              style={{
                background: feedbackRatings[message.id] === 'negative' 
                  ? 'rgba(239, 68, 68, 0.2)' 
                  : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${feedbackRatings[message.id] === 'negative' 
                  ? 'rgba(239, 68, 68, 0.5)' 
                  : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                color: feedbackRatings[message.id] === 'negative' 
                  ? '#EF4444' 
                  : 'rgba(255, 255, 255, 0.7)',
                fontSize: '12px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (feedbackRatings[message.id] !== 'negative') {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (feedbackRatings[message.id] !== 'negative') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              title="改善が必要"
            >
              👎 改善
            </button>
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.4)',
          marginTop: '4px',
          paddingLeft: message.role === 'user' ? 0 : '4px',
          paddingRight: message.role === 'user' ? '4px' : 0,
        }}
      >
        {message.timestamp.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}

