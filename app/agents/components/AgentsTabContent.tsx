/**
 * Agent管理タブコンテンツ
 */

'use client';

import { useState } from 'react';
import type { Agent } from '@/lib/agent-system/types';
import { AgentCard } from './AgentCard';
import { AgentDetailModal } from './AgentDetailModal';

interface AgentsTabContentProps {
  agents: Agent[];
  onAgentsUpdate?: () => void;
}

export function AgentsTabContent({ agents, onAgentsUpdate }: AgentsTabContentProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAgent(null);
  };

  const handleAgentUpdate = async (updatedAgent: Agent) => {
    // AgentRegistryを更新（データベースにも保存される）
    const { agentRegistry } = await import('@/lib/agent-system/agentRegistry');
    await agentRegistry.updateAgentDefinition(updatedAgent.id, {
      modelType: updatedAgent.modelType,
      selectedModel: updatedAgent.selectedModel,
      systemPrompt: updatedAgent.systemPrompt,
      config: updatedAgent.config,
    });

    // 親コンポーネントに通知してagentsリストを更新
    if (onAgentsUpdate) {
      onAgentsUpdate();
    }

    // モーダル内の表示を更新
    setSelectedAgent(updatedAgent);
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: 'var(--color-text)' }}>
        Agent一覧
      </h2>

      {agents.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <p>Agentが登録されていません。</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} onClick={() => handleAgentClick(agent)} />
          ))}
        </div>
      )}

      <AgentDetailModal 
        isOpen={isModalOpen} 
        agent={selectedAgent} 
        onClose={handleCloseModal}
        onAgentUpdate={handleAgentUpdate}
      />
    </div>
  );
}

