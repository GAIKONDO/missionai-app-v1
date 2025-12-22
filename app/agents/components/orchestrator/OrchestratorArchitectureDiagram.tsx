/**
 * オーケストレーターアーキテクチャ図
 */

'use client';

import React from 'react';

export function OrchestratorArchitectureDiagram() {
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
        オーケストレーター層アーキテクチャ
      </h3>

      {/* アーキテクチャ説明 */}
      <section>
        <div style={{ padding: '20px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '12px', marginTop: 0 }}>
            オーケストレーター層の役割
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: 'var(--color-text)', lineHeight: '1.8' }}>
            <li><strong>タスクの受付:</strong> タスクを受け取り、実行計画を作成</li>
            <li><strong>Agentへの配分:</strong> タスクタイプとAgentの能力に基づいて適切なAgentを選択</li>
            <li><strong>同時実行数制御:</strong> Agentごとの同時実行数制限を管理</li>
            <li><strong>キューイング:</strong> 同時実行数制限に達した場合、タスクをキューに追加</li>
            <li><strong>タイムアウト管理:</strong> タスクの実行時間を監視し、タイムアウトを検出</li>
            <li><strong>リトライ処理:</strong> 失敗したタスクを自動的にリトライ</li>
            <li><strong>実行履歴管理:</strong> すべての実行履歴を記録・保存</li>
          </ul>
        </div>
      </section>

      {/* フロー図 */}
      <section>
        <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '16px' }}>
          タスク実行フロー
        </h4>
        <div style={{ padding: '24px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            {/* 1. タスク受付 */}
            <FlowStep
              step={1}
              title="タスク受付"
              description="タスクがオーケストレーターに送信される"
              color="var(--color-primary)"
            />
            <Arrow />
            
            {/* 2. 実行計画作成 */}
            <FlowStep
              step={2}
              title="実行計画作成"
              description="TaskPlannerが適切なAgentを選択"
              color="#4CAF50"
            />
            <Arrow />
            
            {/* 3. 同時実行数チェック */}
            <FlowStep
              step={3}
              title="同時実行数チェック"
              description="Agentの同時実行数制限を確認"
              color="#FF9800"
            />
            <Arrow />
            
            {/* 4. キュー or 実行 */}
            <div style={{ display: 'flex', gap: '24px', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <FlowStep
                  step={4}
                  title="キューに追加"
                  description="制限に達している場合"
                  color="#9E9E9E"
                />
              </div>
              <div style={{ flex: 1 }}>
                <FlowStep
                  step={4}
                  title="即座に実行"
                  description="制限内の場合"
                  color="#4CAF50"
                />
              </div>
            </div>
            <Arrow />
            
            {/* 5. Agent実行 */}
            <FlowStep
              step={5}
              title="Agent実行"
              description="選択されたAgentがタスクを実行"
              color="var(--color-primary)"
            />
            <Arrow />
            
            {/* 6. 結果保存 */}
            <FlowStep
              step={6}
              title="結果保存"
              description="実行結果をデータベースに保存"
              color="#2196F3"
            />
          </div>
        </div>
      </section>

      {/* コンポーネント説明 */}
      <section>
        <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '16px' }}>
          主要コンポーネント
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <ComponentCard
            title="AgentOrchestrator"
            description="タスクの実行を管理するメインコンポーネント。キューイング、タイムアウト、リトライを処理"
          />
          <ComponentCard
            title="TaskPlanner"
            description="タスクの依存関係を分析し、適切なAgentを選択する実行計画を作成"
          />
          <ComponentCard
            title="AgentRegistry"
            description="登録されているAgentの定義を管理。Agentの取得と更新を提供"
          />
          <ComponentCard
            title="ErrorHandler"
            description="エラーの分類とリトライ処理を担当。リトライ可能なエラーを判定"
          />
        </div>
      </section>
    </div>
  );
}

interface FlowStepProps {
  step: number;
  title: string;
  description: string;
  color: string;
}

function FlowStep({ step, title, description, color }: FlowStepProps) {
  return (
    <div
      style={{
        width: '100%',
        padding: '16px',
        background: 'var(--color-background)',
        borderRadius: '8px',
        border: `2px solid ${color}`,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: color,
          color: 'white',
          lineHeight: '32px',
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '8px',
        }}
      >
        {step}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
        {description}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div style={{ fontSize: '24px', color: 'var(--color-text-secondary)' }}>
      ↓
    </div>
  );
}

interface ComponentCardProps {
  title: string;
  description: string;
}

function ComponentCard({ title, description }: ComponentCardProps) {
  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--color-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-color)',
      }}
    >
      <h5 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px', marginTop: 0 }}>
        {title}
      </h5>
      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.6' }}>
        {description}
      </p>
    </div>
  );
}

