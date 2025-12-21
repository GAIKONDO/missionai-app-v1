export const panelStyles = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  .ai-assistant-panel .markdown-content {
    color: #ffffff;
    line-height: 1.6;
  }
  .ai-assistant-panel .markdown-content h1,
  .ai-assistant-panel .markdown-content h2,
  .ai-assistant-panel .markdown-content h3,
  .ai-assistant-panel .markdown-content h4,
  .ai-assistant-panel .markdown-content h5,
  .ai-assistant-panel .markdown-content h6 {
    color: #ffffff;
    border-bottom-color: rgba(255, 255, 255, 0.2);
  }
  .ai-assistant-panel .markdown-content p {
    color: rgba(255, 255, 255, 0.9);
  }
  .ai-assistant-panel .markdown-content code {
    background-color: rgba(255, 255, 255, 0.1);
    color: #60A5FA;
  }
  .ai-assistant-panel .markdown-content pre {
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .ai-assistant-panel .markdown-content pre code {
    background-color: transparent;
    color: rgba(255, 255, 255, 0.9);
  }
  .ai-assistant-panel .markdown-content blockquote {
    border-left-color: rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.8);
  }
  .ai-assistant-panel .markdown-content table {
    border-color: rgba(255, 255, 255, 0.2);
  }
  .ai-assistant-panel .markdown-content th {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }
  .ai-assistant-panel .markdown-content td {
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
  }
  .ai-assistant-panel .markdown-content strong {
    color: #ffffff;
  }
  .ai-assistant-panel .markdown-content hr {
    border-top-color: rgba(255, 255, 255, 0.1);
  }
  .ai-assistant-panel .markdown-content ul,
  .ai-assistant-panel .markdown-content ol {
    color: rgba(255, 255, 255, 0.9);
  }
  .ai-assistant-panel .markdown-content li {
    color: rgba(255, 255, 255, 0.9);
  }
`;

