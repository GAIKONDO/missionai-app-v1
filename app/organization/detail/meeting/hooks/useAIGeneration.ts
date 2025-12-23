import { useState, useEffect, useCallback } from 'react';
import type { Topic } from '@/types/topicMetadata';
import type { MonthTab } from '../types';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';
import { GPT_MODELS } from '../constants';

export function useAIGeneration() {
  // AI作文モーダル関連
  const [isAIGenerationModalOpen, setIsAIGenerationModalOpen] = useState(false);
  const [aiGenerationInput, setAIGenerationInput] = useState('');
  const [selectedTopicIdsForAI, setSelectedTopicIdsForAI] = useState<string[]>([]);
  const [selectedSummaryIdsForAI, setSelectedSummaryIdsForAI] = useState<string[]>([]);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiSummaryFormat, setAiSummaryFormat] = useState<'auto' | 'bullet' | 'paragraph' | 'custom'>('auto');
  const [aiSummaryLength, setAiSummaryLength] = useState<number>(500);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  
  // AI生成結果の比較用
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  
  // AIモデル選択関連
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

  const availableAiModels = aiModelType === 'gpt' ? GPT_MODELS : aiLocalModels;

  // ローカルモデルを読み込む
  const loadAiLocalModels = useCallback(async () => {
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
  }, [aiSelectedModel]);

  // ローカルモデルを読み込む
  useEffect(() => {
    if (aiModelType === 'local' && isAIGenerationModalOpen) {
      loadAiLocalModels();
    }
  }, [aiModelType, isAIGenerationModalOpen, loadAiLocalModels]);

  // AI要約生成関数
  const generateAISummary = useCallback(async (
    inputText: string,
    selectedTopics: Topic[],
    selectedSummaries: Array<{ monthId: MonthTab; summary: string; label: string }>
  ): Promise<string> => {
    try {
      setIsAIGenerating(true);
      
      // トピックの内容を結合
      const topicsContent = selectedTopics.map(topic => `【${topic.title}】\n${topic.content}`).join('\n\n');
      
      // 選択したサマリの内容を結合
      const summariesContent = selectedSummaries.map(summary => `【${summary.label}サマリ】\n${summary.summary}`).join('\n\n');
      
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
      
      const userPrompt = `以下の情報を基に、約${aiSummaryLength}文字で要約をマークダウン形式で作成してください。\n\n${inputText ? `【概要】\n${inputText}\n\n` : ''}${summariesContent ? `【月別サマリ】\n${summariesContent}\n\n` : ''}${topicsContent ? `【関連トピック】\n${topicsContent}` : ''}`;
      
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
              num_predict: aiSummaryLength,
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
          requestBody.max_completion_tokens = aiSummaryLength;
        } else {
          requestBody.max_tokens = aiSummaryLength;
          requestBody.temperature = 0.7;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
          throw new Error(`OpenAI APIエラー: ${response.status} ${response.statusText}. ${errorData.error?.message || 'Unknown error'}`);
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
  }, [aiSummaryFormat, aiSummaryLength, aiCustomPrompt, aiSelectedModel, aiModelType]);

  // モデルタイプとモデル選択の変更を保存
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

  return {
    isAIGenerationModalOpen,
    setIsAIGenerationModalOpen,
    aiGenerationInput,
    setAIGenerationInput,
    selectedTopicIdsForAI,
    setSelectedTopicIdsForAI,
    selectedSummaryIdsForAI,
    setSelectedSummaryIdsForAI,
    isAIGenerating,
    setIsAIGenerating,
    aiSummaryFormat,
    setAiSummaryFormat,
    aiSummaryLength,
    setAiSummaryLength,
    aiCustomPrompt,
    setAiCustomPrompt,
    aiGeneratedContent,
    setAiGeneratedContent,
    originalContent,
    setOriginalContent,
    aiModelType,
    setAiModelType,
    aiSelectedModel,
    setAiSelectedModel,
    aiLocalModels,
    loadingAiLocalModels,
    availableAiModels,
    loadAiLocalModels,
    generateAISummary,
  };
}

