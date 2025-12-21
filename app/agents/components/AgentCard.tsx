/**
 * Agentカードコンポーネント
 */

'use client';

import type { Agent } from '@/lib/agent-system/types';
import { DEFAULT_MODEL } from '@/components/AIAssistantPanel/constants';

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  return (
    <div
      onClick={onClick}
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
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-color)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
        {agent.name}
      </h3>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
        {agent.description}
      </p>
      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
        <div>役割: {agent.role}</div>
        <div>能力: {agent.capabilities.join(', ')}</div>
        <div>モデル: {agent.selectedModel || DEFAULT_MODEL}</div>
        {agent.tools && agent.tools.length > 0 && (
          <div style={{ marginTop: '4px' }}>
            <span style={{ fontWeight: 500 }}>ツール:</span>{' '}
            {agent.tools.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

