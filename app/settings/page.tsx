'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import type { EmbeddingProvider } from '@/lib/embeddings';
import { loadCSVPreview, type ImportPreview, type ImportPreviewRow, type MultiSectionImportPreview } from '@/lib/csvImport';
import { createOrg } from '@/lib/orgApi';
import { addOrgMember } from '@/lib/orgApi';

export default function SettingsPage() {
  const [embeddingProvider, setEmbeddingProvider] = useState<EmbeddingProvider>('openai');
  const [ollamaApiUrl, setOllamaApiUrl] = useState<string>('http://localhost:11434/api/embeddings');
  const [ollamaModel, setOllamaModel] = useState<string>('nomic-embed-text');
  // ChromaDBは常に使用されるため、状態管理は不要
  
  // APIキー設定
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [claudeApiKey, setClaudeApiKey] = useState<string>('');
  const [ollamaApiUrlForChat, setOllamaApiUrlForChat] = useState<string>('http://localhost:11434/api/chat');
  
  // モーダル状態
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  
  // CSVインポート状態
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [multiSectionPreview, setMultiSectionPreview] = useState<MultiSectionImportPreview | null>(null);
  const [editingRowIndex, setEditingRowIndex] = useState<{ sectionIndex?: number; rowIndex: number } | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number>(0);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [deleteTargetRowIndex, setDeleteTargetRowIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // localStorageから設定を読み込み
    if (typeof window !== 'undefined') {
      const savedProvider = localStorage.getItem('embeddingProvider') as EmbeddingProvider | null;
      if (savedProvider && (savedProvider === 'openai' || savedProvider === 'ollama')) {
        setEmbeddingProvider(savedProvider);
      }

      const savedOllamaUrl = localStorage.getItem('ollamaEmbeddingApiUrl');
      if (savedOllamaUrl) {
        setOllamaApiUrl(savedOllamaUrl);
      }

      const savedOllamaModel = localStorage.getItem('ollamaEmbeddingModel');
      if (savedOllamaModel) {
        setOllamaModel(savedOllamaModel);
      }

      // ChromaDBは常に使用されるため、設定の読み込みは不要

      // APIキーを読み込み
      try {
        const { getAPIKey } = require('@/lib/security');
        
        // OpenAI
        const savedOpenaiKey = getAPIKey('openai');
        if (savedOpenaiKey) {
          setOpenaiApiKey(savedOpenaiKey);
        } else {
          const envKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
          if (envKey) {
            setOpenaiApiKey(envKey);
          }
        }
        
        // Gemini
        const savedGeminiKey = getAPIKey('gemini');
        if (savedGeminiKey) {
          setGeminiApiKey(savedGeminiKey);
        } else {
          const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
          if (envKey) {
            setGeminiApiKey(envKey);
          }
        }
        
        // Claude
        const savedClaudeKey = getAPIKey('claude');
        if (savedClaudeKey) {
          setClaudeApiKey(savedClaudeKey);
        } else {
          const envKey = process.env.NEXT_PUBLIC_CLAUDE_API_KEY;
          if (envKey) {
            setClaudeApiKey(envKey);
          }
        }
      } catch (error) {
        console.warn('APIキーの読み込みエラー:', error);
        // フォールバック: 直接localStorageから取得
        const savedOpenai = localStorage.getItem('NEXT_PUBLIC_OPENAI_API_KEY');
        if (savedOpenai) setOpenaiApiKey(savedOpenai);
        const savedGemini = localStorage.getItem('NEXT_PUBLIC_GEMINI_API_KEY');
        if (savedGemini) setGeminiApiKey(savedGemini);
        const savedClaude = localStorage.getItem('NEXT_PUBLIC_CLAUDE_API_KEY');
        if (savedClaude) setClaudeApiKey(savedClaude);
      }

      const savedOllamaChatUrl = localStorage.getItem('ollamaChatApiUrl');
      if (savedOllamaChatUrl) {
        setOllamaApiUrlForChat(savedOllamaChatUrl);
      } else {
        const envOllamaUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL;
        if (envOllamaUrl) {
          setOllamaApiUrlForChat(envOllamaUrl);
        }
      }
    }
  }, []);

  const handleProviderChange = (provider: EmbeddingProvider) => {
    setEmbeddingProvider(provider);
    if (typeof window !== 'undefined') {
      localStorage.setItem('embeddingProvider', provider);
    }
  };

  const handleOllamaUrlChange = (url: string) => {
    setOllamaApiUrl(url);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ollamaEmbeddingApiUrl', url);
    }
  };

  const handleOllamaModelChange = (model: string) => {
    setOllamaModel(model);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ollamaEmbeddingModel', model);
    }
  };

  // ChromaDBは常に使用されるため、ハンドラーは不要

  const handleOpenApiKeyModal = (provider: string) => {
    setSelectedProvider(provider);
    setShowApiKeyModal(true);
    setShowApiKey(false);
    
    // 現在のAPIキー/URLを読み込む
    let currentValue = '';
    switch (provider) {
      case 'openai':
        currentValue = openaiApiKey;
        break;
      case 'gemini':
        currentValue = geminiApiKey;
        break;
      case 'claude':
        currentValue = claudeApiKey;
        break;
      case 'ollama':
        currentValue = ollamaApiUrlForChat;
        break;
    }
    setTempApiKey(currentValue);
  };

  const handleSaveApiKey = () => {
    if (!selectedProvider) return;
    
    const key = tempApiKey.trim();
    
    if (typeof window !== 'undefined') {
      try {
        const { saveAPIKey, deleteAPIKey } = require('@/lib/security');
        
        if (key) {
          saveAPIKey(selectedProvider, key);
          localStorage.setItem(`NEXT_PUBLIC_${selectedProvider.toUpperCase()}_API_KEY`, key);
        } else {
          deleteAPIKey(selectedProvider);
          localStorage.removeItem(`NEXT_PUBLIC_${selectedProvider.toUpperCase()}_API_KEY`);
        }
        
        // 状態を更新
        switch (selectedProvider) {
          case 'openai':
            setOpenaiApiKey(key);
            break;
          case 'gemini':
            setGeminiApiKey(key);
            break;
          case 'claude':
            setClaudeApiKey(key);
            break;
        }
        
        setShowApiKeyModal(false);
        setSelectedProvider(null);
        setTempApiKey('');
      } catch (error) {
        console.error('APIキーの保存エラー:', error);
        // フォールバック
        if (key) {
          localStorage.setItem(`NEXT_PUBLIC_${selectedProvider.toUpperCase()}_API_KEY`, key);
        } else {
          localStorage.removeItem(`NEXT_PUBLIC_${selectedProvider.toUpperCase()}_API_KEY`);
        }
        
        switch (selectedProvider) {
          case 'openai':
            setOpenaiApiKey(key);
            break;
          case 'gemini':
            setGeminiApiKey(key);
            break;
          case 'claude':
            setClaudeApiKey(key);
            break;
        }
        
        setShowApiKeyModal(false);
        setSelectedProvider(null);
        setTempApiKey('');
      }
    }
  };

  const handleOllamaUrlSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ollamaChatApiUrl', tempApiKey.trim());
      localStorage.setItem('NEXT_PUBLIC_OLLAMA_API_URL', tempApiKey.trim());
      setOllamaApiUrlForChat(tempApiKey.trim());
      setShowApiKeyModal(false);
      setSelectedProvider(null);
      setTempApiKey('');
    }
  };

  return (
    <Layout>
      <div style={{ width: '100%', padding: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '32px' }}>設定</h1>

        {/* APIキー設定 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
            🔑 APIキー設定
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
            AIアシスタントや埋め込み生成で使用するAPIキーを設定します。カードをクリックして設定してください。
          </p>

          {/* APIキー設定カード */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* OpenAI */}
            <div
              onClick={() => handleOpenApiKeyModal('openai')}
              style={{
                padding: '20px',
                backgroundColor: '#F9FAFB',
                borderRadius: '12px',
                border: '2px solid #E5E7EB',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.backgroundColor = '#EFF6FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '24px' }}>🤖</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>OpenAI</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>GPT-4, GPT-3.5</div>
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
              onClick={() => handleOpenApiKeyModal('gemini')}
              style={{
                padding: '20px',
                backgroundColor: '#F9FAFB',
                borderRadius: '12px',
                border: '2px solid #E5E7EB',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.backgroundColor = '#EFF6FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '24px' }}>💎</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>Gemini</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>Google Gemini</div>
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
              onClick={() => handleOpenApiKeyModal('claude')}
              style={{
                padding: '20px',
                backgroundColor: '#F9FAFB',
                borderRadius: '12px',
                border: '2px solid #E5E7EB',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.backgroundColor = '#EFF6FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '24px' }}>🧠</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>Claude</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>Anthropic Claude</div>
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
              onClick={() => handleOpenApiKeyModal('ollama')}
              style={{
                padding: '20px',
                backgroundColor: '#F9FAFB',
                borderRadius: '12px',
                border: '2px solid #E5E7EB',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.backgroundColor = '#EFF6FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '24px' }}>🦙</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>Ollama</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>ローカルモデル</div>
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

        {/* APIキー設定モーダル */}
        {showApiKeyModal && selectedProvider && (
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
            onClick={() => {
              setShowApiKeyModal(false);
              setSelectedProvider(null);
              setTempApiKey('');
            }}
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
                    onChange={(e) => setTempApiKey(e.target.value)}
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
                      onChange={(e) => setTempApiKey(e.target.value)}
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
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setSelectedProvider(null);
                    setTempApiKey('');
                  }}
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
                  onClick={selectedProvider === 'ollama' ? handleOllamaUrlSave : handleSaveApiKey}
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
        )}

        {/* 埋め込み生成の設定 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
            🔧 埋め込み生成の設定
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
            RAG検索で使用する埋め込み生成のプロバイダーを選択できます。Ollamaを使用すると、ローカルで無料で埋め込みを生成できます。
          </p>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              プロバイダー
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleProviderChange('openai')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: embeddingProvider === 'openai' ? '#3B82F6' : '#F3F4F6',
                  color: embeddingProvider === 'openai' ? '#FFFFFF' : '#6B7280',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                OpenAI
              </button>
              <button
                onClick={() => handleProviderChange('ollama')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: embeddingProvider === 'ollama' ? '#3B82F6' : '#F3F4F6',
                  color: embeddingProvider === 'ollama' ? '#FFFFFF' : '#6B7280',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Ollama（ローカル・無料）
              </button>
            </div>
          </div>

          {embeddingProvider === 'openai' && (
            <div style={{
              padding: '16px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}>
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                <strong>OpenAI API</strong>を使用します。
              </p>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
                環境変数 <code style={{ backgroundColor: '#E5E7EB', padding: '2px 6px', borderRadius: '4px' }}>NEXT_PUBLIC_OPENAI_API_KEY</code> にAPIキーを設定してください。
              </p>
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px', marginBottom: 0 }}>
                💡 コスト: text-embedding-3-smallモデルは$0.02/1Mトークン（約0.00002円/1,000トークン）
              </p>
            </div>
          )}

          {embeddingProvider === 'ollama' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                  Ollama API URL
                </label>
                <input
                  type="text"
                  value={ollamaApiUrl}
                  onChange={(e) => handleOllamaUrlChange(e.target.value)}
                  placeholder="http://localhost:11434/api/embeddings"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                  埋め込みモデル
                </label>
                <select
                  value={ollamaModel}
                  onChange={(e) => handleOllamaModelChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="nomic-embed-text">nomic-embed-text（推奨）</option>
                  <option value="all-minilm">all-minilm</option>
                  <option value="mxbai-embed-large">mxbai-embed-large</option>
                </select>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: '#F0FDF4',
                borderRadius: '8px',
                border: '1px solid #86EFAC',
              }}>
                <p style={{ fontSize: '14px', color: '#065F46', marginBottom: '8px' }}>
                  <strong>✅ Ollamaを使用すると完全無料</strong>
                </p>
                <p style={{ fontSize: '12px', color: '#047857', margin: 0 }}>
                  💡 Ollamaをインストールして起動してください: <code style={{ backgroundColor: '#D1FAE5', padding: '2px 6px', borderRadius: '4px' }}>ollama serve</code>
                </p>
                <p style={{ fontSize: '12px', color: '#047857', marginTop: '8px', marginBottom: 0 }}>
                  💡 埋め込みモデルをプル: <code style={{ backgroundColor: '#D1FAE5', padding: '2px 6px', borderRadius: '4px' }}>ollama pull nomic-embed-text</code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ベクトルデータベースの設定 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
            🚀 ベクトルデータベース（ChromaDB）
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
            ChromaDBは常に有効です。大量データでの検索速度が100倍以上向上します。
          </p>

          <div style={{
            padding: '16px',
            backgroundColor: '#D1FAE5',
            borderRadius: '8px',
            border: '1px solid #10B981',
            marginBottom: '16px',
          }}>
            <p style={{ fontSize: '14px', color: '#065F46', marginBottom: '8px' }}>
              <strong>✅ ChromaDB統合完了</strong>
            </p>
            <p style={{ fontSize: '12px', color: '#065F46', margin: 0 }}>
              Rust側でChromaDB Serverが統合されました。<br />
              アプリケーション起動時に自動的にChromaDB Serverが起動します。<br />
              Python環境とChromaDBのインストールが必要です。
            </p>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: '#EFF6FF',
            borderRadius: '8px',
            border: '1px solid #3B82F6',
            marginBottom: '16px',
          }}>
            <p style={{ fontSize: '14px', color: '#1E40AF', marginBottom: '8px' }}>
              <strong>💡 使用方法</strong>
            </p>
            <ul style={{ fontSize: '12px', color: '#1E40AF', margin: 0, paddingLeft: '20px' }}>
              <li>Python 3.8-3.11がインストールされていることを確認</li>
              <li>ChromaDBがインストールされていることを確認（pip install chromadb）</li>
              <li>アプリケーションを再起動すると、ChromaDB Serverが自動的に起動します</li>
              <li>埋め込みの保存・検索がChromaDB経由で行われます</li>
            </ul>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: '#F3F4F6',
            borderRadius: '8px',
            border: '1px solid #D1D5DB',
          }}>
            <p style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
              <strong>📊 現在の動作</strong>
            </p>
            <ul style={{ fontSize: '12px', color: '#374151', margin: 0, paddingLeft: '20px' }}>
              <li>エンティティ埋め込み: ChromaDBに保存・検索</li>
              <li>リレーション埋め込み: ChromaDBに保存・検索</li>
              <li>トピック埋め込み: ChromaDBに保存・検索</li>
            </ul>
          </div>
        </div>

        {/* 環境変数の説明（開発者向け） */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
            📝 環境変数の設定（開発者向け）
          </h2>
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#EFF6FF',
            borderRadius: '8px',
            border: '1px solid #3B82F6',
            marginBottom: '16px',
          }}>
            <p style={{ fontSize: '14px', color: '#1E40AF', margin: 0 }}>
              💡 <strong>通常のユーザーは上記のGUI設定を使用してください。</strong> 環境変数の設定は開発者向けの方法です。
            </p>
          </div>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>OpenAI APIを使用する場合:</strong>
            </p>
            <pre style={{
              backgroundColor: '#F9FAFB',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              overflow: 'auto',
              marginBottom: '16px',
            }}>
{`# .env.local
NEXT_PUBLIC_OPENAI_API_KEY=your-api-key-here
NEXT_PUBLIC_EMBEDDING_PROVIDER=openai`}
            </pre>

            <p style={{ marginBottom: '12px' }}>
              <strong>Ollamaを使用する場合:</strong>
            </p>
            <pre style={{
              backgroundColor: '#F9FAFB',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              overflow: 'auto',
            }}>
{`# .env.local
NEXT_PUBLIC_EMBEDDING_PROVIDER=ollama
NEXT_PUBLIC_OLLAMA_API_URL=http://localhost:11434/api/embeddings`}
            </pre>
          </div>
        </div>

        {/* CSVインポート機能 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
            📥 データインポート
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
            CSVファイルから組織、メンバー、事業会社のデータをインポートできます。
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                try {
                  const preview = await loadCSVPreview(file);
                  
                  // 複数セクションかどうかを判定
                  if ('sections' in preview) {
                    setMultiSectionPreview(preview);
                    setImportPreview(null);
                    setSelectedSectionIndex(0);
                  } else {
                    setImportPreview(preview);
                    setMultiSectionPreview(null);
                    setSelectedSectionIndex(0);
                  }
                  
                  setShowImportModal(true);
                } catch (error: any) {
                  alert(`CSVファイルの読み込みに失敗しました: ${error.message}`);
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#FFFFFF',
                backgroundColor: '#4262FF',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#3151CC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4262FF';
              }}
            >
              📄 CSVファイルを選択
            </button>
          </div>
        </div>
      </div>

      {/* CSVインポートプレビューモーダル（単一セクション） */}
      {showImportModal && importPreview && !multiSectionPreview && (
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
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowImportModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              width: '100%',
              maxWidth: '1200px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>
                CSVインポートプレビュー
              </h2>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* 統計情報 */}
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}>
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#EFF6FF',
                borderRadius: '8px',
                border: '1px solid #3B82F6',
              }}>
                <div style={{ fontSize: '12px', color: '#1E40AF', marginBottom: '4px' }}>タイプ</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1E40AF' }}>
                  {importPreview.type === 'organizations' ? '組織' : 
                   importPreview.type === 'members' ? 'メンバー' : '事業会社'}
                </div>
              </div>
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#F0FDF4',
                borderRadius: '8px',
                border: '1px solid #10B981',
              }}>
                <div style={{ fontSize: '12px', color: '#065F46', marginBottom: '4px' }}>総行数</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#065F46' }}>
                  {importPreview.totalRows}件
                </div>
              </div>
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#F0FDF4',
                borderRadius: '8px',
                border: '1px solid #10B981',
              }}>
                <div style={{ fontSize: '12px', color: '#065F46', marginBottom: '4px' }}>有効な行</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#065F46' }}>
                  {importPreview.validRows}件
                </div>
              </div>
              {importPreview.errorRows > 0 && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#FEF2F2',
                  borderRadius: '8px',
                  border: '1px solid #EF4444',
                }}>
                  <div style={{ fontSize: '12px', color: '#991B1B', marginBottom: '4px' }}>エラー行</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#991B1B' }}>
                    {importPreview.errorRows}件
                  </div>
                </div>
              )}
            </div>

            {/* プレビューテーブル */}
            <div style={{
              maxHeight: '500px',
              overflow: 'auto',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              marginBottom: '24px',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}>
                <thead style={{
                  backgroundColor: '#F9FAFB',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                }}>
                  <tr>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '2px solid #E5E7EB',
                      fontWeight: '600',
                      color: '#374151',
                      minWidth: '80px',
                    }}>行番号</th>
                    {importPreview.headers.map((header, index) => (
                      <th
                        key={index}
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          borderBottom: '2px solid #E5E7EB',
                          fontWeight: '600',
                          color: '#374151',
                          minWidth: '120px',
                        }}
                      >
                        {header}
                      </th>
                    ))}
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '2px solid #E5E7EB',
                      fontWeight: '600',
                      color: '#374151',
                      minWidth: '100px',
                    }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: row.errors && row.errors.length > 0 ? '#FEF2F2' : '#FFFFFF',
                        borderBottom: '1px solid #E5E7EB',
                      }}
                    >
                      <td style={{ padding: '12px', color: '#6B7280' }}>
                        {rowIndex + 1}
                        {row.errors && row.errors.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>
                            ⚠️ {row.errors.join(', ')}
                          </div>
                        )}
                      </td>
                      {importPreview.headers.map((header, colIndex) => (
                        <td key={colIndex} style={{ padding: '12px' }}>
                          {editingRowIndex?.rowIndex === rowIndex ? (
                            <input
                              type="text"
                              value={row.data[header] || ''}
                              onChange={(e) => {
                                const newRows = [...importPreview.rows];
                                newRows[rowIndex] = {
                                  ...newRows[rowIndex],
                                  data: {
                                    ...newRows[rowIndex].data,
                                    [header]: e.target.value,
                                  },
                                  // 編集後にエラーを再チェック
                                  errors: undefined,
                                };
                                setImportPreview({
                                  ...importPreview,
                                  rows: newRows,
                                  validRows: newRows.filter(r => !r.errors || r.errors.length === 0).length,
                                  errorRows: newRows.filter(r => r.errors && r.errors.length > 0).length,
                                });
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: '1px solid #D1D5DB',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          ) : (
                            <div style={{ color: '#374151', wordBreak: 'break-word' }}>
                              {row.data[header] || '-'}
                            </div>
                          )}
                        </td>
                      ))}
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {editingRowIndex?.rowIndex === rowIndex ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  // バリデーションを再実行
                                  const updatedRow = importPreview.rows[rowIndex];
                                  const errors: string[] = [];
                                  
                                  if (importPreview.type === 'organizations') {
                                    const id = updatedRow.data['ID'] || updatedRow.data['id'] || '';
                                    const name = updatedRow.data['組織名'] || updatedRow.data['name'] || '';
                                    if (!id) errors.push('IDが必須です');
                                    if (!name) errors.push('組織名が必須です');
                                  } else if (importPreview.type === 'members') {
                                    const id = updatedRow.data['ID'] || updatedRow.data['id'] || '';
                                    const name = updatedRow.data['メンバー名'] || updatedRow.data['名前'] || updatedRow.data['name'] || '';
                                    const orgId = updatedRow.data['組織ID'] || updatedRow.data['organizationId'] || '';
                                    if (!id) errors.push('IDが必須です');
                                    if (!name) errors.push('メンバー名が必須です');
                                    if (!orgId) errors.push('組織IDが必須です');
                                  } else if (importPreview.type === 'companies') {
                                    const id = updatedRow.data['ID'] || updatedRow.data['id'] || '';
                                    const name = updatedRow.data['会社名'] || updatedRow.data['name'] || '';
                                    if (!id) errors.push('IDが必須です');
                                    if (!name) errors.push('会社名が必須です');
                                  }
                                  
                                  const newRows = [...importPreview.rows];
                                  newRows[rowIndex] = {
                                    ...updatedRow,
                                    errors: errors.length > 0 ? errors : undefined,
                                  };
                                  
                                  setImportPreview({
                                    ...importPreview,
                                    rows: newRows,
                                    validRows: newRows.filter(r => !r.errors || r.errors.length === 0).length,
                                    errorRows: newRows.filter(r => r.errors && r.errors.length > 0).length,
                                  });
                                  setEditingRowIndex(null);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  backgroundColor: '#10B981',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                保存
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRowIndex(null)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  backgroundColor: '#6B7280',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                キャンセル
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingRowIndex({ rowIndex })}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  backgroundColor: '#4262FF',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                編集
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTargetRowIndex(rowIndex);
                                  setShowDeleteConfirmModal(true);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  backgroundColor: '#EF4444',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                削除
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* アクションボタン */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!importPreview) return;
                  
                  setIsImporting(true);
                  setImportProgress({ current: 0, total: importPreview.validRows });
                  
                  try {
                    // 有効な行のみをフィルタリング
                    const validRows = importPreview.rows.filter(row => !row.errors || row.errors.length === 0);
                    
                    // 並列処理のバッチサイズ（一度に処理する数）
                    const BATCH_SIZE = 10;
                    let successCount = 0;
                    let errorCount = 0;
                    
                    // バッチごとに処理
                    for (let batchStart = 0; batchStart < validRows.length; batchStart += BATCH_SIZE) {
                      const batchEnd = Math.min(batchStart + BATCH_SIZE, validRows.length);
                      const batch = validRows.slice(batchStart, batchEnd);
                      
                      // バッチ内を並列処理
                      const results = await Promise.allSettled(
                        batch.map(async (row) => {
                          try {
                            if (importPreview.type === 'organizations') {
                              const parentId = row.data['親組織ID'] || row.data['parentId'] || null;
                              const name = row.data['組織名'] || row.data['name'] || '';
                              const title = row.data['タイトル'] || row.data['title'] || null;
                              const description = row.data['説明'] || row.data['description'] || null;
                              const level = parseInt(row.data['階層レベル'] || row.data['level'] || '0', 10);
                              const levelName = row.data['階層名称'] || row.data['levelName'] || '部門';
                              const position = parseInt(row.data['表示順序'] || row.data['position'] || '0', 10);
                              
                              await createOrg(parentId, name, title, description, level, levelName, position);
                              return { success: true };
                            } else if (importPreview.type === 'members') {
                              const organizationId = row.data['組織ID'] || row.data['organizationId'] || '';
                              const name = row.data['メンバー名'] || row.data['名前'] || row.data['name'] || '';
                              const position = row.data['役職'] || row.data['position'] || null;
                              
                              await addOrgMember(organizationId, {
                                name,
                                title: position,
                                nameRomaji: row.data['名前（ローマ字）'] || row.data['nameRomaji'] || null,
                                department: row.data['部署'] || row.data['部門'] || row.data['department'] || null,
                                extension: row.data['内線番号'] || row.data['内線'] || row.data['extension'] || null,
                                companyPhone: row.data['会社電話番号'] || row.data['会社電話'] || row.data['companyPhone'] || null,
                                mobilePhone: row.data['携帯電話番号'] || row.data['携帯電話'] || row.data['mobilePhone'] || null,
                                email: row.data['メールアドレス'] || row.data['メール'] || row.data['email'] || null,
                                itochuEmail: row.data['伊藤忠メールアドレス'] || row.data['伊藤忠メール'] || row.data['itochuEmail'] || null,
                                teams: row.data['Teams'] || row.data['teams'] || null,
                                employeeType: row.data['雇用形態'] || row.data['社員タイプ'] || row.data['employeeType'] || null,
                                roleName: row.data['ロール名'] || row.data['役割名'] || row.data['roleName'] || null,
                                indicator: row.data['インジケーター'] || row.data['インディケータ'] || row.data['indicator'] || null,
                                location: row.data['所在地'] || row.data['場所'] || row.data['location'] || null,
                                floorDoorNo: row.data['フロア・ドア番号'] || row.data['階・ドア番号'] || row.data['floorDoorNo'] || null,
                                previousName: row.data['以前の名前'] || row.data['旧名'] || row.data['previousName'] || null,
                              });
                              return { success: true };
                            } else if (importPreview.type === 'companies') {
                              // 事業会社のインポート（後で実装）
                              console.warn('事業会社のインポートは未実装です');
                              return { success: false, error: '未実装' };
                            }
                            return { success: false, error: '不明なタイプ' };
                          } catch (error: any) {
                            console.error(`行のインポートエラー:`, error);
                            return { success: false, error: error.message };
                          }
                        })
                      );
                      
                      // 結果を集計
                      for (const result of results) {
                        if (result.status === 'fulfilled' && result.value.success) {
                          successCount++;
                        } else {
                          errorCount++;
                        }
                      }
                      
                      // プログレスを更新（バッチごと）
                      setImportProgress({ current: successCount + errorCount, total: importPreview.validRows });
                    }
                    
                    // エラー行もカウント
                    errorCount += importPreview.rows.length - validRows.length;
                    
                    alert(`インポートが完了しました。\n成功: ${successCount}件\nエラー: ${errorCount}件`);
                    setShowImportModal(false);
                    setImportPreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  } catch (error: any) {
                    alert(`インポート中にエラーが発生しました: ${error.message}`);
                  } finally {
                    setIsImporting(false);
                    setImportProgress({ current: 0, total: 0 });
                  }
                }}
                disabled={isImporting || importPreview.validRows === 0}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  backgroundColor: isImporting || importPreview.validRows === 0 ? '#9CA3AF' : '#4262FF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isImporting || importPreview.validRows === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {isImporting ? (
                  `インポート中... (${importProgress.current}/${importProgress.total})`
                ) : (
                  `インポート実行 (${importPreview.validRows}件)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSVインポートプレビューモーダル（複数セクション） */}
      {showImportModal && multiSectionPreview && (
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
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowImportModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              width: '100%',
              maxWidth: '1400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>
                CSVインポートプレビュー（複数セクション）
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setMultiSectionPreview(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* セクションタブ */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #E5E7EB' }}>
              {multiSectionPreview.sections.map((section, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedSectionIndex(index)}
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: selectedSectionIndex === index ? '600' : '400',
                    color: selectedSectionIndex === index ? '#4262FF' : '#6B7280',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: selectedSectionIndex === index ? '3px solid #4262FF' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  {section.title} ({section.preview.totalRows}件)
                </button>
              ))}
            </div>

            {/* 選択されたセクションのプレビュー */}
            {multiSectionPreview.sections[selectedSectionIndex] && (() => {
              const currentSection = multiSectionPreview.sections[selectedSectionIndex];
              const currentPreview = currentSection.preview;
              
              return (
                <>
                  {/* 統計情報 */}
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                  }}>
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: '#EFF6FF',
                      borderRadius: '8px',
                      border: '1px solid #3B82F6',
                    }}>
                      <div style={{ fontSize: '12px', color: '#1E40AF', marginBottom: '4px' }}>タイプ</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#1E40AF' }}>
                        {currentPreview.type === 'organizations' ? '組織' : 
                         currentPreview.type === 'members' ? 'メンバー' : '事業会社'}
                      </div>
                    </div>
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: '#F0FDF4',
                      borderRadius: '8px',
                      border: '1px solid #10B981',
                    }}>
                      <div style={{ fontSize: '12px', color: '#065F46', marginBottom: '4px' }}>総行数</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#065F46' }}>
                        {currentPreview.totalRows}件
                      </div>
                    </div>
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: '#F0FDF4',
                      borderRadius: '8px',
                      border: '1px solid #10B981',
                    }}>
                      <div style={{ fontSize: '12px', color: '#065F46', marginBottom: '4px' }}>有効な行</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#065F46' }}>
                        {currentPreview.validRows}件
                      </div>
                    </div>
                    {currentPreview.errorRows > 0 && (
                      <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#FEF2F2',
                        borderRadius: '8px',
                        border: '1px solid #EF4444',
                      }}>
                        <div style={{ fontSize: '12px', color: '#991B1B', marginBottom: '4px' }}>エラー行</div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#991B1B' }}>
                          {currentPreview.errorRows}件
                        </div>
                      </div>
                    )}
                  </div>

                  {/* プレビューテーブル */}
                  <div style={{
                    maxHeight: '500px',
                    overflow: 'auto',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    marginBottom: '24px',
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '14px',
                    }}>
                      <thead style={{
                        backgroundColor: '#F9FAFB',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                      }}>
                        <tr>
                          <th style={{
                            padding: '12px',
                            textAlign: 'left',
                            borderBottom: '2px solid #E5E7EB',
                            fontWeight: '600',
                            color: '#374151',
                            minWidth: '80px',
                          }}>行番号</th>
                          {currentPreview.headers.map((header, index) => (
                            <th
                              key={index}
                              style={{
                                padding: '12px',
                                textAlign: 'left',
                                borderBottom: '2px solid #E5E7EB',
                                fontWeight: '600',
                                color: '#374151',
                                minWidth: '120px',
                              }}
                            >
                              {header}
                            </th>
                          ))}
                          <th style={{
                            padding: '12px',
                            textAlign: 'left',
                            borderBottom: '2px solid #E5E7EB',
                            fontWeight: '600',
                            color: '#374151',
                            minWidth: '150px',
                          }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPreview.rows.map((row, rowIndex) => (
                          <tr
                            key={row.id}
                            style={{
                              backgroundColor: row.errors && row.errors.length > 0 ? '#FEF2F2' : '#FFFFFF',
                              borderBottom: '1px solid #E5E7EB',
                            }}
                          >
                            <td style={{ padding: '12px', color: '#6B7280' }}>
                              {rowIndex + 1}
                              {row.errors && row.errors.length > 0 && (
                                <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>
                                  ⚠️ {row.errors.join(', ')}
                                </div>
                              )}
                            </td>
                            {currentPreview.headers.map((header, colIndex) => (
                              <td key={colIndex} style={{ padding: '12px' }}>
                                {editingRowIndex?.sectionIndex === selectedSectionIndex && editingRowIndex?.rowIndex === rowIndex ? (
                                  <input
                                    type="text"
                                    value={row.data[header] || ''}
                                    onChange={(e) => {
                                      const newSections = [...multiSectionPreview.sections];
                                      const newRows = [...newSections[selectedSectionIndex].preview.rows];
                                      newRows[rowIndex] = {
                                        ...newRows[rowIndex],
                                        data: {
                                          ...newRows[rowIndex].data,
                                          [header]: e.target.value,
                                        },
                                        errors: undefined,
                                      };
                                      newSections[selectedSectionIndex].preview = {
                                        ...newSections[selectedSectionIndex].preview,
                                        rows: newRows,
                                        validRows: newRows.filter(r => !r.errors || r.errors.length === 0).length,
                                        errorRows: newRows.filter(r => r.errors && r.errors.length > 0).length,
                                      };
                                      setMultiSectionPreview({ sections: newSections });
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '6px 8px',
                                      border: '1px solid #D1D5DB',
                                      borderRadius: '4px',
                                      fontSize: '14px',
                                    }}
                                  />
                                ) : (
                                  <div style={{ color: '#374151', wordBreak: 'break-word' }}>
                                    {row.data[header] || '-'}
                                  </div>
                                )}
                              </td>
                            ))}
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {editingRowIndex?.sectionIndex === selectedSectionIndex && editingRowIndex?.rowIndex === rowIndex ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // バリデーションを再実行
                                        const updatedRow = currentPreview.rows[rowIndex];
                                        const errors: string[] = [];
                                        
                                        if (currentPreview.type === 'organizations') {
                                          const id = updatedRow.data['ID'] || updatedRow.data['id'] || '';
                                          const name = updatedRow.data['組織名'] || updatedRow.data['name'] || '';
                                          if (!id) errors.push('IDが必須です');
                                          if (!name) errors.push('組織名が必須です');
                                        } else if (currentPreview.type === 'members') {
                                          const id = updatedRow.data['ID'] || updatedRow.data['id'] || '';
                                          const name = updatedRow.data['メンバー名'] || updatedRow.data['名前'] || updatedRow.data['name'] || '';
                                          const orgId = updatedRow.data['組織ID'] || updatedRow.data['organizationId'] || '';
                                          if (!id) errors.push('IDが必須です');
                                          if (!name) errors.push('メンバー名が必須です');
                                          if (!orgId) errors.push('組織IDが必須です');
                                        } else if (currentPreview.type === 'companies') {
                                          const id = updatedRow.data['ID'] || updatedRow.data['id'] || '';
                                          const name = updatedRow.data['会社名'] || updatedRow.data['name'] || '';
                                          if (!id) errors.push('IDが必須です');
                                          if (!name) errors.push('会社名が必須です');
                                        }
                                        
                                        const newSections = [...multiSectionPreview.sections];
                                        const newRows = [...newSections[selectedSectionIndex].preview.rows];
                                        newRows[rowIndex] = {
                                          ...updatedRow,
                                          errors: errors.length > 0 ? errors : undefined,
                                        };
                                        
                                        newSections[selectedSectionIndex].preview = {
                                          ...newSections[selectedSectionIndex].preview,
                                          rows: newRows,
                                          validRows: newRows.filter(r => !r.errors || r.errors.length === 0).length,
                                          errorRows: newRows.filter(r => r.errors && r.errors.length > 0).length,
                                        };
                                        
                                        setMultiSectionPreview({ sections: newSections });
                                        setEditingRowIndex(null);
                                      }}
                                      style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        backgroundColor: '#10B981',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      保存
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingRowIndex(null)}
                                      style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        backgroundColor: '#6B7280',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      キャンセル
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setEditingRowIndex({ sectionIndex: selectedSectionIndex, rowIndex })}
                                      style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        backgroundColor: '#4262FF',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      編集
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeleteTargetRowIndex(rowIndex);
                                        setShowDeleteConfirmModal(true);
                                      }}
                                      style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        backgroundColor: '#EF4444',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      削除
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* アクションボタン */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportModal(false);
                        setMultiSectionPreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      style={{
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        backgroundColor: '#FFFFFF',
                        border: '1.5px solid #D1D5DB',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!multiSectionPreview) return;
                        
                        setIsImporting(true);
                        const totalValidRows = multiSectionPreview.sections.reduce((sum, s) => sum + s.preview.validRows, 0);
                        setImportProgress({ current: 0, total: totalValidRows });
                        
                        try {
                          const BATCH_SIZE = 10;
                          let totalSuccessCount = 0;
                          let totalErrorCount = 0;
                          
                          // 各セクションを順次処理
                          for (const section of multiSectionPreview.sections) {
                            const preview = section.preview;
                            const validRows = preview.rows.filter(row => !row.errors || row.errors.length === 0);
                            
                            // バッチごとに処理
                            for (let batchStart = 0; batchStart < validRows.length; batchStart += BATCH_SIZE) {
                              const batchEnd = Math.min(batchStart + BATCH_SIZE, validRows.length);
                              const batch = validRows.slice(batchStart, batchEnd);
                              
                              // バッチ内を並列処理
                              const results = await Promise.allSettled(
                                batch.map(async (row) => {
                                  try {
                                    if (preview.type === 'organizations') {
                                      const parentId = row.data['親組織ID'] || row.data['parentId'] || null;
                                      const name = row.data['組織名'] || row.data['name'] || '';
                                      const title = row.data['タイトル'] || row.data['title'] || null;
                                      const description = row.data['説明'] || row.data['description'] || null;
                                      const level = parseInt(row.data['階層レベル'] || row.data['level'] || '0', 10);
                                      const levelName = row.data['階層名称'] || row.data['levelName'] || '部門';
                                      const position = parseInt(row.data['表示順序'] || row.data['position'] || '0', 10);
                                      
                                      await createOrg(parentId, name, title, description, level, levelName, position);
                                      return { success: true };
                                    } else if (preview.type === 'members') {
                                      const organizationId = row.data['組織ID'] || row.data['organizationId'] || '';
                                      const name = row.data['メンバー名'] || row.data['名前'] || row.data['name'] || '';
                                      const position = row.data['役職'] || row.data['position'] || null;
                                      
                                      await addOrgMember(organizationId, {
                                        name,
                                        title: position,
                                        nameRomaji: row.data['名前（ローマ字）'] || row.data['nameRomaji'] || null,
                                        department: row.data['部署'] || row.data['部門'] || row.data['department'] || null,
                                        extension: row.data['内線番号'] || row.data['内線'] || row.data['extension'] || null,
                                        companyPhone: row.data['会社電話番号'] || row.data['会社電話'] || row.data['companyPhone'] || null,
                                        mobilePhone: row.data['携帯電話番号'] || row.data['携帯電話'] || row.data['mobilePhone'] || null,
                                        email: row.data['メールアドレス'] || row.data['メール'] || row.data['email'] || null,
                                        itochuEmail: row.data['伊藤忠メールアドレス'] || row.data['伊藤忠メール'] || row.data['itochuEmail'] || null,
                                        teams: row.data['Teams'] || row.data['teams'] || null,
                                        employeeType: row.data['雇用形態'] || row.data['社員タイプ'] || row.data['employeeType'] || null,
                                        roleName: row.data['ロール名'] || row.data['役割名'] || row.data['roleName'] || null,
                                        indicator: row.data['インジケーター'] || row.data['インディケータ'] || row.data['indicator'] || null,
                                        location: row.data['所在地'] || row.data['場所'] || row.data['location'] || null,
                                        floorDoorNo: row.data['フロア・ドア番号'] || row.data['階・ドア番号'] || row.data['floorDoorNo'] || null,
                                        previousName: row.data['以前の名前'] || row.data['旧名'] || row.data['previousName'] || null,
                                      });
                                      return { success: true };
                                    } else if (preview.type === 'companies') {
                                      console.warn('事業会社のインポートは未実装です');
                                      return { success: false, error: '未実装' };
                                    }
                                    return { success: false, error: '不明なタイプ' };
                                  } catch (error: any) {
                                    console.error(`行のインポートエラー:`, error);
                                    return { success: false, error: error.message };
                                  }
                                })
                              );
                              
                              // 結果を集計
                              for (const result of results) {
                                if (result.status === 'fulfilled' && result.value.success) {
                                  totalSuccessCount++;
                                } else {
                                  totalErrorCount++;
                                }
                              }
                              
                              // プログレスを更新（バッチごと）
                              setImportProgress({ current: totalSuccessCount + totalErrorCount, total: totalValidRows });
                            }
                            
                            // エラー行もカウント
                            totalErrorCount += preview.rows.length - validRows.length;
                          }
                          
                          alert(`インポートが完了しました。\n成功: ${totalSuccessCount}件\nエラー: ${totalErrorCount}件`);
                          setShowImportModal(false);
                          setMultiSectionPreview(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        } catch (error: any) {
                          alert(`インポート中にエラーが発生しました: ${error.message}`);
                        } finally {
                          setIsImporting(false);
                          setImportProgress({ current: 0, total: 0 });
                        }
                      }}
                      disabled={isImporting || currentPreview.validRows === 0}
                      style={{
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#FFFFFF',
                        backgroundColor: isImporting || currentPreview.validRows === 0 ? '#9CA3AF' : '#4262FF',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isImporting || currentPreview.validRows === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isImporting ? (
                        `インポート中... (${importProgress.current}/${importProgress.total})`
                      ) : (
                        `インポート実行 (${currentPreview.validRows}件)`
                      )}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {showDeleteConfirmModal && (
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
            zIndex: 2000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteConfirmModal(false);
              setDeleteTargetRowIndex(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              行を削除しますか？
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
              この操作は取り消せません。この行を削除してもよろしいですか？
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeleteTargetRowIndex(null);
                }}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteTargetRowIndex !== null) {
                    if (multiSectionPreview) {
                      const newSections = [...multiSectionPreview.sections];
                      const newRows = newSections[selectedSectionIndex].preview.rows.filter((_, idx) => idx !== deleteTargetRowIndex);
                      newSections[selectedSectionIndex].preview = {
                        ...newSections[selectedSectionIndex].preview,
                        rows: newRows,
                        totalRows: newRows.length,
                        validRows: newRows.filter(r => !r.errors || r.errors.length === 0).length,
                        errorRows: newRows.filter(r => r.errors && r.errors.length > 0).length,
                      };
                      setMultiSectionPreview({ sections: newSections });
                    } else if (importPreview) {
                      const newRows = importPreview.rows.filter((_, idx) => idx !== deleteTargetRowIndex);
                      setImportPreview({
                        ...importPreview,
                        rows: newRows,
                        totalRows: newRows.length,
                        validRows: newRows.filter(r => !r.errors || r.errors.length === 0).length,
                        errorRows: newRows.filter(r => r.errors && r.errors.length > 0).length,
                      });
                    }
                  }
                  setShowDeleteConfirmModal(false);
                  setDeleteTargetRowIndex(null);
                }}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  backgroundColor: '#EF4444',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
