'use client';

import React from 'react';
import { AgentSystemOverviewSection } from './agent-system/AgentSystemOverviewSection';
import { AgentSystemArchitectureSection } from './agent-system/AgentSystemArchitectureSection';
import { AgentTypesSection } from './agent-system/AgentTypesSection';
import { A2AProtocolSection } from './agent-system/A2AProtocolSection';
import { TaskOrchestrationSection } from './agent-system/TaskOrchestrationSection';
import { TaskChainSection } from './agent-system/TaskChainSection';
import { AgentDataStructuresSection } from './agent-system/AgentDataStructuresSection';
import { AgentDataFlowSection } from './agent-system/AgentDataFlowSection';

/**
 * Agentシステムセクション
 * 各サブセクションを統合するメインコンポーネント
 */
export function AgentSystemSection() {
  return (
    <div>
      <AgentSystemOverviewSection />
      <AgentSystemArchitectureSection />
      <AgentTypesSection />
      <A2AProtocolSection />
      <TaskOrchestrationSection />
      <TaskChainSection />
      <AgentDataStructuresSection />
      <AgentDataFlowSection />
    </div>
  );
}
