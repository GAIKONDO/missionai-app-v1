/**
 * Agent詳細モーダル
 */

'use client';

import React from 'react';
import type { Agent } from '@/lib/agent-system/types';
import { GeneralAgentDetail } from './agent-details/GeneralAgentDetail';
import { SearchAgentDetail } from './agent-details/SearchAgentDetail';
import { AnalysisAgentDetail } from './agent-details/AnalysisAgentDetail';
import { GenerationAgentDetail } from './agent-details/GenerationAgentDetail';
import { ValidationAgentDetail } from './agent-details/ValidationAgentDetail';

interface AgentDetailModalProps {
  isOpen: boolean;
  agent: Agent | null;
  onClose: () => void;
  onAgentUpdate?: (updatedAgent: Agent) => void;
}

export function AgentDetailModal({ isOpen, agent, onClose, onAgentUpdate }: AgentDetailModalProps) {
  if (!isOpen || !agent) return null;

  const handleModelUpdate = (updatedAgent: Agent) => {
    if (onAgentUpdate) {
      onAgentUpdate(updatedAgent);
    }
  };

  const renderAgentDetail = () => {
    switch (agent.id) {
      case 'general-agent':
        return <GeneralAgentDetail agent={agent} onUpdate={handleModelUpdate} />;
      case 'search-agent':
        return <SearchAgentDetail agent={agent} onUpdate={handleModelUpdate} />;
      case 'analysis-agent':
        return <AnalysisAgentDetail agent={agent} onUpdate={handleModelUpdate} />;
      case 'generation-agent':
        return <GenerationAgentDetail agent={agent} onUpdate={handleModelUpdate} />;
      case 'validation-agent':
        return <ValidationAgentDetail agent={agent} onUpdate={handleModelUpdate} />;
      default:
        return (
          <div style={{ padding: '20px', color: 'var(--color-text-secondary)' }}>
            <p>このAgentの詳細情報は利用できません。</p>
          </div>
        );
    }
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
        zIndex: 1000,
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
          maxWidth: '1200px',
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
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--color-text)',
              margin: 0,
            }}
          >
            {agent.name} - 詳細
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

        <div style={{ padding: '24px' }}>{renderAgentDetail()}</div>
      </div>
    </div>
  );
}

