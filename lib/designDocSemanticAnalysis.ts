/**
 * システム設計ドキュメントセクションのセマンティック分析
 * AIを使用してメタデータを自動生成
 */

/**
 * LLM APIを呼び出す（OpenAIまたはOllama）
 */
async function callLLMAPI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string = 'gpt-4o-mini'
): Promise<string> {
  // APIキーを取得: 設定ページ > localStorage > 環境変数の順
  let apiKey: string | undefined;
  if (typeof window !== 'undefined') {
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

  const isLocalModel = model.startsWith('qwen') || 
                       model.startsWith('llama') || 
                       model.startsWith('mistral') ||
                       model.includes(':latest') ||
                       model.includes(':instruct');

  if (isLocalModel) {
    // Ollama API呼び出し
    const apiUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/api/chat';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: messages.map(msg => ({
          role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama APIエラー: ${response.status}`);
    }

    const data = await response.json();
    return data.message?.content?.trim() || '';
  } else {
    // OpenAI API呼び出し
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const requestBody: any = {
      model: model,
      messages,
    };

    if (model.startsWith('gpt-5')) {
      requestBody.max_completion_tokens = 2000;
    } else {
      requestBody.max_tokens = 2000;
      requestBody.temperature = 0.7;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`GPT APIエラー: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }
}

/**
 * セマンティック分析結果
 */
export interface SemanticAnalysisResult {
  semanticCategory?: string;
  keywords?: string[];
  summary?: string;
  tags?: string[];
}

/**
 * セクションのセマンティック分析を実行
 */
export async function analyzeSectionSemantics(
  title: string,
  content: string,
  model: string = 'gpt-4o-mini'
): Promise<SemanticAnalysisResult> {
  const systemPrompt = `あなたは技術ドキュメントのセマンティック分析の専門家です。
システム設計ドキュメントのセクションを分析し、以下の情報を抽出してください：

1. semanticCategory: セクションのセマンティックカテゴリ（例: architecture, database, api, frontend, backend, data-flow, schema, security, deployment, testing, etc.）
   - 技術的な分類を1つのカテゴリで表現してください
   - 英語の小文字で、ハイフン区切りで複合語も可（例: "api-design", "database-schema"）

2. keywords: 重要なキーワード（5-10個、配列形式）
   - セクションの内容を理解する上で重要な技術用語や概念
   - 英語または日本語、混在可
   - 重複を避け、具体的な技術名や概念名を含める

3. summary: セクションの要約（100-150文字程度）
   - セクションの主要な内容を簡潔に説明
   - 日本語で記述
   - 技術的な詳細よりも、全体像や目的を重視

4. tags: 関連するタグ（5-10個、配列形式）
   - セクションを分類・検索するためのタグ
   - キーワードよりも広い概念や用途を含める
   - 英語または日本語、混在可
   - 例: ["RAG", "検索", "ベクトルDB", "セマンティック検索"]

回答は以下のJSON形式で返してください：
{
  "semanticCategory": "カテゴリ名",
  "keywords": ["キーワード1", "キーワード2", ...],
  "summary": "要約文",
  "tags": ["タグ1", "タグ2", ...]
}`;

  const userPrompt = `以下のシステム設計ドキュメントセクションを分析してください：

タイトル: ${title}

内容:
${content.substring(0, 3000)}${content.length > 3000 ? '...' : ''}

上記のセクションを分析し、JSON形式で結果を返してください。`;

  try {
    const response = await callLLMAPI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model
    );

    // JSONをパース
    // レスポンスにコードブロックが含まれている場合を考慮
    let jsonText = response.trim();
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    const result = JSON.parse(jsonText) as SemanticAnalysisResult;
    
    // バリデーション
    if (!result.keywords || !Array.isArray(result.keywords)) {
      result.keywords = [];
    }
    if (!result.tags || !Array.isArray(result.tags)) {
      result.tags = [];
    }

    return result;
  } catch (error) {
    console.error('セマンティック分析エラー:', error);
    throw new Error(`セマンティック分析に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}
