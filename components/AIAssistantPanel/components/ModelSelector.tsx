import React, { useRef } from 'react';
import { FiCpu, FiSettings } from 'react-icons/fi';
import type { ModelType, ModelInfo } from '../types';

interface ModelSelectorProps {
  modelType: ModelType;
  setModelType: (type: ModelType) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  showModelSelector: boolean;
  setShowModelSelector: (show: boolean) => void;
  availableModels: ModelInfo[];
  loadingLocalModels: boolean;
}

export function ModelSelector({
  modelType,
  setModelType,
  selectedModel,
  setSelectedModel,
  showModelSelector,
  setShowModelSelector,
  availableModels,
  loadingLocalModels,
}: ModelSelectorProps) {
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  // モデルセレクターの外側をクリックしたら閉じる
  React.useEffect(() => {
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
  }, [showModelSelector, setShowModelSelector]);

  return (
    <div ref={modelSelectorRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setShowModelSelector(!showModelSelector)}
        style={{
          background: showModelSelector ? 'rgba(59, 130, 246, 0.2)' : 'none',
          border: showModelSelector ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
          color: showModelSelector ? '#60A5FA' : 'rgba(255, 255, 255, 0.6)',
          cursor: 'pointer',
          padding: '6px 8px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!showModelSelector) {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!showModelSelector) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
            e.currentTarget.style.borderColor = 'transparent';
          }
        }}
        title={`AIモデル: ${modelType === 'gpt' ? 'GPT' : modelType === 'local' ? 'ローカル' : 'Cursor'} - ${availableModels.find(m => m.value === selectedModel)?.label || selectedModel}`}
      >
        <FiCpu size={16} />
        {showModelSelector && (
          <span style={{ fontSize: '10px', fontWeight: 500 }}>
            {modelType === 'gpt' ? 'GPT' : modelType === 'local' ? 'Local' : 'Cursor'}
          </span>
        )}
      </button>

      {/* モデル選択ポップオーバー */}
      {showModelSelector && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: '8px',
            width: '320px',
            backgroundColor: '#2a2a2a',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: 1001,
          }}
        >
          {/* モデルタイプ選択 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              <FiSettings size={14} />
              <span>モデルタイプ</span>
            </label>
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              {(['gpt', 'local', 'cursor'] as const).map((type) => (
                <label
                  key={type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    border: `2px solid ${modelType === type ? '#3B82F6' : 'rgba(255, 255, 255, 0.2)'}`,
                    borderRadius: '6px',
                    backgroundColor: modelType === type ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: 1,
                    minWidth: '80px',
                  }}
                >
                  <input
                    type="radio"
                    name="modelType"
                    value={type}
                    checked={modelType === type}
                    onChange={(e) => setModelType(e.target.value as ModelType)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#ffffff' }}>
                    {type === 'gpt' ? 'GPT' : type === 'local' ? 'ローカル' : 'Cursor'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* AIモデル選択（Cursorモードの場合は非表示） */}
          {modelType !== 'cursor' && (
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.9)',
              }}>
                <FiCpu size={14} />
                <span>使用するAIモデル</span>
              </label>
              {modelType === 'local' && loadingLocalModels && (
                <div style={{
                  padding: '8px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                    🔄 利用可能なモデルを取得中...
                  </p>
                </div>
              )}
              {modelType === 'local' && !loadingLocalModels && availableModels.length === 0 && (
                <div style={{
                  padding: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  marginBottom: '8px',
                }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                    ⚠️ 利用可能なローカルモデルが見つかりませんでした
                  </p>
                </div>
              )}
              {availableModels.length > 0 && (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={loadingLocalModels}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    backgroundColor: '#2a2a2a',
                    color: '#ffffff',
                    cursor: loadingLocalModels ? 'not-allowed' : 'pointer',
                    opacity: loadingLocalModels ? 0.6 : 1,
                  }}
                >
                  {availableModels.map((model) => (
                    <option 
                      key={model.value} 
                      value={model.value}
                      style={{
                        backgroundColor: '#2a2a2a',
                        color: '#ffffff',
                      }}
                    >
                      {model.label} {model.inputPrice !== '無料' && `(${model.inputPrice}/${model.outputPrice})`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

