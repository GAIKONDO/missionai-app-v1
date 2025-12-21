import { useState, useEffect, useRef } from 'react';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';
import type { ModelType, ModelInfo } from '../types';
import { GPT_MODELS, DEFAULT_MODEL, DEFAULT_MODEL_TYPE } from '../constants';

export function useModelSelector() {
  const [modelType, setModelType] = useState<ModelType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiAssistantModelType');
      return (saved as ModelType) || DEFAULT_MODEL_TYPE;
    }
    return DEFAULT_MODEL_TYPE;
  });

  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiAssistantSelectedModel');
      return saved || DEFAULT_MODEL;
    }
    return DEFAULT_MODEL;
  });

  const [showModelSelector, setShowModelSelector] = useState(false);
  const [localModels, setLocalModels] = useState<ModelInfo[]>([]);
  const [loadingLocalModels, setLoadingLocalModels] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  // モデルタイプが変更されたら、デフォルトモデルを設定
  useEffect(() => {
    if (modelType === 'gpt') {
      setSelectedModel(DEFAULT_MODEL);
      localStorage.setItem('aiAssistantSelectedModel', DEFAULT_MODEL);
    } else if (modelType === 'local') {
      // ローカルモデルが読み込まれたら最初のモデルを選択
      if (localModels.length > 0) {
        setSelectedModel(localModels[0].value);
        localStorage.setItem('aiAssistantSelectedModel', localModels[0].value);
      }
    }
    localStorage.setItem('aiAssistantModelType', modelType);
  }, [modelType, localModels]);

  // 選択されたモデルが変更されたら保存
  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem('aiAssistantSelectedModel', selectedModel);
    }
  }, [selectedModel]);

  // ローカルモデルタイプが選択されたときに、Ollamaから利用可能なモデルを取得
  useEffect(() => {
    if (modelType === 'local' && showModelSelector) {
      loadAvailableLocalModels();
    }
  }, [modelType, showModelSelector]);

  // Ollamaから利用可能なモデル一覧を取得
  const loadAvailableLocalModels = async () => {
    setLoadingLocalModels(true);
    try {
      const models = await getAvailableOllamaModels();
      if (models.length > 0) {
        const formattedModels = models.map(model => {
          // モデル名をフォーマット（例: "qwen2.5:7b" -> "Qwen 2.5 7B"）
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
          
          return {
            value: model.name,
            label: label,
            inputPrice: '無料',
            outputPrice: '無料',
          };
        });
        setLocalModels(formattedModels);
        // 最初のモデルを選択
        if (formattedModels.length > 0 && !selectedModel.startsWith('gpt')) {
          setSelectedModel(formattedModels[0].value);
        }
      } else {
        setLocalModels([]);
      }
    } catch (error) {
      console.error('ローカルモデルの取得エラー:', error);
      setLocalModels([]);
    } finally {
      setLoadingLocalModels(false);
    }
  };

  // モデルセレクターの外側をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    };

    if (showModelSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showModelSelector]);

  const availableModels = modelType === 'gpt' ? GPT_MODELS : localModels;

  return {
    modelType,
    setModelType,
    selectedModel,
    setSelectedModel,
    showModelSelector,
    setShowModelSelector,
    availableModels,
    loadingLocalModels,
    modelSelectorRef,
  };
}

