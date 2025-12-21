/**
 * テンプレートモーダルコンポーネント
 */

'use client';

import { useState } from 'react';
import type { TaskTemplate } from '@/lib/agent-system/taskTemplates';

interface TemplateModalProps {
  templates: TaskTemplate[];
  onClose: () => void;
  onExecute: (template: TaskTemplate, parameters: Record<string, any>) => void;
}

export function TemplateModal({ templates, onClose, onExecute }: TemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);

  const handleExecute = () => {
    if (!selectedTemplate) return;

    const parameters: Record<string, any> = {};
    selectedTemplate.requiredParameters.forEach(param => {
      const input = document.getElementById(`param-${param}`) as HTMLInputElement;
      if (input) {
        parameters[param] = input.value;
      }
    });
    onExecute(selectedTemplate, parameters);
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
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>テンプレートからタスクを作成</h3>
          <button
            onClick={() => {
              onClose();
              setSelectedTemplate(null);
            }}
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

        {!selectedTemplate ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {templates.map(template => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                style={{
                  padding: '16px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '8px',
                  background: 'var(--color-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-color)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
                  {template.name}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                  {template.description}
                </p>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  <div>カテゴリ: {template.category}</div>
                  <div>タイプ: {template.type}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
                {selectedTemplate.name}
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                {selectedTemplate.description}
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
                必須パラメータ
              </h5>
              {selectedTemplate.requiredParameters.map(param => (
                <div key={param} style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
                    {param}
                  </label>
                  <input
                    type="text"
                    id={`param-${param}`}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '4px',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedTemplate(null)}
                style={{
                  padding: '8px 16px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                戻る
              </button>
              <button
                onClick={handleExecute}
                style={{
                  padding: '8px 16px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                実行
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

