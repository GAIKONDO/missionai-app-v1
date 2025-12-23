'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import type { EmbeddingProvider } from '@/lib/embeddings';
import type { ImportPreview, MultiSectionImportPreview } from '@/lib/csvImport';
import { SettingsTabBar, type SettingsTab } from './components/SettingsTabBar';
import ApiKeySettings from './components/ApiKeySettings';
import ApiKeyModal from './components/ApiKeyModal';
import EmbeddingSettings from './components/EmbeddingSettings';
import SqliteSettings from './components/SqliteSettings';
import VectorDatabaseSettings from './components/VectorDatabaseSettings';
import EnvironmentVariablesInfo from './components/EnvironmentVariablesInfo';
import CsvImportSection from './components/CsvImportSection';
import CsvImportPreviewModal from './components/CsvImportPreviewModal';
import { LayerStructureOverviewSection } from '@/components/design/sections/orchestration-mcp-llm/LayerStructureOverviewSection';
import { ArchitectureDiagramSection } from '@/components/design/sections/orchestration-mcp-llm/ArchitectureDiagramSection';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('architecture');
  const [embeddingProvider, setEmbeddingProvider] = useState<EmbeddingProvider>('openai');
  const [ollamaApiUrl, setOllamaApiUrl] = useState<string>('http://localhost:11434/api/embeddings');
  const [ollamaModel, setOllamaModel] = useState<string>('nomic-embed-text');
  
  // APIキー設定
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [claudeApiKey, setClaudeApiKey] = useState<string>('');
  const [ollamaApiUrlForChat, setOllamaApiUrlForChat] = useState<string>('http://localhost:11434/api/chat');
  
  // モーダル状態
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [tempApiKey, setTempApiKey] = useState<string>('');
  
  // CSVインポート状態
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [multiSectionPreview, setMultiSectionPreview] = useState<MultiSectionImportPreview | null>(null);

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

  const handleOpenApiKeyModal = (provider: string) => {
    setSelectedProvider(provider);
    setShowApiKeyModal(true);
    
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

  const handleCsvPreviewLoaded = (preview: ImportPreview | MultiSectionImportPreview) => {
    if ('sections' in preview) {
      setMultiSectionPreview(preview);
      setImportPreview(null);
    } else {
      setImportPreview(preview);
      setMultiSectionPreview(null);
    }
    setShowImportModal(true);
  };

  const handlePreviewUpdate = (preview: ImportPreview | MultiSectionImportPreview | null) => {
    if (preview === null) {
      setImportPreview(null);
      setMultiSectionPreview(null);
    } else if ('sections' in preview) {
      setMultiSectionPreview(preview);
      setImportPreview(null);
    } else {
      setImportPreview(preview);
      setMultiSectionPreview(null);
    }
  };

  return (
    <Layout>
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '32px', color: 'var(--color-text)' }}>
          設定
        </h1>

        <SettingsTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'architecture' && (
          <div style={{ marginTop: '24px' }}>
            <LayerStructureOverviewSection />
            <ArchitectureDiagramSection />
          </div>
        )}

        {activeTab === 'api-keys' && (
          <ApiKeySettings
            openaiApiKey={openaiApiKey}
            geminiApiKey={geminiApiKey}
            claudeApiKey={claudeApiKey}
            ollamaApiUrlForChat={ollamaApiUrlForChat}
            onOpenModal={handleOpenApiKeyModal}
          />
        )}

        {activeTab === 'embeddings' && (
          <EmbeddingSettings
            embeddingProvider={embeddingProvider}
            ollamaApiUrl={ollamaApiUrl}
            ollamaModel={ollamaModel}
            onProviderChange={handleProviderChange}
            onOllamaUrlChange={handleOllamaUrlChange}
            onOllamaModelChange={handleOllamaModelChange}
          />
        )}

        {activeTab === 'sqlite' && (
          <SqliteSettings />
        )}

        {activeTab === 'vector-db' && (
          <VectorDatabaseSettings />
        )}

        {activeTab === 'import' && (
          <CsvImportSection onPreviewLoaded={handleCsvPreviewLoaded} />
        )}

        {activeTab === 'env' && (
          <EnvironmentVariablesInfo />
        )}

        {showApiKeyModal && selectedProvider && (
          <ApiKeyModal
            selectedProvider={selectedProvider}
            tempApiKey={tempApiKey}
            onClose={() => {
              setShowApiKeyModal(false);
              setSelectedProvider(null);
              setTempApiKey('');
            }}
            onSave={handleSaveApiKey}
            onOllamaUrlSave={handleOllamaUrlSave}
            onTempApiKeyChange={setTempApiKey}
          />
        )}

        <CsvImportPreviewModal
          isOpen={showImportModal}
          importPreview={importPreview}
          multiSectionPreview={multiSectionPreview}
          onClose={() => {
            setShowImportModal(false);
            setImportPreview(null);
            setMultiSectionPreview(null);
          }}
          onPreviewUpdate={handlePreviewUpdate}
        />
      </div>
    </Layout>
  );
}
