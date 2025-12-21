import React from 'react';
import type { Message } from '../types';
import { MessageItem } from './MessageItem';
import { WelcomeMessage } from './WelcomeMessage';

interface MessageListProps {
  messages: Message[];
  copiedMessageId: string | null;
  feedbackRatings: Record<string, 'positive' | 'negative' | 'neutral'>;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onCopy: (messageId: string, content: string) => void;
  onFeedback: (messageId: string, rating: 'positive' | 'negative') => void;
}

export function MessageList({
  messages,
  copiedMessageId,
  feedbackRatings,
  isLoading,
  messagesEndRef,
  onCopy,
  onFeedback,
}: MessageListProps) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {messages.length === 0 ? (
        <WelcomeMessage />
      ) : (
        messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            copiedMessageId={copiedMessageId}
            feedbackRatings={feedbackRatings}
            onCopy={onCopy}
            onFeedback={onFeedback}
          />
        ))
      )}
      {isLoading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '14px',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

