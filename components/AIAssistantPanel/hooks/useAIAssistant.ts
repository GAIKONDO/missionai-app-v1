import { useState, useRef, useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';
import type { Message, ModelType } from '../types';
import { useRAGContext } from './useRAGContext';
import { useAIChat } from './useAIChat';

export function useAIAssistant(
  modelType: ModelType,
  selectedModel: string,
  initialQuery?: string
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [feedbackRatings, setFeedbackRatings] = useState<Record<string, 'positive' | 'negative' | 'neutral'>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const params = useParams();

  const { getRAGContext } = useRAGContext();
  const { sendMessage: sendAIMessage } = useAIChat(modelType, selectedModel);

  // 初期クエリが設定されたときに、入力フィールドに設定
  useEffect(() => {
    if (initialQuery) {
      setInputValue(initialQuery);
      setTimeout(() => {
        inputRef.current?.focus();
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
      }, 100);
    }
  }, [initialQuery]);

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // AIフィードバックハンドラー
  const handleAIFeedback = (messageId: string, rating: 'positive' | 'negative') => {
    setFeedbackRatings(prev => ({
      ...prev,
      [messageId]: rating,
    }));
    console.log(`AIフィードバック: メッセージID ${messageId}, 評価: ${rating}`);
  };

  // 現在のページから組織IDを抽出
  const extractOrganizationId = (): string | undefined => {
    if (pathname?.startsWith('/organization/')) {
      const pathParts = pathname.split('/');
      const orgIndex = pathParts.indexOf('organization');
      if (orgIndex >= 0 && pathParts[orgIndex + 1]) {
        return pathParts[orgIndex + 1];
      }
    }
    if (params?.id) {
      return params.id as string;
    }
    return undefined;
  };

  // メッセージ送信
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const inputText = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: new Date(),
    };
    
    // ローディングメッセージを表示
    const loadingMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = {
      id: loadingMessageId,
      role: 'assistant',
      content: '考え中...',
      timestamp: new Date(),
    };
    
    // メッセージを更新（ユーザーメッセージとローディングメッセージを追加）
    setMessages((prev) => [...prev, userMessage, loadingMessage]);

    try {
      const organizationId = extractOrganizationId();
      
      // RAGコンテキストを取得
      const { context: ragContext, sources: ragSources } = await getRAGContext(
        inputText,
        organizationId
      );

      // 最新のメッセージ履歴を取得（ユーザーメッセージを含むが、ローディングメッセージは除外）
      const currentMessages = [...messages, userMessage];
      
      // AIにメッセージを送信
      const responseText = await sendAIMessage(
        inputText,
        currentMessages,
        ragContext,
        ragSources,
        organizationId
      );

      // ローディングメッセージを実際のレスポンスに置き換え
      const assistantMessage: Message = {
        id: loadingMessageId,
        role: 'assistant',
        content: responseText || 'レスポンスが空でした。',
        timestamp: new Date(),
      };
      setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? assistantMessage : msg));
    } catch (error: any) {
      console.error('AIアシスタントエラー:', error);
      const errorMessage: Message = {
        id: loadingMessageId,
        role: 'assistant',
        content: `❌ エラーが発生しました: ${error.message || '不明なエラー'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? errorMessage : msg));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isLoading,
    copiedMessageId,
    feedbackRatings,
    messagesEndRef,
    inputRef,
    handleSend,
    handleCopyMessage,
    handleAIFeedback,
  };
}

