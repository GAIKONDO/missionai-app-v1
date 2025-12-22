'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';
import type { TopicInfo } from '@/lib/orgApi';

interface AIGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: 'description' | 'objective' | null;
  topics: TopicInfo[];
  localTopicIds: string[];
  selectedTopicIdsForAI: string[];
  setSelectedTopicIdsForAI: (ids: string[]) => void;
  aiGenerationInput: string;
  setAIGenerationInput: (input: string) => void;
  aiSummaryFormat: 'auto' | 'bullet' | 'paragraph' | 'custom';
  setAiSummaryFormat: (format: 'auto' | 'bullet' | 'paragraph' | 'custom') => void;
  aiSummaryLength: number;
  setAiSummaryLength: (length: number) => void;
  aiCustomPrompt: string;
  setAiCustomPrompt: (prompt: string) => void;
  aiGeneratedContent: string | null;
  originalContent: string | null;
  setAiGeneratedContent: (content: string | null) => void;
  setAiGeneratedTarget: (target: 'description' | 'objective' | null) => void;
  setOriginalContent: (content: string | null) => void;
  localDescription: string;
  localObjective: string;
  setLocalDescription: (description: string) => void;
  setLocalObjective: (objective: string) => void;
  setIsEditingDescription: (isEditing: boolean) => void;
  setIsEditingObjective: (isEditing: boolean) => void;
}

export default function AIGenerationModal({
  isOpen,
  onClose,
  target,
  topics,
  localTopicIds,
  selectedTopicIdsForAI,
  setSelectedTopicIdsForAI,
  aiGenerationInput,
  setAIGenerationInput,
  aiSummaryFormat,
  setAiSummaryFormat,
  aiSummaryLength,
  setAiSummaryLength,
  aiCustomPrompt,
  setAiCustomPrompt,
  aiGeneratedContent,
  originalContent,
  setAiGeneratedContent,
  setAiGeneratedTarget,
  setOriginalContent,
  localDescription,
  localObjective,
  setLocalDescription,
  setLocalObjective,
  setIsEditingDescription,
  setIsEditingObjective,
}: AIGenerationModalProps) {
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiModelType, setAiModelType] = useState<'gpt' | 'local'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiGenerationModelType');
      return (saved as 'gpt' | 'local') || 'gpt';
    }
    return 'gpt';
  });
  const [aiSelectedModel, setAiSelectedModel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiGenerationSelectedModel');
      return saved || 'gpt-4o-mini';
    }
    return 'gpt-4o-mini';
  });
  const [aiLocalModels, setAiLocalModels] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingAiLocalModels, setLoadingAiLocalModels] = useState(false);

  const gptModels = [
    { value: 'gpt-5.1', label: 'gpt-5.1' },
    { value: 'gpt-5', label: 'gpt-5' },
    { value: 'gpt-5-mini', label: 'gpt-5-mini' },
    { value: 'gpt-5-nano', label: 'gpt-5-nano' },
    { value: 'gpt-4.1', label: 'gpt-4.1' },
    { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
    { value: 'gpt-4.1-nano', label: 'gpt-4.1-nano' },
    { value: 'gpt-4o', label: 'gpt-4o' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  ];

  const availableAiModels = aiModelType === 'gpt' ? gptModels : aiLocalModels;

  useEffect(() => {
    if (aiModelType === 'local' && isOpen) {
      loadAiLocalModels();
    }
  }, [aiModelType, isOpen]);

  useEffect(() => {
    if (aiModelType) {
      localStorage.setItem('aiGenerationModelType', aiModelType);
    }
  }, [aiModelType]);

  useEffect(() => {
    if (aiSelectedModel) {
      localStorage.setItem('aiGenerationSelectedModel', aiSelectedModel);
    }
  }, [aiSelectedModel]);

  const loadAiLocalModels = async () => {
    setLoadingAiLocalModels(true);
    try {
      const models = await getAvailableOllamaModels();
      if (models.length > 0) {
        const formattedModels = models.map(model => {
          let label = model.name;
          if (model.name.includes(':')) {
            const [name, tag] = model.name.split(':');
            const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
            const spacedName = formattedName.replace(/([a-z])(\d)/g, '$1 $2');
            if (tag === 'latest') {
              label = `${spacedName} (Latest)`;
            } else {
              const formattedTag = tag.replace(/(\d)([a-z])/g, (match, num, letter) => `${num}${letter.toUpperCase()}`);
              label = `${spacedName} ${formattedTag}`;
            }
          } else {
            label = model.name.charAt(0).toUpperCase() + model.name.slice(1);
          }
          return { value: model.name, label };
        });
        setAiLocalModels(formattedModels);
        if (formattedModels.length > 0 && !aiSelectedModel.startsWith('gpt')) {
          setAiSelectedModel(formattedModels[0].value);
        }
      } else {
        setAiLocalModels([]);
      }
    } catch (error) {
      console.error('ローカルモデルの取得エラー:', error);
      setAiLocalModels([]);
    } finally {
      setLoadingAiLocalModels(false);
    }
  };

  const handleClose = () => {
    setAiGeneratedContent(null);
    setAiGeneratedTarget(null);
    setOriginalContent(null);
    setAIGenerationInput('');
    setSelectedTopicIdsForAI([]);
    setAiSummaryFormat('auto');
    setAiSummaryLength(500);
    setAiCustomPrompt('');
    onClose();
  };

  const handleApply = () => {
    if (target === 'description') {
      setLocalDescription(aiGeneratedContent || '');
      setIsEditingDescription(true);
    } else if (target === 'objective') {
      setLocalObjective(aiGeneratedContent || '');
      setIsEditingObjective(true);
    }
    setAiGeneratedContent(null);
    setAiGeneratedTarget(null);
    setOriginalContent(null);
    handleClose();
  };

  const generateAISummary = async (inputText: string, selectedTopics: TopicInfo[]): Promise<string> => {
    try {
      setIsAIGenerating(true);
      
      // トピックの内容を結合
      const topicsContent = selectedTopics.map(topic => `【${topic.title}】\n${topic.content}`).join('\n\n');
      
      // 要約形式に応じた指示を生成
      let formatInstruction = '';
      switch (aiSummaryFormat) {
        case 'bullet':
          formatInstruction = `箇条書き形式で要約を作成してください。各項目は「-」または「1.」で始まる箇条書きとして出力してください。`;
          break;
        case 'paragraph':
          formatInstruction = `段落形式で要約を作成してください。複数の段落に分けて、読みやすい文章として出力してください。`;
          break;
        case 'custom':
          formatInstruction = aiCustomPrompt || '要約を作成してください。';
          break;
        case 'auto':
        default:
          formatInstruction = `以下のマークダウン記法を使用して、読みやすく構造化された要約を作成してください：
- 見出し（##, ###）でセクションを分ける
- 箇条書き（- または 1.）で重要なポイントを列挙
- **太字**で重要なキーワードを強調
- 必要に応じて段落を分けて読みやすくする`;
          break;
      }
      
      // プロンプトを作成（マークダウン形式で出力するように指示）
      const systemPrompt = `あなたはビジネス文書の要約を専門とするアシスタントです。提供された情報を基に、約${aiSummaryLength}文字で簡潔かつ明確な要約をマークダウン記法で作成してください。

${formatInstruction}

出力は必ずマークダウン形式で、プレーンテキストではなく、適切にフォーマットされたマークダウンとして出力してください。`;
      
      const userPrompt = `以下の情報を基に、約${aiSummaryLength}文字で要約をマークダウン形式で作成してください。\n\n${inputText ? `【概要】\n${inputText}\n\n` : ''}${topicsContent ? `【関連トピック】\n${topicsContent}` : ''}`;
      
      // モデルタイプに応じてAPIを呼び出し
      const isLocalModel = aiSelectedModel.startsWith('qwen') || 
                           aiSelectedModel.startsWith('llama') || 
                           aiSelectedModel.startsWith('mistral') ||
                           aiSelectedModel.includes(':latest') ||
                           aiSelectedModel.includes(':instruct');
      
      if (isLocalModel || aiModelType === 'local') {
        // Ollama APIを呼び出し
        const apiUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/api/chat';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: aiSelectedModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            stream: false,
            options: {
              temperature: 0.7,
              num_predict: 800,
            },
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Ollama APIエラー: ${response.status} ${response.statusText}. ${errorText}`);
        }
        
        const data = await response.json();
        const summary = data.message?.content?.trim() || '';
        
        if (!summary) {
          throw new Error('AIからの応答が空でした');
        }
        
        return summary;
      } else {
        // OpenAI APIを呼び出し
        // APIキーを取得: 設定ページ > localStorage > 環境変数の順
        let apiKey: string | undefined;
        if (typeof window !== 'undefined') {
          try {
            const { getAPIKey } = await import('@/lib/security');
            apiKey = getAPIKey('openai') || undefined;
          } catch (error) {
            // セキュリティモジュールがない場合は直接localStorageから取得
            apiKey = localStorage.getItem('NEXT_PUBLIC_OPENAI_API_KEY') || undefined;
          }
        }
        if (!apiKey) {
          apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
        }
        
        if (!apiKey) {
          throw new Error('OpenAI APIキーが設定されていません。設定ページ（/settings）でAPIキーを設定してください。');
        }
        
        const requestBody: any = {
          model: aiSelectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        };
        
        if (aiSelectedModel.startsWith('gpt-5')) {
          requestBody.max_completion_tokens = 800;
        } else {
          requestBody.max_tokens = 800;
          requestBody.temperature = 0.7;
        }
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`GPT APIエラー: ${response.status} ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content?.trim() || '';
        
        if (!summary) {
          throw new Error('AIからの応答が空でした');
        }
        
        return summary;
      }
    } catch (error) {
      console.error('AI要約生成エラー:', error);
      throw error;
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleGenerate = async () => {
    try {
      if (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0) {
        alert('概要または関連トピックを少なくとも1つ選択してください');
        return;
      }

      const linkedTopics = topics.filter(topic => localTopicIds.includes(topic.id));
      const selectedTopics = linkedTopics.filter(topic => selectedTopicIdsForAI.includes(topic.id));
      const summary = await generateAISummary(aiGenerationInput, selectedTopics);

      const currentContent = target === 'description' ? localDescription : localObjective;
      setOriginalContent(currentContent || '');
      setAiGeneratedContent(summary);
      setAiGeneratedTarget(target);
    } catch (error: any) {
      alert(`エラーが発生しました: ${error.message || '不明なエラー'}`);
    }
  };

  if (!isOpen || !target) return null;

  const linkedTopics = topics.filter(topic => localTopicIds.includes(topic.id));

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
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '95%',
          maxWidth: '1400px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
            AIで作文 - {target === 'description' ? '説明' : '目標'}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#6B7280',
              cursor: 'pointer',
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

        {/* コンテンツ */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* AIモデル選択 */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
              AIモデル選択
            </label>

            {/* モデルタイプ選択 */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {(['gpt', 'local'] as const).map((type) => (
                  <label
                    key={type}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      border: `2px solid ${aiModelType === type ? '#3B82F6' : '#D1D5DB'}`,
                      borderRadius: '6px',
                      backgroundColor: aiModelType === type ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '13px',
                    }}
                  >
                    <input
                      type="radio"
                      name="aiModelType"
                      value={type}
                      checked={aiModelType === type}
                      onChange={(e) => setAiModelType(e.target.value as 'gpt' | 'local')}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{type === 'gpt' ? 'GPT' : 'ローカル'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* モデル選択 */}
            {aiModelType === 'local' && loadingAiLocalModels && (
              <div style={{ padding: '8px', fontSize: '12px', color: '#6B7280' }}>
                🔄 利用可能なモデルを取得中...
              </div>
            )}
            {aiModelType === 'local' && !loadingAiLocalModels && availableAiModels.length === 0 && (
              <div style={{ padding: '8px', fontSize: '12px', color: '#DC2626' }}>
                ⚠️ 利用可能なローカルモデルが見つかりませんでした
              </div>
            )}
            {availableAiModels.length > 0 && (
              <select
                value={aiSelectedModel}
                onChange={(e) => setAiSelectedModel(e.target.value)}
                disabled={loadingAiLocalModels}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  cursor: loadingAiLocalModels ? 'not-allowed' : 'pointer',
                }}
              >
                {availableAiModels.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 要約形式選択 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
              要約形式
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {[
                { value: 'auto', label: 'おまかせ' },
                { value: 'bullet', label: '箇条書き' },
                { value: 'paragraph', label: '説明文' },
                { value: 'custom', label: 'カスタム' },
              ].map((format) => (
                <button
                  key={format.value}
                  type="button"
                  onClick={() => setAiSummaryFormat(format.value as 'auto' | 'bullet' | 'paragraph' | 'custom')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: aiSummaryFormat === format.value ? '#111827' : '#FFFFFF',
                    color: aiSummaryFormat === format.value ? '#FFFFFF' : '#374151',
                    border: `1px solid ${aiSummaryFormat === format.value ? '#111827' : '#D1D5DB'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (aiSummaryFormat !== format.value) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (aiSummaryFormat !== format.value) {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }
                  }}
                >
                  {format.label}
                </button>
              ))}
            </div>

            {/* 文字数選択（おまかせ、箇条書き、説明文の場合） */}
            {aiSummaryFormat !== 'custom' && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#6B7280' }}>
                  文字数: {aiSummaryLength}文字
                </label>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="100"
                  value={aiSummaryLength}
                  onChange={(e) => setAiSummaryLength(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    backgroundColor: '#E5E7EB',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', color: '#9CA3AF' }}>
                  <span>200文字</span>
                  <span>2000文字</span>
                </div>
              </div>
            )}

            {/* カスタムプロンプト入力（カスタム選択時） */}
            {aiSummaryFormat === 'custom' && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                  カスタム指示（プロンプト）
                </label>
                <textarea
                  value={aiCustomPrompt}
                  onChange={(e) => setAiCustomPrompt(e.target.value)}
                  placeholder="例: 3つの主要なポイントを箇条書きで、各ポイントは2-3文で説明してください。"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>
            )}
          </div>

          {/* 概要入力 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
              概要（任意）
            </label>
            <textarea
              value={aiGenerationInput}
              onChange={(e) => setAIGenerationInput(e.target.value)}
              placeholder="要約したい内容を入力してください（任意）"
              rows={6}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* リンクしている個別トピック選択 */}
          {linkedTopics.length > 0 ? (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                関連トピックを選択（任意）
              </label>
              <div
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  padding: '12px',
                }}
              >
                {linkedTopics.map((topic) => (
                  <label
                    key={topic.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      marginBottom: '8px',
                      border: selectedTopicIdsForAI.includes(topic.id) ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                      borderRadius: '6px',
                      backgroundColor: selectedTopicIdsForAI.includes(topic.id) ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTopicIdsForAI.includes(topic.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTopicIdsForAI([...selectedTopicIdsForAI, topic.id]);
                        } else {
                          setSelectedTopicIdsForAI(selectedTopicIdsForAI.filter(id => id !== topic.id));
                        }
                      }}
                      style={{ marginRight: '12px', marginTop: '2px', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                        {topic.title}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
                        {topic.content.substring(0, 200)}{topic.content.length > 200 ? '...' : ''}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '6px', color: '#6B7280', fontSize: '14px' }}>
              リンクしている個別トピックがありません
            </div>
          )}

          {/* AI生成結果のプレビュー */}
          {aiGeneratedContent && originalContent != null && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
              <div style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                AI生成結果のプレビュー
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
                {/* 既存の内容 */}
                <div>
                  <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#6B7280' }}>
                    既存の内容
                  </div>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '6px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                    }}
                  >
                    {originalContent ? (
                      <div
                        className="markdown-content"
                        style={{
                          fontSize: '14px',
                          lineHeight: '1.8',
                          color: '#374151',
                        }}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {originalContent}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>
                        内容がありません
                      </p>
                    )}
                  </div>
                </div>
                {/* AI生成結果 */}
                <div>
                  <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                    AI生成結果
                  </div>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                    }}
                  >
                    <div
                      className="markdown-content"
                      style={{
                        fontSize: '14px',
                        lineHeight: '1.8',
                        color: '#374151',
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {aiGeneratedContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setAiGeneratedContent(null);
                    setAiGeneratedTarget(null);
                    setOriginalContent(null);
                    setAIGenerationInput('');
                    setSelectedTopicIdsForAI([]);
                    setAiSummaryFormat('auto');
                    setAiSummaryLength(500);
                    setAiCustomPrompt('');
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleApply}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#111827',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#374151';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#111827';
                  }}
                >
                  適用する
                </button>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          {!aiGeneratedContent && (
            <button
              onClick={handleGenerate}
              disabled={isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0)}
              style={{
                padding: '10px 20px',
                backgroundColor: isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0) ? '#9CA3AF' : '#3B82F6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isAIGenerating ? (
                <>
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <span>🤖</span>
                  <span>要約を生成</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

