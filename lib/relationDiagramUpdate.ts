/**
 * 相関図更新ユーティリティ（AIアシスタント機能）
 */

import type { FocusInitiative } from './orgApi';

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
 * 相関図更新結果の型定義
 */
export interface RelationDiagramUpdateResult {
  mermaidCode: string; // 生成されたMermaid図のコード
  summary: string; // 更新内容のサマリー
}

/**
 * テキストコンテンツを分析して相関図を生成・更新する（共通処理）
 * 
 * @param relationDiagramId 相関図のID（rd_で始まる）
 * @param contentText 分析するテキストコンテンツ
 * @param modelType モデルタイプ
 * @param selectedModel 選択されたモデル
 * @param initiative 注力施策（オプション）
 * @returns 生成されたMermaid図のコード
 */
async function updateRelationDiagramWithContent(
  relationDiagramId: string,
  contentText: string,
  modelType: 'gpt' | 'local' | 'cursor',
  selectedModel: string,
  initiative?: FocusInitiative | null
): Promise<RelationDiagramUpdateResult> {
  try {
    console.log('🤖 [updateRelationDiagram] 開始:', {
      relationDiagramId,
      contentTextLength: contentText.length,
      modelType,
      selectedModel,
      hasInitiative: !!initiative,
    });

    // 1. 注力施策を取得（既に渡されている場合はそれを使用、なければデータベースから取得）
    let targetInitiative: FocusInitiative | null = null;
    
    if (initiative) {
      targetInitiative = initiative;
      console.log('📖 [updateRelationDiagram] 渡された注力施策を使用:', targetInitiative.id);
    } else {
      // データベースから取得（relationDiagramIdからinitiativeIdを推測する必要がある）
      // この場合は、initiativeIdを別途渡す必要があるため、initiativeを必須にする
      throw new Error('注力施策の情報が必要です。');
    }

    console.log('📖 [updateRelationDiagram] 注力施策を取得:', {
      id: targetInitiative.id,
      title: targetInitiative.title,
      currentRelationDiagram: targetInitiative.relationDiagram ? 'あり' : 'なし',
    });

    // 2. テキストコンテンツを処理（JSON形式の場合はパース）
    let processedContent = contentText;
    try {
      const parsed = JSON.parse(processedContent);
      // 月ごとのデータが含まれている場合は、全内容を結合
      if (typeof parsed === 'object') {
        const allTexts: string[] = [];
        Object.keys(parsed).forEach((key) => {
          const monthData = parsed[key];
          if (monthData.summary) allTexts.push(monthData.summary);
          if (monthData.items) {
            monthData.items.forEach((item: any) => {
              if (item.title) allTexts.push(item.title);
              if (item.content) allTexts.push(item.content);
            });
          }
        });
        processedContent = allTexts.join('\n\n');
      }
    } catch (e) {
      // JSON形式でない場合はそのまま使用
    }

    console.log('📖 [updateRelationDiagram] コンテンツを処理:', {
      contentLength: processedContent.length,
    });

    // 3. AIプロンプトを構築
    const systemPrompt = `あなたはビジネスモデルと関係性分析の専門家です。議事録の内容を分析し、Mermaid図で相関図（関係性図）を可視化します。

Mermaid図の要件：
- graph LR（左から右）または graph TD（上から下）を使用
- 注力施策と関連する組織、グループ会社、テーマ、他の注力施策などの関係性を明確に示す
- 矢印（-->）で関係性を表現し、ラベル（|ラベル|）で関係性の種類を明示
- 関連する要素間の関係性（連携、依存、影響など）を視覚的に表現
- サブグラフ（subgraph）を使用してグループ化する
- スタイル（style）を使用して視覚的に分かりやすくする

出力形式：
- Mermaid図のコードのみを返してください
- コードブロック（\`\`\`）は不要です
- 説明文は不要です`;

    const existingDiagram = targetInitiative.relationDiagram || '';
    const userPrompt = `以下の情報を基に、相関図（Mermaid図）を生成・更新してください。

【注力施策の情報】
- タイトル: ${targetInitiative.title}
- 説明: ${targetInitiative.description || 'なし'}
- 関連組織: ${JSON.stringify(targetInitiative.relatedOrganizations || [])}
- 関連グループ会社: ${JSON.stringify(targetInitiative.relatedGroupCompanies || [])}
${existingDiagram ? `- 既存の相関図:\n\`\`\`mermaid\n${existingDiagram}\n\`\`\`` : ''}

【分析対象の内容】
${processedContent.substring(0, 8000)}${processedContent.length > 8000 ? '\n\n...（内容が長いため一部を省略）' : ''}

上記の内容を分析し、注力施策と関連する要素（組織、グループ会社、テーマ、他の注力施策など）の関係性をMermaid図で可視化してください。
${existingDiagram ? '既存の図を参考にしつつ、新しい情報を追加・更新してください。' : '新規に相関図を作成してください。'}
Mermaid図のコードのみを返してください。`;

    // 4. AI APIを呼び出し
    const isLocalModel = selectedModel.startsWith('qwen') || 
                         selectedModel.startsWith('llama') || 
                         selectedModel.startsWith('mistral') ||
                         selectedModel.includes(':latest') ||
                         selectedModel.includes(':instruct');

    let generatedContent = '';
    
    if (modelType === 'cursor') {
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
          maxTokens: 4000,
        } : {
          model: selectedModel,
          apiKey: apiKey,
          apiUrl: 'https://api.openai.com/v1/chat/completions',
          temperature: 0.7,
          maxTokens: 4000,
        }
      );
    }

    console.log('🤖 [updateRelationDiagram] AI生成結果:', generatedContent);

    // 5. Mermaidコードを抽出
    let mermaidCode = '';
    try {
      // Mermaidコードブロックを抽出
      const mermaidMatch = generatedContent.match(/```mermaid\n([\s\S]*?)\n```/) || 
                          generatedContent.match(/```\n([\s\S]*?)\n```/) ||
                          [null, generatedContent];
      mermaidCode = (mermaidMatch[1] || mermaidMatch[0] || generatedContent).trim();
      
      // コードブロックマーカーを削除
      mermaidCode = mermaidCode.replace(/^```mermaid\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
      
      // 空の場合はエラー
      if (!mermaidCode.trim()) {
        throw new Error('Mermaidコードが生成されませんでした。');
      }
    } catch (parseError) {
      console.error('❌ [updateRelationDiagram] Mermaidコード抽出エラー:', parseError);
      throw new Error('Mermaidコードの抽出に失敗しました。AIの応答を確認してください。');
    }

    const result: RelationDiagramUpdateResult = {
      mermaidCode,
      summary: `相関図を${existingDiagram ? '更新' : '生成'}しました。`,
    };

    console.log('✅ [updateRelationDiagram] 更新完了:', result);
    return result;
  } catch (error: any) {
    console.error('❌ [updateRelationDiagram] エラー:', error);
    throw error;
  }
}

/**
 * 直接テキストを分析して相関図を生成・更新する
 * 
 * @param relationDiagramId 相関図のID（rd_で始まる）
 * @param textContent 分析するテキストコンテンツ
 * @param modelType モデルタイプ
 * @param selectedModel 選択されたモデル
 * @param initiative 注力施策
 * @returns 生成されたMermaid図のコード
 */
export async function updateRelationDiagramWithText(
  relationDiagramId: string,
  textContent: string,
  modelType: 'gpt' | 'local' | 'cursor',
  selectedModel: string,
  initiative: FocusInitiative
): Promise<RelationDiagramUpdateResult> {
  try {
    console.log('🤖 [updateRelationDiagramWithText] 開始:', {
      relationDiagramId,
      textContentLength: textContent.length,
      modelType,
      selectedModel,
      hasInitiative: !!initiative,
    });

    return await updateRelationDiagramWithContent(
      relationDiagramId,
      textContent,
      modelType,
      selectedModel,
      initiative
    );
  } catch (error: any) {
    console.error('❌ [updateRelationDiagramWithText] エラー:', error);
    throw error;
  }
}
