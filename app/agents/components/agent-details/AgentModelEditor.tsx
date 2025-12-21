/**
 * Agentモデル編集コンポーネント（共通）
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { Agent } from '@/lib/agent-system/types';
import type { ModelType } from '@/components/AIAssistantPanel/types';
import { GPT_MODELS, DEFAULT_MODEL, DEFAULT_MODEL_TYPE } from '@/components/AIAssistantPanel/constants';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';

interface AgentModelEditorProps {
  agent: Agent;
  onUpdate: (updatedAgent: Agent) => void;
}

export function AgentModelEditor({ agent, onUpdate }: AgentModelEditorProps) {
  const [modelType, setModelType] = useState<ModelType>(agent.modelType || DEFAULT_MODEL_TYPE);
  const [selectedModel, setSelectedModel] = useState<string>(agent.selectedModel || DEFAULT_MODEL);
  const [localModels, setLocalModels] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingLocalModels, setLoadingLocalModels] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (modelType === 'local' && isEditing) {
      loadLocalModels();
    }
  }, [modelType, isEditing]);

  const loadLocalModels = async () => {
    setLoadingLocalModels(true);
    try {
      const models = await getAvailableOllamaModels();
      const formattedModels = models.map(model => ({
        value: model.name,
        label: model.name,
      }));
      setLocalModels(formattedModels);
      if (formattedModels.length > 0 && !selectedModel.startsWith('gpt')) {
        setSelectedModel(formattedModels[0].value);
      }
    } catch (error) {
      console.error('ローカルモデルの取得エラー:', error);
      setLocalModels([]);
    } finally {
      setLoadingLocalModels(false);
    }
  };

  const availableModels = modelType === 'gpt' ? GPT_MODELS : localModels;

  const handleSave = () => {
    const updatedAgent: Agent = {
      ...agent,
      modelType,
      selectedModel,
      updatedAt: Date.now(),
    };
    onUpdate(updatedAgent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setModelType(agent.modelType || DEFAULT_MODEL_TYPE);
    setSelectedModel(agent.selectedModel || DEFAULT_MODEL);
    setIsEditing(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>モデル:</span>
          {isEditing ? (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value as ModelType)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="gpt">GPT</option>
                <option value="local">ローカル（Ollama）</option>
                <option value="cursor">Cursor</option>
              </select>
              {modelType !== 'cursor' && (
                <>
                  {loadingLocalModels && modelType === 'local' ? (
                    <div style={{ padding: '6px 10px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                      読み込み中...
                    </div>
                  ) : (
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        border: '1px solid var(--color-border-color)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: 'var(--color-background)',
                        color: 'var(--color-text)',
                      }}
                    >
                      {availableModels.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>
          ) : (
            <span style={{ marginLeft: '8px', color: 'var(--color-text)' }}>
              {agent.modelType} / {agent.selectedModel || DEFAULT_MODEL}
            </span>
          )}
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              padding: '4px 12px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            編集
          </button>
        )}
      </div>
      {isEditing && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button
            onClick={handleSave}
            style={{
              padding: '6px 12px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            保存
          </button>
          <button
            onClick={handleCancel}
            style={{
              padding: '6px 12px',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
}

