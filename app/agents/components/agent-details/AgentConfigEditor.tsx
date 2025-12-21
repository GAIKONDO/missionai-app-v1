/**
 * Agent設定編集コンポーネント
 */

'use client';

import React, { useState } from 'react';
import type { Agent, AgentConfig } from '@/lib/agent-system/types';
import { showToast } from '@/components/Toast';

interface AgentConfigEditorProps {
  agent: Agent;
  onUpdate: (updatedAgent: Agent) => void;
}

export function AgentConfigEditor({ agent, onUpdate }: AgentConfigEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [maxConcurrentTasks, setMaxConcurrentTasks] = useState(agent.config.maxConcurrentTasks);
  const [defaultTimeout, setDefaultTimeout] = useState(agent.config.defaultTimeout);
  const [maxRetries, setMaxRetries] = useState(agent.config.retryPolicy.maxRetries);
  const [retryDelay, setRetryDelay] = useState(agent.config.retryPolicy.retryDelay);
  const [backoffMultiplier, setBackoffMultiplier] = useState(agent.config.retryPolicy.backoffMultiplier);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    // バリデーション
    if (maxConcurrentTasks < 1 || maxConcurrentTasks > 100) {
      showToast('同時実行数は1〜100の範囲で設定してください', 'error');
      return;
    }
    if (defaultTimeout < 1000 || defaultTimeout > 600000) {
      showToast('タイムアウトは1000ms〜600000ms（10分）の範囲で設定してください', 'error');
      return;
    }
    if (maxRetries < 0 || maxRetries > 10) {
      showToast('最大リトライ回数は0〜10の範囲で設定してください', 'error');
      return;
    }
    if (retryDelay < 100 || retryDelay > 60000) {
      showToast('リトライ遅延は100ms〜60000ms（1分）の範囲で設定してください', 'error');
      return;
    }
    if (backoffMultiplier < 1 || backoffMultiplier > 10) {
      showToast('バックオフ倍率は1〜10の範囲で設定してください', 'error');
      return;
    }

    const updatedConfig: AgentConfig = {
      maxConcurrentTasks,
      defaultTimeout,
      retryPolicy: {
        maxRetries,
        retryDelay,
        backoffMultiplier,
      },
    };

    const updatedAgent: Agent = {
      ...agent,
      config: updatedConfig,
      updatedAt: Date.now(),
    };
    onUpdate(updatedAgent);
    setIsEditing(false);
    showToast('設定を保存しました', 'success');
  };

  const handleCancel = () => {
    setMaxConcurrentTasks(agent.config.maxConcurrentTasks);
    setDefaultTimeout(agent.config.defaultTimeout);
    setMaxRetries(agent.config.retryPolicy.maxRetries);
    setRetryDelay(agent.config.retryPolicy.retryDelay);
    setBackoffMultiplier(agent.config.retryPolicy.backoffMultiplier);
    setIsEditing(false);
  };

  const formatTimeout = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}秒`;
    return `${(ms / 60000).toFixed(1)}分`;
  };

  const formatRetryDelay = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}秒`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-color)',
            flex: 1,
          }}
        >
          Agent設定
        </h3>
        {!isEditing && (
          <button
            onClick={handleEdit}
            style={{
              padding: '4px 12px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              marginLeft: '12px',
            }}
          >
            編集
          </button>
        )}
      </div>

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 同時実行数 */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
              同時実行数
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={maxConcurrentTasks}
              onChange={(e) => setMaxConcurrentTasks(parseInt(e.target.value) || 1)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              このAgentが同時に実行できるタスク数（1〜100）
            </div>
          </div>

          {/* デフォルトタイムアウト */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
              デフォルトタイムアウト
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                min="1000"
                max="600000"
                step="1000"
                value={defaultTimeout}
                onChange={(e) => setDefaultTimeout(parseInt(e.target.value) || 1000)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', minWidth: '60px' }}>
                {formatTimeout(defaultTimeout)}
              </span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              タスクのデフォルトタイムアウト時間（1000ms〜600000ms）
            </div>
          </div>

          {/* リトライポリシー */}
          <div style={{ padding: '12px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>
              リトライポリシー
            </h4>

            {/* 最大リトライ回数 */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
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
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              />
              <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                タスク失敗時の最大リトライ回数（0〜10）
              </div>
            </div>

            {/* リトライ遅延 */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
                リトライ遅延
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  min="100"
                  max="60000"
                  step="100"
                  value={retryDelay}
                  onChange={(e) => setRetryDelay(parseInt(e.target.value) || 100)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', minWidth: '60px' }}>
                  {formatRetryDelay(retryDelay)}
                </span>
              </div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                リトライ前の待機時間（100ms〜60000ms）
              </div>
            </div>

            {/* バックオフ倍率 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
                バックオフ倍率
              </label>
              <input
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={backoffMultiplier}
                onChange={(e) => setBackoffMultiplier(parseFloat(e.target.value) || 1)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              />
              <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                リトライごとに遅延時間を増やす倍率（1〜10）。例: 2倍率で1回目1000ms、2回目2000ms、3回目4000ms
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={handleSave}
              style={{
                padding: '6px 12px',
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
              onClick={handleCancel}
              style={{
                padding: '6px 12px',
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
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px' }}>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>同時実行数:</span>
              <span style={{ marginLeft: '8px', color: 'var(--color-text)' }}>{agent.config.maxConcurrentTasks}</span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>デフォルトタイムアウト:</span>
              <span style={{ marginLeft: '8px', color: 'var(--color-text)' }}>{formatTimeout(agent.config.defaultTimeout)}</span>
            </div>
          </div>
          <div style={{ padding: '12px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border-color)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
              リトライポリシー
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>最大リトライ:</span>
                <span style={{ marginLeft: '4px', color: 'var(--color-text)' }}>{agent.config.retryPolicy.maxRetries}回</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>リトライ遅延:</span>
                <span style={{ marginLeft: '4px', color: 'var(--color-text)' }}>{formatRetryDelay(agent.config.retryPolicy.retryDelay)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>バックオフ倍率:</span>
                <span style={{ marginLeft: '4px', color: 'var(--color-text)' }}>{agent.config.retryPolicy.backoffMultiplier}x</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

