'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { FiSend, FiX, FiImage, FiGlobe, FiAtSign, FiCpu, FiSettings, FiCopy, FiCheck } from 'react-icons/fi';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';
import { generateContainerContent, updateContainer } from '@/lib/containerGeneration';
import ContainerEditModal from './ContainerEditModal';
import { updateCauseEffectDiagramWithMeetingNote, updateCauseEffectDiagramWithText } from '@/lib/causeEffectDiagramUpdate';
import { saveFocusInitiative, getFocusInitiativeByCauseEffectDiagramId } from '@/lib/orgApi';
import { getKnowledgeGraphContext } from '@/lib/knowledgeGraphRAG';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string; // 初期クエリ（オプション）
}

// GPTモデルリスト
const gptModels = [
  { value: 'gpt-5.1', label: 'gpt-5.1', inputPrice: '$1.25', outputPrice: '$10.00' },
  { value: 'gpt-5', label: 'gpt-5', inputPrice: '$1.25', outputPrice: '$10.00' },
  { value: 'gpt-5-mini', label: 'gpt-5-mini', inputPrice: '$0.25', outputPrice: '$2.00' },
  { value: 'gpt-5-nano', label: 'gpt-5-nano', inputPrice: '$0.05', outputPrice: '$0.40' },
  { value: 'gpt-5.1-chat-latest', label: 'gpt-5.1-chat-latest', inputPrice: '$1.25', outputPrice: '$10.00' },
  { value: 'gpt-5-chat-latest', label: 'gpt-5-chat-latest', inputPrice: '$1.25', outputPrice: '$10.00' },
  { value: 'gpt-5.1-codex', label: 'gpt-5.1-codex', inputPrice: '$1.25', outputPrice: '$10.00' },
  { value: 'gpt-5-codex', label: 'gpt-5-codex', inputPrice: '$1.25', outputPrice: '$10.00' },
  { value: 'gpt-5-pro', label: 'gpt-5-pro', inputPrice: '$15.00', outputPrice: '$120.00' },
  { value: 'gpt-4.1', label: 'gpt-4.1', inputPrice: '$2.00', outputPrice: '$8.00' },
  { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini', inputPrice: '$0.40', outputPrice: '$1.60' },
  { value: 'gpt-4.1-nano', label: 'gpt-4.1-nano', inputPrice: '$0.10', outputPrice: '$0.40' },
  { value: 'gpt-4o', label: 'gpt-4o', inputPrice: '$2.50', outputPrice: '$10.00' },
];

export default function AIAssistantPanel({ isOpen, onClose, initialQuery }: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const params = useParams();
  
  // 初期クエリが設定されたときに、入力フィールドに設定
  useEffect(() => {
    if (initialQuery && isOpen) {
      setInputValue(initialQuery);
      // 入力フィールドにフォーカス
      setTimeout(() => {
        inputRef.current?.focus();
        // テキストエリアの高さを調整
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
      }, 100);
    } else if (!initialQuery && isOpen) {
      // 初期クエリがクリアされたときは入力フィールドもクリアしない（ユーザーが入力中の可能性があるため）
    }
  }, [initialQuery, isOpen]);

  // モデル設定（localStorageから読み込み）
  const [modelType, setModelType] = useState<'gpt' | 'local' | 'cursor'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiAssistantModelType');
      return (saved as 'gpt' | 'local' | 'cursor') || 'gpt';
    }
    return 'gpt';
  });

  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiAssistantSelectedModel');
      return saved || 'gpt-4.1-mini';
    }
    return 'gpt-4.1-mini';
  });

  const [showModelSelector, setShowModelSelector] = useState(false);
  const [localModels, setLocalModels] = useState<Array<{ value: string; label: string; inputPrice: string; outputPrice: string }>>([]);
  const [loadingLocalModels, setLoadingLocalModels] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [feedbackRatings, setFeedbackRatings] = useState<Record<string, 'positive' | 'negative' | 'neutral'>>({});
  
  // AIフィードバックハンドラー
  const handleAIFeedback = (messageId: string, rating: 'positive' | 'negative') => {
    setFeedbackRatings(prev => ({
      ...prev,
      [messageId]: rating,
    }));
    // フィードバックをログに記録（将来的にAPIに送信することも可能）
    console.log(`AIフィードバック: メッセージID ${messageId}, 評価: ${rating}`);
  };
  
  // コンテナコードエディタモーダルの状態
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
  const [editingContainerId, setEditingContainerId] = useState<string | null>(null);

  // 現在選択されているモデルリスト
  const availableModels = modelType === 'gpt' ? gptModels : localModels;

  // メッセージをコピー
  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (error) {
      console.error('コピーに失敗しました:', error);
      // フォールバック: 古い方法を使用
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedMessageId(messageId);
        setTimeout(() => {
          setCopiedMessageId(null);
        }, 2000);
      } catch (err) {
        console.error('コピーに失敗しました:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // パネルが開いたら入力欄にフォーカス
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // モデルタイプが変更されたら、デフォルトモデルを設定
  useEffect(() => {
    if (modelType === 'gpt') {
      setSelectedModel('gpt-4.1-mini');
      localStorage.setItem('aiAssistantSelectedModel', 'gpt-4.1-mini');
    } else if (modelType === 'local') {
      // ローカルモデルが読み込まれたら最初のモデルを選択
      if (localModels.length > 0) {
        setSelectedModel(localModels[0].value);
        localStorage.setItem('aiAssistantSelectedModel', localModels[0].value);
      }
    }
    localStorage.setItem('aiAssistantModelType', modelType);
  }, [modelType, localModels]);

  // 選択されたモデルが変更されたら保存
  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem('aiAssistantSelectedModel', selectedModel);
    }
  }, [selectedModel]);

  // ローカルモデルタイプが選択されたときに、Ollamaから利用可能なモデルを取得
  useEffect(() => {
    if (modelType === 'local' && showModelSelector) {
      loadAvailableLocalModels();
    }
  }, [modelType, showModelSelector]);

  // Ollamaから利用可能なモデル一覧を取得
  const loadAvailableLocalModels = async () => {
    setLoadingLocalModels(true);
    try {
      const models = await getAvailableOllamaModels();
      if (models.length > 0) {
        const formattedModels = models.map(model => {
          // モデル名をフォーマット（例: "qwen2.5:7b" -> "Qwen 2.5 7B"）
          let label = model.name;
          if (model.name.includes(':')) {
            const [name, tag] = model.name.split(':');
            const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
            const spacedName = formattedName.replace(/([a-z])(\d)/g, '$1 $2');
            if (tag === 'latest') {
              label = `${spacedName} (Latest)`;
            } else {
              const formattedTag = tag.replace(/(\d)([a-z])/g, (match, num, letter) => `${num}${letter.toUpperCase()}`);
              label = `${spacedName} ${formattedTag}`;
            }
          } else {
            label = model.name.charAt(0).toUpperCase() + model.name.slice(1);
          }
          
          return {
            value: model.name,
            label: label,
            inputPrice: '無料',
            outputPrice: '無料',
          };
        });
        setLocalModels(formattedModels);
        // 最初のモデルを選択
        if (formattedModels.length > 0 && !selectedModel.startsWith('gpt')) {
          setSelectedModel(formattedModels[0].value);
        }
      } else {
        setLocalModels([]);
      }
    } catch (error) {
      console.error('ローカルモデルの取得エラー:', error);
      setLocalModels([]);
    } finally {
      setLoadingLocalModels(false);
    }
  };

  // モデルセレクターの外側をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    };

    if (showModelSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showModelSelector]);

  // 特性要因図更新リクエストを解析
  const parseCauseEffectDiagramRequest = (text: string): { 
    causeEffectDiagramId: string | null; 
    meetingNoteId: string | null;
    textContent: string | null;
  } => {
    // パターン1: "特性要因図 ced_xxxxx を更新して、議事録 meeting_xxxxx の内容を反映"
    const pattern1 = text.match(/特性要因図\s+(ced_\w+)\s+.*?議事録\s+(\w+)/i) ||
                     text.match(/特性要因図\s+(ced_\w+).*?議事録\s+(\w+)/i);
    
    if (pattern1) {
      return { 
        causeEffectDiagramId: pattern1[1], 
        meetingNoteId: pattern1[2],
        textContent: null
      };
    }
    
    // パターン2: "ced_xxxxx を更新して、議事録 meeting_xxxxx の内容を反映"
    const pattern2 = text.match(/(ced_\w+)\s+.*?議事録\s+(\w+)/i) ||
                     text.match(/(ced_\w+).*?議事録\s+(\w+)/i);
    
    if (pattern2) {
      return { 
        causeEffectDiagramId: pattern2[1], 
        meetingNoteId: pattern2[2],
        textContent: null
      };
    }
    
    // パターン3: "特性要因図 ced_xxxxx を議事録 meeting_xxxxx で更新"
    const pattern3 = text.match(/特性要因図\s+(ced_\w+).*?議事録\s+(\w+)/i);
    
    if (pattern3) {
      return { 
        causeEffectDiagramId: pattern3[1], 
        meetingNoteId: pattern3[2],
        textContent: null
      };
    }
    
    // パターン4: ced_で始まるIDと、meeting_で始まるIDを抽出
    const cedMatch = text.match(/(ced_\w+)/i);
    const meetingMatch = text.match(/(meeting_\w+|\d{13,})/i); // meeting_で始まるか、13桁以上の数字（議事録ID）
    
    if (cedMatch && meetingMatch) {
      return { 
        causeEffectDiagramId: cedMatch[1], 
        meetingNoteId: meetingMatch[1],
        textContent: null
      };
    }
    
    // パターン5: 特性要因図IDと直接テキストコンテンツ
    // "特性要因図 ced_xxxxx を更新して、以下の内容を反映: [テキスト]"
    const pattern5 = text.match(/特性要因図\s+(ced_\w+)\s+.*?(?:更新|反映).*?[:：]\s*(.+)/is);
    if (pattern5) {
      return {
        causeEffectDiagramId: pattern5[1],
        meetingNoteId: null,
        textContent: pattern5[2].trim()
      };
    }
    
    // パターン6: "ced_xxxxx を以下の内容で更新: [テキスト]"
    const pattern6 = text.match(/(ced_\w+)\s+.*?(?:更新|反映).*?[:：]\s*(.+)/is);
    if (pattern6) {
      return {
        causeEffectDiagramId: pattern6[1],
        meetingNoteId: null,
        textContent: pattern6[2].trim()
      };
    }
    
    // パターン7: 特性要因図IDが含まれていて、長いテキストが続く場合（議事録IDがない場合）
    if (cedMatch) {
      // 特性要因図IDの後の部分をテキストコンテンツとして扱う
      const afterCed = text.substring(text.indexOf(cedMatch[1]) + cedMatch[1].length).trim();
      // 更新関連のキーワードが含まれていて、テキストが長い場合（50文字以上）
      if ((afterCed.includes('更新') || afterCed.includes('反映') || afterCed.includes('追加')) && afterCed.length > 50) {
        // キーワードの後の部分を抽出
        const contentMatch = afterCed.match(/(?:更新|反映|追加).*?[:：]\s*(.+)/is) || 
                             afterCed.match(/(?:更新|反映|追加)\s+(.+)/is);
        if (contentMatch) {
          return {
            causeEffectDiagramId: cedMatch[1],
            meetingNoteId: null,
            textContent: contentMatch[1].trim()
          };
        }
        // キーワードがない場合でも、長いテキストがあればそれを使用
        return {
          causeEffectDiagramId: cedMatch[1],
          meetingNoteId: null,
          textContent: afterCed
        };
      }
    }
    
    return { causeEffectDiagramId: null, meetingNoteId: null, textContent: null };
  };

  // コンテナIDとテーマを抽出
  const parseContainerRequest = (text: string): { containerId: string | null; theme: string | null; isEditMode: boolean } => {
    // パターン1: "1764964171506を編集" または "1764964171506編集" など（編集モード）
    const editMatch = text.match(/(\d{13,})\s*(?:を|の)?\s*(?:編集|コード|エディタ)/i) ||
                      text.match(/(\d{13,})\s*edit/i);
    
    if (editMatch) {
      return { containerId: editMatch[1], theme: null, isEditMode: true };
    }
    
    // パターン2: "1764964171506のコンテナ" または "コンテナ1764964171506"（コンテンツ生成モード）
    const containerIdMatch = text.match(/(\d{13,})\s*(?:の|を|に|で)?\s*(?:コンテナ|コンテンツ)/i) ||
                            text.match(/コンテナ\s*(\d{13,})/i);
    
    if (containerIdMatch) {
      const containerId = containerIdMatch[1];
      // テーマを抽出（コンテナIDの後の部分、または「テーマは」「テーマ:」などのキーワードの後）
      const themeMatch = text.match(/テーマ[は:：]\s*(.+?)(?:$|。|、)/i) ||
                        text.match(/(?:コンテナ|コンテンツ).+?[、,]\s*(.+?)(?:$|。)/i) ||
                        text.match(/\d{13,}.+?[、,]\s*(.+?)(?:$|。)/i);
      
      const theme = themeMatch ? themeMatch[1].trim() : text.replace(/\d{13,}.*?[、,]\s*/i, '').trim();
      
      return { containerId, theme: theme || null, isEditMode: false };
    }
    
    // パターン3: コンテナIDのみ（13桁以上の数字のみ）
    const onlyIdMatch = text.match(/^(\d{13,})$/);
    if (onlyIdMatch) {
      return { containerId: onlyIdMatch[1], theme: null, isEditMode: true };
    }
    
    return { containerId: null, theme: null, isEditMode: false };
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const inputText = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      // 特性要因図更新リクエストをチェック
      const { causeEffectDiagramId, meetingNoteId, textContent } = parseCauseEffectDiagramRequest(inputText);
      
      if (causeEffectDiagramId && (meetingNoteId || textContent)) {
        // 特性要因図更新モード
        const updateSource = meetingNoteId ? `議事録 ${meetingNoteId}` : '提供されたテキスト';
        const assistantMessageLoading: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `特性要因図 ${causeEffectDiagramId} を${updateSource}の内容で更新中です...`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessageLoading]);

        // エラーメッセージ用に変数を保存
        const hasMeetingNoteId = !!meetingNoteId;
        
        try {
          let updateResult;
          
          if (meetingNoteId) {
            // 議事録IDから更新
            updateResult = await updateCauseEffectDiagramWithMeetingNote(
              causeEffectDiagramId,
              meetingNoteId,
              modelType,
              selectedModel
            );
          } else if (textContent) {
            // 直接テキストから更新
            updateResult = await updateCauseEffectDiagramWithText(
              causeEffectDiagramId,
              textContent,
              modelType,
              selectedModel
            );
          } else {
            throw new Error('議事録IDまたはテキストコンテンツが必要です。');
          }

          // 注力施策を取得して更新
          const initiative = await getFocusInitiativeByCauseEffectDiagramId(causeEffectDiagramId);

          if (!initiative) {
            throw new Error(`特性要因図ID "${causeEffectDiagramId}" に対応する注力施策が見つかりませんでした。`);
          }

          // 注力施策を更新
          await saveFocusInitiative({
            ...initiative,
            method: updateResult.method,
            means: updateResult.means,
            objective: updateResult.objective,
          });

          // 成功メッセージ
          const summary = updateResult.summary || '特性要因図を更新しました。';
          const addedMethod = updateResult.addedElements.method && updateResult.addedElements.method.length > 0
            ? `\n\n追加された手法: ${updateResult.addedElements.method.join(', ')}`
            : '';
          const addedMeans = updateResult.addedElements.means && updateResult.addedElements.means.length > 0
            ? `\n\n追加された手段: ${updateResult.addedElements.means.join(', ')}`
            : '';
          const updatedObjective = updateResult.addedElements.objective 
            ? `\n\n更新された目標: ${updateResult.addedElements.objective}`
            : '';

          const assistantMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `✅ 特性要因図 ${causeEffectDiagramId} を更新しました。\n\n${summary}${addedMethod}${addedMeans}${updatedObjective}\n\nページをリロードして変更を確認してください。`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev.slice(0, -1), assistantMessage]);
          
          // ページをリロード
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } catch (error: any) {
          console.error('特性要因図更新エラー:', error);
          const errorMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `❌ 特性要因図の更新に失敗しました: ${error.message || error}\n\n特性要因図IDと${hasMeetingNoteId ? '議事録ID' : 'テキストコンテンツ'}が正しいか確認してください。`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
        }
        
        setIsLoading(false);
        return;
      }

      // コンテナIDとテーマを抽出
      const { containerId, theme, isEditMode } = parseContainerRequest(inputText);

      // 編集モード: コンテナIDのみ、または「編集」キーワードが含まれる場合
      if (containerId && isEditMode) {
        // planIdとsubMenuIdを取得（構想の場合はconceptIdから取得）
        let planId = params?.planId as string;
        if (!planId && params?.conceptId) {
          // 構想の場合はconceptIdをplanIdとして使用（実際のconceptDocIdはContainerCodeEditorModalで取得）
          planId = params.conceptId as string;
        }
        if (!planId) {
          throw new Error('事業計画IDまたは構想IDが見つかりません。事業計画ページまたは構想ページで実行してください。');
        }

        // パスからsubMenuIdを抽出（例: /business-plan/company/[planId]/overview -> overview）
        const pathParts = pathname.split('/');
        const subMenuId = pathParts[pathParts.length - 1] || 'overview';

        // コードエディタモーダルを開く
        setEditingContainerId(containerId);
        setIsCodeEditorOpen(true);

        // 成功メッセージ
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `コンテナ ${containerId} のコードエディタを開きました。\n\nモーダル内でコードを編集し、AI編集指示を使ってVibeコーディングでコードを編集できます。`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
        return;
      }

      if (containerId && theme) {
        // コンテナ生成モード
        // planIdとsubMenuIdを取得（構想の場合はconceptIdから取得）
        let planId = params?.planId as string;
        if (!planId && params?.conceptId) {
          // 構想の場合はconceptIdをplanIdとして使用（実際のconceptDocIdはgenerateContainerContentで取得）
          planId = params.conceptId as string;
        }
        if (!planId) {
          throw new Error('事業計画IDまたは構想IDが見つかりません。事業計画ページまたは構想ページで実行してください。');
        }

        // パスからsubMenuIdを抽出（例: /business-plan/company/[planId]/overview -> overview）
        const pathParts = pathname.split('/');
        const subMenuId = pathParts[pathParts.length - 1] || 'overview';

        // コンテナコンテンツを生成
        const assistantMessageLoading: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `コンテナ ${containerId} のコンテンツを生成中です...\nテーマ: ${theme}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessageLoading]);

        const { title, content } = await generateContainerContent(
          containerId,
          theme,
          planId,
          subMenuId,
          modelType,
          selectedModel
        );

        // コンテナを更新
        await updateContainer(planId, containerId, subMenuId, { title, content });

        // 成功メッセージ
        const assistantMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `✅ コンテナ ${containerId} のコンテンツを生成しました。\n\nタイトル: ${title}\n\nページをリロードして変更を確認してください。`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev.slice(0, -1), assistantMessage]);
        
        // ページをリロード
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        // 通常のチャットモード
        // ローディングメッセージを表示
        const loadingMessageId = (Date.now() + 1).toString();
        const loadingMessage: Message = {
          id: loadingMessageId,
          role: 'assistant',
          content: '考え中...',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, loadingMessage]);

        // エラーハンドリングでも使用するため、tryブロックの前に定義
        const aiStartTime = Date.now();

        try {
          // 会話履歴を構築（最新のメッセージを含む）
          const conversationMessages = [
            ...messages.map(msg => ({
              role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
              content: msg.content,
            })),
            {
              role: 'user' as const,
              content: inputText,
            },
          ];

          // 現在のページから組織IDを抽出
          const extractOrganizationId = (): string | undefined => {
            // /organization/[id] の形式から組織IDを抽出
            if (pathname?.startsWith('/organization/')) {
              const pathParts = pathname.split('/');
              const orgIndex = pathParts.indexOf('organization');
              if (orgIndex >= 0 && pathParts[orgIndex + 1]) {
                return pathParts[orgIndex + 1];
              }
            }
            // paramsから直接取得を試みる
            if (params?.id) {
              return params.id as string;
            }
            return undefined;
          };

          const currentOrganizationId = extractOrganizationId();
          let ragContext = '';
          let ragContextLength = 0;
          let ragContextUsed = false;

          // 統合RAG検索を実行してコンテキストを取得（ナレッジグラフ + システム設計ドキュメント）
          try {
            const { getIntegratedRAGContext } = await import('@/lib/knowledgeGraphRAG');
            const context = await getIntegratedRAGContext(
              inputText,
              5, // 各タイプごとに最大5件
              {
                organizationId: currentOrganizationId || undefined,
                includeDesignDocs: true, // システム設計ドキュメントを含める
              }
            );
            if (context) {
              ragContext = `\n\n${context}\n\n`;
              ragContextLength = context.length;
              ragContextUsed = true;
            }
          } catch (ragError) {
            console.warn('RAG検索エラー（続行します）:', ragError);
            // エラーメトリクスを記録
            if (typeof window !== 'undefined') {
              try {
                const { logErrorMetrics } = await import('@/lib/monitoring');
                logErrorMetrics({
                  errorType: ragError instanceof Error ? ragError.constructor.name : 'RAGSearchError',
                  errorMessage: ragError instanceof Error ? ragError.message : String(ragError),
                  component: 'ai-assistant',
                  context: {
                    query: inputText,
                    organizationId: currentOrganizationId,
                  },
                });
              } catch (metricsError) {
                console.warn('[AIAssistant] エラーメトリクス記録エラー:', metricsError);
              }
            }
            // RAG検索が失敗してもチャットは続行
            // フォールバック: 既存のナレッジグラフ検索を試みる
            try {
              const { getKnowledgeGraphContext } = await import('@/lib/knowledgeGraphRAG');
              const fallbackContext = await getKnowledgeGraphContext(
                inputText,
                5,
                currentOrganizationId ? { organizationId: currentOrganizationId } : undefined
              );
              if (fallbackContext) {
                ragContext = `\n\n## 関連するナレッジグラフ情報\n${fallbackContext}\n\n`;
                ragContextLength = fallbackContext.length;
                ragContextUsed = true;
              }
            } catch (fallbackError) {
              console.warn('フォールバックRAG検索も失敗:', fallbackError);
            }
          }

          // システムプロンプトを追加（RAGコンテキストを含む、改善版）
          const systemPrompt = `あなたは事業計画策定を支援するAIアシスタントです。
ユーザーの質問に対して、親切で分かりやすい回答を提供してください。
必要に応じて、事業計画の作成や改善に関するアドバイスを提供できます。

${ragContext ? `## 利用可能な情報\n${ragContext}` : ''}

**重要な指示：**
1. **システム設計に関する質問の場合**:
   - システム設計ドキュメントの情報を優先的に参照してください
   - 具体的な実装方法やアーキテクチャの説明を求められた場合は、システム設計ドキュメントの内容を基に回答してください
   - 参照元のセクション名を明記してください（例: 「アプリ全体構成」セクションより）

2. **情報の出典を明記**:
   - 回答に使用した情報の出典を明記してください
   - システム設計ドキュメントの場合は「システム設計ドキュメント: [セクション名]」と記載
   - ナレッジグラフの場合は「ナレッジグラフ: [エンティティ名/リレーション名]」と記載

3. **不確実な情報について**:
   - システム設計ドキュメントに記載がない情報については、「システム設計ドキュメントには記載がありませんが...」と前置きしてください
   - 推測ではなく、提供された情報に基づいて回答してください

4. **コード例や図について**:
   - Mermaid図やコード例が含まれる場合は、その説明を提供してください
   - 図の内容を文章で説明し、ユーザーが理解しやすいようにしてください

上記の情報を参考にして、より正確で具体的な回答を提供してください。`;

          const allMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...conversationMessages,
          ];

          // モデルタイプに応じてAPIを呼び出し
          let responseText = '';
          
          if (modelType === 'cursor') {
            // Cursorモードは現在サポートされていない
            throw new Error('Cursorモードは現在サポートされていません。GPTまたはローカルモデルを選択してください。');
          } else {
            // GPTまたはローカルモデルを使用
            const isLocalModel = selectedModel.startsWith('qwen') || 
                                 selectedModel.startsWith('llama') || 
                                 selectedModel.startsWith('mistral') ||
                                 selectedModel.includes(':latest') ||
                                 selectedModel.includes(':instruct');

            if (isLocalModel) {
              // Ollama API呼び出し
              // localStorageから取得、なければ環境変数から取得
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
                  model: selectedModel,
                  messages: allMessages.map(msg => ({
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
              responseText = data.message?.content?.trim() || '';
              
              // ローカルモデルの場合はコスト0、トークン数は概算
              const estimatedTokens = Math.ceil((systemPrompt.length + inputText.length + responseText.length) / 4);
              const responseTime = Date.now() - aiStartTime;
              
              // メトリクスを記録
              if (typeof window !== 'undefined') {
                try {
                  const { logAIMetrics } = await import('@/lib/monitoring');
                  logAIMetrics({
                    query: inputText,
                    responseTime,
                    tokenUsage: {
                      input: Math.ceil((systemPrompt.length + inputText.length) / 4),
                      output: Math.ceil(responseText.length / 4),
                      total: estimatedTokens,
                    },
                    cost: 0, // ローカルモデルは無料
                    model: selectedModel,
                    ragContextUsed,
                    ragContextLength,
                  });
                } catch (metricsError) {
                  console.warn('[AIAssistant] メトリクス記録エラー:', metricsError);
                }
              }
            } else {
              // GPT API呼び出し
              // まずlocalStorageから取得、なければ環境変数から取得
              let apiKey: string | null = null;
              if (typeof window !== 'undefined') {
                try {
                  const { getAPIKey } = await import('@/lib/security');
                  apiKey = getAPIKey('openai');
                } catch (error) {
                  // セキュリティモジュールがない場合は直接localStorageから取得
                  apiKey = localStorage.getItem('NEXT_PUBLIC_OPENAI_API_KEY');
                }
              }
              
              // localStorageにない場合は環境変数から取得
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
                model: selectedModel,
                messages: allMessages,
              };

              if (selectedModel.startsWith('gpt-5')) {
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
              responseText = data.choices?.[0]?.message?.content?.trim() || '';
              
              // トークン使用量とコストを計算
              const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
              const responseTime = Date.now() - aiStartTime;
              
              // モデルごとの価格設定（1Kトークンあたり）
              const modelPrices: Record<string, { input: number; output: number }> = {
                'gpt-5.1': { input: 1.25, output: 10.00 },
                'gpt-5': { input: 1.25, output: 10.00 },
                'gpt-5-mini': { input: 0.25, output: 2.00 },
                'gpt-5-nano': { input: 0.05, output: 0.40 },
                'gpt-5.1-chat-latest': { input: 1.25, output: 10.00 },
                'gpt-5-chat-latest': { input: 1.25, output: 10.00 },
                'gpt-5.1-codex': { input: 1.25, output: 10.00 },
                'gpt-5-codex': { input: 1.25, output: 10.00 },
                'gpt-5-pro': { input: 15.00, output: 120.00 },
                'gpt-4.1': { input: 2.00, output: 8.00 },
                'gpt-4.1-mini': { input: 0.40, output: 1.60 },
                'gpt-4.1-nano': { input: 0.10, output: 0.40 },
                'gpt-4o': { input: 2.50, output: 10.00 },
              };
              
              const prices = modelPrices[selectedModel] || { input: 0, output: 0 };
              const cost = (usage.prompt_tokens / 1000) * prices.input + (usage.completion_tokens / 1000) * prices.output;
              
              // メトリクスを記録
              if (typeof window !== 'undefined') {
                try {
                  const { logAIMetrics } = await import('@/lib/monitoring');
                  logAIMetrics({
                    query: inputText,
                    responseTime,
                    tokenUsage: {
                      input: usage.prompt_tokens || 0,
                      output: usage.completion_tokens || 0,
                      total: usage.total_tokens || 0,
                    },
                    cost,
                    model: selectedModel,
                    ragContextUsed,
                    ragContextLength,
                  });
                } catch (metricsError) {
                  console.warn('[AIAssistant] メトリクス記録エラー:', metricsError);
                }
              }
            }

            // ローディングメッセージを実際のレスポンスに置き換え
            const assistantMessage: Message = {
              id: loadingMessageId,
              role: 'assistant',
              content: responseText || 'レスポンスが空でした。',
              timestamp: new Date(),
            };
            setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? assistantMessage : msg));
          }
        } catch (chatError: any) {
          const responseTime = Date.now() - aiStartTime;
          
          // エラーメトリクスを記録
          if (typeof window !== 'undefined') {
            try {
              const { logErrorMetrics } = await import('@/lib/monitoring');
              logErrorMetrics({
                errorType: chatError instanceof Error ? chatError.constructor.name : 'ChatError',
                errorMessage: chatError instanceof Error ? chatError.message : String(chatError),
                component: 'ai-assistant',
                context: {
                  query: inputText,
                  model: selectedModel,
                  responseTime,
                },
              });
            } catch (metricsError) {
              console.warn('[AIAssistant] エラーメトリクス記録エラー:', metricsError);
            }
          }
          
          console.error('チャットAPIエラー:', chatError);
          // エラーメッセージに置き換え
          const errorMessage: Message = {
            id: loadingMessageId,
            role: 'assistant',
            content: `❌ エラーが発生しました: ${chatError.message || '不明なエラー'}`,
            timestamp: new Date(),
          };
          setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? errorMessage : msg));
        }
      }
    } catch (error: any) {
      // エラーメトリクスを記録
      if (typeof window !== 'undefined') {
        try {
          const { logErrorMetrics } = await import('@/lib/monitoring');
          logErrorMetrics({
            errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
            errorMessage: error instanceof Error ? error.message : String(error),
            component: 'ai-assistant',
            context: {
              query: inputValue,
            },
          });
        } catch (metricsError) {
          console.warn('[AIAssistant] エラーメトリクス記録エラー:', metricsError);
        }
      }
      
      console.error('AIアシスタントエラー:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ エラーが発生しました: ${error.message || '不明なエラー'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Command+Enter (Mac) または Ctrl+Enter (Windows/Linux) で送信
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
    // Enterキー単独では送信しない（改行のみ）
  };

  const panelWidth = 480; // Cursor風の幅

  return (
    <>
      {/* オーバーレイ */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 999,
            pointerEvents: isOpen ? 'auto' : 'none',
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
          onClick={onClose}
        />
      )}

      {/* AIアシスタントパネル */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: isOpen ? 0 : -panelWidth,
          width: `${panelWidth}px`,
          height: '100vh',
          backgroundColor: '#1a1a1a',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          transition: 'right 0.3s ease',
          boxShadow: isOpen ? '-4px 0 24px rgba(0, 0, 0, 0.5)' : 'none',
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1f1f1f',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 500,
              color: '#ffffff',
            }}
          >
            AIアシスタント
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'background-color 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
            }}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* メッセージエリア */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                padding: '20px',
                overflowY: 'auto',
              }}
            >
              {/* ウェルカムメッセージ */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255, 255, 255, 0.5)',
                  textAlign: 'center',
                  padding: '20px',
                }}
              >
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <p style={{ marginBottom: '12px' }}>AIアシスタントに質問や指示を送信できます。</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    各コンテナに対してCLIデコーディングしているスライドをVibeコーディングできるようにします。
                  </p>
                </div>
              </div>

              {/* 定型依頼 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginBottom: '4px',
                  }}
                >
                  定型依頼
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {/* 特性要因図更新の定型依頼 */}
                  <button
                    onClick={() => {
                      const template = '特性要因図 [特性要因図ID] を更新して、以下の内容を反映: [テキストまたは議事録ID]';
                      setInputValue(template);
                      inputRef.current?.focus();
                      // カーソルを[特性要因図ID]の位置に移動
                      setTimeout(() => {
                        const textarea = inputRef.current;
                        if (textarea) {
                          const startPos = template.indexOf('[');
                          textarea.setSelectionRange(startPos, template.indexOf(']') + 1);
                        }
                      }, 0);
                    }}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#60A5FA' }}>
                      📊 特性要因図を更新
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      議事録IDまたは直接テキストを分析して特性要因図の要素を更新・拡張します
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                }}
                onMouseEnter={(e) => {
                  const copyButton = e.currentTarget.querySelector('[data-copy-button]') as HTMLElement;
                  if (copyButton) {
                    copyButton.style.opacity = '1';
                  }
                }}
                onMouseLeave={(e) => {
                  const copyButton = e.currentTarget.querySelector('[data-copy-button]') as HTMLElement;
                  if (copyButton && copiedMessageId !== message.id) {
                    copyButton.style.opacity = '0';
                  }
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    maxWidth: '85%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor:
                      message.role === 'user'
                        ? 'rgba(59, 130, 246, 0.2)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border:
                      message.role === 'user'
                        ? '1px solid rgba(59, 130, 246, 0.3)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    wordWrap: 'break-word',
                  }}
                >
                  {/* コピーボタン（アシスタントメッセージのみ） */}
                  {message.role === 'assistant' && (
                    <button
                      data-copy-button
                      onClick={() => handleCopyMessage(message.id, message.content)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255, 255, 255, 0.7)',
                        transition: 'all 0.2s ease',
                        opacity: copiedMessageId === message.id ? 1 : 0,
                        zIndex: 10,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                        if (copiedMessageId !== message.id) {
                          e.currentTarget.style.opacity = '0';
                        }
                      }}
                      title={copiedMessageId === message.id ? 'コピーしました' : 'コピー'}
                    >
                      {copiedMessageId === message.id ? (
                        <FiCheck size={14} style={{ color: '#10B981' }} />
                      ) : (
                        <FiCopy size={14} />
                      )}
                    </button>
                  )}
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {message.content}
                  </div>
                  
                  {/* フィードバックボタン（アシスタントメッセージのみ） */}
                  {message.role === 'assistant' && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <button
                        onClick={() => handleAIFeedback(message.id, 'positive')}
                        style={{
                          background: feedbackRatings[message.id] === 'positive' 
                            ? 'rgba(16, 185, 129, 0.2)' 
                            : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${feedbackRatings[message.id] === 'positive' 
                            ? 'rgba(16, 185, 129, 0.5)' 
                            : 'rgba(255, 255, 255, 0.1)'}`,
                          borderRadius: '6px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          color: feedbackRatings[message.id] === 'positive' 
                            ? '#10B981' 
                            : 'rgba(255, 255, 255, 0.7)',
                          fontSize: '12px',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (feedbackRatings[message.id] !== 'positive') {
                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (feedbackRatings[message.id] !== 'positive') {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                        title="良い回答"
                      >
                        👍 良い
                      </button>
                      <button
                        onClick={() => handleAIFeedback(message.id, 'negative')}
                        style={{
                          background: feedbackRatings[message.id] === 'negative' 
                            ? 'rgba(239, 68, 68, 0.2)' 
                            : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${feedbackRatings[message.id] === 'negative' 
                            ? 'rgba(239, 68, 68, 0.5)' 
                            : 'rgba(255, 255, 255, 0.1)'}`,
                          borderRadius: '6px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          color: feedbackRatings[message.id] === 'negative' 
                            ? '#EF4444' 
                            : 'rgba(255, 255, 255, 0.7)',
                          fontSize: '12px',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (feedbackRatings[message.id] !== 'negative') {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (feedbackRatings[message.id] !== 'negative') {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                        title="改善が必要"
                      >
                        👎 改善
                      </button>
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    marginTop: '4px',
                    paddingLeft: message.role === 'user' ? 0 : '4px',
                    paddingRight: message.role === 'user' ? '4px' : 0,
                  }}
                >
                  {message.timestamp.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '14px',
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: '#1f1f1f',
          }}
        >
          {/* ツールバー */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              position: 'relative',
            }}
          >
            {/* モデル選択ボタン */}
            <div ref={modelSelectorRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                style={{
                  background: showModelSelector ? 'rgba(59, 130, 246, 0.2)' : 'none',
                  border: showModelSelector ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                  color: showModelSelector ? '#60A5FA' : 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!showModelSelector) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showModelSelector) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
                title={`AIモデル: ${modelType === 'gpt' ? 'GPT' : modelType === 'local' ? 'ローカル' : 'Cursor'} - ${availableModels.find(m => m.value === selectedModel)?.label || selectedModel}`}
              >
                <FiCpu size={16} />
                {showModelSelector && (
                  <span style={{ fontSize: '10px', fontWeight: 500 }}>
                    {modelType === 'gpt' ? 'GPT' : modelType === 'local' ? 'Local' : 'Cursor'}
                  </span>
                )}
              </button>

              {/* モデル選択ポップオーバー */}
              {showModelSelector && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    marginBottom: '8px',
                    width: '320px',
                    backgroundColor: '#2a2a2a',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                    zIndex: 1001,
                  }}
                >
                  {/* モデルタイプ選択 */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.9)',
                    }}>
                      <FiSettings size={14} />
                      <span>モデルタイプ</span>
                    </label>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}>
                      {(['gpt', 'local', 'cursor'] as const).map((type) => (
                        <label
                          key={type}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            border: `2px solid ${modelType === type ? '#3B82F6' : 'rgba(255, 255, 255, 0.2)'}`,
                            borderRadius: '6px',
                            backgroundColor: modelType === type ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flex: 1,
                            minWidth: '80px',
                          }}
                        >
                          <input
                            type="radio"
                            name="modelType"
                            value={type}
                            checked={modelType === type}
                            onChange={(e) => setModelType(e.target.value as 'gpt' | 'local' | 'cursor')}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: 500, color: '#ffffff' }}>
                            {type === 'gpt' ? 'GPT' : type === 'local' ? 'ローカル' : 'Cursor'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* AIモデル選択（Cursorモードの場合は非表示） */}
                  {modelType !== 'cursor' && (
                    <div>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.9)',
                      }}>
                        <FiCpu size={14} />
                        <span>使用するAIモデル</span>
                      </label>
                      {modelType === 'local' && loadingLocalModels && (
                        <div style={{
                          padding: '8px',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '6px',
                          marginBottom: '8px',
                          textAlign: 'center',
                        }}>
                          <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                            🔄 利用可能なモデルを取得中...
                          </p>
                        </div>
                      )}
                      {modelType === 'local' && !loadingLocalModels && availableModels.length === 0 && (
                        <div style={{
                          padding: '8px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          marginBottom: '8px',
                        }}>
                          <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                            ⚠️ 利用可能なローカルモデルが見つかりませんでした
                          </p>
                        </div>
                      )}
                      {availableModels.length > 0 && (
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          disabled={loadingLocalModels}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            backgroundColor: '#2a2a2a',
                            color: '#ffffff',
                            cursor: loadingLocalModels ? 'not-allowed' : 'pointer',
                            opacity: loadingLocalModels ? 0.6 : 1,
                          }}
                        >
                          {availableModels.map((model) => (
                            <option 
                              key={model.value} 
                              value={model.value}
                              style={{
                                backgroundColor: '#2a2a2a',
                                color: '#ffffff',
                              }}
                            >
                              {model.label} {model.inputPrice !== '無料' && `(${model.inputPrice}/${model.outputPrice})`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              }}
              title="コンテキストを追加"
            >
              <FiAtSign size={16} />
            </button>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              }}
              title="ウェブ検索"
            >
              <FiGlobe size={16} />
            </button>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              }}
              title="画像をアップロード"
            >
              <FiImage size={16} />
            </button>
          </div>

          {/* 入力フィールド */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`メッセージを入力... (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enterで送信)`}
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                minHeight: '24px',
                maxHeight: '600px',
                lineHeight: '1.5',
                padding: 0,
                overflowY: 'auto',
              }}
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                // 自動リサイズ（最大高さまで）
                target.style.height = 'auto';
                const newHeight = Math.min(target.scrollHeight, 600);
                target.style.height = `${newHeight}px`;
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              style={{
                background: inputValue.trim() && !isLoading
                  ? 'rgba(59, 130, 246, 0.8)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: inputValue.trim() && !isLoading ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
                cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                padding: '8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (inputValue.trim() && !isLoading) {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 1)';
                }
              }}
              onMouseLeave={(e) => {
                if (inputValue.trim() && !isLoading) {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.8)';
                }
              }}
            >
              <FiSend size={16} />
            </button>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.4)',
              marginTop: '8px',
              paddingLeft: '4px',
            }}
          >
            Shift + Enter で改行
          </div>
        </div>
      </div>

      {/* パルスアニメーション用のスタイル */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>

      {/* コンテナ編集モーダル */}
      {editingContainerId && (
        <ContainerEditModal
          isOpen={isCodeEditorOpen}
          containerId={editingContainerId}
          planId={(params?.planId || params?.conceptId) as string}
          subMenuId={pathname.split('/').pop() || 'overview'}
          onClose={() => {
            setIsCodeEditorOpen(false);
            setEditingContainerId(null);
          }}
          onSaved={() => {
            // 保存後にページをリロード
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }}
          modelType={modelType}
          selectedModel={selectedModel}
        />
      )}
    </>
  );
}
