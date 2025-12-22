/**
 * オーケストレーター状態監視パネル
 */

'use client';

import { useState, useEffect } from 'react';
import { getAgentOrchestrator } from '@/lib/agent-system/agentOrchestrator';
import { agentRegistry } from '@/lib/agent-system/agentRegistry';
import type { ExecutionStatus } from '@/lib/agent-system/types';

interface OrchestratorStatus {
  runningTasksCount: number;
  queuedTasksCount: number;
  pendingTasksCount: number;
  agentQueues: Array<{ agentId: string; queueLength: number; runningCount: number }>;
  totalExecutions: number;
  globalRunningCount: number;
}

export function OrchestratorStatusPanel() {
  const [status, setStatus] = useState<OrchestratorStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 2000); // 2秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const orchestrator = getAgentOrchestrator();
      const orchestratorStatus = orchestrator.getOrchestratorStatus();
      setStatus(orchestratorStatus);
    } catch (error) {
      console.error('オーケストレーター状態の取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#F44336' }}>
        <p>オーケストレーター状態の取得に失敗しました</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 全体統計 */}
      <section>
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
          全体統計
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <StatCard
            label="実行中タスク"
            value={status.runningTasksCount}
            color="var(--color-primary)"
          />
          <StatCard
            label="キュー内タスク"
            value={status.queuedTasksCount}
            color="#FF9800"
          />
          <StatCard
            label="待機中タスク"
            value={status.pendingTasksCount}
            color="#9E9E9E"
          />
          <StatCard
            label="総実行数"
            value={status.totalExecutions}
            color="var(--color-text-secondary)"
          />
          {status.globalRunningCount !== undefined && (
            <StatCard
              label="グローバル実行中"
              value={status.globalRunningCount}
              color="#9C27B0"
            />
          )}
        </div>
      </section>

      {/* Agent別キュー状況 */}
      <section>
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
          Agent別キュー状況
        </h3>
        {status.agentQueues.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', borderRadius: '8px' }}>
            <p>キュー内のタスクはありません</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {status.agentQueues.map(({ agentId, queueLength, runningCount }) => {
              const agent = agentRegistry.getDefinition(agentId);
              const maxConcurrent = agent?.config?.maxConcurrentTasks || 10;
              const usageRate = maxConcurrent > 0 ? (runningCount / maxConcurrent) * 100 : 0;

              return (
                <div
                  key={agentId}
                  style={{
                    padding: '16px',
                    background: 'var(--color-surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border-color)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                      {agent?.name || agentId}
                    </h4>
                    <span
                      style={{
                        padding: '4px 8px',
                        background: usageRate >= 90 ? '#F44336' : usageRate >= 70 ? '#FF9800' : 'var(--color-primary)',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 500,
                      }}
                    >
                      {usageRate.toFixed(0)}%使用中
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>実行中:</span>
                      <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>
                        {runningCount} / {maxConcurrent}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>キュー内:</span>
                      <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{queueLength}</span>
                    </div>
                    {/* プログレスバー */}
                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        background: 'var(--color-background)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginTop: '8px',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(usageRate, 100)}%`,
                          height: '100%',
                          background: usageRate >= 90 ? '#F44336' : usageRate >= 70 ? '#FF9800' : 'var(--color-primary)',
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div
      style={{
        padding: '20px',
        background: 'var(--color-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-color)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '32px', fontWeight: 600, color, marginBottom: '8px' }}>
        {value}
      </div>
      <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        {label}
      </div>
    </div>
  );
}

