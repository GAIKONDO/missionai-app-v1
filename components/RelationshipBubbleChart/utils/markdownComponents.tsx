'use client';

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

