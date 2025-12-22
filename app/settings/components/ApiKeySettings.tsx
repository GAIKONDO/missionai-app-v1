'use client';

import { useState } from 'react';

interface ApiKeySettingsProps {
  openaiApiKey: string;
  geminiApiKey: string;
  claudeApiKey: string;
  ollamaApiUrlForChat: string;
  onOpenModal: (provider: string) => void;
}

export default function ApiKeySettings({
  openaiApiKey,
  geminiApiKey,
  claudeApiKey,
  ollamaApiUrlForChat,
  onOpenModal,
}: ApiKeySettingsProps) {
  return (
    <div style={{
      padding: '24px',
      border: '1px solid var(--color-border-color)',
      borderRadius: '8px',
      backgroundColor: 'var(--color-surface)',
    }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
        APIキー設定
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
        AIアシスタントや埋め込み生成で使用するAPIキーを設定します。カードをクリックして設定してください。
      </p>

      {/* APIキー設定カード */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {/* OpenAI */}
        <div
          onClick={() => onOpenModal('openai')}
          style={{
            padding: '20px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border-color)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-color)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '24px' }}>🤖</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>OpenAI</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>GPT-4, GPT-3.5</div>
            </div>
          </div>
          <div style={{
            padding: '8px 12px',
            backgroundColor: openaiApiKey ? '#D1FAE5' : '#FEE2E2',
            borderRadius: '6px',
            fontSize: '12px',
            color: openaiApiKey ? '#065F46' : '#991B1B',
            fontWeight: 500,
          }}>
            {openaiApiKey ? '✅ 設定済み' : '⚠️ 未設定'}
          </div>
        </div>

        {/* Gemini */}
        <div
          onClick={() => onOpenModal('gemini')}
          style={{
            padding: '20px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border-color)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-color)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '24px' }}>💎</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>Gemini</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Google Gemini</div>
            </div>
          </div>
          <div style={{
            padding: '8px 12px',
            backgroundColor: geminiApiKey ? '#D1FAE5' : '#FEE2E2',
            borderRadius: '6px',
            fontSize: '12px',
            color: geminiApiKey ? '#065F46' : '#991B1B',
            fontWeight: 500,
          }}>
            {geminiApiKey ? '✅ 設定済み' : '⚠️ 未設定'}
          </div>
        </div>

        {/* Claude */}
        <div
          onClick={() => onOpenModal('claude')}
          style={{
            padding: '20px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border-color)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-color)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '24px' }}>🧠</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>Claude</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Anthropic Claude</div>
            </div>
          </div>
          <div style={{
            padding: '8px 12px',
            backgroundColor: claudeApiKey ? '#D1FAE5' : '#FEE2E2',
            borderRadius: '6px',
            fontSize: '12px',
            color: claudeApiKey ? '#065F46' : '#991B1B',
            fontWeight: 500,
          }}>
            {claudeApiKey ? '✅ 設定済み' : '⚠️ 未設定'}
          </div>
        </div>

        {/* Ollama */}
        <div
          onClick={() => onOpenModal('ollama')}
          style={{
            padding: '20px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border-color)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-color)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '24px' }}>🦙</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>Ollama</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>ローカルモデル</div>
            </div>
          </div>
          <div style={{
            padding: '8px 12px',
            backgroundColor: ollamaApiUrlForChat ? '#D1FAE5' : '#FEE2E2',
            borderRadius: '6px',
            fontSize: '12px',
            color: ollamaApiUrlForChat ? '#065F46' : '#991B1B',
            fontWeight: 500,
          }}>
            {ollamaApiUrlForChat ? '✅ 設定済み' : '⚠️ 未設定'}
          </div>
        </div>
      </div>
    </div>
  );
}

