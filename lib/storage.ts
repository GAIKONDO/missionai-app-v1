/**
 * Firebase Storage互換APIスタブ (Electron版)
 * Electron版では画像をローカルファイルシステムに保存する予定ですが、
 * 現在はスタブ実装としてエラーをスローします
 */

// Storage参照を作成する関数（スタブ）
export const ref = (storage: any, path: string) => {
  return {
    fullPath: path,
    name: path.split('/').pop() || '',
    bucket: 'local-storage',
    toString: () => path,
  };
};

// ファイルをアップロードする関数（スタブ）
export const uploadBytes = async (storageRef: any, file: Blob | File): Promise<void> => {
  console.warn('Firebase Storage uploadBytes called in Electron version - not implemented');
  throw new Error('画像アップロード機能はElectron版では現在サポートされていません。ローカルファイルシステムへの保存機能は今後実装予定です。');
};

// ダウンロードURLを取得する関数（スタブ）
export const getDownloadURL = async (storageRef: any): Promise<string> => {
  console.warn('Firebase Storage getDownloadURL called in Electron version - not implemented');
  throw new Error('画像URL取得機能はElectron版では現在サポートされていません。');
};

// Storageオブジェクトのスタブ
export const storage = {
  app: {
    name: 'electron-storage-stub',
  },
};
