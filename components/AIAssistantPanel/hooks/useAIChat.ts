import type { Message, ModelType, RAGSource } from '../types';
import { MODEL_PRICES } from '../constants';

const SYSTEM_PROMPT_TEMPLATE = `あなたは事業計画策定を支援するAIアシスタントです。
ユーザーの質問に対して、親切で分かりやすい回答を提供してください。
必要に応じて、事業計画の作成や改善に関するアドバイスを提供できます。

{ragContext}

{toolsSection}

**重要な指示：**
1. **提供された情報の優先使用**:
   - 以下のセクションに提供された情報を必ず確認してください：
     - 「## 関連エンティティ」: 人物、組織、概念などのエンティティ情報
     - 「## 関連リレーション」: エンティティ間の関係性
     - 「## 関連トピック」: 議事録や会議メモから抽出されたトピック情報（人物名、発言内容、議論内容などが含まれる）
   - **特に「## 関連トピック」セクションには、人物名や具体的な情報が含まれている可能性が高いです。必ず確認してください。**
   - ユーザーの質問（特に人物名や固有名詞に関する質問）に対しては、まず「## 関連トピック」セクションを確認し、該当する情報があればそれを基に回答してください。

2. **システム設計に関する質問の場合**:
   - システム設計ドキュメントの情報を優先的に参照してください
   - 具体的な実装方法やアーキテクチャの説明を求められた場合は、システム設計ドキュメントの内容を基に回答してください
   - 参照元のセクション名を明記してください（例: 「アプリ全体構成」セクションより）

3. **情報の出典を明記**:
   - 回答に使用した情報の出典を必ず明記してください
   - システム設計ドキュメントの場合は「システム設計ドキュメント: [セクション名]」と記載
   - ナレッジグラフの場合は「ナレッジグラフ: [エンティティ名/リレーション名/トピック名]」と記載
   - トピック情報を使用した場合は「ナレッジグラフ: トピック「[トピックタイトル]」」と記載
   - 回答の最後に「## 参考情報の出典」セクションを追加し、使用した情報源を一覧表示してください

4. **不確実な情報について**:
   - 提供された情報に該当する内容がない場合のみ、「情報が見つかりませんでした」と回答してください
   - 提供された情報に該当する内容がある場合は、必ずその情報を基に回答してください
   - 推測ではなく、提供された情報に基づいて回答してください

5. **コード例や図について**:
   - Mermaid図やコード例が含まれる場合は、その説明を提供してください
   - 図の内容を文章で説明し、ユーザーが理解しやすいようにしてください

6. **Tool呼び出しについて**:
   - ユーザーのリクエストに応じて、適切なToolを呼び出すことができます
   - Toolを呼び出す場合は、以下の形式で指定してください:
     <tool_call name="tool_name">
     {
       "argument1": "value1",
       "argument2": "value2"
     }
     </tool_call>
   - Tool呼び出しの後、結果を確認してユーザーに適切な回答を提供してください
   - Tool呼び出しが失敗した場合は、エラーメッセージをユーザーに伝えてください

上記の情報を参考にして、より正確で具体的な回答を提供してください。`;

export function useAIChat(modelType: ModelType, selectedModel: string) {
  const sendMessage = async (
    inputText: string,
    conversationHistory: Message[],
    ragContext: string,
    ragSources: RAGSource[],
    organizationId?: string
  ): Promise<string> => {
    const aiStartTime = Date.now();

    // 利用可能なツールの一覧を取得
    let toolsSection = '';
    try {
      const { listAvailableTools } = await import('@/lib/mcp/tools');
      const tools = listAvailableTools();
      if (tools.length > 0) {
        const toolsList = tools.map(tool => {
          const argsList = tool.arguments && tool.arguments.length > 0
            ? tool.arguments.map(arg => `    - ${arg.name} (${arg.type}${arg.required ? ', 必須' : ', オプション'}): ${arg.description}`).join('\n')
            : '    - 引数なし';
          return `- **${tool.name}**: ${tool.description}\n${argsList}`;
        }).join('\n\n');
        toolsSection = `## 利用可能なTool

以下のToolを呼び出すことができます。ユーザーのリクエストに応じて、適切なToolを選択して使用してください。

${toolsList}

**Tool呼び出し形式:**
\`\`\`
<tool_call name="tool_name">
{
  "argument1": "value1",
  "argument2": "value2"
}
</tool_call>
\`\`\`

Toolを呼び出す場合は、上記の形式で指定してください。Toolの実行結果を受け取った後、その結果を基にユーザーに適切な回答を提供してください。`;
      }
    } catch (error) {
      console.warn('[useAIChat] ツール一覧の取得に失敗しました:', error);
    }

    // システムプロンプトを構築
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE
      .replace(
        '{ragContext}',
        ragContext ? `## 利用可能な情報\n${ragContext}` : '## 利用可能な情報\n（情報なし）'
      )
      .replace(
        '{toolsSection}',
        toolsSection
      );
    
    // デバッグ: RAGコンテキストの内容をログ出力
    if (ragContext) {
      console.log('[useAIChat] RAGコンテキストの内容:', {
        contextLength: ragContext.length,
        hasTopics: ragContext.includes('## 関連トピック'),
        hasEntities: ragContext.includes('## 関連エンティティ'),
        hasRelations: ragContext.includes('## 関連リレーション'),
        contextPreview: ragContext.substring(0, 1000),
      });
    } else {
      console.warn('[useAIChat] RAGコンテキストが空です。クエリ:', inputText);
    }

    // 会話履歴を構築
    const conversationMessages = [
      ...conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: inputText,
      },
    ];

    const allMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationMessages,
    ];

    if (modelType === 'cursor') {
      throw new Error('Cursorモードは現在サポートされていません。GPTまたはローカルモデルを選択してください。');
    }

    const isLocalModel = selectedModel.startsWith('qwen') || 
                         selectedModel.startsWith('llama') || 
                         selectedModel.startsWith('mistral') ||
                         selectedModel.includes(':latest') ||
                         selectedModel.includes(':instruct');

    let responseText = '';
    let tokenUsage: any = null;

    if (isLocalModel) {
      responseText = await callOllamaAPI(selectedModel, allMessages);
    } else {
      const result = await callOpenAIAPI(selectedModel, allMessages);
      responseText = result.text;
      tokenUsage = result.usage;
    }

    // Tool呼び出しを検出して実行
    const { parseToolCalls, executeToolCalls, formatToolCallResults } = await import('@/lib/mcp/toolParser');
    const toolCalls = parseToolCalls(responseText);
    
    if (toolCalls.length > 0) {
      console.log(`[useAIChat] ${toolCalls.length}件のTool呼び出しを検出しました`);
      
      // Toolを実行
      const toolResults = await executeToolCalls(toolCalls, {
        query: inputText,
        organizationId,
        modelType,
        selectedModel,
      });
      
      // Tool実行結果をフォーマット
      const toolResultsText = formatToolCallResults(toolResults);
      
      console.log('[useAIChat] Tool実行結果:', {
        toolResultsCount: toolResults.length,
        toolResultsTextLength: toolResultsText.length,
        toolResultsTextPreview: toolResultsText.substring(0, 500),
      });
      
      // Tool呼び出し部分を結果に置き換え
      for (const toolCall of toolCalls) {
        responseText = responseText.replace(toolCall.rawCall, `[Tool "${toolCall.tool}" を実行しました]`);
      }
      
      // Tool実行結果を追加
      responseText += toolResultsText;
      
      // Tool実行結果を基に、AIに追加の回答を生成
      // search_knowledge_graph Toolが実行された場合、結果を基に再度AIに問い合わせる
      const searchToolResult = toolResults.find(r => r.toolCall.tool === 'search_knowledge_graph' && r.result.success);
      
      console.log('[useAIChat] searchToolResult確認:', {
        found: !!searchToolResult,
        hasData: !!(searchToolResult && searchToolResult.result.data),
        resultsCount: searchToolResult?.result.data?.results?.length || 0,
        contextLength: searchToolResult?.result.data?.context?.length || 0,
      });
      
      if (searchToolResult && searchToolResult.result.data) {
        const searchData = searchToolResult.result.data;
        console.log('[useAIChat] searchData詳細:', {
          resultsCount: searchData.results?.length || 0,
          topicResultsCount: searchData.results?.filter((r: any) => r.type === 'topic').length || 0,
          contextLength: searchData.context?.length || 0,
          contextPreview: searchData.context?.substring(0, 500),
        });
        
        // 検索結果が存在する場合、またはコンテキストが存在する場合、再問い合わせを実行
        if ((searchData.results && searchData.results.length > 0) || (searchData.context && searchData.context.trim() !== '')) {
          // Tool実行結果を含めて再度AIに問い合わせ
          console.log('[useAIChat] Tool実行結果を基に再度AIに問い合わせます', {
            resultsCount: searchData.results?.length || 0,
            hasContext: !!(searchData.context && searchData.context.trim() !== ''),
          });
          
          // Tool実行結果を強調したメッセージを作成
          const toolResultsSummary = toolResultsText.length > 0 
            ? `\n\n## Tool実行結果\n${toolResultsText}\n\n上記のTool実行結果を**必ず確認**してください。`
            : '';
          
          const followUpMessages = [
            ...allMessages,
            {
              role: 'assistant' as const,
              content: responseText,
            },
            {
              role: 'user' as const,
              content: `上記のTool実行結果を確認して、ユーザーの質問「${inputText}」に対して回答してください。

**重要な指示:**
1. Tool実行結果に含まれる「## ナレッジグラフ検索結果」セクションを**必ず確認**してください
2. 「関連トピック」セクションに情報が含まれている場合、その詳細内容を**必ず読み**、ユーザーの質問に対する回答に使用してください
3. 検索結果が見つかっている場合は、「情報が見つかりませんでした」とは**絶対に言わないでください**
4. Tool実行結果に含まれる情報を基に、具体的で詳細な回答を提供してください${toolResultsSummary}`,
            },
          ];
          
          if (isLocalModel) {
            const followUpResponse = await callOllamaAPI(selectedModel, followUpMessages);
            responseText = followUpResponse;
          } else {
            const followUpResult = await callOpenAIAPI(selectedModel, followUpMessages);
            responseText = followUpResult.text;
            tokenUsage = followUpResult.usage;
          }
          
          console.log('[useAIChat] 再問い合わせ完了:', {
            responseLength: responseText.length,
            responsePreview: responseText.substring(0, 200),
          });
        } else {
          console.warn('[useAIChat] Tool実行結果が空です。再問い合わせをスキップします。');
        }
      }
    }

    // 出典情報を追加
    if (ragSources.length > 0) {
      const { formatSources } = await import('@/lib/knowledgeGraphRAG');
      const sourcesText = formatSources(ragSources);
      if (sourcesText && !responseText.includes('参考情報の出典')) {
        responseText += sourcesText;
      }
    }

    // メトリクスを記録
    await logMetrics(
      inputText,
      selectedModel,
      isLocalModel,
      allMessages,
      responseText,
      aiStartTime,
      ragContext.length > 0,
      tokenUsage
    );

    return responseText;
  };

  return { sendMessage };
}

export async function callOllamaAPI(model: string, messages: any[]): Promise<string> {
  let apiUrl: string = 'http://localhost:11434/api/chat';
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('NEXT_PUBLIC_OLLAMA_API_URL') || localStorage.getItem('ollamaChatApiUrl');
    if (savedUrl) {
      apiUrl = savedUrl;
    } else {
      apiUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || apiUrl;
    }
  } else {
    apiUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || apiUrl;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
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
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Ollama APIエラー: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.message?.content?.trim() || '';
}

export async function callOpenAIAPI(model: string, messages: any[]): Promise<{ text: string; usage?: any }> {
  let apiKey: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      const { getAPIKey } = await import('@/lib/security');
      apiKey = getAPIKey('openai');
    } catch (error) {
      apiKey = localStorage.getItem('NEXT_PUBLIC_OPENAI_API_KEY');
    }
  }
  
  if (!apiKey) {
    apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || null;
  }
  
  if (!apiKey) {
    throw new Error(`OpenAI APIキーが設定されていません。

設定方法:
1. 設定ページ（/settings）にアクセス
2. 「APIキー設定」セクションでOpenAI APIキーを入力
3. 保存ボタンをクリック

または、環境変数として設定:
プロジェクトルートの .env.local ファイルに以下を追加:
   NEXT_PUBLIC_OPENAI_API_KEY=your-api-key-here

APIキーは https://platform.openai.com/api-keys で取得できます。`);
  }

  const requestBody: any = {
    model,
    messages,
  };

  if (model.startsWith('gpt-5')) {
    requestBody.max_completion_tokens = 2000;
  } else {
    requestBody.max_tokens = 2000;
    requestBody.temperature = 0.7;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
  return {
    text: data.choices?.[0]?.message?.content?.trim() || '',
    usage: data.usage,
  };
}

async function logMetrics(
  query: string,
  model: string,
  isLocal: boolean,
  messages: any[],
  responseText: string,
  startTime: number,
  ragUsed: boolean,
  tokenUsage?: any
) {
  if (typeof window === 'undefined') return;

  try {
    const { logAIMetrics } = await import('@/lib/monitoring');
    const responseTime = Date.now() - startTime;

    if (isLocal) {
      const estimatedTokens = Math.ceil(
        (messages.reduce((sum, m) => sum + m.content.length, 0) + responseText.length) / 4
      );
      logAIMetrics({
        query,
        responseTime,
        tokenUsage: {
          input: Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4),
          output: Math.ceil(responseText.length / 4),
          total: estimatedTokens,
        },
        cost: 0,
        model,
        ragContextUsed: ragUsed,
        ragContextLength: 0,
      });
    } else {
      const usage = tokenUsage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const prices = MODEL_PRICES[model] || { input: 0, output: 0 };
      const cost = (usage.prompt_tokens / 1000) * prices.input + (usage.completion_tokens / 1000) * prices.output;
      
      logAIMetrics({
        query,
        responseTime,
        tokenUsage: {
          input: usage.prompt_tokens || 0,
          output: usage.completion_tokens || 0,
          total: usage.total_tokens || 0,
        },
        cost,
        model,
        ragContextUsed: ragUsed,
        ragContextLength: 0,
      });
    }
  } catch (error) {
    console.warn('[useAIChat] メトリクス記録エラー:', error);
  }
}

