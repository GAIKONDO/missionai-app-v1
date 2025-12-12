/**
 * 特性要因図更新ユーティリティ（AIアシスタント機能）
 */

import type { FocusInitiative, MeetingNote } from './orgApi';
import { getFocusInitiativeByCauseEffectDiagramId, getMeetingNoteById } from './orgApi';

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
 * 特性要因図更新結果の型定義
 */
export interface CauseEffectDiagramUpdateResult {
  method: string[]; // 手法（更新後）
  means: string[]; // 手段（更新後）
  objective?: string; // 目標（更新後）
  summary: string; // 更新内容のサマリー
  addedElements: {
    method?: string[]; // 追加された手法
    means?: string[]; // 追加された手段
    objective?: string; // 更新された目標
  };
}

/**
 * テキストコンテンツを分析して特性要因図を更新する（共通処理）
 * 
 * @param causeEffectDiagramId 特性要因図のID（ced_で始まる）
 * @param contentText 分析するテキストコンテンツ
 * @param modelType モデルタイプ
 * @param selectedModel 選択されたモデル
 * @returns 更新された特性要因図の要素
 */
async function updateCauseEffectDiagramWithContent(
  causeEffectDiagramId: string,
  contentText: string,
  modelType: 'gpt' | 'local' | 'cursor',
  selectedModel: string,
  initiative?: FocusInitiative | null
): Promise<CauseEffectDiagramUpdateResult> {
  try {
    console.log('🤖 [updateCauseEffectDiagram] 開始:', {
      causeEffectDiagramId,
      contentTextLength: contentText.length,
      modelType,
      selectedModel,
      hasInitiative: !!initiative,
    });

    // 1. 注力施策を取得（既に渡されている場合はそれを使用、なければデータベースから取得）
    let targetInitiative: FocusInitiative;
    
    if (initiative) {
      targetInitiative = initiative;
      console.log('📖 [updateCauseEffectDiagram] 渡された注力施策を使用:', targetInitiative.id);
    } else {
      // データベースから取得
      const fetchedInitiative = await getFocusInitiativeByCauseEffectDiagramId(causeEffectDiagramId);
      if (!fetchedInitiative) {
        throw new Error(`特性要因図ID "${causeEffectDiagramId}" に対応する注力施策が見つかりませんでした。`);
      }
      targetInitiative = fetchedInitiative;
      console.log('📖 [updateCauseEffectDiagram] データベースから注力施策を取得:', targetInitiative.id);
    }

    console.log('📖 [updateCauseEffectDiagram] 注力施策を取得:', {
      id: targetInitiative.id,
      title: targetInitiative.title,
      currentMethod: targetInitiative.method,
      currentMeans: targetInitiative.means,
      currentObjective: targetInitiative.objective,
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

    console.log('📖 [updateCauseEffectDiagram] コンテンツを処理:', {
      contentLength: processedContent.length,
    });

    // 4. AIプロンプトを構築
    const systemPrompt = `あなたは特性要因図の専門家です。議事録の内容を分析し、既存の特性要因図の要素（手法・手段・目標）を更新・拡張します。

特性要因図の構造：
- 手法（method）: 注力施策を実現するための手法・アプローチ
- 手段（means）: 具体的な実行手段・方法
- 目標（objective）: 注力施策の目標・目的

重要な指示：
1. 既存の要素を保持しつつ、議事録から新しい要素を追加します
2. 類似した要素は統合・グルーピングします
3. 議事録の内容から関連する要因を抽出し、適切なカテゴリに分類します
4. 重複を避け、意味のあるグループ化を行います
5. JSON形式で結果を返してください

出力形式（JSON）:
{
  "method": ["手法1", "手法2", ...],
  "means": ["手段1", "手段2", ...],
  "objective": "目標の説明",
  "summary": "更新内容のサマリー（100文字程度）",
  "addedElements": {
    "method": ["追加された手法1", ...],
    "means": ["追加された手段1", ...],
    "objective": "更新された目標（変更があった場合のみ）"
  }
}`;

    const userPrompt = `以下の情報を基に、特性要因図を更新してください。

【注力施策の情報】
- タイトル: ${targetInitiative.title}
- 説明: ${targetInitiative.description || 'なし'}
- 現在の手法: ${JSON.stringify(targetInitiative.method || [])}
- 現在の手段: ${JSON.stringify(targetInitiative.means || [])}
- 現在の目標: ${targetInitiative.objective || 'なし'}

【分析対象の内容】
${processedContent.substring(0, 8000)}${processedContent.length > 8000 ? '\n\n...（内容が長いため一部を省略）' : ''}

上記の内容を分析し、既存の特性要因図の要素を更新・拡張してください。
新しい要素を追加し、既存の要素と統合・グルーピングしてください。
結果は必ずJSON形式で返してください。`;

    // 5. AI APIを呼び出し
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

    console.log('🤖 [updateCauseEffectDiagram] AI生成結果:', generatedContent);

    // 6. JSONをパース
    let updateResult: CauseEffectDiagramUpdateResult;
    try {
      // JSONコードブロックを抽出
      const jsonMatch = generatedContent.match(/```json\n([\s\S]*?)\n```/) || 
                        generatedContent.match(/```\n([\s\S]*?)\n```/) ||
                        [null, generatedContent];
      const jsonText = jsonMatch[1] || jsonMatch[0] || generatedContent;
      updateResult = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ [updateCauseEffectDiagram] JSONパースエラー:', parseError);
      // JSONパースに失敗した場合、テキストから推測して構造化
      updateResult = {
        method: targetInitiative.method || [],
        means: targetInitiative.means || [],
        objective: targetInitiative.objective,
        summary: generatedContent.substring(0, 200),
        addedElements: {},
      };
    }

    // 7. 既存の要素とマージ（重複を避ける）
    const existingMethod = new Set(targetInitiative.method || []);
    const existingMeans = new Set(targetInitiative.means || []);
    
    const mergedMethod = [...(targetInitiative.method || [])];
    const mergedMeans = [...(targetInitiative.means || [])];
    
    // 新しい要素を追加（重複チェック）
    if (updateResult.method) {
      updateResult.method.forEach((m: string) => {
        if (!existingMethod.has(m)) {
          mergedMethod.push(m);
          if (!updateResult.addedElements.method) {
            updateResult.addedElements.method = [];
          }
          updateResult.addedElements.method.push(m);
        }
      });
    }
    
    if (updateResult.means) {
      updateResult.means.forEach((m: string) => {
        if (!existingMeans.has(m)) {
          mergedMeans.push(m);
          if (!updateResult.addedElements.means) {
            updateResult.addedElements.means = [];
          }
          updateResult.addedElements.means.push(m);
        }
      });
    }

    const finalResult: CauseEffectDiagramUpdateResult = {
      method: mergedMethod,
      means: mergedMeans,
      objective: updateResult.objective || targetInitiative.objective,
      summary: updateResult.summary || '特性要因図を更新しました。',
      addedElements: {
        method: updateResult.addedElements.method || [],
        means: updateResult.addedElements.means || [],
        objective: updateResult.objective && updateResult.objective !== targetInitiative.objective 
          ? updateResult.objective 
          : undefined,
      },
    };

    console.log('✅ [updateCauseEffectDiagram] 更新完了:', finalResult);
    return finalResult;
  } catch (error: any) {
    console.error('❌ [updateCauseEffectDiagram] エラー:', error);
    throw error;
  }
}

/**
 * 議事録の内容を分析して特性要因図を更新する
 * 
 * @param causeEffectDiagramId 特性要因図のID（ced_で始まる）
 * @param meetingNoteId 議事録のID
 * @param modelType モデルタイプ
 * @param selectedModel 選択されたモデル
 * @returns 更新された特性要因図の要素
 */
export async function updateCauseEffectDiagramWithMeetingNote(
  causeEffectDiagramId: string,
  meetingNoteId: string,
  modelType: 'gpt' | 'local' | 'cursor',
  selectedModel: string
): Promise<CauseEffectDiagramUpdateResult> {
  try {
    console.log('🤖 [updateCauseEffectDiagramWithMeetingNote] 開始:', {
      causeEffectDiagramId,
      meetingNoteId,
      modelType,
      selectedModel,
    });

    // 議事録を取得
    const meetingNote = await getMeetingNoteById(meetingNoteId);
    if (!meetingNote) {
      throw new Error(`議事録ID "${meetingNoteId}" が見つかりませんでした。`);
    }

    console.log('📖 [updateCauseEffectDiagramWithMeetingNote] 議事録を取得:', {
      id: meetingNote.id,
      title: meetingNote.title,
      contentLength: meetingNote.content?.length || 0,
    });

    // 議事録の内容を使用して更新
    const contentText = meetingNote.content || '';
    return await updateCauseEffectDiagramWithContent(
      causeEffectDiagramId,
      contentText,
      modelType,
      selectedModel
    );
  } catch (error: any) {
    console.error('❌ [updateCauseEffectDiagramWithMeetingNote] エラー:', error);
    throw error;
  }
}

/**
 * 直接テキストを分析して特性要因図を更新する
 * 
 * @param causeEffectDiagramId 特性要因図のID（ced_で始まる）
 * @param textContent 分析するテキストコンテンツ
 * @param modelType モデルタイプ
 * @param selectedModel 選択されたモデル
 * @returns 更新された特性要因図の要素
 */
export async function updateCauseEffectDiagramWithText(
  causeEffectDiagramId: string,
  textContent: string,
  modelType: 'gpt' | 'local' | 'cursor',
  selectedModel: string,
  initiative?: FocusInitiative | null
): Promise<CauseEffectDiagramUpdateResult> {
  try {
    console.log('🤖 [updateCauseEffectDiagramWithText] 開始:', {
      causeEffectDiagramId,
      textContentLength: textContent.length,
      modelType,
      selectedModel,
      hasInitiative: !!initiative,
    });

    return await updateCauseEffectDiagramWithContent(
      causeEffectDiagramId,
      textContent,
      modelType,
      selectedModel,
      initiative
    );
  } catch (error: any) {
    console.error('❌ [updateCauseEffectDiagramWithText] エラー:', error);
    throw error;
  }
}
