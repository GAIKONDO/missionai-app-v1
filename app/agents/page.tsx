'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import type { Task, Agent, TaskExecution } from '@/lib/agent-system/types';
import { getAllTasks, getAllTaskExecutions } from '@/lib/agent-system/taskManager';
import { agentRegistry } from '@/lib/agent-system/agentRegistry';
import { GeneralAgent } from '@/lib/agent-system/agents/GeneralAgent';
import { SearchAgent } from '@/lib/agent-system/agents/SearchAgent';
import { AnalysisAgent } from '@/lib/agent-system/agents/AnalysisAgent';
import { GenerationAgent } from '@/lib/agent-system/agents/GenerationAgent';
import { ValidationAgent } from '@/lib/agent-system/agents/ValidationAgent';
import { getAllTemplates } from '@/lib/agent-system/taskTemplates';
import type { TaskTemplate } from '@/lib/agent-system/taskTemplates';
import { TabBar } from './components/TabBar';
import { TasksTabContent } from './components/TasksTabContent';
import { AgentsTabContent } from './components/AgentsTabContent';
import { ExecutionsTabContent } from './components/ExecutionsTabContent';
import { ChainTabContent } from './components/ChainTabContent';
import { MCPToolsTabContent } from './components/MCPToolsTabContent';
import { ToastContainer } from '@/components/Toast';

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'agents' | 'executions' | 'chains' | 'tools'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAgents();
    loadData();
    // テンプレートを読み込み
    setTemplates(getAllTemplates());
    // MCPツールを初期化
    initializeMCPTools();
  }, []);

  const initializeMCPTools = async () => {
    try {
      const { initializeMCP } = await import('@/lib/mcp');
      await initializeMCP();
      console.log('[AgentsPage] MCPツールを初期化しました');
    } catch (error) {
      console.error('[AgentsPage] MCPツール初期化エラー:', error);
    }
  };

  const initializeAgents = async () => {
    try {
      // データベースからAgent定義を読み込む
      const loadedAgents = await agentRegistry.loadAllFromDatabase();
      
      // Agent IDとクラスのマッピング
      const agentClasses = {
        'general-agent': GeneralAgent,
        'search-agent': SearchAgent,
        'analysis-agent': AnalysisAgent,
        'generation-agent': GenerationAgent,
        'validation-agent': ValidationAgent,
      };

      // 読み込んだAgent定義からAgentインスタンスを作成（保存しない）
      for (const agentDef of loadedAgents) {
        const AgentClass = agentClasses[agentDef.id as keyof typeof agentClasses];
        if (AgentClass) {
          const agentInstance = new AgentClass(agentDef);
          await agentRegistry.register(agentInstance, false); // 既にデータベースに存在するので保存しない
        }
      }

      // データベースに存在しないデフォルトAgentを作成
      const defaultAgentIds = ['general-agent', 'search-agent', 'analysis-agent', 'generation-agent', 'validation-agent'];
      const existingIds = new Set(loadedAgents.map(a => a.id));
      
      for (const agentId of defaultAgentIds) {
        if (!existingIds.has(agentId)) {
          const AgentClass = agentClasses[agentId as keyof typeof agentClasses];
          if (AgentClass) {
            const agentInstance = new AgentClass();
            await agentRegistry.register(agentInstance, true); // 新規作成なのでデータベースに保存
          }
        }
      }
    } catch (error) {
      console.error('Agent初期化エラー:', error);
      // エラーが発生した場合、既存のAgentを確認してから登録
      try {
        const existingAgents = await agentRegistry.loadAllFromDatabase();
        const existingIds = new Set(existingAgents.map(a => a.id));
        
        const defaultAgents = [
          { id: 'general-agent', instance: new GeneralAgent() },
          { id: 'search-agent', instance: new SearchAgent() },
          { id: 'analysis-agent', instance: new AnalysisAgent() },
          { id: 'generation-agent', instance: new GenerationAgent() },
          { id: 'validation-agent', instance: new ValidationAgent() },
        ];

        for (const { id, instance } of defaultAgents) {
          if (!existingIds.has(id)) {
            await agentRegistry.register(instance, true);
          } else {
            // 既に存在する場合は保存せずに登録のみ
            await agentRegistry.register(instance, false);
          }
        }
      } catch (fallbackError) {
        console.error('Agent初期化のフォールバック処理も失敗:', fallbackError);
      }
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      // タスクを読み込み
      const loadedTasks = await getAllTasks();
      setTasks(loadedTasks);
      
      // Agentを読み込み
      const loadedAgents = agentRegistry.getAllDefinitions();
      setAgents(loadedAgents);
      
      // 実行履歴を読み込み
      const loadedExecutions = await getAllTaskExecutions();
      setExecutions(loadedExecutions);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setLoading(false);
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

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'tasks' && (
          <TasksTabContent
            tasks={tasks}
            agents={agents}
            templates={templates}
            executions={executions}
            onTasksUpdate={setTasks}
            onExecutionsUpdate={setExecutions}
          />
        )}

      {activeTab === 'agents' && (
          <AgentsTabContent agents={agents} onAgentsUpdate={loadData} />
        )}

      {activeTab === 'executions' && (
          <ExecutionsTabContent executions={executions} onExecutionsUpdate={setExecutions} />
                      )}

      {activeTab === 'chains' && (
        <ChainTabContent />
      )}

        {activeTab === 'tools' && (
          <MCPToolsTabContent />
        )}

        <ToastContainer />
      </div>
    </Layout>
  );
}

