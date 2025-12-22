/**
 * オーケストレーター管理タブコンテンツ
 */

'use client';

import { useState, useEffect } from 'react';
import { getAgentOrchestrator } from '@/lib/agent-system/agentOrchestrator';
import { OrchestratorStatusPanel } from './orchestrator/OrchestratorStatusPanel';
import { OrchestratorPerformancePanel } from './orchestrator/OrchestratorPerformancePanel';
import { OrchestratorQueuePanel } from './orchestrator/OrchestratorQueuePanel';
import { OrchestratorSettingsPanel } from './orchestrator/OrchestratorSettingsPanel';
import { OrchestratorArchitectureDiagram } from './orchestrator/OrchestratorArchitectureDiagram';

export function OrchestratorTabContent() {
  const [activeSection, setActiveSection] = useState<'status' | 'performance' | 'queue' | 'settings' | 'architecture'>('status');
  const [refreshKey, setRefreshKey] = useState(0);

  // 5秒ごとに自動更新
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const sections = [
    { id: 'status' as const, label: '状態監視' },
    { id: 'performance' as const, label: 'パフォーマンス' },
    { id: 'queue' as const, label: 'キュー管理' },
    { id: 'settings' as const, label: '設定' },
    { id: 'architecture' as const, label: 'アーキテクチャ' },
  ];

  return (
    <div>
      {/* セクションタブ */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--color-border-color)' }}>
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              color: activeSection === section.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: activeSection === section.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeSection === section.id ? 600 : 400,
              fontSize: '14px',
            }}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* セクションコンテンツ */}
      {activeSection === 'status' && <OrchestratorStatusPanel key={refreshKey} />}
      {activeSection === 'performance' && <OrchestratorPerformancePanel key={refreshKey} />}
      {activeSection === 'queue' && <OrchestratorQueuePanel key={refreshKey} />}
      {activeSection === 'settings' && <OrchestratorSettingsPanel />}
      {activeSection === 'architecture' && <OrchestratorArchitectureDiagram />}
    </div>
  );
}

