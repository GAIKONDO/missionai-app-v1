/**
 * テンプレートモーダルコンポーネント
 */

'use client';

import { getAllChainTemplates, createChainFromTemplate } from '@/lib/agent-system/chainTemplates';
import type { TaskChain } from '@/lib/agent-system/taskChain';
import { convertChainToFlowNodes, convertChainToFlowEdges } from './chainEditorUtils';

interface TemplateModalProps {
  onClose: () => void;
  onSelectTemplate: (chain: TaskChain, nodes: any[], edges: any[]) => void;
  onNodeClick?: (nodeId: string, nodeData: any) => void;
}

export function TemplateModal({ onClose, onSelectTemplate, onNodeClick }: TemplateModalProps) {
  const handleTemplateClick = (template: any) => {
    const chain = createChainFromTemplate(template);
    const flowNodes = convertChainToFlowNodes(chain, onNodeClick);
    const flowEdges = convertChainToFlowEdges(chain);
    onSelectTemplate(chain, flowNodes, flowEdges);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '700px',
          maxHeight: '80vh',
          overflow: 'auto',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--color-border-color)'
        }}>
          <div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 600, 
              color: 'var(--color-text)',
              marginBottom: '4px'
            }}>
              チェーンテンプレート
            </h3>
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--color-text-secondary)'
            }}>
              テンプレートから素早くチェーンを作成
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-background)';
              e.currentTarget.style.color = 'var(--color-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {getAllChainTemplates().map((template) => (
            <div
              key={template.id}
              style={{
                padding: '20px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '10px',
                background: 'var(--color-surface)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={() => handleTemplateClick(template)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(31, 41, 51, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-color)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'start', 
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0
                }}>
                  📋
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 600, 
                    color: 'var(--color-text)', 
                    marginBottom: '6px'
                  }}>
                    {template.name}
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: 'var(--color-text-secondary)',
                    lineHeight: '1.5'
                  }}>
                    {template.description}
                  </div>
                </div>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                paddingTop: '12px',
                borderTop: '1px solid var(--color-border-color)'
              }}>
                <span style={{ 
                  fontSize: '12px', 
                  padding: '4px 10px',
                  background: 'var(--color-background)',
                  borderRadius: '6px',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500
                }}>
                  {template.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

