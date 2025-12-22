/**
 * オーケストレーター設定パネル
 */

'use client';

import { useState, useEffect } from 'react';
import { agentRegistry } from '@/lib/agent-system/agentRegistry';
import { loadAllAgents } from '@/lib/agent-system/agentStorage';
import { getAgentOrchestrator } from '@/lib/agent-system/agentOrchestrator';
import { QueueingStrategy } from '@/lib/agent-system/taskPlanner';
import type { Agent } from '@/lib/agent-system/types';
import { showToast } from '@/components/Toast';

export function OrchestratorSettingsPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [orchestratorConfig, setOrchestratorConfig] = useState<{
    globalMaxConcurrentTasks: number | null;
    queueingStrategy: QueueingStrategy;
  } | null>(null);
  const [editingOrchestrator, setEditingOrchestrator] = useState(false);

  useEffect(() => {
    loadAgents();
    loadOrchestratorConfig();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const allAgents = await loadAllAgents();
      setAgents(allAgents);
    } catch (error) {
      console.error('Agent一覧の取得エラー:', error);
      showToast('Agent一覧の取得に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadOrchestratorConfig = () => {
    try {
      const orchestrator = getAgentOrchestrator();
      const config = orchestrator.getOrchestratorConfig();
      setOrchestratorConfig({
        globalMaxConcurrentTasks: config.globalMaxConcurrentTasks,
        queueingStrategy: config.queueingStrategy,
      });
    } catch (error) {
      console.error('オーケストレーター設定の取得エラー:', error);
    }
  };

  const handleUpdateOrchestratorConfig = () => {
    try {
      const orchestrator = getAgentOrchestrator();
      orchestrator.updateConfig({
        globalMaxConcurrentTasks: orchestratorConfig?.globalMaxConcurrentTasks || null,
        queueingStrategy: orchestratorConfig?.queueingStrategy || QueueingStrategy.FIFO,
      });
      setEditingOrchestrator(false);
      showToast('オーケストレーター設定を更新しました', 'success');
    } catch (error) {
      console.error('設定更新エラー:', error);
      showToast('設定の更新に失敗しました', 'error');
    }
  };

  const handleUpdateAgent = async (agentId: string, updates: Partial<Agent>) => {
    try {
      const agent = agents.find(a => a.id === agentId);
      if (!agent) return;

      const updatedAgent: Agent = {
        ...agent,
        ...updates,
        updatedAt: Date.now(),
      };

      // Agent定義を更新
      await agentRegistry.updateAgentDefinition(updatedAgent);
      await loadAgents();
      setEditingAgent(null);
      showToast('設定を更新しました', 'success');
    } catch (error) {
      console.error('設定更新エラー:', error);
      showToast('設定の更新に失敗しました', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--color-text)',
          marginBottom: '16px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--color-border-color)',
        }}
      >
        オーケストレーター設定
      </h3>

      {/* グローバル設定 */}
      <section>
        <h4
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '16px',
          }}
        >
          グローバル設定
        </h4>
        {orchestratorConfig && (
          <OrchestratorGlobalSettings
            config={orchestratorConfig}
            isEditing={editingOrchestrator}
            onEdit={() => setEditingOrchestrator(true)}
            onCancel={() => {
              setEditingOrchestrator(false);
              loadOrchestratorConfig();
            }}
            onSave={handleUpdateOrchestratorConfig}
            onConfigChange={(updates) => setOrchestratorConfig({ ...orchestratorConfig, ...updates })}
          />
        )}
      </section>

      <section>
        <h4
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '16px',
          }}
        >
          Agent別同時実行数設定
        </h4>
        {agents.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', borderRadius: '8px' }}>
            <p>Agentが登録されていません</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {agents.map(agent => (
              <AgentConcurrencySetting
                key={agent.id}
                agent={agent}
                isEditing={editingAgent === agent.id}
                onEdit={() => setEditingAgent(agent.id)}
                onCancel={() => setEditingAgent(null)}
                onSave={(updates) => handleUpdateAgent(agent.id, updates)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div style={{ padding: '16px', background: 'var(--color-surface)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          <p style={{ margin: 0, marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
            💡 ヒント
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>同時実行数は、Agentの能力とリソースに応じて調整してください</li>
            <li>多すぎるとリソース不足やAPIレート制限に達する可能性があります</li>
            <li>少なすぎるとスループットが低下します</li>
            <li>パフォーマンスタブで実際の使用状況を確認して最適化してください</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

interface AgentConcurrencySettingProps {
  agent: Agent;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (updates: Partial<Agent>) => void;
}

function AgentConcurrencySetting({ agent, isEditing, onEdit, onCancel, onSave }: AgentConcurrencySettingProps) {
  const [maxConcurrent, setMaxConcurrent] = useState(agent.config.maxConcurrentTasks || 10);
  const [defaultTimeout, setDefaultTimeout] = useState(agent.config.defaultTimeout || 60000);
  const [maxRetries, setMaxRetries] = useState(agent.config.retryPolicy.maxRetries || 3);
  const [retryDelay, setRetryDelay] = useState(agent.config.retryPolicy.retryDelay || 1000);

  useEffect(() => {
    if (isEditing) {
      setMaxConcurrent(agent.config.maxConcurrentTasks || 10);
      setDefaultTimeout(agent.config.defaultTimeout || 60000);
      setMaxRetries(agent.config.retryPolicy.maxRetries || 3);
      setRetryDelay(agent.config.retryPolicy.retryDelay || 1000);
    }
  }, [isEditing, agent]);

  const handleSave = () => {
    onSave({
      config: {
        maxConcurrentTasks: maxConcurrent,
        defaultTimeout: defaultTimeout,
        retryPolicy: {
          maxRetries: maxRetries,
          retryDelay: retryDelay,
          backoffMultiplier: agent.config.retryPolicy.backoffMultiplier || 2,
        },
      },
    });
  };

  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--color-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-color)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h5 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
          {agent.name}
        </h5>
        {!isEditing ? (
          <button
            onClick={onEdit}
            style={{
              padding: '4px 12px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            編集
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSave}
              style={{
                padding: '4px 12px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              保存
            </button>
            <button
              onClick={onCancel}
              style={{
                padding: '4px 12px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              キャンセル
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              同時実行数
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 1)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--color-background)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                fontSize: '14px',
                color: 'var(--color-text)',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              デフォルトタイムアウト (ms)
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={defaultTimeout}
              onChange={(e) => setDefaultTimeout(parseInt(e.target.value) || 60000)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--color-background)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                fontSize: '14px',
                color: 'var(--color-text)',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              最大リトライ回数
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={maxRetries}
              onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--color-background)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                fontSize: '14px',
                color: 'var(--color-text)',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              リトライ遅延 (ms)
            </label>
            <input
              type="number"
              min="100"
              step="100"
              value={retryDelay}
              onChange={(e) => setRetryDelay(parseInt(e.target.value) || 1000)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--color-background)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                fontSize: '14px',
                color: 'var(--color-text)',
              }}
            />
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
          <div>
            <span style={{ color: 'var(--color-text-secondary)' }}>同時実行数:</span>
            <span style={{ marginLeft: '8px', color: 'var(--color-text)', fontWeight: 500 }}>
              {agent.config.maxConcurrentTasks || 10}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)' }}>デフォルトタイムアウト:</span>
            <span style={{ marginLeft: '8px', color: 'var(--color-text)', fontWeight: 500 }}>
              {agent.config.defaultTimeout || 60000}ms
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)' }}>最大リトライ回数:</span>
            <span style={{ marginLeft: '8px', color: 'var(--color-text)', fontWeight: 500 }}>
              {agent.config.retryPolicy.maxRetries || 3}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)' }}>リトライ遅延:</span>
            <span style={{ marginLeft: '8px', color: 'var(--color-text)', fontWeight: 500 }}>
              {agent.config.retryPolicy.retryDelay || 1000}ms
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface OrchestratorGlobalSettingsProps {
  config: {
    globalMaxConcurrentTasks: number | null;
    queueingStrategy: QueueingStrategy;
  };
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onConfigChange: (updates: Partial<{ globalMaxConcurrentTasks: number | null; queueingStrategy: QueueingStrategy }>) => void;
}

function OrchestratorGlobalSettings({
  config,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onConfigChange,
}: OrchestratorGlobalSettingsProps) {
  const [globalMaxConcurrent, setGlobalMaxConcurrent] = useState<string>(
    config.globalMaxConcurrentTasks === null ? '' : String(config.globalMaxConcurrentTasks)
  );
  const [queueingStrategy, setQueueingStrategy] = useState<QueueingStrategy>(config.queueingStrategy);

  useEffect(() => {
    if (isEditing) {
      setGlobalMaxConcurrent(config.globalMaxConcurrentTasks === null ? '' : String(config.globalMaxConcurrentTasks));
      setQueueingStrategy(config.queueingStrategy);
    }
  }, [isEditing, config]);

  const handleSave = () => {
    onConfigChange({
      globalMaxConcurrentTasks: globalMaxConcurrent === '' ? null : parseInt(globalMaxConcurrent) || null,
      queueingStrategy,
    });
    onSave();
  };

  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--color-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-color)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h5 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
          オーケストレーター全体設定
        </h5>
        {!isEditing ? (
          <button
            onClick={onEdit}
            style={{
              padding: '4px 12px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            編集
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSave}
              style={{
                padding: '4px 12px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              保存
            </button>
            <button
              onClick={onCancel}
              style={{
                padding: '4px 12px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              キャンセル
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              グローバル同時実行数制限（空欄 = 制限なし）
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={globalMaxConcurrent}
              onChange={(e) => setGlobalMaxConcurrent(e.target.value)}
              placeholder="制限なし"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--color-background)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                fontSize: '14px',
                color: 'var(--color-text)',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              キューイング戦略
            </label>
            <select
              value={queueingStrategy}
              onChange={(e) => setQueueingStrategy(e.target.value as QueueingStrategy)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--color-background)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                fontSize: '14px',
                color: 'var(--color-text)',
              }}
            >
              <option value={QueueingStrategy.FIFO}>FIFO（先入先出）</option>
              <option value={QueueingStrategy.PRIORITY}>優先度ベース</option>
              <option value={QueueingStrategy.SHORTEST_JOB_FIRST}>最短ジョブ優先</option>
              <option value={QueueingStrategy.ROUND_ROBIN}>ラウンドロビン</option>
            </select>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
          <div>
            <span style={{ color: 'var(--color-text-secondary)' }}>グローバル同時実行数制限:</span>
            <span style={{ marginLeft: '8px', color: 'var(--color-text)', fontWeight: 500 }}>
              {config.globalMaxConcurrentTasks === null ? '制限なし' : config.globalMaxConcurrentTasks}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)' }}>キューイング戦略:</span>
            <span style={{ marginLeft: '8px', color: 'var(--color-text)', fontWeight: 500 }}>
              {config.queueingStrategy === QueueingStrategy.FIFO && 'FIFO（先入先出）'}
              {config.queueingStrategy === QueueingStrategy.PRIORITY && '優先度ベース'}
              {config.queueingStrategy === QueueingStrategy.SHORTEST_JOB_FIRST && '最短ジョブ優先'}
              {config.queueingStrategy === QueueingStrategy.ROUND_ROBIN && 'ラウンドロビン'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

