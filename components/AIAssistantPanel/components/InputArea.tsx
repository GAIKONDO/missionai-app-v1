import React from 'react';
import { FiSend, FiImage, FiGlobe, FiAtSign } from 'react-icons/fi';

interface InputAreaProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  isLoading: boolean;
  onSend: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  modelSelector: React.ReactNode;
}

export function InputArea({
  inputValue,
  setInputValue,
  isLoading,
  onSend,
  inputRef,
  modelSelector,
}: InputAreaProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div
      style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: '#1f1f1f',
      }}
    >
      {/* ツールバー */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          position: 'relative',
        }}
      >
        {modelSelector}

        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease, color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
          }}
          title="コンテキストを追加"
        >
          <FiAtSign size={16} />
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease, color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
          }}
          title="ウェブ検索"
        >
          <FiGlobe size={16} />
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease, color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
          }}
          title="画像をアップロード"
        >
          <FiImage size={16} />
        </button>
      </div>

      {/* 入力フィールド */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '12px',
        }}
      >
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`メッセージを入力... (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enterで送信)`}
          disabled={isLoading}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
            minHeight: '24px',
            maxHeight: '600px',
            lineHeight: '1.5',
            padding: 0,
            overflowY: 'auto',
          }}
          rows={1}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            const newHeight = Math.min(target.scrollHeight, 600);
            target.style.height = `${newHeight}px`;
          }}
        />
        <button
          onClick={onSend}
          disabled={!inputValue.trim() || isLoading}
          style={{
            background: inputValue.trim() && !isLoading
              ? 'rgba(59, 130, 246, 0.8)'
              : 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: inputValue.trim() && !isLoading ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
            cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease, color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (inputValue.trim() && !isLoading) {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 1)';
            }
          }}
          onMouseLeave={(e) => {
            if (inputValue.trim() && !isLoading) {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.8)';
            }
          }}
        >
          <FiSend size={16} />
        </button>
      </div>
      <div
        style={{
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.4)',
          marginTop: '8px',
          paddingLeft: '4px',
        }}
      >
        Shift + Enter で改行
      </div>
    </div>
  );
}

