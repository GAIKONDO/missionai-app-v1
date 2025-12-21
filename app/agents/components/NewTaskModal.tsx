/**
 * 新規タスク作成モーダル
 */

'use client';

import { useState, useEffect } from 'react';
import type { Task, Agent } from '@/lib/agent-system/types';
import { TaskType } from '@/lib/agent-system/types';
import { generateId } from '@/lib/agent-system/utils';
import type { ModelType } from '@/components/AIAssistantPanel/types';
import { GPT_MODELS, DEFAULT_MODEL, DEFAULT_MODEL_TYPE } from '@/components/AIAssistantPanel/constants';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';

interface NewTaskModalProps {
  agents: Agent[];
  onClose: () => void;
  onSave: (task: Task) => void;
}

export function NewTaskModal({ agents, onClose, onSave }: NewTaskModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>(TaskType.GENERAL);
  const [agentId, setAgentId] = useState<string>('');
  const [priority, setPriority] = useState(5);
  const [timeout, setTimeout] = useState<number | undefined>(undefined);
  const [retryCount, setRetryCount] = useState(0);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [parameterKey, setParameterKey] = useState('');
  const [parameterValue, setParameterValue] = useState('');
  const [modelType, setModelType] = useState<ModelType>(DEFAULT_MODEL_TYPE);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [localModels, setLocalModels] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingLocalModels, setLoadingLocalModels] = useState(false);

  const handleAddParameter = () => {
    if (parameterKey && parameterValue) {
      setParameters(prev => ({
        ...prev,
        [parameterKey]: parameterValue,
      }));
      setParameterKey('');
      setParameterValue('');
    }
  };

  const handleRemoveParameter = (key: string) => {
    setParameters(prev => {
      const newParams = { ...prev };
      delete newParams[key];
      return newParams;
    });
  };

  // ローカルモデルを読み込む
  useEffect(() => {
    if (modelType === 'local') {
      loadLocalModels();
    }
  }, [modelType]);

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
    if (!name.trim()) {
      // バリデーションエラーはモーダル内で表示するため、トーストは不要
      return;
    }

    const task: Task = {
      id: generateId('task'),
      name: name.trim(),
      description: description.trim(),
      type,
      agentId: agentId || undefined,
      parameters,
      priority,
      timeout,
      retryCount,
      modelType: modelType !== DEFAULT_MODEL_TYPE ? modelType : undefined,
      selectedModel: selectedModel !== DEFAULT_MODEL ? selectedModel : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onSave(task);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: 'var(--color-background)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>新規タスク作成</h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* タスク名 */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
              タスク名 <span style={{ color: '#f44336' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
              placeholder="タスク名を入力"
            />
          </div>

          {/* 説明 */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                minHeight: '80px',
                resize: 'vertical',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
              placeholder="タスクの説明を入力"
            />
          </div>

          {/* タスクタイプ */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
              タスクタイプ
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
            >
              <option value={TaskType.GENERAL}>汎用</option>
              <option value={TaskType.SEARCH}>検索</option>
              <option value={TaskType.ANALYSIS}>分析</option>
              <option value={TaskType.GENERATION}>生成</option>
              <option value={TaskType.VALIDATION}>検証</option>
              <option value={TaskType.COORDINATION}>協調</option>
            </select>
          </div>

          {/* Agent選択 */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
              Agent（オプション）
            </label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">指定なし</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.role})
                </option>
              ))}
            </select>
          </div>

          {/* 優先度 */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
              優先度: {priority}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              style={{
                width: '100%',
              }}
            />
          </div>

          {/* タイムアウト */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
              タイムアウト（ミリ秒、オプション）
            </label>
            <input
              type="number"
              value={timeout || ''}
              onChange={(e) => setTimeout(e.target.value ? Number(e.target.value) : undefined)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
              placeholder="例: 30000"
            />
          </div>

          {/* リトライ回数 */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
              リトライ回数
            </label>
            <input
              type="number"
              min="0"
              value={retryCount}
              onChange={(e) => setRetryCount(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {/* パラメータ */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
              パラメータ
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={parameterKey}
                onChange={(e) => setParameterKey(e.target.value)}
                placeholder="キー"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              />
              <input
                type="text"
                value={parameterValue}
                onChange={(e) => setParameterValue(e.target.value)}
                placeholder="値"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              />
              <button
                onClick={handleAddParameter}
                style={{
                  padding: '8px 16px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                追加
              </button>
            </div>
            {Object.keys(parameters).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {Object.entries(parameters).map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      background: 'var(--color-surface)',
                      borderRadius: '4px',
                    }}
                  >
                    <span style={{ fontSize: '14px', color: 'var(--color-text)' }}>
                      {key}: {String(value)}
                    </span>
                    <button
                      onClick={() => handleRemoveParameter(key)}
                      style={{
                        padding: '4px 8px',
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ボタン */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

