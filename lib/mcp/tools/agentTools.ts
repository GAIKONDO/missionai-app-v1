/**
 * Agent呼び出し用MCP Tool
 */

import type { MCPToolImplementation, MCPToolRequest, MCPToolResult } from '../tools';
import { agentRegistry } from '@/lib/agent-system/agentRegistry';
import { getAgentOrchestrator } from '@/lib/agent-system/agentOrchestrator';
import type { Task } from '@/lib/agent-system/types';
import { TaskType } from '@/lib/agent-system/types';
import { generateId } from '@/lib/agent-system/utils';

/**
 * Agentタスク実行Tool
 */
class ExecuteAgentTaskTool implements MCPToolImplementation {
  name = 'execute_agent_task';
  description = 'Agentにタスクを実行させます。タスク名、タイプ、パラメータを指定してください。';
  arguments = [
    { name: 'taskName', type: 'string' as const, description: 'タスク名', required: true },
    { name: 'taskType', type: 'string' as const, description: 'タスクタイプ（SEARCH, ANALYSIS, GENERATION, VALIDATION, COORDINATION）', required: true },
    { name: 'parameters', type: 'object' as const, description: 'タスクパラメータ', required: false, default: {} },
    { name: 'agentId', type: 'string' as const, description: 'Agent ID（オプション）', required: false },
    { name: 'priority', type: 'number' as const, description: '優先度（1-10）', required: false, default: 5 },
  ];
  returns = {
    type: 'object' as const,
    description: 'タスク実行結果',
  };

  async execute(request: MCPToolRequest): Promise<MCPToolResult> {
    const { taskName, taskType, parameters, agentId, priority } = request.arguments;

    if (!taskName) {
      return {
        success: false,
        error: 'タスク名が必要です',
      };
    }

    if (!taskType) {
      return {
        success: false,
        error: 'タスクタイプが必要です',
      };
    }

    try {
      // タスクを作成
      const task: Task = {
        id: generateId('task'),
        name: taskName,
        description: taskName,
        type: taskType as TaskType,
        agentId: agentId as string | undefined,
        parameters: (parameters as Record<string, any>) || {},
        priority: priority as number || 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Agentオーケストレーターでタスクを実行
      const orchestrator = getAgentOrchestrator();
      const execution = await orchestrator.executeTask(task);

      return {
        success: execution.status === 'completed',
        data: {
          executionId: execution.id,
          status: execution.status,
          result: execution.result,
          error: execution.error,
          logs: execution.logs,
        },
        metadata: {
          source: this.name,
          taskId: task.id,
          agentId: execution.agentId,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'タスク実行中にエラーが発生しました',
        metadata: {
          source: this.name,
        },
      };
    }
  }
}

/**
 * Agent一覧取得Tool
 */
class ListAgentsTool implements MCPToolImplementation {
  name = 'list_agents';
  description = '登録されているAgentの一覧を取得します。';
  arguments = [];
  returns = {
    type: 'object' as const,
    description: 'Agent一覧（agents配列を含む）',
  };

  async execute(request: MCPToolRequest): Promise<MCPToolResult> {
    try {
      const agents = agentRegistry.getAllDefinitions();
      
      return {
        success: true,
        data: {
          agents: agents.map(agent => ({
            id: agent.id,
            name: agent.name,
            description: agent.description,
            role: agent.role,
            capabilities: agent.capabilities,
            tools: agent.tools,
          })),
        },
        metadata: {
          source: this.name,
          count: agents.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Agent一覧取得中にエラーが発生しました',
        metadata: {
          source: this.name,
        },
      };
    }
  }
}

/**
 * Agent間通信Tool
 */
class SendAgentMessageTool implements MCPToolImplementation {
  name = 'send_agent_message';
  description = 'Agent間でメッセージを送信します。確認要求、通知、状態更新などが可能です。';
  arguments = [
    { name: 'fromAgentId', type: 'string' as const, description: '送信元Agent ID', required: true },
    { name: 'toAgentId', type: 'string' as const, description: '送信先Agent ID', required: true },
    { name: 'messageType', type: 'string' as const, description: 'メッセージタイプ（request/response/notification）', required: true },
    { name: 'message', type: 'object' as const, description: 'メッセージペイロード', required: true },
    { name: 'taskId', type: 'string' as const, description: '関連タスクID（オプション）', required: false },
  ];
  returns = {
    type: 'object' as const,
    description: 'メッセージ送信結果',
  };

  async execute(request: MCPToolRequest): Promise<MCPToolResult> {
    const { fromAgentId, toAgentId, messageType, message, taskId } = request.arguments;

    if (!fromAgentId || !toAgentId) {
      return {
        success: false,
        error: '送信元Agent IDと送信先Agent IDが必要です',
      };
    }

    if (!messageType || !message) {
      return {
        success: false,
        error: 'メッセージタイプとメッセージ内容が必要です',
      };
    }

    try {
      const { getA2AManager } = await import('@/lib/agent-system/a2aManager');
      const a2aManager = getA2AManager();
      const { A2AMessageType } = await import('@/lib/agent-system/types');

      let result;
      
      switch (messageType) {
        case 'confirmation':
          result = await a2aManager.requestConfirmation(
            fromAgentId as string,
            toAgentId as string,
            message as string,
            taskId as string | undefined
          );
          break;
        case 'notification':
          await a2aManager.sendNotification(
            fromAgentId as string,
            toAgentId as string,
            message as string,
            taskId as string | undefined
          );
          result = { sent: true };
          break;
        case 'status_update':
          await a2aManager.sendStatusUpdate(
            fromAgentId as string,
            toAgentId as string,
            message as string,
            request.arguments.data,
            taskId as string | undefined
          );
          result = { sent: true };
          break;
        default:
          return {
            success: false,
            error: `未知のメッセージタイプ: ${messageType}`,
          };
      }

      return {
        success: true,
        data: result,
        metadata: {
          source: this.name,
          fromAgentId,
          toAgentId,
          messageType,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'メッセージ送信中にエラーが発生しました',
        metadata: {
          source: this.name,
        },
      };
    }
  }
}

export const executeAgentTaskTool = new ExecuteAgentTaskTool();
export const listAgentsTool = new ListAgentsTool();
export const sendAgentMessageTool = new SendAgentMessageTool();

