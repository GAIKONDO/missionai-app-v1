/**
 * マネタイズ図更新ユーティリティ（AIアシスタント機能）
 */

import type { FocusInitiative } from './orgApi';
import { getFocusInitiativeById } from './orgApi';

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
 * マネタイズ図更新結果の型定義
 */
export interface MonetizationDiagramUpdateResult {
  mermaidCode: string; // 生成されたMermaid図のコード
  summary: string; // 更新内容のサマリー
}

/**
 * テキストコンテンツを分析してマネタイズ図を生成・更新する（共通処理）
 * 
 * @param monetizationDiagramId マネタイズ図のID（md_で始まる）
 * @param contentText 分析するテキストコンテンツ
 * @param modelType モデルタイプ
 * @param selectedModel 選択されたモデル
 * @param initiative 注力施策（オプション）
 * @returns 生成されたMermaid図のコード
 */
async function updateMonetizationDiagramWithContent(
  monetizationDiagramId: string,
  contentText: string,
  modelType: 'gpt' | 'local' | 'cursor',
  selectedModel: string,
  initiative?: FocusInitiative | null
): Promise<MonetizationDiagramUpdateResult> {
  try {
    console.log('🤖 [updateMonetizationDiagram] 開始:', {
      monetizationDiagramId,
      contentTextLength: contentText.length,
      modelType,
      selectedModel,
      hasInitiative: !!initiative,
    });

    // 1. 注力施策を取得（既に渡されている場合はそれを使用、なければデータベースから取得）
    let targetInitiative: FocusInitiative | null = null;
    
    if (initiative) {
      targetInitiative = initiative;
      console.log('📖 [updateMonetizationDiagram] 渡された注力施策を使用:', targetInitiative.id);
    } else {
      // データベースから取得（monetizationDiagramIdからinitiativeIdを推測する必要がある）
      // この場合は、initiativeIdを別途渡す必要があるため、initiativeを必須にする
      throw new Error('注力施策の情報が必要です。');
    }

    console.log('📖 [updateMonetizationDiagram] 注力施策を取得:', {
      id: targetInitiative.id,
      title: targetInitiative.title,
      currentMonetizationDiagram: targetInitiative.monetizationDiagram ? 'あり' : 'なし',
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

    console.log('📖 [updateMonetizationDiagram] コンテンツを処理:', {
      contentLength: processedContent.length,
    });

    // 3. AIプロンプトを構築
    const systemPrompt = `あなたはビジネスモデルとマネタイズ戦略の専門家です。議事録の内容を分析し、Mermaid図でマネタイズの流れや商流を詳細に可視化します。

重要な指示：
- 必ずMermaid図のコードを生成してください
- Mermaid図はgraph LR（左から右）または graph TD（上から下）で開始してください
- ノードは角括弧[]で囲んでください（例: A[顧客]）
- 矢印は-->を使用してください（例: A -->|購入| B）
- ラベルは|ラベル|の形式で矢印の上に配置してください

詳細な関係性を表現するために：
1. **すべての関係者を明示**: 顧客、パートナー、サプライヤー、投資家、従業員など、ビジネスに関わるすべてのステークホルダーを含めてください
2. **収益の流れを詳細に**: 
   - 直接収益: 商品・サービスの販売、サブスクリプション、ライセンス料など
   - 間接收益: 広告収入、紹介手数料、データ販売、アフィリエイトなど
   - 各収益源を個別のノードとして表現
3. **コストと投資の流れ**: 開発コスト、マーケティング費用、人件費、設備投資なども表現してください
4. **複数の顧客セグメント**: B2C、B2B、B2Gなど、異なる顧客セグメントを分けて表現
5. **価値提供の詳細**: 各ステークホルダーに提供される価値を明確にラベル付け
6. **収益モデルの種類**: 
   - ワンタイム購入、サブスクリプション、従量課金、フリーミアム、マーケットプレイス手数料など
   - 各モデルを明確に区別して表現
7. **サブグラフの活用**: 関連する要素をグループ化（例: 顧客セグメント、収益源、コスト項目など）
8. **スタイルの使用**: 収益ノード、コストノード、顧客ノードなど、カテゴリごとに色分け

Mermaid図の詳細な例：
\`\`\`mermaid
graph LR
    subgraph Customers["顧客セグメント"]
        C1["個人顧客<br/>B2C"]
        C2["企業顧客<br/>B2B"]
        C3["政府機関<br/>B2G"]
    end
    
    subgraph Products["商品・サービス"]
        P1["基本プラン<br/>無料"]
        P2["プレミアムプラン<br/>月額課金"]
        P3["エンタープライズ<br/>年額契約"]
    end
    
    subgraph Revenue["収益源"]
        R1["💰 サブスクリプション<br/>月額/年額"]
        R2["💰 広告収入"]
        R3["💰 データライセンス"]
        R4["💰 紹介手数料"]
    end
    
    subgraph Partners["パートナー"]
        PA1["広告パートナー"]
        PA2["販売代理店"]
        PA3["技術パートナー"]
    end
    
    C1 -->|購入| P1
    C1 -->|購入| P2
    C2 -->|契約| P3
    C3 -->|契約| P3
    
    P1 -->|広告表示| R2
    P2 -->|💰 月額| R1
    P3 -->|💰 年額| R1
    
    PA1 -->|広告費| R2
    PA2 -->|紹介手数料| R4
    PA3 -->|技術提供| Products
    
    R1 -->|投資| Products
    R2 -->|投資| Products
    R3 -->|投資| Products
    R4 -->|投資| Products
\`\`\`

出力形式：
- Mermaid図のコードのみを返してください
- コードブロックマーカー（\`\`\`mermaid や \`\`\`）は含めないでください
- 説明文やコメントは不要です
- 必ず有効なMermaid図のコードを生成してください
- できるだけ詳細で複雑な関係性を表現してください`;

    const existingDiagram = targetInitiative.monetizationDiagram || '';
    const userPrompt = `以下の情報を基に、マネタイズ図（Mermaid図）を生成・更新してください。

【注力施策の情報】
- タイトル: ${targetInitiative.title}
- 説明: ${targetInitiative.description || 'なし'}
${existingDiagram ? `- 既存のマネタイズ図:\n\`\`\`mermaid\n${existingDiagram}\n\`\`\`` : ''}

【分析対象の内容】
${processedContent.substring(0, 8000)}${processedContent.length > 8000 ? '\n\n...（内容が長いため一部を省略）' : ''}

上記の内容を分析し、マネタイズの流れや商流を詳細にMermaid図で可視化してください。
${existingDiagram ? '既存の図を参考にしつつ、新しい情報を追加・更新してください。' : '新規にマネタイズ図を作成してください。'}

以下の点を必ず含めてください：
1. **すべてのステークホルダー**: 顧客、パートナー、サプライヤー、投資家など、議事録に記載されているすべての関係者
2. **詳細な収益源**: 直接収益、間接收益、複数の収益モデルを個別に表現
3. **コストと投資**: 開発コスト、マーケティング費用、運営コストなど
4. **顧客セグメントの区別**: B2C、B2B、B2Gなど、異なる顧客タイプを分けて表現
5. **価値提供の明確化**: 各ステークホルダーに提供される価値をラベルで明示
6. **サブグラフの活用**: 関連要素をグループ化して整理
7. **スタイルの使用**: カテゴリごとに色分け（収益=緑、コスト=赤、顧客=青など）

必ず以下の形式でMermaid図のコードを生成してください：
- graph LR または graph TD で開始
- ノードは[ノード名]の形式（改行は<br/>を使用可能）
- 矢印は-->を使用
- ラベルは|ラベル|の形式
- 収益には💰マークを含める
- サブグラフを使用してグループ化
- スタイルで色分け
- コードブロックマーカー（\`\`\`）は含めない
- 説明文は不要

できるだけ詳細で複雑な関係性を表現し、少なくとも10個以上のノードを含めてください。
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

    console.log('🤖 [updateMonetizationDiagram] AI生成結果:', generatedContent);

    // 5. Mermaidコードを抽出
    let mermaidCode = '';
    try {
      // Mermaidコードブロックを抽出（複数のパターンを試す）
      let extractedCode = '';
      
      // パターン1: ```mermaid ... ```
      const mermaidMatch1 = generatedContent.match(/```mermaid\s*\n?([\s\S]*?)\n?```/i);
      if (mermaidMatch1 && mermaidMatch1[1]) {
        extractedCode = mermaidMatch1[1].trim();
      } else {
        // パターン2: ``` ... ```（mermaidタグなし）
        const codeMatch = generatedContent.match(/```\s*\n?([\s\S]*?)\n?```/);
        if (codeMatch && codeMatch[1]) {
          extractedCode = codeMatch[1].trim();
        } else {
          // パターン3: graphで始まる行を探す
          const graphMatch = generatedContent.match(/(graph\s+(LR|TD|TB|BT)[\s\S]*?)(?=\n\n|\n```|$)/i);
          if (graphMatch && graphMatch[1]) {
            extractedCode = graphMatch[1].trim();
          } else {
            // パターン4: 全体を使用
            extractedCode = generatedContent.trim();
          }
        }
      }
      
      // コードブロックマーカーを削除
      mermaidCode = extractedCode
        .replace(/^```mermaid\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')
        .trim();
      
      // graphで始まることを確認
      if (!mermaidCode.match(/^\s*graph\s+(LR|TD|TB|BT)/i)) {
        // graphで始まらない場合、graph LRを追加
        console.warn('⚠️ [updateMonetizationDiagram] graphで始まらないため、graph LRを追加します');
        mermaidCode = `graph LR\n${mermaidCode}`;
      }
      
      // 空の場合はエラー
      if (!mermaidCode.trim()) {
        throw new Error('Mermaidコードが生成されませんでした。');
      }
      
      console.log('✅ [updateMonetizationDiagram] Mermaidコード抽出成功:', mermaidCode.substring(0, 200));
    } catch (parseError) {
      console.error('❌ [updateMonetizationDiagram] Mermaidコード抽出エラー:', parseError);
      console.error('生成されたコンテンツ:', generatedContent);
      throw new Error('Mermaidコードの抽出に失敗しました。AIの応答を確認してください。');
    }

    const result: MonetizationDiagramUpdateResult = {
      mermaidCode,
      summary: `マネタイズ図を${existingDiagram ? '更新' : '生成'}しました。`,
    };

    console.log('✅ [updateMonetizationDiagram] 更新完了:', result);
    return result;
  } catch (error: any) {
    console.error('❌ [updateMonetizationDiagram] エラー:', error);
    throw error;
  }
}

/**
 * 直接テキストを分析してマネタイズ図を生成・更新する
 * 
 * @param monetizationDiagramId マネタイズ図のID（md_で始まる）
 * @param textContent 分析するテキストコンテンツ
 * @param modelType モデルタイプ
 * @param selectedModel 選択されたモデル
 * @param initiative 注力施策
 * @returns 生成されたMermaid図のコード
 */
export async function updateMonetizationDiagramWithText(
  monetizationDiagramId: string,
  textContent: string,
  modelType: 'gpt' | 'local' | 'cursor',
  selectedModel: string,
  initiative: FocusInitiative
): Promise<MonetizationDiagramUpdateResult> {
  try {
    console.log('🤖 [updateMonetizationDiagramWithText] 開始:', {
      monetizationDiagramId,
      textContentLength: textContent.length,
      modelType,
      selectedModel,
      hasInitiative: !!initiative,
    });

    return await updateMonetizationDiagramWithContent(
      monetizationDiagramId,
      textContent,
      modelType,
      selectedModel,
      initiative
    );
  } catch (error: any) {
    console.error('❌ [updateMonetizationDiagramWithText] エラー:', error);
    throw error;
  }
}
