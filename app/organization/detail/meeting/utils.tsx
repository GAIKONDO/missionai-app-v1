import React from 'react';

// 開発環境でのみログを有効化するヘルパー関数（パフォーマンス最適化）
const isDev = process.env.NODE_ENV === 'development';
export const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};
export const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

// ReactMarkdown用の共通コンポーネント設定（リンクを新しいタブで開くように）
export const markdownComponents = {
  a: ({ node, ...props }: any) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
    />
  ),
};

