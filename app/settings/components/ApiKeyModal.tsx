'use client';

import { useState } from 'react';

interface ApiKeyModalProps {
  selectedProvider: string | null;
  tempApiKey: string;
  onClose: () => void;
  onSave: () => void;
  onOllamaUrlSave: () => void;
  onTempApiKeyChange: (value: string) => void;
}

export default function ApiKeyModal({
  selectedProvider,
  tempApiKey,
  onClose,
  onSave,
  onOllamaUrlSave,
  onTempApiKeyChange,
}: ApiKeyModalProps) {
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  if (!selectedProvider) return null;

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
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
          {selectedProvider === 'openai' && '🤖 OpenAI APIキー設定'}
          {selectedProvider === 'gemini' && '💎 Gemini APIキー設定'}
          {selectedProvider === 'claude' && '🧠 Claude APIキー設定'}
          {selectedProvider === 'ollama' && '🦙 Ollama API URL設定'}
        </h3>

        {selectedProvider === 'ollama' ? (
          <>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              Ollama API URL
            </label>
            <input
              type="text"
              value={tempApiKey}
              onChange={(e) => onTempApiKeyChange(e.target.value)}
              placeholder="http://localhost:11434/api/chat"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '16px',
              }}
            />
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px' }}>
              <p style={{ margin: 0 }}>
                💡 AIアシスタントでローカルモデル（Ollama）を使用する場合のAPI URLです。
              </p>
              <p style={{ marginTop: '4px', marginBottom: 0 }}>
                デフォルト: http://localhost:11434/api/chat
              </p>
            </div>
          </>
        ) : (
          <>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              APIキー
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={tempApiKey}
                onChange={(e) => onTempApiKeyChange(e.target.value)}
                placeholder={selectedProvider === 'openai' ? 'sk-...' : selectedProvider === 'gemini' ? 'AIza...' : 'sk-ant-...'}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                }}
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#F3F4F6',
                  color: '#6B7280',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {showApiKey ? '👁️ 非表示' : '👁️ 表示'}
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px' }}>
              {selectedProvider === 'openai' && (
                <p style={{ margin: 0 }}>
                  💡 OpenAI APIキーは <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'underline' }}>こちら</a> で取得できます。
                </p>
              )}
              {selectedProvider === 'gemini' && (
                <p style={{ margin: 0 }}>
                  💡 Gemini APIキーは <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'underline' }}>こちら</a> で取得できます。
                </p>
              )}
              {selectedProvider === 'claude' && (
                <p style={{ margin: 0 }}>
                  💡 Claude APIキーは <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'underline' }}>こちら</a> で取得できます。
                </p>
              )}
              <p style={{ marginTop: '4px', marginBottom: 0 }}>
                💡 APIキーは暗号化されてローカルに保存されます。
              </p>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#6B7280',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={selectedProvider === 'ollama' ? onOllamaUrlSave : onSave}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

