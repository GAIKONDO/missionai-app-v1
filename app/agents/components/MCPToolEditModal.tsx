/**
 * MCPツール編集モーダル
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { MCPTool, MCPToolArgument } from '@/lib/mcp/types';
import type { MCPToolWithMetadata } from '@/lib/mcp/toolStorage';
import { saveMCPTool } from '@/lib/mcp/toolStorage';
import { showToast } from '@/components/Toast';

interface MCPToolEditModalProps {
  isOpen: boolean;
  tool: MCPTool;
  metadata?: MCPToolWithMetadata | null;
  onClose: () => void;
  onSave: () => void;
}

export function MCPToolEditModal({
  isOpen,
  tool,
  metadata,
  onClose,
  onSave,
}: MCPToolEditModalProps) {
  const [description, setDescription] = useState(tool.description);
  const [arguments_, setArguments] = useState<MCPToolArgument[]>(tool.arguments || []);
  const [returns, setReturns] = useState<{ type: 'string' | 'object' | 'array'; description: string } | undefined>(
    tool.returns
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDescription(tool.description);
      setArguments(tool.arguments || []);
      setReturns(tool.returns);
    }
  }, [isOpen, tool]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveMCPTool({
        id: metadata?.id || `tool-${tool.name}`,
        name: tool.name,
        description: description.trim(),
        arguments: arguments_,
        returns: returns,
        implementationType: 'custom',
        enabled: metadata?.enabled !== false,
      });
      showToast('ツールを更新しました', 'success');
      onSave();
    } catch (error: any) {
      console.error('ツール更新エラー:', error);
      showToast('ツールの更新に失敗しました', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddArgument = () => {
    setArguments([
      ...arguments_,
      {
        name: '',
        type: 'string',
        description: '',
        required: false,
      },
    ]);
  };

  const handleRemoveArgument = (index: number) => {
    setArguments(arguments_.filter((_, i) => i !== index));
  };

  const handleUpdateArgument = (index: number, field: keyof MCPToolArgument, value: any) => {
    const updated = [...arguments_];
    updated[index] = { ...updated[index], [field]: value };
    setArguments(updated);
  };

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
        zIndex: 2000,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          borderRadius: '12px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--color-background)',
            borderBottom: '1px solid var(--color-border-color)',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-text)',
              margin: 0,
              fontFamily: 'monospace',
            }}
          >
            {tool.name} - 編集
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
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

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 説明 */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--color-text)',
                marginBottom: '8px',
              }}
            >
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                background: 'var(--color-surface)',
                borderRadius: '6px',
                fontSize: '14px',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              placeholder="ツールの説明を入力してください"
            />
          </div>

          {/* 引数 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-text)',
                }}
              >
                引数 ({arguments_.length}個)
              </label>
              <button
                onClick={handleAddArgument}
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
                + 追加
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {arguments_.map((arg, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    background: 'var(--color-surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border-color)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      value={arg.name}
                      onChange={(e) => handleUpdateArgument(index, 'name', e.target.value)}
                      placeholder="引数名"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'var(--color-background)',
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border-color)',
                        fontFamily: 'monospace',
                      }}
                    />
                    <select
                      value={arg.type}
                      onChange={(e) => handleUpdateArgument(index, 'type', e.target.value)}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--color-background)',
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border-color)',
                      }}
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="object">object</option>
                      <option value="array">array</option>
                    </select>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={arg.required || false}
                        onChange={(e) => handleUpdateArgument(index, 'required', e.target.checked)}
                      />
                      必須
                    </label>
                    <button
                      onClick={() => handleRemoveArgument(index)}
                      style={{
                        padding: '4px 8px',
                        background: '#F44336',
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
                  <textarea
                    value={arg.description || ''}
                    onChange={(e) => handleUpdateArgument(index, 'description', e.target.value)}
                    placeholder="引数の説明"
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      padding: '8px 12px',
                      background: 'var(--color-background)',
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border-color)',
                      resize: 'vertical',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 戻り値 */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--color-text)',
                marginBottom: '8px',
              }}
            >
              戻り値
            </label>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <select
                value={returns?.type || 'string'}
                onChange={(e) =>
                  setReturns({
                    type: e.target.value as 'string' | 'object' | 'array',
                    description: returns?.description || '',
                  })
                }
                style={{
                  padding: '8px 12px',
                  background: 'var(--color-surface)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                }}
              >
                <option value="string">string</option>
                <option value="object">object</option>
                <option value="array">array</option>
              </select>
            </div>
            <textarea
              value={returns?.description || ''}
              onChange={(e) =>
                setReturns({
                  type: returns?.type || 'string',
                  description: e.target.value,
                })
              }
              placeholder="戻り値の説明"
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                background: 'var(--color-surface)',
                borderRadius: '6px',
                fontSize: '14px',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                resize: 'vertical',
              }}
            />
          </div>

          {/* ボタン */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '8px 16px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '8px 16px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

