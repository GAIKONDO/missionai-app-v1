'use client';

import { useEffect } from 'react';
import { createTestOrgs, deleteTestOrgs, listTestOrgs } from '@/lib/testOrgData';

/**
 * テスト組織データ管理機能をwindowオブジェクトに追加するコンポーネント
 */
export default function TestOrgDataHelper() {
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      // windowオブジェクトに関数を追加
      (window as any).createTestOrgs = createTestOrgs;
      (window as any).deleteTestOrgs = deleteTestOrgs;
      (window as any).listTestOrgs = listTestOrgs;
      
      console.log('✅ テスト組織データ管理関数が利用可能になりました:');
      console.log('  - window.createTestOrgs()   # テスト組織を作成');
      console.log('  - window.deleteTestOrgs()  # テスト組織を削除');
      console.log('  - window.listTestOrgs()    # テスト組織を一覧表示');
    }
  }, []);

  return null; // このコンポーネントは何もレンダリングしない
}
