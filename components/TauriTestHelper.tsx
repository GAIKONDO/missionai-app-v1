'use client';

import { useEffect } from 'react';
import { callTauriCommand } from '@/lib/localFirebase';
import '@/lib/exportTemplateData'; // エクスポート/インポート関数を読み込む

/**
 * Tauriテスト用のヘルパー関数をグローバルに公開するコンポーネント
 */
export default function TauriTestHelper() {
  useEffect(() => {
    // Tauriコマンドを呼び出すヘルパー関数をグローバルに公開
    if (typeof window !== 'undefined') {
      console.log('[TauriTestHelper] useEffect実行開始');
      console.log('[TauriTestHelper] window:', typeof window);
      console.log('[TauriTestHelper] callTauriCommand:', typeof callTauriCommand);
      // 既存のcallTauriCommand関数をラップ
      (window as any).testTauri = async function(command: string, args?: any) {
        console.log('[testTauri] ===== 開始 =====');
        console.log('[testTauri] コマンド:', command);
        console.log('[testTauri] 引数:', args);
        
        try {
          console.log('[testTauri] callTauriCommandを呼び出します...');
          const result = await callTauriCommand(command, args);
          console.log('[testTauri] ✅ callTauriCommand成功');
          console.log('[testTauri] 結果の型:', typeof result);
          console.log('[testTauri] 結果:', result);
          console.log('[testTauri] ===== 成功 =====');
          return result;
        } catch (error: any) {
          console.error('[testTauri] ❌ エラー発生');
          console.error('[testTauri] エラーメッセージ:', error?.message);
          console.error('[testTauri] エラー名:', error?.name);
          console.error('[testTauri] エラースタック:', error?.stack);
          console.error('[testTauri] 完全なエラー:', error);
          console.error('[testTauri] ===== エラー =====');
          // エラーを再スロー
          throw error;
        }
      };
      
      // 既存のcallTauriCommandも直接公開
      (window as any).callTauriCommand = callTauriCommand;
      
      // デバッグ用: 環境を確認
      const isTauri = typeof window !== 'undefined' && (
        '__TAURI__' in window || 
        (window as any).location?.port === '3010' ||
        ((window as any).location?.hostname === 'localhost' && (window as any).location?.port === '3010')
      );
      
      console.log('[TauriTestHelper] ===== 初期化完了 =====');
      console.log('[TauriTestHelper] ✅ testTauri関数が利用可能になりました');
      console.log('[TauriTestHelper] window.testTauri:', typeof (window as any).testTauri);
      console.log('[TauriTestHelper] window.callTauriCommand:', typeof (window as any).callTauriCommand);
      console.log('[TauriTestHelper] 使い方: await window.testTauri("test_database_connection")');
      console.log('[TauriTestHelper] または: await window.callTauriCommand("test_database_connection")');
      console.log('[TauriTestHelper] 環境情報:', {
        isTauri,
        hasWindowTAURI: '__TAURI__' in window,
        port: (window as any).location?.port,
        hostname: (window as any).location?.hostname,
        __TAURI__: (window as any).__TAURI__
      });
      
      // デバッグ用: window.__TAURI__の状態を確認
      if ((window as any).__TAURI__) {
        console.log('[TauriTestHelper] window.__TAURI__の状態:', {
          exists: true,
          keys: Object.keys((window as any).__TAURI__),
          hasCore: !!(window as any).__TAURI__.core,
          hasTauri: !!(window as any).__TAURI__.tauri
        });
      } else {
        console.warn('[TauriTestHelper] ⚠️ window.__TAURI__が存在しません。Tauriアプリケーション内で実行しているか確認してください。');
      }
      
      // 確認用: 関数が正しく設定されたか確認
      if ((window as any).testTauri) {
        console.log('[TauriTestHelper] ✅ window.testTauriが設定されました');
      } else {
        console.error('[TauriTestHelper] ❌ window.testTauriが設定されていません');
      }
      
      if ((window as any).callTauriCommand) {
        console.log('[TauriTestHelper] ✅ window.callTauriCommandが設定されました');
      } else {
        console.error('[TauriTestHelper] ❌ window.callTauriCommandが設定されていません');
      }
      console.log('[TauriTestHelper] ===== 初期化完了 =====');
    }
  }, []);

  return null; // このコンポーネントは何もレンダリングしない
}

