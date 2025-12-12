/**
 * システム設計ドキュメント用のRAG検索
 * ChromaDBを使用した高速ベクトル検索
 * 
 * Rust側のChromaDB Serverを使用（Tauriコマンド経由）
 */

import { callTauriCommand } from './localFirebase';
import { generateEmbedding } from './embeddings';

/**
 * ChromaDBに保存されているシステム設計ドキュメントのセクションID一覧を取得（デバッグ用）
 */
export async function listDesignDocSectionIds(): Promise<string[]> {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const sectionIds = await callTauriCommand('chromadb_list_design_doc_section_ids', {}) as string[];
    return sectionIds || [];
  } catch (error) {
    console.error('ChromaDBセクションID一覧の取得エラー:', error);
    return [];
  }
}

/**
 * システム設計ドキュメントの検索結果
 */
export interface DesignDocResult {
  sectionId: string;
  sectionTitle: string;
  content: string;
  score: number;
  similarity: number;
  tags?: string[];
  pageUrl?: string;
  hierarchy?: string[];
  relatedSections?: string[];
}

/**
 * Mermaidコードブロックを除去（検索対象外にするため）
 */
function removeMermaidCode(content: string): string {
  // ```mermaid ... ``` を除去
  return content
    .replace(/```mermaid[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '') // その他のコードブロックも除去
    .replace(/`[^`]+`/g, ''); // インラインコードも除去（オプション）
}

/**
 * システム設計ドキュメントのEmbeddingをChromaDBに保存
 */
export async function saveDesignDocEmbeddingToChroma(
  sectionId: string,
  sectionTitle: string,
  content: string,  // Mermaidコードを除去したテキスト
  metadata: {
    tags?: string[];
    order?: number;
    pageUrl?: string;
    hierarchy?: string[];
    relatedSections?: string[];
  }
): Promise<void> {
  // クライアント側でのみ実行
  if (typeof window === 'undefined') {
    throw new Error('システム設計ドキュメント埋め込みの保存はクライアント側でのみ実行可能です');
  }

  try {
    const now = new Date().toISOString();

    // 1. Embeddingを生成（既存のgenerateEmbeddingを使用）
    // 検索用テキストを準備（タイトル + 内容）
    const searchText = `${sectionTitle}\n\n${content}`;
    // OpenAIのtext-embedding-3-small（1536次元）を明示的に使用
    // ChromaDBのコレクションが1536次元で作成されているため
    const combinedEmbedding = await generateEmbedding(searchText, {
      provider: 'openai',
      model: 'text-embedding-3-small',
    });

    // 2. メタデータを準備
    const chromaMetadata: Record<string, any> = {
      sectionId,
      sectionTitle,
      content,  // 全文をメタデータにも保存（検索後の表示用）
      tags: metadata.tags ? JSON.stringify(metadata.tags) : '',
      order: metadata.order?.toString() || '0',
      pageUrl: metadata.pageUrl || '/design',
      hierarchy: metadata.hierarchy ? JSON.stringify(metadata.hierarchy) : '',
      relatedSections: metadata.relatedSections ? JSON.stringify(metadata.relatedSections) : '',
      embeddingModel: 'text-embedding-3-small',
      embeddingVersion: '1.0',
      createdAt: now,
      updatedAt: now,
    };

    // 3. Rust側のTauriコマンドを呼び出し（パラメータ名はcamelCase）
    await callTauriCommand('chromadb_save_design_doc_embedding', {
      sectionId,
      combinedEmbedding,
      metadata: chromaMetadata,
    });

    console.log(`✅ ChromaDBにシステム設計ドキュメント埋め込みを保存しました: ${sectionId}`);
  } catch (error) {
    console.error('ChromaDBへのシステム設計ドキュメント埋め込み保存エラー:', error);
    throw error;
  }
}

/**
 * ChromaDBを使用した類似システム設計ドキュメント検索（Rust側経由）
 */
export async function searchDesignDocs(
  queryText: string,
  limit: number = 5,
  filters?: {
    sectionId?: string;
    tags?: string[];
    semanticCategory?: string;
  }
): Promise<Array<DesignDocResult>> {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    // 1. クエリのEmbeddingを生成（OpenAIのtext-embedding-3-smallを使用）
    const queryEmbedding = await generateEmbedding(queryText, {
      provider: 'openai' as const,
      model: 'text-embedding-3-small',
    });

    // 2. Rust側のTauriコマンドを呼び出し（類似度検索）
    // フィルターは検索後に適用するため、limitを多めに取得
    const searchLimit = filters && (filters.tags || filters.semanticCategory) ? limit * 3 : limit;
    const results = await callTauriCommand('chromadb_find_similar_design_docs', {
      queryEmbedding,
      limit: searchLimit,
      sectionId: filters?.sectionId || null,
      tags: null, // タグフィルターは検索後に適用
    }) as Array<[string, number]>;  // [sectionId, similarity]

    // 3. メタデータを取得（ChromaDBから取得）
    const designDocs: DesignDocResult[] = [];
    for (const [sectionId, similarity] of results) {
      try {
        // メタデータを取得（ChromaDBのメタデータから）
        const metadata = await callTauriCommand('chromadb_get_design_doc_metadata', {
          sectionId,
        }) as Record<string, any>;

        if (metadata) {
          const tags = metadata.tags ? JSON.parse(metadata.tags) : undefined;
          const semanticCategory = metadata.semanticCategory;

          // メタデータフィルタリング（検索後）
          if (filters?.tags && filters.tags.length > 0) {
            // タグフィルター: 指定されたタグのいずれかが含まれているか
            if (!tags || !filters.tags.some(filterTag => tags.includes(filterTag))) {
              continue; // フィルターに一致しない場合はスキップ
            }
          }

          if (filters?.semanticCategory) {
            // セマンティックカテゴリフィルター
            if (semanticCategory !== filters.semanticCategory) {
              continue; // フィルターに一致しない場合はスキップ
            }
          }

          designDocs.push({
            sectionId,
            sectionTitle: metadata.sectionTitle || sectionId,
            content: metadata.content || '',
            score: similarity,
            similarity,
            tags,
            pageUrl: metadata.pageUrl,
            hierarchy: metadata.hierarchy ? JSON.parse(metadata.hierarchy) : undefined,
            relatedSections: metadata.relatedSections ? JSON.parse(metadata.relatedSections) : undefined,
          });
        }
      } catch (error) {
        console.warn(`システム設計ドキュメント ${sectionId} のメタデータ取得エラー:`, error);
        // メタデータが取得できない場合でも基本情報は追加（フィルターなしの場合のみ）
        if (!filters?.tags && !filters?.semanticCategory) {
          designDocs.push({
            sectionId,
            sectionTitle: sectionId,
            content: '',
            score: similarity,
            similarity,
          });
        }
      }
    }

    // 4. 類似度でソート（降順）
    designDocs.sort((a, b) => b.similarity - a.similarity);

    // 5. limitで制限
    return designDocs.slice(0, limit);
  } catch (error) {
    console.error('システム設計ドキュメント検索エラー:', error);
    throw error;
  }
}

/**
 * システム設計に関する質問かどうかを判定
 */
export function isDesignDocQuery(query: string): boolean {
  const designKeywords = [
    'システム設計', 'アーキテクチャ', 'データベース設計', 'スキーマ',
    'データフロー', 'ページ構造', '実装方法', '設計', '構成',
    'Tauri', 'Next.js', 'ChromaDB', 'SQLite', 'Rust', 'TypeScript',
    'コマンド', 'API', 'エンドポイント', 'テーブル構造',
    'コレクション', '埋め込み', 'ベクトル', 'RAG検索',
    'フロントエンド', 'バックエンド', 'データベース層',
    'エンティティ', 'リレーション', 'トピック', 'Embedding',
    'ChromaDB', 'SQLite', 'Tauriコマンド', 'IPC通信'
  ];
  
  const lowerQuery = query.toLowerCase();
  return designKeywords.some(keyword => lowerQuery.includes(keyword.toLowerCase()));
}

/**
 * システム設計ドキュメント用のRAGコンテキストを取得
 * AIアシスタントが理解しやすい構造化された形式で返す
 */
export async function getDesignDocContext(
  queryText: string,
  limit: number = 3,
  maxTokens: number = 2000, // トークン制限
  filters?: {
    sectionId?: string;
    tags?: string[];
  }
): Promise<string> {
  try {
    const results = await searchDesignDocs(queryText, limit * 2, filters); // 多めに取得
    
    const contextParts: string[] = [];
    contextParts.push('## システム設計ドキュメント情報');
    
    let currentTokens = 0;
    const tokenEstimate = (text: string) => Math.ceil(text.length / 4); // 簡易的なトークン見積もり
    
    for (const result of results) {
      if (currentTokens >= maxTokens) break;
      
      const parts: string[] = [];
      
      // セクションタイトル（必須、重要度が高い）
      parts.push(`**${result.sectionTitle}**`);
      const titleTokens = tokenEstimate(result.sectionTitle);
      currentTokens += titleTokens;
      
      // セクションID（参照用）
      parts.push(`セクションID: ${result.sectionId}`);
      currentTokens += tokenEstimate(result.sectionId);
      
      // 内容のサマリー（重要度に応じて長さを調整）
      const cleanContent = removeMermaidCode(result.content);
      const maxContentLength = Math.min(
        500, // 最大500文字
        maxTokens - currentTokens - 200 // 残りトークンから余裕を持たせる
      );
      
      const summary = cleanContent.length > maxContentLength
        ? cleanContent.substring(0, maxContentLength) + '...'
        : cleanContent;
      parts.push(`内容: ${summary}`);
      currentTokens += tokenEstimate(summary);
      
      // タグ（検索キーワードとして有用）
      if (result.tags && result.tags.length > 0 && currentTokens < maxTokens - 50) {
        parts.push(`タグ: ${result.tags.join(', ')}`);
        currentTokens += tokenEstimate(result.tags.join(', '));
      }
      
      // 関連度スコア
      parts.push(`関連度: ${(result.score * 100).toFixed(1)}%`);
      currentTokens += tokenEstimate(`関連度: ${(result.score * 100).toFixed(1)}%`);
      
      contextParts.push(`- ${parts.join(' | ')}`);
    }
    
    return contextParts.join('\n');
  } catch (error) {
    console.error('システム設計ドキュメントコンテキスト取得エラー:', error);
    return '';
  }
}

/**
 * システム設計ドキュメント検索（フォールバック対応）
 */
export async function searchDesignDocsWithFallback(
  queryText: string,
  limit: number = 5
): Promise<Array<DesignDocResult>> {
  try {
    // ChromaDBで検索を試みる
    return await searchDesignDocs(queryText, limit);
  } catch (chromaError) {
    console.warn('ChromaDB検索に失敗、フォールバックを使用:', chromaError);
    
    // フォールバック: 空の結果を返す（将来的にキーワードマッチングを実装可能）
    return [];
  }
}
