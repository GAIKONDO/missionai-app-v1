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

