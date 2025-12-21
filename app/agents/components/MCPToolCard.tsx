/**
 * MCPツールカードコンポーネント
 */

'use client';

import { useState } from 'react';
import type { MCPTool } from '@/lib/mcp/types';
import type { MCPToolWithMetadata } from '@/lib/mcp/toolStorage';
import { updateMCPToolEnabled } from '@/lib/mcp/toolStorage';
import { showToast } from '@/components/Toast';

interface MCPToolCardProps {
  tool: MCPTool;
  metadata?: MCPToolWithMetadata | null;
  onClick: () => void;
  onEnabledChange?: () => void;
}

export function MCPToolCard({ tool, metadata, onClick, onEnabledChange }: MCPToolCardProps) {
  const [isToggling, setIsToggling] = useState(false);
  const isEnabled = metadata?.enabled !== false; // デフォルトは有効
  const isStandard = metadata?.implementationType === 'standard';

  const handleToggleEnabled = async (e: React.MouseEvent) => {
    e.stopPropagation(); // カードクリックを防ぐ
    if (isToggling || isStandard) return; // 標準ツールは無効化不可

    try {
      setIsToggling(true);
      await updateMCPToolEnabled(tool.name, !isEnabled);
      showToast(`ツール「${tool.name}」を${!isEnabled ? '有効' : '無効'}にしました`, 'success');
      onEnabledChange?.();
    } catch (error: any) {
      console.error('ツールの有効/無効切り替えエラー:', error);
      showToast('ツールの有効/無効切り替えに失敗しました', 'error');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        border: '1px solid var(--color-border-color)',
        borderRadius: '8px',
        background: isEnabled ? 'var(--color-surface)' : 'var(--color-background)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        opacity: isEnabled ? 1 : 0.6,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-color)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            fontFamily: 'monospace',
            margin: 0,
          }}
        >
          {tool.name}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isStandard && (
            <span
              style={{
                padding: '2px 8px',
                background: 'var(--color-primary)',
                color: 'white',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 500,
              }}
            >
              標準
            </span>
          )}
          {!isStandard && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isToggling ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
              }}
              onClick={handleToggleEnabled}
            >
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={() => {}} // クリックイベントはlabelで処理
                disabled={isToggling}
                style={{
                  cursor: isToggling ? 'not-allowed' : 'pointer',
                }}
              />
              {isEnabled ? '有効' : '無効'}
            </label>
          )}
        </div>
      </div>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '12px', lineHeight: '1.6' }}>
        {tool.description}
      </p>
      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
        {tool.arguments && tool.arguments.length > 0 && (
          <div>
            <span style={{ fontWeight: 500 }}>引数:</span> {tool.arguments.length}個
          </div>
        )}
        {tool.returns && (
          <div style={{ marginTop: '4px' }}>
            <span style={{ fontWeight: 500 }}>戻り値:</span> {tool.returns.type}
          </div>
        )}
      </div>
    </div>
  );
}

