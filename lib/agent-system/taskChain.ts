/**
 * タスクチェーン機能
 * 複数タスクの連鎖実行、条件分岐、ループ処理
 */

import type { Task, TaskExecution, ExecutionStatus } from './types';
import { getAgentOrchestrator } from './agentOrchestrator';
import { ExecutionStatus as ES } from './types';

/**
 * 条件分岐の条件
 */
export interface ChainCondition {
  type: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
  field: string;                 // チェックするフィールド（例: 'result.status', 'result.count'）
  value: any;                    // 比較値
}

/**
 * チェーンノード（タスクまたは条件分岐）
 */
export interface ChainNode {
  id: string;                    // ノードID
  type: 'task' | 'condition' | 'loop'; // ノードタイプ
  task?: Task;                   // タスク（type='task'の場合）
  condition?: ChainCondition;    // 条件（type='condition'の場合）
  trueBranch?: string;           // 条件が真の場合の次のノードID
  falseBranch?: string;          // 条件が偽の場合の次のノードID
  loopCount?: number;            // ループ回数（type='loop'の場合）
  loopCondition?: ChainCondition; // ループ継続条件
  nextNodeId?: string;           // 次のノードID（条件分岐でない場合）
}

/**
 * タスクチェーン定義
 */
export interface TaskChain {
  id: string;                    // チェーンID
  name: string;                  // チェーン名
  description: string;           // チェーンの説明
  startNodeId: string;           // 開始ノードID
  nodes: Map<string, ChainNode>; // ノードマップ
  createdAt: number;             // 作成日時
  updatedAt: number;             // 更新日時
}

/**
 * チェーン実行結果
 */
export interface ChainExecutionResult {
  chainId: string;               // チェーンID
  executionId: string;           // 実行ID
  status: ExecutionStatus;       // 実行状態
  nodeResults: Map<string, TaskExecution>; // ノードごとの実行結果
  executionPath: string[];        // 実行パス（ノードIDの配列）
  startedAt: number;             // 開始日時
  completedAt?: number;          // 完了日時
  error?: string;                // エラーメッセージ
}

/**
 * タスクチェーンマネージャー
 */
export class TaskChainManager {
  private chains: Map<string, TaskChain> = new Map();

  /**
   * チェーンを登録
   */
  registerChain(chain: TaskChain): void {
    this.chains.set(chain.id, chain);
    console.log(`[TaskChainManager] チェーン登録: ${chain.id} (${chain.name})`);
  }

  /**
   * チェーンを取得
   */
  getChain(chainId: string): TaskChain | undefined {
    return this.chains.get(chainId);
  }

  /**
   * チェーンを実行
   */
  async executeChain(chainId: string): Promise<ChainExecutionResult> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`チェーン ${chainId} が見つかりません`);
    }

    const executionId = `chain-exec-${Date.now()}`;
    const nodeResults = new Map<string, TaskExecution>();
    const executionPath: string[] = [];
    const startedAt = Date.now();

    try {
      let currentNodeId: string | undefined = chain.startNodeId;
      const orchestrator = getAgentOrchestrator();

      while (currentNodeId) {
        const node = chain.nodes.get(currentNodeId);
        if (!node) {
          throw new Error(`ノード ${currentNodeId} が見つかりません`);
        }

        executionPath.push(currentNodeId);

        switch (node.type) {
          case 'task':
            if (!node.task) {
              throw new Error(`ノード ${currentNodeId} にタスクが定義されていません`);
            }
            // タスクを実行
            const execution = await orchestrator.executeTask(node.task);
            nodeResults.set(currentNodeId, execution);

            // タスクが失敗した場合、チェーンを中断
            if (execution.status === ES.FAILED) {
              return {
                chainId,
                executionId,
                status: ES.FAILED,
                nodeResults,
                executionPath,
                startedAt,
                completedAt: Date.now(),
                error: `ノード ${currentNodeId} のタスク実行が失敗しました: ${execution.error}`,
              };
            }

            // 次のノードへ
            currentNodeId = node.nextNodeId;
            break;

          case 'condition':
            if (!node.condition) {
              throw new Error(`ノード ${currentNodeId} に条件が定義されていません`);
            }

            // 条件を評価
            const conditionResult = this.evaluateCondition(
              node.condition,
              nodeResults,
              executionPath
            );

            // 条件分岐
            currentNodeId = conditionResult ? node.trueBranch : node.falseBranch;
            break;

          case 'loop':
            if (!node.loopCount && !node.loopCondition) {
              throw new Error(`ノード ${currentNodeId} にループ条件が定義されていません`);
            }

            // ループ処理（簡易実装：固定回数）
            if (node.loopCount) {
              for (let i = 0; i < node.loopCount; i++) {
                if (node.task) {
                  const loopExecution = await orchestrator.executeTask(node.task);
                  nodeResults.set(`${currentNodeId}-loop-${i}`, loopExecution);

                  if (loopExecution.status === ES.FAILED) {
                    return {
                      chainId,
                      executionId,
                      status: ES.FAILED,
                      nodeResults,
                      executionPath,
                      startedAt,
                      completedAt: Date.now(),
                      error: `ループ ${i} 回目のタスク実行が失敗しました: ${loopExecution.error}`,
                    };
                  }
                }
              }
            }

            // 次のノードへ
            currentNodeId = node.nextNodeId;
            break;

          default:
            throw new Error(`未知のノードタイプ: ${(node as any).type}`);
        }

        // 無限ループ防止（最大100ノード）
        if (executionPath.length > 100) {
          throw new Error('チェーンの実行パスが長すぎます（無限ループの可能性）');
        }
      }

      return {
        chainId,
        executionId,
        status: ES.COMPLETED,
        nodeResults,
        executionPath,
        startedAt,
        completedAt: Date.now(),
      };
    } catch (error: any) {
      return {
        chainId,
        executionId,
        status: ES.FAILED,
        nodeResults,
        executionPath,
        startedAt,
        completedAt: Date.now(),
        error: error.message || 'チェーン実行中にエラーが発生しました',
      };
    }
  }

  /**
   * 条件を評価
   */
  private evaluateCondition(
    condition: ChainCondition,
    nodeResults: Map<string, TaskExecution>,
    executionPath: string[]
  ): boolean {
    // 最後の実行結果から値を取得
    const lastNodeId = executionPath[executionPath.length - 1];
    const lastExecution = nodeResults.get(lastNodeId);

    if (!lastExecution || !lastExecution.result) {
      return false;
    }

    // フィールドパスを解決（例: 'result.status' -> result.status）
    const fieldParts = condition.field.split('.');
    let value: any = lastExecution.result;

    for (const part of fieldParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return false;
      }
    }

    // 条件を評価
    switch (condition.type) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'greater_than':
        return typeof value === 'number' && typeof condition.value === 'number' && value > condition.value;
      case 'less_than':
        return typeof value === 'number' && typeof condition.value === 'number' && value < condition.value;
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value);
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  /**
   * すべてのチェーンを取得
   */
  getAllChains(): TaskChain[] {
    return Array.from(this.chains.values());
  }
}

/**
 * グローバルタスクチェーンマネージャーインスタンス
 */
let globalChainManager: TaskChainManager | null = null;

/**
 * タスクチェーンマネージャーを取得（シングルトン）
 */
export function getTaskChainManager(): TaskChainManager {
  if (!globalChainManager) {
    globalChainManager = new TaskChainManager();
  }
  return globalChainManager;
}

