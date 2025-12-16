'use client';

import { useEffect } from 'react';
import { importOrganizationsFromCSV } from '@/lib/importOrganizationsFromCSV';

/**
 * CSVから組織データをインポートする機能をwindowオブジェクトに追加するコンポーネント
 */
export default function ImportOrganizationsHelper() {
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      // windowオブジェクトに関数を追加
      (window as any).importOrganizationsFromCSV = importOrganizationsFromCSV;
      
      console.log('✅ 組織データCSVインポート関数が利用可能になりました:');
      console.log('  - window.importOrganizationsFromCSV()           # デフォルトのCSVファイルからインポート');
      console.log('  - window.importOrganizationsFromCSV("path/to/file.csv")  # 指定したCSVファイルからインポート');
    }
  }, []);

  return null; // このコンポーネントは何もレンダリングしない
}







