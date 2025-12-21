'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import type { Task, Agent, TaskExecution } from '@/lib/agent-system/types';
import { getAllTasks, saveTask, deleteTask } from '@/lib/agent-system/taskManager';
import { agentRegistry } from '@/lib/agent-system/agentRegistry';
import { getAgentOrchestrator } from '@/lib/agent-system/agentOrchestrator';
import { GeneralAgent } from '@/lib/agent-system/agents/GeneralAgent';
import { SearchAgent } from '@/lib/agent-system/agents/SearchAgent';
import { AnalysisAgent } from '@/lib/agent-system/agents/AnalysisAgent';
import { GenerationAgent } from '@/lib/agent-system/agents/GenerationAgent';
import { ValidationAgent } from '@/lib/agent-system/agents/ValidationAgent';
import { AgentRole, TaskType, ExecutionStatus } from '@/lib/agent-system/types';
import { getAllTemplates, createTaskFromTemplate, getTemplatesByCategory } from '@/lib/agent-system/taskTemplates';
import { getTaskChainManager } from '@/lib/agent-system/taskChain';
import type { TaskTemplate } from '@/lib/agent-system/taskTemplates';
import { ChainTabContent } from './components/ChainTabContent';

export default function AgentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'tasks' | 'agents' | 'executions' | 'chains'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // デフォルトAgentを登録
    const generalAgent = new GeneralAgent();
    const searchAgent = new SearchAgent();
    const analysisAgent = new AnalysisAgent();
    const generationAgent = new GenerationAgent();
    const validationAgent = new ValidationAgent();
    
    agentRegistry.register(generalAgent);
    agentRegistry.register(searchAgent);
    agentRegistry.register(analysisAgent);
    agentRegistry.register(generationAgent);
    agentRegistry.register(validationAgent);
    
    // テンプレートを読み込み
    setTemplates(getAllTemplates());
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // タスクを読み込み（将来実装: 実際のAPI呼び出し）
      // const loadedTasks = await getAllTasks();
      // setTasks(loadedTasks);
      
      // Agentを読み込み
      const loadedAgents = agentRegistry.getAllDefinitions();
      setAgents(loadedAgents);
      
      // 実行履歴を読み込み（将来実装）
      // const loadedExecutions = await getAllTaskExecutions();
      // setExecutions(loadedExecutions);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = () => {
    router.push('/agents/tasks/new');
  };

  const handleCreateTaskFromTemplate = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateModal(true);
  };

  const handleExecuteFromTemplate = async (template: TaskTemplate, parameters: Record<string, any>) => {
    try {
      const task = createTaskFromTemplate(template, { parameters });
      const orchestrator = getAgentOrchestrator();
      const execution = await orchestrator.executeTask(task);
      setExecutions(prev => [execution, ...prev]);
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      alert(`タスク "${task.name}" の実行が完了しました`);
    } catch (error: any) {
      alert(`タスク実行エラー: ${error.message}`);
    }
  };

  const handleExecuteTask = async (task: Task) => {
    try {
      const orchestrator = getAgentOrchestrator();
      const execution = await orchestrator.executeTask(task);
      setExecutions(prev => [execution, ...prev]);
      alert(`タスク "${task.name}" の実行が完了しました`);
    } catch (error: any) {
      alert(`タスク実行エラー: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '32px', color: 'var(--color-text)' }}>
          Agentシステム
        </h1>

      {/* タブ */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--color-border-color)' }}>
        <button
          onClick={() => setActiveTab('tasks')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'tasks' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'tasks' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'tasks' ? 600 : 400,
          }}
        >
          タスク管理
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'agents' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'agents' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'agents' ? 600 : 400,
          }}
        >
          Agent管理
        </button>
        <button
          onClick={() => setActiveTab('executions')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'executions' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'executions' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'executions' ? 600 : 400,
          }}
        >
          実行監視
        </button>
        <button
          onClick={() => setActiveTab('chains')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'chains' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'chains' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'chains' ? 600 : 400,
          }}
        >
          タスクチェーン
        </button>
      </div>

      {/* タスク管理タブ */}
      {activeTab === 'tasks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>タスク一覧</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowTemplateModal(true)}
                style={{
                  padding: '8px 16px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                テンプレートから作成
              </button>
              <button
                onClick={handleCreateTask}
                style={{
                  padding: '8px 16px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                新規タスク作成
              </button>
            </div>
          </div>

          {/* テンプレートモーダル */}
          {showTemplateModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}>
              <div style={{
                background: 'var(--color-background)',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '600px',
                maxHeight: '80vh',
                overflow: 'auto',
                width: '90%',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>テンプレートからタスクを作成</h3>
                  <button
                    onClick={() => {
                      setShowTemplateModal(false);
                      setSelectedTemplate(null);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '24px',
                      cursor: 'pointer',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    ×
                  </button>
                </div>

                {!selectedTemplate ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {templates.map(template => (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        style={{
                          padding: '16px',
                          border: '1px solid var(--color-border-color)',
                          borderRadius: '8px',
                          background: 'var(--color-surface)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-border-color)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
                          {template.name}
                        </h4>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                          {template.description}
                        </p>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          <div>カテゴリ: {template.category}</div>
                          <div>タイプ: {template.type}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
                        {selectedTemplate.name}
                      </h4>
                      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                        {selectedTemplate.description}
                      </p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
                        必須パラメータ
                      </h5>
                      {selectedTemplate.requiredParameters.map(param => (
                        <div key={param} style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
                            {param}
                          </label>
                          <input
                            type="text"
                            id={`param-${param}`}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid var(--color-border-color)',
                              borderRadius: '4px',
                              background: 'var(--color-background)',
                              color: 'var(--color-text)',
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setSelectedTemplate(null)}
                        style={{
                          padding: '8px 16px',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text)',
                          border: '1px solid var(--color-border-color)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        戻る
                      </button>
                      <button
                        onClick={() => {
                          const parameters: Record<string, any> = {};
                          selectedTemplate.requiredParameters.forEach(param => {
                            const input = document.getElementById(`param-${param}`) as HTMLInputElement;
                            if (input) {
                              parameters[param] = input.value;
                            }
                          });
                          handleExecuteFromTemplate(selectedTemplate, parameters);
                        }}
                        style={{
                          padding: '8px 16px',
                          background: 'var(--color-primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        実行
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <p>タスクがありません。新規タスクを作成してください。</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '8px',
                    background: 'var(--color-surface)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
                        {task.name}
                      </h3>
                      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                        {task.description}
                      </p>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        <span>タイプ: {task.type}</span>
                        <span>優先度: {task.priority}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleExecuteTask(task)}
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
                        実行
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Agent管理タブ */}
      {activeTab === 'agents' && (
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
                <div
                  key={agent.id}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '8px',
                    background: 'var(--color-surface)',
                  }}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
                    {agent.name}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                    {agent.description}
                  </p>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <div>役割: {agent.role}</div>
                    <div>能力: {agent.capabilities.join(', ')}</div>
                    <div>モデル: {agent.modelType}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 実行監視タブ */}
      {activeTab === 'executions' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: 'var(--color-text)' }}>
            実行履歴
          </h2>

          {executions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <p>実行履歴がありません。</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {executions.map(execution => (
                <div
                  key={execution.id}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--color-border-color)',
                    borderRadius: '8px',
                    background: 'var(--color-surface)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background:
                              execution.status === ExecutionStatus.COMPLETED
                                ? '#e8f5e9'
                                : execution.status === ExecutionStatus.FAILED
                                ? '#ffebee'
                                : execution.status === ExecutionStatus.RUNNING
                                ? '#fff9c4'
                                : '#f5f5f5',
                            color:
                              execution.status === ExecutionStatus.COMPLETED
                                ? '#2e7d32'
                                : execution.status === ExecutionStatus.FAILED
                                ? '#c62828'
                                : execution.status === ExecutionStatus.RUNNING
                                ? '#f57f17'
                                : '#616161',
                          }}
                        >
                          {execution.status}
                        </span>
                        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                          Agent: {execution.agentId}
                        </span>
                      </div>
                      {execution.error && (
                        <p style={{ fontSize: '12px', color: '#c62828', marginTop: '8px' }}>
                          エラー: {execution.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* タスクチェーンのタブ */}
      {activeTab === 'chains' && (
        <ChainTabContent />
      )}
      </div>
    </Layout>
  );
}

