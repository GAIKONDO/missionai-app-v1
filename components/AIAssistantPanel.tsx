'use client';

import React, { useEffect } from 'react';
import type { AIAssistantPanelProps } from './AIAssistantPanel/types';
import { useAIAssistant } from './AIAssistantPanel/hooks/useAIAssistant';
import { useModelSelector } from './AIAssistantPanel/hooks/useModelSelector';
import { useMCPIntegration } from './AIAssistantPanel/hooks/useMCPIntegration';
import { usePanelResize } from './AIAssistantPanel/hooks/usePanelResize';
import { MessageList } from './AIAssistantPanel/components/MessageList';
import { InputArea } from './AIAssistantPanel/components/InputArea';
import { ModelSelector } from './AIAssistantPanel/components/ModelSelector';
import { PanelHeader } from './AIAssistantPanel/components/PanelHeader';
import { ResizeHandle } from './AIAssistantPanel/components/ResizeHandle';
import { panelStyles } from './AIAssistantPanel/styles';

export default function AIAssistantPanel({ isOpen, onClose, initialQuery }: AIAssistantPanelProps) {
  // フックを使用
  const { panelWidth, isResizing, handleResizeStart } = usePanelResize();
  const modelSelector = useModelSelector();
  const aiAssistant = useAIAssistant(
    modelSelector.modelType,
    modelSelector.selectedModel,
    initialQuery
  );

  // MCP統合を初期化
  useMCPIntegration(isOpen);
  
  // パネルが開いたら入力欄にフォーカス
  useEffect(() => {
    if (isOpen && aiAssistant.inputRef.current) {
      setTimeout(() => {
        aiAssistant.inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, aiAssistant.inputRef]);

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
        className="ai-assistant-panel"
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
          transition: isResizing ? 'none' : 'right 0.3s ease, width 0.3s ease',
          boxShadow: isOpen ? '-4px 0 24px rgba(0, 0, 0, 0.5)' : 'none',
        }}
      >
        {/* リサイズハンドル */}
        <ResizeHandle isResizing={isResizing} onResizeStart={handleResizeStart} />

        {/* ヘッダー */}
        <PanelHeader onClose={onClose} />

        {/* メッセージエリア */}
        <MessageList
          messages={aiAssistant.messages}
          copiedMessageId={aiAssistant.copiedMessageId}
          feedbackRatings={aiAssistant.feedbackRatings}
          isLoading={aiAssistant.isLoading}
          messagesEndRef={aiAssistant.messagesEndRef}
          onCopy={aiAssistant.handleCopyMessage}
          onFeedback={aiAssistant.handleAIFeedback}
                />

        {/* 入力エリア */}
        <InputArea
          inputValue={aiAssistant.inputValue}
          setInputValue={aiAssistant.setInputValue}
          isLoading={aiAssistant.isLoading}
          onSend={aiAssistant.handleSend}
          inputRef={aiAssistant.inputRef}
          modelSelector={
            <ModelSelector
              modelType={modelSelector.modelType}
              setModelType={modelSelector.setModelType}
              selectedModel={modelSelector.selectedModel}
              setSelectedModel={modelSelector.setSelectedModel}
              showModelSelector={modelSelector.showModelSelector}
              setShowModelSelector={modelSelector.setShowModelSelector}
              availableModels={modelSelector.availableModels}
              loadingLocalModels={modelSelector.loadingLocalModels}
            />
          }
        />
                  </div>

      {/* スタイル */}
      <style jsx>{panelStyles}</style>
    </>
  );
}
