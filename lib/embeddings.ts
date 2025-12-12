/**
 * ベクトル埋め込み生成ユーティリティ
 * OpenAI Embeddings APIまたは代替APIを使用してテキストの埋め込みを生成
 */

import { stripHtml } from './pageMetadataUtils';

/**
 * 埋め込み生成のプロバイダー
 */
export type EmbeddingProvider = 'openai' | 'ollama';

/**
 * 埋め込み生成の設定
 */
export interface EmbeddingConfig {
  provider?: EmbeddingProvider; // プロバイダー（デフォルト: 環境変数または'openai'）
  model?: string;
  apiKey?: string;
  apiUrl?: string;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: EmbeddingConfig = {
  provider: (process.env.NEXT_PUBLIC_EMBEDDING_PROVIDER as EmbeddingProvider) || 'openai',
  model: 'text-embedding-3-small', // OpenAI用のデフォルトモデル
  apiUrl: 'https://api.openai.com/v1/embeddings',
};

/**
 * Ollama用のデフォルト設定
 */
const DEFAULT_OLLAMA_CONFIG: EmbeddingConfig = {
  provider: 'ollama',
  model: 'nomic-embed-text', // Ollama用の埋め込みモデル
  apiUrl: process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/api/embeddings',
};

/**
 * Ollama APIで埋め込みを生成
 */
async function generateEmbeddingWithOllama(
  text: string,
  config: EmbeddingConfig,
  retries: number
): Promise<number[]> {
  const ollamaConfig = { ...DEFAULT_OLLAMA_CONFIG, ...config };
  const apiUrl = ollamaConfig.apiUrl || 'http://localhost:11434/api/embeddings';
  const model = ollamaConfig.model || 'nomic-embed-text';

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const errorMessage = `Ollama埋め込み生成エラー: ${response.status} ${response.statusText}. ${errorText}`;
        
        // 5xxエラー（サーバーエラー）の場合はリトライ
        if (response.status >= 500 && attempt < retries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.warn(`Ollamaサーバーエラーが発生しました。${waitTime}ms待機してリトライします... (${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Ollama埋め込みデータの形式が不正です');
      }

      return data.embedding as number[];
    } catch (error) {
      lastError = error as Error;
      
      // ネットワークエラーの場合はリトライ
      if (error instanceof TypeError && error.message.includes('fetch')) {
        if (attempt < retries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.warn(`Ollamaネットワークエラーが発生しました。${waitTime}ms待機してリトライします... (${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      // 最後の試行でエラーが発生した場合、またはリトライ不可のエラーの場合
      if (attempt === retries || !(error instanceof TypeError)) {
        console.error('Ollama埋め込み生成エラー:', error);
        throw error;
      }
    }
  }

  throw lastError || new Error('Ollama埋め込み生成に失敗しました');
}

/**
 * OpenAI APIで埋め込みを生成
 */
async function generateEmbeddingWithOpenAI(
  text: string,
  config: EmbeddingConfig,
  retries: number
): Promise<number[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // APIキーを取得: 設定 > localStorage > 環境変数の順
  let apiKey: string | undefined = config.apiKey;
  if (!apiKey && typeof window !== 'undefined') {
    try {
      const { getAPIKey } = await import('./security');
      apiKey = getAPIKey('openai') || undefined;
    } catch (error) {
      // セキュリティモジュールがない場合は直接localStorageから取得
      apiKey = localStorage.getItem('NEXT_PUBLIC_OPENAI_API_KEY') || undefined;
    }
  }
  if (!apiKey) {
    apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  }
  
  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。設定ページ（/settings）でAPIキーを設定してください。');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(finalConfig.apiUrl!, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: finalConfig.model,
          input: text,
        }),
      });

      // レート制限エラー（429）の場合はリトライ
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        
        if (attempt < retries) {
          console.warn(`APIレート制限に達しました。${waitTime}ms待機してリトライします... (${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = `埋め込み生成エラー: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`;
        
        // 5xxエラー（サーバーエラー）の場合はリトライ
        if (response.status >= 500 && attempt < retries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.warn(`サーバーエラーが発生しました。${waitTime}ms待機してリトライします... (${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.data || !data.data[0] || !data.data[0].embedding) {
        throw new Error('埋め込みデータの形式が不正です');
      }

      return data.data[0].embedding as number[];
    } catch (error) {
      lastError = error as Error;
      
      // ネットワークエラーの場合はリトライ
      if (error instanceof TypeError && error.message.includes('fetch')) {
        if (attempt < retries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.warn(`ネットワークエラーが発生しました。${waitTime}ms待機してリトライします... (${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      // 最後の試行でエラーが発生した場合、またはリトライ不可のエラーの場合
      if (attempt === retries || !(error instanceof TypeError)) {
        console.error('埋め込み生成エラー:', error);
        throw error;
      }
    }
  }

  throw lastError || new Error('埋め込み生成に失敗しました');
}

/**
 * 埋め込みを生成（リトライロジック付き）
 * OpenAIまたはOllamaを使用
 * 
 * @param text 埋め込みを生成するテキスト
 * @param config 設定（オプション）
 * @param retries リトライ回数（デフォルト: 3）
 * @returns 埋め込みベクトル（配列）
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig = {},
  retries: number = 3
): Promise<number[]> {
  // HTMLタグを除去してテキストのみを取得
  const cleanText = stripHtml(text).trim();
  
  if (!cleanText) {
    throw new Error('テキストが空です');
  }

  // プロバイダーを決定（優先順位: config > localStorage > 環境変数 > 'openai'）
  let provider: EmbeddingProvider = 'openai';
  
  if (config.provider) {
    provider = config.provider;
  } else if (typeof window !== 'undefined') {
    const savedProvider = localStorage.getItem('embeddingProvider') as EmbeddingProvider | null;
    if (savedProvider && (savedProvider === 'openai' || savedProvider === 'ollama')) {
      provider = savedProvider;
    }
  }
  
  if (provider === 'openai' && !config.provider) {
    // 環境変数もチェック
    const envProvider = process.env.NEXT_PUBLIC_EMBEDDING_PROVIDER as EmbeddingProvider | undefined;
    if (envProvider && (envProvider === 'openai' || envProvider === 'ollama')) {
      provider = envProvider;
    }
  }
  
  // Ollama設定をlocalStorageから読み込み
  if (provider === 'ollama' && typeof window !== 'undefined') {
    const savedOllamaUrl = localStorage.getItem('ollamaEmbeddingApiUrl');
    if (savedOllamaUrl && !config.apiUrl) {
      config.apiUrl = savedOllamaUrl;
    }
    
    const savedOllamaModel = localStorage.getItem('ollamaEmbeddingModel');
    if (savedOllamaModel && !config.model) {
      config.model = savedOllamaModel;
    }
  }

  try {
    if (provider === 'ollama') {
      return await generateEmbeddingWithOllama(cleanText, config, retries);
    } else {
      return await generateEmbeddingWithOpenAI(cleanText, config, retries);
    }
  } catch (error) {
    // Ollamaが失敗した場合、OpenAIにフォールバック（設定されている場合）
    if (provider === 'ollama' && process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      console.warn('Ollama埋め込み生成に失敗しました。OpenAIにフォールバックします...');
      try {
        return await generateEmbeddingWithOpenAI(cleanText, { ...config, provider: 'openai' }, retries);
      } catch (fallbackError) {
        console.error('フォールバックも失敗しました:', fallbackError);
        throw error; // 元のエラーを投げる
      }
    }
    throw error;
  }
}

/**
 * タイトルとコンテンツを組み合わせた埋め込みを生成
 * 
 * @param title ページタイトル
 * @param content ページコンテンツ（HTML形式）
 * @param config 設定（オプション）
 * @returns 埋め込みベクトル（配列）
 */
export async function generateCombinedEmbedding(
  title: string,
  content: string,
  config: EmbeddingConfig = {}
): Promise<number[]> {
  // タイトルとコンテンツを組み合わせて埋め込みを生成
  const combinedText = `${title}\n\n${content}`;
  return generateEmbedding(combinedText, config);
}

/**
 * タイトルとコンテンツを分離して埋め込みを生成
 * 
 * @param title ページタイトル
 * @param content ページコンテンツ（HTML形式）
 * @param config 設定（オプション）
 * @returns タイトルとコンテンツの埋め込みベクトル
 */
export async function generateSeparatedEmbeddings(
  title: string,
  content: string,
  config: EmbeddingConfig = {}
): Promise<{ titleEmbedding: number[]; contentEmbedding: number[] }> {
  const [titleEmbedding, contentEmbedding] = await Promise.all([
    generateEmbedding(title, config),
    generateEmbedding(content, config),
  ]);
  
  return { titleEmbedding, contentEmbedding };
}

/**
 * メタデータを活用した埋め込みを生成
 * タイトルに重み付けし、メタデータ（keywords, semanticCategory等）を含める
 * 
 * @param title ページタイトル
 * @param content ページコンテンツ（HTML形式）
 * @param metadata メタデータ（オプション）
 * @param config 設定（オプション）
 * @returns 埋め込みベクトル（配列）
 */
export async function generateEnhancedEmbedding(
  title: string,
  content: string,
  metadata?: {
    keywords?: string[];
    semanticCategory?: string;
    tags?: string[];
    summary?: string;
  },
  config: EmbeddingConfig = {}
): Promise<number[]> {
  // タイトルに重み付け（3回繰り返しで重要度を上げる）
  const weightedTitle = `${title}\n${title}\n${title}`;
  
  // メタデータを組み合わせ
  const metadataParts: string[] = [];
  if (metadata?.semanticCategory) {
    metadataParts.push(metadata.semanticCategory);
  }
  if (metadata?.keywords && metadata.keywords.length > 0) {
    // 上位5キーワードを使用
    metadataParts.push(...metadata.keywords.slice(0, 5).join(' '));
  }
  if (metadata?.tags && metadata.tags.length > 0) {
    // 上位3タグを使用
    metadataParts.push(...metadata.tags.slice(0, 3).join(' '));
  }
  if (metadata?.summary) {
    metadataParts.push(metadata.summary);
  }
  
  const metadataText = metadataParts.join('\n');
  
  // 構造化されたテキストを生成
  const enhancedText = metadataText 
    ? `${weightedTitle}\n\n${metadataText}\n\n${content}`
    : `${weightedTitle}\n\n${content}`;
  
  return generateEmbedding(enhancedText, config);
}

/**
 * タイトルとコンテンツの埋め込みを重み付きで統合
 * 
 * @param titleEmbedding タイトルの埋め込みベクトル
 * @param contentEmbedding コンテンツの埋め込みベクトル
 * @param titleWeight タイトルの重み（デフォルト: 0.4）
 * @param contentWeight コンテンツの重み（デフォルト: 0.6）
 * @returns 統合された埋め込みベクトル
 */
export function combineWeightedEmbeddings(
  titleEmbedding: number[],
  contentEmbedding: number[],
  titleWeight: number = 0.4,
  contentWeight: number = 0.6
): number[] {
  if (titleEmbedding.length !== contentEmbedding.length) {
    throw new Error('タイトルとコンテンツの埋め込みベクトルの次元が一致しません');
  }
  
  // 重み付きで統合
  return titleEmbedding.map((val, i) => 
    val * titleWeight + contentEmbedding[i] * contentWeight
  );
}

/**
 * メタデータのみの埋め込みを生成
 * 
 * @param metadata メタデータ
 * @param config 設定（オプション）
 * @returns メタデータの埋め込みベクトル
 */
export async function generateMetadataEmbedding(
  metadata: {
    keywords?: string[];
    semanticCategory?: string;
    tags?: string[];
    summary?: string;
  },
  config: EmbeddingConfig = {}
): Promise<number[]> {
  const metadataParts: string[] = [];
  
  if (metadata.semanticCategory) {
    metadataParts.push(metadata.semanticCategory);
  }
  if (metadata.keywords && metadata.keywords.length > 0) {
    metadataParts.push(...metadata.keywords.slice(0, 10)); // 上位10キーワード
  }
  if (metadata.tags && metadata.tags.length > 0) {
    metadataParts.push(...metadata.tags.slice(0, 5)); // 上位5タグ
  }
  if (metadata.summary) {
    metadataParts.push(metadata.summary);
  }
  
  const metadataText = metadataParts.join('\n');
  
  if (!metadataText.trim()) {
    // メタデータが空の場合は空のベクトルを返す（後で処理）
    throw new Error('メタデータが空です');
  }
  
  return generateEmbedding(metadataText, config);
}

/**
 * 複数のテキストの埋め込みを一括生成（バッチ処理最適化）
 * 
 * @param texts テキストの配列
 * @param config 設定（オプション）
 * @param batchSize バッチサイズ（デフォルト: OpenAI=100, Ollama=10）
 * @returns 埋め込みベクトルの配列
 */
export async function generateBatchEmbeddings(
  texts: string[],
  config: EmbeddingConfig = {},
  batchSize?: number
): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  // プロバイダーを決定
  let provider: EmbeddingProvider = 'openai';
  if (config.provider) {
    provider = config.provider;
  } else if (typeof window !== 'undefined') {
    const savedProvider = localStorage.getItem('embeddingProvider') as EmbeddingProvider | null;
    if (savedProvider && (savedProvider === 'openai' || savedProvider === 'ollama')) {
      provider = savedProvider;
    }
  }
  
  // バッチサイズを決定（OpenAIはバッチAPIをサポート、Ollamaは個別リクエスト）
  const defaultBatchSize = provider === 'openai' ? 100 : 10;
  const actualBatchSize = batchSize || defaultBatchSize;
  
  // OpenAIの場合はバッチAPIを使用
  if (provider === 'openai' && texts.length > 1) {
    try {
      // APIキーを取得: 設定 > localStorage > 環境変数の順
      let apiKey: string | undefined = config.apiKey;
      if (!apiKey && typeof window !== 'undefined') {
        try {
          const { getAPIKey } = await import('./security');
          apiKey = getAPIKey('openai') || undefined;
        } catch (error) {
          // セキュリティモジュールがない場合は直接localStorageから取得
          apiKey = localStorage.getItem('NEXT_PUBLIC_OPENAI_API_KEY') || undefined;
        }
      }
      if (!apiKey) {
        apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      }
      const apiUrl = config.apiUrl || 'https://api.openai.com/v1/embeddings';
      const model = config.model || 'text-embedding-3-small';
      
      if (!apiKey) {
        throw new Error('OpenAI APIキーが設定されていません');
      }
      
      // テキストをクリーンアップ
      const cleanTexts = texts.map(text => stripHtml(text).trim()).filter(t => t.length > 0);
      
      if (cleanTexts.length === 0) {
        return texts.map(() => []);
      }
      
      // バッチで処理（OpenAI APIは最大2048件まで）
      for (let i = 0; i < cleanTexts.length; i += actualBatchSize) {
        const batch = cleanTexts.slice(i, i + actualBatchSize);
        
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: model,
              input: batch,
            }),
          });
          
          if (!response.ok) {
            throw new Error(`バッチ埋め込み生成エラー: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (!data.data || !Array.isArray(data.data)) {
            throw new Error('バッチ埋め込みデータの形式が不正です');
          }
          
          // バッチ結果を追加
          for (const item of data.data) {
            if (item.embedding) {
              embeddings.push(item.embedding);
            } else {
              embeddings.push([]);
            }
          }
          
          // レート制限を考慮して少し待機
          if (i + actualBatchSize < cleanTexts.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`バッチ ${i}-${i + batch.length} の埋め込み生成に失敗:`, error);
          // エラーが発生した場合は空の配列を追加
          batch.forEach(() => embeddings.push([]));
        }
      }
      
      // 空のテキスト分の埋め込みを追加
      const emptyCount = texts.length - cleanTexts.length;
      for (let i = 0; i < emptyCount; i++) {
        embeddings.push([]);
      }
      
      return embeddings;
    } catch (error) {
      console.warn('OpenAIバッチAPIに失敗、個別処理にフォールバック:', error);
      // フォールバック: 個別処理
    }
  }
  
  // Ollamaまたはフォールバック: 個別処理（並列実行を制限）
  const concurrency = provider === 'ollama' ? 5 : 10; // 同時実行数を制限
  
  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const batchPromises = batch.map(async (text) => {
      try {
        return await generateEmbedding(text, config);
      } catch (error) {
        console.error(`テキスト「${text.substring(0, 50)}...」の埋め込み生成に失敗:`, error);
        return [] as number[];
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    embeddings.push(...batchResults);
    
    // レート制限を考慮して少し待機
    if (i + concurrency < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return embeddings;
}

/**
 * コサイン類似度を計算
 * 
 * @param vecA ベクトルA
 * @param vecB ベクトルB
 * @returns コサイン類似度（0-1の値）
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    // 次元数が異なる場合は警告を出して0を返す（エラーを投げない）
    console.warn(`⚠️ ベクトルの次元が一致しません: ${vecA.length} vs ${vecB.length}。スキップします。`);
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * ユークリッド距離を計算
 * 
 * @param vecA ベクトルA
 * @param vecB ベクトルB
 * @returns ユークリッド距離
 */
export function euclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(`ベクトルの次元が一致しません: ${vecA.length} vs ${vecB.length}`);
  }

  let sumSquaredDiff = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sumSquaredDiff += diff * diff;
  }

  return Math.sqrt(sumSquaredDiff);
}

