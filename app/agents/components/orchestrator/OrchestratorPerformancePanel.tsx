/**
 * オーケストレーターパフォーマンスパネル
 */

'use client';

import { useState, useEffect } from 'react';
import { getAgentOrchestrator } from '@/lib/agent-system/agentOrchestrator';
import { getAllTaskExecutions } from '@/lib/agent-system/taskManager';
import type { TaskExecution, ExecutionStatus } from '@/lib/agent-system/types';
import { ExecutionStatus as ES } from '@/lib/agent-system/types';

interface PerformanceMetrics {
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  agentMetrics: Array<{
    agentId: string;
    total: number;
    completed: number;
    failed: number;
    averageTime: number;
  }>;
}

export function OrchestratorPerformancePanel() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | 'all'>('24h');

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 10000); // 10秒ごとに更新
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const executions = await getAllTaskExecutions();
      
      // 時間範囲でフィルタ
      const now = Date.now();
      const timeRangeMs = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        'all': Infinity,
      }[timeRange];

      const filteredExecutions = executions.filter(exec => {
        if (timeRange === 'all') return true;
        return exec.startedAt && (now - exec.startedAt) <= timeRangeMs;
      });

      const metrics = calculateMetrics(filteredExecutions);
      setMetrics(metrics);
    } catch (error) {
      console.error('パフォーマンス指標の取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (executions: TaskExecution[]): PerformanceMetrics => {
    const total = executions.length;
    const completed = executions.filter(e => e.status === ES.COMPLETED).length;
    const failed = executions.filter(e => e.status === ES.FAILED).length;
    const cancelled = executions.filter(e => e.status === ES.CANCELLED).length;
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    // 実行時間の計算
    const completedExecutions = executions.filter(e => e.status === ES.COMPLETED && e.completedAt && e.startedAt);
    const totalExecutionTime = completedExecutions.reduce((sum, e) => {
      return sum + ((e.completedAt || 0) - e.startedAt);
    }, 0);
    const averageExecutionTime = completedExecutions.length > 0
      ? totalExecutionTime / completedExecutions.length
      : 0;

    // Agent別のメトリクス
    const agentMap = new Map<string, TaskExecution[]>();
    for (const exec of executions) {
      if (!agentMap.has(exec.agentId)) {
        agentMap.set(exec.agentId, []);
      }
      agentMap.get(exec.agentId)!.push(exec);
    }

    const agentMetrics = Array.from(agentMap.entries()).map(([agentId, agentExecs]) => {
      const agentCompleted = agentExecs.filter(e => e.status === ES.COMPLETED && e.completedAt && e.startedAt);
      const agentTotalTime = agentCompleted.reduce((sum, e) => {
        return sum + ((e.completedAt || 0) - e.startedAt);
      }, 0);
      const agentAverageTime = agentCompleted.length > 0 ? agentTotalTime / agentCompleted.length : 0;

      return {
        agentId,
        total: agentExecs.length,
        completed: agentExecs.filter(e => e.status === ES.COMPLETED).length,
        failed: agentExecs.filter(e => e.status === ES.FAILED).length,
        averageTime: agentAverageTime,
      };
    });

    return {
      totalExecutions: total,
      completedExecutions: completed,
      failedExecutions: failed,
      cancelledExecutions: cancelled,
      successRate,
      averageExecutionTime,
      totalExecutionTime,
      agentMetrics,
    };
  };

  if (loading && !metrics) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#F44336' }}>
        <p>パフォーマンス指標の取得に失敗しました</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 時間範囲選択 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--color-text)',
            margin: 0,
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-color)',
          }}
        >
          パフォーマンス指標
        </h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as '1h' | '24h' | '7d' | 'all')}
          style={{
            padding: '6px 12px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-color)',
            borderRadius: '4px',
            fontSize: '14px',
            color: 'var(--color-text)',
          }}
        >
          <option value="1h">過去1時間</option>
          <option value="24h">過去24時間</option>
          <option value="7d">過去7日間</option>
          <option value="all">すべて</option>
        </select>
      </div>

      {/* 全体メトリクス */}
      <section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <MetricCard
            label="総実行数"
            value={metrics.totalExecutions}
            color="var(--color-text-secondary)"
          />
          <MetricCard
            label="成功率"
            value={`${metrics.successRate.toFixed(1)}%`}
            color={metrics.successRate >= 90 ? '#4CAF50' : metrics.successRate >= 70 ? '#FF9800' : '#F44336'}
          />
          <MetricCard
            label="平均実行時間"
            value={formatDuration(metrics.averageExecutionTime)}
            color="var(--color-primary)"
          />
          <MetricCard
            label="失敗数"
            value={metrics.failedExecutions}
            color="#F44336"
          />
        </div>
      </section>

      {/* Agent別メトリクス */}
      <section>
        <h4
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '16px',
          }}
        >
          Agent別パフォーマンス
        </h4>
        {metrics.agentMetrics.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', borderRadius: '8px' }}>
            <p>データがありません</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {metrics.agentMetrics.map(agentMetric => {
              const successRate = agentMetric.total > 0
                ? (agentMetric.completed / agentMetric.total) * 100
                : 0;

              return (
                <div
                  key={agentMetric.agentId}
                  style={{
                    padding: '16px',
                    background: 'var(--color-surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border-color)',
                  }}
                >
                  <h5 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '12px', marginTop: 0 }}>
                    {agentMetric.agentId}
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>総実行数:</span>
                      <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{agentMetric.total}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>成功:</span>
                      <span style={{ color: '#4CAF50', fontWeight: 500 }}>{agentMetric.completed}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>失敗:</span>
                      <span style={{ color: '#F44336', fontWeight: 500 }}>{agentMetric.failed}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>成功率:</span>
                      <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>
                        {successRate.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>平均実行時間:</span>
                      <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>
                        {formatDuration(agentMetric.averageTime)}
                      </span>
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

interface MetricCardProps {
  label: string;
  value: string | number;
  color: string;
}

function MetricCard({ label, value, color }: MetricCardProps) {
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
      <div style={{ fontSize: '28px', fontWeight: 600, color, marginBottom: '8px' }}>
        {value}
      </div>
      <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        {label}
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}秒`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}分`;
  return `${(ms / 3600000).toFixed(1)}時間`;
}

