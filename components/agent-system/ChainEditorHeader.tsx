/**
 * ChainEditorのヘッダーコンポーネント
 */

'use client';

import { SaveIcon, PlayIcon, TemplateIcon } from '@/components/Icons';
import { ChainExportImport } from './ChainExportImport';
import type { TaskChain } from '@/lib/agent-system/taskChain';
import { convertFlowToChain } from './chainEditorUtils';

interface ChainEditorHeaderProps {
  chainName: string;
  chainDescription: string;
  chainId?: string;
  isExecuting: boolean;
  nodes: any[];
  edges: any[];
  onChainNameChange: (name: string) => void;
  onChainDescriptionChange: (description: string) => void;
  onSave: () => void;
  onExecute: () => void;
  onShowTemplateModal: () => void;
  onImport: (chain: TaskChain) => void;
}

export function ChainEditorHeader({
  chainName,
  chainDescription,
  chainId,
  isExecuting,
  nodes,
  edges,
  onChainNameChange,
  onChainDescriptionChange,
  onSave,
  onExecute,
  onShowTemplateModal,
  onImport,
}: ChainEditorHeaderProps) {
  return (
    <div style={{ 
      padding: '20px 24px', 
      borderBottom: '1px solid var(--color-border-color)', 
      background: 'var(--color-surface)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="チェーン名を入力..."
          value={chainName}
          onChange={(e) => onChainNameChange(e.target.value)}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '8px',
            fontSize: '16px',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31, 41, 51, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-color)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <button
          onClick={onSave}
          style={{
            padding: '12px 20px',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '14px',
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(31, 41, 51, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(31, 41, 51, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(31, 41, 51, 0.1)';
          }}
        >
          <SaveIcon size={16} color="white" />
          保存
        </button>
        <button
          onClick={onExecute}
          disabled={isExecuting}
          style={{
            padding: '12px 20px',
            background: isExecuting ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isExecuting ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            fontSize: '14px',
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: isExecuting ? 0.7 : 1
          }}
          onMouseEnter={(e) => {
            if (!isExecuting) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
          }}
        >
          {isExecuting ? (
            <span style={{ 
              display: 'inline-block', 
              width: '16px', 
              height: '16px', 
              border: '2px solid rgba(255, 255, 255, 0.3)', 
              borderTopColor: 'white', 
              borderRadius: '50%', 
              animation: 'spin 0.8s linear infinite'
            }} />
          ) : (
            <PlayIcon size={16} color="white" />
          )}
          {isExecuting ? '実行中...' : '実行'}
        </button>
        <button
          onClick={onShowTemplateModal}
          style={{
            padding: '12px 16px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-color)',
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'var(--color-text)',
            fontWeight: 500,
            fontSize: '14px',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-background)';
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-surface)';
            e.currentTarget.style.borderColor = 'var(--color-border-color)';
          }}
        >
          <TemplateIcon size={16} color="var(--color-text)" />
          テンプレート
        </button>
        {chainName && (
          <ChainExportImport
            chain={convertFlowToChain(nodes, edges, chainName, chainDescription, chainId)}
            onImport={onImport}
          />
        )}
      </div>
      <input
        type="text"
        placeholder="説明を追加（オプション）..."
        value={chainDescription}
        onChange={(e) => onChainDescriptionChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 16px',
          border: '1px solid var(--color-border-color)',
          borderRadius: '8px',
          fontSize: '14px',
          background: 'var(--color-background)',
          color: 'var(--color-text)',
          transition: 'all 0.2s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-primary)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31, 41, 51, 0.1)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border-color)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

