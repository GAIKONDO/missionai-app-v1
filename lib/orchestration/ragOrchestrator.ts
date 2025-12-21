/**
 * RAGオーケストレーションレイヤー
 * 複数の情報源を統合し、優先順位付け、重複排除、適切な情報の選択を行う
 */

import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';
import { getKnowledgeGraphContext } from '@/lib/knowledgeGraphRAG';
import { getDesignDocContext } from '../designDocRAG';

/**
 * 情報源の種類
 */
export type InformationSource = 'knowledgeGraph' | 'designDocs' | 'mcp' | 'other';

/**
 * 情報アイテム
 */
export interface InformationItem {
  id: string;
  source: InformationSource;
  content: string;
  score: number; // 関連度スコア（0.0-1.0）
  metadata?: {
    title?: string;
    type?: string;
    timestamp?: string;
    url?: string;
    [key: string]: any;
  };
}

/**
 * オーケストレーション設定
 */
export interface OrchestrationConfig {
  maxTokens: number; // 最大トークン数
  minRelevanceScore: number; // 最小関連度スコア（0.0-1.0）
  sourceWeights: {
    knowledgeGraph: number;
    designDocs: number;
    mcp: number;
    other: number;
  };
  diversityThreshold: number; // 多様性の閾値（0.0-1.0）
}

/**
 * デフォルト設定
 */
export const DEFAULT_ORCHESTRATION_CONFIG: OrchestrationConfig = {
  maxTokens: 4000,
  minRelevanceScore: 0.05, // スコア閾値を下げて、より多くの結果を含める（特にトピック検索結果）
  sourceWeights: {
    knowledgeGraph: 0.5,
    designDocs: 0.3,
    mcp: 0.15,
    other: 0.05,
  },
  diversityThreshold: 0.3,
};

/**
 * 情報源からの情報を取得するインターフェース
 */
export interface InformationSourceProvider {
  /**
   * 情報源の名前
   */
  name: string;
  
  /**
   * 情報を取得
   */
  fetch(query: string, limit: number, filters?: any): Promise<InformationItem[]>;
  
  /**
   * 情報源の重み
   */
  getWeight(): number;
}

/**
 * ナレッジグラフ情報源プロバイダー
 */
class KnowledgeGraphProvider implements InformationSourceProvider {
  name = 'knowledgeGraph';
  
  async fetch(
    query: string,
    limit: number,
    filters?: {
      organizationId?: string;
      entityType?: string;
      relationType?: string;
      topicSemanticCategory?: string;
    }
  ): Promise<InformationItem[]> {
    try {
      const { getKnowledgeGraphContextWithResults } = await import('../knowledgeGraphRAG');
      const { context, results } = await getKnowledgeGraphContextWithResults(query, limit, filters, 2000);
      
      if (!context || context.trim() === '') {
        return [];
      }
      
      // 検索結果からスコアを取得
      const scoreMap = new Map<string, number>();
      for (const result of results) {
        const score = typeof result.score === 'number' && !isNaN(result.score) ? result.score : 0;
        if (result.type === 'entity' && result.entity) {
          scoreMap.set(result.entity.id, score);
        } else if (result.type === 'relation' && result.relation) {
          scoreMap.set(result.relation.id, score);
        } else if (result.type === 'topic' && result.topicId) {
          scoreMap.set(result.topicId, score);
        }
      }
      
      // コンテキストを情報アイテムに変換
      const items: InformationItem[] = [];
      const sections = context.split(/\n## /);
      
      for (const section of sections) {
        if (section.trim() === '') continue;
        
        const lines = section.split('\n');
        const title = lines[0]?.trim() || '';
        const content = lines.slice(1).join('\n').trim();
        
        if (content) {
          // セクション内の最初のエンティティ/リレーションのスコアを使用
          let sectionScore = 0.5; // デフォルトスコア
          for (const result of results) {
            const itemName = result.type === 'entity' 
              ? result.entity?.name 
              : result.type === 'relation'
              ? result.relation?.type
              : result.topic?.title;
            
            if (itemName && content.includes(itemName)) {
              const score = typeof result.score === 'number' && !isNaN(result.score) ? result.score : 0;
              sectionScore = Math.max(sectionScore, score);
              break;
            }
          }
          
          items.push({
            id: `kg-${items.length}`,
            source: 'knowledgeGraph',
            content: `## ${title}\n${content}`,
            score: sectionScore,
            metadata: {
              title,
              type: 'knowledgeGraph',
            },
          });
        }
      }
      
      return items;
    } catch (error) {
      console.error('[KnowledgeGraphProvider] エラー:', error);
      return [];
    }
  }
  
  getWeight(): number {
    return DEFAULT_ORCHESTRATION_CONFIG.sourceWeights.knowledgeGraph;
  }
}

/**
 * システム設計ドキュメント情報源プロバイダー
 */
class DesignDocsProvider implements InformationSourceProvider {
  name = 'designDocs';
  
  async fetch(
    query: string,
    limit: number,
    filters?: {
      sectionId?: string;
      tags?: string[];
    }
  ): Promise<InformationItem[]> {
    try {
      const context = await getDesignDocContext(query, limit, 1500, filters);
      
      if (!context || context.trim() === '') {
        return [];
      }
      
      // コンテキストを情報アイテムに変換
      const items: InformationItem[] = [];
      const sections = context.split(/\n## /);
      
      for (const section of sections) {
        if (section.trim() === '') continue;
        
        const lines = section.split('\n');
        const title = lines[0]?.trim() || '';
        const content = lines.slice(1).join('\n').trim();
        
        if (content) {
          items.push({
            id: `dd-${items.length}`,
            source: 'designDocs',
            content: `## ${title}\n${content}`,
            score: 0.7, // デフォルトスコア
            metadata: {
              title,
              type: 'designDoc',
            },
          });
        }
      }
      
      return items;
    } catch (error) {
      console.error('[DesignDocsProvider] エラー:', error);
      return [];
    }
  }
  
  getWeight(): number {
    return DEFAULT_ORCHESTRATION_CONFIG.sourceWeights.designDocs;
  }
}

/**
 * MCP情報源プロバイダー
 */
class MCPProvider implements InformationSourceProvider {
  name = 'mcp';
  
  async fetch(query: string, limit: number, filters?: any): Promise<InformationItem[]> {
    try {
      // MCPクライアントからToolを呼び出し
      const { getMCPClient } = await import('../mcp/client');
      const client = getMCPClient();
      
      if (!client.isConnected()) {
        // 接続されていない場合は空配列を返す
        console.log('[MCPProvider] MCPサーバーに接続されていません');
        return [];
      }

      // ナレッジグラフ検索Toolを呼び出し
      const { executeTool } = await import('../mcp/tools');
      const result = await executeTool({
        tool: 'search_knowledge_graph',
        arguments: {
          query,
          limit,
          organizationId: filters?.organizationId,
        },
        context: {
          query,
          organizationId: filters?.organizationId,
        },
      });

      if (!result.success || !result.data) {
        console.warn('[MCPProvider] Tool実行が失敗しました:', result.error);
        return [];
      }

      // 結果をInformationItemに変換
      const items: InformationItem[] = [];
      
      if (result.data.context) {
        // コンテキストをセクションごとに分割
        const sections = result.data.context.split(/\n## /);
        for (const section of sections) {
          if (section.trim() === '') continue;
          
          const lines = section.split('\n');
          const title = lines[0]?.trim() || '';
          const content = lines.slice(1).join('\n').trim();
          
          if (content) {
            // ソース情報からスコアを取得
            const source = result.data.sources?.find((s: any) => 
              content.includes(s.name)
            );
            const score = source?.score || 0.5;

            items.push({
              id: `mcp-${items.length}`,
              source: 'mcp',
              content: `## ${title}\n${content}`,
              score,
              metadata: {
                title,
                type: 'knowledgeGraph',
              },
            });
          }
        }
      }

      return items;
    } catch (error) {
      console.error('[MCPProvider] エラー:', error);
      return [];
    }
  }
  
  getWeight(): number {
    return DEFAULT_ORCHESTRATION_CONFIG.sourceWeights.mcp;
  }
}

/**
 * RAGオーケストレーター
 */
export class RAGOrchestrator {
  private config: OrchestrationConfig;
  private providers: InformationSourceProvider[];
  
  constructor(config: Partial<OrchestrationConfig> = {}) {
    this.config = { ...DEFAULT_ORCHESTRATION_CONFIG, ...config };
    this.providers = [
      new KnowledgeGraphProvider(),
      new DesignDocsProvider(),
      new MCPProvider(),
    ];
  }
  
  /**
   * 複数の情報源から情報を取得し、統合する
   */
  async orchestrate(
    query: string,
    limit: number = 10,
    filters?: {
      organizationId?: string;
      includeDesignDocs?: boolean;
      designDocSectionId?: string;
    }
  ): Promise<string> {
    console.log('[RAGOrchestrator] オーケストレーション開始:', { query, limit, filters });
    
    // 1. 各情報源から情報を取得（並列実行）
    const fetchPromises = this.providers.map(provider => {
      if (provider.name === 'designDocs' && !filters?.includeDesignDocs) {
        return Promise.resolve([]);
      }
      
      const providerFilters = provider.name === 'knowledgeGraph' 
        ? { organizationId: filters?.organizationId }
        : provider.name === 'designDocs'
        ? { sectionId: filters?.designDocSectionId }
        : undefined;
      
      return provider.fetch(query, limit, providerFilters);
    });
    
    const allResults = await Promise.all(fetchPromises);
    const allItems: InformationItem[] = [];
    
    // 2. 結果を統合
    for (let i = 0; i < allResults.length; i++) {
      const provider = this.providers[i];
      const items = allResults[i];
      
      // 情報源の重みを適用
      const weightedItems = items.map(item => ({
        ...item,
        score: item.score * provider.getWeight(),
      }));
      
      allItems.push(...weightedItems);
    }
    
    console.log('[RAGOrchestrator] 取得した情報アイテム数:', allItems.length);
    
    // 3. 重複排除
    const deduplicatedItems = this.deduplicate(allItems);
    console.log('[RAGOrchestrator] 重複排除後のアイテム数:', deduplicatedItems.length);
    
    // 4. 優先順位付け（スコアでソート）
    const sortedItems = deduplicatedItems.sort((a, b) => b.score - a.score);
    
    // 5. 最小関連度スコアでフィルタリング
    const filteredItems = sortedItems.filter(
      item => item.score >= this.config.minRelevanceScore
    );
    console.log('[RAGOrchestrator] フィルタリング後のアイテム数:', filteredItems.length);
    
    // 6. トークン数制限内で情報を選択
    const selectedItems = this.selectItems(filteredItems, this.config.maxTokens);
    console.log('[RAGOrchestrator] 最終選択アイテム数:', selectedItems.length);
    
    // 7. コンテキスト文字列を生成
    const context = this.buildContext(selectedItems);
    
    return context;
  }
  
  /**
   * 重複排除
   */
  private deduplicate(items: InformationItem[]): InformationItem[] {
    const seen = new Set<string>();
    const deduplicated: InformationItem[] = [];
    
    for (const item of items) {
      // コンテンツのハッシュを作成（簡易版）
      const contentHash = this.hashContent(item.content);
      
      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        deduplicated.push(item);
      } else {
        // 重複が見つかった場合、スコアが高い方を優先
        const existingIndex = deduplicated.findIndex(
          existing => this.hashContent(existing.content) === contentHash
        );
        if (existingIndex >= 0 && item.score > deduplicated[existingIndex].score) {
          deduplicated[existingIndex] = item;
        }
      }
    }
    
    return deduplicated;
  }
  
  /**
   * コンテンツのハッシュを生成（簡易版）
   */
  private hashContent(content: string): string {
    // 簡易的なハッシュ: 最初の100文字と長さを使用
    const normalized = content.toLowerCase().trim().replace(/\s+/g, ' ');
    const prefix = normalized.substring(0, 100);
    return `${prefix.length}-${prefix}`;
  }
  
  /**
   * トークン数制限内で情報を選択
   */
  private selectItems(items: InformationItem[], maxTokens: number): InformationItem[] {
    const selected: InformationItem[] = [];
    let currentTokens = 0;
    
    // 簡易的なトークン見積もり: 1文字 ≈ 0.25トークン
    const estimateTokens = (text: string) => Math.ceil(text.length * 0.25);
    
    for (const item of items) {
      const itemTokens = estimateTokens(item.content);
      
      if (currentTokens + itemTokens <= maxTokens) {
        selected.push(item);
        currentTokens += itemTokens;
      } else {
        // トークン数が超過する場合は、部分的な内容を追加
        const remainingTokens = maxTokens - currentTokens;
        if (remainingTokens > 100) { // 最低100トークン以上の場合のみ追加
          const truncatedContent = item.content.substring(
            0,
            Math.floor(remainingTokens / 0.25)
          );
          selected.push({
            ...item,
            content: truncatedContent + '\n\n(内容が長すぎるため、一部を省略しました)',
          });
        }
        break;
      }
    }
    
    return selected;
  }
  
  /**
   * コンテキスト文字列を生成
   */
  private buildContext(items: InformationItem[]): string {
    if (items.length === 0) {
      return '';
    }
    
    const contextParts: string[] = [];
    
    // 情報源ごとにグループ化
    const bySource = items.reduce((acc, item) => {
      if (!acc[item.source]) {
        acc[item.source] = [];
      }
      acc[item.source].push(item);
      return acc;
    }, {} as Record<InformationSource, InformationItem[]>);
    
    // 情報源の順序で出力
    const sourceOrder: InformationSource[] = ['knowledgeGraph', 'designDocs', 'mcp', 'other'];
    
    for (const source of sourceOrder) {
      const sourceItems = bySource[source];
      if (sourceItems && sourceItems.length > 0) {
        const sourceLabel = this.getSourceLabel(source);
        contextParts.push(`\n## ${sourceLabel}\n`);
        
        for (const item of sourceItems) {
          contextParts.push(item.content);
          contextParts.push('\n');
        }
      }
    }
    
    return contextParts.join('\n').trim();
  }
  
  /**
   * 情報源のラベルを取得
   */
  private getSourceLabel(source: InformationSource): string {
    const labels: Record<InformationSource, string> = {
      knowledgeGraph: 'ナレッジグラフ情報',
      designDocs: 'システム設計ドキュメント',
      mcp: 'MCP経由の情報',
      other: 'その他の情報',
    };
    return labels[source] || source;
  }
}

/**
 * 統合RAGコンテキストを取得（オーケストレーションレイヤー経由）
 */
export async function getOrchestratedRAGContext(
  query: string,
  limit: number = 10,
  filters?: {
    organizationId?: string;
    includeDesignDocs?: boolean;
    designDocSectionId?: string;
  },
  config?: Partial<OrchestrationConfig>
): Promise<string> {
  const orchestrator = new RAGOrchestrator(config);
  return await orchestrator.orchestrate(query, limit, filters);
}

