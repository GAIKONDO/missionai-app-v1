// 開発用ログ関数（本番環境では無効化）
export const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

export const devWarn = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args);
  }
};

export const devDebug = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.debug(...args);
  }
};

