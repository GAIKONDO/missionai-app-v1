/**
 * コンテナコード編集ユーティリティ（Vibeコーディング機能）
 */

// callLLMAPIは内部関数なので、直接実装する
async function callLLMAPI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string,
  config?: any
): Promise<string> {
  const isLocalModel = model.startsWith('qwen') || 
                       model.startsWith('llama') || 
                       model.startsWith('mistral') ||
                       model.includes(':latest') ||
                       model.includes(':instruct');
  
  if (isLocalModel) {
    // Ollama API呼び出し
    const apiUrl = config?.apiUrl || process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/api/chat';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config?.model || model,
        messages: messages.map(msg => ({
          role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
        stream: false,
        options: {
          temperature: config?.temperature || 0.7,
          num_predict: config?.maxTokens || 4000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama APIエラー: ${response.status}`);
    }

    const data = await response.json();
    return data.message?.content?.trim() || '';
  } else {
    // GPT API呼び出し
    // APIキーを取得: config > 設定ページ > localStorage > 環境変数の順
    let apiKey: string | undefined = config?.apiKey;
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

    const apiUrl = config?.apiUrl || 'https://api.openai.com/v1/chat/completions';
    const requestBody: any = {
      model: config?.model || model,
      messages,
    };

    if (model.startsWith('gpt-5')) {
      requestBody.max_completion_tokens = config?.maxTokens || 4000;
    } else {
      requestBody.max_tokens = config?.maxTokens || 4000;
      requestBody.temperature = config?.temperature || 0.7;
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
 * AIを使ってコンテナのコードを編集する（Vibeコーディング）
 * 
 * @param currentCode 現在のコード
 * @param instruction 編集指示（例: "このコードをより読みやすくリファクタリングして"）
 * @param modelType モデルタイプ
 * @param selectedModel 選択されたモデル
 * @returns 編集されたコード
 */
export async function editContainerCodeWithAI(
  currentCode: string,
  instruction: string,
  modelType: 'gpt' | 'local' | 'cursor',
  selectedModel: string
): Promise<string> {
  const systemPrompt = `あなたはHTMLコード編集の専門家です。
ユーザーの指示に従って、提供されたHTMLコードを編集してください。

重要な要件:
1. 提供されたコードの構造とスタイルを可能な限り維持してください
2. 指示に従って必要な変更のみを行ってください
3. コードの可読性と保守性を向上させてください
4. HTMLの構文エラーを避けてください
5. 編集されたコードのみを返してください（説明文やマークダウンは不要です）
6. コードブロック（\`\`\`html など）で囲まず、純粋なHTMLコードのみを返してください`;

  const userPrompt = `以下のHTMLコードを編集してください。

【編集指示】
${instruction}

【現在のコード】
${currentCode}

上記の指示に従って、編集されたHTMLコードを返してください。
コードブロックで囲まず、純粋なHTMLコードのみを返してください。`;

  const isLocalModel = selectedModel.startsWith('qwen') || 
                       selectedModel.startsWith('llama') || 
                       selectedModel.startsWith('mistral') ||
                       selectedModel.includes(':latest') ||
                       selectedModel.includes(':instruct');

  if (modelType === 'cursor') {
    throw new Error('Cursorモードは現在サポートされていません。GPTまたはローカルモデルを選択してください。');
  }

  // APIキーを取得: 設定ページ > localStorage > 環境変数の順
  let apiKey: string | undefined;
  if (!isLocalModel && typeof window !== 'undefined') {
    try {
      const { getAPIKey } = await import('./security');
      apiKey = getAPIKey('openai') || undefined;
    } catch (error) {
      // セキュリティモジュールがない場合は直接localStorageから取得
      apiKey = localStorage.getItem('NEXT_PUBLIC_OPENAI_API_KEY') || undefined;
    }
  }
  if (!apiKey && !isLocalModel) {
    apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  }

  // GPTまたはローカルモデルを使用
  const editedCode = await callLLMAPI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    selectedModel,
    isLocalModel ? {
      model: selectedModel,
      apiUrl: process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/api/chat',
      temperature: 0.3, // コード編集は低めの温度で
      maxTokens: 4000,
    } : {
      model: selectedModel,
      apiKey: apiKey,
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      temperature: 0.3, // コード編集は低めの温度で
      maxTokens: 4000,
    }
  );

  // コードブロックを除去（もし含まれていた場合）
  let cleanedCode = editedCode.trim();
  
  // ```html や ``` で囲まれている場合、それを除去
  if (cleanedCode.startsWith('```')) {
    const lines = cleanedCode.split('\n');
    // 最初の行（```html など）と最後の行（```）を除去
    if (lines.length > 2 && lines[lines.length - 1].trim() === '```') {
      cleanedCode = lines.slice(1, -1).join('\n');
    } else if (lines.length > 1) {
      cleanedCode = lines.slice(1).join('\n');
    }
  }

  return cleanedCode.trim();
}
