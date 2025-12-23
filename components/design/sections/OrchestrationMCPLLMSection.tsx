'use client';

import React from 'react';
import { LayerStructureOverviewSection } from './orchestration-mcp-llm/LayerStructureOverviewSection';
import { ArchitectureDiagramSection } from './orchestration-mcp-llm/ArchitectureDiagramSection';
import { RAGOrchestrationLayerSection } from './orchestration-mcp-llm/RAGOrchestrationLayerSection';
import { MCPIntegrationSection } from './orchestration-mcp-llm/MCPIntegrationSection';
import { MCPServerBenefitsSection } from './orchestration-mcp-llm/MCPServerBenefitsSection';
import { LLMIntegrationSection } from './orchestration-mcp-llm/LLMIntegrationSection';
import { DataFlowDetailsSection } from './orchestration-mcp-llm/DataFlowDetailsSection';

/**
 * オーケストレーション・MCP・LLM連携セクション
 * 各サブセクションを統合するメインコンポーネント
 */
export function OrchestrationMCPLLMSection() {
  return (
    <div>
      <LayerStructureOverviewSection />
      <ArchitectureDiagramSection />
      <RAGOrchestrationLayerSection />
      <MCPIntegrationSection />
      <MCPServerBenefitsSection />
      <LLMIntegrationSection />
      <DataFlowDetailsSection />
    </div>
  );
}
