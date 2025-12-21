/**
 * LLMヘルパー関数
 * AgentからLLM APIを呼び出すためのユーティリティ
 */

import type { ModelType } from '@/components/AIAssistantPanel/types';
import { DEFAULT_MODEL, DEFAULT_MODEL_TYPE } from '@/components/AIAssistantPanel/constants';

/**
 * LLM APIを呼び出してテキストを生成
 */
export async function callLLMAPI(
  prompt: string,
  systemPrompt: string,
  modelType: ModelType,
  selectedModel: string
): Promise<string> {
  // callOpenAIAPIとcallOllamaAPIを直接インポートして使用
  const { callOpenAIAPI, callOllamaAPI } = await import('@/components/AIAssistantPanel/hooks/useAIChat');
  
  // システムプロンプトとユーザープロンプトを含むメッセージ配列を作成
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: prompt },
  ];

  const isLocalModel = selectedModel.startsWith('qwen') || 
                       selectedModel.startsWith('llama') || 
                       selectedModel.startsWith('mistral') ||
                       selectedModel.includes(':latest') ||
                       selectedModel.includes(':instruct');

  if (isLocalModel || modelType === 'local') {
    return await callOllamaAPI(selectedModel, messages);
  } else {
    const result = await callOpenAIAPI(selectedModel, messages);
    return result.text;
  }
}

/**
 * AgentまたはTaskから使用するモデル情報を取得
 */
export function getModelInfo(
  agentModelType?: ModelType,
  agentSelectedModel?: string,
  taskModelType?: ModelType,
  taskSelectedModel?: string
): { modelType: ModelType; selectedModel: string } {
  // Taskで指定されていればそれを優先、なければAgentの設定を使用
  const modelType = taskModelType || agentModelType || DEFAULT_MODEL_TYPE;
  const selectedModel = taskSelectedModel || agentSelectedModel || DEFAULT_MODEL;
  
  return { modelType, selectedModel };
}

