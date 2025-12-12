/**
 * コンテナコンテンツ生成ユーティリティ
 */

import { doc } from './localFirebase';

// serverTimestampの代替関数
function getTimestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

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
          num_predict: config?.maxTokens || 2000,
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
      requestBody.max_completion_tokens = config?.maxTokens || 2000;
    } else {
      requestBody.max_tokens = config?.maxTokens || 2000;
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

export interface FixedPageContainer {
  id: string;
  title: string;
  content: string;
  order?: number;
  keyMessage?: string;
  subMessage?: string;
}

/**
 * コンテナIDからコンテナ情報を取得
 */
export async function getContainerById(
  planId: string,
  containerId: string,
  subMenuId: string
): Promise<FixedPageContainer | null> {
  try {
    const planDocRef = doc(null, 'companyBusinessPlan', planId);
    const planDoc = await planDocRef.get();
    if (!planDoc.exists()) {
      return null;
    }

    const data = planDoc.data();
    const containersBySubMenu = data?.fixedPageContainersBySubMenu || {};
    const containers = containersBySubMenu[subMenuId] || [];
    
    const container = containers.find((c: FixedPageContainer) => c.id === containerId);
    return container || null;
  } catch (error) {
    console.error('コンテナ取得エラー:', error);
    throw error;
  }
}

/**
 * コンテナのコンテンツをAIで生成
 */
export async function generateContainerContent(
  containerId: string,
  theme: string,
  planId: string,
  subMenuId: string,
  modelType: 'gpt' | 'local' | 'cursor',
  selectedModel: string
): Promise<{ title: string; content: string }> {
  // 既存のコンテナを取得
  const existingContainer = await getContainerById(planId, containerId, subMenuId);
  
  // 既存のコンテンツを参考にしながら、新しいテーマでコンテンツを生成
  const existingContent = existingContainer?.content || '';
  const existingTitle = existingContainer?.title || '';

  // HTMLからテキストを抽出（既存コンテンツの構造を理解するため）
  const extractTextFromHtml = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const existingText = extractTextFromHtml(existingContent);

  // プロンプトを構築
  const systemPrompt = `あなたは事業計画書のスライドコンテンツを生成する専門家です。
既存のコンテナの構造とスタイルを参考にしながら、指定されたテーマに基づいて新しいHTMLコンテンツを生成してください。

重要な要件:
1. 既存のHTML構造とスタイルを維持してください
2. 見出し、段落、リストなどの構造を適切に使用してください
3. 視覚的に魅力的で読みやすいデザインにしてください
4. テーマに沿った内容を生成してください
5. HTMLのみを返してください（マークダウンや説明文は不要です）`;

  const userPrompt = `以下のテーマに基づいて、スライドコンテンツを生成してください。

テーマ: ${theme}

${existingTitle ? `既存のタイトル: ${existingTitle}` : ''}
${existingText ? `既存のコンテンツの構造（参考）:\n${existingText.substring(0, 500)}` : ''}

上記のテーマに基づいて、HTML形式のスライドコンテンツを生成してください。
既存の構造を参考にしながら、新しいテーマに合わせた内容を作成してください。`;

  // AI APIを呼び出し
  const isLocalModel = selectedModel.startsWith('qwen') || 
                       selectedModel.startsWith('llama') || 
                       selectedModel.startsWith('mistral') ||
                       selectedModel.includes(':latest') ||
                       selectedModel.includes(':instruct');

  let generatedContent = '';
  
  if (modelType === 'cursor') {
    // Cursorモードの場合は、プロンプトを返すだけ
    throw new Error('Cursorモードは現在サポートされていません。GPTまたはローカルモデルを選択してください。');
  } else {
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
    generatedContent = await callLLMAPI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      selectedModel,
      isLocalModel ? {
        model: selectedModel,
        apiUrl: process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/api/chat',
        temperature: 0.7,
        maxTokens: 2000,
      } : {
        model: selectedModel,
        apiKey: apiKey,
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        temperature: 0.7,
        maxTokens: 2000,
      }
    );
  }

  // APIキーを取得: 設定ページ > localStorage > 環境変数の順（タイトル生成用）
  let titleApiKey: string | undefined;
  if (!isLocalModel && typeof window !== 'undefined') {
    try {
      const { getAPIKey } = await import('./security');
      titleApiKey = getAPIKey('openai') || undefined;
    } catch (error) {
      // セキュリティモジュールがない場合は直接localStorageから取得
      titleApiKey = localStorage.getItem('NEXT_PUBLIC_OPENAI_API_KEY') || undefined;
    }
  }
  if (!titleApiKey && !isLocalModel) {
    titleApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  }
  
  // タイトルを生成（テーマから簡潔なタイトルを抽出）
  const titlePrompt = `以下のテーマに基づいて、簡潔なスライドタイトルを生成してください（20文字以内）:\n\nテーマ: ${theme}`;
  
  const generatedTitle = await callLLMAPI(
    [
      { role: 'system', content: 'あなたは簡潔で効果的なタイトルを生成する専門家です。' },
      { role: 'user', content: titlePrompt }
    ],
    selectedModel,
    isLocalModel ? {
      model: selectedModel,
      apiUrl: process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/api/chat',
      temperature: 0.7,
      maxTokens: 50,
    } : {
      model: selectedModel,
      apiKey: titleApiKey,
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      temperature: 0.7,
      maxTokens: 50,
    }
  );

  return {
    title: generatedTitle.trim().replace(/^["']|["']$/g, ''),
    content: generatedContent.trim(),
  };
}

/**
 * コンテナを更新（事業計画用）
 */
export async function updateContainer(
  planId: string,
  containerId: string,
  subMenuId: string,
  updates: { title?: string; content?: string; keyMessage?: string; subMessage?: string }
): Promise<void> {
  try {
    const planDocRef = doc(null, 'companyBusinessPlan', planId);
    const planDoc = await planDocRef.get();
    if (!planDoc.exists()) {
      throw new Error('事業計画が見つかりません');
    }

    const data = planDoc.data();
    const containersBySubMenu = data?.fixedPageContainersBySubMenu || {};
    const containers = containersBySubMenu[subMenuId] || [];

    // コンテナを更新または追加
    const existingIndex = containers.findIndex((container: FixedPageContainer) => container.id === containerId);
    let updatedContainers: FixedPageContainer[];
    
    if (existingIndex >= 0) {
      // 既存のコンテナを更新
      updatedContainers = containers.map((container: FixedPageContainer) => {
        if (container.id === containerId) {
          return {
            ...container,
            title: updates.title !== undefined ? updates.title : container.title,
            content: updates.content !== undefined ? updates.content : container.content,
            keyMessage: updates.keyMessage !== undefined ? updates.keyMessage : container.keyMessage,
            subMessage: updates.subMessage !== undefined ? updates.subMessage : container.subMessage,
          };
        }
        return container;
      });
    } else {
      // コンテナが見つからない場合は新規追加
      const newContainer: FixedPageContainer = {
        id: containerId,
        title: updates.title || '新しいセクション',
        content: updates.content || '<p>ここにコンテンツを入力してください。</p>',
        order: containers.length,
        keyMessage: updates.keyMessage,
        subMessage: updates.subMessage,
      };
      updatedContainers = [...containers, newContainer];
    }

    // データベースに保存
    await planDocRef.update({
      fixedPageContainersBySubMenu: {
        ...containersBySubMenu,
        [subMenuId]: updatedContainers,
      },
      updatedAt: getTimestamp(),
    });
  } catch (error) {
    console.error('コンテナ更新エラー:', error);
    throw error;
  }
}

/**
 * 構想のコンテナを更新
 */
export async function updateConceptContainer(
  conceptDocId: string,
  containerId: string,
  subMenuId: string,
  updates: { title?: string; content?: string; keyMessage?: string; subMessage?: string }
): Promise<void> {
  try {
    const conceptDocRef = doc(null, 'concepts', conceptDocId);
    const conceptDoc = await conceptDocRef.get();
    if (!conceptDoc.exists()) {
      throw new Error('構想が見つかりません');
    }

    const data = conceptDoc.data();
    const containersBySubMenu = data?.fixedPageContainersBySubMenu || {};
    const containers = containersBySubMenu[subMenuId] || [];

    // コンテナを更新または追加
    const existingIndex = containers.findIndex((container: FixedPageContainer) => container.id === containerId);
    let updatedContainers: FixedPageContainer[];
    
    if (existingIndex >= 0) {
      // 既存のコンテナを更新
      updatedContainers = containers.map((container: FixedPageContainer) => {
        if (container.id === containerId) {
          return {
            ...container,
            title: updates.title !== undefined ? updates.title : container.title,
            content: updates.content !== undefined ? updates.content : container.content,
            keyMessage: updates.keyMessage !== undefined ? updates.keyMessage : container.keyMessage,
            subMessage: updates.subMessage !== undefined ? updates.subMessage : container.subMessage,
          };
        }
        return container;
      });
    } else {
      // コンテナが見つからない場合は新規追加
      const newContainer: FixedPageContainer = {
        id: containerId,
        title: updates.title || '新しいセクション',
        content: updates.content || '<p>ここにコンテンツを入力してください。</p>',
        order: containers.length,
        keyMessage: updates.keyMessage,
        subMessage: updates.subMessage,
      };
      updatedContainers = [...containers, newContainer];
    }

    // データベースに保存
    await conceptDocRef.update({
      fixedPageContainersBySubMenu: {
        ...containersBySubMenu,
        [subMenuId]: updatedContainers,
      },
      updatedAt: getTimestamp(),
    });
  } catch (error) {
    console.error('構想コンテナ更新エラー:', error);
    throw error;
  }
}

/**
 * 構想のコンテナIDからコンテナ情報を取得
 */
export async function getConceptContainerById(
  conceptDocId: string,
  containerId: string,
  subMenuId: string
): Promise<FixedPageContainer | null> {
  try {
    const conceptDocRef = doc(null, 'concepts', conceptDocId);
    const conceptDoc = await conceptDocRef.get();
    if (!conceptDoc.exists()) {
      return null;
    }

    const data = conceptDoc.data();
    const containersBySubMenu = data?.fixedPageContainersBySubMenu || {};
    const containers = containersBySubMenu[subMenuId] || [];
    
    const container = containers.find((c: FixedPageContainer) => c.id === containerId);
    return container || null;
  } catch (error) {
    console.error('構想コンテナ取得エラー:', error);
    throw error;
  }
}
